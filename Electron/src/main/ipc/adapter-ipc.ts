/**
 * EL-222: 어댑터 상태 IPC 등록기
 *
 * IPC 채널 계약:
 *   Renderer → Main:
 *     "omx:adapter-probe"  — 특정 어댑터 탐지 요청 (인수: AdapterTarget)
 *
 *   Main → Renderer (브로드캐스트):
 *     "omx:adapter-status" — 어댑터 상태 변경 알림 (AdapterInfo)
 *
 * 아키텍처 규칙:
 *   - `.omx/state/` 침범 없음 (읽기 전용 probeAdapter만 사용)
 *   - 탐지 결과는 모든 렌더러 창에 브로드캐스트
 *   - 주기적 자동 폴링: POLL_INTERVAL_MS마다 전체 어댑터 재탐지
 */

import { ipcMain, BrowserWindow } from "electron";
import {
  probeAdapter,
  probeAllAdapters,
  type AdapterInfo,
  type AdapterTarget,
  AdapterTargetSchema,
} from "../cli/adapter-probe";

// ─── 채널 상수 (renderer 공유 진입점) ─────────────────────────────────────────

export const ADAPTER_PROBE_CHANNEL = "omx:adapter-probe" as const;
export const ADAPTER_STATUS_CHANNEL = "omx:adapter-status" as const;

// ─── 폴링 설정 ────────────────────────────────────────────────────────────────

/** 어댑터 자동 재탐지 주기 (ms). 0이면 폴링 비활성화. */
const POLL_INTERVAL_MS = 30_000;

let _pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

/**
 * 모든 살아있는 렌더러 창에 어댑터 상태를 브로드캐스트한다.
 */
export function broadcastAdapterStatus(info: AdapterInfo): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(ADAPTER_STATUS_CHANNEL, info);
    }
  }
}

// ─── IPC 등록 ─────────────────────────────────────────────────────────────────

/**
 * Electron ipcMain에 어댑터 IPC 핸들러를 등록한다.
 * Electron `app.whenReady()` 이후 한 번 호출.
 */
export function registerAdapterIpc(): void {
  // Renderer → Main: 단일 어댑터 탐지 요청
  ipcMain.handle(ADAPTER_PROBE_CHANNEL, async (_event, target: unknown) => {
    // 입력 유효성 검증
    const parsed = AdapterTargetSchema.safeParse(target);
    if (!parsed.success) {
      return {
        ok: false,
        error: `[AdapterIpc] 알 수 없는 어댑터 대상: ${String(target)}`,
      };
    }

    try {
      const info = await probeAdapter(parsed.data);
      // 탐지 후 모든 창에 브로드캐스트
      broadcastAdapterStatus(info);
      return { ok: true, data: info };
    } catch (err) {
      console.error(`[AdapterIpc] probeAdapter 실패 (${parsed.data}):`, err);
      return { ok: false, error: String(err) };
    }
  });

  // 앱 시작 직후 초기 탐지 실행
  _triggerInitialProbe();

  // 주기적 자동 폴링 시작
  if (POLL_INTERVAL_MS > 0) {
    _pollTimer = setInterval(_pollAllAdapters, POLL_INTERVAL_MS);
  }
}

/**
 * 등록된 IPC 핸들러와 폴링 타이머를 정리한다.
 * 테스트 또는 앱 종료 시 호출.
 */
export function unregisterAdapterIpc(): void {
  ipcMain.removeHandler(ADAPTER_PROBE_CHANNEL);
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

/** 앱 시작 시 비동기 초기 탐지 트리거 (오류 억제) */
function _triggerInitialProbe(): void {
  setImmediate(async () => {
    try {
      const results = await probeAllAdapters();
      for (const info of results) {
        broadcastAdapterStatus(info);
      }
    } catch (err) {
      console.warn("[AdapterIpc] 초기 어댑터 탐지 실패:", err);
    }
  });
}

/** 폴링 인터벌 콜백 */
async function _pollAllAdapters(): Promise<void> {
  try {
    const results = await probeAllAdapters();
    for (const info of results) {
      broadcastAdapterStatus(info);
    }
  } catch (err) {
    console.warn("[AdapterIpc] 어댑터 폴링 실패:", err);
  }
}

/** 테스트용 폴링 상태 초기화 */
export function _resetAdapterIpcForTest(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  try {
    ipcMain.removeHandler(ADAPTER_PROBE_CHANNEL);
  } catch {
    // 핸들러가 없을 수 있음
  }
}
