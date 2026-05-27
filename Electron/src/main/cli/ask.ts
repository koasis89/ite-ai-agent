/**
 * EL-211: `omx ask` 비동기 래퍼
 *
 * ADR-001 불변 규칙 #2: spawnSync / stdio:'inherit' 절대 금지.
 * 모든 프로세스 기동은 child_process.spawn 비동기 스트림 기반.
 *
 * 핵심 기능:
 *   1. spawn 기반 비동기 기동 — UI 스레드 차단 없음
 *   2. 추론 강도 플래그(--high, --xhigh) 자동 탑재 (model-contract.ts 계약 준수)
 *   3. --stream-json 옵션 지원 (EL-212 파이프라인 연동)
 *   4. close 시그널 핸들러로 비정상 중단 대응
 */

import { spawn } from "child_process";
import * as readline from "readline";
import {
  STREAM_JSON_FLAG,
  ReasoningEffortFlag,
  type ReasoningEffort,
} from "./constants";

// ─── 옵션 인터페이스 ──────────────────────────────────────────────────────────

export interface AskOptions {
  /** 사용자 프롬프트 텍스트 */
  prompt: string;
  /** 추론 강도 (standard | high | xhigh). 기본값: standard */
  reasoningEffort?: ReasoningEffort;
  /** Ndjson 스트리밍 모드 활성화 여부. 기본값: false */
  streamJson?: boolean;
  /** stdout 라인 콜백 (스트리밍 모드 시 각 Ndjson 라인 전달) */
  onLine?: (line: string) => void;
  /** stderr 오류 텍스트 콜백 */
  onError?: (errText: string) => void;
  /** omx CLI 실행 경로. 기본값: "omx" */
  omxBin?: string;
}

// ─── ask() 함수 ───────────────────────────────────────────────────────────────

/**
 * `omx ask` 명령을 비동기 spawn으로 실행한다.
 * @returns 프로세스 종료 코드 Promise
 */
export function ask(opts: AskOptions): Promise<number> {
  const {
    prompt,
    reasoningEffort = "standard",
    streamJson = false,
    onLine,
    onError,
    omxBin = "omx",
  } = opts;

  const args: string[] = ["ask"];

  // 추론 강도 플래그 탑재 — model-contract.ts resolveAgentReasoningEffort 계약
  const effortFlags = ReasoningEffortFlag[reasoningEffort];
  args.push(...effortFlags);

  // Ndjson 스트리밍 플래그 탑재 (EL-212 파이프라인 진입)
  if (streamJson) {
    args.push(STREAM_JSON_FLAG);
  }

  args.push(prompt);

  return new Promise<number>((resolve, reject) => {
    const child = spawn(omxBin, args, { shell: false });

    // readline 기반 라인 단위 수신 — 비차단 비폴링
    const rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    rl.on("line", (line: string) => {
      if (line.trim()) onLine?.(line);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      onError?.(chunk.toString("utf8"));
    });

    // close 시그널 핸들러 — 비정상 중단(null exitCode) 대응
    child.on("close", (code: number | null) => {
      rl.close();
      if (code !== null) {
        resolve(code);
      } else {
        reject(new Error("[ask] 프로세스가 시그널로 비정상 종료"));
      }
    });

    child.on("error", (err: Error) => {
      rl.close();
      reject(new Error(`[ask] 프로세스 기동 실패: ${err.message}`));
    });
  });
}
