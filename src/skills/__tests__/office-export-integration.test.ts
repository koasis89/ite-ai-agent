import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchSkillAction } from '../executor/dispatch.js';
import { InMemorySkillRegistry } from '../executor/registry.js';
import {
  EXCEL_TEMPLATE_EXPORT_ACTION_ID,
  excelTemplateExportContract,
} from '../contracts/actions/office-export.js';

function readFirstTableRow(markdown: string): { task: string; owner: string; effort: string } {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const dataRow = lines.find((line) => line.startsWith('|') && line.includes('Export 품질 검증'));
  if (!dataRow) {
    return { task: 'unknown', owner: 'unknown', effort: '0' };
  }

  const cells = dataRow
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

  return {
    task: cells[0] || 'unknown',
    owner: cells[1] || 'unknown',
    effort: cells[2] || '0',
  };
}

describe('office export integration', () => {
  it('maps markdown table fields and passes through office export action path', async () => {
    const registry = new InMemorySkillRegistry();

    registry.register({
      skill: { name: 'excel', category: 'utility', status: 'active' },
      executor: {
        contract: excelTemplateExportContract,
        async execute(input: any) {
          const first = readFirstTableRow(input.rawContent);

          return {
            ok: true,
            filePath: `${input.savePath}#${first.task}-${first.owner}-${first.effort}`,
          };
        },
      },
    });

    const markdown = [
      '| 업무 | 담당자 | 공수 |',
      '| --- | --- | ---: |',
      '| Export 품질 검증 | Alice | 3 |',
    ].join('\n');

    const result = await dispatchSkillAction(
      registry,
      EXCEL_TEMPLATE_EXPORT_ACTION_ID,
      {
        rawContent: markdown,
        savePath: 'C:/tmp/integration.xlsx',
        templateName: 'WBS-Template_표준양식.xlsx',
      },
      { requestId: 'req-office-integration-1', workspaceRoot: process.cwd(), actor: 'integration-test' },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    const output = result.data as { filePath: string };
    assert.match(output.filePath, /integration\.xlsx#Export 품질 검증-Alice-3/);
  });
});
