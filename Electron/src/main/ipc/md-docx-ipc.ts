import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dispatchSkillAction } from "../../../../src/skills/executor/dispatch";
import { createDocxSkillRegistryEntry } from "../../../../src/skills/executor/docx-executor";
import { InMemorySkillRegistry } from "../../../../src/skills/executor/registry";
import { DOCX_CONVERT_ACTION_ID } from "../../../../src/skills/contracts/actions/docx";

export const CONVERT_MD_TO_DOCX_CHANNEL = "omx:convert-md-to-docx" as const;

interface ConvertMdToDocxResult {
  ok: boolean;
  filePath?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  cancelled?: boolean;
  error?: string;
}

const DOCX_FILE_FILTER: Electron.FileFilter[] = [
  { name: "Word 문서", extensions: ["docx"] },
];

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "markdown-export";
}

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as { code?: string; message?: string };
  const code = (maybeErr.code || "").toUpperCase();
  const message = (maybeErr.message || "").toLowerCase();
  return (
    code === "EACCES" ||
    code === "EPERM" ||
    message.includes("permission denied") ||
    message.includes("access is denied") ||
    message.includes("액세스가 거부")
  );
}

async function buildFallbackPath(originalPath: string): Promise<string> {
  const docsDir = app.getPath("documents");
  const exportDir = path.join(docsDir, "OMX-Exports");
  await mkdir(exportDir, { recursive: true });
  const parsed = path.parse(originalPath);
  return path.join(exportDir, `${parsed.name}-${Date.now()}${parsed.ext}`);
}

async function writeWithPermissionFallback(
  initialPath: string,
  buffer: Buffer,
): Promise<{ filePath: string; fallbackUsed: boolean; fallbackReason?: string }> {
  try {
    await writeFile(initialPath, buffer);
    return { filePath: initialPath, fallbackUsed: false };
  } catch (err) {
    if (!isPermissionError(err)) throw err;

    const fallbackPath = await buildFallbackPath(initialPath);
    await writeFile(fallbackPath, buffer);
    return {
      filePath: fallbackPath,
      fallbackUsed: true,
      fallbackReason:
        "원래 경로에 쓰기 권한이 없어 문서 폴더(OMX-Exports)로 저장했습니다.",
    };
  }
}

async function askSavePath(defaultFileName: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const base = sanitizeFileName(defaultFileName).replace(/\.docx$/i, "");

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Markdown을 워드로 변환",
    defaultPath: `${base}.docx`,
    filters: DOCX_FILE_FILTER,
  });

  return canceled || !filePath ? null : filePath;
}

async function handleConvert(raw: unknown): Promise<ConvertMdToDocxResult> {
  const registry = new InMemorySkillRegistry();
  registry.register(
    createDocxSkillRegistryEntry({
      askSavePath,
      writeWithPermissionFallback,
    }),
  );

  const result = await dispatchSkillAction(
    registry,
    DOCX_CONVERT_ACTION_ID,
    raw,
    {
      requestId: `docx-${Date.now()}`,
      workspaceRoot: process.cwd(),
    },
  );

  if (result.ok) {
    return result.data as ConvertMdToDocxResult;
  }

  return {
    ok: false,
    error: result.error.message,
  };
}

export function registerMdDocxIpc(): void {
  ipcMain.removeHandler(CONVERT_MD_TO_DOCX_CHANNEL);
  ipcMain.handle(CONVERT_MD_TO_DOCX_CHANNEL, async (_event, raw: unknown) => {
    return handleConvert(raw);
  });
}

export function unregisterMdDocxIpc(): void {
  ipcMain.removeHandler(CONVERT_MD_TO_DOCX_CHANNEL);
}
