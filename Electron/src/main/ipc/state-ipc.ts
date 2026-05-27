/**
 * EL-218: 수명주기 상태 IPC 브릿지
 *
 * StateWatcher + LifecycleParser를 연결하여 상태 변경 이벤트를
 * Renderer로 브로드캐스트하고, Renderer의 초기 상태 요청에 응답한다.
 *
 * IPC 핸들러 (Main 수신):
 *   omx:lifecycle-get   — 현재 전체 상태 스냅샷 요청 (Rehydration)
 *   omx:lifecycle-start — 상태 감시 시작 (stateDir 경로 전달)
 *   omx:lifecycle-stop  — 상태 감시 중지
 *
 * Renderer 전송 채널:
 *   omx:lifecycle-change — 수명주기 상태 변경 이벤트
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용.
 */

import { ipcMain, BrowserWindow } from "electron";
import { getStateWatcher, _resetStateWatcherForTest } from "../state/state-watcher";
import { parseLifecycleState, parseSingleSnapshot } from "../state/lifecycle-parser";
import type { LifecycleState } from "../state/lifecycle-parser";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

/** 수명주기 상태 변경 — Renderer 수신 채널 */
export const LIFECYCLE_CHANGE_CHANNEL = "omx:lifecycle-change";

/** 현재 상태 전체 스냅샷 요청 — Main 수신 채널 */
export const LIFECYCLE_GET_CHANNEL = "omx:lifecycle-get";

/** 상태 감시 시작 — Main 수신 채널 */
export const LIFECYCLE_START_CHANNEL = "omx:lifecycle-start";

/** 상태 감시 중지 — Main 수신 채널 */
export const LIFECYCLE_STOP_CHANNEL = "omx:lifecycle-stop";

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

/**
 * 살아있는 모든 BrowserWindow의 Renderer로 수명주기 변경을 브로드캐스트한다.
 * 파괴된(destroyed) 윈도우는 건너뜀.
 */
function broadcastLifecycleChange(state: LifecycleState | Partial<LifecycleState>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(LIFECYCLE_CHANGE_CHANNEL, state);
    }
  }
}

// ─── IPC 등록 ─────────────────────────────────────────────────────────────────

/**
 * 수명주기 IPC 핸들러를 등록한다.
 * main.ts 또는 preload 이후 시점에 1회 호출.
 */
export function registerStateIpc(): void {
  const watcher = getStateWatcher();

  // ── StateWatcher 변경 이벤트 → Renderer 브로드캐스트 ─────────────────────
  watcher.onChange((event) => {
    const partial = parseSingleSnapshot(event.filename, event.snapshot);
    broadcastLifecycleChange(partial);
  });

  // ── omx:lifecycle-get — 현재 전체 스냅샷 반환 (Rehydration) ──────────────
  ipcMain.handle(LIFECYCLE_GET_CHANNEL, async (): Promise<LifecycleState> => {
    const snapshots = watcher.getCurrentState();
    return parseLifecycleState(snapshots);
  });

  // ── omx:lifecycle-start — 워처 시작 ──────────────────────────────────────
  ipcMain.handle(
    LIFECYCLE_START_CHANNEL,
    async (_event, stateDir: string): Promise<{ ok: boolean; error?: string }> => {
      if (typeof stateDir !== "string" || stateDir.trim() === "") {
        return { ok: false, error: "stateDir 경로가 필요합니다." };
      }
      try {
        watcher.start(stateDir.trim());
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message };
      }
    },
  );

  // ── omx:lifecycle-stop — 워처 중지 ───────────────────────────────────────
  ipcMain.handle(LIFECYCLE_STOP_CHANNEL, async (): Promise<void> => {
    watcher.stop();
  });
}

/** 테스트용 내부 상태 초기화 */
export function _resetStateIpcForTest(): void {
  try {
    ipcMain.removeHandler(LIFECYCLE_GET_CHANNEL);
    ipcMain.removeHandler(LIFECYCLE_START_CHANNEL);
    ipcMain.removeHandler(LIFECYCLE_STOP_CHANNEL);
  } catch {
    // 이미 제거된 핸들러 무시
  }
  _resetStateWatcherForTest();
}
