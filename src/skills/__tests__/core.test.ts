import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import {
  createSkillActionContract,
  validateSkillActionInput,
  validateSkillActionOutput,
} from '../contracts/core.js';
import { SkillContractValidationError, mapUnknownSkillError } from '../errors/mappers.js';

describe('skill contract core', () => {
  it('parses valid input with schema transforms', () => {
    const contract = createSkillActionContract({
      skillId: 'docx',
      actionId: 'docx.convert',
      inputSchema: z.object({
        markdown: z.string().min(1),
        priority: z.coerce.number().int().min(1),
      }),
      outputSchema: z.object({
        filePath: z.string(),
      }),
    });

    const input = validateSkillActionInput(contract, {
      markdown: '# hello',
      priority: '2',
    });

    assert.equal(input.priority, 2);
  });

  it('throws input validation envelope for invalid payloads', () => {
    const contract = createSkillActionContract({
      skillId: 'docx',
      actionId: 'docx.convert',
      inputSchema: z.object({
        markdown: z.string().min(1),
      }),
      outputSchema: z.object({
        filePath: z.string(),
      }),
    });

    assert.throws(
      () => validateSkillActionInput(contract, { markdown: '' }),
      (error: unknown) => {
        assert.ok(error instanceof SkillContractValidationError);
        assert.equal(error.envelope.code, 'INPUT_INVALID');
        assert.equal(error.envelope.recoverable, true);
        return true;
      },
    );
  });

  it('throws output validation envelope for invalid executor results', () => {
    const contract = createSkillActionContract({
      skillId: 'docx',
      actionId: 'docx.convert',
      inputSchema: z.object({
        markdown: z.string(),
      }),
      outputSchema: z.object({
        filePath: z.string(),
      }),
    });

    assert.throws(
      () => validateSkillActionOutput(contract, { filePath: 42 }),
      (error: unknown) => {
        assert.ok(error instanceof SkillContractValidationError);
        assert.equal(error.envelope.code, 'OUTPUT_INVALID');
        return true;
      },
    );
  });

  it('maps unexpected errors to standard execution envelopes', () => {
    const envelope = mapUnknownSkillError(new Error('boom'));
    assert.equal(envelope.code, 'EXECUTION_FAILED');
    assert.equal(envelope.recoverable, false);
    assert.equal(envelope.message, 'boom');
  });
});