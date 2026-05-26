# 남은 제품군 드리프트 스냅샷 - 2026-03-19

날짜: **2026-03-19**
기준 커밋: **`8106d67`**
실행 인터페이스: `OMX_TEAM_*` 환경 변수를 지운 후 저장소 루트에서 로컬 확인이 실행되는 활성 OMX team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 창(`worker-3`).

## 범위

이 노트는 이전 Rust + TypeScript 마이그레이션 정리 작업 후에 관찰된 나머지 로컬 전체 제품군 드리프트를 캡처합니다. 의도적으로 현재 작업자 작업에 대한 문서 전용입니다.

## 새로운 검증 요약

저장소 루트에서 사용되는 명령 순서:

```bash
unset OMX_TEAM_STATE_ROOT OMX_TEAM_WORKER OMX_TEAM_LEADER_CWD
npm run build
npm run lint
npm test
node --test dist/cli/__tests__/exec.test.js
node --test dist/hooks/__tests__/codebase-map.test.js
```

관찰된 상태:

- `npm run build` → **통과**
- `npm run lint` → **통과**
- `npm test` → **실패** (`2590` 통과 / `2` 실패)
- `node --test dist/cli/__tests__/exec.test.js` → **FAIL** (`1` 테스트 실패)
- `node --test dist/hooks/__tests__/codebase-map.test.js` → **FAIL** (`1` 테스트 실패)

## 정확히 남아 있는 실패한 버킷

### 1. `dist/cli/__tests__/exec.test.js`

테스트 실패:

- `runs codex exec with session-scoped instructions that preserve AGENTS and overlay content`

관찰된 불일치:

- `instructions-path: .../.omx/state/sessions/omx-*/AGENTS.md` 예상됨
- 실제 `instructions-path: .../.omx/team/continue-from-clean-commit-810/worktrees/worker-3/AGENTS.md`

해석:

- 테스트에서는 `omx exec` 경로가 항상 생성된 세션 범위 오버레이 파일을 사용할 것으로 예상합니다.
- 대신 활성 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 창 내에서 호출은 작업자 작업 트리 `AGENTS.md` 경로를 표시합니다.
- 이는 기본 클린 커밋 파트의 신제품 회귀에 대한 증거가 아니라 **작업자 세션 실행 컨텍스트에 대한 테스트/계약 기대 드리프트**처럼 보입니다.

증거 발췌:

```text
expected: /instructions-path:.*\/\.omx\/state\/sessions\/omx-.*\/AGENTS\.md/
actual: fake-codex:exec --model gpt-5 say hi -c model_instructions_file="/home/.../.omx/team/continue-from-clean-commit-810/worktrees/worker-3/AGENTS.md"
```

### 2. `dist/hooks/__tests__/codebase-map.test.js`

테스트 실패:

- `includes non-src top-level directories`

관찰된 불일치:

- 테스트는 `scripts/notify-hook.js`을(를) 생성합니다.
- 그런 다음 도우미는 `git add dist/scripts/notify-hook.js`을 실행합니다.
- `git add`은 어설션이 실행되기 전에 `128` 상태로 종료됩니다.

해석:

- 이는 **오래된 테스트 픽스처 경로**입니다.
- 고정 장치 설정과 추적 경로 인수가 일치하지 않으므로 `generateCodebaseMap()` 동작을 검증하기 전에 테스트가 실패합니다.

증거 발췌:

```text
✖ includes non-src top-level directories
Error: Command failed: git add dist/scripts/notify-hook.js
status: 128
```

## 분류

이 두 가지 실패는 이 작업에 대해 기록된 새로운 로컬 제품군 실행에서 볼 수 있는 유일한 남은 버킷입니다.

1. `exec.test`의 **작업자-컨텍스트 계약 드리프트**
2. `codebase-map.test`의 **오래된 고정 장치 경로 드리프트**

동일한 `npm test` 실행에서 추가 실패 버킷이 관찰되지 않았습니다.

## 변경된 파일

- `docs/qa/remaining-suite-drift-2026-03-19.md` — 클린 커밋 재실행에서 남은 실패 버킷, 재생 명령 및 확인 증거를 캡처했습니다.

## 메모

- 이 문서 전달에서는 런타임 또는 제품 소스 파일이 변경되지 않았습니다.
- 이 스냅샷에 대한 전체 증거는 `.omx/context/task-3-npm-test-20260319.log`에 저장됩니다.
- 집중 재현 로그는 다음 위치에 저장되었습니다.
  - `.omx/context/task-3-exec-test.log`
  - `.omx/context/task-3-codebase-map-test.log`
