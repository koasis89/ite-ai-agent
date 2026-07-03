import { z } from 'zod';
import type { CatalogEntryStatus } from '../../catalog/schema.js';
import {
  createSkillErrorEnvelope,
  SkillContractValidationError,
} from '../errors/mappers.js';

export const DEFAULT_SKILL_TIMEOUT_MS = 30_000;
export const DEFAULT_ALLOWED_SKILL_STATUSES = ['active'] as const satisfies readonly CatalogEntryStatus[];

export interface SkillExecutionContext {
  requestId: string;
  workspaceRoot: string;
  model?: string;
  actor?: string;
}

export interface SkillActionContract<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  skillId: string;
  actionId: string;
  description?: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  timeoutMs: number;
  allowedStatuses: readonly CatalogEntryStatus[];
}

export type InferSkillRawInput<TContract extends SkillActionContract> = z.input<TContract['inputSchema']>;
export type InferSkillParsedInput<TContract extends SkillActionContract> = z.output<TContract['inputSchema']>;
export type InferSkillOutput<TContract extends SkillActionContract> = z.output<TContract['outputSchema']>;

export interface CreateSkillActionContractOptions<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
> {
  skillId: string;
  actionId: string;
  description?: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  timeoutMs?: number;
  allowedStatuses?: readonly CatalogEntryStatus[];
}

export function createSkillActionContract<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
>(
  options: CreateSkillActionContractOptions<TInputSchema, TOutputSchema>,
): SkillActionContract<TInputSchema, TOutputSchema> {
  return {
    ...options,
    timeoutMs: options.timeoutMs ?? DEFAULT_SKILL_TIMEOUT_MS,
    allowedStatuses: options.allowedStatuses ?? DEFAULT_ALLOWED_SKILL_STATUSES,
  };
}

export function validateSkillActionInput<TContract extends SkillActionContract>(
  contract: TContract,
  payload: unknown,
): InferSkillParsedInput<TContract> {
  const result = contract.inputSchema.safeParse(payload);
  if (!result.success) {
    throw new SkillContractValidationError(
      createSkillErrorEnvelope({
        code: 'INPUT_INVALID',
        message: `Invalid input for ${contract.actionId}`,
        details: {
          actionId: contract.actionId,
          skillId: contract.skillId,
          issues: result.error.issues,
        },
      }),
    );
  }

  return result.data as InferSkillParsedInput<TContract>;
}

export function validateSkillActionOutput<TContract extends SkillActionContract>(
  contract: TContract,
  payload: unknown,
): InferSkillOutput<TContract> {
  const result = contract.outputSchema.safeParse(payload);
  if (!result.success) {
    throw new SkillContractValidationError(
      createSkillErrorEnvelope({
        code: 'OUTPUT_INVALID',
        message: `Invalid output for ${contract.actionId}`,
        details: {
          actionId: contract.actionId,
          skillId: contract.skillId,
          issues: result.error.issues,
        },
      }),
    );
  }

  return result.data as InferSkillOutput<TContract>;
}