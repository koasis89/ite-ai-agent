/**
 * xlsx 스킬 실행 러너 — skills/xlsx/scripts/convert.py 브릿지
 *
 * Electron xlsx executor가 표준 양식 템플릿에 데이터를 바인딩할 때,
 * ExcelJS 내장 바인더 대신 로컬 xlsx 스킬(openpyxl 기반 convert.py)을 spawn하여 실행한다.
 *
 * ADR-001 불변 규칙 #2: spawnSync / stdio:'inherit' 금지 — spawn 비동기로만 실행.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

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
}

/** convert.py 실행 페이로드 */
export interface XlsxSkillPayload {
  templatePath: string;
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

/** skills 디렉토리를 탐색한다(패키징/개발 환경 모두 대응). */
function resolveSkillsDir(): string | null {
  const candidates = [
    path.join(app.getAppPath(), "..", "skills"),
    path.join(app.getAppPath(), "skills"),
    path.join(process.cwd(), "skills"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** convert.py 절대 경로를 확정한다. */
export function resolveConvertScriptPath(): string | null {
  const skillsDir = resolveSkillsDir();
  if (!skillsDir) return null;
  const scriptPath = path.join(skillsDir, CONVERT_SCRIPT_RELATIVE);
  return existsSync(scriptPath) ? scriptPath : null;
}

/** 사용 가능한 python 실행 명령/경로를 우선순위대로 반환한다.
 *
 * 우선순위:
 *   1. OMX_PYTHON 환경변수
 *      - 절대/상대 경로면 실제 존재하는 파일일 때만 채택
 *      - 그 외에는 PATH에서 찾는 명령어명으로 취급
 *   2. 패키징 배포 시 동봉된 런타임(resources/python/…)
 *   3. 시스템 PATH의 표준 python 명령
 */
function pythonCandidates(): string[] {
  const candidates: string[] = [];

  const fromEnv = process.env.OMX_PYTHON?.trim();
  if (fromEnv) {
    // 경로 구분자가 포함되어 있으면 실행 파일 경로로 간주하고 존재할 때만 사용
    const looksLikePath = /[\\/]/.test(fromEnv);
    if (looksLikePath) {
      if (existsSync(fromEnv)) candidates.push(fromEnv);
    } else {
      candidates.push(fromEnv); // 명령어명(python311 등)
    }
  }

  // 패키징 배포 시 동봉 python 런타임(extraResources로 resources/python 배치 가정)
  for (const bundled of bundledPythonPaths()) {
    if (existsSync(bundled)) candidates.push(bundled);
  }

  const base = process.platform === "win32"
    ? ["python", "py", "python3"]
    : ["python3", "python"];
  candidates.push(...base);

  // 중복 제거(순서 보존)
  return [...new Set(candidates)];
}

/** 패키징 배포 시 동봉될 수 있는 python 실행 파일 후보 경로. */
function bundledPythonPaths(): string[] {
  const resourcesDir = process.resourcesPath;
  if (!resourcesDir || !app.isPackaged) return [];

  const exe = process.platform === "win32" ? "python.exe" : "python3";
  return [
    path.join(resourcesDir, "python", exe),
    path.join(resourcesDir, "python", "bin", exe),
  ];
}

/** stderr에서 openpyxl 등 필수 의존성 누락을 감지해 실행 가능한 안내로 변환한다. */
function describeDependencyError(stderr: string): string | null {
  if (/No module named ['"]?openpyxl/i.test(stderr)) {
    return "xlsx 스킬 실행에 필요한 Python 패키지 'openpyxl'이 없습니다. 'pip install openpyxl'로 설치하거나 OMX_PYTHON으로 openpyxl이 설치된 파이썬 경로를 지정하세요.";
  }
  return null;
}

/** 단일 python 명령으로 convert.py를 spawn하여 실행한다. */
function runConvertOnce(
  pythonCmd: string,
  scriptPath: string,
  payloadPath: string,
): Promise<{ spawnFailed: boolean; result?: XlsxSkillResult; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(pythonCmd, [scriptPath, payloadPath], {
      cwd: path.dirname(scriptPath),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let spawnFailed = false;

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      // ENOENT 등: 해당 python 명령이 없음 → 다음 후보로 폴백
      spawnFailed = (err as NodeJS.ErrnoException).code === "ENOENT";
      resolve({ spawnFailed, stderr: stderr || String(err) });
    });

    child.on("close", () => {
      const lastLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .pop();

      if (!lastLine) {
        resolve({ spawnFailed: false, stderr });
        return;
      }

      try {
        const result = JSON.parse(lastLine) as XlsxSkillResult;
        resolve({ spawnFailed: false, result, stderr });
      } catch {
        resolve({ spawnFailed: false, stderr: stderr || `JSON 파싱 실패: ${lastLine}` });
      }
    });
  });
}

/**
 * xlsx 스킬(convert.py)을 실행하여 템플릿에 데이터를 바인딩한다.
 * python 후보를 순서대로 시도하며, 모두 실패하면 명확한 오류를 던진다.
 */
export async function runXlsxSkillConvert(payload: XlsxSkillPayload): Promise<XlsxSkillResult> {
  const scriptPath = resolveConvertScriptPath();
  if (!scriptPath) {
    throw new Error("xlsx 스킬 스크립트를 찾을 수 없습니다: skills/xlsx/scripts/convert.py");
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omx-xlsx-"));
  const payloadPath = path.join(tmpDir, "payload.json");
  await writeFile(payloadPath, JSON.stringify(payload), "utf-8");

  try {
    let lastStderr = "";
    let anyPythonRan = false;
    for (const pythonCmd of pythonCandidates()) {
      const { spawnFailed, result, stderr } = await runConvertOnce(pythonCmd, scriptPath, payloadPath);
      if (spawnFailed) {
        lastStderr = stderr;
        continue; // 다음 python 후보 시도
      }
      anyPythonRan = true;
      if (result) return result;
      lastStderr = stderr;

      // 의존성 누락(openpyxl 등)은 다른 python 후보로도 동일할 가능성이 높으므로 명확히 안내
      const depError = describeDependencyError(stderr);
      if (depError) throw new Error(depError);

      break; // python은 실행됐으나 결과 파싱 실패 → 재시도 무의미
    }

    if (!anyPythonRan) {
      throw new Error(
        "xlsx 스킬 실행에 필요한 Python을 찾을 수 없습니다. Python 3(및 openpyxl)을 설치하거나 OMX_PYTHON 환경변수로 파이썬 실행 파일 경로를 지정하세요.",
      );
    }

    const depError = describeDependencyError(lastStderr);
    throw new Error(depError ?? `xlsx 스킬 실행 실패. 마지막 stderr: ${lastStderr || "(없음)"}`);
  } finally {
    await unlink(payloadPath).catch(() => undefined);
  }
}
