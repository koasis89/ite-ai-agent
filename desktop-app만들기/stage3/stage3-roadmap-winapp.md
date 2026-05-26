# oh-my-codex Windows 앱 — Stage3 로드맵 (완성형 Desktop AI Agent)

작성일: 2026-05-25
기준선: Stage2 로드맵([desktop-app만들기/stage2/stage2-roadmap-winapp.md](../stage2/stage2-roadmap-winapp.md)) + stage2 누적 구현(Phase 1~8)

---

## 1. Stage3 목표

Stage3의 목표는 "기능이 많은 앱"이 아니라 "실무에서 신뢰 가능한 자율형 데스크탑 AI 에이전트"다.

완성 정의:
- 정확성: 답변/행동이 근거 기반이며 재현 가능
- 자율성: 저위험 작업은 자동 진행, 고위험 작업은 명확히 승인 요청
- 복구력: 실패/중단/재시작 이후에도 작업이 일관되게 이어짐
- 운영성: 배포 후 상태를 측정, 진단, 롤백할 수 있음
- 보안성: 데이터 경계, 권한, 감사 추적이 제품 레벨에서 보장됨

---

## 2. Stage2 대비 추가/보완 포인트

Stage2에서 대화 UI, 도구 호출, 권한, 첨부, 업데이트, 진단 번들까지는 확보되었다. Stage3는 아래 7축을 채운다.

| 축 | Stage2 상태 | Stage3 보완 방향 |
|---|---|---|
| A. 에이전트 추론 품질 | 단일 턴 중심 + 도구 호출 성공 위주 | 작업 계획/근거/검증 루프를 제품 기능으로 내장 |
| B. 메모리/지식 활용 | 세션/이력 저장 중심 | 장기 메모리, 프로젝트 지식 인덱스, 증거 인용 UX |
| C. 자율 실행 안정성 | 권한 다이얼로그 중심 제어 | 작업 큐, 체크포인트, 재시도 정책, 부분 롤백 |
| D. 팀/멀티에이전트 | 기반은 있으나 사용자 경험 제한 | 역할 분담 실행, 합의/병합, 충돌 해결 UI |
| E. 운영/품질 | 빌드·회귀·진단 번들 중심 | SLO/관측/실험/릴리즈 가드 자동화 |
| F. 보안/컴플라이언스 | 호출 권한과 입력 검증 | 데이터 분류, 비밀 탐지, 감사 리포트, 정책 엔진 |
| G. LLM 인증/백엔드 호출 | 모델 라우팅 결정 수준 | 로그인, 토큰수명, 스트리밍, 실패복구를 제품 레벨로 내장 |

---

## 3. Stage3 제안 Phase

## Phase 9 — LLM Auth & Backend Gateway (선행 게이트)

목표: "질문을 입력하면 실제 답변이 돌아온다"를 가장 먼저 보장.

추가 기능:
- ST3-WIN-095 인증 계층 표준화
  - OpenAI/호환 백엔드 기준 로그인 상태 확인, 키 유효성 검사, 만료 전 갱신
  - 사용자 프로필별 인증 저장소 분리(개인/조직/프로젝트)
  - 재사용 우선 모듈: `src/cli/codex-home.ts`, `src/cli/index.ts`의 Codex 홈/런치 해석 경로를 데스크탑 인증 저장소 설계의 기준으로 확장
- ST3-WIN-096 Backend Gateway
  - 단일 모델 호출 API를 앱 내부 표준으로 통합(요청/응답/에러 스키마 고정)
  - 백엔드별 어댑터(OpenAI, 호환 게이트웨이, 로컬 추론 서버) 플러그인 구조
  - 재사용 우선 모듈: `desktop/ipc/commands.ts` + `desktop/main/index.ts`의 백엔드 주입 패턴(set*Backend) 위에 LLM 게이트웨이 어댑터 추가
- ST3-WIN-097 스트리밍/타임아웃/재시도 정책
  - SSE/Chunk 스트리밍 표준 이벤트(`token`, `tool_call`, `done`, `error`) 정규화
  - 지수 백오프 재시도, idempotency key, 취소 토큰 전파
  - 재사용 우선 모듈: `desktop/ipc/event-bus.ts`, `desktop/ipc/events.ts`, `desktop/main/updater/updater.ts`의 스트리밍/백오프 상태머신 패턴 재사용
- ST3-WIN-098 비용/쿼터/레이트리밋 보호
  - 모델별 비용 추적, 세션 예산 상한, 429/쿼터 초과 보호 UX
  - "저비용 모델로 다운시프트" 자동 정책(사용자 옵트인)
  - 재사용 우선 모듈: `desktop/main/storage/command-history-repo.ts`, `desktop/main/storage/tool-call-history-repo.ts`를 비용/쿼터 계측 저장소로 확장
- ST3-WIN-099 백엔드 장애 복구
  - 주 백엔드 장애 시 보조 백엔드 페일오버(정책 기반)
  - 장애 시 사용자에게 영향 범위, 자동 복구 시도, 수동 전환 옵션 표시
  - 재사용 우선 모듈: `desktop/main/updater/config.ts`의 provider fallback 규칙 + `desktop/main/updater/channel.ts`의 전환 정책을 백엔드 페일오버 규칙으로 일반화

보완 포인트:
- 인증 실패를 일반 실패와 분리(`AUTH_INVALID`, `AUTH_EXPIRED`, `BACKEND_UNREACHABLE`)해 안내
- 프롬프트/응답 원문의 저장·전송 정책을 백엔드별로 분리 관리(민감도 정책 연동)

---

## Phase 10 — Agent Runtime 2.0 (계획-실행-검증 루프)

목표: 답변 생성기를 넘어 "작업 완료기"로 전환.

추가 기능:
- ST3-WIN-091 작업 플래너
  - 사용자 요청을 Task Graph로 분해(선행조건, 병렬 가능 여부, 완료 조건)
  - 각 스텝에 예상 리스크/검증 항목 부여
  - 재사용 우선 모듈: `src/team/role-router.ts`, `src/team/allocation-policy.ts`, `src/pipeline/stages/*`의 역할/분해 로직을 데스크탑 플래너에 재사용
- ST3-WIN-092 실행 정책 엔진
  - AUTO-CONTINUE/ASK 분기 규칙을 중앙화
  - 고위험 행위(삭제, 대량 수정, 외부 배포)는 강제 승인
  - 재사용 우선 모듈: `desktop/main/permissions/permission-broker.ts`, `src/state/workflow-transition.ts`의 정책/전이 게이트를 통합 확장
- ST3-WIN-093 검증 게이트
  - 코드 변경 후 최소 검증 체인(타입체크, 테스트, 린트)을 정책 기반 실행
  - 실패 시 자동 재시도 범위와 중단 조건 명시
  - 재사용 우선 모듈: `src/verification/verifier.ts`, `src/pipeline/stages/ralph-verify.ts`의 검증 증거 판정 로직과 `desktop/ipc/commands.ts` 실행 체인 결합
- ST3-WIN-094 근거 표시 UX
  - 답변에 사용된 증거(파일, 로그, 실행결과) 링크를 구조화 표시
  - 재사용 우선 모듈: `desktop/main/storage/command-history-repo.ts`, `desktop/main/storage/tool-call-history-repo.ts`, `desktop/renderer/chat/*` 렌더러를 증거 카드 UI로 확장

보완 포인트:
- "성공처럼 보이는 실패" 방지: 결과 텍스트보다 검증 성공 신호를 우선
- 장시간 작업 시 단계별 상태(대기/실행/검증/완료/차단) 가시화

---

## Phase 11 — Memory & Knowledge Engine

목표: 매번 처음부터 찾지 않고, 프로젝트 문맥을 누적 학습.

추가 기능:
- ST3-WIN-101 장기 메모리 계층
  - 사용자 선호, 저장소 규칙, 반복 오류 패턴을 구분 저장
  - 세션/레포/사용자 스코프 자동 분리
  - 재사용 우선 모듈: `src/state/skill-active.ts`, `src/modes/base.ts`, `src/hooks/session.ts`의 세션/스코프 상태모델을 메모리 스키마의 베이스로 재사용
- ST3-WIN-102 프로젝트 지식 인덱서
  - prompts, skills, missions, docs, 코드 심볼을 주기적으로 인덱싱
  - 변경 감지 기반 증분 업데이트
  - 재사용 우선 모듈: `src/team/role-router.ts`(prompts 로딩), `src/cli/setup.ts`(skills 검증), `src/autoresearch/contracts.ts`(missions 로딩) 경로를 통합 인덱서 입력원으로 재사용
- ST3-WIN-103 RAG 근거 합성
  - 답변 시 관련 문서를 스코어링 후 근거 블록으로 첨부
  - 오래된 근거 탐지(수정 시간 역전) 경고
  - 재사용 우선 모듈: `desktop/ipc/event-bus.ts`의 이벤트 타임스탬프와 `desktop/main/storage/*-history-repo.ts` 메타데이터를 freshness 판정 신호로 재사용
- ST3-WIN-104 메모리 품질 관리
  - 중복/상충 메모리 정리 워크플로
  - "왜 이 메모리를 썼는지" 추적 가능성 제공
  - 재사용 우선 모듈: `desktop/main/diag/maskers.ts`의 정규화/검증 패턴 + `src/state/skill-active.ts`의 상태 정합 규칙을 메모리 정리 검증기로 재사용

보완 포인트:
- 지식 최신성 보장: 인덱스 stale TTL + 수동 재색인 버튼
- 환각 억제: 출처 없는 주장에는 자동 경고 라벨 부착

---

## Phase 12 — Autonomous Workflow Orchestration

목표: 사람 지시 1회로 멀티스텝 업무를 끝까지 수행.

추가 기능:
- ST3-WIN-111 작업 큐/스케줄러
  - 대기열, 우선순위, 동시성 제한, 취소/재개
  - 재사용 우선 모듈: `src/team/team-ops.ts`의 dispatch/task claim API와 `src/team/runtime.ts` 오케스트레이션 루프를 데스크탑 작업 큐 엔진으로 재사용
- ST3-WIN-112 체크포인트/재개
  - 각 단계 산출물 스냅샷 저장, 앱 재시작 후 이어서 실행
  - 재사용 우선 모듈: `src/modes/base.ts`, `src/state/workflow-transition.ts`, `desktop/main/first-run/state.ts`의 상태 영속/재개 패턴 재사용
- ST3-WIN-113 멀티에이전트 협업 UI
  - planner/executor/reviewer 역할별 진행률과 산출물 비교
  - 재사용 우선 모듈: `src/team/runtime.ts` + `src/team/team-ops.ts` 상태 스냅샷과 `desktop/renderer/chat/*` UI 컴포넌트 결합
- ST3-WIN-114 실패 복구 플레이북
  - 실패 유형별 자동 복구 템플릿(재시도, 대체 경로, 사용자 질문)
  - 재사용 우선 모듈: `desktop/main/updater/updater.ts` 재시도 상태머신, `src/state/workflow-transition.ts` 차단 규칙, `desktop/ipc/question.ts` 사용자 질의 루프 재사용
- ST3-WIN-115 Human-in-the-loop 강화
  - 승인 요청 시 영향 범위 diff, 예상 부작용, 롤백 플랜 동시 제시
  - 재사용 우선 모듈: `desktop/renderer/permissions/PermissionDialog.ts`, `desktop/main/permissions/permission-broker.ts`, `desktop/ipc/question.ts` 승인 UX를 공통 인터랙션 레이어로 재사용

보완 포인트:
- "무한 루프" 차단: 반복 실패 임계치 초과 시 강제 차단 + 요약 리포트
- "부분 성공" 명시: 완료율과 남은 블로커를 결과에 구조화

---

## Phase 13 — Trust, Security, and Enterprise Ops

목표: 개인용 도구를 조직/운영 환경에 올릴 수 있는 수준으로 강화.

추가 기능:
- ST3-WIN-121 정책 엔진 2단계
  - 도구별/경로별/환경별 실행 정책(Allow/Deny/Ask) 템플릿
  - 재사용 우선 모듈: `desktop/main/permissions/permission-broker.ts`, `desktop/main/permissions/permission-store.ts`, `desktop/main/tools/tool-router.ts` 확장 우선
- ST3-WIN-122 비밀·개인정보 보호
  - 첨부/로그/프롬프트 실시간 스캐너 + 마스킹
  - 외부 전송 전 DLP 게이트
  - 재사용 우선 모듈: `desktop/main/diag/maskers.ts`, `desktop/main/diag/bundle.ts`, `desktop/main/attachments/*`의 마스킹/검증 경로를 공용 DLP 모듈로 승격
- ST3-WIN-123 감사 추적/리포트
  - 누가 어떤 권한으로 어떤 도구를 호출했는지 시간축 리포트
  - 재사용 우선 모듈: `desktop/main/storage/tool-call-history-repo.ts`, `desktop/main/storage/command-history-repo.ts`, `tool_permissions` 데이터를 조인하는 리포팅 계층 추가
- ST3-WIN-124 관측성/SLO
  - 응답지연, 도구 실패율, 재시도율, 승인 거부율 대시보드
  - 재사용 우선 모듈: `desktop/ipc/event-bus.ts`, `desktop/ipc/commands.ts`의 `event_bus_stats`, `desktop/main/updater/updater.ts` 상태 이벤트를 메트릭 소스로 재사용
- ST3-WIN-125 배포 안전장치
  - 카나리 채널, 원클릭 롤백, 마이그레이션 사전 검증
  - 재사용 우선 모듈: `desktop/main/updater/channel.ts`, `desktop/main/updater/updater.ts`, `desktop/main/storage/migrations/*` 사전검증 루틴 확장

보완 포인트:
- 규정 대응: 감사 보존기간, 데이터 삭제 정책, 오프라인 모드 기준 수립
- 운영 가이드: 장애 대응 런북(업데이트 실패, DB 손상, 권한 오작동)

---

## 4. 사용자 체감 핵심 시나리오 (Stage3 완료 기준)

1. 사용자가 자연어로 "이 버그 고치고 PR 준비" 입력
2. 에이전트가 계획/리스크/검증 전략을 먼저 제시
3. 승인 후 자동으로 코드 변경, 테스트, 문서 업데이트 실행
4. 실패 시 원인과 복구 플랜을 자동 제시하고 재시도
5. 최종 결과로 변경 요약, 검증 증거, 남은 리스크, 다음 액션 제공

성공 기준:
- 단일 요청으로 끝까지 완주 가능한 비율 상승
- 수동 재지시 횟수 감소
- 실패 시 복구 시간 단축

---

## 5. 아키텍처 보강 제안

- Agent Core Layer
  - Planner, Policy, Verifier, Recovery 모듈을 분리
- Knowledge Layer
  - 인덱서 + 검색 + 인용 생성 파이프라인
- Model Gateway Layer
  - 인증, 모델 라우팅, 스트리밍, 재시도, 비용/쿼터 제어
- Execution Layer
  - 큐/체크포인트/재시도/취소 통합 런타임
- Trust Layer
  - 정책 엔진, DLP, 감사 로그, 서명된 이벤트 체인
- Ops Layer
  - 텔레메트리, SLO, 실험 플래그, 카나리 릴리즈

---

## 6. KPI/SLO 제안

제품 KPI:
- Task Completion Rate: 사용자 재지시 없이 완료된 작업 비율
- First-Pass Success: 첫 실행에서 검증까지 통과한 비율
- Time-to-Useful-Result: 첫 유효 산출까지 걸린 시간

운영 SLO:
- 명령 실행 성공률 99%+
- LLM 인증 성공률 99.9%+
- LLM 백엔드 스트리밍 시작 p95 2.0초 이하
- LLM 백엔드 호출 실패 자동 복구율 95%+
- 치명적 크래시율 0.5% 미만
- 권한 정책 위반 0건
- 업데이트 실패 후 자동 복구율 95%+

품질 게이트:
- Stage3 신규 기능은 회귀 테스트 + 시나리오 테스트 + 보안 테스트 3중 통과

---

## 7. 우선순위 및 실행 순서

권장 순서:
1. Phase 9 (LLM 인증/백엔드 게이트웨이)
2. Phase 10 (런타임 루프)
3. Phase 11 (메모리/지식)
4. Phase 12 (자율 워크플로)
5. Phase 13 (신뢰/운영)

병렬 가능 트랙:
- 10과 11은 9의 호출 계약(API/이벤트 스키마) 고정 후 병렬 진행 가능
- 12는 10 및 11 완료 의존, 13은 9~12 공통 이벤트 스키마 안정화 후 본격화

---

## 8. 리스크 및 선결정 항목

| 항목 | 선결정 필요 | 권장 |
|---|---|---|
| 모델 라우팅 | 단일 모델 vs 다중 모델 전략 | 역할 기반 다중 모델 + 비용 상한 |
| 인증 방식 | API Key only vs OAuth/device flow 병행 | 개인은 API Key, 조직은 OAuth 병행 |
| 백엔드 구성 | 단일 벤더 vs 다중 벤더/로컬 페일오버 | 주/보조 백엔드 이중화 + 정책 기반 전환 |
| 지식 저장소 | SQLite 단일 vs 검색 인덱스 분리 | 메타는 SQLite, 검색은 별도 인덱스 |
| 로컬/클라우드 모드 | 완전 로컬 지원 범위 | 민감 데이터는 로컬 우선, 원격은 옵트인 |
| 정책 강도 | 개인용 완화 vs 조직용 엄격 | 프로파일 기반 정책 레벨 3단계 |
| 관측성 | 오프라인 중심 vs 중앙 수집 | 기본 로컬, 조직 모드에서 중앙 수집 |

---

## 9. 중복 방지 구현 규칙 (Stage3 공통)

목적: Stage3 항목 구현 시 신규 모듈 남발을 막고, Stage2/기존 런타임 자산을 확장하는 방식으로 개발 일관성을 유지한다.

### 9.1 신규 파일 생성 금지 원칙

- 기본 원칙: ST3-WIN 단위 작업은 "기존 파일 확장"을 기본값으로 한다.
- 예외 조건: 아래 3가지가 동시에 만족될 때만 신규 파일 생성 가능
  - 기존 파일에 책임을 추가하면 모듈 응집도가 명확히 악화됨
  - public contract(IPC/event/schema) 분리가 없으면 회귀 위험이 증가함
  - 테스트 경계(단위/통합) 분리를 위해 물리적 분리가 필요함
- 예외 승인 절차: PR 본문에 "신규 파일 필요성" 3문장 근거 + 대체안(기존 파일 확장안) 비교를 필수 기재

### 9.2 확장 대상 함수/클래스 명시 원칙

- 각 ST3-WIN 작업 시작 전에 아래 항목을 티켓/PR에 선기입한다.
  - 확장 대상 1순위 모듈(이미 문서에 기록된 "재사용 우선 모듈")
  - 실제 수정할 심볼 목록(함수/클래스/핸들러)
  - 추가될 public contract 목록(없으면 "없음" 명시)
- 심볼 명시 예시:
  - `desktop/ipc/commands.ts`의 command handler 등록부 확장
  - `desktop/main/index.ts`의 backend 주입 지점(set*Backend) 확장
  - `desktop/ipc/event-bus.ts`의 이벤트 타입/집계 경로 확장

### 9.3 최소 변경 범위 원칙

- 한 ST3-WIN 구현은 "핵심 파일 1~3개 + 테스트/문서" 범위를 기본 목표로 한다.
- 범위가 커질 때는 단계 분할을 우선한다.
  - 1단계: contract 추가(타입/이벤트/IPC)
  - 2단계: runtime 로직 연결
  - 3단계: renderer/UX 반영
- 금지 패턴:
  - 동일 책임의 저장소/브로커/라우터를 이름만 바꿔 재구현
  - 기존 이벤트 채널을 우회하는 임시 채널 추가
  - 검증 가능한 근거 없이 "전면 리라이트" 진행

### 9.4 ST3 티켓 템플릿 (중복 방지 필수 필드)

아래 5줄은 ST3-WIN 티켓/PR마다 필수로 채운다.

1. 재사용 우선 모듈: (기존 문서 라인 그대로)
2. 확장 심볼: (함수/클래스/핸들러 명시)
3. 신규 파일 생성: 금지 / 예외 승인(근거 링크)
4. 변경 범위: 핵심 파일 N개, 테스트 N개, 문서 N개
5. 회귀 검증: 타입체크/테스트/수동 시나리오 체크 결과

### 9.5 완료 판정 체크리스트

- "재사용 우선 모듈"을 실제로 수정했는가
- 동일 책임 신규 모듈이 추가되지 않았는가
- IPC/event/schema contract 변경이 추적 가능한가
- 실패/복구 시나리오가 기존 정책 엔진과 정합적인가
- Stage2 동작 회귀가 없는가(권한/명령실행/이력/업데이트)

---

## 9. 결론

Stage2가 "안전한 기반"을 완성했다면, Stage3는 "완성형 에이전트 경험"을 완성해야 한다.
핵심은 기능 추가 자체보다 다음 3가지를 제품 기본값으로 만드는 것이다.

- 계획 없이 실행하지 않는다
- 근거 없이 답하지 않는다
- 복구 없이 실패를 끝내지 않는다

이 3가지를 충족하면 데스크탑 AI 에이전트는 데모 도구를 넘어 실제 업무용으로 정착할 수 있다.
