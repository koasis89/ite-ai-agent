# oh-my-codex 소스 분석: Codex 설정 및 사용 의존성 맵

이 문서는 `oh-my-codex-js`의 `src` 폴더에서 **Codex 설정 및 사용**과 관련된 소스들 간의 관계, 구현 기능, 데이터 흐름을 상세히 분석한다.

소스 위치: `d:\workspace\ite-ai-codex-js\src\`

> 최신화 메모 (2026-05-25)
> - 이 문서는 Codex/OMX 설정·런타임 계층만 다룬다.
> - Desktop ChatGPT/OpenAI provider(`desktop/main/index.ts`의 `makeOpenAiAdapter`)는 범위 밖이며,
>   별도 문서 `한글해석-분석본/설명문서/dependency-map-desktop-chatgpt-openai.md`에서 다룬다.

---

## 전체목차

- [oh-my-codex 소스 분석: Codex 설정 및 사용 의존성 맵](#oh-my-codex-소스-분석-codex-설정-및-사용-의존성-맵)
  - [전체목차](#전체목차)
  - [1. Codex 통합 개요](#1-codex-통합-개요)
    - [1.1 Codex와 oh-my-codex의 관계](#11-codex와-oh-my-codex의-관계)
    - [1.2 주요 통합 영역](#12-주요-통합-영역)
  - [2. 핵심 모듈 구조](#2-핵심-모듈-구조)
    - [2.1 config/ 모듈 (설정 관리)](#21-config-모듈-설정-관리)
    - [2.2 goal-workflows/ 모듈 (목표 워크플로우)](#22-goal-workflows-모듈-목표-워크플로우)
    - [2.3 hooks/ 모듈 (런타임 주입)](#23-hooks-모듈-런타임-주입)
  - [3. Codex 설정 흐름](#3-codex-설정-흐름)
    - [3.1 config/generator.ts - Config 생성 및 병합](#31-configgeneratorts---config-생성-및-병합)
    - [3.2 config/codex-hooks.ts - 네이티브 훅 관리](#32-configcodex-hooksts---네이티브-훅-관리)
    - [3.3 config/models.ts - Codex 모델 설정](#33-configmodelsts---codex-모델-설정)
  - [4. Codex 런타임 주입](#4-codex-런타임-주입)
    - [4.1 hooks/agents-overlay.ts - AGENTS.md 오버레이](#41-hooksagents-overlayts---agentsmd-오버레이)
    - [4.2 런타임 컨텍스트 주입 마커](#42-런타임-컨텍스트-주입-마커)
  - [5. Codex 목표 상태 관리](#5-codex-목표-상태-관리)
    - [5.1 goal-workflows/codex-goal-snapshot.ts - 목표 스냅샷](#51-goal-workflowscodex-goal-snapshotts---목표-스냅샷)
    - [5.2 goal-workflows/handoff.ts - 목표 핸드오프](#52-goal-workflowshandoffts---목표-핸드오프)
  - [6. 의존성 관계도](#6-의존성-관계도)
  - [7. 주요 인터페이스 정의](#7-주요-인터페이스-정의)
    - [7.1 Config 관련](#71-config-관련)
    - [7.2 목표 관련](#72-목표-관련)
  - [8. 데이터 흐름 및 호출 패턴](#8-데이터-흐름-및-호출-패턴)
    - [8.1 설치 및 초기화 흐름](#81-설치-및-초기화-흐름)
    - [8.2 세션 실행 흐름](#82-세션-실행-흐름)
    - [8.3 목표 동기화 흐름](#83-목표-동기화-흐름)
  - [9. 통합점 및 핵심 기능](#9-통합점-및-핵심-기능)
    - [9.1 설정 통합점](#91-설정-통합점)
    - [9.2 런타임 통합점](#92-런타임-통합점)
    - [9.3 목표 동기화 통합점](#93-목표-동기화-통합점)
    - [9.4 문서 강제 통합점](#94-문서-강제-통합점)
  - [부록: 주요 상수 및 기본값](#부록-주요-상수-및-기본값)
    - [Config 기본값](#config-기본값)
    - [훅 이벤트](#훅-이벤트)
    - [마커 및 제한값](#마커-및-제한값)

---

## 1. Codex 통합 개요

### 1.1 Codex와 oh-my-codex의 관계

**Codex**: 기본 에이전트 플랫폼
- 에이전트 실행 엔진
- 스레드/세션 관리
- 목표(Goal) 시스템
- Config.toml 기반 설정

**oh-my-codex (OMX)**: Codex 위의 오케스트레이션 레이어
- OMX는 Codex 세션 내에서 실행되는 에이전트 조합 시스템
- Codex와의 경계는 **명확한 책임 분리**
- OMX 아티팩트 (워크플로우, 계획, 상태)는 .omx/ 디렉터리에 저장
- Codex 상태 (목표, 스레드, 컨텍스트)는 Codex가 관리

**경계:**
```
┌─────────────────────────────────────────────┐
│ Codex Session (get_goal, create_goal, etc.) │
│  ┌─────────────────────────────────────────┤
│  │ oh-my-codex Runtime (OMX)               │
│  │  ├─ 워크플로우 오케스트레이션            │
│  │  ├─ 팀 멀티플렉싱                       │
│  │  ├─ 스킬 라우팅                         │
│  │  └─ 목표 핸드오프 (Codex 목표와 동기)  │
│  └─────────────────────────────────────────┤
└─────────────────────────────────────────────┘
```

### 1.2 주요 통합 영역

| 영역 | 목적 | 주요 파일 |
|---|---|---|
| **설정** | Config.toml 생성·병합, 훅 등록, 모델 선택 | `config/generator.ts`, `config/codex-hooks.ts`, `config/models.ts` |
| **런타임 주입** | 세션 시작 시 동적 AGENTS.md 오버레이 주입 | `hooks/agents-overlay.ts` |
| **목표 동기화** | Codex 목표와 OMX 워크플로우 상태 일치 | `goal-workflows/codex-goal-snapshot.ts`, `goal-workflows/handoff.ts` |
| **문서 강제** | Codex 네이티브 훅 변경 시 문서 자동 갱신 | `document-refresh/config.ts`, `document-refresh/enforcer.ts` |

---

## 2. 핵심 모듈 구조

### 2.1 config/ 모듈 (설정 관리)

**위치**: `src/config/`

**역할**: Codex의 Config.toml 생성, 파싱, 병합

**주요 파일**:

| 파일 | 기능 | 핵심 함수 |
|---|---|---|
| `generator.ts` | Config 생성·병합·업그레이드 | `mergeCodexConfigToml()`, `upsertOmxConfiguration()` |
| `codex-hooks.ts` | OMX 관리 훅 설정 | `buildManagedCodexHooksConfig()`, `mergeManagedCodexHooksConfig()` |
| `models.ts` | Codex 모델 환경 변수 관리 | `getCodexConfigRootModelProvider()`, `getTeamChildModel()` |
| `mcp-registry.ts` | MCP 서버 레지스트리 관리 | - |

**data flow**:

```
[OMX Installation/Setup]
    ↓
config/generator.ts::mergeCodexConfigToml()
    ├─ Codex Home 설정 로드 (.codex/config.toml)
    ├─ OMX 기본값 병합 (developer_instructions, notify)
    ├─ MCP 서버 등록 (mcp_servers)
    ├─ 훅 신뢰 상태 등록 (codex_hooks = true)
    └─ 반환: 업데이트된 config.toml
    ↓
codex-hooks.ts::buildManagedCodexHooksConfig()
    ├─ 7개 네이티브 훅 이벤트 정의
    │   SessionStart, PreToolUse, PostToolUse, 
    │   UserPromptSubmit, PreCompact, PostCompact, Stop
    └─ 각 훅을 codex-native-hook.js로 연결
    ↓
models.ts::readConfiguredEnvOverrides()
    ├─ CODEX_HOME에서 모델 설정 읽기
    ├─ 환경 변수 오버라이드 수집
    └─ 팀 모드/일반 모드 모델 선택
```

### 2.2 goal-workflows/ 모듈 (목표 워크플로우)

**위치**: `src/goal-workflows/`

**역할**: Codex 목표와 OMX 워크플로우 상태 동기화

**주요 파일**:

| 파일 | 기능 | 핵심 함수 |
|---|---|---|
| `codex-goal-snapshot.ts` | 목표 상태 파싱·검증 | `parseCodexGoalSnapshot()`, `reconcileCodexGoalSnapshot()` |
| `handoff.ts` | 워크플로우 → Codex 목표 핸드오프 | `buildGoalWorkflowHandoff()` |
| `artifacts.ts` | 워크플로우 아티팩트 저장·로드 | `readWorkflowArtifacts()`, `writeWorkflowArtifacts()` |

**data flow**:

```
[Codex 목표 확인]
    ↓
codex-goal-snapshot.ts::readCodexGoalSnapshotInput()
    ├─ --codex-goal-json 플래그로 목표 JSON 또는 경로 수신
    ├─ JSON 파싱 또는 파일 읽기
    └─ parseCodexGoalSnapshot() → CodexGoalSnapshot 인터페이스 변환
    ↓
codex-goal-snapshot.ts::reconcileCodexGoalSnapshot()
    ├─ expectedObjective 검증
    ├─ 상태 (active/complete/cancelled/failed) 검증
    ├─ 토큰 예산 확인
    └─ 반환: CodexGoalReconciliation (오류/경고 포함)
    ↓
[워크플로우 수행]
    ↓
handoff.ts::buildGoalWorkflowHandoff()
    ├─ 워크플로우 상태를 Codex 목표로 변환
    ├─ create_goal/update_goal 페이로드 생성
    └─ 핸드오프 지침 (제약사항, 완료 기준) 생성
```

### 2.3 hooks/ 모듈 (런타임 주입)

**위치**: `src/hooks/`

**역할**: Codex 세션 시작 시 AGENTS.md에 동적 컨텍스트 주입

**주요 파일**:

| 파일 | 기능 | 핵심 함수 |
|---|---|---|
| `agents-overlay.ts` | 런타임 AGENTS.md 오버레이 주입/제거 | `applyAgentsOverlay()`, `stripAgentsOverlay()` |
| `codebase-map.ts` | 코드베이스 구조 맵 생성 | `generateCodebaseMap()` |
| `explore-routing.ts` | 탐색 라우팅 가이던스 생성 | `buildExploreRoutingGuidance()` |

**data flow**:

```
[Codex 세션 시작]
    ↓
agents-overlay.ts::applyAgentsOverlay()
    ├─ CODEX_HOME/AGENTS.md 읽기
    ├─ 세션별 컨텍스트 수집:
    │   ├─ codebase-map.ts::generateCodebaseMap()
    │   ├─ 활성 스킬 상태 읽기
    │   ├─ 프로젝트 메모리 (tech stack, 지침)
    │   ├─ notepad 콘텐츠
    │   └─ 모드 상태 (ralph iteration, autopilot phase)
    ├─ HTML 주석 마커 내에 컨텍스트 주입
    │   <!-- OMX:RUNTIME:START -->
    │   ... 오버레이 컨텍스트 ...
    │   <!-- OMX:RUNTIME:END -->
    └─ 임시 AGENTS.md 생성 (세션 동안만 유효)
    ↓
[Codex가 주입된 AGENTS.md 사용]
    ↓
[세션 종료]
    ↓
agents-overlay.ts::stripAgentsOverlay()
    ├─ 마커 구간 제거
    └─ 원본 AGENTS.md 복원
```

---

## 3. Codex 설정 흐름

### 3.1 config/generator.ts - Config 생성 및 병합

**파일**: `src/config/generator.ts` (420+ 줄)

**목적**: Codex Config.toml 생성 및 OMX 설정 병합

**주요 구조**:

```typescript
// 최상위 키 (TOML 루트 레벨, 모든 [table] 앞)
const OMX_TOP_LEVEL_KEYS = [
  "notify",                      // 알림 설정
  "model_reasoning_effort",      // 추론 노력 수준
  "developer_instructions",      // 개발자 지침 (AGENTS.md 권장)
]

// OMX 개발자 지침 (Config 주입)
const OMX_DEVELOPER_INSTRUCTIONS = 
  "You have oh-my-codex installed. AGENTS.md is the orchestration brain..."
  // → Codex CLI 시작 시 프롬프트에 주입됨
```

**핵심 함수**:

| 함수 | 입력 | 출력 | 기능 |
|---|---|---|---|
| `mergeCodexConfigToml()` | configPath, options | string | 기존 config 읽기 + OMX 설정 병합 |
| `upsertOmxConfiguration()` | config, options | string | OMX 항목 삽입/업데이트 |
| `stripOmxConfiguration()` | config | string | OMX 항목 모두 제거 (언설치) |
| `stripCodexModelAvailabilityNux()` | config | string | 오래된 Codex NUX 섹션 제거 |

**병합 시나리오**:

```
1. 신규 설치:
   config = buildDefaultCodexConfig()  // 초기값
   config = upsertOmxConfiguration(config, ...)

2. OMX 업그레이드:
   config = readFile(configPath)
   config = mergeCodexConfigToml(configPath, ...)
   
3. OMX 언설치:
   config = readFile(configPath)
   config = stripOmxConfiguration(config)
   writeFile(configPath, config)
```

**주입되는 항목**:

| 항목 | 위치 | 값 |
|---|---|---|
| `notify` | 루트 | true (알림 활성화) |
| `model_reasoning_effort` | 루트 | "high" (추론 활성화) |
| `developer_instructions` | 루트 | OMX_DEVELOPER_INSTRUCTIONS |
| `[features]` | 섹션 | codex_hooks=true |
| `[mcp_servers]` | 섹션 | OMX MCP 서버 등록 |
| `[mcp_servers.*.hooks]` | 테이블 | 훅 신뢰 상태 |

### 3.2 config/codex-hooks.ts - 네이티브 훅 관리

**파일**: `src/config/codex-hooks.ts` (414 줄)

**목적**: Codex 네이티브 훅 설정 구성 및 관리

**Codex 네이티브 훅이란?**
- Codex CLI가 특정 이벤트 시 외부 스크립트를 실행하는 메커니즘
- OMX는 이를 통해 세션 생명주기에 개입

**관리 훅 이벤트** (7가지):

```typescript
const MANAGED_HOOK_EVENTS = [
  "SessionStart",      // 세션 시작 → 런타임 오버레이 적용
  "PreToolUse",        // 도구 호출 전 → 상태 체크
  "PostToolUse",       // 도구 호출 후 → 결과 처리
  "UserPromptSubmit",  // 사용자 프롬프트 제출 → 프롬프트 가이던스 주입
  "PreCompact",        // 컨텍스트 컴팩션 전 → 중요 마커 보존
  "PostCompact",       // 컨텍스트 컴팩션 후 → 복구 지침 주입
  "Stop",              // 세션 중지 → 오버레이 제거
]
```

**훅 설정 흐름**:

```
buildManagedCodexHooksConfig(pkgRoot)
    ├─ codex-native-hook.js 위치 결정
    │   Path: pkgRoot/dist/scripts/codex-native-hook.js
    │
    ├─ 각 이벤트마다 ManagedHookEntry 생성
    │   {
    │     matcher?: string,      // 선택적 조건
    │     hooks: [{
    │       type: "command",
    │       command: "node {hookScript}",
    │       statusMessage?: "메시지",
    │       timeout?: 5000  // 타임아웃(ms)
    │     }]
    │   }
    │
    └─ Config.toml [hooks.{event_name}] 섹션 생성

Config.toml 예시:
  [[hooks.session_start]]
  command = "node /path/to/codex-native-hook.js"
  statusMessage = "OMX runtime overlay"
  timeout = 5000
```

**신뢰 상태 관리**:

```
buildManagedCodexHookTrustState(hooksPath, pkgRoot)
    ├─ 각 훅의 해시값 계산 (trusted_hash)
    ├─ 구조: Record<string, { trusted_hash: string }>
    │
    └─ TOML 출력:
       [hooks.session_start.0.trusted_hash]
       value = "sha256:abc123..."
```

**병합 및 제거**:

```
mergeManagedCodexHooksConfig(existingContent, hooksPath, pkgRoot)
    ├─ 기존 훅 파싱 (parseCodexHooksConfig)
    ├─ OMX 관리 훅만 병합
    ├─ 사용자 훅은 보존
    └─ 반환: 업데이트된 content + 변경 카운트

removeManagedCodexHooks(existingContent)
    ├─ OMX 관리 훅만 제거
    ├─ 사용자 정의 훅 보존
    └─ 반환: RemoveManagedCodexHooksResult
```

### 3.3 config/models.ts - Codex 모델 설정

**파일**: `src/config/models.ts` (310+ 줄)

**목적**: Codex 모델 선택 로직 및 환경 변수 관리

**모델 결정 계층**:

```
┌─────────────────────────────────────────────┐
│ readConfiguredEnvOverrides(codexHomeOverride)
│   ├─ CODEX_HOME 환경 변수 읽기
│   ├─ config.toml에서 model 설정 파싱
│   └─ 환경 변수로 반환
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ getCodexConfigRootModelProvider(codexHome)
│   ├─ 루트 모델 provider 결정 (OpenAI/Anthropic)
│   └─ 우선순위: env var > config > DEFAULT_FRONTIER_MODEL
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 모드별 모델 선택
│   ├─ getTeamChildModel()    → 팀 워커 모델
│   ├─ getMainDefaultModel()  → 메인 모드 모델
│   ├─ getStandardDefaultModel() → 표준 모델
│   ├─ getSparkDefaultModel() → Spark 모델
│   └─ getModelForMode(mode)  → 주어진 모드의 모델
└─────────────────────────────────────────────┘
```

**모델 카테고리**:

| 모델명 | 용도 | 결정 기준 |
|---|---|---|
| `DEFAULT_FRONTIER_MODEL` | 기본 모델 | gpt-5.5 |
| `DEFAULT_STANDARD_MODEL` | 표준 모델 | gpt-5.4-mini |
| `DEFAULT_SPARK_MODEL` | Spark 워크플로우 | gpt-5.3-codex-spark |
| Team Child Model | 팀 워커 | 메인 모델보다 경량 |
| Low Complexity Model | 팀 단순 작업 | Team Child 보다 더 경량 |

**환경 변수 오버라이드**:

```typescript
// Config.toml → 환경 변수 매핑
const MODEL_ENV_MAPPING = {
  "model" → "CODEX_MODEL",
  "model.reasoning_effort" → "CODEX_REASONING_EFFORT",
  // ... 추가 매핑
}

// 최종 ProcessEnv 반환 (Codex CLI 호출 시 사용)
getCodexConfigRootModelProvider(codexHome)
  → { CODEX_MODEL: "gpt-5.3-codex", ... }
```

---

## 4. Codex 런타임 주입

### 4.1 hooks/agents-overlay.ts - AGENTS.md 오버레이

**파일**: `src/hooks/agents-overlay.ts` (700+ 줄)

**목적**: Codex 세션 시작 시 세션별 AGENTS.md 동적 생성

**오버레이 컨텍스트** (3,500 바이트 제한):

| 컨텍스트 | 생성 함수 | 용도 |
|---|---|---|
| 코드베이스 맵 | `codebase-map.ts::generateCodebaseMap()` | 디렉터리/모듈 구조 |
| 탐색 라우팅 | `explore-routing.ts::buildExploreRoutingGuidance()` | workspace-explore 라우팅 |
| 활성 스킬 | `state/skill-active.ts::listActiveSkills()` | 현재 활성 스킬 목록 |
| 프로젝트 메모리 | `omxProjectMemoryPath()` | 기술 스택, 지침 |
| Notepad | `omxNotepadPath()` | 사용자 우선순위 |
| 모드 상태 | `planning/artifacts.ts` | ralph iteration, autopilot phase |

**생명주기**:

```
1. 세션 시작
   ├─ Codex가 hooks.session_start 이벤트 발생
   ├─ codex-native-hook.js 실행
   ├─ applyAgentsOverlay(cwd) 호출
   │
   └─ 동작:
      ├─ lockPath() 획득 (동시 접근 방지)
      ├─ CODEX_HOME/AGENTS.md 읽기
      ├─ 세션 컨텍스트 수집
      ├─ HTML 마커 내에 컨텍스트 주입
      │   <!-- OMX:RUNTIME:START -->
      │   ... 컨텍스트 (3,500 bytes 이내) ...
      │   <!-- OMX:RUNTIME:END -->
      └─ 임시 AGENTS.md 생성 및 사용

2. 세션 실행
   ├─ Codex가 주입된 AGENTS.md 사용
   └─ 에이전트가 컨텍스트 기반 의사결정

3. 세션 종료
   ├─ Codex가 hooks.stop 이벤트 발생
   ├─ stripAgentsOverlay(cwd) 호출
   │
   └─ 동작:
      ├─ 마커 구간 제거
      ├─ 원본 AGENTS.md 복원
      └─ 임시 파일 정리
```

**Lock 메커니즘**:

```typescript
// 동시 Codex 세션 방지
lockPath(cwd): string
  → join(omxStateDir(cwd), "agents-md.lock")

// Lock 획득 로직
acquireLock(cwd, timeoutMs=5000)
  ├─ mkdir(lock) 시도 (원자적 연산)
  ├─ 성공: lock file 생성
  ├─ 실패: 기존 PID 확인
  │   ├─ 유효한 PID → 재시도 (100ms 대기)
  │   └─ 죽은 PID → lock 제거 후 재시도
  └─ 타임아웃 → 오류
```

**마커 기반 오버레이**:

```markdown
<!-- OMX:RUNTIME:START -->
## Session Context (OMX Injected)

### Codebase Map
- src/
  - config/
    - generator.ts (425 lines)
    - codex-hooks.ts (414 lines)
  - goal-workflows/
    ...

### Active Skills
- skill-a
- skill-b

### Priority Notepad
- TODO: Check model config
- DONE: Update hooks

### Mode State
- Current: standard
- Phase: execution

<!-- OMX:RUNTIME:END -->
```

### 4.2 런타임 컨텍스트 주입 마커

**HTML 주석 마커** (토크나이저 안전):

```html
<!-- OMX:RUNTIME:START -->
  [세션별 컨텍스트: 최대 3,500 bytes]
<!-- OMX:RUNTIME:END -->

<!-- OMX:TEAM:WORKER:START -->
  [팀 워커 컨텍스트: 팀 모드 전용]
<!-- OMX:TEAM:WORKER:END -->
```

**마커 이점**:
- Markdown 렌더링에 표시되지 않음
- Codex 토크나이저가 무시 (TOML 스타일 마커보다 안전)
- 여러 번 apply/strip 가능 (멱등성)

**크기 제한** (3,500 bytes):
- 목적: Codex 컨텍스트 창 낭비 방지
- 코드베이스 맵 우선순위 (비중 70%)
- 활성 스킬, 메모리는 간편 요약 (비중 30%)

---

## 5. Codex 목표 상태 관리

### 5.1 goal-workflows/codex-goal-snapshot.ts - 목표 스냅샷

**파일**: `src/goal-workflows/codex-goal-snapshot.ts` (154 줄)

**목적**: Codex 목표 상태 파싱, 검증, 재조정

**CodexGoalSnapshot 인터페이스**:

```typescript
export interface CodexGoalSnapshot {
  available: boolean;           // 목표 존재 여부
  objective?: string;           // 목표 설명
  status?: CodexGoalSnapshotStatus;  // active | complete | cancelled | failed | unknown
  tokenBudget?: number;         // 최대 토큰 예산
  remainingTokens?: number | null;   // 남은 토큰
  raw: unknown;                 // 원본 JSON
}
```

**목표 상태 정규화**:

```typescript
normalizeStatus(value):
  'complete'/'completed'/'done' → 'complete'
  'cancelled'/'canceled' → 'cancelled'
  'failed'/'failure' → 'failed'
  'active'/'in_progress'/'pending'/'running' → 'active'
  (기타) → 'unknown'
```

**목표 읽기 흐름**:

```
readCodexGoalSnapshotInput(raw: string)
  ├─ null/empty → null 반환
  ├─ JSON 문자열 → JSON.parse()
  ├─ 파일 경로 → fs.readFile() → JSON.parse()
  │   └─ 상대경로는 cwd 기준 resolve()
  └─ 오류 → CodexGoalSnapshotError 발생
    
parseCodexGoalSnapshot(value)
  ├─ safeObject, safeString, safeNumber 유틸 사용
  ├─ 다양한 필드명 지원 (objective/goal/description)
  ├─ 다양한 상태명 정규화
  └─ 반환: CodexGoalSnapshot
```

**목표 재조정 (검증)**:

```
reconcileCodexGoalSnapshot(snapshot, options: ReconcileCodexGoalOptions)
  
Options:
  - expectedObjective: string (기대하는 목표 설명)
  - allowedStatuses?: [상태 배열] (허용된 상태)
  - requireSnapshot?: boolean (목표 필수 여부)
  - requireComplete?: boolean (완료 상태 필수 여부)

검증 단계:
  1. 목표 존재 여부
     ├─ 없음 + requireSnapshot → 오류
     └─ 없음 + !requireSnapshot → 경고
  
  2. 목표 설명 검증
     ├─ 기대값과 실제값 비교 (정규화: 공백 → 단일 공백)
     └─ 불일치 → 오류
  
  3. 상태 검증
     ├─ allowedStatuses 목록 확인
     └─ 불일치 → 오류
  
  4. 완료 상태 검증
     ├─ requireComplete + status !== 'complete' → 오류
     └─ complete 상태 + 내용 미완료 → 경고

반환: CodexGoalReconciliation
  {
    ok: boolean,
    snapshot: CodexGoalSnapshot,
    warnings: string[],
    errors: string[]
  }
```

### 5.2 goal-workflows/handoff.ts - 목표 핸드오프

**파일**: `src/goal-workflows/handoff.ts` (35 줄)

**목적**: 워크플로우 상태를 Codex 목표로 변환 및 핸드오프

**buildGoalWorkflowHandoff 함수**:

```typescript
buildGoalWorkflowHandoff(options: GoalWorkflowHandoffOptions): string

Options:
  - run: GoalWorkflowRun (워크플로우 실행 정보)
  - title?: string (핸드오프 제목)
  - tokenBudget?: number (토큰 예산)
  - completionCommand?: string (완료 기록 명령)
  - degradedMode?: boolean (Codex 목표 API 미사용 모드)

반환: 핸드오프 지침 (문자열)
```

**핸드오프 내용**:

```markdown
[워크플로우명] goal-workflow handoff
Status: [상태]
Artifacts: [아티팩트 디렉터리]
Ledger: [원장 경로]

Codex goal integration constraints:
- 먼저 get_goal을 호출하여 활성 Codex 목표 확인
- create_goal은 활성 목표가 없을 때만 호출
- 다른 활성 목표 존재 시, 완료/체크포인트 후 대체
- 목표 완료 후만 update_goal({status: "complete"}) 호출
- 완료 증거를 fresh get_goal 스냅샷과 함께 기록

[degradedMode 여부에 따른 경고]

create_goal payload:
{
  "objective": "워크플로우 목표",
  "token_budget": 200000
}
```

**진실 경계** (Truth Boundary):

```
┌────────────────────────────────────────────────┐
│ Codex                                           │
│  ├─ 활성 스레드 포커스 관리                    │
│  ├─ 목표 상태 (get_goal/create_goal/update_goal)
│  ├─ 컨텍스트 윈도우 (compact/restore)         │
│  └─ 토큰 예산 추적                            │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ OMX (oh-my-codex)                              │
│  ├─ 워크플로우 상태 (.omx/)                    │
│  ├─ 팀 멀티플렉싱                             │
│  ├─ 스킬 라우팅                               │
│  └─ 계획 아티팩트                             │
└────────────────────────────────────────────────┘

Synchronization Point:
  - OMX 워크플로우 완료 → Codex 목표 update_goal({status: "complete"})
  - Codex 목표 취소 → OMX 워크플로우 중단
```

---

## 6. 의존성 관계도

```
┌─────────────────────────────────────────────────────────────┐
│ config/generator.ts (Config 생성)                           │
│  ├─ Imports:                                                │
│  │   ├─ config/codex-hooks.ts                              │
│  │   │   └─ buildManagedCodexHookTrustToml()              │
│  │   ├─ config/models.ts                                  │
│  │   ├─ config/mcp-registry.ts                            │
│  │   └─ agents/definitions.ts                             │
│  │                                                          │
│  └─ Exports:                                                │
│       mergeCodexConfigToml()                                │
│       stripOmxConfiguration()                               │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│ config/codex-hooks.ts (훅 관리)                            │
│  ├─ MANAGED_HOOK_EVENTS (7가지)                           │
│  ├─ ManagedCodexHooksConfig                               │
│  └─ Exports:                                                │
│       buildManagedCodexHooksConfig()                        │
│       mergeManagedCodexHooksConfig()                        │
│       removeManagedCodexHooks()                             │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│ config/models.ts (모델 선택)                               │
│  ├─ DEFAULT_FRONTIER_MODEL                                │
│  └─ Exports:                                                │
│       readConfiguredEnvOverrides()                          │
│       getCodexConfigRootModelProvider()                     │
│       getTeamChildModel()                                  │
│       getModelForMode()                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│ hooks/agents-overlay.ts (런타임 주입)                      │
│  ├─ Imports:                                                │
│  │   ├─ hooks/codebase-map.ts                             │
│  │   ├─ hooks/explore-routing.ts                          │
│  │   ├─ state/skill-active.ts                             │
│  │   ├─ planning/artifacts.ts                             │
│  │   └─ utils/paths.ts (codexHome, omxStateDir, ...)     │
│  │                                                          │
│  └─ Exports:                                                │
│       applyAgentsOverlay()                                 │
│       stripAgentsOverlay()                                 │
│       buildSessionAgentsMarkdown()                         │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│ goal-workflows/codex-goal-snapshot.ts (목표 상태)          │
│  ├─ CodexGoalSnapshot                                     │
│  ├─ CodexGoalReconciliation                               │
│  └─ Exports:                                                │
│       parseCodexGoalSnapshot()                             │
│       readCodexGoalSnapshotInput()                         │
│       reconcileCodexGoalSnapshot()                         │
└─────────────────────────────────────────────────────────────┘
                          ↓↑
┌─────────────────────────────────────────────────────────────┐
│ goal-workflows/handoff.ts (워크플로우 핸드오프)             │
│  ├─ Imports:                                                │
│  │   └─ goal-workflows/artifacts.ts                       │
│  │                                                          │
│  └─ Exports:                                                │
│       buildGoalWorkflowHandoff()                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 주요 인터페이스 정의

### 7.1 Config 관련

```typescript
// codex-hooks.ts
export interface ManagedHookEntry {
  matcher?: string;           // 선택적 조건 (regex)
  hooks: Array<{
    type: "command";
    command: string;
    statusMessage?: string;
    timeout?: number;         // ms
  }>;
}

export interface ManagedCodexHooksConfig {
  hooks: Record<ManagedHookEventName, ManagedHookEntry[]>;
}

export interface ManagedCodexHookTrustState {
  trusted_hash: string;       // 훅 스크립트 해시값
}

// generator.ts
export interface MergeOptions {
  includeTui?: boolean;
  codexHooksFile?: string;
  modelOverride?: string;
  sharedMcpServers?: UnifiedMcpRegistryServer[];
  sharedMcpRegistrySource?: string;
  verbose?: boolean;
  statusLinePreset?: HudPreset;
  forceStatusLinePreset?: boolean;
}
```

### 7.2 목표 관련

```typescript
// codex-goal-snapshot.ts
export type CodexGoalSnapshotStatus = 
  | 'active'
  | 'complete'
  | 'cancelled'
  | 'failed'
  | 'unknown';

export interface CodexGoalSnapshot {
  available: boolean;
  objective?: string;
  status?: CodexGoalSnapshotStatus;
  tokenBudget?: number;
  remainingTokens?: number | null;
  raw: unknown;
}

export interface CodexGoalReconciliation {
  ok: boolean;
  snapshot: CodexGoalSnapshot;
  warnings: string[];
  errors: string[];
}

export interface ReconcileCodexGoalOptions {
  expectedObjective: string;
  allowedStatuses?: readonly CodexGoalSnapshotStatus[];
  requireSnapshot?: boolean;
  requireComplete?: boolean;
}

// handoff.ts
export interface GoalWorkflowHandoffOptions {
  run: GoalWorkflowRun;
  title?: string;
  tokenBudget?: number;
  completionCommand?: string;
  degradedMode?: boolean;
}
```

---

## 8. 데이터 흐름 및 호출 패턴

### 8.1 설치 및 초기화 흐름

```
[OMX 설치/초기화]
    ↓
cli.ts :: install command
    ├─ readConfiguredEnvOverrides() [models.ts]
    │   └─ CODEX_HOME 결정, 환경 변수 수집
    │
    ├─ mergeCodexConfigToml() [generator.ts]
    │   ├─ buildManagedCodexHooksConfig() [codex-hooks.ts]
    │   ├─ upsertOmxConfiguration()
    │   └─ 반환: 병합된 config.toml 내용
    │
    ├─ buildManagedCodexHookTrustToml() [codex-hooks.ts]
    │   └─ 훅 스크립트 해시값 계산
    │
    └─ writeFile(CODEX_HOME/config.toml, merged)
        └─ Config 설정 완료
```

### 8.2 세션 실행 흐름

```
[Codex 세션 시작]
    ↓
Codex CLI :: hooks.session_start 이벤트
    ↓
codex-native-hook.js 실행
    ↓
applyAgentsOverlay(cwd) [agents-overlay.ts]
    ├─ acquireLock()
    ├─ readFile(CODEX_HOME/AGENTS.md)
    ├─ 컨텍스트 수집:
    │   ├─ generateCodebaseMap() [codebase-map.ts]
    │   ├─ buildExploreRoutingGuidance() [explore-routing.ts]
    │   ├─ listActiveSkills() [state/skill-active.ts]
    │   ├─ readProjectMemory()
    │   └─ readNotepad()
    │
    ├─ buildSessionAgentsMarkdown()
    │   └─ HTML 마커 내에 컨텍스트 주입
    │       <!-- OMX:RUNTIME:START -->
    │       {컨텍스트}
    │       <!-- OMX:RUNTIME:END -->
    │
    ├─ writeFile(temp AGENTS.md)
    └─ releaseLock()
        ↓
        [Codex가 주입된 AGENTS.md 사용]
        ↓
        [세션 실행 중...]
        
[세션 종료 또는 인터럽트]
    ↓
Codex CLI :: hooks.stop 이벤트
    ↓
stripAgentsOverlay(cwd) [agents-overlay.ts]
    ├─ acquireLock()
    ├─ 마커 구간 제거
    ├─ 원본 AGENTS.md 복원
    └─ releaseLock()
```

### 8.3 목표 동기화 흐름

```
[워크플로우 시작]
    ↓
readCodexGoalSnapshotInput(raw) [codex-goal-snapshot.ts]
    ├─ JSON 파싱 또는 파일 읽기
    └─ parseCodexGoalSnapshot()
        └─ CodexGoalSnapshot 반환
        ↓
reconcileCodexGoalSnapshot(snapshot, options)
    ├─ 목표 존재 검증
    ├─ 목표 설명 검증 (expectedObjective와 비교)
    ├─ 상태 검증 (allowedStatuses)
    └─ CodexGoalReconciliation 반환 (ok/errors/warnings)
        ↓
[검증 성공]
    ├─ 워크플로우 진행
    └─ 주기적으로 get_goal 호출하여 상태 확인
        ↓
[워크플로우 완료]
    ├─ buildGoalWorkflowHandoff()
    │   └─ 완료 지침 및 update_goal 페이로드 생성
    │
    ├─ call Codex update_goal({status: "complete"})
    │
    └─ writeWorkflowArtifacts() [goal-workflows/artifacts.ts]
        └─ 워크플로우 상태 저장
```

---

## 9. 통합점 및 핵심 기능

### 9.1 설정 통합점

| 통합점 | 역할 | 담당 모듈 |
|---|---|---|
| **Config.toml 생성** | OMX 설치 시 Codex Config에 OMX 항목 주입 | generator.ts |
| **훅 등록** | SessionStart/Stop 이벤트에 OMX 스크립트 연결 | codex-hooks.ts |
| **모델 선택** | 모드별/팀별 모델 결정 로직 | models.ts |
| **MCP 서버** | OMX first-party MCP 서버 등록 | generator.ts + mcp-registry.ts |

### 9.2 런타임 통합점

| 통합점 | 역할 | 담당 모듈 |
|---|---|---|
| **AGENTS.md 주입** | 세션별 동적 컨텍스트 주입 | agents-overlay.ts |
| **코드베이스 맵** | 디렉터리/모듈 구조 요약 | codebase-map.ts |
| **탐색 라우팅** | workspace-explore 가이던스 | explore-routing.ts |
| **활성 스킬** | 현재 활성 스킬 목록 주입 | skill-active.ts |
| **모드 상태** | ralph 반복, autopilot 상태 주입 | planning/artifacts.ts |

### 9.3 목표 동기화 통합점

| 통합점 | 역할 | 담당 모듈 |
|---|---|---|
| **목표 파싱** | Codex get_goal 결과 파싱 | codex-goal-snapshot.ts |
| **목표 검증** | 워크플로우와 Codex 목표 일치 검증 | codex-goal-snapshot.ts |
| **핸드오프** | 워크플로우 → Codex 목표 변환 | handoff.ts |
| **완료 추적** | 목표 완료 상태 업데이트 | handoff.ts |

### 9.4 문서 강제 통합점

| 통합점 | 역할 | 담당 모듈 |
|---|---|---|
| **변경 감지** | Codex 훅 스크립트 변경 감지 | document-refresh/enforcer.ts |
| **문서 갱신** | docs/codex-native-hooks.md 자동 갱신 | document-refresh/config.ts |

---

## 부록: 주요 상수 및 기본값

### Config 기본값

```typescript
// generator.ts
const DEFAULT_SETUP_MODEL = "gpt-5.3-codex"
const DEFAULT_SETUP_MODEL_CONTEXT_WINDOW = 250000
const DEFAULT_SETUP_MODEL_AUTO_COMPACT_TOKEN_LIMIT = 200000
const OMX_AGENTS_MAX_THREADS = 6
const OMX_AGENTS_MAX_DEPTH = 2
const DEFAULT_LAUNCHER_MCP_STARTUP_TIMEOUT_SEC = 15

// models.ts
const DEFAULT_FRONTIER_MODEL = "gpt-5.3-codex"
const DEFAULT_SPARK_MODEL = "gpt-5.3-codex-spark"
```

### 훅 이벤트

```typescript
// codex-hooks.ts
const MANAGED_HOOK_EVENTS = [
  "SessionStart",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "PreCompact",
  "PostCompact",
  "Stop",
]
```

### 마커 및 제한값

```typescript
// agents-overlay.ts
const START_MARKER = "<!-- OMX:RUNTIME:START -->";
const END_MARKER = "<!-- OMX:RUNTIME:END -->";
const WORKER_START_MARKER = "<!-- OMX:TEAM:WORKER:START -->";
const WORKER_END_MARKER = "<!-- OMX:TEAM:WORKER:END -->";
const MAX_OVERLAY_SIZE = 3500  // bytes
```

---

**작성일**: 2026년 5월 10일  
**대상 버전**: oh-my-codex-js v0.16+  
**관련 문서**: [dependency-map-oh-my-codex-js.md](dependency-map-oh-my-codex-js.md), [docs/codex-native-hooks.md](docs/codex-native-hooks.md)
