/**
 * EL-211.test.ts — ask() / sparkshell() 비동기 프로세스 기동 테스트
 *
 * 시나리오:
 *   A. ask() 기본 실행 — 정상 종료 코드 0 반환
 *   B. ask() --high 플래그 탑재 확인
 *   C. ask() --xhigh 플래그 탑재 확인
 *   D. ask() --stream-json 플래그 탑재 확인
 *   E. ask() 비정상 종료 코드 1 반환
 *   F. ask() 프로세스 기동 실패 (error 이벤트)
 *   G. ask() onLine 콜백 호출 확인
 *   H. sparkshell() 기본 실행 — 정상 종료 코드 0 반환
 *   I. sparkshell() --session 플래그 탑재 확인
 *   J. sparkshell() close 시그널(null 코드) → reject
 */

import { EventEmitter, Readable } from "stream";

// ─── child_process 모킹 ───────────────────────────────────────────────────────

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { spawn } from "child_process";

// ─── 자식 프로세스 Mock 팩토리 ────────────────────────────────────────────────

interface ChildMockOpts {
  lines?: string[];       // stdout 라인 (순서대로 방출)
  stderrLines?: string[]; // stderr 청크
  exitCode?: number | null;
  emitError?: Error;      // "error" 이벤트
}

function makeChildMock(opts: ChildMockOpts = {}) {
  const { lines = [], stderrLines = [], exitCode = 0, emitError } = opts;

  const stdoutEmitter = new Readable({ read() {} });
  const stderrEmitter = new EventEmitter() as NodeJS.EventEmitter & { read?(): void };
  const childEmitter = new EventEmitter();

  const child = Object.assign(childEmitter, {
    stdout: stdoutEmitter,
    stderr: stderrEmitter,
  });

  // 비동기로 이벤트 방출 (실제 spawn 시뮬레이션)
  process.nextTick(() => {
    if (emitError) {
      child.emit("error", emitError);
      return;
    }
    for (const line of lines) {
      stdoutEmitter.push(line + "\n");
    }
    stdoutEmitter.push(null);

    for (const chunk of stderrLines) {
      (stderrEmitter as EventEmitter).emit("data", Buffer.from(chunk));
    }

    child.emit("close", exitCode);
  });

  return child;
}

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

// ─── ask() 테스트 ─────────────────────────────────────────────────────────────

describe("EL-211: ask()", () => {
  beforeEach(() => spawnMock.mockClear());

  // 시나리오 A
  it("A: 기본 실행 — 종료 코드 0 반환", async () => {
    spawnMock.mockReturnValue(makeChildMock({ exitCode: 0 }) as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    const code = await ask({ prompt: "hello" });
    expect(code).toBe(0);
    expect(spawnMock).toHaveBeenCalledWith("omx", ["ask", "hello"], { shell: false });
  });

  // 시나리오 B
  it("B: reasoningEffort=high → --high 플래그 포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    await ask({ prompt: "test", reasoningEffort: "high" });
    expect(spawnMock.mock.calls[0][1]).toContain("--high");
  });

  // 시나리오 C
  it("C: reasoningEffort=xhigh → --xhigh 플래그 포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    await ask({ prompt: "test", reasoningEffort: "xhigh" });
    expect(spawnMock.mock.calls[0][1]).toContain("--xhigh");
  });

  // 시나리오 D
  it("D: streamJson=true → --stream-json 플래그 포함", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    await ask({ prompt: "test", streamJson: true });
    expect(spawnMock.mock.calls[0][1]).toContain("--stream-json");
  });

  // 시나리오 E
  it("E: 비정상 종료 코드 1 반환", async () => {
    spawnMock.mockReturnValue(makeChildMock({ exitCode: 1 }) as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    const code = await ask({ prompt: "fail" });
    expect(code).toBe(1);
  });

  // 시나리오 F
  it("F: 프로세스 기동 실패(error 이벤트) → reject", async () => {
    spawnMock.mockReturnValue(
      makeChildMock({ emitError: new Error("ENOENT") }) as ReturnType<typeof spawn>,
    );
    const { ask } = await import("../main/cli/ask");
    await expect(ask({ prompt: "test" })).rejects.toThrow("[ask]");
  });

  // 시나리오 G
  it("G: onLine 콜백이 stdout 라인별로 호출", async () => {
    const lines = ["line1", "line2"];
    spawnMock.mockReturnValue(makeChildMock({ lines }) as ReturnType<typeof spawn>);
    const { ask } = await import("../main/cli/ask");
    const received: string[] = [];
    await ask({ prompt: "test", onLine: (l) => received.push(l) });
    expect(received).toEqual(lines);
  });
});

// ─── sparkshell() 테스트 ──────────────────────────────────────────────────────

describe("EL-211: sparkshell()", () => {
  beforeEach(() => spawnMock.mockClear());

  // 시나리오 H
  it("H: 기본 실행 — 종료 코드 0 반환", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { sparkshell } = await import("../main/cli/sparkshell");
    const code = await sparkshell({ prompt: "run" });
    expect(code).toBe(0);
    expect(spawnMock.mock.calls[0][1]).toEqual(["sparkshell", "run"]);
  });

  // 시나리오 I
  it("I: sessionId 제공 시 --session 플래그 탑재", async () => {
    spawnMock.mockReturnValue(makeChildMock() as ReturnType<typeof spawn>);
    const { sparkshell } = await import("../main/cli/sparkshell");
    await sparkshell({ prompt: "run", sessionId: "sess-001" });
    const args: string[] = spawnMock.mock.calls[0][1] as string[];
    expect(args).toContain("--session");
    expect(args).toContain("sess-001");
  });

  // 시나리오 J
  it("J: close 시그널(null exitCode) → reject", async () => {
    spawnMock.mockReturnValue(makeChildMock({ exitCode: null }) as ReturnType<typeof spawn>);
    const { sparkshell } = await import("../main/cli/sparkshell");
    await expect(sparkshell({ prompt: "test" })).rejects.toThrow("[sparkshell]");
  });
});
