/**
 * EL-244 & EL-245: 워드 템플릿 바인딩 및 가공 엔진 (docxtemplater & pizzip 기반)
 *
 * 이 서비스는 pizzip 및 docxtemplater 라이브러리를 활용하여, 사전에 플레이스홀더({변수})가
 * 심겨진 표준 워드 양식 파일(ADR-Template_표준양식.docx, API-Spec-Standard_표준양식.docx)에
 * 비정형 마크다운 AI 답변으로부터 고도의 문맥 파싱을 거쳐 획득한 구조화 JSON 데이터들을
 * 바인딩 치환하여 물리 파일로 조립해 내는 코어를 관리합니다.
 */

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseMarkdownToCustomAST, type ASTNode } from "./markdown-normalizer";

function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveRawAnswerText(data: Record<string, unknown>): string {
  const candidates = [
    data.rawContent,
    data.content,
    data.answer,
    data.response,
    data.body,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "";
}

function appendRawAnswerToDocx(doc: Docxtemplater, rawText: string): void {
  if (!rawText) return;

  const zip = doc.getZip();
  const docFile = zip.file("word/document.xml");
  if (!docFile) return;

  const xml = docFile.asText();
  if (!xml.includes("</w:body>")) return;

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return;

  const capped = lines.slice(0, 80);
  const paragraphs = [
    '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">AI 답변 원문</w:t></w:r></w:p>',
    ...capped.map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`),
  ].join("");

  const merged = xml.replace("</w:body>", `${paragraphs}</w:body>`);
  zip.file("word/document.xml", merged);
}

function expandValueAliases(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => expandValueAliases(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(value)) {
    const expanded = expandValueAliases(raw);
    const candidates = [
      key,
      key.toLowerCase(),
      toSnakeCase(key),
      toKebabCase(key),
    ];

    for (const alias of candidates) {
      if (!Object.prototype.hasOwnProperty.call(out, alias)) {
        out[alias] = expanded;
      }
    }
  }

  return out;
}

// ─── 1. EL-245 변수 플레이스홀더 인가 설계 및 타입 정의 ───────────────────────

/** ADR 워드 템플릿 치환용 변수 인가 스키마 */
export interface ADRTemplateData {
  adrId: string;
  title: string;
  status: string;
  author: string;
  createdDate: string;
  relatedArtifacts: string;
  context: string;
  decision: string;
  rationale: string;
  consequences: string;
  options: Array<{
    optionId: string;
    name: string;
    description: string;
    pros: string;
    cons: string;
    accepted: string;
  }>;
  mappings: Array<{
    asisId: string;
    action: string;
    tobe: string;
    note: string;
  }>;
}

/** API 명세서 워드 템플릿 치환용 변수 인가 스키마 */
export interface APISpecTemplateData {
  apiId: string;
  apiName: string;
  asisInterface: string;
  domain: string;
  version: string;
  author: string;
  createdDate: string;
  purpose: string;
  consumer: string;
  auth: string;
  tx: string;
  endpoints: Array<{
    method: string;
    path: string;
    desc: string;
  }>;
  params: Array<{
    name: string;
    location: string;
    type: string;
    required: string;
    desc: string;
  }>;
  requestBody: string;
  reqFields: Array<{
    field: string;
    type: string;
    required: string;
    constraint: string;
    tableColumn: string;
  }>;
  responseBody: string;
  errorCodes: Array<{
    httpStatus: string;
    code: string;
    desc: string;
    solution: string;
  }>;
  sla: string;
  rateLimit: string;
  logging: string;
  traces: Array<{
    asisId: string;
    ioType: string;
    action: string;
    note: string;
  }>;
}

// ─── 2. 마크다운 ➔ JSON 변수 매핑 어댑터 (EL-245 설계) ────────────────────────

/** 기호 및 줄바꿈을 포함한 셀의 인라인 데이터 정밀 텍스트 추출 */
function getCellInlineText(cellNode: ASTNode | undefined): string {
  if (!cellNode || !cellNode.children) return "";
  return cellNode.children
    .map((n) => n.value || (n.children ? n.children.map((c) => c.value ?? "").join("") : ""))
    .join("")
    .trim();
}

/** 마크다운 표 노드를 단순 {키: 밸류} 매칭 행 데이터 배열로 평탄화 */
function parseTableNodeToRows(tableNode: ASTNode): string[][] {
  if (!tableNode.children || tableNode.children.length === 0) return [];
  return tableNode.children.map((row) => {
    if (!row.children) return [];
    return row.children.map((cell) => getCellInlineText(cell));
  });
}

/** 특정 제목에 대치하는 텍스트 본문(패러그래프, 블록 등)을 스윕 추출한다. */
function extractParagraphsBetweenSections(
  nodes: ASTNode[],
  headingTextKeyword: string,
): string {
  let matched = false;
  const collected: string[] = [];

  for (const node of nodes) {
    if (node.type === "heading") {
      const headingVal = node.children?.[0]?.value ?? "";
      if (headingVal.includes(headingTextKeyword)) {
        matched = true;
        continue;
      } else if (matched) {
        // 다음 헤딩 출현 시 정지
        break;
      }
    }

    if (matched) {
      if (node.type === "paragraph") {
        collected.push(getCellInlineText(node));
      } else if (node.type === "blockquote") {
        collected.push(`> ${getCellInlineText(node)}`);
      } else if (node.type === "list") {
        node.children?.forEach((li) => collected.push(`- ${getCellInlineText(li)}`));
      } else if (node.type === "code") {
        collected.push(`\`\`\`${node.lang ?? ""}\n${node.value ?? ""}\n\`\`\``);
      }
    }
  }

  // 앞뒤 개행 정비
  return collected.join("\n\n").trim();
}

/**
 * 마크다운 MDAST 객체를 분석하여 ADR-Template에 필요한 JSON 데이터 맵을 조립한다.
 */
export function extractADRTemplateData(markdown: string): ADRTemplateData {
  const ast = parseMarkdownToCustomAST(markdown);
  const data: ADRTemplateData = {
    adrId: "ADR-NNN",
    title: "",
    status: "Proposed",
    author: "",
    createdDate: new Date().toISOString().slice(0, 10),
    relatedArtifacts: "",
    context: "",
    decision: "",
    rationale: "",
    consequences: "",
    options: [],
    mappings: [],
  };

  // 1. 최상단 타이틀 탐색 (예: # ADR-001: DB 아키텍처 결정)
  const mainHeading = ast.children.find((c) => c.type === "heading" && c.depth === 1);
  if (mainHeading) {
    const headingText = getCellInlineText(mainHeading);
    const match = headingText.match(/^(ADR-[^:\s]+)\s*:\s*(.*)$/i);
    if (match) {
      data.adrId = match[1].trim();
      data.title = match[2].trim();
    } else {
      data.title = headingText;
    }
  }

  // 2. 메타데이터 표 탐색
  const tables = ast.children.filter((c) => c.type === "table");
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 0) {
      // 헤더 또는 레이블 분석
      const isMetadataTable = rows.some((row) =>
        ["ADR ID", "상태", "작성자", "작성일", "관련 산출물", "ADR_ID"].includes(row[0]),
      );

      if (isMetadataTable) {
        rows.forEach((row) => {
          const key = row[0]?.trim();
          const val = row[1]?.trim() ?? "";
          if (key.includes("ADR ID") || key.toLowerCase().includes("adr_id")) data.adrId = val;
          else if (key.includes("제목")) data.title = val;
          else if (key.includes("상태")) data.status = val;
          else if (key.includes("작성자")) data.author = val;
          else if (key.includes("작성일")) data.createdDate = val;
          else if (key.includes("관련")) data.relatedArtifacts = val;
        });
        break; // 메타 표 첫 회 가용 종료
      }
    }
  }

  // 3. 고려한 대안(Options) 표 조립
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const headers = rows[0];
      const isOptionsTable = headers.some((h) => h.includes("대안") || h.includes("Option"));
      if (isOptionsTable) {
        const optionRows = rows.slice(1);
        data.options = optionRows.map((row, idx) => ({
          optionId: `Option ${String.fromCharCode(65 + idx)}`, // A, B, C...
          name: row[0] ?? "",
          description: row[1] ?? "",
          pros: row[2] ?? "",
          cons: row[3] ?? "",
          accepted: row[4] ?? "",
        }));
        break;
      }
    }
  }

  // 4. To-Be 매핑 테이블 조립
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const headers = rows[0];
      const isMappingTable = headers.some((h) => h.includes("As-Is 식별자") || h.includes("처리 구분") || h.includes("수정"));
      if (isMappingTable) {
        const mappingsRows = rows.slice(1);
        data.mappings = mappingsRows.map((row) => ({
          asisId: row[0] ?? "",
          action: row[1] ?? "",
          tobe: row[2] ?? "",
          note: row[3] ?? "",
        }));
        break;
      }
    }
  }

  // 5. 비정형 단락(배경, 결정, Rationale 등) 정밀 구역 스위핑
  data.context = extractParagraphsBetweenSections(ast.children, "배경");
  data.decision = extractParagraphsBetweenSections(ast.children, "결정");
  data.rationale = extractParagraphsBetweenSections(ast.children, "근거");
  data.consequences = extractParagraphsBetweenSections(ast.children, "결과");

  return data;
}

/**
 * 마크다운 MDAST 객체를 분석하여 API-Spec-Standard에 필요한 JSON 데이터 맵을 조립한다.
 */
export function extractAPISpecTemplateData(markdown: string): APISpecTemplateData {
  const ast = parseMarkdownToCustomAST(markdown);
  const data: APISpecTemplateData = {
    apiId: "API-NNN",
    apiName: "",
    asisInterface: "",
    domain: "",
    version: "v1",
    author: "",
    createdDate: new Date().toISOString().slice(0, 10),
    purpose: "",
    consumer: "",
    auth: "",
    tx: "",
    endpoints: [],
    params: [],
    requestBody: "{}",
    reqFields: [],
    responseBody: "{}",
    errorCodes: [],
    sla: "",
    rateLimit: "",
    logging: "",
    traces: [],
  };

  // 1. 최상단 헤더
  const mainHeading = ast.children.find((c) => c.type === "heading" && c.depth === 1);
  if (mainHeading) {
    data.apiName = getCellInlineText(mainHeading).replace(/^#+\s*/, "");
  }

  const tables = ast.children.filter((c) => c.type === "table");

  // 2. 메타데이터 표
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 0) {
      const isMeta = rows.some((row) => ["API ID", "API 명", "대응 As-Is", "도메인"].includes(row[0]));
      if (isMeta) {
        rows.forEach((row) => {
          const key = row[0]?.trim();
          const val = row[1]?.trim() ?? "";
          if (key.includes("API ID")) data.apiId = val;
          else if (key.includes("API 명")) data.apiName = val;
          else if (key.includes("대응 As-Is")) data.asisInterface = val;
          else if (key.includes("도메인")) data.domain = val;
          else if (key.includes("버전")) data.version = val;
          else if (key.includes("작성자")) {
            // 작성자 / 작성일 패턴 분해 수립
            if (val.includes("/")) {
              const parts = val.split("/");
              data.author = parts[0].trim();
              data.createdDate = parts[1].trim();
            } else {
              data.author = val;
            }
          }
        });
        break;
      }
    }
  }

  // 3. 엔드포인트 테이블
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const isEndpoint = rows[0].every((h) => ["메서드", "경로", "설명", "Method", "Path"].includes(h));
      if (isEndpoint) {
        data.endpoints = rows.slice(1).map((row) => ({
          method: row[0] ?? "",
          path: row[1] ?? "",
          desc: row[2] ?? "",
        }));
        break;
      }
    }
  }

  // 4. Path/Query Parameter 테이블
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const isParam = rows[0].some((h) => h.includes("파라미터") || h.includes("위치"));
      if (isParam) {
        data.params = rows.slice(1).map((row) => ({
          name: row[0] ?? "",
          location: row[1] ?? "",
          type: row[2] ?? "",
          required: row[3] ?? "",
          desc: row[4] ?? "",
        }));
        break;
      }
    }
  }

  // 5. Request Body 테이블
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const isReqFields = rows[0].some((h) => h.includes("대응 컬럼") || h.includes("제약"));
      if (isReqFields) {
        data.reqFields = rows.slice(1).map((row) => ({
          field: row[0] ?? "",
          type: row[1] ?? "",
          required: row[2] ?? "",
          constraint: row[3] ?? "",
          tableColumn: row[4] ?? "",
        }));
        break;
      }
    }
  }

  // 6. 에러 코드 테이블
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const isError = rows[0].some((h) => h.includes("코드") && h.includes("대응 방안"));
      if (isError) {
        data.errorCodes = rows.slice(1).map((row) => ({
          httpStatus: row[0] ?? "",
          code: row[1] ?? "",
          desc: row[2] ?? "",
          solution: row[3] ?? "",
        }));
        break;
      }
    }
  }

  // 7. Tracker Tracking Table
  for (const table of tables) {
    const rows = parseTableNodeToRows(table);
    if (rows.length > 1) {
      const isTrace = rows[0].some((h) => h.includes("As-Is IF ID") || h.includes("변경 구분"));
      if (isTrace) {
        data.traces = rows.slice(1).map((row) => ({
          asisId: row[0] ?? "",
          ioType: row[1] ?? "",
          action: row[2] ?? "",
          note: row[3] ?? "",
        }));
        break;
      }
    }
  }

  // 8. JSON 코드 블록 추출 (Request Body / Response Body 대피 구조화)
  const codeBlocks = ast.children.filter((c) => c.type === "code" && c.lang === "json");
  if (codeBlocks.length > 0) {
    data.requestBody = codeBlocks[0].value ?? "{}";
    if (codeBlocks.length > 1) {
      data.responseBody = codeBlocks[1].value ?? "{}";
    }
  }

  // 9. 비기능 단락 스위핑
  const purposeContext = extractParagraphsBetweenSections(ast.children, "개요");
  if (purposeContext) {
    data.purpose = purposeContext.match(/목적:\s*(.*)/)?.[1] ?? purposeContext;
    data.consumer = purposeContext.match(/소비자\(Consumer\):\s*(.*)/)?.[1] ?? "";
    data.auth = purposeContext.match(/인증\/인가:\s*(.*)/)?.[1] ?? "";
    data.tx = purposeContext.match(/트랜잭션 특성:\s*(.*)/)?.[1] ?? "";
  }

  const nonFunctionalSec = extractParagraphsBetweenSections(ast.children, "비기능");
  if (nonFunctionalSec) {
    data.sla = nonFunctionalSec.match(/SLA:\s*(.*)/)?.[1] ?? nonFunctionalSec;
    data.rateLimit = nonFunctionalSec.match(/Rate Limit:\s*(.*)/)?.[1] ?? "";
    data.logging = nonFunctionalSec.match(/로깅\/관측성:\s*(.*)/)?.[1] ?? "";
  }

  return data;
}

// ─── 3. 메인 물리 워드 조립 파일 쓰기 엔진 (EL-244) ───────────────────────────

/**
 * docxtemplater와 pizzip을 활용하여 워드 표준 템플릿의 변수를 바인딩하고 저장한다.
 *
 * @param templatePath 원본 .docx 템플릿 파일의 절대 경로
 * @param savePath 최종 완성 산출 파일이 저장될 절대 경로
 * @param data 템플릿 마크업에 대입될 구조화 JSON 데이터 사양
 */
export async function bindDataToWordTemplate(
  templatePath: string,
  savePath: string,
  data: Record<string, any>,
): Promise<void> {
  if (!existsSync(templatePath)) {
    throw new Error(`워드 템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
  }

  // pizzip, docxtemplater는 바이너리 모드로 동작
  const fileContent = readFileSync(templatePath, "binary");
  const zip = new PizZip(fileContent);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true, // 루프 블록 내 패러그래프 유지 수립
    linebreaks: true,   // 인라인 줄바꿈(\n)을 템플릿의 가시 줄바꿈으로 변환 처리
  });

  const renderData = expandValueAliases(data) as Record<string, unknown>;

  try {
    // 플레이스홀더 치환 가동 (setData deprecated 경로 회피)
    doc.render(renderData);
  } catch (error: any) {
    // 렌더링 충돌은 호출자에게 명시적으로 전파
    throw new Error(`워드 파일 렌더링 중 구조 충돌이 발생했습니다: ${error.message}`);
  }

  appendRawAnswerToDocx(doc, resolveRawAnswerText(renderData));

  const buffer = doc.getZip().generate({ type: "nodebuffer" });
  await writeFile(savePath, buffer);
}
