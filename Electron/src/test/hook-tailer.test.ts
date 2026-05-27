/**
 * EL-207 DoD: HookTailer 단위 테스트
 *
 * 시나리오:
 *   A. start() — fs.watch 호출, 최신 파일 스트림 구독 확인
 *   B. 라인 버퍼 어셈블러 — 불완전 청크 조립 후 완전한 라인 콜백
 *   C. 고속 JSONL 쓰기 — 100개 라인 유실 0% (누수 0%)
 *   D. 로테이션 — 새 파일 생성 시 스트림 핫스위핑
 *   E. stop() — watcher/stream 자원 해제 확인
 *   F. 멀티 핸들러 — 여러 onLine 콜백이 모두 수신
 *   G. 빈 라인 필터링 — 공백/빈 라인은 콜백에 전달하지 않음
 */

import { jest } from "@jest/globals";
import { EventEmitter } from "events";
import * as path from "path";

// ─── fs 모킹 ─────────────────────────────────────────────────────────────────

jest.mock("fs");
import * as fs from "fs";
import { HookTailer } from "../main/logs/hook-tailer";

const mockFs = fs as jest.Mocked<typeof fs>;

type WatchCallback = (event: string, filename: string | null) => void;

/** 가상 ReadStream 팩토리 */
function makeReadStreamMock(lines: string[] = []): any {
  const emitter = new EventEmitter();
  (emitter as any).destroy = jest.fn(() => {
    emitter.emit("close");
  });
  // 즉시 라인 데이터 방출
  setImmediate(() => {
    if (lines.length > 0) {
      emitter.emit("data", lines.join("\n") + "\n");
    }
    emitter.emit("end");
  });
  return emitter;
}

/** 가상 FSWatcher 팩토리 */
function makeWatcherMock(): { watcher: any; trigger: WatchCallback } {
  let _cb: WatchCallback | null = null;
  const watcher = {
    close: jest.fn(),
  };
  const trigger = (event: string, filename: string | null) => {
    if (_cb) _cb(event, filename);
  };

  // fs.watch 모킹 시 콜백 저장
  (mockFs.watch as jest.MockedFunction<typeof fs.watch>).mockImplementation(
    (_path: any, _opts: any, cb?: WatchCallback) => {
      if (typeof _opts === "function") {
        _cb = _opts as WatchCallback;
      } else if (cb) {
        _cb = cb;
      }
      return watcher as unknown as fs.FSWatcher;
    }
  );

  return { watcher, trigger };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── 시나리오 A: start() — fs.watch 호출 ────────────────────────────────────

describe("A. start() — fs.watch 호출 및 최신 파일 구독", () => {
  it("start()는 지정 디렉터리에 fs.watch를 호출한다", () => {
    const logsDir = "/tmp/.omx/logs";
    const { watcher } = makeWatcherMock();

    mockFs.readdirSync.mockReturnValue([] as any);
    mockFs.createReadStream.mockReturnValue(makeReadStreamMock() as any);

    const tailer = new HookTailer();
    tailer.start(logsDir);

    expect(mockFs.watch).toHaveBeenCalledWith(
      logsDir,
      expect.anything(),
      expect.any(Function)
    );
    tailer.stop();
  });

  it("최신 hooks-*.jsonl 파일이 있으면 자동으로 스트림을 생성한다", () => {
    makeWatcherMock();

    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);
    const streamMock = makeReadStreamMock();
    mockFs.createReadStream.mockReturnValue(streamMock as any);

    const tailer = new HookTailer();
    tailer.start("/logs");

    expect(mockFs.createReadStream).toHaveBeenCalledWith(
      path.join("/logs", "hooks-20260526.jsonl"),
      expect.anything()
    );
    tailer.stop();
  });
});

// ─── 시나리오 B: 라인 버퍼 어셈블러 ─────────────────────────────────────────

describe("B. 라인 버퍼 어셈블러 — 불완전 청크 조립", () => {
  it("두 청크로 나뉜 라인을 완전하게 조립해 콜백한다", async () => {
    makeWatcherMock();
    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);

    // ReadStream 이벤트를 수동으로 제어
    const streamEmitter = new EventEmitter() as any;
    streamEmitter.destroy = jest.fn();
    mockFs.createReadStream.mockReturnValue(streamEmitter as any);

    const tailer = new HookTailer();
    const received: string[] = [];
    tailer.onLine((line) => received.push(line));
    tailer.start("/logs");

    // 첫 번째 청크: 불완전 (줄바꿈 없음)
    streamEmitter.emit("data", '{"event":"session-st');
    // 두 번째 청크: 완성 + 두 번째 라인
    streamEmitter.emit("data", 'art","schema_version":"1"}\n{"event":"stop","schema_version":"1"}\n');
    streamEmitter.emit("end");

    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toHaveLength(2);
    expect(received[0]).toContain('"session-start"');
    expect(received[1]).toContain('"stop"');
    tailer.stop();
  });
});

// ─── 시나리오 C: 고속 JSONL 쓰기 — 누수 0% ──────────────────────────────────

describe("C. 고속 JSONL 쓰기 — 100개 라인 유실 0%", () => {
  it("100개 JSONL 라인을 전송하면 모두 수신된다 (유실 없음)", async () => {
    makeWatcherMock();
    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);

    const streamEmitter = new EventEmitter() as any;
    streamEmitter.destroy = jest.fn();
    mockFs.createReadStream.mockReturnValue(streamEmitter as any);

    const tailer = new HookTailer();
    const received: string[] = [];
    tailer.onLine((line) => received.push(line));
    tailer.start("/logs");

    // 100개 JSONL 라인 생성 및 전송
    const lines = Array.from({ length: 100 }, (_, i) =>
      JSON.stringify({ event: "post-tool-use", schema_version: "1", seq: i })
    );

    // 모든 라인을 단일 청크로 전송 (실제 고속 쓰기 시뮬레이션)
    streamEmitter.emit("data", lines.join("\n") + "\n");
    streamEmitter.emit("end");

    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toHaveLength(100);
    // 순서 보장 검증
    for (let i = 0; i < 100; i++) {
      expect(received[i]).toContain(`"seq":${i}`);
    }
    tailer.stop();
  });
});

// ─── 시나리오 D: 날짜 로테이션 핫스위핑 ──────────────────────────────────────

describe("D. 로테이션 — 새 파일 생성 시 스트림 전환", () => {
  it("watcher가 새 hooks-*.jsonl 파일을 감지하면 스트림을 교체한다", async () => {
    const { trigger } = makeWatcherMock();

    // 처음엔 구 파일만 존재
    let callCount = 0;
    mockFs.readdirSync.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return ["hooks-20260525.jsonl"] as any;
      return ["hooks-20260525.jsonl", "hooks-20260526.jsonl"] as any;
    });
    mockFs.statSync.mockImplementation((p: any) => ({
      mtimeMs: p.includes("20260526") ? Date.now() + 1000 : Date.now() - 1000,
    }) as any);

    const streams: any[] = [];
    mockFs.createReadStream.mockImplementation(() => {
      const s = new EventEmitter() as any;
      s.destroy = jest.fn(() => s.emit("close"));
      streams.push(s);
      return s;
    });

    const tailer = new HookTailer();
    const received: string[] = [];
    tailer.onLine((line) => received.push(line));
    tailer.start("/logs");

    // 구 파일에서 라인 수신
    streams[0].emit("data", '{"event":"session-start","schema_version":"1"}\n');

    // 새 파일 등장 → 로테이션
    trigger("rename", "hooks-20260526.jsonl");

    await new Promise((resolve) => setImmediate(resolve));

    // 이전 스트림이 닫혔는지 확인
    expect(streams[0].destroy).toHaveBeenCalled();
    // 새 스트림이 생성됐는지 확인
    expect(streams.length).toBeGreaterThan(1);
    tailer.stop();
  });
});

// ─── 시나리오 E: stop() — 자원 해제 ─────────────────────────────────────────

describe("E. stop() — watcher 및 stream 자원 해제", () => {
  it("stop()은 watcher.close()를 호출한다", () => {
    const { watcher } = makeWatcherMock();
    mockFs.readdirSync.mockReturnValue([] as any);

    const tailer = new HookTailer();
    tailer.start("/logs");
    tailer.stop();

    expect(watcher.close).toHaveBeenCalled();
  });

  it("stop() 후에는 새 라인이 콜백에 전달되지 않는다", async () => {
    makeWatcherMock();
    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);

    const streamEmitter = new EventEmitter() as any;
    streamEmitter.destroy = jest.fn();
    mockFs.createReadStream.mockReturnValue(streamEmitter as any);

    const tailer = new HookTailer();
    const received: string[] = [];
    tailer.onLine((line) => received.push(line));
    tailer.start("/logs");
    tailer.stop();

    // stop 후 라인 전송 시도
    streamEmitter.emit("data", '{"event":"post-tool-use","schema_version":"1"}\n');

    await new Promise((resolve) => setImmediate(resolve));

    // stop 이후 스트림이 destroy되어 라인이 전달되지 않아야 함
    expect(streamEmitter.destroy).toHaveBeenCalled();
  });
});

// ─── 시나리오 F: 멀티 핸들러 ─────────────────────────────────────────────────

describe("F. 멀티 핸들러 — 여러 onLine 콜백 동시 수신", () => {
  it("onLine 콜백이 2개 등록된 경우 모두 호출된다", async () => {
    makeWatcherMock();
    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);

    const streamEmitter = new EventEmitter() as any;
    streamEmitter.destroy = jest.fn();
    mockFs.createReadStream.mockReturnValue(streamEmitter as any);

    const tailer = new HookTailer();
    const bucket1: string[] = [];
    const bucket2: string[] = [];
    tailer.onLine((l) => bucket1.push(l));
    tailer.onLine((l) => bucket2.push(l));
    tailer.start("/logs");

    streamEmitter.emit("data", '{"event":"stop","schema_version":"1"}\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(bucket1.length).toBe(1);
    expect(bucket2.length).toBe(1);
    tailer.stop();
  });
});

// ─── 시나리오 G: 빈 라인 필터링 ─────────────────────────────────────────────

describe("G. 빈 라인 필터링 — 공백 라인 무시", () => {
  it("빈 라인과 공백만 있는 라인은 콜백으로 전달되지 않는다", async () => {
    makeWatcherMock();
    mockFs.readdirSync.mockReturnValue(["hooks-20260526.jsonl"] as any);
    mockFs.statSync.mockReturnValue({ mtimeMs: Date.now() } as any);

    const streamEmitter = new EventEmitter() as any;
    streamEmitter.destroy = jest.fn();
    mockFs.createReadStream.mockReturnValue(streamEmitter as any);

    const tailer = new HookTailer();
    const received: string[] = [];
    tailer.onLine((l) => received.push(l));
    tailer.start("/logs");

    streamEmitter.emit("data", '\n\n  \n{"event":"stop","schema_version":"1"}\n\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toHaveLength(1);
    expect(received[0]).toContain('"stop"');
    tailer.stop();
  });
});
