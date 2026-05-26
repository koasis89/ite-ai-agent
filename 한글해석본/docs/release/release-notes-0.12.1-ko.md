# 릴리스 노트 — 0.12.1

## 요약

`0.12.1`은 누적된 `v0.12.0..v0.12.1` 패치 트파트입니다. 기계가 읽을 수 있는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 출력 정리, 대화형 작업자 PID 메타데이터 수정, 실행 안전 고아 정리, 직접 실행 후속 조치, 알림 대체 감시자 강화, 엄격한 운영자 안내 및 동기화된 `0.12.1` 릴리스 자료입니다.

## 수정 사항 및 변경 사항이 포함되었습니다.

- 리더 사서함 정리는 더 이상 중복된 전달 메시지 브리지 호출을 재생하지 않으므로 `omx team status --json`은 구문 분석 가능한 상태로 유지됩니다.
- 대화형 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 메타데이터는 이제 확인된 창 ID의 PID를 기록하고 이를 구성/ID 상태로 유지합니다.
- 분리된 OMX MCP 정리로 이제 라이브 실행기/세션 트리가 보존됩니다.
- 대체 감시자 일회 모드 로그가 자동으로 증가하는 대신 회전합니다.
- 분리된 tmux가 명시적으로 요청되지 않는 한 리더 실행은 이제 tmux 외부에서 직접 모드로 기본 설정됩니다.
- 릴리스 메타데이터 및 보충 자료는 Node, Cargo, 변경 로그, 릴리스 본문 및 릴리스 준비 문서 전체에서 `0.12.1`에 맞춰 정렬됩니다.

## 검증 증거

- `npm run build` ✅
- `npx biome lint src/cli/index.ts src/cli/cleanup.ts src/cli/__tests__/index.test.ts src/cli/__tests__/cleanup.test.ts src/scripts/notify-fallback-watcher.ts src/hooks/__tests__/notify-fallback-watcher.test.ts src/team/runtime.ts src/team/state/mailbox.ts src/team/__tests__/runtime.test.ts src/team/__tests__/state.test.ts package.json` ✅
- `node --test dist/cli/__tests__/cleanup.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/version-sync-contract.test.js` ✅
- `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js` ✅
- `node --test dist/team/__tests__/state.test.js dist/team/__tests__/runtime.test.js` ✅
- `npm run smoke:packed-install` ✅

## 남은 위험

- 이는 전체 CI 매트릭스 재실행이 아닌 로컬 확인 패스입니다.
- 출시 후 모니터링은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 JSON 출력, 대화형 작업자 수명 주기 원격 분석 및 알림 대체 동작을 주시해야 합니다.
