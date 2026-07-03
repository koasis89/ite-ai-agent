import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogManifest } from '../../catalog/schema.js';
import { dispatchSkillAction } from '../executor/dispatch.js';
import { buildExecutionPlanningRegistry } from '../executor/catalog-loader.js';
import { getWorkflowActionId } from '../contracts/actions/workflow.js';

function buildManifestFixture(): CatalogManifest {
  return {
    schemaVersion: 1,
    catalogVersion: 'fixture',
    skills: [
      { name: 'autopilot', category: 'execution', status: 'active' },
      { name: 'plan', category: 'planning', status: 'active' },
      { name: 'ralplan', category: 'planning', status: 'active', canonical: 'plan' },
      { name: 'ecomode', category: 'execution', status: 'deprecated' },
      { name: 'doctor', category: 'utility', status: 'active' },
    ],
    agents: [],
  };
}

describe('execution/planning catalog loader', () => {
  it('registers execution and planning contracts from catalog', () => {
    const registry = buildExecutionPlanningRegistry({
      manifest: buildManifestFixture(),
    });

    assert.equal(registry.has(getWorkflowActionId('autopilot')), true);
    assert.equal(registry.has(getWorkflowActionId('plan')), true);
    assert.equal(registry.has(getWorkflowActionId('doctor')), false);
  });

  it('routes canonical skill aliases through alias action IDs', async () => {
    const registry = buildExecutionPlanningRegistry({
      manifest: buildManifestFixture(),
      handlers: {
        plan: async (input) => ({
          ok: true,
          status: 'completed',
          message: `planned: ${input.prompt}`,
          executedSkill: 'plan',
        }),
      },
    });

    const result = await dispatchSkillAction(
      registry,
      getWorkflowActionId('ralplan'),
      { prompt: 'design migration steps' },
      { requestId: 'req-m3-1', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal((result.data as { executedSkill: string }).executedSkill, 'plan');
    assert.equal(result.meta?.resolvedActionId, getWorkflowActionId('plan'));
    assert.equal(result.meta?.redirected, true);
  });

  it('keeps deprecated execution/planning skills registered but policy-blocked by default', async () => {
    const registry = buildExecutionPlanningRegistry({
      manifest: buildManifestFixture(),
    });

    const result = await dispatchSkillAction(
      registry,
      getWorkflowActionId('ecomode'),
      { prompt: 'run eco mode' },
      { requestId: 'req-m3-2', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'SKILL_NOT_EXECUTABLE');
  });
});