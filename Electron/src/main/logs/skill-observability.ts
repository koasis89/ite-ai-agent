import type { CatalogEntryStatus } from "../../../../src/catalog/schema";

export interface SkillExecutionObservabilityEvent {
  timestamp: string;
  requestId: string;
  actionId: string;
  resolvedActionId?: string;
  skillName?: string;
  requestedStatus?: CatalogEntryStatus;
  ok: boolean;
  errorCode?: string;
  actor?: string;
}

export interface SkillAuditEvent {
  timestamp: string;
  requestId: string;
  actionId: string;
  skillName?: string;
  actor?: string;
  auditType: "internal_call" | "internal_actor_missing";
}

interface SkillObservabilityState {
  totalInvocations: number;
  failureByCode: Record<string, number>;
  deprecatedCalls: number;
  mergedCalls: number;
  internalCalls: number;
  internalMissingActorCalls: number;
  recentExecutions: SkillExecutionObservabilityEvent[];
  recentAudits: SkillAuditEvent[];
}

const MAX_RECENT_ITEMS = 200;

function pushLimited<T>(list: T[], item: T): void {
  list.push(item);
  if (list.length > MAX_RECENT_ITEMS) {
    list.splice(0, list.length - MAX_RECENT_ITEMS);
  }
}

class SkillObservabilityStore {
  private readonly state: SkillObservabilityState = {
    totalInvocations: 0,
    failureByCode: {},
    deprecatedCalls: 0,
    mergedCalls: 0,
    internalCalls: 0,
    internalMissingActorCalls: 0,
    recentExecutions: [],
    recentAudits: [],
  };

  recordExecution(event: SkillExecutionObservabilityEvent): void {
    this.state.totalInvocations += 1;

    if (!event.ok && event.errorCode) {
      this.state.failureByCode[event.errorCode] = (this.state.failureByCode[event.errorCode] ?? 0) + 1;
    }

    if (event.requestedStatus === "deprecated") {
      this.state.deprecatedCalls += 1;
    }
    if (event.requestedStatus === "merged") {
      this.state.mergedCalls += 1;
    }
    if (event.requestedStatus === "internal") {
      this.state.internalCalls += 1;
      if (!event.actor || event.actor.trim() === "") {
        this.state.internalMissingActorCalls += 1;
      }
    }

    pushLimited(this.state.recentExecutions, event);
  }

  recordAudit(event: SkillAuditEvent): void {
    pushLimited(this.state.recentAudits, event);
  }

  snapshot(): Record<string, unknown> {
    const total = this.state.totalInvocations;

    return {
      totalInvocations: total,
      failureByCode: { ...this.state.failureByCode },
      deprecatedCalls: this.state.deprecatedCalls,
      mergedCalls: this.state.mergedCalls,
      internalCalls: this.state.internalCalls,
      internalMissingActorCalls: this.state.internalMissingActorCalls,
      deprecatedCallRatio: total > 0 ? this.state.deprecatedCalls / total : 0,
      mergedCallRatio: total > 0 ? this.state.mergedCalls / total : 0,
      recentExecutions: [...this.state.recentExecutions],
      recentAudits: [...this.state.recentAudits],
    };
  }
}

export const skillObservabilityStore = new SkillObservabilityStore();
