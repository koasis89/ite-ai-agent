# 릴리스 준비 평가 - 0.8.2

날짜: **2026-03-06**
대상 버전: **0.8.2**
평결: **GO** ✅

## 검토된 범위

- 버전이 `0.8.2`(`package.json`, `package-lock.json`)으로 변경되었습니다.
- 변경 로그 업데이트(`CHANGELOG.md`)
- 출시 노트 초안(`docs/release-notes-0.8.2.md`)
- `main`에 맞춰진 최종 릴리스 후보

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS (`0:07.48`) |
| Full test suite | `npm test` | PASS (`1933` pass / `0` fail, `2:19.38`) |
| No-unused type gate | `npm run check:no-unused` | PASS (`0:04.48`) |
| CLI help smoke | `node bin/omx.js --help` | PASS |
| Version smoke | `node bin/omx.js version` | PASS (`oh-my-codex v0.8.2`) |
| Status smoke | `node bin/omx.js status` | PASS |
| Doctor smoke | `node bin/omx.js doctor` | PASS (`9 passed, 0 warnings, 0 failed`) |
| Setup dry-run smoke | `node bin/omx.js setup --dry-run` | PASS |
| Cancel smoke | `node bin/omx.js cancel` | PASS |

## 위험 참고 사항

- 최종 릴리스 검증에서는 실패한 검사가 관찰되지 않았습니다.
- `npm test`에는 장기 실행 알림/tmux/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 통합 적용 범위가 포함되어 있지만 모든 제품군이 성공적으로 완료되었습니다.
- 릴리스 세부 정보 태그 병합 PR `#571`, `#572`, `#575`, `#576`, `#579`, `#580`, `#581`, `#582`, `#583`, `#584` 및 관련 문제 `#564`, `#573`, `#574`, `#578`.

## 최종 평결

릴리스 **0.8.2**는 현재 현지 검증 증거를 기반으로 **게시 준비**되었습니다.
