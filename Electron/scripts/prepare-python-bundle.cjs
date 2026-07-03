#!/usr/bin/env node
// @ts-check
"use strict";

/**
 * prepare-python-bundle.cjs
 *
 * electron-builder 의 extraResources(`build/python` → `resources/python`)를 위한
 * 준비 스크립트. 패키징 전에 실행되어 다음 중 하나를 수행한다.
 *
 *   1) OMX_BUNDLE_PYTHON_DIR 이 지정되고 존재하면 → 해당 파이썬 런타임을
 *      build/python 으로 복사한다(임베디드 파이썬 동봉).
 *   2) 지정되지 않으면 → build/python 을 placeholder 로만 생성한다.
 *      (electron-builder 의 from 경로 누락 오류 방지용. 런타임에는
 *       resolve 우선순위상 시스템 PATH / OMX_PYTHON 으로 폴백된다.)
 *
 * 임베디드 파이썬을 동봉하려면 openpyxl 이 설치된 파이썬 런타임 디렉터리를
 * 준비한 뒤 아래처럼 실행한다.
 *
 *   Windows (예: python-embed 에 python.exe + Lib/openpyxl 배치):
 *     $env:OMX_BUNDLE_PYTHON_DIR = "C:\\path\\to\\python-embed"
 *     npm run package:electron:win
 *
 *   macOS/Linux:
 *     export OMX_BUNDLE_PYTHON_DIR=/path/to/python-runtime
 *     npm run package:electron:linux
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const targetDir = path.join(repoRoot, "build", "python");
const sourceDir = process.env.OMX_BUNDLE_PYTHON_DIR;

/** @param {string} dir */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {string} src
 * @param {string} dst
 */
function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dst);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }
  fs.copyFileSync(src, dst);
}

function main() {
  // 이전 빌드 잔여물 정리 후 새로 준비.
  fs.rmSync(targetDir, { recursive: true, force: true });
  ensureDir(targetDir);

  if (sourceDir && sourceDir.trim().length > 0) {
    const resolvedSource = path.resolve(sourceDir);
    if (!fs.existsSync(resolvedSource)) {
      console.error(
        `[prepare-python-bundle] OMX_BUNDLE_PYTHON_DIR 경로를 찾을 수 없습니다: ${resolvedSource}`,
      );
      process.exit(1);
    }
    console.log(`[prepare-python-bundle] 파이썬 런타임 동봉: ${resolvedSource} → ${targetDir}`);
    copyRecursive(resolvedSource, targetDir);
    return;
  }

  // placeholder: 임베디드 파이썬 미동봉. 런타임은 OMX_PYTHON / 시스템 PATH 로 폴백.
  const readme = [
    "# Python 번들 placeholder",
    "",
    "이 디렉터리는 electron-builder 의 extraResources 경로 누락을 막기 위한 placeholder 입니다.",
    "임베디드 파이썬을 동봉하려면 OMX_BUNDLE_PYTHON_DIR 환경변수에 openpyxl 이 설치된",
    "파이썬 런타임 디렉터리를 지정한 뒤 package:electron 을 실행하세요.",
    "",
    "미동봉 시 앱은 OMX_PYTHON 환경변수 또는 시스템 PATH 의 python/py/python3 를 사용합니다.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(targetDir, "README.md"), readme, "utf8");
  console.log(
    "[prepare-python-bundle] OMX_BUNDLE_PYTHON_DIR 미지정 — placeholder 생성 (런타임은 OMX_PYTHON/시스템 PATH 사용).",
  );
}

main();
