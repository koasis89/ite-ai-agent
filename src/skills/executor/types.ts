import type { CatalogSkillEntry } from '../../catalog/schema.js';
import type {
  InferSkillOutput,
  InferSkillParsedInput,
  SkillActionContract,
  SkillExecutionContext,
} from '../contracts/core.js';
import type { SkillErrorEnvelope } from '../errors/codes.js';

export interface SkillExecutionSuccess<TData> {
  ok: true;
  data: TData;
  error?: undefined;
  meta?: Record<string, unknown>;
}

export interface SkillExecutionFailure {
  ok: false;
  data?: undefined;
  error: SkillErrorEnvelope;
  meta?: Record<string, unknown>;
}

export type SkillExecutionResult<TData> = SkillExecutionSuccess<TData> | SkillExecutionFailure;

export interface SkillExecutor<TContract extends SkillActionContract = SkillActionContract> {
  contract: TContract;
  execute(
    input: InferSkillParsedInput<TContract>,
    context: SkillExecutionContext,
  ): Promise<InferSkillOutput<TContract>> | InferSkillOutput<TContract>;
}

export interface SkillRegistryEntry<TContract extends SkillActionContract = SkillActionContract> {
  skill: CatalogSkillEntry;
  executor: SkillExecutor<TContract>;
}

export interface SkillRegistry {
  register(entry: SkillRegistryEntry): void;
  registerAlias(aliasActionId: string, canonicalActionId: string): void;
  resolveActionId(actionId: string): string | undefined;
  get(actionId: string): SkillRegistryEntry | undefined;
  has(actionId: string): boolean;
  list(): SkillRegistryEntry[];
}