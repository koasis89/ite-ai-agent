/**
 * docx 스킬 실행 러너 — skills/docx/scripts/convert.py 브릿지
 *
 * Electron word/docx executor가 표준 양식 템플릿에 데이터를 렌더링할 때,
 * docxtemplater 내장 바인더 대신 로컬 docx 스킬(python-docx 기반 convert.py)을 spawn하여 실행한다.
 *
 * python 실행 파일 해석/스크립트 탐색/spawn 로직은 python-runner.ts로 공유한다.
 */

import path from "node:path";
import { resolveSkillScriptPath, runPythonScriptJson } from "./python-runner";

/** convert.py 실행 페이로드 */
export interface DocxSkillPayload {
  /** 생략/빈 값이면 템플릿 없이 새 문서를 생성한다. */
  templatePath?: string;
  outputPath: string;
  /** 본문 시작 전 삽입할 제목(선택) */
  title?: string;
  /** 렌더링할 마크다운 본문 */
  content: string;
}

/** convert.py 실행 결과 */
export interface DocxSkillResult {
  status: "success" | "error" | string;
  outputPath?: string;
  blocksWritten?: number;
  error?: string;
}

const CONVERT_SCRIPT_RELATIVE = path.join("docx", "scripts", "convert.py");

/** convert.py 절대 경로를 확정한다. */
export function resolveDocxConvertScriptPath(): string | null {
  return resolveSkillScriptPath(CONVERT_SCRIPT_RELATIVE);
}

/**
 * docx 스킬(convert.py)을 실행하여 마크다운을 Word 문서로 렌더링한다.
 */
export async function runDocxSkillConvert(payload: DocxSkillPayload): Promise<DocxSkillResult> {
  const scriptPath = resolveDocxConvertScriptPath();
  if (!scriptPath) {
    throw new Error("docx 스킬 스크립트를 찾을 수 없습니다: skills/docx/scripts/convert.py");
  }
  console.log(`[docx-skill] convert.py 경로: ${scriptPath}`);

  return runPythonScriptJson<DocxSkillResult>(scriptPath, payload, "docx-skill");
}
