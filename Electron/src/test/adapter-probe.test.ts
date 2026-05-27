/**
 * EL-222: adapter-probe 단위 테스트
 *
 * 검증 항목:
 *   - running 상태: envelope + probe 연쇄 호출 확인
 *   - degraded 상태: envelope/probe 연쇄 호출 없음
 *   - unavailable 상태: CLI 오류 → unavailable 처리
 *   - Hermes degraded 상태 + envelope 메타데이터 모킹 파싱 성공
 *   - probe alive=false → running을 degraded로 다운그레이드
 *   - probeAllAdapters(): openclaw + hermes 병렬 탐지
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  probeAdapter,
  probeAllAdapters,
  AdapterStatusSchema,
  type AdapterTarget,
} from "../../main/cli/adapter-probe";
import type { CliWrapper } from "../../main/cli/cli-wrapper";

// ─── CliWrapper 모킹 ──────────────────────────────────────────────────────────

type MockResponses = Record<string, unknown>;

function makeMockCli(responses: MockResponses): CliWrapper {
  return {
    executeUnary: vi.fn((args: string[]) => {
      const key = args.join(" ");
      // 가장 구체적인 match 우선
      const match = Object.entries(responses)
        .sort((a, b) => b[0].length - a[0].length)
        .find(([k]) => key.includes(k));
      if (match) return Promise.resolve(match[1]);
      return Promise.resolve({
        ok: false,
        schema_version: "1.0",
        error: { message: "mock not found", code: "MOCK_UNSET" },
      });
    }),
    executeStream: vi.fn(),
  } as unknown as CliWrapper;
}

// ─── AdapterStatusSchema 단위 검증 ────────────────────────────────────────────

describe("AdapterStatusSchema", () => {
  it.each(["unavailable", "installed", "degraded", "running"] as const)(
    "'%s' 상태를 파싱해야 한다",
    (status) => {
      const result = AdapterStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  );

  it("알 수 없는 상태 값을 거부해야 한다", () => {
    const result = AdapterStatusSchema.safeParse("unknown_status");
    expect(result.success).toBe(false);
  });
});

// ─── probeAdapter 테스트 ─────────────────────────────────────────────────────

describe("probeAdapter()", () => {
  // ── running 상태 ────────────────────────────────────────────────────────────

  describe("running 상태", () => {
    let cli: CliWrapper;

    beforeEach(() => {
      cli = makeMockCli({
        "adapt openclaw status": {
          ok: true,
          schema_version: "1.0",
          data: { status: "running" },
        },
        "adapt openclaw envelope": {
          ok: true,
          schema_version: "1.0",
          data: {
            version: "2.1.0",
            capabilities: ["tool_call", "stream", "mcp"],
            endpoint: "unix:///tmp/openclaw.sock",
          },
        },
        "adapt openclaw probe": {
          ok: true,
          schema_version: "1.0",
          data: { latency_ms: 12, alive: true, last_checked: "2025-01-01T00:00:00Z" },
        },
      });
    });

    it("status = running을 반환해야 한다", async () => {
      const info = await probeAdapter("openclaw", cli);
      expect(info.status).toBe("running");
    });

    it("envelope 메타데이터를 파싱해야 한다", async () => {
      const info = await probeAdapter("openclaw", cli);
      expect(info.envelope?.version).toBe("2.1.0");
      expect(info.envelope?.capabilities).toContain("tool_call");
      expect(info.envelope?.endpoint).toBe("unix:///tmp/openclaw.sock");
    });

    it("probe 결과를 파싱해야 한다", async () => {
      const info = await probeAdapter("openclaw", cli);
      expect(info.probe?.alive).toBe(true);
      expect(info.probe?.latency_ms).toBe(12);
    });

    it("status + envelope + probe 3회 CLI 호출을 해야 한다", async () => {
      await probeAdapter("openclaw", cli);
      expect(cli.executeUnary).toHaveBeenCalledTimes(3);
    });
  });

  // ── Hermes degraded 상태 ────────────────────────────────────────────────────

  describe("Hermes degraded 상태 (EL-222 핵심 시나리오)", () => {
    let cli: CliWrapper;

    beforeEach(() => {
      cli = makeMockCli({
        "adapt hermes status": {
          ok: true,
          schema_version: "1.0",
          data: { status: "degraded" },
        },
        // degraded 상태에서는 envelope/probe를 호출하지 않아야 함
      });
    });

    it("status = degraded를 반환해야 한다", async () => {
      const info = await probeAdapter("hermes", cli);
      expect(info.status).toBe("degraded");
    });

    it("envelope와 probe는 undefined여야 한다", async () => {
      const info = await probeAdapter("hermes", cli);
      expect(info.envelope).toBeUndefined();
      expect(info.probe).toBeUndefined();
    });

    it("CLI를 status 1회만 호출해야 한다 (연쇄 없음)", async () => {
      await probeAdapter("hermes", cli);
      expect(cli.executeUnary).toHaveBeenCalledTimes(1);
    });
  });

  // ── running + probe alive=false → degraded 다운그레이드 ──────────────────────

  describe("probe alive=false → degraded 다운그레이드", () => {
    it("probe.alive=false 시 status가 degraded로 변경되어야 한다", async () => {
      const cli = makeMockCli({
        "adapt hermes status": {
          ok: true,
          schema_version: "1.0",
          data: { status: "running" },
        },
        "adapt hermes envelope": {
          ok: true,
          schema_version: "1.0",
          data: { version: "1.0.0", capabilities: [] },
        },
        "adapt hermes probe": {
          ok: true,
          schema_version: "1.0",
          data: {
            latency_ms: 9999,
            alive: false,
            error: "connection refused",
          },
        },
      });

      const info = await probeAdapter("hermes", cli);
      expect(info.status).toBe("degraded");
      expect(info.probe?.alive).toBe(false);
    });
  });

  // ── installed 상태 ──────────────────────────────────────────────────────────

  describe("installed 상태", () => {
    it("envelope/probe 없이 status=installed만 반환해야 한다", async () => {
      const cli = makeMockCli({
        "adapt openclaw status": {
          ok: true,
          schema_version: "1.0",
          data: { status: "installed" },
        },
      });
      const info = await probeAdapter("openclaw", cli);
      expect(info.status).toBe("installed");
      expect(info.envelope).toBeUndefined();
      expect(cli.executeUnary).toHaveBeenCalledTimes(1);
    });
  });

  // ── unavailable 처리 ────────────────────────────────────────────────────────

  describe("unavailable 처리", () => {
    it("CLI 오류 응답 시 status=unavailable을 반환해야 한다", async () => {
      const cli = makeMockCli({
        "adapt openclaw status": {
          ok: false,
          schema_version: "1.0",
          error: { message: "command not found", code: "NOT_FOUND" },
        },
      });
      const info = await probeAdapter("openclaw", cli);
      expect(info.status).toBe("unavailable");
    });

    it("알 수 없는 status 값 시 unavailable로 폴백해야 한다", async () => {
      const cli = makeMockCli({
        "adapt openclaw status": {
          ok: true,
          schema_version: "1.0",
          data: { status: "UNKNOWN_STATUS_VALUE" },
        },
      });
      const info = await probeAdapter("openclaw", cli);
      expect(info.status).toBe("unavailable");
    });
  });

  // ── probed_at 타임스탬프 ────────────────────────────────────────────────────

  it("probed_at ISO 타임스탬프가 포함되어야 한다", async () => {
    const cli = makeMockCli({
      "adapt openclaw status": {
        ok: true,
        schema_version: "1.0",
        data: { status: "installed" },
      },
    });
    const info = await probeAdapter("openclaw", cli);
    expect(() => new Date(info.probed_at)).not.toThrow();
    expect(info.probed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── probeAllAdapters 테스트 ─────────────────────────────────────────────────

describe("probeAllAdapters()", () => {
  it("openclaw + hermes 두 개를 모두 반환해야 한다", async () => {
    const cli = makeMockCli({
      "adapt openclaw status": {
        ok: true,
        schema_version: "1.0",
        data: { status: "running" },
      },
      "adapt openclaw envelope": {
        ok: true,
        schema_version: "1.0",
        data: { version: "2.0.0" },
      },
      "adapt openclaw probe": {
        ok: true,
        schema_version: "1.0",
        data: { alive: true },
      },
      "adapt hermes status": {
        ok: true,
        schema_version: "1.0",
        data: { status: "installed" },
      },
    });

    const results = await probeAllAdapters(cli);
    expect(results).toHaveLength(2);
    const targets = results.map((r) => r.target);
    expect(targets).toContain("openclaw");
    expect(targets).toContain("hermes");
  });

  it("한 어댑터 오류 시에도 다른 어댑터 결과를 반환해야 한다", async () => {
    const cli = makeMockCli({
      "adapt openclaw status": {
        ok: false,
        schema_version: "1.0",
        error: { message: "error", code: "ERR" },
      },
      "adapt hermes status": {
        ok: true,
        schema_version: "1.0",
        data: { status: "running" },
      },
      "adapt hermes envelope": {
        ok: true,
        schema_version: "1.0",
        data: { version: "1.5.0" },
      },
      "adapt hermes probe": {
        ok: true,
        schema_version: "1.0",
        data: { alive: true },
      },
    });

    const results = await probeAllAdapters(cli);
    expect(results).toHaveLength(2);
    const openclawResult = results.find((r) => r.target === "openclaw");
    const hermesResult = results.find((r) => r.target === "hermes");
    expect(openclawResult?.status).toBe("unavailable");
    expect(hermesResult?.status).toBe("running");
  });
});
