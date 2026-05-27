/**
 * EL-222: OMX 어댑터(OpenClaw/Hermes) 상태 탐지 모듈
 *
 * 아키텍처 규칙:
 *   - ADR-001 불변 규칙 #2: spawnSync 절대 금지
 *   - 읽기 전용: `.omx/adapters/<target>/` 디렉터리 탐색, `.omx/state/` 미침범
 *   - `running` 상태일 때만 envelope + probe 연쇄 호출
 *
 * CLI 명령:
 *   omx adapt <target> status --json
 *   omx adapt <target> envelope --json   (running 시에만)
 *   omx adapt <target> probe --json      (running 시에만)
 */

import { z } from "zod";
import { CliWrapper } from "./cli-wrapper";

// ─── 상태 스키마 ──────────────────────────────────────────────────────────────

export const AdapterStatusSchema = z.enum([
  "unavailable", // 설치 없음 / 미지원 플랫폼
  "installed",   // 설치 완료, 미실행
  "degraded",    // 실행 중이나 기능 일부 불가
  "running",     // 정상 동작
]);

export type AdapterStatus = z.infer<typeof AdapterStatusSchema>;

export const AdapterTargetSchema = z.enum(["openclaw", "hermes"]);
export type AdapterTarget = z.infer<typeof AdapterTargetSchema>;

// ─── 어댑터 정보 스키마 ───────────────────────────────────────────────────────

export const AdapterEnvelopeSchema = z.object({
  version: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  endpoint: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AdapterProbeSchema = z.object({
  latency_ms: z.number().optional(),
  alive: z.boolean(),
  last_checked: z.string().optional(),
  error: z.string().optional(),
});

export const AdapterInfoSchema = z.object({
  target: AdapterTargetSchema,
  status: AdapterStatusSchema,
  envelope: AdapterEnvelopeSchema.optional(),
  probe: AdapterProbeSchema.optional(),
  probed_at: z.string(),
});

export type AdapterInfo = z.infer<typeof AdapterInfoSchema>;
export type AdapterEnvelope = z.infer<typeof AdapterEnvelopeSchema>;
export type AdapterProbe = z.infer<typeof AdapterProbeSchema>;

// ─── 파싱 헬퍼 ───────────────────────────────────────────────────────────────

function safeExtract<T>(data: unknown, schema: z.ZodType<T>): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

// omx adapt <target> status --json 실제 출력 스키마 (표준 CliEnvelope 아님)
const OmxAdaptStatusRawSchema = z.object({
  schemaVersion: z.string().optional(),
  target: z.string().optional(),
  adapter: z.object({ state: z.string() }).optional(),
  targetRuntime: z.object({ state: z.string() }).optional(),
});

/** omx adapt status 출력의 adapter/targetRuntime 상태를 AdapterStatus로 변환 */
function resolveAdapterStatus(
  adapterState: string | undefined,
  runtimeState: string | undefined
): AdapterStatus {
  if (runtimeState === "running" || adapterState === "running") return "running";
  if (runtimeState === "degraded" || adapterState === "degraded") return "degraded";
  if (adapterState === "ready" || adapterState === "installed") return "installed";
  return "unavailable";
}

// ─── probeAdapter 함수 ────────────────────────────────────────────────────────

/**
 * 어댑터 상태를 탐지하고, running 상태이면 envelope + probe를 연쇄 호출한다.
 * 읽기 전용 — `.omx/state/` 변경 없음.
 *
 * @param target  "openclaw" | "hermes"
 * @param cli     CliWrapper 인스턴스 (테스트 주입 가능)
 */
export async function probeAdapter(
  target: AdapterTarget,
  cli?: CliWrapper
): Promise<AdapterInfo> {
  const _cli = cli ?? new CliWrapper();
  const probed_at = new Date().toISOString();

  // 1단계: 상태 조회
  let rawStatusJson: unknown;
  try {
    rawStatusJson = await _cli.executeUnaryRaw([
      "adapt",
      target,
      "status",
      "--json",
    ]);
  } catch (err) {
    // omx 미설치 또는 PATH 미등록 → unavailable로 안전하게 보고
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.warn(`[AdapterProbe] omx CLI를 찾을 수 없음 (${target}):`, (err as Error).message);
    } else {
      console.warn(`[AdapterProbe] 상태 조회 실패 (${target}):`, err);
    }
    return { target, status: "unavailable", probed_at };
  }

  const parsedStatus = OmxAdaptStatusRawSchema.safeParse(rawStatusJson);
  const status: AdapterStatus = parsedStatus.success
    ? resolveAdapterStatus(parsedStatus.data.adapter?.state, parsedStatus.data.targetRuntime?.state)
    : "unavailable";

  // 2단계: running 상태일 때만 envelope + probe 연쇄 호출
  if (status !== "running") {
    return { target, status, probed_at };
  }

  // envelope 조회
  let envelope: AdapterEnvelope | undefined;
  try {
    const rawEnvJson = await _cli.executeUnaryRaw([
      "adapt",
      target,
      "envelope",
      "--json",
    ]);
    envelope = safeExtract(rawEnvJson, AdapterEnvelopeSchema);
  } catch {
    // envelope 오류는 무시 — degraded로 계속
  }

  // probe 조회 (liveness check)
  let probe: AdapterProbe | undefined;
  try {
    const rawProbeJson = await _cli.executeUnaryRaw([
      "adapt",
      target,
      "probe",
      "--json",
    ]);
    probe = safeExtract(rawProbeJson, AdapterProbeSchema);
  } catch {
    // probe 오류는 무시 — 상태 정보만 반환
  }

  // probe alive=false이면 degraded로 다운그레이드
  const effectiveStatus: AdapterStatus =
    probe && !probe.alive ? "degraded" : status;

  return {
    target,
    status: effectiveStatus,
    envelope,
    probe,
    probed_at,
  };
}

// ─── 전체 어댑터 일괄 탐지 ───────────────────────────────────────────────────

/**
 * 지원 대상 어댑터(openclaw, hermes)를 병렬로 탐지한다.
 */
export async function probeAllAdapters(cli?: CliWrapper): Promise<AdapterInfo[]> {
  const targets: AdapterTarget[] = ["openclaw", "hermes"];
  return Promise.all(targets.map((t) => probeAdapter(t, cli)));
}
