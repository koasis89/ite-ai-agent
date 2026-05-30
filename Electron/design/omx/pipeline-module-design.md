# OMX Pipeline 모듈 개별 설계서

## 0. 문서 정보
- 모듈: pipeline
- 기준 분석 문서: Electron/analysis/pipeline-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: Autopilot 파이프라인의 단계 계약, 품질 루프, 재개 규칙을 명확히 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: stage 구성, review loop, state extension 계약 변경 시 3, 4, 5, 6장을 우선 갱신

## 1. 개요와 주요기능
- 개요: pipeline 모듈은 OMX Autopilot 실행 계층으로, deep-interview부터 ultraqa까지의 단계를 순차 실행하고 각 단계 결과를 누적해 다음 단계에 전달한다.
- 주요기능:
  - 단계 오케스트레이션: runPipeline으로 스테이지를 순서대로 실행
  - 상태 영속화: ModeState 확장 필드에 현재 단계, 결과, 리뷰 루프 상태를 저장
  - 재개/취소 지원: 파이프라인 상태 조회와 취소 경로 제공
  - 품질 루프 제어: code-review 또는 ultraqa 비클린 판정 시 ralplan으로 복귀

## 2. 책임과 경계
- 책임:
  - PipelineConfig 유효성 검증과 stage 순서 실행
  - handoff artifacts와 review verdict를 누적해 후속 단계에 전달
  - non-clean verdict를 해석해 review cycle 제한 내에서 재계획 루프를 제어
- 비책임:
  - 개별 스테이지의 실제 에이전트 실행 구현 세부, UI 렌더링, 외부 프로세스 실행은 담당하지 않는다.
- 경계:
  - pipeline은 단계 흐름 제어 계층이며, 계획 파일 I/O는 planning, 팀 실행은 team, 사용자 질문은 question 모듈에 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - runPipeline(config)
  - canResumePipeline(cwd?)
  - readPipelineState(cwd?)
  - cancelPipeline(cwd?)
  - createAutopilotPipelineConfig(task, options)
  - createStrictAutopilotStages()
- 내부 인터페이스:
  - PipelineStage 계약: name, run(ctx), 선택적 canSkip(ctx)
  - review-verdict 해석 함수
  - stages 하위 팩토리(createDeepInterviewStage, createRalplanStage, createTeamExecStage 등)
- 호출자:
  - autopilot/ralph 계열 워크플로우, 상위 실행 오케스트레이터, 재개 판단 로직

## 4. 데이터 구조와 계약
- 주요 타입:
  - StageContext: task, cwd, sessionId, artifacts, pipeline state extension 등 단계 컨텍스트
  - StageResult: status(completed, failed, skipped), artifacts, duration_ms, diagnostics
  - PipelineConfig: name, task, stages[], maxRalphIterations, callbacks
  - PipelineResult: status, stageResults, artifacts, failedStage
  - PipelineModeStateExtension: pipeline_stages, pipeline_stage_index, pipeline_stage_results, review_cycle, review_verdict, qa_verdict, return_to_ralplan_reason, handoff_artifacts
- 계약 원칙:
  - stage 이름은 중복되면 안 된다.
  - handoff_artifacts는 단계 이름을 정규화한 키로 저장한다.
  - review cycle은 maxRalphIterations를 초과할 수 없다.
  - canSkip는 실행 생략의 근거를 artifacts 또는 파일 증거로 설명 가능해야 한다.

## 5. 상태 전이와 불변식
- 파이프라인 상태 전이:
  - initialized -> running(stage n) -> completed | failed | cancelled
- 품질 루프 전이:
  - code-review non-clean -> review_cycle++ -> ralplan 복귀
  - ultraqa non-clean -> review_cycle++ -> ralplan 복귀
  - review_cycle 초과 -> failed
- 불변식:
  - current stage index는 pipeline_stages 배열 범위를 벗어나지 않는다.
  - skipped stage도 stageResults에 기록된다.
  - failed stage 발생 시 이후 stage는 실행하지 않는다.
  - review_verdict와 qa_verdict는 최신 판정값만 유지하되, 복귀 사유는 return_to_ralplan_reason에 별도 보존한다.

## 6. 핵심 시퀀스
- 기본 Autopilot 시퀀스:
  1. createAutopilotPipelineConfig가 기본 5단계를 구성
  2. runPipeline이 설정 유효성을 검증하고 mode state를 초기화
  3. 각 stage에 대해 canSkip를 확인하고 필요 시 run(ctx)를 호출
  4. stage artifacts를 누적 병합해 다음 단계 컨텍스트에 반영
  5. code-review 또는 ultraqa 결과를 검사해 non-clean이면 ralplan 인덱스로 복귀
  6. 모든 단계 성공 시 complete 상태로 종료
- 재개 시퀀스:
  1. canResumePipeline/readPipelineState가 기존 mode state를 조회
  2. pipeline_stage_index와 stage_results를 복원
  3. 미완료 단계부터 재실행하거나 취소 처리

## 7. 오류 처리 및 복구
- 설정 오류:
  - 빈 이름, 중복 stage, 음수 반복 횟수는 validateConfig 단계에서 즉시 차단
- stage 실패:
  - failed 결과를 반환하고 failedStage를 명시해 상위 계층이 재시도 여부를 결정
- 비클린 판정:
  - verdict 구조를 review-verdict 헬퍼로 해석해 ralplan 복귀 사유를 표준화
- 영속화 오류:
  - mode state 갱신 실패 시 실행 결과와 상태 파일의 불일치 가능성을 운영 이슈로 기록

## 8. 보안/성능 고려
- 보안:
  - stage artifacts에는 민감 정보 원문을 최소화하고 경로/요약 중심으로 저장
  - approved execution이나 team 실행 지시문은 planning 모듈의 승인 증거를 통해서만 주입
- 성능:
  - artifacts 병합은 필요한 키만 유지해 상태 파일 비대화를 억제
  - canSkip를 활용해 이미 승인된 planning 산출물과 consensus evidence가 있으면 불필요한 재실행을 방지

## 9. 테스트 케이스 맵
- 단위:
  - validateConfig 중복 stage/반복 횟수 검증
  - review-verdict 비클린 판정 해석
  - handoff artifact 키 정규화
- 통합:
  - orchestrator의 stage 순차 실행과 skip 경로
  - code-review/ultraqa 비클린 시 ralplan 복귀
  - cancelPipeline/readPipelineState 재개 흐름
- 회귀:
  - review_cycle 초과 시 failed 전환
  - skipped/failed stage 결과 누락 방지

## 10. 오픈 이슈
- pipeline mode state 필드를 공통 상태 스키마 문서에 외부화할지 결정 필요
- verdict 객체 표준 스키마를 code-review와 ultraqa 사이에서 더 강하게 통일할 필요가 있음
- 장기 실행 파이프라인에서 artifacts 누적 크기 상한 정책 정의가 필요
