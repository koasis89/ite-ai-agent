# OMX Team 모듈 개별 설계서

## 0. 문서 정보
- 모듈: team
- 기준 분석 문서: Electron/analysis/team-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 멀티에이전트 팀 오케스트레이션의 상태 기계, 런타임 루프, 워커 운영 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: phase 전환, team state schema, tmux/worktree/bootstrap 정책 변경 시 3, 4, 5, 6장을 우선 갱신

## 1. 개요와 주요기능
- 개요: team 모듈은 리더와 복수의 워커 에이전트를 tmux 패인과 파일 상태 저장소 위에서 조율해 하나의 팀 목표를 수행하게 하는 멀티에이전트 오케스트레이션 계층이다.
- 주요기능:
  - 팀 상태 기계 관리: team-plan부터 team-verify/team-fix까지 phase 전환 제어
  - 워커 생명주기 운영: tmux 세션, worktree, bootstrap, scaling 관리
  - 태스크 배분/재조정: claim, allocation, rebalance, delegation 정책 제공
  - 통신/감시: dispatch, mailbox, 이벤트 로그, progress evidence, idle nudge 제공

## 2. 책임과 경계
- 책임:
  - 팀 상태 디렉터리와 JSON 파일을 통해 durable team runtime을 제공
  - 워커별 작업 공간, 역할, 실행 스펙, 통신 경로를 초기화/감시/종료
  - 팀 phase 전환 규칙과 fix loop 제한을 일관되게 적용
  - MCP aligned gateway(team-ops)를 통해 상위 모듈과 상태 계층을 연결
- 비책임:
  - 개별 워커 내부의 코딩/검토 내용 생성, planning 문서 해석, 사용자 질문 UI는 직접 담당하지 않는다.
- 경계:
  - team은 멀티에이전트 실행 계층이며, planning 승인 힌트와 goal workflow 지시를 받아 실제 팀 런타임으로 변환한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - startTeam(config)
  - monitorTeam(...)
  - shutdownTeam(...)
  - runtime-cli 진입점(JSON 입출력)
  - team-ops gateway(teamInit, teamCreateTask, teamClaimTask 등)
  - approved execution binding 및 ultragoal team context API
- 내부 인터페이스:
  - contracts.ts 상태 전환 규칙
  - orchestrator.ts와 phase-controller.ts
  - state/ 하위 CRUD, locks, approvals, events, summary
  - tmux-session.ts, worker-bootstrap.ts, worktree.ts, scaling.ts
  - allocation-policy.ts, rebalance-policy.ts, delegation-policy.ts, role-router.ts
- 호출자:
  - pipeline stages(team-exec), CLI team 명령, approved execution 경로, 운영 복구/cleanup 루프

## 4. 데이터 구조와 계약
- 주요 타입:
  - TeamState: active, phase, phase_transitions, max_fix_attempts, current_fix_attempt
  - TeamConfig: name, task, agent_type, worker_count, max_workers, workers, tmux_session, leader_pane_id, workspace_mode
  - WorkerInfo: name, index, role, assigned_tasks, worker_cli, worktree_path, worktree_branch
  - TeamTask: id, subject, description, status, owner, claim, depends_on, blocked_by, delegation, version
  - TeamTaskClaim: owner, token, leased_until
  - TeamDispatchRequest / TeamMailboxMessage / TeamEventType
- 계약 원칙:
  - task status와 dispatch status는 contracts.ts 허용 전환 규칙만 따른다.
  - task claim은 파일 잠금 내 원자적으로 획득/해제된다.
  - wakeable event는 monitor/runtime 대기 해제의 유일한 기준 집합이다.
  - team-ops는 state persistence의 MCP aligned public surface로 유지한다.

## 5. 상태 전이와 불변식
- 팀 phase 전이:
  - team-plan -> team-prd -> team-exec -> team-verify -> complete
  - team-verify -> team-fix -> team-exec 재진입 가능
  - fix attempt 초과 시 failed
  - 어디서든 cancelled 가능
- 태스크 상태 전이:
  - pending -> in_progress -> completed | failed
  - blocked -> in_progress -> completed | failed
- 워커 통합 상태 전이:
  - idle -> integrated | integration_failed | cherry_pick_conflict | rebase_conflict
- 불변식:
  - terminal team phase에서는 추가 phase 전환을 허용하지 않는다.
  - claim token은 단일 task에 대한 유효 소유권을 나타내며 만료 전 중복 소유를 허용하지 않는다.
  - worktree 모드에서는 워커별 branch/path 메타데이터가 config와 실제 작업공간에 함께 존재해야 한다.
  - delivery log와 events는 배달/상태 변경의 감사 추적을 남긴다.

## 6. 핵심 시퀀스
- 팀 시작 시퀀스:
  1. startTeam이 team state와 config를 초기화
  2. tmux 세션과 leader/worker 패인을 생성
  3. worker-bootstrap이 AGENTS.md 오버레이와 초기 inbox를 준비
  4. worktree/scaling 정책에 따라 워커 작업 공간을 할당
  5. runtime 루프가 이벤트와 태스크 readiness를 감시하며 dispatch 수행
- 태스크 할당 시퀀스:
  1. allocation-policy가 점수 기반 후보를 계산
  2. claimTask가 잠금 내 소유권을 확보
  3. dispatch가 inbox/mailbox/nudge 요청을 기록하고 전달
  4. 완료/실패 이벤트가 phase-controller와 summary 집계에 반영
- 종료 시퀀스:
  1. shutdown 요청 기록
  2. 워커 ACK/정리 수집
  3. dirty worktree와 상태 경로 요약을 포함한 shutdown summary 반환

## 7. 오류 처리 및 복구
- tmux/worktree 생성 실패:
  - integration_failed 또는 conflict 상태로 기록하고 운영자에게 복구 포인트 제공
- claim 충돌:
  - 만료 클레임 재확보와 더블 체크 readiness로 중복 배정 방지
- 배달 실패:
  - dispatch request를 failed로 전환하고 mailbox/bridge fallback을 사용
- phase 루프 초과:
  - max_fix_attempts 초과 시 failed로 강제 종료해 무한 루프를 방지

## 8. 보안/성능 고려
- 보안:
  - 워커 bootstrap 지시와 goal instruction에는 허용된 역할 프롬프트만 주입한다.
  - worktree 및 commit hygiene는 메인 브랜치 오염과 충돌을 최소화해야 한다.
- 성능:
  - wakeable event 기반 대기로 busy loop를 줄인다.
  - rebalance/scaling은 유휴 워커 활용률을 높이되 과도한 worktree 생성 비용을 제어해야 한다.

## 9. 테스트 케이스 맵
- 단위:
  - phase transition 규칙과 fix loop 제한
  - allocation/rebalance/delegation 정책 계산
  - claim/dispatch/mailbox 정규화와 잠금
- 통합:
  - startTeam -> monitorTeam -> shutdownTeam 전체 런타임 흐름
  - worktree bootstrap과 worker integration 상태 반영
  - approved execution binding에서 team runtime 진입
- 회귀:
  - expired claim 재확보와 중복 소유 방지
  - terminal phase 이후 추가 전환 차단
  - dispatch delivery/event 감사 로그 누락 방지

## 10. 오픈 이슈
- phase/state/event 스키마를 별도 canonical 팀 운영 문서로 분리할지 검토 필요
- tmux 의존성이 없는 대체 런타임 경로의 지원 범위를 정의할 필요가 있음
- 대규모 팀에서 worktree/scaling 비용 상한과 정리 정책을 세분화할 필요가 있음
