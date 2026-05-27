/**
 * EL-225: Ops IPC 등록기 — Drift 감지 및 상태 초기화 채널
 *
 * IPC 채널 계약:
 *   Renderer → Main:
 *     "omx:ops-drift-check"  — 즉시 Drift 검사 요청 (인수: 없음)
 *     "omx:ops-state-clear"  — `omx state clear` 실행 요청
 *     "omx:ops-setup-resync" — `omx setup` 재실행 요청 (카탈로그 재동기화)
 *
 *   Main → Renderer (브로드캐스트):
 *     "omx:drift-report"     — Drift 리포트 업데이트 (DriftReport)
 *     "omx:drift-critical"   — Drift 위기 알림 (DriftReport)
 *
 * ADR-001: spawnSync 금지 — CLI 호출은 비동기 spawn만 사용
 */

import { ipcMain, BrowserWindow } from "electron";
import { getDriftDetector, type DriftReport } from "../ops/drift-detector";
import { getCliWrapper } from "../cli/cli-wrapper";

// ─── 채널 상수 (renderer 공유 진입점) ─────────────────────────────────────────

export const OPS_DRIFT_CHECK_CHANNEL  = "omx:ops-drift-check"  as const;
export const OPS_STATE_CLEAR_CHANNEL  = "omx:ops-state-clear"  as const;
export const OPS_SETUP_RESYNC_CHANNEL = "omx:ops-setup-resync" as const;
export const DRIFT_REPORT_CHANNEL     = "omx:drift-report"     as const;
export const DRIFT_CRITICAL_CHANNEL   = "omx:drift-critical"   as const;

// ─── 폴링 설정 ────────────────────────────────────────────────────────────────

/** Drift 자동 검사 주기 (ms). 0이면 폴링 비활성화 */
export const DRIFT_POLL_INTERVAL_MS = 60_000;

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

export function broadcastDriftReport(report: DriftReport): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(DRIFT_REPORT_CHANNEL, report);
    }
  }
}

export function broadcastDriftCritical(report: DriftReport): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(DRIFT_CRITICAL_CHANNEL, report);
    }
  }
}

// ─── IPC 등록 ─────────────────────────────────────────────────────────────────

/**
 * Ops IPC 핸들러를 등록한다.
 * `app.whenReady()` 이후 1회 호출.
 *
 * @param omxRoot `.omx` 디렉터리 경로 (기본값: `~/.omx`)
 */
export function registerOpsIpc(omxRoot?: string): void {
  const root = omxRoot ?? require("node:os").homedir() + "/.omx";
  const detector = getDriftDetector(root);
  const cli = getCliWrapper();

  // Drift 위기 이벤트 → 브로드캐스트
  detector.on("drift_critical", (report: DriftReport) => {
    broadcastDriftCritical(report);
  });

  // Drift 검사 완료 → 리포트 브로드캐스트
  detector.on("drift_checked", (report: DriftReport) => {
    broadcastDriftReport(report);
  });

  // ── omx:ops-drift-check — 즉시 Drift 검사 ────────────────────────────────
  ipcMain.handle(OPS_DRIFT_CHECK_CHANNEL, async () => {
    try {
      const report = await detector.detect();
      return { ok: true, data: report };
    } catch (err) {
      console.error("[OpsIpc] drift-check 실패:", err);
      return { ok: false, error: String(err) };
    }
  });

  // ── omx:ops-state-clear — `omx state clear` 실행 ─────────────────────────
  ipcMain.handle(OPS_STATE_CLEAR_CHANNEL, async () => {
    try {
      const result = await cli.executeUnary(["state", "clear", "--json"]);
      return result;
    } catch (err) {
      console.error("[OpsIpc] state-clear 실패:", err);
      return { ok: false, error: String(err) };
    }
  });

  // ── omx:ops-setup-resync — `omx setup` 재실행 ───────────────────────────
  ipcMain.handle(OPS_SETUP_RESYNC_CHANNEL, async () => {
    try {
      const result = await cli.executeUnary(["setup", "--json"]);
      // 재동기화 완료 후 즉시 Drift 재검사
      const report = await detector.detect();
      return { ok: true, data: { setup: result, drift: report } };
    } catch (err) {
      console.error("[OpsIpc] setup-resync 실패:", err);
      return { ok: false, error: String(err) };
    }
  });

  // 앱 시작 직후 초기 Drift 검사 + 폴링 시작
  detector.detect().catch((err) => {
    console.warn("[OpsIpc] 초기 Drift 검사 실패 (무시):", err);
  });

  if (DRIFT_POLL_INTERVAL_MS > 0) {
    detector.startPolling(DRIFT_POLL_INTERVAL_MS);
  }
}

// ─── 언등록 / 테스트 리셋 ────────────────────────────────────────────────────

export function unregisterOpsIpc(): void {
  for (const ch of [
    OPS_DRIFT_CHECK_CHANNEL,
    OPS_STATE_CLEAR_CHANNEL,
    OPS_SETUP_RESYNC_CHANNEL,
  ] as const) {
    ipcMain.removeHandler(ch);
  }
}

export function _resetOpsIpcForTest(): void {
  unregisterOpsIpc();
  const { _resetDriftDetectorForTest } = require("../ops/drift-detector");
  _resetDriftDetectorForTest();
}
