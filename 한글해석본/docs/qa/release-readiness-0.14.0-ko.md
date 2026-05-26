# 릴리스 준비 평가 - 0.14.0

날짜: **2026-04-19**
대상 버전: **0.14.0**
비교 기준: **`v0.13.2..origin/dev`**
평결: **GO** ✅

`0.14.0`은 현재 `dev` 릴리스 트파트을 새로운 `omx question` 대화형 진입점, 심층 인터뷰 질문 의무 시행, 기술 우선 검증자 기반 자동 연구, 자문 분류 라우팅(Routing), 명시적 런타임 실행 결과, 전문가 라우팅 정리 및 배송된 패키지에 대한 릴리스 게이팅 강화 등 마이너 릴리스로 패키징합니다.

## 검토된 범위

### 대화형 질문 흐름
- `src/cli/question.ts`, `src/question/*`, `src/cli/index.ts` — CLI 계약, 정책, 렌더러/UI 동작 및 도움말 화면에 대한 질문
- `skills/deep-interview/SKILL.md`, `src/question/deep-interview.ts` — 심층 인터뷰 의무 생성 및 완료 의미론

### 자동 조사 및 게이팅 중지
- `src/cli/autoresearch.ts`, `src/autoresearch/skill-validation.ts` — 하드 지원 중단 및 유효성 검사기 완료 요구 사항
- `src/scripts/codex-native-hook.ts` — 심층 인터뷰/자동 조사 보류 작업에 대한 차단 중지

### 프롬프트 라우팅 및 런타임 의미 체계
- `src/hooks/triage-heuristic.ts`, `src/hooks/triage-state.ts` — 자문 분류 분류자 및 지속성
- `src/runtime/run-outcome.ts`, `src/runtime/run-loop.ts` — 최종/비종단 결과 정규화
- `src/team/role-router.ts` — 전문가-라우팅 소유권 경계

### 출시 자료/패키지
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`
- `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.14.0.md`
- Lint 릴리스 게이트 및 패키지 설치/게시 경로 확인

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| TypeScript diagnostics | `npx tsc --noEmit --pretty false --project tsconfig.json` | PASS |
| Affected interactive/runtime suites | `node --test dist/cli/__tests__/question.test.js dist/question/__tests__/deep-interview.test.js dist/question/__tests__/renderer.test.js dist/question/__tests__/ui.test.js dist/cli/__tests__/autoresearch-guided.test.js dist/autoresearch/__tests__/skill-validation.test.js dist/hooks/__tests__/keyword-detector.test.js dist/hooks/__tests__/triage-heuristic.test.js dist/hooks/__tests__/triage-state.test.js dist/runtime/__tests__/run-outcome.test.js dist/runtime/__tests__/run-loop.test.js dist/scripts/__tests__/codex-native-hook.test.js dist/team/__tests__/role-router.test.js dist/cli/__tests__/question-helpers.test.js dist/question/__tests__/policy.test.js` | PASS |
| Secondary affected coverage | `node --test dist/catalog/__tests__/schema.test.js dist/catalog/__tests__/generator.test.js dist/cli/__tests__/autoresearch.test.js dist/hooks/__tests__/analyze-routing-contract.test.js dist/hooks/__tests__/analyze-skill-contract.test.js dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-auto-nudge.test.js dist/hooks/__tests__/notify-hook-cross-worktree.test.js dist/hooks/__tests__/notify-hook-managed-tmux.test.js dist/hooks/__tests__/notify-hook-ralph-resume.test.js dist/hooks/__tests__/notify-hook-tmux-heal.test.js dist/prompts/__tests__/guidance-contract.test.js dist/prompts/__tests__/orchestration-boundary-contract.test.js dist/prompts/__tests__/team-routing-contract.test.js` | PASS |
| Version sync contract | `node --test dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| Catalog drift check | `node dist/scripts/generate-catalog-docs.js --check` | PASS |
| Packed-install smoke | `npm run smoke:packed-install` | PASS |
| Publish-path packaging | `npm pack --dry-run` | PASS |

## 위험 평가

- **대화형 UI/런타임 동작**이 크게 변경되었습니다. 표적 테스트는 강력하지만 가장 높은 가치의 후속 관찰은 실제 tmux 및 다중 세션 연산자 흐름으로 유지됩니다.
- **린트 게이팅**은 이제 중첩된 로컬 생물군계 뿌리를 피하기 위해 추적된 소스 뿌리로 범위가 지정됩니다. 이를 통해 릴리스 증명을 재현할 수 있지만 광범위한 저장소 위생은 여전히 ​​생성된 아티팩트에 대한 CI 및 대상 검사에 의존합니다.
- **자동 조사/심층 인터뷰 중지 의미**는 더 엄격하며 장기 실행 세션에서 운영자의 놀라움이 있는지 릴리스 후에 모니터링해야 합니다.

## 최종 평결

릴리스 **0.14.0**은 위의 통과된 검증 증거를 기반으로 **`dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
