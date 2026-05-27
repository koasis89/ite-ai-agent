/**
 * EL-219: 수명주기 타임라인 컴포넌트
 *
 * 수명주기 상태 변경 이력을 시간 순 타임라인으로 표시한다.
 *
 * 기능:
 *   - 타임라인 아이템 목록: 각 상태 변경에 따른 항목 표시
 *   - reasoning 토큰 접기/펴기: <details> 패턴 아코디언
 *   - completion_note / auto_completed_reason 감사 말풍선 표시
 *   - 최신 항목 상단 표시 (역순)
 *   - 빈 이력 시 안내 메시지
 */

import React, { useState } from "react";
import type { LifecycleState, AuditFields } from "./LifecycleDashboard";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface TaskTimelineEntry extends Partial<LifecycleState> {
  /** 추론 과정 텍스트 (reasoning 토큰) */
  reasoning?: string;
  /** 작업 제목 (선택) */
  taskTitle?: string;
}

export interface TaskTimelineProps {
  entries: TaskTimelineEntry[];
}

// ─── 상태별 아이콘/색상 ───────────────────────────────────────────────────────

const STATUS_ICON: Record<string, { icon: string; color: string }> = {
  running:       { icon: "▶", color: "#22c55e" },
  finished:      { icon: "✓", color: "#3b82f6" },
  blocked:       { icon: "⏸", color: "#f59e0b" },
  failed:        { icon: "✗", color: "#ef4444" },
  userinterlude: { icon: "💬", color: "#8b5cf6" },
  idle:          { icon: "○", color: "#6b7280" },
};

// ─── 서브 컴포넌트: 타임라인 아이템 ──────────────────────────────────────────

interface TimelineItemProps {
  entry: TaskTimelineEntry;
  index: number;
  isLatest: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ entry, isLatest }) => {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const status = entry.status ?? "idle";
  const iconMeta = STATUS_ICON[status] ?? STATUS_ICON["idle"];

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        opacity: isLatest ? 1 : 0.75,
      }}
    >
      {/* 타임라인 점·선 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            backgroundColor: `${iconMeta.color}22`,
            border: `2px solid ${iconMeta.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
            color: iconMeta.color,
            flexShrink: 0,
          }}
        >
          {iconMeta.icon}
        </div>
        <div
          style={{
            flex: 1,
            width: "1px",
            backgroundColor: "#e5e7eb",
            minHeight: "8px",
          }}
        />
      </div>

      {/* 항목 콘텐츠 */}
      <div style={{ flex: 1, paddingBottom: "10px" }}>
        {/* 작업 제목 또는 상태 이름 */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: isLatest ? 700 : 500,
            color: isLatest ? "#111827" : "#374151",
            marginBottom: "2px",
          }}
        >
          {entry.taskTitle ?? statusLabel(status)}
          {isLatest && (
            <span
              style={{
                marginLeft: "4px",
                fontSize: "9px",
                color: "#fff",
                backgroundColor: iconMeta.color,
                padding: "1px 4px",
                borderRadius: "3px",
              }}
            >
              최신
            </span>
          )}
        </div>

        {/* 활성 모드/스킬 */}
        {(entry.activeMode || entry.activeSkill) && (
          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "2px" }}>
            {entry.activeMode && <span>모드: {entry.activeMode}</span>}
            {entry.activeMode && entry.activeSkill && <span> · </span>}
            {entry.activeSkill && <span>스킬: {entry.activeSkill}</span>}
          </div>
        )}

        {/* 원인 메시지 */}
        {entry.reason && (
          <div
            style={{
              fontSize: "11px",
              color: iconMeta.color,
              backgroundColor: `${iconMeta.color}12`,
              padding: "3px 6px",
              borderRadius: "4px",
              marginBottom: "4px",
            }}
          >
            {entry.reason}
          </div>
        )}

        {/* 감사 노트 말풍선 */}
        {entry.audit && <AuditMini audit={entry.audit} />}

        {/* Reasoning 토큰 아코디언 */}
        {entry.reasoning && (
          <details
            open={reasoningOpen}
            onToggle={(e) => setReasoningOpen((e.target as HTMLDetailsElement).open)}
            style={{ marginTop: "4px" }}
          >
            <summary
              style={{
                fontSize: "10px",
                color: "#3b82f6",
                cursor: "pointer",
                userSelect: "none",
                listStyle: "none",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>{reasoningOpen ? "▼" : "▶"}</span>
              <span>추론 과정 {reasoningOpen ? "접기" : "보기"}</span>
            </summary>
            <div
              style={{
                fontSize: "10px",
                color: "#4b5563",
                lineHeight: "1.6",
                padding: "6px 8px",
                backgroundColor: "#f8fafc",
                borderRadius: "4px",
                marginTop: "4px",
                borderLeft: "2px solid #93c5fd",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {entry.reasoning}
            </div>
          </details>
        )}

        {/* 타임스탬프 */}
        {entry.updatedAt && (
          <div style={{ fontSize: "9px", color: "#9ca3af", marginTop: "3px" }}>
            {new Date(entry.updatedAt).toLocaleTimeString("ko-KR")}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 서브 컴포넌트: 감사 미니 말풍선 ─────────────────────────────────────────

const AuditMini: React.FC<{ audit: AuditFields }> = ({ audit }) => {
  if (!audit.completion_note && !audit.auto_completed_reason) return null;

  return (
    <div
      style={{
        fontSize: "10px",
        color: "#1e40af",
        backgroundColor: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "4px",
        padding: "4px 6px",
        marginBottom: "4px",
      }}
    >
      {audit.completion_note && (
        <div style={{ marginBottom: "2px" }}>{audit.completion_note}</div>
      )}
      {audit.auto_completed_reason && (
        <div style={{ fontStyle: "italic", color: "#4b5563" }}>
          자동 완료: {audit.auto_completed_reason}
        </div>
      )}
    </div>
  );
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

/**
 * 수명주기 타임라인 — 상태 변경 이력을 역순(최신 상단)으로 표시.
 */
export const TaskTimeline: React.FC<TaskTimelineProps> = ({ entries }) => {
  // 최신 상단 — 역순 복사 (원본 변경 없음)
  const reversed = [...entries].reverse();

  if (reversed.length === 0) {
    return (
      <div
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          textAlign: "center",
          padding: "16px 8px",
        }}
      >
        아직 상태 이력이 없습니다.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {reversed.map((entry, i) => (
        <TimelineItem
          key={entry.updatedAt ?? i}
          entry={entry}
          index={i}
          isLatest={i === 0}
        />
      ))}
    </div>
  );
};

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    running: "실행 중",
    finished: "완료",
    blocked: "차단 대기",
    failed: "실패",
    userinterlude: "인터류드",
    idle: "대기 중",
  };
  return labels[status] ?? status;
}
