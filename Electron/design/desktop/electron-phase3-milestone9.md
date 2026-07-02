# Phase 3 - Milestone 9: PI 컨설팅 PL & AA 특화 페르소나 통합 (SP-33)

## 1. 개요
**목표:** PI(Process Innovation) 컨설팅 사업을 수행하는 프로젝트 리더(PL)이자 어플리케이션 아키텍트(AA) 역할에 최적화된 에이전트 지식 체계(Skill, Mission, Prompt, Template)를 구축하고 데스크톱 앱에 연동한다. 사용자가 제공한 컨설팅 도메인 지식(PDF 등)을 바탕으로 현업의 니즈를 시스템으로 전환하는 작업을 전담한다.

**페르소나 정의:**
- **역할:** PI 컨설턴트, 프로젝트 리더(PL), 어플리케이션 아키텍트(AA)
- **전문 분야:** BPR(비즈니스 프로세스 재설계), AS-IS/TO-BE 갭 분석, 마이크로서비스 리팩토링, 클라우드 네이티브 아키텍처, 데이터/API 모델링 설계, 프로젝트 WBS 및 리스크 관리.

---

## 2. 설계 상세 (Design Details)

### 2.1 PROMPTS (시스템 페르소나 정의)
*위치:* `prompts/pi-architect.md` (기존 `prompts/{role}.md` 컴벤션 준수)
- **성격:** 비즈니스 언어와 기술 언어를 매끄럽게 넘나들며 번역/통합하는 소통 전문가.
- **주요 지시사항 (Instructions):**
  - 명확한 비즈니스 목표 및 기대효과(ROI, KPI)에 기반하여 아키텍처 설계를 제안할 것.
  - AS-IS 시스템의 병목과 비효율을 진단하고, TO-BE (Modern화, MSA, Cloud) 아키텍처 전환 로드맵을 작성할 것.
  - 프로젝트 리더로서 요구사항 구체화, 일정(WBS), 위험(Risk) 요소를 사전에 식별하고 경고할 것.

### 2.2 MISSIONS (업무 파이프라인 시퀀스)
*위치:* `missions/pi-consulting/mission.md` (기존 `missions/{name}/mission.md` 컴벤션 준수)
- **Phase 0 (As-Is L6 Baseline):** 업무규칙/CRUD/인터페이스 관점의 Level 6 기준 분석 및 설계 산출물 생성.
- **Phase 1 (Discovery):** AS-IS 비즈니스 프로파일링 및 Pain-point 식별.
- **Phase 2 (Design):** TO-BE 프로세스(BPR) 정리 및 목표 시스템 아키텍처 초안 작성.
- **Phase 3 (Decision):** 아키텍처 결정 기록(ADR) 작성 및 기술 스택 선정.
- **Phase 4 (Integration):** 어플리케이션 마이그레이션 전략 및 인터페이스(API) 통합 설계.
- **Phase 5 (Planning):** 프로젝트 단위 WBS 세립화 및 개발/인프라 팀 이관 파일 생성.

### 2.3 SKILLS (실행 도구 및 방법론)
*위치:* `skills/pi-architecture/SKILL.md`
- **핵심 스킬:**
  - `generate-adr`: 아키텍처 결정 기록 생성 가이드 및 유효성 검사.
  - `analyze-gap`: AS-IS 와 TO-BE 간의 Technical/Business Gap 분석 자동화.
  - `draw-architecture`: Mermaid.js 기반의 시스템 아키텍처 구성도, 시퀀스, 도메인 모델 생성.
  - `plan-wbs`: 마일스톤 및 태스크 기반의 WBS 구조화 포맷팅.

### 2.4 TEMPLATES (표준 산출물 포맷)
*위치:* `templates/pi-consulting/` 하위 마크다운
- `ADR-Template.md`: 아키텍처 결정 이력/배경/대안 관리 템플릿.
- `Gap-Analysis-Report.md`: AS-IS 대비 TO-BE 갭 분석 보고서.
- `API-Spec-Standard.md`: 엔터프라이즈 통합 API 명세 서식.
- `WBS-Template.md`: 프로젝트 마일스톤 관리 및 태스크 분류표.
- `AsIs-L6-Analysis-Design.md`: As-Is Level 6(구현/데이터) 기준 분석 및 설계 산출물 템플릿.
- `AsIs-Application-Architecture.md`: As-Is 어플리케이션 아키텍처(논리/물리/계층) 정의서.
- `AsIs-Screen-Report-List.md`: As-Is 화면/보고서 목록.
- `AsIs-Program-List.md`: As-Is 프로그램 목록(온라인/배치/공통/I-F).
- `AsIs-Table-Spec.md`: As-Is 테이블 명세(목록).
- `AsIs-Table-Detail-Spec.md`: As-Is 테이블 상세 명세(컬럼/제약).
- `AsIs-Index-Detail-Spec.md`: As-Is 인덱스 상세 명세.
- `AsIs-Interface-List.md`: As-Is 인터페이스 목록.
- `AsIs-Reverse-Engineering-Analysis.md`: 역공학(ChangeMiner) 기반 프로그램 호출·의존·CRUD·데이터계보·영향도 분석.
- `Effort-Estimation.md`: 공수산정(화면-서비스 호출관계, 난이도, 개발공수 F/W, M/M·마일스톤).

### 2.5 AS-IS Level 6 산출물 설계 원칙
*목적:* 현행 시스템의 구현/데이터 레벨을 누락 없이 정리하여 TO-BE 설계의 기준선(Baseline)으로 사용한다.

- **분석 단위:** 업무그룹별 핵심 메뉴, 화면, 배치, 인터페이스
- **산출 필드:** 처리순서, 업무규칙, CRUD 매트릭스, I/F 입출력, 예외/통제 규칙
- **정합 기준:** 기능명/엔터티명/인터페이스명은 이후 TO-BE 문서와 1:1 매핑 가능해야 함
- **완료 조건:** 업무그룹(A~D)별 최소 1개 이상 L6 상세 시나리오 및 데이터 사전 포함

### 2.6 AS-IS 표준 산출물 세트 (필수 7종 + L6)
TO-BE 설계 및 갭 분석을 위한 As-Is 기준선은 다음 산출물로 구성된다. 각 산출물은 ID 체계를 통해 상호 추적 가능해야 한다.

| 분류 | 산출물 | 핵심 ID 체계 | 추적 연결 |
|---|---|---|---|
| 아키텍처 | 어플리케이션 아키텍처 정의서 | 계층/노드 | 프로그램·인터페이스 |
| 기능 | 화면/보고서 목록 | SCR-/RPT- | 프로그램 ID |
| 기능 | 프로그램 목록 | PGM-/BAT- | 화면·테이블·I/F |
| 데이터 | 테이블 명세(목록) | TBL- | 프로그램·테이블 상세 |
| 데이터 | 테이블 상세 명세 | TBL- + 컬럼 | 인덱스 명세 |
| 데이터 | 인덱스 상세 명세 | IDX- | 테이블 상세 |
| 연계 | 인터페이스 목록 | IF- | 프로그램 ID |
| 구조 | 역공학 분석(호출/의존/CRUD/계보/영향도) | Layer/Depth | 전 산출물 |
| 산정 | 공수산정(난이도·본수·M/M) | 화면/서비스 | 화면·프로그램 목록 |
| 상세 | L6 분석/설계 산출물 | BR-/IF-/엔터티 | 전 산출물 |

---

## 3. 데스크톱 앱 연동 (UI Integration)
UX 관점에서 Electron 컨테이너 UI를 통해 이 페르소나에 쉽게 접근할 수 있어야 한다.

- **페르소나 스위처:** Electron 데스크톱 앱 상단(Header)에 페르소나 토글 드롭다운 스위치 추가 (기본 봇 / PI Consultant / Code Reviewer 등).
- **템플릿 빠른 작성 숏컷:** 채팅 입력창(Chat Input) 하단에 "빠른 산출물 템플릿(ADR, Gap 분석, WBS) 가져오기" 액션 버튼 배치.

---

## 4. Action Items (티켓 분류)
해당 작업을 위해 Milestone 9 내에서 다음 9개의 신규 티켓을 할당한다.

- [x] **EL-231:** `prompts/pi-architect.md` 작성 및 앱 로더 연결 (기존 prompts 컴벤션 준수)
- [x] **EL-232:** `missions/pi-consulting/mission.md` 워크플로우 정의 (Phase 0~5)
- [x] **EL-233:** `skills/pi-architecture/SKILL.md` 스킬명세 등록
- [x] **EL-234:** `templates/pi-consulting/` 하위 표준 템플릿 4종 작성 — ADR-Template.md, Gap-Analysis-Report.md, API-Spec-Standard.md, WBS-Template.md
- [x] **EL-235:** UI 페르소나 선택기 및 템플릿 퀵메뉴 UI 구현 (Electron Renderer 업데이트) — `PersonaSwitcher.tsx`, `TemplateQuickMenu.tsx`, App/ChatContainer 통합 + persona IPC 연결
- [x] **EL-236:** AS-IS Level 6 분석/설계 산출물 신규 작성 (`templates/pi-consulting/AsIs-L6-Analysis-Design.md`) 및 미션 체인 연동
- [x] **EL-237:** AS-IS 표준 산출물 7종 템플릿 작성 — 어플리케이션 아키텍처, 화면/보고서 목록, 프로그램 목록, 테이블 명세, 테이블 상세 명세, 인덱스 상세 명세, 인터페이스 목록 (`templates/pi-consulting/AsIs-*.md`) 및 산출물 간 ID 추적 체계 연동
- [x] **EL-238:** 역공학 분석 산출물 작성 (`templates/pi-consulting/AsIs-Reverse-Engineering-Analysis.md`) — 프로그램 목록/CallTree(Depth6)/의존관계/CRUD/Data Lineage/영향도
- [x] **EL-239:** 공수산정 산출물 작성 (`templates/pi-consulting/Effort-Estimation.md`) — 화면-서비스 호출관계/난이도/개발공수 F/W/M·M 마일스톤