# Phase 4 - Milestone 10: AI 답변 산출물 오피스(Excel/Word) 저장 및 템플릿 바인딩 자동화 설계 (SP-34)

## 1. 개요
**목표:** OMX 데스크톱 애플리케이션에서 출력된 비정형 AI 답변서(텍스트, 표, 구조화 정보)를 엔터프라이즈 업무 환경에 즉각 활용 가능한 오피스 파일 형식(Excel `.xlsx`, Word `.docx`)으로 내보내는 엔진을 구축하고, 사전 정의된 표준 템플릿 자산과 동적으로 데이터 바인딩하는 문맥형 생성 자동화 아키텍처를 설계한다.

**핵심 요구 사항:**
- **As-Is 데이터 내보내기:** AI 대화 데이터 내부의 마크다운 표, 리스트 데이터를 파싱하여 로컬 데스크톱 오피스 파일 형태로 저장.
- **To-Be 템플릿 연동:** 미리 정의된 엑셀 및 워드 양식 파일(`templates/pi-consulting/`)의 원본 서식과 스타일을 훼손하지 않은 채 동동적으로 데이터(플레이스홀더)를 주입·대체하여 최종 문서를 조합해내는 'Template-first' 바인딩 흐름 구축.

---

## 2. 설계 상세 (Design Details)

### 2.1 내보내기 및 템플릿 도킹 기술 스택 선정

#### A. Excel (.xlsx) 파일 처리 엔진
스타일이 없는 단순 로우 데이터 테이블 내보내기는 기존 번들 라이브러리인 **`xlsx` (SheetJS)**를 사용하여 공수를 절감하되, PI 컨설팅용 복잡한 서식(보더, 테두리, 배경색, 컬럼 너비 정합성) 및 템플릿 오버라이트 구현을 위해 **`exceljs`**를 도입한다.

#### B. Word (.docx) 파일 처리 엔진
바닥부터 텍스트 문단을 코드로 조립해 나가는 Code-first 구조의 동적 생성을 위해서는 **`docx`** 라이브러리를 활용하고, `{title}`, `{#rows}`와 같은 전치 플레이스홀더가 삽입된 표준 템플릿 파일과의 바인딩을 위해서는 **`docxtemplater` + `pizzip`** 조합을 표준 세트로 적용한다. (워드 양식 보존 및 수정을 위한 사실상의 솔루션 표준)

---

### 2.2 아키텍처 파이프라인 (Markdown/JSON ➔ Office Binary)

```mermaid
flowchart TD
    Renderer[1. React UI: 내보내기 액션 클릭]
    -->|IPC: omx:export-document | Main[2. Electron Main Process]
    
    subgraph MainEngine["Main Process Export Engine"]
        Main -->|Markdown AST 파싱| Parser[3. Remark Parser]
        Parser -->|Table Node 추출| ExcelEngine[4. ExcelJS / SheetJS]
        Parser -->|Text / Heading Nodes| DocxEngine[5. Docxtemplater]
        
        ExcelEngine -->|템플릿 로드 & 오버라이트| ExcelWrite[xlsx 바이너리 조립]
        DocxEngine -->|양식 압축해제 & 플레이스홀더 치환| DocxWrite[docx 바이너리 조립]
    end
    
    ExcelWrite -->|Save Dialog 실행| Dialog[6. dialog.showSaveDialog]
    DocxWrite --> --> Dialog
    Dialog -->|Node fs.writeFile| Save[7. 로컬 파일 저장 완료]
```

---

### 2.3 데이터 바인딩 및 매핑 상세 명세

#### A. 엑셀 템플릿 매핑 스키마 (exceljs 기반)
템플릿 파일 내부의 수식이나 보더 서식이 깨지지 않도록 절대 셀 주소 지정을 원칙으로 삼거나, 가변 확장 열 영역에 대해서는 행(Row) 삽입 및 스타일 복사 흐름을 명세화한다. 각 템플릿별 시작 행과 칼럼은 전용 매핑 매니페스트(`templates/pi-consulting/manifest/*.json`)로 선언하여 비결정적인 매핑 버그를 방지한다.

```json
{
  "template": "WBS-Template_표준양식.xlsx",
  "sheets": [
    {
      "name": "WBS상세",
      "headerRow": 7,
      "dataStartRow": 8,
      "columns": [
        {"idx": 1, "field": "wbsId", "type": "string"},
        {"idx": 2, "field": "depth1", "type": "string"},
        {"idx": 3, "field": "task", "type": "string"},
        {"idx": 4, "field": "owner", "type": "string"},
        {"idx": 7, "field": "effort", "type": "number"}
      ]
    }
  ]
}
```

#### B. 워드 템플릿 지문 치환 (docxtemplater 기반)
양식 디자이너가 사전에 플레이스홀더 마크업 처리를 수행해둔 `ADR-Template_표준양식.docx`를 기반으로 데이터 바인딩을 기동한다.

```markdown
{adrId}: {title}
작성자: {author} | 작성일: {createdDate}

{#options}
- 대안 {optionId}: {name} ({description})
{/options}
```

---

## 3. 데스크톱 앱 연동 (UI Integration)

사용자 편의 및 정합성 높고 이펙티브한 문서 생성을 유도하기 위해 Electron 프론트엔드 UI를 고도화한다.

- **산출물 내보내기 퀵 액션 (Export Actions):**
  AI의 답변 중 테이블이나 템플릿 충족 형태가 발견되면, 대화 말풍선(Message Bubble) 우측 하단 복사 단추 옆에 **`[📥 엑셀 내보내기]`**, **`[📥 워드 내보내기]`**와 같은 전용 파일 다운로드 플로팅 액션 버튼을 상황에 맞게 렌더링한다.
- **템플릿-에이전트 긴밀 루프 연동:**
  사용자가 툴바 퀵메뉴를 통해 템플릿 작성을 지시하고, AI 답변이 완료되면 해당 양식 형식을 AI 답변 구조에서 역방향 매핑해 직접 템플릿에 충진하여 저장받을 수 있도록 엔드투엔드 세션 흐름을 통합한다.
- **저장 위치 브리지:**
  Main Process가 Electron의 `dialog.showSaveDialog`를 호출하여 사용자 OS 네이티브 경로 선택기를 띄우고, 저장 경로가 확정되면 Node.js 파일 시스템(`fs`) 단에서 최종 쓰기 처리를 수행함으로써 보안 샌드박스를 준수한다.

---

## 4. Action Items (티켓 분류)
해당 작업을 위해 Milestone 10 내에서 다음 8개의 신규 티켓을 할당한다.

- [x] **EL-241:** Electron Main Process 내 `export-ipc.ts` 등록 및 [Electron/src/preload.ts](Electron/src/preload.ts) 비동기 내보내기 바인딩 메소드 노출
- [x] **EL-242:** 마크다운 AST 파싱 기반 JSON normalizer 설계 및 컬럼 매칭 파이프라인 개발
- [x] **EL-243:** `exceljs` 의존성 도입 및 `templates/pi-consulting/` 하위 표준 엑셀 양식 데이터 오버라이트 저장 유틸리티 완성
- [x] **EL-244:** `docxtemplater` 및 `pizzip` 의존성 도입 및 워드 템플릿 바인딩 엔진 패키징
- [x] **EL-245:** `ADR-Template_표준양식.docx` 및 `API-Spec-Standard_표준양식.docx` 문서 내 변수 플레이스홀더 인가 설계 
- [ ] **EL-246:** ChatContainer 내 각 마크다운 답변 버블 내부의 엑셀/워드 저장 드롭다운 퀵 액션 UI 설계
- [ ] **EL-247:** 템플릿 전용 매핑 매니페스트 스키마(`manifest/`) 선언 및 에이전트 연쇄 실패(Fallback) 가드레일 구현
- [ ] **EL-248:** 파일 내보내기 동작 및 템플릿 변환 정확도 통합 E2E 테스트 스위트 설계 및 릴레이 게이트 검증
