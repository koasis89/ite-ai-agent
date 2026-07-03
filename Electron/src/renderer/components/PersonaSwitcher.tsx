/**
 * EL-235: 페르소나 선택기 (PersonaSwitcher)
 *
 * 앱 상단 헤더에 위치하는 페르소나 토글 드롭다운.
 * 기본 봇 / PI Consultant / Code Reviewer 등 역할 프롬프트(prompts/{role}.md)를
 * 전환해 에이전트 시스템 페르소나를 선택한다.
 */

import React, { useEffect, useRef, useState } from "react";

// ─── 페르소나 정의 ────────────────────────────────────────────────────────────

export interface PersonaDef {
  /** prompts/{id}.md 와 매핑되는 역할 ID (default는 프롬프트 미적용) */
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export const PERSONA_LIST: PersonaDef[] = [
  { id: "default", label: "기본 봇", emoji: "🤖", description: "범용 어시스턴트" },
  { id: "pi-architect", label: "PI Consultant", emoji: "🏛️", description: "PI 컨설팅 PL & 어플리케이션 아키텍트" },
  { id: "insurance-si-proposal-writer", label: "제안서 작성", emoji: "🧾", description: "보험/공제 SI 제안서 작성" },
  { id: "code-reviewer", label: "Code Reviewer", emoji: "📋", description: "코드 리뷰 전문가" },
  { id: "architect", label: "Architect", emoji: "🧭", description: "시스템 설계/진단 (읽기 전용)" },
];

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

interface PersonaSwitcherProps {
  value: string;
  onChange: (personaId: string) => void;
}

export const PersonaSwitcher: React.FC<PersonaSwitcherProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = PERSONA_LIST.find((p) => p.id === value) ?? PERSONA_LIST[0];

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

  return (
    <div ref={containerRef} className="persona-switcher-root">
      <button
        className={`persona-switcher-btn${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.description}
      >
        <span className="persona-switcher-emoji">{current.emoji}</span>
        <span className="persona-switcher-label">{current.label}</span>
        <span className="persona-switcher-caret">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <ul className="persona-switcher-menu" role="listbox">
          {PERSONA_LIST.map((p) => (
            <li key={p.id} role="option" aria-selected={p.id === value}>
              <button
                type="button"
                className={`persona-switcher-item${p.id === value ? " selected" : ""}`}
                onClick={() => handleSelect(p.id)}
              >
                <span className="persona-switcher-emoji">{p.emoji}</span>
                <span className="persona-switcher-item-text">
                  <span className="persona-switcher-item-label">{p.label}</span>
                  <span className="persona-switcher-item-desc">{p.description}</span>
                </span>
                {p.id === value && <span className="persona-switcher-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PersonaSwitcher;
