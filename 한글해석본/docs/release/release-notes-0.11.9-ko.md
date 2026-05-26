# 릴리스 노트 — 0.11.9

## 요약

`0.11.9`은 심층 인터뷰/랄플랜 코디네이션(Coordination)을 강화하고 Codex 관리 TUI 구성 주변의 설정 동작을 복구하며 실시간 작업자 감독/HUD 상태 가시성을 활성 세션에 맞춰 유지하는 `0.11.8` 이후의 집중 패치 릴리스입니다.

## 수정 사항 및 변경 사항이 포함되었습니다.

- 심층 인터뷰 잠금 상태는 이제 폴백 tmux-pane 넛지를 억제합니다.
- 계획 전달은 실행 전에 더 강한 심층 인터뷰 압력을 적용합니다.
- 실시간 ralplan 합의 계획은 HUD/파이프라인 가시성을 위해 관찰 가능한 런타임 상태를 노출합니다.
- 설정은 더 이상 Codex 관리 TUI 구성을 다시 중단하지 않으며 기본 탐색 경로 안내는 설정 채택과 일치합니다.
- 활성 상태 저장 모드는 라이브 세션 중에 HUD에 다시 표시됩니다.
- 실시간 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자가 활성 상태를 유지하는 동안 대체 오케스트레이션은 계속 유지됩니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 흐름은 필요한 경우 Claude 우회 프롬프트를 자동으로 수락합니다.
- 제공된 분석 스킬(Skill)은 이제 복원된 실행 정책 계약 문구를 사용하여 OmC 추적 방법을 따릅니다.
- 릴리스 메타데이터는 Node 및 Cargo 패키지 전체에서 `0.11.9`로 범프됩니다.

## 검증 증거

### 타겟 릴리스 회귀 제품군

- `npm run build` ✅
- `npm run lint` ✅
- `npm run check:no-unused` ✅
- `node --test --test-reporter=spec dist/cli/__tests__/version-sync-contract.test.js` ✅
- `node --test --test-reporter=spec dist/cli/__tests__/setup-refresh.test.js dist/cli/__tests__/setup-scope.test.js dist/cli/__tests__/doctor-warning-copy.test.js` ✅
- `node --test --test-reporter=spec dist/hooks/__tests__/explore-routing.test.js dist/hooks/__tests__/explore-sparkshell-guidance-contract.test.js dist/hooks/__tests__/deep-interview-contract.test.js dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-auto-nudge.test.js dist/hooks/__tests__/agents-overlay.test.js` ✅
- `node --test --test-reporter=spec dist/hud/__tests__/index.test.js dist/hud/__tests__/render.test.js dist/hud/__tests__/state.test.js` ✅
- `node --test --test-reporter=spec dist/pipeline/__tests__/stages.test.js dist/ralplan/__tests__/runtime.test.js` ✅

## 남은 위험

- 이 릴리스 검증은 의도적으로 변경된 `0.11.8` 이후 인터페이스을 대상으로 합니다. 전체 GitHub Actions 매트릭스 재실행이 아닙니다.
- 향후 넛지 진입점은 동작의 일관성을 유지하기 위해 동일한 심층 인터뷰 잠금 억제 검사를 유지해야 합니다.
- 미래의 HUD/파이프라인 리더는 실시간 관찰 가능성 인터페이스에 의존하는 경우 새로운 ralplan 런타임 필드 이름을 유지해야 합니다.
