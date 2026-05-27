/**
 * 인터류드 UI 통합 테스트: interlude-ui.integrated.test.ts
 *
 * 검증 시나리오:
 *   Full Flow A: 질문 인입 → 사용자 입력 → 승인 → stdin 주입 → 락 해제
 *   Full Flow B: 질문 인입 → 취소 → SIGTERM → 락 해제
 *   Edge C:     callId 미등록 ACK → 무시 (오류 없음)
 *   Edge D:     activeChild 없이 승인 → 오류 채널 브로드캐스트
 *   Edge E:     중복 ACK → 두 번째 처리 무시
 */

// ─── Electron mock ────────────────────────────────────────────────────────────

jest.mock("electron", () => {
  const allWindows: unknown[] = [];
  return {
    BrowserWindow: {
      getAllWindows: jest.fn(() => allWindows),
      _allWindows: allWindows,
    },
    ipcMain: {
      _handlers: new Map<string, Function>(),
      handle(channel: string, fn: Function) {
        this._handlers.set(channel, fn);
      },
      removeHandler(channel: string) {
        this._handlers.delete(channel);
      },
      async invoke(channel: string, ...args: unknown[]) {
        const fn = this._handlers.get(channel);
        if (!fn) throw new Error(`No handler for ${channel}`);
        return fn({}, ...args);
      },
    },
  };
});

import { BrowserWindow, ipcMain } from "electron";
import { EventEmitter } from "stream";
import type { ChildProcessWithoutNullStreams } from "child_process";

import {
  registerInterludeIpc,
  setInterludeChild,
  registerPendingInterlude,
  _resetInterludeForTest,
  INTERLUDE_RESOLVED_CHANNEL,
  INTERLUDE_CANCELLED_CHANNEL,
  INTERLUDE_ERROR_CHANNEL,
} from "../../main/ipc/interlude-ipc";
import {
  getInterludeTriager,
  _resetTriagerForTest,
  INTERLUDE_ACK_CHANNEL,
  INTERLUDE_START_CHANNEL,
} from "../../main/cli/interlude-triager";
import type { StreamEnvelope } from "../../main/cli/constants";

// ─── 헬퍼: 목 윈도우 ─────────────────────────────────────────────────────────

function makeMockWindow() {
  const sends: Array<{ channel: string; data: unknown }> = [];
  const win = {
    isDestroyed: () => false,
    webContents: {
      send: (channel: string, data: unknown) => {
        sends.push({ channel, data });
      },
    },
    _sends: sends,
  };
  return win;
}

function addWindow(win: ReturnType<typeof makeMockWindow>) {
  (BrowserWindow as unknown as { _allWindows: unknown[] })._allWindows.push(win);
}

function clearWindows() {
  (BrowserWindow as unknown as { _allWindows: unknown[] })._allWindows.length = 0;
}

// ─── 헬퍼: MockChildProcess ───────────────────────────────────────────────────

class MockChildProcess extends EventEmitter {
  killed = false;
  stdin: {
    writtenData: string[];
    write: (data: string) => boolean;
    on: (event: string, fn: Function) => this;
    once: (event: string, fn: Function) => this;
    removeListener: (event: string, fn: Function) => this;
  };
  kill: jest.Mock;

  constructor() {
    super();
    const writtenData: string[] = [];
    const emitter = new EventEmitter();
    this.stdin = {
      writtenData,
      write: (data: string) => {
        writtenData.push(data);
        return true;
      },
      on: (ev: string, fn: Function) => { emitter.on(ev, fn as (...a: unknown[]) => void); return this.stdin; },
      once: (ev: string, fn: Function) => { emitter.once(ev, fn as (...a: unknown[]) => void); return this.stdin; },
      removeListener: (ev: string, fn: Function) => { emitter.removeListener(ev, fn as (...a: unknown[]) => void); return this.stdin; },
    };
    this.kill = jest.fn((signal?: string) => {
      this.killed = true;
      this.emit("close", signal);
    });
  }
}

// ─── ipcMain.invoke 헬퍼 ─────────────────────────────────────────────────────

async function invokeAck(ack: {
  callId: string;
  approved: boolean;
  userInput?: string;
}) {
  return (ipcMain as unknown as {
    invoke: (channel: string, ack: unknown) => Promise<unknown>
  }).invoke(INTERLUDE_ACK_CHANNEL, ack);
}

// ─── 초기화 ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetInterludeForTest();
  _resetTriagerForTest();
  clearWindows();
  jest.clearAllMocks();
  registerInterludeIpc();
});

// ─── Full Flow A: 승인 흐름 ────────────────────────────────────────────────────

describe("Full Flow A: 질문 인입 → 사용자 승인 → stdin 주입 → 락 해제", () => {
  it("A: triage() 후 ACK 승인 시 stdin에 userInput이 주입되고 resolved가 브로드캐스트된다", async () => {
    // 윈도우 준비
    const win = makeMockWindow();
    addWindow(win);

    // 자식 프로세스 준비
    const child = new MockChildProcess();
    setInterludeChild(child as unknown as ChildProcessWithoutNullStreams);

    // 인터류드 트리아지
    const triager = getInterludeTriager();
    const envelope: StreamEnvelope & { type: "interlude" } = {
      type: "interlude",
      callId: "test-call-a1",
      kind: "askUserQuestion",
      question: "경로를 입력하세요",
      persona: "planner",
    } as unknown as StreamEnvelope & { type: "interlude" };

    const payload = triager.triage(envelope);

    // interlude-start 브로드캐스트 확인
    const startSend = win._sends.find((s) => s.channel === INTERLUDE_START_CHANNEL);
    expect(startSend).toBeTruthy();
    expect((startSend!.data as typeof payload).callId).toBe("test-call-a1");

    // 대기 큐 등록
    registerPendingInterlude(payload.callId);

    // 사용자 승인 ACK 전송
    const result = await invokeAck({
      callId: payload.callId,
      approved: true,
      userInput: "/workspace/project",
    });

    expect((result as { ok: boolean }).ok).toBe(true);

    // stdin에 입력값이 주입됐는지 확인
    expect(child.stdin.writtenData[0]).toContain("/workspace/project");

    // resolved 브로드캐스트 확인
    const resolvedSend = win._sends.find((s) => s.channel === INTERLUDE_RESOLVED_CHANNEL);
    expect(resolvedSend).toBeTruthy();
    expect((resolvedSend!.data as { callId: string }).callId).toBe("test-call-a1");
  });
});

// ─── Full Flow B: 취소 흐름 ────────────────────────────────────────────────────

describe("Full Flow B: 질문 인입 → 취소 → SIGTERM → cancelled 브로드캐스트", () => {
  it("B: ACK 거절 시 SIGTERM 호출 후 cancelled 브로드캐스트된다", async () => {
    const win = makeMockWindow();
    addWindow(win);

    const child = new MockChildProcess();
    setInterludeChild(child as unknown as ChildProcessWithoutNullStreams);

    const triager = getInterludeTriager();
    const envelope = {
      type: "interlude",
      callId: "test-call-b1",
      kind: "pre-tool-use",
      question: "이 도구를 실행해도 됩니까?",
      persona: "executor",
    } as unknown as StreamEnvelope & { type: "interlude" };

    const payload = triager.triage(envelope);
    registerPendingInterlude(payload.callId);

    const result = await invokeAck({
      callId: payload.callId,
      approved: false,
    });

    expect((result as { ok: boolean }).ok).toBe(true);

    // SIGTERM 호출 확인
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");

    // cancelled 브로드캐스트 확인
    const cancelledSend = win._sends.find((s) => s.channel === INTERLUDE_CANCELLED_CHANNEL);
    expect(cancelledSend).toBeTruthy();
  });
});

// ─── Edge C: 미등록 callId ────────────────────────────────────────────────────

describe("Edge C: 미등록 callId ACK 처리", () => {
  it("C: 등록되지 않은 callId의 ACK는 ok=false를 반환한다", async () => {
    const result = await invokeAck({
      callId: "unknown-call-id",
      approved: true,
    });
    expect((result as { ok: boolean }).ok).toBe(false);
  });
});

// ─── Edge D: activeChild 없이 승인 ────────────────────────────────────────────

describe("Edge D: activeChild 없이 승인 시 오류 채널 브로드캐스트", () => {
  it("D: setInterludeChild(null) 상태에서 승인 시 error 채널을 브로드캐스트한다", async () => {
    const win = makeMockWindow();
    addWindow(win);

    setInterludeChild(null);
    registerPendingInterlude("no-child-call");

    const result = await invokeAck({
      callId: "no-child-call",
      approved: true,
    });

    expect((result as { ok: boolean }).ok).toBe(false);

    const errorSend = win._sends.find((s) => s.channel === INTERLUDE_ERROR_CHANNEL);
    expect(errorSend).toBeTruthy();
  });
});

// ─── Edge E: 중복 ACK 방지 ───────────────────────────────────────────────────

describe("Edge E: 중복 ACK 방지", () => {
  it("E: 동일 callId로 두 번 ACK 전송 시 두 번째는 ok=false를 반환한다", async () => {
    const child = new MockChildProcess();
    setInterludeChild(child as unknown as ChildProcessWithoutNullStreams);

    registerPendingInterlude("dup-call-id");

    // 첫 번째 ACK
    const first = await invokeAck({ callId: "dup-call-id", approved: true });
    expect((first as { ok: boolean }).ok).toBe(true);

    // 두 번째 ACK (중복)
    const second = await invokeAck({ callId: "dup-call-id", approved: true });
    expect((second as { ok: boolean }).ok).toBe(false);
  });
});
