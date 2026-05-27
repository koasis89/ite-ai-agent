/**
 * EL-212.test.ts — executeCommand() Ndjson 직렬화 가드 테스트
 *
 * 시나리오:
 *   A. 유효한 StreamEnvelope(type:token) → onEnvelope 호출
 *   B. 비JSON 텍스트 라인 → onRawLine으로 우회, onEnvelope 미호출
 *   C. type 미포함 JSON → onRawLine으로 우회
 *   D. 비표준 type 값 JSON → onRawLine으로 우회
 *   E. --stream-json 플래그가 spawn args에 포함됨
 *   F. reasoningEffort=high → --high 플래그 포함
 *   G. streamJson=false → --stream-json 미포함
 *   H. onError: stderr 청크 수신 확인
 *   I. 여러 봉투 타입 혼합 — 각각 onEnvelope 호출
 *   J. 빈 라인 → onEnvelope / onRawLine 모두 미호출
 */

import { EventEmitter, Readable } from "stream";

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { spawn } from "child_process";

// ─── 자식 프로세스 Mock 팩토리 ────────────────────────────────────────────────

function makeChildMock(stdoutLines: string[] = [], exitCode = 0) {
  const stdoutEmitter = new Readable({ read() {} });
  const stderrEmitter = new EventEmitter();
  const childEmitter = new EventEmitter();

  const child = Object.assign(childEmitter, {
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
  });

  process.nextTick(() => {
    for (const line of stdoutLines) {
      stdoutEmitter.push(line + "\n");
    }
    stdoutEmitter.push(null);
    child.emit("close", exitCode);
  });

  return child;
}

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

// ─── 유효 봉투 라인 헬퍼 ─────────────────────────────────────────────────────
const tokenLine = JSON.stringify({ type: "token", subType: "content", text: "hello" });
const thinkingLine = JSON.stringify({ type: "token", subType: "reasoning", text: "hmm" });
const toolCallLine = JSON.stringify({ type: "tool_call", toolName: "readFile", args: {}, callId: "c1" });
const doneLine = JSON.stringify({ type: "done", exitCode: 0 });

describe("EL-212: executeCommand() 직렬화 가드 필터", () => {
  beforeEach(() => spawnMock.mockClear());

  // 시나리오 A
  it("A: 유효한 token 봉투 → onEnvelope 호출", async () => {
    spawnMock.mockReturnValue(makeChildMock([tokenLine]) as ReturnType<typeof spawn>);
    const { executeCommand } = await import("../main/core/execute-command");
    const received: unknown[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: ["hello"],
      onEnvelope: (e) => received.push(e),
    });
    await exitCode;
    expect(received).toHaveLength(1);
    expect((received[0] as { type: string }).type).toBe("token");
  });

  // 시나리오 B
  it("B: 비JSON 텍스트 → onRawLine 호출, onEnvelope 미호출", async () => {
    spawnMock.mockReturnValue(
      makeChildMock(["some plain text log"]) as ReturnType<typeof spawn>,
    );
    const { executeCommand } = await import("../main/core/execute-command");
    const envelopes: unknown[] = [];
    const rawLines: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: ["test"],
      onEnvelope: (e) => envelopes.push(e),
      onRawLine: (l) => rawLines.push(l),
    });
    await exitCode;
    expect(envelopes).toHaveLength(0);
    expect(rawLines).toContain("some plain text log");
  });

  // 시나리오 C
  it("C: type 미포함 JSON → onRawLine 우회", async () => {
    spawnMock.mockReturnValue(
      makeChildMock([JSON.stringify({ foo: "bar" })]) as ReturnType<typeof spawn>,
    );
    const { executeCommand } = await import("../main/core/execute-command");
    const envelopes: unknown[] = [];
    const rawLines: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: [],
      onEnvelope: (e) => envelopes.push(e),
      onRawLine: (l) => rawLines.push(l),
    });
    await exitCode;
    expect(envelopes).toHaveLength(0);
    expect(rawLines).toHaveLength(1);
  });

  // 시나리오 D
  it("D: 비표준 type 값 JSON → onRawLine 우회", async () => {
    spawnMock.mockReturnValue(
      makeChildMock([JSON.stringify({ type: "unknown_event", data: 1 })]) as ReturnType<typeof spawn>,
    );
    const { executeCommand } = await import("../main/core/execute-command");
    const envelopes: unknown[] = [];
    const rawLines: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: [],
      onEnvelope: (e) => envelopes.push(e),
      onRawLine: (l) => rawLines.push(l),
    });
    await exitCode;
    expect(envelopes).toHaveLength(0);
    expect(rawLines).toHaveLength(1);
  });

  // 시나리오 E
  it("E: streamJson=true(기본값) → --stream-json 플래그 포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { executeCommand } = await import("../main/core/execute-command");
    const { exitCode } = executeCommand({ command: "ask", args: ["hi"] });
    await exitCode;
    expect(spawnMock.mock.calls[0][1]).toContain("--stream-json");
  });

  // 시나리오 F
  it("F: reasoningEffort=high → --high 플래그 포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { executeCommand } = await import("../main/core/execute-command");
    const { exitCode } = executeCommand({ command: "ask", args: [], reasoningEffort: "high" });
    await exitCode;
    expect(spawnMock.mock.calls[0][1]).toContain("--high");
  });

  // 시나리오 G
  it("G: streamJson=false → --stream-json 미포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { executeCommand } = await import("../main/core/execute-command");
    const { exitCode } = executeCommand({ command: "ask", args: [], streamJson: false });
    await exitCode;
    expect(spawnMock.mock.calls[0][1]).not.toContain("--stream-json");
  });

  // 시나리오 H
  it("H: onError — stderr 청크 수신", async () => {
    const stdoutEmitter = new Readable({ read() {} });
    const stderrEmitter = new EventEmitter();
    const childEmitter = new EventEmitter();
    const child = Object.assign(childEmitter, { stdout: stdoutEmitter, stderr: stderrEmitter });

    spawnMock.mockReturnValue(child as ReturnType<typeof spawn>);
    const { executeCommand } = await import("../main/core/execute-command");
    const errors: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: [],
      onError: (e) => errors.push(e),
    });

    process.nextTick(() => {
      (stderrEmitter as EventEmitter).emit("data", Buffer.from("stderr msg"));
      stdoutEmitter.push(null);
      child.emit("close", 0);
    });

    await exitCode;
    expect(errors).toContain("stderr msg");
  });

  // 시나리오 I
  it("I: 혼합 봉투 라인 — 각각 onEnvelope 호출", async () => {
    spawnMock.mockReturnValue(
      makeChildMock([tokenLine, thinkingLine, toolCallLine, doneLine]) as ReturnType<typeof spawn>,
    );
    const { executeCommand } = await import("../main/core/execute-command");
    const types: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: [],
      onEnvelope: (e) => types.push(e.type),
    });
    await exitCode;
    expect(types).toEqual(["token", "token", "tool_call", "done"]);
  });

  // 시나리오 J
  it("J: 빈 라인 → onEnvelope / onRawLine 모두 미호출", async () => {
    spawnMock.mockReturnValue(
      makeChildMock(["", "   "]) as ReturnType<typeof spawn>,
    );
    const { executeCommand } = await import("../main/core/execute-command");
    const envelopes: unknown[] = [];
    const rawLines: string[] = [];
    const { exitCode } = executeCommand({
      command: "ask",
      args: [],
      onEnvelope: (e) => envelopes.push(e),
      onRawLine: (l) => rawLines.push(l),
    });
    await exitCode;
    expect(envelopes).toHaveLength(0);
    expect(rawLines).toHaveLength(0);
  });
});
