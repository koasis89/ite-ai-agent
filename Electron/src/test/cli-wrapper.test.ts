/**
 * EL-202 CliWrapper 단위 테스트
 *
 * 시나리오:
 *   A. executeUnary — 정상 봉투 파싱 (omx team api read-task)
 *   B. executeUnary — exit 0 이지만 스키마 불일치 → parseEnvelope 예외
 *   C. executeUnary — exit 비0 → Promise.reject
 *   D. executeStream — Ndjson 2줄 순서대로 콜백 호출
 *   E. executeStream — 비JSON 라인 → onRaw fallback 호출
 *   F. executeStream — kill() → 프로세스 SIGTERM
 *   G. parseEnvelope — ok:true 봉투 파싱
 *   H. parseEnvelope — ok:false 봉투 파싱
 *   I. parseEnvelope — 잘못된 JSON → Error
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";
import type { ChildProcessWithoutNullStreams } from "child_process";
import { parseEnvelope, CliWrapper } from "../main/cli/cli-wrapper";
import type { CliEnvelope } from "../main/cli/cli-wrapper";

// ─── mock 팩토리 ──────────────────────────────────────────────────────────────

function makeChild(stdoutLines: string[], exitCode = 0): ChildProcessWithoutNullStreams {
  const child = new EventEmitter() as ChildProcessWithoutNullStreams;
  const stdoutEE = new EventEmitter();
  const stderrEE = new EventEmitter();

  (child as unknown as Record<string, unknown>).stdout = stdoutEE;
  (child as unknown as Record<string, unknown>).stderr = stderrEE;
  (child as unknown as Record<string, unknown>).kill = vi.fn();

  Promise.resolve().then(() => {
    for (const line of stdoutLines) {
      stdoutEE.emit("data", Buffer.from(line + "\n"));
    }
    stdoutEE.emit("end");
    stderrEE.emit("end");
    child.emit("close", exitCode);
  });

  return child;
}

// ─── G, H, I: parseEnvelope 단독 테스트 ──────────────────────────────────────

describe("parseEnvelope", () => {
  it("G. ok:true 봉투 파싱", () => {
    const raw = JSON.stringify({ schema_version: "1.0", ok: true, data: { id: "TASK-42" } });
    const env = parseEnvelope(raw);
    expect(env.ok).toBe(true);
    if (env.ok) expect((env.data as Record<string, unknown>).id).toBe("TASK-42");
  });

  it("H. ok:false 봉투 파싱", () => {
    const raw = JSON.stringify({ schema_version: "1.0", ok: false, error: { message: "not found", code: "NOT_FOUND" } });
    const env = parseEnvelope(raw);
    expect(env.ok).toBe(false);
    if (!env.ok) expect(env.error.code).toBe("NOT_FOUND");
  });

  it("I. 잘못된 JSON → Error throw", () => {
    expect(() => parseEnvelope("NOT_JSON")).toThrow("JSON 파싱 실패");
  });

  it("I-2. 스키마 불일치 (schema_version 누락) → Error throw", () => {
    const raw = JSON.stringify({ ok: true, data: {} });
    expect(() => parseEnvelope(raw)).toThrow("봉투 스키마 불일치");
  });
});

// ─── A~F: CliWrapper 인스턴스 테스트 ─────────────────────────────────────────

describe("CliWrapper", () => {
  let wrapper: CliWrapper;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    wrapper = new CliWrapper("omx");
  });

  it("A. executeUnary — 정상 봉투 (omx team api read-task)", async () => {
    const { default: cp } = await import("child_process");
    const payload: CliEnvelope = {
      schema_version: "1.0",
      ok: true,
      data: { id: "TASK-42", title: "Fix env-checker" },
    };
    vi.spyOn(cp, "spawn").mockReturnValue(makeChild([JSON.stringify(payload)]));

    const result = await wrapper.executeUnary(["team", "api", "read-task", "--id", "TASK-42"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data.id).toBe("TASK-42");
    }
  });

  it("B. executeUnary — exit 0 + 스키마 불일치 → reject", async () => {
    const { default: cp } = await import("child_process");
    vi.spyOn(cp, "spawn").mockReturnValue(makeChild(['{"ok":true}']));

    await expect(wrapper.executeUnary(["any"])).rejects.toThrow("봉투 스키마 불일치");
  });

  it("C. executeUnary — exit 비0 → reject", async () => {
    const { default: cp } = await import("child_process");
    vi.spyOn(cp, "spawn").mockReturnValue(makeChild([], 1));

    await expect(wrapper.executeUnary(["any"])).rejects.toThrow(/exit 1/);
  });

  it("D. executeStream — Ndjson 2줄 순서대로 onLine 호출", async () => {
    const { default: cp } = await import("child_process");
    const lines = [
      JSON.stringify({ type: "start" }),
      JSON.stringify({ type: "end", count: 2 }),
    ];
    vi.spyOn(cp, "spawn").mockReturnValue(makeChild(lines));

    const received: unknown[] = [];
    const { kill } = wrapper.executeStream(["stream", "--json"], (parsed) => {
      received.push(parsed);
    });

    // readline 이벤트가 처리될 시간을 허용
    await new Promise((res) => setTimeout(res, 50));

    expect(received).toHaveLength(2);
    expect((received[0] as Record<string, unknown>).type).toBe("start");
    expect((received[1] as Record<string, unknown>).type).toBe("end");
    kill();
  });

  it("E. executeStream — 비JSON 라인 → onRaw fallback", async () => {
    const { default: cp } = await import("child_process");
    vi.spyOn(cp, "spawn").mockReturnValue(makeChild(["plain text line", JSON.stringify({ ok: 1 })]));

    const rawLines: string[] = [];
    const jsonLines: unknown[] = [];
    const { kill } = wrapper.executeStream(
      ["cmd"],
      (p) => jsonLines.push(p),
      (raw) => rawLines.push(raw)
    );

    await new Promise((res) => setTimeout(res, 50));

    expect(rawLines).toContain("plain text line");
    expect(jsonLines).toHaveLength(1);
    kill();
  });

  it("F. executeStream — kill() → child.kill('SIGTERM') 호출", async () => {
    const { default: cp } = await import("child_process");
    const mockChild = makeChild([]);
    const killFn = vi.fn();
    (mockChild as unknown as Record<string, unknown>).kill = killFn;
    vi.spyOn(cp, "spawn").mockReturnValue(mockChild);

    const { kill } = wrapper.executeStream(["cmd"], vi.fn());
    kill();

    expect(killFn).toHaveBeenCalledWith("SIGTERM");
  });
});
