/**
 * EL-208: 훅 이벤트 브로드캐스트 IPC 등록기
 *
 * 역할:
 *   - `omx:hook-stream:start` / `omx:hook-stream:stop` IPC 핸들러를 등록한다.
 *   - HookTailer와 EventDispatcher를 연결하여 라인 수신 → 파싱 → 브로드캐스트 파이프라인을 구성한다.
 *   - `omx:runtime-hook-event` / `omx:runtime-hook-event:priority` 채널로 Renderer에 전달한다.
 *
 * IPC 채널 계약:
 *   - ipcMain → Renderer:
 *       "omx:runtime-hook-event"          — 일반 훅 이벤트
 *       "omx:runtime-hook-event:priority" — 파생 신호 우선 채널 (needs-input, pre-tool-use, post-tool-use)
 *   - Renderer → Main:
 *       "omx:hook-stream:start"  — 스트림 구독 시작 (인수: logsDir)
 *       "omx:hook-stream:stop"   — 스트림 구독 중지
 */

import { ipcMain, BrowserWindow } from "electron";
import { HookTailer } from "../logs/hook-tailer";
import { dispatch, type HookEvent } from "../logs/event-dispatcher";

// ─── 모듈 상태 ────────────────────────────────────────────────────────────────

let _tailer: HookTailer | null = null;

// ─── IPC 등록 ─────────────────────────────────────────────────────────────────

/**
 * Electron ipcMain에 훅 스트림 IPC 핸들러를 등록한다.
 * Electron `app.whenReady()` 이후 한 번 호출하면 된다.
 */
export function registerEventBroadcastIpc(): void {
  ipcMain.handle("omx:hook-stream:start", async (_event, logsDir: string) => {
    try {
      startHookStream(logsDir);
      return { ok: true };
    } catch (err) {
      console.error("[EventBroadcastIpc] startHookStream 실패:", err);
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle("omx:hook-stream:stop", async () => {
    stopHookStream();
    return { ok: true };
  });
}

// ─── 스트림 생명주기 ──────────────────────────────────────────────────────────

/**
 * HookTailer를 생성하고 EventDispatcher와 연결하여 스트림을 시작한다.
 * 이미 실행 중이면 기존 스트림을 중지 후 재시작한다.
 *
 * @param logsDir `.omx/logs` 디렉터리 절대 경로
 */
export function startHookStream(logsDir: string): void {
  // 이전 스트림이 존재하면 먼저 정리
  if (_tailer) {
    _tailer.stop();
    _tailer = null;
  }

  const tailer = new HookTailer();

  tailer.onLine((rawLine) => {
    dispatch(rawLine, broadcastToRenderers);
  });

  tailer.start(logsDir);
  _tailer = tailer;
}

/**
 * 현재 실행 중인 HookTailer를 중지하고 자원을 해제한다.
 */
export function stopHookStream(): void {
  if (_tailer) {
    _tailer.stop();
    _tailer = null;
  }
}

// ─── Renderer 브로드캐스트 ────────────────────────────────────────────────────

/**
 * 열려 있는 모든 BrowserWindow로 훅 이벤트를 전송한다.
 * 파괴된 윈도우는 안전하게 건너뛴다.
 *
 * @internal EventDispatcher의 broadcast 콜백으로 전달
 */
function broadcastToRenderers(channel: string, payload: HookEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

// ─── 테스트용 내부 상태 접근 ──────────────────────────────────────────────────

/** @internal 테스트에서 현재 타일러 상태를 확인하기 위한 헬퍼 */
export function _getActiveTailerForTest(): HookTailer | null {
  return _tailer;
}
