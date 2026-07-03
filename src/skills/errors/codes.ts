export const SKILL_ERROR_CODES = [
  'INPUT_INVALID',
  'OUTPUT_INVALID',
  'SKILL_NOT_EXECUTABLE',
  'CONTRACT_NOT_FOUND',
  'EXECUTION_FAILED',
  'TIMEOUT',
  'DEPENDENCY_MISSING',
] as const;

export type SkillErrorCode = (typeof SKILL_ERROR_CODES)[number];

export function isSkillErrorCode(value: unknown): value is SkillErrorCode {
  return typeof value === 'string' && SKILL_ERROR_CODES.includes(value as SkillErrorCode);
}

export interface SkillErrorEnvelope {
  code: SkillErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
}