/**
 * EL-208 DoD: EventDispatcher 단위 테스트
 *
 * 시나리오:
 *   A. 일반 이벤트 → omx:runtime-hook-event 채널 전송
 *   B. needs-input → omx:runtime-hook-event:priority 우선 채널 전송
 *   C. pre-tool-use → 우선순위 채널 전송
 *   D. post-tool-use → 우선순위 채널 전송
 *   E. 스키마 불일치 라인 → IPC 미전송 (조용히 무시)
 *   F. 6대 필수 필드 유실 없이 Renderer 전달
 *   G. session_id / mode 선택 필드 보존
 *   H. 잘못된 JSON 라인 → 파싱 에러 없이 무시
 *   I. source 필드 검증 — native/derived 외 값 스키마 불일치
 *   J. schema_version 오불일치 ("2" 등) → 무시
 */

import { jest } from "@jest/globals";
import { dispatch, HOOK_IPC_CHANNEL, HOOK_IPC_PRIORITY_CHANNEL } from "../main/logs/event-dispatcher";
import type { HookEvent } from "../main/logs/event-dispatcher";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/** 기본 훅 이벤트 봉투 생성 헬퍼 */
function makeEvent(overrides: Partial<HookEvent> = {}): string {
  const base: HookEvent = {
    schema_version: "1",
    event: "session-start",
    timestamp: "2026-05-26T12:00:00.000Z",
    source: "native",
    context: {},
    ...overrides,
  };
  return JSON.stringify(base);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── 시나리오 A: 일반 이벤트 → 일반 채널 ────────────────────────────────────

describe("A. 일반 이벤트 → omx:runtime-hook-event 채널", () => {
  it("session-start 이벤트는 일반 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "session-start" }), broadcast);

    expect(broadcast).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith(
      HOOK_IPC_CHANNEL,
      expect.objectContaining({ event: "session-start" })
    );
  });

  it("session-end 이벤트는 일반 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "session-end" }), broadcast);

    expect(broadcast).toHaveBeenCalledWith(HOOK_IPC_CHANNEL, expect.anything());
  });

  it("stop 이벤트는 일반 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "stop" }), broadcast);

    expect(broadcast).toHaveBeenCalledWith(HOOK_IPC_CHANNEL, expect.anything());
  });
});

// ─── 시나리오 B: needs-input → 우선 채널 ────────────────────────────────────

describe("B. needs-input → omx:runtime-hook-event:priority 채널", () => {
  it("needs-input 이벤트는 우선순위 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(
      makeEvent({ event: "needs-input", source: "derived" }),
      broadcast
    );

    expect(broadcast).toHaveBeenCalledWith(
      HOOK_IPC_PRIORITY_CHANNEL,
      expect.objectContaining({ event: "needs-input" })
    );
  });
});

// ─── 시나리오 C: pre-tool-use → 우선 채널 ───────────────────────────────────

describe("C. pre-tool-use → 우선순위 채널 전송", () => {
  it("pre-tool-use 이벤트는 priority 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "pre-tool-use", source: "native" }), broadcast);

    expect(broadcast).toHaveBeenCalledWith(
      HOOK_IPC_PRIORITY_CHANNEL,
      expect.objectContaining({ event: "pre-tool-use" })
    );
  });
});

// ─── 시나리오 D: post-tool-use → 우선 채널 ──────────────────────────────────

describe("D. post-tool-use → 우선순위 채널 전송", () => {
  it("post-tool-use 이벤트는 priority 채널로 전송된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "post-tool-use", source: "native" }), broadcast);

    expect(broadcast).toHaveBeenCalledWith(
      HOOK_IPC_PRIORITY_CHANNEL,
      expect.objectContaining({ event: "post-tool-use" })
    );
  });
});

// ─── 시나리오 E: 스키마 불일치 → 무시 ───────────────────────────────────────

describe("E. 스키마 불일치 라인 → IPC 미전송", () => {
  it("알 수 없는 event 타입이면 broadcast를 호출하지 않는다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    dispatch(
      JSON.stringify({ schema_version: "1", event: "unknown-event", timestamp: "t", source: "native", context: {} }),
      broadcast
    );

    expect(broadcast).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("필수 필드(event)가 없으면 broadcast를 호출하지 않는다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    dispatch(
      JSON.stringify({ schema_version: "1", timestamp: "t", source: "native", context: {} }),
      broadcast
    );

    expect(broadcast).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── 시나리오 F: 6대 필수 필드 무손실 전달 ──────────────────────────────────

describe("F. 6대 필수 필드 유실 없이 Renderer 전달", () => {
  it("schema_version, event, timestamp, source, context 모두 페이로드에 존재한다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();

    const raw = makeEvent({
      schema_version: "1",
      event: "turn-complete",
      timestamp: "2026-05-26T12:00:00.000Z",
      source: "native",
      context: { turn: 5 },
    });
    dispatch(raw, broadcast);

    expect(broadcast).toHaveBeenCalledTimes(1);
    const payload = broadcast.mock.calls[0][1];
    expect(payload.schema_version).toBe("1");
    expect(payload.event).toBe("turn-complete");
    expect(payload.timestamp).toBe("2026-05-26T12:00:00.000Z");
    expect(payload.source).toBe("native");
    expect(payload.context).toEqual({ turn: 5 });
  });
});

// ─── 시나리오 G: 선택 필드 보존 ──────────────────────────────────────────────

describe("G. session_id / mode 선택 필드 보존", () => {
  it("session_id, thread_id, turn_id, mode가 페이로드에 그대로 전달된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();

    const raw = makeEvent({
      event: "session-idle",
      session_id: "ses-abc123",
      thread_id: "thr-xyz",
      turn_id: "turn-42",
      mode: "auto",
    });
    dispatch(raw, broadcast);

    const payload = broadcast.mock.calls[0][1];
    expect(payload.session_id).toBe("ses-abc123");
    expect(payload.thread_id).toBe("thr-xyz");
    expect(payload.turn_id).toBe("turn-42");
    expect(payload.mode).toBe("auto");
  });

  it("선택 필드가 없어도 정상적으로 전달된다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    dispatch(makeEvent({ event: "session-idle" }), broadcast);

    expect(broadcast).toHaveBeenCalledTimes(1);
    const payload = broadcast.mock.calls[0][1];
    expect(payload.session_id).toBeUndefined();
    expect(payload.mode).toBeUndefined();
  });
});

// ─── 시나리오 H: 잘못된 JSON → 무시 ─────────────────────────────────────────

describe("H. 잘못된 JSON 라인 → 파싱 에러 없이 무시", () => {
  it("JSON이 아닌 라인을 전달해도 에러를 throw하지 않는다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    expect(() => dispatch("not-json-at-all", broadcast)).not.toThrow();
    expect(broadcast).not.toHaveBeenCalled();
  });

  it("부분적으로 잘린 JSON도 안전하게 무시한다", () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    expect(() => dispatch('{"event":"session-sta', broadcast)).not.toThrow();
    expect(broadcast).not.toHaveBeenCalled();
  });
});

// ─── 시나리오 I: source 필드 검증 ───────────────────────────────────────────

describe("I. source 필드 검증 — native/derived 외 값 거부", () => {
  it('"unknown" source 값은 스키마 불일치로 무시된다', () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    dispatch(
      JSON.stringify({
        schema_version: "1",
        event: "stop",
        timestamp: "t",
        source: "unknown",
        context: {},
      }),
      broadcast
    );

    expect(broadcast).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

// ─── 시나리오 J: schema_version 불일치 → 무시 ───────────────────────────────

describe('J. schema_version "2" 불일치 → 무시', () => {
  it('schema_version이 "2"이면 무시한다', () => {
    const broadcast = jest.fn<(channel: string, payload: HookEvent) => void>();
    const consoleSpy = jest.spyOn(console, "debug").mockImplementation(() => {});

    dispatch(
      JSON.stringify({
        schema_version: "2",
        event: "stop",
        timestamp: "t",
        source: "native",
        context: {},
      }),
      broadcast
    );

    expect(broadcast).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
