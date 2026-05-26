# `.omx-config.json` 모델/환경 라우팅(Routing) 참조

이 페이지에는 **모델 및 환경 라우팅**에 대한 추가 세부정보와 함께 현재 `oh-my-codex` 코드가 인식하는 `.omx-config.json` 키가 문서화되어 있습니다. 알림 및 OpenClaw와 같은 기능 소유 설정은 해당 기능 근처에 문서화되어 있지만 지원되는 키 모양이 여기에 요약되어 있어 이 페이지가 안전한 스키마 맵 역할을 할 수 있습니다.

설치된 OMX 버전에서 인식하지 않는 한 키를 추가하거나 편집하지 마십시오. 알 수 없는 키는 안정적인 확장 지점이 아니며 잘못된 형식의 JSON 또는 잘못된 모양의 섹션이 무시되거나 해당 키를 읽는 기능에 대해 실패 처리될 수 있습니다.

## 파일을 읽는 위치

대부분의 `.omx-config.json` 독자는 활성 Codex 홈을 통해 해결합니다.

| Setup shape | Config file | Notes |
| --- | --- | --- |
| User scope | `${CODEX_HOME:-~/.codex}/.omx-config.json` | Default setup shape. `CODEX_HOME` wins when set. |
| Project scope | `./.codex/.omx-config.json` | Used by OMX launch paths when `./.omx/setup-scope.json` says `project` and `CODEX_HOME` is not already set. |

프로젝트 범위 설정은 `./.codex/config.toml`, `./.codex/hooks.json` 및 프로젝트 로컬 기술/프롬프트/에이전트(Agent)도 작성합니다. 사용자 범위 설정은 `${CODEX_HOME:-~/.codex}` 아래에 해당 파일을 씁니다.

Wiki 수명 주기 리더는 후크 페이로드 `cwd`에서 실행되기 때문에 프로젝트 루트 예외입니다. 먼저 `<root>/.omx-config.json`을 확인한 다음 `${CODEX_HOME:-~/.codex}/.omx-config.json`을 확인하고 두 파일 모두 유효한 `wiki` 개체가 없으면 내장된 Wiki 기본값으로 돌아갑니다. 프로젝트 범위 Codex-home 파일 `./.codex/.omx-config.json`은 `CODEX_HOME`이 `./.codex`으로 확인될 때 계속 적용됩니다. 이는 추가적인 Wiki 전용 조회 경로가 아닙니다.

`omx setup --scope project`은 `./.omx/setup-scope.json`에서 프로젝트 범위 선택을 유지합니다. `omx doctor`는 확인된 설정 범위와 확인 중인 Codex 홈/구성 경로를 인쇄합니다.

## 지원되는 최상위 키

현재 코드는 다음과 같은 최상위 `.omx-config.json` 키를 인식합니다.

| Top-level key | Supported shape | Primary use |
| --- | --- | --- |
| `agentReasoning` | Object mapping agent names to `low`, `medium`, `high`, or `xhigh` | Optional per-agent reasoning overrides for generated native agent TOML and role-based worker/Ralph staffing guidance. |
| `env` | Object of non-empty string values | Fallback environment values for model routing and helper launch paths. Model-related supported keys are listed below. |
| `models` | Object of non-empty string values | Mode defaults and low-complexity model aliases. Supported model-routing keys are listed below. |
| `notifications` | Object | Notification transports, profiles, templates, cooldowns, replies, and OpenClaw/custom aliases. See the notification summary below and the OpenClaw guide for full examples. |
| `stopHookCallbacks` | Legacy object | Backward-compatible legacy session-end notification config for `telegram` and `discord`; prefer `notifications`. |
| `promptRouting` | `{ "triage": { "enabled": boolean } }` | Enables/disables advisory triage prompt routing. Missing key defaults to enabled; malformed shape fails closed to disabled. |
| `autoNudge` | Object | Native auto-continuation settings for matched permission/stall prompts. Supported keys: `enabled`, `patterns`, `response`, `delaySec`, `stallMs`, `ttlMs`, and legacy `cooldownMs`. This is not the deprecated team worker stall/progress nudge path; do not add `OMX_TEAM_PROGRESS_STALL_MS` or `OMX_TEAM_WORKER_TURN_STALL_MS` as operator tuning guidance. |
| `wiki` | Object | Project wiki lifecycle settings. Supported keys: `enabled`, `autoCapture`, `maxContextLines`, `staleDays`, `maxPageSize`, `feedProjectMemoryOnStart`. |

### 알림 소유 키

`notifications`은 다음과 같은 현재 형태를 지원합니다.

- 전역 필드: `enabled`, `verbosity` (`verbose`, `agent`, `session` 또는 `minimal`), `defaultProfile`, `profiles`, `events`, `hookTemplates`, `reply`, `dispatchCooldownSeconds` 및 `idleCooldownSeconds`.
- 플랫폼 필드: `discord`, `discord-bot`, `telegram`, `slack`, `webhook`.
- OpenClaw/사용자 정의 전송 필드: `openclaw`, `custom_webhook_command` 및 `custom_cli_command`.
- `events` 아래의 이벤트 키: `session-start`, `session-stop`, `session-end`, `session-idle` 및 `ask-user-question`. 각 이벤트는 `enabled`, `messageTemplate` 및 플랫폼 재정의를 설정할 수 있습니다.
- `hookTemplates`은 `version`, `enabled`, `events` 및 `defaultTemplate`을 지원합니다. 이벤트별 템플릿 구성은 `enabled`, `template` 및 플랫폼 템플릿 재정의를 지원합니다.
- `reply`은 `enabled`, `authorizedDiscordUserIds`, `pollIntervalMs`, `rateLimitPerMinute`, `maxMessageLength` 및 `includePrefix`을 지원합니다.
- `notifications.openclaw`은 `enabled`, `gateways` 및 `hooks`을 지원합니다. 게이트웨이 항목은 HTTP(`type`, `url`, `headers`, `method`, `timeout`) 또는 명령(`type`, `command`, `timeout`)입니다. 후크 항목은 `gateway`, `instruction` 및 `enabled`을 사용합니다.

Discord webhook-vs-bot 설정에는 [__TOK_0__](../discord-integration.md)를 사용하고 전체 알림/OpenClaw 예제에는 [__TOK_1__](../openclaw-integration.md)을 사용하세요. 가능하면 환경 변수에 자격 증명을 유지하세요.

## 지원되는 모델/환경 키

모델 라우팅 리더는 `env`, `models` 및 역할 추론 재정의 맵 `agentReasoning`을 지원합니다.

```json
{
  "agentReasoning": {
    "architect": "xhigh",
    "critic": "xhigh"
  },
  "env": {
    "OMX_DEFAULT_FRONTIER_MODEL": "gpt-5.5",
    "OMX_DEFAULT_STANDARD_MODEL": "gpt-5.4-mini",
    "OMX_DEFAULT_SPARK_MODEL": "gpt-5.3-codex-spark"
  },
  "models": {
    "default": "gpt-5.5",
    "team": "gpt-5.5",
    "team_low_complexity": "gpt-5.3-codex-spark"
  }
}
```

### `env`

`env`은 실제 쉘 환경에서 설정되지 않은 경우 대체 환경 값을 제공합니다. 쉘 환경 변수가 여전히 승리합니다.

지원되는 모델 관련 키:

| Key | Purpose |
| --- | --- |
| `OMX_DEFAULT_FRONTIER_MODEL` | Main/frontier default used by leaders and frontier-class roles when no stronger config wins. |
| `OMX_DEFAULT_STANDARD_MODEL` | Optional standard-lane override. If omitted, standard agents inherit the main/frontier default. |
| `OMX_DEFAULT_SPARK_MODEL` | Spark/fast-lane default for low-cost exploration and low-complexity workers. |
| `OMX_SPARK_MODEL` | Legacy spark fallback; prefer `OMX_DEFAULT_SPARK_MODEL` for new config. |
| `OMX_TEAM_CHILD_MODEL` | Default child model for specific team-child paths that read this setting directly. |

`readConfiguredEnvOverrides()`은(는) `omx explore` 및 `omx sparkshell`과 같은 실행 도우미에 대해 `env`의 비어 있지 않은 다른 문자열 값도 전달합니다. 이를 역할별 모델 라우팅을 위한 스키마가 아닌 고급 환경 재정의로 처리합니다.

### `models`

`models`은 모드 이름을 명시적 모델 재정의에 매핑합니다. 값은 비어 있지 않은 문자열이어야 합니다.

지원되는 모델 라우팅 키:

| Key shape | Purpose |
| --- | --- |
| `default` | Fallback for `getModelForMode(mode)` when the requested mode has no explicit key. |
| Any mode key, for example `team`, `autopilot`, `ralph` | Explicit model for that mode when code calls `getModelForMode("mode")`. |
| `team_low_complexity` | Low-complexity team/spark model override. |
| `team-low-complexity` | Alias for `team_low_complexity`. |
| `teamLowComplexity` | Alias for `team_low_complexity`. |

설치된 버전이 정확한 키를 문서화하지 않는 한 `models.executor`, `models.architect` 또는 `models.roles`와 같은 역할별 맵을 작성하지 마십시오. 현재 역할 라우팅은 임의의 역할별 JSON 맵이 아닌 에이전트 정의 및 모델 클래스를 기반으로 합니다.

### `agentReasoning`

`agentReasoning`은 지원되는 에이전트별 추론 재정의 맵입니다. 키는 에이전트 이름이며 값은 `low`, `medium`, `high` 또는 `xhigh` 중 하나여야 합니다.

```json
{
  "agentReasoning": {
    "architect": "xhigh",
    "critic": "xhigh"
  }
}
```

이러한 재정의는 소스에 내장된 기본값을 변경하지 않습니다. 이는 OMX가 생성된 기본 에이전트 TOML 및 역할 기반 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/Ralph 인력/작업자 지침에 대한 역할 추론을 해결할 때 적용되는 사용자/프로젝트 구성입니다. 이 맵을 변경한 후 `omx setup`을 다시 실행하면 설정 관리 네이티브 에이전트 TOML 파일이 다시 생성됩니다. 잘못된 에이전트 이름, 빈 값, 지원되지 않는 노력 값은 무시됩니다.

## 효과적인 모델 우선순위

### 메인/프론티어 기본값

기본 기본값은 다음 순서로 해결됩니다.

1. 쉘 `OMX_DEFAULT_FRONTIER_MODEL`
2. `.omx-config.json` `env.OMX_DEFAULT_FRONTIER_MODEL`
3. 활성 코덱스 `config.toml` 루트 `model`
4. 내장 기본값: `gpt-5.5`

### 모드별 모델 조회

코드가 `getModelForMode(mode)`을 요청하면 모드 모델은 다음 순서로 해결됩니다.

1. `.omx-config.json` `models[mode]`
2. `.omx-config.json` `models.default`
3. 위의 기본/프론티어 기본값

예: `models.team = "gpt-5.5"` 및 `models.default = "gpt-5.4-mini"`의 경우 `team`는 `gpt-5.5`을 사용합니다. 자체 키가 없는 모드는 `gpt-5.4-mini`을 사용합니다.

### 표준 파트 에이전트

표준 파트 에이전트는 다음 순서로 해결합니다.

1. 쉘 `OMX_DEFAULT_STANDARD_MODEL`
2. `.omx-config.json` `env.OMX_DEFAULT_STANDARD_MODEL`
3. 메인/프론티어 기본값

이는 표준 파트 재정의를 선택하지 않는 한 표준 에이전트가 리더/프론티어 모델을 상속한다는 의미입니다.

### Spark/패스트 파트 에이전트

Spark/fast 기본값은 다음 순서로 해결됩니다.

1. 쉘 `OMX_DEFAULT_SPARK_MODEL`
2. 쉘 레거시 `OMX_SPARK_MODEL`
3. `.omx-config.json` `env.OMX_DEFAULT_SPARK_MODEL`
4. `.omx-config.json` 레거시 `env.OMX_SPARK_MODEL`
5. `.omx-config.json` `models.team_low_complexity`, `models.team-low-complexity` 또는 `models.teamLowComplexity`
6. 내장 기본값: `gpt-5.3-codex-spark`

복잡도가 낮은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 도우미의 경우 정확한 순서는 호출 경로에 따라 다릅니다. `getSparkDefaultModel()`은 복잡도가 낮은 별칭 전에 Spark env/config 값을 확인하고, `getTeamLowComplexityModel()`은 Spark 기본값으로 돌아가기 전에 복잡도가 낮은 별칭을 확인합니다.

## 역할/카테고리 라우팅 예시

기본 에이전트 TOML 생성 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 모델 계약 논리는 `modelClass` 및 `reasoningEffort` 메타데이터와 함께 에이전트 정의를 사용합니다. 기본 에이전트 생성에는 하나의 중요한 프론티어 파트 우선 순위 세부 사항이 있습니다. 프런티어 역할 및 `executor` 특수 사례의 경우 활성 Codex `config.toml` 루트 `model`을 먼저 읽은 다음 해당 루트 모델이 없으면 `getMainDefaultModel()`로 폴백됩니다. `getMainDefaultModel()`은 이 경로의 대체일 뿐이므로 `.omx-config.json` `env.OMX_DEFAULT_FRONTIER_MODEL`은 생성된 기본 에이전트 TOML에 대한 명시적 `config.toml` 루트 `model`을 재정의하지 않습니다.

예:

| Role/category | Examples | Model class behavior |
| --- | --- | --- |
| Frontier orchestration | `planner`, `architect`, `critic`, `code-reviewer`, `security-reviewer`, `team-executor`, `vision` | Native-agent generation uses active `config.toml` root `model` first, then the main/frontier default fallback. |
| Standard worker/review | `debugger`, `quality-reviewer`, `api-reviewer`, `performance-reviewer`, `dependency-expert`, `writer`, `researcher` | Uses the standard-lane default, which inherits main/frontier unless `OMX_DEFAULT_STANDARD_MODEL` is set. |
| Fast/low-complexity | `explore`, `style-reviewer` | Uses the spark/low-complexity default. |
| Executor special case | `executor` | Native-agent generation uses active `config.toml` root `model` first, then the main/frontier default fallback; team fallback routing keeps it on the frontier lane. |

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자가 다른 레이어를 추가하기 시작합니다.

1. `OMX_TEAM_WORKER_LAUNCH_ARGS` 내부의 명시적 `--model ...`이 승리합니다.
2. 상속 가능한 리더 실행 모델 인수를 작업자에게 전달할 수 있습니다.
3. 명시적/상속 모델이 없으면 작업자 역할의 기본 모델 클래스가 대체 모델을 선택합니다.
4. `explore`과 같은 빠른 역할과 `-low`로 끝나는 역할 이름은 낮은 복잡성/스파크 폴백을 사용합니다.

실행 중인 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)에 대한 검사 힌트가 필요한 경우 `omx team status <team-name> --model-inspect`을 사용하세요. 일반 상태 경로는 요약에 대한 모델 할당량 지출을 방지합니다.

## 추론 노력: 지원되는 장소만

`.omx-config.json`은(는) 루트 `model_reasoning_effort`을 구성하는 일반적인 장소가 **아닙니다**. `reasoningEffort`, `modelReasoningEffort`, `reasoning` 또는 선언되지 않은 역할별 추론 맵과 같은 임의의 키를 추가하지 마십시오. 지원되는 에이전트별 재정의 맵은 정확히 `agentReasoning`입니다.

지원되는 추론 노력 인터페이스은 다음과 같습니다.

- 활성 코덱스 `config.toml` 루트 키: `model_reasoning_effort = "medium"`.
- `omx reasoning <low|medium|high|xhigh>`, 활성 코덱스 `config.toml`을 편집합니다.
- `omx --high` 및 `omx --xhigh`, `-c model_reasoning_effort="high|xhigh"`을 Codex 실행에 전달합니다.
- OMX가 각 역할의 내장 `reasoningEffort` 메타데이터를 작성하는 기본 에이전트 TOML 파일이 생성되었습니다.
- `.omx-config.json` `agentReasoning`은 기본 제공 기본값을 변경하지 않고 생성된 기본 에이전트 TOML 및 역할 기반 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/Ralph 추론 할당에 대해 선택한 역할 기본값을 재정의합니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 실행 인수. 예:

```bash
OMX_TEAM_WORKER_LAUNCH_ARGS='-c model_reasoning_effort="low" --model gpt-5.3-codex-spark' \
  omx team 3:explore "map the config surfaces"
```

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임은 명시적인 추론 재정의가 없을 때 Codex 작업자에 대한 역할 기본 또는 `agentReasoning` 재정의 추론을 주입할 수도 있습니다. 명시적 실행 인수가 승리합니다.

## 스타터 구성

JSON은 주석을 허용하지 않으므로 JSON 블록만 복사하세요.

### 비용 절감형 스타터

이는 프론티어 기본값에 대한 오케스트레이션을 유지하고, 표준 작업자를 더 저렴한 표준 모델로 라우팅하고, 탐색/낮은 복잡성 작업을 위해 스파크 파트을 사용합니다.

```json
{
  "env": {
    "OMX_DEFAULT_FRONTIER_MODEL": "gpt-5.5",
    "OMX_DEFAULT_STANDARD_MODEL": "gpt-5.4-mini",
    "OMX_DEFAULT_SPARK_MODEL": "gpt-5.3-codex-spark"
  },
  "models": {
    "default": "gpt-5.4-mini",
    "team": "gpt-5.5",
    "team_low_complexity": "gpt-5.3-codex-spark"
  }
}
```

### 최고 품질의 스타터

이는 `OMX_DEFAULT_STANDARD_MODEL`을 생략하여 표준 에이전트가 프론티어 모델을 상속하는 동시에 명시적으로 복잡도가 낮은 라우팅을 위한 빠른 스파크 파트을 유지합니다.

```json
{
  "agentReasoning": {
    "architect": "xhigh",
    "critic": "xhigh"
  },
  "env": {
    "OMX_DEFAULT_FRONTIER_MODEL": "gpt-5.5",
    "OMX_DEFAULT_SPARK_MODEL": "gpt-5.3-codex-spark"
  },
  "models": {
    "default": "gpt-5.5",
    "team": "gpt-5.5",
    "autopilot": "gpt-5.5",
    "ralph": "gpt-5.5",
    "team_low_complexity": "gpt-5.3-codex-spark"
  }
}
```

## 효과적인 구성 확인

`.omx-config.json` 또는 `config.toml`을 편집한 후 OMX를 시작할 동일한 셸 및 프로젝트 형태에서 setup/doctor를 실행합니다.

```bash
omx setup
omx doctor
```

`omx doctor`은 확인된 설정 범위, Codex 홈, 구성 경로, 후크 적용 범위, 프롬프트/스킬(Skill)/에이전트 가용성 및 선택된 프롬프트 라우팅 상태를 보고합니다. This verifies install wiring and which config tree OMX is checking.

녹색 `omx doctor`은 활성 Codex 프로필이 선택한 모델을 인증하거나 실행할 수 있다는 증거가 아닙니다. 이를 위해 동일한 쉘/프로필/프로젝트를 사용하고 다음을 실행하십시오.

```bash
codex login status
omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"
```

동작이 구성과 일치하지 않는 경우 먼저 사용자 또는 프로젝트 범위에 있는지, 그리고 `CODEX_HOME`이 예상 Codex 홈을 재정의하는지 확인하세요.

## 관련 문서 및 소스 인터페이스

- 알림 및 OpenClaw 구성: [__TOK_0__](../openclaw-integration.md)
- 프로젝트 위키 구성: [__TOK_0__](./project-wiki.md)
- 모델 라우팅 소스: `src/config/models.ts`
- 알림 구성 소스: `src/notifications/config.ts`, `src/notifications/types.ts`, `src/notifications/hook-config-types.ts`
- OpenClaw 구성 소스: `src/openclaw/types.ts`, `src/openclaw/config.ts`
- 프롬프트 라우팅 구성 소스: `src/hooks/triage-config.ts`
- 자동 너지 구성 소스: `src/scripts/notify-hook/auto-nudge.ts`
- Wiki 수명 주기 구성 소스: `src/wiki/types.ts`, `src/wiki/lifecycle.ts`
- 에이전트 역할 정의: `src/agents/definitions.ts`
- 기본 에이전트 TOML 생성: `src/agents/native-config.ts`
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 모델 계약: `src/team/model-contract.ts`
- 범위/Codex 홈 실행 해결 방법: `src/cli/codex-home.ts`
