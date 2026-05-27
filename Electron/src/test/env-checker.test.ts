/**
 * EL-201 환경 진단 단위 테스트
 *
 * 시나리오:
 *   A. 정상 (모든 단계 통과)
 *   B. CLI 미설치 (omx not found)
 *   C. Doctor 실패 (missing 파일 존재)
 *   D. 인증 누락 (codex login status → not authenticated)
 *   E. 핸드셰이크 실패 (응답에 OMX-EXEC-OK 없음)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChildProcessWithoutNullStreams } from "child_process";
import { EventEmitter } from "events";

// ─── spawn mock 유틸 ──────────────────────────────────────────────────────────

function makeMockChild(stdout: string, exitCode: number): ChildProcessWithoutNullStreams {
  const child = new EventEmitter() as ChildProcessWithoutNullStreams;
  const stdoutEE = new EventEmitter() as NodeJS.ReadableStream;
  const stderrEE = new EventEmitter() as NodeJS.ReadableStream;

  (child as unknown as Record<string, unknown>).stdout = stdoutEE;
  (child as unknown as Record<string, unknown>).stderr = stderrEE;

  Promise.resolve().then(() => {
    if (exitCode === 0) {
      (stdoutEE as unknown as EventEmitter).emit("data", Buffer.from(stdout));
    } else {
      (stderrEE as unknown as EventEmitter).emit("data", Buffer.from(stdout));
    }
    (stderrEE as unknown as EventEmitter).emit("end");
    (stdoutEE as unknown as EventEmitter).emit("end");
    child.emit("close", exitCode);
  });

  return child;
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe("env-checker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  // ── A. 정상 시나리오 ──────────────────────────────────────────────────────
  describe("A. 정상 (모든 단계 통과)", () => {
    it("runFullEnvCheck: ok=true, version 파싱", async () => {
      const { default: cp } = await import("child_process");
      let callCount = 0;
      vi.spyOn(cp, "spawn").mockImplementation((_cmd, args) => {
        callCount++;
        const argList = args as string[];
        if (argList.includes("--version")) return makeMockChild("omx 0.14.3", 0);
        if (argList.includes("doctor")) return makeMockChild(JSON.stringify({ ok: true }), 0);
        if (argList.includes("status")) return makeMockChild("authenticated", 0);
        return makeMockChild("OMX-EXEC-OK", 0);
      });

      const { runFullEnvCheck } = await import("../main/env/env-checker");
      const result = await runFullEnvCheck();

      expect(result.ok).toBe(true);
      expect(result.code).toBe("ok");
      expect(result.version).toBe("0.14.3");
      expect(callCount).toBe(4);
    });
  });

  // ── B. CLI 미설치 ─────────────────────────────────────────────────────────
  describe("B. CLI 미설치 (omx not found)", () => {
    it("checkCliVersion: ok=false, code=cli_not_found", async () => {
      const { default: cp } = await import("child_process");
      vi.spyOn(cp, "spawn").mockImplementation(() => {
        const child = makeMockChild("", 127);
        // spawn 오류 에뮬레이션
        Promise.resolve().then(() => {
          child.emit("error", new Error("ENOENT: omx not found"));
        });
        return child;
      });

      const { checkCliVersion } = await import("../main/env/env-checker");
      const result = await checkCliVersion();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("cli_not_found");
    });

    it("runFullEnvCheck: 첫 단계에서 즉시 종료", async () => {
      const { default: cp } = await import("child_process");
      const spyFn = vi.spyOn(cp, "spawn").mockImplementation(() => {
        const child = makeMockChild("", 127);
        Promise.resolve().then(() => child.emit("error", new Error("ENOENT")));
        return child;
      });

      const { runFullEnvCheck } = await import("../main/env/env-checker");
      const result = await runFullEnvCheck();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("cli_not_found");
      // doctor/auth/handshake는 호출되지 않아야 한다
      expect(spyFn).toHaveBeenCalledTimes(1);
    });
  });

  // ── C. Doctor 실패 ────────────────────────────────────────────────────────
  describe("C. Doctor 실패 (missing 파일 존재)", () => {
    it("runOmxDoctor: ok=false, code=doctor_failed, missing 배열", async () => {
      const { default: cp } = await import("child_process");
      vi.spyOn(cp, "spawn").mockImplementation((_cmd, args) => {
        const argList = args as string[];
        if (argList.includes("--version")) return makeMockChild("omx 0.14.3", 0);
        if (argList.includes("doctor")) {
          return makeMockChild(
            JSON.stringify({ ok: false, missing: [".omxrc", "AGENTS.md"] }),
            0
          );
        }
        return makeMockChild("", 0);
      });

      const { runOmxDoctor } = await import("../main/env/env-checker");
      const result = await runOmxDoctor();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("doctor_failed");
      expect(result.missing).toContain(".omxrc");
    });
  });

  // ── D. 인증 누락 ──────────────────────────────────────────────────────────
  describe("D. 인증 누락 (codex not authenticated)", () => {
    it("verifyCodexAuth: ok=false, code=auth_missing", async () => {
      const { default: cp } = await import("child_process");
      vi.spyOn(cp, "spawn").mockReturnValue(makeMockChild("not logged in", 0));

      const { verifyCodexAuth } = await import("../main/env/env-checker");
      const result = await verifyCodexAuth();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("auth_missing");
    });
  });

  // ── E. 핸드셰이크 실패 ────────────────────────────────────────────────────
  describe("E. 핸드셰이크 실패 (응답 불일치)", () => {
    it("handshakeCheck: ok=false, code=handshake_failed", async () => {
      const { default: cp } = await import("child_process");
      vi.spyOn(cp, "spawn").mockReturnValue(makeMockChild("I cannot run that command.", 0));

      const { handshakeCheck } = await import("../main/env/env-checker");
      const result = await handshakeCheck();

      expect(result.ok).toBe(false);
      expect(result.code).toBe("handshake_failed");
    });
  });
});
