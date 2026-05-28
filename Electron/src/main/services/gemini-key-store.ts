/**
 * Gemini API Key 안전 저장소
 *
 * Electron safeStorage를 사용해 OS 네이티브 키체인에 암호화 저장한다.
 *   - Windows: DPAPI
 *   - macOS: Keychain
 *   - Linux: libsecret
 *
 * 환경 변수 fallback:
 *   safeStorage 파일이 없으면 process.env.GEMINI_API_KEY를 폴백으로 사용한다.
 *   이를 통해 개발 환경에서 .env 파일 키를 직접 사용할 수 있다.
 */

import { safeStorage, app } from "electron";
import { existsSync, readFileSync, writeFileSync, statSync } from "fs";
import path from "path";

// KEY_FILE 경로는 app이 준비된 후 처음 호출될 때 결정됨
function getKeyFilePath(): string {
  return path.join(app.getPath("userData"), "gemini-key.bin");
}

/**
 * Gemini API 키를 OS 키체인에 암호화 저장한다.
 * @throws OS 암호화를 사용할 수 없는 경우
 */
export function saveGeminiApiKey(plaintext: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS 키체인 암호화를 사용할 수 없습니다 (safeStorage unavailable)");
  }
  const encrypted = safeStorage.encryptString(plaintext);
  writeFileSync(getKeyFilePath(), encrypted);
}

/**
 * 저장된 Gemini API 키를 복호화해 반환한다.
 * - 저장 파일이 없거나 비어있으면 process.env.GEMINI_API_KEY 폴백 사용
 * - 복호화 실패 시 null 반환
 */
export function loadGeminiApiKey(): string | null {
  const keyFile = getKeyFilePath();

  // 파일이 없으면 환경 변수 폴백
  if (!existsSync(keyFile)) {
    return process.env["GEMINI_API_KEY"] ?? null;
  }

  // 파일이 비어있으면 (clear 후 상태) 환경 변수 폴백
  const stat = statSync(keyFile);
  if (stat.size === 0) {
    return process.env["GEMINI_API_KEY"] ?? null;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  try {
    const encrypted = readFileSync(keyFile);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

/**
 * 저장된 Gemini API 키를 삭제한다.
 * 파일 내용을 빈 버퍼로 초기화 (존재 여부 은닉 방지).
 */
export function clearGeminiApiKey(): void {
  const keyFile = getKeyFilePath();
  if (existsSync(keyFile)) {
    writeFileSync(keyFile, Buffer.alloc(0));
  }
}

/**
 * API 키 유효성을 형식으로 검사한다.
 * Google Gemini 키는 "AIzaSy" 접두사로 시작하고 39자 이상이다.
 */
export function isValidGeminiKeyFormat(key: string): boolean {
  return key.startsWith("AIzaSy") && key.length >= 39;
}
