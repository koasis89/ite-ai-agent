/**
 * EL-226.test.ts — ErrorGuideOverlay + DriftCriticalBanner 컴포넌트 테스트
 *
 * 커버리지:
 *   1. ErrorGuideOverlay: 초기 렌더링 없음 (ErrorGuideController 기반)
 *   2. ErrorGuideOverlay: onDriftCritical 호출 → 배너 노출
 *   3. ErrorGuideOverlay: drift-resync-button 클릭 → opsSetupResync 호출
 *   4. ErrorGuideOverlay: "상세 보기" 클릭 → 가이드 오버레이 노출
 *   5. ErrorGuideOverlay: clear-state-button 클릭 → opsStateClear 호출
 *   6. ErrorGuideOverlay: resync-button 클릭 → opsSetupResync 호출
 *   7. ErrorGuideOverlay: 닫기 → overlay 사라짐
 *   8. ErrorGuideOverlay: 에러 코드별 가이드 타이틀 표시 검증
 *   9. ErrorGuideOverlay: 배경 클릭으로 닫기
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

import {
  ErrorGuideController,
  ErrorGuideOverlay,
  DriftCriticalBanner,
  ERROR_GUIDE_MAP,
} from "../../renderer/components/ErrorGuideOverlay";
import type { DriftReport } from "../../main/ops/drift-detector";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeElectronAPIMock(overrides: Record<string, unknown> = {}): void {
  Object.defineProperty(window, "electronAPI", {
    value: {
      onDriftCritical: vi.fn(() => () => {}),
      onErrorGuideOpen: vi.fn(() => () => {}),
      opsStateClear: vi.fn(() => Promise.resolve()),
      opsSetupResync: vi.fn(() => Promise.resolve()),
      ...overrides,
    },
    writable: true,
    configurable: true,
  });
}

function clearElectronAPIMock(): void {
  Object.defineProperty(window, "electronAPI", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

function makeDriftReport(partial?: Partial<DriftReport>): DriftReport {
  return {
    totalCalls: 10,
    driftCount: 3,
    driftRate: 30,
    driftItems: [{ source: "ghost", logFile: "hooks.jsonl", lineNumber: 5 }],
    checkedAt: new Date().toISOString(),
    isCritical: true,
    ...partial,
  };
}

// ─── DriftCriticalBanner 단위 테스트 ─────────────────────────────────────────

describe("DriftCriticalBanner", () => {
  const report = makeDriftReport();

  it("Drift 위기 배너를 렌더링한다", () => {
    render(
      <DriftCriticalBanner
        report={report}
        onResync={vi.fn()}
        onViewDetail={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByTestId("drift-critical-banner")).toBeDefined();
    expect(screen.getByText(/정합성 위기/)).toBeDefined();
    expect(screen.getByText(/3건/)).toBeDefined();
  });

  it("환경 재동기화 버튼 클릭 시 onResync를 호출한다", () => {
    const onResync = vi.fn();
    render(
      <DriftCriticalBanner
        report={report}
        onResync={onResync}
        onViewDetail={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("drift-resync-button"));
    expect(onResync).toHaveBeenCalledTimes(1);
  });

  it("상세 보기 버튼 클릭 시 onViewDetail을 호출한다", () => {
    const onViewDetail = vi.fn();
    render(
      <DriftCriticalBanner
        report={report}
        onResync={vi.fn()}
        onViewDetail={onViewDetail}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("drift-detail-button"));
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼 클릭 시 onDismiss를 호출한다", () => {
    const onDismiss = vi.fn();
    render(
      <DriftCriticalBanner
        report={report}
        onResync={vi.fn()}
        onViewDetail={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Drift 경고 닫기" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── ErrorGuideOverlay 단위 테스트 ───────────────────────────────────────────

describe("ErrorGuideOverlay", () => {
  it("DRIFT_CRITICAL 에러 코드에 맞는 가이드 타이틀을 표시한다", () => {
    render(
      <ErrorGuideOverlay
        errorCode="DRIFT_CRITICAL"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn()}
      />
    );

    expect(screen.getByTestId("error-guide-overlay")).toBeDefined();
    expect(screen.getByTestId("error-guide-title").textContent).toBe(
      ERROR_GUIDE_MAP["DRIFT_CRITICAL"]!.title
    );
  });

  it("STATE_ROLLBACK 에러 코드에 맞는 가이드 타이틀을 표시한다", () => {
    render(
      <ErrorGuideOverlay
        errorCode="STATE_ROLLBACK"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn()}
      />
    );

    expect(screen.getByTestId("error-guide-title").textContent).toBe(
      ERROR_GUIDE_MAP["STATE_ROLLBACK"]!.title
    );
  });

  it("알 수 없는 에러 코드에는 UNKNOWN 가이드를 표시한다", () => {
    render(
      <ErrorGuideOverlay
        errorCode="SOME_UNKNOWN_CODE"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn()}
      />
    );

    expect(screen.getByTestId("error-guide-title").textContent).toBe(
      ERROR_GUIDE_MAP["UNKNOWN"]!.title
    );
  });

  it("primaryAction 버튼 클릭 시 onPrimaryAction을 호출한다", () => {
    const onPrimaryAction = vi.fn();
    render(
      <ErrorGuideOverlay
        errorCode="DRIFT_CRITICAL"
        onClose={vi.fn()}
        onPrimaryAction={onPrimaryAction}
      />
    );

    fireEvent.click(screen.getByTestId("error-guide-primary-action"));
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼 클릭 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(
      <ErrorGuideOverlay
        errorCode="DRIFT_CRITICAL"
        onClose={onClose}
        onPrimaryAction={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("error-guide-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("배경 오버레이 클릭 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(
      <ErrorGuideOverlay
        errorCode="DRIFT_CRITICAL"
        onClose={onClose}
        onPrimaryAction={vi.fn()}
      />
    );

    // 배경(overlay) 직접 클릭 — panel이 아닌 backdrop
    fireEvent.click(screen.getByTestId("error-guide-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("복구 단계(steps)가 모두 렌더링된다", () => {
    render(
      <ErrorGuideOverlay
        errorCode="DRIFT_CRITICAL"
        onClose={vi.fn()}
        onPrimaryAction={vi.fn()}
      />
    );

    const stepsContainer = screen.getByTestId("error-guide-steps");
    const guide = ERROR_GUIDE_MAP["DRIFT_CRITICAL"]!;
    expect(stepsContainer.querySelectorAll("p")).toHaveLength(guide.steps.length);
  });
});

// ─── ErrorGuideController 통합 테스트 ────────────────────────────────────────

describe("ErrorGuideController", () => {
  beforeEach(() => makeElectronAPIMock());
  afterEach(() => clearElectronAPIMock());

  it("electronAPI가 없어도 크래시 없이 렌더링된다", () => {
    clearElectronAPIMock();
    expect(() => render(<ErrorGuideController />)).not.toThrow();
  });

  it("초기 렌더링 시 배너와 오버레이가 노출되지 않는다", () => {
    render(<ErrorGuideController />);
    expect(screen.queryByTestId("drift-critical-banner")).toBeNull();
    expect(screen.queryByTestId("error-guide-overlay")).toBeNull();
  });

  it("onDriftCritical 콜백 호출 시 Drift 위기 배너가 노출된다", async () => {
    let driftCallback: ((r: DriftReport) => void) | null = null;

    makeElectronAPIMock({
      onDriftCritical: vi.fn((cb: (r: DriftReport) => void) => {
        driftCallback = cb;
        return () => {};
      }),
    });

    render(<ErrorGuideController />);

    await act(async () => {
      driftCallback?.(makeDriftReport());
    });

    expect(screen.getByTestId("drift-critical-banner")).toBeDefined();
  });

  it("drift-resync-button 클릭 시 opsSetupResync가 호출된다", async () => {
    const opsSetupResync = vi.fn(() => Promise.resolve());
    let driftCallback: ((r: DriftReport) => void) | null = null;

    makeElectronAPIMock({
      onDriftCritical: vi.fn((cb: (r: DriftReport) => void) => {
        driftCallback = cb;
        return () => {};
      }),
      opsSetupResync,
    });

    render(<ErrorGuideController />);

    await act(async () => {
      driftCallback?.(makeDriftReport());
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("drift-resync-button"));
    });

    expect(opsSetupResync).toHaveBeenCalledTimes(1);
  });

  it("drift-resync-button 클릭 후 배너가 사라진다", async () => {
    let driftCallback: ((r: DriftReport) => void) | null = null;

    makeElectronAPIMock({
      onDriftCritical: vi.fn((cb: (r: DriftReport) => void) => {
        driftCallback = cb;
        return () => {};
      }),
      opsSetupResync: vi.fn(() => Promise.resolve()),
    });

    render(<ErrorGuideController />);

    await act(async () => {
      driftCallback?.(makeDriftReport());
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("drift-resync-button"));
    });

    expect(screen.queryByTestId("drift-critical-banner")).toBeNull();
  });

  it("상세 보기 클릭 시 ErrorGuideOverlay가 노출된다", async () => {
    let driftCallback: ((r: DriftReport) => void) | null = null;

    makeElectronAPIMock({
      onDriftCritical: vi.fn((cb: (r: DriftReport) => void) => {
        driftCallback = cb;
        return () => {};
      }),
    });

    render(<ErrorGuideController />);

    await act(async () => {
      driftCallback?.(makeDriftReport());
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("drift-detail-button"));
    });

    expect(screen.getByTestId("error-guide-overlay")).toBeDefined();
  });

  it("error-guide-primary-action 클릭 시 opsStateClear가 호출된다", async () => {
    const opsStateClear = vi.fn(() => Promise.resolve());
    let errorGuideCallback: ((code: string) => void) | null = null;

    makeElectronAPIMock({
      onErrorGuideOpen: vi.fn((cb: (code: string) => void) => {
        errorGuideCallback = cb;
        return () => {};
      }),
      opsStateClear,
    });

    render(<ErrorGuideController />);

    await act(async () => {
      errorGuideCallback?.("STATE_ROLLBACK");
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-guide-primary-action"));
    });

    expect(opsStateClear).toHaveBeenCalledTimes(1);
  });

  it("error-guide-close 클릭 후 오버레이가 사라진다", async () => {
    let errorGuideCallback: ((code: string) => void) | null = null;

    makeElectronAPIMock({
      onErrorGuideOpen: vi.fn((cb: (code: string) => void) => {
        errorGuideCallback = cb;
        return () => {};
      }),
    });

    render(<ErrorGuideController />);

    await act(async () => {
      errorGuideCallback?.("CLI_UNREACHABLE");
    });

    expect(screen.getByTestId("error-guide-overlay")).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByTestId("error-guide-close"));
    });

    expect(screen.queryByTestId("error-guide-overlay")).toBeNull();
  });
});
