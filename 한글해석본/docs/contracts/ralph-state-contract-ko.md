# 랄프 주 계약(겨울왕국)

## 정식 Ralph 상태 스키마

Ralph 런타임 상태는 `.omx/state/{scope}/ralph-state.json`에 저장되며 다음 스키마를 사용해야 합니다.

- `active: boolean` **(필수)**
- `iteration: number` **(활성 상태에서 필요)**
- `max_iterations: number` **(활성 상태에서 필요)**
- `current_phase: string` **(활성 상태에서 필요)**
- `started_at: ISO8601 string` **(활성 상태에서 필요)**
- `completed_at?: ISO8601 string`
- 선택적 연결 필드: `linked_ultrawork`, `linked_ecomode`, `linked_mode`
- 선택적 소유권 필드:
  - `owner_omx_session_id`
  - `owner_codex_session_id`
  - `owner_codex_thread_id`(레거시 호환성만 해당)
- 선택적 tmux 앵커 필드:
  - `tmux_pane_id`
  - `tmux_pane_set_at`
- 선택적 중지/감사 필드:
  - `stop_reason`

Ralph는 여전히 자체 모드 상태를 소유하고 있으며 기본 제공되는 상태는 없습니다.
`omx team ralph ...` 연결된 실행 경로가 더 이상 없습니다. 다중 상태 하에서
전환 호환성 계약, `team + ralph`은 승인된 피어 중복입니다.
따라서 정식 허용 목록에서 허용하는 경우 Ralph는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)과 공존할 수 있습니다. 다른
중복은 명시적으로 승인될 때까지 기본적으로 거부 상태로 유지됩니다. 보다
`docs/contracts/multi-state-transition-contract.md`.

레거시 단계 별칭은 호환성을 위해 정규화될 수 있지만 지속되는 값은 아래 고정 열거형으로 끝나야 합니다.

## 냉동 Ralph 단계 어휘

Ralph의 `current_phase`은(는) 다음 중 하나여야 합니다.

- `starting`
- `executing`
- `verifying`
- `fixing`
- `complete`
- `failed`
- `cancelled`

알 수 없는 단계 값은 거부되어야 합니다.

단계 진행 참조(예시):
시작
- `executing`
- `verifying`
- `fixing`
- `complete`

## 고정된 범위 정책

1. `session_id`이 있는 경우(명시적 인수 또는 현재 `.omx/state/session.json`) 세션 범위(`.omx/state/sessions/{session_id}/...`)가 신뢰할 수 있습니다.
2. 루트 범위(`.omx/state/*.json`)는 호환성 대체 전용입니다.
3. 쓰기는 반드시 하나의 범위(신뢰할 수 있는 범위)를 대상으로 해야 하며, 관련되지 않은 세션으로 브로드캐스트해서는 안 됩니다.
4. 현재 권한 있는 세션이 이미 활성 Ralph 상태를 소유하고 있는 경우, inform-hook는 누락된 소유자 메타데이터를 다시 채우고 해당 tmux 앵커 필드를 제자리에 새로 고칠 수 있습니다.
5. Same-Codex-session 연속은 다음과 같은 경우 하나의 세션 범위에서 현재 권한 있는 세션 범위로 단일 활성 Ralph를 마이그레이션할 수 있습니다.
   - 소스 Ralph는 여전히 활성 상태이고 터미널이 아닙니다.
   - `owner_codex_session_id`은 라이브 Codex 페이로드 `session_id`과 일치하거나 해당 세션 ID 필드가 소스 Ralph에 없는 경우에만 코디네이션(Coordination)이 레거시 `owner_codex_thread_id`을 참조합니다.
   - 현재 권한 있는 세션에는 해당 범위에 아직 `ralph-state.json`이 없습니다.
   - 코디네이션(Coordination)은 프롬프트 키워드 구문 분석이 아닌 지속적인 Ralph 소유권/상태 파일에 의해 이루어집니다.
6. 현재 권한 있는 세션에 이미 `ralph-state.json`이 있는 경우, inform-hook는 현재 파일이 비활성/터미널이라는 이유만으로 이를 자동으로 부활시키거나 교체하거나 다른 세션의 Ralph를 마이그레이션해서는 안 됩니다. 명시적 사용자 기반 Ralph는 일반 모드/상태 쓰기 경로를 통해 현재 범위를 계속 쓰기 시작합니다.
7. 마이그레이션에서는 단일 소유자 의미 체계를 보존해야 합니다.
   - 통지 후크 코디네이션(Coordination)은 세션 범위 Ralph 파일을 작성하기 전에 상태 루트당 전송 결정을 직렬화해야 합니다.
   - 대상 세션이 권한을 가지게 되고,
   - 소스 세션은 전송을 설명하는 감사 필드와 함께 즉시 비활성화되며, 대상 쓰기 후에 비활성화가 실패하면 대상 쓰기가 롤백되어야 합니다.
   - 관련되지 않은 세션은 그대로 유지되어야 합니다.
8. 이 범위 코디네이션(Coordination)은 수명 주기 카운터, 활성 범위 반복 업데이트 또는 tmux 프롬프트 삽입이 활성 Ralph 범위를 읽기 전에 `scripts/notify-hook.js` 내에서 실행되어야 합니다.
9. `owner_codex_thread_id`은 레거시 호환성 입력입니다. 현재 권한 있는 Ralph는 알림 페이로드가 `session_id`을 제공할 때까지 일시적으로 이를 보유할 수 있습니다. 새로 고침/현재 권한 있는 Ralph 상태는 해당 세션 소유자가 사용 가능해지면 `owner_codex_session_id`로 정규화됩니다.

## 소비자 호환성 매트릭스

| Consumer | Responsibility under frozen scope/phase contract |
|---|---|
| `src/hud/state.ts` | Read session scope first when current session is known; fall back to root only when scoped file is absent. |
| `src/mcp/trace-server.ts` | Build mode timeline from authoritative scope paths resolved via state-path helpers. |
| `scripts/notify-hook.js` | Update lifecycle counters only in the authoritative session scope (or root fallback), never all sessions. |
| `scripts/notify-hook.js` | During notify-hook reconciliation, an active current-session Ralph may be normalized in place; otherwise a same-Codex-session continuation may migrate a single active Ralph only into an otherwise empty current authoritative session scope before later lifecycle/update/injection steps consume Ralph state. Existing current-scope Ralph files, even inactive ones, are not auto-replaced. Reconciliation stays keyed to persisted state ownership, not prompt-keyword parsing. |
| `src/hooks/agents-overlay.ts` | Summarize active modes from scope-preferred mode files (session overrides root). |
| `src/cli/index.ts` (`status`/`cancel`) | Status and cancellation operate on scope-preferred mode files; cancellation does not mutate unrelated sessions. |

## 정식 PRD/진행 소스

- 정식 PRD: `.omx/plans/prd-{slug}.md`
- 레거시 호환성 기간 동안 시작 검증 소스: `.omx/prd.json`
- 정식 진행 원장: `.omx/state/{scope}/ralph-progress.json`
- 레거시 호환성 마이그레이션:
  - `.omx/prd.json`은 표준 PRD가 없는 경우 표준 PRD 마크다운으로 단방향으로 마이그레이션합니다.
  - `.omx/progress.txt`은 정식 원장이 없는 경우 정식 `ralph-progress.json`으로 단방향으로 마이그레이션합니다.
  - 레거시 파일은 한 릴리스 주기 동안 읽기 전용 호환성 아티팩트로 유지됩니다.
- Canonical PRD 마크다운은 오늘날 저장/문서화 표준입니다. Ralph `--prd` 스타트업은 구조화된 교체가 존재할 때까지 `.omx/prd.json`의 기계 판독 가능 스토리 승인 상태를 계속 검증합니다.
- 프롬프트 측 `$ralph` 워크플로 활성화는 `omx ralph --prd ...`과 동일하지 않습니다. Ralph 모드 상태 및 라우팅(Routing) 컨텍스트를 시드할 수 있지만 PRD 시작 게이트는 명시적인 CLI 경로 계약으로 유지됩니다.
