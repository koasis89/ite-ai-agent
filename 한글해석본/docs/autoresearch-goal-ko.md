# 자동 연구 목표

`omx autoresearch-goal`은 의미론적 연구 임무를 위한 내구성 있는 목표 모드 어댑터입니다. 이는 더 이상 사용되지 않는 `omx autoresearch` 직접 실행 명령과 의도적으로 분리되어 있습니다.

## 계약

- OMX는 `.omx/goals/autoresearch/<slug>/` 아래에 내구성 있는 아티팩트를 작성합니다.
- CLI는 숨겨진 Codex `/goal` 상태를 변경하지 않습니다. 활성 Codex 에이전트(Agent)에 대한 핸드오프를 인쇄합니다.
- 핸드오프는 에이전트에게 `get_goal`을 호출하고, 활성 목표가 없을 때만 `create_goal`을 호출하고, 교수 평론가 통과 및 객관적인 감사가 참인 후에만 `update_goal({status: "complete"})`를 호출한 다음, 새로운 `get_goal` 스냅샷을 `omx autoresearch-goal complete --codex-goal-json`에 전달하도록 지시합니다.
- 완료하려면 교수 평론가 `verdict=pass` 아티팩트와 `--codex-goal-json`와 함께 전달된 새로운 `get_goal` 스냅샷이 필요하므로 OMX는 목표를 비교하고 Codex 상태 `complete`을 요구합니다.

## 명령

```sh
omx autoresearch-goal create --topic "Research migration risk" --rubric "Professor critic rubric" --critic-command "node scripts/critic.js"
omx autoresearch-goal handoff --slug research-migration-risk
omx autoresearch-goal verdict --slug research-migration-risk --verdict pass --evidence ".omx/specs/report.md approved by critic"
omx autoresearch-goal complete --slug research-migration-risk --codex-goal-json ./get-goal.json
```

## 유물

- `mission.json` — 주제, 루브릭, 상태, 경로 및 선택적 비평가 명령.
- `rubric.md` — 의미론적 교수-비평가 루브릭.
- `ledger.jsonl` — 워크플로 및 유효성 검사 이벤트.
- `completion.json` — 최신 합격/실패/차단 판정 및 증거.
