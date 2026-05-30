# OMX State 모듈 개별 설계서

## 0. 문서 정보
- 모듈: state
- 기준 분석 문서: Electron/analysis/state-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 구현, 리뷰, 테스트 시 공통 판단 기준 제공
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 구조 또는 계약 변경 시 4, 5, 10장을 우선 갱신

## 1. 개요와 주요기능
- 개요: state 모듈은 OMX 워크플로우의 영속 상태를 관리하는 핵심 계층으로, 세션/전역 스코프 경로 해석, 상태 읽기/쓰기/삭제, 전환 규칙 적용, canonical skill 상태 동기화를 담당한다.
- 주요기능:
  - 상태 연산 라우팅: `state_read`, `state_write`, `state_clear`, `state_list_active`, `state_get_status`를 단일 진입점에서 처리
  - 스코프 경로 관리: 세션 우선 읽기 규칙과 전역/세션 동시 쓰기 규칙을 일관되게 적용
  - 워크플로우 전환 조정: 허용/거부/자동완료 규칙을 평가하고 파일 상태를 reconcile
  - canonical 스킬 동기화: `skill-active-state.json`을 single source of truth로 유지
  - 런타임 컨텍스트 보강: 활성화 시 tmux pane/window 메타데이터를 상태에 주입
  - 동시성/내구성 보장: 경로 단위 write lock과 atomic write로 상태 파일 손상을 방지

## 2. 책임과 경계
- 책임:
  - 상태 파일 경로 검증 및 스코프 결정(전역/세션)을 수행한다.
  - 모드 상태 JSON 병합, 계약 필드 정규화, run outcome 계약 적용을 수행한다.
  - tracked workflow 모드 전환 충돌을 감지하고 자동완료를 실행한다.
  - mode 상태와 canonical skill 상태의 정합성을 유지한다.
- 비책임:
  - Renderer 화면 반영, IPC 이벤트 송신, 도메인 비즈니스 로직 실행은 담당하지 않는다.
- 경계:
  - state는 파일 기반 상태 저장소 계층이며, 호출 진입은 MCP/IPC 상위 계층에서만 수행한다.
  - 경로 계산의 실제 구현은 `mcp/state-paths`에 위임하고 state 모듈은 오케스트레이션에 집중한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스 (공개 API):
  - `executeStateOperation(name, rawArgs)`
  - `listActiveStateModes(workingDirectory?, explicitSessionId?)`
  - `listStateStatuses(cwd, explicitSessionId?, mode?, options?)`
- 지원 명령:
  - `state_read`, `state_write`, `state_clear`, `state_list_active`, `state_get_status`
- 내부 인터페이스 (모듈 결합점):
  - `paths.ts`: `resolveStateScope`, `getReadScopedStatePaths`, `getStatePath`, `validateSessionId`
  - `workflow-transition.ts`: `evaluateWorkflowTransition`, `assertWorkflowTransitionAllowed`
  - `workflow-transition-reconcile.ts`: `reconcileWorkflowTransition`
  - `skill-active.ts`: `syncCanonicalSkillStateForMode`, `readVisibleSkillActiveState`
  - `mode-state-context.ts`: `withModeRuntimeContext`

## 4. 데이터 구조와 계약
- 상태 파일 기본 계약:
  - mode 상태: `{ active?: boolean, current_phase?: string, updated_at?: string, ... }`
  - canonical skill 상태: `{ active_skills?: SkillActiveEntry[], skill?: string, phase?: string, ... }`
- skill entry 계약:
  - `{ skill: string, active?: boolean, phase?: string, activated_at?: string, session_id?: string, thread_id?: string, turn_id?: string }`
- 스코프 경로 계약:
  - 전역: `.omx/state/{mode}-state.json`, `.omx/state/skill-active-state.json`
  - 세션: `.omx/state/sessions/{sessionId}/{mode}-state.json`, `.omx/state/sessions/{sessionId}/skill-active-state.json`
- write 계약:
  - `state_write`는 기존 JSON과 입력 payload를 병합하되 계약상 제거 필드(`run_outcome` 등)를 정리 후 재계산한다.
  - `ralph` complete 상태는 감사 증거 게이트를 통과해야 한다.
- clear 계약:
  - 세션 스코프 clear 시 전역 상태가 존재하면 세션 파일에 cleared 상태를 기록해 상위 상태를 오염시키지 않는다.

## 5. 상태 전이와 불변식
- 워크플로우 전이 상태:
  - allow: 빈 활성 집합 또는 동일 모드 재활성
  - overlap: 허용 오버랩 쌍(예: `ralph|team`) 또는 `ultrawork` 특례
  - auto-complete: 전환 테이블에 정의된 모드 자동 완료 후 요청 모드 활성
  - deny: 롤백 금지/미허용 오버랩/정책 위반
- 파일 상태 전이:
  - write 시작 -> lock 획득 -> 병합/검증 -> atomic write -> canonical sync -> lock 해제
- 불변식:
  - 동일 파일 경로에 대한 write는 직렬화된다.
  - atomic write는 tmp 파일 생성 후 rename 완료 시점에만 상태를 교체한다.
  - canonical skill 상태는 활성 모드 집합과 일관되어야 한다.
  - 세션 읽기 요청 시 세션 파일이 없으면 전역 파일을 암묵 상속하지 않는다.

## 6. 핵심 시퀀스
- 상태 쓰기 시퀀스 (`state_write`):
  1. 호출 인자 검증 및 스코프 결정(`resolveStateScope`)
  2. 상태 디렉터리 초기화 및 필요 시 환경 컨텍스트 준비
  3. 경로별 write lock 획득
  4. 기존 파일 읽기 + payload 병합 + 계약 필드 정리
  5. 모드별 검증(`ralph` phase 게이트, workflow transition reconcile)
  6. `withModeRuntimeContext`로 tmux 메타 주입
  7. `writeAtomicFile` 수행
  8. `syncCanonicalSkillStateForMode`로 canonical 상태 동기화
- 전환 reconcile 시퀀스:
  1. 현재 visible tracked 모드 집합 계산
  2. `evaluateWorkflowTransition`으로 전환 결정
  3. auto-complete 모드별 상태를 `active=false`, `current_phase=completed`로 패치
  4. 완료된 모드들의 canonical skill 항목 비활성화
  5. 최종 전환 결정/메시지 반환
- 상태 읽기 시퀀스 (`state_read`):
  1. readable mode 검증
  2. 세션 우선 경로 목록 계산
  3. 첫 존재 경로의 JSON 파싱 후 반환

## 7. 오류 처리 및 복구
- 입력/경로 오류:
  - invalid mode, invalid sessionId, path traversal 의심 입력은 즉시 거부한다.
- JSON 파싱/쓰기 오류:
  - 파일 손상 또는 파싱 실패 시 명시적 오류를 반환하고 기존 파일을 덮어쓰지 않는다.
- 전환 정책 오류:
  - deny 결정 시 예외를 발생시켜 불법 전이를 차단한다.
- atomic write 실패:
  - tmp 파일 정리 시도 후 실패 원인을 상위로 전파한다.
- 교착/경합 완화:
  - 경로별 Promise queue를 사용해 동일 파일 write 충돌을 직렬화한다.

## 8. 보안/성능 고려
- 보안:
  - mode/session 식별자 검증으로 경로 조작(path traversal) 공격을 방지한다.
  - 세션 간 상속 시 민감/소유권 필드(`owner_*_session_id`, `input_lock` 등)를 sanitize해 교차 오염을 막는다.
  - 상태 파일 접근은 작업 디렉터리 기준 상대 범위를 벗어나지 않는다.
- 성능:
  - read 경로는 우선순위 목록에서 최초 존재 파일만 읽어 I/O를 최소화한다.
  - write는 경로 단위 직렬화로 race를 줄이되, 서로 다른 파일은 병렬 가능하다.
  - canonical 동기화는 필요한 모드에 한해 수행해 불필요한 파일 쓰기를 줄인다.

## 9. 테스트 케이스 맵
- 단위:
  - `workflow-transition`의 allow/overlap/auto-complete/deny 규칙
  - `mode-state-context`의 tmux pane/window 캡처 조건
  - `skill-active` 정규화 및 세션 스코프 가시성 규칙
- 통합:
  - `state_write` -> transition reconcile -> canonical sync end-to-end
  - 세션/전역 clear 동작 차이 및 all_sessions 처리
  - path traversal 방어 및 invalid input 거부
- 회귀:
  - 동일 경로 동시 쓰기 시 파일 손상/순서 역전 방지
  - complete 상태에서 ralph 감사 게이트 누락 방지

## 10. 오픈 이슈
- 모드별 상태 스키마를 JSON Schema로 외부화해 검증/문서화를 자동화할지 결정 필요
- canonical skill 상태의 루트/세션 동시 쓰기 전략에 대한 충돌 해결 우선순위 문서화 필요
- 대규모 세션 수에서 `state_list_active` 성능(디렉터리 스캔 비용) 측정 및 최적화 필요
