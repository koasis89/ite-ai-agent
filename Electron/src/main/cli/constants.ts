/**
 * EL-212: CLI 플래그 상수 및 Ndjson 스트리밍 봉투 타입 정의
 *
 * Phase 2 Milestone 4의 공유 계약 파일.
 * ask.ts, sparkshell.ts, execute-command.ts, stream-parser.ts 모두 이 파일을 단일 소스로 임포트한다.
 *
 * 스트리밍 봉투 스펙 (`--stream-json` 출력 형식):
 *   agent_init  : 세션 초기화 정보
 *   token       : LLM 토큰 (reasoning|content 분기)
 *   tool_call   : 도구 호출 요청
 *   tool_result : 도구 실행 결과
 *   interlude   : 사용자 응답 대기 (홀딩 국면)
 *   done        : 스트림 종료 + 종료 코드
 *   error       : 파이프라인 에러
 */

// ─── CLI 플래그 상수 ──────────────────────────────────────────────────────────

/** Ndjson 스트리밍 모드를 활성화하는 CLI 글로벌 플래그 */
export const STREAM_JSON_FLAG = "--stream-json";

/**
 * 추론 강도 플래그 맵 (model-contract.ts 계약 기반)
 * standard: 기본 추론 (플래그 없음)
 * high:     고강도 추론 (--high)
 * xhigh:    초고강도 추론 (--xhigh)
 */
export const ReasoningEffortFlag = {
  standard: [] as string[],
  high: ["--high"] as string[],
  xhigh: ["--xhigh"] as string[],
} as const;

export type ReasoningEffort = keyof typeof ReasoningEffortFlag;

// ─── Ndjson 봉투 타입 정의 ────────────────────────────────────────────────────

/** 세션 초기화 봉투 — 스트림 첫 번째 라인 */
export interface AgentInitEnvelope {
  type: "agent_init";
  sessionId: string;
  model: string;
  reasoningEffort?: ReasoningEffort;
}

/**
 * LLM 토큰 봉투 — 클로드 스타일 이중 채널
 * subType: "reasoning" — 사고 과정 토큰 (omx:stream-thinking)
 * subType: "content"   — 최종 답변 토큰 (omx:stream-token)
 */
export interface TokenEnvelope {
  type: "token";
  subType: "reasoning" | "content";
  text: string;
}

/** 도구 호출 요청 봉투 */
export interface ToolCallEnvelope {
  type: "tool_call";
  toolName: string;
  args: unknown;
  callId: string;
}

/** 도구 실행 결과 봉투 */
export interface ToolResultEnvelope {
  type: "tool_result";
  callId: string;
  result: unknown;
}

/**
 * 사용자 인터랙션 대기 봉투
 * 프로세스는 비종료 홀딩 상태(stdin 대기)로 진입한다.
 */
export interface InterludeEnvelope {
  type: "interlude";
  question: string;
  callId?: string;
}

/** 스트림 정상 종료 봉투 */
export interface DoneEnvelope {
  type: "done";
  exitCode: number;
}

/** 파이프라인 에러 봉투 */
export interface ErrorEnvelope {
  type: "error";
  message: string;
}

/** 전체 스트리밍 봉투 판별 유니온 */
export type StreamEnvelope =
  | AgentInitEnvelope
  | TokenEnvelope
  | ToolCallEnvelope
  | ToolResultEnvelope
  | InterludeEnvelope
  | DoneEnvelope
  | ErrorEnvelope;

/** 유효한 type 값 집합 (가드 필터용) */
export const VALID_STREAM_TYPES = new Set<string>([
  "agent_init",
  "token",
  "tool_call",
  "tool_result",
  "interlude",
  "done",
  "error",
]);
