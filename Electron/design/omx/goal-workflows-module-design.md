# OMX Goal-Workflows 모듈 개별 설계서

## 0. 문서 정보
- 모듈: goal-workflows
- 기준 분석 문서: Electron/analysis/goal-workflows-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 목표 기반 워크플로우 런의 상태 저장, 완료 검증, 핸드오프 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: GoalWorkflowRun 상태, validation guard, handoff 메시지 스키마 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: goal-workflows 모듈은 ralph, ralplan, ultrawork 같은 목표 기반 워크플로우의 실행 상태를 .omx/goals 아래에 영속화하고, 완료 전 검증을 강제하며, 다음 에이전트나 세션으로 넘길 핸드오프 메시지를 생성한다.
- 주요기능:
  - 목표 런 생성: workflow/slug 단위 status.json과 ledger.jsonl 생성
  - 상태 전환 관리: pending, in_progress, validation_passed, blocked, failed, complete 전환 제어
  - 완료 가드: validation evidence와 artifactPath가 없으면 완료 차단
  - 핸드오프 생성: 상태, 아티팩트 위치, completion command를 포함한 텍스트 생성

## 2. 책임과 경계
- 책임:
  - 목표 워크플로우 단위 durable artifact directory와 ledger를 유지
  - validation 결과를 표준 상태로 정규화하고 placeholder evidence를 차단
  - completion 전제 조건을 강제해 거짓 완료를 방지
  - Codex goal snapshot과 handoff 메시지를 연결 가능한 형식으로 제공
- 비책임:
  - 실제 워크플로우 실행 자체, 팀 orchestration, planning artifact 생성은 담당하지 않는다.
- 경계:
  - goal-workflows는 목표 상태 원장 계층이며, 실행 엔진은 상위 워크플로우가 담당하고 이 모듈은 완료 증거와 handoff만 관리한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - createGoalWorkflowRun(cwd, options)
  - readGoalWorkflowRun(cwd, workflow, slug)
  - transitionGoalWorkflowRun(cwd, workflow, slug, options)
  - appendGoalWorkflowLedger(cwd, run, entry)
  - normalizeGoalWorkflowValidation(input)
  - assertGoalWorkflowCanComplete(validation)
  - buildGoalWorkflowHandoff(options)
- 내부 인터페이스:
  - goalWorkflowDir/statusPath/ledgerPath 경로 유틸
  - slugFromObjective/normalizeGoalWorkflowSegment
  - codex-goal-snapshot 파싱 및 정합성 검증 유틸
- 호출자:
  - ralph, ralplan, ultrawork 등 목표 기반 실행 모드
  - 서브에이전트 handoff 생성 경로

## 4. 데이터 구조와 계약
- 주요 타입:
  - GoalWorkflowStatus: pending, in_progress, validation_passed, blocked, failed, complete
  - GoalWorkflowRun: version, workflow, slug, objective, status, artifactDir, statusPath, ledgerPath, metadata, validation, evidence
  - GoalWorkflowLedgerEntry: ts, event, status, message, evidence, validation, metadata
  - GoalWorkflowValidationInput / GoalWorkflowValidationSummary
- 계약 원칙:
  - status.json은 단일 workflow/slug 런의 최신 상태 단일 소스다.
  - ledger.jsonl은 상태 전환과 주요 이벤트의 append-only 감사 로그다.
  - complete 전환은 반드시 validation_passed를 선행 상태로 요구한다.
  - validation summary에는 placeholder 문구(todo, tbd, placeholder, stub, not implemented, fake pass)를 허용하지 않는다.

## 5. 상태 전이와 불변식
- 목표 런 상태 전이:
  - pending -> in_progress
  - in_progress -> validation_passed | blocked | failed
  - validation_passed -> complete
- 불변식:
  - createGoalWorkflowRun은 force 없이는 기존 런을 덮어쓰지 않는다.
  - complete 상태 진입 전 assertGoalWorkflowCanComplete를 반드시 통과해야 한다.
  - blocked와 failed는 완료 전 증거 부족 또는 실행 실패를 구분하는 terminal 상태다.
  - artifactDir/statusPath/ledgerPath는 동일 workflow/slug 경로를 기준으로 일관되게 계산된다.

## 6. 핵심 시퀀스
- 목표 런 생성 시퀀스:
  1. objective에서 slug를 계산하거나 옵션 slug를 사용
  2. .omx/goals/{workflow}/{slug}/ 디렉터리를 생성
  3. status.json을 pending으로 저장
  4. ledger.jsonl에 workflow_created 이벤트를 기록
- 검증 및 완료 시퀀스:
  1. 실행 모드가 validation input을 생성
  2. normalizeGoalWorkflowValidation이 상태를 validation_passed/blocked/failed로 정규화
  3. transitionGoalWorkflowRun이 ledger와 status.json을 함께 갱신
  4. complete 요청 시 validation artifact path와 summary를 재검증 후 goal_completed 기록
- handoff 시퀀스:
  1. 현재 run 상태와 아티팩트 경로를 읽음
  2. title, tokenBudget, completionCommand 옵션을 반영
  3. 후속 에이전트용 텍스트 메시지를 생성

## 7. 오류 처리 및 복구
- 중복 생성:
  - 기존 status.json 존재 시 force 없으면 예외 반환
- 잘못된 validation:
  - summary 공백, artifactPath 부재, placeholder evidence는 completion 차단 예외로 처리
- 상태 불일치:
  - complete 요청 시 현재 상태가 validation_passed가 아니면 즉시 거부
- snapshot 정합성 문제:
  - codex-goal-snapshot 파싱 오류는 handoff나 목표 상태 저장과 분리해 처리 필요

## 8. 보안/성능 고려
- 보안:
  - handoff 메시지에는 필요한 경로와 요약만 포함하고 과도한 내부 상태를 노출하지 않는다.
  - validation evidence는 실제 검증 산출물 경로를 요구해 임의 문자열 완료를 막는다.
- 성능:
  - status.json 단일 읽기와 ledger append-only 구조로 상태 조회 비용을 최소화
  - slug 정규화로 경로 폭주와 파일명 불안정을 방지

## 9. 테스트 케이스 맵
- 단위:
  - slug 생성과 segment 정규화
  - validation 입력 정규화와 placeholder 탐지
  - complete guard 예외 조건
- 통합:
  - create -> in_progress -> validation_passed -> complete 전이
  - ledger event/status 매핑 검증
  - handoff 메시지 렌더링과 artifact path 포함 여부
- 회귀:
  - force 없는 중복 생성 차단
  - validation_passed 없이 complete 진입 방지
  - fake pass/todo 증거로 완료되는 회귀 방지

## 10. 오픈 이슈
- goal workflow별 metadata 스키마 표준화가 필요
- blocked와 failed의 운영상 의미 차이를 사용자 문서에 더 명확히 반영할 필요가 있음
- codex goal snapshot과 handoff 템플릿의 버전 호환성 정책 정리가 필요
