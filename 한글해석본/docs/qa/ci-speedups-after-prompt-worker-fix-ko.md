# 신속한 작업자 분해 수정 후 CI 속도 향상 증거

날짜: 2026-04-09

## 목표

현재 워크플로우 형태에 대해 수정 후 CI 속도 향상을 확인하고 필수 확인 의미 체계를 안정적으로 유지하며 경로 필터 취약성을 방지합니다.

## 필수 확인/트리거 안전

- `.github/workflows/ci.yml`은(는) `main`, `dev` 및 `experimental/dev`에 대해 `push` 및 `pull_request`에서 계속 트리거됩니다.
- 워크플로는 `paths:` 또는 `paths-ignore:` 필터를 사용하지 **않기** 때문에 보호 분기 검사를 영구 보류 상태로 건너뛸 수 없습니다.
- `CI Status`은 여전히 ​​동일한 필수 작업을 관리합니다.
  - `Rust Format`
  - `Rust Clippy`
  - `Lint`
  - `Typecheck`
  - `Test`
  - `Coverage Gate (Team Critical)`
  - `Coverage Report (TypeScript Full)`
  - `Coverage Report (Rust)`
  - `Ralph Persistence Gate`
  - `Build (Full Source Build)`

## 측정된 증거

### 이 작업 트리의 로컬 측정

- `npm run build` → `7.47s`
- 컴파일된 `team-state-runtime` 파트
  `node dist/scripts/run-test-files.js dist/team/__tests__ dist/state/__tests__ dist/ralph/__tests__ dist/ralplan/__tests__ dist/runtime/__tests__`
  → `103.70s` (`exit 1`, 기존 제품군 실패 보존)
- 컴파일된 `hooks-notify-platform` 파트
  `node dist/scripts/run-test-files.js dist/hooks/__tests__ dist/hooks/code-simplifier/__tests__ dist/hooks/extensibility/__tests__ dist/notifications/__tests__ dist/mcp/__tests__ dist/hud/__tests__ dist/verification/__tests__ dist/openclaw/__tests__`
  → `31.75s` (`exit 1`, 기존 제품군 실패 보존)
- 컴파일된 `cli-core-rest` 파트 + 카탈로그 확인
  `node dist/scripts/run-test-files.js ... && node dist/scripts/generate-catalog-docs.js --check`
  → `9.08s` (`exit 0`)

### 작업 2에 의해 이미 기록된 기존 분할 파트 기준선

- `team-state-runtime`(파트별 재구축 포함) → `103.52s`
- `hooks-notify-platform`(파트별 재구축 포함) → `29.64s`
- `cli-core-rest`(파트별 재구축 포함) → `9.72s`

## 해석

### 1) Node 20 제품군을 분할하면 테스트 꼬리 지연 시간이 크게 줄어듭니다.

이전 단일 `Test (Node 20 / full)` 병목 현상은 3개의 결정적 그룹 파트과 기존 노드 22 연기 파트으로 대체되었습니다. 이는 하나의 길고 불투명한 작업을 더 작고 기여 가능한 파트으로 바꾸는 동시에 필수 확인 단순성을 유지합니다.

### 2) 게이트된 후속 작업에 대해서는 한 번 빌드된 아티팩트 재사용이 여전히 가치가 있습니다.

`build-dist`은(는) 다음을 통해 계속 재사용됩니다.

- `Coverage Gate (Team Critical)`
- `Coverage Report (TypeScript Full)`
- `Ralph Persistence Gate`
- `Build (Full Source Build)`

해당 파트은 이미 다른 전제 조건(`typecheck`, Rust 게이트 또는 둘 다)을 기다리고 있으므로 공유 `dist/` 빌드는 각 다운스트림 작업 내에서 다시 비용을 지불하는 대신 해당 전제 조건 시간을 겹칠 수 있습니다.

### 3) 분할 테스트 매트릭스 내에서 `build-dist`을 재사용하는 것은 확실한 벽시계 승리 **아님**

로컬 분할 파트 타이밍은 파트 내 재구축을 제거해도 가장 느린 테스트 파트이 실질적으로 개선되지 않는다는 것을 보여줍니다. 테스트 매트릭스 자체가 첫 번째 게이트된 소비자이기 때문에 `build-dist`을 기다리도록 강제하면 세 개의 분할 파트 모두에 앞서 빌드를 직렬화하고 중요 경로가 증가할 위험이 있습니다. 증거는 다음을 뒷받침합니다.

- 분할된 테스트 파트을 자체적으로 유지
- 이미 다른 전제조건이 있는 다운스트림 제한 작업에서 아티팩트 재사용을 유지합니다.

## 사용된 확인 명령

- `npm run build`
- `npx tsc --noEmit`
- `npm run check:no-unused`
- `npm run lint`
- `node --test dist/verification/__tests__/ci-rust-gates.test.js dist/verification/__tests__/ralph-persistence-gate.test.js dist/cli/__tests__/package-bin-contract.test.js`
- `npm run test:ralph-persistence:compiled`
- 위에 나열된 시간 제한 그룹 파트 명령

## 결과

현재 저장소는 더 안전한 CI 속도 향상 형태를 사용하고 있습니다.

1. 경로 필터링 필수 검사 없음
2. Node 20 전체 테스트 스위트를 결정론적 그룹 파트으로 분할
3. 필수 작업과 겹칠 수 있는 다운스트림 작업에서만 `build-dist` 재사용

여기서는 필수 경로에서 `coverage-ts-full`의 수준을 내리는 것을 정당화할 수 있는 증거가 없습니다.
