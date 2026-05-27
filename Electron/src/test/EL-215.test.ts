/**
 * EL-215 단위 테스트: interlude-triager.ts
 *
 * 검증 시나리오:
 *   A. askUserQuestion 분류 — kind 필드 명시 시 그대로 반환
 *   B. worker_merge_conflict 분류 — kind 필드 명시
 *   C. pre-tool-use 분류 — kind 필드 명시
 *   D. needs-input 분류 — kind 필드 명시
 *   E. 텍스트 패턴 매칭 — kind 미제공 시 질문 텍스트로 분류
 *   F. 기본값 폴백 — 패턴 미일치 시 askUserQuestion 반환
 *   G. persona 추출 — persona 필드 존재 시 정확히 반환
 *   H. role 폴백 — persona 없고 role 필드 있을 때 매핑
 *   I. unknown 폴백 — persona/role 모두 없을 때 unknown 반환
 *   J. callId 생성 — envelope.callId 없을 때 자동 생성
 *   K. broadcastInterludeStart — BrowserWindow.getAllWindows() 로 전송
 *   L. 파괴된 윈도우 스킵 — isDestroyed() = true 인 윈도우 무시
 */

// Electron mock 등록 (상단에 위치해야 jest.mock 호이스팅 작동)
jest.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
  },
}));

import { BrowserWindow } from "electron";
import {
  InterludeTriager,
  getInterludeTriager,
  _resetTriagerForTest,
  INTERLUDE_START_CHANNEL,
} from "../../main/cli/interlude-triager";
import type { StreamEnvelope } from "../../main/cli/constants";

// ─── 헬퍼: InterludeEnvelope 빌더 ────────────────────────────────────────────

function makeInterludeEnvelope(overrides: Partial<{
  callId: string;
  kind: string;
  question: string;
  persona: string;
  role: string;
}>): StreamEnvelope & { type: "interlude" } {
  return {
    type: "interlude",
    callId: overrides.callId,
    kind: overrides.kind,
    question: overrides.question ?? "테스트 질문입니다",
    persona: overrides.persona,
    role: overrides.role,
  } as unknown as StreamEnvelope & { type: "interlude" };
}

// ─── 목 윈도우 빌더 ───────────────────────────────────────────────────────────

function makeMockWindow(destroyed = false) {
  const send = jest.fn();
  return {
    isDestroyed: () => destroyed,
    webContents: { send },
    _send: send, // 테스트에서 직접 참조용
  };
}

// ─── 초기화 ────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetTriagerForTest();
  jest.clearAllMocks();
});

// ─── InterludeTriager.triage() ────────────────────────────────────────────────

describe("InterludeTriager.triage()", () => {
  let triager: InterludeTriager;

  beforeEach(() => {
    triager = new InterludeTriager();
  });

  // A. askUserQuestion 분류
  it("A: kind='askUserQuestion' 이면 그대로 반환한다", () => {
    const envelope = makeInterludeEnvelope({ kind: "askUserQuestion" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("askUserQuestion");
  });

  // B. worker_merge_conflict 분류
  it("B: kind='worker_merge_conflict' 이면 그대로 반환한다", () => {
    const envelope = makeInterludeEnvelope({ kind: "worker_merge_conflict" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("worker_merge_conflict");
  });

  // C. pre-tool-use 분류
  it("C: kind='pre-tool-use' 이면 그대로 반환한다", () => {
    const envelope = makeInterludeEnvelope({ kind: "pre-tool-use" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("pre-tool-use");
  });

  // D. needs-input 분류
  it("D: kind='needs-input' 이면 그대로 반환한다", () => {
    const envelope = makeInterludeEnvelope({ kind: "needs-input" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("needs-input");
  });

  // E. 텍스트 패턴 매칭 — conflict 키워드 → worker_merge_conflict
  it("E: kind 없고 질문에 'conflict' 포함 시 worker_merge_conflict으로 분류한다", () => {
    const envelope = makeInterludeEnvelope({ question: "merge conflict detected" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("worker_merge_conflict");
  });

  // F. 기본값 폴백
  it("F: kind 없고 패턴 미일치 시 askUserQuestion을 반환한다", () => {
    const envelope = makeInterludeEnvelope({ question: "일반적인 질문" });
    const payload = triager.triage(envelope);
    expect(payload.kind).toBe("askUserQuestion");
  });

  // G. persona 추출
  it("G: persona 필드가 있으면 정확히 반환한다", () => {
    const envelope = makeInterludeEnvelope({ persona: "planner" });
    const payload = triager.triage(envelope);
    expect(payload.persona).toBe("planner");
  });

  // H. role 폴백
  it("H: persona 없고 role='executor' 시 executor로 매핑한다", () => {
    const envelope = makeInterludeEnvelope({ role: "executor" });
    const payload = triager.triage(envelope);
    expect(payload.persona).toBe("executor");
  });

  // I. unknown 폴백
  it("I: persona/role 모두 없으면 unknown을 반환한다", () => {
    const envelope = makeInterludeEnvelope({});
    const payload = triager.triage(envelope);
    expect(payload.persona).toBe("unknown");
  });

  // J. callId 자동 생성
  it("J: envelope.callId 없을 때 유효한 callId를 자동 생성한다", () => {
    const envelope = makeInterludeEnvelope({ question: "auto callId test" });
    const payload = triager.triage(envelope);
    expect(typeof payload.callId).toBe("string");
    expect(payload.callId.length).toBeGreaterThan(0);
  });

  // callId 전달 시 그대로 유지
  it("envelope.callId 전달 시 그대로 payload.callId로 사용한다", () => {
    const envelope = makeInterludeEnvelope({ callId: "fixed-call-id-99" });
    const payload = triager.triage(envelope);
    expect(payload.callId).toBe("fixed-call-id-99");
  });

  // question 필드 보존
  it("question 필드가 payload.question에 그대로 전달된다", () => {
    const envelope = makeInterludeEnvelope({ question: "구체적인 질문 내용" });
    const payload = triager.triage(envelope);
    expect(payload.question).toBe("구체적인 질문 내용");
  });
});

// ─── broadcastInterludeStart ──────────────────────────────────────────────────

describe("broadcastInterludeStart()", () => {
  // K. 정상 윈도우에 전송 확인
  it("K: 활성 BrowserWindow에 interlude-start 채널로 페이로드를 전송한다", () => {
    const win1 = makeMockWindow();
    const win2 = makeMockWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win1, win2]);

    const triager = new InterludeTriager();
    const envelope = makeInterludeEnvelope({ kind: "askUserQuestion" });
    const payload = triager.triage(envelope);

    expect(win1._send).toHaveBeenCalledWith(INTERLUDE_START_CHANNEL, payload);
    expect(win2._send).toHaveBeenCalledWith(INTERLUDE_START_CHANNEL, payload);
  });

  // L. 파괴된 윈도우 스킵
  it("L: isDestroyed()=true 인 윈도우는 send를 호출하지 않는다", () => {
    const alive = makeMockWindow(false);
    const dead  = makeMockWindow(true);
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([alive, dead]);

    const triager = new InterludeTriager();
    const envelope = makeInterludeEnvelope({});
    triager.triage(envelope);

    expect(alive._send).toHaveBeenCalled();
    expect(dead._send).not.toHaveBeenCalled();
  });
});

// ─── 싱글턴 getInterludeTriager ──────────────────────────────────────────────

describe("getInterludeTriager()", () => {
  it("동일 인스턴스를 반환한다 (싱글턴)", () => {
    const a = getInterludeTriager();
    const b = getInterludeTriager();
    expect(a).toBe(b);
  });

  it("_resetTriagerForTest() 후 새 인스턴스가 반환된다", () => {
    const a = getInterludeTriager();
    _resetTriagerForTest();
    const b = getInterludeTriager();
    expect(a).not.toBe(b);
  });
});
