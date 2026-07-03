import type { SkillRegistry, SkillRegistryEntry } from './types.js';

export class InMemorySkillRegistry implements SkillRegistry {
  private readonly entries = new Map<string, SkillRegistryEntry>();
  private readonly aliases = new Map<string, string>();

  register(entry: SkillRegistryEntry): void {
    this.entries.set(entry.executor.contract.actionId, entry);
  }

  registerAlias(aliasActionId: string, canonicalActionId: string): void {
    this.aliases.set(aliasActionId, canonicalActionId);
  }

  resolveActionId(actionId: string): string | undefined {
    if (this.entries.has(actionId)) {
      return actionId;
    }

    return this.aliases.get(actionId);
  }

  get(actionId: string): SkillRegistryEntry | undefined {
    return this.entries.get(actionId);
  }

  has(actionId: string): boolean {
    return this.entries.has(actionId) || this.aliases.has(actionId);
  }

  list(): SkillRegistryEntry[] {
    return Array.from(this.entries.values());
  }
}