# Codex 네이티브 후크 매핑

이 페이지는 다음에 대한 표준 답변입니다.

> 네이티브 Codex 후크에서 이미 실행 중인 OMC/OMX 후크, 런타임 폴백에 유지되는 후크, 아직 지원되지 않는 후크는 무엇입니까?

## 설치 인터페이스

`omx setup`은(는) 이제 다음 기본 Codex 아티팩트를 모두 소유합니다.

- `.codex/config.toml` → `[features].codex_hooks = true` 및 `[features].goals = true`를 포함한 설정 소유 런타임 기능 플래그를 활성화합니다.
- `.codex/hooks.json` → 이미 파일에 OMX가 아닌 후크 항목을 유지하면서 OMX 관리 기본 후크 명령을 등록합니다.
- `.codex/config.toml` → 또한 OMX 소유 래퍼에 대해 `hooks.state."<hooks.json>:<event>:<group>:<handler>".trusted_hash`을 기록하므로 최근 Codex 릴리스에서는 설정 관리 후크에 대한 수동 `/hooks` 검토가 필요하지 않습니다.

프로젝트 범위의 경우 `.gitignore`은 생성된 `.codex/hooks.json`을 소스 제어 외부에 유지합니다.
`omx uninstall`은 `.codex/hooks.json`에서 OMX 관리 래퍼 항목만 제거합니다. 사용자 후크가 남아 있으면 파일은 그대로 유지됩니다.

`omx doctor`은 이러한 파일이 존재하고 올바른 형태인지 확인할 수 있습니다. 동일한 쉘/프로필이 인증된 Codex 요청을 완료할 수 있다는 것을 증명하지는 않습니다. 해당 경계에 대해 `codex login status`과 실제 `omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"` 연기 테스트를 사용하십시오.

## 소유권 분할

- **네이티브 코덱스 후크**: `.codex/hooks.json`
- **OMX 플러그인 후크**: `.omx/hooks/*.mjs`
- **tmux/런타임 폴백**: `omx tmux-hook`, 알림 후크, 파생된 감시자, 유휴/세션 종료 보고자

OMX는 `dist/scripts/codex-native-hook.js`을 호출하는 래퍼 항목만 소유합니다. 동일한 `.codex/hooks.json` 파일의 사용자 관리 후크 항목은 `omx setup` 새로 고침 및 `omx uninstall` 전반에 걸쳐 보존됩니다.
설치 소유 신뢰 상태는 생성된 래퍼 ID로 제한됩니다. 사용자 후크 및 사용자 소유 `hooks.state` 항목은 보존되며 Codex의 일반적인 검토 흐름에 따라 유지됩니다.

## 매핑 매트릭스

| OMC / OMX surface | Native Codex source | OMX runtime target | Status | Notes |
| --- | --- | --- | --- | --- |
| `session-start` | `SessionStart` | `session-start` | native | Native adapter refreshes leader session bookkeeping, preserves the canonical leader scope when a native subagent `SessionStart` is detected from rollout `session_meta`, restores startup developer context, and ensures `.omx/` is gitignored at the repo root |
| wiki startup context | `SessionStart` | `session-start` | native | Wiki session-start context can append a compact `omx_wiki/` summary when wiki pages exist; startup writes stay config-gated |
| `keyword-detector` | `UserPromptSubmit` | `keyword-detector` | native | Persists skill activation state and can add prompt-side developer context for top-level prompts; native subagent prompt text is treated as delegated task text, so literal workflow keywords inside a child prompt do not activate nested workflow state; `$ralph` prompt routing seeds workflow state only and does not launch `omx ralph --prd ...` |
| `pre-tool-use` | `PreToolUse` (`Bash`) | `pre-tool-use` | native-partial | Current native scope is Bash-only; built-in native behavior cautions on `rm -rf dist`, blocks inspectable inline `git commit` commands until Lore-format structure + the required `Co-authored-by: OmX <omx@oh-my-codex.dev>` trailer are present unless explicitly opted out with `OMX_LORE_COMMIT_GUARD=0`, and emits non-blocking document-refresh warnings for mapped staged commit changes that lack rule-scoped docs/spec refresh evidence |
| `post-tool-use` | `PostToolUse` (`Bash`) | `post-tool-use` | native-partial | Current native scope is Bash-only; built-in native behavior covers command-not-found / permission-denied / missing-path guidance only from stderr or non-zero Bash results, ignores failure-looking strings from successful source/log reads, and keeps MCP transport-death guidance scoped to MCP-like tool calls; document-refresh commit warnings use PreToolUse advisory output, with PostToolUse reserved as a future fallback if Codex advisory semantics change |
| Ralph/persistence stop handling | `Stop` | `stop` | native-partial | Native adapter uses the documented native Stop continuation contract (`decision: "block"` + `reason`) for active Ralph runs, emits a single JSON object on Stop stdout even for no-op Stop decisions, and emits deterministic JSON continuation output if Stop dispatch fails before normal handling |
| imagegen continuation helper | `Stop` | `stop` | native-partial | `omx imagegen continuation <session-id> --artifact <name>` records `.omx/state/sessions/<session>/imagegen-pending.json` and queues an audited exec follow-up so built-in `image_gen` turns that must end immediately can resume Ralph visual QA/recovery at the next Stop checkpoint |
| Autopilot continuation | `Stop` | `stop` | native-partial | Native adapter continues non-terminal autopilot sessions from active session/root mode state |
| Ultrawork continuation | `Stop` | `stop` | native-partial | Native adapter continues non-terminal ultrawork sessions from active session/root mode state |
| UltraQA continuation | `Stop` | `stop` | native-partial | Native adapter continues non-terminal ultraqa sessions from active session/root mode state |
| Team-phase continuation | `Stop` | `stop` | native-partial | Native adapter treats per-team `phase.json` as canonical when deciding whether a current-session team run is still non-terminal and can re-block on later fresh Stop replies while keeping leader guidance explicit about rewriting system-generated worker auto-checkpoint commits into Lore-format final history |
| `ralplan` skill-state continuation | `Stop` | `stop` | native-partial | Native adapter can block on active `skill-active-state.json` for `ralplan`, unless active subagents are already the real in-flight owners |
| `deep-interview` skill-state continuation | `Stop` | `stop` | native-partial | Native adapter can block on active `skill-active-state.json` for `deep-interview`, unless active subagents are already the real in-flight owners |
| auto-nudge continuation | `Stop` | `stop` | native-partial | Native adapter continues turns that end in a permission/stall prompt, can re-fire for later fresh replies, and suppresses auto-nudge while interview / deep-interview state is active; explicit terminal lifecycle metadata should be authoritative when present, legacy `blocked_on_user` remains a suppress-continuation compatibility signal, and `cancelled` stays internal legacy-only for user-facing lifecycle summaries |
| team worker Stop nudge | `Stop` | `stop` | native-partial | Team worker leader nudges are lifecycle-driven: a resolved allowed native worker Stop may notify the leader through guarded delivery after the non-terminal task guard passes. Deprecated worker stall/progress environment knobs such as `OMX_TEAM_PROGRESS_STALL_MS` and `OMX_TEAM_WORKER_TURN_STALL_MS` are compatibility/test-only surfaces and must not be documented as active team-nudge tuning knobs. |
| `ask-user-question` | none | runtime-only | runtime-fallback | No distinct Codex native hook today |
| `PostToolUseFailure` | none | runtime-only | runtime-fallback | Fold into runtime/fallback handling until native support exists |
| non-Bash tool interception | none | runtime-only | runtime-fallback | Current Codex native tool hooks expose Bash only |
| code simplifier stop follow-up | none | runtime-only | runtime-fallback | Cleanup follow-up stays on runtime/fallback surfaces, not native Stop |
| `SubagentStop` | none | runtime-only | not-supported-yet | OMC-specific lifecycle extension |
| `session-end` | none | `session-end` | runtime-fallback | Still emitted from runtime/notify path, not native Codex hooks |
| wiki session capture | none | `session-end` | runtime-fallback | Wiki session-log capture runs from the existing runtime session-end cleanup path, not from a native Codex hook |
| `session-idle` | none | `session-idle` | runtime-fallback | Still emitted from runtime/notify path, not native Codex hooks |


## 문서 새로고침 경고 MVP

기본 후크 어댑터에는 에이전트(Agent) 전용 문서 새로 ​​고침 경고 MVP가 포함되어 있습니다.
사양 중심 개발 위생. 일반 CI 게이트를 설치하지 **않습니다**.
**안** 저장소 전체에 사전 커밋 프레임워크를 추가하지 않으며 `git을 하드 차단해서는 안 됩니다.
문서 새로 ​​고침 이유로 commit`. 기존 Lore 커밋 차단이 남아 있습니다.
인라인 커밋 메시지가 Lore와 호환되지 않는 경우에도 분리되어 여전히 승리합니다.
Lore 커밋 가드가 명시적으로 비활성화되지 않는 한.

## Lore 커밋 가드 옵트아웃

Lore 커밋 적용은 기본적으로 활성화되어 있습니다. 기존 커밋을 사용하려면 또는
OMX 관리 네이티브 후크를 설치된 상태로 유지하면서 또 다른 로컬 커밋 정책
`OMX_LORE_COMMIT_GUARD`을 `0`, `false`, `no` 또는 `off`로 설정합니다.

지속적인 Codex CLI 사용을 위해서는 `config.toml`에 옵트아웃을 설정하세요.

```toml
[shell_environment_policy.set]
OMX_LORE_COMMIT_GUARD = "0"
```

옵트아웃은 Lore 스타일 `git commit` 차단 가드만 비활성화합니다. 다른
문서 새로 ​​고침 경고 및 명령을 포함한 기본 `PreToolUse` 검사
안전 점검은 아직 진행 중입니다. `omx doctor`은 경비원이 명시적으로 활동할 때 보고합니다.
환경 또는 구성에 의해 비활성화되었습니다.

경고 범위는 의도적으로 좁고 규칙 범위입니다.

- **커밋 경로:** `PreToolUse`은(는) 이 MVP에서 Bash 전용이며 평가만 수행합니다.
  검사 가능한 `git commit` 명령. `git diff --cached --name-status`이라고 읽습니다.
  따라서 단계적으로 변경된 사항만 계산됩니다. 다음과 같은 단계적 제품 문서
  `docs/codex-native-hooks.md`은 기본 후크 규칙 경고를 억제할 수 있습니다.
  규칙 소유 `.omx/plans/**` 및 `.omx/specs/**` 대상은 커밋 경로를 억제합니다.
  `.omx/`이 있음에도 불구하고 추적되거나 강제 단계화되는 경우에만 경고
  무시했다. 로컬 전용 무시 계획 파일은 커밋 경고를 억제하지 않습니다.
- **최종 핸드오프 경로:** `Stop`은 최종 핸드오프만 평가합니다.
  활성 모드 차단 및 자동 넛지 복구 이후 시도. 무대라고 읽는데
  또한 단계적이지 않은 diff를 추가하고 새로운 로컬 규칙 소유 `.omx/plans/**`을 계산할 수 있습니다.
  mtime이 매핑된 소스보다 최신인 경우 `.omx/specs/**` 파일
  변화. 이는 최종 핸드오프를 위한 에이전트-로컬 휴리스틱 신선도 확인입니다.
  증거 또는 의미 새로 고침 증명을 커밋하지 않습니다.
- **매핑:** 규칙은 `src/document-refresh/config.ts`에 있습니다. 관련 없는 문서
  또는 `.omx` 편집은 다른 규칙에 대한 경고를 억제하지 않습니다. 초기 규칙은 다음과 같습니다.
  네이티브 후크 동작, 문서 새로 ​​고침 시행자 동작, CLI/운영자
  행동, 신속한 안내 행동만 해당됩니다.
- **제외:** 도구 관련 변경 사항, 릴리스 자료, 이름 변경만 해당 변경 사항,
  명시적으로 무시된 사용자 측 내부 테스트가 아닌 경우 무시됩니다.
  보수적으로. 모호한 리팩터링은 그렇지 않은 경우 명시적 면제를 사용해야 합니다.
  제품/사양 갱신이 필요합니다.

새로 고침이 없는 합법적인 사례를 확인하려면 이 정확한 줄을
구체적인 이유가 있는 커밋 메시지 또는 최종 전달 텍스트:

```text
Document-refresh: not-needed | <reason>
```

경고 출력에는 매핑된 트리거 경로 및 예상 새로 고침 이름이 지정됩니다.
에이전트가 올바른 제품 문서 또는 계획 사양을 새로 고칠 수 있도록 대상 그룹
관련 없는 문서 편집을 포괄적인 억제로 사용하는 대신.

## 프로젝트 위키 부록(승인된 v1 백포트)

승인된 OMX 기반 Wiki 백포트는 수명 주기 소유권을 의도적으로 좁게 유지합니다.

- **스토리지**는 `.omc/wiki/`가 아닌 `.omx/wiki/` 런타임 상태를 무시하지 않고 `omx_wiki/` 저장소에 있습니다.
- **SessionStart**는 위키가 이미 존재하는 경우 `omx_wiki/`에서 제한된 위키 컨텍스트를 인터페이스화할 수 있지만 대부분 읽기 상태로 유지되어야 하며 비용이 많이 드는 쓰기 또는 인덱스 재구축 시 기본 후크 경로를 차단해서는 안 됩니다.
- **SessionEnd**는 `omx_wiki/`에 대한 최선의 비차단 세션 캡처에 대한 런타임/알림 경로 책임으로 남아 있습니다.
- **PreCompact**는 기본적이고 제한적입니다. 압축하기 전에 압축된 위키 컨텍스트를 인터페이스화할 수 있습니다. **PostCompact**는 기본 및 권고 사항입니다. 에이전트가 압축 아티팩트에 대한 `omx_wiki/` 항목을 작성/업데이트하도록 유도합니다.
- **라우팅(Routing)은 명시적으로 유지되어야 합니다**: `$wiki` 또는 `wiki query` / `wiki add`와 같은 작업 동사를 선호하고 암시적인 `wiki` 명사 활성화를 피하세요.

## 명시적 터미널 중지 모델 참고

승인된 명시적 터미널 중지 모델은 활성 워크플로 핸드오프를 위한 표준 수명 주기 계층을 추가합니다.

- `finished`
- `blocked`
- `failed`
- `userinterlude`
- `askuserQuestion`

후크 리더는 해당 신호를 사용할 수 있는 경우 보조 텍스트 휴리스틱보다 명시적인 수명 주기 메타데이터를 선호해야 합니다.
마이그레이션 중에 레거시 `blocked_on_user`은 계속 진행을 억제하지만 `cancelled`은 표준 사용자 대상 결과가 아닌 내부 레거시/관리자 호환성으로 처리되어야 합니다.

오늘날에는 아직 뚜렷한 기본 Codex `ask-user-question` 후크가 없습니다. 이는 향후 기본 후크 인터페이스이 일류 질문 중지 메타데이터를 노출하지 않는 한 `askuserQuestion` 분류가 런타임/대체 책임으로 남아 있음을 의미합니다.

## 결합된 워크플로 참고 사항

중지/계속 리더는 승인된 결합 워크플로 상태를 해석해야 합니다.
단일 레거시 `skill` 소유자가 아닌 공유 활성 세트 계약입니다.
1차 통과 다중 상태 롤아웃의 경우 승인된 중복은 다음과 같습니다.

- `team + ralph`
- `team + ultrawork`

지원되지 않는 겹침은 현재 상태를 변경하지 않고 유지하고
`omx state ...`을 통해 명시적으로 호환되지 않는 상태를 지우는 연산자
`omx_state.*` 재시도 전 MCP 도구. 보다
`docs/contracts/multi-state-transition-contract.md`.

## UserPromptSubmit: 심사 권고 컨텍스트

`UserPromptSubmit`은 이제 키워드 컨텍스트와 함께 심사 권고 컨텍스트를 내보낼 수 있습니다. 일치하는 키워드가 없으면 심사 계층은 프롬프트를 분류하고 권고 프롬프트 라우팅 컨텍스트 문자열을 주입할 수 있습니다. 이는 자체적으로 기술이나 워크플로를 활성화하지 않는 권고 프롬프트 라우팅 컨텍스트입니다. 모델이 따를 수 있는 개발자 컨텍스트 힌트를 추가합니다. 가벼운 자문 대상에는 repo-local `explore`, 좁은 편집 `executor`, 시각적 `designer` 및 외부 문서/참조 `researcher`이 포함됩니다. 연구원 라우팅은 공식 문서, 버전 호환성, 소스 지원 또는 외부 조회 요청을 위한 것이며 로컬 앵커 또는 구현 형태의 프롬프트를 재정의하지 않으며 여전히 프롬프트 라우팅 상태만 작성합니다. 키워드는 결정론적 제어 인터페이스으로 유지됩니다. 일치하는 키워드는 항상 분류 출력보다 우선하며 사용자는 `no workflow`, `just chat` 또는 `plain answer`과 같은 문구를 사용하여 프롬프트별로 분류 삽입을 억제할 수 있습니다.

추적된 기본 하위 에이전트 `UserPromptSubmit` 이벤트는 키워드 활성화 및 분류 삽입에서 의도적으로 격리됩니다. 부모는 `$ralplan Architect review step...`과 같은 텍스트로 시작하는 자식 프롬프트를 위임할 수 있습니다. `.omx/state/subagent-tracking.json`에서 하위 기본 세션이 알려지면 해당 프롬프트는 새로운 워크플로 호출이 아닌 리터럴 작업 텍스트로 처리됩니다. 최상위 프롬프트 제출은 변경되지 않으며 여전히 정상적으로 워크플로를 활성화합니다.

## 검증 안내

후크를 검증할 때 증명 경계를 명시적으로 유지하세요.

1. **네이티브 코덱스 후크 방지**
   - `omx setup` 님이 `.codex/hooks.json` 님을 작성했습니다.
   - 네이티브 Codex 이벤트가 `dist/scripts/codex-native-hook.js` 호출되었습니다.
2. **OMX 플러그인 증명**
   - 플러그인 디스패치/로그 증거가 `.omx/logs/hooks-*.jsonl`에 존재합니다.
3. **대체 방지**
   - 동작은 기본 Codex 후크가 아닌 통지 후크/파생 감시자/tmux 런타임에서 발생했습니다.

tmux 또는 합성 알림 폴백 경로만 실행된 경우 "네이티브 후크 작동"을 주장하지 마세요.
마찬가지로, 후크/설치 증거만으로 실제 실행 준비가 되었다고 주장하지 마십시오. 인증 또는 공급자 문제를 진단할 때 활성 런타임 프로필에서 실제 Codex 실행을 검증합니다.
