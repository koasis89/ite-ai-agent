import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchSkillAction } from '../executor/dispatch.js';
import { InMemorySkillRegistry } from '../executor/registry.js';
import {
  EXCEL_TEMPLATE_EXPORT_ACTION_ID,
  WORD_TEMPLATE_EXPORT_ACTION_ID,
  excelTemplateExportContract,
  wordTemplateExportContract,
} from '../contracts/actions/office-export.js';

describe('office export dispatch', () => {
  it('dispatches excel export action with validated payload', async () => {
    const registry = new InMemorySkillRegistry();
    registry.register({
      skill: { name: 'excel', category: 'utility', status: 'active' },
      executor: {
        contract: excelTemplateExportContract,
        async execute(input: any) {
          return {
            ok: true,
            filePath: input.savePath,
            fallbackUsed: false,
          };
        },
      },
    });

    const result = await dispatchSkillAction(
      registry,
      EXCEL_TEMPLATE_EXPORT_ACTION_ID,
      {
        rawContent: 'sample',
        savePath: 'C:/tmp/export.xlsx',
      },
      { requestId: 'req-office-dispatch-1', workspaceRoot: process.cwd(), actor: 'test' },
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal((result.data as { filePath: string }).filePath, 'C:/tmp/export.xlsx');
    }
  });

  it('returns INPUT_INVALID when required fields are missing', async () => {
    const registry = new InMemorySkillRegistry();
    registry.register({
      skill: { name: 'word', category: 'utility', status: 'active' },
      executor: {
        contract: wordTemplateExportContract,
        async execute(_input: any) {
          return {
            ok: true,
            filePath: 'C:/tmp/export.docx',
          };
        },
      },
    });

    const result = await dispatchSkillAction(
      registry,
      WORD_TEMPLATE_EXPORT_ACTION_ID,
      {
        rawContent: 'only-content-without-save-path',
      },
      { requestId: 'req-office-dispatch-2', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INPUT_INVALID');
  });

  it('returns OUTPUT_INVALID when executor returns non-contract output', async () => {
    const registry = new InMemorySkillRegistry();
    registry.register({
      skill: { name: 'word', category: 'utility', status: 'active' },
      executor: {
        contract: wordTemplateExportContract,
        async execute(_input: any) {
          return {
            done: true,
          } as unknown as Awaited<ReturnType<typeof wordTemplateExportContract.outputSchema.parse>>;
        },
      },
    });

    const result = await dispatchSkillAction(
      registry,
      WORD_TEMPLATE_EXPORT_ACTION_ID,
      {
        rawContent: 'content',
        savePath: 'C:/tmp/out.docx',
      },
      { requestId: 'req-office-dispatch-3', workspaceRoot: process.cwd() },
    );

    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'OUTPUT_INVALID');
  });
});
