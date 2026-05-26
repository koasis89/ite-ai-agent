# 릴리스 준비 평가 - 0.8.4

날짜: **2026-03-06**
대상 버전: **0.8.4**
평결: **GO** ✅

## 검토된 범위

- 버전이 `0.8.4`(`package.json`, `package-lock.json`)으로 변경되었습니다.
- 변경 로그 업데이트(`CHANGELOG.md`)
- 출시 노트 초안(`docs/release-notes-0.8.4.md`)
- `fed035b` 및 `6aa577d` 커밋을 통해 `dev`에 이미 병합된 설정 새로 고침 개선 사항
- 감시자 종료 정리 및 설정 시 `check:no-unused` 정리를 위한 릴리스 검증 강화

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Full test suite | `npm test` | PASS (`1940` pass / `0` fail, `duration_ms 206426.374278`) |
| No-unused type gate | `npm run check:no-unused` | PASS |
| CLI help smoke | `node bin/omx.js --help` | PASS |
| Version smoke | `node bin/omx.js version` | PASS (`oh-my-codex v0.8.4`) |
| Doctor smoke | `node bin/omx.js doctor` | PASS (`9 passed, 0 warnings, 0 failed`) |
| Setup dry-run smoke | `node bin/omx.js setup --dry-run` | PASS |
| Targeted watcher regression | `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js` | PASS (`6` pass / `0` fail) |

## 위험 참고 사항

- 이는 `omx setup` 새로 고침 동작 및 관리형 모델 업그레이드 메시지를 중심으로 한 집중 패치 릴리스입니다.
- 기본 회귀 인터페이스은 반복 실행 및 범위 지정 설치 전반에 걸친 설정/구성 새로 고침 동작입니다.
- 릴리스 검증을 통해 최종 게이팅 중에 두 가지 추가 품질 문제가 발견되었습니다. 하나의 스트리밍 테스트에서 감시자 종료 정리 경주와 엄격한 사용되지 않음 검사를 통해 포착된 사용되지 않은 설정 프롬프트 경로입니다. 두 가지 모두 해결되었으며 전체 릴리스 게이트가 깨끗하게 다시 실행되었습니다.

## 최종 평결

릴리스 **0.8.4**는 위의 새로운 현지 검증 증거를 기반으로 **게시 준비가 되었습니다**.
