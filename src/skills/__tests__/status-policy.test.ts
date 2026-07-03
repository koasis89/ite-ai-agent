import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogSkillEntry } from '../../catalog/schema.js';
import { evaluateSkillExecutionPolicy, isExecutableSkillStatus } from '../policy/status-policy.js';

function makeSkill(overrides: Partial<CatalogSkillEntry>): CatalogSkillEntry {
  return {
    name: 'sample-skill',
    category: 'utility',
    status: 'active',
    ...overrides,
  };
}

describe('skill status policy', () => {
  it('allows active skills', () => {
    const decision = evaluateSkillExecutionPolicy(makeSkill({ status: 'active' }));
    assert.equal(decision.executable, true);
    assert.equal(decision.resolvedSkillName, 'sample-skill');
    assert.equal(decision.redirected, false);
  });

  it('redirects alias skills to canonical names', () => {
    const decision = evaluateSkillExecutionPolicy(
      makeSkill({ status: 'alias', canonical: 'real-skill' }),
    );
    assert.equal(decision.executable, true);
    assert.equal(decision.resolvedSkillName, 'real-skill');
    assert.equal(decision.redirected, true);
  });

  it('redirects merged skills to canonical names', () => {
    const decision = evaluateSkillExecutionPolicy(
      makeSkill({ status: 'merged', canonical: 'real-skill' }),
    );
    assert.equal(decision.executable, true);
    assert.equal(decision.resolvedSkillName, 'real-skill');
    assert.deepEqual(decision.warnings, ['merged_redirect']);
  });

  it('blocks deprecated skills unless explicitly allowed', () => {
    const blocked = evaluateSkillExecutionPolicy(makeSkill({ status: 'deprecated' }));
    assert.equal(blocked.executable, false);
    assert.equal(blocked.reason, 'deprecated_skill');

    const allowed = evaluateSkillExecutionPolicy(
      makeSkill({ status: 'deprecated' }),
      { allowDeprecated: true },
    );
    assert.equal(allowed.executable, true);
    assert.deepEqual(allowed.warnings, ['deprecated_skill']);
  });

  it('blocks internal skills unless explicitly allowed', () => {
    const blocked = evaluateSkillExecutionPolicy(makeSkill({ status: 'internal' }));
    assert.equal(blocked.executable, false);
    assert.equal(blocked.reason, 'internal_skill');

    const allowed = evaluateSkillExecutionPolicy(
      makeSkill({ status: 'internal' }),
      { allowInternal: true },
    );
    assert.equal(allowed.executable, true);
    assert.deepEqual(allowed.warnings, ['internal_skill']);
  });

  it('treats active, alias, and merged as executable statuses', () => {
    assert.equal(isExecutableSkillStatus('active'), true);
    assert.equal(isExecutableSkillStatus('alias'), true);
    assert.equal(isExecutableSkillStatus('merged'), true);
    assert.equal(isExecutableSkillStatus('deprecated'), false);
    assert.equal(isExecutableSkillStatus('internal'), false);
  });
});