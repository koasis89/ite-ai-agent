/**
 * EL-212: Ndjson 스트리밍 커맨드 실행기
 *
 * `--stream-json` 플래그를 탑재하여 omx CLI를 실행하고,
 * stdout에서 유효한 Ndjson 라인만 필터링해 StreamEnvelope로 파싱 방출한다.
 *
 * 핵심 보안 규칙 (파이프라인 오염 방지):
 *   - 비JSON 라인은 절대 onEnvelope로 전달하지 않는다
 *   - type 필드가 VALID_STREAM_TYPES에 없는 라인도 onRawLine으로 우회
 *   - process.stdout.write 직접 경로에는 오직 유효한 Ndjson 라인만 허용
 *
 * ADR-001 불변 규칙 #2: spawnSync 절대 금지, spawn 비동기 스트림 전용.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as readline from "readline";
import {
  STREAM_JSON_FLAG,
  VALID_STREAM_TYPES,
  type StreamEnvelope,
  type ReasoningEffort,
  ReasoningEffortFlag,
} from "../cli/constants";

// ─── 옵션 인터페이스 ──────────────────────────────────────────────────────────

export interface ExecuteCommandOptions {
  /** omx 서브커맨드 (예: "ask", "sparkshell") */
  command: string;
  /** LLM 프로바이더 (예: "claude", "gemini"). ask 커맨드에 필수 — command 바로 뒤에 삽입됨 */
  provider?: string;
  /** 커맨드 추가 인자 */
  args: string[];
  /** Ndjson 스트리밍 활성화. 기본값: true */
  streamJson?: boolean;
  /** 추론 강도 플래그. 기본값: standard */
  reasoningEffort?: ReasoningEffort;
  /** 유효한 StreamEnvelope 수신 콜백 */
  onEnvelope?: (envelope: StreamEnvelope) => void;
  /** 비JSON / 비표준 라인 우회 콜백 (콘솔 로그 뷰로 라우팅) */
  onRawLine?: (line: string) => void;
  /** stderr 수신 콜백 */
  onError?: (errText: string) => void;
  /** omx CLI 실행 경로. 기본값: "omx" */
  omxBin?: string;
}

export interface ExecuteCommandHandle {
  /** 실행 중인 자식 프로세스 (강제 종료용) */
  child: ChildProcessWithoutNullStreams;
  /** 프로세스 종료 Promise */
  exitCode: Promise<number>;
}

// ─── executeCommand() ─────────────────────────────────────────────────────────

/**
 * omx 커맨드를 --stream-json 플래그와 함께 비동기 spawn으로 실행한다.
 *
 * stdout 각 라인에 직렬화 가드 필터를 적용:
 *   1. JSON 파싱 실패 → onRawLine() 으로 안전 우회
 *   2. type 미존재 또는 비표준 → onRawLine() 으로 안전 우회
 *   3. 유효한 StreamEnvelope → onEnvelope() 로 전달
 */
export function executeCommand(opts: ExecuteCommandOptions): ExecuteCommandHandle {
  const {
    command,
    provider,
    args,
    streamJson = true,
    reasoningEffort = "standard",
    onEnvelope,
    onRawLine,
    onError,
    omxBin = "omx",
  } = opts;

  const spawnArgs: string[] = [command];

  // provider 삽입: omx ask <provider> 형식에서 command 바로 뒤에 위치해야 함
  // (--stream-json 등 플래그보다 앞에 와야 CLI가 provider로 파싱함)
  if (provider) {
    spawnArgs.push(provider);
  }

  // 추론 강도 플래그 탑재
  const effortFlags = ReasoningEffortFlag[reasoningEffort];
  spawnArgs.push(...effortFlags);

  // 직렬화 가드: --stream-json 플래그 삽입
  if (streamJson) {
    spawnArgs.push(STREAM_JSON_FLAG);
  }

  spawnArgs.push(...args);

  // Windows: shell:true + 배열 인자 조합은 공백 포함 인자를 쿼팅하지 않음
  // → cmd.exe가 공백으로 단어 분리하여 "unexpected argument" 에러 발생
  // 해결: 단일 사전-쿼팅 문자열로 변환하여 spawn에 전달
  const quoteWinArg = (a: string) =>
    /[ \t"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a;

  // stdin을 'ignore'로 닫아야 codex exec가 stdin 파이프 모드로 진입하지 않음
  // (Electron spawn 시 isTTY==false → codex가 stdin 대기 모드로 진입하는 것 방지)
  const spawnOpts = { stdio: ["ignore", "pipe", "pipe"] as const };
  const child = (
    process.platform === "win32"
      ? spawn([omxBin, ...spawnArgs].map(quoteWinArg).join(" "), [], {
          shell: true,
          ...spawnOpts,
        })
      : spawn(omxBin, spawnArgs, { shell: false, ...spawnOpts })
  ) as ChildProcessWithoutNullStreams;

  const rl = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  });

  // ─── 직렬화 가드 필터 ─────────────────────────────────────────────────────
  rl.on("line", (raw: string) => {
    const line = raw.trim();
    if (!line) return;

    // 1단계: JSON 파싱 시도
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      // 비JSON 텍스트 오염 → 콘솔 로그 뷰로 안전 우회 (파이프라인 크래시 방지)
      onRawLine?.(raw);
      return;
    }

    // 2단계: type 필드 표준 검증
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("type" in parsed) ||
      typeof (parsed as Record<string, unknown>)["type"] !== "string" ||
      !VALID_STREAM_TYPES.has((parsed as Record<string, unknown>)["type"] as string)
    ) {
      onRawLine?.(raw);
      return;
    }

    // 3단계: 유효한 StreamEnvelope → 정식 채널 방출
    onEnvelope?.(parsed as StreamEnvelope);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    onError?.(chunk.toString("utf8"));
  });

  const exitCode = new Promise<number>((resolve, reject) => {
    child.on("close", (code: number | null) => {
      rl.close();
      if (code !== null) {
        resolve(code);
      } else {
        reject(new Error(`[executeCommand:${command}] 프로세스가 시그널로 비정상 종료`));
      }
    });

    child.on("error", (err: Error) => {
      rl.close();
      reject(new Error(`[executeCommand:${command}] 프로세스 기동 실패: ${err.message}`));
    });
  });

  return { child, exitCode };
}
