/**
 * EL-224.test.ts — 복합 상태 전이 규칙 파서 및 UI 컴포넌트 테스트
 *
 * 커버리지:
 *   1. MultiStateValidator: Deferred 스킬 분리
 *   2. MultiStateValidator: 금지된 전이 튕겨내기 (Rollback 방지)
 *   3. DeferredSkillsNotice: 플로팅 토스트 렌더링
 *   4. DeferredSkillsNotice: 롤백 경고 배너 렌더링 + 액션
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

import {
  MultiStateValidator,
  _resetMultiStateValidatorForTest,
} from "../../main/state/multi-state-validator";
import type { TransitionRejection } from "../../main/state/multi-state-validator";
import {
  DeferredSkillsNotice,
  DeferredToast,
  RollbackWarningBanner,
} from "../../renderer/components/DeferredSkillsNotice";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeElectronAPIMock(overrides: Record<string, unknown> = {}): void {
  Object.defineProperty(window, "electronAPI", {
    value: {
      onSkillDeferred: vi.fn(() => () => {}),
      onRollbackBlocked: vi.fn(() => () => {}),
      onSkillActivated: vi.fn(() => () => {}),
      triggerStateClear: vi.fn(),
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

// ─── MultiStateValidator 단위 테스트 ─────────────────────────────────────────

describe("MultiStateValidator", () => {
  let validator: MultiStateValidator;

  beforeEach(() => {
    _resetMultiStateValidatorForTest();
    validator = new MultiStateValidator();
  });

  afterEach(() => {
    _resetMultiStateValidatorForTest();
  });

  // ── Deferred 스킬 분리 ────────────────────────────────────────────────────

  it("주 스킬 in_progress 진입 후 ralph를 Deferred로 등록한다", () => {
    const deferredSpy = vi.fn();
    validator.on("skill_deferred", deferredSpy);

    validator.applyTransition("team", "in_progress");
    validator.registerDeferred("ralph", "team");

    const ralphState = validator.getState("ralph");
    expect(ralphState?.deferred).toBe(true);
    expect(ralphState?.deferredReason).toBe("team 실행 중 대기");
    expect(deferredSpy).toHaveBeenCalledWith({
      skill: "ralph",
      deferredBy: "team",
      reason: "team 실행 중 대기",
    });
  });

  it("주 스킬 done 전환 시 Deferred 스킬이 자동 활성화된다", () => {
    const activatedSpy = vi.fn();
    validator.on("skill_activated", activatedSpy);

    validator.applyTransition("team", "in_progress");
    validator.registerDeferred("ralph", "team");
    validator.applyTransition("team", "done");

    const ralphState = validator.getState("ralph");
    expect(ralphState?.deferred).toBe(false);
    expect(activatedSpy).toHaveBeenCalledWith({ skill: "ralph" });
  });

  it("getDeferredSkills()가 지연된 스킬만 반환한다", () => {
    validator.applyTransition("team", "in_progress");
    validator.registerDeferred("ralph", "team");
    validator.registerDeferred("codex", "team");
    validator.applyTransition("search", "planning");

    const deferred = validator.getDeferredSkills();
    expect(deferred.map((s) => s.skill)).toEqual(["ralph", "codex"]);
  });

  // ── 금지 전이 튕겨내기 ────────────────────────────────────────────────────

  it("in_progress → planning 역전이를 거부하고 rejection 이벤트를 방출한다", () => {
    const rejectionSpy = vi.fn();
    validator.on("transition_rejected", rejectionSpy);

    validator.applyTransition("team", "in_progress");
    const result = validator.applyTransition("team", "planning");

    expect(result).toBe(false);
    expect(rejectionSpy).toHaveBeenCalledTimes(1);
    const payload: TransitionRejection = rejectionSpy.mock.calls[0][0];
    expect(payload.from).toBe("in_progress");
    expect(payload.to).toBe("planning");
    expect(payload.skill).toBe("team");
    expect(payload.reason).toContain("omx state clear");
    expect(payload.timestamp).toMatch(/^\d{4}-/);
  });

  it("done → in_progress 직접 재진입을 거부한다", () => {
    const rejectionSpy = vi.fn();
    validator.on("transition_rejected", rejectionSpy);

    validator.applyTransition("team", "in_progress");
    validator.applyTransition("team", "done");
    const result = validator.applyTransition("team", "in_progress");

    expect(result).toBe(false);
    expect(rejectionSpy).toHaveBeenCalledTimes(1);
    const payload: TransitionRejection = rejectionSpy.mock.calls[0][0];
    expect(payload.from).toBe("done");
    expect(payload.to).toBe("in_progress");
  });

  it("done → planning 정상 전이는 허용된다", () => {
    const rejectionSpy = vi.fn();
    validator.on("transition_rejected", rejectionSpy);

    validator.applyTransition("team", "in_progress");
    validator.applyTransition("team", "done");
    const result = validator.applyTransition("team", "planning");

    expect(result).toBe(true);
    expect(rejectionSpy).not.toHaveBeenCalled();
  });

  it("reset() 후 모든 상태가 초기화된다", () => {
    validator.applyTransition("team", "in_progress");
    validator.registerDeferred("ralph", "team");
    validator.reset();

    expect(validator.getAllStates()).toHaveLength(0);
    expect(validator.getDeferredSkills()).toHaveLength(0);
  });
});

// ─── DeferredToast 렌더링 테스트 ─────────────────────────────────────────────

describe("DeferredToast", () => {
  it("토스트 항목이 없으면 렌더링하지 않는다", () => {
    render(<DeferredToast toasts={[]} onDismiss={vi.fn()} />);
    expect(screen.queryByTestId("deferred-toast-container")).toBeNull();
  });

  it("토스트 항목이 있으면 스킬 이름과 함께 렌더링한다", () => {
    const toasts = [
      { id: "ralph-1", skill: "ralph", deferredBy: "team" },
    ];
    render(<DeferredToast toasts={toasts} onDismiss={vi.fn()} />);

    expect(screen.getByTestId("deferred-toast-container")).toBeDefined();
    expect(screen.getByTestId("deferred-toast-ralph")).toBeDefined();
    expect(screen.getByText("ralph")).toBeDefined();
  });

  it("닫기 버튼 클릭 시 onDismiss를 호출한다", () => {
    const onDismiss = vi.fn();
    const toasts = [{ id: "ralph-1", skill: "ralph", deferredBy: "team" }];
    render(<DeferredToast toasts={toasts} onDismiss={onDismiss} />);

    const closeBtn = screen.getByRole("button", { name: "ralph 토스트 닫기" });
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledWith("ralph");
  });
});

// ─── RollbackWarningBanner 렌더링 테스트 ─────────────────────────────────────

describe("RollbackWarningBanner", () => {
  const mockPayload = {
    skill: "team",
    from: "in_progress" as const,
    to: "planning" as const,
    reason: "비정상 롤백 차단",
    timestamp: "2025-01-01T00:00:00.000Z",
  };

  it("경고 배너를 렌더링한다", () => {
    render(
      <RollbackWarningBanner
        payload={mockPayload}
        onClear={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByTestId("rollback-warning-banner")).toBeDefined();
    expect(screen.getByText(/상태 충돌이 감지/)).toBeDefined();
  });

  it("상태 초기화 버튼 클릭 시 onClear를 호출한다", () => {
    const onClear = vi.fn();
    render(
      <RollbackWarningBanner
        payload={mockPayload}
        onClear={onClear}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("banner-clear-button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("닫기 버튼 클릭 시 onDismiss를 호출한다", () => {
    const onDismiss = vi.fn();
    render(
      <RollbackWarningBanner
        payload={mockPayload}
        onClear={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "경고 배너 닫기" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── DeferredSkillsNotice 통합 테스트 ────────────────────────────────────────

describe("DeferredSkillsNotice", () => {
  beforeEach(() => makeElectronAPIMock());
  afterEach(() => clearElectronAPIMock());

  it("electronAPI가 없어도 크래시 없이 렌더링된다", () => {
    clearElectronAPIMock();
    expect(() => render(<DeferredSkillsNotice />)).not.toThrow();
  });

  it("skill_deferred 콜백 등록 후 호출 시 토스트가 렌더링된다", async () => {
    let deferredCallback: ((p: { skill: string; deferredBy: string; reason: string }) => void) | null = null;

    makeElectronAPIMock({
      onSkillDeferred: vi.fn((cb: (p: { skill: string; deferredBy: string; reason: string }) => void) => {
        deferredCallback = cb;
        return () => {};
      }),
    });

    render(<DeferredSkillsNotice />);

    await act(async () => {
      deferredCallback?.({ skill: "ralph", deferredBy: "team", reason: "team 실행 중 대기" });
    });

    expect(screen.getByTestId("deferred-toast-ralph")).toBeDefined();
  });

  it("rollback_blocked 콜백 호출 시 경고 배너가 렌더링된다", async () => {
    let rollbackCallback: ((p: { skill: string; from: string; to: string; reason: string; timestamp: string }) => void) | null = null;

    makeElectronAPIMock({
      onRollbackBlocked: vi.fn((cb: (p: { skill: string; from: string; to: string; reason: string; timestamp: string }) => void) => {
        rollbackCallback = cb;
        return () => {};
      }),
    });

    render(<DeferredSkillsNotice />);

    await act(async () => {
      rollbackCallback?.({
        skill: "team",
        from: "in_progress",
        to: "planning",
        reason: "비정상 롤백",
        timestamp: new Date().toISOString(),
      });
    });

    expect(screen.getByTestId("rollback-warning-banner")).toBeDefined();
  });

  it("skill_activated 콜백 호출 시 해당 토스트가 사라진다", async () => {
    let deferredCallback: ((p: { skill: string; deferredBy: string; reason: string }) => void) | null = null;
    let activatedCallback: ((p: { skill: string }) => void) | null = null;

    makeElectronAPIMock({
      onSkillDeferred: vi.fn((cb: (p: { skill: string; deferredBy: string; reason: string }) => void) => {
        deferredCallback = cb;
        return () => {};
      }),
      onSkillActivated: vi.fn((cb: (p: { skill: string }) => void) => {
        activatedCallback = cb;
        return () => {};
      }),
    });

    render(<DeferredSkillsNotice />);

    await act(async () => {
      deferredCallback?.({ skill: "ralph", deferredBy: "team", reason: "대기" });
    });

    expect(screen.getByTestId("deferred-toast-ralph")).toBeDefined();

    await act(async () => {
      activatedCallback?.({ skill: "ralph" });
    });

    expect(screen.queryByTestId("deferred-toast-ralph")).toBeNull();
  });
});
