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
import * as os from "node:os";
import * as path from "node:path";
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

/** 할 일 목록 요청 — Main 수신 채널 */
export const TODO_GET_CHANNEL = "omx:todo-get";

/** 할 일 목록 변경 — Renderer 수신 채널 */
export const TODO_CHANGE_CHANNEL = "omx:todo-change";

// ─── 할 일 타입 ───────────────────────────────────────────────────────────────

export type TodoStatus = "not-started" | "in-progress" | "completed";

export interface TodoItem {
  id: number;
  title: string;
  status: TodoStatus;
}

export interface TodoState {
  todoList: TodoItem[];
}

/** 할 일 목록 인메모리 캐시 */
let todoCache: TodoState = { todoList: [] };

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

/**
 * 살아있는 모든 BrowserWindow의 Renderer로 할 일 목록 변경을 브로드캐스트한다.
 */
function broadcastTodoChange(state: TodoState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(TODO_CHANGE_CHANNEL, state);
    }
  }
}

/**
 * todo-state.json 스냅샷을 파싱하여 TodoState 로 변환한다.
 */
function parseTodoSnapshot(snapshot: Record<string, unknown> | null): TodoState {
  if (!snapshot) return { todoList: [] };
  const raw = snapshot as Record<string, unknown>;
  const list = Array.isArray(raw.todoList) ? raw.todoList : [];
  const todoList = list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "number" ? item.id : 0,
      title: typeof item.title === "string" ? item.title : "",
      status: (["not-started", "in-progress", "completed"].includes(item.status as string)
        ? item.status
        : "not-started") as TodoStatus,
    }));
  return { todoList };
}

// ─── IPC 등록 ─────────────────────────────────────────────────────────────────

/**
 * 수명주기 IPC 핸들러를 등록한다.
 * main.ts 또는 preload 이후 시점에 1회 호출.
 *
 * @param omxRoot `.omx` 디렉터리 경로 (기본값: `~/.omx`)
 */
export function registerStateIpc(omxRoot?: string): void {
  const root = omxRoot ?? path.join(os.homedir(), ".omx");
  const defaultStateDir = path.join(root, "state");

  const watcher = getStateWatcher();

  // 기본 경로로 워처를 자동 시작 — Renderer가 startLifecycleWatcher를 호출하지
  // 않아도 앱 구동 시 곧바로 .omx/state/ 감시를 시작한다.
  watcher.start(defaultStateDir);

  // ── StateWatcher 변경 이벤트 → Renderer 브로드캐스트 ─────────────────────
  watcher.onChange((event) => {
    if (event.filename === "todo-state.json") {
      todoCache = parseTodoSnapshot(event.snapshot);
      broadcastTodoChange(todoCache);
    } else {
      const partial = parseSingleSnapshot(event.filename, event.snapshot);
      broadcastLifecycleChange(partial);
    }
  });

  // ── omx:todo-get — 현재 할 일 목록 반환 ──────────────────────────────────
  ipcMain.handle(TODO_GET_CHANNEL, async (): Promise<TodoState> => {
    return todoCache;
  });

  // ── omx:lifecycle-get — 현재 전체 스냅샷 반환 (Rehydration) ──────────────
  ipcMain.handle(LIFECYCLE_GET_CHANNEL, async (): Promise<LifecycleState> => {
    const snapshots = watcher.getCurrentState();
    return parseLifecycleState(snapshots);
  });

  // ── omx:lifecycle-start — 워처를 다른 경로로 재시작 ─────────────────────
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
    ipcMain.removeHandler(TODO_GET_CHANNEL);
  } catch {
    // 이미 제거된 핸들러 무시
  }
  todoCache = { todoList: [] };
  _resetStateWatcherForTest();
}
