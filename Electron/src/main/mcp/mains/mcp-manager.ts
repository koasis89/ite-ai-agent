/**
 * EL-206: MCP 서버 풀 매니저
 *
 * 역할:
 *   - 매니페스트 스펙에 정의된 MCP 서버 목록을 McpBridge 인스턴스로 관리한다.
 *   - Electron app 수명주기 이벤트에 바인딩하여 Teardown 파이프라인을 실행한다.
 *   - 개별 McpBridge의 메시지를 구독하여 IPC 라우팅 계층에 전달한다.
 *
 * 좀비 프로세스 원천 차단 (ADR-001 #5):
 *   app.on('before-quit') + app.on('window-all-closed') 양쪽에 SIGTERM → SIGKILL 파이프라인 탑재.
 */

import { app, BrowserWindow } from "electron";
import { McpBridge, type McpBridgeOptions, type McpMessageCallback } from "./mcp-bridge";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface McpServerSpec {
  /** 서버 식별명 (omx mcp-serve <name>) */
  name: string;
  /** 추가 spawn 인수 */
  extraArgs?: string[];
}

export interface McpManagerOptions {
  /** `omx` 바이너리 경로 (기본: "omx") */
  omxBin?: string;
}

// ─── McpManager 클래스 ────────────────────────────────────────────────────────

/**
 * 여러 MCP 서버 서브프로세스를 통합 관리하는 싱글턴 매니저.
 *
 * 사용 순서:
 *   1. `McpManager.getInstance().startAll(specs)` — Electron ready 후 호출
 *   2. `McpManager.getInstance().registerTeardownHooks()` — app 이벤트 바인딩
 */
export class McpManager {
  private static _instance: McpManager | null = null;

  private readonly bridges = new Map<string, McpBridge>();
  private readonly opts: Required<McpManagerOptions>;
  private teardownRegistered = false;

  private constructor(opts: McpManagerOptions = {}) {
    this.opts = { omxBin: "omx", ...opts };
  }

  /** 싱글턴 인스턴스 반환 */
  static getInstance(opts?: McpManagerOptions): McpManager {
    if (!McpManager._instance) {
      McpManager._instance = new McpManager(opts);
    }
    return McpManager._instance;
  }

  /** 테스트용 인스턴스 초기화 */
  static resetForTest(): void {
    McpManager._instance = null;
  }

  // ─── 서버 풀 기동 ───────────────────────────────────────────────────────────

  /**
   * 스펙 목록에 정의된 모든 MCP 서버를 백그라운드로 기동한다.
   * 이미 등록된 서버는 skip.
   */
  startAll(specs: McpServerSpec[]): void {
    for (const spec of specs) {
      if (this.bridges.has(spec.name)) continue;

      const bridgeOpts: McpBridgeOptions = {
        serverName: spec.name,
        omxBin: this.opts.omxBin,
        extraArgs: spec.extraArgs ?? [],
      };

      const bridge = new McpBridge(bridgeOpts);
      this.bridges.set(spec.name, bridge);
      bridge.start();

      console.info(`[McpManager] MCP 서버 기동: ${spec.name}`);
    }
  }

  /**
   * 특정 서버의 McpBridge에 메시지 수신 핸들러를 등록한다.
   * 해당 서버가 존재하지 않으면 에러를 throw.
   */
  onMessage(serverName: string, cb: McpMessageCallback): void {
    const bridge = this._getOrThrow(serverName);
    bridge.onMessage(cb);
  }

  /**
   * 특정 서버로 JSON-RPC 메시지를 전송한다.
   */
  send(serverName: string, message: unknown): void {
    const bridge = this._getOrThrow(serverName);
    bridge.send(message);
  }

  /** 등록된 서버 이름 목록 */
  serverNames(): string[] {
    return [...this.bridges.keys()];
  }

  /** 특정 서버의 실행 상태 */
  isRunning(serverName: string): boolean {
    return this.bridges.get(serverName)?.isRunning ?? false;
  }

  // ─── Teardown 파이프라인 ───────────────────────────────────────────────────

  /**
   * Electron app 이벤트에 Teardown 훅을 바인딩한다.
   * 두 번 이상 호출해도 안전 (idempotent).
   *
   * - `before-quit`: 정상 종료 시 모든 MCP 서브프로세스 SIGTERM → SIGKILL
   * - `window-all-closed`: macOS 외 플랫폼에서 앱 종료 전 정리
   */
  registerTeardownHooks(): void {
    if (this.teardownRegistered) return;
    this.teardownRegistered = true;

    const teardown = async () => {
      console.info("[McpManager] Teardown 시작 — 모든 MCP 서브프로세스 종료 중...");
      await this.stopAll();
      console.info("[McpManager] Teardown 완료.");
    };

    app.on("before-quit", (event) => {
      if (this.bridges.size === 0) return;
      event.preventDefault();
      teardown().then(() => app.quit());
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        teardown().then(() => app.quit());
      }
    });
  }

  /**
   * 모든 McpBridge를 병렬 종료한다.
   * 개별 오류는 로그 후 무시하여 전체 정리 완료를 보장한다.
   */
  async stopAll(): Promise<void> {
    const killTasks = [...this.bridges.entries()].map(async ([name, bridge]) => {
      try {
        await bridge.kill();
        console.info(`[McpManager] 종료 완료: ${name}`);
      } catch (err) {
        console.error(`[McpManager] 종료 실패: ${name}`, err);
      }
    });
    await Promise.allSettled(killTasks);
    this.bridges.clear();
  }

  // ─── BrowserWindow 브로드캐스트 ───────────────────────────────────────────

  /**
   * 열려 있는 모든 BrowserWindow로 MCP 메시지를 브로드캐스트한다.
   * @internal McpBridge onMessage 핸들러에서 호출
   */
  broadcastToRenderer(channel: string, payload: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  }

  // ─── 내부 헬퍼 ─────────────────────────────────────────────────────────────

  private _getOrThrow(name: string): McpBridge {
    const bridge = this.bridges.get(name);
    if (!bridge) {
      throw new Error(`[McpManager] 등록되지 않은 MCP 서버: "${name}"`);
    }
    return bridge;
  }
}
