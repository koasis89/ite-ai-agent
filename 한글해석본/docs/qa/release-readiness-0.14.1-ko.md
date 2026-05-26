# 릴리스 준비 평가 - 0.14.1

날짜: **2026-04-21**
대상 버전: **0.14.1**
비교 기준: **`v0.14.0..origin/dev`**
평결: **GO** ✅

`0.14.1`은 심층 인터뷰 질문 적용 수정, 질문 창/tmux 신뢰성, 설정 업데이트 새로 고침 복원력, 수명 주기 정규화 중복 제거, 중지 상태 누출 수정, 릴리스 보조 정렬 등 `0.14.0` 이후 강화 과정을 패치 릴리스로 패키징합니다.

## 검토된 범위

### 질문 / 심층 인터뷰 / 행동 중지
- `src/question/*`, `src/scripts/codex-native-hook.ts` — 보류 중인 질문 적용, 재사용 세션 브리지 지침 및 tmux 질문 수명 주기 처리
- `src/question/__tests__/*`, `src/scripts/__tests__/codex-native-hook.test.ts` — 비활성이지만 보류 중인 질문 의무 및 분리된 렌더러 활성에 대한 회귀 적용 범위

### 설정/업데이트/설치 새로 고침
- `src/cli/update.ts`, `src/scripts/postinstall.ts` — 설정 새로 고침 재시도 경로, npm install-root 앵커링 및 설정 상태가 오래되었을 때의 명시적 업데이트 동작
- `src/cli/__tests__/update.test.ts`, `src/scripts/__tests__/postinstall.test.ts` — 설치 스탬프, 설정 새로 고침 및 실패 경로 적용 범위

### 라이프사이클/지침/릴리스 자료
- `src/runtime/run-outcome.ts`, `src/runtime/terminal-lifecycle.ts` — 공유 수명 주기 정규화 계약
- `skills/code-review/SKILL.md`, 프롬프트/도움말/문서 업데이트, 릴리스 워크플로/문서 정렬
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.14.1.md`

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Full Node build/test/catalog gate | `npm test` | PASS |
| Native crates | `cargo test -p omx-explore-harness -p omx-sparkshell` | PASS |
| Publish-path packaging | `npm pack --dry-run` | PASS |

## 위험 평가

- 패치 트파트은 단일 핫픽스보다 광범위하지만 새로운 최상위 기능 인터페이스보다는 안정성 후속 조치에 여전히 집중되어 있습니다.
- 운영자가 직면하고 있는 가장 강력한 위험은 여전히 ​​`omx question` 주변의 실제 tmux/재사용 세션 동작, 심층 인터뷰 중지 차단 및 업그레이드로 인한 설정 새로 고침입니다.
- GitHub Actions 릴리스 및 npm 게시는 태그 트리거 릴리스 워크플로에 위임된 상태로 유지됩니다.

## 최종 평결

릴리스 **0.14.1**은 위의 통과된 검증 증거를 기반으로 **`dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
