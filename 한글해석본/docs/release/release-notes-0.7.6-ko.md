# 릴리스 노트 - 0.7.6

상태: **2026-03-02**에 작성되었습니다.

현재 패키지 버전: **0.7.6**.

## 범위 정책

이 릴리스 노트는 다음 사항을 엄격히 기반으로 합니다.

- `git log --no-merges main..dev`
- `git diff --shortstat main...dev`

## 섹션

### 하이라이트
- tmux/세션 타겟팅, 정리 흐름 및 역할 기반 분해 전반에 걸쳐 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 안정성이 강화됩니다.
- MCP team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 추출 및 향상된 CI 게이트 가시성.
- OpenClaw 및 알림 후크 안정성/문서 업데이트.

### 추가됨
- `feat(team): add dedicated ralph auto-run cleanup policy` (#407, #412)
- `feat(team): add dedicated tmux session mode for worker isolation` (#416)
- `feat(team): add per-worker role routing and task decomposition`

### 변경됨
- `docs: OpenClaw integration guide for notifications` (#413)
- `ci: add CI Status gate job for branch protection` (#423)
- `refactor(mcp): extract omx_run_team_* to dedicated team-server.ts` (#431)
- `docs(changelog): update unreleased notes for main...dev`

### 결정된
- OpenClaw 기본 게이트웨이 알림 경로.
- Tmux 시작/주입/세션 타겟팅 회귀.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 정리, 확장 레이아웃 보존, 종료/재개 회귀.
- Ralph CLI 작업 구문 분석 옵션 값 누출.
- 스킬(Skill) 표준 OMX 경로 정규화.

### 되돌리기
- 옵트인 전용 tmux-session 힌트 변경(#432)을 되돌린 후 수정 사항을 수정합니다.
- 시각적 판정 지침 복원 변경 후 경로 정규화 수정을 위해 되돌립니다.

### 출시 준비 확인
- [x] `npm run build` 패스
- [x] `npm test` 패스
- [x] `npm run check:no-unused` 패스
- [x] `DEMO.md` 패스의 연기 검사(또는 환경이 제한된 경우 문서화됨)

### 연기 확인 증거 (2026-03-02)

| Command | Exit | Evidence |
|---|---:|---|
| `npm run build` | 0 | build completed |
| `npm test` | 0 | test pipeline completed |
| `npm run check:no-unused` | 0 | `tsc -p tsconfig.no-unused.json` succeeded |
| `node bin/omx.js --help` | 0 | CLI usage rendered |
| `node bin/omx.js doctor` | 0 | `Results: 9 passed, 0 warnings, 0 failed` |
| `node bin/omx.js version` | 0 | `oh-my-codex v0.7.6` |
| `node bin/omx.js status` | 0 | mode status rendered |
| `node bin/omx.js setup --dry-run` | 0 | dry-run setup completed |
| `node bin/omx.js cancel` | 0 | cancel command completed |

### 커밋 원장(`main..dev`, `git log --reverse` 순서부터)
- `2026-02-28 c235a5a feat(team): add dedicated ralph auto-run cleanup policy (#407) (#412)`
- `2026-02-28 8d3fef0 fix(notifications): native OpenClaw gateway support (#414) (#415)`
- `2026-03-01 1653aa7 feat(team): add dedicated tmux session mode for worker isolation (#416)`
- `2026-03-01 0c68a02 docs: OpenClaw integration guide for notifications (#413)`
- `2026-03-01 383d79d fix(tmux): source shell profile (.zshrc/.bashrc) for detached session launch`
- `2026-03-01 d4f6803 fix(team): revert dedicated tmux session mode, restore split-pane default`
- `2026-03-01 56091a4 ci: add CI Status gate job for branch protection (#423)`
- `2026-03-01 576ec9c fix(ralph): exclude option values from CLI task description (#424)`
- `2026-03-01 6eed3c6 fix(notify-hook): add structured logging for visual-verdict parse/persist failures (#428)`
- `2026-03-01 b5dc657 fix(team): fix 3 regressions in team/ralph shutdown and resume paths (#430)`
- `2026-03-01 3f6b3fd refactor(mcp): extract omx_run_team_* to dedicated team-server.ts (#431)`
- `2026-03-02 c3d1220 fix(team): switch dedicated tmux session to opt-in with worker location hint (#432)`
- `2026-03-01 ee72e1f Revert "fix(team): switch dedicated tmux session to opt-in with worker location hint (#432)"`
- `2026-03-02 454e69d fix(team): force cleanup on failed/cancelled runs, await worktree rollback, refresh dead-worker panes (#438)`
- `2026-03-02 c8632fa fix(team): fix leader pane targeting in notify-hook dispatch and runtime fallback (#433, #437) (#439)`
- `2026-03-01 587ec94 fix(team): harden autoscaling pane cleanup and teardown`
- `2026-03-02 12dea24 fix(team): preserve layout during scale-up and add regression test`
- `2026-03-02 f5d47f4 fix(tmux): skip injection when pane returns to shell (#441) (#442)`
- `2026-03-02 7413fe3 feat(team): add per-worker role routing and task decomposition`
- `2026-03-02 cc64635 fix(tmux): target correct session when spawning team panes`
- `2026-03-02 d33ecfc fix(team): remove unused symbols flagged in PR review`
- `2026-03-02 f0cc833 fix(tmux): restore injection when scoped mode state is missing`
- `2026-03-02 baeb8e7 fix(skills): restore visual-verdict contract and ralph visual-loop guidance`
- `2026-03-02 a5f2b77 Revert "fix(skills): restore visual-verdict contract and ralph visual-loop guidance"`
- `2026-03-02 6c1c4eb docs(changelog): update unreleased notes for main...dev`
- `2026-03-02 e0c5974 fix(skills): normalize forked OMC references to OMX canonical paths`
