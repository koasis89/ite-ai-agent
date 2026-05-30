/**
 * EL-219: 수명주기 대시보드 컴포넌트
 *
 * 에이전트의 현재 수명주기 상태를 메인 채팅 뷰와 분리된
 * 슬라이딩 사이드바 타임라인으로 렌더링한다.
 *
 * 기능:
 *   - 초기 Rehydration: 마운트 시 `omx:lifecycle-get`으로 현재 상태 즉시 동기화
 *   - 실시간 구독: `omx:lifecycle-change` IPC 이벤트로 상태 변경 반영
 *   - 슬라이딩 사이드바: 접기/펴기 가능한 타임라인 레이아웃
 *   - 감사 노트 말풍선: completion_note / auto_completed_reason 노출
 *
 * window.electronAPI 의존:
 *   - getLifecycleState(): Promise<LifecycleState>
 *   - onLifecycleChange(cb): () => void (unsubscribe)
 */

import React, { useEffect, useRef, useState } from "react";
import { TaskTimeline } from "./TaskTimeline";
import { TodoPanel } from "./TodoPanel";

// ─── 타입 (contextBridge 경유) ────────────────────────────────────────────────

export interface AuditFields {
  completed_at?: string;
  auto_completed_reason?: string;
  completion_note?: string;
}

export interface LifecycleState {
  status: "running" | "finished" | "blocked" | "failed" | "userinterlude" | "idle";
  activeMode?: string;
  activeSkill?: string;
  mergedModes: string[];
  audit?: AuditFields;
  reason?: string;
  updatedAt: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getLifecycleState?: () => Promise<LifecycleState>;
      onLifecycleChange?: (cb: (state: Partial<LifecycleState>) => void) => () => void;
      startLifecycleWatcher?: (stateDir: string) => Promise<{ ok: boolean; error?: string }>;
      stopLifecycleWatcher?: () => Promise<void>;
      onStreamDone?: (cb: (e: { type?: string; exitCode?: number }) => void) => () => void;
    };
  }
}

// ─── 상태별 테마 ──────────────────────────────────────────────────────────────

const STATUS_THEME: Record<
  LifecycleState["status"],
  { label: string; color: string; bg: string; emoji: string }
> = {
  running:       { label: "실행 중",     color: "#22c55e", bg: "#dcfce7", emoji: "▶" },
  finished:      { label: "완료",        color: "#3b82f6", bg: "#dbeafe", emoji: "✓" },
  blocked:       { label: "차단 대기",   color: "#f59e0b", bg: "#fef3c7", emoji: "⏸" },
  failed:        { label: "실패",        color: "#ef4444", bg: "#fee2e2", emoji: "✗" },
  userinterlude: { label: "인터류드",    color: "#8b5cf6", bg: "#ede9fe", emoji: "💬" },
  idle:          { label: "대기",        color: "#6b7280", bg: "#f3f4f6", emoji: "○" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LifecycleDashboardProps {
  /** 사이드바 초기 펼침 여부 */
  defaultOpen?: boolean;
  /** `.omx/state/` 경로 (워처 시작에 사용) */
  stateDir?: string;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

/**
 * 수명주기 대시보드 — 메인 뷰 우측에 위치하는 슬라이딩 사이드바.
 */
export const LifecycleDashboard: React.FC<LifecycleDashboardProps> = ({
  defaultOpen = true,
  stateDir,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [lifecycle, setLifecycle] = useState<LifecycleState | null>(null);
  const [history, setHistory] = useState<Array<Partial<LifecycleState>>>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  // ── 초기 Rehydration + 실시간 구독 ─────────────────────────────────────────
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // 워처 시작 (stateDir 제공 시)
    if (stateDir && api.startLifecycleWatcher) {
      api.startLifecycleWatcher(stateDir).catch(console.error);
    }

    // 초기 상태 동기화
    if (api.getLifecycleState) {
      api.getLifecycleState().then((state) => {
        setLifecycle(state);
        setHistory([state]);
      }).catch(console.error);
    }

    // 실시간 변경 구독
    if (api.onLifecycleChange) {
      unsubRef.current = api.onLifecycleChange((partial) => {
        setLifecycle((prev) => {
          const merged: LifecycleState = {
            status: "idle",
            mergedModes: [],
            updatedAt: new Date().toISOString(),
            ...prev,
            ...partial,
          };
          return merged;
        });
        setHistory((prev) => [...prev.slice(-49), partial]);
      });
    }

    // 스트림 완료 후 lifecycle 상태 동기화 (running → finished/failed)
    const streamDoneUnsub = api.onStreamDone?.((e) => {
      const doneStatus: LifecycleState["status"] =
        (e?.exitCode ?? 0) === 0 ? "finished" : "failed";
      setLifecycle((prev) => ({
        status: "idle" as LifecycleState["status"],
        mergedModes: [],
        updatedAt: new Date().toISOString(),
        ...prev,
        status: doneStatus,
      } as LifecycleState));
      setHistory((prev) => [
        ...prev.slice(-49),
        { status: doneStatus, updatedAt: new Date().toISOString() },
      ]);
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      streamDoneUnsub?.();
      if (stateDir && api.stopLifecycleWatcher) {
        api.stopLifecycleWatcher().catch(console.error);
      }
    };
  }, [stateDir]);

  // ── 현재 상태 테마 ──────────────────────────────────────────────────────────
  const theme = lifecycle
    ? STATUS_THEME[lifecycle.status]
    : STATUS_THEME["idle"];

  // ── 렌더링 ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: isOpen ? "280px" : "44px",
        minWidth: isOpen ? "280px" : "44px",
        transition: "width 0.2s ease, min-width 0.2s ease",
        borderLeft: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* 헤더 (접기/펴기 버튼) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "space-between" : "center",
          padding: "10px 12px",
          borderBottom: "1px solid #e5e7eb",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen && (
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
            에이전트 상태
          </span>
        )}
        <span style={{ fontSize: "16px", color: "#6b7280" }}>
          {isOpen ? "›" : "‹"}
        </span>
      </div>

      {/* 사이드바 콘텐츠 */}
      {isOpen && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* 상단: 에이전트 상태 */}
          <div
            style={{
              flex: "0 1 auto",
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              borderBottom: "1px solid #e5e7eb",
              minHeight: 0,
            }}
          >
            {/* 현재 상태 카드 */}
            {lifecycle && (
              <StatusCard lifecycle={lifecycle} theme={theme} />
            )}

            {/* 감사 노트 말풍선 */}
            {lifecycle?.audit && <AuditNoteBubble audit={lifecycle.audit} />}

            {/* 타임라인 */}
            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                상태 이력
              </div>
              <TaskTimeline entries={history} />
            </div>
          </div>

          {/* 하단: 할 일 목록 */}
          <div
            style={{
              flex: "0 0 auto",
              overflowY: "auto",
              padding: "12px",
              maxHeight: "220px",
            }}
          >
            <TodoPanel />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 서브 컴포넌트: 상태 카드 ─────────────────────────────────────────────────

interface StatusCardProps {
  lifecycle: LifecycleState;
  theme: { label: string; color: string; bg: string; emoji: string };
}

const StatusCard: React.FC<StatusCardProps> = ({ lifecycle, theme }) => (
  <div
    style={{
      backgroundColor: theme.bg,
      borderRadius: "8px",
      padding: "10px 12px",
      border: `1px solid ${theme.color}33`,
    }}
  >
    {/* 상태 배지 */}
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
      <span style={{ fontSize: "16px" }}>{theme.emoji}</span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: theme.color,
        }}
      >
        {theme.label}
      </span>
    </div>

    {/* 활성 모드 */}
    {lifecycle.activeMode && (
      <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "2px" }}>
        모드: <strong>{lifecycle.activeMode}</strong>
      </div>
    )}

    {/* 활성 스킬 */}
    {lifecycle.activeSkill && (
      <div style={{ fontSize: "12px", color: "#4b5563", marginBottom: "2px" }}>
        스킬: <strong>{lifecycle.activeSkill}</strong>
      </div>
    )}

    {/* 병합 모드 목록 */}
    {lifecycle.mergedModes.length > 1 && (
      <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
        병합: {lifecycle.mergedModes.join(", ")}
      </div>
    )}

    {/* 차단/실패 원인 */}
    {lifecycle.reason && (
      <div
        style={{
          fontSize: "11px",
          color: theme.color,
          marginTop: "4px",
          padding: "4px 6px",
          backgroundColor: `${theme.color}18`,
          borderRadius: "4px",
        }}
      >
        {lifecycle.reason}
      </div>
    )}

    {/* 업데이트 시각 */}
    <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "6px" }}>
      {new Date(lifecycle.updatedAt).toLocaleTimeString("ko-KR")}
    </div>
  </div>
);

// ─── 서브 컴포넌트: 감사 노트 말풍선 ─────────────────────────────────────────

interface AuditNoteBubbleProps {
  audit: AuditFields;
}

const AuditNoteBubble: React.FC<AuditNoteBubbleProps> = ({ audit }) => {
  if (!audit.completion_note && !audit.auto_completed_reason) return null;

  return (
    <div
      style={{
        backgroundColor: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "8px",
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#1d4ed8",
          marginBottom: "4px",
        }}
      >
        ✦ 완료 노트
      </div>

      {audit.completion_note && (
        <div style={{ fontSize: "12px", color: "#1e3a5f", lineHeight: "1.5" }}>
          {audit.completion_note}
        </div>
      )}

      {audit.auto_completed_reason && (
        <div
          style={{
            fontSize: "11px",
            color: "#4b5563",
            marginTop: "4px",
            fontStyle: "italic",
          }}
        >
          자동 완료 이유: {audit.auto_completed_reason}
        </div>
      )}

      {audit.completed_at && (
        <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
          {new Date(audit.completed_at).toLocaleString("ko-KR")}
        </div>
      )}
    </div>
  );
};
