# Phase 3 Milestone 7 구현 티켓: 마크다운 프로젝트 위키(Wiki) 및 외부 어댑터 검색 고도화

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)  
**UI 와이어프레임:** [electron-UI-example.md](./electron-UI-example.md) — 섹션 1 (EL-221: 위키 검색 오버레이)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 3의 첫 번째 마일스톤인 "마크다운 프로젝트 위키(Wiki) 및 외부 어댑터 검색 고도화" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

이 단계에서는 에이전트가 단순한 코드 탐색을 넘어, 프로젝트 고유의 지식 자산(Wiki)을 우선적으로 참고하게 하고 외부 에이전트 시스템(OpenClaw, Hermes 등)과의 연동 상태를 투명하게 노출하는 고도화 작업을 수행한다.

## 🎯 Phase 3 Milestone 7 범위
- **프로젝트 위키 연동**: `omx wiki list/read` 기반 무상태 조회 래퍼 + 스트림 `tool_call` 감지 오버레이.
- **외부 어댑터 적응면 확보**: OpenClaw, Hermes 등 외부 시스템 상태 조회 (`status`, `probe`, `envelope`) 및 Enum 스키마 검증.
- **지식 기반 UI 고도화**: 벡터 임베딩 없는 마크다운 우선 검색 원칙(No-Vector) 준수 시각화.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-221 | EL-221 | `.omx_wiki` 기반 영속적 지식 계층 검색 래퍼 및 오버레이 연동 |
| US-222 | EL-222 | 외부 에이전트 시스템(OpenClaw, Hermes) 어댑터 상태 브릿지 및 프로브 구현 |
| US-223 | EL-223 | 위키 검색 컨텍스트 및 어댑터 상태 정보 UI 통합 시각화 |

---

### Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기
- **스프린트**: SP-31 : Phase 3 - 특수 기능 통합 및 고도화 안정화 (Hardening & Specialized Features)
- **유저스토리 매핑**: US-221~US-223 = EL-221~EL-223 (Phase 3 시작 순번)

---

## 🎫 EL-221. .omx_wiki 기반 영속적 지식 계층 검색 래퍼 및 오버레이 연동

- **우선순위**: P1
- **실행 순서**: 18번째 (Phase 3 시작)
- **전제 티켓**: Phase 2의 Ndjson 스트림 파서 (EL-213)
- **그룹**: Feature (Knowledge Base)
- **목표**: 에이전트가 프로젝트 위키를 검색할 때, 클로드 데스크탑의 도구 사용 애니메이션과 유사한 시각적 피드백을 제공한다.
- **대상 경로**:
  - `src/main/cli/wiki-wrapper.ts` (신규)
  - `src/renderer/components/WikiOverlay.tsx` (신규)
- **핵심 구현 로직 (UI 특화)**:
  1. **도구 호출(Tool Call) 인라인 프로그레스**: Ndjson 스트림에서 위키 관련 도구 호출(`wiki query`, `wiki read`)이 감지되면, 채팅창 하단에 진행 중인 도구 아이콘(예: 돋보기 🔍)과 함께 "프로젝트 지식베이스 검색 중..." 이라는 텍스트를 인라인 애니메이션(Pulsing)으로 렌더링.
  2. **결과물 프리뷰 팝오버**: 사용자가 직접 위키를 조회할 경우, 팝업 창이 아닌 우측 사이드바나 깔끔한 모달(Modal) 뷰어로 마크다운 원본을 렌더링하여 대화의 맥락이 끊기지 않도록 지원.
  3. **No-Vector 가드**: 위키 래퍼 내부에 외부 임베딩 API나 벡터 DB 로직을 포함하지 않고, 오직 OMX CLI가 반환하는 정적 마크다운 결과만 무상태(Stateless)로 화면에 투영.
- **DoD (완료 기준)**:
  - 사용자가 위키 목록/문서를 UI에서 즉시 열람 가능함.
  - 에이전트가 위키 도구를 호출하는 동안 전용 애니메이션 프로그레스 배지가 노출됨.
- **체크리스트**:
  - [x] 도구 호출 이벤트 수신 시 인라인 진행 상태(Pulsing) 배지 컴포넌트 구현
  - [x] 위키 조회 결과용 마크다운 렌더러 모달/사이드바 컴포넌트 적용
  - [x] 위키 검색 완료 시 진행 상태 배지를 체크마크(✅)로 전환하는 트랜지션 적용
  - [x] `wiki-wrapper.test.ts` 에서 `query` 및 `read` 모킹 데이터 파싱 검증 완료

---

## 🎫 EL-222. 외부 에이전트 시스템(OpenClaw, Hermes) 어댑터 상태 브릿지 및 프로브 구현

- **우선순위**: P2
- **실행 순서**: 19번째
- **전제 티켓**: EL-202 (비차단 CLI 실행기)
- **그룹**: Interop (External Systems)
- **목표**: 프로젝트 외부의 에이전트 에코시스템(OpenClaw, Hermes 등)의 가동 상태와 비대칭적 능력 보고(Capability Reporting)를 Electron UI로 안전하게 가져온다.
- **대상 경로**:
  - `src/main/cli/adapter-probe.ts` (신규)
  - `src/main/ipc/adapter-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **상태(Status) Enum 파서 (추가)**: `omx adapt <target> status` 실행 결과를 파싱할 때, 계약에 명시된 4대 상태값(`unavailable | installed | degraded | running`)을 검증하는 Zod 스키마 가드를 적용하여 UI의 상태 표시를 결정.
  2. **봉투(Envelope) 및 프로브(Probe) 조회 (추가)**: 상태가 `running`일 경우, `omx adapt <target> envelope` 및 `probe` 명령을 추가 연쇄 호출하여, 외부 게이트웨이 증거와 수명 주기 브릿지 지침(생태계 연동 메타데이터)을 추출.
  3. **안전 격리 경계**: `.omx/state/...` 디렉터리를 침범하지 않고 오직 `.omx/adapters/<target>/...` 기반의 읽기(Read-only) 결과만 UI 환경설정 패널로 브로드캐스트.
- **DoD (완료 기준)**:
  - 외부 시스템 미설치/열화/가동 상태가 Enum 기준으로 정확히 식별됨.
  - 연동 성공 시 envelope 메타데이터 및 capability 정보가 UI에 표시됨.
- **체크리스트**:
  - [x] OpenClaw 및 Hermes 대상 `status`, `probe`, `envelope` 명령 래퍼 구현
  - [x] **[상태 정합성 게이트]** `unavailable/installed/degraded/running` Zod 스키마 파서 구현 완료
  - [x] 비대칭 능력 보고(Capability Report)를 UI 설정 패널에 표시하는 IPC 채널 개방
  - [x] `adapter-probe.test.ts` (Hermes `degraded` 상태 및 `envelope` 메타데이터 모킹 파싱 성공)

---

## 🎫 EL-223. 위키 검색 컨텍스트 및 어댑터 상태 정보 UI 통합 시각화

- **우선순위**: P2
- **실행 순서**: 3번째
- **전제 티켓**: EL-219 (오버레이 UI), EL-221, EL-222
- **그룹**: UI/UX (Information Architecture)
- **목표**: 에이전트가 검색한 위키 결과물과 외부 어댑터의 연동 상태를 사용자에게 직관적으로 보여주는 UI 컴포넌트를 구현한다.
- **작업 내용**:
  - '지식 탐색(Knowledge Explorer)' 사이드패널 추가 - 위키 검색 결과 및 참조 중인 문서 표시.
  - 하단 상태 표시줄(Status Bar) 또는 설정창에 OpenClaw/Hermes 연동 아이콘 및 상태 툴팁 추가.
  - 위키 문서 링크 클릭 시 앱 내 마크다운 뷰어로 팝업 노출.
- **DoD (완료 기준)**:
  - 에이전트가 위키를 읽었을 때 사용자가 '어느 문서'를 참고했는지 인지 가능.
  - 외부 시스템과의 연결 상태를 UI에서 실시간으로 확인 가능.
- **체크리스트**:
  - [x] 마크다운 지식 뷰어(Pop-up/Slide-in) 컴포넌트 구현
  - [x] 외부 어댑터 연결 상태 인디케이터 UI 구현
  - [x] 위키 검색 히스토리 및 결과 리스트 UI 구현
  - [x] `EL-223.test.ts` (위키 결과 데이터 전달 시 UI 렌더링 확인)
