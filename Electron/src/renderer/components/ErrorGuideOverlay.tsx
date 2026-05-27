/**
 * EL-226: ErrorGuideOverlay — 통합 예외 가이드 UI
 *
 * 구성:
 *   - DriftCriticalBanner: Drift 위기 알림 + 재동기화 버튼
 *   - ErrorGuideOverlay: 에러 코드별 복구 가이드 Markdown 팝업 + 원클릭 상태 클리어
 *   - 에러 코드 → 사용자 친화적 메시지 매핑 테이블
 *
 * 구독 채널:
 *   - "omx:drift-critical"   — Drift 위기 알림
 *   - "omx:error-guide-open" — 에러 코드와 함께 가이드 오버레이 열기
 *
 * IPC 요청 채널 (→ Main):
 *   - "omx:ops-state-clear"  — 원클릭 상태 클리어
 *   - "omx:ops-setup-resync" — 환경 재동기화
 */

import React, { useEffect, useState, useCallback } from "react";
import type { DriftReport } from "../../main/ops/drift-detector";

// ─── 에러 코드 → 복구 가이드 매핑 ───────────────────────────────────────────

export interface ErrorGuideEntry {
  title: string;
  description: string;
  steps: string[];
  primaryAction?: { label: string; channel: string };
  secondaryAction?: { label: string; channel: string };
}

export const ERROR_GUIDE_MAP: Record<string, ErrorGuideEntry> = {
  DRIFT_CRITICAL: {
    title: "플러그인 정합성 위기 (Drift)",
    description: "실행 로그에 매니페스트에 등록되지 않은 플러그인 호출이 다수 감지되었습니다.",
    steps: [
      "1. `omx setup`을 실행하여 플러그인 카탈로그를 재동기화합니다.",
      "2. 불필요한 플러그인이 있다면 `manifest.json`에서 제거합니다.",
      "3. 동기화 후 `omx doctor --json`으로 환경 무결성을 재확인합니다.",
    ],
    primaryAction: { label: "환경 재동기화 (omx setup)", channel: "omx:ops-setup-resync" },
  },
  STATE_ROLLBACK: {
    title: "상태 역전이(Rollback) 감지",
    description: "in_progress → planning 비정상 전이가 차단되었습니다.",
    steps: [
      "1. 현재 진행 중인 작업이 있다면 완료 또는 취소합니다.",
      "2. `omx state clear`로 상태를 초기화합니다.",
      "3. 새 사이클을 planning 단계부터 시작합니다.",
    ],
    primaryAction: { label: "상태 초기화 (omx state clear)", channel: "omx:ops-state-clear" },
  },
  CLI_UNREACHABLE: {
    title: "OMX CLI 연결 불가",
    description: "omx CLI가 응답하지 않거나 설치되지 않았습니다.",
    steps: [
      "1. `omx --version`으로 CLI 설치 여부를 확인합니다.",
      "2. PATH 환경 변수에 omx 실행 경로가 포함되어 있는지 확인합니다.",
      "3. `omx doctor --json`으로 상세 진단 정보를 확인합니다.",
    ],
    primaryAction: { label: "환경 진단 (omx doctor)", channel: "omx:ops-drift-check" },
  },
  ADAPTER_DEGRADED: {
    title: "어댑터 서비스 불안정",
    description: "OpenClaw 또는 Hermes 어댑터가 degraded 상태입니다.",
    steps: [
      "1. 해당 어댑터 서비스를 재시작합니다.",
      "2. 네트워크 연결 상태를 확인합니다.",
      "3. `omx adapt <target> probe --json`으로 상세 상태를 진단합니다.",
    ],
    secondaryAction: { label: "어댑터 재탐지", channel: "omx:adapter-probe" },
  },
  UNKNOWN: {
    title: "알 수 없는 오류",
    description: "예상치 못한 오류가 발생했습니다.",
    steps: [
      "1. 애플리케이션을 재시작합니다.",
      "2. `omx doctor --json`으로 환경 상태를 확인합니다.",
      "3. 문제가 지속되면 로그 파일을 개발팀에 공유합니다.",
    ],
    primaryAction: { label: "상태 초기화", channel: "omx:ops-state-clear" },
  },
};

// ─── DriftCriticalBanner ──────────────────────────────────────────────────────

interface DriftCriticalBannerProps {
  report: DriftReport;
  onResync: () => void;
  onViewDetail: () => void;
  onDismiss: () => void;
}

export function DriftCriticalBanner({
  report,
  onResync,
  onViewDetail,
  onDismiss,
}: DriftCriticalBannerProps) {
  return (
    <div
      data-testid="drift-critical-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 16px",
        background: "#3b1f02",
        borderBottom: "1px solid #92400e",
        color: "#fde68a",
        fontSize: "13px",
      }}
    >
      <span style={{ fontSize: "16px", flexShrink: 0 }}>🔥</span>
      <span style={{ flex: 1 }}>
        정합성 위기: 미등록 플러그인 호출{" "}
        <strong style={{ color: "#fcd34d" }}>{report.driftCount}건</strong>{" "}
        (Drift {report.driftRate.toFixed(1)}%)
      </span>
      <button
        data-testid="drift-resync-button"
        onClick={onResync}
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
        환경 재동기화 (omx setup)
      </button>
      <button
        data-testid="drift-detail-button"
        onClick={onViewDetail}
        style={{
          padding: "4px 8px",
          borderRadius: "4px",
          background: "none",
          border: "1px solid #92400e",
          color: "#fde68a",
          cursor: "pointer",
          fontSize: "12px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        상세 보기
      </button>
      <button
        aria-label="Drift 경고 닫기"
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

// ─── ErrorGuideOverlay ────────────────────────────────────────────────────────

interface ErrorGuideOverlayProps {
  errorCode: string;
  onClose: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

export function ErrorGuideOverlay({
  errorCode,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
}: ErrorGuideOverlayProps) {
  const guide = ERROR_GUIDE_MAP[errorCode] ?? ERROR_GUIDE_MAP["UNKNOWN"]!;

  return (
    <div
      data-testid="error-guide-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-testid="error-guide-panel"
        style={{
          width: "480px",
          maxWidth: "90vw",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🛠️</span>
          <div style={{ flex: 1 }}>
            <h2
              data-testid="error-guide-title"
              style={{ margin: 0, fontSize: "16px", color: "#f1f5f9", fontWeight: 700 }}
            >
              {guide.title}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
              {guide.description}
            </p>
          </div>
          <button
            aria-label="가이드 닫기"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "18px",
              padding: 0,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* 복구 단계 */}
        <div
          data-testid="error-guide-steps"
          style={{
            background: "#1e293b",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {guide.steps.map((step, idx) => (
            <p
              key={idx}
              style={{
                margin: 0,
                fontSize: "13px",
                color: "#cbd5e1",
                lineHeight: 1.6,
                fontFamily: "inherit",
                whiteSpace: "pre-wrap",
              }}
            >
              {step}
            </p>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          {guide.secondaryAction && onSecondaryAction && (
            <button
              data-testid="error-guide-secondary-action"
              onClick={onSecondaryAction}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "none",
                border: "1px solid #334155",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {guide.secondaryAction.label}
            </button>
          )}
          {guide.primaryAction && onPrimaryAction && (
            <button
              data-testid="error-guide-primary-action"
              onClick={onPrimaryAction}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                background: "#3b82f6",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {guide.primaryAction.label}
            </button>
          )}
          <button
            data-testid="error-guide-close"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 통합 컨트롤러 ────────────────────────────────────────────────────────────

/**
 * Drift 배너 + 오류 가이드 오버레이를 통합 관리하는 컨트롤러 컴포넌트.
 *
 * 사용 위치: App.tsx 루트 레벨 (DeferredSkillsNotice 옆)
 *
 * @example
 * ```tsx
 * <ErrorGuideController />
 * <DeferredSkillsNotice />
 * <ChatContainer />
 * ```
 */
export function ErrorGuideController() {
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [overlayErrorCode, setOverlayErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const api = (window as Window & { electronAPI?: Record<string, unknown> }).electronAPI;
    if (!api) return;

    const unsubDrift = typeof api.onDriftCritical === "function"
      ? (api.onDriftCritical as (cb: (r: DriftReport) => void) => () => void)(
          (report) => setDriftReport(report)
        )
      : () => {};

    const unsubGuide = typeof api.onErrorGuideOpen === "function"
      ? (api.onErrorGuideOpen as (cb: (code: string) => void) => () => void)(
          (code) => setOverlayErrorCode(code)
        )
      : () => {};

    return () => {
      unsubDrift();
      unsubGuide();
    };
  }, []);

  const handleResync = useCallback(async () => {
    const api = (window as Window & { electronAPI?: Record<string, unknown> }).electronAPI;
    if (typeof api?.opsSetupResync === "function") {
      await (api.opsSetupResync as () => Promise<void>)();
    }
    setDriftReport(null);
  }, []);

  const handleStateClear = useCallback(async () => {
    const api = (window as Window & { electronAPI?: Record<string, unknown> }).electronAPI;
    if (typeof api?.opsStateClear === "function") {
      await (api.opsStateClear as () => Promise<void>)();
    }
    setOverlayErrorCode(null);
  }, []);

  const guide = overlayErrorCode
    ? ERROR_GUIDE_MAP[overlayErrorCode] ?? ERROR_GUIDE_MAP["UNKNOWN"]!
    : null;

  return (
    <>
      {driftReport && (
        <DriftCriticalBanner
          report={driftReport}
          onResync={handleResync}
          onViewDetail={() => setOverlayErrorCode("DRIFT_CRITICAL")}
          onDismiss={() => setDriftReport(null)}
        />
      )}
      {overlayErrorCode && guide && (
        <ErrorGuideOverlay
          errorCode={overlayErrorCode}
          onClose={() => setOverlayErrorCode(null)}
          onPrimaryAction={guide.primaryAction ? handleStateClear : undefined}
          onSecondaryAction={
            guide.secondaryAction
              ? () => setOverlayErrorCode(null)
              : undefined
          }
        />
      )}
    </>
  );
}
