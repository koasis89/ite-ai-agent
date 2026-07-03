import { z } from 'zod';
import { createSkillActionContract } from '../core.js';

export const EXCEL_TEMPLATE_EXPORT_ACTION_ID = 'excel.export-template' as const;
export const WORD_TEMPLATE_EXPORT_ACTION_ID = 'word.export-template' as const;

export const EXCEL_SKILL_ID = 'excel' as const;
export const WORD_SKILL_ID = 'word' as const;

const officeExportBaseInputSchema = z.object({
  rawContent: z.string().trim().min(1),
  savePath: z.string().trim().min(1),
  templateName: z.string().trim().min(1).optional(),
});

const officeExportSuccessSchema = z.object({
  ok: z.literal(true),
  filePath: z.string().trim().min(1),
  fallbackUsed: z.boolean().optional(),
  fallbackReason: z.string().optional(),
  cancelled: z.boolean().optional(),
  error: z.string().optional(),
});

const officeExportCancelledSchema = z.object({
  ok: z.literal(false),
  cancelled: z.literal(true),
  error: z.string().optional(),
  filePath: z.undefined().optional(),
  fallbackUsed: z.undefined().optional(),
  fallbackReason: z.undefined().optional(),
});

const officeExportFailureSchema = z.object({
  ok: z.literal(false),
  cancelled: z.boolean().optional(),
  error: z.string().trim().min(1),
  filePath: z.undefined().optional(),
  fallbackUsed: z.undefined().optional(),
  fallbackReason: z.undefined().optional(),
});

export const officeExportOutputSchema = z.union([
  officeExportSuccessSchema,
  officeExportCancelledSchema,
  officeExportFailureSchema,
]);

export const excelTemplateExportInputSchema = officeExportBaseInputSchema;
export const wordTemplateExportInputSchema = officeExportBaseInputSchema;

export const excelTemplateExportContract = createSkillActionContract({
  skillId: EXCEL_SKILL_ID,
  actionId: EXCEL_TEMPLATE_EXPORT_ACTION_ID,
  description: 'Export AI response into Excel template with field mapping.',
  inputSchema: excelTemplateExportInputSchema,
  outputSchema: officeExportOutputSchema,
});

export const wordTemplateExportContract = createSkillActionContract({
  skillId: WORD_SKILL_ID,
  actionId: WORD_TEMPLATE_EXPORT_ACTION_ID,
  description: 'Export AI response into Word template with field mapping.',
  inputSchema: wordTemplateExportInputSchema,
  outputSchema: officeExportOutputSchema,
});

export type ExcelTemplateExportInput = z.infer<typeof excelTemplateExportInputSchema>;
export type WordTemplateExportInput = z.infer<typeof wordTemplateExportInputSchema>;
export type OfficeTemplateExportOutput = z.infer<typeof officeExportOutputSchema>;
