import { ipcMain } from "electron";
import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";

export const WORKSPACE_ACCESS_CHECK_CHANNEL = "omx:workspace-access:check" as const;

export interface WorkspaceAccessStatus {
  rootPath: string;
  canRead: boolean;
  canWrite: boolean;
  checkedAt: string;
  errorMessage?: string;
  suggestions: string[];
}

function buildSuggestions(canRead: boolean, canWrite: boolean): string[] {
  const suggestions: string[] = [];

  if (!canRead) {
    suggestions.push("작업 폴더에 대한 읽기 권한을 확인하세요.");
  }

  if (!canWrite) {
    suggestions.push("다른 저장 경로를 선택하거나 앱을 관리자 권한으로 실행하세요.");
    suggestions.push("Windows 보안의 제어된 폴더 액세스 차단 여부를 확인하세요.");
  }

  if (suggestions.length === 0) {
    suggestions.push("작업 루트 접근 권한이 정상입니다.");
  }

  return suggestions;
}

async function probeWorkspaceAccess(rootPath: string): Promise<WorkspaceAccessStatus> {
  const checkedAt = new Date().toISOString();
  let canRead = false;
  let canWrite = false;
  let errorMessage: string | undefined;

  try {
    await fs.access(rootPath, fsConstants.R_OK);
    canRead = true;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const probeFilePath = path.join(rootPath, `.omx-permission-check-${Date.now()}.tmp`);

  try {
    await fs.writeFile(probeFilePath, "permission-check", "utf-8");
    canWrite = true;
  } catch (err) {
    if (!errorMessage) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  } finally {
    try {
      await fs.unlink(probeFilePath);
    } catch {
      // Ignore cleanup failures.
    }
  }

  return {
    rootPath,
    canRead,
    canWrite,
    checkedAt,
    errorMessage,
    suggestions: buildSuggestions(canRead, canWrite),
  };
}

export function registerWorkspaceAccessIpc(): void {
  ipcMain.handle(WORKSPACE_ACCESS_CHECK_CHANNEL, async () => {
    try {
      const rootPath = process.cwd();
      const status = await probeWorkspaceAccess(rootPath);
      return { ok: true, data: status };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

export function unregisterWorkspaceAccessIpc(): void {
  ipcMain.removeHandler(WORKSPACE_ACCESS_CHECK_CHANNEL);
}
