# 릴리스 준비 평가 - 0.15.0

날짜: 2026-04-26
대상 버전: **0.15.0**
후보 작업 트리 분기: `worker-1/release-0.15.0-prep`
후보 소스 브랜치: `dev` / `origin/dev`
릴리스 준비 편집 전 후보 소스 SHA: `b5b6d13134eb86ecda2d9021cc83c0995f943ebe`
릴리스 준비 커밋 SHA: 이 문서 업데이트가 포함된 커밋을 참조하세요.
후보 소스에서 접근 가능한 기본 태그: `v0.14.3`
비교 링크: [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.14.3...v0.15.0)

## 기본/범위 증거

| Check | Evidence | Result |
| --- | --- | --- |
| Worktree branch before release-prep branch | `git status --short --branch` reported `## HEAD (no branch)` at `b5b6d13134eb86ecda2d9021cc83c0995f943ebe`; release prep then created `worker-1/release-0.15.0-prep` locally. | PASS |
| Candidate source SHA | `git rev-parse HEAD` before edits returned `b5b6d13134eb86ecda2d9021cc83c0995f943ebe`. | PASS |
| Latest reachable tag | `git describe --tags --abbrev=0` returned `v0.14.3`. | PASS |
| `v0.14.3` ancestry | `git merge-base --is-ancestor v0.14.3 HEAD` returned exit code `0`; `git rev-parse v0.14.3^{}` returned `56c93fd3daed9f6043f0bbb65476d355d47083c5`. | PASS |
| `v0.14.4` ref and ancestry | `git rev-parse v0.14.4^{}` returned `b1f684d706d384a94570023fe51ed5ed751066fb`, but `git merge-base --is-ancestor v0.14.4 HEAD` returned exit code `1`. | PASS: tag exists but is not a valid reachable compare base |

## 범위

`0.15.0`은 플러그인 전달/Codex 앱 호환성, Visual Ralph, 설정 설치 모드 동작, 기본 에이전트(Agent)/모델 라우팅(Routing), 후크/런타임 강화, Windows/tmux 질문 처리, CI 중단 방지, Rust 호환성, 문서 및 릴리스 자료를 다루는 부 릴리스 후보입니다.

## 변경된 실행 경로가 검토되었습니다.

- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock` — `0.15.0`에 맞춰 정렬된 릴리스 메타데이터입니다.
- `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.15.0.md`, `docs/qa/release-readiness-0.15.0.md` — 검증된 `v0.14.3` 기본 범위 메모로 준비된 릴리스 담보입니다.
- 플러그인/설정/Codex 앱 인터페이스 — 플러그인 미러, 플러그인 설명자, 설치 모드 설정, 패키지 저장소/레이아웃 및 앱 안전 런타임 라우팅은 아래 필수 검증 게이트에서 다룹니다.
- 기본 에이전트/모델 라우팅 - 기본 에이전트 확인 및 생성된 문서/모델 테이블 확인은 아래 필수 확인 게이트에서 다룹니다.
- 런타임/질문/CI/Rust 인터페이스 — 컴파일된 테스트, 탐색, 스파크셸, 패키지 설치 및 Cargo 작업 공간 게이트는 아래에서 추적됩니다.

## 검증 증거

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| TypeScript build | `npm run build` | PASS | Rebuilt `dist/` after Ralph blocker fixes on 2026-04-26. |
| Lint | `npm run lint` | PASS | `Checked 553 files in 64ms. No fixes applied.` |
| No-unused typecheck | `npm run check:no-unused` | PASS | Completed with exit code `0`. |
| Native agent generation check | `npm run verify:native-agents` | PASS | `verified 20 installable native agents and 33 setup prompt assets`. |
| Plugin bundle / mirror check | `npm run verify:plugin-bundle` | PASS | `verified 29 canonical skill directories and plugin metadata`. |
| Plugin mirror sync check | `npm run sync:plugin:check` | PASS | `verified 29 canonical skill directories and plugin metadata`. |
| Compiled CI test lane | `npm run test:ci:compiled` | REVIEWED | Completed 4,082 tests with 4,075 passing before the final targeted fixes; the 7 reported failing tests were rerun focused after fixes and all passed. Remaining risk is full-suite tmux/session isolation under active local Ralph, so remote CI remains the final full-suite arbiter. |
| Focused compiled blocker rerun | `node --test --test-name-pattern 'detached leader command terminates codex child on external SIGHUP|prints structured JSON results for matching transcripts|keeps the verified Ralph anchor pane|falls back to the current managed session pane|reports pane_not_ready with capture context|treats capture-pane failure as non-blocking|waitForWorkerReady auto-accepts the Claude bypass prompt' dist/cli/__tests__/index.test.js dist/cli/__tests__/session-search.test.js dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-team-tmux-guard.test.js dist/team/__tests__/tmux-session.test.js` | PASS | 7/7 focused tests passed after the Darwin path alias/session-search and detached HUP wait hardening fixes. |
| Explore tests | `npm run test:explore` | PASS | Rust harness unit tests passed (30/30); compiled explore/routing/guidance tests passed (48/48). |
| Explore harness builds | `npm run build:explore` and `cargo build -p omx-explore-harness --release` | PASS | Debug and release native harness builds completed. |
| Sparkshell tests | `npm run test:sparkshell` | PASS | Earlier team evidence: Rust unit/integration/registry tests passed (33 + 12 + 5 tests). Not rerun in this Ralph pass because no sparkshell files changed. |
| Packed install smoke unit | `node --test dist/scripts/__tests__/smoke-packed-install.test.js` | PASS | Team evidence: 7/7 tests passed for prepack-log JSON parsing. |
| Packed install smoke | `npm run smoke:packed-install` | PASS | `packed install smoke: PASS`; smoke did not recreate a tracked root tarball. |
| Rust workspace tests | `cargo test --workspace` | PASS | Earlier team evidence: workspace tests passed for `omx-explore-harness`, `omx-mux`, `omx-runtime`, `omx-runtime-core`, and `omx-sparkshell`. Ralph reran the changed explore harness lane. |

## 알려진 제한/건너뛴 검사

- 외부 푸시, GitHub PR 생성, GitHub CI, 릴리스 태그 생성, npm 게시 및 GitHub 릴리스 게시는 의도적으로 이 준비 작업의 범위를 벗어납니다.
- 수동 OS 간 검사는 아직 실행되지 않습니다. Windows/tmux 적용 범위는 현재 관리자가 수동 OS 유효성 검사를 실행하지 않는 한 자동 회귀 제품군에 따라 달라집니다.
- 패키지 설치 연기 구문 분석을 위한 릴리스 준비 차단 수정이 이루어졌습니다. `npm pack --json`은 최종 JSON 배열 앞에 사전 팩 `sync-plugin-mirror` 로그 줄을 포함할 수 있습니다.
- 2026년 4월 26일 Ralph 후속 조치에서는 탐색/세션 검색 테스트에서 macOS `/private/var` 대 `/var` 경로 별칭을 수정하고, 로드 시 분리된 HUP 테스트 대기를 강화하고, 직접 실행 tmux 누락 노이즈를 억제하고, 추적된 릴리스 준비에서 생성된 루트 `oh-my-codex-0.15.0.tgz` tarball을 제거했습니다.

## 평결

**로컬 릴리스 준비는 차단 해제되었으며 외부 릴리스 작업은 여전히 ​​의도적으로 실행되지 않습니다.** 릴리스 메타데이터, 플러그인 미러 동기화, 보조 자료, 빌드/유형 검사/린트, 팩형 설치 스모크, 탐색 하니스, 집중 컴파일 차단기 및 필수 릴리스 준비 검사가 이제 로컬 증거를 전달합니다. GitHub CI가 녹색이고 관리자가 의도적으로 태그/게시 릴리스 흐름을 실행할 때까지 `v0.15.0`에 태그를 지정하거나 게시하지 마세요.
