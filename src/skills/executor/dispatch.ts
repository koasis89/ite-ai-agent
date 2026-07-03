import {
  validateSkillActionInput,
  validateSkillActionOutput,
  type SkillExecutionContext,
} from '../contracts/core.js';
import { createSkillErrorEnvelope, mapUnknownSkillError } from '../errors/mappers.js';
import { evaluateSkillExecutionPolicy, type SkillExecutionPolicyOptions } from '../policy/status-policy.js';
import type { SkillExecutionResult, SkillRegistry } from './types.js';

export async function dispatchSkillAction(
  registry: SkillRegistry,
  actionId: string,
  payload: unknown,
  context: SkillExecutionContext,
  policyOptions?: SkillExecutionPolicyOptions,
): Promise<SkillExecutionResult<unknown>> {
  const resolvedActionId = registry.resolveActionId(actionId);
  const entry = resolvedActionId ? registry.get(resolvedActionId) : undefined;
  if (!entry) {
    return {
      ok: false,
      error: createSkillErrorEnvelope({
        code: 'CONTRACT_NOT_FOUND',
        message: `Skill action not found: ${actionId}`,
        details: {
          actionId,
          resolvedActionId,
        },
      }),
    };
  }

  const redirectedByAlias = resolvedActionId !== undefined && resolvedActionId !== actionId;

  const policy = evaluateSkillExecutionPolicy(entry.skill, policyOptions);
  if (!policy.executable) {
    return {
      ok: false,
      error: createSkillErrorEnvelope({
        code: 'SKILL_NOT_EXECUTABLE',
        message: `Skill is not executable: ${entry.skill.name}`,
        details: {
          actionId,
          resolvedActionId,
          skill: entry.skill.name,
          status: entry.skill.status,
          reason: policy.reason,
        },
      }),
    };
  }

  try {
    const validatedInput = validateSkillActionInput(entry.executor.contract, payload);
    const rawOutput = await entry.executor.execute(validatedInput as never, context);
    const validatedOutput = validateSkillActionOutput(entry.executor.contract, rawOutput);

    return {
      ok: true,
      data: validatedOutput,
      meta: {
        actionId,
        resolvedActionId,
        requestId: context.requestId,
        redirected: policy.redirected || redirectedByAlias,
        resolvedSkillName: policy.resolvedSkillName,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: mapUnknownSkillError(error),
      meta: {
        actionId,
        resolvedActionId,
        requestId: context.requestId,
      },
    };
  }
}