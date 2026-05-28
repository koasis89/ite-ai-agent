# MD 파일 활용 설계 문서

> 이 문서는 `docs/`, `prompts/`, `docs/prompt-guidance-fragments/` 등의 Markdown 파일들이
> 소스코드에서 어떻게 로드·주입·검증되는지를 패턴별로 정리한다.
>
> 참고: `Electron/analysis/docs-map-oh-my-codex-js.md` 에 목록화된 파일들이 대상이다.

---

## 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [패턴 A — 프래그먼트 동기화: docs/prompt-guidance-fragments/ → prompts/*.md / AGENTS.md](#2-패턴-a--프래그먼트-동기화)
3. [패턴 B — 런타임 오버레이 주입: prompts/*.md → AGENTS.md 동적 삽입](#3-패턴-b--런타임-오버레이-주입)
4. [패턴 C — 네이티브 에이전트 설치: prompts/*.md → .codex/agents/*.toml](#4-패턴-c--네이티브-에이전트-설치)
5. [패턴 D — omx ask 직접 호출: prompts/{role}.md → Codex CLI 시스템 프롬프트](#5-패턴-d--omx-ask-직접-호출)
6. [패턴 E — 계약 테스트 검증: docs/*.md → loadSurface() → 단언](#6-패턴-e--계약-테스트-검증)
7. [패턴 F — 문서 새로고침 감시: document-refresh/config.ts 규칙](#7-패턴-f--문서-새로고침-감시)
8. [패턴 G — Electron 계약 스키마 구현체: hooks-extension / interop-team-mutation](#8-패턴-g--electron-계약-스키마-구현체)
9. [패턴 H — 인벤토리 추적: prompt-inventory.ts](#9-패턴-h--인벤토리-추적)
10. [에이전트 MD 파일 선택 알고리즘: 사용자 입력 → prompts/*.md 결정 과정](#10-에이전트-md-파일-선택-알고리즘)

---

## 1. 전체 아키텍처 개요

```
docs/prompt-guidance-fragments/*.md   ←── 조각(fragment) SSOT
        │
        │  패턴 A: sync-prompt-guidance-fragments.ts
        ▼
prompts/executor.md                   ←── 역할별 프롬프트 (marker 경계 내 텍스트 교체)
prompts/planner.md
prompts/verifier.md
AGENTS.md / templates/AGENTS.md       ←── 루트 오케스트레이터 컨텍스트
        │
        │  패턴 B: agents-overlay.ts (generateOverlay → applyOverlay)
        ▼
AGENTS.md (런타임 오버레이 주입 후)
  <!-- OMX:RUNTIME:START --> ... <!-- OMX:RUNTIME:END -->
        │
        │  패턴 C: agents/native-config.ts (installNativeAgentConfigs)
        ▼
~/.codex/agents/{role}.toml           ←── Codex 네이티브 에이전트 설정

docs/*.md (계약/스키마 문서)
        │
        │  패턴 E: loadSurface() → assert.match()
        ▼
테스트 검증 (src/hooks/__tests__/*.test.ts)

docs/*.md
        │
        │  패턴 F: document-refresh/config.ts
        ▼
PreToolUse 훅 → 커밋 경고

Electron 소스
        │
        │  패턴 G: envelope.schema.ts / event-dispatcher.ts
        ▼
IPC 메시지 파싱·디스패치
```

---

## 2. 패턴 A — 프래그먼트 동기화

**개념**: `docs/prompt-guidance-fragments/*.md` 는 SSOT(단일 진실 원천)이다.
`sync-prompt-guidance-fragments.ts` 가 빌드 타임에 이 조각들을 읽어 대상 파일의
marker(`<!-- OMX:GUIDANCE:...:START --> ... <!-- OMX:GUIDANCE:...:END -->`) 사이에
텍스트를 교체한다.

### 호출 흐름

```
docs/prompt-guidance-fragments/core-operating-principles.md
docs/prompt-guidance-fragments/executor-constraints.md
...
        ↓ readFile(path, 'utf-8')   [line 15~24]
src/scripts/sync-prompt-guidance-fragments.ts
        ↓ replaceBetween()           [line 7~12]
AGENTS.md             ← <!-- OMX:GUIDANCE:OPERATING:START/END -->
templates/AGENTS.md   ← 동일
prompts/executor.md   ← <!-- OMX:GUIDANCE:EXECUTOR:CONSTRAINTS:START/END -->
prompts/planner.md    ← <!-- OMX:GUIDANCE:PLANNER:CONSTRAINTS:START/END -->
prompts/verifier.md   ← <!-- OMX:GUIDANCE:VERIFIER:CONSTRAINTS:START/END -->
```

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/scripts/sync-prompt-guidance-fragments.ts` | 5 | `readFile` import |
| `src/scripts/sync-prompt-guidance-fragments.ts` | 7–12 | `replaceBetween()` — marker 경계 텍스트 교체 구현 |
| `src/scripts/sync-prompt-guidance-fragments.ts` | 15–24 | 조각 파일 일괄 읽기 (`core-operating-principles.md` 등 10개) |
| `src/scripts/sync-prompt-guidance-fragments.ts` | 27–50 | `AGENTS.md`, `prompts/executor.md` 등에 교체 적용 후 `writeFile` |

### marker 대응표

| 대상 파일 | marker | 소스 fragment |
|---|---|---|
| `AGENTS.md`, `templates/AGENTS.md` | `OMX:GUIDANCE:OPERATING` | `core-operating-principles.md` |
| `AGENTS.md`, `templates/AGENTS.md` | `OMX:GUIDANCE:SPECIALIST-ROUTING` | `leader-specialist-routing.md` |
| `AGENTS.md`, `templates/AGENTS.md` | `OMX:GUIDANCE:VERIFYSEQ` | `core-verification-and-sequencing.md` |
| `prompts/executor.md` | `OMX:GUIDANCE:EXECUTOR:CONSTRAINTS` | `executor-constraints.md` |
| `prompts/executor.md` | `OMX:GUIDANCE:EXECUTOR:OUTPUT` | `executor-output.md` |
| `prompts/planner.md` | `OMX:GUIDANCE:PLANNER:CONSTRAINTS` | `planner-constraints.md` |
| `prompts/planner.md` | `OMX:GUIDANCE:PLANNER:INVESTIGATION` | `planner-investigation.md` |
| `prompts/planner.md` | `OMX:GUIDANCE:PLANNER:OUTPUT` | `planner-output.md` |
| `prompts/verifier.md` | `OMX:GUIDANCE:VERIFIER:CONSTRAINTS` | `verifier-constraints.md` |
| `prompts/verifier.md` | `OMX:GUIDANCE:VERIFIER:INVESTIGATION` | `verifier-investigation.md` |

---

## 3. 패턴 B — 런타임 오버레이 주입

**개념**: `omx exec` 실행 직전 세션 컨텍스트(활성 모드, notepad, codebase map 등)를
`AGENTS.md` 끝에 marker 블록으로 동적 삽입(inject)하고, 세션 종료 후 제거(strip)한다.

### 호출 흐름

```
src/cli/index.ts  line 3892
  const overlay = await generateOverlay(cwd, sessionId, { orchestrationMode });
          ↓
src/hooks/agents-overlay.ts
  generateOverlay()  line 369
    ├── readActiveModes()         → .omx/state/*.json 읽기
    ├── readNotepadPriority()     → .omx/notepad.md 읽기
    ├── readProjectMemorySummary()→ .omx/project-memory.json 읽기
    ├── generateCodebaseMap()     → 디렉터리 스캔
    ├── readTeamOrchestratorOverlay()  → readFile(packageRoot()/prompts/team-orchestrator.md) [line 326]
    └── buildExploreRoutingGuidance() → 인라인 문자열 생성
          ↓ 최대 3500자 cap 후 marker 블록 조립
  applyOverlay(agentsMdPath, overlay, cwd)  line 511
    └── writeFile(agentsMdPath, ...)  → AGENTS.md에 블록 추가

  세션 종료 시:
  stripOverlay(agentsMdPath, cwd)  line 537
    └── stripOverlayContent()  line 557  → marker 블록 제거
```

### AGENTS.md에 삽입되는 블록 구조

```markdown
<!-- OMX:RUNTIME:START -->
<session_context>
**Session:** {sessionId} | {ISO 날짜}

**Codebase Map:**
...

**Active Modes:**
- ralph: iteration 3/10, phase: execute

**Priority Notes:**
...

**Project Context:**
...

**Compaction Protocol:**
...
</session_context>
<!-- OMX:RUNTIME:END -->
```

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/hooks/agents-overlay.ts` | 50–51 | `START_MARKER` / `END_MARKER` 상수 정의 |
| `src/hooks/agents-overlay.ts` | 325–328 | `readTeamOrchestratorOverlay()` — `prompts/team-orchestrator.md` 읽기 |
| `src/hooks/agents-overlay.ts` | 369–509 | `generateOverlay()` — 오버레이 콘텐츠 조립 |
| `src/hooks/agents-overlay.ts` | 511–535 | `applyOverlay()` — `AGENTS.md` 파일 기록 |
| `src/hooks/agents-overlay.ts` | 537–553 | `stripOverlay()` — marker 블록 제거 |
| `src/hooks/agents-overlay.ts` | 557–end | `stripOverlayContent()` — 순수 함수 구현 |
| `src/cli/index.ts` | 97 | `generateOverlay` import |
| `src/cli/index.ts` | 3892 | `omx exec` 흐름에서 `generateOverlay` 호출 |

---

## 4. 패턴 C — 네이티브 에이전트 설치

**개념**: `prompts/{role}.md` 를 읽어 Codex 네이티브 에이전트 설정 파일
`~/.codex/agents/{role}.toml` 을 생성한다. MD 파일이 LLM의 `developer_instructions` 로 직접 삽입된다.

### 호출 흐름

```
omx setup
  └── src/agents/native-config.ts
        installNativeAgentConfigs(pkgRoot)
          for each agent in AGENT_DEFINITIONS:
            const promptPath = join(pkgRoot, "prompts", `${name}.md`)  [line 367]
            const promptContent = readFileSync(promptPath, "utf-8")
                    ↓
            generateAgentToml(agent, promptContent, options)
              └── composeRoleInstructions(promptContent, metadata, resolvedModel)
                    └── stripFrontmatter(promptContent) + POSTURE_OVERLAY + MODEL_CLASS_OVERLAY
                    ↓
            writeFile(join(agentsDir, `${name}.toml`))
              developer_instructions = """
              {prompts/{role}.md 전체 내용}
              """
```

### AGENT_DEFINITIONS → prompts 파일 대응

`src/hooks/prompt-guidance-contract.ts` 의 `CORE_ROLE_CONTRACTS` 등에 경로가 명시된다:

| 에이전트 역할 | prompts 파일 | 계약 상수 위치 |
|---|---|---|
| executor | `prompts/executor.md` | `prompt-guidance-contract.ts` line 147, 155 |
| planner | `prompts/planner.md` | `prompt-guidance-contract.ts` line 148, 165 |
| verifier | `prompts/verifier.md` | `prompt-guidance-contract.ts` line 149, 175 |
| explore | `prompts/explore.md` | `prompt-guidance-contract.ts` line 388 |
| researcher | `prompts/researcher.md` | `prompt-guidance-contract.ts` line 393 |
| code-simplifier | `prompts/code-simplifier.md` | `prompt-guidance-contract.ts` line 225 |
| sisyphus-lite | `prompts/sisyphus-lite.md` | `prompt-guidance-contract.ts` line 237 |
| {기타 역할} | `prompts/{name}.md` | `prompt-guidance-contract.ts` line 196, 218 (동적 생성) |

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/agents/native-config.ts` | 367 | `join(pkgRoot, "prompts", \`${name}.md\`)` — 경로 조립 |
| `src/agents/native-config.ts` | ~460 | `composeRoleInstructions()` — MD 내용 + 오버레이 조립 |
| `src/agents/native-config.ts` | ~490 | `generateStandaloneAgentToml()` — TOML 파일 생성 |
| `src/agents/native-config.ts` | ~520 | `generateAgentToml()` — 역할별 TOML 생성 진입점 |
| `src/hooks/prompt-guidance-contract.ts` | 147–149 | `CORE_ROLE_CONTRACTS` — executor/planner/verifier 경로 선언 |
| `src/hooks/prompt-guidance-contract.ts` | 196, 218 | 동적 경로 `prompts/${name}.md` 패턴 |

---

## 5. 패턴 D — omx ask 직접 호출

**개념**: `omx ask <provider> --agent-prompt <role> "<prompt>"` 실행 시 해당 역할의
`prompts/{role}.md` 를 읽어 Claude/Gemini API 호출의 시스템 프롬프트로 전달한다.

### 호출 흐름

```
omx ask claude --agent-prompt executor "리팩터링 해줘"
  └── src/cli/ask.ts
        resolveAskPromptsDir(cwd, env)  [line 38~56]
          └── CODEX_HOME 또는 setup-scope.json → 프롬프트 디렉터리 결정
        resolveAgentPromptContent("executor", promptsDir)  [line 58~83]
          └── join(promptsDir, "executor.md")
          └── readFile(promptPath, 'utf-8')  [line 82]
          └── content.trim() → 시스템 프롬프트로 반환
        → Claude/Gemini API 호출 시 system prompt에 삽입
```

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/cli/ask.ts` | 1–6 | `existsSync`, `readFileSync`, `readFile`, `readdir` import |
| `src/cli/ask.ts` | 38–56 | `resolveAskPromptsDir()` — scope에 따른 프롬프트 디렉터리 결정 |
| `src/cli/ask.ts` | 58–83 | `resolveAgentPromptContent()` — MD 파일 존재 확인 + 내용 읽기 |
| `src/cli/ask.ts` | 70 | `join(promptsDir, \`${normalizedRole}.md\`)` — 최종 경로 조립 |

---

## 6. 패턴 E — 계약 테스트 검증

**개념**: 계약 문서(`docs/*.md`)와 프롬프트 파일(`prompts/*.md`)의 내용이 계약 명세를
만족하는지 테스트에서 `loadSurface()` 로 읽어 `assert.match()` 로 검증한다.

### loadSurface 구현

```typescript
// src/hooks/__tests__/prompt-guidance-test-helpers.ts  line 11~13
export function loadSurface(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf-8');
}
```

`repoRoot` = `src/hooks/__tests__/` 에서 3단계 상위 (`../../../`) = 워크스페이스 루트

### 주요 사용 패턴 예시

#### 예시 1 — prompt-guidance-contract 검증
```typescript
// src/hooks/__tests__/prompt-guidance-contract.test.ts  line 15
const content = loadSurface(surface);  // surface = 'AGENTS.md' 또는 'templates/AGENTS.md'
// CORE_ROLE_PATTERNS.executor의 RegExp 배열로 assert.match 반복 수행
```

#### 예시 2 — guidance-schema.md 오케스트레이션 경계 검증
```typescript
// src/hooks/__tests__/prompt-orchestration-boundary.test.ts  line 39~40
assert.match(loadSurface('docs/guidance-schema.md'), /report upward, do not recursively orchestrate/i);
assert.match(loadSurface('docs/guidance-schema.md'), /recommend handoffs upward to the orchestrator/i);
```

#### 예시 3 — codex-native-hooks.md 키워드 검증
```typescript
// src/ultragoal/__tests__/docs-contract.test.ts  line 85
const doc = loadSurface('docs/codex-native-hooks.md');
assert.match(doc, /UserPromptSubmit/);
```

#### 예시 4 — clawhip-event-contract.md 이벤트 어휘 검증
```typescript
// src/hooks/__tests__/clawhip-event-contract.test.ts  line 8
const doc = loadSurface('docs/clawhip-event-contract.md');
// 라우팅 규칙, 봉투 구조 등 정규식 단언
```

#### 예시 5 — prompt-guidance-fragments 파일 직접 읽기
```typescript
// src/hooks/__tests__/prompt-guidance-fragments.test.ts  line 25~27
const operating = read('docs/prompt-guidance-fragments/core-operating-principles.md').trim();
const specialistRouting = read('docs/prompt-guidance-fragments/leader-specialist-routing.md').trim();
const verifySeq = read('docs/prompt-guidance-fragments/core-verification-and-sequencing.md').trim();
// 이 내용이 AGENTS.md에 marker 블록 안에 실제로 존재하는지 검증
```

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/hooks/__tests__/prompt-guidance-test-helpers.ts` | 3 | `readFileSync` import |
| `src/hooks/__tests__/prompt-guidance-test-helpers.ts` | 8 | `repoRoot` = `join(__dirname, '../../../')` |
| `src/hooks/__tests__/prompt-guidance-test-helpers.ts` | 11–13 | `loadSurface(path)` 구현 |
| `src/hooks/__tests__/prompt-guidance-test-helpers.ts` | 34–38 | `assertContractSurface()` — 계약 객체 기반 일괄 검증 |
| `src/hooks/__tests__/prompt-orchestration-boundary.test.ts` | 39–40 | `docs/guidance-schema.md` 직접 검증 |
| `src/hooks/__tests__/prompt-team-routing.test.ts` | 53, 60 | `docs/prompt-guidance-contract.md`, `docs/guidance-schema.md` 로드 |
| `src/hooks/__tests__/clawhip-event-contract.test.ts` | 6, 8 | `docs/clawhip-event-contract.md` 로드 |
| `src/ultragoal/__tests__/docs-contract.test.ts` | 85, 103, 107 | `docs/codex-native-hooks.md` 로드 |
| `src/hooks/__tests__/prompt-guidance-fragments.test.ts` | 25–82 | 10개 fragment 파일 직접 읽기 + 내용 포함 검증 |

---

## 7. 패턴 F — 문서 새로고침 감시

**개념**: `src/document-refresh/config.ts` 에 소스 파일 → 갱신 대상 MD 파일의 매핑 규칙을 등록한다.
`PreToolUse` 훅이 `git commit` 커맨드 감지 시 staged 변경 파일과 규칙을 대조해
갱신이 누락된 경우 경고를 출력한다.

### 규칙 구조

```typescript
// src/document-refresh/config.ts
export interface DocumentRefreshRule {
  id: string;
  description: string;
  sourceGlobs: string[];      // 소스 파일 패턴 → 이 파일이 변경되면
  refreshTargets: string[];   // 이 MD 파일을 갱신해야 함
  ignoredGlobs?: string[];
}
```

### 등록된 규칙 (MD 대상 기준)

| rule id | 소스 글로브 | 갱신 대상 MD |
|---|---|---|
| `native-hook-behavior` | `src/scripts/codex-native-hook.ts` 등 | `docs/codex-native-hooks.md` |
| `document-refresh-enforcer` | `src/document-refresh/**` | `docs/codex-native-hooks.md` |
| `cli-operator-behavior` | `src/cli/**` (테스트 제외) | `README.md`, `docs/getting-started.html` |
| `prompt-guidance-behavior` | `src/hooks/keyword-detector.ts` 등 | `docs/prompt-guidance-contract.md` |

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/document-refresh/config.ts` | 1–11 | `DocumentRefreshRule` 인터페이스 정의 |
| `src/document-refresh/config.ts` | 13–87 | `DEFAULT_DOCUMENT_REFRESH_RULES` 배열 — 4개 규칙 등록 |
| `src/document-refresh/config.ts` | 70 | `"docs/prompt-guidance-contract.md"` 갱신 대상 등록 |

---

## 8. 패턴 G — Electron 계약 스키마 구현체

### 8-1. interop-team-mutation-contract.md → envelope.schema.ts

**개념**: `docs/interop-team-mutation-contract.md` 에 정의된 JSON 봉투(Envelope) 스펙을
Electron 메인 프로세스에서 Zod 스키마로 구현한다. CLI 출력 JSON 파싱·검증에 사용된다.

```typescript
// Electron/src/main/cli/schemas/envelope.schema.ts  line 3-4
// interop-team-mutation-contract-ko.md 기반 공식 계약 스키마.
// envelope-parser.ts 및 cli-wrapper.ts 모두 이 단일 소스에서 임포트한다.
```

| 필드 | 스키마 상수 | 라인 |
|---|---|---|
| 성공 봉투 | `SuccessEnvelopeSchema` | line 19 |
| 실패 봉투 | `FailureEnvelopeSchema` | line 35 |
| 공용 판별 유니온 | `EnvelopeSchema` | line 47 |
| 에러 코드 상수 | `EnvelopeErrorCode` | line 57+ |

**사용 파일:**

| 파일 | 역할 |
|---|---|
| `Electron/src/main/cli/schemas/envelope.schema.ts` | 스키마 정의 (SSOT) |
| `Electron/src/main/cli/envelope-parser.ts` | CLI stdout JSON 파싱에서 import |
| `Electron/src/main/cli/cli-wrapper.ts` | 봉투 계약 기반 실행 결과 처리 |
| `Electron/src/main/cli/interlude-triager.ts` | 차단 유형 분류 (line 7, 36) |

### 8-2. hooks-extension.md → event-dispatcher.ts

**개념**: `docs/hooks-extension.md` 에 정의된 훅 이벤트 어휘와 JSONL 봉투 구조를
`event-dispatcher.ts` 가 Zod 스키마로 구현하고 IPC 채널로 브로드캐스트한다.

```typescript
// Electron/src/main/logs/event-dispatcher.ts  line 5~10
// hooks-extension-ko.md 스펙 참조:
//   - 봉투 필드: schema_version:"1", event, timestamp, source, context
//   - 선택 필드: session_id, thread_id, turn_id, mode
//   - 파생 신호 (OMX_HOOK_DERIVED_SIGNALS=1): needs-input, pre-tool-use, post-tool-use
```

| 상수/스키마 | 라인 | 내용 |
|---|---|---|
| `HOOK_EVENT_TYPES` | line 22 | 계약 정의 이벤트 어휘 배열 (`session-start`, `pre-tool-use` 등 9종) |
| `PRIORITY_EVENTS` | line 33 | 우선 채널 이벤트 집합 (`needs-input`, `pre-tool-use`, `post-tool-use`) |
| `HookEventSchema` | line 44 | Zod 검증 스키마 — `schema_version: z.literal("1")` |

---

## 9. 패턴 H — 인벤토리 추적

**개념**: `prompt-inventory.ts` 가 MD 파일 목록을 `PROMPT_SURFACE_FILES` / `PROMPT_SURFACE_DIRS` 로 등록해
토큰 수, 절대 지시어 수, 중복 프래그먼트를 정적 분석한다.

### 추적 대상 파일 목록

```typescript
// src/scripts/prompt-inventory.ts  line 35~46
const PROMPT_SURFACE_FILES = [
  'AGENTS.md',
  'templates/AGENTS.md',
  'docs/prompt-guidance-contract.md',    // line 37
  'docs/guidance-schema.md',             // line 38
  'src/hooks/prompt-guidance-contract.ts',
  ...
];

const PROMPT_SURFACE_DIRS = [
  'prompts',                             // prompts/*.md 전체
  'skills',
  'templates/model-instructions',
  'docs/prompt-guidance-fragments',      // line 46
];
```

### 핵심 소스 위치

| 파일 | 주요 라인 | 내용 |
|---|---|---|
| `src/scripts/prompt-inventory.ts` | 35–39 | `PROMPT_SURFACE_FILES` — 개별 MD 파일 목록 |
| `src/scripts/prompt-inventory.ts` | 41–46 | `PROMPT_SURFACE_DIRS` — 디렉터리 단위 스캔 대상 |
| `src/scripts/prompt-inventory.ts` | 48–56 | `MARKERS` — marker 통계 집계 대상 |

---

## 10. 에이전트 MD 파일 선택 알고리즘

> **목적**: 사용자가 채팅에 입력한 텍스트(user prompt)를 바탕으로, 어떤 `prompts/*.md` 또는
> `AGENTS.md` 파일이 해당 요청에 적용될 에이전트 컨텍스트로 선택되는지를 단계별로 설명한다.

---

### 10-1. 전체 선택 흐름

```
UserPromptSubmit (Codex hook)
        │
        ▼
[1단계] 명시적 키워드 탐지
  src/hooks/keyword-registry.ts   → KEYWORD_TRIGGER_DEFINITIONS
  src/hooks/keyword-detector.ts   → detectKeywords() / detectPrimaryKeyword()
        │
        ├─ 키워드 매치 있음 → SkillActiveState 기록 → 해당 skill의 prompts/{skill}.md 선택
        │
        └─ 매치 없음
              │
              ▼
[2단계] Triage Heuristic (폴백)
  src/hooks/triage-heuristic.ts  → triagePrompt()
        │
        ├─ HEAVY  → autopilot 워크플로 (AGENTS.md + prompts/executor.md 등)
        ├─ LIGHT/explore    → prompts/explore.md
        ├─ LIGHT/executor   → prompts/executor.md
        ├─ LIGHT/designer   → prompts/designer.md
        ├─ LIGHT/researcher → prompts/researcher.md
        └─ PASS  → 추가 routing 없음 (기존 AGENTS.md 유지)
              │
              ▼
[3단계] 런타임 게이팅
  - 활성 워크플로 상태(.omx/state/) 체크 → 진행 중인 ralph/autopilot 유지
  - 서브에이전트 훅 여부 → 키워드 활성화 억제
  - tmux 환경 여부 → deep-interview / team 가용성 결정
```

---

### 10-2. 1단계 — 키워드 탐지 상세 알고리즘

**진입점**: `UserPromptSubmit` 훅 → `src/scripts/codex-native-hook.ts` → `detectKeywords(prompt)`

#### A. 정규화

```
1. 한글 2벌식 오타 보정: normalizeWorkflowKeyboardTypos(text)
   - 예) 'ㅕㅣㅈ' → 'ulw' (ultrawork 단축어)

2. 소문자 변환 + trim (패턴 매칭용)
```

#### B. 명시적 `$skill` / `/prompts:role` 인보케이션 파싱

```typescript
// parseExplicitSkillInvocations(text)
// 패턴: /$(?:oh-my-codex:)?([a-z][a-z0-9-]*)\b/gi
//       /\/prompts:[\w.-]+/i

우선순위 규칙:
  1. $skill 토큰들은 텍스트 앞에서부터 left-to-right 순서로 수집
  2. 연속되지 않는 $skill 토큰은 첫 번째 "연속 블록"만 인정
     예) "$ralplan text $ralph" → ralplan 만 매치 (text가 중단점)
  3. 알 수 없는 $skill은 sawExplicitLikeInvocation=true로 표시하되 results에 추가 안 함
  4. 별칭 정규화: 'ulw' → 'ultrawork', 'frontend-ui-ux' → 'design'
  5. 중복 skill 제거 (같은 skill이 여러 번 나와도 한 번만)
```

#### C. 암묵적 키워드 매칭 (`KEYWORD_TRIGGER_DEFINITIONS`)

`src/hooks/keyword-registry.ts` 의 `KEYWORD_TRIGGER_DEFINITIONS` 배열:

| keyword | skill | priority |
|---|---|---|
| `$ralplan`, `consensus plan` | ralplan | 11 |
| `$prometheus-strict` | prometheus-strict | 11 |
| `$ralph`, `don't stop`, `must complete`, `keep going` | ralph | 9 |
| `$autopilot`, `build me`, `I want a` | autopilot | 10 |
| `$ultrawork`, `ulw`, `parallel` | ultrawork | 10 |
| `$ultragoal`, `ultragoal` | ultragoal | 10 |
| `$autoresearch` | autoresearch | 10 |
| `$analyze`, `investigate` | analyze | 7 |
| `$deep-interview`, `deep interview`, `don't assume`, `ouroboros`, `interview` | deep-interview | 8 |
| `$plan`, `plan this`, `plan the`, `let's plan` | plan | 8 |
| `$team`, `coordinated team` | team | 8 |
| `$cancel`, `stop`, `abort` | cancel | 5 |
| `code review`, `$code-review`, `review code` | code-review | 6 |

매칭 로직:
```
keywordToPattern(keyword):
  - 단어 경계(\b) 자동 추가: 키워드 시작·끝이 word char면 \b 붙임
  - 대소문자 무시 (i 플래그)
  - 특수문자 escape

KEYWORD_MAP 전체를 순회하며 pattern.test(text) 체크
```

#### D. 인텐트 유효성 검사 (`KEYWORDS_REQUIRING_INTENT`)

`ralph`, `team`, `stop`, `abort`, `parallel`, `autoresearch`, `ultragoal` 키워드는
단순 매치만으로 활성화되지 않는다. 별도 **의도 패턴** 배열이 추가로 검사된다:

```
ralph  → /\bralph\s+(?:mode|workflow|loop)\b/i 등 5개 패턴 중 하나 일치 필요
team   → /\bteam\s+(?:mode|orchestration|workflow|agents?)\b/i 등 4개 패턴
stop   → /^(?:please\s+)?stop(?:\s+now)?\s*[.!]?\s*$/i 등 6개 패턴
abort  → /^(?:please\s+)?abort(?:\s+now)?\s*[.!]?\s*$/i 등 5개 패턴
parallel → /\b(?:use|run|enable|...) parallel\b/i 등 7개 패턴
```

`deep interview` / `interview` 는 별도 활성화 패턴과 **관리 언급 패턴** 충돌 여부를 함께 확인:
```
DEEP_INTERVIEW_MANAGEMENT_MENTION_PATTERN 에 매치되면서
DEEP_INTERVIEW_ACTIVATION_PATTERNS 중 어느 것에도 매치 안 되면 → 활성화 거부
```

#### E. 우선순위 정렬 및 병합

```typescript
// compareKeywordMatches(a, b):
//   1순위: priority 내림차순 (높을수록 우선)
//   2순위: keyword.length 내림차순 (긴 키워드 우선)
//   3순위: keyword.localeCompare (알파벳 순)

최종 결과:
  explicit 결과(left-to-right 순서 유지) + implicit 결과(정렬 후 중복 제거) 병합
  → matches[0] 가 detectPrimaryKeyword() 반환값 = 활성화될 skill
```

#### F. 연속 실행 감지 (continuation)

이전 턴에서 동일 skill이 활성화 중일 때, 다음 패턴 입력은 새 keyword 없이 기존 skill 재사용:

```
ACTIVE_SKILL_CONTINUATION_PATTERNS:
  /^[\\/]?\s*keep going(?:\s+now)?[.!]?\s*$/i
  /^[\\/]?\s*continue(?:\s+now)?[.!]?\s*$/i
  /^[\\/]?\s*resume(?:\s+now)?[.!]?\s*$/i
```

단, `sawExplicitLikeInvocation=true` 이면 continuation 억제 (명시적 $skill 우선).

---

### 10-3. 2단계 — Triage Heuristic 상세 알고리즘

**진입점**: `src/hooks/triage-heuristic.ts` → `triagePrompt(prompt): TriageDecision`

키워드 탐지에서 아무 매치도 없을 때만 실행되는 **순수 동기 분류기**이다.

#### 11개 규칙 (순서대로 적용, 첫 매치에서 리턴)

| 규칙 번호 | 조건 | 결과 lane | destination |
|---|---|---|---|
| 1 | 입력이 비어있음 | PASS | — |
| 1 | TRIVIAL_PATTERNS 매치 (hi, ok, yes, thanks 등) | PASS | trivial_acknowledgement |
| 2 | OPT_OUT_PHRASES 포함 ("just chat", "no workflow" 등) | PASS | explicit_opt_out |
| 3 | EXPLORE_STARTERS로 시작 또는 단어 10개 이하 "?" 질문 | LIGHT | explore |
|   | 단, 외부 리서치 신호+동사가 함께 있으면 규칙 3 건너뜀 | | |
| 4 | 단어 ≤15개 + EXECUTOR_ANCHOR_PATTERNS 매치 (파일 경로, 줄 번호, rename in, fix typo in) | LIGHT | executor |
| 5 | LOCAL_RESEARCH_EXCLUSION 신호 + 리서치 동사 + 구현 액션 없음 | LIGHT | explore |
| 6 | 단어 >5개 + 구현 액션 + 구현 연결어 + (외부 문서 신호 OR 리서치 동사) | HEAVY | autopilot |
| 7 | 로컬 앵커 없음 + 구현 액션 없음 + 리서치 동사 + 외부 신호/기술 주제 | LIGHT | researcher |
| 8 | BROAD_DESIGN_STARTERS로 시작 + STRUCTURAL_REDESIGN_TERMS 매치 | HEAVY | autopilot |
| 9 | DESIGNER_STARTERS로 시작 또는 redesign + VISUAL_DESIGN_TERMS 매치 | LIGHT | designer |
| 10 | 단어 >5개 + HEAVY_IMPERATIVE_VERBS로 시작 (add, implement, build 등 22개) | HEAVY | autopilot |
| 11 | 위 모두 불일치 | PASS | ambiguous_short_prompt |

#### 주요 패턴 상수

```
HEAVY_WORD_THRESHOLD = 5       (이 초과여야 HEAVY 고려)
SHORT_QUESTION_WORD_LIMIT = 10 (이하면 "?" 질문을 explore로 분류)
ANCHORED_EDIT_WORD_LIMIT = 15  (이하면 앵커 편집을 executor로 분류)

EXECUTOR_ANCHOR_PATTERNS:
  /\bsrc\/[\w./\-]+\.\w+\b/    (파일 경로)
  /\bline\s+\d+\b/             (줄 번호)
  /\brename\b.+\bin\b/         (파일 내 rename)
  /\bfix\s+typo\s+in\b/        (오타 수정)

HEAVY_IMPERATIVE_VERBS: add, implement, refactor, build, create, migrate,
  rewrite, redesign, integrate, set up, configure, extract, split, merge,
  update, remove, delete, replace, convert, generate, scaffold, deploy, automate
```

---

### 10-4. keyword → prompts MD 파일 매핑표

keyword 탐지 또는 triage 결과로 결정된 `skill` 값이 어떤 MD 파일로 해석되는지:

| skill (keyword 결과 또는 triage destination) | 적용 MD 파일 | 로딩 경로 |
|---|---|---|
| `ralph` | `prompts/ralph.md` | 패턴 C (네이티브 에이전트 설치) |
| `autopilot` | `prompts/autopilot.md` | 패턴 C |
| `ultrawork` | `prompts/ultrawork.md` | 패턴 C |
| `ultraqa` | `prompts/ultraqa.md` | 패턴 C |
| `ultragoal` | `prompts/ultragoal.md` | 패턴 C |
| `ralplan` | `prompts/ralplan.md` | 패턴 C |
| `deep-interview` | `prompts/deep-interview.md` | 패턴 C |
| `plan` | `prompts/plan.md` | 패턴 C |
| `team` | `prompts/team.md` + `prompts/team-orchestrator.md`¹ | 패턴 C + 패턴 B 오버레이 |
| `analyze` | `prompts/analyze.md` | 패턴 C |
| `code-review` | `prompts/code-review.md` | 패턴 C |
| `cancel` | `prompts/cancel.md` | 패턴 C |
| `explore` (triage) | `prompts/explore.md` | 패턴 C |
| `executor` (triage) | `prompts/executor.md` | 패턴 C + 패턴 A 프래그먼트 |
| `designer` (triage) | `prompts/designer.md` | 패턴 C |
| `researcher` (triage) | `prompts/researcher.md` | 패턴 C + 패턴 A 프래그먼트 |
| *(모든 경우 공통)* | `AGENTS.md` | 패턴 B 런타임 오버레이 주입 후 Codex 컨텍스트에 포함 |

> ¹ `team` skill이 활성화되면 `src/hooks/agents-overlay.ts` 의 `readTeamOrchestratorOverlay()` 가
> `prompts/team-orchestrator.md` 를 읽어 `AGENTS.md` 런타임 오버레이에 추가 삽입한다.

---

### 10-5. 3단계 — 런타임 게이팅

keyword나 triage가 특정 skill을 선택해도, 다음 조건들이 최종 적용 여부를 바꿀 수 있다.

#### (a) 서브에이전트 훅 억제

```
isNativeSubagentHook(cwd, canonicalSessionId, nativeSessionId, threadId) === true
  → UserPromptSubmit에서 keyword 탐지 결과 무시
  → 서브에이전트 내에서 부모의 quoted context가 워크플로 키워드를 잘못 트리거하는 것 방지
```

#### (b) tmux 환경 게이팅

```
resolveExecutionEnvironment() 결과에 따라:

  attached-tmux-runtime:
    → team, deep-interview, omx question 모두 가용

  native-outside-tmux (Codex App):
    → $team 감지 시 SkillActiveState.active = false 로 강제 비활성화
      (buildNativeOutsideTmuxTeamPromptBlockState 반환)
    → transition_error 메시지 삽입

  outside-tmux-with-bridge:
    → omx question은 bridge pane 경유 가능
    → team 런타임은 여전히 불가
```

#### (c) deep-interview 입력 잠금

```
deepInterviewInputLock.active === true 인 상태에서
DEEP_INTERVIEW_BLOCKED_APPROVAL_INPUTS (yes, y, proceed, continue, ok, sure, go ahead)
중 하나 입력 시 → 해당 입력 무시, 인터뷰 계속 진행
```

#### (d) ralplan 계획 게이팅

```
ralph 활성화 상태에서 planningComplete === false 이면
  → isPlanningComplete() 검사
  → PRD artifact (.omx/plans/prd-*.md) + test-spec artifact 모두 존재해야 실행 단계 진입
  → 미완성 시 AGENTS.md의 "Ralph planning gate" 규칙에 따라 구현 도구 실행 차단
```

#### (e) 복수 skill 요청 처리

```typescript
// resolveRequestedWorkflowSkills(requestedWorkflowSkills)
// 예) "$ralplan $ralph ship this" 입력 시:
//   workflowMatches = ['ralplan', 'ralph']
//   firstPlanningSkill = 'ralplan'
//   hasExecutionSkill = true
//   → requestedSkills: ['ralplan']  (먼저 실행)
//     deferredSkills:  ['ralph']    (ralplan 완료 후 실행 예정)
```

---

### 10-6. 선택 흐름 요약 다이어그램

```
사용자 입력 텍스트
        │
        ▼
normalizeWorkflowKeyboardTypos()   # 한글 오타 보정
        │
        ▼
parseExplicitSkillInvocations()    # $skill, /prompts:role 탐색
        │
        ├─ 명시적 invocation 발견 ──────────────────────┐
        │                                               │
        ▼                                               ▼
KEYWORD_MAP 암묵적 매칭                         명시적 skill 목록
  + intentContext 검증                          (left-to-right 순)
        │                                               │
        └──────────── 병합 + compareKeywordMatches ──────┘
                              │
                    키워드 있음? ── No ──▶ triagePrompt()
                              │                │
                             Yes       PASS/LIGHT/HEAVY
                              │                │
                              ▼                ▼
                   skill (primary match)   destination
                              │                │
                              └────────┬───────┘
                                       ▼
                            런타임 게이팅 적용
                            (subagent 억제, tmux, 잠금, gate)
                                       │
                                       ▼
                         prompts/{skill}.md 로딩
                         + AGENTS.md 런타임 오버레이
                         = 최종 에이전트 컨텍스트
```

---

### 10-7. 핵심 소스 위치 요약

| 파일 | 주요 역할 |
|---|---|
| `src/hooks/keyword-registry.ts` | `KEYWORD_TRIGGER_DEFINITIONS` — 키워드 ↔ skill 매핑 테이블 |
| `src/hooks/keyword-detector.ts` | `detectKeywords()`, `detectPrimaryKeyword()`, `recordSkillActivation()` |
| `src/hooks/triage-heuristic.ts` | `triagePrompt()` — 11개 규칙 기반 3-lane 분류기 |
| `src/hooks/triage-config.ts` | `readTriageConfig()` — triage 활성화 여부 런타임 설정 |
| `src/scripts/codex-native-hook.ts` | `UserPromptSubmit` 훅 진입점, 전체 선택 파이프라인 조율 |
| `src/agents/native-config.ts` | `installNativeAgentConfigs()` — skill → `prompts/*.md` 로드 후 TOML 생성 |
| `src/hooks/agents-overlay.ts` | `readTeamOrchestratorOverlay()` — team skill 시 `prompts/team-orchestrator.md` 삽입 |
| `src/state/workflow-transition.ts` | `evaluateWorkflowTransition()` — skill 전환 유효성 검사 |

---

## 요약 — 패턴별 MD 파일 흐름

```
[작성/편집 시점]
docs/prompt-guidance-fragments/*.md  ──(빌드 타임 A)──▶  prompts/*.md, AGENTS.md (marker 블록 교체)

[설치 시점]
prompts/*.md  ──(설치 타임 C)──▶  ~/.codex/agents/*.toml (developer_instructions 삽입)

[런타임]
prompts/team-orchestrator.md  ──(런타임 B)──▶  AGENTS.md 동적 오버레이 주입
.omx/notepad.md, .omx/project-memory.json 등도 동일 경로

[API 호출 시]
prompts/{role}.md  ──(호출 시 D)──▶  Claude/Gemini API system prompt

[테스트 시]
docs/*.md, prompts/*.md  ──(테스트 E)──▶  loadSurface() → assert.match() 계약 검증

[커밋 시]
src/** 변경  ──(커밋 F)──▶  document-refresh 규칙 대조 → docs/*.md 갱신 경고

[Electron IPC]
interop-team-mutation-contract.md 스펙  ──(구현 G)──▶  envelope.schema.ts → JSON 파싱
hooks-extension.md 스펙              ──(구현 G)──▶  event-dispatcher.ts → IPC 브로드캐스트
```
