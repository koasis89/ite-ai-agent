# oh-my-codex 데모 가이드

## 전제조건

- Node.js >= 20
- [Codex CLI](https://github.com/openai/codex) 설치됨(`npm install -g @openai/codex`)
- OpenAI API 키가 구성됨

## 설정(< 2분)

```bash
# Clone and install
git clone https://github.com/Yeachan-Heo/oh-my-codex.git
cd oh-my-codex
npm install
npm run build
npm link

# Run setup (installs prompts, skills, configures Codex CLI)
omx setup
```

**예상 출력:**
```
oh-my-codex setup
=================

[1/7] Creating directories...
  Done.

[2/7] Installing agent prompts...
  Installed 30 agent prompts.

[3/7] Installing skills...
  Installed 40 skills.

[4/7] Updating config.toml...
  Done.

[4.5/7] Verifying Team MCP comm tools...
  omx_state exports: team_send_message, team_broadcast, team_mailbox_list, team_mailbox_mark_delivered

[5/7] Generating AGENTS.md...
  Generated AGENTS.md in project root.
  # (or: AGENTS.md already exists, use --force to overwrite)

[6/7] Configuring notification hook...
  Done.

[7/7] Configuring HUD...
  HUD config created (preset: focused).
  StatusLine configured in config.toml via [tui] section.

Setup complete! Run "omx doctor" to verify installation.
```

## 설치 확인

```bash
omx doctor
```

**예상 출력:**
```
oh-my-codex doctor
==================

  [OK] Codex CLI: installed
  [OK] Node.js: v20+
  [OK] Codex home: ~/.codex
  [OK] Config: config.toml has OMX entries
  [OK] Prompts: 30 agent prompts installed
  [OK] Skills: 40 skills installed
  [OK] AGENTS.md: found in project root
  [OK] State dir: .omx/state
  [OK] MCP Servers: 4 servers configured (OMX present)

Results: 9 passed, 0 warnings, 0 failed
```

## 데모 1: 상담원/기술 키워드

프로젝트 디렉터리에서 Codex CLI를 시작합니다.

```bash
omx
```

그런 다음 역할 및 워크플로 키워드를 사용합니다.

```
> $architect "analyze the authentication module"
```

**예상:** 아키텍트 에이전트는 파일:줄 참조, 근본 원인 진단 및 절충 분석을 통해 코드를 분석합니다.

```
> $security-reviewer "review the API endpoints"
```

**예상:** 심각도 우선 조사 결과 및 해결 코드 예제가 포함된 OWASP 상위 10개 분석.

```
> $explore "find all database query patterns"
```

**예상:** 파일 목록 및 패턴 요약을 사용한 구조적 코드베이스 검색.

## 데모 2: AGENTS.md 오케스트레이션 브레인

프로젝트 루트에 생성된 `AGENTS.md`은 오케스트레이션 두뇌 역할을 합니다. 다음을 제공합니다:

- 위임 규칙(언제 어떤 에이전트를 사용할지)
- AGENTS.md의 모델 라우팅 지침(복잡성/역할 기반 라우팅)
- 설명이 포함된 30개 에이전트 카탈로그
- 트리거 패턴이 포함된 40가지 스킬 설명
- 공통 워크플로우를 위한 팀 구성
- 검증 프로토콜

Codex CLI는 세션 시작 시 이를 자동으로 로드합니다.

## 데모 3: CLI 상태 명령

```bash
# Check version
omx version

# Check all active modes
omx status

# Cancel any active mode
omx cancel
```

**`omx version`에 대한 예상 출력:**
```
oh-my-codex vX.Y.Z
Node.js v20+
Platform: linux x64
```

**`omx status`에 대한 예상 출력(활성 모드 없음):**
```
No active modes.
```

## 데모 4: Codex CLI의 기술

기술은 Codex CLI에 의해 자동으로 검색됩니다. Codex 세션에서:

```
> $autopilot "build a REST API for task management"
```

**예상:** 완전 자율 파이프라인: 요구사항 분석 -> 기술 설계 -> 병렬 구현 -> QA 순환 -> 다중 관점 검증.

```
> $team 3:executor "fix all TypeScript errors"
```

**예상:** 준비된 파이프라인(계획 -> prd -> exec -> 확인 -> 수정 루프)을 사용하여 공유 작업 목록에서 작업하는 3개의 조정된 실행자 에이전트를 생성합니다.

## 데모 5: MCP 상태 관리

MCP 서버는 `config.toml`에 구성되어 있으며 에이전트에 상태/메모리 도구를 제공합니다.

```
> Use state_read to check if any modes are active
> Use project_memory_read to see project context
> Use notepad_write_working to save a note about current progress
```

**예상:** 에이전트는 MCP 도구 호출을 통해 `.omx/state/` 및 `.omx/project-memory.json`에 액세스합니다.

## 데모 6: E2E 팀 CLI(5개 이상의 병렬 작업자, 혼합 Codex/Claude)

이 데모는 단일 tmux 세션에서 다양한 AI CLI 도구(Codex + Claude)에 걸쳐 병렬 작업자를 생성하는 **tmux 기반 다중 에이전트 오케스트레이션** 시스템을 보여줍니다.

### 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                    tmux Session "omx-team"                   │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Leader     │  │ Worker 1 │  │ Worker 2 │  │ Worker N │ │
│  │  (main pane) │  │ (codex)  │  │ (codex)  │  │ (claude) │ │
│  └──────────────┘  └──────────┘  └──────────┘  └──────────┘ │
│         │               │              │              │     │
│         └───────────────┴──────────────┴──────────────┘     │
│                         │                                   │
│              ┌──────────┴──────────┐                        │
│              │  Shared Task Queue   │                        │
│              │  (durable state)     │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

**주요 기능:**
- **혼합 CLI 작업자**: OpenAI Codex와 Anthropic Claude 에이전트를 하나의 팀으로 결합합니다.
- **지속적 상태**: 세션이 중단되어도 작업 할당이 지속됩니다.
- **클레임에 안전한 수명 주기**: 버전이 지정된 작업 클레임으로 경합 상태를 방지합니다.
- **사서함 통신**: 작업자 간에 전달되는 구조화된 메시지

### 빠른 시작

팀 이름을 예측할 수 있도록 결정적 작업 슬러그를 사용합니다.

```bash
export TEAM_TASK="e2e team demo"
export TEAM_NAME="e2e-team-demo"   # slugified from TEAM_TASK

# Mixed worker CLIs (5+ workers, codex + claude)
export OMX_TEAM_WORKER_CLI=auto
export OMX_TEAM_WORKER_CLI_MAP=codex,codex,codex,claude,claude,claude
export OMX_TEAM_WORKER_LAUNCH_ARGS='-c model_reasoning_effort="low"'

# 5-worker baseline
omx team 5:executor "parallel team smoke"

# 6-worker mixed-CLI E2E run
omx team 6:executor "$TEAM_TASK"

# Discover team command help
omx team --help
omx team api --help

# Lifecycle commands
omx team status "$TEAM_NAME"
omx team resume "$TEAM_NAME"
omx team shutdown "$TEAM_NAME"
```

**예상되는:**
- 팀은 5명 이상의 작업자로 시작하여 `Team started: <team-name>`에 작업자 수를 더한 값을 인쇄합니다.
- 혼합 CLI 맵은 Codex 작업자와 Claude 작업자를 한 팀에서 실행합니다.
- `status`은 작업 분배 및 작업자 건강을 보여줍니다.
- `shutdown`은 작업자와 팀 상태를 정리합니다.

## 데모 7: `omx team api` 풍부한 CLI 상호 운용성 데모

모든 변형은 안정적인 JSON 봉투와 함께 CLI 상호 운용성(`omx team api ... --json`)을 사용해야 합니다.

### 7.1 작업 수명주기(클레임 안전)

```bash
CREATE_JSON=$(omx team api create-task --input '{"team_name":"e2e-team-demo","subject":"Demo lifecycle","description":"Claim-safe lifecycle demo","owner":"worker-1"}' --json)
TASK_ID=$(echo "$CREATE_JSON" | jq -r '.data.task.id')

CLAIM_JSON=$(omx team api claim-task --input "{\"team_name\":\"e2e-team-demo\",\"task_id\":\"$TASK_ID\",\"worker\":\"worker-1\",\"expected_version\":1}" --json)
CLAIM_TOKEN=$(echo "$CLAIM_JSON" | jq -r '.data.claimToken')

omx team api transition-task-status --input "{\"team_name\":\"e2e-team-demo\",\"task_id\":\"$TASK_ID\",\"from\":\"in_progress\",\"to\":\"completed\",\"claim_token\":\"$CLAIM_TOKEN\"}" --json
```

### 7.2 메일박스/메시지 흐름

```bash
omx team api send-message --input '{"team_name":"e2e-team-demo","from_worker":"leader-fixed","to_worker":"worker-1","body":"ACK: worker-1 ready"}' --json
omx team api broadcast --input '{"team_name":"e2e-team-demo","from_worker":"leader-fixed","body":"Sync checkpoint"}' --json
MAILBOX_JSON=$(omx team api mailbox-list --input '{"team_name":"e2e-team-demo","worker":"worker-1"}' --json)
MESSAGE_ID=$(echo "$MAILBOX_JSON" | jq -r '.data.messages[0].message_id // empty')
omx team api mailbox-mark-notified --input "{\"team_name\":\"e2e-team-demo\",\"worker\":\"worker-1\",\"message_id\":\"$MESSAGE_ID\"}" --json
omx team api mailbox-mark-delivered --input "{\"team_name\":\"e2e-team-demo\",\"worker\":\"worker-1\",\"message_id\":\"$MESSAGE_ID\"}" --json
```

### 7.3 완전한 운영 매트릭스(광범위한 적용 범위)

```bash
omx team api read-task --input '{"team_name":"e2e-team-demo","task_id":"<TASK_ID>"}' --json
omx team api list-tasks --input '{"team_name":"e2e-team-demo"}' --json
omx team api update-task --input '{"team_name":"e2e-team-demo","task_id":"<TASK_ID>","description":"Updated via CLI interop"}' --json
omx team api release-task-claim --input '{"team_name":"e2e-team-demo","task_id":"<TASK_ID>","claim_token":"<CLAIM_TOKEN>","worker":"worker-1"}' --json
omx team api read-config --input '{"team_name":"e2e-team-demo"}' --json
omx team api read-manifest --input '{"team_name":"e2e-team-demo"}' --json
omx team api read-worker-status --input '{"team_name":"e2e-team-demo","worker":"worker-1"}' --json
omx team api read-worker-heartbeat --input '{"team_name":"e2e-team-demo","worker":"worker-1"}' --json
omx team api update-worker-heartbeat --input '{"team_name":"e2e-team-demo","worker":"worker-1","pid":12345,"turn_count":12,"alive":true}' --json
omx team api write-worker-inbox --input '{"team_name":"e2e-team-demo","worker":"worker-1","content":"# Inbox update\nProceed with task 2."}' --json
omx team api write-worker-identity --input '{"team_name":"e2e-team-demo","worker":"worker-9","index":9,"role":"executor"}' --json
omx team api append-event --input '{"team_name":"e2e-team-demo","type":"task_completed","worker":"worker-1","task_id":"<TASK_ID>","reason":"demo"}' --json
omx team api get-summary --input '{"team_name":"e2e-team-demo"}' --json
omx team api write-shutdown-request --input '{"team_name":"e2e-team-demo","worker":"worker-1","requested_by":"leader-fixed"}' --json
omx team api read-shutdown-ack --input '{"team_name":"e2e-team-demo","worker":"worker-1"}' --json
omx team api read-monitor-snapshot --input '{"team_name":"e2e-team-demo"}' --json
omx team api write-monitor-snapshot --input '{"team_name":"e2e-team-demo","snapshot":{"taskStatusById":{"1":"completed"},"workerAliveByName":{"worker-1":true},"workerStateByName":{"worker-1":"idle"},"workerTurnCountByName":{"worker-1":12},"workerTaskIdByName":{"worker-1":"1"},"mailboxNotifiedByMessageId":{},"completedEventTaskIds":{"1":true}}}' --json
omx team api read-task-approval --input '{"team_name":"e2e-team-demo","task_id":"<TASK_ID>"}' --json
omx team api write-task-approval --input '{"team_name":"e2e-team-demo","task_id":"<TASK_ID>","status":"approved","reviewer":"leader-fixed","decision_reason":"demo approval","required":true}' --json
omx team api cleanup --input '{"team_name":"e2e-team-demo"}' --json
```

### 7.4 검증 기대

```bash
# Envelope checks (schema_version + operation + ok)
omx team api get-summary --input '{"team_name":"e2e-team-demo"}' --json | jq -e '.schema_version == "1.0" and .operation == "get-summary" and (.ok == true or .ok == false)'

# Team lifecycle checks
omx team status "e2e-team-demo"
omx team shutdown "e2e-team-demo"
```

성공 기준:
- 모든 `omx team api` 예는 유효한 JSON 봉투를 반환합니다.
- 작업 수명 주기는 `create-task -> claim-task -> transition-task-status`을 사용합니다.
- 메시지 수명 주기는 `send-message/broadcast -> mailbox-list -> mailbox-mark-*`을 사용합니다.
- 팀 수명 주기는 `omx team`, `omx team status`, `omx team resume` 및 `omx team shutdown`을 보여줍니다.

## 데모 8: 원샷 E2E 스크립트(복사/붙여넣기)

번들로 제공되는 도우미 스크립트를 사용하세요.

```bash
chmod +x scripts/demo-team-e2e.sh
./scripts/demo-team-e2e.sh
```

선택적 재정의:

```bash
TEAM_TASK="e2e team demo" \
TEAM_NAME="e2e-team-demo" \
WORKER_COUNT=6 \
OMX_TEAM_WORKER_LAUNCH_MODE=prompt \
./scripts/demo-team-e2e.sh
```

동등한 수동 원샷 명령 블록:

```bash
set -euo pipefail

export TEAM_TASK="e2e team demo"
export TEAM_NAME="e2e-team-demo"
export OMX_TEAM_WORKER_CLI=auto
export OMX_TEAM_WORKER_CLI_MAP=codex,codex,codex,claude,claude,claude
export OMX_TEAM_WORKER_LAUNCH_ARGS='-c model_reasoning_effort="low"'

echo "[1/8] start team (6 workers mixed codex/claude)"
omx team 6:executor "$TEAM_TASK"

echo "[2/8] lifecycle status"
omx team status "$TEAM_NAME"

echo "[3/8] create task"
CREATE_JSON=$(omx team api create-task --input "{\"team_name\":\"$TEAM_NAME\",\"subject\":\"one-shot lifecycle\",\"description\":\"demo task\",\"owner\":\"worker-1\"}" --json)
TASK_ID=$(echo "$CREATE_JSON" | jq -r '.data.task.id')

echo "[4/8] claim task"
CLAIM_JSON=$(omx team api claim-task --input "{\"team_name\":\"$TEAM_NAME\",\"task_id\":\"$TASK_ID\",\"worker\":\"worker-1\",\"expected_version\":1}" --json)
CLAIM_TOKEN=$(echo "$CLAIM_JSON" | jq -r '.data.claimToken')

echo "[5/8] transition task -> completed"
omx team api transition-task-status --input "{\"team_name\":\"$TEAM_NAME\",\"task_id\":\"$TASK_ID\",\"from\":\"in_progress\",\"to\":\"completed\",\"claim_token\":\"$CLAIM_TOKEN\"}" --json

echo "[6/8] mailbox flow"
omx team api send-message --input "{\"team_name\":\"$TEAM_NAME\",\"from_worker\":\"leader-fixed\",\"to_worker\":\"worker-1\",\"body\":\"ACK one-shot\"}" --json
MAILBOX_JSON=$(omx team api mailbox-list --input "{\"team_name\":\"$TEAM_NAME\",\"worker\":\"worker-1\"}" --json)
MESSAGE_ID=$(echo "$MAILBOX_JSON" | jq -r '.data.messages[0].message_id // empty')
omx team api mailbox-mark-notified --input "{\"team_name\":\"$TEAM_NAME\",\"worker\":\"worker-1\",\"message_id\":\"$MESSAGE_ID\"}" --json
omx team api mailbox-mark-delivered --input "{\"team_name\":\"$TEAM_NAME\",\"worker\":\"worker-1\",\"message_id\":\"$MESSAGE_ID\"}" --json

echo "[7/8] summary envelope check"
omx team api get-summary --input "{\"team_name\":\"$TEAM_NAME\"}" --json | jq -e '.schema_version == "1.0" and .operation == "get-summary" and .ok == true'

echo "[8/8] shutdown + cleanup"
omx team shutdown "$TEAM_NAME"
omx team api cleanup --input "{\"team_name\":\"$TEAM_NAME\"}" --json

echo "E2E demo complete."
```

예상되는:
- 팀은 6명의 혼합 작업자로 시작됩니다.
- 클레임 안전 수명주기가 처음부터 끝까지 성공합니다.
- 요약 봉투 확인에서는 종료 코드 0을 반환합니다.
- 팀이 완전히 종료되고 상태 정리가 완료됩니다.

## 파일 인벤토리

| Component | Count | Location |
|-----------|-------|----------|
| Agent prompts | 30 | `~/.codex/prompts/*.md` |
| Skills | 40 | `~/.codex/skills/*/SKILL.md` |
| MCP servers | 4 | Configured in `~/.codex/config.toml` |
| CLI commands | 11+ | `omx (launch), setup, doctor, team, version, tmux-hook, hud, status, cancel, reasoning, help` |
| AGENTS.md | 1 | Project root (generated) |

## 문제 해결

**Codex CLI를 찾을 수 없습니다:** `npm install -g @openai/codex`로 설치

**슬래시 명령이 표시되지 않음:** 프롬프트를 다시 설치하려면 `omx setup --force`을 실행하세요.

**MCP 서버가 연결되지 않음:** `[mcp_servers.omx_state]`, `[mcp_servers.omx_memory]`, `[mcp_servers.omx_code_intel]` 및 `[mcp_servers.omx_trace]` 항목에 대해 `~/.codex/config.toml`을 확인하세요.

**의사가 경고를 표시함:** 누락된 구성 요소를 설치하려면 `omx setup`을 실행하세요.

---

## 데모 9: 자동연구 쇼케이스 허브

이제 OMX에는 `playground/README.md`에 따라 재현 가능한 자동 연구 데모를 위한 경량 연구 쇼케이스 허브가 포함되어 있습니다.

빠른 시작:

```bash
# list bundled showcase missions
./scripts/run-autoresearch-showcase.sh --list

# run one showcase
./scripts/run-autoresearch-showcase.sh bayesopt

# run several showcases back-to-back
./scripts/run-autoresearch-showcase.sh omx-self ml-tabular bayesopt
```

임무 색인, 완료된 결과 요약 및 저장소 위생 지침은 `playground/README.md`을 참조하세요.

## 데모 스크립트 참조

### `scripts/demo-team-e2e.sh`

번들로 제공되는 E2E 데모 스크립트는 모든 주요 기능을 포괄적으로 다루는 tmux claude Worker 데모의 완전하고 자동화된 테스트를 제공합니다.

#### 스크립트 기능

| Feature | Description |
|---------|-------------|
| **Mixed CLI Workers** | Automatically distributes workers across Codex and Claude CLIs |
| **Claim-Safe Lifecycle** | Demonstrates proper task claim → transition → completion flow |
| **Mailbox Communication** | Tests message sending and mailbox operations |
| **Envelope Validation** | Validates JSON response schemas from all API calls |
| **Auto-Cleanup** | Trap-based cleanup ensures resources are freed on exit |

#### 환경 변수

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKER_COUNT` | `6` | Number of workers to spawn (minimum: 5) |
| `TEAM_TASK` | `e2e team demo <timestamp>` | Task description for the team |
| `TEAM_NAME` | (slugified from TEAM_TASK) | Unique team identifier |
| `OMX_TEAM_WORKER_CLI` | `auto` | Worker CLI selection mode |
| `OMX_TEAM_WORKER_CLI_MAP` | (auto-generated) | Comma-separated CLI assignments per worker |
| `OMX_TEAM_WORKER_LAUNCH_ARGS` | `-c model_reasoning_effort="low"` | Arguments passed to worker CLIs (worker model falls back to `OMX_DEFAULT_SPARK_MODEL`) |

#### 데모 흐름

```
[1/8] Start team → Creates tmux session with N mixed workers
[2/8] Status check → Verifies all workers are healthy
[3/8] Create task → Creates a test task in the shared queue
[4/8] Claim task → Worker-1 claims the task with version token
[5/8] Complete task → Transitions task to completed status
[6/8] Mailbox flow → Sends message and validates delivery
[7/8] Summary check → Validates JSON envelope schema
[8/8] Cleanup → Graceful shutdown and state cleanup
```

#### 종료 코드

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | Missing dependency or invalid input |
| `1` | Task lifecycle or API call failed |

#### 예: 사용자 정의 구성

```bash
# Run with 8 workers and custom task
WORKER_COUNT=8 \
TEAM_TASK="load test $(date +%s)" \
OMX_TEAM_WORKER_CLI_MAP=codex,codex,codex,codex,claude,claude,claude,claude \
./scripts/demo-team-e2e.sh
```
