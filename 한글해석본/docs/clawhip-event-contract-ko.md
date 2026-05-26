# 클로힙 이벤트 계약

OMX는 기존 후크 확장성 파이프라인을 통해 Clawhip에 대한 후크 이벤트를 내보냅니다.

## 정식 라우팅(Routing) 규칙

원시 `event`이 아닌 `context.normalized_event`로 라우팅합니다.

이는 OMX가 `session-start`, `session-end` 및 `session-idle`와 같은 레거시 호환 원시 이벤트 이름을 사용하는 경우에도 Clawhip의 안정성을 유지합니다.

## 봉투

모든 이벤트는 기존 후크 엔벨로프를 사용합니다.

- `schema_version: "1"`
- `event`
- `timestamp`
- `source`
- `context`
- 선택적 ID: `session_id`, `thread_id`, `turn_id`, `mode`

## 공통 컨텍스트 필드

가능한 경우 OMX는 `context`에 다음 필드를 포함합니다.

- `normalized_event`
- `session_name`
- `repo_path`
- `repo_name`
- `worktree_path`
- `branch`
- `issue_number`
- `pr_number`
- `pr_url`
- `command`
- `tool_name`
- `status`
- `error_summary`

## 정규화된 이벤트

| `context.normalized_event` | Typical raw `event` values | Source | Notes |
| --- | --- | --- | --- |
| `started` | `session-start` | native | Session launch began. |
| `blocked` | `session-idle`, `blocked` | native/derived | Session is waiting on input or another dependency. |
| `run.heartbeat` | `run.heartbeat` | native/derived | Runtime heartbeat proving the active run is still alive. |
| `run.blocked_on_user` | `run.blocked_on_user` | native/derived | Runtime is paused pending user input or approval. |
| `run.blocked_on_system` | `run.blocked_on_system` | native/derived | Runtime is paused pending tool/system/environment repair. |
| `finished` | `session-end`, `finished` | native/derived | Session or turn finished successfully. |
| `failed` | `session-end`, `failed` | native/derived | Session, dispatch, or turn failed. |
| `worker.assigned` | `worker.assigned` | native/derived | Team runtime assigned a worker to a concrete task. |
| `worker.stalled` | `worker.stalled` | native/derived | Team runtime detected a worker that now needs supervisor intervention. |
| `worker.recovered` | `worker.recovered` | native/derived | A stalled/interrupted worker successfully resumed or was relaunched. |
| `retry-needed` | `retry-needed` | native/derived | Retryable delivery or execution follow-up is needed. |
| `pr-created` | `pr-created` | derived | Derived from successful `gh pr create` command output. |
| `test-started` | `test-started` | derived | Derived from test command invocation. |
| `test-finished` | `test-finished` | derived | Derived from successful test command completion. |
| `test-failed` | `test-failed` | derived | Derived from failed test command completion. |
| `handoff-needed` | `handoff-needed` | native/derived | Human or orchestrator follow-up is needed. |

## 수명주기 소유권

- 기본 세션 수명 주기 이벤트는 `started`, `blocked`, `run.heartbeat`, `run.blocked_on_user`, `run.blocked_on_system`, `finished` 및 `failed`의 정식 소스입니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/런타임 운영 이벤트는 `worker.assigned`, `worker.stalled` 및 `worker.recovered`에 대한 정식 작업자 상태 신호를 추가합니다.
- 파생된 운영 이벤트는 `retry-needed`, `pr-created`, `test-*` 및 `handoff-needed`에 대한 후속 세부 정보를 추가합니다.
- 운영 컨텍스트는 OMX 세션 ID + 작업 트리에서 `session_name`을 확인하므로 세션 메타데이터는 기본 및 파생 이벤트 전반에서 안정적으로 유지됩니다.

## 소음 및 중복 제어

- `notify-hook` 턴 중복 제거는 `thread_id + turn_id + type`에 의한 중복 `agent-turn-complete` 처리를 억제합니다.
- `session-idle` 방출은 여전히 ​​유휴 쿨다운 게이트를 사용합니다.
- 보조 텍스트 휴리스틱은 후속 신호(`retry-needed`, `handoff-needed`)를 생성하지만 세션 완료/실패 수명 주기 이벤트를 복제하지 않습니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 디스패치 재시도 및 실패 이벤트는 명시적인 대기열 전환 분기에서만 발생합니다.
- 롤아웃 파생 명령 이벤트는 `call_id`에 의해 상호 연관되며 일치하는 명령 수명 주기마다 한 번만 발생합니다.

## 소비자 지침

클로힙은 다음을 수행해야 합니다.

1. `context.normalized_event`을 표준 신호로 신뢰
2. 원시 `event`을 보조 판별자로 사용
3. 후속 라우팅을 위해 `command`, `tool_name`, `issue_number`, `pr_number` 및 `error_summary`를 사용합니다.
4. 강화된 클로힙 계약만 원하는 경우 `context.normalized_event` 없는 이벤트를 무시합니다.
