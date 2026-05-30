# OMX Autoresearch 모듈 개별 설계서

## 0. 문서 정보
- 모듈: autoresearch
- 기준 분석 문서: Electron/analysis/autoresearch-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 자율 실험 루프와 autoresearch-goal 생명주기의 계약, 상태 파일, 판정 로직을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: evaluator 계약, outcome 결정 로직, goal 완료 게이트 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: autoresearch 모듈은 반복 실험 기반 연구 실행과 rubric 기반 목표 완료 워크플로를 함께 제공하며, evaluator 실행 결과에 따라 후보 커밋을 유지 또는 폐기하고 목표 상태를 완료까지 관리한다.
- 주요기능:
  - 미션 계약 로딩: mission.md와 sandbox.md의 evaluator/frontmatter 검증
  - 실험 런타임 운영: worktree 준비, baseline 평가, instructions/ledger/results 관리
  - outcome 결정: keep_policy와 score/pass 결과에 따라 keep, discard, abort, noop 결정
  - goal 생명주기 관리: create, verdict 기록, Codex goal snapshot 검증 후 complete 처리

## 2. 책임과 경계
- 책임:
  - evaluator 계약과 JSON 결과 파싱을 엄격히 검증
  - 실험 루프의 manifest, ledger, candidate, latest-evaluator artifact를 관리
  - autoresearch-goal의 mission, rubric, completion, ledger를 durable 상태로 보존
  - mode state를 읽어 skill completion 상태를 판정
- 비책임:
  - 개별 에이전트의 코드 수정 내용 생성, planning 합의, sidecar 모니터링은 담당하지 않는다.
- 경계:
  - autoresearch는 연구 실행과 목표 완료 계층이며, 상위 워크플로나 외부 evaluator 스크립트에 실제 작업을 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - loadAutoresearchMissionContract(missionDir)
  - parseSandboxContract(content)
  - parseEvaluatorResult(raw)
  - prepareAutoresearchRuntime(contract, projectRoot, opts)
  - runAutoresearchEvaluator(contract, worktreePath, ...)
  - decideAutoresearchOutcome(manifest, candidate, eval)
  - advanceAutoresearchRun(contract, manifest, projectRoot)
  - createAutoresearchGoal(cwd, options)
  - recordAutoresearchGoalVerdict(cwd, options)
  - completeAutoresearchGoal(cwd, slug, options)
  - assessAutoresearchCompletionState(...)
- 내부 인터페이스:
  - modes/base startMode, updateModeState, cancelMode, readModeState
  - goal-workflows/codex-goal-snapshot 보조 함수
  - git worktree 및 evaluator child_process 실행
- 호출자:
  - omx autoresearch, autoresearch-goal CLI 명령, skill validation 훅

## 4. 데이터 구조와 계약
- 주요 타입:
  - AutoresearchMissionContract: missionDir, repoRoot, missionContent, sandbox, missionSlug
  - AutoresearchEvaluatorContract: command, format=json, keep_policy
  - AutoresearchEvaluatorResult: pass, score?
  - AutoresearchRunManifest: run_id, worktree_path, baseline_commit, last_kept_commit, evaluator, keep_policy, status, iteration
  - AutoresearchCandidateArtifact: status, candidate_commit, base_commit, description, notes
  - AutoresearchEvaluationRecord: command, status, pass, score, exit_code, stdout, stderr
  - AutoresearchGoalMission / AutoresearchGoalCompletion
- 계약 원칙:
  - sandbox.md는 YAML frontmatter로 시작해야 하며 evaluator.command와 format=json이 필수다.
  - keep_policy가 score_improvement이면 score가 없을 때 ambiguous로 처리한다.
  - autoresearch-goal complete는 completion.passed=true와 Codex Goal snapshot 일치가 모두 필요하다.
  - skill validation은 validation_mode에 따라 mission-validator-script 또는 prompt-architect-artifact 규칙을 적용한다.

## 5. 상태 전이와 불변식
- 실험 런 상태 전이:
  - baseline -> keep | discard | ambiguous | noop | abort | interrupted | error
  - keep 시 last_kept_commit 갱신, discard/ambiguous 시 worktree reset
- goal 상태 전이:
  - created -> in_progress -> passed | failed | blocked -> complete
- 불변식:
  - evaluator.format은 v1에서 json만 허용한다.
  - run manifest는 baseline_commit과 last_kept_commit을 항상 유지해야 한다.
  - completeAutoresearchGoal은 passed verdict 없이 호출될 수 없다.
  - mode state 부재 또는 validation_mode 부재 상태에서는 skill completion을 true로 판정하지 않는다.

## 6. 핵심 시퀀스
- 실험 루프 시퀀스:
  1. loadAutoresearchMissionContract가 mission/sandbox를 검증
  2. prepareAutoresearchRuntime이 worktree, baseline 평가, manifest 파일을 준비
  3. instructions.md를 생성하고 에이전트가 candidate.json을 기록
  4. runAutoresearchEvaluator가 evaluator.command를 실행해 JSON 결과를 파싱
  5. decideAutoresearchOutcome이 keep/discard/abort/noop를 결정
  6. 결과를 ledger/results.tsv에 기록하고 필요 시 worktree를 reset
  7. advanceAutoresearchRun이 다음 iteration 지시를 준비
- goal 완료 시퀀스:
  1. createAutoresearchGoal이 mission.json, rubric.md, ledger.jsonl을 생성
  2. recordAutoresearchGoalVerdict가 completion.json과 verdict 이벤트를 기록
  3. completeAutoresearchGoal이 Codex Goal snapshot과 completion.passed를 동시에 검증
  4. 통과 시 complete 상태와 goal_completed 이벤트 기록

## 7. 오류 처리 및 복구
- sandbox 계약 오류:
  - frontmatter 누락, evaluator 필수값 누락, 비JSON format은 즉시 예외 처리
- evaluator 실패:
  - stdout parse_error, exit_code, stderr를 평가 기록에 남기고 error 또는 discard로 처리
- score 비교 불가:
  - pass=true라도 score 없으면 ambiguous로 분류해 무분별한 keep을 차단
- goal 완료 불일치:
  - completion은 pass이나 Codex Goal snapshot이 다르면 complete를 거부

## 8. 보안/성능 고려
- 보안:
  - mission-dir은 git repository 내부여야 하며, 외부 경로는 차단한다.
  - evaluator는 선언된 command만 실행하며 결과는 JSON으로 검증한다.
- 성능:
  - results.tsv와 ledger.json으로 실험 이력을 분리해 조회/분석 비용을 낮춘다.
  - instructions에는 최근 ledger 요약만 포함해 프롬프트 비대화를 완화한다.

## 9. 테스트 케이스 맵
- 단위:
  - sandbox frontmatter 검증
  - evaluator result JSON 파싱
  - keep_policy별 outcome 판정
  - skill validation mode별 완료 판정
- 통합:
  - prepare -> evaluate -> decide -> advance 전체 실험 루프
  - autoresearch-goal create/verdict/complete 흐름
- 회귀:
  - score 없는 pass를 keep으로 오판정하지 않음
  - completion.passed만으로 complete 되지 않음
  - 레거시 objective/handoff 생성 호환성 유지

## 10. 오픈 이슈
- evaluator command sandboxing과 timeout 정책을 더 명확히 할 필요가 있음
- long-running autoresearch run의 artifact 정리 기준과 보존 기간이 필요
- goal verdict evidence와 general goal-workflows validation evidence의 통합 여부 검토 필요
