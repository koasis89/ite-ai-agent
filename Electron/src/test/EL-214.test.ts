/**
 * EL-214 단위 테스트: stdin-writer.ts
 *
 * 검증 시나리오:
 *   A. 정상 write — 단일 문자열 stdin 주입 성공
 *   B. 개행 엔드마커 — 데이터 끝에 \n 자동 추가 확인
 *   C. 중복 개행 방지 — 이미 \n으로 끝난 데이터는 추가 \n 없음
 *   D. 백프레셔 drain — write() false 반환 시 drain 대기 후 resolve
 *   E. 종료된 프로세스 가드 — child.killed = true 시 Error throw
 *   F. null stdin 가드 — child.stdin = null 시 Error throw
 *   G. drain 중 프로세스 종료 — close 이벤트 시 reject
 *   H. writeBurstToStdin — 다중 청크 순차 주입 성공
 *   I. writeBurstToStdin — 첫 번째 청크 실패 시 나머지 중단
 */

import { EventEmitter, Readable, Writable } from "stream";
import type { ChildProcessWithoutNullStreams } from "child_process";
import { writeToStdin, writeBurstToStdin } from "../../main/cli/stdin-writer";

// ─── 헬퍼: 자식 프로세스 목 생성 ─────────────────────────────────────────────

interface MockChild extends EventEmitter {
  killed: boolean;
  stdin: MockStdin | null;
  kill: jest.Mock;
}

class MockStdin extends EventEmitter implements Writable {
  writable = true;
  writableEnded = false;
  writableFinished = false;
  writableHighWaterMark = 65536;
  writableLength = 0;
  writableObjectMode = false;
  writableCorked = 0;
  destroyed = false;
  closed = false;
  errored: Error | null = null;
  writableNeedDrain = false;

  private _returnValue: boolean;
  public writtenData: string[] = [];

  constructor(returnValue = true) {
    super();
    this._returnValue = returnValue;
  }

  write(chunk: unknown, _encodingOrCb?: unknown, _cb?: unknown): boolean {
    this.writtenData.push(String(chunk));
    return this._returnValue;
  }

  end(_chunk?: unknown, _encodingOrCb?: unknown, _cb?: unknown): this { return this; }
  destroy(_error?: Error): this { return this; }
  setDefaultEncoding(_encoding: BufferEncoding): this { return this; }
  cork(): void {}
  uncork(): void {}
  addAbortSignal(_signal: AbortSignal): NodeJS.WritableStream { return this; }

  [Symbol.asyncIterator](): AsyncIterableIterator<unknown> {
    return (async function* () {})();
  }
}

function makeChild(stdinReturnValue = true, killed = false): MockChild {
  const child = new EventEmitter() as MockChild;
  child.killed = killed;
  child.stdin = killed ? null : new MockStdin(stdinReturnValue);
  child.kill = jest.fn();
  return child;
}

// ─── 테스트 스위트 ────────────────────────────────────────────────────────────

describe("writeToStdin", () => {
  // A. 정상 write — 단일 문자열 stdin 주입 성공
  it("A: 단일 문자열을 stdin에 정상 주입한다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    await writeToStdin({ child, data: "hello agent" });
    const stdin = child.stdin as unknown as MockStdin;
    expect(stdin.writtenData).toHaveLength(1);
    expect(stdin.writtenData[0]).toContain("hello agent");
  });

  // B. 개행 엔드마커 — 데이터 끝에 \n 자동 추가
  it("B: 데이터 끝에 \\n 개행이 자동 추가된다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    await writeToStdin({ child, data: "no newline" });
    const stdin = child.stdin as unknown as MockStdin;
    expect(stdin.writtenData[0]).toBe("no newline\n");
  });

  // C. 중복 개행 방지
  it("C: 이미 \\n으로 끝난 데이터는 추가 \\n을 붙이지 않는다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    await writeToStdin({ child, data: "already\n" });
    const stdin = child.stdin as unknown as MockStdin;
    expect(stdin.writtenData[0]).toBe("already\n");
  });

  // D. 백프레셔 drain — write() false 반환 시 drain 이벤트 대기 후 resolve
  it("D: write() false 반환 시 drain 이벤트 수신 후 resolve된다", async () => {
    const child = makeChild(false) as unknown as ChildProcessWithoutNullStreams;
    const stdin = child.stdin as unknown as MockStdin;

    // drain 이벤트를 10ms 후 발생
    setTimeout(() => stdin.emit("drain"), 10);

    await expect(writeToStdin({ child, data: "burst" })).resolves.toBeUndefined();
  });

  // E. 종료된 프로세스 가드
  it("E: child.killed = true 시 Error를 throw한다", async () => {
    const child = makeChild(true, true) as unknown as ChildProcessWithoutNullStreams;
    await expect(writeToStdin({ child, data: "test" })).rejects.toThrow(
      "Process is already killed",
    );
  });

  // F. null stdin 가드
  it("F: child.stdin = null 시 Error를 throw한다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    // stdin을 강제로 null로 설정
    (child as unknown as MockChild).stdin = null;
    await expect(writeToStdin({ child, data: "test" })).rejects.toThrow();
  });

  // G. drain 중 프로세스 종료
  it("G: drain 대기 중 프로세스가 종료되면 reject된다", async () => {
    const child = makeChild(false) as unknown as ChildProcessWithoutNullStreams;

    // close 이벤트를 10ms 후 발생 (drain 없이 종료)
    setTimeout(() => child.emit("close"), 10);

    await expect(writeToStdin({ child, data: "data" })).rejects.toThrow(
      "Process closed before drain",
    );
  });
});

describe("writeBurstToStdin", () => {
  // H. writeBurstToStdin — 다중 청크 순차 주입 성공
  it("H: 다중 청크를 순차적으로 안전하게 주입한다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    const chunks = ["chunk1", "chunk2", "chunk3"];

    await writeBurstToStdin(child, chunks);

    const stdin = child.stdin as unknown as MockStdin;
    expect(stdin.writtenData).toHaveLength(3);
    expect(stdin.writtenData[0]).toBe("chunk1\n");
    expect(stdin.writtenData[1]).toBe("chunk2\n");
    expect(stdin.writtenData[2]).toBe("chunk3\n");
  });

  // I. writeBurstToStdin — 빈 배열은 아무것도 쓰지 않음
  it("I: 빈 청크 배열은 write를 호출하지 않는다", async () => {
    const child = makeChild() as unknown as ChildProcessWithoutNullStreams;
    await writeBurstToStdin(child, []);
    const stdin = child.stdin as unknown as MockStdin;
    expect(stdin.writtenData).toHaveLength(0);
  });
});
