# OMX Performance Goal 모듈 개별 설계서

## 0. 문서 정보
- 모듈: performance-goal
- 기준 분석 문서: Electron/analysis/performance-goal-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 성능 목표 워크플로우의 상태, 평가자, Codex Goal 동기화 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: state schema, ledger events, evaluator contract, Codex Goal reconciliation 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: performance-goal 모듈은 성능 개선 목표를 생성하고 평가자 결과와 Codex Goal 스냅샷을 함께 검증하여 완료시키는 단일 파일 워크플로우 서브시스템이다.
- 주요기능:
  - 목표 생성: state.json, ledger.jsonl, evaluator.md 초기화
  - 목표 시작: created -> in_progress 전환과 instruction 생성
  - 체크포인트: pass/fail/blocked 결과 기록
  - 완료: 평가자 통과와 Codex Goal 재조정 통과를 동시에 요구

## 2. 책임과 경계
- 책임:
  - 성능 목표의 상태와 이력을 durable artifact로 유지
  - 평가자 명령과 계약을 명시적으로 보존
  - Codex Goal 상태와 performance goal 상태를 일치시킨다.
- 비책임:
  - 실제 최적화 코드나 성능 측정 도구 구현은 담당하지 않는다.
- 경계:
  - performance-goal은 목표 관리 계층이며, 코드 변경과 측정은 외부 agent/evaluator가 수행한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - createPerformanceGoal(cwd, options)
  - readPerformanceGoal(cwd, slug)
  - startPerformanceGoal(cwd, slug)
  - checkpointPerformanceGoal(cwd, options)
  - completePerformanceGoal(cwd, options)
  - buildPerformanceGoalInstruction(state)
  - workflowDir(cwd, slug)
- 내부 인터페이스:
  - slugify, repoRelative, writeState, appendLedger, evaluatorMarkdown
  - codex-goal-snapshot reconciliation helpers
- 호출자:
  - omx performance-goal CLI, goal orchestrators, validation workflows

## 4. 데이터 구조와 계약
- 주요 타입:
  - PerformanceGoalStatus: created, in_progress, validation_passed, validation_failed, blocked, complete
  - PerformanceValidationStatus: pass, fail, blocked
  - PerformanceGoalState: version, workflow, slug, objective, status, evaluator, lastValidation, artifactPaths
  - PerformanceGoalLedgerEntry: event, status, validationStatus, evidence, message
- 계약 원칙:
  - objective와 evaluator contract는 생성 시 필수다.
  - ledger.jsonl은 append-only다.
  - complete는 lastValidation.pass와 Codex Goal reconciliation 둘 다 필요하다.
  - slug는 URL-safe 식별자로 안정화해야 한다.

## 5. 상태 전이와 불변식
- 목표 상태 전이:
  - created -> in_progress -> validation_passed -> complete
  - created/in_progress -> validation_failed | blocked
- 불변식:
  - complete 상태에서는 추가 checkpoint를 기록할 수 없다.
  - evaluator.md는 목표의 계약 문서로 항상 생성되어야 한다.
  - Codex Goal 스냅샷이 불일치하면 complete를 거부해야 한다.

## 6. 핵심 시퀀스
- 생성 시퀀스:
  1. objective/evaluator 검증
  2. slug 계산 및 디렉터리 생성
  3. state.json/evaluator.md/ledger.jsonl 초기화
  4. workflow_created 이벤트 기록
- 시작 시퀀스:
  1. state 읽기
  2. created이면 in_progress로 전환
  3. instruction 텍스트 생성
  4. goal_handoff_emitted 기록
- 완료 시퀀스:
  1. 마지막 validation이 pass인지 확인
  2. Codex Goal snapshot 파싱/재조정
  3. complete 상태 갱신
  4. goal_completed 기록

## 7. 오류 처리 및 복구
- 입력 누락:
  - objective, evaluator command/contract 공백은 즉시 거부한다.
- 이미 complete:
  - checkpoint/complete 반복 호출은 오류로 처리한다.
- 스냅샷 불일치:
  - reconcile 실패 시 완료를 거부한다.
- 파일 쓰기 실패:
  - 상태와 원장 갱신의 불일치를 최소화하도록 순서를 유지한다.

## 8. 보안/성능 고려
- 보안:
  - validation evidence는 실제 산출물 경로를 요구해야 한다.
  - handoff 텍스트는 필요한 정보만 포함해야 한다.
- 성능:
  - 단일 상태 디렉터리와 append-only ledger로 관리 비용을 낮춘다.
  - slug와 repo-relative 경로를 사용해 이동성을 확보한다.

## 9. 테스트 케이스 맵
- 단위:
  - slugify and repoRelative
  - validation normalization and guard
  - completion precondition checks
- 통합:
  - create/start/checkpoint/complete lifecycle
  - Codex Goal reconciliation
- 회귀:
  - complete 후 checkpoint 차단
  - fake pass evidence 차단

## 10. 오픈 이슈
- evaluator contract와 측정 지표를 더 엄격히 분리할 필요가 있음
- Codex Goal API와의 통합 문서 버전 호환성 기준이 필요함
- workflow별 metadata 확장 정책을 정리할 필요가 있음
