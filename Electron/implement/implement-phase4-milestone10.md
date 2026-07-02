# Phase 4 - Milestone 10 구현 결과

## 1. 작업 범위
- SP-34: AI 답변 산출물 오피스(Excel/Word) 저장 및 템플릿 바인딩 자동화
- 대상 티켓: EL-241 ~ EL-248

## 2. 구현 완료 항목

### EL-241
- Main Process IPC 채널 `omx:export-document` 등록
- preload 브리지에 비동기 export 메서드 노출

### EL-242
- Zero-dependency 마크다운 AST 파서 구현
- GFM 테이블 기반 JSON normalizer 구현
- 컬럼 alias 매칭 및 타입 캐스팅(number/boolean/string) 구현

### EL-243
- `exceljs` 기반 표준양식 바인더 구현
- 템플릿 스타일(font/fill/border/alignment/numFormat) 복제
- 가변 행 삽입 + 데이터 주입 파이프라인 구현
- 부동소수점 컬럼 idx 입력 방어(`Math.floor`) 처리

### EL-244
- `docxtemplater` + `pizzip` 기반 Word 템플릿 바인더 구현
- placeholder 렌더링 및 바이너리 저장 구현

### EL-245
- ADR/API 문서용 템플릿 데이터 추출기 구현
- 섹션/테이블/코드블록 기반 구조화 매핑 구현

### EL-246
- `ChatContainer` 버블 액션에 `ExportActions` UI 적용
- 복사 버튼 + 문맥형 Excel/Word 저장 버튼 제공
- 템플릿 후보 자동 선택(예: WBS, 공수, GAP, ADR, API)

### EL-247
- 템플릿 매니페스트 스키마 선언(`templates/pi-consulting/manifest/*.json`)
- 로컬 매니페스트 부재 시 기본 사전으로 폴백 가드레일 구현

### EL-248
- 통합 E2E 테스트 스위트 작성
- Markdown -> Normalizer -> Binder -> 파일 생성 검증
- 폴백 시나리오(불완전 입력) 검증

## 3. 장애 이슈 및 조치

### 증상
- Word 저장 버튼 클릭 시 Electron Main Process 예외 발생
- 에러: `Error: EPIPE: broken pipe, write`
- 스택: `docxtemplater.setData`의 deprecated warning 경로에서 발생

### 원인
- `docxtemplater` deprecated API(`setData`) 호출 시 내부 warning 로그 출력 경로가 깨진 stdout/stderr 파이프와 충돌

### 조치
- 파일: `Electron/src/main/services/word-template-binder.ts`
- 변경 내용:
  - `doc.setData(data); doc.render();` 제거
  - `doc.render(data);`로 교체
  - 렌더링 실패 시 콘솔 로깅을 제거하고 예외 메시지만 상위로 전파

### 후속 증상 (2026-07-02)
- Word 저장은 성공하지만 템플릿 내 치환 필드가 공백으로 출력됨

### 후속 원인
- 템플릿 플레이스홀더 키(camelCase/snake_case/kebab-case)와 렌더 데이터 키가 다를 때 값 주입 실패
- 문서 구조 파싱이 약한 답변의 경우, 핵심 섹션 필드가 빈 문자열로 남아 공백 치환 발생

### 후속 조치
- 파일: `Electron/src/main/services/word-template-binder.ts`
- 변경 내용:
  - 렌더 직전 컨텍스트 키 별칭 자동 확장 로직 추가
  - 객체/배열 내부까지 재귀 별칭 확장(camelCase/snake_case/kebab-case/lowercase)
  - `doc.render(renderData)`에 확장 컨텍스트 적용
- 파일: `Electron/src/main/ipc/export-ipc.ts`
- 변경 내용:
  - Word 내보내기 시 `rawContent/content/answer/response/body` 원문 폴백 필드 동시 주입
  - 템플릿 키 미스매치나 파싱 누락 상황에서도 최소 본문 치환 보장

## 4. 검증 결과
- 실행 명령:
  - `npx vitest run Electron/src/test/EL-244.test.ts Electron/src/test/EL-248.test.ts`
- 결과:
  - Test Files: 2 passed
  - Tests: 6 passed
  - Word 저장 크래시 재발 없음
  - Word 템플릿 공백 치환 이슈 대응 로직 반영

## 5. 산출물
- Main IPC/Service 코드
- Renderer ExportActions UI
- 템플릿 매니페스트 JSON 3종
- 테스트 코드(EL-242, EL-243, EL-244, EL-248)
- 본 구현 결과 문서
