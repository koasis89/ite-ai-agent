# Rust 런타임 씬 어댑터 계약

## 정식 소유권

Rust 코어는 다음에 대한 단일 의미론적 소유자입니다.

- 권한
- 수명주기/세션 상태
- 파견/백로그
- 사서함 배달 상태
- 재생/복구
- 준비/진단
- 표준 Mux 작업

JS, HUD, CLI 및 tmux는 씬 전달/관찰자 어댑터입니다. 그들은 읽을 수도 있습니다
그러나 호환성 아티팩트에 대한 의미론적 진실을 정의하거나 변경해서는 안 됩니다.
그들 자신의.

아직 이 목표에 미치지 못하는 현재 마이그레이션 후속 조치는 다음에서 추적됩니다.
`docs/qa/runtime-team-seam-audit-2026-04-01.md`.

## 호환성 아티팩트

레거시 리더는 계속해서 동일한 상태 파일을 읽습니다.
Rust가 작성한 호환성 보기.

| Reader | Compatibility files | Compatibility guarantee |
|---|---|---|
| `omx team status` | `.omx/state/team/<team>/config.json`, `manifest.v2.json`, `tasks/*.json`, `approvals/*.json`, `workers/*` | Manifest-backed team config is authoritative when both config and manifest exist. |
| `omx doctor --team` | `.omx/state/team/<team>/config.json`, `manifest.v2.json`, `workers/*/status.json`, `workers/*/heartbeat.json`, `.omx/state/hud-state.json` | Manifest-backed tmux/session identity is authoritative when both config and manifest exist. |
| HUD readers | `.omx/state/session.json`, `.omx/state/sessions/<session>/team-state.json`, `.omx/state/team-state.json`, `.omx/state/ralph-state.json` | Session-scoped files are authoritative when a session is active; root files are compatibility fallback only. |

## Rust가 작성한 런타임 파일

`RuntimeEngine`(`crates/omx-runtime-core/src/engine.rs`)은 `persist()` 및 `write_compatibility_view()`을 통해 다음 파일을 작성합니다.

| File | Written by | Content |
|---|---|---|
| `snapshot.json` | `persist()` | Full `RuntimeSnapshot` — `schema_version`, `authority`, `backlog`, `replay`, `readiness` |
| `events.json` | `persist()` | Append-only event log — array of `RuntimeEvent` values in `#[serde(tag = "event")]` format |
| `authority.json` | `write_compatibility_view()` | `AuthoritySnapshot` section for TS readers |
| `backlog.json` | `write_compatibility_view()` | `BacklogSnapshot` counts (`pending`, `notified`, `delivered`, `failed`) for TS readers |
| `readiness.json` | `write_compatibility_view()` | `ReadinessSnapshot` (`ready`, `reasons`) for TS readers |
| `replay.json` | `write_compatibility_view()` | `ReplaySnapshot` state for TS readers |
| `dispatch.json` | `write_compatibility_view()` | Full `DispatchLog` (array of `DispatchRecord` entries) for team status readers |
| `mailbox.json` | `write_compatibility_view()` | Full `MailboxLog` (array of `MailboxRecord` entries) for team/message readers |

모든 파일은 구성된 `state_dir`에 원자적으로 기록됩니다. TS 리더는 이러한 파일을 읽기 전용으로 처리해야 합니다. Rust 엔진이 유일한 작가입니다.

## 씬 어댑터 규칙

1. 호환성 판독기는 알 수 없는 필드를 무시하고 현재 필드를 보존해야 합니다.
   JSON 봉투.
2. 레거시 tmux 입력은 전달 전용입니다. 그것은 의미론적 진실을 확립하지 않습니다.
3. Rust가 작성한 호환성 파일과 레거시 JS 기본값이 일치하지 않는 경우
   Rust가 작성한 파일이 승리합니다.
4. JS 파일 쓰기는 브리지가 비활성화된 파트에 대해서만 대체 전용으로 유지됩니다.
   없는; Rust 브릿지가 성공하면 정식이 아닙니다.
5. 알 수 없는 전달 오류는 의미 체계가 아닌 어댑터 오류로 표시됩니다.
   주인이 바뀐다.

## 소비자 매트릭스

| Consumer | Responsibility |
|---|---|
| Team CLI | Read Rust-authored compatibility artifacts and render them faithfully. |
| Doctor CLI | Report readiness from Rust-authored compatibility artifacts, then layer adapter health checks on top. |
| HUD | Stay read-only and scope-aware. |
| Notify/watchers | Deliver events; never become the semantic owner of the run. |
