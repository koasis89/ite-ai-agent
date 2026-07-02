/**
 * EL-235: 산출물 템플릿 퀵메뉴 (TemplateQuickMenu)
 *
 * 채팅 입력창 하단 툴바에 위치하는 "빠른 산출물 템플릿 가져오기" 액션.
 * 클릭 시 PI 컨설팅 표준 산출물(ADR / Gap 분석 / WBS / As-Is 등) 작성 프롬프트를
 * 입력창에 주입한다.
 */

import React, { useEffect, useRef, useState } from "react";

// ─── 템플릿 정의 ──────────────────────────────────────────────────────────────

export interface TemplateDef {
  id: string;
  label: string;
  /** 입력창에 주입될 작성 지시 프롬프트 */
  prompt: string;
}

export const TEMPLATE_LIST: TemplateDef[] = [
  {
    id: "adr",
    label: "ADR (아키텍처 결정)",
    prompt: "templates/pi-consulting/ADR-Template.md 형식에 맞춰 아키텍처 결정 기록(ADR)을 작성해줘. 결정/배경/대안/근거/결과를 포함할 것.",
  },
  {
    id: "gap",
    label: "Gap 분석",
    prompt: "templates/pi-consulting/Gap-Analysis-Report.md 형식에 맞춰 As-Is 대비 To-Be 갭 분석 보고서를 작성해줘.",
  },
  {
    id: "wbs",
    label: "WBS",
    prompt: "templates/pi-consulting/WBS-Template.md 형식에 맞춰 프로젝트 WBS(마일스톤/태스크/일정)를 작성해줘.",
  },
  {
    id: "asis-l6",
    label: "As-Is L6 분석/설계",
    prompt: "templates/pi-consulting/AsIs-L6-Analysis-Design.md 형식에 맞춰 As-Is Level 6(업무규칙/CRUD/인터페이스) 분석·설계 산출물을 작성해줘.",
  },
  {
    id: "effort",
    label: "공수 산정",
    prompt: "templates/pi-consulting/Effort-Estimation.md 형식에 맞춰 화면-서비스 호출관계, 난이도, 개발공수(M/M) 산정 산출물을 작성해줘.",
  },
];

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

interface TemplateQuickMenuProps {
  /** 선택한 템플릿 프롬프트를 입력창에 주입 */
  onSelectTemplate: (prompt: string) => void;
}

export const TemplateQuickMenu: React.FC<TemplateQuickMenuProps> = ({ onSelectTemplate }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (prompt: string) => {
    onSelectTemplate(prompt);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="template-quick-root">
      <button
        type="button"
        className={`template-quick-btn${open ? " open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="빠른 산출물 템플릿 가져오기"
      >
        📄 템플릿
      </button>

      {open && (
        <ul className="template-quick-menu" role="menu">
          {TEMPLATE_LIST.map((t) => (
            <li key={t.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="template-quick-item"
                onClick={() => handleSelect(t.prompt)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TemplateQuickMenu;
