# 릴리스 준비 평결 - 0.12.5

날짜: **2026-04-11**
대상 버전: **0.12.5**
비교 기준: **`v0.12.4..HEAD`**
평결: **GO** ✅

`0.12.5`은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 시작/종료 강화, 다중 기술/워크플로 상태 정확성, Windows 안정성, tmux/shell cwd 수정, HUD 세션 고정 및 후크/인증/알림 강화 전반에 걸쳐 25개의 PR을 제공합니다. 새로운 기능 1개(현재 작업 기준 분기 가드레일)와 문서 정리 1개가 포함됩니다.

## 검토된 범위

### team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작/종료
- `src/team/runtime.ts` — 정지된 작업자 복구, 세션 간 중지 가드, Linux 핸드오프 지속성
- `src/team/state.ts` — `session.json` 소유권, 대체 의미 체계
- `src/team/worktree.ts` — 기준 분기 가드레일 배선

### 다중 기술/워크플로 상태
- `src/hooks/keyword-detector.ts`, `src/skills/state.ts` — 혼합 프롬프트 라우팅(Routing) 중 계획 상태 보존
- `src/modes/workflow-state.ts`, `src/modes/reconcile.ts` — 핸드오프 정확성, 잘못된 상태 거부
- `src/scripts/codex-native-hook.ts` — 세션 범위 후크 계약 시행

### 윈도우
- `src/team/mux/psmux.ts` — 실행기 경로 확인
- `src/notifications/process.ts` — `ps` 대체
- `src/mcp/cleanup.ts` — 상위 종료 시 고아 정리
- `src/installer/index.ts` — 폐기된 MCP 구성 복구

### tmux / macOS / 쉘
- `src/team/tmux.ts` — 분리된 cwd, PID 확인, 복사 모드 정리
- `src/team/shell.ts` — 지원되는 셸 실행 시 작업자 cwd, Homebrew zsh 정규화

### HUD/세션 앵커링
- `src/hud/state.ts` — 세션 범위 앵커
- `src/hud/transport.ts` — 기본 세션 ID 드리프트 가드

### 후크/인증/알림
- `src/hooks/stop.ts` — Ralph 스톱훅 세션 권한
- `src/hooks/auth-nudge.ts` — 읽기 전용/계획 승인 누출
- `src/notify/hooks.ts` — 대략적인 상태 드리프트 추적
- `src/mcp/launcher.ts` — 스톨 바운드 다시 시작

### 자료 공개
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`
- `CHANGELOG.md`, `RELEASE_BODY.md`
- `docs/release-notes-0.12.5.md`

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full test suite | `npm test` | PASS |
| Version sync contract | `node --test dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 위험 평가

- **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 복구**는 `runtime.ts`의 새로운 실행 경로입니다. 매우 느린 작업자 환경의 극단적인 경우를 모니터링합니다.
- **계획 상태 보존**(#1471)은 스킬(Skill) 상태 라우팅 경로에 영향을 미칩니다. 혼합 기술 프롬프트는 출시 후에 테스트해야 합니다.
- **Windows 작업자 경로**(#1469)는 해당 PR에 추가된 계약 테스트를 통해 확인되었습니다. 크로스 플랫폼 CI 매트릭스가 최종 확인을 제공합니다.
- 이 릴리스에서는 기존 테스트 실패가 발생하지 않습니다. `main`의 `3a193cfb`에서 발생한 2개의 계약 테스트 실패는 기존에 존재하며 관련이 없는 상태로 남아 있습니다.

## 최종 평결

릴리스 **0.12.5**는 위의 검증된 `v0.12.4..HEAD` 패치 범위를 기반으로 **분기 푸시 및 PR 핸드오프 준비**가 완료되었습니다.
