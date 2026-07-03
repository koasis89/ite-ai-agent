import type { CatalogManifest, CatalogSkillEntry } from '../../catalog/schema.js';
import { readCatalogManifest } from '../../catalog/reader.js';
import { getWorkflowActionId } from '../contracts/actions/workflow.js';
import { InMemorySkillRegistry } from './registry.js';
import {
  createWorkflowSkillRegistryEntry,
  type WorkflowSkillHandler,
} from './workflow-executor.js';

export interface BuildExecutionPlanningRegistryOptions {
  manifest?: CatalogManifest;
  handlers?: Partial<Record<string, WorkflowSkillHandler>>;
}

function isExecutionPlanningSkill(skill: CatalogSkillEntry): boolean {
  return skill.category === 'execution' || skill.category === 'planning';
}

function normalizeCanonicalName(skill: CatalogSkillEntry): string {
  if (!skill.canonical || skill.canonical.trim() === '') {
    return skill.name;
  }

  return skill.canonical;
}

export function buildExecutionPlanningRegistry(
  options: BuildExecutionPlanningRegistryOptions = {},
): InMemorySkillRegistry {
  const manifest = options.manifest ?? readCatalogManifest();
  const handlers = options.handlers ?? {};
  const registry = new InMemorySkillRegistry();

  const skills = manifest.skills.filter(isExecutionPlanningSkill);
  const byName = new Map(skills.map((skill) => [skill.name, skill]));

  // First pass: register canonical/primary executors.
  for (const skill of skills) {
    const canonicalName = normalizeCanonicalName(skill);
    if (canonicalName !== skill.name) {
      continue;
    }

    const handler = handlers[skill.name];
    registry.register(createWorkflowSkillRegistryEntry(skill, handler));
  }

  // Second pass: register aliases/merged/canonical redirects.
  for (const skill of skills) {
    const canonicalName = normalizeCanonicalName(skill);
    if (canonicalName === skill.name) {
      continue;
    }

    const canonicalSkill = byName.get(canonicalName);
    if (!canonicalSkill) {
      // Fallback: if catalog canonical target is missing, keep this skill executable.
      const fallbackHandler = handlers[skill.name];
      registry.register(createWorkflowSkillRegistryEntry(skill, fallbackHandler));
      continue;
    }

    registry.registerAlias(
      getWorkflowActionId(skill.name),
      getWorkflowActionId(canonicalSkill.name),
    );
  }

  return registry;
}