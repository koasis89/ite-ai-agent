---
name: pi-architecture
description: PI 컨설팅 어플리케이션 아키텍처 분석/설계 스킬 — As-Is 진단, 갭 분석, 아키텍처 다이어그램, ADR, WBS/공수 산정
---

<Purpose>
PI(Process Innovation) 컨설팅에서 어플리케이션 아키텍트(AA)/프로젝트 리더(PL)가 수행하는
As-Is 현황 진단 → To-Be 설계 → 전환 계획 활동을 표준 산출물과 함께 실행하는 스킬이다.
근거 기반 분석(코드/데이터/인터페이스)과 산출물 간 ID 추적을 핵심으로 한다.
</Purpose>

<Use_When>
- "As-Is 분석", "현행 시스템 진단", "레거시 아키텍처 분석"
- "To-Be 설계", "MSA 전환", "클라우드 네이티브 아키텍처"
- "갭 분석", "ADR 작성", "아키텍처 다이어그램"
- "WBS", "개발공수 산정", "마이그레이션 전략"
- "역공학", "호출 관계", "CRUD 매트릭스", "영향도 분석"
</Use_When>

<Do_Not_Use_When>
- 단일 버그 수정/소규모 코드 변경 — executor로 바로 처리
- 산출물 추적이 필요 없는 단순 질의응답 — 직접 답변
</Do_Not_Use_When>

<Why_This_Exists>
PI 컨설팅은 산출물 표준과 추적성이 품질을 좌우한다. 비표준·비추적 분석은 To-Be 설계의 기준선을
무너뜨려 재작업과 갭을 유발한다. 이 스킬은 표준 템플릿·ID 체계·근거 검증을 강제해 안정적인 기준선을 만든다.
</Why_This_Exists>

<Execution_Policy>
- 미션 시퀀스(`missions/pi-consulting/mission.md`)를 따른다: L6 Baseline → Discovery → Data/역공학 → To-Be/ADR → Integration → Planning.
- **각 서브스킬을 실행하기 전에 반드시 `templates/pi-consulting/`의 해당 템플릿 `.md` 파일을 먼저 읽어 문서 구조·열 정의·ID 체계를 파악한 뒤, 그 형식을 그대로 따라 산출물을 작성한다.** (아래 `<Sub_Skills>` 표의 "템플릿" 열 참조)
- 근거 없는 단정 금지. 코드/테이블/인터페이스 출처를 명시한다.
- 식별자(SCR-/RPT-/PGM-/BAT-/TBL-/IDX-/IF-, 엔터티/Op명)는 산출물 간 1:1 추적 가능하게 유지한다.
- 페르소나는 `prompts/pi-architect.md`를 사용한다.
</Execution_Policy>

<Templates>
서브스킬은 `templates/pi-consulting/` 폴더의 파일을 다음 규칙으로 사용한다.
- `*.md` — **형식 참조용 원본 템플릿**. 서브스킬 실행 전 이 파일을 읽어 섹션 구성·표 헤더·ID 체계를 확인하고 동일한 형식으로 산출물을 채운다.
- `*_표준양식.xlsx` / `*_표준양식.docx` — **내보내기(export) 대상 표준 양식**. 채운 내용을 Office 문서로 저장할 때 이 양식에 바인딩한다.
- `manifest/*_표준양식.json` — xlsx 내보내기 시 시트/열 매핑 정의(있는 경우).
</Templates>

<Sub_Skills>

각 서브스킬은 실행 전 "템플릿(참조)" 열의 `.md` 파일을 읽어 형식을 파악한 뒤 산출물을 작성한다.
모든 경로는 `templates/pi-consulting/` 기준이다.

| 서브스킬 | 목적 | 템플릿(참조, 실행 전 읽기) | 산출물 |
|---|---|---|---|
| `analyze-asis` | 화면/프로그램/테이블/인터페이스 현황 분석 | `AsIs-L6-Analysis-Design.md`, `AsIs-Application-Architecture.md`, `AsIs-Screen-Report-List.md`, `AsIs-Program-List.md`, `AsIs-Table-Spec.md`, `AsIs-Table-Detail-Spec.md`, `AsIs-Index-Detail-Spec.md`, `AsIs-Interface-List.md` | 동일 이름 `AsIs-*.md` |
| `reverse-engineer` | 호출 트리·의존·CRUD·Data Lineage·영향도 분석 | `AsIs-Reverse-Engineering-Analysis.md` | `AsIs-Reverse-Engineering-Analysis.md` |
| `analyze-gap` | As-Is↔To-Be Technical/Business Gap 분석 | `Gap-Analysis-Report.md` | `Gap-Analysis-Report.md` |
| `generate-adr` | 아키텍처 결정 기록 생성 및 유효성 검사 | `ADR-Template.md` | `ADR-Template.md` |
| `draw-architecture` | Mermaid 기반 구성도/시퀀스/도메인 모델 | `AsIs-Application-Architecture.md` | 아키텍처 정의서 내 다이어그램 |
| `plan-wbs` | 마일스톤/태스크 기반 WBS 구조화 | `WBS-Template.md` | `WBS-Template.md` |
| `estimate-effort` | 화면-서비스 호출관계·난이도·M/M 산정 | `Effort-Estimation.md` | `Effort-Estimation.md` |
| `export-api-spec` | 대내외 인터페이스(API) 명세 표준화 | `API-Spec-Standard.md` | `API-Spec-Standard.md` |

</Sub_Skills>

<Steps>

### 0. 템플릿 로드 (모든 서브스킬 공통 선행)
실행할 서브스킬의 `<Sub_Skills>` "템플릿(참조)" 열에 지정된 `templates/pi-consulting/*.md` 파일을 읽어
섹션 구성·표 헤더·ID 체계를 확인한다. 이 형식을 그대로 재현하여 산출물을 작성한다.

### 1. 범위 확정
대상 업무영역/시스템을 식별하고 분석 단위(메뉴/화면/배치/인터페이스)를 고정한다.

### 2. As-Is 기준선 생성 (analyze-asis)
화면/보고서 목록 → 프로그램 목록 → 테이블 명세/상세/인덱스 → 인터페이스 목록을 작성한다.
각 산출물은 ID로 상호 연결한다.

### 3. 역공학 (reverse-engineer)
프로그램 호출 트리(Depth), 의존관계, CRUD 매트릭스, Data Lineage, 영향도를 산출한다.
호출통계는 이후 공수/영향도 산정의 근거로 보존한다.

### 4. 갭 분석 & ADR (analyze-gap / generate-adr)
As-Is 대비 To-Be의 Technical/Business Gap을 도출하고, 핵심 결정을 ADR로 기록한다(대안·근거·결과 포함).

### 5. 아키텍처 설계 (draw-architecture)
계층 구성도, 외부 연계, 시퀀스, 도메인 모델을 Mermaid로 표현한다.

### 6. 계획 (plan-wbs / estimate-effort)
WBS를 세립화하고 본수×보정계수→M/M로 개발공수를 산정한다. 분석~이행 마일스톤을 명시한다.

### 7. 검증
산출물 간 ID 정합성(화면→프로그램→테이블→인덱스→인터페이스)을 교차 검증하고 누락을 보고한다.

</Steps>

<Output>
- 표준 템플릿이 채워진 산출물(.md)
- 산출물 간 추적표(ID 매핑)
- To-Be 매핑(유지/개선/폐기)과 전환 리스크
- WBS + M/M 산정 근거
</Output>
