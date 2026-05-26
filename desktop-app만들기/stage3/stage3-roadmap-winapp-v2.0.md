# oh-my-codex Windows 앱 — Stage3 로드맵 v2.0 (Reuse-First by Design)

작성일: 2026-05-25
기준선: Stage2 구현 완료 상태 + Stage3 v1 피드백 반영
문서 목적: Stage3를 "처음부터" 기존 코드 우선 확장 방식으로 설계해 중복 구현 리스크를 구조적으로 제거한다.

---

## 1. 설계 원칙 (Day-0)

Stage3 v2.0의 기본 원칙은 기능 우선이 아니라 재사용 우선이다.

- 원칙 R1: 기존 모듈 확장을 기본값으로 한다.
- 원칙 R2: 동일 책임의 신규 저장소/브로커/라우터 재구현을 금지한다.
- 원칙 R3: 변경은 계약(IPC/Event/Schema) -> 런타임 -> UI 순서로 단계화한다.
- 원칙 R4: 각 항목은 구현 전에 확장 심볼과 변경 범위를 명시한다.
- 원칙 R5: 완료 판정은 "동작"이 아니라 "검증 증거"로 한다.

적용 방식:
- 모든 ST3-WIN 항목은 아래 4요소를 필수로 가진다.
  - 재사용 우선 모듈
  - 확장 심볼
  - 최소 변경 범위
  - 필수 검증 체인

---

## 2. Stage3 완성 정의

- 정확성: 근거 없는 출력 차단, 검증 실패 시 성공으로 표기 금지
- 자율성: 저위험 자동 진행, 고위험 승인 강제
- 복구력: 실패/중단/재시작 후 체크포인트 기반 이어서 실행
- 운영성: 지표, 감사, 릴리즈 가드 기반 운영 가능
- 보안성: 권한/민감정보/감사 추적이 제품 레벨에서 강제됨

---

## 3. 전역 구현 가드레일

### 3.1 신규 파일 정책

- 기본값: 신규 파일 생성 금지
- 예외 허용: 아래 조건 3개 동시 충족 시만 허용
  - 기존 파일에 넣으면 책임 경계가 더 불명확해짐
  - 계약 분리 없이는 회귀 가능성이 증가함
  - 테스트 경계 분리를 위해 물리적 분리가 필요함
- 예외 문서화: 티켓/PR에 필요성 3문장 + 대체안 비교 필수

### 3.2 변경 순서 정책

1. 계약 고정: IPC 채널, 이벤트 타입, 스키마
2. 런타임 연결: main/ipc/storage/policy
3. UI 반영: renderer 상호작용/가시화

### 3.3 범위 정책

- 1개 ST3-WIN 당 핵심 파일 1~3개 우선
- 변경이 커지면 하위 작업으로 분할
- 전면 리라이트 금지

### 3.4 공통 검증 체인

- 타입체크
- 최소 시나리오 테스트
- 실패/복구 경로 확인
- 회귀 포인트 확인: 권한, 명령 실행, 이력, 업데이트

---

## 4. 재사용 우선 아키텍처 맵

| 레이어 | 우선 재사용 모듈 | 확장 방향 |
|---|---|---|
| Model Gateway | desktop/ipc/commands.ts, desktop/main/index.ts | 백엔드 어댑터, 인증/토큰, 스트리밍 표준 이벤트 |
| Runtime Policy | desktop/main/permissions/permission-broker.ts, src/state/workflow-transition.ts | 자동 진행/승인 분기와 차단 규칙 중앙화 |
| Evidence/History | desktop/main/storage/command-history-repo.ts, desktop/main/storage/tool-call-history-repo.ts | 비용/근거/감사 추적 메타데이터 확장 |
| Event/Observability | desktop/ipc/event-bus.ts, desktop/ipc/events.ts | 실행 상태, 백오프, 실패 원인 이벤트 표준화 |
| Workflow Orchestration | src/team/team-ops.ts, src/team/runtime.ts, src/modes/base.ts | 큐/체크포인트/재개/협업 실행 엔진 |
| Security/DLP | desktop/main/diag/maskers.ts, desktop/main/diag/bundle.ts, desktop/main/tools/tool-router.ts | 민감정보 탐지, 전송 게이트, 정책 강제 |
| Release Safety | desktop/main/updater/updater.ts, desktop/main/updater/channel.ts, desktop/main/storage/migrations/* | 카나리/롤백/사전검증 자동화 |

---

## 5. Phase 로드맵 (v2.0)

## Phase 9 — LLM Auth & Backend Gateway (선행 게이트)

목표: 질문 입력 시 실제 응답과 스트리밍, 실패 복구까지 제품 계약으로 보장.

### ST3-WIN-095 인증 계층 표준화

- 재사용 우선 모듈: src/cli/codex-home.ts, src/cli/index.ts
- 확장 심볼: Codex 홈 해석 경로, 인증 저장소 초기화 경로, 프로필 분리 로직
- 최소 변경 범위: 인증 저장소/주입 경로 중심 2~3파일
- 필수 결과: AUTH_INVALID, AUTH_EXPIRED, BACKEND_UNREACHABLE 분리 표출

### ST3-WIN-096 Backend Gateway

- 재사용 우선 모듈: desktop/ipc/commands.ts, desktop/main/index.ts
- 확장 심볼: set*Backend 주입 지점, 모델 호출 표준 핸들러, 백엔드 어댑터 레지스트리
- 최소 변경 범위: IPC 계약 + main 주입 + 어댑터 연결
- 필수 결과: 단일 요청/응답/에러 스키마 고정

### ST3-WIN-097 스트리밍/타임아웃/재시도

- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/ipc/events.ts, desktop/main/updater/updater.ts
- 확장 심볼: token/tool_call/done/error 이벤트, 백오프 상태머신, 취소 토큰 전파
- 최소 변경 범위: 이벤트 타입 + 실행 루프 + UI 진행 신호
- 필수 결과: p95 스트리밍 시작 시간 측정 가능

### ST3-WIN-098 비용/쿼터/레이트리밋 보호

- 재사용 우선 모듈: desktop/main/storage/command-history-repo.ts, desktop/main/storage/tool-call-history-repo.ts
- 확장 심볼: 비용 필드, 모델별 사용량 집계, 429 보호 정책
- 최소 변경 범위: 저장소 스키마 확장 + 정책 핸들러
- 필수 결과: 세션 예산 상한과 자동 다운시프트 정책

### ST3-WIN-099 백엔드 장애 복구

- 재사용 우선 모듈: desktop/main/updater/config.ts, desktop/main/updater/channel.ts
- 확장 심볼: provider fallback 규칙, 자동 전환 정책, 수동 전환 UI 신호
- 최소 변경 범위: 전환 정책 + 상태 이벤트
- 필수 결과: 주/보조 백엔드 페일오버 성공률 측정

---

## Phase 10 — Agent Runtime 2.0 (계획-실행-검증 루프)

목표: 생성형 응답에서 작업 완주형 실행 엔진으로 전환.

### ST3-WIN-091 작업 플래너

- 재사용 우선 모듈: src/team/role-router.ts, src/team/allocation-policy.ts, src/pipeline/stages/*
- 확장 심볼: task graph 생성, 선행조건/완료조건 매핑
- 최소 변경 범위: 플래너 로직 + 계약 구조체
- 필수 결과: 계획, 리스크, 검증 항목 자동 생성

### ST3-WIN-092 실행 정책 엔진

- 재사용 우선 모듈: desktop/main/permissions/permission-broker.ts, src/state/workflow-transition.ts
- 확장 심볼: AUTO-CONTINUE/ASK 분기 룰, 고위험 차단 규칙
- 최소 변경 범위: 정책 매핑 + 승인 경로
- 필수 결과: 고위험 행위 강제 승인

### ST3-WIN-093 검증 게이트

- 재사용 우선 모듈: src/verification/verifier.ts, src/pipeline/stages/ralph-verify.ts, desktop/ipc/commands.ts
- 확장 심볼: 타입체크/테스트/린트 체인, 실패 재시도 한계
- 최소 변경 범위: 검증 체인 오케스트레이션
- 필수 결과: 성공처럼 보이는 실패 차단

### ST3-WIN-094 근거 표시 UX

- 재사용 우선 모듈: desktop/main/storage/command-history-repo.ts, desktop/main/storage/tool-call-history-repo.ts, desktop/renderer/chat/*
- 확장 심볼: 근거 카드 모델, 실행 로그 링크, 결과 요약 컴포넌트
- 최소 변경 범위: 데이터 매핑 + 렌더러 구성
- 필수 결과: 답변마다 추적 가능한 증거 표시

### ST3-WIN-100 Desktop SessionStart Context Overlay

- 재사용 우선 모듈: src/hooks/agents-overlay.ts, src/hooks/codebase-map.ts, src/hooks/explore-routing.ts, src/state/skill-active.ts, desktop/main/index.ts(makeCodexCliAdapter)
- 확장 심볼: applyDesktopSessionOverlay / stripDesktopSessionOverlay (Codex CLI 어댑터 라이프사이클 후크), buildSessionAgentsMarkdown 재사용
- 최소 변경 범위: makeCodexCliAdapter 진입/종료 페어 + 단위 테스트 1~2개
- 필수 결과: 데스크탑 LLM 요청마다 코드베이스 맵/활성 스킬/notepad/모드 상태가 AGENTS.md 마커 구간으로 주입되고, 종료 시 멱등 제거되어 원본 무손상

---

## Phase 11 — Memory & Knowledge Engine

목표: 프로젝트 문맥을 누적하고 근거 합성 품질을 안정화.

### ST3-WIN-101 장기 메모리 계층

- 재사용 우선 모듈: src/state/skill-active.ts, src/modes/base.ts, src/hooks/session.ts
- 확장 심볼: 세션/레포/사용자 스코프 모델, 선호/패턴 저장
- 최소 변경 범위: 상태 모델 확장 + 저장 정책
- 필수 결과: 스코프 분리 저장 자동화

### ST3-WIN-102 프로젝트 지식 인덱서

- 재사용 우선 모듈: src/team/role-router.ts, src/cli/setup.ts, src/autoresearch/contracts.ts
- 확장 심볼: prompts/skills/missions/docs/code 입력원 파이프라인
- 최소 변경 범위: 인덱싱 입력 어댑터 + 증분 갱신
- 필수 결과: 변경 감지 기반 재인덱싱

### ST3-WIN-103 RAG 근거 합성

- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/main/storage/*-history-repo.ts
- 확장 심볼: 문서 스코어링, freshness 판정, 출처 블록 생성
- 최소 변경 범위: 검색 결과 병합 + 표시 모델
- 필수 결과: 출처 없는 주장 경고

### ST3-WIN-104 메모리 품질 관리

- 재사용 우선 모듈: desktop/main/diag/maskers.ts, src/state/skill-active.ts
- 확장 심볼: 중복/상충 감지 규칙, 사용 이유 추적 필드
- 최소 변경 범위: 정합 규칙 + 정리 워크플로
- 필수 결과: 메모리 정리 가능성과 추적성 확보

---

## Phase 12 — Autonomous Workflow Orchestration

목표: 장시간 멀티스텝 업무를 안전하게 완주.

### ST3-WIN-111 작업 큐/스케줄러

- 재사용 우선 모듈: src/team/team-ops.ts, src/team/runtime.ts
- 확장 심볼: 우선순위, 동시성 제한, 취소/재개 API
- 최소 변경 범위: 큐 상태 모델 + 실행 루프
- 필수 결과: 장시간 작업 중단 없는 진행

### ST3-WIN-112 체크포인트/재개

- 재사용 우선 모듈: src/modes/base.ts, src/state/workflow-transition.ts, desktop/main/first-run/state.ts
- 확장 심볼: 단계 스냅샷, 재시작 복원 로직
- 최소 변경 범위: 상태 영속화 + 복원 엔트리
- 필수 결과: 앱 재시작 후 이어서 실행

### ST3-WIN-113 멀티에이전트 협업 UI

- 재사용 우선 모듈: src/team/runtime.ts, src/team/team-ops.ts, desktop/renderer/chat/*
- 확장 심볼: 역할별 진행률, 산출물 비교 뷰, 충돌 표시
- 최소 변경 범위: 상태 투영 + UI 렌더러
- 필수 결과: planner/executor/reviewer 가시화

### ST3-WIN-114 실패 복구 플레이북

- 재사용 우선 모듈: desktop/main/updater/updater.ts, src/state/workflow-transition.ts, desktop/ipc/question.ts
- 확장 심볼: 실패 유형별 재시도/대체 경로/사용자 질문
- 최소 변경 범위: 플레이북 규칙 + 질의 흐름
- 필수 결과: 반복 실패 임계치 초과 시 강제 차단

### ST3-WIN-115 Human-in-the-loop 강화

- 재사용 우선 모듈: desktop/renderer/permissions/PermissionDialog.ts, desktop/main/permissions/permission-broker.ts, desktop/ipc/question.ts
- 확장 심볼: 영향 범위 diff, 예상 부작용, 롤백 계획 카드
- 최소 변경 범위: 승인 데이터 모델 + 다이얼로그 확장
- 필수 결과: 승인 품질과 판단 근거 강화

---

## Phase 13 — Trust, Security, Enterprise Ops

목표: 개인용 수준을 넘어 조직 운영 가능한 신뢰 기반 확보.

### ST3-WIN-121 정책 엔진 2단계

- 재사용 우선 모듈: desktop/main/permissions/permission-broker.ts, desktop/main/permissions/permission-store.ts, desktop/main/tools/tool-router.ts
- 확장 심볼: 도구/경로/환경별 Allow/Deny/Ask 템플릿
- 최소 변경 범위: 정책 평가기 + 라우터 연결
- 필수 결과: 정책 적용 로그와 판정 근거 기록

### ST3-WIN-122 비밀·개인정보 보호

- 재사용 우선 모듈: desktop/main/diag/maskers.ts, desktop/main/diag/bundle.ts, desktop/main/attachments/*
- 확장 심볼: 실시간 스캐너, 전송 전 DLP 게이트, 마스킹 규칙
- 최소 변경 범위: 스캔/차단/마스킹 파이프라인
- 필수 결과: 외부 전송 전 민감정보 차단

### ST3-WIN-123 감사 추적/리포트

- 재사용 우선 모듈: desktop/main/storage/tool-call-history-repo.ts, desktop/main/storage/command-history-repo.ts, tool_permissions
- 확장 심볼: 호출 주체/권한/시간축 조인 리포트
- 최소 변경 범위: 리포트 쿼리 + 내보내기 포맷
- 필수 결과: 감사 추적 완전성 보장

### ST3-WIN-124 관측성/SLO

- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/ipc/commands.ts, desktop/main/updater/updater.ts
- 확장 심볼: 응답 지연/실패율/재시도율/승인 거부율 메트릭
- 최소 변경 범위: 메트릭 수집 + 대시보드 입력
- 필수 결과: SLO 위반 조기 경보

### ST3-WIN-125 배포 안전장치

- 재사용 우선 모듈: desktop/main/updater/channel.ts, desktop/main/updater/updater.ts, desktop/main/storage/migrations/*
- 확장 심볼: 카나리 채널, 원클릭 롤백, 마이그레이션 사전검증
- 최소 변경 범위: 배포 정책 + 복구 자동화
- 필수 결과: 업데이트 실패 자동 복구율 목표 달성

---

## 6. 실행 순서와 병렬 전략

권장 순서:
1. Phase 9
2. Phase 10
3. Phase 11
4. Phase 12
5. Phase 13

병렬 규칙:
- Phase 10과 11은 Phase 9 계약이 고정된 뒤 병렬 가능
- Phase 12는 Phase 10/11의 상태 계약 고정 이후 진행
- Phase 13은 공통 이벤트 스키마 안정화 이후 본격 진행

---

## 7. KPI/SLO (v2.0)

제품 KPI:
- Task Completion Rate
- First-Pass Success
- Time-to-Useful-Result

운영 SLO:
- 명령 실행 성공률 99%+
- LLM 인증 성공률 99.9%+
- 스트리밍 시작 p95 2.0초 이하
- 백엔드 자동 복구율 95%+
- 권한 정책 위반 0건
- 업데이트 실패 후 자동 복구율 95%+

---

## 8. ST3 티켓 템플릿 (v2.0 필수)

모든 ST3-WIN 티켓/PR은 아래를 필수 작성한다.

1. 재사용 우선 모듈
2. 확장 심볼
3. 신규 파일 생성 여부(기본 금지, 예외 근거 링크)
4. 최소 변경 범위(핵심 파일 수/테스트 수/문서 수)
5. 계약 변경(IPC/Event/Schema)
6. 검증 증거(타입체크/테스트/복구 시나리오)

완료 체크:
- 재사용 우선 모듈이 실제로 수정되었는가
- 동일 책임 신규 모듈을 만들지 않았는가
- 계약 변경이 추적 가능한가
- 실패/복구 동작이 검증되었는가
- Stage2 핵심 경로 회귀가 없는가
