/**
 * EL-215: 인터류드(Interlude) 및 차단 신호 감지 로직
 *
 * Ndjson 스트림으로부터 다중 차단 유형(interlude) 신호를 정밀 분류·감지하고,
 * Main Process의 수명주기 상태를 즉각 전환한다.
 *
 * 지원 차단 유형 (interop-team-mutation-contract-ko.md 기반):
 *   - askUserQuestion     : 에이전트가 추가 컨텍스트를 묻는 일반 질문
 *   - worker_merge_conflict: 통합 충돌 해결을 위한 사용자 개입 대기
 *   - pre-tool-use        : 도구 실행 전 명시적 사용자 승인 대기
 *   - needs-input         : 추가 입력 컨텍스트 요청
 *
 * IPC 채널:
 *   - omx:interlude-start — Renderer로 차단 신호 페이로드 송신
 *   - omx:interlude-ack   — Renderer로부터 승인/거절 수신
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용.
 */

import { z } from "zod";
import { BrowserWindow } from "electron";
import type { InterludeEnvelope } from "./constants";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

/** 차단 신호 시작 — Renderer 수신 채널 */
export const INTERLUDE_START_CHANNEL = "omx:interlude-start";

/** 차단 신호 승인/거절 — Main 수신 채널 */
export const INTERLUDE_ACK_CHANNEL = "omx:interlude-ack";

// ─── 차단 유형 Zod 스키마 ────────────────────────────────────────────────────

/**
 * 지원하는 인터류드 차단 유형 목록
 * interop-team-mutation-contract-ko.md 계약 기반 수렴형 스키마
 */
export const InterludeKindSchema = z.enum([
  "askUserQuestion",       // 에이전트 일반 질문
  "worker_merge_conflict", // 통합 충돌 해결 대기
  "pre-tool-use",          // 도구 실행 전 명시적 승인
  "needs-input",           // 추가 컨텍스트 입력 요청
]);
export type InterludeKind = z.infer<typeof InterludeKindSchema>;

/**
 * 페르소나 역할 목록 — 에이전트가 질문을 던지는 역할 식별자
 */
export const PersonaRoleSchema = z.enum([
  "planner",
  "executor",
  "verifier",
  "reviewer",
  "unknown",
]);
export type PersonaRole = z.infer<typeof PersonaRoleSchema>;

/**
 * 인터류드 페이로드 스키마 (Renderer 전송용)
 * InterludeEnvelope → 분류 후 구조화한 페이로드
 */
export const InterludePayloadSchema = z.object({
  /** 고유 차단 식별자 (원본 callId 또는 자동 생성 UUID) */
  callId: z.string(),
  /** 차단 유형 */
  kind: InterludeKindSchema,
  /** 에이전트 질문 본문 */
  question: z.string(),
  /** 질문자 페르소나 역할 */
  persona: PersonaRoleSchema,
  /** 원시 InterludeEnvelope 전체 보존 (디버깅용) */
  rawEnvelope: z.record(z.unknown()),
});
export type InterludePayload = z.infer<typeof InterludePayloadSchema>;

/** Renderer 승인/거절 응답 스키마 */
export const InterludeAckSchema = z.object({
  callId: z.string(),
  /** true: 승인(계속 진행), false: 거절(롤백 요청) */
  approved: z.boolean(),
  /** 승인 시 사용자 입력 텍스트 (선택적) */
  userInput: z.string().optional(),
});
export type InterludeAck = z.infer<typeof InterludeAckSchema>;

// ─── 차단 유형 분류 로직 ─────────────────────────────────────────────────────

/**
 * InterludeEnvelope에서 차단 유형을 추론한다.
 *
 * 순위:
 *   1. envelope에 kind 필드가 명시된 경우 그대로 사용
 *   2. 질문 본문의 패턴 매칭으로 추론
 *   3. 기본값: "askUserQuestion"
 */
function classifyInterludeKind(envelope: InterludeEnvelope & Record<string, unknown>): InterludeKind {
  // 명시적 kind 필드 우선
  const kindResult = InterludeKindSchema.safeParse(envelope["kind"]);
  if (kindResult.success) {
    return kindResult.data;
  }

  const q = (envelope.question ?? "").toLowerCase();

  // 패턴 기반 분류
  if (q.includes("merge conflict") || q.includes("충돌")) {
    return "worker_merge_conflict";
  }
  if (q.includes("approve") || q.includes("승인") || q.includes("allow tool") || q.includes("도구 실행")) {
    return "pre-tool-use";
  }
  if (q.includes("needs-input") || q.includes("추가 입력") || q.includes("more context")) {
    return "needs-input";
  }

  return "askUserQuestion";
}

/**
 * envelope에서 페르소나 역할을 추출한다.
 *
 * CLI는 `persona` 또는 `role` 필드로 페르소나 정보를 전달할 수 있음.
 * 없으면 "unknown" 반환.
 */
function extractPersonaRole(envelope: Record<string, unknown>): PersonaRole {
  const raw = envelope["persona"] ?? envelope["role"];
  const result = PersonaRoleSchema.safeParse(raw);
  return result.success ? result.data : "unknown";
}

// ─── 핵심 트리아저 클래스 ────────────────────────────────────────────────────

/**
 * InterludeTriager
 *
 * StreamParser.onInterlude 콜백에서 수신한 InterludeEnvelope를 처리하는
 * 상태 비저장(stateless) 디스패처.
 *
 * 사용 예시:
 *   const triager = new InterludeTriager();
 *   parser.onInterlude = (env) => triager.triage(env);
 */
export class InterludeTriager {
  /**
   * InterludeEnvelope를 분류하고 Renderer에 omx:interlude-start를 브로드캐스트한다.
   *
   * @param envelope StreamParser로부터 수신한 인터류드 봉투
   * @returns 생성된 InterludePayload (테스트·로깅용)
   */
  triage(envelope: InterludeEnvelope): InterludePayload {
    const raw = envelope as InterludeEnvelope & Record<string, unknown>;

    const kind = classifyInterludeKind(raw);
    const persona = extractPersonaRole(raw);
    const callId = (raw["callId"] as string | undefined) ?? generateCallId();

    const payload: InterludePayload = {
      callId,
      kind,
      question: envelope.question,
      persona,
      rawEnvelope: raw,
    };

    // 무상태 즉시 디스패치 — 조건 만족 즉시 Renderer로 전송
    broadcastInterludeStart(payload);

    return payload;
  }
}

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

/**
 * 살아있는 모든 BrowserWindow에 omx:interlude-start 이벤트를 브로드캐스트한다.
 */
function broadcastInterludeStart(payload: InterludePayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(INTERLUDE_START_CHANNEL, payload);
    }
  }
}

/** 내부 callId 자동 생성 (crypto.randomUUID 폴백) */
function generateCallId(): string {
  // Node.js 14.17+ / 브라우저 표준 randomUUID 사용
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 타임스탬프 + 랜덤 문자열
  return `interlude-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── 싱글턴 팩토리 ────────────────────────────────────────────────────────────

let _triagerInstance: InterludeTriager | null = null;

/**
 * InterludeTriager 싱글턴을 반환한다.
 * 대부분의 경우 이 함수를 통해 인스턴스를 획득하면 됨.
 */
export function getInterludeTriager(): InterludeTriager {
  if (!_triagerInstance) {
    _triagerInstance = new InterludeTriager();
  }
  return _triagerInstance;
}

/** 테스트용 싱글턴 초기화 */
export function _resetTriagerForTest(): void {
  _triagerInstance = null;
}
