# 릴리스 준비 평가 - 0.12.3

날짜: **2026-04-08**
대상 버전: **0.12.3**
비교 기준: **`v0.12.2..HEAD`**
평결: **GO** ✅

`0.12.3`은 PR [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364)(`$team` 프롬프트 라우팅(Routing) 정확성 및 중복 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 해제)을 제공하는 `0.12.2`에 대한 긴밀한 후속 조치입니다. 이는 `0.12.2`을 위한 것이지만 `0.12.2` 컷 후 충돌 해결과 릴리스-부수적 정렬을 완료했습니다.

## 검토된 범위

- `$team` 키워드 감지 및 프롬프트 라우팅 솔기(`src/hooks/keyword-detector.ts`, `src/hooks/__tests__/keyword-detector.test.ts`, `src/scripts/codex-native-hook.ts`, `src/scripts/__tests__/codex-native-hook.test.ts`)
- `startTeam` 중복된 동명 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 가드 (`src/team/runtime.ts`, `src/team/__tests__/runtime.test.ts`)
- 릴리스 메타데이터 및 릴리스 문서(`package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.12.3.md`)

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full test suite | `npm test` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |

## 최종 평결

릴리스 **0.12.3**은 위의 검증된 `v0.12.2..HEAD` 패치 범위를 기반으로 **분기 푸시 및 PR 핸드오프 준비**가 완료되었습니다.
