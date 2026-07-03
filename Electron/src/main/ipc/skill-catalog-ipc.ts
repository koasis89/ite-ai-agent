import { ipcMain } from "electron";
import { readCatalogManifest } from "../../../../src/catalog/reader";
import { evaluateSkillExecutionPolicy } from "../../../../src/skills/policy/status-policy";

export const SKILL_CATALOG_GET_CHANNEL = "omx:skill-catalog:get" as const;

interface SkillCatalogGetRequest {
  includeDeprecated?: boolean;
}

interface SkillCatalogItem {
  skillId?: string;
  name: string;
  category: "execution" | "planning" | "shortcut" | "utility";
  status: "active" | "alias" | "merged" | "deprecated" | "internal";
  canonical?: string;
  enabled: boolean;
  executable: boolean;
  warnings: string[];
}

function toSkillCatalogItem(
  skill: {
    name: string;
    category: "execution" | "planning" | "shortcut" | "utility";
    status: "active" | "alias" | "merged" | "deprecated" | "internal";
    canonical?: string;
  },
  includeDeprecated: boolean,
): SkillCatalogItem {
  const policy = evaluateSkillExecutionPolicy(skill, {
    allowDeprecated: includeDeprecated,
    allowInternal: false,
  });

  return {
    skillId: skill.name,
    name: skill.name,
    category: skill.category,
    status: skill.status,
    canonical: skill.canonical,
    enabled: skill.status !== "deprecated" && skill.status !== "internal",
    executable: policy.executable,
    warnings: policy.warnings,
  };
}

export function registerSkillCatalogIpc(): void {
  ipcMain.handle(SKILL_CATALOG_GET_CHANNEL, async (_event, raw?: SkillCatalogGetRequest) => {
    const includeDeprecated = raw?.includeDeprecated === true;

    try {
      const manifest = readCatalogManifest();
      const skills = manifest.skills
        .filter((skill) => skill.category === "shortcut" || skill.category === "utility")
        .filter((skill) => skill.status !== "internal")
        .filter((skill) => includeDeprecated || skill.status !== "deprecated")
        .map((skill) => toSkillCatalogItem(skill, includeDeprecated))
        .sort((a, b) => a.name.localeCompare(b.name));

      return { ok: true, data: skills };
    } catch {
      return { ok: false, error: "Skill manifest file not found." };
    }
  });
}

export function unregisterSkillCatalogIpc(): void {
  ipcMain.removeHandler(SKILL_CATALOG_GET_CHANNEL);
}
