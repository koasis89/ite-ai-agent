# 울트라골

`ultragoal`은 Codex 목표 모드 위에 계층화된 내구성 있고 저장소 기반의 다중 목표 워크플로우입니다. Codex 목표 모드가 활성 스레드 포커스를 추적하는 동안 장거리 계획을 파일에 유지합니다.

## 왜 이 모양인가

Codex CLI 0.128.0은 `goals`을 활성화된 기능으로 표시하지만 `codex --help`에는 `goal` 쉘 하위 명령이 없습니다. 이 런타임에서는 목표 모드가 에이전트(Agent)에 모델 도구로 노출됩니다.

- `get_goal`은 활성 스레드 목표를 읽습니다.
- `create_goal`은 스레드에 대해 하나의 활성 목표를 생성하고 스레드에 이미 목표가 있는 경우 실패합니다.
- `update_goal`은(는) 기존 목표 `complete`만 표시할 수 있습니다.

또한 업스트림 Codex 목표 소스는 목표를 4,000자로 제한하고, 토큰/시간 사용량을 추적하고, `ThreadGoalUpdated` 이벤트를 내보내고, 연속/예산 제한 프롬프트를 사용하여 작업 집중을 유지합니다. 따라서 OMX는 셸 명령이 숨겨진 Codex 스레드 상태를 변경할 수 있는 척해서는 안 됩니다. 대신 `omx ultragoal complete-goals`은 repo 상태를 체크포인트하고 활성 Codex 에이전트가 목표 도구를 안전하게 호출할 수 있도록 명시적인 핸드오프를 인쇄합니다.

새로운 울트라골 계획은 기본적으로 **집계 Codex 목표 모드**로 설정됩니다. Codex는 전체 울트라골 실행에 대해 하나의 목표를 얻는 반면 OMX는 G001/G002 스토리 상태 및 원장 체크포인트를 소유합니다. 이는 완료된 G001 Codex 목표에서 새로운 G002 Codex 목표로의 불가능한 동일 스레드 전환을 방지합니다. 스토리당 하나의 Codex 스레드를 원하는 사용자에게는 기존 또는 명시적으로 요청된 **스토리별** 계획이 계속 지원됩니다.

## 유물

모든 아티팩트는 `.omx/ultragoal/` 아래에 있습니다.

- `brief.md` — 원본 프로젝트/대화 개요.
- `goals.json` — 상태, 시도, 증거 및 활성 목표 ID가 포함된 주문된 지속형 계획입니다.
- `ledger.jsonl` — 추가 전용 체크포인트 이벤트(`plan_created`, `goal_started`, `goal_resumed`, `goal_completed`, `goal_blocked`, `goal_failed`, `goal_retried`).

집계 모드에서 `goals.json`은 다음도 저장합니다.

- `codexGoalMode: "aggregate"`
- `codexObjective` — `create_goal`로 전송된 정확한 결정론적 목표는 Codex의 목표 제한으로 제한되고 `.omx/ultragoal/goals.json`를 참조합니다.

## 명령

계획 만들기:

```sh
omx ultragoal create-goals --brief "Ship the feature in three safe milestones"
omx ultragoal create-goals --brief-file docs/my-brief.md
cat docs/my-brief.md | omx ultragoal create-goals --from-stdin
omx ultragoal create-goals --codex-goal-mode per-story --brief "Use one fresh Codex thread per story"
```

다음 목표를 시작하거나 재개하세요.

```sh
omx ultragoal complete-goals
```

이 명령은 보류 중인 다음 OMX 스토리 `in_progress`을 표시하고 원장 항목을 추가하며 목표 도구 전달을 인쇄합니다. 집계 모드에서 에이전트는 활성 Codex 목표가 없는 경우에만 `get_goal`을 호출한 다음 `create_goal`을 호출해야 합니다. 동일한 집계 목표가 이미 활성화된 경우 에이전트는 새 Codex 목표를 생성하지 않고 다음 OMX 스토리를 계속합니다.

중간 스토리의 경우 `update_goal`을 호출하지 **않습니다**. 목표가 `codexObjective`와 일치하고 상태가 여전히 `active`인 새로운 `get_goal` 스냅샷으로 OMX 스토리를 체크포인트합니다.

```sh
omx ultragoal checkpoint --goal-id G001-example --status complete --evidence "npm test passed; docs updated" --codex-goal-json ./get-goal.json
```

마지막 스토리에서는 전체 실행 감사를 실행하고, `update_goal({status: "complete"})`을 호출하고, `get_goal`을 다시 호출하고, 새로운 전체 집계 스냅샷으로 체크포인트를 수행합니다.

실패 처리:

```sh
omx ultragoal checkpoint --goal-id G001-example --status failed --evidence "blocked on missing credential"
omx ultragoal complete-goals --retry-failed
```

레거시 스레드 목표 차단기 처리 완료:

```sh
omx ultragoal checkpoint --goal-id G001-example --status blocked --evidence "completed legacy Codex goal blocks create_goal in this thread" --codex-goal-json ./get-goal.json
```

`--status blocked`은 레거시 스토리당 또는 사전 집계 세션을 위한 비터미널 원장 체크포인트입니다. 이전의 다른 Codex 스레드 목표는 이미 `complete`이고 현재 `get_goal`/`create_goal` 도구 인터페이스에는 동일한 스레드에서 완료된 목표를 지울 수 있는 재설정/새 목표 작업이 없습니다. 이는 `goal_blocked` 이벤트를 작성하고, 울트라골을 `in_progress`로 유지하며, 에이전트가 `create_goal`이 활성 울트라골 목표를 시작할 수 있는 새로운 Codex 스레드에서 동일한 저장소/작업 트리를 계속해야 함을 기록합니다.

상태:

```sh
omx ultragoal status
omx ultragoal status --codex-goal-json ./get-goal.json
omx ultragoal status --json
```

## 통합 제약

- 하나의 Codex 스레드는 최대 하나의 목표 초점을 가질 수 있습니다.
- `create_goal`은 활성 목표를 시작합니다. 종합 기획 매장이 아닙니다.
- `update_goal`은 완료 전용입니다. 일시 중지/재개/예산 상태는 OMX가 아닌 Codex/사용자/시스템에 의해 제어됩니다.
- Aggregate 모드가 기본값입니다. 하나의 Codex 목표가 전체 ultragoal 실행을 다루고 G001/G002는 OMX 원장 스토리입니다.
- 중간 집계 스토리 체크포인트에는 일치하는 `active` Codex 스냅샷이 필요합니다. 조기 `update_goal`을 방지하기 위해 최종 스토리 전의 `complete` 스냅샷이 거부됩니다.
- 최종 집계 스토리 체크포인트에는 `update_goal({status: "complete"})` 이후에 캡처된 일치하는 `complete` Codex 스냅샷이 필요합니다.
- 현재 완료된 레거시 스레드 목표를 대체하기 위한 Codex 목표 도구 재설정/새 목표 인터페이스은 없습니다. 스토리별 모드에서 `get_goal`이 완료된 다른 목표를 반환하고 스레드에 이미 목표가 있기 때문에 `create_goal`이 거부하는 경우 해당 `get_goal` JSON으로 `omx ultragoal checkpoint --status blocked`을 기록한 다음 동일한 분기/작업 트리의 새 Codex 스레드에서 계속하고 거기에서 울트라 목표 페이로드에 대해 `create_goal`를 호출합니다.
- Ultragoal은 내구성 있는 계획과 원장 상태를 소유합니다. Codex 목표 모드는 활성 스레드 포커스 및 계산을 소유합니다.
- OMX는 `../../codex`과 같은 업스트림 Codex 소스를 편집하지 않으며, 숨겨진 `/goal` 변경자로 쉘 아웃하지 않으며, `omx ultragoal checkpoint`가 Codex의 활성 스레드 목표를 변경한다고 주장하지 않습니다. 유일한 Codex 목표 모드 핸드오프는 명시적입니다. `get_goal`, 활성 목표가 없으면 `create_goal`, 실제 완료 감사를 통과한 후 `update_goal({status: "complete"})`입니다.
- 완료 체크포인트에는 새로운 `get_goal` 스냅샷이 필요합니다. `--codex-goal-json <json-or-path>`을 사용하여 `get_goal`의 JSON을 저장하거나 전달합니다. OMX는 목표를 비교하고 모드별 상태를 적용합니다(중간 집계 스토리의 경우 `active`, 최종 집계 또는 스토리별 완료의 경우 `complete`).
- 활성 또는 불완전한 잘못된 Codex 목표는 엄격한 불일치 오류로 남아 있습니다. `--status blocked` 해결 방법은 차단 Codex 스냅샷이 `complete`이고 활성 Ultragoal과 다른 목표를 갖는 경우에만 적용됩니다. 활성 목표 불일치 보호를 우회하는 데 사용해서는 안 됩니다.
- 단순히 테스트를 통과했거나 원장 항목이 존재한다고 해서 목표가 완료되는 것은 아닙니다. 에이전트는 파일, 명령, 테스트, PR 상태 또는 기타 구체적인 증거에 대해 목표를 감사해야 합니다.
