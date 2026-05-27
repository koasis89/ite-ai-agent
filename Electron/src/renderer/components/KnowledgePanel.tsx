/**
 * EL-223: 지식 탐색기 사이드패널 (Knowledge Explorer)
 *
 * 기능:
 *   - 위키 문서 검색 + 결과 목록
 *   - 위키 검색 히스토리 (세션 내 유지)
 *   - 문서 링크 클릭 → MarkdownViewer 슬라이드-인 팝업
 *   - omx:adapter-status 채널 수신하여 OpenClaw/Hermes 연동 배지 표시
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ADAPTER_STATUS_CHANNEL } from "../../main/ipc/adapter-ipc";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface WikiSearchHit {
  title: string;
  excerpt?: string;
  path?: string;
  score?: number;
}

interface SearchEntry {
  query: string;
  hits: WikiSearchHit[];
  timestamp: number;
}

interface WikiDocument {
  title: string;
  content: string;
}

interface AdapterInfo {
  target: "openclaw" | "hermes";
  status: "unavailable" | "installed" | "degraded" | "running";
}

// ─── MarkdownViewer (인라인) ─────────────────────────────────────────────────

const MarkdownViewer: React.FC<{
  doc: WikiDocument;
  onClose: () => void;
}> = ({ doc, onClose }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      data-testid="markdown-viewer"
      style={{
        position: "fixed",
        top: 0,
        right: 320,   // KnowledgePanel 너비 우측에 붙음
        bottom: 0,
        width: 520,
        background: "#1e1e2e",
        borderLeft: "1px solid #313244",
        zIndex: 8900,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
        animation: "omx-kp-slide-in 0.2s ease",
      }}
    >
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
          <span>📄</span>
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
          }}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
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

// ─── KnowledgePanel 메인 컴포넌트 ─────────────────────────────────────────────

export interface KnowledgePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [viewerDoc, setViewerDoc] = useState<WikiDocument | null>(null);
  const [adapterStatuses, setAdapterStatuses] = useState<Record<string, AdapterInfo>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubRefs = useRef<Array<() => void>>([]);

  // ── 어댑터 상태 구독 ────────────────────────────────────────────────────────
  useEffect(() => {
    const api = (window as Window & typeof globalThis).electronAPI;
    if (!api?.onAdapterStatus) return;

    const unsub = api.onAdapterStatus((info: AdapterInfo) => {
      setAdapterStatuses((prev) => ({ ...prev, [info.target]: info }));
    });
    unsubRefs.current.push(unsub);

    return () => {
      for (const unsub of unsubRefs.current) unsub();
      unsubRefs.current = [];
    };
  }, []);

  // ── 패널 열릴 때 포커스 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // ── 검색 실행 ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    try {
      const api = (window as Window & typeof globalThis).electronAPI;
      if (!api?.wikiSearch) {
        // fallback: 임시 히스토리 항목
        setHistory((prev) => [
          { query: trimmed, hits: [], timestamp: Date.now() },
          ...prev,
        ]);
        return;
      }

      const result = await api.wikiSearch(trimmed);
      setHistory((prev) => [
        {
          query: trimmed,
          hits: result?.hits ?? [],
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19), // 최대 20개 히스토리 유지
      ]);
    } catch (err) {
      console.error("[KnowledgePanel] 검색 실패:", err);
    } finally {
      setIsSearching(false);
      setQuery("");
    }
  }, [query, isSearching]);

  // ── 문서 열기 ────────────────────────────────────────────────────────────────
  const handleOpenDoc = useCallback(async (title: string) => {
    try {
      const api = (window as Window & typeof globalThis).electronAPI;
      if (!api?.wikiRead) return;
      const doc = await api.wikiRead(title);
      if (doc) {
        setViewerDoc({ title: doc.title ?? title, content: doc.content ?? "" });
      }
    } catch (err) {
      console.error("[KnowledgePanel] 문서 열기 실패:", err);
    }
  }, []);

  const handleCloseViewer = useCallback(() => setViewerDoc(null), []);

  if (!isOpen) return null;

  return (
    <>
      {/* 사이드패널 */}
      <aside
        data-testid="knowledge-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: "#181825",
          borderLeft: "1px solid #313244",
          zIndex: 9000,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.4)",
          animation: "omx-kp-slide-in 0.2s ease",
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
            <span>🧠</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#cdd6f4" }}>
              지식 탐색기
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
            }}
            aria-label="지식 탐색기 닫기"
          >
            ✕
          </button>
        </div>

        {/* 어댑터 연동 배지 */}
        {(adapterStatuses.openclaw || adapterStatuses.hermes) && (
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "6px 12px",
              borderBottom: "1px solid #313244",
              flexShrink: 0,
            }}
          >
            {(["openclaw", "hermes"] as const).map((t) => {
              const info = adapterStatuses[t];
              if (!info) return null;
              return (
                <AdapterMicroBadge key={t} target={t} status={info.status} />
              );
            })}
          </div>
        )}

        {/* 검색 입력 */}
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid #313244",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="위키 검색..."
              style={{
                flex: 1,
                padding: "7px 10px",
                background: "#1e1e2e",
                border: "1px solid #45475a",
                borderRadius: 6,
                color: "#cdd6f4",
                fontSize: 13,
                outline: "none",
              }}
              data-testid="knowledge-search-input"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              style={{
                padding: "7px 12px",
                background: isSearching ? "#313244" : "#89b4fa",
                border: "none",
                borderRadius: 6,
                color: "#1e1e2e",
                fontWeight: 600,
                fontSize: 13,
                cursor: isSearching ? "not-allowed" : "pointer",
              }}
              data-testid="knowledge-search-button"
            >
              {isSearching ? "⏳" : "검색"}
            </button>
          </div>
        </div>

        {/* 검색 히스토리 + 결과 목록 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {history.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#6c7086",
                fontSize: 12,
                padding: 24,
              }}
            >
              검색어를 입력하세요
            </div>
          ) : (
            history.map((entry) => (
              <SearchHistoryItem
                key={entry.timestamp}
                entry={entry}
                onOpenDoc={handleOpenDoc}
              />
            ))
          )}
        </div>
      </aside>

      {/* 문서 뷰어 */}
      {viewerDoc && (
        <MarkdownViewer doc={viewerDoc} onClose={handleCloseViewer} />
      )}

      <style>{`
        @keyframes omx-kp-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

// ─── 서브 컴포넌트: 검색 히스토리 아이템 ─────────────────────────────────────

const SearchHistoryItem: React.FC<{
  entry: SearchEntry;
  onOpenDoc: (title: string) => void;
}> = ({ entry, onOpenDoc }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        borderBottom: "1px solid #313244",
        paddingBottom: 8,
        marginBottom: 4,
      }}
    >
      {/* 검색어 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "6px 12px",
          background: "none",
          border: "none",
          color: "#89b4fa",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
        }}
        data-testid="history-query"
      >
        <span style={{ color: "#6c7086" }}>{expanded ? "▼" : "▶"}</span>
        🔍 {entry.query}
        <span style={{ marginLeft: "auto", color: "#6c7086", fontWeight: 400 }}>
          ({entry.hits.length})
        </span>
      </button>

      {/* 결과 목록 */}
      {expanded && entry.hits.length > 0 && (
        <div style={{ paddingLeft: 20 }}>
          {entry.hits.map((hit, i) => (
            <div
              key={i}
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                borderRadius: 4,
                marginBottom: 2,
              }}
              onClick={() => onOpenDoc(hit.title)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onOpenDoc(hit.title);
              }}
              data-testid="wiki-result-item"
            >
              <div
                style={{
                  color: "#cba6f7",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                📄 {hit.title}
              </div>
              {hit.excerpt && (
                <div
                  style={{
                    color: "#a6adc8",
                    fontSize: 11,
                    lineHeight: 1.4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {hit.excerpt}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && entry.hits.length === 0 && (
        <div
          style={{
            padding: "4px 20px",
            color: "#6c7086",
            fontSize: 12,
          }}
        >
          결과 없음
        </div>
      )}
    </div>
  );
};

// ─── 서브 컴포넌트: 어댑터 미니 배지 ─────────────────────────────────────────

const AdapterMicroBadge: React.FC<{
  target: "openclaw" | "hermes";
  status: AdapterInfo["status"];
}> = ({ target, status }) => {
  const statusColor: Record<AdapterInfo["status"], string> = {
    running: "#a6e3a1",
    degraded: "#f9e2af",
    installed: "#89b4fa",
    unavailable: "#6c7086",
  };
  const icon =
    status === "running"
      ? "🟢"
      : status === "degraded"
      ? "🟡"
      : status === "installed"
      ? "🔵"
      : "⚫";
  const label = target === "openclaw" ? "OpenClaw" : "Hermes";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        background: "#1e1e2e",
        border: `1px solid ${statusColor[status]}`,
        color: statusColor[status],
      }}
      title={`${label}: ${status}`}
    >
      {icon} {label}
    </span>
  );
};

export default KnowledgePanel;
