/**
 * EL-221: 위키 검색 오버레이 컴포넌트
 *
 * 기능:
 *   1. 에이전트의 wiki 도구 호출 감지 → 인라인 Pulsing 진행 배지
 *   2. 완료 시 진행 배지 → 체크마크(✅) 트랜지션
 *   3. 사용자 직접 위키 조회 → 슬라이드-인 마크다운 뷰어 (우측 패널)
 *
 * 구독 채널:
 *   omx:stream-tool-call   — wiki tool_call 감지
 *   omx:stream-tool-result — wiki 도구 완료 감지
 */

import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface WikiToolCallPayload {
  type: string;
  tool_name?: string;
  input?: { query?: string; title?: string };
}

interface WikiToolResultPayload {
  type: string;
  tool_name?: string;
  content?: string;
}

interface WikiBadgeState {
  id: string;            // tool call id (고유)
  query: string;         // 검색어 or 제목
  phase: "searching" | "done" | "error";
}

interface WikiDocument {
  title: string;
  content: string;       // 마크다운 원본
}

// ─── Wiki 도구 이름 집합 ─────────────────────────────────────────────────────

const WIKI_TOOL_NAMES = new Set(["wiki_query", "wiki_read", "wiki search", "wiki read"]);

function isWikiTool(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().replace(/_/g, " ");
  return WIKI_TOOL_NAMES.has(lower) || lower.startsWith("wiki");
}

// ─── WikiBadge — 인라인 진행 상태 배지 ──────────────────────────────────────

const WikiBadge: React.FC<{ badge: WikiBadgeState }> = ({ badge }) => {
  const isDone = badge.phase === "done";
  const isError = badge.phase === "error";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: isDone ? "#dcfce7" : isError ? "#fee2e2" : "#eff6ff",
        color: isDone ? "#16a34a" : isError ? "#dc2626" : "#1d4ed8",
        border: `1px solid ${isDone ? "#86efac" : isError ? "#fca5a5" : "#93c5fd"}`,
        transition: "all 0.3s ease",
        userSelect: "none",
      }}
    >
      {isDone ? (
        "✅"
      ) : isError ? (
        "❌"
      ) : (
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#3b82f6",
            animation: "omx-wiki-pulse 1.2s ease-in-out infinite",
          }}
        />
      )}
      {isDone
        ? `위키 참조 완료: ${badge.query}`
        : isError
        ? `위키 오류: ${badge.query}`
        : `프로젝트 지식베이스 검색 중... (${badge.query})`}
    </span>
  );
};

// ─── MarkdownViewer — 마크다운 원본 뷰어 모달 ───────────────────────────────

const MarkdownViewer: React.FC<{
  doc: WikiDocument;
  onClose: () => void;
}> = ({ doc, onClose }) => {
  // 키보드 ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        background: "#1e1e2e",
        borderLeft: "1px solid #313244",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        animation: "omx-wiki-slide-in 0.2s ease",
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #313244",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>📚</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#cdd6f4" }}>
            {doc.title}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#6c7086",
            cursor: "pointer",
            fontSize: 18,
            padding: "0 4px",
            lineHeight: 1,
          }}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
      {/* 마크다운 원본 (No-Vector: 정적 텍스트 그대로 표시) */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.7,
          color: "#cdd6f4",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {doc.content}
      </div>
    </div>
  );
};

// ─── WikiOverlay 메인 컴포넌트 ────────────────────────────────────────────────

export interface WikiOverlayProps {
  /** 에이전트 스트림 tool_call 이벤트 → 배지 렌더링 위치. true=채팅 하단 고정 */
  showBadgesInline?: boolean;
}

export const WikiOverlay: React.FC<WikiOverlayProps> = ({
  showBadgesInline = true,
}) => {
  const [badges, setBadges] = useState<WikiBadgeState[]>([]);
  const [viewer, setViewer] = useState<WikiDocument | null>(null);
  const unsubRefs = useRef<Array<() => void>>([]);

  // ── IPC 구독 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const api = (window as Window & typeof globalThis).electronAPI;
    if (!api) return;

    // wiki tool_call 감지
    if (typeof api.onStreamToolCall === "function") {
      const unsub = api.onStreamToolCall((payload: WikiToolCallPayload) => {
        if (!isWikiTool(payload.tool_name)) return;
        const query =
          payload.input?.query ?? payload.input?.title ?? "(알 수 없음)";
        setBadges((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            query,
            phase: "searching",
          },
        ]);
      });
      unsubRefs.current.push(unsub);
    }

    // wiki 도구 결과 완료
    if (typeof api.onStreamToolResult === "function") {
      const unsub = api.onStreamToolResult((payload: WikiToolResultPayload) => {
        if (!isWikiTool(payload.tool_name)) return;
        setBadges((prev) =>
          prev.map((b) =>
            b.phase === "searching" ? { ...b, phase: "done" } : b
          )
        );
        // 3초 후 done 배지 자동 제거
        setTimeout(() => {
          setBadges((prev) => prev.filter((b) => b.phase !== "done"));
        }, 3000);
      });
      unsubRefs.current.push(unsub);
    }

    return () => {
      for (const unsub of unsubRefs.current) unsub();
      unsubRefs.current = [];
    };
  }, []);

  const handleCloseViewer = useCallback(() => setViewer(null), []);

  if (!showBadgesInline && !viewer) return null;

  return (
    <>
      {/* 인라인 진행 배지 (채팅 하단) */}
      {showBadgesInline && badges.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "6px 12px",
          }}
        >
          {badges.map((b) => (
            <WikiBadge key={b.id} badge={b} />
          ))}
        </div>
      )}

      {/* 마크다운 뷰어 슬라이드-인 패널 */}
      {viewer && <MarkdownViewer doc={viewer} onClose={handleCloseViewer} />}

      {/* CSS 애니메이션 (인라인 style injection) */}
      <style>{`
        @keyframes omx-wiki-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes omx-wiki-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default WikiOverlay;
