# team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 딜리버리/통합 상태 계약

이 문서는 현재 감사를 받고 있는 주정부의 소유권 계약을 기록합니다.
문제 #1243에서 언급되었습니다.

## 범위

- 디스패치 수명 주기: `pending`, `notified`, `delivered`, `failed`
- 통합 수명주기: `integrated`
- 준비 상태/리더 활동 수명 주기: `stale`

## 권위 있는 소유자

### `pending` / `notified` / `delivered` / `failed`

내구성 있는 소유자:

- 브릿지가 활성화되면 Rust 런타임 디스패치 로그
  - `crates/omx-runtime-core/src/dispatch.rs`
  - `src/runtime/bridge.ts`을(를) 통해 표시됨
- 브리지가 비활성화되거나 읽을 수 없는 경우에만 레거시 JSON 대체
  - `src/team/state/dispatch.ts`
  - `src/team/state.ts`

관찰된 코드 경로:

- 대기열: `DispatchLog::queue()` ← `enqueueDispatchRequest()`
- 알림: `DispatchLog::mark_notified()` ← `markDispatchRequestNotified()`
- 전달: `DispatchLog::mark_delivered()` ← `markDispatchRequestDelivered()`
- 실패: `DispatchLog::mark_failed()` ← `markDispatchRequestFailed()` / `transitionDispatchRequest(..., 'failed')`

전환 계약:

- `pending -> notified`
- `pending -> failed`
- `notified -> delivered`
- `notified -> failed`
- 동일 상태 이유/타임스탬프 패치가 허용됩니다.
- `failed -> notified`은 동일한 `request_id`에 허용되지 **않습니다**

이론적 해석:

- Rust는 이미 `failed`을 디스패치 레코드의 터미널로 시행하고 있습니다.
- TS 폴백은 해당 계약을 미러링해야 하므로 후크, 폴백 및 재생 경로가 미러링됩니다.
  동일한 상태 질문에 다르게 대답하지 마십시오.

### `integrated`

내구성 있는 소유자:

- 런타임 통합 로직으로 작성된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 모니터 통합 스냅샷
  - `src/team/runtime.ts`
  - `src/team/state.ts`
  - `src/team/state/monitor.ts`

관찰된 코드 경로:

- `integrateWorkerCommitsIntoLeader()`의 병합/체리 선택/리베이스 결정
- `recordIntegrationFailure()`의 실패 경로

성공 계약:

- `integrated`에는 내구성 있는 Git 증거가 필요합니다.
  - 리더 HEAD가 발전했고,
  - 통합 작업자 커밋은 실제로 리더 HEAD에서 연결할 수 있습니다.

### `stale`

영구 소유자는 주제에 따라 다릅니다.

- 런타임 권한 비활성:
  - `crates/omx-runtime-core/src/lib.rs`
  - `crates/omx-runtime-core/src/engine.rs`
  - `src/runtime/bridge.ts`을 통해 표시됨
- 리더/세션 비활성:
  - `src/team/leader-activity.ts`
  - `src/hooks/session.ts`

계약:

- `stale`은 성공 상태가 아닌 자격/준비 신호입니다.
- tmux/HUD 관찰은 증거에 기여할 수 있지만 내구성은 없습니다.
  디스패치 또는 통합 성공의 의미론적 소유자

## 첫 번째 계약 강화 변경

후크 작성 디스패치 영수증이 이미 `failed`이 된 경우 나중에 대체
확인은 동일한 요청을 다시 `notified`로 변경해서는 안 됩니다.

대신에:

- 요청을 유지하세요 `failed`
- 확인된 대체 경로를 기록하기 위해 `last_reason` 패치
- 대체 성공을 재작성이 아닌 운영 복구 이벤트로 처리합니다.
  원래의 후크 시도 상태 머신
