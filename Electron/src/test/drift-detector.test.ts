/**
 * drift-detector.test.ts — 플러그인 드리프트 감지기 단위 테스트
 *
 * 커버리지:
 *   1. 빈 로그 → driftRate=0, isCritical=false
 *   2. 미등록 source → driftItems 추가, driftRate 계산
 *   3. driftRate >= 10% → drift_critical 이벤트 방출
 *   4. 등록된 source만 → driftItems=[], isCritical=false
 *   5. JSONL 파싱 오류 라인 → 무시 (크래시 없음)
 *   6. Headless 동작 확인 (Electron 없이 실행)
 *   7. 폴링 시작/중지
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DriftDetector,
  _resetDriftDetectorForTest,
  DRIFT_RATE_THRESHOLD,
} from "../../main/ops/drift-detector";

// ─── node:fs/promises 모킹 ────────────────────────────────────────────────────

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { readFile, readdir } from "node:fs/promises";

// ─── path 상수 ────────────────────────────────────────────────────────────────

const MOCK_OMX_ROOT = "/fake/omx-root";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeManifest(pluginNames: string[]): string {
  return JSON.stringify({
    plugins: pluginNames.map((name) => ({ name, enabled: true })),
  });
}

function makeLogLines(entries: { source: string; tool?: string }[]): string {
  return entries
    .map((e) =>
      JSON.stringify({
        source: e.source,
        tool: e.tool ?? `${e.source}.run`,
        event: "call",
        timestamp: new Date().toISOString(),
      })
    )
    .join("\n");
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe("DriftDetector", () => {
  let detector: DriftDetector;

  beforeEach(() => {
    _resetDriftDetectorForTest();
    detector = new DriftDetector(MOCK_OMX_ROOT);
    vi.clearAllMocks();
  });

  afterEach(() => {
    detector.stopPolling();
    _resetDriftDetectorForTest();
  });

  // ── 1. 빈 로그 ─────────────────────────────────────────────────────────────

  it("로그 디렉터리가 비어 있으면 driftRate=0, isCritical=false를 반환한다", async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const report = await detector.detect();

    expect(report.totalCalls).toBe(0);
    expect(report.driftCount).toBe(0);
    expect(report.driftRate).toBe(0);
    expect(report.isCritical).toBe(false);
    expect(report.driftItems).toHaveLength(0);
  });

  // ── 2. 미등록 source → driftItems 추가 ────────────────────────────────────

  it("매니페스트에 없는 source가 포함된 로그를 driftItems에 추가한다", async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(["hooks-2024.jsonl"]);
    (readFile as ReturnType<typeof vi.fn>).mockImplementation((filePath: string) => {
      if (filePath.endsWith("manifest.json")) return Promise.resolve(makeManifest(["openclaw"]));
      if (filePath.endsWith("hooks-2024.jsonl")) {
        return Promise.resolve(
          makeLogLines([
            { source: "openclaw" }, // 등록됨 — drift 아님
            { source: "ghost-plugin" }, // 미등록 — drift
            { source: "ghost-plugin" }, // 미등록 — drift
          ])
        );
      }
      return Promise.reject(new Error("Unknown file"));
    });

    const report = await detector.detect();

    expect(report.totalCalls).toBe(3);
    expect(report.driftCount).toBe(2);
    expect(report.driftItems).toHaveLength(2);
    expect(report.driftItems[0].source).toBe("ghost-plugin");
    expect(report.driftRate).toBeCloseTo(66.67, 1);
  });

  // ── 3. driftRate >= 10% → drift_critical 이벤트 ───────────────────────────

  it("driftRate가 임계치 이상이면 drift_critical 이벤트를 방출한다", async () => {
    expect(DRIFT_RATE_THRESHOLD).toBe(10);

    const criticalSpy = vi.fn();
    const checkedSpy = vi.fn();
    detector.on("drift_critical", criticalSpy);
    detector.on("drift_checked", checkedSpy);

    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(["hooks.jsonl"]);
    (readFile as ReturnType<typeof vi.fn>).mockImplementation((filePath: string) => {
      if (filePath.endsWith("manifest.json")) return Promise.resolve(makeManifest(["openclaw"]));
      // 10 중 2개 미등록 → driftRate=20%
      return Promise.resolve(
        makeLogLines([
          ...Array(8).fill({ source: "openclaw" }),
          { source: "phantom-a" },
          { source: "phantom-b" },
        ])
      );
    });

    const report = await detector.detect();

    expect(report.isCritical).toBe(true);
    expect(report.driftRate).toBeCloseTo(20, 1);
    expect(criticalSpy).toHaveBeenCalledWith(report);
    expect(checkedSpy).toHaveBeenCalledWith(report);
  });

  // ── 4. 등록된 source만 → drift 없음 ──────────────────────────────────────

  it("등록된 source만 있으면 driftItems=[], isCritical=false를 반환한다", async () => {
    const criticalSpy = vi.fn();
    detector.on("drift_critical", criticalSpy);

    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(["hooks.jsonl"]);
    (readFile as ReturnType<typeof vi.fn>).mockImplementation((filePath: string) => {
      if (filePath.endsWith("manifest.json"))
        return Promise.resolve(makeManifest(["openclaw", "hermes"]));
      return Promise.resolve(
        makeLogLines([
          { source: "openclaw" },
          { source: "hermes" },
          { source: "openclaw" },
        ])
      );
    });

    const report = await detector.detect();

    expect(report.driftItems).toHaveLength(0);
    expect(report.isCritical).toBe(false);
    expect(criticalSpy).not.toHaveBeenCalled();
  });

  // ── 5. JSONL 파싱 오류 → 무시 ────────────────────────────────────────────

  it("JSONL 파싱 오류가 있는 라인을 무시하고 크래시하지 않는다", async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue(["hooks.jsonl"]);
    (readFile as ReturnType<typeof vi.fn>).mockImplementation((filePath: string) => {
      if (filePath.endsWith("manifest.json"))
        return Promise.resolve(makeManifest(["openclaw"]));
      // 유효 1줄 + 파싱 불가 2줄 + 유효 1줄
      return Promise.resolve(
        [
          JSON.stringify({ source: "openclaw", event: "call" }),
          "not valid json }{",
          "also bad",
          JSON.stringify({ source: "ghost", event: "call" }),
        ].join("\n")
      );
    });

    let report: Awaited<ReturnType<typeof detector.detect>>;
    expect(async () => {
      report = await detector.detect();
    }).not.toThrow();

    report = await detector.detect();
    // 유효한 2줄만 카운트
    expect(report.totalCalls).toBe(2);
  });

  // ── 6. Headless 동작 확인 ─────────────────────────────────────────────────

  it("Electron 모듈 없이도 detect()를 실행할 수 있다 (Headless)", async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Electron global 없이 실행
    const originalProcess = globalThis.process;
    try {
      // @ts-expect-error — 테스트 목적 삭제
      delete (globalThis as Record<string, unknown>).process;

      const report = await detector.detect();
      expect(report).toHaveProperty("checkedAt");
    } finally {
      // 복원
      globalThis.process = originalProcess;
    }
  });

  // ── 7. 폴링 시작/중지 ─────────────────────────────────────────────────────

  it("startPolling 후 isPolling()이 true를 반환하고, stopPolling 후 false를 반환한다", () => {
    expect(detector.isPolling()).toBe(false);

    detector.startPolling(100_000);
    expect(detector.isPolling()).toBe(true);

    detector.stopPolling();
    expect(detector.isPolling()).toBe(false);
  });

  it("중복 startPolling 호출을 무시한다 (중복 폴링 방지)", () => {
    detector.startPolling(100_000);
    const poller1 = (detector as unknown as { _pollerHandle: unknown })._pollerHandle;
    detector.startPolling(100_000);
    const poller2 = (detector as unknown as { _pollerHandle: unknown })._pollerHandle;

    expect(poller1).toBe(poller2);
    detector.stopPolling();
  });

  // ── 8. drift_checked 이벤트 항상 방출 ────────────────────────────────────

  it("detect() 완료 후 항상 drift_checked 이벤트를 방출한다", async () => {
    const checkedSpy = vi.fn();
    detector.on("drift_checked", checkedSpy);

    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await detector.detect();
    expect(checkedSpy).toHaveBeenCalledTimes(1);

    await detector.detect();
    expect(checkedSpy).toHaveBeenCalledTimes(2);
  });

  // ── 9. DriftReport 구조 검증 ──────────────────────────────────────────────

  it("DriftReport에 checkedAt ISO 타임스탬프가 포함된다", async () => {
    (readdir as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const before = Date.now();
    const report = await detector.detect();
    const after = Date.now();

    const checkedAt = new Date(report.checkedAt).getTime();
    expect(checkedAt).toBeGreaterThanOrEqual(before);
    expect(checkedAt).toBeLessThanOrEqual(after);
  });
});
