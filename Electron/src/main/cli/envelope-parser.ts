/**
 * EL-203: 표준 JSON 봉투(Envelope) 스키마 검증 및 파서
 *
 * 역할:
 *   - OMX CLI 응답 문자열을 Envelope 타입의 순수 객체로 변환한다.
 *   - ok:false 발생 시 OMXError 커스텀 예외로 매핑하여 에러 코드 추출.
 *   - 무상태(Stateless) 순수 함수 원칙 — 내부 상태/사이드 이펙트 없음.
 *
 * 제공 메서드:
 *   - parseObject(raw)  : 단발성 전체 stdout 문자열 → Envelope
 *   - parseLine(line)   : Ndjson 라인 한 줄 → Envelope (스트리밍 플러그인용)
 *
 * ADR-001 불변 규칙:
 *   #2: spawnSync 금지 → 이 모듈은 파싱 전용, 프로세스 실행 없음
 *   #3: 직접 파일 쓰기 금지
 */

import {
  EnvelopeSchema,
  type Envelope,
  type ErrorDetail,
} from "./schemas/envelope.schema";

// ─── OMXError 커스텀 예외 ──────────────────────────────────────────────────────

/**
 * OMX CLI 실패 봉투(ok:false)를 수신했을 때 던지는 표준 예외.
 * error.code, error.metadata를 유실 없이 보존한다.
 */
export class OMXError extends Error {
  /** CLI 실패 봉투에서 추출한 에러 코드 */
  readonly code: string;
  /** 낙관적 락 충돌 등 부가 메타데이터 */
  readonly metadata: Record<string, unknown> | undefined;

  constructor(detail: ErrorDetail) {
    super(`[OMX] ${detail.code}: ${detail.message}`);
    this.name = "OMXError";
    this.code = detail.code;
    this.metadata = detail.metadata as Record<string, unknown> | undefined;
  }
}

// ─── 파서 순수 함수 ───────────────────────────────────────────────────────────

/**
 * 단발성(Unary) stdout 전체 문자열을 Envelope로 파싱한다.
 * ok:false 봉투는 OMXError를 throw한다.
 *
 * @throws {SyntaxError}  JSON 파싱 불가 시
 * @throws {Error}        봉투 스키마 불일치 시
 * @throws {OMXError}     CLI가 ok:false 응답을 반환한 경우
 */
export function parseObject(raw: string): Envelope {
  let parsed: unknown;

  // ── 1단계: JSON 파싱 ──
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new SyntaxError(`[EnvelopeParser] JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  // ── 2단계: 봉투 스키마 검증 ──
  const result = EnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`[EnvelopeParser] 봉투 스키마 불일치: ${result.error.message}`);
  }

  // ── 3단계: 실패 봉투 OMXError 변환 ──
  if (!result.data.ok) {
    throw new OMXError(result.data.error);
  }

  return result.data;
}

/**
 * Ndjson 스트림의 라인 한 줄을 Envelope로 파싱한다.
 * Phase 2 StreamParser(EL-213)에 플러그인할 수 있는 라인 단위 가드.
 *
 * 빈 라인·공백은 null을 반환하여 호출자가 skip 처리한다.
 * ok:false 봉투는 동일하게 OMXError를 throw한다.
 *
 * @returns Envelope 또는 null (빈 줄)
 * @throws {OMXError}  CLI가 ok:false 라인을 반환한 경우
 */
export function parseLine(line: string): Envelope | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 개행 문자가 포함된 경우 첫 줄만 처리 (안전 분기)
  const firstLine = trimmed.split("\n")[0].trim();
  if (!firstLine) return null;

  return parseObject(firstLine);
}
