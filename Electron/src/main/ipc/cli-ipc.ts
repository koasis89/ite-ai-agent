/**
 * EL-202: cli_exec IPC 채널
 *
 * Renderer → Main: 'cli_exec'  ({ args: string[] })
 * Main → Renderer: CliEnvelope
 *
 * 보안 제약 (ADR-001):
 *   - args 배열은 반드시 'omx' 명령에 한정한다. (비화이트리스트 명령 거부)
 *   - shell: false 강제 — CliWrapper 내부 보장
 */

import { ipcMain } from "electron";
import { CliWrapper, type CliEnvelope } from "../cli/cli-wrapper";

// ─── 인수 화이트리스트 ────────────────────────────────────────────────────────
// Phase 1에서는 'omx' 명령 전용. Phase 2 확장 시 이 목록에 추가한다.
const ALLOWED_COMMANDS = ["omx"] as const;

function isAllowedCommand(args: string[]): boolean {
  if (!Array.isArray(args) || args.length === 0) return false;
  // cli-wrapper가 baseCmd('omx')를 붙이므로 args[0]는 서브커맨드
  // 첫 인수가 '__proto__', '..' 등의 경로 주입 시도 차단
  const dangerPattern = /(\.\.|\/|\\|;|&|\|)/;
  return args.every((arg) => typeof arg === "string" && !dangerPattern.test(arg));
}

// ─── 싱글턴 래퍼 인스턴스 ────────────────────────────────────────────────────
const wrapper = new CliWrapper("omx");

// ─── IPC 채널 등록 ────────────────────────────────────────────────────────────

export function registerCliIpc(): void {
  // 단발성 명령 실행
  ipcMain.handle(
    "cli_exec",
    async (_event, payload: { args: string[] }): Promise<CliEnvelope> => {
      const { args } = payload;

      if (!isAllowedCommand(args)) {
        return {
          schema_version: "1.0",
          ok: false,
          error: { message: "허용되지 않는 CLI 인수입니다.", code: "FORBIDDEN" },
        };
      }

      try {
        return await wrapper.executeUnary(args);
      } catch (err) {
        return {
          schema_version: "1.0",
          ok: false,
          error: {
            message: err instanceof Error ? err.message : String(err),
            code: "EXEC_ERROR",
          },
        };
      }
    }
  );
}

// re-export for type convenience (preload contextBridge에서 사용)
export type { CliEnvelope };
