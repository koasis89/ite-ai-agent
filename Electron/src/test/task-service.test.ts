/**
 * EL-204 DoD: task-service.ts 단위 테스트 — 태스크 선점/해제 흐름
 *
 * 시나리오:
 *   A. readTask Happy Path — 정상 응답 시 TaskData 반환
 *   B. readTask Not Found — OMXError(code="NotFound") throw
 *   C. claimTask Happy Path — 낙관적 락 정상 선점
 *   D. claimTask Conflict — Conflict 코드로 OMXError throw
 *   E. releaseTaskClaim Happy Path — 선점 해제 정상
 *   F. releaseTaskClaim Not Found — 조용히 삼킴 (복구 흐름)
 *   G. releaseTaskClaim 기타 에러 — OMXError 재throw
 */

import { jest } from "@jest/globals";
import { OMXError } from "../main/cli/envelope-parser";
import { EnvelopeErrorCode } from "../main/cli/schemas/envelope.schema";

// ─── CliWrapper 모킹 ──────────────────────────────────────────────────────────

jest.mock("../main/cli/cli-wrapper", () => ({
  CliWrapper: jest.fn().mockImplementation(() => ({
    executeUnary: jest.fn(),
  })),
}));

import { CliWrapper } from "../main/cli/cli-wrapper";
import {
  readTask,
  claimTask,
  releaseTaskClaim,
  type TaskData,
} from "../main/services/task-service";

const mockExecuteUnary = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (CliWrapper as jest.MockedClass<typeof CliWrapper>).mockImplementation(() => ({
    executeUnary: mockExecuteUnary,
  }) as any);
});

// ─── 공통 픽스처 ──────────────────────────────────────────────────────────────

function makeSuccessEnvelope(data: unknown) {
  return { schema_version: "1.0", ok: true, data };
}

const sampleTask: TaskData = {
  id: "task-001",
  title: "첫 번째 태스크",
  status: "not_started",
  version: 3,
};

// ─── 시나리오 A: readTask Happy Path ─────────────────────────────────────────

describe("A. readTask — Happy Path", () => {
  it("CLI 응답 data를 TaskData로 파싱하여 반환한다", async () => {
    mockExecuteUnary.mockResolvedValueOnce(makeSuccessEnvelope(sampleTask));

    const result = await readTask("task-001");

    expect(result.id).toBe("task-001");
    expect(result.version).toBe(3);
    expect(result.status).toBe("not_started");
    expect(mockExecuteUnary).toHaveBeenCalledWith(
      expect.arrayContaining(["read-task", "--task-id", "task-001", "--json"])
    );
  });
});

// ─── 시나리오 B: readTask Not Found ──────────────────────────────────────────

describe("B. readTask — Not Found", () => {
  it("CLI가 에러를 throw하면 그대로 전파한다", async () => {
    const notFoundErr = new OMXError({ code: "NotFound", message: "태스크 없음" });
    mockExecuteUnary.mockRejectedValueOnce(notFoundErr);

    await expect(readTask("nonexistent-task")).rejects.toThrow(OMXError);
    await expect(readTask("nonexistent-task")).rejects.toMatchObject({ code: "NotFound" });
  });
});

// ─── 시나리오 C: claimTask Happy Path ────────────────────────────────────────

describe("C. claimTask — Happy Path", () => {
  it("선점 성공 시 예외 없이 resolve된다", async () => {
    mockExecuteUnary.mockResolvedValueOnce(makeSuccessEnvelope({ claimed: true }));

    await expect(claimTask("task-001", 3)).resolves.toBeUndefined();
    expect(mockExecuteUnary).toHaveBeenCalledWith(
      expect.arrayContaining(["claim-task", "--task-id", "task-001", "--version", "3", "--json"])
    );
  });
});

// ─── 시나리오 D: claimTask Conflict ──────────────────────────────────────────

describe("D. claimTask — Conflict (낙관적 락 충돌)", () => {
  it("Conflict 에러 코드로 OMXError가 throw된다", async () => {
    const conflictErr = new OMXError({
      code: EnvelopeErrorCode.CONFLICT,
      message: "이미 선점된 태스크",
      metadata: { currentVersion: 4, yourVersion: 3 },
    });
    mockExecuteUnary.mockRejectedValueOnce(conflictErr);

    await expect(claimTask("task-001", 3)).rejects.toThrow(OMXError);
    await expect(claimTask("task-001", 3)).rejects.toMatchObject({ code: "Conflict" });
  });
});

// ─── 시나리오 E: releaseTaskClaim Happy Path ─────────────────────────────────

describe("E. releaseTaskClaim — Happy Path", () => {
  it("선점 해제 성공 시 예외 없이 resolve된다", async () => {
    mockExecuteUnary.mockResolvedValueOnce(makeSuccessEnvelope({ released: true }));

    await expect(releaseTaskClaim("task-001")).resolves.toBeUndefined();
    expect(mockExecuteUnary).toHaveBeenCalledWith(
      expect.arrayContaining(["release-task-claim", "--task-id", "task-001", "--json"])
    );
  });
});

// ─── 시나리오 F: releaseTaskClaim Not Found → 조용히 삼킴 ────────────────────

describe("F. releaseTaskClaim — Not Found (복구 흐름)", () => {
  it("이미 해제된 태스크에 대해 OMXError(NotFound)를 삼키고 resolve된다", async () => {
    const notFoundErr = new OMXError({ code: "NotFound", message: "태스크 없음" });
    mockExecuteUnary.mockRejectedValueOnce(notFoundErr);

    // 에러 없이 정상 종료되어야 한다 (복구 흐름)
    await expect(releaseTaskClaim("task-gone")).resolves.toBeUndefined();
  });
});

// ─── 시나리오 G: releaseTaskClaim 기타 에러 → 재throw ───────────────────────

describe("G. releaseTaskClaim — 기타 에러 재throw", () => {
  it("Forbidden 에러는 그대로 throw된다", async () => {
    const forbiddenErr = new OMXError({ code: "Forbidden", message: "권한 없음" });
    mockExecuteUnary.mockRejectedValueOnce(forbiddenErr);

    await expect(releaseTaskClaim("task-001")).rejects.toThrow(OMXError);
    await expect(releaseTaskClaim("task-001")).rejects.toMatchObject({ code: "Forbidden" });
  });
});
