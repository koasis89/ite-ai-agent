import { z } from 'zod';
import { createSkillActionContract } from '../core.js';

export const DOCX_CONVERT_ACTION_ID = 'docx.convert-markdown' as const;
export const DOCX_SKILL_ID = 'docx' as const;

export const docxConvertInputSchema = z.object({
  markdown: z.string().trim().min(1),
  defaultFileName: z.string().trim().min(1).optional(),
});

const docxConvertSuccessSchema = z.object({
  ok: z.literal(true),
  filePath: z.string().min(1),
  fallbackUsed: z.boolean().optional(),
  fallbackReason: z.string().optional(),
  cancelled: z.boolean().optional(),
  error: z.string().optional(),
});

const docxConvertCancelledSchema = z.object({
  ok: z.literal(false),
  cancelled: z.literal(true),
  error: z.string().optional(),
  filePath: z.undefined().optional(),
  fallbackUsed: z.undefined().optional(),
  fallbackReason: z.undefined().optional(),
});

const docxConvertFailureSchema = z.object({
  ok: z.literal(false),
  cancelled: z.boolean().optional(),
  error: z.string().min(1),
  filePath: z.undefined().optional(),
  fallbackUsed: z.undefined().optional(),
  fallbackReason: z.undefined().optional(),
});

export const docxConvertOutputSchema = z.union([
  docxConvertSuccessSchema,
  docxConvertCancelledSchema,
  docxConvertFailureSchema,
]);

export const docxConvertContract = createSkillActionContract({
  skillId: DOCX_SKILL_ID,
  actionId: DOCX_CONVERT_ACTION_ID,
  description: 'Convert markdown content into a DOCX file.',
  inputSchema: docxConvertInputSchema,
  outputSchema: docxConvertOutputSchema,
});

export type DocxConvertInput = z.infer<typeof docxConvertInputSchema>;
export type DocxConvertOutput = z.infer<typeof docxConvertOutputSchema>;