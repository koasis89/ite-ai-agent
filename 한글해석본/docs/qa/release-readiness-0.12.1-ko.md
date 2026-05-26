# 릴리스 준비 평가 - 0.12.1

날짜: **2026-04-07**
대상 버전: **0.12.1**
비교 기준: **`v0.12.0..HEAD`**
평결: **GO** ✅

`0.12.1`은 누적된 `v0.12.0..HEAD` 패치 트파트입니다. team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 JSON 위생, 대화형 작업자 PID 무결성, 실행 안전 고아 정리, 직접 실행 후속 조치, 알림-대체 강화, 신속한 강화 및 릴리스-부수 정렬입니다.

## 검토된 범위

- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 사서함 배달 멱등성, 리더-사서함 트리거 지침 및 대화형 작업자 PID 캡처(`src/team/state/mailbox.ts`, `src/team/runtime.ts`, `src/team/__tests__/state.test.ts`, `src/team/__tests__/runtime.test.ts`)
- 직접 리더 실행 기본값 및 실행 안전 고아 정리(`src/cli/index.ts`, `src/cli/cleanup.ts`, `src/cli/__tests__/index.test.ts`, `src/cli/__tests__/cleanup.test.ts`)
- 알림 대체 감시자 강화(`src/scripts/notify-fallback-watcher.ts`, `src/hooks/__tests__/notify-fallback-watcher.test.ts`)
- 릴리스 메타데이터, 프롬프트 자료 및 릴리스 문서(`package.json`, `package-lock.json`, `Cargo.toml`, `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.12.1.md`, `prompts/information-architect.md`)

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Targeted lint | `npx biome lint src/cli/index.ts src/cli/cleanup.ts src/cli/__tests__/index.test.ts src/cli/__tests__/cleanup.test.ts src/scripts/notify-fallback-watcher.ts src/hooks/__tests__/notify-fallback-watcher.test.ts src/team/runtime.ts src/team/state/mailbox.ts src/team/__tests__/runtime.test.ts src/team/__tests__/state.test.ts package.json` | PASS |
| CLI regression suite | `node --test dist/cli/__tests__/cleanup.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| Notify fallback regression suite | `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js` | PASS |
| Team runtime/state regression suite | `node --test dist/team/__tests__/state.test.js dist/team/__tests__/runtime.test.js` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 최종 평결

릴리스 **0.12.1**은 위의 검증된 `v0.12.0..HEAD` 패치 범위를 기반으로 **분기 푸시 및 PR 핸드오프 준비**가 완료되었습니다.
