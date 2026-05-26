# `omx autoresearch` 패리티 계약

`omx autoresearch`은 반복당 하나의 Codex 실험 세션을 구동하는 얇은 감독자이며 OMX는 내구성 있는 유지/폐기/재설정 루프를 소유합니다.

## CLI

```bash
omx autoresearch <mission-dir> [codex-args...]
omx autoresearch --resume <run-id> [codex-args...]
omx autoresearch --help
```

- 새로 시작하면 항상 새로운 실행 태그가 지정된 파트이 생성됩니다.
- `--resume <run-id>`은 `.omx/logs/autoresearch/<run-id>/manifest.json`을 로드합니다.
- repo-root `.omx/state/autoresearch-state.json`이 활성 실행을 가리키는 동안 두 번째 실행은 거부됩니다.

## 미션/샌드박스 계약

`<mission-dir>`은 git repo 내에 있어야 하며 `mission.md`과 `sandbox.md`을 포함해야 합니다.

`sandbox.md` YAML 머리말은 다음을 정의해야 합니다.
- `evaluator.command`
- `evaluator.format: json`
- 선택사항 `evaluator.keep_policy: score_improvement | pass_only`

평가기 stdout은 필수 부울 `pass` 및 선택적 숫자 `score`을 포함하는 JSON이어야 합니다.

## 런타임 모델

새로 출시하면 다음이 생성됩니다.
- 지점 `autoresearch/<mission-slug>/<run-tag>`
- 작업 트리 `<repo>.omx-worktrees/autoresearch-<mission-slug>-<run-tag>`
- `.omx/logs/autoresearch/<run-id>/` 아래의 repo-root 실행 아티팩트

Repo-root 상태 책임:
- `.omx/state/autoresearch-state.json` = 활성 실행 포인터/잠금 전용
- `.omx/logs/autoresearch/<run-id>/manifest.json` = 신뢰할 수 있는 실행별 상태
- `.omx/logs/autoresearch/<run-id>/candidate.json` = 방금 완료된 Codex 세션에서 후보자 핸드오프
- `.omx/logs/autoresearch/<run-id>/iteration-ledger.json` = 지속 가능한 반복 기록
- `.omx/logs/autoresearch/<run-id>/latest-evaluator-result.json` = 최신 평가자 출력

Worktree-로컬 국가 책임:
- `results.tsv`
- `run.log`과 같은 선택적 평가자 로그
- 이러한 런타임 생성 파일은 worktree-local `.git/info/exclude`을 통해 제외되어야 합니다.

## 후보 유물

시작된 세션은 다음을 사용하여 repo-root `candidate.json`을 작성해야 합니다.
- `status`: `candidate | noop | abort | interrupted`
- `candidate_commit`: 문자열 또는 `null`
- `base_commit`: 문자열
- `description`: 문자열
- `notes`: 문자열[]
- `created_at`: ISO 타임스탬프

무결성 규칙:
- `status=candidate`에는 null이 아닌 `candidate_commit`이 필요합니다.
- `candidate_commit`은 git에서 확인되어야 하며 종료 시 작업 트리 `HEAD` 커밋과 일치해야 합니다.
- `base_commit`은 git에서 해결되어야 하며 감독자가 제공한 `last_kept_commit`과 일치해야 합니다.

감독자 행동:
- `candidate` → 평가기 실행, 유지/폐기/모호함/오류 분류, 매니페스트/원장/결과 업데이트, 폐기된 경우 재설정
- `noop` → noop 반복을 기록하고 기본적으로 계속
- `abort` → 재설정 없이 실행 중지
- `interrupted` → 더러워지면 운영자 개입을 위해 중지합니다. 깨끗하면 로그 중단/noop 스타일 결과

## 결정 정책

- 기준 행은 항상 기록됩니다.
- `pass=false` => 폐기합니다.
- 평가자 오류/충돌 => 삭제.
- `keep_policy=score_improvement` => `pass=true` 및 점수가 마지막 유지 점수보다 향상될 때만 유지합니다. 비교 가능한 점수가 없는 통과는 `ambiguous`이며 폐기됩니다.
- `keep_policy=pass_only` => `pass=true` 후보가 유지됩니다.
- 폐기/모호함/오류 경로는 마지막으로 보관된 커밋으로 재설정되어야 합니다.

## 재개하다

`--resume <run-id>`은 다음과 같은 경우 실행 가능한 오류와 함께 실패해야 합니다.
- 매니페스트가 누락되었습니다
- 참조된 작업 트리가 누락되었습니다
- 작업 트리가 허용 목록에 있는 런타임 아티팩트 외부에 더러워져 있습니다.
- 매니페스트는 터미널입니다

성공적인 재개는 마지막으로 유지된 커밋과 기존 결과 기록부터 계속됩니다.

## 반복 핸드오프 컨텍스트

시작된 각 작업자 세션은 다음을 포함하여 감독자가 작성한 지침 스냅샷을 받습니다.
- 현재 반복 번호
- 기준 커밋
- 마지막으로 보관된 커밋
- 알려진 경우 마지막으로 유지된 점수
- 이전 반복 결과
- 제한된 최근 원장 요약
- 정책을 유지하다

## 검증 대상

패리티 정렬 구현은 다음을 증명해야 합니다.
1. 새로운 출시로 별도의 실행 태그가 지정된 파트이 생성됩니다.
2. repo-root 활성 실행 잠금은 동시 실행을 거부합니다.
3. 후보 핸드오프 아티팩트가 유지/폐기/재설정 결정을 내립니다.
4. 버려진 후보는 `last_kept_commit`(으)로 재설정됩니다.
5. `--resume <run-id>`은 신뢰할 수 있는 매니페스트/작업 트리 상태를 다시 로드합니다.
6. README/도움말/계약에서는 씬 감독자 패리티 루프에 대해 설명합니다.
