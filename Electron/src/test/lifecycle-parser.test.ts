/**
 * EL-218: LifecycleParser 테스트
 *
 * 핵심 검증 목표:
 *   1. 빈 스냅샷 → status: "idle" 반환
 *   2. team-state.json이 있으면 최상위 상태로 사용
 *   3. 다중 모드 상태 중 우선순위 최고 상태 선택
 *   4. 감사 필드 (completed_at, auto_completed_reason, completion_note) 추출
 *   5. 상태 문자열 정규화 (별칭 처리)
 *   6. skill-active-state.json에서 activeSkill 추출
 *   7. 차단/실패 원인 추출
 *   8. mergedModes 정확성
 *   9. parseSingleSnapshot 동작
 */

import { describe, it, expect } from "vitest";
import {
  parseLifecycleState,
  parseSingleSnapshot,
  normalizeStatus,
} from "../main/state/lifecycle-parser";

// ─── 테스트 픽스처 ────────────────────────────────────────────────────────────

function makeMap(
  entries: Array<[string, Record<string, unknown>]>,
): Map<string, Record<string, unknown>> {
  return new Map(entries);
}

// ─── normalizeStatus 테스트 ───────────────────────────────────────────────────

describe("normalizeStatus", () => {
  it("'running'을 그대로 반환한다", () => {
    expect(normalizeStatus("running")).toBe("running");
  });

  it("별칭 'active' → 'running'으로 정규화한다", () => {
    expect(normalizeStatus("active")).toBe("running");
  });

  it("별칭 'completed' → 'finished'로 정규화한다", () => {
    expect(normalizeStatus("completed")).toBe("finished");
  });

  it("별칭 'interlude' → 'userinterlude'로 정규화한다", () => {
    expect(normalizeStatus("interlude")).toBe("userinterlude");
  });

  it("인식 불가 값 → 'idle' 폴백", () => {
    expect(normalizeStatus("unknown_state")).toBe("idle");
  });

  it("undefined → 'idle' 폴백", () => {
    expect(normalizeStatus(undefined)).toBe("idle");
  });

  it("대소문자 무관 처리", () => {
    expect(normalizeStatus("RUNNING")).toBe("running");
    expect(normalizeStatus("Finished")).toBe("finished");
  });
});

// ─── parseLifecycleState 테스트 ───────────────────────────────────────────────

describe("parseLifecycleState", () => {
  it("빈 스냅샷 맵 → status: 'idle' 반환", () => {
    const result = parseLifecycleState(makeMap([]));
    expect(result.status).toBe("idle");
    expect(result.mergedModes).toEqual([]);
  });

  it("team-state.json이 있으면 최상위 상태로 사용한다", () => {
    const snapshots = makeMap([
      ["team-state.json", { status: "running" }],
      ["ralph-state.json", { status: "blocked" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("running");
    expect(result.activeMode).toBe("team");
  });

  it("team-state 없을 때 우선순위 최고 상태를 선택한다 (blocked > idle)", () => {
    const snapshots = makeMap([
      ["ralph-state.json", { status: "idle" }],
      ["ultrawork-state.json", { status: "blocked" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("blocked");
    expect(result.activeMode).toBe("ultrawork");
  });

  it("team-state 없을 때 우선순위 최고 상태를 선택한다 (running > finished)", () => {
    const snapshots = makeMap([
      ["ralph-state.json", { status: "finished" }],
      ["ultrawork-state.json", { status: "running" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("running");
  });

  it("mergedModes에 모든 모드 파일이 포함된다", () => {
    const snapshots = makeMap([
      ["team-state.json", { status: "running" }],
      ["ralph-state.json", { status: "idle" }],
      ["ultrawork-state.json", { status: "idle" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.mergedModes).toContain("team");
    expect(result.mergedModes).toContain("ralph");
    expect(result.mergedModes).toContain("ultrawork");
  });

  it("finished 상태 시 감사 필드(audit)를 추출한다", () => {
    const snapshots = makeMap([
      [
        "team-state.json",
        {
          status: "finished",
          completed_at: "2024-01-01T12:00:00Z",
          auto_completed_reason: "auto-done",
          completion_note: "정상 완료되었습니다.",
        },
      ],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("finished");
    expect(result.audit).toMatchObject({
      completed_at: "2024-01-01T12:00:00Z",
      auto_completed_reason: "auto-done",
      completion_note: "정상 완료되었습니다.",
    });
  });

  it("non-finished 상태에서는 audit가 없거나 빈 객체다", () => {
    const snapshots = makeMap([
      [
        "team-state.json",
        {
          status: "running",
          completed_at: "2024-01-01T12:00:00Z", // 무시
        },
      ],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.audit).toBeUndefined();
  });

  it("skill-active-state.json에서 activeSkill을 추출한다", () => {
    const snapshots = makeMap([
      ["team-state.json", { status: "running" }],
      ["skill-active-state.json", { skill: "ultrawork", status: "running" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.activeSkill).toBe("ultrawork");
  });

  it("blocked 상태 시 reason이 blocked_reason에서 추출된다", () => {
    const snapshots = makeMap([
      [
        "team-state.json",
        { status: "blocked", blocked_reason: "도구 응답 대기 중" },
      ],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("도구 응답 대기 중");
  });

  it("failed 상태 시 reason이 error에서 추출된다", () => {
    const snapshots = makeMap([
      ["team-state.json", { status: "failed", error: "타임아웃 오류" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("failed");
    expect(result.reason).toBe("타임아웃 오류");
  });

  it("userinterlude 상태 시 interlude_kind가 reason으로 추출된다", () => {
    const snapshots = makeMap([
      [
        "team-state.json",
        { status: "userinterlude", interlude_kind: "confirm" },
      ],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("userinterlude");
    expect(result.reason).toBe("confirm");
  });

  it("skill-active-state.json은 mergedModes에 포함되지 않는다", () => {
    const snapshots = makeMap([
      ["team-state.json", { status: "running" }],
      ["skill-active-state.json", { skill: "ultrawork" }],
    ]);
    const result = parseLifecycleState(snapshots);
    expect(result.mergedModes).not.toContain("skill-active");
    expect(result.mergedModes).toContain("team");
  });

  it("updatedAt은 ISO 8601 형식이다", () => {
    const snapshots = makeMap([["team-state.json", { status: "idle" }]]);
    const result = parseLifecycleState(snapshots);
    expect(() => new Date(result.updatedAt)).not.toThrow();
    expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("state 필드에서도 상태를 추출한다 (status 없을 때)", () => {
    const snapshots = makeMap([["team-state.json", { state: "blocked" }]]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("blocked");
  });

  it("phase 필드에서도 상태를 추출한다 (status/state 없을 때)", () => {
    const snapshots = makeMap([["team-state.json", { phase: "running" }]]);
    const result = parseLifecycleState(snapshots);
    expect(result.status).toBe("running");
  });
});

// ─── parseSingleSnapshot 테스트 ───────────────────────────────────────────────

describe("parseSingleSnapshot", () => {
  it("null 스냅샷 → status: 'idle'", () => {
    const result = parseSingleSnapshot("team-state.json", null);
    expect(result.status).toBe("idle");
  });

  it("파일명으로부터 activeMode를 추출한다", () => {
    const result = parseSingleSnapshot("ralph-state.json", { status: "running" });
    expect(result.activeMode).toBe("ralph");
  });

  it("finished 상태 시 audit 필드를 추출한다", () => {
    const result = parseSingleSnapshot("team-state.json", {
      status: "finished",
      completion_note: "완료!",
    });
    expect(result.status).toBe("finished");
    expect(result.audit?.completion_note).toBe("완료!");
  });

  it("mergedModes에 단일 모드가 포함된다", () => {
    const result = parseSingleSnapshot("ultrawork-state.json", { status: "idle" });
    expect(result.mergedModes).toContain("ultrawork");
  });
});
