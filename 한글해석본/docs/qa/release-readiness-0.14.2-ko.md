# 릴리스 준비 평가 - 0.14.2

날짜: **2026-04-21**
대상 버전: **0.14.2**
비교 기준: **`v0.14.1..dev`**
평결: **GO** ✅

`0.14.2`은 사후 `0.14.1` 빠른 추적 패치 트파트을 패키지합니다. `ulw` ultrawork 속기를 위한 한국어 IME 드리프트 처리, `omx question`에 대한 공유 tmux 응답 제출 의미 체계, 연결된 tmux 창 외부의 실패 폐쇄 질문 렌더링, 심층 인터뷰를 위한 배경 질문 안내, 중복 MCP 형제 유휴 자체 정리, 오래된 세션 범위의 명확한 삭제 표시 루트 대체 상태, TypeScript/Biome 기준 새로 고침 및 릴리스 보조 정렬.

## 검토된 범위

### 키워드 라우팅(Routing)/워크플로 활성화
- `src/hooks/keyword-detector.ts` — 활성화 전 `ㅕㅣㅈ`에서 기존 `ulw` ultrawork 속기로 한국어 2세트 오타 정규화를 좁힙니다.
- `src/hooks/__tests__/keyword-detector.test.ts`, `src/scripts/__tests__/codex-native-hook.test.ts` — 직접 감지, 명시적 `$ㅕㅣㅈ`, 프롬프트 제출 활성화, 혼합 워크플로 지속성 및 활성 워크플로 재정의 동작을 위한 회귀 범위입니다.

### 질문/심층면담 행동
- `src/question/renderer.ts` — 질문-답변 주입은 이제 리터럴 텍스트 전달, 격리된 `C-m` 제출 호출 및 공유 개행 삭제를 위해 `buildSendPaneArgvs`을 재사용합니다.
- `src/question/renderer.ts`, `src/cli/__tests__/question.test.ts`, `src/question/__tests__/renderer.test.ts` — `omx question`은 이제 연결된 tmux 외부에서 닫히지 않고 표시 가능한 렌더러가 없을 때 분리된 tmux 세션을 생성하지 않음을 증명합니다.
- `src/question/__tests__/renderer.test.ts` — 회귀 적용 범위는 질문 주입이 공유 tmux argv 구성과 일치한다고 주장합니다.
- `skills/deep-interview/SKILL.md`, `templates/AGENTS.md`, `src/scripts/codex-native-hook.ts` — 이제 심층 인터뷰 지침에서는 계속하기 전에 백그라운드 `omx question` 터미널이 완료될 때까지 기다리고 JSON 답변을 읽어야 합니다.
- `src/question/__tests__/deep-interview.test.ts` — 실패한 질문 렌더러 실행이 이제 오래된 시행 상태를 유지하는 대신 보류 중인 심층 인터뷰 질문 의무를 지웁니다.
- `src/hooks/__tests__/deep-interview-contract.test.ts`, `src/scripts/__tests__/codex-native-hook.test.ts` — 배송된 지침에 대한 계약 적용 범위.

### 세션 범위 상태/수명주기 동작
- `src/state/operations.ts`, `src/mcp/state-server.ts` — 이제 레거시 루트 대체 상태 파일이 존재할 때 세션 범위 지우기가 비활성 `current_phase: "cleared"` 삭제 표시를 작성하여 오래된 루트 상태가 활성 상태로 다시 나타나는 것을 방지합니다.
- `src/state/__tests__/operations.test.ts`, `src/mcp/__tests__/state-server.test.ts`, `src/cli/__tests__/session-scoped-runtime.test.ts` — 패리티 적용 범위는 지워진 세션 범위가 CLI, MCP 및 상태/읽기 인터페이스 전체에서 비활성 상태로 유지됨을 증명합니다.

### MCP 중복 수명주기 동작
- `src/mcp/bootstrap.ts` — 중복 형제 정리 타이밍은 이제 환경에서 구성 가능하며 오래된 중복 stdio 형제는 트래픽을 처리하기 전이 아니라 안전한 복제 후 유휴 후에 자체 종료될 수 있습니다.
- `src/mcp/__tests__/bootstrap.test.ts`, `src/mcp/__tests__/server-lifecycle.test.ts` — 회귀 적용 범위는 최신 형제가 살아 있는 동안 복제 후 유휴 후 이전 중복 종료를 증명합니다.

### 툴링/릴리스 메타데이터
- `package.json`, `package-lock.json`, `tsconfig.json` — TypeScript 6.0.3 기준 및 명시적 노드 주변 유형.
- `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.14.2.md` — `0.14.2`에 맞춰 정렬된 릴리스 메타데이터 및 메모입니다.

## 코드 검토 증거

릴리스 준비 중 `dev` 고급 이후 `$code-review`이(가) `git diff v0.14.1..Yeachan-Heo/dev`에 대해 새로 고쳐졌습니다.

| Lane | Result | Blocking? |
|---|---|---|
| code-reviewer | **COMMENT** — no blocking findings; LOW concerns on broad Korean typo normalization and retained detached-renderer strategy branch | No |
| local latest-scope synthesis | **COMMENT** — no correctness or release-blocking regressions found across question, state, MCP, or keyword-detector fast-follow changes | No |
| architect | **WATCH** — non-blocking boundary-drift concerns around duplicated cleared-session tombstone helpers, retained detached-renderer branch ambiguity, heuristic duplicate-sibling timing, and duplicated deep-interview prose contracts | No |
| final synthesis | **COMMENT** — release accepted with documented follow-up cleanup risks | No release blocker accepted for this patch cut |

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Lint gate | `npm run lint` | PASS |
| Full Node build/test/catalog gate | `npm test` | PASS |
| Native crates | `cargo test -p omx-explore-harness -p omx-sparkshell` | PASS |
| Publish-path packaging | `npm pack --dry-run` | PASS |

## 위험 평가

- 코드 검토 WATCH 항목은 정확성이나 보안 차단 요소라기보다는 유지 관리 위험이 있습니다. 후속 정리를 위해 고려해야 합니다. 상태 명확한 삭제 표시 작성은 CLI와 MCP 경로 모두에서 복제되고, 분리된 렌더러 의미 체계는 유지되지만 일반 전략 해결에서는 더 이상 선택되지 않으며, 심층 인터뷰 산문 계약은 제공된 지침 화면 전체에서 여전히 반복됩니다.
- TypeScript 주요 업그레이드는 런타임 동작 수정보다 광범위하지만 릴리스 게이트에는 전체 노드 빌드/테스트/카탈로그 통과 및 패키지 테스트 실행이 포함됩니다.
- 중복 MCP 형제 정리는 여전히 보수적인 동일 상위/프로세스 연령/타이밍 경험적 방법에 의존하지만 새로운 수명 주기 적용 범위는 의도된 유휴 자체 종료 경로를 입증합니다.
- GitHub Actions 릴리스 및 npm 게시는 태그 트리거 릴리스 워크플로에 위임된 상태로 유지됩니다.

## 최종 평결

릴리스 **0.14.2**는 위의 통과된 검토 및 검증 증거를 기반으로 **`dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
