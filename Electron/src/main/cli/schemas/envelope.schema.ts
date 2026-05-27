/**
 * EL-203: 표준 JSON 봉투(Envelope) 공통 스키마 정의
 *
 * interop-team-mutation-contract-ko.md 기반 공식 계약 스키마.
 * envelope-parser.ts 및 cli-wrapper.ts 모두 이 단일 소스에서 임포트한다.
 *
 * 변이 계약 규격:
 *   - 성공 봉투: schema_version, timestamp, command, ok:true, operation, data
 *   - 실패 봉투: schema_version, timestamp, command, ok:false, error(code, message, metadata?)
 *
 * ADR-001 불변 규칙 #3: 직접 파일 쓰기 금지 — 이 스키마는 읽기 전용 계약이다.
 */

import { z } from "zod";

// ─── 성공 봉투 스키마 ─────────────────────────────────────────────────────────

export const SuccessEnvelopeSchema = z.object({
  schema_version: z.literal("1.0"),
  timestamp: z.string().optional(),
  command: z.string().optional(),
  ok: z.literal(true),
  operation: z.string().optional(),
  data: z.unknown(),
});

// ─── 실패 봉투 스키마 (중첩 error 구조 엄격 검증) ────────────────────────────

export const ErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const FailureEnvelopeSchema = z.object({
  schema_version: z.literal("1.0"),
  timestamp: z.string().optional(),
  command: z.string().optional(),
  ok: z.literal(false),
  error: ErrorDetailSchema,
});

// ─── 공용 판별 유니온 스키마 ──────────────────────────────────────────────────

export const EnvelopeSchema = z.discriminatedUnion("ok", [
  SuccessEnvelopeSchema,
  FailureEnvelopeSchema,
]);

// ─── 타입 추론 ────────────────────────────────────────────────────────────────

export type SuccessEnvelope = z.infer<typeof SuccessEnvelopeSchema>;
export type FailureEnvelope = z.infer<typeof FailureEnvelopeSchema>;
export type Envelope = z.infer<typeof EnvelopeSchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

// ─── 에러 코드 상수 (표준화된 CLI 에러 코드) ──────────────────────────────────

export const EnvelopeErrorCode = {
  /** 낙관적 락 충돌 — 이미 다른 에이전트가 선점 */
  CONFLICT: "Conflict",
  /** 권한 부족 */
  FORBIDDEN: "Forbidden",
  /** 요청 대상 리소스 없음 */
  NOT_FOUND: "NotFound",
  /** 상태 전이 규칙 위반 */
  INVALID_TRANSITION: "InvalidTransition",
  /** 인증 만료 또는 누락 */
  UNAUTHORIZED: "Unauthorized",
} as const;

export type EnvelopeErrorCodeType = (typeof EnvelopeErrorCode)[keyof typeof EnvelopeErrorCode];
