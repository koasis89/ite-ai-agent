# 릴리스 준비 초안 - 0.9.1

날짜: **2026-03-13**
대상 버전: **0.9.1**
판정: **GO(로컬 릴리스에 중요한 관문 통과)**

`0.9.1`은 역사적으로 빨간색이었던 `v0.9.0` 릴리스를 대체하기 위한 가장 작은 기본 기반 핫픽스 릴리스입니다.

## 검토된 범위

- `main` / 멤버 `v0.9.0` 기준
- 연기 수화 자산 현지화를 위한 PR [#806](https://github.com/Yeachan-Heo/oh-my-codex/pull/806) 핫픽스(`d86165d`)
- `0.9.1`에 필요한 버전 범프 및 릴리스 메타데이터 업데이트

## 검증 계획

| Check | Command | Status |
|---|---|---|
| Version sync | `node scripts/check-version-sync.mjs --tag v0.9.1` | PASS |
| Lint | `npm run lint` | PASS |
| TypeScript noEmit | `npx tsc --noEmit` | PASS |
| No-unused gate | `npm run check:no-unused` | PASS |
| Full test suite | `npm test` | PASS (`2397` pass / `0` fail) |
| Smoke test coverage | `node --test scripts/__tests__/smoke-packed-install.test.mjs` | PASS (`1` pass / `0` fail) |
| Release build | `npm run build:full` | PASS |
| Packed install smoke | `npm run smoke:packed-install` | PASS |
| Packed tarball dry run | `npm pack --dry-run` | PASS (`oh-my-codex-0.9.1.tgz`) |

## 이전 릴리스 노트

- **`v0.9.0`은 역사적으로 빨간색으로 유지됩니다.**
- **`v0.9.1`은 완전한 대체 릴리스입니다.**

## 지역 증거 요약

- `package=0.9.1 workspace=0.9.1 tag=v0.9.1`으로 버전 동기화가 전달되었습니다.
- `Checked 337 files in 72ms. No fixes applied.`으로 린트가 전달되었습니다.
- `2397` 테스트 통과 및 `0` 실패로 전체 테스트 스위트 통과
- `packed install smoke: PASS`으로 전달된 패킹된 설치 연기
- 테스트 실행 타르볼이 생성됨 `oh-my-codex-0.9.1.tgz`
