# 통합 지침 스키마(AGENTS + team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) worker(실제작업을 수행하는 실행단위) 인터페이스 인터페이스)

상태: 명령 인터페이스 정렬에 대한 정식 계약입니다.

## 목적

다음에 걸쳐 적용할 수 있는 하나의 공유 스키마를 정의합니다.
- 정적 AGENTS 템플릿 인터페이스,
- 런타임 AGENTS 오버레이,
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 오버레이,
- 작업자 프로토콜 기술/받은 편지함 지침.

이 표준은 추가적이며 마이그레이션에 안전합니다. 작업 상태 API, 마커 계약 또는 파일 경로 소유권 계약을 변경하지 않습니다.

## 정식 스키마 섹션

### 필수 섹션

1. **역할 및 의도**
   - 대리인/근로자는 누구이며 성공의 의미는 무엇입니까?
2. **작동 원리**
   - 높은 수준의 결정 규칙(품질, 속도, 안전, 검증).
3. **실행 프로토콜**
   - 작업 실행을 위한 순서가 지정된 워크플로 단계입니다.
4. **제약사항 및 안전**
   - 경계, 금지된 작업 및 호환성 제약.
5. **검증 및 완료**
   - 완료 주장을 하기 전에 증거가 필요합니다.
6. **복구 및 수명주기**
   - 취소/정리/재개 동작 및 상태 전환.

### 선택 섹션

- 도구 카탈로그 및 모델 라우팅(Routing) 지침.
- 기술 발견/참조 섹션.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 구성/파이프라인 사전 설정.
- 세션/런타임 컨텍스트 블록(런타임 오버레이에 의해 삽입된 경우)

## 글로벌 호환성 계약(안정적으로 유지되어야 함)

### 마커 계약

- `<!-- OMX:RUNTIME:START --> ... <!-- OMX:RUNTIME:END -->`
- `<!-- OMX:TEAM:WORKER:START --> ... <!-- OMX:TEAM:WORKER:END -->`

### 작업자 작업/사서함 계약

- 작업 파일 경로 형식: `.omx/state/team/<team>/tasks/task-<id>.json`(예: `task-3.json`)
- 상태/MCP API ID 형식: `task_id: "<id>"`(예: `"3"`, 절대 `"task-3"` 아님)
- 메일함 경로: `.omx/state/team/<team>/mailbox/<worker>.json`

## 매핑 매트릭스

| Surface | Role & Intent | Operating Principles | Execution Protocol | Constraints & Safety | Verification & Completion | Recovery & Lifecycle |
|---|---|---|---|---|---|---|
| `AGENTS.md` (workspace root, optional tracked copy) | Title + opening intro | `<operating_principles>` | mode selection + delegation/model-routing/skills/team sections + leader/worker split | compact hook-backed keyword/cancellation/state contract + stop/escalate rules | `<verification>` + continuation checklist + concise output contract | cancel + recovery/state guidance + runtime/team markers |
| `templates/AGENTS.md` | Title + opening intro | `<operating_principles>` | same canonical orchestration sections as the tracked root copy when one exists | same safety constraints | same verification section | runtime/team overlays added later via markers |
| `prompts/*.md` canonical role prompt surfaces | role-local identity + remit | role-local operating posture | task execution steps for that specialist | role boundaries / tool rules / handoff limits (report upward, do not recursively orchestrate) | evidence required before role-local completion claims | scenario handling + final checklist |
| Runtime AGENTS overlay block | session context identity | compaction protocol directives | checkpoint flow | overlay marker boundaries and size/lock gates | checkpoint evidence before compaction | runtime apply/strip lifecycle |
| Team worker overlay block | worker identity + team scope | worker protocol intent | ACK → read task → claim → execute → complete → idle | file ownership + blocked-state rules | write task result + status updates | mailbox polling + shutdown handling |
| `skills/worker/SKILL.md` + worker inbox | worker role framing | worker protocol principles | startup ACK/task lifecycle steps | claim-first + path/id safety rules | completion writeback requirements | mailbox/shutdown loop |

## 채택 참고 사항

- 출시 중 구조적 제거보다 추가적인 문구 업데이트를 선호합니다.
- 언어를 이 스키마에 맞추면서 모든 마커 경계 오버레이 텍스트 계약을 유지합니다.
- 역할 프롬프트는 다른 에이전트(Agent)를 직접 생성하거나 요청하는 대신 오케스트레이터로의 핸드오프를 권장해야 합니다.
- 루트 오케스트레이션 인터페이스은 파트을 혼합하기 전에 하나의 모드(`$deep-interview`, `$ralplan`, `$team` 또는 솔로 실행)를 명확하게 선택해야 합니다.
- 지침 충돌이 발견되면 명시적으로 버전이 지정되지 않는 한 기존 동작 의미 체계를 유지하면서 표현을 수정합니다.
