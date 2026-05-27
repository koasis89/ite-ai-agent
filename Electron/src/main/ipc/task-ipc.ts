/**
 * EL-204 + EL-205: 태스크 생명주기 IPC 채널
 *
 * Renderer ↔ Main 채널:
 *   task:read          → readTask(taskId)
 *   task:claim         → claimTask(taskId, version) — 낙관적 락
 *   task:release       → releaseTaskClaim(taskId)
 *   task:transition    → transitionTaskStatus(taskId, current, target, resultData)
 *
 * Main → Renderer 브로드캐스트 채널:
 *   task:claim-conflict     (EL-204) — 낙관적 락 충돌 발생 시
 *   task:status-changed     (EL-205) — 상태 전이 완료 시
 *   task:invalid-transition (EL-205) — 불변성 가드 위반 시
 *
 * ADR-001 보안 제약:
 *   - taskId 는 반드시 문자열 슬러그 형식 검증 (경로 주입 차단)
 *   - resultData 는 JSON 직렬화 가능 객체만 허용
 */

import { ipcMain, BrowserWindow } from "electron";
import {
  readTask,
  claimTask,
  releaseTaskClaim,
  transitionTaskStatus,
  InvalidTransitionError,
  type TaskData,
  type TransitionTarget,
  type TaskStatus,
} from "../services/task-service";
import { OMXError } from "../cli/envelope-parser";
import { EnvelopeErrorCode } from "../cli/schemas/envelope.schema";

// ─── 보안: taskId 슬러그 검증 ────────────────────────────────────────────────

const TASK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function isValidTaskId(id: unknown): id is string {
  return typeof id === "string" && TASK_ID_PATTERN.test(id);
}

// ─── 브로드캐스트 헬퍼 ───────────────────────────────────────────────────────

/**
 * 열려 있는 모든 BrowserWindow로 이벤트를 브로드캐스트한다.
 */
function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

/**
 * EL-204: 낙관적 락 충돌 알림 브로드캐스트
 */
export function broadcastTaskConflict(taskId: string): void {
  broadcast("task:claim-conflict", { taskId, reason: EnvelopeErrorCode.CONFLICT });
}

/**
 * EL-205: 상태 전이 완료 알림 브로드캐스트
 */
export function broadcastTaskStatusChanged(
  taskId: string,
  status: string,
  data?: unknown
): void {
  broadcast("task:status-changed", { taskId, status, data });
}

/**
 * EL-205: 불변성 가드 위반 알림 브로드캐스트 (팝업 트리거용)
 */
export function broadcastInvalidTransition(
  taskId: string,
  from: string,
  to: string
): void {
  broadcast("task:invalid-transition", {
    taskId,
    from,
    to,
    message: `상태 전이 불가: '${from}' → '${to}' 는 허용된 워크플로우 경로가 아닙니다.`,
  });
}

// ─── IPC 핸들러 등록 ──────────────────────────────────────────────────────────

export function registerTaskIpc(): void {
  // ── task:read ────────────────────────────────────────────────────────────
  ipcMain.handle("task:read", async (_event, taskId: string): Promise<TaskData | { error: string }> => {
    if (!isValidTaskId(taskId)) {
      return { error: "유효하지 않은 taskId 형식입니다." };
    }
    try {
      return await readTask(taskId);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ── task:claim ────────────────────────────────────────────────────────────
  ipcMain.handle(
    "task:claim",
    async (
      _event,
      payload: { taskId: string; version: number }
    ): Promise<{ ok: true } | { ok: false; error: string; conflict?: boolean }> => {
      const { taskId, version } = payload;

      if (!isValidTaskId(taskId)) {
        return { ok: false, error: "유효하지 않은 taskId 형식입니다." };
      }
      if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
        return { ok: false, error: "version은 0 이상의 정수여야 합니다." };
      }

      try {
        await claimTask(taskId, version);
        return { ok: true };
      } catch (err) {
        if (err instanceof OMXError && err.code === EnvelopeErrorCode.CONFLICT) {
          // 낙관적 락 충돌 — 브로드캐스트 후 충돌 플래그 반환
          broadcastTaskConflict(taskId);
          return { ok: false, error: err.message, conflict: true };
        }
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // ── task:release ─────────────────────────────────────────────────────────
  ipcMain.handle(
    "task:release",
    async (_event, taskId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!isValidTaskId(taskId)) {
        return { ok: false, error: "유효하지 않은 taskId 형식입니다." };
      }
      try {
        await releaseTaskClaim(taskId);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );

  // ── task:transition ────────────────────────────────────────────────────────
  ipcMain.handle(
    "task:transition",
    async (
      _event,
      payload: {
        taskId: string;
        current: TaskStatus;
        target: TransitionTarget;
        resultData?: Record<string, unknown>;
      }
    ): Promise<{ ok: true; data: unknown } | { ok: false; error: string; invalidTransition?: boolean }> => {
      const { taskId, current, target, resultData } = payload;

      if (!isValidTaskId(taskId)) {
        return { ok: false, error: "유효하지 않은 taskId 형식입니다." };
      }

      try {
        const data = await transitionTaskStatus(taskId, current, target, resultData);
        // 상태 전이 완료 — 브로드캐스트 후 결과 반환
        broadcastTaskStatusChanged(taskId, target, data);
        return { ok: true, data };
      } catch (err) {
        if (err instanceof InvalidTransitionError) {
          // 불변성 가드 위반 — 브로드캐스트 후 차단 플래그 반환
          broadcastInvalidTransition(taskId, err.fromStatus, err.toStatus);
          return { ok: false, error: err.message, invalidTransition: true };
        }
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  );
}
