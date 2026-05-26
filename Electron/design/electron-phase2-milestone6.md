# Phase 2 Milestone 6 구현 티켓: 정식 수명주기 결과 기반 오버레이 시각화

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 2의 세 번째 마일스톤인 "정식 수명주기 결과 기반 오버레이 시각화" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

에이전트의 상태를 앱 내부에 중복 저장하지 않고, CLI 실행 결과로 갱신되는 `.omx/state/` 내부 파일을 '진실의 경계(Truth Boundary)'로 삼아 화면에 실시간으로 투영하는 것을 목표로 한다.

## 🎯 Phase 2 Milestone 6 범위
- **진실의 경계(Truth Boundary) 동기화**: `.omx/state/` 디렉터리 내 핵심 상태 파일 정밀 감시 및 디바운스 연동.
- **수명주기 상태 파싱**: `finished`, `blocked`, `failed`, `userinterlude` 및 다중 상태 오버랩 해석.
- **오버레이 시각화**: 초기 Rehydration + 실시간 이벤트 구독 기반 대시보드/타임라인 렌더링.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-217 | EL-217 | `.omx/state/` 파일 워처 및 진실의 경계(Truth Boundary) 모듈 구현 |
| US-218 | EL-218 | 런타임 수명주기(Lifecycle) 상태 파서 및 다중 상태 병합 |
| US-219 | EL-219 | 무상태(Stateless) 대시보드 및 오버레이 컴포넌트 연동 |

---

### Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기
- **스프린트**: SP-26 : Phase 2 - 상태 시각화 및 오버레이 
- **유저스토리 매핑**: US-217~US-219 = EL-217~EL-219 

---

## 🎫 EL-217. .omx/state/ 파일 워처 및 진실의 경계(Truth Boundary) 모듈 구현

- **우선순위**: P0
- **실행 순서**: 15번째 (Phase 2 후반부 UI 동기화)
- **전제 티켓**: Phase 1 환경 진단 인프라 완료
- **그룹**: Infra (State Sync)
- **목표**: 에이전트 수명주기의 절대적 원본인 `.omx/state/` 디렉터리 내의 상태 파일들을 실시간 감시하고, 앱 내부 메모리에 중복된 상태를 캐싱하지 않고 파일의 스냅샷만을 읽어오는 모듈을 구축한다.
- **대상 경로**:
  - `src/main/state/state-watcher.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **정밀 타겟팅**: `chokidar`를 이용하여 `.omx/state/team-state.json`, 모드별 `*-state.json`, 그리고 `skill-active-state.json` 파일로 감시 범위를 좁힘.
  2. **디바운스(Debounce) 안전장치 (추가)**: OS의 파일 I/O 이벤트 버스트에 의한 중복 읽기를 방지하기 위해 파일 변경 이벤트 발생 시 **100~200ms 단위의 디바운스 큐를 적용**하여 안정적으로 단일 스냅샷만 읽도록 제어.
  3. **초기 스냅샷 반환기 (추가)**: UI가 처음 로드될 때 감시 이벤트를 기다리지 않고 현재 파일 상태를 즉시 읽어 반환하는 `getCurrentState()` 인터페이스 제공.
- **DoD (완료 기준)**:
  - 외부(CLI 등)에서 `.omx/state/` 파일을 수정했을 때 Electron Main Process가 이를 즉각 감지함.
  - 파일 레이스 컨디션을 방지하는 순차 읽기 및 디바운스 로직이 적용됨.
- **체크리스트**:
  - [ ] `chokidar` 기반 상태 파일 전용 워처 구현
  - [ ] **[성능 게이트]** I/O 중복 트리거 방지용 Debounce 로직 적용
  - [ ] 타겟 파일 파싱 및 순수 JSON 객체 반환 모듈 작성
  - [ ] `state-watcher.test.ts` 에서 모의 파일 수정 시 정확히 1회의 이벤트만 발생함을 증명

---

## 🎫 EL-218. 런타임 수명주기(Lifecycle) 상태 파서 및 다중 상태 병합

- **우선순위**: P0
- **실행 순서**: 16번째
- **전제 티켓**: EL-217
- **그룹**: Logic (State Engine)
- **목표**: 동기화된 JSON 데이터로부터 에이전트의 현재 수명주기 상태(`finished`, `blocked`, `failed`, `userinterlude`)를 정확히 추출 및 병합하여 UI 표준 객체로 변환한다.
- **대상 경로**:
  - `src/main/state/lifecycle-parser.ts` (신규)
  - `src/main/ipc/state-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **다중 스킬 병합(Overlap) 해석 (추가)**: `team + ralph`, `team + ultrawork` 등 중첩된 모드 상태 파일이 읽힐 경우, `STATE_MODEL-ko.md`의 중복 허용 규칙에 따라 메인 워크플로우를 최상위 상태로 병합(Reconcile)하는 로직 구현.
  2. **감사 필드(Audit Fields) 추출 (추가)**: 상태가 `completed` 단계일 경우, 파일에 기록된 `completed_at`, `auto_completed_reason`, `completion_note`를 필수 추출하여 UI 페이로드에 바인딩.
  3. **불변성 파이프라인**: 상태 전이 이벤트 발생 시 `omx:lifecycle-change` 이벤트를 Renderer로 브로드캐스트.
- **DoD (완료 기준)**:
  - 에이전트의 작업 결과(성공/실패/중단) 및 감사 필드가 기술적으로 명확히 추출되어 식별됨.
- **체크리스트**:
  - [ ] 수명주기 상태 정규화 및 감사 필드 포함 Zod 스키마 정의
  - [ ] **[정합성 게이트]** 다중 상태 파일 충돌 시 우선순위 병합(Reconciliation) 함수 구현
  - [ ] `omx:lifecycle-change` 메인-렌더러 IPC 이벤트 채널 개방
  - [ ] `lifecycle-parser.test.ts` 에서 다중 모드 상태 데이터 모킹 및 올바른 병합 객체 반환 확인

---

## 🎫 EL-219. 무상태(Stateless) 대시보드 및 오버레이 컴포넌트 연동

- **우선순위**: P1
- **실행 순서**: 17번째
- **전제 티켓**: EL-218
- **그룹**: UI/UX Integration
- **목표**: 파싱된 수명주기 데이터를 바탕으로 클로드 데스크탑처럼 메인 채팅 뷰를 방해하지 않는 깔끔한 우측(또는 좌측) 사이드바 타임라인을 구축한다.
- **대상 경로**:
  - `src/renderer/components/LifecycleDashboard.tsx` (신규)
  - `src/renderer/components/TaskTimeline.tsx` (신규)
- **핵심 구현 로직 (UI 특화)**:
  1. **사이드바(Sidebar) 분리 레이아웃**: 메인 화면은 대화 스트림(Chat)에 집중하고, 에이전트의 상태 전이 이력(`finished`, `failed` 등)과 시스템 지표는 접기/펴기가 가능한 사이드바에 타임라인 형태로 렌더링.
  2. **인라인 사고 과정(Thinking) 아코디언**: IPC로부터 `subType: "reasoning"` 메타데이터를 수신할 경우, 채팅 버블 내부에 `<details>` 태그와 유사한 접기/펴기 가능한 아코디언 UI 블록을 렌더링하여 지저분한 로그를 숨김 처리.
  3. **감사 노트(Audit Note) 말풍선**: 작업이 `completed` 되었을 때 반환되는 `completion_note`를 시스템 메시지 형태의 작은 인라인 말풍선이나 사이드바 뱃지로 수려하게 표현.
- **DoD (완료 기준)**:
  - 사용자가 앱 재실행 직후에도 현재 에이전트 상태를 사이드바에서 즉시 확인 가능함.
  - 사고 과정 토큰이 아코디언 UI로 접혀서 렌더링됨.
- **체크리스트**:
  - [ ] 메인 채팅 뷰와 분리된 슬라이딩 사이드바(타임라인) 레이아웃 적용
  - [ ] `reasoning` 토큰 전용 접기/펴기(Collapsible) 아코디언 컴포넌트 구현
  - [ ] `completion_note` 및 `auto_completed_reason` 노출용 시스템 메시지 뷰 구현
  - [ ] 마운트 시점의 초기 상태 동기화(Rehydration) 및 렌더링 확인
