/**
 * EL-218: 런타임 수명주기(Lifecycle) 상태 파서 및 다중 상태 병합
 *
 * StateWatcher로부터 동기화된 JSON 스냅샷을 받아 에이전트의 현재 수명주기 상태를
 * 정확히 추출·병합하여 UI 표준 객체(LifecycleState)로 변환한다.
 *
 * 지원 수명주기 상태:
 *   - running       : 에이전트 실행 중
 *   - finished      : 정상 완료
 *   - blocked       : 차단 대기 (사용자 개입 필요)
 *   - failed        : 오류 종료
 *   - userinterlude : 인터류드(interlude) 대기 상태
 *   - idle          : 대기 상태 (기본)
 *
 * 다중 상태 병합 (STATE_MODEL-ko.md 규칙):
 *   team-state.json → 최상위 우선
 *   모드별 *-state.json → 보조 상태로 병합
 *   skill-active-state.json → 현재 활성 스킬 정보 보강
 *
 * 감사 필드 (completed 단계):
 *   completed_at, auto_completed_reason, completion_note
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용.
 */

import { z } from "zod";

// ─── Zod 스키마 ───────────────────────────────────────────────────────────────

/** 수명주기 상태 열거형 */
export const LifecycleStatusSchema = z.enum([
  "running",
  "finished",
  "blocked",
  "failed",
  "userinterlude",
  "idle",
]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

/** 감사 필드 스키마 — completed 단계에서 추출 */
export const AuditFieldsSchema = z.object({
  completed_at: z.string().optional(),
  auto_completed_reason: z.string().optional(),
  completion_note: z.string().optional(),
});
export type AuditFields = z.infer<typeof AuditFieldsSchema>;

/** 단일 모드 상태 파일 스키마 */
export const RawStateFileSchema = z.object({
  status: z.string().optional(),
  state: z.string().optional(),
  phase: z.string().optional(),
  mode: z.string().optional(),
  skill: z.string().optional(),
  completed_at: z.string().optional(),
  auto_completed_reason: z.string().optional(),
  completion_note: z.string().optional(),
  error: z.string().optional(),
  blocked_reason: z.string().optional(),
  interlude_kind: z.string().optional(),
}).passthrough();
export type RawStateFile = z.infer<typeof RawStateFileSchema>;

/** UI로 전달되는 정규화된 수명주기 상태 객체 */
export const LifecycleStateSchema = z.object({
  /** 현재 최상위 수명주기 상태 */
  status: LifecycleStatusSchema,
  /** 활성 모드 식별자 (예: "team", "ralph", "ultrawork") */
  activeMode: z.string().optional(),
  /** 현재 활성 스킬 이름 */
  activeSkill: z.string().optional(),
  /** 병합에 참여한 모드 목록 */
  mergedModes: z.array(z.string()),
  /** 감사 필드 (완료 단계 시 존재) */
  audit: AuditFieldsSchema.optional(),
  /** 차단/실패 원인 메시지 */
  reason: z.string().optional(),
  /** 상태 마지막 갱신 타임스탬프 (ISO 8601) */
  updatedAt: z.string(),
});
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

// ─── 상태 우선순위 맵 ─────────────────────────────────────────────────────────

/**
 * 상태 문자열 → LifecycleStatus 정규화 맵
 * 다양한 CLI 출력 형태를 통합 처리한다.
 */
const STATUS_NORMALIZE: Record<string, LifecycleStatus> = {
  // running 계열
  running: "running",
  active: "running",
  in_progress: "running",
  "in-progress": "running",
  // finished 계열
  finished: "finished",
  completed: "finished",
  done: "finished",
  success: "finished",
  succeeded: "finished",
  // blocked 계열
  blocked: "blocked",
  waiting: "blocked",
  paused: "blocked",
  // failed 계열
  failed: "failed",
  error: "failed",
  aborted: "failed",
  cancelled: "failed",
  // interlude 계열
  userinterlude: "userinterlude",
  interlude: "userinterlude",
  user_interlude: "userinterlude",
  // idle
  idle: "idle",
  ready: "idle",
  pending: "idle",
};

/**
 * 상태 병합 우선순위 — 숫자가 클수록 높은 우선순위
 * 실행 중 > 차단 > 인터류드 > 실패 > 완료 > 대기
 */
const STATUS_PRIORITY: Record<LifecycleStatus, number> = {
  running: 6,
  blocked: 5,
  userinterlude: 4,
  failed: 3,
  finished: 2,
  idle: 1,
};

// ─── 유틸리티 함수 ────────────────────────────────────────────────────────────

/**
 * 원시 상태 문자열을 정규화된 LifecycleStatus로 변환한다.
 * 인식 불가 값은 "idle"로 폴백.
 */
export function normalizeStatus(raw: string | undefined): LifecycleStatus {
  if (!raw) return "idle";
  const lower = raw.toLowerCase().trim();
  return STATUS_NORMALIZE[lower] ?? "idle";
}

/**
 * 파일 스냅샷에서 상태 문자열을 추출한다.
 * status → state → phase 순으로 탐색.
 */
function extractRawStatus(snap: Record<string, unknown>): string | undefined {
  return (
    (snap["status"] as string | undefined) ??
    (snap["state"] as string | undefined) ??
    (snap["phase"] as string | undefined)
  );
}

/**
 * 파일 스냅샷에서 모드 식별자를 추출한다.
 */
function extractMode(filename: string, snap: Record<string, unknown>): string {
  // 파일명에서 모드 추출: ralph-state.json → "ralph"
  const match = filename.match(/^(.+)-state\.json$/);
  if (match?.[1] && match[1] !== "skill-active") {
    return match[1];
  }
  return (snap["mode"] as string | undefined) ?? "unknown";
}

// ─── 핵심 파서 ────────────────────────────────────────────────────────────────

/**
 * 다중 상태 파일 스냅샷 맵을 받아 단일 LifecycleState 객체로 병합한다.
 *
 * 병합 규칙 (STATE_MODEL-ko.md):
 *   1. team-state.json이 있으면 최상위 상태로 사용
 *   2. 모드별 *-state.json은 보조 상태로 참조, 우선순위로 비교 병합
 *   3. skill-active-state.json은 activeSkill 정보만 추출
 *
 * @param snapshots  filename → parsed JSON 맵 (StateWatcher.getCurrentState() 반환값)
 * @returns 정규화된 LifecycleState
 */
export function parseLifecycleState(
  snapshots: Map<string, Record<string, unknown>>,
): LifecycleState {
  const now = new Date().toISOString();

  if (snapshots.size === 0) {
    return {
      status: "idle",
      mergedModes: [],
      updatedAt: now,
    };
  }

  // team-state.json 우선 추출
  const teamSnap = snapshots.get("team-state.json");

  // skill-active-state.json 추출
  const skillSnap = snapshots.get("skill-active-state.json");
  const activeSkill =
    skillSnap
      ? ((skillSnap["skill"] as string | undefined) ??
         (skillSnap["name"] as string | undefined))
      : undefined;

  // 모드별 상태 파일 수집 (team-state, skill-active-state 제외)
  const modeEntries: Array<{ mode: string; status: LifecycleStatus; snap: Record<string, unknown> }> =
    [];

  for (const [filename, snap] of snapshots.entries()) {
    if (filename === "skill-active-state.json") continue;

    const rawStatus = extractRawStatus(snap);
    const status = normalizeStatus(rawStatus);
    const mode = extractMode(filename, snap);
    modeEntries.push({ mode, status, snap });
  }

  // 최상위 상태 결정 — team-state 우선, 없으면 우선순위 최고값
  let topEntry = teamSnap
    ? {
        mode: "team",
        status: normalizeStatus(extractRawStatus(teamSnap)),
        snap: teamSnap,
      }
    : modeEntries.reduce<typeof modeEntries[0] | null>((best, cur) => {
        if (!best) return cur;
        return STATUS_PRIORITY[cur.status] >= STATUS_PRIORITY[best.status] ? cur : best;
      }, null) ?? { mode: "unknown", status: "idle" as LifecycleStatus, snap: {} };

  // 활성 모드 목록
  const mergedModes = modeEntries.map((e) => e.mode);

  // 감사 필드 추출 (completed/finished 상태 시)
  let audit: AuditFields | undefined;
  if (topEntry.status === "finished") {
    const raw = AuditFieldsSchema.safeParse(topEntry.snap);
    if (raw.success && Object.keys(raw.data).length > 0) {
      audit = raw.data;
    }
  }

  // 차단/실패 원인 추출
  const reason =
    (topEntry.snap["blocked_reason"] as string | undefined) ??
    (topEntry.snap["error"] as string | undefined) ??
    (topEntry.snap["interlude_kind"] as string | undefined);

  return {
    status: topEntry.status,
    activeMode: topEntry.mode !== "unknown" ? topEntry.mode : undefined,
    activeSkill,
    mergedModes,
    audit,
    reason,
    updatedAt: now,
  };
}

/**
 * 단일 스냅샷 파일로부터 LifecycleState를 파싱하는 편의 함수.
 * StateWatcher의 onChange 콜백 내부에서 사용.
 */
export function parseSingleSnapshot(
  filename: string,
  snapshot: Record<string, unknown> | null,
): Partial<LifecycleState> {
  if (!snapshot) {
    return { status: "idle", updatedAt: new Date().toISOString() };
  }

  const rawStatus = extractRawStatus(snapshot);
  const status = normalizeStatus(rawStatus);
  const mode = extractMode(filename, snapshot);

  let audit: AuditFields | undefined;
  if (status === "finished") {
    const raw = AuditFieldsSchema.safeParse(snapshot);
    if (raw.success && Object.keys(raw.data).length > 0) {
      audit = raw.data;
    }
  }

  const reason =
    (snapshot["blocked_reason"] as string | undefined) ??
    (snapshot["error"] as string | undefined);

  return {
    status,
    activeMode: mode,
    mergedModes: [mode],
    audit,
    reason,
    updatedAt: new Date().toISOString(),
  };
}
