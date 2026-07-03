import { ZodError } from 'zod';
import type { SkillErrorCode, SkillErrorEnvelope } from './codes.js';

export interface CreateSkillErrorEnvelopeOptions {
  code: SkillErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
}

export class SkillContractValidationError extends Error {
  constructor(public readonly envelope: SkillErrorEnvelope) {
    super(envelope.message);
    this.name = 'SkillContractValidationError';
  }
}

export function createSkillErrorEnvelope(
  options: CreateSkillErrorEnvelopeOptions,
): SkillErrorEnvelope {
  return {
    code: options.code,
    message: options.message,
    details: options.details,
    recoverable: options.recoverable ?? options.code !== 'EXECUTION_FAILED',
  };
}

export function mapUnknownSkillError(error: unknown): SkillErrorEnvelope {
  if (error instanceof SkillContractValidationError) {
    return error.envelope;
  }

  if (error instanceof ZodError) {
    return createSkillErrorEnvelope({
      code: 'INPUT_INVALID',
      message: 'Skill contract validation failed',
      details: {
        issues: error.issues,
      },
    });
  }

  if (error instanceof Error) {
    return createSkillErrorEnvelope({
      code: 'EXECUTION_FAILED',
      message: error.message,
      details: {
        name: error.name,
      },
      recoverable: false,
    });
  }

  return createSkillErrorEnvelope({
    code: 'EXECUTION_FAILED',
    message: 'Unknown skill execution failure',
    details: {
      error,
    },
    recoverable: false,
  });
}