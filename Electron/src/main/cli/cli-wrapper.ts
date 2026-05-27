/**
 * EL-202: 비차단(Non-blocking) CLI 래퍼 클래스
 *
 * ADR-001 불변 규칙 #2: spawnSync / stdio:'inherit' 절대 금지.
 * 모든 CLI 호출은 child_process.spawn 비동기 스트림으로 처리한다.
 *
 * 제공 메서드:
 *   - executeUnary()  : 전체 stdout을 버퍼링 후 CliEnvelope로 반환 (단발성 JSON)
 *   - executeStream() : readline 기반 Ndjson 라인 단위 이벤트 트리거 (확장성 게이트)
 */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as readline from "readline";
import { z } from "zod";

// ─── 표준 봉투 계약 (interop-team-mutation-contract-ko.md 기반) ─────────────

export const CliEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    schema_version: z.literal("1.0"),
    ok: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    schema_version: z.literal("1.0"),
    ok: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string(),
    }),
  }),
]);

export type CliEnvelope = z.infer<typeof CliEnvelopeSchema>;

// ─── 봉투 파싱 헬퍼 ──────────────────────────────────────────────────────────

/**
 * stdout 전체 문자열을 CliEnvelope로 파싱한다.
 * 유효하지 않은 봉투는 명확한 파싱 에러로 거부한다. (ADR-001 DoD 명시)
 */
export function parseEnvelope(raw: string): CliEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[CliWrapper] JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  const result = CliEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`[CliWrapper] 봉투 스키마 불일치: ${result.error.message}`);
  }
  return result.data;
}

// ─── CliWrapper 클래스 ────────────────────────────────────────────────────────

export class CliWrapper {
  private readonly baseCmd: string;
  /** Windows에서 npm 글로벌 .cmd 래퍼를 통해 실행하기 위해 shell 모드 활성화 */
  private readonly useShell: boolean;

  constructor(baseCmd = "omx") {
    this.baseCmd = baseCmd;
    this.useShell = process.platform === "win32";
  }

  /**
   * 단발성(Unary) 명령 실행.
   * stdout 전체를 버퍼에 모아 CliEnvelope로 파싱 후 Promise 반환.
   * UI 블로킹 없음 — spawn 기반 비동기.
   */
  executeUnary(args: string[]): Promise<CliEnvelope> {
    return new Promise((resolve, reject) => {
      const child: ChildProcessWithoutNullStreams = spawn(this.baseCmd, args, {
        shell: this.useShell,
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

      child.on("close", (code) => {
        const raw = Buffer.concat(chunks).toString("utf-8").trim();

        if (code !== 0 && raw.length === 0) {
          const errMsg = Buffer.concat(errChunks).toString("utf-8").trim();
          reject(new Error(`[CliWrapper] exit ${code}: ${errMsg}`));
          return;
        }

        try {
          resolve(parseEnvelope(raw));
        } catch (err) {
          reject(err);
        }
      });

      child.on("error", (err) => reject(err));
    });
  }

  /**
   * 단발성(Unary) 명령 실행 — 봉투 스키마 검증 없이 파싱된 JSON 반환.
   * CLI 명령이 표준 CliEnvelope가 아닌 자체 JSON 포맷을 반환할 때 사용.
   * (예: omx adapt <target> status --json)
   */
  executeUnaryRaw(args: string[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const child: ChildProcessWithoutNullStreams = spawn(this.baseCmd, args, {
        shell: this.useShell,
      });

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

      child.on("close", (code) => {
        const raw = Buffer.concat(chunks).toString("utf-8").trim();

        if (code !== 0 && raw.length === 0) {
          const errMsg = Buffer.concat(errChunks).toString("utf-8").trim();
          reject(new Error(`[CliWrapper] exit ${code}: ${errMsg}`));
          return;
        }

        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error(`[CliWrapper] JSON 파싱 실패: ${raw.slice(0, 200)}`));
        }
      });

      child.on("error", (err) => reject(err));
    });
  }

  /**
   * [확장성 게이트] 스트리밍 명령 실행.
   * readline 기반 Ndjson 파이프라인 — Phase 2 StreamParser(EL-213)의 토대.
   * 비JSON 라인은 크래시 없이 fallback 콜백으로 전달. (ADR-001 불변 규칙 #5)
   *
   * @param args    CLI 인수 배열
   * @param onLine  유효 Ndjson 한 줄당 호출되는 콜백
   * @param onRaw   파싱 불가 원시 텍스트 fallback 콜백 (optional)
   * @returns       프로세스를 강제 종료할 수 있는 kill 함수
   */
  executeStream(
    args: string[],
    onLine: (parsed: unknown) => void,
    onRaw?: (raw: string) => void
  ): { kill: () => void } {
    const child: ChildProcessWithoutNullStreams = spawn(this.baseCmd, args, {
      shell: this.useShell,
    });

    const rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });

    rl.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        onLine(parsed);
      } catch {
        // ADR-001 불변 규칙 #5: 비JSON 라인 → 콘솔 fallback
        onRaw ? onRaw(line) : console.warn("[CliWrapper] non-JSON stdout:", line);
      }
    });

    child.on("error", (err) => {
      console.error("[CliWrapper] spawn error:", err);
    });

    return {
      kill: () => {
        rl.close();
        child.kill("SIGTERM");
      },
    };
  }
}
