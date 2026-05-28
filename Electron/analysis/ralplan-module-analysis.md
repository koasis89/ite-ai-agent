# src/ralplan/ 모듈 분析

> 작성일: 2026-05  
> 대상 경로: `src/ralplan/`  
> 분析 범위: 소스 파일 2개 + 테스트 파일 1개

---

## 1. 폴더 구조

```
src/ralplan/
├── runtime.ts           # Ralplan 합의 루프 실행 엔진 + 타입 계약
├── consensus-gate.ts    # 합의 게이트 증거 추출 · 검증 (파일 시스템 탐색)
└── __tests__/
    └── runtime.test.ts  # 합의 루프 시나리오 통합 테스트
```

---

## 2. 시스템 개요

`$ralplan`은 OMX의 **계획 합의(Consensus Planning)** 워크플로이다.  
단순 계획 수립에 그치지 않고, 두 에이전트(`architect`, `critic`)가 각각 독립적으로 검토·승인해야만 계획을 확정한다.

```
$ralplan "task"
    │
    ├── runtime.ts     : draft → architect-review → critic-review 반복 루프 관리
    └── consensus-gate.ts : 결과물(상태 파일)에서 합의 증거 추출 + 검증
```

### 핵심 철학

> **"플래닝 아티팩트 존재 ≠ 합의"**  
> `.omx/plans/prd-*.md`와 `test-spec-*.md`가 있어도 architect + critic 양쪽이 `verdict: 'approve'`를 내려야 하며, critic이 architect보다 먼저 완료될 수 없다.

---

## 3. 데이터 흐름

```
runRalplanConsensus(executor, options)
         │
         ▼
   startMode('ralplan', ...) ── modes/base.ts
         │
         ▼
  ┌─── [iteration 루프] ─────────────────────────────────────────────┐
  │                                                                   │
  │  updateRalplanState(phase='draft')                                │
  │         │                                                         │
  │         ▼                                                         │
  │  executor.draft(ctx) ──────────────────────────────► drafts[]    │
  │         │                                                         │
  │  updateRalplanState(phase='architect-review')                     │
  │         │                                                         │
  │         ▼                                                         │
  │  executor.architectReview(ctx) ────────────────► architectReviews[]
  │         │                                                         │
  │   verdict !== 'approve' ──► iteration++ → continue               │
  │         │                                                         │
  │   verdict === 'approve'                                           │
  │         │                                                         │
  │  updateRalplanState(phase='critic-review')                        │
  │         │                                                         │
  │         ▼                                                         │
  │  executor.criticReview(ctx) ───────────────────► criticReviews[] │
  │         │                                                         │
  │  buildRalplanConsensusGate() ── consensusGate.complete?          │
  │         │                                                         │
  │   false ─► iteration++ → continue                                │
  │   true  ─► readPlanningArtifacts() ── isPlanningComplete()?      │
  │               false → failed                                      │
  │               true  → complete ✓                                 │
  │                                                                   │
  │  iteration >= maxIterations → failed                              │
  └───────────────────────────────────────────────────────────────────┘
         │
         ▼
  RalplanRuntimeResult  →  updateRalplanState(active=false)
```

---

## 4. 파일별 상세 분析

### 4.1 `runtime.ts` — 합의 루프 실행 엔진

Ralplan의 **실행 계약(Contract)과 루프 엔진**. 외부에서 `executor` 오브젝트를 주입받아 draft·architect·critic 세 단계를 반복 실행한다.

#### 페이즈 정의

```typescript
const RALPLAN_ACTIVE_PHASES = [
  'draft',            // 계획 초안 작성 중
  'architect-review', // 아키텍트 검토 중
  'critic-review',    // 크리틱 검토 중
  'complete',         // 합의 완료 (터미널)
] as const;

type RalplanTerminalPhase = 'complete' | 'cancelled' | 'failed';
type RalplanReviewVerdict = 'approve' | 'iterate' | 'reject';
```

#### 공개 타입

| 타입 | 역할 |
|---|---|
| `RalplanDraftResult` | 드래프트 결과 `{ summary?, planPath?, artifacts? }` |
| `RalplanReviewResult` | 리뷰 결과 `{ verdict, summary?, artifacts? }` |
| `RalplanConsensusGate` | 합의 게이트 전체 스냅샷 (완료 여부, 양쪽 리뷰 오브젝트, blocked_reason) |
| `RalplanConsensusIterationContext` | 각 반복에 전달되는 컨텍스트 (task, cwd, iteration, 이전 드래프트·리뷰 목록) |
| `RalplanConsensusExecutor` | 실행자 인터페이스 (draft, architectReview, criticReview 메서드) |
| `RalplanRuntimeResult` | 최종 결과 (status, phase, planningComplete, 전체 이력, consensusGate) |

#### `RalplanConsensusExecutor` 인터페이스

```typescript
interface RalplanConsensusExecutor {
  draft(ctx: RalplanConsensusIterationContext): Promise<RalplanDraftResult>;
  architectReview(
    ctx: RalplanConsensusIterationContext & { draft: RalplanDraftResult },
  ): Promise<RalplanReviewResult>;
  criticReview(
    ctx: RalplanConsensusIterationContext & {
      draft: RalplanDraftResult;
      architectReview: RalplanReviewResult;
    },
  ): Promise<RalplanReviewResult>;
}
```

외부 구현체(파이프라인, CLI)가 이 인터페이스를 구현하여 주입한다.

#### 합의 게이트 빌드 규칙 (`buildRalplanConsensusGate`)

```
architect[-1].verdict === 'approve'
  AND critic[-1].verdict === 'approve'
  AND architectReviews.length === criticReviews.length
  → complete: true

그 외:
  architect 미승인 → blocked_reason: 'architect_review_missing_or_not_approved'
  critic 미승인    → blocked_reason: 'critic_review_missing_or_not_approved'
  기타             → blocked_reason: 'missing_sequential_architect_then_critic_approval'
```

#### 완료 조건 (루프 탈출)

```
합의 게이트 complete: true
  + isPlanningComplete(readPlanningArtifacts(cwd)) === true
  → status: 'completed', phase: 'complete', planningComplete: true
```

플래닝 아티팩트(PRD + test-spec)가 없으면 합의가 이루어져도 `failed` 반환.

#### 실패 시 `status_message` 패턴

| 상황 | status_message |
|---|---|
| architect 미승인 + maxIterations 도달 | `Status: paused_for_review — ralplan reached the N-iteration review limit without Architect approval; continue from the best current artifact or ask the user how to proceed.` |
| critic 미승인 + maxIterations 도달 | `Status: paused_for_review — ralplan reached the N-iteration review limit without approval; ...` |
| 합의 후 플래닝 아티팩트 없음 | `Status: failed — ralplan consensus approved, but required PRD and test-spec planning artifacts are missing; do not hand off to execution.` |
| 정상 완료 | `Status: complete — ralplan consensus approved and planning artifacts are ready for handoff.` |
| 예외 발생 | `Status: failed — ralplan encountered an error and cannot continue without inspecting the failure.` |

#### 공개 함수

| 함수 | 역할 |
|---|---|
| `runRalplanConsensus(executor, options)` | 합의 루프 실행 → `RalplanRuntimeResult` |
| `cancelRalplanConsensus(cwd?)` | ralplan 모드 취소 (`cancelMode('ralplan', ...)`) |

---

### 4.2 `consensus-gate.ts` — 합의 증거 추출 + 검증

이미 기록된 상태 파일 또는 아티팩트 오브젝트에서 **합의 게이트 증거**를 추출한다. 런타임 실행 없이 순수하게 파일 읽기 + 증거 파싱에 집중한다.

#### 공개 타입

```typescript
interface RalplanConsensusGateEvidence {
  complete: boolean;
  sequence: ['architect-review', 'critic-review'];
  ralplan_architect_review: Record<string, unknown> | null;
  ralplan_critic_review: Record<string, unknown> | null;
  source: string | null;      // 증거를 찾은 소스 경로/이름
  blockedReason: string | null;
}

interface RalplanConsensusSource {
  source: string;             // 소스 식별자 (파일 경로 또는 'stage-context-artifacts')
  value: unknown;             // 파싱된 JSON 오브젝트
}
```

#### 공개 함수

| 함수 | 역할 |
|---|---|
| `buildRalplanConsensusGateFromSources(sources)` | 소스 목록에서 순차적으로 탐색 → 첫 번째 유효 증거 반환 |
| `buildRalplanConsensusGateForCwd(cwd, options)` | cwd 기반으로 artifacts + 로컬 상태 파일 탐색 |
| `hasDurableRalplanConsensusEvidenceForCwd(cwd, options)` | 합의 증거 존재 여부 boolean 반환 |
| `readLocalRalplanConsensusStateCandidates(cwd, sessionId?)` | 로컬 `.omx/state` 파일 탐색 → `RalplanConsensusSource[]` |

#### `buildRalplanConsensusGateForCwd` 탐색 순서

```
1. options.artifacts                        (source: 'stage-context-artifacts')
2. options.artifacts.ralplan                (source: 'stage-context-ralplan-artifact')
3. readLocalRalplanConsensusStateCandidates():
   - .omx/state/sessions/{sessionId}/ralplan-state.json
   - .omx/state/sessions/{sessionId}/autopilot-state.json
   - (세션 없으면) .omx/state/ralplan-state.json
   - (세션 없으면) .omx/state/autopilot-state.json
```

세션 ID는 `session.json`에서 자동으로 읽거나 명시 전달 가능.

#### `extractSequentialConsensusEvidence` — 내부 파싱 로직

단일 오브젝트에서 합의 증거를 5가지 경로로 탐색한다:

```
경로 1: value.ralplanConsensusGate / value.ralplan_consensus_gate
  → gate.complete === true
  + hasArchitectThenCriticSequence(gate)
  + isApproveReview(gate.ralplan_architect_review, 'architect')
  + isApproveReview(gate.ralplan_critic_review, 'critic')
  + isCriticNotBeforeArchitect(architectReview, criticReview)

경로 2: value.state.handoff_artifacts
  → 재귀적으로 위 로직 적용

경로 3: value.ralplan_architect_review + value.ralplan_critic_review (직접 필드)

경로 4: value.review_history[-1] 최신 항목의 리뷰 필드

경로 5: value.architectReviews[-1] + value.criticReviews[-1]
  → 양쪽 배열 길이가 같아야 함
```

#### `isApproveReview` 판정 로직

```typescript
// 승인 조건 (모두 충족해야 함):
value.agent_role === agentRole  // 'architect' 또는 'critic'
!hasBlockingReviewSignal(value) // 거부 신호 없음
(value.verdict === 'approve' || value.approved === true || value.clean === true)

// verdict/status/recommendation 지원 키:
verdict: 'approve'
status: 'approve' | 'approved' | 'clear' | 'pass' | 'passed'
recommendation: 'approve' | 'approved'
```

#### `hasBlockingReviewSignal` — 거부 신호 감지

```
불리언 필드: blocked=true, blocking=true, clean=false, rejected=true,
            request_changes=true, requestChanges=true, ...

문자열 값 (verdict/status/recommendation/result):
  'reject', 'rejected', 'block', 'blocked', 'blocking',
  'request_changes', 'requested_changes', 'changes_requested',
  'needs_changes', 'iterate', 'iterating', 'revise', 'revision_required'
```

#### `isCriticNotBeforeArchitect` — 순서 검증

architect 완료 후에 critic이 완료되어야 한다는 순서를 검증한다.

```
타임스탬프 우선 탐색: completed_at > created_at > updated_at > timestamp > ts
수치 순서 폴백:      sequence_index > order > review_order > iteration

criticOrder >= architectOrder → 순서 정상
타임스탬프/인덱스가 없으면 null 반환 → 검사 생략 (관대하게 통과)
```

---

## 5. 모듈 간 호출 관계

```mermaid
flowchart TD
    subgraph ralplan["src/ralplan/"]
        RT[runtime.ts]
        CG[consensus-gate.ts]
    end

    subgraph modes["src/modes/"]
        MB[base.ts\nstartMode / cancelMode\nupdateModeState / readModeState]
    end

    subgraph planning["src/planning/"]
        PA[artifacts.ts\nreadPlanningArtifacts\nisPlanningComplete]
    end

    subgraph state["src/state/"]
        SP[paths.ts\ngetStateDir / getStatePath]
    end

    subgraph consumers["소비자 모듈"]
        CLI[src/cli/ralplan.ts\nCLI 명령 처리]
        PPS[src/pipeline/stages/ralplan.ts\n파이프라인 스테이지]
        MCP[src/mcp/ralplan-mcp.ts\nMCP 도구]
        HOOKS[src/hooks/ralplan.ts\n훅 기반 트리거]
        RAPH[src/pipeline/stages/ralph.ts\nRalph → Ralplan 합의 확인]
    end

    RT -->|startMode / cancelMode\nupdateModeState / readModeState| MB
    RT -->|readPlanningArtifacts\nisPlanningComplete| PA

    CG -->|getStatePath (간접)| SP

    CLI -->|runRalplanConsensus\ncancelRalplanConsensus| RT
    PPS -->|runRalplanConsensus| RT
    MCP -->|runRalplanConsensus| RT
    HOOKS -->|hasDurableRalplanConsensusEvidenceForCwd| CG
    RAPH -->|hasDurableRalplanConsensusEvidenceForCwd\nbuildRalplanConsensusGateForCwd| CG
    PPS -->|buildRalplanConsensusGateForCwd| CG
```

---

## 6. 상태 파일 구조

### `.omx/state/ralplan-state.json` (또는 세션 스코프)

```json
{
  "active": false,
  "mode": "ralplan",
  "current_phase": "complete",
  "iteration": 2,
  "planning_complete": true,
  "latest_plan_path": ".omx/plans/prd-20260528T120000Z-my-task.md",
  "latest_draft_summary": "드래프트 요약",
  "latest_architect_verdict": "approve",
  "latest_architect_summary": "아키텍처 검토 완료",
  "latest_critic_verdict": "approve",
  "latest_critic_summary": "크리틱 검토 완료",
  "completed_at": "2026-05-28T12:00:00.000Z",
  "status_message": "Status: complete — ralplan consensus approved and planning artifacts are ready for handoff.",
  "review_history": [
    {
      "iteration": 1,
      "draft": { "summary": "초안 v1", "planPath": "..." },
      "architect_review": { "verdict": "iterate", ... },
      "critic_review": null
    },
    {
      "iteration": 2,
      "draft": { "summary": "초안 v2", "planPath": "..." },
      "architect_review": { "verdict": "approve", ... },
      "critic_review": { "verdict": "approve", ... }
    }
  ],
  "ralplan_consensus_gate": {
    "required": true,
    "complete": true,
    "sequence": ["architect-review", "critic-review"],
    "planning_artifacts_are_not_consensus": true,
    "required_review_roles": ["architect", "critic"],
    "ralplan_architect_review": { "agent_role": "architect", "verdict": "approve", "iteration": 2 },
    "ralplan_critic_review": { "agent_role": "critic", "verdict": "approve", "iteration": 2 },
    "architect_review": { ... },
    "critic_review": { ... },
    "blocked_reason": null
  }
}
```

---

## 7. 테스트 파일 요약 (`runtime.test.ts`)

실제 임시 디렉터리를 사용하는 **통합 시나리오 테스트**.

| 테스트 케이스 | 검증 내용 |
|---|---|
| 정상 1회 합의 완료 | draft→architect→critic 순서, `status='completed'`, `planning_complete=true`, 최종 상태 파일 내용, `ralplan_consensus_gate` 전체 구조 검증 |
| architect 미승인 + maxIterations=1 | critic 호출 없음, `status='failed'`, `blocked_reason='architect_review_missing_or_not_approved'` |
| critic 재검토 루프 | iteration 증가 확인, 최종 반복 상태 추적 |

모든 테스트는 `beforeEach/afterEach`에서 `OMX_ROOT`, `OMX_STATE_ROOT`, `OMX_TEAM_STATE_ROOT`, `OMX_SESSION_ID` 환경변수를 격리하여 테스트 간 오염 방지.

---

## 8. 설계 원칙

### 1. 합의(Consensus) = Architect + Critic 순차 승인
단순 계획 파일 생성이 완료 기준이 아니다. 두 독립적인 에이전트 역할이 **순서대로** 승인해야 한다 (`planning_artifacts_are_not_consensus: true`).

### 2. 실행자(Executor) 주입 패턴
`runtime.ts`는 `RalplanConsensusExecutor` 인터페이스만 정의하고, 실제 LLM 호출·파일 생성은 외부에서 주입된 `executor` 오브젝트가 담당한다. 테스트에서 모의 구현으로 쉽게 교체 가능.

### 3. 단방향 상태 기록
루프 매 단계마다 `updateRalplanState()`로 현재 상태를 파일에 기록한다. 처리 중 충돌/오류 발생 시 상태 파일로 진행 상황 복원 가능.

### 4. 증거 탐색의 관대함 vs 승인의 엄격함
`consensus-gate.ts`는 **5가지 경로**에서 관대하게 증거를 탐색하되, 승인 판정(`isApproveReview`)은 blocking 신호를 세밀하게 감지하여 엄격히 처리한다.

### 5. 계획 아티팩트 이중 검증
합의 게이트 통과 후에도 `isPlanningComplete()`로 실제 `.omx/plans/prd-*.md`와 `test-spec-*.md` 파일 존재를 재검증한다. 합의 결과와 파일 시스템 상태의 불일치를 방지.

### 6. 타임스탬프 기반 순서 검증
architect → critic 순서를 `completed_at`, `created_at`, `sequence_index` 등 여러 필드로 유연하게 검증. 타임스탬프 없는 경우 순서 검사를 생략(관대 처리)하여 다양한 에이전트 구현 수용.

---

## 9. 연관 분석 파일

| 모듈 | 분析 파일 |
|---|---|
| `src/ralph/` | [ralph-module-analysis.md](./ralph-module-analysis.md) |
| `src/planning/` | [planning-module-analysis.md](./planning-module-analysis.md) |
| `src/pipeline/` | [pipeline-module-analysis.md](./pipeline-module-analysis.md) |
| `src/cli/` | [cli-module-analysis.md](./cli-module-analysis.md) |
| `src/mcp/` | [mcp-module-analysis.md](./mcp-module-analysis.md) |
| `src/modes/` | (미작성) |
