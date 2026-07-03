import type { CatalogSkillEntry } from '../../catalog/schema.js';
import type { SkillExecutionContext } from '../contracts/core.js';
import {
  createWorkflowSkillContract,
  type WorkflowSkillInput,
  type WorkflowSkillOutput,
} from '../contracts/actions/workflow.js';
import type { SkillExecutor, SkillRegistryEntry } from './types.js';

export type WorkflowSkillHandler = (
  input: WorkflowSkillInput,
  context: SkillExecutionContext,
) => Promise<WorkflowSkillOutput> | WorkflowSkillOutput;

export function createWorkflowSkillExecutor(
  skill: CatalogSkillEntry,
  handler?: WorkflowSkillHandler,
): SkillExecutor {
  const contract = createWorkflowSkillContract(skill.name);

  return {
    contract,
    async execute(input: WorkflowSkillInput, context: SkillExecutionContext): Promise<WorkflowSkillOutput> {
      if (handler) {
        return handler(input, context);
      }

      return {
        ok: true,
        status: 'queued',
        message: `Workflow skill queued: ${skill.name}`,
        executedSkill: skill.name,
      };
    },
  };
}

export function createWorkflowSkillRegistryEntry(
  skill: CatalogSkillEntry,
  handler?: WorkflowSkillHandler,
): SkillRegistryEntry {
  return {
    skill,
    executor: createWorkflowSkillExecutor(skill, handler),
  };
}