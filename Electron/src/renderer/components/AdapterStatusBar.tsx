/**
 * EL-223: 어댑터 상태 표시줄 (하단 상태 바)
 *
 * 기능:
 *   - OpenClaw / Hermes 연동 아이콘 + 상태 레이블 + 툴팁
 *   - omx:adapter-status 채널 구독하여 실시간 상태 갱신
 *   - 클릭 시 onAdapterClick 콜백 (선택적 — 상세 뷰 열기)
 *
 * 상태 시각화:
 *   running    → 초록 원 🟢
 *   degraded   → 노랑 원 🟡 + "degraded" 레이블
 *   installed  → 파랑 원 🔵 + "미실행" 레이블
 *   unavailable→ 회색 원 ⚫ + "미설치" 레이블
 */

import React, { useState, useEffect, useRef } from "react";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type AdapterStatus = "unavailable" | "installed" | "degraded" | "running";
export type AdapterTarget = "openclaw" | "hermes";

export interface AdapterInfo {
  target: AdapterTarget;
  status: AdapterStatus;
  envelope?: {
    version?: string;
    capabilities?: string[];
    endpoint?: string;
  };
  probe?: {
    latency_ms?: number;
    alive: boolean;
    last_checked?: string;
  };
  probed_at: string;
}

// ─── 상태 → 시각화 매핑 ──────────────────────────────────────────────────────

const STATUS_META: Record<
  AdapterStatus,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  running: {
    icon: "🟢",
    label: "연결됨",
    color: "#a6e3a1",
    bgColor: "rgba(166,227,161,0.12)",
  },
  degraded: {
    icon: "🟡",
    label: "불안정",
    color: "#f9e2af",
    bgColor: "rgba(249,226,175,0.12)",
  },
  installed: {
    icon: "🔵",
    label: "미실행",
    color: "#89b4fa",
    bgColor: "rgba(137,180,250,0.10)",
  },
  unavailable: {
    icon: "⚫",
    label: "미설치",
    color: "#6c7086",
    bgColor: "transparent",
  },
};

const TARGET_LABEL: Record<AdapterTarget, string> = {
  openclaw: "OpenClaw",
  hermes: "Hermes",
};

// ─── AdapterChip 서브 컴포넌트 ────────────────────────────────────────────────

const AdapterChip: React.FC<{
  info: AdapterInfo;
  onClick?: (info: AdapterInfo) => void;
}> = ({ info, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const meta = STATUS_META[info.status];
  const targetLabel = TARGET_LABEL[info.target];

  const tooltipContent = buildTooltip(info);

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={() => onClick?.(info)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          background: meta.bgColor,
          border: `1px solid ${meta.color}40`,
          borderRadius: 10,
          color: meta.color,
          fontSize: 11,
          fontWeight: 500,
          cursor: onClick ? "pointer" : "default",
          transition: "background 0.2s",
        }}
        data-testid={`adapter-chip-${info.target}`}
      >
        <span style={{ fontSize: 9, lineHeight: 1 }}>{meta.icon}</span>
        {targetLabel}
        <span
          style={{
            fontSize: 10,
            color: `${meta.color}cc`,
            fontWeight: 400,
          }}
        >
          {meta.label}
        </span>
      </button>

      {/* 툴팁 */}
      {showTooltip && tooltipContent && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#11111b",
            border: "1px solid #313244",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 11,
            color: "#cdd6f4",
            whiteSpace: "nowrap",
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            lineHeight: 1.7,
          }}
          data-testid={`adapter-tooltip-${info.target}`}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

function buildTooltip(info: AdapterInfo): React.ReactNode {
  const lines: string[] = [];
  lines.push(`${TARGET_LABEL[info.target]}  (${info.status})`);

  if (info.envelope?.version) {
    lines.push(`버전: ${info.envelope.version}`);
  }
  if (info.envelope?.capabilities?.length) {
    lines.push(`기능: ${info.envelope.capabilities.slice(0, 3).join(", ")}`);
  }
  if (info.probe) {
    lines.push(
      `latency: ${info.probe.latency_ms != null ? `${info.probe.latency_ms}ms` : "N/A"}`
    );
    lines.push(`alive: ${info.probe.alive ? "✅" : "❌"}`);
  }
  lines.push(`탐지: ${new Date(info.probed_at).toLocaleTimeString()}`);

  return (
    <>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </>
  );
}

// ─── AdapterStatusBar 메인 컴포넌트 ─────────────────────────────────────────

export interface AdapterStatusBarProps {
  onAdapterClick?: (info: AdapterInfo) => void;
}

export const AdapterStatusBar: React.FC<AdapterStatusBarProps> = ({
  onAdapterClick,
}) => {
  const [statuses, setStatuses] = useState<Partial<Record<AdapterTarget, AdapterInfo>>>({});
  const unsubRef = useRef<(() => void) | null>(null);

  // ── omx:adapter-status 채널 구독 ────────────────────────────────────────────
  useEffect(() => {
    const api = (window as Window & typeof globalThis).electronAPI;
    if (!api?.onAdapterStatus) return;

    unsubRef.current = api.onAdapterStatus((info: AdapterInfo) => {
      setStatuses((prev) => ({ ...prev, [info.target]: info }));
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  const items = Object.values(statuses);

  // 모두 unavailable이면 렌더링 생략 (상태 바 공간 차지 방지)
  const hasVisible = items.some((i) => i.status !== "unavailable");
  if (!hasVisible && items.length > 0) return null;

  return (
    <div
      data-testid="adapter-status-bar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "#11111b",
        borderTop: "1px solid #1e1e2e",
        flexShrink: 0,
        height: 28,
        overflow: "hidden",
      }}
    >
      {items.length === 0 ? (
        <span style={{ fontSize: 11, color: "#45475a" }}>어댑터 없음</span>
      ) : (
        items.map((info) => (
          <AdapterChip key={info.target} info={info} onClick={onAdapterClick} />
        ))
      )}
    </div>
  );
};

export default AdapterStatusBar;
