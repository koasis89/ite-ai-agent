/**
 * EL-206: omx mcp-serve 기반 MCP 서버 브릿지
 *
 * 역할:
 *   - `omx mcp-serve <serverName>` 명령을 spawn하여 MCP 서버 하위 프로세스를 구동한다.
 *   - stdin/stdout을 통한 JSON-RPC stdio 메시지 브릿지 채널을 제공한다.
 *   - stderr 출력을 가로채 trace 시스템에 기록한다.
 *   - 비정상 크래시 시 Respawn 카운트 제어 가드를 구현한다.
 *
 * ADR-001 불변 규칙:
 *   #2: spawnSync / stdio:'inherit' 절대 금지 — spawn 비동기로만 실행
 *   #3: 직접 파일 쓰기 금지
 *   #5: 좀비 프로세스 원천 차단 — Teardown 훅 탑재 의무
 */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as readline from "readline";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

/** SIGTERM 전송 후 SIGKILL 강제 해제까지 대기 시간 (ms) */
const TEARDOWN_GRACE_MS = 5_000;

/** 비정상 크래시 시 허용하는 최대 자동 재기동(Respawn) 횟수 */
const MAX_RESPAWN_COUNT = 3;

/** 재기동 쿨다운 대기 시간 (ms) */
const RESPAWN_COOLDOWN_MS = 2_000;

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface McpBridgeOptions {
  /** MCP 서버 명칭 (`omx mcp-serve <serverName>` 의 인수) */
  serverName: string;
  /** `omx` 바이너리 경로 (기본: "omx") */
  omxBin?: string;
  /** 추가 spawn 인수 (고급 옵션) */
  extraArgs?: string[];
}

/** McpBridge 이벤트 콜백 타입 */
export type McpMessageCallback = (line: string) => void;
export type McpErrorCallback = (err: Error) => void;
export type McpExitCallback = (code: number | null) => void;

// ─── McpBridge 클래스 ─────────────────────────────────────────────────────────

/**
 * 단일 MCP 서버 서브프로세스와의 stdio JSON-RPC 채널을 관리한다.
 * 생명주기: start() → send() / onMessage() → kill()
 */
export class McpBridge {
  private readonly opts: Required<McpBridgeOptions>;
  private child: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;
  private _respawnCount = 0;
  private _stopped = false;

  /** stdout 라인 수신 핸들러 목록 */
  private messageHandlers: McpMessageCallback[] = [];
  /** 에러 핸들러 목록 */
  private errorHandlers: McpErrorCallback[] = [];
  /** 프로세스 종료 핸들러 목록 */
  private exitHandlers: McpExitCallback[] = [];

  constructor(opts: McpBridgeOptions) {
    this.opts = {
      omxBin: "omx",
      extraArgs: [],
      ...opts,
    };
  }

  /** 현재 자동 재기동 횟수 */
  get respawnCount(): number {
    return this._respawnCount;
  }

  /** 프로세스가 활성 상태인지 여부 */
  get isRunning(): boolean {
    return this.child !== null && !this.child.killed;
  }

  // ─── 서버 기동 ─────────────────────────────────────────────────────────────

  /**
   * `omx mcp-serve <serverName>` 서브프로세스를 spawn하고 stdio 채널을 바인딩한다.
   * 이미 실행 중이면 no-op.
   */
  start(): void {
    if (this.isRunning) return;
    this._doSpawn();
  }

  private _doSpawn(): void {
    const args = ["mcp-serve", this.opts.serverName, ...this.opts.extraArgs];
    const child: ChildProcessWithoutNullStreams = spawn(this.opts.omxBin, args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.child = child;

    // ── stdout: readline 기반 라인 단위 JSON-RPC 수신 ──
    this.rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      for (const cb of this.messageHandlers) {
        try { cb(trimmed); } catch { /* 핸들러 에러가 파이프라인 중단 방지 */ }
      }
    });

    // ── stderr: trace 기록 ──
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        console.error(`[McpBridge:${this.opts.serverName}] stderr: ${text}`);
        for (const cb of this.errorHandlers) {
          try { cb(new Error(`[MCP stderr] ${text}`)); } catch { /* 무시 */ }
        }
      }
    });

    // ── 프로세스 종료 처리 ──
    child.on("close", (code) => {
      this.rl?.close();
      this.rl = null;
      this.child = null;

      for (const cb of this.exitHandlers) {
        try { cb(code); } catch { /* 무시 */ }
      }

      // 자동 재기동 (비정상 종료 && 명시적 stop 아닌 경우)
      if (!this._stopped && code !== 0 && this._respawnCount < MAX_RESPAWN_COUNT) {
        this._respawnCount++;
        console.warn(
          `[McpBridge:${this.opts.serverName}] 비정상 종료(code=${code}). ` +
          `재기동 ${this._respawnCount}/${MAX_RESPAWN_COUNT} (${RESPAWN_COOLDOWN_MS}ms 후)`
        );
        setTimeout(() => { if (!this._stopped) this._doSpawn(); }, RESPAWN_COOLDOWN_MS);
      } else if (this._respawnCount >= MAX_RESPAWN_COUNT) {
        console.error(
          `[McpBridge:${this.opts.serverName}] 최대 재기동 횟수(${MAX_RESPAWN_COUNT}) 초과. 재기동 중단.`
        );
      }
    });
  }

  // ─── 메시지 송신 (stdin) ───────────────────────────────────────────────────

  /**
   * JSON-RPC 메시지를 MCP 서버 프로세스의 stdin으로 전송한다.
   * 직렬화 실패나 프로세스 미구동 시 에러를 throw한다.
   */
  send(message: unknown): void {
    if (!this.child || this.child.killed) {
      throw new Error(`[McpBridge:${this.opts.serverName}] 프로세스가 실행 중이지 않습니다.`);
    }
    const line = JSON.stringify(message);
    this.child.stdin.write(line + "\n");
  }

  // ─── 이벤트 핸들러 등록 ───────────────────────────────────────────────────

  /** stdout 라인 수신 시 호출될 콜백 등록 */
  onMessage(cb: McpMessageCallback): void {
    this.messageHandlers.push(cb);
  }

  /** stderr 에러 이벤트 콜백 등록 */
  onError(cb: McpErrorCallback): void {
    this.errorHandlers.push(cb);
  }

  /** 프로세스 종료 이벤트 콜백 등록 */
  onExit(cb: McpExitCallback): void {
    this.exitHandlers.push(cb);
  }

  // ─── 정상 종료 (Teardown) ─────────────────────────────────────────────────

  /**
   * SIGTERM → 5초 대기 → SIGKILL 순으로 서브프로세스를 영구 파괴한다.
   * (ADR-001 좀비 프로세스 원천 차단 게이트)
   */
  kill(): Promise<void> {
    this._stopped = true;
    return new Promise((resolve) => {
      if (!this.child || this.child.killed) {
        resolve();
        return;
      }

      const child = this.child;

      // 타임아웃 내 종료 시 resolve
      const timer = setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
        resolve();
      }, TEARDOWN_GRACE_MS);

      child.once("close", () => {
        clearTimeout(timer);
        resolve();
      });

      child.kill("SIGTERM");
    });
  }
}
