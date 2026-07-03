import { z } from 'zod';
import { createSkillActionContract } from '../core.js';

export const WORKFLOW_ACTION_SUFFIX = 'run' as const;

export function getWorkflowActionId(skillName: string): string {
  return `${skillName}.${WORKFLOW_ACTION_SUFFIX}`;
}

export const workflowSkillInputSchema = z.object({
  prompt: z.string().trim().min(1),
  args: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const workflowSkillOutputSchema = z.object({
  ok: z.boolean(),
  status: z.enum(['queued', 'completed', 'failed']),
  message: z.string(),
  executedSkill: z.string(),
  artifacts: z.array(z.string()).optional(),
  data: z.unknown().optional(),
});

export function createWorkflowSkillContract(skillName: string) {
  return createSkillActionContract({
    skillId: skillName,
    actionId: getWorkflowActionId(skillName),
    description: `Execute workflow skill: ${skillName}`,
    inputSchema: workflowSkillInputSchema,
    outputSchema: workflowSkillOutputSchema,
  });
}

export type WorkflowSkillInput = z.infer<typeof workflowSkillInputSchema>;
export type WorkflowSkillOutput = z.infer<typeof workflowSkillOutputSchema>;