# 릴리스 준비 평가 - 0.13.0

날짜: **2026-04-16**
대상 버전: **0.13.0**
비교 기준: **`v0.12.6..origin/dev`**
평결: **GO** ✅

`0.13.0`은 OpenClaw 및 Hermes를 위한 `omx adapt` 기반, Ralph/네이티브 중지/세션 권한 강화, 더 안전한 탐색 및 플랫폼 시작 동작, 반복되는 macOS 오래된 폴링 git 프로브 감소, HUD/알림 정리, 워크플로 위생 설정 및 릴리스, 종속성 새로 고침 등 광범위한 `0.12.6` 릴리스 트파트을 패키지합니다.

## 검토된 범위

### 기초 적응
- `src/cli/adapt.ts`, `src/cli/index.ts` — `omx adapt` CLI 라우팅(Routing) 및 도움말 화면
- `src/adapt/*` — 어댑터 계약, 경로 지정, 대상 레지스트리, OpenClaw/Hermes 프로브/상태/init/봉투/의사 동작
- `docs/adapt.md` — 사용자 측 어댑터 계약 및 예

### Ralph/런타임 권한/워크플로 의미 체계
- `src/cli/ralph.ts`, `src/ralph/*`, `skills/ralph/SKILL.md`, `skills/ralph-init/SKILL.md` — 프롬프트 측 Ralph와 PRD CLI 시작 및 스토리 검증 의미 체계
- `src/scripts/codex-native-hook.ts`, `src/hooks/keyword-detector.ts`, `src/mcp/state-server.ts`, `src/state/*` — 처리 중지, 메타데이터 라우팅, MCP 상태 전송 및 세션 권한
- `src/scripts/notify-hook/team-leader-nudge.ts`, `src/scripts/notify-hook/team-dispatch.ts` — tmux Ralph 넛지 권한 및 시작 받은 편지함/디스패치 회귀 범위

### 출시/플랫폼/작업 트리 안전
- `src/cli/explore.ts`, `crates/omx-explore/*` — 하네스 해결 및 Windows/POSIX 페일클로즈 동작 살펴보기
- `src/cli/index.ts`, `src/cli/tmux-hook.ts`, `src/scripts/tmux-hook-engine.ts` — 분리된 리더 하위 정리 및 기본 tmux 후크 동작
- `src/team/worktree.ts`, `src/cli/cleanup.ts`, `src/notifications/tmux.ts` — 오래된 작업 트리 및 Windows 정리 복원력

### 후크/HUD/알림
- `src/hud/state.ts`, `src/hud/tmux.ts`, `src/notifications/*`, `src/team/leader-activity.ts` — 실시간 세션 HUD 바인딩, tmux 감지, Slack 멘션 구문 분석, macOS 오래된 폴링 git-probe 감소 및 알림 형식/노이즈 경로
- `src/config/codex-hooks.ts`, `src/scripts/codex-native-pre-post.ts` — 기본 후크 구성 및 메타데이터 라우팅 계약

### 설정/문서/릴리스 워크플로우
- `src/cli/setup.ts`, `src/config/mcp-registry.ts`, `skills/wiki/SKILL.md` — 위키 설정 등록
- `src/cli/doctor.ts`, `docs/codex-native-hooks.md` — 네이티브 후크 의사 적용 범위 및 운영자 문서
- `CONTRIBUTING.md`, `.github/workflows/release.yml` — 개발 기반 기여 가드레일 및 릴리스 워크플로 종속 항목 새로 고침

### 자료 공개
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`
- `CHANGELOG.md`, `RELEASE_BODY.md`
- `docs/release-notes-0.13.0.md`

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full test suite | `npm test` | PASS (3487 tests, 0 fail) |
| Recent bug regression suite | `npm run test:recent-bug-regressions` | PASS (292 tests, 0 fail) |
| Version sync contract | `node --test dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 위험 평가

- **적응 기반**은 사용자에게 표시되는 새로운 인터페이스이지만 의도적으로 얇습니다. 로컬 증거를 보고하고 `.omx/adapters/<target>/...` 아래에 쓰기를 유지합니다. 다운스트림 OpenClaw/Hermes 런타임 승인은 이 릴리스의 로컬 증명 외부에 남아 있습니다.
- **Ralph/기본 중지/세션 권한**이 여러 이음새에 걸쳐 동시에 변경되었습니다. 릴리스 후 장기 실행 동시 세션과 프롬프트 측 및 CLI 측 Ralph 활성화를 모니터링합니다.
- **탐색/플랫폼 실행 경로**에는 Windows 및 POSIX-shim 가드레일이 포함됩니다. 로컬 Linux 검증은 릴리스 워크플로와 크로스 플랫폼 CI 매트릭스로 보완되어야 합니다.
- **HUD/알림 변경**은 오래되고 시끄러운 신호를 줄이지만 실제 tmux/세션 환경에 따라 달라집니다. 출시 후 관찰은 혼합된 tmux/non-tmux 연산자와 새로운 macOS 리더의 오래된 폴링 동작에 초점을 맞춰야 합니다.

## 최종 평결

릴리스 **0.13.0**은 위의 통과된 검증 증거를 기반으로 **`origin/dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
