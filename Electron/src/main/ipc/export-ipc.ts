/**
 * EL-241 & EL-243: 산출물 내보내기(Export) IPC 핸들러 — Main Process 측
 *
 * Renderer의 AI 답변(마크다운)을 오피스 파일(.xlsx/.docx)로 저장하는 IPC 브릿지.
 *
 * 등록 핸들러:
 *   omx:export-document — 내보내기 요청 수신 → 저장 다이얼로그 → 파일 쓰기
 *
 * 처리 흐름:
 *   1. Renderer: exportDocument({ fileType, rawContent, defaultFileName, templateName }) 호출
 *   2. Main: dialog.showSaveDialog로 저장 경로 확정
 *   3. Main: 엔진 디스패치
 *      - xlsx + templateName: templates/pi-consulting/의 오리지널 엑셀 양식을 상속(테두리, 폰트 보존)하여 데이터 바인딩 주입 (EL-243)
 *      - xlsx: 마크다운 표 추출 → SheetJS 워크북 조립 → 바이너리 쓰기 (EL-241)
 *      - docx: EL-244(docxtemplater 엔진)에서 구현 예정 — 현재 not-implemented 반환
 *   4. 결과 { ok, filePath | error } 반환
 */

import { ipcMain, dialog, BrowserWindow, app } from "electron";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

import {
  parseMarkdownToCustomAST,
  normalizeTableToJSON,
} from "../services/markdown-normalizer";
import {
  resolveTemplateManifest,
  bindDataToExcelTemplate,
} from "../services/excel-template-binder";
import {
  extractADRTemplateData,
  extractAPISpecTemplateData,
  bindDataToWordTemplate,
} from "../services/word-template-binder";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

/** 내보내기 요청 채널 (Renderer → Main, invoke) */
export const EXPORT_DOCUMENT_CHANNEL = "omx:export-document";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

/** 내보내기 요청 페이로드 */
export interface ExportDocumentRequest {
  /** 대상 파일 형식 */
  fileType: "xlsx" | "docx";
  /** AI 답변 원문 (마크다운) */
  rawContent: string;
  /** 저장 다이얼로그 기본 파일명 (확장자 제외 가능) */
  defaultFileName?: string;
  /** 사전 탑재된 로컬 템플릿 파일 명칭 (예: "WBS-Template_표준양식.xlsx") */
  templateName?: string;
}

/** 내보내기 결과 */
export interface ExportDocumentResult {
  ok: boolean;
  /** 저장된 파일 절대 경로 (성공 시) */
  filePath?: string;
  /** 권한 문제로 fallback 경로 저장이 사용되었는지 여부 */
  fallbackUsed?: boolean;
  /** fallback 사유 */
  fallbackReason?: string;
  /** 실패/취소 사유 */
  error?: string;
  /** 사용자가 저장 다이얼로그를 취소했는지 여부 */
  cancelled?: boolean;
}

type WriteResult = {
  filePath: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
};

function isPermissionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const maybeErr = err as { code?: string; message?: string };
  const code = (maybeErr.code || "").toUpperCase();
  const message = (maybeErr.message || "").toLowerCase();

  if (code === "EACCES" || code === "EPERM") return true;
  return (
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
  const fallbackFileName = `${parsed.name}-${Date.now()}${parsed.ext}`;
  return path.join(exportDir, fallbackFileName);
}

async function writeWithPermissionFallback(
  initialPath: string,
  writer: (targetPath: string) => Promise<void>,
): Promise<WriteResult> {
  try {
    await writer(initialPath);
    return { filePath: initialPath, fallbackUsed: false };
  } catch (err) {
    if (!isPermissionError(err)) throw err;

    const fallbackPath = await buildFallbackPath(initialPath);
    await writer(fallbackPath);
    return {
      filePath: fallbackPath,
      fallbackUsed: true,
      fallbackReason:
        "원래 경로에 쓰기 권한이 없어 문서 폴더(OMX-Exports)로 저장했습니다.",
    };
  }
}

// ─── 마크다운 표 추출 (경량 파서 — 일반 폴백용) ───────────────────────────────

/** 파싱된 마크다운 표 1개 (헤더 + 데이터 행) */
interface ParsedTable {
  header: string[];
  rows: string[][];
}

/** `| a | b |` 형태의 행을 셀 배열로 분해한다. */
function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 구분선(`|---|---|`) 행 여부 판정 */
function isSeparatorRow(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/**
 * 마크다운 본문에서 모든 GFM 표를 추출한다. (일반 변환 폴백용)
 */
export function extractMarkdownTables(markdown: string): ParsedTable[] {
  const lines = markdown.split(/\r?\n/);
  const tables: ParsedTable[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const next = lines[i + 1]?.trim() ?? "";

    // 헤더 행 + 구분선 조합 탐지
    if (line.startsWith("|") && next.startsWith("|") && isSeparatorRow(next)) {
      const header = splitTableRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[j]));
        j++;
      }
      tables.push({ header, rows });
      i = j - 1; // 표 끝까지 스킵
    }
  }

  return tables;
}

// ─── 엔진: xlsx (SheetJS 기본 내보내기 폴백) ──────────────────────────────────

/**
 * 마크다운 표들을 시트별로 담은 xlsx 바이너리 버퍼를 생성한다.
 * 표가 하나도 없으면 본문 전체를 단일 셀 텍스트 시트로 담는다.
 */
function buildXlsxBuffer(markdown: string): Buffer {
  const workbook = XLSX.utils.book_new();
  const tables = extractMarkdownTables(markdown);

  if (tables.length === 0) {
    // 표가 없는 답변: 줄 단위 텍스트 시트로 폴백
    const textRows = markdown.split(/\r?\n/).map((line) => [line]);
    const sheet = XLSX.utils.aoa_to_sheet(textRows);
    XLSX.utils.book_append_sheet(workbook, sheet, "답변내용");
  } else {
    tables.forEach((table, idx) => {
      const aoa = [table.header, ...table.rows];
      const sheet = XLSX.utils.aoa_to_sheet(aoa);
      // 시트명 규칙: 표1, 표2, ... (엑셀 시트명 31자 제한 준수)
      XLSX.utils.book_append_sheet(workbook, sheet, `표${idx + 1}`);
    });
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── 저장 다이얼로그 ──────────────────────────────────────────────────────────

const FILE_FILTERS: Record<ExportDocumentRequest["fileType"], Electron.FileFilter[]> = {
  xlsx: [{ name: "Excel 통합 문서", extensions: ["xlsx"] }],
  docx: [{ name: "Word 문서", extensions: ["docx"] }],
};

/** 파일명에 사용 불가한 문자를 제거한다. */
function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "omx-export";
}

async function askSavePath(
  fileType: ExportDocumentRequest["fileType"],
  defaultFileName: string,
): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const base = sanitizeFileName(defaultFileName).replace(/\.(xlsx|docx)$/i, "");

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: fileType === "xlsx" ? "엑셀로 내보내기" : "워드로 내보내기",
    defaultPath: `${base}.${fileType}`,
    filters: FILE_FILTERS[fileType],
  });

  return canceled || !filePath ? null : filePath;
}

// ─── 로컬 표준 자산 디렉토리 탐색 ─────────────────────────────────────────────

function resolveTemplatesDir(): string {
  const possiblePaths = [
    path.join(app.getAppPath(), "..", "templates"),
    path.join(app.getAppPath(), "templates"),
    path.join(process.cwd(), "templates"),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return path.join(app.getAppPath(), "..", "templates"); // Default fallback
}

// ─── 요청 검증 ────────────────────────────────────────────────────────────────

function validateRequest(raw: unknown): ExportDocumentRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const req = raw as Partial<ExportDocumentRequest>;
  if (req.fileType !== "xlsx" && req.fileType !== "docx") return null;
  if (typeof req.rawContent !== "string" || req.rawContent.length === 0) return null;
  return {
    fileType: req.fileType,
    rawContent: req.rawContent,
    defaultFileName:
      typeof req.defaultFileName === "string" ? req.defaultFileName : undefined,
    templateName:
      typeof req.templateName === "string" ? req.templateName : undefined,
  };
}

// ─── 핸들러 본체 ──────────────────────────────────────────────────────────────

async function handleExportDocument(raw: unknown): Promise<ExportDocumentResult> {
  const req = validateRequest(raw);
  if (!req) {
    return { ok: false, error: "잘못된 내보내기 요청 페이로드입니다." };
  }

  const defaultName =
    req.defaultFileName ?? `omx-answer-${new Date().toISOString().slice(0, 10)}`;

  const filePath = await askSavePath(req.fileType, defaultName);
  if (!filePath) {
    return { ok: false, cancelled: true, error: "사용자가 저장을 취소했습니다." };
  }

  try {
    // ─── Word (.docx) 템플릿 바인딩 시나리오 (EL-244 / EL-245) ───
    if (req.fileType === "docx") {
      const templateName = req.templateName ?? (req.rawContent.toUpperCase().includes("ADR")
        ? "ADR-Template_표준양식.docx"
        : "API-Spec-Standard_표준양식.docx");

      const templatesDir = resolveTemplatesDir();
      const piConsultingDir = path.join(templatesDir, "pi-consulting");
      const fullTemplatePath = path.join(piConsultingDir, templateName);

      if (!existsSync(fullTemplatePath)) {
        return { ok: false, error: `워드 템플릿 파일을 찾을 수 없습니다: ${templateName}` };
      }

      // 1. 문서 명칭 특성 파악에 의해 적당한 파서 가공 디스패치
      const isADR = templateName.toUpperCase().includes("ADR");
      const parsedDocData = isADR
        ? extractADRTemplateData(req.rawContent)
        : extractAPISpecTemplateData(req.rawContent);

      // 템플릿 키 불일치 또는 섹션 파싱 실패 대비 원문 폴백 텍스트 주입
      const docData = {
        ...parsedDocData,
        rawContent: req.rawContent,
        content: req.rawContent,
        answer: req.rawContent,
        response: req.rawContent,
        body: req.rawContent,
      };

      // 2. docxtemplater 물리 조립 기동
      const writeResult = await writeWithPermissionFallback(filePath, async (targetPath) => {
        await bindDataToWordTemplate(fullTemplatePath, targetPath, docData);
      });

      return {
        ok: true,
        filePath: writeResult.filePath,
        fallbackUsed: writeResult.fallbackUsed,
        fallbackReason: writeResult.fallbackReason,
      };
    }

    // ─── 템플릿 바인딩 시나리오 (EL-243) ───
    if (req.templateName) {
      const templatesDir = resolveTemplatesDir();
      const piConsultingDir = path.join(templatesDir, "pi-consulting");
      const fullTemplatePath = path.join(piConsultingDir, req.templateName);

      if (existsSync(fullTemplatePath)) {
        // 1. 마크다운 MDAST 변환 및 표 노드 추출
        const ast = parseMarkdownToCustomAST(req.rawContent);
        const tableNode = ast.children.find((child) => child.type === "table");

        if (tableNode) {
          // 2. 템플릿 매니페스트 설정 조회 (manifest/ 디렉토리 기준)
          const manifestDir = path.join(piConsultingDir, "manifest");
          const manifest = await resolveTemplateManifest(req.templateName, manifestDir);

          if (manifest && manifest.sheets && manifest.sheets.length > 0) {
            const sheetConfig = manifest.sheets[0];
            // 3. 표 데이터를 JSON으로 매핑 정규화
            const records = normalizeTableToJSON(tableNode, sheetConfig.columns);

            if (records.length > 0) {
              // 4. exceljs 바인딩 엔진 가동
              const writeResult = await writeWithPermissionFallback(filePath, async (targetPath) => {
                await bindDataToExcelTemplate(fullTemplatePath, targetPath, records, sheetConfig);
              });

              return {
                ok: true,
                filePath: writeResult.filePath,
                fallbackUsed: writeResult.fallbackUsed,
                fallbackReason: writeResult.fallbackReason,
              };
            }
          }
        }
      }
      console.warn("지정된 엑셀 템플릿 또는 매장 데이터를 찾지 못해, 표준 SheetJS 내보내기로 자동 폴백합니다.");
    }

    // ─── 기본 SheetJS 내보내기 폴백 (EL-241) ───
    const buffer = buildXlsxBuffer(req.rawContent);
    const writeResult = await writeWithPermissionFallback(filePath, async (targetPath) => {
      await writeFile(targetPath, buffer);
    });

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
    return { ok: false, error: `파일 내보내기 실패: ${message}${permissionHint}` };
  }
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

/**
 * 내보내기 IPC 핸들러를 Main Process에 등록한다.
 * app.on('ready') 이후 한 번만 호출.
 */
export function registerExportIpc(): void {
  // 중복 등록 방지
  ipcMain.removeHandler(EXPORT_DOCUMENT_CHANNEL);

  ipcMain.handle(EXPORT_DOCUMENT_CHANNEL, async (_event, raw: unknown) => {
    return handleExportDocument(raw);
  });
}
