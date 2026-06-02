# OMX 외부 API 명세서 (Electron Desktop 연동 기준)

## 0. 문서 정보
- 작성 목적: `omx-api-명세서.md` 중 Electron Desktop (`Electron\src`, Main/Renderer 프로세스, UI 컴포넌트) 아키텍처 연동에 직접적으로 사용되는 외부 API SSOT 추출
- 대상 범위: IPC 채널, Main/Renderer 브리지, UI 컴포넌트 표면, 데스크탑 상태 및 서비스(State, Services, Logs) API


## 1. IPC / Main 브리지 (Main ↔ Renderer 통신)

Electron Preload 스크립트를 통해 Renderer 프로세스(`window.electronAPI`)에 노출되는 공식 IPC 채널 및 엔드포인트입니다.

| API | 정의 | 입력 타입 | 출력 타입 | 사용법 / 예시 |
|---|---|---|---|---|
| `window.electronAPI` | Renderer에 노출된 공식 브리지 | `channel payload` | `invoke result / event payload` | `window.electronAPI.startAgentStream(...)` |
| `adapter-ipc` | 어댑터 상태 채널 | `invoke payload` | `{ok:boolean,data?:AdapterInfo,error?:string}` | `electronAPI.probeAdapter("openclaw")` |
| `cli-ipc` | CLI 연동 채널 | `args:string[]` | `CliEnvelope` | `electronAPI.cliExec(["doctor"])` |
| `env-ipc` | 환경 점검 채널 | `invoke payload` | `EnvStatus` | 채널: `env_status_get` / `env_status_refresh`; Gemini 키: `electronAPI.geminiKey.save/clear/getStatus` |
| `event-broadcast-ipc` | 훅 이벤트 브로드캐스트 채널 | `logsDir:string` | `HookEvent` | 구독: `omx:hook-stream:start(logsDir)` → 수신: `omx:runtime-hook-event` / `omx:runtime-hook-event:priority` |
| `interlude-ipc` | interlude 채널 | `event/invoke` | `InterludeResult` | `electronAPI.sendInterludeAck(ack)` |
| `ops-ipc` | 운영 진단 채널 (Main 내부) | `invoke payload` | `DriftReport` | 채널: `omx:ops-drift-check` / `omx:ops-state-clear` / `omx:ops-setup-resync`; 브로드캐스트: `omx:drift-report` / `omx:drift-critical` |
| `state-ipc` | 상태 채널 | `invoke/event` | `Lifecycle/Todo payload` | `electronAPI.getLifecycleState()` / `electronAPI.onLifecycleChange(cb)` / `electronAPI.onTodoChange(cb)` |
| `stream-bridge-ipc` | 스트림 채널 | `invoke/event` | `Token/Thinking/Tool/Done/Error payload` | 시작: `electronAPI.startAgentStream(payload)`; 브로드캐스트 채널: `omx:stream-token`, `omx:stream-thinking`, `omx:stream-tool-call`, `omx:stream-tool-result`, `omx:stream-done`, `omx:stream-error` |
| `task-ipc` | 태스크 생명주기 채널 (**Main 내부 서비스 — window.electronAPI 미노출**) | `invoke payload` | `TaskData` | 채널: `task:read`, `task:claim`, `task:release`, `task:transition`; 브로드캐스트: `task:claim-conflict`, `task:status-changed`, `task:invalid-transition` |

---

## 2. Components / Renderer (UI 화면 계층)

Electron Renderer(`src/renderer`) 화면 렌더링 및 UI 조합에 사용되는 React 컴포넌트 및 인터페이스입니다.

### 2.1 주요 UI 컴포넌트
| API (Component) | 정의 | 입력 (Props) | 출력 |
|---|---|---|---|
| `ChatContainer` | 채팅 주 컴포넌트 | `props:ChatContainerProps` | `ReactElement` |
| `LifecycleDashboard` | 실행 상태 패널 | `props:LifecycleDashboardProps` | `ReactElement` |
| `TodoPanel` | 할일 패널 | `props:TodoPanelProps` | `ReactElement` |
| `TaskTimeline` | 작업 타임라인 | `props:TaskTimelineProps` | `ReactElement` |
| `ModelSelector` | 모델 선택기 | `props:ModelSelectorProps` | `ReactElement` |
| `ApiKeySettings` | API 키 설정 UI | `props:ApiKeySettingsProps` | `ReactElement` |
| `AdapterStatusBar` | 어댑터 상태 바 | `props:AdapterStatusBarProps` | `ReactElement` |
| `KnowledgePanel` | 지식 탐색 패널 | `props:KnowledgePanelProps` | `ReactElement` |
| `ErrorGuideOverlay` | 오류 가이드 오버레이 | `props:ErrorGuideOverlayProps` | `ReactElement` |
| `DeferredSkillsNotice` | 지연 스킬 안내 | `props:DeferredSkillsNoticeProps` | `ReactElement` |
| `WikiOverlay` | 위키 오버레이 | `props:WikiOverlayProps` | `ReactElement` |

### 2.2 컴포넌트 내부 인터페이스/상태
| API | 정의 | 파라미터 / 타입 | 반환 / 목적 |
|---|---|---|---|
| `ChatContainer.onSendMessage(text)` | 메시지 전송 콜백 | `text:string` | 상위에서 start stream 호출 (`void`) |
| `ChatContainer.selectedModel` | 선택 모델 props | `modelId:string` | 모델 상태 바인딩 |
| `ChatContainer.onModelChange(modelId)` | 모델 변경 콜백 | `modelId:string` | 모델 선택기 연결 (`void`) |
| `LifecycleDashboard.defaultOpen` | 초기 열림 여부 | `boolean` | 최초 렌더 정책 |
| `LifecycleDashboard.stateDir` | 상태 디렉터리 참조 (선택적) | `string?` | 제공 시 해당 경로로 워처 시작; 미제공 시 Main 프로세스가 `~/.omx/state` 기본값으로 자동 시작 |

---

## 3. State / Services / Logs (상태 및 데이터 동기화)

Electron Main 프로세스가 파일 시스템 및 데이터 스토어를 관리하여 Renderer로 상태를 제공하거나 상태 전이를 처리할 때 사용하는 SSoT API입니다.

### 3.1 상태 조회 및 동기화 (State)
| API | 정의 | 입력 타입 | 출력 타입 | 예시 |
|---|---|---|---|---|
| `executeStateOperation` | state 명령 실행 통합 엔트리 | `name:string, rawArgs:unknown` | `unknown` | `executeStateOperation("state_read",args)` |
| `listActiveStateModes` | 활성 모드 조회 (HUD/UI) | `wd?:string, explicitSessionId?:string` | `string[]` | `listActiveStateModes(cwd,sid)` |
| `listStateStatuses` | 상세 상태 목록 조회 | `cwd:string, explicitSessionId?:string...` | `StateStatus[]` | `listStateStatuses(cwd,sid,"team")` |

### 3.2 태스크 및 키 관리 (Services)
| API | 정의 | 입력 타입 | 출력 타입 | 예시 |
|---|---|---|---|---|
| `readTask(taskId)` | 태스크 읽기 | `taskId:string` | `Promise<TaskData>` | `await readTask(id)` |
| `claimTask(taskId, version)` | 태스크 선점 (Claim) | `taskId:string, version:number` | `Promise<void>` | `await claimTask(id,v)` |
| `releaseTaskClaim(taskId)` | 선점 해제 (Release) | `taskId:string` | `Promise<void>` | `await releaseTaskClaim(id)` |
| `transitionTaskStatus` | 작업 상태 전이 | `taskId, current, target, resultData?` | `Promise<unknown>` | `await transitionTaskStatus(id,"in_progress",...)` |
| `InvalidTransitionError` | 금지 전이 오류 타입 | `N/A` | `Error class` | `if (e instanceof InvalidTransitionError)` |
| `saveGeminiApiKey(plaintext)` | Gemini 키 저장 (safeStorage) | `plaintext:string` | `void` | `saveGeminiApiKey(key)` |
| `loadGeminiApiKey()` | Gemini 키 로드 | `void` | `string \| null` | `const key = loadGeminiApiKey()` |
| `isValidGeminiKeyFormat(key)` | 키 형식 유효성 검사 | `key:string` | `boolean` | `if (isValidGeminiKeyFormat(key))` |

### 3.3 로깅 및 이벤트 브로드캐스팅 (Logs)
| API | 정의 | 타입 / 파라미터 | 목적 / 예시 |
|---|---|---|---|
| `dispatch(rawLine, broadcast)` | hook 라인 디스패치 | `rawLine:string, broadcast:Function` | schema 검증 후 IPC 채널 전송 |
| `HOOK_IPC_CHANNEL` | 일반 훅 채널 상수 | `"omx:runtime-hook-event"` | 일반 이벤트 브로드캐스트 채널명 |
| `HOOK_IPC_PRIORITY_CHANNEL` | 우선 훅 채널 상수 | `"omx:runtime-hook-event:priority"` | 우선 이벤트(needs-input, pre/post-tool-use) 전용 채널명 |

---

## 4. Core / CLI (명령 실행 엔진)

Electron이 외부 OMX 프로세스를 Spawning하거나 스트림 이벤트를 분해할 때 사용하는 기반 API입니다.

| API | 정의 | 입력 타입 | 출력 타입 | 예시 |
|---|---|---|---|---|
| `execute-command` | 외부 프로세스 비동기 실행 | `ExecuteCommandInput + cb` | `ChildProcessHandle` | `executeCommand({command:"omx",args:["doctor"]}, cb)` |
| `onEnvelope` | 파싱 성공 라인 콜백 | `envelope:object` | `void` | JSON 라인(상태/이벤트) 처리 |
| `onRawLine` | 파싱 실패 라인 콜백 | `line:string` | `void` | 원문 스트림 로그 처리 |
| `onDone` | 종료 콜백 | `exitCode:number, signal?:string`| `void` | 실행 완료 처리 |
| `onError` | 오류 콜백 | `error:Error` | `void` | 실행 오류 처리 |
| `omx <command>` | CLI 엔트리 포인트 | `argv:string[]` | `number (exitCode)` | `omx state state_get_status` |
| `launch` | 실행 환경 시작 (direct/tmux) | `flags:object` | `LaunchResult` | `omx launch --spark` |
| `exec` | 단발 실행 (Command) | `task:string` | `ExecResult` | `omx exec "analyze"` |
| `api` | API 하위 명령군 | `subcommand` | `ApiResult` | `omx api ...` |

[OMX 참고 문서]
Electron\design\omx\omx-api-명세서-v2.md
한글해석본\docs\codex-native-hooks-ko.md
한글해석본\docs\contracts\multi-state-transition-review-ko.md
한글해석본\docs\discord-integration-ko.md
한글해석본\docs\interop-team-mutation-contract-ko.md
한글해석본\docs\interop-team-mutation-contract-ko.md
한글해석본\docs\migration-mainline-post-v0.4.4-ko.md
한글해석본\docs\release\release-notes-0.8.1-ko.md
