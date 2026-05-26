# 릴리스 준비 평가 - 0.8.1

날짜: **2026-03-05**
대상 버전: **0.8.1**
평결: **GO** ✅

## 검토된 범위

- 버전이 `0.8.1`(`package.json`, `package-lock.json`)으로 변경되었습니다.
- 변경 로그 업데이트(`CHANGELOG.md`)
- 출시 노트 초안(`docs/release-notes-0.8.1.md`)

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Full test suite | `npm test` | PASS (`1908` pass / `0` fail) |
| No-unused type gate | `npm run check:no-unused` | PASS |
| CLI help smoke | `node bin/omx.js --help` | PASS |
| Version smoke | `node bin/omx.js version` | PASS (`oh-my-codex v0.8.1`) |
| Status smoke | `node bin/omx.js status` | PASS |
| Doctor smoke | `node bin/omx.js doctor` | PASS (`9 passed, 0 warnings, 0 failed`) |
| Setup dry-run smoke | `node bin/omx.js setup --dry-run` | PASS |
| Cancel smoke | `node bin/omx.js cancel` | PASS |

## 위험 참고 사항

- 릴리스 검증에서 실패한 검사가 관찰되지 않았습니다.
- `npm test` 예상되는 장기 실행 알림/tmux 통합 테스트로 인해 런타임이 길었습니다(~721초). 모두 성공적으로 완료되었습니다.

## 최종 평결

릴리스 **0.8.1**은 현재 현지 검증 증거를 기반으로 **게시 준비**되었습니다.
