/**
 * EL-201: OMX 환경 진단 및 헬스체크 모듈
 *
 * 단계별 검증 파이프라인:
 *   1. checkCliVersion()   — `omx --version` 전역 CLI 가용성 확인
 *   2. runOmxDoctor()      — `omx doctor --json` 설정 파일 누락 진단
 *   3. verifyCodexAuth()   — `codex login status` 실질 인증 계약 검증
 *   4. handshakeCheck()    — `omx exec` 런타임 쉘 연기 테스트
 */

import { spawn } from "child_process";
import { z } from "zod";

// ─── 타입 정의 ──────────────────────────────────────────────────────────────

export type EnvStatusCode =
  | "ok"
  | "cli_not_found"
  | "version_mismatch"
  | "doctor_failed"
  | "auth_missing"
  | "handshake_failed";

export interface EnvStatus {
  ok: boolean;
  code: EnvStatusCode;
  version?: string;
  missing?: string[];
  message?: string;
}

// ─── Zod 스키마 ─────────────────────────────────────────────────────────────

const OmxDoctorResultSchema = z.object({
  ok: z.boolean(),
  missing: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

type OmxDoctorResult = z.infer<typeof OmxDoctorResultSchema>;

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────

/** spawn을 통해 명령을 실행하고 stdout 전체를 Promise<string>으로 반환한다.
 *  ADR-001 불변 규칙 #2: spawnSync 절대 사용 금지.
 */
function runCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { shell: process.platform === "win32" });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errChunks.push(chunk));

    child.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks).toString("utf-8").trim());
      } else {
        reject(
          new Error(
            `[${cmd}] exit ${code}: ${Buffer.concat(errChunks).toString("utf-8").trim()}`
          )
        );
      }
    });

    child.on("error", (err) => reject(err));
  });
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

/**
 * 1단계: `omx --version` — 전역 CLI 가용성 체크
 */
export async function checkCliVersion(): Promise<EnvStatus> {
  try {
    const out = await runCommand("omx", ["--version"]);
    // 기대 형식: "omx 0.x.x" 또는 "0.x.x"
    const match = out.match(/(\d+\.\d+\.\d+)/);
    if (!match) {
      return { ok: false, code: "version_mismatch", message: `Unrecognized version output: ${out}` };
    }
    return { ok: true, code: "ok", version: match[1] };
  } catch {
    return { ok: false, code: "cli_not_found", message: "omx CLI를 찾을 수 없습니다. PATH를 확인하세요." };
  }
}

/**
 * 2단계: `omx doctor --json` — 필수 설정 파일 누락 진단
 */
export async function runOmxDoctor(): Promise<EnvStatus> {
  try {
    const out = await runCommand("omx", ["doctor", "--json"]);

    // 방어적 파싱 (ADR-001 불변 규칙 #5)
    let raw: unknown;
    try {
      raw = JSON.parse(out);
    } catch {
      return { ok: false, code: "doctor_failed", message: `JSON 파싱 실패: ${out}` };
    }

    const result = OmxDoctorResultSchema.safeParse(raw);
    if (!result.success) {
      return { ok: false, code: "doctor_failed", message: `스키마 불일치: ${result.error.message}` };
    }

    const data: OmxDoctorResult = result.data;
    if (!data.ok) {
      return { ok: false, code: "doctor_failed", missing: data.missing ?? [], message: "omx doctor 실패" };
    }

    return { ok: true, code: "ok" };
  } catch (err) {
    return { ok: false, code: "doctor_failed", message: String(err) };
  }
}

/**
 * 3단계: `codex login status` — 실질 인증 계약 검증
 */
export async function verifyCodexAuth(): Promise<EnvStatus> {
  try {
    const out = await runCommand("codex", ["login", "status"]);
    // "authenticated" 문자열이 포함되어야 통과
    if (!out.toLowerCase().includes("authenticated")) {
      return { ok: false, code: "auth_missing", message: `인증 미확인 (응답: ${out})` };
    }
    return { ok: true, code: "ok" };
  } catch (err) {
    return { ok: false, code: "auth_missing", message: String(err) };
  }
}

/**
 * 4단계: `omx exec` 핸드셰이크 — 런타임 쉘 연기 테스트
 * 기대 응답: "OMX-EXEC-OK"
 */
export async function handshakeCheck(): Promise<EnvStatus> {
  try {
    const out = await runCommand("omx", [
      "exec",
      "--skip-git-repo-check",
      "-C",
      ".",
      "Reply with exactly OMX-EXEC-OK",
    ]);
    if (!out.includes("OMX-EXEC-OK")) {
      return { ok: false, code: "handshake_failed", message: `핸드셰이크 실패 (응답: ${out})` };
    }
    return { ok: true, code: "ok" };
  } catch (err) {
    return { ok: false, code: "handshake_failed", message: String(err) };
  }
}

/**
 * 전체 파이프라인 — 4단계 순차 실행 후 최종 EnvStatus 반환
 * 실패 단계에서 즉시 종료하여 Renderer에 정확한 코드를 전달한다.
 */
export async function runFullEnvCheck(): Promise<EnvStatus> {
  const versionResult = await checkCliVersion();
  if (!versionResult.ok) return versionResult;

  const doctorResult = await runOmxDoctor();
  if (!doctorResult.ok) return doctorResult;

  const authResult = await verifyCodexAuth();
  if (!authResult.ok) return authResult;

  const handshakeResult = await handshakeCheck();
  if (!handshakeResult.ok) return handshakeResult;

  return { ok: true, code: "ok", version: versionResult.version };
}
