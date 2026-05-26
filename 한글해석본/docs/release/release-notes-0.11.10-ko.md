# 릴리스 노트 — 0.11.10

## 요약

`0.11.10`은 인용 회귀에 대한 승인된 실행 핸드오프 구문 분석을 강화하고 다음 클린 릴리스 컷을 위해 릴리스 메타데이터를 동기화하는 `0.11.9` 이후의 집중 패치 릴리스입니다.

## 수정 사항 및 변경 사항이 포함되었습니다.

- 계획 아티팩트 테스트는 이제 작은따옴표로 묶인 승인된 `$ralph` 실행 힌트를 포함합니다.
- 계획 아티팩트 테스트는 이제 작은따옴표로 묶인 승인된 `$team` 실행 힌트를 포함합니다.
- 릴리스 메타데이터는 Node 및 Cargo 패키지 전체에서 `0.11.10`로 범프됩니다.
- `0.11.10` 컷에 대한 릴리스 자료가 새로 고쳐졌습니다.

## 검증 증거

### 릴리스 중심 회귀 제품군

- `npx biome lint src/planning/__tests__/artifacts.test.ts` ✅
- `npm run build && node --test dist/planning/__tests__/artifacts.test.js` ✅
- `npm run test:sparkshell` ✅
- `npm run test:team:cross-rebase-smoke` ✅
- `npm run smoke:packed-install` ✅
- `npm test` ✅

## 남은 위험

- 이 릴리스는 의도적으로 범위를 좁히고 주로 테스트/메타데이터에 중점을 둡니다. 프로덕션 런타임 동작 변경 사항을 도입하지 않습니다.
- 향후 출시 힌트 문법 변경으로 인해 Ralph 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 경로 모두에 대해 별칭 양식 적용 범위가 유지되어야 합니다.
