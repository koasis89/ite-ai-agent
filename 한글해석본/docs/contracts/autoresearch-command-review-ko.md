# `omx autoresearch` 전체 패리티 검토 메모

날짜: 2026-03-14
리뷰어 파트: 작업자-3

## 검토된 범위

구현 및 운영자 관련 문서를 다음 항목과 비교했습니다.

- `.omx/plans/prd-autoresearch-full-parity.md`
- `.omx/plans/test-spec-autoresearch-full-parity.md`

검토된 코드 및 문서:

- `src/cli/autoresearch.ts`
- `src/autoresearch/contracts.ts`
- `src/autoresearch/runtime.ts`
- `src/team/worktree.ts`
- `src/modes/base.ts`
- `README.md`
- `docs/contracts/autoresearch-command-contract.md`
- `src/**/__tests__`에 따른 집중적인 자동 연구 테스트

## 현황

**상태:** 패리티에 중요한 동작이 구현된 것으로 나타나고 이전에 언급한 공유 도움말/테스트 문구 불일치가 이제 해결되었습니다.

이제 분기는 이전 스캐폴드 검토보다 PRD/테스트 사양 모양과 훨씬 더 밀접하게 일치합니다.

- `omx autoresearch`은 신규 출시와 `--resume <run-id>` 흐름을 모두 노출합니다.
- 런타임은 repo-root 후보 핸드오프 + 세션 후 평가자 결정을 통해 씬 감독자 루프 경계를 소유합니다.
- repo-root 활성 실행 잠금 및 권한 있는 실행별 매니페스트가 있습니다.
- 새로 출시되면 수명이 긴 파트 하나를 자동으로 재사용하는 대신 실행 태그가 지정된 자동 조사 파트이 생성됩니다.
- docs/help/contracts는 이전 v1 스캐폴드 대신 유지/폐기/재설정 의미를 설명합니다.

## 검증된 증거

### 짓다
- `npm run build` → 합격

### 집중 테스트
- `node --test dist/autoresearch/__tests__/runtime.test.js dist/cli/__tests__/autoresearch.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/nested-help-routing.test.js dist/team/__tests__/worktree.test.js dist/modes/__tests__/base-autoresearch-contract.test.js` → 합격
- `node --test dist/cli/__tests__/session-search-help.test.js` → 합격

### 코드/문서 정렬이 관찰되었습니다.
- CLI 도움말 문서 신규 출시 + `--resume <run-id>`: `src/cli/autoresearch.ts`
- 최상위 도움말은 씬 감독자 패리티 의미 체계를 광고합니다: `src/cli/index.ts`, `src/compat/fixtures/help.stdout.txt`
- 이제 README에서는 기준선 시드, 실행당 저장소 루트 아티팩트, 후보 핸드오프, 유지/폐기/재설정, 루프 재실행 및 재개 동작에 대해 설명합니다. `README.md`
- 계약 문서는 이제 실행 태그가 지정된 파트, repo-root 권한 분할, 후보 아티팩트 스키마, 결정 정책 및 재개 실패 조건을 정의합니다. `docs/contracts/autoresearch-command-contract.md`
- 런타임은 활성 실행 잠금, 실행별 매니페스트 파일, 허용 목록에 있는 런타임 제외, 후보 구문 분석, 평가자 지원 결정, 마지막 유지 동작으로 재설정 및 유효성 검사 재개를 구현합니다. `src/autoresearch/runtime.ts`
- 작업 트리 계획 테스트 잠금 실행 태그 자동 조사 분기/경로 이름 지정: `src/team/__tests__/worktree.test.ts`

## 패리티 체크리스트

### 1. Thin Supervisor 반복 모델
**통과하다.**
- `buildAutoresearchInstructions()`은 시작된 Codex 세션에 정확히 한 번의 실험 주기를 수행하고 종료하기 전에 후보 아티팩트를 작성하도록 지시합니다.
- `runAutoresearchLoop()`은 실행이 중단되거나 오류가 발생하지 않는 한 `processAutoresearchCandidate()` 후에 Codex를 다시 시작합니다.

### 2. Repo-root 국가 권한
**통과하다.**
- repo-root 활성 실행 잠금은 `.omx/state/autoresearch-state.json`에 있습니다.
- 실행별 매니페스트, 후보, 원장 및 최신 평가자 파일은 `.omx/logs/autoresearch/<run-id>/`에 있습니다.
- worktree-local 런타임 아티팩트는 `results.tsv` 및 허용 목록에 있는 로그로 제한됩니다.

### 3. 새로 실행되는 의미론
**통과하다.**
- 새로운 출시는 실행 태그를 계산하고 `autoresearch/<mission-slug>/<run-tag>`과 `autoresearch-<mission-slug>-<run-tag>`을 계획합니다.
- 집중된 작업 트리 적용 범위는 이제 실행 태그가 지정된 분기/경로 이름 지정을 주장합니다.

### 4. 계약 재개
**통과하다.**
- CLI는 `--resume <run-id>`을 구문 분석합니다.
- 런타임은 누락된 매니페스트, 누락된 작업 트리, 더티 작업 트리 및 터미널 실행을 거부합니다.

### 5. 유지/폐기/재설정 결정 정책
**통과하다.**
- 기준선 행이 시드됩니다.
- 평가자 실패/오류는 삭제됩니다.
- `pass_only`은 모든 패스를 유지합니다.
- `score_improvement`에는 비슷한 수치 점수와 개선이 필요합니다. 그렇지 않으면 모호하거나 폐기됩니다.
- 폐기 경로가 `last_kept_commit`로 재설정되었습니다.

### 6. 문서/도움말/계약 정렬
**통과하다.**
- README, 명령 도움말, 최상위 도움말, 고정 도움말 텍스트 및 계약 문서는 이제 일회성 부트스트랩 발판이 아닌 패리티 루프를 설명합니다.
- 이제 공유 도움말/테스트 문구가 씬 감독자 패리티 문구와 일치합니다.

## 남은 검토 메모/위험

1. `runAutoresearchLoop()`은 현재 각 반복에서 `execFileSync('cat', ...)` + `JSON.parse(...)`를 통해 매니페스트 파일에서 실행 ID를 다시 읽습니다. 작동하지만 약간 어색한 구현 세부 사항이며 `cat`을 사용하지 않도록 단순화할 수 있습니다.
2. 집중 테스트는 기본 패리티 인터페이스을 다루지만, 리드가 더 엄격한 의미 잠금을 원하는 경우 `noop`, `abort`, `interrupted` 및 명시적 `pass_only` 정책 분기 주변에 더 넓은 런타임 적용 범위를 위한 여지가 여전히 있습니다.
3. 전체 저장소 전체 테스트 제품군/린트 제품군이 아닌 집중된 패리티 적용 범위와 빌드 상태를 확인했습니다.

## 리뷰어 결론

이 파트은 더 이상 이전 v1 스캐폴드처럼 보이지 않습니다. 검토된 구현 및 문서는 이제 요청된 씬 감독자 자동 연구 패리티 모델과 거의 일치하는 것으로 보입니다. 이전에 언급한 공유 최상위 도움말/테스트 문구 불일치가 해결되었습니다. 나머지 후속 조치는 선택적인 정리/적용 범위 개선입니다.
