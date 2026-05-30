# Phase 1 Milestone 2 구현 티켓: Interop Broker 계약 기반 팀/태스크 제어 평면 구현

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 1의 두 번째 마일스톤인 "Interop Broker 계약 기반 팀/태스크 제어 평면 구현" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

Milestone 1에서 구축한 CLI 래퍼를 기반으로, 실제 팀 작업(Task)의 생명주기를 제어하고 표준화된 응답 계약을 처리하는 제어 평면을 완성하는 것을 목표로 한다.

## 🎯 Phase 1 Milestone 2 범위
- **표준 JSON 봉투(Envelope) 파서**: `Unary JSON` 응답 + 실패 봉투(`error.code`, `error.metadata`) 검증 및 에러 핸들링 파이프라인.
- **태스크 생명주기 API 매핑**: `read-task`, `claim-task`, `release-task-claim`, `transition-task-status` 등 핵심 제어 API 연동.
- **상태 정합성 가드**: 무상태(Stateless View) 원칙 준수, 금지된 상태 역전 요청 차단 및 결과 데이터 동기화.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-203 | EL-203 | 표준 JSON 봉투(Envelope) 스키마 검증 및 파서 구현 |
| US-204 | EL-204 | 태스크 조회, 선점 및 롤백 API 연동 (`read-task`, `claim-task`, `release-task-claim`) |
| US-205 | EL-205 | 태스크 상태 전이 및 결과 추적 API 연동 (`transition-task-status`) |

---

## Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기
- **스프린트**: SP-22 : Phase 1 - 제어 평면 및 계약 구현
- **유저스토리 매핑**: US-203~US-205 = EL-203~EL-205 (마일스톤 1 이후 순번)

---

## 🎫 EL-203. 표준 JSON 봉투(Envelope) 스키마 검증 및 파서 구현

- **우선순위**: P0
- **실행 순서**: 3번째
- **전제 티켓**: EL-202 (비차단 CLI 래퍼 인프라 확보)
- **그룹**: Infra (Parser)
- **목표**: OMX CLI 인터페이스가 반환하는 공통 JSON 응답 스펙을 유효성 검증하고, 성공/실패 상태를 기계 판독 가능한 표준 객체로 전환하는 전용 검증기를 구축한다.
- **대상 경로**:
  - `src/main/cli/envelope-parser.ts` (신규)
  - `src/main/cli/schemas/envelope.schema.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **성공 봉투 스키마(Zod)**: `schema_version: "1.0"`, `timestamp`, `command`, `ok: true`, `operation`, `data` 구조 검증.
  2. **실패 봉투 스키마(Zod - 추가)**: `ok: false`일 때, 내부에 중첩된 **`error: { code: string, message: string, metadata?: Record<string, any> }` 스펙을 엄격히 검증**하도록 설계하여 낙관적 락 충돌 정보를 유실 없이 추출.
  3. **스트림 호환성 기틀**: 단발성 전체 문자열 검증 메서드(`parseObject`) 외에, 향후 Ndjson 토큰 단위 스트리밍 파싱에 플러그인할 수 있는 라인 단위 가드 메서드(`parseLine`)를 선행 공유 모듈로 자산화.
- **DoD (완료 기준)**:
  - CLI 래퍼의 결과물이 이 파서를 거쳐 명확한 성공/실패 객체로 변환됨.
  - 자동 테스트: 임의의 JSON 응답(정상/오류/버전불일치/스키마위반/중첩에러) 시뮬레이션 시 정확히 예외 처리됨.
- **체크리스트**:
  - [ ] 정식 변이 계약 규격을 만족하는 Zod 기반 공통 JSON 봉투 스키마 정의
  - [ ] `ok: false` 발생 시 표준 `OMXError` 커스텀 예외 클래스로 매핑 및 에러 코드 추출 모듈 구현
  - [ ] 파서 내부에 무상태(Stateless) 순수 함수 원칙을 적용하여 다중 스레드 스트림 진입 대비
  - [ ] `envelope-parser.test.ts` 에서 성공 케이스 및 중첩 에러 케이스 데이터 모킹 테스트 통과

---

## 🎫 EL-204. 태스크 조회, 선점 및 롤백 API 연동 (`read-task`, `claim-task`, `release-task-claim`)

- **우선순위**: P0
- **실행 순서**: 4번째
- **전제 티켓**: EL-203 (봉투 파서 완료 필수)
- **그룹**: Logic (Task Control)
- **목표**: OMX 브로커 명령을 통해 특정 작업 상태를 조회 및 선점하고, 예외 발생 시 안전하게 복구(선점 해제)할 수 있는 코어 제어 서비스 레이어를 완성한다.
- **대상 경로**:
  - `src/main/services/task-service.ts` (신규)
  - `src/main/ipc/task-ipc.ts` (신규 - Renderer 전송 경로)
- **핵심 구현 로직 (보완됨)**:
  1. **태스크 선점**: `omx team api claim-task --json` 호출 시 낙관적 락 버전을 주장하도록 설계.
  2. **치명적 공백 보완 - 선점 해제 복구 흐름 (추가)**: 에이전트 크래시, 프로세스 이상 종료, 사용자 취소 이벤트 감시 시 **`omx team api release-task-claim --json`을 즉각 기동하여 대기 상태(`requeue-to-pending`)로 안전하게 되돌리는 예외 안전성 파이프라인 구현**.
  3. **진실의 경계 Guard**: `.omx/state/team/` 하위 디렉터리에 대한 데스크톱 앱 측의 직접적인 쓰기(Write) 연산을 원천 금지하고 오직 CLI 브로커 인터페이스만 신뢰.
  4. **충돌 처리 규칙**: 선점 실패(`Conflict`) 에러 코드 검출 시, IPC 채널을 통해 Renderer로 `task:claim-conflict` 이벤트를 즉각 브로드캐스트하여 UI 단에 동작 선점 충돌 경고를 유도.
- **DoD (완료 기준)**:
  - 특정 태스크 ID로 상태 정보를 정확히 가져오며, UI상에 작업자(Assignee) 정보 업데이트 가능.
  - 중복 선점 시도 시 `Conflict` 에러가 정상적으로 전파되고 선점 해제 복구 흐름이 보장됨.
  - 자동 테스트: `task-service.test.ts` 에서 mock CLI를 이용한 동시 선점 충돌 및 강제 취소 복구 시나리오 검증.
- **체크리스트**:
  - [x] `read-task` 명령 래핑 및 반환 데이터 구조 프론트엔드 맞춤 매핑 구현
  - [x] 낙관적 락 버전 제어가 결합된 `claim-task` 인터페이스 구현
  - [x] **[예외 보호 게이트]** `release-task-claim` 기반의 롤백 및 태스크 Requeue 논리 구현 완료
  - [x] direct 파일 쓰기 위반 가드라인 코드 리뷰 승인
  - [x] `task-service.test.ts` 에서 mock CLI를 이용한 동시 선점 충돌 및 강제 취소 복구 시나리오 테스트 검증 성공

---

## 🎫 EL-205. 태스크 상태 전이 및 결과 추적 API 연동 (transition-task-status)

- **우선순위**: P1
- **실행 순서**: 5번째
- **전제 티켓**: EL-204 (조회 및 선점 인프라 전제)
- **그룹**: Logic (Task Lifecycle)
- **목표**: 활성화된 태스크의 단계를 엄격한 전이 규칙에 따라 `in_progress -> completed | failed` 수명주기로 전이시키고 최종 결과 컨텍스트를 UI 레이어로 실시간 동기화한다.
- **대상 경로**:
  - `src/main/services/task-service.ts` (확장)
  - `src/main/ipc/task-ipc.ts` (확장)
- **핵심 구현 로직 (보완됨)**:
  1. **정석 생명주기 제어**: `omx team api transition-task-status --json` 명령을 연동하여 엄격한 상태 전이 경로를 관리.
  2. **수명주기 결과물 바인딩 (추가)**: 상태 전이 완료 시 CLI 결과 봉투에서 리턴되는 데이터 세트(`data` 블록)를 수집하여 IPC를 통해 프론트엔드 Renderer로 전송, 타임라인 및 결과 아카이브 영역 시각화 활성화.
  3. **불변성 가드 (추가)**: 상태 모델 계약을 준수하여, 실행형 모드 상태에서 사용자의 임의 조작에 의한 **기획/계획형 모드로의 불법적인 롤백 전이 요청 유입 시 UI 레이어에서 명확한 차단 가이드라인 및 예외 메시지를 팝업**하도록 가드 로직 탑재.
- **DoD (완료 기준)**:
  - UI에서 작업 완료 버튼 클릭 시 CLI를 통해 상태가 전이되고 원본 서버 상태와 동기화됨.
  - 전이 실패 시 원인(권한 부족, 상태 미달 등)이 UI에 표시됨.
  - 자동 테스트: 전이 흐름에 대한 Happy Path, 차단형 상태 처리, 금지된 역전 요청 검증 성공.
- **체크리스트**:
  - [ ] `transition-task-status` API 매핑 및 가용 상태 전이 인자 처리 로직 구축
  - [ ] 완료(`completed`) 또는 실패(`failed`) 상태 확정 시 결과물 데이터 패킷 추출 모듈 구현
  - [ ] **[불변성 게이트]** 금지된 워크플로우 상태 역전(롤백) 방지용 유효성 가드라인 구현
  - [ ] 전이 완료 이벤트를 가로채 Renderer 화면을 실시간 동기화할 `task_status_changed` IPC 채널 개방
  - [ ] `task-service.lifecycle.test.ts` 단위 테스트 작성 및 전이 시나리오 통과
