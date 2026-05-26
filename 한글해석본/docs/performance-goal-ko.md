# 성과 목표 워크플로우

`omx performance-goal`은 Codex 목표 모드 위에 계층화된 평가자 기반 최적화 워크플로우입니다.

최적화가 시작되기 전에 로컬 평가자 계약을 기록하고, 진실한 Codex 목표 모드 핸드오프를 내보내고, 평가자 증거가 통과될 때까지 완료를 차단합니다.

## 유물

각 워크플로는 다음 위치에 저장됩니다.

```text
.omx/goals/performance/<slug>/
  state.json
  evaluator.md
  ledger.jsonl
```

## 경계

- OMX는 워크플로 상태, 평가자 계약, 검증 증거 및 원장을 유지합니다.
- Codex 목표 모드는 활성 스레드 포커스/계정을 소유합니다.
- CLI는 대화형 Codex 목표를 비밀리에 변경할 수 없습니다. `start`은 활성 에이전트(Agent)가 `get_goal`을 호출하고, 적절한 경우에만 `create_goal`을 호출하고, 목표 감사가 참인 후에만 `update_goal({status: "complete"})`을 호출한 다음, 새로운 `get_goal` 스냅샷을 `omx performance-goal complete --codex-goal-json`에 전달하라는 지침을 인쇄합니다.

## 최소 흐름

```sh
omx performance-goal create \
  --objective "Reduce startup latency by 20%" \
  --evaluator-command "npm run perf:startup" \
  --evaluator-contract "PASS when p95 latency improves by 20% and regression tests pass" \
  --slug startup-latency

omx performance-goal start --slug startup-latency
omx performance-goal checkpoint --slug startup-latency --status pass --evidence "benchmark and tests passed"
# after evaluator pass and objective audit, the agent calls update_goal({status: "complete"}) in the Codex thread
get_goal > ./get-goal-complete.json
omx performance-goal complete --slug startup-latency --evidence "final evaluator evidence" --codex-goal-json ./get-goal-complete.json
# shell commands never call update_goal; only the active Codex agent does that when the audit is true
```

통과 체크포인트가 존재하고 `--codex-goal-json`이 활성 Codex 목표 목표가 일치하고 `complete`임을 증명할 때까지 완료가 실패합니다. Status에서는 선택적 경고 전용 코디네이션(Coordination) 확인과 동일한 플래그를 허용합니다.
