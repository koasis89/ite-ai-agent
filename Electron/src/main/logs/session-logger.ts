/**
 * EL-LOG: 세션 로거 — LLM 요청/응답, 시스템 메시지, MD 파일 호출 로깅
 *
 * 앱 시작 시 `sessionLogger.init(logDir)` 호출로 초기화.
 * 로그 파일: <logDir>/yymmdd-hhmmss.log (세션당 1개)
 *
 * 로그 항목 종류:
 *   [REQUEST]  — LLM에 전달되는 사용자 메시지
 *   [RESPONSE] — LLM이 반환한 전체 응답 (스트림 완료 시 기록)
 *   [MD_CALL]  — agents / prompts / skills 내 .md 파일 호출
 *   [TOOL]     — 기타 도구 호출 (간략)
 *   [SYSTEM]   — 대화창에 표시되는 시스템 메시지 (SUCCESS 등)
 *   [ERROR]    — 스트림/파이프라인 에러
 */

import * as fs from "fs";
import * as path from "path";

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────

/** "YYYY-MM-DD HH:mm:ss" 형식의 현재 시각 문자열 */
function nowString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** 로그 파일명: "yymmdd-hhmmss.log" */
function makeFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yy}${mm}${dd}-${hh}${min}${ss}.log`;
}

/** args JSON 내부에서 .md 파일 경로 문자열을 모두 찾아 반환 */
function extractMdPaths(args: unknown): string[] {
  const raw = typeof args === "string" ? args : JSON.stringify(args ?? "");
  const results: string[] = [];
  // "..." 또는 '...' 내부에서 .md 로 끝나는 경로 추출
  const re = /["']([^"'\s]+\.md)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    results.push(m[1]);
  }
  // JSON 값으로 키 없이 등장하는 경우 (e.g. {"path": "foo/bar.md"})
  const re2 = /:\s*"([^"]+\.md)"/gi;
  while ((m = re2.exec(raw)) !== null) {
    if (!results.includes(m[1])) results.push(m[1]);
  }
  return results;
}

/** md 파일 경로가 agents / prompts / skills 카테고리에 속하는지 판별 */
function mdCategory(filePath: string): string {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (norm.includes("/agents/")) return "agents";
  if (norm.includes("/prompts/")) return "prompts";
  if (norm.includes("/skills/")) return "skills";
  return "other";
}

/** agents / prompts / skills 관련 md 파일 경로인지 확인 */
function isAssetMdPath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (!norm.endsWith(".md")) return false;
  return (
    norm.includes("/agents/") ||
    norm.includes("/prompts/") ||
    norm.includes("/skills/")
  );
}

// ─── SessionLogger 클래스 ─────────────────────────────────────────────────────

class SessionLogger {
  /** 현재 세션의 로그 파일 절대 경로 (init 후 설정) */
  private logPath: string | null = null;

  /** STREAM_DONE 까지 누적되는 LLM 응답 버퍼 */
  private responseBuffer = "";

  // ─── 초기화 ────────────────────────────────────────────────────────────────

  /**
   * 세션 로거를 초기화한다.
   * `app.whenReady()` 이후, `registerIpc()` 호출 전에 실행한다.
   *
   * @param logDir  로그 디렉터리 절대 경로 (없으면 자동 생성)
   */
  init(logDir: string): void {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logPath = path.join(logDir, makeFilename());
    this.append("=== OMX Desktop Agent — Session Start ===");
  }

  /** 현재 로그 파일 경로를 반환한다 (init 전이면 null). */
  getLogPath(): string | null {
    return this.logPath;
  }

  // ─── 내부 기록 ─────────────────────────────────────────────────────────────

  private append(line: string): void {
    if (!this.logPath) return;
    try {
      fs.appendFileSync(this.logPath, `[${nowString()}] ${line}\n`, "utf8");
    } catch {
      // 로그 기록 실패 시 조용히 무시 (앱 동작 방해 없음)
    }
  }

  // ─── 공개 로그 메서드 ──────────────────────────────────────────────────────

  /**
   * LLM에 전달되는 사용자 요청 메시지를 기록한다.
   * 동시에 이전 응답 버퍼를 초기화하여 새 대화 라운드를 시작한다.
   */
  logLlmRequest(text: string, model?: string): void {
    this.responseBuffer = "";
    const modelTag = model ? ` (model: ${model})` : "";
    this.append(`[REQUEST${modelTag}] ${text}`);
  }

  /**
   * LLM 응답 토큰을 버퍼에 누적한다.
   * `flushLlmResponse()` 호출 전까지 파일에 기록되지 않는다.
   */
  logLlmResponseToken(token: string): void {
    this.responseBuffer += token;
  }

  /**
   * 누적된 LLM 응답 버퍼를 파일에 기록하고 버퍼를 비운다.
   * STREAM_DONE 이벤트 발생 시 호출한다.
   */
  flushLlmResponse(): void {
    if (!this.responseBuffer) return;
    const charCount = this.responseBuffer.length;
    this.append(`[RESPONSE] (${charCount} chars)\n${this.responseBuffer}`);
    this.responseBuffer = "";
  }

  /**
   * 도구 호출 이벤트를 기록한다.
   * agents / prompts / skills 내 .md 파일 호출은 [MD_CALL] 태그로 분류한다.
   */
  logToolCall(toolName: string, args: unknown): void {
    const mdPaths = extractMdPaths(args);

    if (mdPaths.length > 0) {
      for (const mdPath of mdPaths) {
        if (isAssetMdPath(mdPath)) {
          const filename = path.basename(mdPath);
          const category = mdCategory(mdPath);
          this.append(
            `[MD_CALL] tool=${toolName} | file=${filename} | category=${category} | path=${mdPath}`,
          );
        } else {
          // .md 이지만 agents/prompts/skills 외부
          this.append(`[TOOL] ${toolName}(md: ${mdPath})`);
        }
      }
      return;
    }

    // 일반 도구 호출 — args 는 최대 300자로 잘라서 기록
    const argsPreview = JSON.stringify(args ?? null).slice(0, 300);
    this.append(`[TOOL] ${toolName}(${argsPreview})`);
  }

  /**
   * 대화창에 표시되는 시스템 메시지를 기록한다.
   * (STREAM_ERROR_CHANNEL 의 onRawLine / onError 경로)
   */
  logSystemMessage(message: string): void {
    this.append(`[SYSTEM] ${message}`);
  }

  /**
   * 스트림/파이프라인 에러를 기록한다.
   */
  logError(message: string): void {
    this.append(`[ERROR] ${message}`);
  }

  /**
   * 스킬 실행 이벤트를 requestId 기준으로 구조화 기록한다.
   */
  logSkillExecutionEvent(event: Record<string, unknown>): void {
    this.append(`[SKILL_EXEC] ${JSON.stringify(event)}`);
  }

  /**
   * 스킬 감사(audit) 이벤트를 구조화 기록한다.
   */
  logSkillAuditEvent(event: Record<string, unknown>): void {
    this.append(`[SKILL_AUDIT] ${JSON.stringify(event)}`);
  }
}

// ─── 싱글턴 내보내기 ──────────────────────────────────────────────────────────

export const sessionLogger = new SessionLogger();
