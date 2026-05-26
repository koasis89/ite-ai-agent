# 릴리스 준비 평가 - 0.12.0

날짜: **2026-04-06**
대상 버전: **0.12.0**
비교 기준: **`v0.11.13..HEAD`**
평결: **GO** ✅

`0.12.0`은 다른 패치 컷이 아닌 기능/부 릴리스입니다. `v0.11.13`은 광범위하므로(`185` 파일 변경, `+9805 / -2745`, `91` 커밋 총 / `65` 비병합 커밋) 릴리스 자료에서는 이를 일상적인 메타데이터 변동으로 처리하기보다는 새로운 기본 Codex 후크 파트, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/런타임 전달 계약 강화 및 프롬프트/문서 계약 새로 고침을 강조합니다.

## 검토된 범위

- 네이티브 Codex 후크 소유권 및 수명 주기 연속성(`src/scripts/codex-native-hook.ts`, `src/config/codex-hooks.ts`, `src/cli/setup.ts`, `docs/codex-native-hooks.md`)
- 자사 Bash `PreToolUse` / `PostToolUse` 지원(`src/scripts/codex-native-pre-post.ts`, 네이티브 후크 테스트/문서)
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 전달/런타임 상태 강화, 사서함/발송 관찰 가능성, 창 상태 및 e2e 연기 적용 범위(`src/team/**`, `src/scripts/notify-hook/team-*.ts`, `docs/contracts/team-*.md`)
- 알림/세션 안정성 및 Windows/tmux 명령 경로 수정(`src/hooks/**`, `src/notifications/**`, `src/utils/platform-command.ts`)
- 품질 우선 지침 + 에이전트(Agent) 계약 새로 고침(`AGENTS.md`, `templates/AGENTS.md`, `prompts/*.md`, `docs/prompt-guidance-*`, `skills/team/SKILL.md`)
- 문서 및 현지화 새로 고침(`docs/readme/**`, `docs/openclaw-integration.uk.md`, `README.md`, `.github/ISSUE_TEMPLATE/config.yml`)

## 릴리스 형태 증거

- 현재 `package.json` 버전: **`0.12.0`**
- 현재 `Cargo.toml` 작업공간 버전: **`0.12.0`**
- 현재 릴리스 브랜치 HEAD에는 `d850927` 위에 버전 동기화 및 릴리스 준비 준비 커밋이 포함되어 있습니다.
- 명시적 릴리스 기반에 대해 검토된 차이점: **`v0.11.13..HEAD`**
- `0.12.0`에 대한 릴리스 노트 아티팩트: **현재**
- `RELEASE_BODY.md`: **대상 `v0.12.0`**

## 필수 릴리스 노트 항목

1. **네이티브 Codex 후크 소유권이 저장소/런타임 계약으로 이동되었습니다.**
   - team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)이 아닌 OMX 세션은 이제 로컬에서 기본 Codex 후크 설정을 소유하고, 세션 시작 + 중지 상태 연속성을 유지하고, 문서화된 설정/제거 동작을 노출한다는 점을 알려드립니다.
2. **자사 네이티브 Bash 사전/사후 도구 후크가 도착했습니다.**
   - 일반적인 후크 정리 아래에 묻어두는 대신 `PreToolUse` / `PostToolUse` 지침과 새로운 네이티브 후크 실행 파트을 언급하세요.
3. **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 전달/상태 처리가 상당히 강화되었습니다.**
   - 사서함/디스패치 무결성, 리더 넛지 전달, 창 상태 가시성, 작업자 부트스트랩/런타임 코디네이션(Coordination) 및 전용 배달 원격 측정/상태 계약을 강조합니다.
4. **실제 운영자 워크플로우에서 세션/알림 동작의 안정성이 더욱 높아졌습니다.**
   - 오래된 로그 방지, 미리 알림/넛지 중복 제거, 동일 스레드 Ralph 연속성, 유휴 휴지 정리 및 Windows/tmux 시작 수정 사항을 언급하세요.
5. **신속한 에이전트 안내 기본값이 품질 우선 작업으로 전환되었습니다.**
   - 생성된 신속한 계약 새로 고침, 더 강력한 순서/검증 지침, 오래된 레거시 별칭/인터페이스 제거를 언급하세요.
6. **Docs/i18n 자료는 명시적으로 언급할 만큼 변경되었습니다.**
   - `docs/readme/` 아래에 번역된 README 재배치, 새로운 우크라이나어 문서 범위 및 OpenClaw 통합 업데이트를 포함합니다.

## 모듈별 검증 계획

| Module | Representative paths | Release-note focus | Verification emphasis |
|---|---|---|---|
| Native hook ownership + lifecycle | `src/scripts/codex-native-hook.ts`, `src/config/codex-hooks.ts`, `src/cli/setup.ts`, `src/cli/uninstall.ts`, `docs/codex-native-hooks.md` | repo-local native hook ownership; session-start/stop continuity | `npm run build`; `node --test dist/scripts/__tests__/codex-native-hook.test.js dist/config/__tests__/generator-idempotent.test.js dist/cli/__tests__/setup-scope.test.js dist/cli/__tests__/uninstall.test.js` |
| Native pre/post tool hooks | `src/scripts/codex-native-pre-post.ts`, `src/scripts/__tests__/codex-native-hook.test.ts`, `docs/codex-native-hooks.md` | first-party `PreToolUse` / `PostToolUse` Bash guidance | `node --test dist/scripts/__tests__/codex-native-hook.test.js` |
| Team runtime / delivery contract | `src/team/**`, `src/scripts/notify-hook/team-dispatch.ts`, `src/scripts/notify-hook/team-leader-nudge.ts`, `docs/contracts/team-delivery-state-contract.md`, `docs/contracts/team-runtime-state-contract.md` | mailbox + dispatch integrity, pane-status visibility, worker/bootstrap reliability | `node dist/scripts/run-test-files.js dist/team/__tests__/delivery-e2e-smoke.test.js dist/team/__tests__/runtime.test.js dist/team/__tests__/state.test.js dist/team/__tests__/worker-bootstrap.test.js` |
| Notify / reminder / session stability | `src/hooks/**`, `src/notifications/**`, `src/utils/platform-command.ts`, `src/scripts/notify-fallback-watcher.ts` | stale-log protection, nudge dedupe, same-thread continuity, Windows/tmux resilience | `node dist/scripts/run-test-files.js dist/hooks/__tests__/notify-hook-team-dispatch.test.js dist/hooks/__tests__/notify-hook-team-leader-nudge.test.js dist/hooks/__tests__/notify-hook-team-tmux-guard.test.js dist/hooks/__tests__/notify-hook-worker-idle.test.js dist/hooks/__tests__/notify-fallback-watcher.test.js dist/notifications/__tests__/idle-cooldown.test.js dist/utils/__tests__/platform-command.test.js` |
| CLI / prompt contract / docs surface | `src/cli/index.ts`, `AGENTS.md`, `templates/AGENTS.md`, `prompts/*.md`, `docs/prompt-guidance-*`, `skills/team/SKILL.md` | quality-first prompt defaults; legacy alias cleanup; stronger verification language | `node --test dist/cli/__tests__/index.test.js dist/cli/__tests__/autoresearch-guided.test.js dist/cli/__tests__/cleanup.test.js dist/cli/__tests__/error-handling-warnings.test.js` plus `node dist/scripts/generate-catalog-docs.js --check` |
| Docs + localization collateral | `docs/readme/**`, `docs/openclaw-integration.uk.md`, `README.md`, `.github/ISSUE_TEMPLATE/config.yml` | translated README relocation; Ukrainian docs; release-facing docs cleanup | `git diff --check v0.11.13..HEAD`; manual doc spot-check against release note bullets |

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Diff scope inventory | `git diff --name-only v0.11.13..HEAD` | PASS |
| Commit inventory | `git rev-list --count --no-merges v0.11.13..HEAD` + `git rev-list --count --merges v0.11.13..HEAD` | PASS (`65` non-merge / `26` merge) |
| Version sync contract | `node --test dist/cli/__tests__/version-sync-contract.test.js` | PASS |
| CLI version smoke | `node dist/cli/omx.js version` | PASS (`oh-my-codex v0.12.0`) |
| Build | `npm run build` | PASS |
| Lint | `npm run lint` | PASS |
| Full Node suite | `npm test` | PASS (`2949` pass / `0` fail) |
| Rust runtime core | `cargo test -p omx-runtime-core` | PASS (`54` pass / `0` fail) |
| Packed install smoke | `npm run smoke:packed-install` | PASS |
| Working-tree whitespace check | `git diff --check origin/main...HEAD` | PASS |

## 모듈식 검토의 참고 사항

- 초기 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 검토에서는 분리된 작업자 환경에 로컬 패키지 설치가 불완전하고 릴리스 자료가 여전히 `0.11.13`을 대상으로 하는 동안 임시 NO-GO가 나타났습니다.
- `npm ci`과 루트 종속성을 동기화하고, 루트 릴리스 게이트를 다시 실행하고, 자료를 새로 고친 후, 의심되는 감시자/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 차단자는 릴리스 분기 확인 실행에서 재현되지 **않았습니다**.
- 기본 후크 소유권, 사전/사후 지침, 런타임/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 제공 강화, Windows/tmux 안정성 및 문서/프롬프트 지침 새로 고침이 주요 릴리스 노트 주제입니다.

## 최종 평결

릴리스 **0.12.0**은 **분기 푸시 및 PR 핸드오프 준비**가 완료되었습니다.
