# Phase 2 Milestone 4 구현 티켓: CLI 출력 통합 및 Ndjson 토큰 스트리밍 파이프라인 구축

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)  
**UI 와이어프레임:** [electron-UI-example.md](./electron-UI-example.md) — 섹션 1 (EL-213: 기본 채팅 및 도구 실행 뷰)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 2의 시작인 "CLI 출력 통합 및 Ndjson 토큰 스트리밍 파이프라인 구축" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

기존의 단발성 응답(Unary JSON)을 넘어, 에이전트의 사고 과정과 글자 토큰을 실시간으로 화면에 밀어주는 클로드 AI 스타일의 유기적인 스트리밍 UX를 완성하는 것을 목표로 한다.

## 🎯 Phase 2 Milestone 4 범위
- **Legacy 제어 구조 타파**: `ask`, `sparkshell` 등 레거시 커맨드의 `spawnSync`를 비동기 `spawn`으로 전면 교체.
- **스트리밍 플래그 도입**: CLI 내부적으로 `--stream-json` 플래그를 처리하여 `CommandEventEmitter`의 이벤트를 Ndjson으로 직렬화.
- **사고/결과 분리 스트리밍**: 사고 과정(Thinking) 토큰과 결과(Content) 토큰을 분리 브로드캐스트하여 클로드 스타일 UX 연속성 보장.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-211 | EL-211 | Legacy AI 커맨드 리팩토링 (`spawnSync` -> `spawn` 전환) |
| US-212 | EL-212 | CLI `--stream-json` 플래그 구현 및 Ndjson 엔벨롭 직렬화 |
| US-213 | EL-213 | Main Process측 Ndjson 스트림 파서 및 사고 과정(Thinking) 분리 브로드캐스팅 |

---

### Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기
- **스프린트**: SP-24 : Phase 2 - 스트리밍 오케스트레이션 
- **유저스토리 매핑**: US-211~US-213 = EL-211~EL-213 (Phase 2 시작 순번)

---

## 🎫 EL-211. Legacy AI 커맨드 리팩토링 (spawnSync -> spawn 전환)

- **우선순위**: P0
- **실행 순서**: 9번째
- **전제 티켓**: Phase 1의 모든 브로커 인프라 완료
- **그룹**: Logic (CLI Optimization)
- **목표**: `ask`, `sparkshell` 등 레거시 AI 대화 커맨드에 하드코딩되어 있던 `spawnSync` 블로킹 구조와 `stdio: 'inherit'`를 전면 제거하고, 스트림 제어가 가능한 비동기 `spawn` 파이프라인으로 전환한다.
- **대상 경로**:
  - `src/cli/ask.ts` (리팩토링)
  - `src/cli/sparkshell.ts` (리팩토링)
- **핵심 구현 로직 (보완됨)**:
  1. **비동기화 가드**: 메인 프로세스의 루프를 차단(Blocking)하는 모든 동기식 프로세스 제어를 철폐하고 `spawn` 스트림 구조로 통일.
  2. **추론 수준 및 계약 플래그 보존 (추가)**: 사용자가 UI에서 선택한 추론 강도에 따라 CLI 진입점 호출 시 `src/team/model-contract.ts` 수렴에 부합하도록 `--high`, `--xhigh` 플래그를 누락 없이 argv 인자에 탑재.
  3. **무상태(Stateless) 기동**: 세션 생명주기 관리 객체를 생성하되 런타임 메모리 정합성은 오직 파일 상태 원본을 유지하도록 설계 규칙 준수.
- **DoD (완료 기준)**:
  - 기존 AI 커맨드 호출 시 UI 스레드 차단 없이 백그라운드에서 실행됨.
  - 프로세스 생명주기 관리가 비동기적으로 수행됨.
- **체크리스트**:
  - [x] AI 대화형 핵심 진입점 커맨드의 `spawnSync`를 `spawn` 스트림 기반으로 전환 완료
  - [x] `resolveAgentReasoningEffort` 수렴 가이드라인 플래그 연동 확인
  - [x] 하위 자식 프로세스의 비정상 중단 상황에 대응하는 `close` 시그널 핸들러 장착
  - [x] `EL-211.test.ts` 에서 비동기 프로세스 기동 및 시그널 전파 유효성 테스트 완료

---

## 🎫 EL-212. CLI --stream-json 플래그 구현 및 Ndjson 엔벨롭 직렬화

- **우선순위**: P0
- **실행 순서**: 10번째
- **전제 티켓**: EL-211
- **그룹**: Core (Data Serializer)
- **목표**: CLI에 `--stream-json` 플래그를 추가하고, 내부 가동 시 `CommandEventEmitter`의 실시간 진행률, 도구 실행 이벤트를 표준 출력 규격에 부합하는 줄바꿈 구분 JSON(Ndjson)으로 실시간 직렬화 분출한다.
- **대상 경로**:
  - `src/cli/constants.ts` (플래그 등록)
  - `src/core/execute-command.ts` (이벤트 래핑 확장)
- **핵심 구현 로직 (보완됨)**:
  1. **이벤트 인터셉터**: `command.progress`를 통해 분출되는 코어 이벤트를 가로채 정식 스키마 봉투 규격에 동적 인덱싱.
  2. **오염 방지용 가드라인 (추가)**: 서브 툴체인의 로우(Raw) 로그 텍스트가 섞여 출력을 오염시키지 않도록, 정식 Ndjson 라인만 `process.stdout.write` 채널로 방출하는 직렬화 가드 적용.
  3. **양방향 인터류드 신호 주입**: `askuserQuestion` 등 사용자 인터랙션 필요 국면 도달 시 `type: "interlude"` 봉투를 방출하고 프로세스를 비종료 홀딩 상태(`stdin` 대기 모드)로 바인딩.
- **DoD (완료 기준)**:
  - CLI를 직접 실행하여 `--stream-json` 플래그 사용 시, 실시간으로 JSON 객체들이 한 줄씩 분출됨을 확인.
- **체크리스트**:
  - [x] CLI 커맨드라인 파서 옵션 목록에 `--stream-json` 글로벌 등록 완료
  - [x] **[파이프라인 안전 게이트]** 비JSON 텍스트 오염 유출을 원천 배제하는 직렬화 가드 필터 장착
  - [x] `agent_init`, `token`, `tool_call`, `interlude` 표준 봉투 스펙 100% 준수 확인
  - [x] `EL-212.test.ts` 단위 테스트 구동 시 표준 출력(stdout) 청크 라인이 유효한 JSON 스키마로 파싱 성공

---

## 🎫 EL-213. Main Process측 Ndjson 스트림 파서 및 사고 과정(Thinking) 분리 브로드캐스팅

- **우선순위**: P0
- **실행 순서**: 11번째
- **전제 티켓**: EL-212, Phase 1의 로그 테일러 안전 인프라
- **그룹**: Infra (Data Pipeline)
- **목표**: Electron Main Process가 수신한 자식 프로세스의 Ndjson 스트림을 실시간 파싱하고, 클로드 AI 스타일 화면 시각화를 위해 에이전트의 사고 과정(Thinking)과 결과 텍스트를 정밀 분기하여 Renderer로 브로드캐스트한다.
- **대상 경로**:
  - `src/main/cli/stream-parser.ts` (신규)
  - `src/main/ipc/stream-bridge-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **실시간 스트림 디코딩**: Node.js 내장 `readline` 모듈 인터페이스를 `child.stdout`에 장착해 고속 Ndjson 수집 레이어 기동.
  2. **클로드 스타일 사고 과정 분기 파싱 (추가)**: LLM의 추론 토큰(Thinking Process)과 최종 답변 텍스트 토큰을 메타데이터 식별자(`subType: "reasoning" | "content"`)로 분기 처리하여 독립된 IPC 채널(`omx:stream-thinking`, `omx:stream-token`)로 각각 전송함으로써 UI 단에서 별도 컨테이너 오버레이 박스로 렌더링할 수 있도록 기틀 마련.
  3. **방어적 예외 처리 (추가 Tip 반영)**: `try-catch` 가드를 장착하여 파싱에 실패한 예외 문자열 라인은 크래시 처리하지 않고 UI 세션의 하단 원시 로그 콘솔 뷰로 안전하게 우회(Fallback Flow) 시킴.
- **DoD (완료 기준)**:
  - 에이전트가 답변을 생성하는 동안 Renderer에 사고 과정과 콘텐츠 토큰이 분리되어 실시간 반영됨.
  - JSON/비JSON 혼합 로그에서도 파이프라인 크래시 없이 유효 토큰만 선별 처리됨.
- **체크리스트**:
  - [x] `readline` 파이프라인 기반의 비차단 라인 파서 구현 완료
  - [x] **[UX 특화 게이트]** 에이전트의 사고 토큰과 콘텐츠 토큰을 정밀 인덱싱하는 분기 모듈 구현 완료
  - [x] 비양식 로그 라인 인입 시 다운타임 없이 콘솔 뷰로 우회시키는 안전 우회 필터 장착
  - [x] Renderer 연동용 IPC 채널 전역 바인딩 및 `stream-parser.test.ts` 통합 검증 완료
