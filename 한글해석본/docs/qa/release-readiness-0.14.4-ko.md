# 릴리스 준비 평가 - 0.14.4

날짜: 2026-04-24
대상 버전: **0.14.4**
기본: `v0.14.3`
후보 지점: `hotrelease/0.14.4-gpt55`

## 범위

`0.14.4`은 정확한 `gpt-5.4-mini` 이음새와 `gpt-5.3-codex-spark` 스파크 파트을 유지하면서 기본 프론티어 파트을 `gpt-5.4`에서 `gpt-5.5`로 승격합니다. 또한 이 릴리스에서는 해당 모델 계약을 중심으로 설정/구성 메시징, 템플릿, 테스트 및 패키지 메타데이터를 정렬합니다.

## 변경된 실행 경로가 검토되었습니다.

- `src/config/*` — 기본 프론티어 모델 계약과 생성기/설정 회귀 적용 범위.
- `src/cli/*` — Codex 에이전트(Agent) 기본값, 설정 새로 고침 예상, 설치 제거/의사 및 대체 메시지 탐색.
- `src/team/*`, `src/hooks/*`, `src/agents/*` — 프론티어 기본값을 표시하거나 검증하는 런타임/프롬프트 계약 기대치입니다.
- `crates/omx-explore/*` — 폴백 기본 모델 동작을 살펴봅니다.
- `README.md`, `docs/*.html`, `docs/prompt-guidance-contract.md`, `templates/AGENTS.md` — 미니/스파크 파트을 유지하면서 새로운 프론티어 기본값에 맞춰 사용자 지향 및 생성된 지침을 제공합니다.
- 릴리스 자료 — `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md` 및 이 릴리스 노트/준비 문서는 `0.14.4`에 맞춰져 있습니다.

## 검증 증거

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript build | `npm run build` | PASS |
| Targeted model/default suites | `node --test dist/agents/__tests__/definitions.test.js dist/agents/__tests__/native-config.test.js dist/team/__tests__/model-contract.test.js dist/utils/__tests__/agents-model-table.test.js dist/cli/__tests__/setup-agents-overwrite.test.js` | PASS |
| Targeted executor launch defaults | `node --test --test-name-pattern=... dist/team/__tests__/runtime.test.js` | PASS |
| Scope check | `git diff --name-status v0.14.3..HEAD` plus plugin-path grep | PASS |

## 알려진 한계

- CI 병합 게이팅은 여전히 ​​GitHub에서 녹색에 도달하는 교체 PR에 따라 달라집니다.
- 이 분기는 `v0.14.3`에서 재구축되었으며 관련 없는 개발/플러그인 레이아웃 변경 사항을 의도적으로 제외합니다.

## 평결

릴리스 **0.14.4**는 이 분기에 대한 위의 검증 게이트를 통과하고 GitHub CI가 녹색이 되면 **PR/CI 검증 및 릴리스 컷 준비**가 완료됩니다. 핫 릴리스를 `main`에 병합하고, 범프를 `dev`에 선별하고, 병합된 `main`에서 `v0.14.4` 태그를 생성하는 것이 안전합니다.
