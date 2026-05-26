# Interop 브로커를 위한 OMX team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 돌연변이 계약

이 문서는 외부 상호 운용성 브로커에 대해 지원되는 **변이 경로**를 정의합니다.

## 기록의 규칙

외부 시스템은 CLI 상호 운용성을 통해 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태를 변경해야 합니다.

```bash
omx team api <operation> --input '<json-object>' --json
```

레거시 `team_*` MCP API는 더 이상 사용되지 않으며 CLI 힌트와 함께 더 이상 사용되지 않음 오류를 반환합니다.
`.omx/state/team/...`에 대한 직접 쓰기는 지원되지 않으며 런타임 불변성을 위반할 수 있습니다.

## 필수 작업 변형 흐름

1. 현재 작업 읽기:
   - `omx team api read-task --json`
2. 낙관적 버전의 주장:
   - `omx team api claim-task --json`
3. 클레임 토큰을 사용하여 터미널 상태 전환:
   - `omx team api transition-task-status --json` (`in_progress -> completed|failed`)
4. 롤백/requeue-to-pending 흐름에만 `omx team api release-task-claim --json`을 사용하세요.

## 레거시 MCP -> CLI 마이그레이션 테이블

| Legacy `team_*` tool | CLI operation |
|---|---|
| `team_send_message` | `omx team api send-message --json` |
| `team_broadcast` | `omx team api broadcast --json` |
| `team_mailbox_list` | `omx team api mailbox-list --json` |
| `team_mailbox_mark_notified` | `omx team api mailbox-mark-notified --json` |
| `team_mailbox_mark_delivered` | `omx team api mailbox-mark-delivered --json` |
| `team_create_task` | `omx team api create-task --json` |
| `team_read_task` | `omx team api read-task --json` |
| `team_list_tasks` | `omx team api list-tasks --json` |
| `team_update_task` | `omx team api update-task --json` |
| `team_claim_task` | `omx team api claim-task --json` |
| `team_transition_task_status` | `omx team api transition-task-status --json` |
| `team_release_task_claim` | `omx team api release-task-claim --json` |
| `team_read_config` | `omx team api read-config --json` |
| `team_read_manifest` | `omx team api read-manifest --json` |
| `team_read_worker_status` | `omx team api read-worker-status --json` |
| `team_read_worker_heartbeat` | `omx team api read-worker-heartbeat --json` |
| `team_update_worker_heartbeat` | `omx team api update-worker-heartbeat --json` |
| `team_write_worker_inbox` | `omx team api write-worker-inbox --json` |
| `team_write_worker_identity` | `omx team api write-worker-identity --json` |
| `team_append_event` | `omx team api append-event --json` |
| `team_get_summary` | `omx team api get-summary --json` |
| `team_cleanup` | `omx team api cleanup --json` |
| `team_write_shutdown_request` | `omx team api write-shutdown-request --json` |
| `team_read_shutdown_ack` | `omx team api read-shutdown-ack --json` |
| `team_read_monitor_snapshot` | `omx team api read-monitor-snapshot --json` |
| `team_write_monitor_snapshot` | `omx team api write-monitor-snapshot --json` |
| `team_read_task_approval` | `omx team api read-task-approval --json` |
| `team_write_task_approval` | `omx team api write-task-approval --json` |

## 메시지 수명주기 작업

- 보내기: `send-message`, `broadcast`
- 검사: `mailbox-list`
- 배송 마커: `mailbox-mark-notified`, `mailbox-mark-delivered`

## 디스패치 정책(권한 있는 경로)

- `omx team api ... --json` + team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 파일을 신뢰할 수 있는 전달/제어 경로로 사용하세요.
- 직접 tmux 입력(`tmux send-keys`, 반복 Enter 주입)은 작동 대체일 뿐이며 돌연변이 계약이 아닙니다.
- Interop 브로커 및 작업자 자동화는 tmux 키 입력 전달이 성공적인 사서함/작업 변형을 의미한다고 가정해서는 안 됩니다. 항상 JSON 봉투 + 상태 읽기를 통해 확인하세요.
- Rust-core + Thin-Adapter 리더 호환성 및 릴리스 게이팅은 다음 문서에 문서화되어 있습니다.
  `docs/contracts/rust-runtime-thin-adapter-contract.md` 및
  `docs/qa/rust-runtime-thin-adapter-gate.md`.

## 이벤트 읽기/깨우기 계약

브로커가 `read-events` / `await-event`을 통해 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 이벤트를 검사하는 경우:

- 이벤트는 정식 형식으로 반환됩니다. 레거시 `worker_idle` 로그 항목은 `worker_state_changed`로 정규화되고 `source_type: "worker_idle"`을 유지합니다.
- `wakeable_only=true`은 `omx team await` 의미를 반영합니다. 깨울 수 있는 이벤트에는 터미널 작업 이벤트, 작업자 상태 변경, `leader_notification_deferred`, `all_workers_idle`, `team_leader_nudge`, `worker_merge_conflict` 및 신호별 오래된 경고가 포함됩니다.
- `worker_diff_report` 및 `worker_merge_report`과 같은 감사 전용 비교/보고 이벤트는 지속성을 유지하지만 절전 모드를 해제할 수는 없습니다.
- `worker_merge_conflict`은 실행 가능한 통합 충돌에 대한 호환성 이벤트로 유지됩니다. 소비자는 존재하는 경우 더 풍부한 `metadata`을 읽으면서 해당 이벤트 유형에 대한 라우팅(Routing) 충돌 처리를 계속해야 합니다.

## JSON 봉투 계약

`--json` 출력은 기계 판독 가능하고 안정적입니다.

- 성공:
  - `{"schema_version":"1.0","timestamp":"<ISO>","command":"omx team api <operation>","ok":true,"operation":"<operation>","data":{...}}`
- 실패:
  - `{"schema_version":"1.0","timestamp":"<ISO>","command":"omx team api ...","ok":false,"operation":"<operation|unknown>","error":{"code":"<code>","message":"<message>"}}`

## 메모

- `transition-task-status`은 소유권 주장이 안전한 터미널 전환 경로입니다.
  - 런타임은 `in_progress -> completed|failed`을 시행합니다. 다른 전환은 `invalid_transition`을 반환합니다.
- `release-task-claim`은 작업을 의도적으로 `pending`로 재설정합니다. 완료 작업이 아닙니다.
- `update-task`은 `subject`, `description`, `blocked_by` 및 `requires_code_change`만 변경 가능한 필드로 허용합니다.
- `append-event.type` 및 `write-task-approval.status`은 엄격한 열거형 유효성 검사를 시행합니다.
