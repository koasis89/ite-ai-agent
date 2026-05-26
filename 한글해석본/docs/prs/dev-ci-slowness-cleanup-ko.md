# 초안 PR 본문: 슬림 CI 중복 작업

> 대상 기본 분기: `CONTRIBUTING.md` 및 `.github/PULL_REQUEST_TEMPLATE.md`당 일반 기여에 대한 `dev`.

## 요약

CI 워크플로는 여러 파트에 걸쳐 종속성 설치, 유형 확인, 빌드 및 보고 전용 적용 범위 작업을 반복적으로 수행했습니다. 이 정리는 중복 작업을 줄이면서 릴리스 안전 신호를 유지합니다. 하나의 Node 20 빌드 아티팩트는 컴파일된 테스트/적용 범위 게이트를 피드하고, TypeScript 전용 검사는 단일 런타임에 유지되며, Node 22는 런타임 간 신뢰도를 위해 집중된 스모크 파트으로 유지되며, 비용이 많이 드는 전체 TypeScript/Rust 적용 범위 아티팩트 보고서는 더 이상 모든 CI 실행에 필요하지 않습니다. 린 Rust 적용 범위 요약 파트은 `crates/omx-sparkshell/Cargo.toml` 매니페스트 경로를 포함하여 Rust 테스트를 계속 실행합니다.

## 변경 사항

- `check:no-unused` 게이트를 유지하면서 TypeScript 전용 검사에 대한 중복 런타임 매트릭스 작업을 제거합니다.
- 각 적용 범위 명령을 다시 빌드하는 대신 컴파일된 테스트 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)에 중요한 적용 범위 파트을 위해 미리 빌드된 `dist` 아티팩트를 재사용하세요.
- 필수 CI 상태 경로에서 보고서 전용 전체 TypeScript 및 Rust 적용 범위 아티팩트 작업을 제거합니다. 작업 공간 및 `crates/omx-sparkshell/Cargo.toml`에 대해 필수 Rust 테스트/적용 범위 요약 신호를 유지하고 강제된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/상태 적용 범위 게이트를 유지합니다.
- PR 템플릿 유효성 검사 체크리스트에 매핑되는 로컬 명령을 문서화하여 CI 파트을 검토 가능하게 유지하세요.

## 확인

- [x] `python3 - <<'PY' ... yaml.safe_load('.github/workflows/ci.yml') ... PY` — 워크플로를 성공적으로 구문 분석했으며 확인된 작업 메타데이터가 존재합니다.
- [x] `npx tsc --noEmit` — TypeScript 검사가 통과되었습니다.
- [x] `npm run check:no-unused` — 사용되지 않은 TypeScript 검사가 통과되었습니다.
- [x] `npm run lint` — `src`에 대해 생물 군계 린트가 통과되었습니다.
- [x] `npm run build` — `dist`을(를) 성공적으로 컴파일했습니다.
- [x] `node --test dist/verification/__tests__/ci-rust-gates.test.js dist/cli/__tests__/package-bin-contract.test.js` — 필수 Rust 테스트/적용 범위 요약 게이트를 포함하여 업데이트된 워크플로/패키지 계약 테스트가 통과되었습니다.
- [x] `python3 - <<'PY' ... assert workflow job graph ... PY` — 확인된 보고 전용 적용 작업이 없고 필수 게이트가 남아 있습니다.
- [ ] `npm test` — 이 PR은 중복된 전체 CI 중복을 특별히 제거하므로 로컬로 실행되지 않습니다. 대상 워크플로/패키지 테스트와 Lint/typecheck/빌드가 실행되었습니다.
- [ ] `npm run coverage:team-critical:compiled` — 로컬로 실행되지 않습니다. team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)에 중요한 적용 범위 게이트는 CI에 연결되어 있으며 의미상 변경되지 않습니다.
- [x] `cargo llvm-cov --workspace --summary-only` 및 `cargo llvm-cov --manifest-path crates/omx-sparkshell/Cargo.toml --summary-only` — `omx-sparkshell` 매니페스트 경로를 포함하여 로컬로 전달된 Rust 테스트 및 적용 범위 요약입니다.
- [ ] `omx doctor` — 설정/구성 동작이 변경되지 않는 한 필요하지 않습니다.

## 체크리스트

- [x] PR은 초점을 맞추고 관련 없는 변경을 피합니다.
- [x] 문서 업데이트: 이 PR 증거 노트는 CI 정리 근거 및 유효성 검사 명령을 기록합니다.
- [x] 이전 버전과의 호환성 영향 고려: 런타임 동작은 변경되지 않습니다. 변경 사항은 CI 오케스트레이션/스크립트 연결에만 해당됩니다.

## 리뷰어 메모

- 청소로 인해 모든 교차 런타임 신호가 제거되지 않도록 노드 22 연기 경로를 보존합니다.
- 빌드 아티팩트를 다운로드한 후 CI에서 컴파일된 적용 범위 명령을 선호합니다. 소스 수준 적용 범위 스크립트는 여전히 로컬 기여자의 편의를 위해 먼저 빌드될 수 있습니다.
- 향후 편집으로 인해 아티팩트 소비 작업에서 `npm ci`이 제거되면 병합하기 전에 필요한 모든 CLI/dev 종속성을 아티팩트 또는 다른 명시적 설정 단계에서 사용할 수 있는지 확인하세요.
