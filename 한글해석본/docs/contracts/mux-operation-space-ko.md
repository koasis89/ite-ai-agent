# OMX ⇔ mux 정식 작업 공간

이 문서는 OMX 핵심 의미 체계가 소유한 Mux 경계를 정의합니다.

## 정식 작업

| Operation | Purpose |
|---|---|
| `resolve-target` | Convert a logical delivery target into an adapter-specific endpoint. |
| `send-input` | Forward literal input to a resolved target. |
| `capture-tail` | Read a bounded tail of adapter output. |
| `inspect-liveness` | Check whether a target is still alive. |
| `attach` | Attach the operator to a live target. |
| `detach` | Detach the operator from a live target. |

## 대상종류
- `delivery-handle`
- `detached`

## 전송 프리미티브
- `SubmitPolicy`은 어댑터가 내보내는 격리된 `C-m` 제출 수를 제어합니다.
- `InputEnvelope`에는 리터럴 텍스트와 개행 정규화 규칙이 포함됩니다.
- `InjectionPreflight`은 배송 전 준비 상태 확인을 캡처합니다.
- `PaneReadinessReason`은 대상이 주입 가능하거나 주입 불가능한 이유를 설명합니다.
- `DeliveryConfirmation`은 전송이 확인되었는지, 활성 작업이 확인되었는지, 확인되지 않은 상태인지를 기록합니다.
- `ConfirmationPolicy`은 어댑터에서 사용하는 재시도/확인 창을 정의합니다.

## 규칙
- 의미 계약은 tmux 기본 명사에 의존해서는 안 됩니다.
- Tmux는 모델이 아닌 첫 번째 어댑터입니다.
- 어댑터 결과에는 디버깅을 위한 tmux 식별자가 포함될 수 있지만 해당 식별자는 의미론적 진실이 아닙니다.
- 재시도, 확인 및 전달 결정은 어댑터 구현이 아닌 런타임 계약에 속합니다.

## TmuxAdapter 구현

`TmuxAdapter`은 `crates/omx-mux/src/tmux.rs`에서 완전히 구현됩니다. 6개의 정규 연산이 모두 지원됩니다. 모든 `MuxOperation`, `MuxOutcome`, `MuxTarget` 및 관련 유형은 `Serialize`/`Deserialize`을 파생합니다.

작업당 정확한 tmux CLI 호출:

| Operation | tmux command |
|---|---|
| `ResolveTarget` | `tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}'` — verifies the handle appears in the pane list |
| `SendInput` | `tmux send-keys -t <target> -l '<text>'` (literal text), then one `tmux send-keys -t <target> C-m` per press defined by `SubmitPolicy::Enter { presses, delay_ms }` |
| `CaptureTail` | `tmux capture-pane -t <target> -p -S -<lines>` |
| `InspectLiveness` | `tmux has-session -t <session>` (session name extracted from the handle, e.g. `"mysess:0.1"` → `"mysess"`) |
| `Attach` | `tmux attach-session -t <target>` |
| `Detach` | `tmux detach-client -t <target>` |

대상 핸들은 `session_name:window_index.pane_index`(예: `"omx:0.1"`) 형식을 사용합니다. `MuxTarget::Detached`은 실제 창이 필요한 모든 작업에 대해 거부됩니다.
