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
 *      - xlsx: 항상 xlsx 스킬(skills/xlsx/scripts/convert.py, openpyxl)로 변환 (SheetJS 미사용)
 *        · templateName + 매니페스트 존재 시: 표준 양식 상속(테두리/폰트/스타일 보존) 바인딩 (EL-243)
 *        · 그 외: 템플릿 없이 새 워크북 생성(스크래치 모드)으로 마크다운 표를 담음
 *      - docx: EL-244(docxtemplater 엔진)에서 구현 예정 — 현재 not-implemented 반환
 *   4. 결과 { ok, filePath | error } 반환
 */

import { ipcMain, dialog, BrowserWindow, app } from "electron";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  parseMarkdownToCustomAST,
  normalizeTableToJSON,
  type ASTNode,
} from "../services/markdown-normalizer";
import {
  resolveTemplateManifest,
  type ExcelSheetConfig,
} from "../services/excel-template-binder";
import { runXlsxSkillConvert, type XlsxSkillSheetBinding } from "../services/xlsx-skill-runner";
import { runDocxSkillConvert } from "../services/docx-skill-runner";
import { dispatchSkillAction } from "../../../../src/skills/executor/dispatch";
import { InMemorySkillRegistry } from "../../../../src/skills/executor/registry";
import {
  EXCEL_TEMPLATE_EXPORT_ACTION_ID,
  WORD_TEMPLATE_EXPORT_ACTION_ID,
  excelTemplateExportContract,
  wordTemplateExportContract,
  type ExcelTemplateExportInput,
  type OfficeTemplateExportOutput,
  type WordTemplateExportInput,
} from "../../../../src/skills/contracts/actions/office-export";
import type { SkillExecutionContext } from "../../../../src/skills/contracts/core";

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
  /** true면 저장 다이얼로그 없이 기본 폴더(문서/OMX-Exports)에 자동 저장한다. */
  autoSave?: boolean;
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

const EXCEL_SKILL_ENTRY = {
  name: "excel",
  category: "utility",
  status: "active",
} as const;

const WORD_SKILL_ENTRY = {
  name: "word",
  category: "utility",
  status: "active",
} as const;

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

function buildFallbackTemplateRecord(
  rawContent: string,
  columns: Array<{ idx: number; field: string; type: "string" | "number" | "boolean" }>,
): Record<string, unknown> {
  const firstLine = rawContent.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? "AI 답변";
  const normalized = rawContent.replace(/\r?\n/g, " ").trim();

  const record: Record<string, unknown> = {};
  const firstStringColumn = columns.find((column) => column.type === "string");
  if (firstStringColumn) {
    record[firstStringColumn.field] = normalized || firstLine;
  }

  for (const column of columns) {
    if (record[column.field] !== undefined) continue;

    if (column.type === "number") {
      record[column.field] = 0;
    } else if (column.type === "boolean") {
      record[column.field] = false;
    } else {
      record[column.field] = "";
    }
  }

  return record;
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

function normalizeTableByColumnOrder(
  tableNode: ASTNode,
  requiredColumns: ExcelSheetConfig["columns"],
): Record<string, string | number | boolean>[] {
  if (tableNode.type !== "table" || !tableNode.children || tableNode.children.length <= 1) {
    return [];
  }

  const rows = tableNode.children.slice(1);
  const results: Record<string, string | number | boolean>[] = [];

  for (const row of rows) {
    if (!row.children || row.children.length === 0) continue;
    const record: Record<string, string | number | boolean> = {};

    requiredColumns.forEach((column, index) => {
      const value = row.children?.[index]?.children?.[0]?.value?.trim() ?? "";
      if (column.type === "number") {
        const parsed = Number(value.replace(/[^\d.]/g, ""));
        record[column.field] = Number.isFinite(parsed) ? parsed : 0;
      } else if (column.type === "boolean") {
        record[column.field] = ["true", "1", "yes", "y", "완료", "참"].includes(value.toLowerCase());
      } else {
        record[column.field] = value;
      }
    });

    results.push(record);
  }

  return results;
}

/**
 * 템플릿/매니페스트가 없을 때 convert.py 스크래치 모드에 넘길 제네릭 시트 바인딩을 만든다.
 * 마크다운 표들을 순서대로 각 시트("표1", "표2", ...)에 담고,
 * 표가 하나도 없으면 본문 전체를 줄 단위 단일 열 시트("답변내용")로 담는다.
 */
function buildGenericSheetBindings(markdown: string): XlsxSkillSheetBinding[] {
  const tables = extractMarkdownTables(markdown);

  if (tables.length === 0) {
    const lines = markdown.split(/\r?\n/);
    return [
      {
        name: "답변내용",
        dataStartRow: 1,
        headers: [],
        columns: [{ idx: 1, field: "line", type: "string" }],
        records: lines.map((line) => ({ line })),
      },
    ];
  }

  return tables.map((table, tableIdx) => {
    const columns = table.header.map((_header, colIdx) => ({
      idx: colIdx + 1,
      field: `col${colIdx}`,
      type: "string" as const,
    }));
    const records = table.rows.map((row) => {
      const record: Record<string, string | number | boolean> = {};
      row.forEach((cell, colIdx) => {
        record[`col${colIdx}`] = cell;
      });
      return record;
    });
    return {
      name: `표${tableIdx + 1}`,
      dataStartRow: 2,
      headers: table.header,
      columns,
      records,
    };
  });
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

/**
 * 자동 저장 경로를 확정한다(다이얼로그 없음).
 * 기본 폴더는 "문서/OMX-Exports"이며, 파일명 충돌을 피하기 위해 타임스탬프를 붙인다.
 */
async function resolveAutoSavePath(
  fileType: ExportDocumentRequest["fileType"],
  defaultFileName: string,
): Promise<string | null> {
  try {
    const documentsDir = app.getPath("documents");
    const exportDir = path.join(documentsDir, "OMX-Exports");
    await mkdir(exportDir, { recursive: true });

    const base = sanitizeFileName(defaultFileName).replace(/\.(xlsx|docx)$/i, "");
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19); // YYYY-MM-DDTHH-MM-SS
    return path.join(exportDir, `${base}-${stamp}.${fileType}`);
  } catch {
    return null;
  }
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
    autoSave: req.autoSave === true,
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

  const filePath = req.autoSave
    ? await resolveAutoSavePath(req.fileType, defaultName)
    : await askSavePath(req.fileType, defaultName);
  if (!filePath) {
    return { ok: false, cancelled: true, error: "사용자가 저장을 취소했습니다." };
  }

  try {
    const registry = new InMemorySkillRegistry();
    const context: SkillExecutionContext = {
      requestId: `export-${Date.now()}`,
      workspaceRoot: process.cwd(),
      actor: "export-ipc",
    };

    registry.register({
      skill: EXCEL_SKILL_ENTRY,
      executor: {
        contract: excelTemplateExportContract,
        async execute(input: ExcelTemplateExportInput): Promise<OfficeTemplateExportOutput> {
          const ast = parseMarkdownToCustomAST(input.rawContent);
          const tableNodes = ast.children.filter((child) => child.type === "table");

          // convert.py에 넘길 페이로드를 구성한다.
          // - 템플릿+매니페스트가 있으면: 표준 양식 상속(스타일 유지) 바인딩
          // - 없으면: 템플릿 없이 새 워크북 생성(스크래치 모드) — SheetJS는 사용하지 않음
          let templatePath: string | undefined;
          let metadataSheets: string[] = [];
          let sheetBindings: XlsxSkillSheetBinding[];

          const templatesDir = resolveTemplatesDir();
          const piConsultingDir = path.join(templatesDir, "pi-consulting");
          const fullTemplatePath = input.templateName
            ? path.join(piConsultingDir, input.templateName)
            : null;
          const manifestDir = path.join(piConsultingDir, "manifest");
          const manifest = input.templateName
            ? await resolveTemplateManifest(input.templateName, manifestDir)
            : null;

          const hasTemplate = !!fullTemplatePath && existsSync(fullTemplatePath);
          const hasManifestSheets = !!manifest && !!manifest.sheets && manifest.sheets.length > 0;

          if (hasTemplate && hasManifestSheets && fullTemplatePath && manifest) {
            // 매니페스트가 여러 시트를 정의하면 마크다운 표를 순서대로 각 시트에 매핑한다.
            // (예: 공수산정 = 화면서비스호출 / 서비스난이도 / MM마일스톤 3개 시트)
            const buildRecordsForSheet = (
              sheetConfig: ExcelSheetConfig,
              preferredTable: ASTNode | undefined,
            ): Record<string, string | number | boolean>[] => {
              const candidateTables = preferredTable
                ? [preferredTable, ...tableNodes.filter((t) => t !== preferredTable)]
                : tableNodes;

              let records: Record<string, string | number | boolean>[] = [];
              for (const tableNode of candidateTables) {
                records = normalizeTableToJSON(tableNode, sheetConfig.columns);
                if (records.length > 0) break;
              }

              if (records.length === 0) {
                for (const tableNode of candidateTables) {
                  records = normalizeTableByColumnOrder(tableNode, sheetConfig.columns);
                  if (records.length > 0) break;
                }
              }

              return records;
            };

            templatePath = fullTemplatePath;
            metadataSheets = ["문서정보"];
            sheetBindings = manifest.sheets.map((sheetConfig, sheetIdx) => {
              const records = buildRecordsForSheet(sheetConfig, tableNodes[sheetIdx]);
              return {
                name: sheetConfig.name,
                dataStartRow: sheetConfig.dataStartRow,
                columns: sheetConfig.columns,
                records:
                  records.length > 0
                    ? records
                    : [
                        buildFallbackTemplateRecord(input.rawContent, sheetConfig.columns) as Record<
                          string,
                          string | number | boolean
                        >,
                      ],
              };
            });

            console.log(
              `[xlsx-export] convert.py 템플릿 모드. 템플릿=${input.templateName}, 시트=${sheetBindings
                .map((s) => `${s.name}(${s.records.length}행)`)
                .join(", ")}`,
            );
          } else {
            // 템플릿/매니페스트가 없으면 스크래치 모드로 마크다운 표를 그대로 담는다.
            if (input.templateName && !hasTemplate) {
              console.log(
                `[xlsx-export] 템플릿 파일 없음(${input.templateName}) → convert.py 스크래치 모드로 진행.`,
              );
            } else if (input.templateName && !hasManifestSheets) {
              console.log(
                `[xlsx-export] 매니페스트 없음/빈 시트(${input.templateName}) → convert.py 스크래치 모드로 진행.`,
              );
            } else {
              console.log("[xlsx-export] templateName 없음 → convert.py 스크래치 모드로 진행.");
            }

            templatePath = undefined;
            metadataSheets = [];
            sheetBindings = buildGenericSheetBindings(input.rawContent);

            console.log(
              `[xlsx-export] convert.py 스크래치 모드. 시트=${sheetBindings
                .map((s) => `${s.name}(${s.records.length}행)`)
                .join(", ")}`,
            );
          }

          const writeResult = await writeWithPermissionFallback(input.savePath, async (targetPath) => {
            const skillResult = await runXlsxSkillConvert({
              templatePath,
              outputPath: targetPath,
              metadataSheets,
              sheets: sheetBindings,
            });
            if (skillResult.status !== "success") {
              throw new Error(skillResult.error || "xlsx 스킬 변환에 실패했습니다.");
            }
            console.log(
              `[xlsx-export] convert.py 완료. 기록된 시트=${(skillResult.sheetsWritten ?? [])
                .map((s) => `${s.applied}(${s.rows}행)`)
                .join(", ")}`,
            );
          });

          return {
            ok: true,
            filePath: writeResult.filePath,
            fallbackUsed: writeResult.fallbackUsed,
            fallbackReason: writeResult.fallbackReason,
          };
        },
      },
    });

    registry.register({
      skill: WORD_SKILL_ENTRY,
      executor: {
        contract: wordTemplateExportContract,
        async execute(input: WordTemplateExportInput): Promise<OfficeTemplateExportOutput> {
          // docx는 항상 로컬 docx 스킬(convert.py, python-docx)로 렌더링한다.
          // 표준 양식 템플릿이 존재하면 템플릿 모드로, 없으면 스크래치 모드로 동작한다.
          const templateName = input.templateName ?? (input.rawContent.toUpperCase().includes("ADR")
            ? "ADR-Template_표준양식.docx"
            : "API-Spec-Standard_표준양식.docx");

          const templatesDir = resolveTemplatesDir();
          const piConsultingDir = path.join(templatesDir, "pi-consulting");
          const fullTemplatePath = path.join(piConsultingDir, templateName);
          const hasTemplate = existsSync(fullTemplatePath);

          const title = fullTemplatePath.toUpperCase().includes("ADR")
            ? "ADR 문서"
            : "API 명세서";

          if (hasTemplate) {
            console.log(`[docx-export] convert.py 템플릿 모드: ${templateName}`);
          } else {
            console.log("[docx-export] convert.py 스크래치 모드(템플릿 없음)");
          }

          const writeResult = await writeWithPermissionFallback(input.savePath, async (targetPath) => {
            const skillResult = await runDocxSkillConvert({
              templatePath: hasTemplate ? fullTemplatePath : undefined,
              outputPath: targetPath,
              title,
              content: input.rawContent,
            });
            if (skillResult.status !== "success") {
              throw new Error(skillResult.error ?? "docx 스킬 실행 실패");
            }
            console.log(`[docx-export] convert.py 완료. 렌더링 블록=${skillResult.blocksWritten ?? 0}`);
          });

          return {
            ok: true,
            filePath: writeResult.filePath,
            fallbackUsed: writeResult.fallbackUsed,
            fallbackReason: writeResult.fallbackReason,
          };
        },
      },
    });

    const actionId = req.fileType === "xlsx"
      ? EXCEL_TEMPLATE_EXPORT_ACTION_ID
      : WORD_TEMPLATE_EXPORT_ACTION_ID;

    const result = await dispatchSkillAction(
      registry,
      actionId,
      {
        rawContent: req.rawContent,
        savePath: filePath,
        templateName: req.templateName,
      },
      context,
    );

    if (result.ok) {
      return result.data as ExportDocumentResult;
    }

    return {
      ok: false,
      error: result.error.message,
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
