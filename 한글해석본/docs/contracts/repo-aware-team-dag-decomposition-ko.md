# Repo 인식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) DAG 분해 계약

이 계약은 `.omx/plans/prd-repo-aware-team-decomposition.md`이 계획한 저장소 인식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 분해 게이트를 문서화합니다. 이는 의도적으로 런타임 전 계약입니다. team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)은 출시 전에 더 풍부한 계획 메타데이터를 가져오거나 파생할 수 있지만 작업자 실행은 기존 청구 안전 작업 수명 주기를 계속 사용해야 합니다.

## 계약 경계

- `omx team`은 호출이 해당 쌍에 대해 승인된 경우에만 `startTeam()`이 worker(실제작업을 수행하는 실행단위) 인터페이스를 시작하기 전에 승인된 최신 PRD/테스트 사양 쌍과 일치하는 DAG 핸드오프 아티팩트를 프리플라이트할 수 있습니다. CLI 입력이 PRD의 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 힌트와 일치하거나 사용자가 해당 힌트를 해결하는 `omx team team`와 같은 승인된 짧은 후속 작업을 사용합니다. 일반 `omx team [N[:role]] "task"` 시작에서는 주변/부실 `team-dag-*.json` 파일을 사용하면 안 됩니다.
- 실행 전 출력은 시작 작업 목록, 작업자 수, 소유자 할당, 받은 편지함 텍스트 및 관찰 가능성 메타데이터를 변경할 수 있습니다.
- 런타임 작업 변형은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 API의 소유로 유지됩니다. 실행 전은 `assignTask()`, `claimTask()`, `transitionTaskStatus()` 또는 `update-task` 수명 주기 제약 조건을 우회해서는 안 됩니다.
- 기존 `omx team [N[:role]] "task"` 동작은 승인된 유효한 DAG 핸드오프가 없을 때 대체 동작으로 유지됩니다.

## 아티팩트 해결

1. `selectLatestPlanningArtifacts()`과 동일한 슬러그 의미를 사용하여 최신 PRD를 선택한 다음 일치하는 `test-spec-<slug>.md`/`testspec-<slug>.md`이 하나 이상 필요합니다. 일치하는 테스트 사양이 없는 PRD는 DAG 활성화에 대해 승인된 쌍이 아닙니다.
2. 승인된 호출 게이트를 통과한 후 내장된 마크다운 핸드오프 JSON보다 `.omx/plans/team-dag-<slug>.json`을 선호합니다.
3. 일치하는 JSON 후보가 여러 개 있을 경우 사전순으로 최신 경로를 선택하고 실행 전 메타데이터에 `multiple_matches` 경고를 기록합니다.
4. 사이드카가 존재하지만 유효하지 않은 경우 v1의 레거시 텍스트 분해로 대체하고 대체 이유를 유지합니다. 유효하지 않은 아티팩트를 조용히 무시하지 마십시오.
5. 유효한 사이드카가 없으면 선택한 PRD에서 선택적 분리 `Team DAG Handoff` 블록을 구문 분석합니다.
6. 유효한 핸드오프가 발견되지 않으면 `decomposition_source=legacy_text`을 설정하고 기존 `buildTeamExecutionPlan()` 경로를 사용합니다.

## DAG 노드 요구사항

가져온 각 노드는 제한된 데이터 형태에 대해 유효성을 검사해야 합니다.

- 안정적인 기호 `id`
- `subject` 및 `description`
- 선택사항 `role`
- 선택사항 `lane`
- 선택적 `filePaths` 및 `domains`
- 선택적 기호 `depends_on`
- 선택사항 `requires_code_change`
- 선택적 승인 또는 확인 메모

유효성 검사에서는 작업자 시작 전에 중복된 노드 ID와 순환 종속성을 거부해야 합니다. 입력 순서는 토폴로지 정렬의 결정자이므로 생성된 작업 ID는 실행 전반에 걸쳐 안정적입니다.

## 런타임 종속성 다시 매핑

DAG 종속성은 계획 시 상징적이지만 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 준비는 구체적인 작업 ID를 기반으로 합니다. 따라서 시동 순서는 다음과 같아야 합니다.

1. DAG 노드를 검증하고 토폴로지적으로 정렬합니다.
2. 기호 종속성 필드 없이 안정적인 순서로 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업을 생성합니다.
3. 생성된 작업에서 `node_id -> task_id`을 빌드합니다.
4. `depends_on`/`blocked_by`에 구체적인 작업 ID만 포함되도록 지원되는 상태 도우미/API 경로를 통해 종속성 필드를 패치합니다.
5. 검사 및 디버깅을 위해 `decomposition-report.json`에서 매핑을 유지합니다.
6. 종속성 요약에 실제 작업 ID가 표시되도록 다시 매핑한 후 작업자 받은 편지함을 생성합니다.

런타임 작업 종속성에 기호 ID를 유지하지 마십시오. `claimTask()`은(는) 요금제 전용 ID로는 준비 상태를 증명할 수 없습니다.

## 지속성과 관찰 가능성

Preflight는 작업 스키마가 해당 필드를 명시적으로 지원하지 않는 한 청구 수명 주기 작업 페이로드에서 풍부한 계획 데이터를 유지해야 합니다.

| Data | Expected storage |
| --- | --- |
| `decomposition_source`, `dag_artifact_path`, `fallback_reason`, `worker_count_requested`, `worker_count_effective`, `worker_count_source`, `ready_lane_count` | team manifest/config metadata, via the top-level `team_decomposition` manifest block |
| node-to-task mapping, allocation reasons, file/domain/lane hints, warnings | `.omx/state/team/<team>/decomposition-report.json` and optional markdown summary |
| runtime dependencies | `TeamTask.depends_on` / `blocked_by` with concrete task IDs |
| `requires_code_change` | thread into `TeamTask` only through supported schema/API fields; otherwise reject or drop with an explicit validation warning |
| worker-facing ownership hints | initial inbox text for the assigned worker |

## 근로자 수 정책

- CLI 명시적 개수는 사용자가 재정의하며 엄격한 안전 상한선까지 준수되어야 합니다. 개수가 유용한 준비된 파트을 초과하는 경우 개수를 유지하되 잉여 지원/유휴 용량을 기록합니다.
- DAG가 요청한 것보다 적은 병렬 작업을 표시하는 경우 계획 제안 개수가 유용한 파트으로 줄어들 수 있습니다.
- 기본 파생 개수는 유용한 파트으로 줄어들 수 있습니다.
- 검증을 위한 코드 변경 구현 작업이 있고 검증 파트이 완전히 종속성 차단되지 않은 경우에만 검증 파트을 예약하세요.
- `DEFAULT_MAX_WORKERS`을(를) 초과하지 마세요.

## 할당 및 역할 일관성

할당은 다음을 선호해야 합니다.

1. 종속성이 준비된 루트 파트을 먼저 사용합니다.
2. 동일한 파일/도메인을 다루는 구현 노드에 대해 동일한 소유자;
3. 파트 용량이 충분할 때 전문가 역할(`test-engineer`, `writer`, `security-reviewer`)이 일관성을 유지합니다.
4. `worker_runtime_role_reason=mixed_roles_fallback`이 기록되어 혼합 역할 할당이 불가피한 경우에만 일반 대체입니다.

할당 이유는 테스트, 시작 요약 및 작업자 받은 편지함을 위해 충분히 짧고 안정적이어야 합니다.

## 작업자 받은편지함 UX

초기 받은 편지함에는 작업자 행동에 실질적으로 영향을 미치는 실행 전 데이터가 포함되어야 합니다.

- 할당된 파일 경로 및 도메인
- 파트 라벨;
- 구체적인 작업 ID가 포함된 종속성 요약
- 할당 이유;
- 기호 재매핑 후 정확한 할당된 작업 ID.

이를 통해 매니페스트 메타데이터에만 소유권 제약 조건을 숨기는 대신 작업자가 실제로 작동하는 위치에서 소유권 제약 조건을 볼 수 있습니다.

## 구현 시 보호해야 할 위험 검토

- 크고 불투명한 DAG 휴리스틱 블록을 `src/cli/team.ts`에 직접 넣지 마십시오. 작은 프리플라이트 모듈 솔기를 유지하십시오.
- 상태 판독기, API 상호 운용성 및 모니터 스냅샷이 함께 업데이트되지 않는 한 풍부한 메타데이터로 `TeamTask`을 확장하지 마세요.
- RALPLAN에서 제안한 작업자 수를 CLI 명시적 재정의로 처리하지 마십시오.
- 실행 전 작업 진행 중/완료된 작업 상태를 직접 작성하여 클레임 안전성을 우회하지 마세요.
- 기호적 종속성이 구체적인 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업 ID로 다시 매핑되기 전에 작업자를 시작하지 마세요.
