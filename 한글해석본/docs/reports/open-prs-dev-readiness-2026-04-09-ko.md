# `dev`에 대한 공개 PR 준비 매트릭스 — 2026-04-09 UTC

현재 `dev` 헤드가 검토되었습니다: `8656d21149a0772369f697df002f7bf85002db8d`.

## `dev` CI 노트

빠른 검증 작업이 실패했기 때문이 아니라 긴 작업이 취소되었기 때문에 `dev`의 푸시 실행 `24141814673`이 빨간색으로 완료되었습니다.

- `dev`에 전달됨: Rust 형식, Rust Clippy, Lint, Typecheck(노드 20/22), 테스트(노드 22/smoke), Coverage Report(Rust), Coverage Gate(Team Critical), Ralph Persistence Gate.
- `dev`에 취소됨: `Test (Node 20 / full)`, `Coverage Report (TypeScript Full)`.
- 실패한 게이트: `CI Status`.
- 작업흐름 이유: `.github/workflows/ci.yml:260-289`에서는 모든 `needs.*.result`이 `success`와 동일해야 합니다. 취소/건너뛴 결과로 인해 게이트가 빨간색으로 표시됩니다.

## 준비 매트릭스

| PR | Summary | Current checks | Merge blockers | Recommendation |
| --- | --- | --- | --- | --- |
| #1403 | Shared-session shutdown hardening + regression coverage | Fast checks mostly green, but both Typecheck jobs failed in run `24173665271`; full Node 20 suite still running | **Hard blocker:** `npm run check:no-unused` fails locally on PR head `e802eff1` with `src/team/runtime.ts(20,3): error TS6133: 'isNativeWindows' is declared but its value is never read.` | **Do not merge yet.** Fix unused import, rerun PR CI, then reassess. |
| #1402 | tmux HUD self-healing / prompt-submit reconcile | Lint, typecheck, smoke, rust coverage, team coverage gate passed; full Node 20 and TS full coverage still pending | Pending long jobs; touches `src/cli`, `src/hud`, and native-hook operational events, so I would not merge before `dev` CI is green | **Good candidate once long jobs finish green and `dev` is green.** Recommended ahead of docs-only work. |
| #1400 | Unknown `$token` duplicate continuation + stale Ralph state fix | Lint, typecheck, smoke, rust coverage, team coverage gate passed; full Node 20 and TS full coverage still pending | Pending long jobs; overlaps `src/scripts/codex-native-hook.ts` and its tests with #1380 | **Merge after #1380 is in `dev`, then rebase/retest.** Otherwise likely conflict/re-review churn. |
| #1382 | Stale team worktree cleanup at startup | PR is open, but its head commit `e5f9ffe7...` is already an ancestor of current `dev` head | No merge work left; CI Status failure is stale noise from cancelled long jobs on an already-landed change | **Close as stale/already merged.** No merge needed. |
| #1380 | Stale deep-interview stop-hook gating fix | Fast checks passed; CI Status failed only because long jobs were cancelled in old run `24142611197` | Long jobs were cancelled; overlaps same native-hook files as #1400 | **Best first merge among the hook fixes once `dev` CI is green.** Land before #1400. |
| #1357 | AGENTS/template token reduction | Fast checks passed; CI Status failed only because long jobs were cancelled in old run `24145469951` | Long jobs cancelled; PR body/checklist says only two files changed, but diff also changes `CLAUDE.md` | **Hold for manual review after runtime fixes.** Lower urgency than #1380/#1400/#1402. |

## 권장 병합 순서

1. 이미 `dev`에 병합되었으므로 **#1382**를 닫습니다.
2. `dev` CI가 다시 실행/녹색화되면 **#1380**을 병합합니다.
3. 리베이스/재테스트 및 병합 **#1400**.
4. 대기 중인 작업이 녹색으로 끝나면 **#1402**를 병합합니다.
5. 병합하기 전에 **#1357**(본문/차이 불일치, 프롬프트 계약 위험)을 다시 검토하세요.
6. 병합을 고려하기 전에 사용하지 않는 가져오기 **#1403** 수정 + CI 재실행

## 수집된 증거

- 현재 `dev` CI 실패 형태에 대한 `gh run view 24141814673 --json ...`.
- 현재 PR 상태에 대한 `gh pr checks 1402`, `1400`, `1382`, `1380`, `1357`, `1403`.
- `gh pr diff --name-only` 중복 검사용.
- 상위 항목/이미 병합된 감지를 위한 `git rev-list --left-right --count dev...pr-<n>` 및 `git merge-base dev pr-1382`.
- `/tmp/worker3-pr1403`의 #1403에 대한 현지 PR 확인:
  - `npm ci`
  - `npm run build`
  - `npm run check:no-unused` → `src/team/runtime.ts`에서 사용되지 않은 가져오기 실패.
