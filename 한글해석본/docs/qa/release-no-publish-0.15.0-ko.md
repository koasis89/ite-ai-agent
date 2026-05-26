# 부작용 가드 출시 - 0.15.0

날짜: 2026-04-26
작업자: `worker-4`
작업: 릴리스 준비가 태그를 생성하지 않았는지 확인하거나 npm/GitHub 릴리스 아티팩트를 게시하지 않았습니다.

## 증거

| Check | Command | Result |
| --- | --- | --- |
| Observed pre-evidence commit | `git rev-parse HEAD` | `b5b6d13134eb86ecda2d9021cc83c0995f943ebe` |
| No release tag on candidate commit | `git tag --points-at HEAD` | PASS: no tags printed |
| No local `v0.15.0` tag | `git tag -l 'v0.15.0'` | PASS: no tags printed |
| Generated npm pack tarball not retained | `test ! -e oh-my-codex-0.15.0.tgz` | PASS: root generated tarball removed from tracked release prep |
| Release workflow remains tag-triggered | `grep -RIn "npm publish\|softprops/action-gh-release\|on:\|tags:" .github/workflows/release.yml` | PASS: publish/release steps remain inside the tag-triggered release workflow; no workflow was invoked locally |
| Local command audit | Worker/Ralph command logs | PASS: no `git tag`, `git push --tags`, or `npm publish` command was executed |

## 작업자가 운영하는 검증게이트-4

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | PASS: `Checked 553 files in 801ms. No fixes applied.` |
| Type check | `npm run check:no-unused` | PASS |
| Build | `npm run build` | PASS |
| Release workflow targeted test | `node --test dist/verification/__tests__/explore-harness-release-workflow.test.js` | PASS: 3 tests passed |
| Full test suite | `npm test` | FAIL/INCOMPLETE: unrelated environment-sensitive failures surfaced in `omx ask`, explore harness hydration/routing, detached tmux, cross-rebase, and mailbox bridge tests before tool output was lost; worker-4 did not change those areas. |

## 평결

릴리스 준비는 부작용 없이 유지됩니다. 로컬 릴리스 태그가 생성되지 않았고, 이 작업 트리에 `v0.15.0` 태그가 존재하지 않으며, 후보 커밋에 태그 포인트가 없고, npm 게시 명령이 실행되지 않았으며, 생성된 루트 팩 tarball이 추적된 릴리스 준비에서 제거되었습니다.
