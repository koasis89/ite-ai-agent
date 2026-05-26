# 릴리스 노트 — 0.11.13

## 요약

`0.11.13`은 릴리스 분기를 빌드 가능한 상태로 복원하고, 리더 넛지 및 메일함 전달을 위한 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/런타임 전달 무결성을 개선하고, Windows/작업 트리 감독 경로를 보다 안정적으로 유지하는 `0.11.12` 이후의 패치 릴리스입니다.

## 수정 사항 및 변경 사항이 포함되었습니다.

- 릴리스 브랜치에서 실수로 자리 표시자가 손상된 후 `src/hooks/__tests__/notify-fallback-watcher.test.ts` 복원
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 리더 메일함 전달은 런타임/CLI 연결 전반에 걸쳐 안정적으로 유지됩니다.
- 바쁜 Codex 리더 창은 자동 지연 대신 대기열에 있는 넛지를 받을 수 있습니다.
- 런타임 핸드오프 중 잘못된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 코디네이션(Coordination) 신호가 억제됩니다.
- Windows/작업 트리 HUD 타겟팅 및 리더 활동 폴링은 분리/작업 트리 실행 시 더욱 안정적으로 유지됩니다.
- 폴백 넛지는 활성 심층 인터뷰 입력 잠금을 존중합니다.
- 제거는 레거시 스킬(Skill)에 대해 명확하게 경고하고 종료 정리는 분리된 작업자 자손을 보다 안전하게 수확합니다.
- 릴리스 메타데이터는 노드, Cargo 작업 공간 메타데이터, 잠금 파일 및 릴리스 자료 전반에서 `0.11.13`에 맞춰 정렬됩니다.

## 검증 증거

### 릴리스 중심 검증 제품군

- `cargo test -p omx-runtime-core` ✅
- `npm run build` ✅
- `npm run lint` ✅
- `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js` ✅
- `node --test dist/cli/__tests__/version-sync-contract.test.js` ✅
- `npm test` ✅
- `npm run smoke:packed-install` ✅
- `git diff --check origin/main...HEAD` ✅

## 남은 위험

릴리스 확인 증거는 `docs/qa/release-readiness-0.11.13.md`에 기록됩니다.

- 이 확인 패스는 릴리스 중심이며 로컬입니다. 전체 GitHub Actions 매트릭스 재실행이 아닙니다.
- 패치에는 `0.11.12` 이후 광범위한 런타임/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 인터페이스이 포함되어 있으므로 릴리스 후 모니터링은 리더 사서함/넛지 동작 및 Windows 작업 트리 흐름에 특별한 주의를 기울여야 합니다.
