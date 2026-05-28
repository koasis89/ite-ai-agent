# src/hooks/ 모듈 분석 — 구조·역할·호출관계

> oh-my-codex(OMX) 의 `src/hooks/` 폴더는 **사용자 프롬프트를 수신해서 적절한 skill/agent로 라우팅하는 파이프라인 전체**를 담당합니다.
> 이 문서는 폴더 내 모든 파일의 역할, 주요 함수, 타입, 그리고 파일 간 호출관계를 한글로 정리합니다.

## 개요
 사용자의 의도를 파악하여 역할(Role)이나 모드(Mode)를 감지하고 라우팅하는 **'논리 엔진(Routing Engine)'으로서는 매우 훌륭하고 정교하지만, 이 코드들만으로는 시스템을 완전히 구동할 수 없습니다.**

가장 핵심적인 **'실제 프롬프트 텍스트 파일(.md)'들이 누락**되어 있기 때문입니다.

---

### A. 현재 코드의 장점: "매우 강력한 오케스트레이션 엔진"

제공해주신 TypeScript 파일들은 단순한 프롬프트 선택을 넘어, LLM 에이전트의 상태와 작업 흐름을 제어하는 고도화된 프레임워크입니다.

* **정교한 의도 파악 및 라우팅 (`keyword-detector.ts`, `keyword-registry.ts`):** 사용자의 입력에서 명시적인 명령어(`$ralph`, `$autopilot` 등)나 암시적인 의도("review code", "keep going" 등)를 파악해 적절한 스킬로 라우팅합니다.
* **작업 규모에 따른 스마트한 제어 (`task-size-detector.ts`):** "오타 수정해줘" 같은 간단한 작업(`small`)에 무거운 다중 에이전트 모드(heavy orchestration)가 실행되지 않도록 차단하는 안전장치가 돋보입니다.
* **동적 컨텍스트 주입 (`agents-overlay.ts`, `codebase-map.ts`):** 실행 시점에 프로젝트의 파일 구조나 현재 활성화된 모드, 작업 우선순위 등을 런타임에 결합하여 에이전트에게 맥락을 제공합니다.
* **계약 기반 검증 (`prompt-guidance-contract.ts`):** 모델이 특정 역할(기획자, 실행자, 검증자 등)을 수행할 때 반드시 지켜야 할 규칙(예: "outcome-first", "Ask only when blocked")이 프롬프트 파일에 제대로 작성되어 있는지 정규식으로 검증합니다.

### B. 누락된 부분: "실제 프롬프트 내용 (Markdown 파일)"

이 코드가 완벽하게 동작하려면, 코드가 참조하고 있는 실제 시스템 프롬프트 내용이 필요합니다. `prompt-guidance-contract.ts` 파일을 보면 다음 파일들이 시스템 외부(디렉토리)에 존재해야 함을 알 수 있습니다.

* **핵심 역할 프롬프트:** `prompts/executor.md`, `prompts/planner.md`, `prompts/verifier.md`
* **스킬별 행동 지침:** `skills/ralph/SKILL.md`, `skills/autopilot/SKILL.md`, `skills/ultraqa/SKILL.md` 등
* **전역 에이전트 설정:** `templates/AGENTS.md`

제공해주신 코드는 이 마크다운(`.md`) 파일들을 읽어와서 동적으로 조립하고(overlay), 파일 안에 필수 키워드가 있는지 검사할 뿐, **프롬프트 텍스트 자체를 코드 내부에 가지고 있지 않습니다.**

---

### 결론 및 제안

이 코드는 대형 프로젝트나 복잡한 다중 에이전트 시스템을 구축하기 위한 뼈대(프레임워크)로서는 당장 현업에 적용해도 좋을 만큼 훌륭한 수준입니다.

실제로 이 시스템을 사용하시려면, `prompt-guidance-contract.ts`에 정의된 정규식 조건들을 만족하는 **마크다운(.md) 형태의 프롬프트 파일들을 직접 작성하시거나 기존 소스에서 가져와 지정된 경로에 배치**하셔야 합니다.

---

## 목차

- [src/hooks/ 모듈 분석 — 구조·역할·호출관계](#srchooks-모듈-분석--구조역할호출관계)
  - [개요](#개요)
    - [A. 현재 코드의 장점: "매우 강력한 오케스트레이션 엔진"](#a-현재-코드의-장점-매우-강력한-오케스트레이션-엔진)
    - [B. 누락된 부분: "실제 프롬프트 내용 (Markdown 파일)"](#b-누락된-부분-실제-프롬프트-내용-markdown-파일)
    - [결론 및 제안](#결론-및-제안)
  - [목차](#목차)
  - [1. 폴더 구조 한눈에 보기](#1-폴더-구조-한눈에-보기)
  - [2. 파이프라인 개요](#2-파이프라인-개요)
  - [3. 파일별 상세 분석](#3-파일별-상세-분석)
    - [3-1. keyword-registry.ts](#3-1-keyword-registryts)
      - [주요 타입](#주요-타입)
      - [주요 상수·함수](#주요-상수함수)
      - [등록된 주요 skill 목록](#등록된-주요-skill-목록)
      - [의존 관계](#의존-관계)
    - [3-2. keyword-detector.ts](#3-2-keyword-detectorts)
      - [주요 타입](#주요-타입-1)
      - [주요 함수](#주요-함수)
      - [상태 저장 파일 위치](#상태-저장-파일-위치)
      - [Stateful Skill 목록 (상태가 파일로 유지되는 skill)](#stateful-skill-목록-상태가-파일로-유지되는-skill)
      - [의존 관계](#의존-관계-1)
    - [3-3. triage-heuristic.ts](#3-3-triage-heuristicts)
      - [출력 타입](#출력-타입)
      - [레인 의미](#레인-의미)
      - [11개 분류 규칙 (순서대로 적용)](#11개-분류-규칙-순서대로-적용)
      - [주요 패턴 상수](#주요-패턴-상수)
      - [의존 관계](#의존-관계-2)
    - [3-4. triage-config.ts](#3-4-triage-configts)
      - [읽는 설정 경로](#읽는-설정-경로)
      - [동작 규칙 (Fail-Closed 원칙)](#동작-규칙-fail-closed-원칙)
      - [주요 함수](#주요-함수-1)
      - [의존 관계](#의존-관계-3)
    - [3-5. triage-state.ts](#3-5-triage-statets)
      - [상태 파일 위치](#상태-파일-위치)
      - [저장 데이터 형식](#저장-데이터-형식)
      - [주요 함수](#주요-함수-2)
      - [의존 관계](#의존-관계-4)
    - [3-6. agents-overlay.ts](#3-6-agents-overlayts)
      - [주입하는 컨텍스트](#주입하는-컨텍스트)
      - [마커 시스템](#마커-시스템)
      - [락 메커니즘](#락-메커니즘)
      - [주요 함수](#주요-함수-3)
      - [최대 오버레이 크기](#최대-오버레이-크기)
      - [의존 관계](#의존-관계-5)
    - [3-7. session.ts](#3-7-sessionts)
      - [핵심 데이터](#핵심-데이터)
      - [상태 파일 위치](#상태-파일-위치-1)
      - [만료 감지 방식](#만료-감지-방식)
      - [주요 함수](#주요-함수-4)
    - [3-8. codebase-map.ts](#3-8-codebase-mapts)
      - [동작 방식](#동작-방식)
      - [캐시 전략](#캐시-전략)
      - [주요 함수](#주요-함수-5)
    - [3-9. explore-routing.ts](#3-9-explore-routingts)
      - [핵심 로직](#핵심-로직)
      - [주요 함수](#주요-함수-6)
    - [3-10. task-size-detector.ts](#3-10-task-size-detectorts)
      - [분류 기준](#분류-기준)
      - [이스케이프 해치 접두사](#이스케이프-해치-접두사)
      - [LARGE 신호 패턴 예시](#large-신호-패턴-예시)
      - [주요 함수](#주요-함수-7)
    - [3-11. prompt-guidance-contract.ts](#3-11-prompt-guidance-contractts)
      - [검증 대상 프롬프트](#검증-대상-프롬프트)
      - [주요 검증 패턴 분류](#주요-검증-패턴-분류)
    - [3-12. deep-interview-config-instruction.ts](#3-12-deep-interview-config-instructionts)
      - [읽는 데이터](#읽는-데이터)
      - [설정 항목](#설정-항목)
      - [출력 예시](#출력-예시)
    - [3-13. extensibility/ (서브 패키지)](#3-13-extensibility-서브-패키지)
      - [파일 구성](#파일-구성)
      - [이벤트 종류 (HookEventName)](#이벤트-종류-hookeventname)
      - [플러그인 발견 조건](#플러그인-발견-조건)
      - [타임아웃](#타임아웃)
      - [team worker 억제](#team-worker-억제)
    - [3-14. code-simplifier/ (서브 패키지)](#3-14-code-simplifier-서브-패키지)
      - [활성화 조건](#활성화-조건)
      - [동작 방식](#동작-방식-1)
      - [주요 함수](#주요-함수-8)
  - [4. 파일 간 의존·호출 관계](#4-파일-간-의존호출-관계)
    - [외부에서 이 모듈들을 소비하는 주요 진입점](#외부에서-이-모듈들을-소비하는-주요-진입점)
  - [5. 핵심 타입 요약](#5-핵심-타입-요약)
  - [6. 상수·임계값 요약](#6-상수임계값-요약)

---

## 1. 폴더 구조 한눈에 보기

```
src/hooks/
│
├── keyword-registry.ts           ← 키워드→skill 매핑 SSOT (Single Source of Truth)
├── keyword-detector.ts           ← 프롬프트 키워드 탐지 + 상태 기록
│
├── triage-heuristic.ts           ← PASS / LIGHT / HEAVY 3-레인 분류기
├── triage-config.ts              ← Triage 기능 게이트 설정 읽기
├── triage-state.ts               ← Triage 결과 세션 상태 파일 I/O
│
├── agents-overlay.ts             ← AGENTS.md 런타임 오버레이 주입·제거
├── session.ts                    ← 세션 시작/종료 라이프사이클 관리
│
├── codebase-map.ts               ← `git ls-files` 기반 코드베이스 구조 스냅샷
├── explore-routing.ts            ← `omx explore` 커맨드 라우팅 판단
│
├── task-size-detector.ts         ← 프롬프트 작업 크기 분류 (small/medium/large)
├── prompt-guidance-contract.ts   ← 프롬프트 가이던스 계약 패턴 검증
├── deep-interview-config-instruction.ts ← deep-interview 설정 지시문 빌더
│
├── extensibility/                ← 외부 플러그인 훅 확장성 시스템
│   ├── types.ts
│   ├── events.ts
│   ├── loader.ts
│   ├── dispatcher.ts
│   ├── plugin-runner.ts
│   ├── runtime.ts
│   ├── sdk.ts
│   └── sdk/
│
└── code-simplifier/              ← 코드 자동 단순화 Stop-hook
    └── index.ts
```

---

## 2. 파이프라인 개요

사용자가 Codex CLI에 프롬프트를 입력하면 `UserPromptSubmit` 훅이 실행됩니다.  
`src/scripts/codex-native-hook.ts`가 진입점이며, `src/hooks/` 모듈들을 순서대로 호출합니다.

```
사용자 입력
    │
    ▼
[codex-native-hook.ts]  ── 진입점 (src/scripts/)
    │
    ├─① keyword-detector.ts  detectKeywords()
    │       │
    │       ├─ keyword-registry.ts  KEYWORD_TRIGGER_DEFINITIONS 참조
    │       └─ 상태 기록: skill-active-state.json 파일 I/O
    │
    ├─② (키워드 미탐지 시) triage-heuristic.ts  triagePrompt()
    │       │
    │       ├─ triage-config.ts  readTriageConfig()  ← 기능 게이트 확인
    │       └─ triage-state.ts  writeTriageState()   ← 결과 상태 저장
    │
    ├─③ agents-overlay.ts  applyAgentsMdOverlay()
    │       │
    │       ├─ codebase-map.ts   generateCodebaseMap()
    │       └─ explore-routing.ts  buildExploreRoutingGuidance()
    │
    ├─④ task-size-detector.ts  classifyTaskSize()  ← 작업 크기 판단
    │
    └─⑤ extensibility/dispatcher.ts  dispatchHookEvent()  ← 외부 플러그인 전달
             │
             └─ extensibility/loader.ts  discoverHookPlugins()
```

---

## 3. 파일별 상세 분석

---

### 3-1. keyword-registry.ts

**역할**: 키워드 문자열 ↔ skill 이름 ↔ 우선순위 매핑의 SSOT(단일 진실 공급원)

#### 주요 타입

```typescript
interface KeywordTriggerDefinition {
  keyword: string;   // 사용자 입력에서 매칭할 문자열
  skill: string;     // 활성화할 skill 이름
  priority: number;  // 정렬 우선순위 (높을수록 먼저)
  guidance: string;  // 모델에 전달할 가이던스 문자열
}
```

#### 주요 상수·함수

| 이름 | 설명 |
|------|------|
| `KEYWORD_TRIGGER_DEFINITIONS` | 전체 키워드 정의 배열 (약 50개 항목) |
| `compareKeywordMatches()` | priority 내림차순 → 길이 내림차순 → 알파벳 오름차순 정렬 |

#### 등록된 주요 skill 목록

| skill | 키워드 예시 | 우선순위 |
|-------|-----------|---------|
| `autopilot` | `$autopilot`, `build me`, `I want a` | 10 |
| `ultrawork` | `$ultrawork`, `parallel`, `ulw` | 10 |
| `ultragoal` | `$ultragoal`, `ultragoal` | 10 |
| `autoresearch` | `$autoresearch` | 10 |
| `ralplan` | `$ralplan`, `consensus plan` | 11 |
| `prometheus-strict` | `$prometheus-strict` | 11 |
| `ralph` | `$ralph`, `don't stop`, `keep going` | 9 |
| `deep-interview` | `$deep-interview`, `interview`, `don't assume` | 8 |
| `plan` | `$plan`, `plan this`, `let's plan` | 8 |
| `team` | `$team`, `coordinated team` | 8 |
| `ultraqa` | `$ultraqa` | 8 |
| `analyze` | `$analyze`, `investigate` | 7 |
| `code-review` | `$code-review`, `code review` | 6 |
| `design` | `$design` | 6 |
| `cancel` | `$cancel`, `stop`, `abort` | 5 |
| `wiki` | `$wiki`, `wiki query` | 5 |
| `best-practice-research` | `$best-practice-research` | 8 |

#### 의존 관계
- **소비처**: `keyword-detector.ts` — `KEYWORD_TRIGGER_DEFINITIONS`, `compareKeywordMatches` import

---

### 3-2. keyword-detector.ts

**역할**: OMX의 핵심 라우팅 엔진. 사용자 입력에서 활성화할 skill을 탐지하고, 상태 파일에 기록합니다.

#### 주요 타입

```typescript
// 키워드 매칭 결과
interface KeywordMatch {
  keyword: string;
  skill: string;
  priority: number;
}

// skill 활성 상태 (파일로 저장됨)
interface SkillActiveState {
  version: 1;
  active: boolean;
  skill: string;
  keyword: string;
  phase: string;
  activated_at: string;
  updated_at: string;
  source: 'keyword-detector';
  session_id?: string;
  // deep-interview 전용 입력 잠금
  input_lock?: DeepInterviewInputLock;
  deep_interview_config?: DeepInterviewRuntimeConfig;
  // 복수 skill 처리
  requested_skills?: string[];
  deferred_skills?: string[];
  // ...
}

// deep-interview 입력 잠금
interface DeepInterviewInputLock {
  active: boolean;
  scope: 'deep-interview-auto-approval';
  blocked_inputs: string[];  // ['yes', 'y', 'proceed', ...]
  message: string;
}
```

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `detectKeywords(prompt)` | 프롬프트에서 모든 키워드 매칭 결과 반환 |
| `detectPrimaryKeyword(prompt)` | 가장 높은 우선순위 키워드 1개 반환 |
| `parseExplicitSkillInvocations(prompt)` | `$skill` 또는 `/prompts:role` 명시적 호출 파싱 |
| `recordSkillActivation(input)` | skill 활성 상태를 `.omx/state/` 에 파일로 기록 |
| `hasIntentContextForKeyword(keyword, prompt)` | `KEYWORDS_REQUIRING_INTENT` 집합의 키워드는 추가 인텐트 패턴 검증 |
| `normalizeWorkflowKeyboardTypos(prompt)` | 오타/변형 키워드 정규화 (`ralplan` → `ralplan` 등) |
| `shouldReusePreviousSkillForContinuation(prompt, state)` | "continue", "keep going" 등 continuation 패턴 탐지 |
| `persistDeepInterviewModeState()` | deep-interview 전용 모드 상태 파일 저장 |

#### 상태 저장 파일 위치

```
.omx/state/
├── skill-active-state.json                      ← 현재 활성 skill
└── sessions/<session_id>/
    ├── skill-active-state.json
    └── deep-interview-state.json
```

#### Stateful Skill 목록 (상태가 파일로 유지되는 skill)

| skill | 초기 phase |
|-------|-----------|
| `deep-interview` | `intent-first` |
| `autopilot` | `deep-interview` (iteration 포함) |
| `ralph` | `starting` (iteration 포함) |
| `ralplan` | `planning` |
| `team` | `starting` (root scope) |
| `ultrawork` | `planning` |
| `ultragoal` | `planning` |
| `ultraqa` | `planning` |
| `autoresearch` | `executing` |

#### 의존 관계

```
keyword-detector.ts
  ├── keyword-registry.ts                ← KEYWORD_TRIGGER_DEFINITIONS 소비
  ├── task-size-detector.ts              ← classifyTaskSize(), isHeavyMode()
  ├── ../state/skill-active.ts           ← 상태 파일 R/W 헬퍼
  ├── ../state/workflow-transition.ts    ← 워크플로우 전환 유효성 검사
  ├── ../question/deep-interview.ts      ← 질문 의무 클리어
  ├── ../config/deep-interview.ts        ← deep-interview 런타임 설정
  ├── ../planning/artifacts.ts           ← 계획 아티팩트 존재 확인
  └── ../ralplan/consensus-gate.ts       ← ralplan 합의 게이팅
```

---

### 3-3. triage-heuristic.ts

**역할**: 키워드 탐지가 실패했을 때의 폴백 분류기. 프롬프트를 분석해 3개 레인으로 분류합니다.  
순수 동기 함수로, 부작용(파일 I/O, 상태 변경) 없음.

#### 출력 타입

```typescript
type TriageLane = "HEAVY" | "LIGHT" | "PASS";
type LightDestination = "explore" | "executor" | "designer" | "researcher";

interface TriageDecision {
  lane: TriageLane;
  destination?: LightDestination | "autopilot";
  reason: string;   // 분류 이유 코드
}
```

#### 레인 의미

| 레인 | 설명 | 라우팅 대상 |
|------|------|------------|
| `PASS` | 단순 인사, 짧은 모호한 입력, 명시적 opt-out | 직접 응답 |
| `LIGHT` | 탐색/설명/소규모 편집/외부 문서 조회 | `explore` / `executor` / `designer` / `researcher` |
| `HEAVY` | 장기 목표 형태의 구현 요청 | `autopilot` |

#### 11개 분류 규칙 (순서대로 적용)

| 규칙 | 조건 | 결과 |
|------|------|------|
| 1 | 빈 입력 또는 trivial 패턴 (hi, ok, thanks...) | PASS / `trivial_acknowledgement` |
| 2 | opt-out 문구 포함 (just chat, no workflow, plain answer...) | PASS / `opt_out_phrase` |
| 3 | 탐색 스타터로 시작하거나 짧은 `?` 질문 (≤10단어) | LIGHT / `explore` |
| 4 | 파일 경로 앵커 포함 & 단어 수 ≤15 | LIGHT / `executor` |
| 5 | 로컬 신호 없이 외부 구현+연구 복합 (단어 >5) | HEAVY / `implementation_research_goal` |
| 6 | — (이전 구현과 연구 복합 판단 — 규칙 5 보조) | HEAVY |
| 7 | 외부 문서 조회 신호 + 구현 동작 없음 | LIGHT / `researcher` |
| 8 | `redesign` + 구조적 재설계 키워드 | HEAVY / `structural_redesign_goal` |
| 9 | UI/시각적 스타터 또는 visual 디자인 키워드 | LIGHT / `designer` |
| 10 | 단어 수 >5 + 명령형 동사로 시작 | HEAVY / `long_imperative_goal` |
| 11 | 이외 모두 | PASS / `ambiguous_short_prompt` |

#### 주요 패턴 상수

| 상수 | 값 | 의미 |
|------|-----|------|
| `HEAVY_WORD_THRESHOLD` | 5 | 이 단어 수를 초과하면 HEAVY 후보 |
| `SHORT_QUESTION_WORD_LIMIT` | 10 | `?` 질문으로 인정하는 최대 단어 수 |
| `ANCHORED_EDIT_WORD_LIMIT` | 15 | executor 앵커로 인정하는 최대 단어 수 |

#### 의존 관계
- 외부 import 없음 (완전히 순수한 독립 모듈)
- **소비처**: `codex-native-hook.ts`, `triage-state.ts`

---

### 3-4. triage-config.ts

**역할**: `~/.omx/.omx-config.json` 파일에서 Triage 기능 게이트의 활성화 여부를 읽습니다.

#### 읽는 설정 경로

```json
{
  "promptRouting": {
    "triage": {
      "enabled": true
    }
  }
}
```

#### 동작 규칙 (Fail-Closed 원칙)

| 상황 | enabled | status |
|------|---------|--------|
| 파일 없음 | `true` | `"defaulted"` |
| 파일 있지만 `promptRouting` 없음 | `true` | `"defaulted"` |
| `enabled: true` | `true` | `"enabled"` |
| `enabled: false` | `false` | `"disabled"` |
| JSON 파싱 실패 / 잘못된 형식 | **`false`** | `"invalid"` |

결과는 프로세스 수명 동안 캐시됩니다 (`cachedTriageConfig` 모듈 변수).

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `readTriageConfig()` | 설정 파일 읽기 + 캐시. `TriageConfig` 반환 |
| `resetTriageConfigCache()` | 테스트용 캐시 초기화 |

#### 의존 관계
- `../utils/paths.ts` — `codexHome()` (설정 파일 경로)
- **소비처**: `codex-native-hook.ts` (Triage 활성화 여부 판단)

---

### 3-5. triage-state.ts

**역할**: Triage 분류 결과(`HEAVY`/`LIGHT` 한정)를 세션별 상태 파일에 저장·읽기합니다.  
`PASS` 결과는 저장하지 않습니다.

#### 상태 파일 위치

```
.omx/state/
├── prompt-routing-state.json                   ← 세션 ID 없을 때
└── sessions/<session_id>/
    └── prompt-routing-state.json               ← 세션 ID 있을 때
```

#### 저장 데이터 형식

```typescript
interface TriageStateFile {
  version: 1;
  last_triage: {
    lane: "HEAVY" | "LIGHT";
    destination: "autopilot" | "explore" | "executor" | "designer" | "researcher";
    reason: string;
    prompt_signature: string;  // "sha256:" + 정규화된 프롬프트의 SHA256 해시
    turn_id: string;           // ISO 타임스탬프
    created_at: string;
  } | null;
  suppress_followup: boolean;
}
```

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `readTriageState({ sessionId?, cwd? })` | 상태 파일 읽기. 파일 없으면 `null` 반환 |
| `writeTriageState(decision, opts)` | 분류 결과 저장 (atomic rename 사용) |

#### 의존 관계
- `../mcp/state-paths.ts` — `getStateDir()`, `SESSION_ID_PATTERN`
- **소비처**: `codex-native-hook.ts`

---

### 3-6. agents-overlay.ts

**역할**: Codex 세션 시작 시 `AGENTS.md` 파일에 세션 특화 컨텍스트를 주입하고, 세션 종료 시 제거합니다.  
마커(`<!-- OMX:RUNTIME:START -->...<!-- OMX:RUNTIME:END -->`) 기반으로 멱등하게 apply/strip을 반복합니다.

#### 주입하는 컨텍스트

1. **코드베이스 맵** — `codebase-map.ts`의 `generateCodebaseMap()` 결과
2. **활성 모드 상태** — ralph 반복 횟수, autopilot 단계 등 skill 상태
3. **우선순위 노트패드** — `.omx/notepad.md` 내용
4. **프로젝트 메모리 요약** — `.omx/project-memory.json` 기술스택/관례
5. **컨텍스트 압축 생존 지시문**
6. **세션 메타데이터** — session_id, cwd 등
7. **explore 라우팅 가이던스** — `explore-routing.ts`의 `buildExploreRoutingGuidance()`
8. **planning 게이트 상태** — ralph/ralplan에서 PRD 파일 존재 여부

#### 마커 시스템

```
AGENTS.md
└── <!-- OMX:RUNTIME:START -->  ... <!-- OMX:RUNTIME:END -->   ← 일반 세션
└── <!-- OMX:TEAM:WORKER:START --> ... <!-- OMX:TEAM:WORKER:END --> ← team worker 세션
```

#### 락 메커니즘

여러 프로세스가 동시에 `AGENTS.md`를 수정하지 못하도록 **디렉토리 기반 배타적 락**(`agents-md.lock/`)을 사용합니다.  
데드 프로세스(PID 사망)의 락은 자동 회수됩니다.

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `applyAgentsMdOverlay(cwd, opts)` | 오버레이 주입 (락 획득 → 쓰기 → 락 해제) |
| `stripAgentsMdOverlay(cwd, opts)` | 오버레이 제거 |
| `withAgentsMdLock(cwd, fn)` | 락을 획득한 상태로 `fn` 실행 |

#### 최대 오버레이 크기

`MAX_OVERLAY_SIZE = 3500` 자 (토큰 절약)

#### 의존 관계

```
agents-overlay.ts
  ├── codebase-map.ts          ← generateCodebaseMap()
  ├── explore-routing.ts       ← buildExploreRoutingGuidance()
  ├── ../state/skill-active.ts ← listActiveSkills(), readVisibleSkillActiveState()
  ├── ../planning/artifacts.ts ← isPlanningComplete(), readPlanningArtifacts()
  └── ../utils/paths.ts        ← codexHome(), omxNotepadPath(), ...
```

---

### 3-7. session.ts

**역할**: OMX 세션의 시작·종료·만료 감지를 관리합니다.

#### 핵심 데이터

```typescript
interface SessionState {
  session_id: string;
  native_session_id?: string;        // Codex 네이티브 세션 ID
  previous_native_session_id?: string; // /new 명령으로 세션 교체 시 이전 ID
  started_at: string;
  cwd: string;
  pid: number;                       // 소유 프로세스 PID
  tmux_session_name?: string;        // tmux 환경에서 사용
}
```

#### 상태 파일 위치

```
.omx/
├── state/
│   └── session.json         ← 현재 활성 세션
└── logs/
    └── session-history.jsonl ← 모든 세션 이력 (추가 전용)
```

#### 만료 감지 방식

- 시간 기반 임계값 없음(장기 실행 세션도 유효)
- **PID 활성 여부**로만 판단 → `process.kill(pid, 0)` 예외 발생 시 만료로 간주

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `startSession(cwd, opts)` | 새 세션 시작, 이전 만료 세션 정리 |
| `endSession(cwd, sessionId)` | 세션 종료 기록 |
| `readCurrentSession(cwd)` | 현재 세션 읽기 |
| `resetSessionMetrics(cwd, sessionId?)` | 세션 시작 시 HUD/메트릭 파일 초기화 |

---

### 3-8. codebase-map.ts

**역할**: `git ls-files` 명령으로 프로젝트 소스 구조를 빠르게 스냅샷 합니다.  
에이전트가 "파일이 어디 있는지" 탐색하지 않아도 되도록 AGENTS.md에 주입됩니다.

#### 동작 방식

1. `git ls-files`로 추적된 파일 목록 수집
2. 디렉토리별로 그룹화 (`MAX_DIRS = 14`, 디렉토리당 `MAX_FILES_PER_DIR = 10`)
3. `.ts/.tsx/.js/.mjs` 파일에서 `export` 심볼을 정규식으로 빠르게 스캔
4. 결과를 `MAX_MAP_CHARS = 1000` 자 이내로 압축

#### 캐시 전략

- `git index`(`.git/index`) 파일의 **mtime + size** 조합을 시그니처로 사용
- `.omx/cache/codebase-map.json`에 캐시 저장
- atomic rename(임시 파일 → 최종 파일)으로 부분 쓰기 방지

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `generateCodebaseMap(cwd)` | 코드베이스 맵 문자열 생성 (캐시 우선) |
| `readCachedCodebaseMap(...)` | 캐시 유효성 검사 후 반환 |
| `writeCachedCodebaseMap(...)` | atomic rename으로 캐시 저장 |

---

### 3-9. explore-routing.ts

**역할**: `omx explore` 커맨드를 사용할지 판단하고, AGENTS.md에 주입할 가이던스 문자열을 생성합니다.

#### 핵심 로직

- 환경변수 `USE_OMX_EXPLORE_CMD` 가 `0/false/no/off`이면 비활성화 (기본값: 활성화)
- 입력이 단순 탐색 패턴(`where`, `find`, `how does` 등)이고 구현 패턴 없으면 `omx explore` 권고
- `implement`, `write`, `edit` 등의 구현 패턴은 일반 Codex 경로로 유지

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `isExploreCommandRoutingEnabled(env)` | 환경변수 확인 |
| `isSimpleExplorationPrompt(text)` | 단순 탐색 여부 판단 |
| `buildExploreRoutingGuidance(env)` | AGENTS.md 주입용 가이던스 문자열 생성 |

---

### 3-10. task-size-detector.ts

**역할**: 프롬프트의 단어 수와 패턴으로 작업 크기를 `small / medium / large`로 분류합니다.  
OMX에서는 권고(advisory) 용도이며, AGENTS.md 지시문 생성 및 테스트 인프라에 활용됩니다.

#### 분류 기준

| 크기 | 기본 단어 수 | 조건 |
|------|-------------|------|
| `small` | ≤ 50 단어 | 또는 SMALL_TASK_SIGNALS 패턴 일치 |
| `medium` | 51 ~ 200 단어 | |
| `large` | > 200 단어 | 또는 LARGE_TASK_SIGNALS 패턴 일치 |

#### 이스케이프 해치 접두사

`quick:`, `simple:`, `tiny:`, `minor:`, `small:`, `just:`, `only:` 로 시작하면 `small`로 강제.

#### LARGE 신호 패턴 예시

`refactor`, `redesign`, `entire codebase`, `multiple files`, `end-to-end`, `migration` 등

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `classifyTaskSize(prompt, thresholds?)` | 프롬프트 → `TaskSizeResult` 반환 |
| `isHeavyMode(result)` | `large` 여부 반환 |

---

### 3-11. prompt-guidance-contract.ts

**역할**: 핵심 프롬프트 파일들(AGENTS.md, 롤 프롬프트들)이 필수 패턴을 포함하는지 검증합니다.  
`GuidanceSurfaceContract` 인터페이스로 각 프롬프트 파일에 요구되는 패턴 목록을 정의합니다.

#### 검증 대상 프롬프트

- Root template (`prompts/root-template.md`)
- Core role prompts: `executor`, `planner`, `verifier`
- Wave-two 패키지 프롬프트
- Catalog 프롬프트
- Skill 프롬프트

#### 주요 검증 패턴 분류

| 카테고리 | 예시 패턴 |
|---------|---------|
| AUTO-CONTINUE 원칙 | `AUTO-CONTINUE.*clear.*already-requested.*low-risk` |
| ASK 조건 | `ASK only.*destructive.*irreversible.*credential-gated` |
| 라우팅 | `Route to 'explore' for repo-local file / symbol` |
| 역할 책임 | `Leader responsibilities`, `Worker responsibilities` |
| 검증 | `task is grounded and verified` |

---

### 3-12. deep-interview-config-instruction.ts

**역할**: `deep-interview` skill이 활성화된 경우, 설정 파일에서 오버라이드 값을 읽어 에이전트에게 전달할 지시 문자열을 생성합니다.

#### 읽는 데이터

```
.omx/state/sessions/<session_id>/deep-interview-state.json
```

또는 `skill-active-state.json`의 `initialized_state_path` 경로.

#### 설정 항목

- `profile` — 인터뷰 프로파일 이름
- `threshold` — 모호성 점수 임계값
- `max_rounds` — 최대 인터뷰 라운드 수
- `enable_challenge_modes` — 챌린지 모드 활성화 여부

#### 출력 예시

```
Deep-interview config override active from .omx/state/.../deep-interview.json:
profile=strict, threshold=0.7, max_rounds=5, enableChallengeModes=true.
Use these values instead of SKILL.md defaults for ambiguity scoring, challenge-mode gating, and round caps.
```

---

### 3-13. extensibility/ (서브 패키지)

**역할**: 사용자 정의 외부 플러그인을 `.omx/hooks/*.mjs` 파일로 배포하고, OMX 이벤트를 전달하는 플러그인 확장성 시스템.

#### 파일 구성

| 파일 | 역할 |
|------|------|
| `types.ts` | 이벤트 타입, 플러그인 디스크립터, SDK 인터페이스 등 전체 타입 정의 |
| `loader.ts` | `.omx/hooks/` 폴더에서 `.mjs` 플러그인 탐색·검증 |
| `dispatcher.ts` | 플러그인에 이벤트 전달, 타임아웃/오류 격리, 로그 기록 |
| `plugin-runner.ts` | 개별 플러그인 격리 실행 (spawn) |
| `runtime.ts` | 런타임 브릿지 (OMX 내부 → 플러그인 SDK 메서드 구현) |
| `sdk.ts` | 플러그인이 사용할 공개 SDK API 정의 |
| `index.ts` | 모든 심볼 재export |

#### 이벤트 종류 (HookEventName)

```
session-start, stop, session-end, session-idle, turn-complete,
blocked, run.heartbeat, run.blocked_on_user, finished, failed,
worker.assigned, worker.stalled, worker.recovered,
pr-created, test-started, test-finished, test-failed,
needs-input, pre-tool-use, post-tool-use, ...
```

#### 플러그인 발견 조건

1. `.omx/hooks/` 폴더에 `.mjs` 파일로 존재
2. `onHookEvent` 함수를 `export` 해야 함
3. 환경변수 `OMX_HOOK_PLUGINS=0/false/no` 로 전체 비활성화 가능

#### 타임아웃

기본 1500ms (`OMX_HOOK_PLUGIN_TIMEOUT_MS` 환경변수로 조정, 100ms~60000ms).

#### team worker 억제

`OMX_TEAM_WORKER` 환경변수가 설정된 경우 플러그인 이벤트 전달을 억제합니다.

---

### 3-14. code-simplifier/ (서브 패키지)

**역할**: 에이전트 턴 완료 후 최근 수정된 소스 파일을 `code-simplifier` 에이전트에 자동으로 위임해 코드를 단순화합니다.

#### 활성화 조건

`~/.omx/config.json` 에 명시적 opt-in 필요:

```json
{
  "codeSimplifier": {
    "enabled": true,
    "extensions": [".ts", ".tsx"],
    "maxFiles": 5
  }
}
```

기본값: **비활성화**

#### 동작 방식

1. `git status --porcelain`으로 수정된 파일 목록 수집
2. 지정된 확장자 필터링 (기본: `.ts .tsx .js .jsx .py .go .rs`)
3. `code-simplifier-triggered.marker` 파일로 동일 턴 내 재실행 방지
4. 에이전트 호출로 선택된 파일들의 코드 단순화 위임

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `readOmxConfig(configDir?)` | 전역 설정 읽기 |
| `isCodeSimplifierEnabled(configDir?)` | 활성화 여부 확인 |
| `getModifiedFiles(cwd)` | git 수정 파일 목록 |
| `processCodeSimplifier(cwd, opts)` | 전체 흐름 실행 |

---

## 4. 파일 간 의존·호출 관계

```
codex-native-hook.ts (진입점, src/scripts/)
 │
 ├─ detectKeywords()        → keyword-detector.ts
 │    └─ KEYWORD_TRIGGER_DEFINITIONS → keyword-registry.ts
 │    └─ classifyTaskSize() → task-size-detector.ts
 │    └─ isPlanningComplete() → ../planning/artifacts.ts
 │    └─ evaluateWorkflowTransition() → ../state/workflow-transition.ts
 │
 ├─ readTriageConfig()      → triage-config.ts
 │    └─ codexHome()        → ../utils/paths.ts
 │
 ├─ triagePrompt()          → triage-heuristic.ts  (외부 의존 없음)
 │
 ├─ writeTriageState()      → triage-state.ts
 │    └─ getStateDir()      → ../mcp/state-paths.ts
 │
 ├─ applyAgentsMdOverlay()  → agents-overlay.ts
 │    ├─ generateCodebaseMap()          → codebase-map.ts
 │    ├─ buildExploreRoutingGuidance()  → explore-routing.ts
 │    ├─ listActiveSkills()             → ../state/skill-active.ts
 │    └─ isPlanningComplete()           → ../planning/artifacts.ts
 │
 ├─ resetSessionMetrics()   → session.ts
 │
 ├─ buildDeepInterviewConfigInstruction() → deep-interview-config-instruction.ts
 │    └─ getBaseStateDir()  → ../mcp/state-paths.ts
 │
 └─ dispatchHookEvent()     → extensibility/dispatcher.ts
      └─ discoverHookPlugins() → extensibility/loader.ts
```

### 외부에서 이 모듈들을 소비하는 주요 진입점

| 소비처 파일 | 사용 모듈 |
|-----------|---------|
| `src/scripts/codex-native-hook.ts` | keyword-detector, triage-heuristic, triage-config, triage-state, agents-overlay, session, task-size-detector, extensibility/dispatcher |
| `src/scripts/native-hook-stop.ts` | agents-overlay (strip), extensibility/dispatcher (stop 이벤트), code-simplifier |
| `src/scripts/native-config.ts` | keyword-registry (skill 목록) |
| `src/emulator/emulator.ts` | task-size-detector, keyword-detector |

---

## 5. 핵심 타입 요약

| 타입 | 정의 위치 | 용도 |
|------|---------|------|
| `KeywordTriggerDefinition` | keyword-registry.ts | 키워드→skill 매핑 단위 |
| `KeywordMatch` | keyword-detector.ts | 탐지된 키워드 결과 |
| `SkillActiveState` | keyword-detector.ts | 상태 파일 스키마 (v1) |
| `DeepInterviewInputLock` | keyword-detector.ts | deep-interview 입력 잠금 상태 |
| `StatefulSkillMode` | keyword-detector.ts | 상태 유지 가능 skill 목록 유니온 |
| `TriageLane` | triage-heuristic.ts | `"HEAVY" \| "LIGHT" \| "PASS"` |
| `TriageDecision` | triage-heuristic.ts | 분류 결과 객체 |
| `TriageConfig` | triage-config.ts | 설정 파일 파싱 결과 |
| `TriageStateFile` | triage-state.ts | 세션 triage 상태 파일 스키마 |
| `TaskSize` | task-size-detector.ts | `"small" \| "medium" \| "large"` |
| `TaskSizeResult` | task-size-detector.ts | 크기 분류 결과 |
| `SessionState` | session.ts | 세션 상태 파일 스키마 |
| `HookEventEnvelope` | extensibility/types.ts | 플러그인 이벤트 봉투 |
| `HookPluginDescriptor` | extensibility/types.ts | 플러그인 메타데이터 |
| `CodeSimplifierConfig` | code-simplifier/index.ts | 코드 단순화 설정 |

---

## 6. 상수·임계값 요약

| 상수 | 값 | 위치 | 의미 |
|------|-----|------|------|
| `HEAVY_WORD_THRESHOLD` | 5 | triage-heuristic.ts | 이 단어 수 초과 시 HEAVY 판단 기준 |
| `SHORT_QUESTION_WORD_LIMIT` | 10 | triage-heuristic.ts | `?` 질문을 explore로 인정하는 최대 단어 수 |
| `ANCHORED_EDIT_WORD_LIMIT` | 15 | triage-heuristic.ts | 앵커 편집을 executor로 인정하는 최대 단어 수 |
| `DEFAULT_THRESHOLDS.smallWordLimit` | 50 | task-size-detector.ts | small 작업 최대 단어 수 |
| `DEFAULT_THRESHOLDS.largeWordLimit` | 200 | task-size-detector.ts | large 작업 시작 단어 수 |
| `MAX_OVERLAY_SIZE` | 3500 | agents-overlay.ts | AGENTS.md 오버레이 최대 문자 수 |
| `MAX_MAP_CHARS` | 1000 | codebase-map.ts | 코드베이스 맵 최대 문자 수 |
| `MAX_FILES_PER_DIR` | 10 | codebase-map.ts | 디렉토리당 최대 파일 수 |
| `MAX_DIRS` | 14 | codebase-map.ts | 스냅샷에 포함할 최대 디렉토리 수 |
| `HOOK_PLUGIN_TIMEOUT_MS` 기본값 | 1500ms | extensibility/loader.ts | 플러그인 실행 기본 타임아웃 |
| `DEFAULT_MAX_FILES` | 10 | code-simplifier/index.ts | 1회 단순화 최대 파일 수 |
| `CACHE_VERSION` | 1 | codebase-map.ts | 코드베이스 맵 캐시 버전 |
