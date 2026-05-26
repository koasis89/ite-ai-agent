# 릴리스 준비 평결 - 0.12.6

날짜: **2026-04-13**
대상 버전: **0.12.6**
비교 기준: **`v0.12.5..origin/dev`**
평결: **GO** ✅

`0.12.6` 패키지 32개의 PR은 새로운 로컬 위키 작업 흐름, 심층적인 알림/후크/세션 상태 강화, 실행/작업 트리 안전 개선, Discord 작업 제어 기본 요소 및 `dev` 병합 후 명시적으로 링크된 문제의 자동 종료를 중심으로 `v0.12.5` 이상으로 병합됩니다.

## 검토된 범위

### 위키/MCP/CLI 패리티
- `src/wiki/*` — 로컬 마크다운 위키 저장소, 수집, 쿼리, 린트, 수명 주기 및 저장소 테스트
- `src/mcp/wiki-server.ts`, `src/mcp/bootstrap.ts` — Wiki MCP 인터페이스 및 부트스트랩 배선
- `src/cli/index.ts`, `src/cli/mcp-parity.ts`, `README.md`, `skills/wiki/SKILL.md` — CLI 패리티 및 사용자 지향 워크플로 진입점

### 후크/알림/세션 상태
- `src/scripts/codex-native-hook.ts` — 네이티브 후크 세션 상태 및 릴리스 준비 가드레일
- `src/scripts/notify-hook/team-dispatch.ts`, `src/scripts/notify-hook/team-leader-nudge.ts`, `src/scripts/notify-fallback-watcher.ts` — 전달/대체/넛지 안정성
- `src/notifications/*`, `src/hooks/session.ts`, `src/hud/state.ts` — 세션 가시성, 수명 주기 중복 제거, 응답 리스너, tmux, 유휴 휴지 및 HUD 정리

### 출시/설정/운영자 안전
- `src/cli/index.ts`, `src/team/worktree.ts`, `src/utils/repo-deps.ts` — 재사용 가능한 종속성 부트스트랩 및 더티 작업 트리 주의 흐름
- `src/cli/setup.ts`, `src/utils/agents-md.ts` — 설정 새로 고침을 통한 에이전트(Agent) 보존
- `src/cli/team.ts`, `src/team/runtime.ts`, `src/team/progress-evidence.ts` — 런타임/리더 안전성 및 현재 진행 증거 개선

### 워크플로우/문제 자동화
- `.github/scripts/dev-merge-issue-close.cjs`, `.github/workflows/dev-merge-issue-close.yml` — `dev` 병합 후 명시적으로 연결된 로컬 이슈 닫기
- `src/openclaw/*`, `src/cli/__tests__/ask.test.ts` — Discord 세션 제어 및 추적된 메시지 안정성

### 자료 공개
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`
- `CHANGELOG.md`, `RELEASE_BODY.md`
- `docs/release-notes-0.12.6.md`

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full test suite | `npm test` | PASS |
| Recent bug regression suite | `npm run test:recent-bug-regressions` | PASS |
| Version sync contract | `node --test dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 위험 평가

- **Wiki 워크플로**는 이번 릴리스에서 가장 큰 규모의 새로운 영역입니다. 스토리지/인덱스 및 문서 계약 범위는 강력하지만 출시 후 관찰은 실제 쿼리 품질과 자동 캡처 인체공학에 초점을 맞춰야 합니다.
- **알림/세션 상태 강화**는 광범위한 후크/런타임 인터페이스에 적용됩니다. 전용 최근 버그 회귀 스위트와 전체 테스트 스위트는 위험을 줄이지만 장기 실행 tmux/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 세션은 후속 엣지 케이스의 가장 가능성 있는 소스로 남아 있습니다.
- **더티 작업 트리 주의 흐름**은 의도된 경로 외부의 심각한 오류를 제거하지 않고 발사 인체 공학을 변경합니다. 위양성 또는 위음성 주의 프롬프트를 모니터링합니다.
- **개발자 병합 문제 자동 종료** 의도적으로 병합된 PR 제목/본문의 명시적인 동일한 저장소 문제 참조만 대상으로 합니다. 지나치게 광범위하거나 누락된 일치 항목이 있는지 처음 몇 개의 개발 병합을 모니터링합니다.

## 최종 평결

릴리스 **0.12.6**은 위에서 확인된 `v0.12.5..origin/dev` 범위를 기반으로 **`origin/dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
