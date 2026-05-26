# 릴리스 준비 평가 - 0.16.0

날짜: 2026-05-06
대상 버전: **0.16.0**
후보 소스 브랜치: `dev`
후보 소스 SHA: `e134967863352955feb477e7c4bd2a52b82eeb19`
접근 가능한 기본 태그: `v0.15.3`
태그 전 범위 비교: `v0.15.3..HEAD`
태그 뒤의 링크 비교: [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.15.3...v0.16.0)
검토된 범위의 커밋 수: **77**
검토된 범위의 변경된 파일 수: **216**
출판 상태: **현지 후보 준비; GitHub CI가 통과되고 태그/npm/GitHub 릴리스가 명시적으로 승인될 때까지 게시가 차단된 상태로 유지됩니다.**

## 범위

`0.16.0`은 기술 지원 중단 및 기본 Codex 목표 모드 통합을 위한 부 릴리스 후보입니다. 내구성이 뛰어난 `ultragoal`, `performance-goal` 및 `autoresearch-goal` 워크플로를 다룹니다. Codex 목표 스냅샷 코디네이션(Coordination); Ralph/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 목표 모드 핸드오프 안전; 카탈로그/플러그인 스킬(Skill) 전달 정리; `v0.15.3` 이후 안정성/문서/도구 변경 사항을 지원합니다. 로컬 준비에는 커밋되지 않은 릴리스 메타데이터, 릴리스 노트, 준비 증거 및 포스트 팩 차이점에 나열된 세 가지 검증-안정성 수정 사항이 포함됩니다.

## 필수 호환성 설명

카탈로그가 더 이상 사용되지 않는 설치 가능/플러그인 제공에서 더 이상 사용되지 않는 스킬이 폐기되었습니다. 더 이상 사용되지 않는 루트 래퍼는 호환성 스텁으로 남아 있을 수 있습니다.

## 필수 목표 모드 업그레이드 참고사항

`ultragoal`, `performance-goal` 및 `autoresearch-goal`에는 지속적인 완료 코디네이션(Coordination)을 위해 새로운 Codex 목표 스냅샷이 필요합니다. OMX는 숨겨진 Codex 목표 상태를 직접 변경하지 않습니다.

## 증거 원장 공개

| Headline claim | Source evidence | Verification evidence | Status |
| --- | --- | --- | --- |
| Native goal-mode workflows are first-class release surfaces | `src/cli/ultragoal.ts`, `src/cli/performance-goal.ts`, `src/cli/autoresearch-goal.ts`, `docs/ultragoal.md`, `docs/performance-goal.md`, `docs/autoresearch-goal.md`, commits `5277152f`, `f7fbb97b`, `9814c162` | Clean `npm test` passed 4564/4564, with targeted goal workflow suite passed 46/46 | Verified locally |
| Completion requires fresh Codex goal snapshot reconciliation | `src/goal-workflows/codex-goal-snapshot.ts`, `src/goal-workflows/validation.ts`, commits `448f17d3`, `8e6650d8` | Covered by clean `npm test` and targeted goal workflow suite | Verified locally |
| Ralph/Team handoffs respect goal-mode truth boundaries | `src/cli/ralph.ts`, `src/team/goal-workflow.ts`, `src/team/approved-execution.ts`, commits `ed3c2ace`, `1e99d1d0`, `f5abbec9` | Clean `npm test` passed; Team approved-execution targeted rerun passed 4/4 after explicit state-root fixture fix | Verified locally |
| Obsolete skills retired from installable/plugin delivery where catalog-deprecated; deprecated root wrappers may remain as compatibility stubs. | `src/catalog/manifest.json`, `templates/catalog-manifest.json`, `src/scripts/sync-plugin-mirror.ts`, plugin skill deletions/additions in `plugins/oh-my-codex/skills/`, commit `fa5a6430` | `npm run verify:plugin-bundle`, generated catalog-doc check, clean `npm test`, and `npm pack --dry-run` passed | Verified locally |
| Direct `omx autoresearch` remains deprecated with goal-mode replacement path | `src/cli/autoresearch.ts`, `src/autoresearch/goal.ts`, `skills/autoresearch-goal/SKILL.md`, `plugins/oh-my-codex/skills/autoresearch-goal/SKILL.md` | Covered by clean `npm test` and targeted goal workflow suite | Verified locally |
| Notification transports honor proxy environments | `src/notifications/http-client.ts`, `src/notifications/dispatcher.ts`, commit `a43b1b7f`, PR `#2113` | Covered by clean `npm test`; notify dispatch targeted rerun passed 27/27 after legacy fallback fixture correction | Verified locally |
| Explore startup environment and timeout behavior are bounded | `crates/omx-explore/src/main.rs`, `src/cli/explore.ts`, commit `3b4274f3` | `cargo test --workspace` passed after process-group timeout fixture stabilization | Verified locally |
| Release metadata aligned to 0.16.0 | `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `plugins/oh-my-codex/.codex-plugin/plugin.json` | Metadata grep after edits | Verified locally before gates |

## 커밋/PR 버킷

- **기술 지원 중단/카탈로그 전달:** `fa5a6430`, `9814c162`, 플러그인 기술 제거/추가, 카탈로그 매니페스트 업데이트.
- **목표 모드 기본 통합:** `ed3c2ace`, `1e99d1d0`, `5277152f`, `f7fbb97b`, `448f17d3`, `8e6650d8`.
- **테스트/QA/도구:** `9208af54`, `b47f1ea1`, CI 분할/적용 범위 변경, 목표 워크플로 및 CLI 테스트 추가.
- **문서:** `34aa3884`, `18e0df55`, `24cb8cfb`, 목표 워크플로 문서, Discord/프록시 문서, 파이프라인 템플릿.
- **운영 신뢰성:** `a43b1b7f`, `3b4274f3`, `dffc5761`, `0eb91249`, `dc3f475a`, `e3569b3d`.
- **릴리스/패키지 메타데이터:** 이 준비 분기의 로컬 `0.16.0` 메타데이터 업데이트입니다.

## 변경된 실행 경로가 검토되었습니다.

- `src/goal-workflows/*`, `src/ultragoal/*`, `src/performance-goal/*`, `src/autoresearch/goal.ts` — 지속 가능한 목표 아티팩트 및 Codex 스냅샷 코디네이션(Coordination).
- `src/cli/{index,ultragoal,performance-goal,autoresearch-goal,autoresearch}.ts` — 목표 워크플로우 명령 및 자동 조사 지원 중단 인터페이스.
- `src/team/{goal-workflow,approved-execution,runtime}.ts`, `src/cli/ralph.ts` — 승인된 실행 및 Ralph 목표 모드 핸드오프.
- `skills/*`, `plugins/oh-my-codex/skills/*`, `src/catalog/manifest.json`, `templates/catalog-manifest.json` — 스킬 카탈로그/플러그인 제공 변경.
- `src/notifications/*`, `crates/omx-explore/*`, `.github/workflows/ci.yml` — 운영 및 검증 강화.
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `plugins/oh-my-codex/.codex-plugin/plugin.json` — 릴리스 메타데이터.

## 검증 증거

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| Metadata alignment | `grep -R "0\.15\.3" -n package.json package-lock.json Cargo.toml Cargo.lock plugins/oh-my-codex/.codex-plugin/plugin.json .agents/plugins/marketplace.json` | PASS | No stale `0.15.3` in version metadata surfaces after local bump. |
| Build | `npm run build` | PASS | Ran as part of `npm test` and `npm pack --dry-run`; package version reported `0.16.0`. |
| Native agents | `npm run verify:native-agents` | PASS | `verified 18 installable native agents and 33 setup prompt assets`. |
| Plugin bundle | `npm run verify:plugin-bundle` | PASS | `verified 26 canonical skill directories and plugin metadata`. |
| Lint | `npm run lint` | PASS | `Checked 614 files in 100ms. No fixes applied.` Log: `.omx/logs/release-0.16.0-final-local-gates.log`. |
| No-unused typecheck | `npm run check:no-unused` | PASS | Completed with exit code `0`. Log: `.omx/logs/release-0.16.0-final-local-gates.log`. |
| Generated catalog-doc check | `node dist/scripts/generate-catalog-docs.js --check` | PASS | `catalog check ok`; also covered by final clean `npm test`. Log: `.omx/logs/release-0.16.0-local-gates.log`. |
| Pack smoke | `npm pack --dry-run` | PASS | Produced `oh-my-codex-0.16.0.tgz`; prepack built, synced plugin mirror, verified native agents/plugin bundle, and cleaned native package assets. Log: `.omx/logs/release-0.16.0-final-local-gates.log`. |
| Goal workflow targeted tests | `node --test dist/cli/__tests__/ultragoal.test.js ... dist/catalog/__tests__/plugin-bundle-ssot.test.js` | PASS | 46/46 passed after approved-execution fixture/root handling fixes. Log: `.omx/logs/release-0.16.0-targeted-goal-tests-after-fixes.log`. |
| Team approved-execution targeted rerun | `node --test dist/team/__tests__/approved-execution.test.js` | PASS | 4/4 passed after unboxing `OMX_ROOT` for explicit state-root assertions. Log: `.omx/logs/release-0.16.0-approved-execution-rerun2.log`. |
| Notify dispatch targeted rerun | `node --test dist/hooks/__tests__/notify-hook-team-dispatch.test.js` | PASS | 27/27 passed after making the legacy fallback fixture queue a real legacy request before corrupting dispatch state. Log: `.omx/logs/release-0.16.0-notify-dispatch-rerun-after-fix.log`. |
| Full Node/package gate | `env -u OMX_ROOT -u OMX_STATE_ROOT -u OMX_SESSION_ID -u OMX_ENTRY_PATH -u OMX_SOURCE_CWD -u OMX_STARTUP_CWD -u OMX_TEAM_WORKER_LAUNCH_ARGS npm test` | PASS | Clean release-gate environment passed 4564/4564 tests and `catalog check ok`. Earlier live OMX/tmux-session runs failed/terminated because state/tmux-sensitive tests observed active runtime contamination; the clean release gate passed after fixture fixes. Log: `.omx/logs/release-0.16.0-npm-test-clean-final.log`. |
| Cargo workspace verification | `cargo test --workspace` | PASS | Workspace passed after stabilizing the `omx-explore` timeout/process-group child readiness fixture. Log: `.omx/logs/release-0.16.0-cargo-test-after-fixes.log`. |
| Post-pack status/diff review | `git status --short --branch && git diff --name-only` | PASS | Intended local prep diff only: release metadata/docs plus verification-stability fixes in `crates/omx-explore/src/main.rs`, `src/hooks/__tests__/notify-hook-team-dispatch.test.ts`, and `src/team/__tests__/approved-execution.test.ts`. Log: `.omx/logs/release-0.16.0-final-local-gates.log`. |
| GitHub CI | GitHub Actions on release candidate | NOT RUN | Required before tag/npm/GitHub publication. |

## 알려진 제한/건너뛴 검사

- GitHub CI, 태그 생성, npm 게시 및 GitHub 릴리스 게시는 이 로컬 준비 단계에서 실행되지 않았습니다.
- GitHub CI가 녹색이고 사람이 태그 생성, npm 게시 및 GitHub 릴리스 게시를 명시적으로 승인할 때까지 게시가 차단된 상태로 유지됩니다.

## 평결

**로컬 릴리스 후보가 준비되었습니다.** `0.16.0`에 대한 릴리스 자료, 메타데이터, 대상 제품군, 전체 노드/패키지 게이트 정리, 화물 작업 공간 테스트, 린트, 미사용 없음 검사, 생성된 카탈로그 문서 검사, 팩 스모크 및 팩 후 차이 검토가 완료되었습니다. GitHub CI가 녹색이고 tag/npm/GitHub 릴리스가 명시적으로 승인될 때까지 게시하지 마십시오.
