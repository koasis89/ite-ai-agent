import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createSkillActionContract } from '../contracts/core.js';
import { dispatchSkillAction } from '../executor/dispatch.js';
import { InMemorySkillRegistry } from '../executor/registry.js';
import type { SkillRegistryEntry } from '../executor/types.js';

describe('skill dispatcher', () => {
  it('returns CONTRACT_NOT_FOUND for unknown action ids', async () => {
    const registry = new InMemorySkillRegistry();
    const result = await dispatchSkillAction(
      registry,
      'unknown.action',
      {},
      { requestId: 'req-1', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'CONTRACT_NOT_FOUND');
  });

  it('dispatches a registered action with contract validation', async () => {
    const contract = createSkillActionContract({
      skillId: 'demo',
      actionId: 'demo.echo',
      inputSchema: z.object({ value: z.string().min(1) }),
      outputSchema: z.object({ echoed: z.string() }),
    });

    const registry = new InMemorySkillRegistry();
    const entry: SkillRegistryEntry = {
      skill: {
        name: 'demo',
        category: 'utility',
        status: 'active',
      },
      executor: {
        contract,
        execute(input: any) {
          return { echoed: input.value };
        },
      },
    };
    registry.register(entry);

    const result = await dispatchSkillAction(
      registry,
      'demo.echo',
      { value: 'hello' },
      { requestId: 'req-2', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data, { echoed: 'hello' });
    }
  });

  it('returns INPUT_INVALID when payload fails input schema validation', async () => {
    const contract = createSkillActionContract({
      skillId: 'demo',
      actionId: 'demo.echo',
      inputSchema: z.object({ value: z.string().min(1) }),
      outputSchema: z.object({ echoed: z.string() }),
    });

    const registry = new InMemorySkillRegistry();
    registry.register({
      skill: {
        name: 'demo',
        category: 'utility',
        status: 'active',
      },
      executor: {
        contract,
        execute() {
          return { echoed: 'unused' };
        },
      },
    });

    const result = await dispatchSkillAction(
      registry,
      'demo.echo',
      { value: '' },
      { requestId: 'req-3', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INPUT_INVALID');
  });
});