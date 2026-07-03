import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSkillActionInput, validateSkillActionOutput } from '../contracts/core.js';
import {
  EXCEL_TEMPLATE_EXPORT_ACTION_ID,
  WORD_TEMPLATE_EXPORT_ACTION_ID,
  excelTemplateExportContract,
  wordTemplateExportContract,
} from '../contracts/actions/office-export.js';
import { SkillContractValidationError } from '../errors/mappers.js';

describe('office export contracts', () => {
  it('defines excel/word export action ids and skill ids', () => {
    assert.equal(excelTemplateExportContract.actionId, EXCEL_TEMPLATE_EXPORT_ACTION_ID);
    assert.equal(excelTemplateExportContract.skillId, 'excel');
    assert.equal(wordTemplateExportContract.actionId, WORD_TEMPLATE_EXPORT_ACTION_ID);
    assert.equal(wordTemplateExportContract.skillId, 'word');
  });

  it('validates excel input payload', () => {
    const parsed = validateSkillActionInput(excelTemplateExportContract, {
      rawContent: '# Report\n\ncontent',
      savePath: 'C:/tmp/out.xlsx',
      templateName: 'WBS-Template_표준양식.xlsx',
    });

    assert.equal(parsed.savePath, 'C:/tmp/out.xlsx');
    assert.equal(parsed.templateName, 'WBS-Template_표준양식.xlsx');
  });

  it('rejects invalid word input payload', () => {
    assert.throws(
      () => validateSkillActionInput(wordTemplateExportContract, {
        rawContent: 'valid',
        savePath: '',
      }),
      (error: unknown) => {
        assert.ok(error instanceof SkillContractValidationError);
        assert.equal(error.envelope.code, 'INPUT_INVALID');
        return true;
      },
    );
  });

  it('accepts success and failure output envelopes', () => {
    const success = validateSkillActionOutput(excelTemplateExportContract, {
      ok: true,
      filePath: 'C:/tmp/out.xlsx',
      fallbackUsed: false,
    });

    const failure = validateSkillActionOutput(wordTemplateExportContract, {
      ok: false,
      error: 'render failed',
    });

    assert.equal(success.ok, true);
    assert.equal(failure.ok, false);
  });
});
