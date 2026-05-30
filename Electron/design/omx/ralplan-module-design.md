# OMX Ralplan 모듈 개별 설계서

## 0. 문서 정보
- 모듈: ralplan
- 기준 분석 문서: Electron/analysis/ralplan-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: Ralplan 합의 루프의 리뷰 순서, 합의 게이트, 완료 조건을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: consensus gate 규칙, review verdict, planning complete 조건 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: ralplan 모듈은 architect와 critic의 순차 승인에 기반한 합의 계획 워크플로를 실행하고, 영속 상태나 artifacts에서 합의 증거를 재구성하는 계층이다.
- 주요기능:
  - 합의 루프 실행: draft -> architect-review -> critic-review 반복 실행
  - 합의 게이트 평가: 양쪽 리뷰 승인과 순서 정합성을 확인
  - planning complete 검증: PRD와 test-spec 존재 여부를 완료 조건에 결합
  - durable evidence 탐색: state file과 stage artifacts에서 합의 증거를 읽어 재사용

## 2. 책임과 경계
- 책임:
  - RalplanConsensusExecutor 계약에 따라 세 단계 실행을 순차 제어
  - architect 승인 전 critic 승인 완료를 허용하지 않는 순서 게이트 유지
  - 합의 게이트 완료와 planning artifact 준비 완료를 함께 충족시켜야 handoff 가능하도록 강제
- 비책임:
  - PRD 문서 생성 세부 구현 자체, team 실행, 사용자 질문 렌더링은 담당하지 않는다.
- 경계:
  - ralplan은 합의 검증 계층이며, 실제 문서 파일 읽기는 planning, 상위 파이프라인 복귀는 pipeline 모듈이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - runRalplanConsensus(executor, options)
  - cancelRalplanConsensus(cwd?)
  - buildRalplanConsensusGateFromSources(sources)
  - buildRalplanConsensusGateForCwd(cwd, options)
  - hasDurableRalplanConsensusEvidenceForCwd(cwd, options)
  - readLocalRalplanConsensusStateCandidates(cwd, sessionId?)
- 내부 인터페이스:
  - RalplanConsensusExecutor: draft, architectReview, criticReview
  - planning.readPlanningArtifacts / isPlanningComplete
  - modes/base 상태 업데이트와 cancelMode
- 호출자:
  - pipeline/stages/ralplan, CLI ralplan 명령, planning consensus 검사 루틴

## 4. 데이터 구조와 계약
- 주요 타입:
  - RalplanDraftResult: summary, planPath, artifacts
  - RalplanReviewResult: verdict, summary, artifacts
  - RalplanConsensusGate: complete, architect review, critic review, blocked_reason
  - RalplanConsensusIterationContext: task, cwd, iteration, drafts, architectReviews, criticReviews
  - RalplanRuntimeResult: status, phase, planningComplete, 전체 이력, consensusGate
  - RalplanConsensusGateEvidence: complete, sequence, source, blockedReason
- 계약 원칙:
  - critic review는 architect review 승인 이후에만 의미를 가진다.
  - architectReviews.length와 criticReviews.length는 순차 승인 시점에 정합해야 한다.
  - consensus complete=true만으로는 충분하지 않고 planningComplete=true가 추가로 필요하다.
  - source 탐색은 stage-context artifacts를 우선하고, 없으면 local state 후보를 사용한다.

## 5. 상태 전이와 불변식
- 합의 루프 상태 전이:
  - draft -> architect-review -> critic-review -> complete
  - architect 또는 critic의 iterate/reject 시 iteration 증가 후 draft로 복귀
  - maxIterations 초과 시 failed
  - cancel 요청 시 cancelled
- 증거 상태 전이:
  - missing -> partial -> complete
- 불변식:
  - architect 승인 없이 critic 승인만으로 complete가 될 수 없다.
  - local state에서 읽은 evidence도 architect then critic 순서를 충족해야 한다.
  - planning artifact가 없으면 status는 completed가 될 수 없다.
  - blocked_reason은 합의 실패 원인을 단일 문자열로 남긴다.

## 6. 핵심 시퀀스
- 합의 루프 시퀀스:
  1. runRalplanConsensus가 mode state를 초기화
  2. executor.draft 실행 후 초안 결과를 누적
  3. architectReview 수행 후 approve가 아니면 iteration++ 후 draft로 복귀
  4. architect 승인 시 criticReview 수행
  5. buildRalplanConsensusGate로 양측 승인과 순서를 평가
  6. planning artifacts까지 준비되면 complete로 종료
- durable evidence 조회 시퀀스:
  1. options.artifacts와 options.artifacts.ralplan를 우선 검사
  2. 세션/프로젝트 범위 .omx/state 후보 파일을 순서대로 탐색
  3. 첫 번째 유효 sequential approval evidence를 반환

## 7. 오류 처리 및 복구
- architect 미승인 반복:
  - review limit 도달 시 paused_for_review 성격의 failed 상태로 종료
- critic 미승인 반복:
  - architect 승인 이후라도 critic 승인 누락이면 복귀 또는 한계 도달 실패 처리
- planning artifacts 누락:
  - consensus approved 이후에도 required artifact 없으면 실행 handoff를 차단
- evidence 파싱 실패:
  - 단일 source 실패 시 다음 source로 진행하고, 모두 실패하면 complete=false 반환

## 8. 보안/성능 고려
- 보안:
  - durable evidence는 승인 review 객체와 순서를 모두 확인해 위조된 partial state 수용을 방지한다.
  - handoff 전 planningComplete 검증으로 빈 계획 실행을 차단한다.
- 성능:
  - 상태 후보 탐색은 제한된 파일 집합만 읽는다.
  - 합의 게이트 추출은 첫 유효 source를 찾는 즉시 중단한다.

## 9. 테스트 케이스 맵
- 단위:
  - architect/critic approve 판정
  - blocked_reason 분기
  - source 우선순위 탐색
- 통합:
  - draft/architect/critic 반복 루프
  - maxIterations 초과 종료
  - planning artifact 누락 시 failed 처리
- 회귀:
  - critic 선승인 오판정 방지
  - artifacts와 local state 간 증거 해석 일관성 유지

## 10. 오픈 이슈
- review verdict 객체의 공통 스키마를 code-review와 더 통합할지 검토 필요
- paused_for_review와 failed의 사용자 메시지 구분 정책을 문서화할 필요가 있음
- local consensus state 파일의 canonical 위치를 상위 문서에 고정할 필요가 있음
