# src/cli/ 모듈 분석

## 폴더 구조

```
src/cli/
├── omx.ts                  # Node CLI 진입점 (dist/cli/index.js 동적 임포트)
├── index.ts                # main() 구현 — 모든 커맨드 라우팅 허브
├── constants.ts            # CLI 플래그 상수
├── codex-home.ts           # Codex 홈 디렉토리 경로 해결
├── native-assets.ts        # 네이티브 바이너리 3종 관리 (하이드레이션·캐싱)
├── setup.ts                # omx setup — 설치/업데이트 자동화
├── setup-preferences.ts    # setup 범위·모드 영속 설정 읽기
├── uninstall.ts            # omx uninstall — OMX 설정 제거
├── update.ts               # omx update — npm 업데이트 체크/실행
├── version.ts              # omx version — 버전 출력
├── doctor.ts               # omx doctor — 설치 상태 점검
├── list.ts                 # omx list — 카탈로그 스킬·에이전트 목록
├── catalog-contract.ts     # 카탈로그 공개 계약 (기대값 정의)
├── auth.ts                 # omx auth — OAuth 슬롯 관리 (add|list|use)
├── cleanup.ts              # omx cleanup — 고아 MCP 프로세스·tmp 디렉토리 정리
├── state.ts                # omx state — 모드 상태 read/write/clear/list JSON CLI
├── team.ts                 # omx team — 병렬 워커 tmux 스폰
├── ralph.ts                # omx ralph — ralph 지속 모드 Codex 런치
├── ultragoal.ts            # omx ultragoal — 다중 목표 워크플로우
├── performance-goal.ts     # omx performance-goal — 성능 목표 평가 게이팅
├── autoresearch.ts         # omx autoresearch — [DEPRECATED] 하드 폐기됨
├── autoresearch-goal.ts    # omx autoresearch-goal — 교수-비평가 연구 목표
├── autoresearch-guided.ts  # autoresearch init 인수 파서 (내부 유틸)
├── autoresearch-intake.ts  # autoresearch 인테이크 처리 (내부 유틸)
├── ask.ts                  # omx ask — claude/gemini 에이전트 쿼리
├── question.ts             # omx question — 블로킹 UI 질문 진입점
├── explore.ts              # omx explore — 읽기 전용 탐색 (3가지 백엔드)
├── sparkshell.ts           # omx sparkshell — 네이티브 sparkshell 사이드카
├── api.ts                  # omx api — omx-api 게이트웨이 사이드카
├── mcp-serve.ts            # omx mcp-serve — OMX MCP 서버 런치
├── mcp-parity.ts           # MCP 패리티 체크 (내부)
├── hooks.ts                # omx hooks — 훅 플러그인 관리
├── tmux-hook.ts            # omx tmux-hook — tmux 프롬프트 인젝션
├── agents.ts               # omx agents — 네이티브 에이전트 TOML 관리
├── agents-init.ts          # omx agents-init / deepinit — AGENTS.md 부트스트랩
├── session-search.ts       # omx session — 로컬 세션 히스토리 검색
├── adapt.ts                # omx adapt — 외부 어댑터 스캐폴딩
├── star-prompt.ts          # GitHub Star 프롬프트 (내부 유틸)
├── plugin-marketplace.ts   # 플러그인 마켓플레이스 관리
├── codex-feature-probe.ts  # Codex 기능 프로브 유틸
└── __tests__/              # 단위 테스트
```

---

## 진입점 흐름

```
node bin/omx  (또는 npx omx)
    │
    ▼
omx.ts
  rememberOmxLaunchContext()             // 실행 경로 기억
  distEntry = dist/cli/index.js
  import(distEntry) → { main }
  main(process.argv.slice(2))            // 컴파일된 index.ts 실행
```

> `omx.ts`는 단순 부트스트랩이다. 실제 모든 로직은 `index.ts`의 `main()`에 있다.

---

## 시스템 개요: `omx` 커맨드 구조

```
omx <command> [subcommand] [args...]
     │
     ▼ main()  —  index.ts
     │
     ├─ [설치·설정]
     │   setup / uninstall / update / doctor / version
     │
     ├─ [실행 모드]
     │   launch(기본) / exec / team / ralph / ultragoal / performance-goal
     │
     ├─ [탐색·실행 사이드카]
     │   explore / sparkshell / api / mcp-serve
     │
     ├─ [에이전트·설정 관리]
     │   agents / agents-init / deepinit / adapt / list / session
     │
     ├─ [상호작용·질문]
     │   ask / question / auth
     │
     ├─ [모니터링·디버깅]
     │   state / status / hud / sidecar / hooks / tmux-hook / cleanup
     │
     └─ [기타]
         help / cancel / reasoning / autoresearch(deprecated)
```

---

## CLI 커맨드 전체 목록

### 코어 런치

| 커맨드 | 파일 | 설명 |
|--------|------|------|
| `omx` (기본) | `index.ts` | Codex CLI 런치 (tmux 자동 분기) |
| `omx exec` | `index.ts` | 비대화형 Codex exec + OMX overlay 인젝션 |
| `omx resume` | `index.ts` | 이전 대화형 세션 재개 |
| `omx team` | `team.ts` | 병렬 워커 tmux 스폰 + 인박스/태스크 부트스트랩 |
| `omx ralph` | `ralph.ts` | Ralph 지속 모드 런치 (PRD/진행 상태 영속화) |
| `omx ultragoal` | `ultragoal.ts` | 다중 목표 체크포인트 워크플로우 |
| `omx performance-goal` | `performance-goal.ts` | 평가자 게이팅 성능 목표 |

### 설치·관리

| 커맨드 | 파일 | 주요 동작 |
|--------|------|---------|
| `omx setup` | `setup.ts` | 스킬·프롬프트·config.toml·AGENTS.md 설치 |
| `omx update` | `update.ts` | npm 최신 버전 확인 후 즉시 업데이트 |
| `omx uninstall` | `uninstall.ts` | OMX 설정·아티팩트 제거 |
| `omx doctor` | `doctor.ts` | 설치 상태 점검 (pass/warn/fail 체크리스트) |
| `omx version` | `version.ts` | 버전·Node·플랫폼 정보 출력 |
| `omx list` | `list.ts` | 카탈로그 스킬·에이전트 목록 출력 (--json) |

### 사이드카·게이트웨이

| 커맨드 | 파일 | 주요 동작 |
|--------|------|---------|
| `omx explore` | `explore.ts` | 읽기 전용 탐색 (local-fast-path / sparkshell / harness 중 선택) |
| `omx sparkshell` | `sparkshell.ts` | `omx-sparkshell` 네이티브 바이너리 사이드카 |
| `omx api` | `api.ts` | `omx-api` localhost 게이트웨이 사이드카 (serve/status/stop/generate) |
| `omx mcp-serve` | `mcp-serve.ts` | OMX stdio MCP 서버 런치 (state/memory/code-intel/trace/wiki/hermes) |

### 에이전트·설정 관리

| 커맨드 | 파일 | 주요 동작 |
|--------|------|---------|
| `omx agents` | `agents.ts` | 네이티브 에이전트 TOML 관리 (list/add/edit/remove) |
| `omx agents-init` / `deepinit` | `agents-init.ts` | 리포지토리용 AGENTS.md 부트스트랩 |
| `omx adapt` | `adapt.ts` | OpenClaw·Hermes 외부 어댑터 스캐폴딩 |
| `omx session` | `session-search.ts` | 로컬 세션 히스토리 검색 |
| `omx auth` | `auth.ts` | OAuth 인증 슬롯 관리 (add/list/use) |

### 상호작용

| 커맨드 | 파일 | 주요 동작 |
|--------|------|---------|
| `omx ask` | `ask.ts` | claude/gemini 에이전트 직접 쿼리 + 역할 프롬프트 주입 |
| `omx question` | `question.ts` | 에이전트가 호출하는 블로킹 UI 질문 팝업 |

### 모니터링·디버깅

| 커맨드 | 파일 | 주요 동작 |
|--------|------|---------|
| `omx state` | `state.ts` | 모드 상태 read/write/clear/list-active/get-status |
| `omx cleanup` | `cleanup.ts` | 고아 MCP 프로세스 종료 + stale tmp 디렉토리 제거 |
| `omx hooks` | `hooks.ts` | 훅 플러그인 관리 (init/status/validate/test) |
| `omx tmux-hook` | `tmux-hook.ts` | tmux 프롬프트 인젝션 워크어라운드 |
| `omx hud` | (`hud/index.ts`) | HUD 상태 표시줄 (--watch/--json/--preset) |
| `omx sidecar` | (`sidecar/index.ts`) | 읽기 전용 팀 시각화 |
| `omx status` | `index.ts` | 활성 모드·상태 출력 |
| `omx cancel` | `index.ts` | 활성 실행 모드 취소 |
| `omx reasoning` | `index.ts` | 모델 reasoning effort 조회·설정 (low/medium/high/xhigh) |
| `omx doctor --team` | `doctor.ts` | 팀·스웜 런타임 헬스 진단 |

### Deprecated

| 커맨드 | 파일 | 상태 |
|--------|------|------|
| `omx autoresearch` | `autoresearch.ts` | **하드 폐기** — `$autoresearch` 스킬로 대체 |

---

## 파일별 상세 분析

### 1. `omx.ts` — Node CLI 부트스트랩

```ts
rememberOmxLaunchContext()          // 실행 경로 환경변수 기록
distEntry = join(root, 'dist/cli/index.js')
if existsSync(distEntry):
  { main } = await import(distEntry)
  await main(argv)
  if command !== 'mcp-serve': process.exit(exitCode)
else:
  console.error("run 'npm run build' first")
```

- 컴파일 전후 분리: 소스는 ESM TypeScript, 실행은 dist/ 기준
- `mcp-serve` 커맨드는 `process.exit()` 생략 (MCP 서버가 살아있어야 함)

---

### 2. `index.ts` — 커맨드 라우팅 허브

#### 주요 `CliCommand` 유니온 타입

```ts
type CliCommand =
  | "launch" | "exec" | "imagegen"
  | "setup" | "update" | "list" | "agents" | "agents-init" | "deepinit"
  | "uninstall" | "doctor" | "cleanup" | "auth"
  | "ask" | "question" | "adapt" | "explore" | "api" | "sparkshell"
  | "team" | "session" | "resume" | "version"
  | "tmux-hook" | "hooks" | "hud" | "sidecar"
  | "state" | "wiki" | "mcp-serve"
  | "status" | "cancel" | "help" | "reasoning"
  | "codex-native-hook"
  | string;
```

#### 런치 정책

```
OMX_LAUNCH_POLICY 환경변수:
  auto (기본)     → tmux 지원 시 detached tmux, 아니면 direct
  direct          → OMX tmux/HUD 관리 없이 직접 실행
  tmux            → 강제 OMX 관리 detached tmux
  detached-tmux   → 동일 (alias)

CLI 플래그 우선순위: --direct/--tmux이 OMX_LAUNCH_POLICY를 오버라이드
```

#### 주요 글로벌 플래그 처리 (index.ts 내부)

| 플래그 | 동작 |
|--------|------|
| `--madmax` | `--dangerously-bypass-approvals-and-sandbox` 별칭 |
| `--high` | model_reasoning_effort="high" |
| `--xhigh` | model_reasoning_effort="xhigh" |
| `--spark` | 팀 워커에 저복잡도 모델 적용 |
| `--madmax-spark` | --spark + --madmax 조합 |
| `--hotswap` | 429/쿼터 시 auth 슬롯 교체 후 재개 |
| `--worktree` | git worktree에서 Codex 실행 |
| `--notify-temp` | 임시 알림 라우팅 활성화 |
| `--discord/--slack/--telegram` | 알림 프로바이더 선택 |

#### 유틸리티 함수 (index.ts에서 export)

| 함수 | 설명 |
|------|------|
| `resolveSetupInstallModeArg(args)` | `--plugin/--legacy/--install-mode` 파싱 |
| `resolveSetupMcpModeArg(args)` | `--mcp/--no-mcp/--with-mcp` 파싱 |
| `resolveNotifyFallbackWatcherScript()` | 알림 폴백 워처 스크립트 경로 |
| `resolveHookDerivedWatcherScript()` | 훅 파생 워처 스크립트 경로 |
| `resolveNotifyHookScript()` | 알림 훅 스크립트 경로 |

---

### 3. `constants.ts` — CLI 플래그 상수

```ts
MADMAX_FLAG              = '--madmax'
CODEX_BYPASS_FLAG        = '--dangerously-bypass-approvals-and-sandbox'
CLAUDE_SKIP_PERMISSIONS_FLAG = '--dangerously-skip-permissions'
HIGH_REASONING_FLAG      = '--high'
XHIGH_REASONING_FLAG     = '--xhigh'
SPARK_FLAG               = '--spark'
MADMAX_SPARK_FLAG        = '--madmax-spark'
CONFIG_FLAG              = '-c'
LONG_CONFIG_FLAG         = '--config'
MODEL_FLAG               = '--model'
```

---

### 4. `setup.ts` — `omx setup`

**역할**: 스킬·프롬프트·MCP 설정·config.toml·AGENTS.md를 설치/업데이트한다.

#### 설치 모드

| 모드 | 동작 |
|------|------|
| `legacy` (기본) | ~/.codex/에 직접 파일 설치 |
| `plugin` | Codex 플러그인 방식 배포 |

#### MCP 모드

| 모드 | 동작 |
|------|------|
| `none` (기본) | MCP 설정 없음 |
| `compat` | first-party MCP 호환성 + 공유 레지스트리 동기화 |

#### 범위

| 범위 | 설치 위치 |
|------|---------|
| `user` | `~/.codex/` |
| `project` | `./.codex/` |

#### 주요 외부 의존성

```
config/generator.ts       # config.toml 조작 (병합·스트립·업서트)
config/codex-hooks.ts     # Codex 훅 설정 관리
config/mcp-registry.ts    # MCP 레지스트리 로드/동기화
agents/definitions.ts     # 설치 가능한 에이전트 목록
catalog/reader.ts         # 카탈로그 헤드라인 수 계산
utils/paths.ts            # 디렉토리 경로 해결
```

---

### 5. `explore.ts` — `omx explore`

**역할**: 읽기 전용 코드베이스 탐색을 3가지 백엔드 중 조건에 따라 선택해 실행한다.

#### 백엔드 선택 로직

```
1. local-fast-path (우선)
   조건: Windows 아님 + 파일 수 ≤ 2,000 + 쿼리 단순
   동작: 파일시스템 직접 읽기 (노드 내장 API)
   제한: 파일당 최대 16 KB / 240줄

2. sparkshell backend
   조건: OMX_EXPLORE_BIN 미설정 + sparkshell 바이너리 존재
   동작: omx-sparkshell 네이티브 바이너리 실행

3. explore-harness (명시적 / 폴백)
   조건: OMX_EXPLORE_BIN 설정 또는 패키지드 harness 존재
   동작: omx-explore-harness 네이티브 바이너리 실행
   참고: Windows는 built-in harness 미지원 (POSIX sh 의존)
```

#### 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `OMX_EXPLORE_BIN` | - | 탐색 바이너리 경로 오버라이드 |
| `OMX_EXPLORE_SPARK_MODEL` | - | explore에 사용할 spark 모델 |
| `OMX_EXPLORE_TIMEOUT_MS` | 120,000 | 타임아웃 (ms) |
| `OMX_EXPLORE_PROCESS_LIMIT` | 96 | 최대 프로세스 수 |
| `OMX_EXPLORE_ACTIVE` | - | explore 활성 플래그 |

#### Wiki 통합

```
hasReadableWiki(cwd) → true 시 queryWiki() 결과를 컨텍스트로 주입
```

---

### 6. `sparkshell.ts` — `omx sparkshell`

**역할**: `omx-sparkshell` 네이티브 바이너리를 래핑해 직접 argv 실행 또는 tmux 패인 요약을 수행한다.

#### 실행 모드

| 형태 | 설명 |
|------|------|
| `omx sparkshell <cmd> [args...]` | 직접 argv 실행 |
| `omx sparkshell --shell '<shell cmd>'` | 쉘 메타문자 허용 실행 |
| `omx sparkshell --tmux-pane <id>` | tmux 패인 내용 요약 |

#### 네이티브 바이너리 위치

```
bin/native/<platform>-<arch>[-libc]/omx-sparkshell[.exe]
  예) bin/native/linux-x64-glibc/omx-sparkshell
      bin/native/darwin-arm64/omx-sparkshell
      bin/native/win32-x64/omx-sparkshell.exe
```

---

### 7. `api.ts` — `omx api`

**역할**: `omx-api` localhost 게이트웨이 바이너리를 래핑한다.

#### 서브커맨드

```
omx api serve [--host] [--port] [--daemon] [--system] [--dry-run]
omx api status
omx api stop
omx api generate text <prompt...>
omx api generate image <prompt...>
```

#### 네이티브 바이너리

```
bin/native/<platform>-<arch>/omx-api[.exe]
환경변수: OMX_API_BIN (오버라이드)
```

---

### 8. `mcp-serve.ts` — `omx mcp-serve`

**역할**: OMX 퍼스트파티 MCP 서버를 stdio 모드로 런치한다. 플러그인 스코프 MCP 메타데이터에서 참조한다.

#### 지원 타겟 (로더 맵)

| 타겟 | 진입점 |
|------|--------|
| `state` | `mcp/state-server.js` |
| `memory` | `mcp/memory-server.js` |
| `code-intel` | `mcp/code-intel-server.js` |
| `trace` | `mcp/trace-server.js` |
| `wiki` | `mcp/wiki-server.js` |
| `hermes` | `mcp/hermes-server.js` |

---

### 9. `team.ts` — `omx team`

**역할**: tmux 창에 병렬 워커 패인을 스폰하고 팀 인박스·태스크 상태를 초기화한다.

#### 의존성 (내부 모듈)

```
team/runtime.ts             # startTeam / monitorTeam / resumeTeam / shutdownTeam
team/repo-aware-decomposition.ts  # buildRepoAwareTeamExecutionPlan
team/role-router.ts         # routeTaskToRole
team/allocation-policy.ts   # allocateTasksToWorkers
team/followup-planner.ts    # buildFollowupStaffingPlan
team/model-contract.ts      # collectInheritableTeamWorkerArgs / resolveTeamWorkerLaunchArgs
team/worktree.ts            # parseWorktreeMode / planWorktreeTarget / ensureWorktree
team/approved-execution.ts  # buildApprovedTeamExecutionBinding
```

---

### 10. `ralph.ts` — `omx ralph`

**역할**: `.omx/prd.json`을 기반으로 진행 상태를 영속화하며 Codex를 런치한다.

#### PRD 게이트 조건

```
.omx/prd.json 존재 여부:
  stories[] 모두 passed/completed/hasApprovedArchitectValidation → 완료 판정 후 실행 차단
  미완료 stories 존재 → 계속 실행 허용
```

#### 내부 의존성

```
ralph/persistence.ts         # ensureCanonicalRalphArtifacts
planning/artifacts.ts        # readApprovedExecutionLaunchHintOutcome
team/followup-planner.ts     # buildFollowupStaffingPlan / resolveAvailableAgentTypes
```

---

### 11. `ultragoal.ts` — `omx ultragoal`

**역할**: `.omx/ultragoal/` 아티팩트를 관리하며 Codex goal mode와 연동한다.

#### 서브커맨드

```
create-goals     → createUltragoalPlan()  아티팩트 생성
complete-goals   → startNextUltragoal()  다음 목표 시작
add-goal         → addUltragoalGoal()
steer            → steerUltragoal()      목표 조정 (구조화된 필드만)
checkpoint       → checkpointUltragoal() 완료·실패·블록 체크포인트
status           → readUltragoalPlan()
record-review-blockers → recordFinalReviewBlockers()
```

#### 아티팩트

```
.omx/ultragoal/
├── brief.md       # 목표 브리프
├── goals.json     # 목표 목록
└── ledger.jsonl   # 스티어링/체크포인트 감사 로그
```

---

### 12. `ask.ts` — `omx ask`

**역할**: claude 또는 gemini CLI에 에이전트 역할 프롬프트를 주입해 쿼리한다.

#### 지원 프로바이더

```
ASK_PROVIDERS = ['claude', 'gemini']
```

#### 에이전트 프롬프트 해결

```
--agent-prompt <role>  →  resolveAgentPromptContent(role, promptsDir)
  CODEX_HOME 우선 → setup-scope.json (project/user) 분기 → codexPromptsDir()
  promptsDir/<role>.md 로드 → 프롬프트 앞에 주입
```

---

### 13. `question.ts` — `omx question`

**역할**: 에이전트가 사용자에게 블로킹 질문을 표시하는 진입점이다. 응답 받을 때까지 프로세스가 블록된다.

#### 입력 스키마

```json
{
  "header": "Optional heading",
  "question": "What should OMX do next?",
  "questions": [{"id":"...","question":"...","options":[...],"allow_other":false}],
  "options": [{"label":"Proceed","value":"proceed"}],
  "allow_other": true,
  "type": "single-answerable | multi-answerable",
  "multi_select": false,
  "source": "deep-interview",
  "session_id": "optional"
}
```

#### 실행 모드

```
--input '<json>'            : 블로킹 질문 표시 (기계 호출)
--ui --state-path <path>    : 기존 상태 레코드 UI 렌더링 (내부 렌더러 모드)
--answer-question-id + --answer  : 질문 ID로 답 제출
```

#### 내부 의존성

```
question/policy.ts     # evaluateQuestionPolicy
question/events.ts     # appendQuestionEvent / appendQuestionAnsweredEventOnce
question/state.ts      # createQuestionRecord / submitQuestionAnswerById / waitForQuestionTerminalState
question/renderer.ts   # launchQuestionRenderer / isQuestionRendererAlive
question/ui.ts         # runQuestionUi
```

---

### 14. `state.ts` — `omx state`

**역할**: OMX 모드 상태를 JSON CLI로 읽고 쓴다.

#### 서브커맨드 매핑

| CLI 서브커맨드 | 내부 operation |
|--------------|---------------|
| `read` | `state_read` |
| `write` | `state_write` |
| `clear` | `state_clear` |
| `list-active` | `state_list_active` |
| `get-status` | `state_get_status` |

---

### 15. `cleanup.ts` — `omx cleanup`

**역할**: 이전 Codex App 세션이 남긴 고아 MCP 프로세스와 stale tmp 디렉토리를 정리한다.

#### 탐지 패턴

```
MCP 서버 프로세스:
  /dist/(state|memory|code-intel|trace|wiki)-server.(js|ts)/
  /mcp-serve <target>/

Codex 프로세스:
  /codex(.js)?/ or /@openai\/codex/

OMX tmp 디렉토리:
  /^(omc|omx|oh-my-codex)-/  (생성 후 1시간 초과 시)
```

#### 종료 전략

```
1. SIGTERM 전송 → grace period 5초 대기
2. SIGKILL (강제 종료)
```

---

### 16. `auth.ts` — `omx auth`

**역할**: Codex OAuth 인증 슬롯을 파일시스템에 영속화하고 교체한다.

#### 서브커맨드

```
omx auth add <slot>   → codex login 실행 → ~/.omx/auth/<slot>.json 저장
omx auth list         → 슬롯 목록·쿼터 메타데이터 출력
omx auth use <slot>   → live Codex auth.json을 슬롯으로 원자적 교체
```

#### 내부 의존성

```
auth/config.ts     # readAuthConfig
auth/paths.ts      # resolveLiveAuthPath
auth/storage.ts    # addSlotFromAuthFile / listSlots / useSlot
auth/redact.ts     # 시크릿 레닥션
```

---

### 17. `doctor.ts` — `omx doctor`

**역할**: OMX 설치 상태를 체계적으로 점검하고 `pass/warn/fail` 체크리스트를 출력한다.

#### 주요 점검 항목

```
config.toml 존재·유효성
Codex CLI 실행 가능성
OMX 스킬·프롬프트 설치 상태
훅 설정 (MANAGED_HOOK_EVENTS)
MCP 서버 등록
explore harness 지원 여부
first-party MCP 서버 활성화
런타임 브릿지 상태
팀 리더 스탈니스 (--team 플래그 시)
플러그인 마켓플레이스 상태
```

---

### 18. `agents.ts` — `omx agents`

**역할**: 네이티브 에이전트 TOML 파일을 user·project 범위로 관리한다.

#### 예약 에이전트 이름

```
RESERVED_NATIVE_AGENT_NAMES = { 'default', 'worker', 'explorer' }
```

#### 범위 결정 로직

```
--scope user|project 명시 → 해당 범위
명시 없음 → .omx/setup-scope.json 읽기
  project/project-local → .codex/agents/
  user → ~/.codex/agents/
```

---

### 19. `native-assets.ts` — 네이티브 바이너리 관리

**역할**: 3종 네이티브 바이너리(`omx-explore-harness`, `omx-sparkshell`, `omx-api`)의 패키징·캐싱·하이드레이션을 담당한다.

#### 제품별 환경변수

| 바이너리 | 오버라이드 환경변수 |
|---------|-------------------|
| `omx-explore-harness` | `OMX_EXPLORE_BIN` |
| `omx-sparkshell` | `OMX_SPARKSHELL_BIN` |
| `omx-api` | `OMX_API_BIN` |

#### 자동 다운로드

```
OMX_NATIVE_AUTO_FETCH = '1'  → 패키지드 바이너리 없을 시 GitHub Releases에서 자동 다운로드
OMX_NATIVE_MANIFEST_URL      → 매니페스트 URL 오버라이드
OMX_NATIVE_RELEASE_BASE_URL  → 릴리스 베이스 URL 오버라이드
OMX_NATIVE_CACHE_DIR         → 캐시 디렉토리 오버라이드
```

#### Linux libc 선호도 해결

```
resolveLinuxNativeLibcPreference() → ['musl', 'glibc'] 순서 결정
  OMX_NATIVE_LIBC 환경변수 → 명시적 지정
  /proc/version 또는 ldd 검사 → 자동 감지
```

---

### 20. `session-search.ts` — `omx session`

**역할**: 로컬 세션 히스토리를 텍스트로 검색한다.

#### 옵션

```
omx session search <query>
  --limit <n>        결과 수 (기본 10)
  --session <id>     특정 세션 ID로 제한
  --since <spec>     시간 필터 (7d, 24h, 2026-03-10)
  --project <scope>  current | all | <cwd-fragment>
  --context <n>      스니펫 컨텍스트 문자 수 (기본 80)
  --case-sensitive   대소문자 구분
  --json             구조화된 JSON 출력
```

---

### 21. `codex-home.ts` — Codex 홈 해결

**역할**: Codex 홈 디렉토리와 config 경로를 범위에 맞게 해결한다. 여러 CLI 모듈에서 공유되는 유틸리티이다.

```ts
resolveCodexHomeForLaunch(cwd, env):
  env.CODEX_HOME 설정 시 → 반환
  setup-scope.json = 'project' → cwd/.codex/
  아니면 undefined (사용자 기본값)

resolveCodexConfigPathForLaunch(cwd, env):
  resolveCodexHomeForLaunch() 결과 + /config.toml
```

---

### 22. `update.ts` — `omx update`

**역할**: npm에서 최신 버전을 확인하고 글로벌 인스톨을 즉시 업데이트한다.

#### 자동 업데이트 모드

```
OMX_AUTO_UPDATE 환경변수:
  미설정/빈값  → 'prompt'   (확인 후 실행)
  '0'         → 'disabled' (비활성)
  'defer'     → 'defer'    (백그라운드 예약)
```

#### 체크 주기

```
CHECK_INTERVAL_MS = 12시간 (런치 시 수동 체크)
omx update 직접 호출 시 → 주기 무시, 즉시 npm 체크
```

---

## 모듈 간 호출 관계

```
omx.ts
  └─ index.ts (main)
        ├─ constants.ts              # 플래그 상수
        ├─ codex-home.ts             # Codex 홈 경로
        │
        ├─ setup.ts
        │    ├─ config/generator.ts
        │    ├─ config/codex-hooks.ts
        │    ├─ config/mcp-registry.ts
        │    └─ agents/definitions.ts
        │
        ├─ explore.ts
        │    ├─ sparkshell.ts (백엔드)
        │    ├─ native-assets.ts
        │    └─ wiki/index.ts
        │
        ├─ sparkshell.ts
        │    └─ native-assets.ts
        │
        ├─ api.ts
        │    └─ native-assets.ts
        │
        ├─ mcp-serve.ts
        │    └─ mcp/*-server.ts (동적 임포트)
        │
        ├─ team.ts
        │    ├─ team/runtime.ts
        │    ├─ team/role-router.ts
        │    ├─ team/model-contract.ts
        │    └─ team/worktree.ts
        │
        ├─ ralph.ts
        │    ├─ ralph/persistence.ts
        │    └─ planning/artifacts.ts
        │
        ├─ ultragoal.ts
        │    └─ ultragoal/artifacts.ts
        │
        ├─ ask.ts
        │    └─ utils/paths.ts (promptsDir)
        │
        ├─ question.ts
        │    └─ question/*.ts
        │
        ├─ auth.ts
        │    └─ auth/*.ts
        │
        ├─ state.ts
        │    └─ state/operations.ts
        │
        ├─ cleanup.ts
        │    └─ config/omx-first-party-mcp.ts
        │
        ├─ doctor.ts
        │    ├─ config/generator.ts
        │    ├─ config/codex-hooks.ts
        │    └─ runtime/bridge.ts
        │
        ├─ agents.ts
        │    └─ utils/paths.ts (codexAgentsDir)
        │
        ├─ adapt.ts
        │    └─ adapt/*.ts
        │
        ├─ session-search.ts
        │    └─ session-history/search.ts
        │
        ├─ update.ts (런치 시 수동 체크)
        │
        ├─ hud/index.ts  (외부 모듈)
        └─ sidecar/index.ts  (외부 모듈)
```

---

## 외부 연동 목록

| 외부 시스템 | 커맨드 | 방식 |
|------------|--------|------|
| **Codex CLI** | launch / exec / team / ralph / ... | `spawnPlatformCommandSync` / `spawn` |
| **tmux** | team / hud / sidecar / explore | `spawnSync("tmux", ...)` |
| **claude CLI** | `omx ask claude` | `spawnSync("claude", ...)` |
| **gemini CLI** | `omx ask gemini` | `spawnSync("gemini", ...)` |
| **npm** | `omx update` | `spawnSync("npm", ["install", "-g", ...])` |
| **GitHub Releases** | native-assets 자동 다운로드 | HTTP fetch → tarball 압축 해제 |
| **omx-explore-harness** | `omx explore` | 네이티브 바이너리 execFile |
| **omx-sparkshell** | `omx sparkshell` / `omx explore` | 네이티브 바이너리 spawnSync |
| **omx-api** | `omx api` | 네이티브 바이너리 spawnSync |
| **OpenClaw** | `omx adapt openclaw` | adapt/openclaw.ts |
| **Hermes** | `omx adapt hermes` | adapt/hermes.ts |

---

## 설계 원칙

1. **부트스트랩 분리**: `omx.ts`는 컴파일된 dist/를 동적 임포트하는 얇은 래퍼이다. 빌드 전 직접 실행 시 명확한 오류를 낸다.
2. **허브-앤-스포크 라우팅**: `index.ts`가 모든 커맨드의 단일 라우팅 허브이며, 각 커맨드 파일은 독립적으로 export된 함수를 제공한다.
3. **네이티브 바이너리 추상화**: Rust 기반 3개 사이드카(`explore-harness`, `sparkshell`, `api`)는 `native-assets.ts`가 플랫폼·libc별 경로 해결과 자동 하이드레이션을 담당한다. 상위 모듈은 경로만 받는다.
4. **환경변수 오버라이드**: 거의 모든 경로·모델·타임아웃이 환경변수로 오버라이드 가능하다. CI/테스트에서 실행 경로를 교체할 수 있다.
5. **프로세스 격리**: MCP 서버(`mcp-serve`)는 stdio 모드로 별도 프로세스 실행. `process.exit()` 생략으로 MCP 서버가 살아있게 유지한다.
6. **점진적 폐기**: `autoresearch`처럼 레거시 커맨드는 오류를 명확히 출력하고 대체 경로를 안내하되 즉시 삭제하지 않는다.
7. **테스트 가능성**: `cleanup.ts`·`state.ts`·`question.ts` 등은 `CleanupDependencies`·`StateCommandDependencies` 인터페이스로 외부 의존성을 주입해 단위 테스트한다.
