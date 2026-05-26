# 최근 버그 회귀 강화 — 2026-04-11

이 브랜치에서 컴파일된 최근 버그 제품군에 대한 집중 회귀 추가 사항:

1. **계획 우선 후속 조치** — 계획 아티팩트가 이미 존재하면 승인된 짧은 `ralph` 후속 조치가 `ralplan`로 다시 돌아가지 않도록 유지합니다.
2. **Stop-hook 오래된 루트와 현재 세션** — 명시적으로 비활성인 세션 범위 심층 인터뷰 모드 상태를 활성 루트 대체에 대해 신뢰할 수 있는 것으로 처리하므로 오래된 루트 상태로 인해 자동 넛지가 억제되지 않습니다.
3. **분리된 tmux 실행 셸 드리프트 폴백** — 지원되지 않는 `SHELL` 값으로 인해 OMX가 rc 기반 cwd 드리프트에서 멀어지게 될 때 분리된 tmux 실행이 요청된 cwd를 유지하는지 확인합니다.
4. **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 작업자 상태 증거** — 강화-e2e 적용 범위를 깨지 않고 잘못된 형식의 외부 작업자 상태 입력을 허용하고 작업자가 `current_task_id`을 지속하기 전에 `blocked` 작업자 상태를 실제 시작 진행 상황으로 수락합니다.

해당 파일:

- `src/hooks/__tests__/keyword-detector.test.ts`
- `src/scripts/__tests__/codex-native-hook.test.ts`
- `src/cli/__tests__/launch-fallback.test.ts`
- `src/team/__tests__/runtime.test.ts`

검증 대상:

- `npm run build`
- `node --test dist/hooks/__tests__/keyword-detector.test.js dist/scripts/__tests__/codex-native-hook.test.js dist/cli/__tests__/launch-fallback.test.js dist/team/__tests__/runtime.test.js dist/team/__tests__/hardening-e2e.test.js`
- `npm run test:recent-bug-regressions:compiled`
