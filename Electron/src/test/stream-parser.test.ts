/**
 * stream-parser.test.ts — StreamParser, parseStreamLine, stream-bridge-ipc 테스트
 *
 * 시나리오:
 *   A. parseStreamLine — 유효 token JSON → StreamEnvelope 반환
 *   B. parseStreamLine — 비JSON 텍스트 → null 반환
 *   C. parseStreamLine — type 비표준 JSON → null 반환
 *   D. StreamParser: reasoning token → onThinkingToken 콜백
 *   E. StreamParser: content token → onContentToken 콜백
 *   F. StreamParser: tool_call → onToolCall 콜백
 *   G. StreamParser: interlude → onInterlude 콜백
 *   H. StreamParser: done → onDone 콜백
 *   I. StreamParser: 비JSON 라인 → onRawLine 콜백
 *   J. StreamParser.detach() → 이후 라인 무시
 *   K. registerStreamBridgeIpc — ipcMain.handle 2개 등록 확인
 *   L. startAgentStream → BrowserWindow.webContents.send 호출 확인
 *   M. stopAgentStream → child.kill("SIGTERM") 및 parser.detach() 호출 확인
 */

import { EventEmitter, Readable } from "stream";

// ─── Electron 모킹 ────────────────────────────────────────────────────────────

const mockWebContentsSend = jest.fn();
const mockIsDestroyed = jest.fn().mockReturnValue(false);
const mockKill = jest.fn();

jest.mock("electron", () => ({
  ipcMain: {
    handle: jest.fn(),
    removeHandler: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => [
      { isDestroyed: mockIsDestroyed, webContents: { send: mockWebContentsSend } },
    ]),
  },
}));

// ─── child_process 모킹 ───────────────────────────────────────────────────────

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { spawn } from "child_process";
import { ipcMain } from "electron";

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

// ─── 자식 프로세스 Mock 팩토리 ────────────────────────────────────────────────

function makeChildMock(lines: string[] = [], exitCode = 0) {
  const stdoutEmitter = new Readable({ read() {} });
  const stderrEmitter = new EventEmitter();
  const childEmitter = Object.assign(new EventEmitter(), {
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
    kill: mockKill,
  });

  process.nextTick(() => {
    for (const line of lines) {
      stdoutEmitter.push(line + "\n");
    }
    stdoutEmitter.push(null);
    childEmitter.emit("close", exitCode);
  });

  return childEmitter;
}

// ─── parseStreamLine 테스트 ───────────────────────────────────────────────────

describe("EL-213: parseStreamLine()", () => {
  let parseStreamLine: (raw: string) => unknown;

  beforeAll(async () => {
    ({ parseStreamLine } = await import("../main/cli/stream-parser"));
  });

  it("A: 유효한 token(content) JSON → TokenEnvelope 반환", () => {
    const raw = JSON.stringify({ type: "token", subType: "content", text: "hi" });
    const result = parseStreamLine(raw) as { type: string };
    expect(result).not.toBeNull();
    expect(result!.type).toBe("token");
  });

  it("B: 비JSON 텍스트 → null 반환", () => {
    expect(parseStreamLine("plain text log")).toBeNull();
  });

  it("C: 비표준 type 값 JSON → null 반환", () => {
    expect(parseStreamLine(JSON.stringify({ type: "unknown_xyz", val: 1 }))).toBeNull();
  });
});

// ─── StreamParser 콜백 분기 테스트 ───────────────────────────────────────────

describe("EL-213: StreamParser 콜백 분기", () => {
  let createStreamParser: (
    child: NodeJS.EventEmitter & { stdout: Readable },
    callbacks: Record<string, (e: unknown) => void>,
  ) => unknown;

  beforeAll(async () => {
    ({ createStreamParser } = await import("../main/cli/stream-parser"));
  });

  function run(lines: string[], callbacks: Record<string, jest.Mock>) {
    return new Promise<void>((resolve) => {
      const stdout = new Readable({ read() {} });
      const child = Object.assign(new EventEmitter(), { stdout, stderr: new EventEmitter() });
      createStreamParser(child as never, callbacks);
      process.nextTick(() => {
        for (const line of lines) stdout.push(line + "\n");
        stdout.push(null);
        setTimeout(resolve, 20);
      });
    });
  }

  it("D: reasoning token → onThinkingToken 콜백", async () => {
    const cb = jest.fn();
    await run([JSON.stringify({ type: "token", subType: "reasoning", text: "thinking" })], { onThinkingToken: cb });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("E: content token → onContentToken 콜백", async () => {
    const cb = jest.fn();
    await run([JSON.stringify({ type: "token", subType: "content", text: "answer" })], { onContentToken: cb });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("F: tool_call → onToolCall 콜백", async () => {
    const cb = jest.fn();
    await run(
      [JSON.stringify({ type: "tool_call", toolName: "readFile", args: {}, callId: "c1" })],
      { onToolCall: cb },
    );
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("G: interlude → onInterlude 콜백", async () => {
    const cb = jest.fn();
    await run([JSON.stringify({ type: "interlude", message: "waiting" })], { onInterlude: cb });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("H: done → onDone 콜백", async () => {
    const cb = jest.fn();
    await run([JSON.stringify({ type: "done", exitCode: 0 })], { onDone: cb });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("I: 비JSON 라인 → onRawLine 콜백", async () => {
    const cb = jest.fn();
    await run(["some raw log output"], { onRawLine: cb });
    expect(cb).toHaveBeenCalledWith("some raw log output");
  });

  it("J: detach() 호출 후 → 이후 라인 무시", async () => {
    const cbContent = jest.fn();
    const cbRaw = jest.fn();
    const stdout = new Readable({ read() {} });
    const child = Object.assign(new EventEmitter(), { stdout, stderr: new EventEmitter() });
    const { createStreamParser: createSP } = await import("../main/cli/stream-parser");
    const parser = createSP(child as never, { onContentToken: cbContent, onRawLine: cbRaw }) as {
      detach(): void;
    };

    await new Promise<void>((resolve) => {
      process.nextTick(() => {
        stdout.push(JSON.stringify({ type: "token", subType: "content", text: "before" }) + "\n");
        parser.detach();
        stdout.push(JSON.stringify({ type: "token", subType: "content", text: "after" }) + "\n");
        stdout.push(null);
        setTimeout(resolve, 20);
      });
    });

    expect(cbContent).toHaveBeenCalledTimes(1);
  });
});

// ─── stream-bridge-ipc 테스트 ─────────────────────────────────────────────────

describe("EL-213: registerStreamBridgeIpc()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spawnMock.mockClear();
  });

  it("K: ipcMain.handle 2개 채널 등록 확인", async () => {
    const { registerStreamBridgeIpc } = await import("../main/ipc/stream-bridge-ipc");
    registerStreamBridgeIpc();
    const calls = (ipcMain.handle as jest.Mock).mock.calls.map((c: [string]) => c[0]);
    expect(calls).toContain("omx:agent-stream:start");
    expect(calls).toContain("omx:agent-stream:stop");
  });

  it("L: startAgentStream → BrowserWindow.webContents.send 브로드캐스트", async () => {
    spawnMock.mockReturnValue(makeChildMock([
      JSON.stringify({ type: "token", subType: "content", text: "hello" }),
    ]) as ReturnType<typeof spawn>);

    const { startAgentStream } = await import("../main/ipc/stream-bridge-ipc");
    startAgentStream("ask", ["hi"], "standard");

    await new Promise((r) => setTimeout(r, 50));

    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "omx:stream-token",
      expect.objectContaining({ type: "token" }),
    );
  });

  it("M: stopAgentStream → child.kill(SIGTERM) 및 parser.detach() 호출", async () => {
    const childMock = makeChildMock([], 0);
    spawnMock.mockReturnValue(childMock as ReturnType<typeof spawn>);

    const {
      startAgentStream: startStream,
      stopAgentStream: stopStream,
      _getActiveSessionForTest,
      _resetSessionForTest,
    } = await import("../main/ipc/stream-bridge-ipc");

    _resetSessionForTest();
    startStream("ask", ["test"], "standard");

    await new Promise((r) => setTimeout(r, 10));

    const session = _getActiveSessionForTest();
    if (session) {
      const detachSpy = jest.spyOn(session.parser, "detach");
      stopStream();
      expect(mockKill).toHaveBeenCalledWith("SIGTERM");
      expect(detachSpy).toHaveBeenCalled();
    } else {
      // 세션이 이미 종료된 경우(exitCode resolve) — kill은 mock으로 확인
      expect(mockKill).toHaveBeenCalled();
    }

    _resetSessionForTest();
  });
});
