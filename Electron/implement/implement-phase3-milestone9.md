# Phase 3 Milestone 9 구현 내역

> 생성 일시: 2026-06-26  
> 담당 이슈: EL-231 ~ EL-239 (9종)  
> 마일스톤: Phase 3 / Milestone 9 — PI 컨설팅 PL & AA 특화 페르소나 통합 (SP-33)

---

## 1. 개요

Phase 3 Milestone 9는 **PI(Process Innovation) 컨설팅을 수행하는 프로젝트 리더(PL) 겸 어플리케이션 아키텍트(AA)** 역할에 최적화된 에이전트 지식 체계를 구축하고 데스크톱 앱에 연동한다.

페르소나 본체(Prompt) → 업무 파이프라인(Mission) → 실행 방법론(Skill) → 표준 산출물(Templates) → 데스크톱 UI(Renderer)의 5계층을 일관된 식별자 추적 체계로 연결한다.

**페르소나 정의**
- 역할: PI 컨설턴트 / 프로젝트 리더(PL) / 어플리케이션 아키텍트(AA)
- 전문: BPR, As-Is/To-Be 갭 분석, MSA 리팩토링, 클라우드 네이티브, 데이터/API 모델링, WBS·리스크 관리

---

## 2. 구현 파일 목록

| 파일 경로 | 이슈 | 역할 |
|---|---|---|
| `prompts/pi-architect.md` | EL-231 | PI PL/AA 시스템 페르소나 정의 (역할 프롬프트) |
| `missions/pi-consulting/mission.md` | EL-232 | As-Is→To-Be 업무 파이프라인 (Phase 0~5) |
| `skills/pi-architecture/SKILL.md` | EL-233 | 아키텍처 분석/설계 스킬 + 7개 서브스킬 |
| `templates/pi-consulting/ADR-Template.md` | EL-234 | 아키텍처 결정 기록 서식 |
| `templates/pi-consulting/Gap-Analysis-Report.md` | EL-234 | As-Is↔To-Be 갭 분석 보고서 |
| `templates/pi-consulting/API-Spec-Standard.md` | EL-234 | 엔터프라이즈 통합 API 명세 표준 |
| `templates/pi-consulting/WBS-Template.md` | EL-234 | 마일스톤/태스크/리스크/공수 관리표 |
| `Electron/src/renderer/components/PersonaSwitcher.tsx` | EL-235 | 헤더 페르소나 토글 드롭다운 |
| `Electron/src/renderer/components/TemplateQuickMenu.tsx` | EL-235 | 입력창 산출물 템플릿 퀵메뉴 |
| `Electron/src/renderer/App.tsx` | EL-235 | 페르소나 상태/헤더 통합 + 스트림 연결 |
| `Electron/src/renderer/components/ChatContainer.tsx` | EL-235 | 툴바에 퀵메뉴 배치 + 프롬프트 주입 |
| `Electron/src/preload.ts` | EL-235 | `persona` IPC 페이로드 타입 추가 |
| `Electron/src/main/ipc/stream-bridge-ipc.ts` | EL-235 | `persona` → exec 역할 지시 주입 |
| `Electron/src/renderer/styles.css` | EL-235 | 페르소나/퀵메뉴 스타일 |
| `templates/pi-consulting/AsIs-L6-Analysis-Design.md` | EL-236 | As-Is Level 6 분석/설계 산출물 |
| `templates/pi-consulting/AsIs-Application-Architecture.md` | EL-237 | As-Is 어플리케이션 아키텍처 정의서 |
| `templates/pi-consulting/AsIs-Screen-Report-List.md` | EL-237 | As-Is 화면/보고서 목록 |
| `templates/pi-consulting/AsIs-Program-List.md` | EL-237 | As-Is 프로그램 목록 |
| `templates/pi-consulting/AsIs-Table-Spec.md` | EL-237 | As-Is 테이블 명세(목록) |
| `templates/pi-consulting/AsIs-Table-Detail-Spec.md` | EL-237 | As-Is 테이블 상세 명세 |
| `templates/pi-consulting/AsIs-Index-Detail-Spec.md` | EL-237 | As-Is 인덱스 상세 명세 |
| `templates/pi-consulting/AsIs-Interface-List.md` | EL-237 | As-Is 인터페이스 목록 |
| `templates/pi-consulting/AsIs-Reverse-Engineering-Analysis.md` | EL-238 | 역공학(ChangeMiner) 분석 |
| `templates/pi-consulting/Effort-Estimation.md` | EL-239 | 공수산정(난이도·본수·M/M) |

---

## 3. EL-231: 역할 프롬프트 (`prompts/pi-architect.md`)

기존 `prompts/{role}.md` 컨벤션을 준수한다. (초기 설계의 `pi-architect.prompt.md`는 컨벤션 불일치로 `.md`로 정정.)

### 3.1 구조
| 섹션 | 내용 |
|---|---|
| frontmatter | `description`, `argument-hint` |
| `<identity>` | PI 컨설턴트/PL/AA — 비즈니스↔기술 번역가 |
| `<constraints>` | `<scope_guard>`(표준 산출물·ID 정합·근거 기반), `<ask_gate>`(결과 우선·로컬 오버라이드) |
| `<execution_loop>` | 미션 시퀀스 6단계 + `<success_criteria>` + `<verification_loop>` |
| `<tools>` | Glob/Grep/Read 병렬, 역공학 결과 활용 |
| `<style>/<output_contract>` | 요약/As-Is 현황/Root Cause/To-Be/리스크·Trade-off/공수 |

### 3.2 핵심 지시
- 비즈니스 목표(ROI/KPI) 기반 아키텍처 제안
- As-Is 병목·비효율 진단 → To-Be(MSA/Cloud) 전환 로드맵
- PL로서 요구사항 구체화·WBS·리스크 사전 식별

---

## 4. EL-232: 미션 (`missions/pi-consulting/mission.md`)

기존 `missions/{name}/mission.md` 컨벤션 준수. As-Is→To-Be 6단계 파이프라인.

| Phase | 단계 | 산출물 | 게이트 |
|---|---|---|---|
| 0 | As-Is L6 Baseline | `AsIs-L6-Analysis-Design.md` | 업무그룹(A~D)별 L6 시나리오 + 데이터 사전 |
| 1 | Discovery | 아키텍처/화면/프로그램 목록 | 화면→프로그램 ID 추적 연결 |
| 2 | Data & Reverse Eng | 테이블/인덱스/인터페이스/역공학 | 테이블→상세→인덱스, CRUD 정합 |
| 3 | To-Be Design & Decision | ADR / Gap 분석 | 대안·근거·결과 명시 |
| 4 | Integration | API 명세 | As-Is 인터페이스 매핑 |
| 5 | Planning | 공수산정 / WBS | 본수×보정계수→M/M 재현 가능 |

**Success 기준:** 산출물 ID 상호 추적 / 판단 출처 명시 / To-Be 매핑(유지·개선·폐기)·리스크 / M/M 재현성.

---

## 5. EL-233: 스킬 (`skills/pi-architecture/SKILL.md`)

`name`/`description` frontmatter + `<Purpose>`/`<Use_When>`/`<Do_Not_Use_When>`/`<Execution_Policy>`/`<Steps>` 구조.

### 7개 서브스킬
| 서브스킬 | 목적 | 산출물 |
|---|---|---|
| `analyze-asis` | 화면/프로그램/테이블/인터페이스 현황 분석 | `AsIs-*.md`, L6 |
| `reverse-engineer` | 호출 트리·의존·CRUD·Lineage·영향도 | 역공학 분석 |
| `analyze-gap` | As-Is↔To-Be Gap 분석 | Gap 보고서 |
| `generate-adr` | ADR 생성·유효성 검사 | ADR |
| `draw-architecture` | Mermaid 구성도/시퀀스/도메인 | 아키텍처 정의서 |
| `plan-wbs` | 마일스톤/태스크 WBS | WBS |
| `estimate-effort` | 호출관계·난이도·M/M | 공수산정 |

---

## 6. EL-234: 표준 템플릿 4종 (`templates/pi-consulting/`)

| 템플릿 | 주요 섹션 | 추적 연결 |
|---|---|---|
| `ADR-Template.md` | 배경/결정/대안 매트릭스/근거/결과/To-Be 매핑 | PGM-·TBL-·IF- |
| `Gap-Analysis-Report.md` | Gap 매트릭스(기술/업무)/전환 전략·리스크/로드맵 | GAP-ID ↔ As-Is 식별자 |
| `API-Spec-Standard.md` | 엔드포인트/요청/응답/에러/비기능/As-Is 추적 | API-NNN ↔ IF- |
| `WBS-Template.md` | 마일스톤/WBS 상세/리스크/공수 요약 | Effort-Estimation 연동 |

---

## 7. EL-235: 데스크톱 UI 통합 (Electron Renderer)

### 7.1 컴포넌트

**PersonaSwitcher.tsx** — 헤더 페르소나 토글
- `PERSONA_LIST`: `default`(기본 봇) / `pi-architect`(PI Consultant) / `code-reviewer` / `architect`
- `prompts/{id}.md`와 매핑되는 역할 ID 선택
- 외부 클릭 시 닫힘, 선택 항목 체크 표시

**TemplateQuickMenu.tsx** — 입력창 툴바 산출물 퀵메뉴
- `TEMPLATE_LIST`: ADR / Gap 분석 / WBS / As-Is L6 / 공수산정
- 선택 시 해당 템플릿 작성 프롬프트를 입력창(`setInputText`)에 주입

### 7.2 통합 지점
| 파일 | 변경 |
|---|---|
| `App.tsx` | `selectedPersona` 상태, 헤더에 `<PersonaSwitcher>`, `handleSendMessage`에 `persona` 전달 |
| `ChatContainer.tsx` | 툴바(`chat-toolbar-left`)에 `<TemplateQuickMenu onSelectTemplate={setInputText}>` |
| `styles.css` | `.persona-switcher-*`, `.template-quick-*` 추가 |

### 7.3 IPC 페르소나 연결 (Renderer → Main)
```
App.handleSendMessage
  → startAgentStream({ ..., persona: selectedPersona !== "default" ? id : undefined })
  → preload.startAgentStream payload 타입에 persona?: string
  → omx:agent-stream:start 핸들러 → startAgentStream(..., persona)
  → command === "exec" 분기:
       persona && args[0] 존재 시 메시지 프리픽스 주입:
       "prompts/{persona}.md 의 역할 페르소나로서 응답해줘.\n\n{원본 메시지}"
```
- `persona`가 `default`(undefined)이면 기존 동작과 동일 — 하위 호환 보장.
- echo/echo-reverse/gemini 경로에는 영향 없음 (exec 경로 한정).

---

## 8. EL-236~239: As-Is 표준 산출물 세트

TO-BE 설계의 기준선(Baseline). 각 산출물은 ID 체계로 상호 추적된다.

| 이슈 | 산출물 | 핵심 ID | 샘플 데이터 |
|---|---|---|---|
| EL-236 | L6 분석/설계 | BR-/IF-/엔터티 | 업무규칙·CRUD·I/F·TO-BE 매핑 |
| EL-237 | 어플리케이션 아키텍처 | 계층/노드 | 계층 구성도(Mermaid)·Cobol→Java 절차형 이슈 |
| EL-237 | 화면/보고서 목록 | SCR-/RPT- | PNGFTGL_0001 계약상세조회 |
| EL-237 | 프로그램 목록 | PGM-/BAT- | LgtmCthtnBc, CustomerController |
| EL-237 | 테이블 명세 | TBL- | TCTTOT 계약 + Mermaid ERD |
| EL-237 | 테이블 상세 명세 | TBL-+컬럼 | INST_SU_NO VARCHAR2(30) |
| EL-237 | 인덱스 상세 명세 | IDX- | TCTTOT_IDX PK |
| EL-237 | 인터페이스 목록 | IF- | NIES, 금융결제원 CMS |
| EL-238 | 역공학 분석 | Layer/Depth | CallTree(Depth6)·CRUD Matrix·Data Lineage·영향도 |
| EL-239 | 공수산정 | 화면/서비스 | 호출관계·난이도·개발공수 F/W/M·M |

### 산출물 간 추적 체계
```
어플리케이션 아키텍처
   └─ 화면/보고서 목록 (SCR-/RPT-)
        └─ 프로그램 목록 (PGM-/BAT-)
             ├─ 테이블 명세 (TBL-) → 테이블 상세 → 인덱스 상세 (IDX-)
             └─ 인터페이스 목록 (IF-)
   └─ 역공학 분석 (Layer/Depth) ─ 전 산출물 교차 참조
   └─ 공수산정 ─ 화면·프로그램 목록 기반
```

---

## 9. 검증 결과

| 항목 | 결과 |
|---|---|
| 신규/수정 파일 정적 진단 (`get_errors`) | 에러 없음 |
| `prompts/pi-architect.md` | 컨벤션 일치 (`{role}.md`) |
| `missions/pi-consulting/mission.md` | 컨벤션 일치 (`{name}/mission.md`) |
| `skills/pi-architecture/SKILL.md` | 컨벤션 일치 (`{name}/SKILL.md`) |
| Renderer TS 컴포넌트 4종 | 타입 에러 없음 |
| IPC persona 연결 | preload·main 양단 타입 정합 |

---

## 10. 설계 문서 동기화

- `Electron/design/desktop/electron-phase3-milestone9.md` — EL-231~239 전체 `[x]` 완료 처리, 미션/프롬프트 경로 정정.
- `Electron/design/desktop/Electron-Desktop-architecture.md` — Action Items EL-231~239 완료 갱신.

---

## 11. ADR 준수 사항

- **ADR-001 (비동기 spawn)**: persona 주입은 exec 인자 가공만 수행, 기존 `executeCommand` spawn 경로 유지 — 동기 호출 미도입.
- **하위 호환**: `persona === "default"` 시 `undefined` 전달로 기존 스트림 동작 보존.
- **경로 범위 가드**: persona 주입은 `command === "exec"` 분기에 한정, echo/gemini 미영향.
- **컨벤션 정합**: prompt/mission/skill 모두 기존 디렉터리 네이밍 규칙 준수.

---

## 12. 최종 티켓 현황

| 티켓 | 산출물 | 상태 |
|---|---|---|
| EL-231 | `prompts/pi-architect.md` | ✅ |
| EL-232 | `missions/pi-consulting/mission.md` | ✅ |
| EL-233 | `skills/pi-architecture/SKILL.md` | ✅ |
| EL-234 | 표준 템플릿 4종 | ✅ |
| EL-235 | UI 통합 (Persona/Template + IPC) | ✅ |
| EL-236 | As-Is L6 분석/설계 | ✅ |
| EL-237 | As-Is 표준 산출물 7종 | ✅ |
| EL-238 | 역공학 분석 | ✅ |
| EL-239 | 공수산정 | ✅ |

**Milestone 9 — 9/9 티켓 완료.**
