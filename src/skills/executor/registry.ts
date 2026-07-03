import type { SkillRegistry, SkillRegistryEntry } from './types.js';

export class InMemorySkillRegistry implements SkillRegistry {
  private readonly entries = new Map<string, SkillRegistryEntry>();

  register(entry: SkillRegistryEntry): void {
    this.entries.set(entry.executor.contract.actionId, entry);
  }

  get(actionId: string): SkillRegistryEntry | undefined {
    return this.entries.get(actionId);
  }

  has(actionId: string): boolean {
    return this.entries.has(actionId);
  }

  list(): SkillRegistryEntry[] {
    return Array.from(this.entries.values());
  }
}