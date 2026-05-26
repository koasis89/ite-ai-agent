# 릴리스 준비 평가 - 0.14.3

날짜: 2026-04-22
대상 버전: **0.14.3**
기본: `v0.14.2`
후보 지점: `release/0.14.3`

## 범위

`0.14.3`은 `v0.14.2..dev` 패치 트파트을 패키징합니다: 질문/심층 인터뷰 창 반환 신뢰성, 탐색을 위한 프로젝트-로컬 `CODEX_HOME` 실행 해결, TOML 루트 항목 복구 설정, HUD 코디네이션(Coordination) 창 대상 지정, 심층 인터뷰 요약 게이트 및 오래된 응답 코디네이션(Coordination), Ultrawork 프로토콜 동기화, BusyBox 정리 호환성, 오래된 중지/자동 조종 루프 방지, 정식 런타임 감독자 이벤트, Docker-호스트 tmux 질문 브리징 및 기본 Windows psmux 작업자 창 부트스트랩 강화.

## 변경된 실행 경로가 검토되었습니다.

- `src/question/*` — 질문 렌더러 전략, 답변 삽입, 상태, UI 및 심층 인터뷰 시행 코디네이션(Coordination).
- `src/hooks/*` / `src/scripts/*` — 키워드/상태 지침, 기본 후크 중지/작동 이벤트 처리 및 런타임 디스패치 알림.
- `src/team/*` / `src/hud/*` — tmux 작업자 시작, psmux/Windows 처리, HUD 크기 코디네이션(Coordination)/코디네이션(Coordination) 타겟팅 및 정식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/런타임 이벤트.
- `src/cli/*` — 정리 프로세스 검색, 탐색/프로젝트-로컬 Codex 홈 실행 컨텍스트 및 CLI 명령 라우팅(Routing).
- `src/config/generator.ts` — 여러 줄 루트 TOML 문자열 및 실행기 시간 초과 복구를 위한 구성 병합/복구를 설정합니다.
- `skills/deep-interview/SKILL.md`, `skills/ultrawork/SKILL.md`, 문서/계약 — 운영자 지침 및 런타임 이벤트 계약 업데이트.
- 릴리스 자료 — `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md` 및 이 릴리스 노트/준비 문서는 `0.14.3`에 맞춰져 있습니다.

## 검증 증거

| Gate | Command | Result |
| --- | --- | --- |
| Full Node/build/catalog suite | `npm test` | PASS — 3910 tests, 0 failed; catalog check ok |
| Type unused gate | `npm run check:no-unused` | PASS |
| Rust workspace tests | `cargo test --workspace` | PASS |
| Lint gate | `npm run lint` | PASS |
| TypeScript build | `npm run build` | PASS |
| Changed-path targeted suites | `node --test dist/cli/__tests__/cleanup.test.js dist/cli/__tests__/explore.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/question.test.js dist/config/__tests__/generator-idempotent.test.js dist/hooks/__tests__/clawhip-event-contract.test.js dist/hooks/__tests__/deep-interview-contract.test.js dist/hooks/__tests__/keyword-detector.test.js dist/hooks/__tests__/skill-guidance-contract.test.js dist/hooks/extensibility/__tests__/events.test.js dist/hud/__tests__/reconcile.test.js dist/question/__tests__/deep-interview.test.js dist/question/__tests__/renderer.test.js dist/question/__tests__/state.test.js dist/question/__tests__/ui.test.js dist/scripts/__tests__/codex-native-hook.test.js dist/scripts/notify-hook/__tests__/operational-events.test.js dist/team/__tests__/events.test.js dist/team/__tests__/runtime.test.js dist/team/__tests__/tmux-session.test.js` | PASS |

## 알려진 한계

- 외부 푸시/npm/GitHub 릴리스 게시는 저장소 증거 외부의 로컬 자격 증명 및 네트워크 가용성에 따라 달라집니다.

## 평결

릴리스 **0.14.3**은 위의 메타데이터 범프 및 검증 게이트 이후 **릴리스 커밋/태그 잘라내기 준비**가 완료되었습니다. `release/0.14.3`을 `dev` 및 `main`에 병합하고 `v0.14.3` 태그를 생성하는 것이 안전합니다.
