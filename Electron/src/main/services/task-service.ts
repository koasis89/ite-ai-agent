/**
 * EL-204 + EL-205: 태스크 생명주기 서비스
 *
 * 책임:
 *   EL-204: read-task, claim-task, release-task-claim API 연동
 *   EL-205: transition-task-status API 연동 + 불변성 가드 + 결과물 패킷 수집
 *
 * ADR-001 불변 규칙:
 *   #2: spawnSync 금지 — CliWrapper.executeUnary() 경유
 *   #3: 직접 파일 쓰기 금지
 *   #4: 봉투 검증 위임 — EnvelopeParser 경유
 *
 * 낙관적 락(Optimistic Lock):
 *   claimTask()는 TaskData.version 필드를 '--version' 인수로 전달한다.
 *   서버가 충돌(Conflict)을 응답하면 OMXError.code === "Conflict" 로 확인.
 *
 * 불변성 가드 (EL-205):
 *   'in_progress' 상태에서 'planning' 등 기획 단계로 역전하는 전이 요청은
 *   InvalidTransitionError를 throw하여 IPC 레이어에서 팝업으로 처리한다.
 */

import { z } from "zod";
import { CliWrapper } from "../cli/cli-wrapper";
import { parseObject, OMXError } from "../cli/envelope-parser";
import { type SuccessEnvelope, EnvelopeErrorCode } from "../cli/schemas/envelope.schema";

// ─── CliWrapper 싱글턴 ────────────────────────────────────────────────────────

const cliWrapper = new CliWrapper("omx");

// ─── 태스크 데이터 스키마 ─────────────────────────────────────────────────────

export const TaskStatusSchema = z.enum([
  "not_started",
  "planning",
  "in_progress",
  "completed",
  "failed",
  "blocked",
]);

export const TaskDataSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  status: TaskStatusSchema,
  version: z.number().int().nonnegative(),
  assignee: z.string().optional(),
  result: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskData = z.infer<typeof TaskDataSchema>;

// ─── 상태 전이 불변성 규칙 (EL-205) ─────────────────────────────────────────

/**
 * 실행형 모드(in_progress 이상)에서 기획/계획형 모드로의 역전 전이를 차단한다.
 * 허용되지 않는 전이 시도 시 InvalidTransitionError를 throw한다.
 */
const FORBIDDEN_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  in_progress: ["not_started", "planning"],
  completed: ["not_started", "planning", "in_progress", "blocked"],
  failed: ["not_started", "planning", "in_progress", "blocked"],
};

export class InvalidTransitionError extends Error {
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(from: string, to: string) {
    super(
      `[TaskService] 상태 전이 불가: '${from}' → '${to}' 는 허용된 워크플로우 경로가 아닙니다.`
    );
    this.name = "InvalidTransitionError";
    this.fromStatus = from;
    this.toStatus = to;
  }
}

function assertTransitionAllowed(from: TaskStatus, to: TaskStatus): void {
  const forbidden = FORBIDDEN_TRANSITIONS[from];
  if (forbidden && forbidden.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────────────────────

async function runApi<T = unknown>(
  args: string[]
): Promise<SuccessEnvelope & { data: T }> {
  const envelope = await cliWrapper.executeUnary(args);
  if (!envelope.ok) {
    // cli-wrapper가 이미 OMXError를 throw하므로 여기는 방어적 코드
    throw new OMXError((envelope as any).error);
  }
  return envelope as SuccessEnvelope & { data: T };
}

// ─── EL-204: 태스크 조회 ─────────────────────────────────────────────────────

/**
 * 태스크 메타데이터를 읽어온다.
 * `omx team api read-task --task-id <id> --json`
 */
export async function readTask(taskId: string): Promise<TaskData> {
  const envelope = await runApi<unknown>(["team", "api", "read-task", "--task-id", taskId, "--json"]);
  const result = TaskDataSchema.safeParse(envelope.data);
  if (!result.success) {
    throw new Error(`[TaskService] read-task 응답 스키마 불일치: ${result.error.message}`);
  }
  return result.data;
}

// ─── EL-204: 태스크 선점 (낙관적 락) ────────────────────────────────────────

/**
 * 태스크를 현재 에이전트로 선점(claim)한다.
 * version 불일치 시 OMXError(code="Conflict") 발생 → 호출자가 task:claim-conflict 브로드캐스트.
 *
 * `omx team api claim-task --task-id <id> --version <n> --json`
 */
export async function claimTask(taskId: string, version: number): Promise<void> {
  await runApi(["team", "api", "claim-task", "--task-id", taskId, "--version", String(version), "--json"]);
}

// ─── EL-204: 태스크 선점 해제 (복구 흐름) ────────────────────────────────────

/**
 * 에러 발생 시 선점 상태를 서버에 반환한다. (복구 흐름)
 * `omx team api release-task-claim --task-id <id> --json`
 */
export async function releaseTaskClaim(taskId: string): Promise<void> {
  try {
    await runApi(["team", "api", "release-task-claim", "--task-id", taskId, "--json"]);
  } catch (err) {
    // 이미 해제되었거나 Not Found인 경우 — 복구 흐름이므로 에러를 삼킨다.
    if (err instanceof OMXError && err.code === EnvelopeErrorCode.NOT_FOUND) {
      console.warn(`[TaskService] releaseTaskClaim: taskId=${taskId} 는 서버에서 이미 해제됨.`);
      return;
    }
    throw err;
  }
}

// ─── EL-205: 태스크 상태 전이 ────────────────────────────────────────────────

export type TransitionTarget = "completed" | "failed";

/**
 * 태스크 상태를 지정한 목표 상태로 전이한다.
 * 불변성 가드에서 금지된 역전 요청 시 InvalidTransitionError throw.
 * 전이 완료 후 서버 응답의 data 블록을 반환한다.
 *
 * `omx team api transition-task-status --task-id <id> --status <target> --json`
 *
 * @param taskId     대상 태스크 ID
 * @param current    현재 알려진 상태 (불변성 가드용)
 * @param target     전이할 목표 상태 ('completed' | 'failed')
 * @param resultData 결과물 데이터 (선택, JSON 직렬화하여 --result 인수로 전달)
 * @returns          서버 응답 data 블록 (결과물 아카이브용)
 */
export async function transitionTaskStatus(
  taskId: string,
  current: TaskStatus,
  target: TransitionTarget,
  resultData?: Record<string, unknown>
): Promise<unknown> {
  // 불변성 가드
  assertTransitionAllowed(current, target as TaskStatus);

  const args = ["team", "api", "transition-task-status", "--task-id", taskId, "--status", target, "--json"];

  if (resultData !== undefined) {
    args.push("--result", JSON.stringify(resultData));
  }

  const envelope = await runApi<unknown>(args);
  return envelope.data;
}
