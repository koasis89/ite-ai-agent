/**
 * EL-203 DoD: envelope-parser.ts 단위 테스트
 *
 * 시나리오:
 *   A. 성공 봉투 — parseObject 정상 파싱
 *   B. 실패 봉투 — parseObject → OMXError throw (code 보존)
 *   C. 잘못된 JSON — SyntaxError throw
 *   D. 스키마 불일치 — Error throw (ok 필드 없음)
 *   E. parseLine 빈 줄 — null 반환
 *   F. parseLine 유효 성공 라인 — Envelope 반환
 *   G. parseLine 실패 라인 — OMXError throw
 *   H. OMXError metadata 보존 확인
 */

import { parseObject, parseLine, OMXError } from "../main/cli/envelope-parser";

// ─── 시나리오 A: 성공 봉투 정상 파싱 ──────────────────────────────────────────

describe("A. parseObject — 성공 봉투", () => {
  it("ok:true 봉투를 SuccessEnvelope로 반환한다", () => {
    const raw = JSON.stringify({
      schema_version: "1.0",
      ok: true,
      data: { taskId: "task-001" },
    });

    const result = parseObject(raw);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result.data as any).taskId).toBe("task-001");
    }
  });

  it("timestamp, command, operation 선택 필드가 있어도 파싱된다", () => {
    const raw = JSON.stringify({
      schema_version: "1.0",
      timestamp: "2026-05-26T00:00:00Z",
      command: "read-task",
      ok: true,
      operation: "read",
      data: null,
    });

    const result = parseObject(raw);
    expect(result.ok).toBe(true);
  });
});

// ─── 시나리오 B: 실패 봉투 → OMXError ────────────────────────────────────────

describe("B. parseObject — 실패 봉투 → OMXError", () => {
  it("ok:false 봉투 수신 시 OMXError를 throw한다", () => {
    const raw = JSON.stringify({
      schema_version: "1.0",
      ok: false,
      error: { code: "Conflict", message: "이미 선점된 태스크입니다." },
    });

    expect(() => parseObject(raw)).toThrow(OMXError);
  });

  it("OMXError에 error.code가 정확히 보존된다", () => {
    const raw = JSON.stringify({
      schema_version: "1.0",
      ok: false,
      error: { code: "Forbidden", message: "권한 없음" },
    });

    try {
      parseObject(raw);
      fail("OMXError가 throw되어야 합니다");
    } catch (err) {
      expect(err).toBeInstanceOf(OMXError);
      expect((err as OMXError).code).toBe("Forbidden");
    }
  });
});

// ─── 시나리오 C: 잘못된 JSON → SyntaxError ────────────────────────────────────

describe("C. parseObject — 잘못된 JSON", () => {
  it("JSON 파싱 불가 문자열에서 SyntaxError를 throw한다", () => {
    expect(() => parseObject("not-json-at-all")).toThrow(SyntaxError);
  });

  it("빈 문자열에서 SyntaxError를 throw한다", () => {
    expect(() => parseObject("")).toThrow(SyntaxError);
  });
});

// ─── 시나리오 D: 스키마 불일치 → Error ───────────────────────────────────────

describe("D. parseObject — 스키마 불일치", () => {
  it("ok 필드 없는 객체에서 Error를 throw한다", () => {
    const raw = JSON.stringify({ schema_version: "1.0", data: {} });
    expect(() => parseObject(raw)).toThrow(Error);
  });

  it("schema_version이 '1.0'이 아닌 경우 Error를 throw한다", () => {
    const raw = JSON.stringify({ schema_version: "2.0", ok: true, data: {} });
    expect(() => parseObject(raw)).toThrow(Error);
  });
});

// ─── 시나리오 E: parseLine 빈 줄 → null ──────────────────────────────────────

describe("E. parseLine — 빈 줄 처리", () => {
  it("빈 문자열을 null로 반환한다", () => {
    expect(parseLine("")).toBeNull();
  });

  it("공백만 있는 줄을 null로 반환한다", () => {
    expect(parseLine("   \t  ")).toBeNull();
  });
});

// ─── 시나리오 F: parseLine 유효 라인 → Envelope ─────────────────────────────

describe("F. parseLine — 유효 Ndjson 라인", () => {
  it("유효 성공 봉투 라인을 Envelope로 반환한다", () => {
    const line = JSON.stringify({ schema_version: "1.0", ok: true, data: { count: 3 } });

    const result = parseLine(line);

    expect(result).not.toBeNull();
    expect(result!.ok).toBe(true);
  });
});

// ─── 시나리오 G: parseLine 실패 라인 → OMXError ──────────────────────────────

describe("G. parseLine — 실패 봉투 라인", () => {
  it("ok:false 라인에서 OMXError를 throw한다", () => {
    const line = JSON.stringify({
      schema_version: "1.0",
      ok: false,
      error: { code: "NotFound", message: "태스크 없음" },
    });

    expect(() => parseLine(line)).toThrow(OMXError);
  });
});

// ─── 시나리오 H: OMXError metadata 보존 ──────────────────────────────────────

describe("H. OMXError metadata 보존", () => {
  it("metadata 필드가 OMXError 인스턴스에 보존된다", () => {
    const raw = JSON.stringify({
      schema_version: "1.0",
      ok: false,
      error: {
        code: "Conflict",
        message: "낙관적 락 충돌",
        metadata: { currentVersion: 5, yourVersion: 4 },
      },
    });

    try {
      parseObject(raw);
      fail("OMXError가 throw되어야 합니다");
    } catch (err) {
      expect(err).toBeInstanceOf(OMXError);
      const omxErr = err as OMXError;
      expect(omxErr.metadata).toBeDefined();
      expect((omxErr.metadata as any).currentVersion).toBe(5);
    }
  });
});
