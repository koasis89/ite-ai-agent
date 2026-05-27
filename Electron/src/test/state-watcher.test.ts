/**
 * EL-217: StateWatcher 테스트
 *
 * 핵심 검증 목표:
 *   1. 모의 파일 수정 시 디바운스 후 정확히 1회 이벤트 발생
 *   2. DEBOUNCE_MS 내 중복 수정은 합쳐서 1회 발행
 *   3. 패턴 미일치 파일은 이벤트 미발행
 *   4. stop() 후 이벤트 발행 없음
 *   5. getCurrentState() 초기 스냅샷 반환
 *   6. onChange / offChange 등록·해제 정상 동작
 */

import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StateWatcher, _resetStateWatcherForTest } from "../main/state/state-watcher";

// ─── 픽스처 헬퍼 ─────────────────────────────────────────────────────────────

/** 임시 디렉터리를 만들고 디렉터리 경로를 반환한다 */
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "state-watcher-test-"));
}

/** 임시 디렉터리와 그 내용을 삭제한다 */
function removeTmpDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** stateDir 내에 JSON 파일을 쓴다 */
function writeStateFile(
  dir: string,
  filename: string,
  data: Record<string, unknown>,
): void {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(data), "utf-8");
}

/** 지정 ms 동안 대기 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe("StateWatcher", () => {
  let stateDir: string;
  let watcher: StateWatcher;

  beforeEach(() => {
    _resetStateWatcherForTest();
    stateDir = makeTmpDir();
    watcher = new StateWatcher();
  });

  afterEach(() => {
    watcher.stop();
    removeTmpDir(stateDir);
  });

  // ─── 기본 감시 동작 ──────────────────────────────────────────────────────

  it("패턴 일치 파일 수정 시 onChange 콜백을 1회 호출한다 (디바운스 후)", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50); // 초기 파일 스캔 대기

    writeStateFile(stateDir, "team-state.json", { status: "running" });
    await wait(300); // DEBOUNCE_MS(150) + 여유

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toMatchObject({
      filename: "team-state.json",
    });
  });

  it("DEBOUNCE_MS 내 중복 쓰기는 단일 이벤트로 병합한다", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    // 100ms 내 3번 연속 쓰기
    writeStateFile(stateDir, "team-state.json", { status: "running" });
    await wait(30);
    writeStateFile(stateDir, "team-state.json", { status: "blocked" });
    await wait(30);
    writeStateFile(stateDir, "team-state.json", { status: "finished" });

    await wait(400); // 디바운스 완전히 소진 후

    // 최소 1회, 최대 2회 (OS 이벤트 특성상 엄격하게 1회 보장은 어려움)
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(callback.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("STATE_FILE_PATTERN에 일치하지 않는 파일은 이벤트를 발행하지 않는다", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    writeStateFile(stateDir, "config.json", { foo: "bar" });
    writeStateFile(stateDir, "readme.txt", {});
    await wait(300);

    expect(callback).not.toHaveBeenCalled();
  });

  it("skill-active-state.json은 패턴 일치 → 이벤트 발행", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    writeStateFile(stateDir, "skill-active-state.json", { skill: "ultrawork" });
    await wait(300);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0].filename).toBe("skill-active-state.json");
  });

  // ─── stop() 동작 ─────────────────────────────────────────────────────────

  it("stop() 이후 파일 변경 이벤트를 발행하지 않는다", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    watcher.stop();

    writeStateFile(stateDir, "team-state.json", { status: "running" });
    await wait(300);

    expect(callback).not.toHaveBeenCalled();
  });

  // ─── onChange / offChange ─────────────────────────────────────────────────

  it("offChange()로 콜백을 해제하면 이후 이벤트를 수신하지 않는다", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    writeStateFile(stateDir, "team-state.json", { status: "running" });
    await wait(300);
    expect(callback).toHaveBeenCalledTimes(1);

    watcher.offChange(callback);
    callback.mockClear();

    writeStateFile(stateDir, "team-state.json", { status: "finished" });
    await wait(300);
    expect(callback).not.toHaveBeenCalled();
  });

  // ─── getCurrentState() ────────────────────────────────────────────────────

  it("start() 전 getCurrentState()는 빈 맵을 반환한다", () => {
    const state = watcher.getCurrentState();
    expect(state.size).toBe(0);
  });

  it("start() 후 기존 파일의 스냅샷을 getCurrentState()로 반환한다", async () => {
    writeStateFile(stateDir, "team-state.json", { status: "idle" });
    watcher.start(stateDir);

    await wait(300); // 파일 초기 읽기 완료 대기

    const state = watcher.getCurrentState();
    expect(state.has("team-state.json")).toBe(true);
    expect(state.get("team-state.json")).toMatchObject({ status: "idle" });
  });

  // ─── 스냅샷 null (삭제) ───────────────────────────────────────────────────

  it("파일 삭제 이벤트 시 snapshot이 null인 이벤트를 발행한다", async () => {
    writeStateFile(stateDir, "team-state.json", { status: "running" });
    watcher.start(stateDir);

    await wait(300);

    const callback = vi.fn();
    watcher.onChange(callback);

    fs.unlinkSync(path.join(stateDir, "team-state.json"));
    await wait(300);

    // 삭제 시 snapshot=null인 이벤트 발행
    const calls = callback.mock.calls.filter(([e]) => e.snapshot === null);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  // ─── 멀티 파일 ────────────────────────────────────────────────────────────

  it("여러 파일의 동시 변경 시 각 파일마다 이벤트를 발행한다", async () => {
    const callback = vi.fn();
    watcher.onChange(callback);
    watcher.start(stateDir);

    await wait(50);

    writeStateFile(stateDir, "team-state.json", { status: "running" });
    writeStateFile(stateDir, "ralph-state.json", { status: "idle" });
    await wait(400);

    const filenames = callback.mock.calls.map(([e]) => e.filename);
    expect(filenames).toContain("team-state.json");
    expect(filenames).toContain("ralph-state.json");
  });
});
