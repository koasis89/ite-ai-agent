/**
 * EL-224: DeferredSkillsNotice — 지연 스킬 플로팅 토스트 + 롤백 경고 배너
 *
 * 구성:
 *   - DeferredToast: 우측 하단 플로팅 토스트 ("⏳ 다음 작업 대기 중: ralph")
 *   - RollbackWarningBanner: 채팅창 상단 인라인 경고 배너 (상태 충돌 감지)
 *   - DeferredSkillsNotice: 두 컴포넌트를 통합 관리하는 최상위 컴포넌트
 *
 * 구독 채널:
 *   - "omx:skill-deferred"   — 지연 스킬 발생 이벤트
 *   - "omx:rollback-blocked" — 비정상 롤백 차단 이벤트
 *   - "omx:skill-activated"  — 지연 스킬 활성화 이벤트 (토스트 제거 트리거)
 */

import React, { useEffect, useReducer, useCallback } from "react";

// ─── 채널 상수 ────────────────────────────────────────────────────────────────

export const SKILL_DEFERRED_CHANNEL   = "omx:skill-deferred"   as const;
export const ROLLBACK_BLOCKED_CHANNEL = "omx:rollback-blocked" as const;
export const SKILL_ACTIVATED_CHANNEL  = "omx:skill-activated"  as const;
export const STATE_CLEAR_CHANNEL      = "omx:state-clear"      as const;

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DeferredSkillPayload {
  skill: string;
  deferredBy: string;
  reason: string;
}

export interface RollbackBlockedPayload {
  skill: string;
  from: string;
  to: string;
  reason: string;
  timestamp: string;
}

// ─── 내부 상태 ───────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  skill: string;
  deferredBy: string;
}

interface NoticeState {
  toasts: ToastItem[];
  banner: RollbackBlockedPayload | null;
}

type NoticeAction =
  | { type: "ADD_TOAST"; payload: DeferredSkillPayload }
  | { type: "REMOVE_TOAST"; skill: string }
  | { type: "SHOW_BANNER"; payload: RollbackBlockedPayload }
  | { type: "DISMISS_BANNER" };

function reducer(state: NoticeState, action: NoticeAction): NoticeState {
  switch (action.type) {
    case "ADD_TOAST": {
      const exists = state.toasts.some((t) => t.skill === action.payload.skill);
      if (exists) return state;
      return {
        ...state,
        toasts: [
          ...state.toasts,
          {
            id: `${action.payload.skill}-${Date.now()}`,
            skill: action.payload.skill,
            deferredBy: action.payload.deferredBy,
          },
        ],
      };
    }
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.skill !== action.skill) };
    case "SHOW_BANNER":
      return { ...state, banner: action.payload };
    case "DISMISS_BANNER":
      return { ...state, banner: null };
    default:
      return state;
  }
}

// ─── DeferredToast ────────────────────────────────────────────────────────────

interface DeferredToastProps {
  toasts: ToastItem[];
  onDismiss: (skill: string) => void;
}

export function DeferredToast({ toasts, onDismiss }: DeferredToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="deferred-toast-container"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid={`deferred-toast-${toast.skill}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#e2e8f0",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            minWidth: "220px",
            maxWidth: "320px",
          }}
        >
          <span style={{ fontSize: "16px" }}>⏳</span>
          <span style={{ flex: 1 }}>
            <span style={{ color: "#94a3b8", fontSize: "11px" }}>다음 작업 대기 중: </span>
            <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{toast.skill}</span>
          </span>
          <button
            aria-label={`${toast.skill} 토스트 닫기`}
            onClick={() => onDismiss(toast.skill)}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              padding: "2px",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── RollbackWarningBanner ────────────────────────────────────────────────────

interface RollbackWarningBannerProps {
  payload: RollbackBlockedPayload;
  onClear: () => void;
  onDismiss: () => void;
}

export function RollbackWarningBanner({ payload, onClear, onDismiss }: RollbackWarningBannerProps) {
  return (
    <div
      data-testid="rollback-warning-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 16px",
        background: "#451a03",
        borderBottom: "1px solid #92400e",
        color: "#fde68a",
        fontSize: "13px",
      }}
    >
      <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1 }}>
        상태 충돌이 감지되었습니다.{" "}
        <span style={{ color: "#fcd34d", fontStyle: "italic", fontSize: "12px" }}>
          ({payload.skill}: {payload.from} → {payload.to})
        </span>
      </span>
      <button
        data-testid="banner-clear-button"
        onClick={onClear}
        style={{
          padding: "4px 10px",
          borderRadius: "4px",
          background: "#92400e",
          border: "1px solid #b45309",
          color: "#fef3c7",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        상태 초기화 (omx state clear)
      </button>
      <button
        aria-label="경고 배너 닫기"
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#d97706",
          cursor: "pointer",
          fontSize: "14px",
          padding: "2px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── DeferredSkillsNotice ─────────────────────────────────────────────────────

/**
 * 지연 스킬 토스트 + 롤백 경고 배너를 통합 관리하는 최상위 컴포넌트.
 *
 * 사용 위치: App.tsx 루트 레벨 (ChatContainer 외부 래퍼 권장)
 *
 * @example
 * ```tsx
 * <DeferredSkillsNotice />
 * <ChatContainer />
 * ```
 */
export function DeferredSkillsNotice() {
  const [state, dispatch] = useReducer(reducer, { toasts: [], banner: null });

  useEffect(() => {
    const api = (window as Window & { electronAPI?: Record<string, unknown> }).electronAPI;
    if (!api) return;

    // 지연 스킬 이벤트 구독
    const unsubDeferred = typeof api.onSkillDeferred === "function"
      ? (api.onSkillDeferred as (cb: (p: DeferredSkillPayload) => void) => () => void)(
          (payload) => dispatch({ type: "ADD_TOAST", payload })
        )
      : () => {};

    // 롤백 차단 이벤트 구독
    const unsubRollback = typeof api.onRollbackBlocked === "function"
      ? (api.onRollbackBlocked as (cb: (p: RollbackBlockedPayload) => void) => () => void)(
          (payload) => dispatch({ type: "SHOW_BANNER", payload })
        )
      : () => {};

    // 스킬 활성화 이벤트 → 해당 토스트 제거
    const unsubActivated = typeof api.onSkillActivated === "function"
      ? (api.onSkillActivated as (cb: (p: { skill: string }) => void) => () => void)(
          ({ skill }) => dispatch({ type: "REMOVE_TOAST", skill })
        )
      : () => {};

    return () => {
      unsubDeferred();
      unsubRollback();
      unsubActivated();
    };
  }, []);

  const handleClear = useCallback(() => {
    const api = (window as Window & { electronAPI?: Record<string, unknown> }).electronAPI;
    if (typeof api?.triggerStateClear === "function") {
      (api.triggerStateClear as () => void)();
    }
    dispatch({ type: "DISMISS_BANNER" });
  }, []);

  const handleDismissBanner = useCallback(() => {
    dispatch({ type: "DISMISS_BANNER" });
  }, []);

  const handleDismissToast = useCallback((skill: string) => {
    dispatch({ type: "REMOVE_TOAST", skill });
  }, []);

  return (
    <>
      {/* 채팅창 상단 인라인 경고 배너 */}
      {state.banner && (
        <RollbackWarningBanner
          payload={state.banner}
          onClear={handleClear}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* 우측 하단 플로팅 토스트 */}
      <DeferredToast
        toasts={state.toasts}
        onDismiss={handleDismissToast}
      />
    </>
  );
}
