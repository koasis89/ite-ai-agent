/**
 * ModelSelector — Copilot 스타일 모델 선택 드롭업
 *
 * 입력창 하단 툴바에 위치하며 클릭 시 모델 목록이 위쪽으로 팝업된다.
 * test 그룹(echo, echo-reverse)과 standard 그룹으로 구분해 렌더링한다.
 */

import React, { useEffect, useRef, useState } from "react";

// ─── 모델 정의 ────────────────────────────────────────────────────────────────

export interface ModelDef {
  id: string;
  label: string;
  badge?: string;
  badgeAccent?: boolean;
  group: "test" | "standard" | "gemini";
}

export const MODEL_LIST: ModelDef[] = [
  // ── 테스트 모델 (로컬 처리, 네트워크 불필요) ──
  { id: "echo",         label: "Echo",         badge: "테스트",  badgeAccent: true, group: "test" },
  { id: "echo-reverse", label: "Echo Reverse",  badge: "테스트",  badgeAccent: true, group: "test" },
  // ── OpenAI / Anthropic 모델 ──
  { id: "gpt-4o",             label: "GPT-4o",             badge: "1x",    group: "standard" },
  { id: "gpt-4o-mini",        label: "GPT-4o mini",        badge: "0.1x",  group: "standard" },
  { id: "o3",                 label: "o3",                 badge: "8x",    group: "standard" },
  { id: "o4-mini",            label: "o4-mini",            badge: "0.5x",  group: "standard" },
  { id: "claude-sonnet-4-5",  label: "Claude Sonnet 4.5",  badge: "1x",    group: "standard" },
  // ── Google Gemini 모델 ──
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   badge: "Google", group: "gemini" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash",  badge: "Google", group: "gemini" },
  { id: "gemini-1.5-pro",   label: "Gemini 1.5 Pro",   badge: "Google", group: "gemini" },
];

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  /** Gemini API 키 설정 여부 — false이면 Gemini 항목을 비활성화 표시 */
  geminiKeyAvailable?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, geminiKeyAvailable = false }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = MODEL_LIST.find((m) => m.id === value) ?? MODEL_LIST[0];

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const testModels = MODEL_LIST.filter((m) => m.group === "test");
  const standardModels = MODEL_LIST.filter((m) => m.group === "standard");
  const geminiModels = MODEL_LIST.filter((m) => m.group === "gemini");

  return (
    <div ref={containerRef} className="model-selector-root">
      {/* ── 트리거 버튼 ── */}
      <button
        className={`model-selector-btn${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg className="model-selector-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
        </svg>
        <span className="model-selector-label">{current.label}</span>
        {current.badge && (
          <span className={`model-selector-badge${current.badgeAccent ? " accent" : ""}`}>
            {current.badge}
          </span>
        )}
        <svg
          className={`model-selector-chevron${open ? " up" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── 드롭업 팝업 ── */}
      {open && (
        <div className="model-dropdown" role="listbox">
          <div className="model-dropdown-header">모델 선택</div>

          {/* 테스트 그룹 */}
          <div className="model-group-label">테스트</div>
          {testModels.map((m) => (
            <ModelItem key={m.id} model={m} selected={m.id === value} onSelect={handleSelect} />
          ))}

          {/* 구분선 */}
          <div className="model-group-divider" />

          {/* 실제 모델 그룹 */}
          <div className="model-group-label">모델</div>
          {standardModels.map((m) => (
            <ModelItem key={m.id} model={m} selected={m.id === value} onSelect={handleSelect} />
          ))}

          {/* 구분선 */}
          <div className="model-group-divider" />

          {/* Google Gemini 그룹 */}
          <div className="model-group-label">Google Gemini</div>
          {geminiModels.map((m) => (
            <ModelItem
              key={m.id}
              model={m}
              selected={m.id === value}
              onSelect={handleSelect}
              disabled={!geminiKeyAvailable}
              disabledTooltip="Gemini API 키 미설정 — 클릭하여 키 등록"
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 모델 아이템 ──────────────────────────────────────────────────────────────

const ModelItem: React.FC<{
  model: ModelDef;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
  disabledTooltip?: string;
}> = ({ model, selected, onSelect, disabled = false, disabledTooltip }) => (
  <button
    className={`model-dropdown-item${selected ? " selected" : ""}${disabled ? " disabled" : ""}`}
    role="option"
    aria-selected={selected}
    aria-disabled={disabled}
    onClick={() => onSelect(model.id)}
    type="button"
    title={disabled ? disabledTooltip : undefined}
    style={disabled ? { opacity: 0.45, cursor: "pointer" } : undefined}
  >
    <span className="model-item-check">{selected ? "✓" : ""}</span>
    <span className="model-item-label">{model.label}</span>
    {model.badge && (
      <span className={`model-item-badge${model.badgeAccent ? " accent" : ""}`}>{model.badge}</span>
    )}
  </button>
);

export default ModelSelector;
