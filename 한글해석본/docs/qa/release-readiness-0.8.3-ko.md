# 릴리스 준비 평가 - 0.8.3

날짜: **2026-03-06**
대상 버전: **0.8.3**
평결: **GO** ✅

## 검토된 범위

- 버전이 `0.8.3`(`package.json`, `package-lock.json`)으로 변경되었습니다.
- 변경 로그 업데이트(`CHANGELOG.md`)
- 출시 노트 초안(`docs/release-notes-0.8.3.md`)
- Gemini 작업자 핫픽스는 이미 PR `#585`을 통해 `dev`에 병합되었습니다.
- 부하 시 전체 검증을 안정화하기 위해 `src/hooks/__tests__/notify-fallback-watcher.test.ts`에 대한 테스트 전용 강화

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS (`real 9.15`) |
| Full test suite | `npm test` | PASS (`1926` pass / `0` fail, `real 498.76`, after clean `dist/` rebuild) |
| No-unused type gate | `npm run check:no-unused` | PASS (`real 4.73`) |
| CLI help smoke | `node bin/omx.js --help` | PASS (`real 0.10`) |
| Version smoke | `node bin/omx.js version` | PASS (`oh-my-codex v0.8.3`, `real 0.10`) |
| Status smoke | `node bin/omx.js status` | PASS (`ultrawork: ACTIVE (phase: debugging-verification)`, `real 0.13`) |
| Doctor smoke | `node bin/omx.js doctor` | PASS (`9 passed, 0 warnings, 0 failed`, `real 0.21`) |
| Setup dry-run smoke | `node bin/omx.js setup --dry-run` | PASS (`real 0.58`) |
| Cancel smoke | `node bin/omx.js cancel` | PASS (`Cancelled: ultrawork`) |
| Gemini worker targeted tests | `node --test dist/team/__tests__/tmux-session.test.js --test-name-pattern='gemini|buildWorkerProcessLaunchSpec returns command/args/env for prompt process spawn'` | PASS (`127` pass / `0` fail, `real 1.80`) |
| Gemini runtime targeted tests | `node --test dist/team/__tests__/runtime.test.js --test-name-pattern='startTeam launches gemini workers with startup prompt and no default model passthrough'` | PASS (`54` pass / `0` fail, `real 66.40`) |
| Gemini tmux demo targeted tests | `node --test dist/team/__tests__/tmux-claude-workers-demo.test.js --test-name-pattern='gemini'` | PASS (`18` pass / `0` fail, `real 0.38`) |

## 위험 참고 사항

- 이는 `0.8.2` 개발 릴리스 라인 이후의 Gemini 작업자 시작 핫픽스를 중심으로 한 집중 패치 릴리스입니다.
- 기본 회귀 인터페이스은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임/tmux-session Gemini 작업자 시작 경로입니다.
- 두 번째 검증 위험은 전체 제품군 로드 시 불안정한 감시자 테스트였습니다. 해당 테스트는 감시자가 준비될 때까지 기다리도록 강화되었으며 이제 전체 클린 스위트가 통과되었습니다.

## 최종 평결

릴리스 **0.8.3**은 위의 새로운 현지 검증 증거를 기반으로 **게시 준비가 되었습니다**.
