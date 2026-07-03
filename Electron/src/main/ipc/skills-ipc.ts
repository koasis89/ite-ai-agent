import { BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { readCatalogManifest } from "../../../../src/catalog/reader";
import type { CatalogManifest, CatalogSkillEntry } from "../../../../src/catalog/schema";
import { DOCX_CONVERT_ACTION_ID } from "../../../../src/skills/contracts/actions/docx";
import { getWorkflowActionId } from "../../../../src/skills/contracts/actions/workflow";
import { createSkillErrorEnvelope } from "../../../../src/skills/errors/mappers";
import { buildExecutionPlanningRegistry } from "../../../../src/skills/executor/catalog-loader";
import { dispatchSkillAction } from "../../../../src/skills/executor/dispatch";
import { createDocxSkillRegistryEntry } from "../../../../src/skills/executor/docx-executor";
import { InMemorySkillRegistry } from "../../../../src/skills/executor/registry";
import { evaluateSkillExecutionPolicy } from "../../../../src/skills/policy/status-policy";
import { sessionLogger } from "../logs/session-logger";
import { skillObservabilityStore } from "../logs/skill-observability";

export const SKILLS_INVOKE_CHANNEL = "omx:skills:invoke" as const;
export const SKILLS_LIST_CHANNEL = "omx:skills:list" as const;
export const SKILLS_STATUS_POLICY_CHANNEL = "omx:skills:status-policy" as const;
export const SKILLS_FEEDBACK_CHANNEL = "omx:skills:feedback" as const;
export const SKILLS_OBSERVABILITY_GET_CHANNEL = "omx:skills:observability:get" as const;

interface SkillsInvokeRequest {
  actionId: string;
  payload?: unknown;
  context?: {
    requestId?: string;
    workspaceRoot?: string;
    model?: string;
    actor?: string;
  };
  policy?: {
    allowDeprecated?: boolean;
    allowInternal?: boolean;
  };
}

interface SkillsListItem {
  skillId: string;
  name: string;
  actionId: string;
  category: "execution" | "planning" | "shortcut" | "utility";
  status: "active" | "alias" | "merged" | "deprecated" | "internal";
  canonical?: string;
  executable: boolean;
  warnings: string[];
  supported: boolean;
}

interface SkillStatusPolicyRequest {
  skillName: string;
  allowDeprecated?: boolean;
  allowInternal?: boolean;
}

interface SkillFeedbackEvent {
  actionId: string;
  requestId: string;
  ok: boolean;
  skillId?: string;
  resolvedActionId?: string;
  message: string;
  errorCode?: string;
}

function broadcastSkillFeedback(payload: SkillFeedbackEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(SKILLS_FEEDBACK_CHANNEL, payload);
    }
  }
}

function extractSkillNameFromActionId(actionId: string): string | undefined {
  if (actionId === DOCX_CONVERT_ACTION_ID) {
    return "docx";
  }
  if (actionId.endsWith(".run")) {
    return actionId.slice(0, -4);
  }
  const dot = actionId.indexOf(".");
  if (dot > 0) {
    return actionId.slice(0, dot);
  }
  return undefined;
}

function inferSkillId(actionId: string, resolvedActionId?: string): string | undefined {
  if (resolvedActionId === DOCX_CONVERT_ACTION_ID || actionId === DOCX_CONVERT_ACTION_ID) {
    return "docx";
  }

  const candidate = resolvedActionId ?? actionId;
  const dot = candidate.indexOf(".");
  if (dot <= 0) {
    return undefined;
  }

  return candidate.slice(0, dot);
}

function findRequestedSkill(manifest: CatalogManifest, actionId: string): CatalogSkillEntry | undefined {
  const requestedName = extractSkillNameFromActionId(actionId);
  if (!requestedName) {
    return undefined;
  }

  return resolveSkillForPolicy(manifest, requestedName);
}

function buildSkillsRegistry(manifest: CatalogManifest): InMemorySkillRegistry {
  const workflowRegistry = buildExecutionPlanningRegistry({ manifest });

  const registry = new InMemorySkillRegistry();
  for (const entry of workflowRegistry.list()) {
    registry.register(entry);
  }

  for (const skill of manifest.skills) {
    const sourceActionId = getWorkflowActionId(skill.name);
    const resolvedActionId = workflowRegistry.resolveActionId(sourceActionId);
    if (!resolvedActionId || resolvedActionId === sourceActionId) {
      continue;
    }

    registry.registerAlias(sourceActionId, resolvedActionId);
  }

  registry.register(
    createDocxSkillRegistryEntry({
      async askSavePath() {
        return null;
      },
      async writeWithPermissionFallback() {
        throw new Error("docx_write_not_available_in_skills_invoke");
      },
    }),
  );

  return registry;
}

function listLocalSkillNames(): string[] {
  const rootSkillsDir = path.join(process.cwd(), "skills");
  if (!fs.existsSync(rootSkillsDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootSkillsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(rootSkillsDir, name, "SKILL.md")))
    .sort((a, b) => a.localeCompare(b));
}

function toListItems(): SkillsListItem[] {
  const manifest = readCatalogManifest();

  const localSkillNames = listLocalSkillNames();
  const localSkillSet = new Set(localSkillNames);
  const manifestByName = new Map(manifest.skills.map((skill) => [skill.name, skill]));

  const mergedSkillNames = [...new Set([...localSkillNames, ...manifest.skills.map((skill) => skill.name)])];

  return mergedSkillNames
    .map((skillName) => {
      const manifestSkill = manifestByName.get(skillName);
      const skill =
        manifestSkill ??
        ({
          name: skillName,
          category: "utility",
          status: "active",
        } as CatalogSkillEntry);

      const policy = evaluateSkillExecutionPolicy(skill, {
        allowDeprecated: false,
        allowInternal: false,
      });

      const supportsWorkflowContract = skill.category === "execution" || skill.category === "planning";
      const hasDocxContract = skill.name === "docx";
      const supported = supportsWorkflowContract || hasDocxContract;
      const actionId = supportsWorkflowContract
        ? getWorkflowActionId(skill.name)
        : hasDocxContract
          ? DOCX_CONVERT_ACTION_ID
          : "";

      return {
        skillId: skill.name,
        name: skill.name,
        actionId,
        category: skill.category,
        status: skill.status,
        canonical: skill.canonical,
        executable: policy.executable,
        warnings: policy.warnings,
        supported,
      };
    })
    .sort((a, b) => {
      const aLocalRank = localSkillSet.has(a.skillId) ? 0 : 1;
      const bLocalRank = localSkillSet.has(b.skillId) ? 0 : 1;
      if (aLocalRank !== bLocalRank) {
        return aLocalRank - bLocalRank;
      }

      return a.skillId.localeCompare(b.skillId);
    });
}

function resolveSkillForPolicy(manifest: CatalogManifest, skillName: string): CatalogSkillEntry | undefined {
  const fromManifest = manifest.skills.find((entry) => entry.name === skillName);
  if (fromManifest) {
    return fromManifest;
  }

  const localSkillSet = new Set(listLocalSkillNames());
  if (!localSkillSet.has(skillName)) {
    return undefined;
  }

  return {
    name: skillName,
    category: "utility",
    status: "active",
  } as CatalogSkillEntry;
}

export function registerSkillsIpc(): void {
  ipcMain.removeHandler(SKILLS_INVOKE_CHANNEL);
  ipcMain.removeHandler(SKILLS_LIST_CHANNEL);
  ipcMain.removeHandler(SKILLS_STATUS_POLICY_CHANNEL);
  ipcMain.removeHandler(SKILLS_OBSERVABILITY_GET_CHANNEL);

  ipcMain.handle(SKILLS_INVOKE_CHANNEL, async (_event, raw: SkillsInvokeRequest) => {
    const requestId = raw?.context?.requestId ?? `skills-${Date.now()}`;

    if (!raw || typeof raw.actionId !== "string" || raw.actionId.trim() === "") {
      const error = createSkillErrorEnvelope({
        code: "INPUT_INVALID",
        message: "actionId is required",
      });

      const event = {
        timestamp: new Date().toISOString(),
        requestId,
        actionId: typeof raw?.actionId === "string" ? raw.actionId : "",
        ok: false,
        errorCode: error.code,
      };
      sessionLogger.logSkillExecutionEvent(event);
      skillObservabilityStore.recordExecution(event);

      return {
        ok: false,
        error,
      };
    }

    const manifest = readCatalogManifest();
    const requestedSkill = findRequestedSkill(manifest, raw.actionId);
    const actor = raw.context?.actor;

    if (requestedSkill?.status === "internal" && (!actor || actor.trim() === "")) {
      const error = createSkillErrorEnvelope({
        code: "INPUT_INVALID",
        message: `Internal skill requires actor context: ${requestedSkill.name}`,
        details: {
          requestId,
          skill: requestedSkill.name,
        },
      });

      const auditEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        actionId: raw.actionId,
        skillName: requestedSkill.name,
        actor,
        auditType: "internal_actor_missing" as const,
      };

      const executionEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        actionId: raw.actionId,
        skillName: requestedSkill.name,
        requestedStatus: requestedSkill.status,
        ok: false,
        errorCode: error.code,
        actor,
      };

      sessionLogger.logSkillAuditEvent(auditEvent);
      sessionLogger.logSkillExecutionEvent(executionEvent);
      skillObservabilityStore.recordAudit(auditEvent);
      skillObservabilityStore.recordExecution(executionEvent);

      return {
        ok: false,
        error,
      };
    }

    if (requestedSkill?.status === "internal") {
      const auditEvent = {
        timestamp: new Date().toISOString(),
        requestId,
        actionId: raw.actionId,
        skillName: requestedSkill.name,
        actor,
        auditType: "internal_call" as const,
      };
      sessionLogger.logSkillAuditEvent(auditEvent);
      skillObservabilityStore.recordAudit(auditEvent);
    }

    const registry = buildSkillsRegistry(manifest);
    const result = await dispatchSkillAction(
      registry,
      raw.actionId,
      raw.payload,
      {
        requestId,
        workspaceRoot: raw.context?.workspaceRoot ?? process.cwd(),
        model: raw.context?.model,
        actor,
      },
      {
        allowDeprecated: raw.policy?.allowDeprecated,
        allowInternal: raw.policy?.allowInternal,
      },
    );

    const resolvedActionId = (result.meta?.resolvedActionId as string | undefined) ?? undefined;
    const skillId = inferSkillId(raw.actionId, resolvedActionId);
    const feedbackMessage = result.ok
      ? `스킬 실행 성공: ${skillId ?? raw.actionId}`
      : `스킬 실행 실패: ${skillId ?? raw.actionId} (${result.error.code})`;

    const executionEvent = {
      timestamp: new Date().toISOString(),
      requestId,
      actionId: raw.actionId,
      resolvedActionId,
      skillName: requestedSkill?.name ?? skillId,
      requestedStatus: requestedSkill?.status,
      ok: result.ok,
      errorCode: result.ok ? undefined : result.error.code,
      actor,
      redirected: result.meta?.redirected,
      resolvedSkillName: result.meta?.resolvedSkillName,
    };

    sessionLogger.logSkillExecutionEvent(executionEvent);
    skillObservabilityStore.recordExecution({
      timestamp: executionEvent.timestamp,
      requestId,
      actionId: raw.actionId,
      resolvedActionId,
      skillName: executionEvent.skillName,
      requestedStatus: requestedSkill?.status,
      ok: result.ok,
      errorCode: executionEvent.errorCode,
      actor,
    });

    broadcastSkillFeedback({
      actionId: raw.actionId,
      requestId,
      ok: result.ok,
      skillId,
      resolvedActionId,
      message: feedbackMessage,
      errorCode: result.ok ? undefined : result.error.code,
    });

    return result;
  });

  ipcMain.handle(SKILLS_LIST_CHANNEL, async () => {
    return {
      ok: true,
      data: toListItems(),
    };
  });

  ipcMain.handle(
    SKILLS_STATUS_POLICY_CHANNEL,
    async (_event, raw: SkillStatusPolicyRequest) => {
      if (!raw || typeof raw.skillName !== "string" || raw.skillName.trim() === "") {
        return {
          ok: false,
          error: "skillName is required",
        };
      }

      const manifest = readCatalogManifest();
      const skill = resolveSkillForPolicy(manifest, raw.skillName);
      if (!skill) {
        return {
          ok: false,
          error: "skill_not_found",
        };
      }

      const policy = evaluateSkillExecutionPolicy(skill, {
        allowDeprecated: raw.allowDeprecated,
        allowInternal: raw.allowInternal,
      });

      return {
        ok: true,
        data: {
          skillName: skill.name,
          status: skill.status,
          canonical: skill.canonical,
          category: skill.category,
          ...policy,
        },
      };
    },
  );

  ipcMain.handle(SKILLS_OBSERVABILITY_GET_CHANNEL, async () => {
    return {
      ok: true,
      data: {
        generatedAt: new Date().toISOString(),
        ...skillObservabilityStore.snapshot(),
      },
    };
  });
}

export function unregisterSkillsIpc(): void {
  ipcMain.removeHandler(SKILLS_INVOKE_CHANNEL);
  ipcMain.removeHandler(SKILLS_LIST_CHANNEL);
  ipcMain.removeHandler(SKILLS_STATUS_POLICY_CHANNEL);
  ipcMain.removeHandler(SKILLS_OBSERVABILITY_GET_CHANNEL);
}
