import type { CatalogSkillEntry } from '../../catalog/schema.js';
import PizZip from 'pizzip';
import {
  DOCX_CONVERT_ACTION_ID,
  docxConvertContract,
  type DocxConvertInput,
  type DocxConvertOutput,
} from '../contracts/actions/docx.js';
import type { SkillExecutionContext } from '../contracts/core.js';
import type { SkillExecutor, SkillRegistryEntry } from './types.js';

export interface DocxWriteResult {
  filePath: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface DocxExecutorAdapter {
  askSavePath(defaultFileName: string): Promise<string | null>;
  writeWithPermissionFallback(initialPath: string, buffer: Buffer): Promise<DocxWriteResult>;
}

const DOCX_SKILL_ENTRY: CatalogSkillEntry = {
  name: 'docx',
  category: 'utility',
  status: 'active',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphXml(text: string, options?: { bold?: boolean; sizeHalfPt?: number }): string {
  const safeText = escapeXml(text || '');
  const runProps = [
    options?.bold ? '<w:b/>' : '',
    options?.sizeHalfPt
      ? `<w:sz w:val="${options.sizeHalfPt}"/><w:szCs w:val="${options.sizeHalfPt}"/>`
      : '',
  ].join('');

  if (!safeText) return '<w:p/>';

  return [
    '<w:p>',
    '<w:r>',
    runProps ? `<w:rPr>${runProps}</w:rPr>` : '',
    `<w:t xml:space="preserve">${safeText}</w:t>`,
    '</w:r>',
    '</w:p>',
  ].join('');
}

export function markdownToDocxBuffer(markdown: string): Buffer {
  const lines = markdown.split(/\r?\n/);
  const bodyParts: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();

    if (!t) {
      bodyParts.push(paragraphXml(''));
      continue;
    }

    if (t.startsWith('### ')) {
      bodyParts.push(paragraphXml(t.slice(4), { bold: true, sizeHalfPt: 24 }));
      continue;
    }

    if (t.startsWith('## ')) {
      bodyParts.push(paragraphXml(t.slice(3), { bold: true, sizeHalfPt: 28 }));
      continue;
    }

    if (t.startsWith('# ')) {
      bodyParts.push(paragraphXml(t.slice(2), { bold: true, sizeHalfPt: 32 }));
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      bodyParts.push(paragraphXml(`• ${t.replace(/^[-*]\s+/, '')}`));
      continue;
    }

    bodyParts.push(paragraphXml(t));
  }

  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 w16se wp14">',
    '<w:body>',
    ...bodyParts,
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>',
    '</w:body>',
    '</w:document>',
  ].join('');

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '</Types>',
  ].join('');

  const rootRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    '</Relationships>',
  ].join('');

  const zip = new PizZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels')?.file('.rels', rootRelsXml);
  zip.folder('word')?.file('document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

function toRequestIdLabel(context: SkillExecutionContext): string {
  return context.requestId || DOCX_CONVERT_ACTION_ID;
}

export function createDocxConvertExecutor(adapter: DocxExecutorAdapter): SkillExecutor<typeof docxConvertContract> {
  return {
    contract: docxConvertContract,
    async execute(input: DocxConvertInput, context: SkillExecutionContext): Promise<DocxConvertOutput> {
      const defaultName = input.defaultFileName ?? `markdown-${new Date().toISOString().slice(0, 10)}`;
      const savePath = await adapter.askSavePath(defaultName);

      if (!savePath) {
        return {
          ok: false,
          cancelled: true,
          error: '사용자가 저장을 취소했습니다.',
        };
      }

      try {
        const buffer = markdownToDocxBuffer(input.markdown);
        const writeResult = await adapter.writeWithPermissionFallback(savePath, buffer);
        return {
          ok: true,
          filePath: writeResult.filePath,
          fallbackUsed: writeResult.fallbackUsed,
          fallbackReason: writeResult.fallbackReason,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          error: `[${toRequestIdLabel(context)}] MD to DOCX conversion failed: ${message}`,
        };
      }
    },
  };
}

export function createDocxSkillRegistryEntry(
  adapter: DocxExecutorAdapter,
): SkillRegistryEntry<typeof docxConvertContract> {
  return {
    skill: DOCX_SKILL_ENTRY,
    executor: createDocxConvertExecutor(adapter),
  };
}