/**
 * xlsx 스킬 실행 러너 — skills/xlsx/scripts/convert.py 브릿지
 *
 * Electron xlsx executor가 표준 양식 템플릿에 데이터를 바인딩할 때,
 * ExcelJS 내장 바인더 대신 로컬 xlsx 스킬(openpyxl 기반 convert.py)을 spawn하여 실행한다.
 *
 * python 실행 파일 해석/스크립트 탐색/spawn 로직은 python-runner.ts로 공유한다.
 */

import path from "node:path";
import { resolveSkillScriptPath, runPythonScriptJson } from "./python-runner";

/** convert.py 시트 열 매핑 */
export interface XlsxSkillColumn {
  idx: number;
  field: string;
  type: "string" | "number" | "boolean";
}

/** convert.py 시트 바인딩 단위 */
export interface XlsxSkillSheetBinding {
  name: string;
  dataStartRow: number;
  columns: XlsxSkillColumn[];
  records: Record<string, string | number | boolean>[];
  /** 스크래치 모드(템플릿 없음)에서 1행에 기록할 헤더(선택) */
  headers?: string[];
}

/** convert.py 실행 페이로드 */
export interface XlsxSkillPayload {
  /** 생략/빈 값이면 템플릿 없이 새 워크북을 생성한다. */
  templatePath?: string;
  outputPath: string;
  metadataSheets?: string[];
  recalc?: boolean;
  sheets: XlsxSkillSheetBinding[];
}

/** convert.py 실행 결과 */
export interface XlsxSkillResult {
  status: "success" | "error" | string;
  outputPath?: string;
  sheetsWritten?: Array<{ requested: string; applied: string; rows: number }>;
  error?: string;
  recalc?: unknown;
}

const CONVERT_SCRIPT_RELATIVE = path.join("xlsx", "scripts", "convert.py");

/** convert.py 절대 경로를 확정한다. */
export function resolveConvertScriptPath(): string | null {
  return resolveSkillScriptPath(CONVERT_SCRIPT_RELATIVE);
}

/**
 * xlsx 스킬(convert.py)을 실행하여 템플릿에 데이터를 바인딩한다.
 */
export async function runXlsxSkillConvert(payload: XlsxSkillPayload): Promise<XlsxSkillResult> {
  const scriptPath = resolveConvertScriptPath();
  if (!scriptPath) {
    throw new Error("xlsx 스킬 스크립트를 찾을 수 없습니다: skills/xlsx/scripts/convert.py");
  }
  console.log(`[xlsx-skill] convert.py 경로: ${scriptPath}`);

  return runPythonScriptJson<XlsxSkillResult>(scriptPath, payload, "xlsx-skill");
}

