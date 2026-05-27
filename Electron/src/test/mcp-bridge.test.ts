/**
 * EL-206 DoD: MCP 브릿지 단위 테스트
 *
 * 시나리오:
 *   A. start() — spawn 호출 및 stdio 파이프 바인딩 확인
 *   B. send() — stdin write로 JSON-RPC 메시지 전달
 *   C. onMessage() — stdout 라인 수신 핸들러 트리거
 *   D. stderr 로깅 — stderr 데이터가 errorHandler로 전달됨
 *   E. kill() — SIGTERM 전송 후 프로세스 종료 resolve
 *   F. kill() SIGKILL 폴백 — 5초 내 미종료 시 SIGKILL 전송
 *   G. Respawn — 비정상 종료 시 자동 재기동 카운트 증가
 *   H. 최대 Respawn 초과 — MAX_RESPAWN_COUNT 초과 시 재기동 중단
 *   I. 에코 통합 테스트 — stdin 전송 후 stdout 에코 수신
 */

import { jest } from "@jest/globals";
import { EventEmitter } from "events";
import { Writable, Readable } from "stream";

// ─── child_process.spawn 모킹 ─────────────────────────────────────────────────

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

import { spawn } from "child_process";
import { McpBridge } from "../main/mcp/mcp-bridge";

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

/** 가상 자식 프로세스 팩토리 */
function makeChildMock() {
  const child = new EventEmitter() as any;
  child.stdin = new Writable({ write(_c: unknown, _e: unknown, cb: () => void) { cb(); } });
  child.stdout = new Readable({ read() {} });
  child.stderr = new Readable({ read() {} });
  child.stdout._read = () => {};
  child.stderr._read = () => {};
  child.killed = false;
  child.kill = jest.fn((signal?: string) => {
    child.killed = true;
    setImmediate(() => child.emit("close", signal === "SIGKILL" ? 137 : 0));
  });
  return child;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── 시나리오 A: spawn 호출 확인 ─────────────────────────────────────────────

describe("A. start() — spawn 호출 확인", () => {
  it("start()는 omx mcp-serve <serverName>을 spawn한다", () => {
    const child = makeChildMock();
    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "state", omxBin: "omx" });
    bridge.start();

    expect(mockSpawn).toHaveBeenCalledWith(
      "omx",
      ["mcp-serve", "state"],
      expect.objectContaining({ shell: false })
    );
  });

  it("이미 실행 중이면 두 번 spawn하지 않는다", () => {
    const child = makeChildMock();
    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "memory" });
    bridge.start();
    bridge.start(); // 두 번째 호출

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });
});

// ─── 시나리오 B: send() — stdin 전달 ─────────────────────────────────────────

describe("B. send() — stdin JSON-RPC 전달", () => {
  it("send()는 JSON 직렬화된 메시지를 stdin에 write한다", () => {
    const child = makeChildMock();
    const writeSpy = jest.spyOn(child.stdin, "write");
    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "code-intel" });
    bridge.start();
    bridge.send({ jsonrpc: "2.0", method: "tools/list", id: 1 });

    expect(writeSpy).toHaveBeenCalledWith(
      JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }) + "\n"
    );
  });

  it("프로세스 미실행 시 send()는 에러를 throw한다", () => {
    const bridge = new McpBridge({ serverName: "wiki" });
    expect(() => bridge.send({ jsonrpc: "2.0", method: "ping" })).toThrow(
      /프로세스가 실행 중이지 않습니다/
    );
  });
});

// ─── 시나리오 C: onMessage() — stdout 라인 수신 ──────────────────────────────

describe("C. onMessage() — stdout 라인 핸들러 트리거", () => {
  it("stdout에서 완성된 라인이 오면 onMessage 콜백이 호출된다", async () => {
    const child = makeChildMock();
    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "state" });
    const received: string[] = [];
    bridge.onMessage((line) => received.push(line));
    bridge.start();

    // stdout 라인 모의 전송
    child.stdout.push('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}\n');
    child.stdout.push(null); // EOF

    // readline 이벤트 처리 대기
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toContain('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
  });
});

// ─── 시나리오 D: stderr 로깅 ──────────────────────────────────────────────────

describe("D. stderr 로깅 — errorHandler 트리거", () => {
  it("stderr 데이터가 수신되면 onError 콜백이 호출된다", async () => {
    const child = makeChildMock();
    mockSpawn.mockReturnValue(child);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const bridge = new McpBridge({ serverName: "state" });
    const errors: Error[] = [];
    bridge.onError((err) => errors.push(err));
    bridge.start();

    child.stderr.push("fatal: cannot start server\n");
    child.stderr.push(null);

    await new Promise((resolve) => setImmediate(resolve));

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("fatal: cannot start server");
    consoleSpy.mockRestore();
  });
});

// ─── 시나리오 E: kill() — SIGTERM 정상 종료 ──────────────────────────────────

describe("E. kill() — SIGTERM 전송 후 resolve", () => {
  it("kill()은 SIGTERM으로 프로세스를 종료하고 Promise를 resolve한다", async () => {
    jest.useRealTimers();
    const child = makeChildMock();
    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "state" });
    bridge.start();

    const killPromise = bridge.kill();
    await expect(killPromise).resolves.toBeUndefined();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});

// ─── 시나리오 F: kill() SIGKILL 폴백 ─────────────────────────────────────────

describe("F. kill() — 5초 후 SIGKILL 폴백", () => {
  it("SIGTERM 후 5초 내 미종료 시 SIGKILL로 강제 해제한다", async () => {
    // SIGTERM에 반응하지 않는 좀비 프로세스 모킹
    const child = new EventEmitter() as any;
    child.stdin = new Writable({ write(_c: unknown, _e: unknown, cb: () => void) { cb(); } });
    child.stdout = new Readable({ read() {} });
    child.stderr = new Readable({ read() {} });
    child.killed = false;
    child.kill = jest.fn((signal?: string) => {
      if (signal === "SIGKILL") {
        child.killed = true;
        setImmediate(() => child.emit("close", 137));
      }
      // SIGTERM은 무시 (좀비 시뮬레이션)
    });
    mockSpawn.mockReturnValue(child);

    jest.useFakeTimers();

    const bridge = new McpBridge({ serverName: "zombie" });
    bridge.start();

    const killPromise = bridge.kill();

    // 5초 타임아웃 앞당김
    jest.advanceTimersByTime(5_001);

    jest.useRealTimers();
    await expect(killPromise).resolves.toBeUndefined();
    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });
});

// ─── 시나리오 G: 자동 Respawn ─────────────────────────────────────────────────

describe("G. Respawn — 비정상 종료 시 자동 재기동", () => {
  it("비정상 종료(code !== 0) 시 respawnCount가 1 증가한다", async () => {
    jest.useRealTimers();
    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      const child = makeChildMock();
      if (callCount === 1) {
        // 첫 번째 프로세스는 2초 뒤 비정상 종료 시뮬레이션
        setTimeout(() => {
          child.killed = true;
          child.emit("close", 1);
        }, 10);
      }
      return child;
    });

    const bridge = new McpBridge({ serverName: "state" });
    bridge.start();

    // 비정상 종료 + 쿨다운 대기
    await new Promise((resolve) => setTimeout(resolve, 2_100));

    expect(bridge.respawnCount).toBe(1);
  });
});

// ─── 시나리오 H: 최대 Respawn 초과 차단 ──────────────────────────────────────

describe("H. 최대 Respawn 초과 — 재기동 중단", () => {
  it("respawnCount가 3에 도달하면 더 이상 재기동하지 않는다", async () => {
    jest.useRealTimers();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    let spawnCallCount = 0;
    mockSpawn.mockImplementation(() => {
      spawnCallCount++;
      const child = makeChildMock();
      setTimeout(() => {
        child.killed = true;
        child.emit("close", 1);
      }, 10);
      return child;
    });

    const bridge = new McpBridge({ serverName: "unstable" });
    bridge.start();

    // 3회 재기동 + 쿨다운 (4회 spawn: 최초 1 + 재기동 3)
    await new Promise((resolve) => setTimeout(resolve, 8_000));

    expect(spawnCallCount).toBeLessThanOrEqual(4);
    consoleSpy.mockRestore();
  }, 10_000);
});

// ─── 시나리오 I: stdio 에코 통합 테스트 ──────────────────────────────────────

describe("I. stdio 에코 통합 테스트 — stdin 전송 후 stdout 수신", () => {
  it("send() 후 에코 응답이 onMessage 핸들러로 도달한다", async () => {
    const child = makeChildMock();
    const received: string[] = [];

    // stdin write를 stdout 에코로 모킹
    jest.spyOn(child.stdin, "write").mockImplementation((data: unknown) => {
      const line = (data as string).trim();
      setImmediate(() => child.stdout.push(line + "\n"));
      return true;
    });

    mockSpawn.mockReturnValue(child);

    const bridge = new McpBridge({ serverName: "echo-server" });
    bridge.onMessage((line) => received.push(line));
    bridge.start();

    bridge.send({ jsonrpc: "2.0", method: "ping", id: 99 });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received.some((l) => l.includes('"ping"'))).toBe(true);
  });
});
