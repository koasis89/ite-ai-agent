# 릴리스 준비 평가 - 0.12.2

날짜: **2026-04-08**
대상 버전: **0.12.2**
비교 기준: **`v0.12.1..HEAD`**
평결: **GO** ✅

`0.12.2`은 누적된 `v0.12.1..HEAD` 패치 트파트입니다. 기본 Windows + psmux team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 부팅 및 종료 안전, 출시 후 모드-상태 종료-경주 복구, 표준 HUD 기술 상태 가시성, 모니터 기반 런타임-cli 종료 시 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 보존, 릴리스-부수적 정렬입니다.

## 검토된 범위

- 기본 Windows + psmux 분할 창 종료 리더 창 보존(`src/team/runtime.ts`, `src/team/__tests__/runtime.test.ts`)
- postLaunch 모드 상태 정리 종료-경주 복구 및 잘못된 JSON 경계 경고(`src/cli/index.ts`, `src/cli/__tests__/index.test.ts`)
- 기본 Windows team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 PowerShell 부팅 경로 및 tmux 분할 창 회귀 적용 범위(`src/team/tmux-session.ts`, `src/team/__tests__/tmux-session.test.ts`)
- HUD, 오버레이, 키워드 감지기, MCP 상태 및 스킬(Skill) 활성 모듈 전반에 걸친 정식 HUD 스킬 상태 가시성(`src/hud/render.ts`, `src/hud/state.ts`, `src/hud/types.ts`, `src/hooks/agents-overlay.ts`, `src/hooks/keyword-detector.ts`, `src/mcp/state-server.ts`, `src/state/skill-active.ts`, 일치하는 테스트 파일)
- 모니터 기반 런타임-cli 종료 시 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 보존(`src/team/runtime-cli.ts`, `src/team/__tests__/runtime-cli.test.ts`)
- 릴리스 메타데이터 및 릴리스 문서(`package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.12.2.md`)

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full test suite | `npm test` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 최종 평결

릴리스 **0.12.2**는 위의 검증된 `v0.12.1..HEAD` 패치 범위를 기반으로 **분기 푸시 및 PR 핸드오프 준비**가 완료되었습니다.
