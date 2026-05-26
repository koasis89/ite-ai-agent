# 런타임 권한, 백로그, 재생 및 준비 의미 체계

이 문서는 JS 측 진실을 대체하는 Rust 소유의 런타임 의미를 포착합니다.

## 권한
- 런타임에는 최대 하나의 활성 권한 임대가 있습니다.
- 임대에는 다음이 포함됩니다.
  - `owner`
  - `lease_id`
  - `leased_until`
- 오래되었거나 만료된 임대는 다른 소유자에게 권한을 부여하기 전에 오래되었다고 표시되어야 합니다.
- `AuthorityLease`(`crates/omx-runtime-core/src/authority.rs`)은 세 가지 전환을 사용하여 상태 머신을 구현합니다.
  - `acquire(owner, lease_id, leased_until)` — 임대가 보유되지 않거나 요청 소유자가 이미 보유하고 있는 경우 성공합니다. 그렇지 않으면 `AlreadyHeldByOther`로 실패합니다.
  - `renew(owner, lease_id, leased_until)` — 동일한 소유자가 현재 임대를 보유하고 있는 경우에만 성공합니다. `NotHeld` 또는 `OwnerMismatch`에서는 실패합니다.
  - `force_release()` — 부실 상태를 포함한 모든 임대 필드를 무조건 지웁니다.

## 백로그
- 새 작업이 백로그에 `pending`로 입력됩니다.
- 알림을 통해 작업이 `pending`에서 `notified`로 이동됩니다.
- 완료하면 작업이 `notified`에서 `delivered` 또는 `failed`로 이동됩니다.
- `pending`, `notified`, `delivered` 및 `failed`은 런타임 스냅샷의 개수입니다.
- `DispatchLog`(`crates/omx-runtime-core/src/dispatch.rs`)은 각각 `request_id`, `target`, `status` 및 타임스탬프(`created_at`, `notified_at`, `delivered_at`, `failed_at`)를 포함하는 개별 `DispatchRecord` 항목을 추적합니다. 상태 전환이 시행됩니다. 잘못된 전환(예: `pending -> delivered`)은 `DispatchError::InvalidTransition`을 반환합니다.

## 재생/복원
- 재생은 커서 기반이며 내구성이 뛰어납니다.
- 재생된 항목은 중복 제거되어야 합니다.
- 지연된 리더 알림은 명시적으로 추적되므로 관찰자는 배달이 아직 표시되지 않은 이유를 알 수 있습니다.
- `ReplayState`(`crates/omx-runtime-core/src/replay.rs`)은 현재 `cursor`을 추적하고, 내부 `HashSet`을 통해 `event_id`에 의해 중복을 제거하고, 리더 알림이 `defer_leader_notification()` / `clear_deferred()`을 통해 의도적으로 연기되었는지 여부를 기록합니다.

## 준비
- 준비 상태는 추론된 CLI 의견이 아니라 Rust에서 작성한 스냅샷입니다.
- 임대가 누락되었거나 오래되었거나 유효하지 않은 경우 런타임이 준비되지 않은 것입니다.
- 스냅샷에는 정확한 차단 기능이 포함되어 운영자가 복구가 일시 중지된 이유를 확인할 수 있어야 합니다.
- `derive_readiness()`(`crates/omx-runtime-core/src/engine.rs`)은 현재 `AuthorityLease`, `DispatchLog` 및 `ReplayState`에서 `ReadinessSnapshot`를 계산합니다. 권한 임대가 유지되고 오래되지 않았으며 보류 중인 재생 이벤트가 없는 경우에만 `ReadinessSnapshot::ready()`을 반환합니다. 모든 차단 사유는 `readiness.reasons`에 수집됩니다.

## 파견 분류
- `WorkerCli`은 제출 정책을 선택합니다(`Claude` => 1회 누르기, `Codex`/기타 => 2회 누르기).
- `DispatchOutcomeReason` 및 `QueueTransition`은 전송 성공, 재시도, 보류 및 실패 결과를 분류합니다.
- 지연된 리더 누락 사례는 보류 상태로 유지되므로 창이 사용 가능해지면 런타임이 다시 시도할 수 있습니다.
- 확인되지 않은 전송은 재시도가 남아 있는 동안 보류 상태로 유지될 수 있습니다. 그렇지 않으면 확인되지 않은 이유로 실패합니다.
