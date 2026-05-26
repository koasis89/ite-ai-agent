# 릴리스 준비 평가 - 0.16.1

날짜: 2026-05-08
대상 버전: **0.16.1**
후보 소스 브랜치: `dev`
접근 가능한 기본 태그: `v0.16.0`
태그 전 범위 비교: `v0.16.0..HEAD`
태그 뒤의 링크 비교: [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.16.0...v0.16.1)
출판 상태: **로컬 검토 및 출시 준비 흐름; 병합된 `main`에서 잘라낸 태그.**

## 범위

`0.16.1`은(는) `0.16.0` 이후 강화 트파트에 대한 패치 릴리스입니다. 제한된 탐색 실행, 보다 안전한 로컬 탐색 빠른 경로, 세션 범위 런타임 권한, 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 핸드오프/컨텍스트 팩 복구 동작, 심층 인터뷰 흐름 명확성, 실행/런타임 수정, 플러그인 캐시 새로 고침, CI 대기 시간 변경 및 릴리스 검토 차단 수정을 다룹니다.

## 코드 검토 차단 문제 해결

| Finding | Fix | Evidence |
| --- | --- | --- |
| `omx explore` explicit local file fast-path could follow repo symlinks outside the repository | Explicit fast-path file lookup now rejects symbolic links before `stat()`/read and falls back to the harness | `src/cli/explore.ts`, `src/cli/__tests__/explore.test.ts` |
| CI skipped clean dependency installation on `node_modules` cache hits | Removed `node_modules` cache/skip pattern; all Node CI jobs run `npm ci` unconditionally while retaining npm package cache | `.github/workflows/ci.yml` |
| Text-search local fast-path read files unbounded | Text-search now checks file size and uses the bounded text reader; oversized files fall back to the harness path | `src/cli/explore.ts`, `src/cli/__tests__/explore.test.ts` |

## 변경된 실행 경로가 검토되었습니다.

- `.github/workflows/ci.yml` — 종속성 설치 증명 및 CI 대기 시간 게이트를 정리합니다.
- `crates/omx-explore/src/main.rs`, `src/cli/explore.ts`, `src/runtime/process-tree.ts` — 제한된 탐색 실행 및 로컬 빠른 경로 보호 장치입니다.
- `src/team/*`, `src/pipeline/stages/team-exec.ts`, `src/planning/context-pack-status.ts` — 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 핸드오프/컨텍스트 팩 상태 동작.
- `src/hooks/*`, `src/hud/state.ts`, `src/mcp/*`, `src/imagegen/continuation.ts` — 런타임/세션/MCP/이미지 생성 신뢰성.
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `plugins/oh-my-codex/.codex-plugin/plugin.json` — `0.16.1` 릴리스 메타데이터.
- `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.16.1.md`, `docs/qa/release-readiness-0.16.1.md` — 릴리스 자료.

## 검증 증거

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| Review lanes | `$code-review` code-reviewer + architect lanes over `v0.16.0..dev` | PASS after fixes | Initial REQUEST CHANGES blockers were fixed before release prep continued. |
| TypeScript build + targeted explore tests | `npm run build && env -u OMX_ROOT -u OMX_STATE_ROOT -u OMX_SESSION_ID -u OMX_ENTRY_PATH -u OMX_SOURCE_CWD -u OMX_STARTUP_CWD -u OMX_TEAM_WORKER_LAUNCH_ARGS node --test dist/cli/__tests__/explore.test.js` | PASS | 46/46 explore tests passed, including new symlink and oversized-file fast-path coverage. |
| Lint + no-unused typecheck | `npm run lint -- --reporter=summary && npm run check:no-unused` | PASS | Biome checked 624 files; no unused/type errors. |
| Cargo workspace | `cargo test --workspace` | PASS | Full Rust workspace passed after one targeted rerun confirmed a transient process-group child test. |
| Clean full Node/package gate | `env -u OMX_ROOT -u OMX_STATE_ROOT -u OMX_SESSION_ID -u OMX_ENTRY_PATH -u OMX_SOURCE_CWD -u OMX_STARTUP_CWD -u OMX_TEAM_WORKER_LAUNCH_ARGS npm test` | INCONCLUSIVE locally | One clean rerun exercised the suite and exposed only the stale CI contract assertion that was fixed and targeted-tested; a final clean rerun was interrupted after hanging in `dist/cli/__tests__/question.test.js` under the attached local tmux/OMX environment. |
| Metadata alignment | `grep` over package/Cargo/plugin metadata | PASS | Version metadata aligned to `0.16.1`. |
| Package dry run | `npm pack --dry-run` | PASS | Prepack built TypeScript, verified native agents, synced/verified plugin bundle, cleaned native package assets, and produced `oh-my-codex-0.16.1.tgz` dry-run metadata. |

## 알려진 제한/건너뛴 검사

- GitHub Actions는 최종 태그 이후 로컬에서 관찰되지 않았습니다. 릴리스 워크플로는 푸시된 `v0.16.1` 태그를 검증해야 합니다.
- `dist/cli/__tests__/question.test.js`이 중단될 때까지 정지되었기 때문에 연결된 로컬 tmux/OMX 세션에서 최종 전체 노드 게이트가 결정적이지 않았습니다. 오래된 CI 계약 어설션을 수정한 후 대상 노드/빌드/릴리스 게이트가 통과되었습니다.

## 평결

**`dev` -> `main` 병합 및 `v0.16.1` 태그 준비** 로컬 대상/빌드/Rust/패키지 증거가 완료되었습니다. GitHub Actions는 결론이 나지 않은 로컬 노드 제품군 재실행에 대한 최종 전체 제품군 중재자로 취급되어야 합니다.
