import type { CatalogEntryStatus, CatalogSkillEntry } from '../../catalog/schema.js';

export const EXECUTABLE_SKILL_STATUSES = ['active', 'alias', 'merged'] as const satisfies readonly CatalogEntryStatus[];
const EXECUTABLE_SKILL_STATUS_SET = new Set<CatalogEntryStatus>(EXECUTABLE_SKILL_STATUSES);

export type SkillExecutionBlockReason =
  | 'deprecated_skill'
  | 'internal_skill'
  | 'missing_canonical'
  | 'unsupported_status';

export interface SkillExecutionPolicyOptions {
  allowDeprecated?: boolean;
  allowInternal?: boolean;
}

export interface SkillExecutionPolicyDecision {
  executable: boolean;
  resolvedSkillName: string;
  requestedSkillName: string;
  status: CatalogEntryStatus;
  redirected: boolean;
  warnings: string[];
  reason?: SkillExecutionBlockReason;
}

export function evaluateSkillExecutionPolicy(
  skill: CatalogSkillEntry,
  options: SkillExecutionPolicyOptions = {},
): SkillExecutionPolicyDecision {
  switch (skill.status) {
    case 'active':
      return {
        executable: true,
        resolvedSkillName: skill.name,
        requestedSkillName: skill.name,
        status: skill.status,
        redirected: false,
        warnings: [],
      };
    case 'alias':
    case 'merged':
      if (!skill.canonical) {
        return {
          executable: false,
          resolvedSkillName: skill.name,
          requestedSkillName: skill.name,
          status: skill.status,
          redirected: false,
          warnings: [],
          reason: 'missing_canonical',
        };
      }
      return {
        executable: true,
        resolvedSkillName: skill.canonical,
        requestedSkillName: skill.name,
        status: skill.status,
        redirected: true,
        warnings: [`${skill.status}_redirect`],
      };
    case 'deprecated':
      return {
        executable: options.allowDeprecated === true,
        resolvedSkillName: skill.name,
        requestedSkillName: skill.name,
        status: skill.status,
        redirected: false,
        warnings: ['deprecated_skill'],
        reason: options.allowDeprecated === true ? undefined : 'deprecated_skill',
      };
    case 'internal':
      return {
        executable: options.allowInternal === true,
        resolvedSkillName: skill.name,
        requestedSkillName: skill.name,
        status: skill.status,
        redirected: false,
        warnings: ['internal_skill'],
        reason: options.allowInternal === true ? undefined : 'internal_skill',
      };
    default:
      return {
        executable: false,
        resolvedSkillName: skill.name,
        requestedSkillName: skill.name,
        status: skill.status,
        redirected: false,
        warnings: [],
        reason: 'unsupported_status',
      };
  }
}

export function isExecutableSkillStatus(status: CatalogEntryStatus): boolean {
  return EXECUTABLE_SKILL_STATUS_SET.has(status);
}