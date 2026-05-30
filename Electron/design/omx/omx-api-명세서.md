# OMX API 명세서

## 0. 문서 정보
- 범위: Electron/design/omx 하위 모듈의 외부 인터페이스(공개 API)만 집계
- 기준 문서: 각 `*-module-design.md`의 `## 3. 외부/내부 인터페이스`
- 제외 항목: 내부 인터페이스, 상태 전이 설명, 시퀀스 설명, 테스트/오픈이슈
- 작성 목적: 모듈 간 호출 가능 표면을 한 파일에서 조회할 수 있도록 하는 SSoT
- 갱신 기준: 공개 API 변경 시 이 문서의 해당 모듈 섹션을 함께 갱신

## 1. 문서 사용 방식
- 이 문서는 OMX 개발자가 참조하는 공식 공개 API 카탈로그다.
- 각 모듈 섹션은 “무엇을 호출할 수 있는가”를 정의하고, 내부 구현은 의도적으로 숨긴다.
- 모듈이 반환하는 값의 구조, 부작용, 입력 제약은 API 이름보다 먼저 확인해야 한다.
- 모듈 간 호출을 설계할 때는 이 문서를 1차 기준으로 삼고, 상세 구현은 해당 모듈 설계서로 내려간다.
- 새 API를 추가하거나 기존 API 의미가 바뀌면 이 문서와 대상 모듈 설계서를 동시에 갱신한다.

## 2. 공식 API 설계 원칙
- 공개 API는 외부 호출자에게 안정적이어야 하며, 내부 함수명이나 파일 구조를 암시하지 않아야 한다.
- 같은 입력에 대해 같은 의미를 반환해야 하며, 파일 시스템·세션·워크스페이스 상태를 바꾸는 경우 그 부작용을 명시해야 한다.
- 비동기 작업은 완료 시점이 명확해야 하며, 실패 시 예외 또는 실패 응답 형식을 일관되게 사용해야 한다.
- 경로·세션·모드·태스크 식별자는 검증 가능한 문자열로만 받아들여야 한다.
- 명령형 API는 가능한 한 “검증 -> 실행 -> 결과 반환”의 3단계를 따르며, 경고와 오류를 구분해 돌려준다.
- 렌더링·UI용 API와 상태 저장·오케스트레이션 API는 동일 모듈 안에 있더라도 책임 경계를 분리해 읽는다.

## 3. 공통 호출 규약

### 3.1 입력 규약
- 필수 인수는 누락되면 안 된다.
- 선택 인수는 `?`가 붙은 형태로 표기된 경우에만 생략 가능하다.
- 경로 인수는 호출자 작업공간 기준 상대경로 또는 검증된 절대경로만 허용된다.
- 세션/모드/태스크/슬러그 식별자는 각 모듈의 설계서가 정의한 패턴을 따라야 한다.

### 3.2 출력 규약
- `void`는 부작용만 있고 반환 데이터가 없는 경우에만 사용한다.
- 실패 가능한 API는 실패 이유를 숨기지 말고 구조화된 오류나 예외를 반환해야 한다.
- 상태 반환 API는 현재 상태, 전이 결과, 후속 조치 힌트를 함께 담는 것을 권장한다.
- UI 렌더링 API는 문자열 또는 렌더 가능한 컴포넌트 트리를 반환한다.

### 3.3 부작용 규약
- 파일 쓰기, 잠금, tmux 조작, 프로세스 실행, 알림 발송, 캐시 동기화는 부작용 API로 간주한다.
- 부작용 API는 호출자에게 부작용 발생 가능성을 문서로 드러내야 한다.
- 읽기 전용 API는 원칙적으로 상태를 바꾸지 않는다.

### 3.4 안정성 규약
- 안정성 수준은 다음 순서로 해석한다: 공식 공개 API -> 모듈 설계서 -> 내부 구현.
- 이 문서에 적힌 이름은 외부 호출자에게 유지 계약이 있는 것으로 간주한다.
- 내부 구현의 리팩터링은 허용되지만, 공개 API 이름/의미 변경은 하위 호환성을 검토해야 한다.

### 3.5 변경 규약
- 새 공개 API를 추가할 때는 모듈 설계서 3장과 이 문서를 함께 갱신한다.
- API가 deprecated 되면 대체 API와 제거 예정 시점을 함께 기록한다.
- 반환 타입이 바뀌면 호출자 영향 범위를 명시한다.

## 4. 모듈 분류 개요

| 분류 | 모듈 | 주요 성격 |
|---|---|---|
| 실행/런타임 | core, runtime, cli, main, ipc, scripts | 실행 경계, 스트림, CLI, IPC, 훅 진입점 |
| 워크플로 | pipeline, planning, question, goal-workflows, performance-goal, ralph, ralplan, autoresearch, team | 오케스트레이션, 합의, 완료 게이트, 목표 실행 |
| 관측/지원 | logs, hud, sidecar, ops, notifications, openclaw | 로깅, HUD, 모니터링, 알림, 외부 연동 |
| 상태/설정/유틸 | state, services, env, utils, mcp, auth, catalog, adapt, agents, wiki, renderer, components, test | 공통 상태, 검증, 경로, 설치, UI, 테스트 |

### 4.1 이 분류를 읽는 법
- 실행/런타임 모듈은 “무엇을 시작하고 어떻게 흘러가는가”를 정의한다.
- 워크플로 모듈은 “무엇을 언제 완료로 볼 것인가”를 정의한다.
- 관측/지원 모듈은 “무엇을 기록하고 어떻게 보여줄 것인가”를 정의한다.
- 상태/설정/유틸 모듈은 “다른 모듈이 안정적으로 쓰기 위한 기반”을 제공한다.

## 5. 모듈별 공개 API

### 5.1 작성 원칙
- 각 모듈은 실제 공개 표면만 나열한다.
- 모듈별 항목은 이름 그대로 외부 호출자가 사용할 수 있는 엔트리포인트다.
- 컴포넌트 이름, 채널 이름, CLI 커맨드처럼 함수가 아닌 항목도 공개 API로 취급한다.
- 내부 helper, private utility, state file path, contract helper는 제외한다.

### adapt
- `resolveAdaptPaths(cwd, target)`
- `listAdaptTargets()`
- `getAdaptTargetDescriptor(target)`
- `buildAdaptPlanningLink(cwd)`
- `buildAdaptEnvelope(cwd, target)`
- `buildAdaptEnvelopeForTarget(cwd, target)`
- `buildAdaptProbeReportForTarget(cwd, target)`
- `buildAdaptStatusReportForTarget(cwd, target)`
- `buildAdaptDoctorReportForTarget(cwd, target)`
- `initAdaptFoundation(cwd, target, write?, now?)`

### agents
- `getAgent(name)`
- `getAgentsByCategory(category)`
- `getAgentNames()`
- `generateAgentToml(agent, promptContent, options)`
- `composeRoleInstructions(promptContent, metadata, resolvedModel)`
- `installNativeAgentConfigs(pkgRoot, options)`
- `getInstallableNativeAgentNames(manifest)`
- `assertNativeAgentCanonicalTargets(manifest)`

### auth
- `readAuthConfig(cwd?, home?)`
- `resolveOmxAuthDir(home?)`
- `resolveSlotPath(slot, home?)`
- `listSlots(home?)`
- `addSlotFromAuthFile(slot, liveAuthPath, home?, now?)`
- `useSlot(slot, liveAuthPath, home?, now?)`
- `buildRotationPlan(slots, config, currentSlot?)`
- `isQuotaError(signal, config?)`
- `redactAuthSecrets(value)`
- `findLatestRolloutSession(codexHome, fallbackHome?)`
- `runAuthHotswap(...)`

### autoresearch
- `loadAutoresearchMissionContract(missionDir)`
- `parseSandboxContract(content)`
- `parseEvaluatorResult(raw)`
- `prepareAutoresearchRuntime(contract, projectRoot, opts)`
- `runAutoresearchEvaluator(contract, worktreePath, ...)`
- `decideAutoresearchOutcome(manifest, candidate, eval)`
- `advanceAutoresearchRun(contract, manifest, projectRoot)`
- `createAutoresearchGoal(cwd, options)`
- `recordAutoresearchGoalVerdict(cwd, options)`
- `completeAutoresearchGoal(cwd, slug, options)`
- `assessAutoresearchCompletionState(...)`

### catalog
- `readCatalogManifest(packageRoot?)`
- `tryReadCatalogManifest(packageRoot?)`
- `getCatalogCounts(packageRoot?)`
- `toPublicCatalogContract(manifest)`
- `getSetupInstallableSkillNames(manifest)`
- `compareSkillMirror(expectedDir, actualDir, expectedSkillNames, options)`
- `validateCatalogManifest(manifest)`

### cli
- `omx <command> [subcommand] [args...]`
- 주요 커맨드: `launch`, `exec`, `team`, `ralph`, `ultragoal`, `setup`, `update`, `doctor`, `explore`, `sparkshell`, `api`, `mcp-serve`, `state`, `hooks`, `cleanup`, `auth`, `session`

### components
- `ChatContainer`
- `LifecycleDashboard`
- `TodoPanel`
- `TaskTimeline`
- `ModelSelector`
- `ApiKeySettings`
- `AdapterStatusBar`
- `KnowledgePanel`
- `ErrorGuideOverlay`
- `DeferredSkillsNotice`
- `WikiOverlay`

### core
- `execute-command` 유틸리티(명령, 인자, 콜백 인수 기반)
- 콜백 경로: `onEnvelope`, `onRawLine`, `onDone`, `onError`

### env
- `env-checker` 기반 점검 함수(실행 전 preflight)
- 점검 결과 객체(`success`, `issues`, `hints`)

### goal-workflows
- `createGoalWorkflowRun(cwd, options)`
- `readGoalWorkflowRun(cwd, workflow, slug)`
- `transitionGoalWorkflowRun(cwd, workflow, slug, options)`
- `appendGoalWorkflowLedger(cwd, run, entry)`
- `normalizeGoalWorkflowValidation(input)`
- `assertGoalWorkflowCanComplete(validation)`
- `buildGoalWorkflowHandoff(options)`

### hooks
- `detectKeywords(prompt)`
- `detectPrimaryKeyword(prompt)`
- `parseExplicitSkillInvocations(prompt)`
- `recordSkillActivation(input)`
- `triagePrompt(prompt)`
- `readTriageConfig()`
- `readTriageState(opts)`
- `writeTriageState(decision, opts)`
- `applyAgentsMdOverlay(...)`
- `dispatchHookEvent(...)`

### hud
- `readAllState(cwd, config?)`
- `renderHud(ctx, preset, options)`
- `reconcileHudForPromptSubmit(cwd, deps)`
- `createHudWatchPane(...)`
- `killTmuxPane(...)`
- `runHudAuthorityTick(options, deps?)`
- `hudCommand(args)`

### ipc
- `adapter-ipc`
- `cli-ipc`
- `env-ipc`
- `interlude-ipc`
- `ops-ipc`
- `state-ipc`
- `stream-bridge-ipc`
- `task-ipc`

### logs
- `init(logDir)`
- `getLogPath()`
- `logLlmRequest(text, model?)`
- `logLlmResponseToken(token)`
- `flushLlmResponse()`
- `logToolCall(toolName, args)`
- `logSystemMessage(message)`
- `logError(message)`
- `start(logsDir)`
- `onLine(cb)`
- `offLine(cb)`
- `stop()`
- `dispatch(rawLine, broadcast)`
- 상수: `HOOK_IPC_CHANNEL`, `HOOK_IPC_PRIORITY_CHANNEL`, `PRIORITY_EVENTS`

### main
- `window.electronAPI`를 통한 invoke/on 채널 집합
- 시작/중단/상태조회/도구호출/인터류드/태스크 관련 IPC 엔드포인트

### mcp
- `autoStartStdioMcpServer(name, server)`
- `shouldAutoStartMcpServer(name)`
- `getBaseStateDir(wd?)`
- `getStateDir(wd?, sessionId?)`
- `getStatePath(mode, wd?, sessionId?)`
- `writeMcpLifecycleTelemetry(event, env?)`
- `parseNotepadPruneDaysOld(value, defaultDays)`

### notifications
- `getNotificationConfig(cwd?, opts?)`
- `dispatchNotifications(config, payload)`
- `formatNotification(event, payload)`
- `renderTemplate(template, vars)`
- `getCurrentTmuxSession()`
- `captureTmuxPane(paneId?, lines?)`
- `lookupByMessageId(platform, messageId)`
- `notify(payload, config?)`

### openclaw
- `getOpenClawConfig()`
- `inspectOpenClawConfig()`
- `resolveGateway(config, event)`
- `interpolateInstruction(template, variables)`
- `validateGatewayUrl(url)`
- `wakeGateway(name, config, payload)`
- `wakeCommandGateway(name, config, variables)`
- `wakeOpenClaw(event, context)`

### ops
- `drift-detector.ts`가 제공하는 drift 분석 함수 집합

### performance-goal
- `createPerformanceGoal(cwd, options)`
- `readPerformanceGoal(cwd, slug)`
- `startPerformanceGoal(cwd, slug)`
- `checkpointPerformanceGoal(cwd, options)`
- `completePerformanceGoal(cwd, options)`
- `buildPerformanceGoalInstruction(state)`

### pipeline
- `runPipeline(config)`
- `canResumePipeline(cwd?)`
- `readPipelineState(cwd?)`
- `cancelPipeline(cwd?)`
- `createAutopilotPipelineConfig(task, options)`
- `createStrictAutopilotStages()`

### planning
- `parsePlanningArtifactFileName(path)`
- `comparePlanningArtifactPaths(left, right)`
- `selectMatchingTestSpecsForPrd(prdPath, testSpecPaths)`
- `readPlanningArtifacts(cwd)`
- `isPlanningComplete(artifacts)`
- `readLatestPlanningArtifacts(cwd)`
- `readApprovedExecutionLaunchHintOutcome(cwd, mode, options?)`
- `readApprovedExecutionLaunchHint(cwd, mode, options?)`
- `readTeamDagArtifactResolution(cwd)`

### question
- `createQuestionRecord(cwd, input, sessionId?, now?, options?)`
- `readQuestionRecord(recordPath)`
- `updateQuestionRecord(recordPath, updater)`
- `markQuestionPrompting(recordPath, renderer)`
- `markQuestionAnswered(recordPath, answer)`
- `markQuestionAborted(recordPath, code, message)`
- `submitQuestionAnswer(recordPath, entries)`
- `waitForQuestionAnswer(recordPath, timeoutMs?)`
- `appendQuestionEvent(cwd, type, record)`
- `appendQuestionAnsweredEventOnce(cwd, record)`

### ralph
- `normalizeRalphPhase(rawPhase)`
- `validateAndNormalizeRalphState(candidate, options?)`
- `evaluateRalphCompletionAuditEvidence(state, cwd)`
- `isRalphCompletePhase(value)`
- `ensureCanonicalRalphArtifacts(cwd, sessionId?)`
- `recordRalphVisualFeedback(cwd, feedback, sessionId?, baseStateDir?)`

### ralplan
- `runRalplanConsensus(executor, options)`
- `cancelRalplanConsensus(cwd?)`
- `buildRalplanConsensusGateFromSources(sources)`
- `buildRalplanConsensusGateForCwd(cwd, options)`
- `hasDurableRalplanConsensusEvidenceForCwd(cwd, options)`
- `readLocalRalplanConsensusStateCandidates(cwd, sessionId?)`

### renderer
- `ChatContainer.onSendMessage(text)`
- `ChatContainer.selectedModel`
- `ChatContainer.onModelChange(modelId)`
- `LifecycleDashboard.defaultOpen`
- `LifecycleDashboard.stateDir`

### runtime
- `run-outcome`: normalize/classify/infer/apply contract 함수군
- `run-loop`: `runUntilTerminal`, `shouldContinueRun`
- `run-state`: `readRunState`, `syncRunStateFromModeState`
- `bridge`: `execCommand`, `readSnapshot`, `getDefaultBridge`
- `process-tree`: `runProcessTreeWithTimeout`

### scripts
- `execute-command` 유틸리티(명령, 인자, 콜백 인수 기반)
- 콜백 경로: `onEnvelope`, `onRawLine`, `onDone`, `onError`
- `build-api.ts`, `build-explore-harness.ts`, `build-sparkshell.ts`
- `check-version-sync.ts`, `check-runtime-syntax.ts`, `run-test-files.ts`
- `generate-catalog-docs.ts`, `generate-release-body.ts`, `sync-plugin-mirror.ts`
- `notify-hook.ts`, `notify-dispatcher.ts`, `tmux-hook-engine.ts`

### services
- `readTask(taskId): Promise<TaskData>`
- `claimTask(taskId, version): Promise<void>`
- `releaseTaskClaim(taskId): Promise<void>`
- `transitionTaskStatus(taskId, current, target, resultData?): Promise<unknown>`
- `InvalidTransitionError`
- `saveGeminiApiKey(plaintext): void`
- `loadGeminiApiKey(): string | null`
- `clearGeminiApiKey(): void`
- `isValidGeminiKeyFormat(key): boolean`

### sidecar
- `collectSidecarSnapshot(teamName, options)`
- `renderSidecar(snapshot, options)`
- `buildSidecarTmuxSplitArgs(options)`
- `launchSidecarTmuxPane(options, execTmuxSync?)`
- `parseSidecarArgs(args)`
- `runSidecarWatch(...)`
- `sidecarCommand()`

### state
- `executeStateOperation(name, rawArgs)`
- `listActiveStateModes(workingDirectory?, explicitSessionId?)`
- `listStateStatuses(cwd, explicitSessionId?, mode?, options?)`
- 지원 명령: `state_read`, `state_write`, `state_clear`, `state_list_active`, `state_get_status`

### team
- `startTeam(config)`
- `monitorTeam(...)`
- `shutdownTeam(...)`
- `runtime-cli` 진입점(JSON 입출력)
- `team-ops gateway(teamInit, teamCreateTask, teamClaimTask 등)`
- approved execution binding 및 ultragoal team context API

### test
- `*.test.ts`
- `*.integrated.test.ts`

### utils
- `codexHome()`, `omxRoot()`, `omxStateDir()`, `omxPlansDir()`, `omxLogsDir()`
- `omxProjectMemoryPath()`, `resolveProjectMemoryPath()`, `omxWikiDir()`
- `addGeneratedAgentsMarker()`, `upsertManagedAgentsBlock()`, `renderAgentsModelTableBlock()`
- `resolveCommandPathForPlatform()`, `buildPlatformCommandSpec()`, `spawnPlatformCommandSync()`
- `safeJsonParse()`, `safeReadJsonFile()`, `sleep()`, `sleepSync()`

### wiki
- `ingestKnowledge(root, input)`
- `queryWiki(root, queryText, options)`
- `lintWiki(root, config)`
- `onSessionStart(data)`
- `onSessionEnd(data)`
- `onPreCompact(data)`
- `onPostCompact(data)`
- `readPage(root, filename)`
- `writePage(root, page)`

## 6. 개발자용 사용 가이드
- 실행 경계부터 확인해야 하는 경우: core, runtime, cli, main, ipc, scripts를 먼저 본다.
- 워크플로 상태를 설계해야 하는 경우: pipeline, planning, question, goal-workflows, performance-goal, ralph, ralplan, autoresearch, team을 먼저 본다.
- 사용자 화면과 관측을 연결해야 하는 경우: components, renderer, logs, hud, sidecar, notifications를 먼저 본다.
- 공통 경로/검증/설정이 필요하면: utils, env, state, services, mcp, catalog, auth, agents, adapt, openclaw를 먼저 본다.
- API 이름이 모호하면 해당 모듈 설계서의 3장을 기준으로 읽고, 이 문서에서는 이름과 소속만 확인한다.

## 7. 변경 및 호환성 정책
- 공개 API를 바꿀 때는 먼저 호출자 범위를 확인하고, 가능하면 대체 API를 먼저 제공한다.
- 이름은 유지하되 인자 추가가 필요한 경우 optional 인수 형태를 우선한다.
- 반환 구조를 바꾸어야 한다면 하위 호환 필드를 한 릴리스 이상 함께 유지한다.
- 삭제 예정 API는 이 문서와 모듈 설계서에 모두 deprecated 표기를 남긴다.
- 공식 문서로 사용되는 동안에는 내부 helper 이름을 외부 API처럼 노출하지 않는다.

## 8. 해석 메모
- 이 문서는 공개 API만 모았으므로 내부 구현 세부나 상태 전이 규칙은 포함하지 않는다.
- 일부 모듈은 실제 명세서에서 채널명/서브커맨드/컴포넌트 이름을 공개 인터페이스로 취급했다.
- `main`, `ipc`, `renderer`, `components`는 함수형 API보다 채널 또는 컴포넌트 표면이 더 중요하므로 해당 표면을 명시했다.
- `ops`와 `test`는 디자인 문서상 공개 표면이 좁아 대표 엔트리만 남겼다.

## 11. API 완전판 명세 (공개 API 1:1)

### 11.1 작성 규칙
- 표의 `입력 타입`과 `출력 타입`은 설계 레벨 타입이다.
- `unknown`, `object`, `...` 표기는 가변 구조 또는 래퍼 타입을 의미한다.
- 채널/컴포넌트/커맨드처럼 함수가 아닌 공개 표면도 1:1 항목으로 포함한다.

### 11.2 adapt

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `resolveAdaptPaths(cwd, target)` | 타겟별 어댑터 경로 집합 계산 | `cwd:string, target:string` | `AdaptPathSet` | 파일 쓰기 전 경로 먼저 계산 | `resolveAdaptPaths(process.cwd(), "hermes")` |
| `listAdaptTargets()` | 지원 타겟 목록 반환 | `void` | `string[]` | adapt 타겟 선택 UI/CLI에 사용 | `const t = listAdaptTargets()` |
| `getAdaptTargetDescriptor(target)` | 타겟 descriptor 조회 | `target:string` | `AdaptTargetDescriptor \| null` | 미지원 타겟 방어 | `if (!getAdaptTargetDescriptor(t))` |
| `buildAdaptPlanningLink(cwd)` | planning artifact 연결 정보 생성 | `cwd:string` | `string` | 보고서 상단 참조 링크 생성 | `const link = buildAdaptPlanningLink(cwd)` |
| `buildAdaptEnvelope(cwd, target)` | 타겟용 envelope 생성 | `cwd:string, target:string` | `AdaptEnvelope` | handoff용 메타 생성 | `const env = buildAdaptEnvelope(cwd, t)` |
| `buildAdaptEnvelopeForTarget(cwd, target)` | 특정 타겟 envelope 생성(명시 API) | `cwd:string, target:string` | `AdaptEnvelope` | target별 분기 코드에서 사용 | `buildAdaptEnvelopeForTarget(cwd, "openclaw")` |
| `buildAdaptProbeReportForTarget(cwd, target)` | probe 보고서 생성 | `cwd:string, target:string` | `AdaptProbeReport` | 외부 런타임 상태 진단 | `const r = buildAdaptProbeReportForTarget(cwd, t)` |
| `buildAdaptStatusReportForTarget(cwd, target)` | status 보고서 생성 | `cwd:string, target:string` | `AdaptStatusReport` | 운영 대시보드 입력 | `buildAdaptStatusReportForTarget(cwd, t)` |
| `buildAdaptDoctorReportForTarget(cwd, target)` | doctor 보고서 생성 | `cwd:string, target:string` | `AdaptDoctorReport` | 장애 진단 문서화 | `buildAdaptDoctorReportForTarget(cwd, t)` |
| `initAdaptFoundation(cwd, target, write?, now?)` | 어댑터 기초 파일 초기화 | `cwd:string, target:string, write?:boolean, now?:Date` | `AdaptInitResult` | preview 후 write=true 권장 | `initAdaptFoundation(cwd, t, true)` |

### 11.3 agents

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getAgent(name)` | 에이전트 정의 조회 | `name:string` | `AgentDefinition \| undefined` | 설치 전 존재 확인 | `const a = getAgent("executor")` |
| `getAgentsByCategory(category)` | 카테고리별 에이전트 목록 | `category:string` | `AgentDefinition[]` | UI 필터링에 사용 | `getAgentsByCategory("workflow")` |
| `getAgentNames()` | 전체 에이전트 이름 목록 | `void` | `string[]` | 자동완성 목록 생성 | `const names = getAgentNames()` |
| `generateAgentToml(agent, promptContent, options)` | TOML 구성 생성 | `agent:AgentDefinition, promptContent:string, options:object` | `string` | 설치 파일 본문 생성 | `const toml = generateAgentToml(a,p,o)` |
| `composeRoleInstructions(promptContent, metadata, resolvedModel)` | 역할 지시문 합성 | `string, object, string` | `string` | 설치 전 최종 프롬프트 구성 | `composeRoleInstructions(p,m,model)` |
| `installNativeAgentConfigs(pkgRoot, options)` | 네이티브 에이전트 설치 | `pkgRoot:string, options:object` | `InstallResult` | force/dryRun 옵션 사용 | `installNativeAgentConfigs(root,{dryRun:true})` |
| `getInstallableNativeAgentNames(manifest)` | 설치 대상 이름 계산 | `manifest:CatalogManifest` | `string[]` | setup 단계에서 설치 집합 결정 | `getInstallableNativeAgentNames(m)` |
| `assertNativeAgentCanonicalTargets(manifest)` | canonical target 유효성 검증 | `manifest:CatalogManifest` | `void (throws)` | 설치 전 필수 검증 | `assertNativeAgentCanonicalTargets(m)` |

### 11.4 auth

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readAuthConfig(cwd?, home?)` | 인증 설정 읽기 | `cwd?:string, home?:string` | `AuthConfig` | 시작 시 1회 로드 | `const cfg = readAuthConfig()` |
| `resolveOmxAuthDir(home?)` | auth 디렉터리 경로 계산 | `home?:string` | `string` | 파일 접근 전 경로 계산 | `resolveOmxAuthDir()` |
| `resolveSlotPath(slot, home?)` | 슬롯 파일 경로 계산 | `slot:string, home?:string` | `string` | 슬롯별 파일 접근 | `resolveSlotPath("slot-a")` |
| `listSlots(home?)` | 슬롯 목록 조회 | `home?:string` | `AuthSlotRecord[]` | 회전 후보 목록 생성 | `listSlots()` |
| `addSlotFromAuthFile(slot, liveAuthPath, home?, now?)` | 현재 auth를 슬롯으로 추가 | `slot:string, liveAuthPath:string, home?:string, now?:Date` | `AuthSlotRecord` | 신규 슬롯 등록 | `addSlotFromAuthFile("slot-b", path)` |
| `useSlot(slot, liveAuthPath, home?, now?)` | 슬롯 활성화 | `slot:string, liveAuthPath:string, home?:string, now?:Date` | `UseSlotResult` | 실행 직전 슬롯 전환 | `useSlot("slot-a", live)` |
| `buildRotationPlan(slots, config, currentSlot?)` | 회전 순서 계산 | `slots:AuthSlotRecord[], config:AuthConfig, currentSlot?:string` | `RotationPlan` | quota 시 다음 슬롯 탐색 | `buildRotationPlan(slots,cfg)` |
| `isQuotaError(signal, config?)` | quota 에러 판정 | `signal:unknown, config?:AuthConfig` | `boolean` | stderr/응답 검사 | `if (isQuotaError(err,cfg))` |
| `redactAuthSecrets(value)` | 민감정보 마스킹 | `value:string` | `string` | 로그 출력 전 호출 | `log(redactAuthSecrets(text))` |
| `findLatestRolloutSession(codexHome, fallbackHome?)` | 최근 롤아웃 세션 조회 | `codexHome:string, fallbackHome?:string` | `string \| null` | resume 기준 세션 탐색 | `findLatestRolloutSession(home)` |
| `runAuthHotswap(...)` | 인증 핫스왑 실행 | `options:object` | `HotswapResult` | quota 시 자동 전환 실행 | `runAuthHotswap({mode:"auto"})` |

### 11.5 autoresearch

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `loadAutoresearchMissionContract(missionDir)` | 미션/샌드박스 계약 로드 | `missionDir:string` | `AutoresearchMissionContract` | 루프 시작 전에 필수 | `loadAutoresearchMissionContract(dir)` |
| `parseSandboxContract(content)` | sandbox 문서 파싱 | `content:string` | `AutoresearchSandboxContract` | YAML frontmatter 검증 | `parseSandboxContract(md)` |
| `parseEvaluatorResult(raw)` | evaluator 결과 파싱 | `raw:string` | `AutoresearchEvaluatorResult` | evaluator stdout 처리 | `parseEvaluatorResult(stdout)` |
| `prepareAutoresearchRuntime(contract, projectRoot, opts)` | 런타임/워크트리 준비 | `contract:object, projectRoot:string, opts:object` | `AutoresearchRunManifest` | iteration 0 준비 | `prepareAutoresearchRuntime(c,root,o)` |
| `runAutoresearchEvaluator(contract, worktreePath, ...)` | evaluator 실행 | `contract:object, worktreePath:string, ...` | `AutoresearchEvaluationRecord` | 후보 생성 후 판정 | `runAutoresearchEvaluator(c,p)` |
| `decideAutoresearchOutcome(manifest, candidate, eval)` | keep/discard 결정 | `manifest:object, candidate:object, eval:object` | `AutoresearchDecision` | evaluator 결과 해석 | `decideAutoresearchOutcome(m,c,e)` |
| `advanceAutoresearchRun(contract, manifest, projectRoot)` | 다음 iteration 준비 | `contract:object, manifest:object, projectRoot:string` | `AutoresearchAdvanceResult` | keep/discard 후 진행 | `advanceAutoresearchRun(c,m,root)` |
| `createAutoresearchGoal(cwd, options)` | autoresearch 목표 생성 | `cwd:string, options:object` | `AutoresearchGoalState` | goal 파일 초기화 | `createAutoresearchGoal(cwd,opt)` |
| `recordAutoresearchGoalVerdict(cwd, options)` | 목표 판정 기록 | `cwd:string, options:object` | `AutoresearchGoalState` | pass/fail 기록 | `recordAutoresearchGoalVerdict(cwd,o)` |
| `completeAutoresearchGoal(cwd, slug, options)` | 목표 완료 전이 | `cwd:string, slug:string, options:object` | `AutoresearchGoalState` | passed + reconciliation 필요 | `completeAutoresearchGoal(cwd,s,o)` |
| `assessAutoresearchCompletionState(...)` | 완료 가능성 평가 | `state:object, options?:object` | `CompletionAssessment` | 완료 전 pre-check | `assessAutoresearchCompletionState(s)` |

### 11.6 catalog

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readCatalogManifest(packageRoot?)` | manifest 읽기+검증 | `packageRoot?:string` | `CatalogManifest` | 실패 시 예외 | `readCatalogManifest(root)` |
| `tryReadCatalogManifest(packageRoot?)` | manifest 읽기 시도 | `packageRoot?:string` | `CatalogManifest \| null` | optional 흐름에 사용 | `tryReadCatalogManifest()` |
| `getCatalogCounts(packageRoot?)` | 카운트 통계 반환 | `packageRoot?:string` | `CatalogCounts` | 대시보드 요약 | `getCatalogCounts()` |
| `toPublicCatalogContract(manifest)` | 공개 계약 변환 | `manifest:CatalogManifest` | `PublicCatalogContract` | internal 숨김 처리 | `toPublicCatalogContract(m)` |
| `getSetupInstallableSkillNames(manifest)` | setup 설치 스킬 목록 | `manifest:CatalogManifest` | `string[]` | 설치 후보 집합 생성 | `getSetupInstallableSkillNames(m)` |
| `compareSkillMirror(expectedDir, actualDir, expectedSkillNames, options)` | 미러 일치 검사 | `expectedDir:string, actualDir:string, expectedSkillNames:string[], options?:object` | `SkillMirrorMismatch[] \| null` | CI 검증 | `compareSkillMirror(a,b,names,{})` |
| `validateCatalogManifest(manifest)` | manifest 스키마 검증 | `manifest:unknown` | `CatalogManifest` | 읽기 직후 검증 | `validateCatalogManifest(raw)` |

### 11.7 cli

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `omx <command> [subcommand] [args...]` | CLI 엔트리 | `argv:string[]` | `number (exitCode)` | command/subcommand 조합 사용 | `omx state state_get_status` |
| `launch` | 실행 환경 시작 | `flags:object` | `LaunchResult` | tmux/direct 정책 따름 | `omx launch --spark` |
| `exec` | 단발 실행 | `task:string` | `ExecResult` | 명령성 작업 수행 | `omx exec "analyze"` |
| `team` | 팀 런타임 명령군 | `subcommand + input` | `TeamApiResult` | team api/send/monitor | `omx team api list-tasks` |
| `ralph` | ralph 모드 명령군 | `subcommand + flags` | `RalphResult` | loop/verify/complete | `omx ralph run` |
| `ultragoal` | 목표 실행 명령군 | `subcommand + flags` | `UltragoalResult` | goal lifecycle 관리 | `omx ultragoal start` |
| `setup` | 설치/초기화 | `flags:object` | `SetupResult` | 초기 개발환경 구성 | `omx setup` |
| `update` | 업데이트 | `flags:object` | `UpdateResult` | 버전/자산 업데이트 | `omx update` |
| `doctor` | 진단 | `flags:object` | `DoctorReport` | 환경 점검 | `omx doctor --json` |
| `explore` | 탐색 명령군 | `prompt/options` | `ExploreResult` | read-only 검색 | `omx explore --prompt "state path"` |
| `sparkshell` | read-only shell 래퍼 | `shell cmd` | `ShellResult` | noisy lookup 분리 | `omx sparkshell -- rg hooks` |
| `api` | API 하위 명령군 | `subcommand` | `ApiResult` | 내부 API 도구 호출 | `omx api ...` |
| `mcp-serve` | MCP 서버 실행 | `server options` | `LongRunning` | stdio 서버 실행 | `omx mcp-serve state` |
| `state` | state 명령군 | `state_*` | `StateResult` | state 작업 수행 | `omx state state_read --mode team` |
| `hooks` | hooks 명령군 | `subcommand` | `HooksResult` | 훅 관리/검증 | `omx hooks validate` |
| `cleanup` | 정리 | `flags` | `CleanupResult` | 임시 상태 정리 | `omx cleanup` |
| `auth` | 인증 명령군 | `subcommand` | `AuthResult` | 슬롯/핫스왑 관리 | `omx auth list-slots` |
| `session` | 세션 명령군 | `subcommand` | `SessionResult` | 세션 조회/제어 | `omx session current` |

### 11.8 components

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ChatContainer` | 채팅 주 컴포넌트 | `props:ChatContainerProps` | `ReactElement` | 메시지 입력/스트림 렌더 | `<ChatContainer ... />` |
| `LifecycleDashboard` | 실행 상태 패널 | `props:LifecycleDashboardProps` | `ReactElement` | lifecycle 요약 표시 | `<LifecycleDashboard ... />` |
| `TodoPanel` | 할일 패널 | `props:TodoPanelProps` | `ReactElement` | todo 리스트 표시 | `<TodoPanel items={...} />` |
| `TaskTimeline` | 작업 타임라인 | `props:TaskTimelineProps` | `ReactElement` | 단계 히스토리 표시 | `<TaskTimeline entries={...} />` |
| `ModelSelector` | 모델 선택기 | `props:ModelSelectorProps` | `ReactElement` | model 변경 콜백 연결 | `<ModelSelector onChange={...} />` |
| `ApiKeySettings` | API 키 설정 UI | `props:ApiKeySettingsProps` | `ReactElement` | 키 저장/삭제 | `<ApiKeySettings ... />` |
| `AdapterStatusBar` | 어댑터 상태 바 | `props:AdapterStatusBarProps` | `ReactElement` | adapt 상태 표시 | `<AdapterStatusBar ... />` |
| `KnowledgePanel` | 지식 탐색 패널 | `props:KnowledgePanelProps` | `ReactElement` | wiki/query 결과 표시 | `<KnowledgePanel ... />` |
| `ErrorGuideOverlay` | 오류 가이드 오버레이 | `props:ErrorGuideOverlayProps` | `ReactElement` | 에러 복구 안내 | `<ErrorGuideOverlay ... />` |
| `DeferredSkillsNotice` | 지연 스킬 안내 | `props:DeferredSkillsNoticeProps` | `ReactElement` | 지연 상태 알림 | `<DeferredSkillsNotice ... />` |
| `WikiOverlay` | 위키 오버레이 | `props:WikiOverlayProps` | `ReactElement` | 위키 내용 표시 | `<WikiOverlay ... />` |

### 11.9 core

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `execute-command` | 프로세스 실행 유틸 | `ExecuteCommandInput + callbacks` | `ChildProcessHandle` | onEnvelope/onRawLine/onDone/onError 연결 | `executeCommand({command:"omx",args:["doctor"]}, cb)` |
| `onEnvelope` | 파싱 성공 라인 콜백 | `envelope:object` | `void` | JSON 라인 처리 | `onEnvelope(e)` |
| `onRawLine` | 파싱 실패 라인 콜백 | `line:string` | `void` | 원문 로그 처리 | `onRawLine(line)` |
| `onDone` | 종료 콜백 | `exitCode:number, signal?:string` | `void` | 실행 완료 처리 | `onDone(0)` |
| `onError` | 오류 콜백 | `error:Error` | `void` | 실행 오류 처리 | `onError(err)` |

### 11.10 env

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `env-checker` 점검 함수 | 실행 전 환경 검사 | `cwd:string, options?:object` | `EnvCheckResult` | 실행 직전에 호출 | `const r = envCheck(cwd)` |
| `점검 결과 객체` | 점검 응답 모델 | `N/A` | `{ok:boolean, checks:CheckResult[], summary:string}` | fail 항목 있으면 차단 | `if (!r.ok) block()` |

### 11.11 goal-workflows

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createGoalWorkflowRun(cwd, options)` | 목표 런 생성 | `cwd:string, options:GoalWorkflowCreateOptions` | `GoalWorkflowRun` | force 여부 확인 | `createGoalWorkflowRun(cwd,opt)` |
| `readGoalWorkflowRun(cwd, workflow, slug)` | 목표 런 조회 | `cwd:string, workflow:string, slug:string` | `GoalWorkflowRun` | 상태 조회 | `readGoalWorkflowRun(c,w,s)` |
| `transitionGoalWorkflowRun(cwd, workflow, slug, options)` | 상태 전이 | `cwd:string, workflow:string, slug:string, options:TransitionOptions` | `GoalWorkflowRun` | validation 후 전이 | `transitionGoalWorkflowRun(...)` |
| `appendGoalWorkflowLedger(cwd, run, entry)` | ledger append | `cwd:string, run:GoalWorkflowRun, entry:LedgerEntry` | `void` | 감사 이벤트 기록 | `appendGoalWorkflowLedger(c,r,e)` |
| `normalizeGoalWorkflowValidation(input)` | 검증 정규화 | `input:unknown` | `GoalWorkflowValidationSummary` | 완료 조건 전처리 | `normalizeGoalWorkflowValidation(x)` |
| `assertGoalWorkflowCanComplete(validation)` | 완료 가능성 강제 | `validation:GoalWorkflowValidationSummary` | `void (throws)` | complete 전 필수 | `assertGoalWorkflowCanComplete(v)` |
| `buildGoalWorkflowHandoff(options)` | handoff 문구 생성 | `options:GoalWorkflowHandoffOptions` | `string` | 다음 실행 주체 전달 | `buildGoalWorkflowHandoff(o)` |

### 11.12 hooks

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `detectKeywords(prompt)` | 키워드 목록 탐지 | `prompt:string` | `KeywordMatch[]` | 명시 라우팅 판단 | `detectKeywords(input)` |
| `detectPrimaryKeyword(prompt)` | 대표 키워드 탐지 | `prompt:string` | `KeywordMatch \| null` | 우선 라우팅 1개 선택 | `detectPrimaryKeyword(input)` |
| `parseExplicitSkillInvocations(prompt)` | `$skill` 호출 파싱 | `prompt:string` | `string[]` | 명시 skill 실행 | `parseExplicitSkillInvocations(p)` |
| `recordSkillActivation(input)` | 활성 기록 저장 | `input:SkillActivationInput` | `void` | 훅 이벤트 기록 | `recordSkillActivation(i)` |
| `triagePrompt(prompt)` | fallback triage 판단 | `prompt:string` | `TriageDecision` | 키워드 없을 때 사용 | `triagePrompt(p)` |
| `readTriageConfig()` | triage 설정 읽기 | `void` | `TriageConfig` | 라우팅 정책 로드 | `readTriageConfig()` |
| `readTriageState(opts)` | triage 상태 조회 | `opts?:object` | `TriageState` | 최근 분류 확인 | `readTriageState()` |
| `writeTriageState(decision, opts)` | triage 상태 저장 | `decision:TriageDecision, opts?:object` | `void` | 분류 결과 기록 | `writeTriageState(d)` |
| `applyAgentsMdOverlay(...)` | AGENTS overlay 적용 | `args:object` | `ApplyResult` | 세션 오버레이 주입 | `applyAgentsMdOverlay({...})` |
| `dispatchHookEvent(...)` | 확장 이벤트 디스패치 | `event:HookEvent` | `DispatchResult` | 플러그인 런타임 전달 | `dispatchHookEvent(e)` |

### 11.13 hud

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readAllState(cwd, config?)` | HUD 상태 수집 | `cwd:string, config?:HudConfig` | `HudRenderContext` | 렌더 전 상태 집계 | `readAllState(cwd)` |
| `renderHud(ctx, preset, options)` | HUD 렌더 | `ctx:HudRenderContext, preset:HudPreset, options?:object` | `string` | 출력 문자열 생성 | `renderHud(ctx,"focused")` |
| `reconcileHudForPromptSubmit(cwd, deps)` | prompt-submit 시 HUD 재조정 | `cwd:string, deps:object` | `ReconcileResult` | pane 중복/리사이즈 처리 | `reconcileHudForPromptSubmit(cwd,deps)` |
| `createHudWatchPane(...)` | HUD watch pane 생성 | `args:object` | `string \| null` | tmux pane 생성 | `createHudWatchPane(...)` |
| `killTmuxPane(...)` | tmux pane 종료 | `paneId:string` | `void` | stale pane 정리 | `killTmuxPane("%3")` |
| `runHudAuthorityTick(options, deps?)` | authority tick 수행 | `options:object, deps?:object` | `Promise<void>` | watch 루프에서 주기 호출 | `await runHudAuthorityTick(o)` |
| `hudCommand(args)` | CLI HUD 엔트리 | `args:string[]` | `Promise<number>` | `omx hud` 구현 | `hudCommand(process.argv.slice(2))` |

### 11.14 ipc

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `adapter-ipc` | 어댑터 상태 채널 | `invoke payload` | `{ok:boolean,data?:unknown,error?:object}` | adapter probe/status 호출 | `electronAPI.probeAdapter()` |
| `cli-ipc` | CLI 연동 채널 | `invoke payload` | `CliResult` | CLI 정보/실행 요청 | `electronAPI.getCliInfo()` |
| `env-ipc` | 환경 점검 채널 | `invoke payload` | `EnvResult` | preflight 호출 | `electronAPI.checkEnv()` |
| `interlude-ipc` | interlude 채널 | `event/invoke` | `InterludeResult` | 질문/응답 흐름 | `electronAPI.sendInterludeAck(...)` |
| `ops-ipc` | 운영 진단 채널 | `invoke payload` | `OpsReport` | drift/정리 | `electronAPI.runOps(...)` |
| `state-ipc` | 상태 채널 | `invoke/event` | `Lifecycle/Todo payload` | 초기 로드+구독 | `electronAPI.onTodoChange(cb)` |
| `stream-bridge-ipc` | 스트림 채널 | `invoke/event` | `Token/Tool/Done/Error payload` | 실시간 응답 | `electronAPI.onStreamToken(cb)` |
| `task-ipc` | 태스크 채널 | `invoke payload` | `TaskResult` | read/claim/transition | `electronAPI.claimTask(...)` |

### 11.15 logs

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `init(logDir)` | logger 초기화 | `logDir:string` | `void` | 앱 시작 시 1회 호출 | `init(".omx/logs")` |
| `getLogPath()` | 현재 로그 파일 경로 | `void` | `string \| null` | 경로 표시/디버깅 | `getLogPath()` |
| `logLlmRequest(text, model?)` | 요청 로그 기록 | `text:string, model?:string` | `void` | 요청 시작 시 기록 | `logLlmRequest(prompt,model)` |
| `logLlmResponseToken(token)` | 응답 토큰 누적 | `token:string` | `void` | 스트리밍 중 반복 호출 | `logLlmResponseToken(chunk)` |
| `flushLlmResponse()` | 응답 버퍼 flush | `void` | `void` | done 시 호출 | `flushLlmResponse()` |
| `logToolCall(toolName, args)` | 도구 호출 로그 | `toolName:string, args:unknown` | `void` | tool call 이벤트 기록 | `logToolCall(name,args)` |
| `logSystemMessage(message)` | 시스템 로그 | `message:string` | `void` | 상태 알림 기록 | `logSystemMessage(msg)` |
| `logError(message)` | 오류 로그 | `message:string` | `void` | 오류 시 기록 | `logError(err.message)` |
| `start(logsDir)` | hook tailer 시작 | `logsDir:string` | `void` | hook 로그 구독 시작 | `start(".omx/logs")` |
| `onLine(cb)` | 라인 구독 등록 | `cb:(line:string)=>void` | `void` | dispatch 파이프 연결 | `onLine(dispatcher)` |
| `offLine(cb)` | 라인 구독 해제 | `cb:(line:string)=>void` | `void` | 종료 시 cleanup | `offLine(dispatcher)` |
| `stop()` | tailer 종료 | `void` | `void` | 앱 종료 시 호출 | `stop()` |
| `dispatch(rawLine, broadcast)` | hook 라인 디스패치 | `rawLine:string, broadcast:(ch:string,p:unknown)=>void` | `void` | schema 검증 후 채널 전송 | `dispatch(line,broadcast)` |
| `HOOK_IPC_CHANNEL` | 일반 훅 채널 상수 | `N/A` | `string` | 일반 이벤트 브로드캐스트 채널명 | `mainWindow.webContents.send(HOOK_IPC_CHANNEL,p)` |
| `HOOK_IPC_PRIORITY_CHANNEL` | 우선 훅 채널 상수 | `N/A` | `string` | 우선 이벤트 전용 채널명 | `send(HOOK_IPC_PRIORITY_CHANNEL,p)` |
| `PRIORITY_EVENTS` | 우선 이벤트 집합 | `N/A` | `string[]` | dispatch 분기 기준 | `if (PRIORITY_EVENTS.includes(ev))` |

### 11.16 main

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `window.electronAPI invoke/on 채널 집합` | Renderer에 노출된 공식 브리지 | `channel payload` | `invoke result / event payload` | preload 통해서만 호출 | `window.electronAPI.startAgentStream(...)` |
| `시작/중단/상태조회/도구호출/인터류드/태스크 엔드포인트` | Main 통합 엔드포인트 그룹 | `endpoint-specific` | `endpoint-specific` | 기능별 채널 분리 사용 | `getLifecycleState -> onLifecycleChange` |

### 11.17 mcp

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `autoStartStdioMcpServer(name, server)` | stdio MCP 서버 자동 시작 | `name:string, server:McpServer` | `void` | 서버 진입점에서 호출 | `autoStartStdioMcpServer("state",server)` |
| `shouldAutoStartMcpServer(name)` | 자동 시작 여부 판단 | `name:string` | `boolean` | env 플래그 반영 | `if (shouldAutoStartMcpServer("wiki"))` |
| `getBaseStateDir(wd?)` | 기본 상태 루트 경로 | `wd?:string` | `string` | state 경로 계산 시작점 | `getBaseStateDir(cwd)` |
| `getStateDir(wd?, sessionId?)` | scope 상태 디렉터리 | `wd?:string, sessionId?:string` | `string` | 세션별 경로 계산 | `getStateDir(cwd,sid)` |
| `getStatePath(mode, wd?, sessionId?)` | mode 상태 파일 경로 | `mode:string, wd?:string, sessionId?:string` | `string` | read/write 전 경로 계산 | `getStatePath("team",cwd,sid)` |
| `writeMcpLifecycleTelemetry(event, env?)` | 생명주기 telemetry 기록 | `event:object, env?:NodeJS.ProcessEnv` | `Promise<void>` | start/stop 기록 | `await writeMcpLifecycleTelemetry(ev)` |
| `parseNotepadPruneDaysOld(value, defaultDays)` | prune 일수 파싱 | `value:unknown, defaultDays:number` | `number` | 설정값 안전 파싱 | `parseNotepadPruneDaysOld(raw,30)` |

### 11.18 notifications

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getNotificationConfig(cwd?, opts?)` | 알림 설정 로드 | `cwd?:string, opts?:object` | `FullNotificationConfig` | 발송 전 설정 병합 | `getNotificationConfig(cwd)` |
| `dispatchNotifications(config, payload)` | 알림 발송 | `config:FullNotificationConfig, payload:FullNotificationPayload` | `DispatchResult` | dedupe/cooldown 후 발송 | `dispatchNotifications(cfg,p)` |
| `formatNotification(event, payload)` | 메시지 포맷 생성 | `event:string, payload:object` | `string` | 발송 전 텍스트 생성 | `formatNotification(ev,p)` |
| `renderTemplate(template, vars)` | 템플릿 변수 치환 | `template:string, vars:Record<string,string>` | `string` | 커스텀 메시지 구성 | `renderTemplate(t,v)` |
| `getCurrentTmuxSession()` | tmux 세션 확인 | `void` | `string \| null` | tmux 주입 대상 판단 | `getCurrentTmuxSession()` |
| `captureTmuxPane(paneId?, lines?)` | pane 텍스트 캡처 | `paneId?:string, lines?:number` | `string` | reply context 수집 | `captureTmuxPane("%1",50)` |
| `lookupByMessageId(platform, messageId)` | 메시지 매핑 조회 | `platform:string, messageId:string` | `SessionMapping \| null` | reply 라우팅 | `lookupByMessageId("discord",id)` |
| `notify(payload, config?)` | 단일 알림 엔트리 | `payload:FullNotificationPayload, config?:FullNotificationConfig` | `NotificationResult` | 상위 훅에서 직접 호출 | `notify(payload)` |

### 11.19 openclaw

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getOpenClawConfig()` | openclaw 설정 로드 | `void` | `OpenClawConfig` | wake 전에 로드 | `getOpenClawConfig()` |
| `inspectOpenClawConfig()` | 설정 진단 | `void` | `OpenClawInspectResult` | doctor/디버깅에 사용 | `inspectOpenClawConfig()` |
| `resolveGateway(config, event)` | 이벤트별 게이트웨이 결정 | `config:OpenClawConfig, event:string` | `OpenClawGatewayConfig \| null` | 미설정 이벤트 스킵 | `resolveGateway(cfg,"stop")` |
| `interpolateInstruction(template, variables)` | instruction 변수 치환 | `template:string, variables:Record<string,string>` | `string` | payload text 생성 | `interpolateInstruction(t,v)` |
| `validateGatewayUrl(url)` | URL 보안 검증 | `url:string` | `boolean` | SSRF 방지 필수 | `if (!validateGatewayUrl(url))` |
| `wakeGateway(name, config, payload)` | 일반 게이트웨이 호출 | `name:string, config:OpenClawGatewayConfig, payload:OpenClawPayload` | `WakeResult` | http/command 분기 호출 | `wakeGateway("discord",cfg,p)` |
| `wakeCommandGateway(name, config, variables)` | command 게이트웨이 호출 | `name:string, config:OpenClawGatewayConfig, variables:Record<string,string>` | `WakeResult` | opt-in 환경에서만 실행 | `wakeCommandGateway("local",cfg,v)` |
| `wakeOpenClaw(event, context)` | openclaw 통합 엔트리 | `event:string, context:OpenClawContext` | `WakeResult \| null` | 훅에서 단일 진입점 사용 | `wakeOpenClaw("stop",ctx)` |

### 11.20 ops

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `drift-detector 함수 집합` | 로그/매니페스트 드리프트 분석 API 묶음 | `logsPath:string, manifestPath:string, options?:object` | `DriftReport` | 읽기 전용 진단으로 사용 | `runDriftDetector(paths)` |

### 11.21 performance-goal

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createPerformanceGoal(cwd, options)` | 목표 생성 | `cwd:string, options:PerformanceGoalCreateOptions` | `PerformanceGoalState` | force 여부 확인 | `createPerformanceGoal(cwd,opt)` |
| `readPerformanceGoal(cwd, slug)` | 목표 조회 | `cwd:string, slug:string` | `PerformanceGoalState` | 상태 확인 | `readPerformanceGoal(cwd,slug)` |
| `startPerformanceGoal(cwd, slug)` | 목표 시작 | `cwd:string, slug:string` | `{state:PerformanceGoalState,instruction:string}` | created -> in_progress | `startPerformanceGoal(cwd,slug)` |
| `checkpointPerformanceGoal(cwd, options)` | 체크포인트 기록 | `cwd:string, options:CheckpointOptions` | `PerformanceGoalState` | pass/fail/blocked 기록 | `checkpointPerformanceGoal(cwd,o)` |
| `completePerformanceGoal(cwd, options)` | 목표 완료 | `cwd:string, options:CompleteOptions` | `PerformanceGoalState` | pass+snapshot 일치 필요 | `completePerformanceGoal(cwd,o)` |
| `buildPerformanceGoalInstruction(state)` | handoff instruction 생성 | `state:PerformanceGoalState` | `string` | 모델 전달 문구 생성 | `buildPerformanceGoalInstruction(state)` |

### 11.22 pipeline

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `runPipeline(config)` | 파이프라인 실행 | `config:PipelineConfig` | `PipelineResult` | stage 순차 실행 | `runPipeline(cfg)` |
| `canResumePipeline(cwd?)` | 재개 가능 여부 | `cwd?:string` | `boolean` | resume 버튼 활성화 | `canResumePipeline(cwd)` |
| `readPipelineState(cwd?)` | 현재 파이프라인 상태 | `cwd?:string` | `PipelineModeStateExtension \| null` | 중단점 조회 | `readPipelineState(cwd)` |
| `cancelPipeline(cwd?)` | 파이프라인 취소 | `cwd?:string` | `CancelResult` | 안전 종료 처리 | `cancelPipeline(cwd)` |
| `createAutopilotPipelineConfig(task, options)` | 기본 autopilot 구성 생성 | `task:string, options:object` | `PipelineConfig` | 표준 단계 생성 | `createAutopilotPipelineConfig(task,o)` |
| `createStrictAutopilotStages()` | strict 단계 집합 생성 | `void` | `PipelineStage[]` | 품질 강화 모드 | `createStrictAutopilotStages()` |

### 11.23 planning

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `parsePlanningArtifactFileName(path)` | 파일명 파싱 | `path:string` | `PlanningArtifactNameInfo \| null` | artifact 유형 판별 | `parsePlanningArtifactFileName(p)` |
| `comparePlanningArtifactPaths(left, right)` | 경로 우선순위 비교 | `left:string, right:string` | `number` | 최신 항목 정렬 | `paths.sort(comparePlanningArtifactPaths)` |
| `selectMatchingTestSpecsForPrd(prdPath, testSpecPaths)` | PRD 대응 테스트 스펙 선택 | `prdPath:string, testSpecPaths:string[]` | `string[]` | timestamp 기반 매칭 | `selectMatchingTestSpecsForPrd(prd,specs)` |
| `readPlanningArtifacts(cwd)` | artifact 스캔 | `cwd:string` | `PlanningArtifacts` | 계획 문서 로드 | `readPlanningArtifacts(cwd)` |
| `isPlanningComplete(artifacts)` | 계획 완료 판단 | `artifacts:PlanningArtifacts` | `boolean` | 실행 전 게이트 | `isPlanningComplete(a)` |
| `readLatestPlanningArtifacts(cwd)` | 최신 artifact 조회 | `cwd:string` | `LatestPlanningArtifacts` | 최신 PRD/테스트 선택 | `readLatestPlanningArtifacts(cwd)` |
| `readApprovedExecutionLaunchHintOutcome(cwd, mode, options?)` | 실행 힌트 결과 조회 | `cwd:string, mode:string, options?:object` | `ApprovedExecutionLaunchHintOutcome` | resolved/absent/ambiguous | `readApprovedExecutionLaunchHintOutcome(cwd,"team")` |
| `readApprovedExecutionLaunchHint(cwd, mode, options?)` | 실행 힌트 조회 | `cwd:string, mode:string, options?:object` | `ApprovedExecutionLaunchHint \| null` | 단일 힌트 사용 | `readApprovedExecutionLaunchHint(cwd,"ralph")` |
| `readTeamDagArtifactResolution(cwd)` | team DAG 해석 | `cwd:string` | `TeamDagArtifactResolution` | sidecar/team 실행에 사용 | `readTeamDagArtifactResolution(cwd)` |

### 11.24 question

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createQuestionRecord(cwd, input, sessionId?, now?, options?)` | 질문 레코드 생성 | `cwd:string, input:QuestionInput, sessionId?:string, now?:Date, options?:object` | `QuestionRecord` | 질문 시작 시 호출 | `createQuestionRecord(cwd,input)` |
| `readQuestionRecord(recordPath)` | 질문 레코드 조회 | `recordPath:string` | `QuestionRecord` | 상태 확인 | `readQuestionRecord(path)` |
| `updateQuestionRecord(recordPath, updater)` | 질문 레코드 갱신 | `recordPath:string, updater:(r:QuestionRecord)=>QuestionRecord` | `QuestionRecord` | 상태 전이 적용 | `updateQuestionRecord(path,fn)` |
| `markQuestionPrompting(recordPath, renderer)` | prompting 전이 | `recordPath:string, renderer:QuestionRendererState` | `QuestionRecord` | 렌더러 시작 시 | `markQuestionPrompting(path,r)` |
| `markQuestionAnswered(recordPath, answer)` | answered 전이 | `recordPath:string, answer:QuestionAnswer` | `QuestionRecord` | 응답 저장 | `markQuestionAnswered(path,a)` |
| `markQuestionAborted(recordPath, code, message)` | aborted 전이 | `recordPath:string, code:string, message:string` | `QuestionRecord` | 중단 시 기록 | `markQuestionAborted(path,"timeout",msg)` |
| `submitQuestionAnswer(recordPath, entries)` | 응답 제출 | `recordPath:string, entries:QuestionAnswerEntry[]` | `QuestionRecord` | UI/CLI 답변 제출 | `submitQuestionAnswer(path,entries)` |
| `waitForQuestionAnswer(recordPath, timeoutMs?)` | 답변 대기 | `recordPath:string, timeoutMs?:number` | `Promise<QuestionAnswer>` | 블로킹 대기 | `await waitForQuestionAnswer(path,30000)` |
| `appendQuestionEvent(cwd, type, record)` | 질문 이벤트 기록 | `cwd:string, type:QuestionEventType, record:QuestionRecord` | `void` | audit 로그 기록 | `appendQuestionEvent(cwd,"question-created",r)` |
| `appendQuestionAnsweredEventOnce(cwd, record)` | answered 이벤트 중복 방지 기록 | `cwd:string, record:QuestionRecord` | `void` | answered 1회 기록 보장 | `appendQuestionAnsweredEventOnce(cwd,r)` |

### 11.25 ralph

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `normalizeRalphPhase(rawPhase)` | phase 정규화 | `rawPhase:string` | `RalphPhase` | legacy alias 흡수 | `normalizeRalphPhase("verification")` |
| `validateAndNormalizeRalphState(candidate, options?)` | 상태 검증/정규화 | `candidate:unknown, options?:object` | `RalphState` | 저장 전 필수 | `validateAndNormalizeRalphState(s)` |
| `evaluateRalphCompletionAuditEvidence(state, cwd)` | 완료 증거 평가 | `state:RalphState, cwd:string` | `RalphCompletionAuditResult` | complete 게이트 | `evaluateRalphCompletionAuditEvidence(s,cwd)` |
| `isRalphCompletePhase(value)` | complete phase 판정 | `value:string` | `boolean` | 전이 분기 | `isRalphCompletePhase(state.current_phase)` |
| `ensureCanonicalRalphArtifacts(cwd, sessionId?)` | canonical 아티팩트 보장 | `cwd:string, sessionId?:string` | `RalphCanonicalArtifacts` | 마이그레이션/초기화 | `ensureCanonicalRalphArtifacts(cwd)` |
| `recordRalphVisualFeedback(cwd, feedback, sessionId?, baseStateDir?)` | 시각 피드백 기록 | `cwd:string, feedback:RalphVisualFeedback, sessionId?:string, baseStateDir?:string` | `void` | visual-verdict 기록 | `recordRalphVisualFeedback(cwd,f)` |

### 11.26 ralplan

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `runRalplanConsensus(executor, options)` | 합의 루프 실행 | `executor:RalplanConsensusExecutor, options:RalplanOptions` | `RalplanRuntimeResult` | draft/review 루프 실행 | `runRalplanConsensus(exec,opt)` |
| `cancelRalplanConsensus(cwd?)` | 합의 루프 취소 | `cwd?:string` | `CancelResult` | 사용자 중단 처리 | `cancelRalplanConsensus(cwd)` |
| `buildRalplanConsensusGateFromSources(sources)` | 다중 소스 합의 게이트 생성 | `sources:ConsensusEvidenceSource[]` | `RalplanConsensusGate` | 증거 기반 합의 계산 | `buildRalplanConsensusGateFromSources(srcs)` |
| `buildRalplanConsensusGateForCwd(cwd, options)` | cwd 기반 합의 게이트 | `cwd:string, options?:object` | `RalplanConsensusGate` | 로컬 상태 포함 평가 | `buildRalplanConsensusGateForCwd(cwd,{})` |
| `hasDurableRalplanConsensusEvidenceForCwd(cwd, options)` | durable 합의 증거 판정 | `cwd:string, options?:object` | `RalplanConsensusGateEvidence` | 실행 전 게이트 | `hasDurableRalplanConsensusEvidenceForCwd(cwd,{})` |
| `readLocalRalplanConsensusStateCandidates(cwd, sessionId?)` | 로컬 후보 상태 읽기 | `cwd:string, sessionId?:string` | `ConsensusStateCandidate[]` | 증거 탐색 | `readLocalRalplanConsensusStateCandidates(cwd,sid)` |

### 11.27 renderer

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ChatContainer.onSendMessage(text)` | 메시지 전송 콜백 | `text:string` | `void` | 상위에서 start stream 호출 | `onSendMessage(input)` |
| `ChatContainer.selectedModel` | 선택 모델 props | `modelId:string` | `string` | 모델 상태 바인딩 | `<ChatContainer selectedModel={model}/>` |
| `ChatContainer.onModelChange(modelId)` | 모델 변경 콜백 | `modelId:string` | `void` | 모델 선택기 연결 | `onModelChange(nextModel)` |
| `LifecycleDashboard.defaultOpen` | 초기 열림 여부 | `boolean` | `boolean` | 최초 렌더 정책 | `<LifecycleDashboard defaultOpen />` |
| `LifecycleDashboard.stateDir` | 상태 디렉터리 참조 | `string` | `string` | 상태 경로 지정 | `<LifecycleDashboard stateDir={dir} />` |

### 11.28 runtime

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `run-outcome normalize/classify/infer/apply` | outcome 계약 함수군 | `unknown / mode-state` | `RunOutcome` | 상태 정규화 파이프라인 | `classifyRunOutcome(raw)` |
| `runUntilTerminal` | 루프 실행 | `step:(n:number)=>RunOutcomeLike, options:object` | `TerminalLoopResult` | terminal까지 반복 | `runUntilTerminal(step,{maxIterations:20})` |
| `shouldContinueRun` | 루프 지속 여부 판단 | `outcome:RunOutcome` | `boolean` | step 반복 조건 | `if (shouldContinueRun(o))` |
| `readRunState` | run-state 읽기 | `cwd:string, mode:string` | `RunState \| null` | 현재 상태 조회 | `readRunState(cwd,"team")` |
| `syncRunStateFromModeState` | mode->run-state 동기화 | `modeState:object, options?:object` | `RunState` | 상태 일관성 유지 | `syncRunStateFromModeState(ms)` |
| `execCommand` | runtime bridge 명령 실행 | `command:RuntimeCommand, payload?:object` | `RuntimeCommandResult` | Rust bridge 호출 | `execCommand("MarkDelivered",req)` |
| `readSnapshot` | bridge snapshot 읽기 | `void` | `RuntimeSnapshot` | 런타임 스냅샷 조회 | `readSnapshot()` |
| `getDefaultBridge` | 기본 bridge 인스턴스 | `void` | `RuntimeBridge` | bridge 공유 사용 | `const b = getDefaultBridge()` |
| `runProcessTreeWithTimeout` | 프로세스 트리 timeout 실행 | `command:string, args:string[], options:object` | `ProcessTreeResult` | 긴 작업 제한 실행 | `runProcessTreeWithTimeout(cmd,args,opt)` |

### 11.29 scripts

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `execute-command` | 공통 실행기 | `ExecuteCommandInput` | `ChildProcessHandle` | 스크립트 실행 공통화 | `executeCommand({...})` |
| `onEnvelope` | envelope 콜백 | `object` | `void` | JSON 이벤트 처리 | `onEnvelope(e)` |
| `onRawLine` | raw line 콜백 | `string` | `void` | 비JSON 로그 처리 | `onRawLine(l)` |
| `onDone` | 완료 콜백 | `number` | `void` | 종료 처리 | `onDone(code)` |
| `onError` | 오류 콜백 | `Error` | `void` | 예외 처리 | `onError(err)` |
| `build-api.ts` | API 바이너리 빌드 스크립트 | `CLI args` | `exitCode:number` | release 빌드 | `node build-api.ts` |
| `build-explore-harness.ts` | explore 하네스 빌드 | `CLI args` | `exitCode:number` | 테스트 하네스 준비 | `node build-explore-harness.ts` |
| `build-sparkshell.ts` | sparkshell 빌드 | `CLI args` | `exitCode:number` | sparkshell 산출물 빌드 | `node build-sparkshell.ts` |
| `check-version-sync.ts` | 버전 동기 검사 | `CLI args` | `exitCode:number` | CI 버전 게이트 | `node check-version-sync.ts` |
| `check-runtime-syntax.ts` | 문법 검사 스크립트 | `CLI args` | `exitCode:number` | runtime 파일 검증 | `node check-runtime-syntax.ts` |
| `run-test-files.ts` | 테스트 파일 실행기 | `CLI args` | `exitCode:number` | 선택 테스트 실행 | `node run-test-files.ts` |
| `generate-catalog-docs.ts` | 카탈로그 문서 생성 | `CLI args` | `exitCode:number` | public catalog 생성 | `node generate-catalog-docs.ts` |
| `generate-release-body.ts` | 릴리스 바디 생성 | `CLI args` | `exitCode:number` | 릴리스 노트 생성 | `node generate-release-body.ts` |
| `sync-plugin-mirror.ts` | 플러그인 미러 동기화 | `CLI args` | `exitCode:number` | 스킬 미러 업데이트 | `node sync-plugin-mirror.ts` |
| `notify-hook.ts` | notify 훅 엔트리 | `hook payload` | `hook response` | turn 완료 후 호출 | `node notify-hook.ts <payload>` |
| `notify-dispatcher.ts` | notify 직렬 디스패치 | `payload/config` | `DispatchResult` | 기존 notify+omx notify 연속 호출 | `node notify-dispatcher.ts` |
| `tmux-hook-engine.ts` | tmux 주입 엔진 | `TmuxHookConfig + payload` | `InjectionDecision` | pane 주입 가드 | `node tmux-hook-engine.ts` |

### 11.30 services

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readTask(taskId)` | 태스크 읽기 | `taskId:string` | `Promise<TaskData>` | 작업 시작 전 상태 확인 | `await readTask(id)` |
| `claimTask(taskId, version)` | 태스크 선점 | `taskId:string, version:number` | `Promise<void>` | 실행 전 claim 필수 | `await claimTask(id,v)` |
| `releaseTaskClaim(taskId)` | 선점 해제 | `taskId:string` | `Promise<void>` | 롤백/재큐 시 사용 | `await releaseTaskClaim(id)` |
| `transitionTaskStatus(taskId, current, target, resultData?)` | 상태 전이 | `taskId:string, current:TaskStatus, target:TransitionTarget, resultData?:unknown` | `Promise<unknown>` | 규칙 위반 시 예외 | `await transitionTaskStatus(id,"in_progress","completed")` |
| `InvalidTransitionError` | 금지 전이 오류 타입 | `N/A` | `Error class` | catch 분기 처리 | `if (e instanceof InvalidTransitionError)` |
| `saveGeminiApiKey(plaintext)` | 키 저장 | `plaintext:string` | `void` | 설정 저장 시 호출 | `saveGeminiApiKey(key)` |
| `loadGeminiApiKey()` | 키 로드 | `void` | `string \| null` | 앱 시작 시 조회 | `const key = loadGeminiApiKey()` |
| `clearGeminiApiKey()` | 키 초기화 | `void` | `void` | 로그아웃/리셋 처리 | `clearGeminiApiKey()` |
| `isValidGeminiKeyFormat(key)` | 키 형식 검사 | `key:string` | `boolean` | 저장 전 유효성 검사 | `if (isValidGeminiKeyFormat(key))` |

### 11.31 sidecar

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `collectSidecarSnapshot(teamName, options)` | 상태 스냅샷 수집 | `teamName:string, options:object` | `SidecarSnapshot \| null` | 렌더 전 데이터 수집 | `collectSidecarSnapshot("alpha",opt)` |
| `renderSidecar(snapshot, options)` | 텍스트 패널 렌더 | `snapshot:SidecarSnapshot, options:object` | `string` | watch 출력 생성 | `renderSidecar(snapshot,opt)` |
| `buildSidecarTmuxSplitArgs(options)` | tmux split args 생성 | `options:object` | `string[]` | tmux 실행 전 argv 구성 | `buildSidecarTmuxSplitArgs(o)` |
| `launchSidecarTmuxPane(options, execTmuxSync?)` | tmux pane 실행 | `options:object, execTmuxSync?:Function` | `string \| null` | sidecar 별도 pane 실행 | `launchSidecarTmuxPane(o)` |
| `parseSidecarArgs(args)` | CLI args 파싱 | `args:string[]` | `SidecarFlags` | CLI 진입점에서 사용 | `parseSidecarArgs(process.argv.slice(2))` |
| `runSidecarWatch(...)` | watch 루프 실행 | `args:object` | `Promise<void>` | 지속 모니터링 | `await runSidecarWatch(...)` |
| `sidecarCommand()` | sidecar CLI 엔트리 | `argv:string[]` | `Promise<number>` | omx sidecar 구현 | `sidecarCommand()` |

### 11.32 state

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `executeStateOperation(name, rawArgs)` | state 명령 실행 통합 엔트리 | `name:string, rawArgs:unknown` | `unknown` | state_* 명령 라우팅 | `executeStateOperation("state_read",args)` |
| `listActiveStateModes(workingDirectory?, explicitSessionId?)` | 활성 모드 조회 | `workingDirectory?:string, explicitSessionId?:string` | `string[]` | HUD/대시보드 입력 | `listActiveStateModes(cwd,sid)` |
| `listStateStatuses(cwd, explicitSessionId?, mode?, options?)` | 상세 상태 목록 조회 | `cwd:string, explicitSessionId?:string, mode?:string, options?:object` | `StateStatus[]` | 디버깅/운영 상태 확인 | `listStateStatuses(cwd,sid,"team")` |
| `state_read` | 상태 읽기 명령 | `mode/session args` | `ModeState` | 조회 전용 | `omx state state_read --mode ralph` |
| `state_write` | 상태 쓰기 명령 | `mode + payload` | `ModeState` | 검증 후 원자적 쓰기 | `omx state state_write --mode team --input ...` |
| `state_clear` | 상태 초기화 명령 | `mode/session args` | `ClearResult` | 세션/루트 clear | `omx state state_clear --mode team` |
| `state_list_active` | 활성 목록 명령 | `session args` | `string[]` | 현재 활성 모드 나열 | `omx state state_list_active` |
| `state_get_status` | 상태 요약 명령 | `mode/session args` | `StateStatus` | phase/outcome 요약 | `omx state state_get_status --mode ralph` |

### 11.33 team

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `startTeam(config)` | 팀 실행 시작 | `config:TeamConfig` | `TeamState` | 팀 초기화 및 워커 부트스트랩 | `startTeam(cfg)` |
| `monitorTeam(...)` | 팀 상태 감시 | `options:TeamMonitorOptions` | `TeamMonitorResult` | 워커 heartbeat/phase 감시 | `monitorTeam({teamName:"alpha"})` |
| `shutdownTeam(...)` | 팀 종료 | `options:TeamShutdownOptions` | `ShutdownSummary` | 워커 정리 후 종료 | `shutdownTeam({teamName:"alpha"})` |
| `runtime-cli 진입점(JSON 입출력)` | team runtime CLI | `stdin JSON / argv` | `stdout JSON` | 자동화 스크립트 연동 | `omx team runtime --json` |
| `team-ops gateway(teamInit, teamCreateTask, teamClaimTask 등)` | 팀 API 게이트웨이 | `action + input JSON` | `TeamApiResult` | task/mailbox/dispatch 조작 | `omx team api claim-task --input ... --json` |
| `approved execution binding` | 승인 실행 바인딩 | `planning hint + team config` | `BindingResult` | 승인 힌트 기반 팀 실행 | `bindApprovedExecution(...)` |
| `ultragoal team context API` | ultragoal 컨텍스트 연동 | `goal context + team state` | `ContextResult` | 목표 기반 팀 실행 연결 | `buildUltragoalTeamContext(...)` |

### 11.34 test

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `*.test.ts` | 단위 테스트 표면 | `test runner args` | `pass/fail` | 함수/모듈 단위 검증 | `npm test -- state.test.ts` |
| `*.integrated.test.ts` | 통합 테스트 표면 | `test runner args` | `pass/fail` | 모듈 간 경로 검증 | `npm test -- stream.integrated.test.ts` |

### 11.35 utils

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `codexHome()` | codex 홈 경로 | `void` | `string` | 설정 경로 계산 | `codexHome()` |
| `omxRoot()` | OMX 루트 경로 | `void` | `string` | .omx 루트 계산 | `omxRoot()` |
| `omxStateDir()` | 상태 디렉터리 경로 | `void` | `string` | 상태 파일 저장 위치 | `omxStateDir()` |
| `omxPlansDir()` | 계획 디렉터리 경로 | `void` | `string` | PRD/스펙 경로 | `omxPlansDir()` |
| `omxLogsDir()` | 로그 디렉터리 경로 | `void` | `string` | 로그 저장 위치 | `omxLogsDir()` |
| `omxProjectMemoryPath()` | 프로젝트 메모리 경로 | `void` | `string` | 메모리 파일 위치 | `omxProjectMemoryPath()` |
| `resolveProjectMemoryPath()` | 우선순위 메모리 경로 결정 | `void` | `string \| null` | canonical/legacy 해석 | `resolveProjectMemoryPath()` |
| `omxWikiDir()` | 위키 디렉터리 경로 | `void` | `string` | 위키 저장 위치 | `omxWikiDir()` |
| `addGeneratedAgentsMarker()` | AGENTS generated marker 주입 | `content:string` | `string` | AGENTS.md 갱신 | `addGeneratedAgentsMarker(text)` |
| `upsertManagedAgentsBlock()` | managed block 삽입/교체 | `existing:string, managed:string` | `string` | 블록 멱등 갱신 | `upsertManagedAgentsBlock(a,b)` |
| `renderAgentsModelTableBlock()` | 모델 테이블 블록 렌더 | `context:object, defs:object[]` | `string` | AGENTS 모델 표 생성 | `renderAgentsModelTableBlock(ctx,defs)` |
| `resolveCommandPathForPlatform()` | 실행 파일 경로 해석 | `cmd:string, platform?:string, env?:object` | `string \| null` | cross-platform 경로 탐색 | `resolveCommandPathForPlatform("git")` |
| `buildPlatformCommandSpec()` | 플랫폼 명령 스펙 빌드 | `cmd:string, args:string[], platform?:string` | `PlatformCommandSpec` | spawn 전 스펙 생성 | `buildPlatformCommandSpec("node",["a.js"])` |
| `spawnPlatformCommandSync()` | 동기 실행 래퍼 | `cmd:string, args:string[], opts?:object` | `SpawnSyncReturns<string>` | 표준 실행 래퍼 | `spawnPlatformCommandSync("git",["status"])` |
| `safeJsonParse()` | 안전 JSON 파싱 | `raw:string, fallback:T` | `T` | 파싱 실패 fallback | `safeJsonParse(raw,{})` |
| `safeReadJsonFile()` | 안전 JSON 파일 읽기 | `filePath:string, fallback:T` | `Promise<T>` | 파일 손상 보호 | `await safeReadJsonFile(path,{})` |
| `sleep()` | 비동기 sleep | `ms:number, signal?:AbortSignal` | `Promise<void>` | 재시도 backoff | `await sleep(500)` |
| `sleepSync()` | 동기 sleep | `ms:number` | `void` | 테스트/특수 루프 | `sleepSync(50)` |

### 11.36 wiki

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ingestKnowledge(root, input)` | 지식 페이지 입력/업데이트 | `root:string, input:WikiIngestInput` | `WikiIngestResult` | 세션 결과 저장 | `ingestKnowledge(root,input)` |
| `queryWiki(root, queryText, options)` | 지식 검색 | `root:string, queryText:string, options?:WikiQueryOptions` | `WikiQueryMatch[]` | 질의 기반 검색 | `queryWiki(root,"team idle",{})` |
| `lintWiki(root, config)` | 위키 품질 검사 | `root:string, config?:WikiConfig` | `WikiLintReport` | 문서 검증 CI | `lintWiki(root,cfg)` |
| `onSessionStart(data)` | 세션 시작 훅 | `data:WikiSessionHookInput` | `WikiHookResult` | 세션 컨텍스트 주입 | `onSessionStart(data)` |
| `onSessionEnd(data)` | 세션 종료 훅 | `data:WikiSessionHookInput` | `WikiHookResult` | 자동 캡처/요약 | `onSessionEnd(data)` |
| `onPreCompact(data)` | pre-compact 훅 | `data:WikiCompactHookInput` | `WikiHookResult` | compact 전 안내 | `onPreCompact(data)` |
| `onPostCompact(data)` | post-compact 훅 | `data:WikiCompactHookInput` | `WikiHookResult` | compact 후 재주입 | `onPostCompact(data)` |
| `readPage(root, filename)` | 페이지 읽기 | `root:string, filename:string` | `WikiPage` | 단일 문서 조회 | `readPage(root,"team.md")` |
| `writePage(root, page)` | 페이지 쓰기 | `root:string, page:WikiPage` | `void` | 문서 저장/갱신 | `writePage(root,page)` |

## 12. 마이그레이션 및 변경 관리

### 12.1 기존 구조와의 차이
OMX는 기능별로 흩어진 모듈을 계층화하고, 공개 API를 명세 중심으로 관리한다. 초보 개발자는 예전 코드 구조보다 이 문서의 계층 구조를 먼저 이해하는 것이 좋다.

### 12.2 단계별 전환 계획
1. 공개 API와 내부 helper를 분리해서 읽는다.
2. 상태와 워크플로를 먼저 이해한다.
3. UI와 관측 계층을 다음으로 본다.
4. 필요할 때만 내부 구현을 확인한다.

### 12.3 위험요소 및 대응
- 문서와 코드가 어긋날 수 있다: 공개 API 변경 시 문서를 같이 갱신한다.
- 상태 파일 포맷이 늘어날 수 있다: 버전 필드를 유지한다.
- 초보자가 약어를 어려워할 수 있다: 2장 용어를 반복 참조한다.
