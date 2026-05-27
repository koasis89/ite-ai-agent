/**
 * EL-216: 인터류드(Interlude) IPC 핸들러 — Main Process 측
 *
 * Renderer와 인터류드 상태를 중재하는 IPC 브릿지.
 *
 * 등록 핸들러:
 *   omx:interlude-ack      — 사용자 승인/거절 수신 → stdin 주입 또는 롤백 실행
 *
 * 브로드캐스트 채널 (Renderer 수신):
 *   omx:interlude-start    — 차단 신호 시작 (InterludeTriager에서 발신)
 *   omx:interlude-resolved — 인터류드 해제 (승인 처리 완료)
 *   omx:interlude-cancelled— 인터류드 취소 (거절 처리 완료)
 *
 * 수명주기:
 *   1. InterludeTriager.triage() → omx:interlude-start 브로드캐스트
 *   2. Renderer 사용자 입력 → omx:interlude-ack 핸들러 수신
 *   3. 승인: writeToStdin → omx:interlude-resolved 브로드캐스트
 *      거절: 롤백 처리 → omx:interlude-cancelled 브로드캐스트
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용.
 */

import { ipcMain, BrowserWindow } from "electron";
import { writeToStdin } from "../cli/stdin-writer";
import {
  INTERLUDE_ACK_CHANNEL,
  InterludeAckSchema,
  type InterludeAck,
} from "../cli/interlude-triager";
import type { ChildProcessWithoutNullStreams } from "child_process";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

/** 인터류드 해제 알림 채널 (Renderer 수신) */
export const INTERLUDE_RESOLVED_CHANNEL = "omx:interlude-resolved";

/** 인터류드 취소 알림 채널 (Renderer 수신) */
export const INTERLUDE_CANCELLED_CHANNEL = "omx:interlude-cancelled";

/** 인터류드 오류 알림 채널 (Renderer 수신) */
export const INTERLUDE_ERROR_CHANNEL = "omx:interlude-error";

// ─── 세션 상태 ────────────────────────────────────────────────────────────────

/**
 * 현재 인터류드 세션과 연결된 자식 프로세스 참조.
 * registerInterludeIpc() 등록 후 setInterludeChild()로 주입.
 */
let _activeChild: ChildProcessWithoutNullStreams | null = null;

/**
 * 현재 인터류드에서 stdin 주입을 기다리는 callId 집합.
 * 중복 ACK 방지 및 해제 후 락 검증용.
 */
const _pendingCallIds = new Set<string>();

// ─── 공개 API ────────────────────────────────────────────────────────────────

/**
 * 인터류드 IPC 핸들러를 Main Process에 등록한다.
 * app.on('ready') 이후 한 번만 호출.
 */
export function registerInterludeIpc(): void {
  // 중복 등록 방지
  ipcMain.removeHandler(INTERLUDE_ACK_CHANNEL);

  ipcMain.handle(INTERLUDE_ACK_CHANNEL, async (_event, rawAck: unknown) => {
    return handleInterludeAck(rawAck);
  });
}

/**
 * 현재 인터류드와 연결된 자식 프로세스를 주입한다.
 * stream-bridge-ipc에서 에이전트 스트림 시작 시 호출.
 */
export function setInterludeChild(child: ChildProcessWithoutNullStreams | null): void {
  _activeChild = child;
}

/**
 * 인터류드 대기 큐에 callId를 등록한다.
 * InterludeTriager.triage() 이후 호출하여 락을 걸어둠.
 */
export function registerPendingInterlude(callId: string): void {
  _pendingCallIds.add(callId);
}

/**
 * 테스트용 내부 상태 초기화
 */
export function _resetInterludeForTest(): void {
  _activeChild = null;
  _pendingCallIds.clear();
  ipcMain.removeHandler(INTERLUDE_ACK_CHANNEL);
}

// ─── 핵심 핸들러 ──────────────────────────────────────────────────────────────

/**
 * Renderer로부터 omx:interlude-ack 수신 시 처리 흐름:
 *   - 승인(approved: true)  → stdin에 userInput 주입 → resolved 브로드캐스트
 *   - 거절(approved: false) → 롤백 루틴 실행 → cancelled 브로드캐스트
 */
async function handleInterludeAck(rawAck: unknown): Promise<{ ok: boolean; error?: string }> {
  // ─── 스키마 검증 ──────────────────────────────────────────────────────────
  const result = InterludeAckSchema.safeParse(rawAck);
  if (!result.success) {
    const msg = `[interlude-ipc] Invalid ACK payload: ${result.error.message}`;
    broadcastToRenderers(INTERLUDE_ERROR_CHANNEL, { message: msg });
    return { ok: false, error: msg };
  }

  const ack: InterludeAck = result.data;

  // ─── 미등록 callId 방어 ───────────────────────────────────────────────────
  if (!_pendingCallIds.has(ack.callId)) {
    const msg = `[interlude-ipc] Unknown callId: ${ack.callId}`;
    return { ok: false, error: msg };
  }

  _pendingCallIds.delete(ack.callId);

  if (ack.approved) {
    // ─── 승인 처리 ────────────────────────────────────────────────────────
    return handleApproval(ack);
  } else {
    // ─── 거절/롤백 처리 ───────────────────────────────────────────────────
    return handleCancellation(ack);
  }
}

/**
 * 승인 처리: userInput → stdin 주입 → interlude-resolved 브로드캐스트
 */
async function handleApproval(ack: InterludeAck): Promise<{ ok: boolean; error?: string }> {
  if (!_activeChild) {
    const msg = "[interlude-ipc] No active child process for stdin injection";
    broadcastToRenderers(INTERLUDE_ERROR_CHANNEL, { message: msg });
    return { ok: false, error: msg };
  }

  const input = ack.userInput ?? "";

  try {
    await writeToStdin({ child: _activeChild, data: input });
    broadcastToRenderers(INTERLUDE_RESOLVED_CHANNEL, {
      callId: ack.callId,
      userInput: input,
    });
    return { ok: true };
  } catch (err) {
    const msg = `[interlude-ipc] stdin write failed: ${String(err)}`;
    broadcastToRenderers(INTERLUDE_ERROR_CHANNEL, { message: msg });
    return { ok: false, error: msg };
  }
}

/**
 * 취소/롤백 처리: SIGTERM → interlude-cancelled 브로드캐스트
 *
 * 태스크 롤백 의도를 CLI 프로세스에 전달하기 위해 SIGTERM을 송신하고,
 * Renderer에 취소 완료 이벤트를 알림.
 */
function handleCancellation(ack: InterludeAck): { ok: boolean } {
  if (_activeChild && !_activeChild.killed) {
    _activeChild.kill("SIGTERM");
  }

  broadcastToRenderers(INTERLUDE_CANCELLED_CHANNEL, {
    callId: ack.callId,
  });

  return { ok: true };
}

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

function broadcastToRenderers(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
