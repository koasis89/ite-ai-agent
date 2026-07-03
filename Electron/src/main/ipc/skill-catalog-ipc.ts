import { app, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

export const SKILL_CATALOG_GET_CHANNEL = "omx:skill-catalog:get" as const;

interface ManifestSkillItem {
  skillId?: string;
  name: string;
  enabled?: boolean;
}

interface ManifestShape {
  skills?: ManifestSkillItem[];
}

function candidateManifestPaths(): string[] {
  const cwd = process.cwd();
  const appPath = app.getAppPath();

  return [
    path.resolve(cwd, "Electron", "skill추가", "manifest.json"),
    path.resolve(cwd, "skill추가", "manifest.json"),
    path.resolve(appPath, "Electron", "skill추가", "manifest.json"),
    path.resolve(appPath, "skill추가", "manifest.json"),
  ];
}

async function readManifest(): Promise<ManifestShape | null> {
  for (const manifestPath of candidateManifestPaths()) {
    try {
      const raw = await fs.readFile(manifestPath, "utf-8");
      const parsed = JSON.parse(raw) as ManifestShape;
      if (parsed && Array.isArray(parsed.skills)) {
        return parsed;
      }
    } catch {
      // Try next candidate path.
    }
  }

  return null;
}

export function registerSkillCatalogIpc(): void {
  ipcMain.handle(SKILL_CATALOG_GET_CHANNEL, async () => {
    const manifest = await readManifest();

    if (!manifest?.skills) {
      return { ok: false, error: "Skill manifest file not found." };
    }

    const skills = manifest.skills
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        skillId: item.skillId,
        name: item.name,
        enabled: item.enabled !== false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { ok: true, data: skills };
  });
}

export function unregisterSkillCatalogIpc(): void {
  ipcMain.removeHandler(SKILL_CATALOG_GET_CHANNEL);
}
