/**
 * EL-224: 복합 상태(team + ralph 등) 전이 규칙 파서 및 롤백 방지 로직
 *
 * 아키텍처 규칙:
 *   - ADR-001: spawnSync 절대 금지
 *   - 상태 파일 쓰기 없음 — 검증 및 이벤트 방출만 수행
 *   - `in_progress` → `planning` 역전이(Rollback) 감지 후 Reject
 *
 * 상태 전이 허용 규칙:
 *   planning → in_progress  ✅
 *   in_progress → done      ✅
 *   planning → done         ✅
 *   done → planning         ✅  (새 사이클 시작)
 *   in_progress → planning  ❌  (비정상 롤백)
 *   done → in_progress      ❌  (직접 재진입 금지)
 *
 * 복합 모드(team + ralph):
 *   - 주 스킬(team)이 in_progress인 동안 ralph는 Deferred로 마킹
 *   - 주 스킬 done 전환 후 ralph가 활성화됨
 */

import { z } from "zod";
import { EventEmitter } from "node:events";

// ─── 상태 스키마 ──────────────────────────────────────────────────────────────

export const WorkflowPhaseSchema = z.enum([
  "idle",
  "planning",
  "in_progress",
  "done",
]);
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>;

export const SkillNameSchema = z.string().min(1);
export type SkillName = string;

export const SkillStateSchema = z.object({
  skill: SkillNameSchema,
  phase: WorkflowPhaseSchema,
  deferred: z.boolean().default(false),
  deferredReason: z.string().optional(),
  activatedAt: z.string().optional(),
});
export type SkillState = z.infer<typeof SkillStateSchema>;

export const MultiStateSchema = z.object({
  primary: SkillStateSchema,
  deferred: z.array(SkillStateSchema).default([]),
  timestamp: z.string(),
});
export type MultiState = z.infer<typeof MultiStateSchema>;

// ─── 전이 거부 사유 스키마 ────────────────────────────────────────────────────

export const TransitionRejectionSchema = z.object({
  from: WorkflowPhaseSchema,
  to: WorkflowPhaseSchema,
  skill: SkillNameSchema,
  reason: z.string(),
  timestamp: z.string(),
});
export type TransitionRejection = z.infer<typeof TransitionRejectionSchema>;

// ─── 금지 전이 규칙 ───────────────────────────────────────────────────────────

type TransitionRule = { from: WorkflowPhase; to: WorkflowPhase; reason: string };

const FORBIDDEN_TRANSITIONS: TransitionRule[] = [
  {
    from: "in_progress",
    to: "planning",
    reason: "진행 중 상태에서 기획 단계로의 역전이(Rollback)는 금지됩니다. 상태를 초기화하려면 omx state clear를 실행하세요.",
  },
  {
    from: "done",
    to: "in_progress",
    reason: "완료 상태에서 진행 중 단계로의 직접 재진입은 금지됩니다. 새 사이클을 시작하려면 planning 단계를 거치세요.",
  },
];

function isForbidden(from: WorkflowPhase, to: WorkflowPhase): TransitionRule | undefined {
  return FORBIDDEN_TRANSITIONS.find((r) => r.from === from && r.to === to);
}

// ─── MultiStateValidator 클래스 ──────────────────────────────────────────────

export type ValidatorEvent =
  | { type: "transition_rejected"; payload: TransitionRejection }
  | { type: "skill_deferred"; payload: { skill: SkillName; deferredBy: SkillName; reason: string } }
  | { type: "skill_activated"; payload: { skill: SkillName } };

/**
 * 복합 상태 전이 유효성 검사기.
 *
 * 사용 예시:
 * ```ts
 * const validator = new MultiStateValidator();
 * validator.on("transition_rejected", (payload) => showWarningBanner(payload));
 * validator.on("skill_deferred", (payload) => showDeferredToast(payload));
 *
 * validator.applyTransition("team", "in_progress");
 * validator.registerDeferred("ralph", "team");
 * validator.applyTransition("team", "done");  // → ralph 자동 활성화
 * ```
 */
export class MultiStateValidator extends EventEmitter {
  private _state: Map<SkillName, SkillState> = new Map();
  private _primary: SkillName | null = null;

  // ── 상태 조회 ──────────────────────────────────────────────────────────────

  getState(skill: SkillName): SkillState | undefined {
    return this._state.get(skill);
  }

  getAllStates(): SkillState[] {
    return Array.from(this._state.values());
  }

  getDeferredSkills(): SkillState[] {
    return this.getAllStates().filter((s) => s.deferred);
  }

  // ── 전이 적용 ──────────────────────────────────────────────────────────────

  /**
   * 스킬 상태를 전이한다. 금지된 전이는 거부하고 이벤트를 방출한다.
   *
   * @returns `true`: 전이 성공, `false`: 거부됨
   */
  applyTransition(skill: SkillName, to: WorkflowPhase): boolean {
    const current = this._state.get(skill);
    const from = current?.phase ?? "idle";

    // 금지 전이 검사
    const forbidden = isForbidden(from, to);
    if (forbidden) {
      const rejection: TransitionRejection = {
        from,
        to,
        skill,
        reason: forbidden.reason,
        timestamp: new Date().toISOString(),
      };
      this.emit("transition_rejected", rejection);
      return false;
    }

    // 새 스킬이면 등록
    const next: SkillState = {
      skill,
      phase: to,
      deferred: current?.deferred ?? false,
      deferredReason: current?.deferredReason,
      activatedAt: to === "in_progress" ? new Date().toISOString() : current?.activatedAt,
    };
    this._state.set(skill, next);

    // in_progress 진입 시 primary 마킹
    if (to === "in_progress" && this._primary === null) {
      this._primary = skill;
    }

    // primary가 done 전환 → deferred 스킬 자동 활성화
    if (to === "done" && skill === this._primary) {
      this._primary = null;
      this._activateDeferredSkills();
    }

    return true;
  }

  /**
   * 스킬을 지연(Deferred) 목록에 등록한다.
   * primary 스킬이 in_progress인 동안 해당 스킬은 대기 상태가 됨.
   */
  registerDeferred(skill: SkillName, deferredBy: SkillName): void {
    const existing = this._state.get(skill);
    const deferred: SkillState = {
      skill,
      phase: existing?.phase ?? "idle",
      deferred: true,
      deferredReason: `${deferredBy} 실행 중 대기`,
    };
    this._state.set(skill, deferred);
    this.emit("skill_deferred", {
      skill,
      deferredBy,
      reason: deferred.deferredReason!,
    });
  }

  /**
   * 지연된 스킬을 모두 활성화(deferred=false)한다.
   * primary 스킬의 done 전환 후 자동 호출.
   */
  private _activateDeferredSkills(): void {
    for (const [name, state] of this._state.entries()) {
      if (state.deferred) {
        this._state.set(name, { ...state, deferred: false, deferredReason: undefined });
        this.emit("skill_activated", { skill: name });
      }
    }
  }

  /**
   * 모든 상태를 초기화한다. 테스트 및 `omx state clear` 트리거 전용.
   */
  reset(): void {
    this._state.clear();
    this._primary = null;
  }
}

// ─── 싱글턴 ──────────────────────────────────────────────────────────────────

let _instance: MultiStateValidator | null = null;

export function getMultiStateValidator(): MultiStateValidator {
  if (!_instance) _instance = new MultiStateValidator();
  return _instance;
}

export function _resetMultiStateValidatorForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
