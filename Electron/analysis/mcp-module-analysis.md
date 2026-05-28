# src/mcp/ 모듈 분석

> 작성일: 2026-05-28  
> 대상: `src/mcp/` (11개 소스 파일 + `__tests__/` 14개 테스트)  
> 목적: OMX 퍼스트파티 MCP 서버군의 구조·역할·호출관계 파악

---

## 1. 폴더 구조

```
src/mcp/
├── bootstrap.ts              # 공통 생명주기 관리 (자동 시작·와치독)
├── state-paths.ts            # 상태 파일 경로 해결 + 보안 정책
├── lifecycle-telemetry.ts    # 생명주기 이벤트 NDJSON 로그 기록
├── memory-validation.ts      # notepad_prune 입력값 검증 유틸
│
├── state-server.ts           # [MCP] omx-state    — 워크플로우 상태 관리
├── memory-server.ts          # [MCP] omx-memory   — 프로젝트 메모리·노트패드
├── code-intel-server.ts      # [MCP] omx-code-intel — LSP 진단·심볼·AST 검색
├── trace-server.ts           # [MCP] omx-trace    — 에이전트 흐름 트레이스
├── wiki-server.ts            # [MCP] omx-wiki     — 프로젝트 지식 위키
├── hermes-server.ts          # [MCP] omx-hermes   — 세션 코디네이션 브릿지
├── hermes-bridge.ts          # hermes-server 핸들러 구현체 (비즈니스 로직)
│
└── __tests__/
    ├── bootstrap.test.ts
    ├── code-intel-server.test.ts
    ├── hermes-bridge.test.ts
    ├── memory-server.test.ts
    ├── memory-validation.test.ts
    ├── path-traversal.test.ts
    ├── server-lifecycle.test.ts
    ├── state-paths.test.ts
    ├── state-server-ralph-phase.test.ts
    ├── state-server-schema.test.ts
    ├── state-server-team-tools.test.ts
    ├── state-server.test.ts
    ├── trace-server.test.ts
    └── wiki-server.test.ts
```

---

## 2. 시스템 개요

```
                 ┌──────────────────────────────────────┐
                 │       MCP 클라이언트 (Codex App)      │
                 └────────────┬─────────────────────────┘
                              │ stdio (JSON-RPC / MCP)
          ┌───────────────────┼───────────────────────────────┐
          │                   │                               │
   ┌──────▼──────┐   ┌────────▼──────┐   ┌───────────────────▼─┐
   │ omx-state   │   │  omx-memory   │   │  omx-code-intel     │
   │ state-server│   │ memory-server │   │ code-intel-server   │
   └─────────────┘   └───────────────┘   └─────────────────────┘
          │                                       │
   ┌──────▼──────┐   ┌────────────┐   ┌──────────▼──────────┐
   │  omx-trace  │   │  omx-wiki  │   │     omx-hermes      │
   │trace-server │   │ wiki-server│   │  hermes-server      │
   └─────────────┘   └────────────┘   └─────────────────────┘
          │                  │                    │
          └──────────────────┼────────────────────┘
                             │ 공통 인프라
                  ┌──────────┼──────────┐
                  │          │          │
           ┌──────▼──┐  ┌────▼─────┐ ┌─▼───────────────┐
           │bootstrap│  │state-    │ │lifecycle-        │
           │  .ts    │  │paths.ts  │ │telemetry.ts      │
           └─────────┘  └──────────┘ └──────────────────┘
```

6개 MCP 서버는 모두 독립 Node.js 프로세스로 실행되며, `bootstrap.ts`의 `autoStartStdioMcpServer()`를 통해 자동 시작된다. 각 서버는 `stdio` 트랜스포트로 MCP 클라이언트와 JSON-RPC 방식으로 통신한다.

---

## 3. 공통 인프라 파일

### 3.1 `bootstrap.ts`

**역할**: 6개 MCP 서버 전체가 공유하는 생명주기 관리 단일 진입점

| 타입/함수 | 설명 |
|---|---|
| `McpServerName` | `'state' \| 'memory' \| 'code_intel' \| 'trace' \| 'wiki' \| 'hermes'` |
| `autoStartStdioMcpServer(name, server)` | 환경변수 확인 후 stdio 트랜스포트에 서버 연결 + 와치독 시작 |
| `shouldAutoStartMcpServer(name)` | 전역/서버별 비활성화 환경변수 확인 |
| `listProcessTable()` | OS별 프로세스 테이블 읽기 (macOS·Linux: `ps`, Windows: WMI/PowerShell) |
| `parseProcessTable()` | POSIX `ps` 출력 파싱 |
| `parseWindowsProcessTable()` | WMI JSON 출력 파싱 |
| `extractMcpEntrypointMarker()` | 커맨드에서 `*-server.{js,ts}` 패턴 추출 |
| `resolveCurrentMcpEntrypointMarker()` | 현재 프로세스의 엔트리포인트 마커 결정 |
| `analyzeDuplicateSiblingState()` | 같은 부모 PID + 같은 엔트리포인트 중복 형제 분석 |
| `shouldSelfExitForDuplicateSibling()` | 중복 형제 감지시 자기 종료 여부 결정 |
| `shouldSelfExitForPreTrafficSiblingHardCap()` | 최대 형제 수 초과시 즉시 종료 결정 |
| `isParentProcessAlive(pid)` | 부모 프로세스 생존 여부 확인 |
| `resolveDuplicateSiblingWatchdogInitialDelayMs()` | 서버별 해시 기반 초기 지연 계산 (충돌 방지) |

**와치독 구조 (autoStartStdioMcpServer 내부)**:
```
bootstrap 시작
    ├── 부모 PID 와치독 (setInterval, 1초)
    │     └── 부모 종료 감지 → shutdown('parent_gone')
    └── 중복 형제 와치독 (setInterval, 5초, 초기 지연 후 시작)
          ├── 프로세스 테이블 스캔
          ├── 'older_duplicate' 감지시:
          │     ├── 트래픽 전 하드캡 초과 → shutdown('superseded_hard_cap_pre_traffic')
          │     └── 유휴 타임아웃 경과 → shutdown('superseded_duplicate_*')
          └── 정상시 watchdog 계속 유지
```

**환경변수**:
| 변수 | 기능 |
|---|---|
| `OMX_MCP_SERVER_DISABLE_AUTO_START` | 전역 자동 시작 비활성화 |
| `OMX_<SERVER>_SERVER_DISABLE_AUTO_START` | 서버별 비활성화 |
| `OMX_MCP_TRANSPORT_DEBUG` | 생명주기 디버그 로그 활성화 |
| `OMX_MCP_ENTRYPOINT_MARKER` | 엔트리포인트 마커 명시 |
| `OMX_MCP_PARENT_WATCHDOG_INTERVAL_MS` | 부모 와치독 주기 (기본 1000ms) |
| `OMX_MCP_DUPLICATE_SIBLING_WATCHDOG_INTERVAL_MS` | 형제 와치독 주기 (기본 5000ms) |
| `OMX_MCP_MAX_SIBLINGS_PER_ENTRYPOINT` | 최대 허용 형제 수 (기본 4) |

---

### 3.2 `state-paths.ts`

**역할**: 상태 파일 경로 해결과 보안 검증(Path Traversal 방지)의 단일 책임 모듈

| 함수/타입 | 설명 |
|---|---|
| `resolveWorkingDirectoryForState(wd?)` | 작업 디렉토리 해결 + 정책 적용 (NUL 바이트·경로 분리·WSL/Windows 변환) |
| `enforceWorkingDirectoryPolicy(path)` | `OMX_MCP_WORKDIR_ROOTS` 허용 목록 외 경로 거부 |
| `getBaseStateDir(wd?)` | `.omx/state/` 기본 경로 (OMX_ROOT, OMX_TEAM_STATE_ROOT 오버라이드 지원) |
| `getStateDir(wd?, sessionId?)` | 세션 스코프 포함 상태 디렉토리 경로 |
| `getStatePath(mode, wd?, sessionId?)` | `{mode}-state.json` 절대 경로 |
| `getStateFilePath(fileName, wd?, sessionId?)` | 임의 상태 파일 절대 경로 |
| `resolveStateScope(wd?, sessionId?)` | 명시적/세션/루트 스코프 결정 → `ResolvedStateScope` |
| `readCurrentSessionId(wd?)` | 환경변수 → 세션 상태 파일 순으로 현재 세션 ID 탐색 |
| `listModeStateFilesWithScopePreference(wd, sessionId?)` | 스코프 우선순위에 따른 모드 상태 파일 목록 |
| `getAllSessionScopedStateDirs(wd)` | 전체 세션 스코프 상태 디렉토리 목록 |
| `validateSessionId(id)` | `/^[A-Za-z0-9_-]{1,64}$/` 패턴 검증 |
| `validateStateModeSegment(mode)` | 모드 이름 검증 (경로 분리자·`..` 거부) |
| `validateStateFileName(name)` | 파일명 검증 |

**보안 중점 사항**:
- NUL 바이트 포함 경로 거부
- `..` 포함 모드/파일명 거부
- 경로 분리자 포함 모드/파일명 거부
- `OMX_MCP_WORKDIR_ROOTS` 허용 목록 밖 경로 거부
- Windows ↔ WSL 경로 상호 변환 지원

---

### 3.3 `lifecycle-telemetry.ts`

**역할**: MCP 서버 생명주기 이벤트를 NDJSON 로그 파일에 기록

| 함수 | 설명 |
|---|---|
| `writeMcpLifecycleTelemetry(event, env?)` | 이벤트를 NDJSON 형식으로 로그 파일에 append |
| `resolveMcpLifecycleLogDir(env, home, platform)` | OS별 로그 디렉토리 결정 |
| `resolveMcpLifecycleLogFile(server, entrypoint, env?)` | 서버별 로그 파일 경로 결정 |

**로그 저장 위치**:
| OS | 경로 |
|---|---|
| macOS | `~/Library/Logs/oh-my-codex/mcp/` |
| Windows | `%LOCALAPPDATA%\oh-my-codex\Logs\mcp\` |
| Linux | `~/.local/state/oh-my-codex/mcp/` |

- 로그 파일: `{server-entrypoint}.ndjson`
- 로테이션: 4MB 초과시 `.1`, `.2` 방식으로 교체
- `OMX_MCP_LIFECYCLE_LOG=0` 으로 비활성화 가능
- `OMX_MCP_LIFECYCLE_LOG_DIR`로 로그 경로 커스텀 설정 가능

---

### 3.4 `memory-validation.ts`

**역할**: `notepad_prune` 도구의 `daysOld` 파라미터 검증 유틸

```typescript
parseNotepadPruneDaysOld(value, defaultDays = 7)
  // 반환: { ok: true, days: number } | { ok: false, error: string }
  // 검증: undefined/null → 기본값, 음수·소수·비정수 → 오류
```

---

## 4. MCP 서버별 상세

### 4.1 `state-server.ts` — **omx-state**

**역할**: OMX 워크플로우 모드 상태(autopilot, ralph, team 등)의 CRUD 제공

**저장소**: `.omx/state/{mode}-state.json` (세션 스코프: `.omx/state/sessions/{id}/{mode}-state.json`)

**지원 모드**:
```
autopilot | autoresearch | team | ralph | ultrawork | ultraqa | ralplan | deep-interview | skill-active
```

**MCP 도구 목록**:

| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `state_read` | 특정 모드 상태 읽기 | `mode` |
| `state_write` | 특정 모드 상태 쓰기/갱신 | `mode` |
| `state_clear` | 특정 모드 상태 삭제 | `mode` |
| `state_list_active` | 현재 활성 모드 목록 | — |
| `state_get_status` | 특정 모드/전체 모드 상태 상세 조회 | — |

**`state_write` 주요 필드**:
```
active, iteration, max_iterations, current_phase, task_description,
started_at, completed_at, run_outcome, lifecycle_outcome,
terminal_outcome (legacy), error, state (custom fields)
```

**`run_outcome` 값**: `continue | finish | blocked_on_user | failed | cancelled`  
**`lifecycle_outcome` 값**: `finished | blocked | failed | userinterlude | askuserQuestion`

**레거시 팀 커뮤니케이션 도구**: `LEGACY_TEAM_MCP_TOOLS`에 등록된 도구명은 `deprecated_cli_only` 오류로 차단

**내부 호출**: 실제 읽기/쓰기는 `state/operations.ts`의 `executeStateOperation()`에 위임

---

### 4.2 `memory-server.ts` — **omx-memory**

**역할**: 프로젝트 메모리(장기 기억)와 세션 노트패드(단기 기억)의 퍼시스턴트 저장소 제공

**저장소**:
- 프로젝트 메모리: `.omx/project-memory.json`
- 노트패드: `.omx/notepad.md` (3섹션: PRIORITY / WORKING / MANUAL)

**MCP 도구 목록**:

#### 프로젝트 메모리 도구
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `project_memory_read` | 전체 또는 특정 섹션 읽기 | — |
| `project_memory_write` | 메모리 쓰기 (replace 또는 merge) | `memory` |
| `project_memory_add_note` | 카테고리별 노트 추가 | `category`, `content` |
| `project_memory_add_directive` | 지속적 디렉티브 추가 | `directive` |

**`project_memory_read` 섹션**: `all | techStack | build | conventions | structure | notes | directives`  
**`project_memory_add_note` 카테고리**: `build | test | deploy | env | architecture`  
**`project_memory_add_directive` 우선순위**: `high | normal`

#### 노트패드 도구
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `notepad_read` | 전체 또는 특정 섹션 읽기 | — |
| `notepad_write_priority` | PRIORITY 섹션 쓰기 (최대 500자) | `content` |
| `notepad_write_working` | WORKING 섹션에 타임스탬프 엔트리 추가 | `content` |
| `notepad_write_manual` | MANUAL 섹션에 엔트리 추가 (자동 삭제 없음) | `content` |
| `notepad_prune` | N일 이상 된 WORKING 엔트리 삭제 (기본 7일) | — |
| `notepad_stats` | 노트패드 통계 (크기, 엔트리 수, 최고령 엔트리) | — |

**원자적 쓰기**: `notepad.tmp.{pid}` 임시 파일 후 `rename()` 방식

---

### 4.3 `code-intel-server.ts` — **omx-code-intel**

**역할**: 전체 LSP 프로토콜 없이 CLI 래퍼 기반 코드 인텔리전스 제공 (진단·심볼·AST 검색)

**진단 구현**: `npx tsc --noEmit --pretty false` 출력 파싱  
**심볼 추출**: 정규식 기반 (`SYMBOL_PATTERNS` — TS/JS/Python/Go/Rust 지원)  
**AST 검색**: `sg` / `ast-grep` / `npx @ast-grep/cli` 바이너리 래퍼

**MCP 도구 목록**:

#### LSP 도구
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `lsp_diagnostics` | 파일 단위 진단 (tsc wrapper) | `file` |
| `lsp_diagnostics_directory` | 프로젝트 단위 진단 | `directory` |
| `lsp_document_symbols` | 파일 내 심볼 계층 목록 | `file` |
| `lsp_workspace_symbols` | 워크스페이스 전체 심볼 검색 | `query`, `file` |
| `lsp_hover` | 특정 위치 타입 정보 (정규식 근사) | `file`, `line`, `character` |
| `lsp_find_references` | 심볼 참조 위치 검색 (grep 기반) | `file`, `line`, `character` |
| `lsp_servers` | 진단 백엔드 목록 및 설치 상태 | — |

#### AST-grep 도구
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `ast_grep_search` | AST 메타변수 패턴 검색 | `pattern`, `language` |
| `ast_grep_replace` | AST 패턴 교체 (기본 dryRun=true) | `pattern`, `replacement`, `language` |

**지원 언어**: `javascript | typescript | tsx | python | ruby | go | rust | java | kotlin | swift | c | cpp | csharp | html | css | json | yaml`

**tsc 파싱 포맷**: `src/foo.ts(10,5): error TS2304: ...`

---

### 4.4 `trace-server.ts` — **omx-trace**

**역할**: 에이전트 실행 흐름 기록을 읽어 타임라인·통계 제공

**읽기 경로**: `.omx/logs/turns-*.jsonl` (notify 훅이 생성), `.omx/metrics.json`

**MCP 도구 목록**:

| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `trace_timeline` | 에이전트 흐름 타임라인 (턴 + 모드 전환 혼합) | — |
| `trace_summary` | 집계 통계 (턴 수·모드 사용·토큰 소비·시간) | — |

**`trace_timeline` 파라미터**:
- `last`: 최신 N개 엔트리만 반환
- `filter`: `all | turns | modes` (기본: all)
- `workingDirectory`: 작업 디렉토리 오버라이드

**내부 구현 함수**:
- `iterateLogEntries(logsDir)`: JSONL 파일 스트리밍 제너레이터
- `readLogFiles(logsDir, last?)`: 전체 또는 최신 N개 트레이스 엔트리
- `summarizeLogFiles(logsDir)`: 집계 통계 (타입별 카운트, 최초/최후 타임스탬프)
- `readModeEvents(wd)`: 상태 파일에서 모드 시작/종료 이벤트 추출
- `readMetrics(omxDir)`: 토큰 소비·세션 턴 수 읽기

---

### 4.5 `wiki-server.ts` — **omx-wiki**

**역할**: 프로젝트 내 구조화된 지식 위키의 CRUD 및 검색 제공

**저장소**: `.omx/omx_wiki/` (레거시 폴백: `.omx/wiki/`)  
**외부 의존**: `../wiki/index.js` 모듈 (실제 위키 파일 조작)

**위키 카테고리**: `architecture | decision | pattern | debugging | environment | session-log | reference | convention`

**MCP 도구 목록**:

| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `wiki_ingest` | 지식을 위키 페이지로 처리 (새 생성 또는 기존 병합) | `title`, `content`, `tags`, `category` |
| `wiki_query` | 키워드·태그·카테고리로 위키 검색 | `query` |
| `wiki_lint` | 위키 헬스 체크 | — |
| `wiki_add` | 신규 위키 페이지 빠른 추가 (덮어쓰기 거부) | `title`, `content` |
| `wiki_list` | 위키 페이지 목록 + 인덱스 반환 | — |
| `wiki_read` | 특정 위키 페이지 읽기 | `page` |
| `wiki_delete` | 위키 페이지 삭제 + 인덱스 갱신 | `page` |
| `wiki_refresh` | 위키 인덱스 재빌드 + 파생 메타데이터 갱신 | — |

**`wiki_ingest` 파라미터 세부**:
- `tags`: 최대 20개, 각 최대 50자
- `content`: 최대 50,000자
- `confidence`: `high | medium | low`
- `sources`: 최대 10개 출처

**레거시 폴백**: `isLegacyWikiFallbackActive(root)` 가 true이면 `wiki_refresh`는 읽기 전용으로 동작

---

### 4.6 `hermes-server.ts` — **omx-hermes**

**역할**: 외부 MCP 클라이언트가 OMX 세션을 관찰·조종·질문에 응답할 수 있는 코디네이션 브릿지

**설계 원칙**: 모든 변형 도구는 `allow_mutation: true` 필수 (명시적 가드)

**MCP 도구 목록**:

#### 읽기 도구
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `hermes_list_sessions` | 현재 워크트리의 OMX 세션 목록 | — |
| `hermes_read_status` | 선택된 세션/모드 상태 JSON 읽기 | — |
| `hermes_read_tail` | 세션 히스토리 로그 테일 (기본 80줄, 최대 500줄) | — |
| `hermes_list_question_events` | 질문 생명주기 이벤트 목록 | — |
| `hermes_list_questions` | 구조화된 질문 레코드 목록 (status 필터 가능) | — |
| `hermes_list_artifacts` | `.omx/plans/specs/goals/context/reports/` 아티팩트 목록 | — |
| `hermes_read_artifact` | 안전한 아티팩트 파일 읽기 (최대 128KB) | `path` |

#### 변형 도구 (`allow_mutation: true` 필수)
| 도구명 | 설명 | 필수 파라미터 |
|---|---|---|
| `hermes_start_session` | 새 격리된 OMX tmux 세션 시작 | `workingDirectory`, `prompt`, `allow_mutation` |
| `hermes_send_prompt` | 선택된 세션에 프롬프트 큐 추가 | `session_id`, `prompt`, `allow_mutation` |
| `hermes_submit_question_answer` | 구조화된 질문에 답변 제출 | `question_id`, `allow_mutation` |
| `hermes_report_status` | 상태 보고 (running/blocked/failed/complete) | `status`, `allow_mutation` |

**아티팩트 허용 경로**: `.omx/plans/`, `.omx/specs/`, `.omx/goals/`, `.omx/context/`, `.omx/reports/`

---

### 4.7 `hermes-bridge.ts`

**역할**: `hermes-server.ts`의 MCP 핸들러가 실제 로직을 위임하는 구현체

**주요 타입**:
```typescript
HermesBridgeFailureCode  // 실패 코드 열거 (11종)
HermesBridgeResult<T>    // { ok, code?, error?, data? }
HermesSessionSummary     // 세션 요약
HermesStatusSessionSummary  // 상태 세션 요약
HermesModeStatusSummary  // 모드 상태 요약
HermesQuestionSummary    // 질문 레코드 투영
HermesBridgeDeps         // 의존성 주입 인터페이스 (테스트용)
```

**내보낸 함수 (hermes-server에서 호출)**:
```
hermesListSessions, hermesStartSession, hermesSendPrompt,
hermesReadStatus, hermesReadTail, hermesListQuestionEvents,
hermesListQuestions, hermesSubmitQuestionAnswer,
hermesListArtifacts, hermesReadArtifact, hermesReportStatus
```

**외부 의존 주입 (`HermesBridgeDeps`)**:
- `readUsableSessionState`: 세션 상태 읽기 (테스트에서 모킹)
- `spawnProcess`: tmux 세션 시작 (테스트에서 모킹)
- `resolveOmxCliEntryPath`: CLI 진입점 경로 결정
- `injectExecFollowup`: exec 후속 처리 주입
- `now`: 현재 시각 (테스트에서 모킹)

---

## 5. 모듈 간 호출관계

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP 서버 레이어                               │
│                                                                     │
│  state-server ──────→ state/operations.ts (executeStateOperation)  │
│       │                team/api-interop.ts (LEGACY_TEAM_MCP_TOOLS) │
│       │                                                             │
│  memory-server ─────→ memory-validation.ts (parseNotepadPruneDaysOld)│
│       │                                                             │
│  code-intel-server  (외부 CLI만 사용: tsc, ast-grep)                │
│       │                                                             │
│  trace-server ──────→ (로그 파일 직접 읽기)                          │
│       │                                                             │
│  wiki-server ───────→ wiki/index.ts (ingestKnowledge, queryWiki 등)│
│       │                                                             │
│  hermes-server ─────→ hermes-bridge.ts (모든 핸들러 위임)           │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ 공통 임포트
          ┌──────────────────┼──────────────────────┐
          ▼                  ▼                      ▼
   bootstrap.ts         state-paths.ts      lifecycle-telemetry.ts
   (자동 시작)          (경로 해결)          (텔레메트리 기록)

┌─────────────────────────────────────────────────────────────────────┐
│                      hermes-bridge.ts 외부 의존                     │
│                                                                     │
│  hermes-bridge ─────→ state-paths.ts (경로·스코프 해결)             │
│       │                hooks/session.ts (세션 상태)                 │
│       │                question/events.ts (질문 이벤트)             │
│       │                question/state.ts (질문 CRUD)               │
│       │                exec/followup.ts (exec 후속 주입)            │
│       │                utils/paths.ts (CLI 경로)                   │
│       └───────────────utils/safe-json.ts (안전한 JSON 파싱)         │
└─────────────────────────────────────────────────────────────────────┘
```

**`bootstrap.ts` 의존**:
- `config/omx-first-party-mcp.ts` — 퍼스트파티 MCP 엔트리포인트 해결
- `lifecycle-telemetry.ts` — 생명주기 이벤트 기록

**`state-paths.ts` 의존**:
- `hooks/session.ts` — `isSessionStateUsable`, `readUsableSessionState`

**서버별 공통 임포트 패턴**:
```typescript
// 모든 MCP 서버가 공유하는 임포트
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { autoStartStdioMcpServer } from './bootstrap.js';
// state-paths를 쓰는 서버 (memory, trace, wiki, hermes-bridge)
import { resolveWorkingDirectoryForState } from './state-paths.js';
```

---

## 6. CLI에서의 MCP 서버 로딩 경로

```
omx.ts (CLI 진입점)
  └── mcp-serve.ts (cli/mcp-serve.ts)
        └── 동적 import()
              ├── mcp/state-server.js     → omx-state
              ├── mcp/memory-server.js    → omx-memory
              ├── mcp/code-intel-server.js → omx-code-intel
              ├── mcp/trace-server.js     → omx-trace
              ├── mcp/wiki-server.js      → omx-wiki
              └── mcp/hermes-server.js    → omx-hermes
```

각 서버 파일 로드 시 모듈 최하단의 `autoStartStdioMcpServer(name, server)` 호출이 자동으로 실행된다.

---

## 7. 외부 연동

| 연동 대상 | 방향 | 연동 방법 | 비고 |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | 의존 | npm 패키지 | MCP JSON-RPC 프레임워크 |
| `tsc` (TypeScript 컴파일러) | 호출 | `execFile('npx', ['tsc', ...])` | code-intel-server |
| `ast-grep` / `sg` | 호출 | `execFile(bin, ...)` | code-intel-server, npm fallback 지원 |
| PowerShell / WMI | 호출 | `execFileSync('powershell.exe', ...)` | bootstrap (Windows 전용) |
| `ps` (POSIX) | 호출 | `execFileSync('ps', ['axww', ...])` | bootstrap (macOS/Linux) |
| `tmux` | spawn | `spawn(omx-cli, ...)` | hermes-bridge (`hermesStartSession`) |
| `hooks/session.ts` | 의존 | 내부 모듈 | 세션 상태 읽기 |
| `state/operations.ts` | 의존 | 내부 모듈 | state-server 실제 CRUD |
| `wiki/index.ts` | 의존 | 내부 모듈 | wiki-server 파일 조작 |
| `question/events.ts` | 의존 | 내부 모듈 | hermes-bridge 질문 이벤트 |
| `question/state.ts` | 의존 | 내부 모듈 | hermes-bridge 질문 CRUD |
| `exec/followup.ts` | 의존 | 내부 모듈 | hermes-bridge exec 후속 처리 |
| `config/omx-first-party-mcp.ts` | 의존 | 내부 모듈 | bootstrap 엔트리포인트 해결 |

---

## 8. 상태 저장소 구조 (.omx/)

```
{workingDirectory}/
└── .omx/
    ├── state/                          # state-server 저장소
    │   ├── {mode}-state.json           # 루트 스코프 상태 (예: ralph-state.json)
    │   ├── session.json                # 현재 세션 메타
    │   └── sessions/
    │       └── {session-id}/
    │           └── {mode}-state.json  # 세션 스코프 상태
    ├── project-memory.json             # memory-server 저장소
    ├── notepad.md                      # memory-server 노트패드
    ├── metrics.json                    # trace-server 토큰 메트릭
    ├── logs/
    │   └── turns-*.jsonl              # trace-server 읽기 원본 (notify 훅 생성)
    ├── omx_wiki/                       # wiki-server 저장소 (신규)
    └── wiki/                           # wiki-server 저장소 (레거시 폴백)
```

---

## 9. 설계 원칙

1. **서버 독립성**: 6개 MCP 서버는 각각 독립 Node.js 프로세스로 실행. 서버 간 직접 호출 없음.
2. **공통 인프라 분리**: 생명주기(`bootstrap.ts`), 경로 해결(`state-paths.ts`), 텔레메트리(`lifecycle-telemetry.ts`)를 서버 로직과 분리.
3. **중복 프로세스 자동 정리**: 동일 엔트리포인트·동일 부모 프로세스를 가진 구형 서버는 와치독이 자동 종료. Codex 재시작 후 좀비 서버 방지.
4. **의존성 주입 설계**: `hermes-bridge.ts`의 `HermesBridgeDeps`, `bootstrap.ts`의 함수 시그니처 파라미터 등 테스트 가능성을 위한 DI 패턴 전용.
5. **Path Traversal 방지**: `state-paths.ts`에서 모든 경로 입력의 `..`·경로 분리자·NUL 바이트를 검증. 허용 목록(`OMX_MCP_WORKDIR_ROOTS`) 외 경로 일괄 거부.
6. **명시적 변형 가드**: `hermes-bridge.ts`의 변형 도구는 모두 `allow_mutation: true` 필드 필수 검증. 실수에 의한 상태 변경 방지.
7. **브릿지 패턴**: `hermes-server.ts`는 MCP 프로토콜 레이어만 담당, 실제 로직은 `hermes-bridge.ts`에 위임. 프로토콜 레이어와 비즈니스 로직 분리.
8. **원자적 파일 쓰기**: `notepad_write_*`는 `.tmp.{pid}` 임시 파일 후 `rename()` 방식으로 중간 상태 손상 방지.
9. **레거시 호환 차단**: `state-server.ts`에서 구형 팀 통신 도구를 hard-deprecated로 처리하고 `deprecated_cli_only` 코드로 즉시 오류 반환.
10. **환경변수 기반 세밀 제어**: 서버별·전역 비활성화, 와치독 인터벌 조정, 로그 위치 커스텀 등 모두 환경변수로 제어 가능.
