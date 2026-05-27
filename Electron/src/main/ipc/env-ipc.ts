/**
 * EL-201: env_status_get IPC 채널
 *
 * Renderer → Main 쿼리: 'env_status_get'
 * Main → Renderer 응답: EnvStatus (ok, code, version, missing, message)
 */

import { ipcMain, BrowserWindow } from "electron";
import { runFullEnvCheck, type EnvStatus } from "../env/env-checker";

let cachedStatus: EnvStatus | null = null;

/**
 * IPC 채널 등록 — app ready 이후 main.ts에서 호출한다.
 */
export function registerEnvIpc(): void {
  // Renderer가 환경 상태를 조회하는 채널
  ipcMain.handle("env_status_get", async (): Promise<EnvStatus> => {
    // 캐시 만료 정책: 앱 세션당 최초 1회만 전체 검사 수행
    // 재검사가 필요한 경우 env_status_refresh 채널을 사용한다.
    if (cachedStatus !== null) {
      return cachedStatus;
    }
    cachedStatus = await runFullEnvCheck();
    return cachedStatus;
  });

  // Renderer가 강제 재검사를 요청하는 채널
  ipcMain.handle("env_status_refresh", async (): Promise<EnvStatus> => {
    cachedStatus = null;
    cachedStatus = await runFullEnvCheck();
    return cachedStatus;
  });
}

/**
 * 환경 이상 감지 시 모든 윈도우에 브로드캐스트
 * (앱 부팅 시 main.ts에서 직접 호출)
 */
export async function broadcastEnvStatus(windows: BrowserWindow[]): Promise<void> {
  const status = await runFullEnvCheck();
  cachedStatus = status;
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send("env_status_changed", status);
    }
  }
}
