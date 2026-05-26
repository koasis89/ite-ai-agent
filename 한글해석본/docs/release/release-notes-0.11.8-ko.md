# 릴리스 노트 — 0.11.8

## 요약

`0.11.8`은 심층 인터뷰 상태가 활성화된 동안 모든 넛지를 비활성화하고 중복된 새로운 리더 넛지 방지를 강화하는 `0.11.7` 이후의 핫픽스 릴리스입니다.

## 포함된 수정 사항

- 심층 인터뷰 상태는 리더 넛지, 작업자 유휴 넛지, Ralph 연속 조종 및 자동 넛지를 억제합니다.
- 대체 감시자 리더는 새로운 사서함 활동에 반응하는 대신 오래된 상태로만 유지됩니다.
- 알림 후크 회귀 적용 범위는 이제 동일한 새 메일함 메시지가 반복 실행 시 다시 넛지되지 않음을 증명합니다.
- 릴리스 메타데이터는 Node 및 Cargo 패키지 전체에서 `0.11.8`로 범프됩니다.

## 검증 증거

### 타겟 회귀 제품군

- `npm run build` ✅
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-hook-auto-nudge.test.js` ✅
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-hook-team-leader-nudge.test.js` ✅
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-fallback-watcher.test.js` ✅

## 남은 위험

- 적용 범위는 알림 후크 및 대체 감시자 넛지 경로를 대상으로 합니다. 더 광범위한 런타임 동작은 여전히 ​​전체 제품군 및 라이브 tmux 워크플로에 의존합니다.
- 향후 넛지 진입점은 이 핫픽스 계약을 보존하기 위해 동일한 심층 인터뷰 억제 검사를 재사용해야 합니다.
