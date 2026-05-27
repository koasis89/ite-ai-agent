/**
 * EL-208: 훅 이벤트 디스패처
 *
 * 역할:
 *   - hooks-extension 스펙(schema_version:"1")에 정의된 JSONL 라인을 파싱한다.
 *   - Zod 스키마로 계약 필드 유실 여부를 검증한다.
 *   - PRIORITY_EVENTS에 해당하는 이벤트는 우선 채널로 분리해 브로드캐스트한다.
 *   - 스키마 불일치 라인은 조용히 무시한다 (IPC 미전송).
 *
 * hooks-extension-ko.md 스펙 참조:
 *   - 봉투 필드: schema_version:"1", event, timestamp, source, context
 *   - 선택 필드: session_id, thread_id, turn_id, mode
 *   - 파생 신호 (OMX_HOOK_DERIVED_SIGNALS=1): needs-input, pre-tool-use, post-tool-use
 */

import { z } from "zod";

// ─── 이벤트 어휘 ──────────────────────────────────────────────────────────────

/** hooks-extension-ko.md에 정의된 전체 이벤트 어휘 */
export const HOOK_EVENT_TYPES = [
  "session-start",
  "keyword-detector",
  "pre-tool-use",
  "post-tool-use",
  "stop",
  "session-end",
  "turn-complete",
  "session-idle",
  "needs-input",
] as const;

/** 파생 신호 (OMX_HOOK_DERIVED_SIGNALS=1 활성 시 발생) — 우선 채널 대상 */
export const PRIORITY_EVENTS: ReadonlySet<string> = new Set([
  "needs-input",
  "pre-tool-use",
  "post-tool-use",
]);

// ─── Zod 스키마 ───────────────────────────────────────────────────────────────

/**
 * hooks-extension-ko.md 계약 기반 훅 이벤트 스키마.
 * schema_version은 반드시 문자열 "1".
 */
export const HookEventSchema = z.object({
  /** 봉투 버전 식별자 (항상 "1") */
  schema_version: z.literal("1"),
  /** 이벤트 종류 */
  event: z.enum(HOOK_EVENT_TYPES),
  /** ISO 8601 타임스탬프 */
  timestamp: z.string(),
  /** 이벤트 발생 출처: native(omx 런타임 직접), derived(신호 추론) */
  source: z.enum(["native", "derived"]),
  /** 이벤트 컨텍스트 페이로드 (구조 자유) */
  context: z.unknown(),
  /** 세션 식별자 (선택) */
  session_id: z.string().optional(),
  /** 스레드 식별자 (선택) */
  thread_id: z.string().optional(),
  /** 턴 식별자 (선택) */
  turn_id: z.string().optional(),
  /** 실행 모드 (선택, 예: "normal", "auto") */
  mode: z.string().optional(),
});

export type HookEvent = z.infer<typeof HookEventSchema>;

// ─── IPC 채널명 상수 ─────────────────────────────────────────────────────────

/** 일반 훅 이벤트 IPC 채널 */
export const HOOK_IPC_CHANNEL = "omx:runtime-hook-event";
/** 우선순위(파생 신호) 훅 이벤트 IPC 채널 */
export const HOOK_IPC_PRIORITY_CHANNEL = "omx:runtime-hook-event:priority";

// ─── dispatch 함수 ────────────────────────────────────────────────────────────

/**
 * 단일 JSONL 라인을 파싱하여 적절한 IPC 채널로 브로드캐스트한다.
 *
 * @param rawLine   HookTailer로부터 수신한 원시 JSONL 문자열
 * @param broadcast IPC 채널 브로드캐스트 함수 (채널명, 페이로드)
 *
 * 처리 흐름:
 *   1. JSON.parse → 실패 시 silent ignore
 *   2. HookEventSchema.safeParse → 실패 시 debug 로그 후 ignore
 *   3. PRIORITY_EVENTS 해당 시 → HOOK_IPC_PRIORITY_CHANNEL 발송
 *   4. 그 외 → HOOK_IPC_CHANNEL 발송
 */
export function dispatch(
  rawLine: string,
  broadcast: (channel: string, payload: HookEvent) => void
): void {
  // 1. JSON 파싱
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawLine);
  } catch {
    // JSON 아닌 라인은 조용히 무시
    return;
  }

  // 2. Zod 스키마 검증
  const result = HookEventSchema.safeParse(parsed);
  if (!result.success) {
    // 계약 불일치 — 디버그 로그만 기록하고 IPC 미전송
    console.debug(
      "[EventDispatcher] 스키마 불일치, 무시:",
      result.error.flatten().fieldErrors
    );
    return;
  }

  const hookEvent = result.data;

  // 3. 우선순위 채널 또는 일반 채널로 브로드캐스트
  const channel = PRIORITY_EVENTS.has(hookEvent.event)
    ? HOOK_IPC_PRIORITY_CHANNEL
    : HOOK_IPC_CHANNEL;

  broadcast(channel, hookEvent);
}
