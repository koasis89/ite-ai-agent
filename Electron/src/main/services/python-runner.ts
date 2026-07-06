/**
 * Python 스킬 실행 공유 유틸 — skills/<name>/scripts/*.py spawn 브릿지 공통 로직
 *
 * xlsx / docx 등 여러 스킬 러너가 공유하는 파이썬 실행 파일 해석, 스크립트 경로 탐색,
 * spawn 실행, 결과 JSON 파싱, 의존성 오류 감지를 담당한다.
 *
 * ADR-001 불변 규칙 #2: spawnSync / stdio:'inherit' 금지 — spawn 비동기로만 실행.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

/** skills 디렉토리를 탐색한다(패키징/개발 환경 모두 대응). */
export function resolveSkillsDir(): string | null {
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

/** skills 하위의 스크립트 절대 경로를 확정한다(예: "xlsx/scripts/convert.py"). */
export function resolveSkillScriptPath(relativeScriptPath: string): string | null {
  const skillsDir = resolveSkillsDir();
  if (!skillsDir) return null;
  const scriptPath = path.join(skillsDir, relativeScriptPath);
  return existsSync(scriptPath) ? scriptPath : null;
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

/** 사용 가능한 python 실행 명령/경로를 우선순위대로 반환한다.
 *
 * 우선순위:
 *   1. OMX_PYTHON 환경변수
 *      - 절대/상대 경로면 실제 존재하는 파일일 때만 채택
 *      - 그 외에는 PATH에서 찾는 명령어명으로 취급
 *   2. 패키징 배포 시 동봉된 런타임(resources/python/…)
 *   3. 시스템 PATH의 표준 python 명령
 */
export function pythonCandidates(): string[] {
  const candidates: string[] = [];

  const fromEnv = process.env.OMX_PYTHON?.trim();
  if (fromEnv) {
    const looksLikePath = /[\\/]/.test(fromEnv);
    if (looksLikePath) {
      if (existsSync(fromEnv)) candidates.push(fromEnv);
    } else {
      candidates.push(fromEnv);
    }
  }

  for (const bundled of bundledPythonPaths()) {
    if (existsSync(bundled)) candidates.push(bundled);
  }

  const base = process.platform === "win32"
    ? ["python", "py", "python3"]
    : ["python3", "python"];
  candidates.push(...base);

  return [...new Set(candidates)];
}

/** stderr에서 필수 파이썬 패키지 누락을 감지해 실행 가능한 안내로 변환한다. */
export function describeMissingModuleError(stderr: string): string | null {
  const match = stderr.match(/No module named ['"]?([A-Za-z0-9_.]+)['"]?/);
  if (!match) return null;
  const moduleName = match[1];
  return `Python 스킬 실행에 필요한 패키지 '${moduleName}'이(가) 없습니다. 'pip install ${moduleName}'로 설치하거나 OMX_PYTHON으로 해당 패키지가 설치된 파이썬 경로를 지정하세요.`;
}

/** 파이썬 스크립트 실행 결과(JSON) 공통 형태. */
export interface PythonScriptResult {
  status: "success" | "error" | string;
  error?: string;
  [key: string]: unknown;
}

/** 단일 python 명령으로 스크립트를 spawn하여 실행한다. */
function runScriptOnce<T extends PythonScriptResult>(
  pythonCmd: string,
  scriptPath: string,
  payloadPath: string,
): Promise<{ spawnFailed: boolean; result?: T; stderr: string }> {
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
        const result = JSON.parse(lastLine) as T;
        resolve({ spawnFailed: false, result, stderr });
      } catch {
        resolve({ spawnFailed: false, stderr: stderr || `JSON 파싱 실패: ${lastLine}` });
      }
    });
  });
}

/**
 * 파이썬 스크립트를 실행하여 JSON 결과를 반환한다.
 * python 후보를 순서대로 시도하며, 모두 실패하면 명확한 오류를 던진다.
 *
 * @param scriptPath  실행할 .py 절대 경로
 * @param payload     JSON 직렬화하여 임시 파일로 전달할 페이로드
 * @param label       로그 접두사(예: "xlsx-skill")
 */
export async function runPythonScriptJson<T extends PythonScriptResult>(
  scriptPath: string,
  payload: unknown,
  label: string,
): Promise<T> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omx-pyskill-"));
  const payloadPath = path.join(tmpDir, "payload.json");
  await writeFile(payloadPath, JSON.stringify(payload), "utf-8");

  try {
    let lastStderr = "";
    let anyPythonRan = false;

    for (const pythonCmd of pythonCandidates()) {
      const { spawnFailed, result, stderr } = await runScriptOnce<T>(pythonCmd, scriptPath, payloadPath);
      if (spawnFailed) {
        lastStderr = stderr;
        continue;
      }
      anyPythonRan = true;
      if (result) {
        console.log(`[${label}] python 실행 성공: ${pythonCmd} → status=${result.status}`);
        return result;
      }
      lastStderr = stderr;

      const depError = describeMissingModuleError(stderr);
      if (depError) throw new Error(depError);

      break;
    }

    if (!anyPythonRan) {
      throw new Error(
        `${label} 실행에 필요한 Python을 찾을 수 없습니다. Python 3(및 필요한 패키지)을 설치하거나 OMX_PYTHON 환경변수로 파이썬 실행 파일 경로를 지정하세요.`,
      );
    }

    const depError = describeMissingModuleError(lastStderr);
    throw new Error(depError ?? `${label} 실행 실패. 마지막 stderr: ${lastStderr || "(없음)"}`);
  } finally {
    await unlink(payloadPath).catch(() => undefined);
  }
}
