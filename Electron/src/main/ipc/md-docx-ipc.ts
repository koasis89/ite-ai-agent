import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";

export const CONVERT_MD_TO_DOCX_CHANNEL = "omx:convert-md-to-docx" as const;

interface ConvertMdToDocxRequest {
  markdown: string;
  defaultFileName?: string;
}

interface ConvertMdToDocxResult {
  ok: boolean;
  filePath?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  cancelled?: boolean;
  error?: string;
}

const DOCX_FILE_FILTER: Electron.FileFilter[] = [
  { name: "Word 문서", extensions: ["docx"] },
];

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "markdown-export";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphXml(text: string, options?: { bold?: boolean; sizeHalfPt?: number }): string {
  const safeText = escapeXml(text || "");
  const runProps = [
    options?.bold ? "<w:b/>" : "",
    options?.sizeHalfPt ? `<w:sz w:val=\"${options.sizeHalfPt}\"/><w:szCs w:val=\"${options.sizeHalfPt}\"/>` : "",
  ].join("");

  if (!safeText) return "<w:p/>";

  return [
    "<w:p>",
    "<w:r>",
    runProps ? `<w:rPr>${runProps}</w:rPr>` : "",
    `<w:t xml:space=\"preserve\">${safeText}</w:t>`,
    "</w:r>",
    "</w:p>",
  ].join("");
}

function markdownToDocxBuffer(markdown: string): Buffer {
  const lines = markdown.split(/\r?\n/);
  const bodyParts: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const t = line.trim();

    if (!t) {
      bodyParts.push(paragraphXml(""));
      continue;
    }

    if (t.startsWith("### ")) {
      bodyParts.push(paragraphXml(t.slice(4), { bold: true, sizeHalfPt: 24 }));
      continue;
    }

    if (t.startsWith("## ")) {
      bodyParts.push(paragraphXml(t.slice(3), { bold: true, sizeHalfPt: 28 }));
      continue;
    }

    if (t.startsWith("# ")) {
      bodyParts.push(paragraphXml(t.slice(2), { bold: true, sizeHalfPt: 32 }));
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      bodyParts.push(paragraphXml(`• ${t.replace(/^[-*]\s+/, "")}`));
      continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      bodyParts.push(paragraphXml(t));
      continue;
    }

    bodyParts.push(paragraphXml(t));
  }

  const documentXml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<w:document xmlns:wpc=\"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas\" xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:m=\"http://schemas.openxmlformats.org/officeDocument/2006/math\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:wp14=\"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" xmlns:w10=\"urn:schemas-microsoft-com:office:word\" xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" xmlns:w15=\"http://schemas.microsoft.com/office/word/2012/wordml\" xmlns:w16se=\"http://schemas.microsoft.com/office/word/2015/wordml/symex\" xmlns:wpg=\"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup\" xmlns:wpi=\"http://schemas.microsoft.com/office/word/2010/wordprocessingInk\" xmlns:wne=\"http://schemas.microsoft.com/office/word/2006/wordml\" xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\" mc:Ignorable=\"w14 w15 w16se wp14\">",
    "<w:body>",
    ...bodyParts,
    "<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/></w:sectPr>",
    "</w:body>",
    "</w:document>",
  ].join("");

  const contentTypesXml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">",
    "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>",
    "<Default Extension=\"xml\" ContentType=\"application/xml\"/>",
    "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>",
    "</Types>",
  ].join("");

  const rootRelsXml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
    "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
    "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>",
    "</Relationships>",
  ].join("");

  const zip = new PizZip();
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.folder("_rels")?.file(".rels", rootRelsXml);
  zip.folder("word")?.file("document.xml", documentXml);

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as { code?: string; message?: string };
  const code = (maybeErr.code || "").toUpperCase();
  const message = (maybeErr.message || "").toLowerCase();
  return (
    code === "EACCES" ||
    code === "EPERM" ||
    message.includes("permission denied") ||
    message.includes("access is denied") ||
    message.includes("액세스가 거부")
  );
}

async function buildFallbackPath(originalPath: string): Promise<string> {
  const docsDir = app.getPath("documents");
  const exportDir = path.join(docsDir, "OMX-Exports");
  await mkdir(exportDir, { recursive: true });
  const parsed = path.parse(originalPath);
  return path.join(exportDir, `${parsed.name}-${Date.now()}${parsed.ext}`);
}

async function writeWithPermissionFallback(
  initialPath: string,
  buffer: Buffer,
): Promise<{ filePath: string; fallbackUsed: boolean; fallbackReason?: string }> {
  try {
    await writeFile(initialPath, buffer);
    return { filePath: initialPath, fallbackUsed: false };
  } catch (err) {
    if (!isPermissionError(err)) throw err;

    const fallbackPath = await buildFallbackPath(initialPath);
    await writeFile(fallbackPath, buffer);
    return {
      filePath: fallbackPath,
      fallbackUsed: true,
      fallbackReason:
        "원래 경로에 쓰기 권한이 없어 문서 폴더(OMX-Exports)로 저장했습니다.",
    };
  }
}

async function askSavePath(defaultFileName: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const base = sanitizeFileName(defaultFileName).replace(/\.docx$/i, "");

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Markdown을 워드로 변환",
    defaultPath: `${base}.docx`,
    filters: DOCX_FILE_FILTER,
  });

  return canceled || !filePath ? null : filePath;
}

function validateRequest(raw: unknown): ConvertMdToDocxRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const req = raw as Partial<ConvertMdToDocxRequest>;
  if (typeof req.markdown !== "string" || !req.markdown.trim()) return null;

  return {
    markdown: req.markdown,
    defaultFileName: typeof req.defaultFileName === "string" ? req.defaultFileName : undefined,
  };
}

async function handleConvert(raw: unknown): Promise<ConvertMdToDocxResult> {
  const req = validateRequest(raw);
  if (!req) return { ok: false, error: "잘못된 변환 요청입니다." };

  const defaultName = req.defaultFileName ?? `markdown-${new Date().toISOString().slice(0, 10)}`;
  const savePath = await askSavePath(defaultName);
  if (!savePath) return { ok: false, cancelled: true, error: "사용자가 저장을 취소했습니다." };

  try {
    const buffer = markdownToDocxBuffer(req.markdown);
    const writeResult = await writeWithPermissionFallback(savePath, buffer);

    return {
      ok: true,
      filePath: writeResult.filePath,
      fallbackUsed: writeResult.fallbackUsed,
      fallbackReason: writeResult.fallbackReason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permissionHint = isPermissionError(err)
      ? " (관리자 권한 실행 또는 저장 경로 변경이 필요합니다.)"
      : "";
    return { ok: false, error: `MD→DOCX 변환 실패: ${message}${permissionHint}` };
  }
}

export function registerMdDocxIpc(): void {
  ipcMain.removeHandler(CONVERT_MD_TO_DOCX_CHANNEL);
  ipcMain.handle(CONVERT_MD_TO_DOCX_CHANNEL, async (_event, raw: unknown) => {
    return handleConvert(raw);
  });
}

export function unregisterMdDocxIpc(): void {
  ipcMain.removeHandler(CONVERT_MD_TO_DOCX_CHANNEL);
}
