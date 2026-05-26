# PR 초안: 검증된 Ralph 페인 앵커를 보존하고 tmux-hook 대상 드리프트를 방지합니다.

## 대상 지점
`dev`

## 요약
이 후속 조치는 Ralph 재개/계속 작업을 검토하는 동안 표시된 관리되는 tmux 복구 경로의 창 리바인딩 드리프트를 수정합니다.

주요 문제는 저장된 창 드리프트였습니다. Ralph 창 앵커가 올바른 관리 세션의 일부로 이미 확인되면 복구 시 전체 tmux 세션을 다시 검색하고 현재 초점이 맞춰진 Codex 창에 다시 바인딩하거나 역사적으로 Codex로만 시작된 셸 저하 창으로 대체할 수 있습니다. 다중 창 Codex 세션에서는 향후 감시자 또는 자동 넛지 주입을 잘못된 파트으로 자동 이동할 수 있습니다.

현재 `dev`에서는 사전 보호 tmux-hook 대상 드리프트 경로가 프로덕션 코드에 이미 없습니다. 이 분기는 해당 불변성을 집중 회귀로 덮어서 저장소 범위 세션 대상이 건너뛴 차례에 다시 작성되지 않도록 합니다.

## 변경 사항
- 분할 관리 창 휴리스틱을 통해 `TMUX_PANE` 감지는 허용된 상태를 유지하면서 저장된 앵커 보존은 엄격하게 유지됩니다.
- 일시적인 명령 상태 조회 실패 시 확인된 앵커를 계속 유지하면서 단순히 Codex로 시작된 셸 대신 라이브 Codex 관리 창처럼 보이는 경우에만 확인된 앵커 창을 `resolveManagedPaneFromAnchor()`에 유지합니다.
- 계속 넛지를 보내기 전에 현재 관리되는 세션에 대해 저장된 창 앵커를 다시 해결하도록 Ralph 계속 감시자에게 가르칩니다.
- 앵커가 사라지거나 더 이상 에이전트(Agent) 소유로 보이지 않는 경우에만 tmux 세션을 다시 검색하고 실시간 관리되는 형제가 없는 경우 페일클로즈됩니다.
- 직접 관리 창 도우미, 감시자 리바인딩 동작, 자동 넛지 앵커 보존/노드-셸 업그레이드 경로 및 사전 보호 구성 드리프트 처리에 대한 회귀를 추가합니다.

## 이것이 좋은 이유
- 포커스가 변경되었기 때문에 Ralph 계속/재개 상태가 Codex 창 간에 이동하는 것을 방지합니다.
- 저장된 관리형 앵커 계약에 맞춰 감시자 및 자동 넛지 동작을 유지합니다.
- 현재 `dev` 사전 가드 건너뛰기 불변성을 테스트에 의해 잠긴 상태로 유지하므로 저장소 범위 세션 대상이 창 ID로 다시 이동하지 않습니다.
- 감시자 복구가 알림 후크/자동 넛지와 동일한 라이브 앵커 계약을 따르도록 합니다.

## 확인
- [x] `npx biome lint src/scripts/notify-hook/managed-tmux.ts src/scripts/notify-fallback-watcher.ts src/scripts/notify-hook/auto-nudge.ts src/hooks/__tests__/notify-hook-managed-tmux.test.ts src/hooks/__tests__/notify-hook-tmux-heal.test.ts src/hooks/__tests__/notify-fallback-watcher.test.ts src/hooks/__tests__/notify-hook-auto-nudge.test.ts docs/prs/dev-fix-ralph-live-pane-invariant.md`
- [x] `npm run build`
- [x] `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-auto-nudge.test.js dist/hooks/__tests__/notify-hook-managed-tmux.test.js dist/hooks/__tests__/notify-hook-tmux-heal.test.js`

## 관련된
- Ralph 이력서에 대한 후속 조치/관리형 tmux 치유 검토 통과
