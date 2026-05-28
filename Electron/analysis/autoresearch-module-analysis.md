# src/autoresearch/ 모듈 분석 — 구조·역할·호출관계

> `src/autoresearch/` 폴더는 OMX의 **자율 반복 실험(Autoresearch)** 기능 전체를 담당합니다.
> 에이전트가 코드를 수정하고 → 평가자를 실행하고 → 결과를 판단하여 → 더 나은 커밋을 축적하는
> **실험 루프 엔진**과, 연구 목표(Goal)의 생명주기를 관리하는 **목표 관리 시스템** 두 축으로 구성됩니다.

---

## 목차

1. [폴더 구조 한눈에 보기](#1-폴더-구조-한눈에-보기)
2. [두 가지 워크플로우 개요](#2-두-가지-워크플로우-개요)
3. [파일별 상세 분석](#3-파일별-상세-분석)
   - 3-1. [contracts.ts](#3-1-contractsts)
   - 3-2. [runtime.ts](#3-2-runtimts)
   - 3-3. [goal.ts](#3-3-goalts)
   - 3-4. [skill-validation.ts](#3-4-skill-validationts)
4. [파일 간 의존·호출 관계](#4-파일-간-의존호출-관계)
5. [핵심 타입 요약](#5-핵심-타입-요약)
6. [상태 파일 저장 위치 요약](#6-상태-파일-저장-위치-요약)
7. [의사결정 로직 상세](#7-의사결정-로직-상세)

---

## 1. 폴더 구조 한눈에 보기

```
src/autoresearch/
│
├── contracts.ts        ← 미션 계약 파싱 (mission.md + sandbox.md 로드·검증)
├── runtime.ts          ← 실험 루프 엔진 (git worktree, 이터레이션, 평가자 실행)
├── goal.ts             ← autoresearch-goal 생명주기 관리 (생성·판정·완료)
├── skill-validation.ts ← skill 완료 상태 판단 (mode state 읽기·검증)
└── __tests__/          ← 단위 테스트
```

---

## 2. 두 가지 워크플로우 개요

`src/autoresearch/` 는 두 개의 독립적인 워크플로우를 지원합니다.

### 워크플로우 A: Autoresearch 실험 모드

에이전트가 코드를 반복적으로 수정하고 외부 평가자 스크립트로 성능을 측정하여, 더 나은 결과를 내는 커밋만 유지하는 **탐색적 실험 루프**입니다.

```
mission.md + sandbox.md (미션 디렉토리)
          │
          ▼
[contracts.ts] loadAutoresearchMissionContract()
  ← sandbox.md YAML 프런트매터 파싱 (evaluator.command, evaluator.format, keep_policy)
          │
          ▼
[runtime.ts] prepareAutoresearchRuntime()
  ← git worktree 생성
  ← 베이스라인 평가 실행
  ← 런타임 파일 초기화 (manifest.json, ledger.json, results.tsv, ...)
          │
          ▼
  ┌───────────────────────────────────────┐
  │     실험 반복 루프 (이터레이션)         │
  │                                       │
  │  buildAutoresearchInstructions()      │
  │    ← 에이전트에게 전달할 지시 파일 생성 │
  │                                       │
  │  [에이전트 작업 실행]                  │
  │    ← 코드 수정 후 candidate.json 기록  │
  │                                       │
  │  runAutoresearchEvaluator()           │
  │    ← evaluator.command 실행           │
  │    ← JSON 결과 파싱 ({pass, score})   │
  │                                       │
  │  decideAutoresearchOutcome()          │
  │    ← keep / discard / abort / noop   │
  │                                       │
  │  advanceAutoresearchRun()             │
  │    ← keep → 커밋 유지                │
  │    ← discard → 워크트리 리셋          │
  └───────────────────────────────────────┘
          │
          ▼
[완료] stopAutoresearchRun() / completeAutoresearchRun()
```

### 워크플로우 B: Autoresearch-Goal 목표 모드

연구 주제(topic)와 평가 기준(rubric)을 등록하고, 에이전트가 연구를 수행한 뒤 **교수 비평가(professor-critic)**가 검증하여 통과하면 목표를 완료하는 **목표 달성 워크플로우**입니다.

```
omx autoresearch-goal create --topic "..." --rubric "..."
          │
          ▼
[goal.ts] createAutoresearchGoal()
  ← mission.json, rubric.md, ledger.jsonl 생성
          │
          ▼
[에이전트가 연구 수행]
          │
          ▼
omx autoresearch-goal verdict --slug "..." --verdict pass --evidence "..."
          │
          ▼
[goal.ts] recordAutoresearchGoalVerdict()
  ← completion.json 기록
  ← 상태: passed / failed / blocked
          │
          ▼
omx autoresearch-goal complete --slug "..." --codex-goal-json "..."
          │
          ▼
[goal.ts] completeAutoresearchGoal()
  ← Codex Goal 스냅샷 일치 검증
  ← 상태: complete
```

---

## 3. 파일별 상세 분석

---

### 3-1. contracts.ts

**역할**: 미션 디렉토리에서 `mission.md`와 `sandbox.md`를 로드하고, YAML 프런트매터를 파싱하여 계약(contract) 객체로 반환합니다.  
순수 파싱 모듈로, 비즈니스 로직 없이 데이터 검증에 집중합니다.

#### 미션 디렉토리 구조

```
<mission-dir>/
├── mission.md     ← 에이전트에게 전달할 연구/작업 지시 (자유 형식)
└── sandbox.md     ← 평가자 계약 정의 (YAML 프런트매터 필수)
```

#### sandbox.md 형식

```yaml
---
evaluator:
  command: "node scripts/evaluate.js"
  format: json
  keep_policy: score_improvement   # 또는 pass_only (선택)
---
# 샌드박스 정책 (자유 형식 Markdown)
```

#### 주요 타입

```typescript
// 평가자 계약
interface AutoresearchEvaluatorContract {
  command: string;        // 실행할 평가자 커맨드
  format: 'json';         // v1은 항상 JSON
  keep_policy?: AutoresearchKeepPolicy;
}

// keep_policy 옵션
type AutoresearchKeepPolicy =
  | 'score_improvement'  // 점수가 개선된 경우만 유지 (기본값)
  | 'pass_only';         // pass=true이면 무조건 유지

// 평가자 실행 결과 (JSON 파싱 후)
interface AutoresearchEvaluatorResult {
  pass: boolean;          // 필수
  score?: number;         // 선택 (점수 기반 비교 시 필요)
}

// 미션 계약 전체
interface AutoresearchMissionContract {
  missionDir: string;
  repoRoot: string;
  missionFile: string;
  sandboxFile: string;
  missionRelativeDir: string;
  missionContent: string;
  sandboxContent: string;
  sandbox: ParsedSandboxContract;
  missionSlug: string;    // missionRelativeDir을 slugify한 값
}
```

#### 검증 규칙 (오류 시 예외 발생)

| 조건 | 오류 메시지 |
|------|-----------|
| 미션 디렉토리가 git 리포지토리 외부 | `mission-dir must be inside a git repository.` |
| sandbox.md에 YAML 프런트매터 없음 | `sandbox.md must start with YAML frontmatter...` |
| `evaluator` 블록 없음 | `sandbox.md frontmatter must define an evaluator block.` |
| `evaluator.command` 없음 | `sandbox.md frontmatter evaluator.command is required.` |
| `evaluator.format` 없음 | `evaluator.format is required and must be json` |
| `evaluator.format`이 json 아님 | `evaluator.format must be json in autoresearch v1.` |
| `keep_policy`가 허용 값 외 | `evaluator.keep_policy must be one of: score_improvement, pass_only.` |

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `loadAutoresearchMissionContract(missionDir)` | 비동기. 미션 디렉토리 로드·파싱·검증 |
| `parseSandboxContract(content)` | sandbox.md 문자열 → `ParsedSandboxContract` |
| `parseEvaluatorResult(raw)` | 평가자 JSON 출력 문자열 → `AutoresearchEvaluatorResult` |
| `slugifyMissionName(value)` | 미션 이름 → URL-safe 슬러그 (최대 48자) |

#### 의존 관계

```
contracts.ts
  ├── child_process (execFileSync)   ← git rev-parse로 repoRoot 확인
  └── path, fs, fs/promises         ← 파일 I/O
```

---

### 3-2. runtime.ts

**역할**: Autoresearch 실험 루프의 핵심 엔진. git worktree를 생성·관리하고, 이터레이션마다 에이전트 지시를 생성하며, 평가자를 실행하고, 결과에 따라 커밋을 유지하거나 리셋합니다.

#### 핵심 상태 파일

```
.omx/
├── state/
│   └── autoresearch-state.json         ← 현재 활성 실행 상태 (lock 역할)
└── logs/
    └── autoresearch/
        └── <run_id>/
            ├── manifest.json           ← 실행 전체 메타데이터
            ├── ledger.json             ← 이터레이션 기록 (구조화)
            ├── results.tsv             ← iteration/commit/pass/score/status (TSV)
            ├── instructions.md         ← 에이전트에게 전달할 지시 파일
            ├── latest-evaluator.json   ← 마지막 평가자 실행 결과
            └── candidate.json          ← 에이전트가 기록한 후보 아티팩트
```

#### 주요 타입

```typescript
// 실행 매니페스트 (전체 실행 메타데이터)
interface AutoresearchRunManifest {
  schema_version: 1;
  run_id: string;
  run_tag: string;
  mission_dir: string;
  repo_root: string;
  worktree_path: string;
  mission_slug: string;
  branch_name: string;
  baseline_commit: string;
  last_kept_commit: string;
  last_kept_score: number | null;
  latest_candidate_commit: string | null;
  evaluator: AutoresearchEvaluatorContract;
  keep_policy: AutoresearchKeepPolicy;
  status: AutoresearchRunStatus;
  stop_reason: string | null;
  iteration: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // 파일 경로들
  results_file, instructions_file, manifest_file, ledger_file, ...
}

// 이터레이션 결정 결과
type AutoresearchDecisionStatus =
  | 'baseline'     // 베이스라인 초기화
  | 'keep'         // 후보 커밋 채택
  | 'discard'      // 후보 폐기 (평가 실패 또는 점수 미달)
  | 'ambiguous'    // 점수 비교 불가 (pass이지만 숫자 점수 없음)
  | 'noop'         // 에이전트가 변경사항 없음 보고
  | 'abort'        // 에이전트가 중단 요청
  | 'interrupted'  // 세션 중단됨
  | 'error';       // 평가자 오류

// 에이전트가 기록하는 후보 아티팩트
interface AutoresearchCandidateArtifact {
  status: 'candidate' | 'noop' | 'abort' | 'interrupted';
  candidate_commit: string | null;
  base_commit: string;
  description: string;
  notes: string[];
  created_at: string;
}

// 평가자 실행 기록
interface AutoresearchEvaluationRecord {
  command: string;
  ran_at: string;
  status: 'pass' | 'fail' | 'error';
  pass?: boolean;
  score?: number;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  parse_error?: string;
}
```

#### 주요 함수 목록

| 함수 | 역할 |
|------|------|
| `prepareAutoresearchRuntime(contract, projectRoot, opts)` | worktree 생성, 베이스라인 평가, manifest 초기화 |
| `runAutoresearchEvaluator(contract, worktreePath, ...)` | 평가자 커맨드 실행 → `AutoresearchEvaluationRecord` |
| `decideAutoresearchOutcome(manifest, candidate, eval)` | keep/discard/abort/noop 결정 (순수 함수) |
| `advanceAutoresearchRun(contract, manifest, projectRoot)` | 다음 이터레이션 준비 (지시 파일 갱신, manifest 업데이트) |
| `resetAutoresearchWorktree(manifest, ...)` | 폐기 결정 시 워크트리를 `last_kept_commit`으로 리셋 |
| `buildAutoresearchInstructions(contract, context)` | 에이전트 지시 Markdown 문자열 생성 |
| `materializeAutoresearchMissionToWorktree(contract, wt)` | mission.md + sandbox.md를 워크트리에 복사·커밋 |
| `loadAutoresearchRunManifest(projectRoot, runId)` | 기존 실행 재개를 위한 manifest 로드 |
| `stopAutoresearchRun(manifest, projectRoot, reason)` | 실행 중단 (상태를 stopped로 변경) |
| `completeAutoresearchRun(manifest, projectRoot)` | 실행 완료 처리 |
| `assertResetSafeWorktree(worktreePath)` | 워크트리에 허용되지 않은 수정 사항 없는지 검사 |
| `countTrailingAutoresearchNoops(ledgerFile)` | 연속 noop 횟수 집계 |
| `buildAutoresearchRunTag(date?)` | ISO 타임스탬프 기반 run tag 생성 |

#### 워크트리 제외 항목

git 인덱스에서 추적되지 않는 런타임 전용 파일들:

```
results.tsv, run.log, node_modules/, .omx/
```

#### 실험 루프 이터레이션 흐름 (단일 사이클)

```
1. writeInstructionsFile()
   └─ buildAutoresearchInstructions() 호출
   └─ 직전 3개 ledger 요약 포함

2. [에이전트 실행]
   └─ candidate.json 파일에 결과 기록

3. runAutoresearchEvaluator()
   └─ spawnSync(evaluator.command)
   └─ JSON stdout 파싱

4. decideAutoresearchOutcome()
   └─ keep_policy == 'pass_only'  → pass=true이면 keep
   └─ keep_policy == 'score_improvement':
       - score 없으면 ambiguous
       - score 증가하면 keep
       - 그 외 discard

5. keep → 커밋 유지
   discard / ambiguous → resetAutoresearchWorktree()

6. recordAutoresearchIteration()
   └─ results.tsv 행 추가
   └─ ledger.json 엔트리 추가

7. advanceAutoresearchRun()
   └─ manifest.iteration++
   └─ 다음 이터레이션 지시 파일 생성
```

#### 의존 관계

```
runtime.ts
  ├── contracts.ts             ← parseEvaluatorResult(), AutoresearchMissionContract
  ├── ../modes/base.ts         ← cancelMode(), readModeState(), startMode(), updateModeState()
  ├── child_process            ← execFileSync(), spawnSync() (git 조작, 평가자 실행)
  └── fs, fs/promises, path    ← 파일 I/O
```

---

### 3-3. goal.ts

**역할**: `autoresearch-goal` 워크플로우의 생명주기(생성 → 판정 → 완료)를 관리합니다.  
자유형 실험이 아닌, **정의된 주제와 루브릭** 기반의 목표 달성 방식입니다.

#### 상태 전이도

```
created
   │
   ▼ (에이전트 연구 수행)
in_progress
   │
   ├─ verdict=pass  → passed
   ├─ verdict=fail  → failed
   └─ verdict=blocked → blocked
              │
              ▼ (Codex Goal 스냅샷 일치 검증 후)
           complete
```

#### 저장 파일 구조

```
.omx/goals/autoresearch/<slug>/
├── mission.json    ← 목표 메타데이터 (상태, 주제, 루브릭 참조)
├── rubric.md       ← 평가 기준 텍스트
├── ledger.jsonl    ← 이벤트 로그 (JSONL 형식, 추가 전용)
└── completion.json ← 판정 결과 (verdict, evidence, artifact_path)
```

#### 주요 타입

```typescript
// 목표 미션 (mission.json)
interface AutoresearchGoalMission {
  schema_version: 1;
  workflow: 'autoresearch-goal';
  slug: string;
  topic: string;
  rubric: string;
  critic_command?: string;
  status: AutoresearchGoalStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // 파일 경로 (repo-relative)
  mission_path, rubric_path, ledger_path, completion_path: string;
}

// 판정 결과 (completion.json)
interface AutoresearchGoalCompletion {
  schema_version: 1;
  slug: string;
  verdict: 'pass' | 'fail' | 'blocked';
  passed: boolean;
  summary: string;
  evidence: string;
  artifact_path?: string;
  critic_command?: string;
  recorded_at: string;
}

// ledger.jsonl 이벤트 타입
type LedgerEvent =
  | 'workflow_created'
  | 'goal_handoff_emitted'
  | 'validation_passed'
  | 'validation_failed'
  | 'validation_blocked'
  | 'goal_completed';
```

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `createAutoresearchGoal(cwd, options)` | 목표 생성. `--force` 없이 덮어쓰기 방지 |
| `readAutoresearchGoal(cwd, slug)` | 목표 읽기. 없으면 오류 |
| `readAutoresearchGoalCompletion(cwd, slug)` | 판정 결과 읽기. 없으면 null |
| `recordAutoresearchGoalVerdict(cwd, options)` | 판정 기록 (pass/fail/blocked). 이미 complete이면 오류 |
| `completeAutoresearchGoal(cwd, slug, options)` | 목표 최종 완료. `completion.passed==true` + Codex Goal 스냅샷 일치 필요 |
| `buildAutoresearchGoalObjective(mission)` | 에이전트에게 전달할 목표 지시 문자열 생성 (현재 형식) |
| `buildLegacyAutoresearchGoalObjective(mission)` | 레거시 형식 목표 지시 문자열 |
| `reconcileAutoresearchCodexGoalSnapshot(snapshot, mission, opts)` | Codex Goal 스냅샷과 미션 상태 일치 검증 |
| `autoresearchGoalDir/MissionPath/RubricPath/...` | 경로 헬퍼 함수들 |

#### 완료 게이트 조건

`completeAutoresearchGoal()` 호출 시 두 조건을 모두 만족해야 합니다:

1. `completion.passed === true` AND `completion.verdict === 'pass'`
2. `reconcileAutoresearchCodexGoalSnapshot()` 성공 (Codex Goal 스냅샷 일치)

#### 의존 관계

```
goal.ts
  ├── contracts.ts                      ← slugifyMissionName()
  ├── ../goal-workflows/codex-goal-snapshot.ts
  │     ← formatCodexGoalReconciliation()
  │     ← parseCodexGoalSnapshot()
  │     ← reconcileCodexGoalSnapshot()
  └── fs, fs/promises, path             ← 파일 I/O
```

---

### 3-4. skill-validation.ts

**역할**: `autoresearch` skill이 활성화된 세션에서 **완료 상태**를 판단합니다.  
Mode state 파일을 읽어 두 가지 검증 모드 중 하나로 완료 여부를 평가합니다.

#### 두 가지 검증 모드

| 모드 | 설명 | 완료 조건 |
|------|------|---------|
| `mission-validator-script` | 별도 validator 스크립트가 아티팩트를 검증 | artifact의 `passed/complete/valid`가 true 또는 status가 passing 값 |
| `prompt-architect-artifact` | 아키텍트 에이전트가 결과물을 검토·승인 | `architect_approved` 또는 `architect_review/validation.verdict`가 passing 값 |

#### 상태 파일 읽기 경로

```typescript
// 읽기 순서 (위에서 아래로, 첫 번째 존재하는 파일 사용)
1. .omx/state/sessions/<session_id>/autoresearch.json    ← 세션 범위
2. .omx/state/autoresearch.json                         ← 프로젝트 범위
```

#### 완료 상태 판단 흐름 (assessAutoresearchCompletionState)

```
rawState 없음 → { complete: false, reason: 'missing_mode_state' }
  │
validation_mode 없음 → { complete: false, reason: 'missing_validation_mode' }
  │
  ├─ 모드: mission-validator-script
  │   │
  │   ├─ validator_command 없음 → complete: false
  │   └─ artifact.passed/complete/valid == true → complete: true
  │
  └─ 모드: prompt-architect-artifact
      │
      ├─ validator_prompt 없음 → complete: false
      ├─ output_artifact 없음 또는 파일 없음 → complete: false
      ├─ architect_approved 없음 → complete: false
      └─ 모든 조건 충족 → complete: true
```

#### passing 판정 값 목록

```
'pass', 'passed', 'complete', 'completed', 'success', 'succeeded', 'approved'
```

#### 주요 함수

| 함수 | 설명 |
|------|------|
| `assessAutoresearchCompletionState(rawState, cwd)` | 순수 완료 판단 로직 (async) |
| `readAutoresearchModeState(cwd, sessionId?)` | 세션/프로젝트 범위 mode state 읽기 |
| `readAutoresearchModeStateForActiveDecision(cwd, sessionId?)` | 권위있는 활성 상태 경로에서 읽기 |
| `readAutoresearchCompletionStatus(cwd, sessionId?)` | 위 두 함수를 조합한 완료 상태 최종 판단 |
| `normalizeAutoresearchValidationMode(value)` | 검증 모드 문자열 정규화 |

#### 의존 관계

```
skill-validation.ts
  ├── ../mcp/state-paths.ts
  │     ← getAuthoritativeActiveStatePaths()
  │     ← getReadScopedStatePaths()
  └── fs, fs/promises, path    ← 파일 I/O
```

---

## 4. 파일 간 의존·호출 관계

```
[외부: src/mcp/tools/autoresearch-tools.ts 또는 src/scripts/]
          │
          ├─ loadAutoresearchMissionContract()  → contracts.ts
          │     └─ parseSandboxContract()
          │     └─ parseEvaluatorResult()
          │
          ├─ prepareAutoresearchRuntime()       → runtime.ts
          │     └─ contracts.ts (parseEvaluatorResult)
          │     └─ ../modes/base.ts
          │
          ├─ advanceAutoresearchRun()           → runtime.ts
          │     └─ buildAutoresearchInstructions()
          │     └─ runAutoresearchEvaluator()
          │     └─ decideAutoresearchOutcome()
          │
          ├─ createAutoresearchGoal()           → goal.ts
          │     └─ contracts.ts (slugifyMissionName)
          │     └─ ../goal-workflows/codex-goal-snapshot.ts
          │
          ├─ recordAutoresearchGoalVerdict()    → goal.ts
          │
          ├─ completeAutoresearchGoal()         → goal.ts
          │     └─ reconcileAutoresearchCodexGoalSnapshot()
          │     └─ ../goal-workflows/codex-goal-snapshot.ts
          │
          └─ readAutoresearchCompletionStatus() → skill-validation.ts
                └─ assessAutoresearchCompletionState()
                └─ ../mcp/state-paths.ts
```

### 외부에서 이 모듈을 소비하는 파일

| 소비처 | 사용 모듈 | 용도 |
|-------|---------|------|
| `src/mcp/tools/autoresearch/` | contracts, runtime, goal | MCP 도구 구현 |
| `src/cli/commands/autoresearch.ts` | contracts, runtime | CLI `omx autoresearch` |
| `src/cli/commands/autoresearch-goal.ts` | goal | CLI `omx autoresearch-goal` |
| `src/hooks/keyword-detector.ts` | skill-validation | autoresearch 완료 게이팅 |
| `src/modes/autoresearch.ts` | goal, skill-validation | 모드 상태 관리 |

---

## 5. 핵심 타입 요약

| 타입 | 정의 파일 | 설명 |
|------|---------|------|
| `AutoresearchKeepPolicy` | contracts.ts | `'score_improvement' \| 'pass_only'` |
| `AutoresearchEvaluatorContract` | contracts.ts | 평가자 커맨드 설정 |
| `AutoresearchEvaluatorResult` | contracts.ts | 평가자 JSON 출력 파싱 결과 |
| `AutoresearchMissionContract` | contracts.ts | 미션 디렉토리 전체 계약 |
| `ParsedSandboxContract` | contracts.ts | sandbox.md 파싱 결과 |
| `AutoresearchRunManifest` | runtime.ts | 실행 전체 메타데이터 |
| `AutoresearchCandidateArtifact` | runtime.ts | 에이전트가 작성하는 후보 아티팩트 |
| `AutoresearchDecisionStatus` | runtime.ts | 이터레이션 결정 결과 (8가지) |
| `AutoresearchCandidateStatus` | runtime.ts | 후보 상태 (4가지) |
| `AutoresearchRunStatus` | runtime.ts | 실행 상태 (4가지) |
| `AutoresearchEvaluationRecord` | runtime.ts | 평가자 실행 기록 |
| `AutoresearchLedgerEntry` | runtime.ts | ledger 이터레이션 기록 |
| `AutoresearchGoalMission` | goal.ts | 목표 미션 파일 스키마 |
| `AutoresearchGoalCompletion` | goal.ts | 판정 결과 파일 스키마 |
| `AutoresearchGoalStatus` | goal.ts | 목표 상태 (6가지) |
| `AutoresearchGoalVerdict` | goal.ts | 판정 값 (`'pass' \| 'fail' \| 'blocked'`) |
| `AutoresearchValidationMode` | skill-validation.ts | 검증 모드 (2가지) |
| `AutoresearchCompletionStatus` | skill-validation.ts | 완료 판단 결과 |

---

## 6. 상태 파일 저장 위치 요약

### 실험 모드 (Autoresearch)

```
.omx/
├── state/
│   └── autoresearch-state.json         ← 활성 실행 lock
└── logs/
    └── autoresearch/
        └── <mission_slug>-<run_tag>/
            ├── manifest.json
            ├── ledger.json
            ├── results.tsv
            ├── instructions.md
            ├── latest-evaluator.json
            └── candidate.json
```

git worktree 위치:
```
<repo_root>/.git/worktrees/<run_id>/    ← git 관리 메타데이터
<worktree_path>/                        ← 실제 실험 작업 디렉토리
```

### 목표 모드 (Autoresearch-Goal)

```
.omx/
└── goals/
    └── autoresearch/
        └── <slug>/
            ├── mission.json
            ├── rubric.md
            ├── ledger.jsonl
            └── completion.json
```

### Skill 검증 상태

```
.omx/state/
├── autoresearch.json                        ← 프로젝트 범위
└── sessions/<session_id>/
    └── autoresearch.json                    ← 세션 범위
```

---

## 7. 의사결정 로직 상세

### decideAutoresearchOutcome() — 결정 우선순위

```
1. candidate.status == 'abort'          → abort (에이전트 명시적 중단 요청)
2. candidate.status == 'noop'           → noop (변경 없음)
3. candidate.status == 'interrupted'    → interrupted (세션 중단)
4. evaluation == null or status='error' → discard (평가자 오류)
5. evaluation.pass == false             → discard (평가 실패)
6. keep_policy == 'pass_only'           → keep (pass=true → 무조건 채택)
7. 점수 비교 불가 (숫자 없음)           → ambiguous (유지 안함)
8. score > last_kept_score              → keep (점수 향상)
9. score <= last_kept_score             → discard (점수 미달)
```

### completeAutoresearchGoal() — 완료 게이트

두 조건이 순서대로 모두 충족되어야 합니다:

```
Step 1: completion.passed == true AND completion.verdict == 'pass'
   └─ 실패 시: "cannot complete until professor-critic validation records verdict=pass"

Step 2: reconcileAutoresearchCodexGoalSnapshot(snapshot, mission, {requireSnapshot: true, requireComplete: true})
   └─ Codex의 get_goal이 반환한 JSON이 mission.slug와 일치하고 status == 'complete'여야 함
   └─ 실패 시: formatCodexGoalReconciliation() 결과 오류 메시지
```
