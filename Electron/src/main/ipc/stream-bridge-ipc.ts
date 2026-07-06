/**
 * EL-213: Ndjson 스트림 브릿지 IPC
 *
 * Electron Main Process에서 omx 에이전트 스트리밍 세션을 관리하고,
 * 파싱된 StreamEnvelope를 적절한 IPC 채널로 Renderer에 브로드캐스트한다.
 *
 * IPC 핸들러:
 *   omx:agent-stream:start  — 에이전트 스트리밍 세션 시작
 *   omx:agent-stream:stop   — 에이전트 스트리밍 세션 중단
 *
 * Renderer 전송 채널:
 *   omx:stream-thinking      — 사고 과정 토큰 (reasoning)
 *   omx:stream-token         — 결과 텍스트 토큰 (content)
 *   omx:stream-tool-call     — 도구 호출 이벤트
 *   omx:stream-tool-result   — 도구 결과 이벤트
 *   omx:stream-interlude     — 사용자 응답 대기
 *   omx:stream-done          — 스트림 종료
 *   omx:stream-error         — 파이프라인 에러
 *
 * ADR-001 불변 규칙 #2: spawn 비동기만 허용.
 */

import { ipcMain, BrowserWindow } from "electron";
import { app } from "electron";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  createStreamParser,
  createCodexStreamParser,
  STREAM_THINKING_CHANNEL,
  STREAM_TOKEN_CHANNEL,
  STREAM_TOOL_CALL_CHANNEL,
  STREAM_TOOL_RESULT_CHANNEL,
  STREAM_INTERLUDE_CHANNEL,
  STREAM_DONE_CHANNEL,
  STREAM_ERROR_CHANNEL,
  type StreamParser,
  type CodexStreamParser,
} from "../cli/stream-parser";
import { executeCommand, type ExecuteCommandHandle } from "../core/execute-command";
import type { ReasoningEffort } from "../cli/constants";
import { loadGeminiApiKey } from "../services/gemini-key-store";
import { sessionLogger } from "../logs/session-logger";
import { pushTodoState, type TodoState, type TodoStatus } from "./state-ipc";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

export const AGENT_STREAM_START_CHANNEL = "omx:agent-stream:start";
export const AGENT_STREAM_STOP_CHANNEL = "omx:agent-stream:stop";

// ─── 세션 상태 ────────────────────────────────────────────────────────────────

interface ActiveSession {
  handle: ExecuteCommandHandle;
  parser: StreamParser | CodexStreamParser;
}

let _activeSession: ActiveSession | null = null;
let _geminiAbortController: AbortController | null = null;
let _ollamaAbortController: AbortController | null = null;

// ─── 브로드캐스트 헬퍼 ────────────────────────────────────────────────────────

/**
 * 살아있는 모든 BrowserWindow의 Renderer로 페이로드를 브로드캐스트한다.
 * 파괴된(destroyed) 윈도우는 건너뜀.
 */
function broadcastToRenderers(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function sanitizeTodoStatus(status: unknown): TodoStatus {
  if (status === "in-progress" || status === "completed" || status === "not-started") {
    return status;
  }
  return "not-started";
}

function normalizeTodoState(candidate: unknown): TodoState | null {
  if (!candidate || typeof candidate !== "object") return null;
  const raw = candidate as Record<string, unknown>;
  if (!Array.isArray(raw.todoList)) return null;

  const todoList = raw.todoList
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => {
      const idRaw = item.id;
      const id = typeof idRaw === "number"
        ? idRaw
        : (typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : index + 1);
      return {
        id: Number.isFinite(id) ? id : index + 1,
        title: typeof item.title === "string" ? item.title : "",
        status: sanitizeTodoStatus(item.status),
      };
    });

  return { todoList };
}

function extractTodoStateFromToolCall(toolName: string, args: unknown): TodoState | null {
  if (!toolName.toLowerCase().includes("manage_todo_list")) {
    return null;
  }

  const parsedArgs = parseMaybeJson(args);
  const asObj = (parsedArgs && typeof parsedArgs === "object")
    ? (parsedArgs as Record<string, unknown>)
    : null;

  const candidates: unknown[] = [
    parsedArgs,
    asObj?.parameters,
    asObj?.input,
    asObj?.arguments,
    asObj?.payload,
  ];

  for (const candidate of candidates) {
    const todo = normalizeTodoState(parseMaybeJson(candidate));
    if (todo) return todo;
  }

  return null;
}

function applyTodoUpdateFromToolCall(toolName: string, args: unknown): void {
  const todoState = extractTodoStateFromToolCall(toolName, args);
  if (todoState) {
    pushTodoState(todoState);
  }
}

// ─── 템플릿 참조 주입 (Gemini 직접 경로 전용) ────────────────────────────────

/** 로컬 templates 디렉토리를 탐색한다(패키징/개발 환경 모두 대응). */
function resolveTemplatesDir(): string | null {
  const candidates = [
    path.join(app.getAppPath(), "..", "templates"),
    path.join(app.getAppPath(), "templates"),
    path.join(process.cwd(), "templates"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 프롬프트에 등장하는 `templates/....md` 참조를 감지해 실제 파일 내용을 프롬프트 앞에 주입한다.
 *
 * Gemini 직접 API 경로는 로컬 파일에 접근할 수 없으므로, 참조된 표준 산출물 템플릿(.md)의
 * 구조(예: 공수산정 [18]~[21] 표 형식)를 모델이 알 수 있도록 여기서 내용을 함께 전달한다.
 * exec(codex/omx) 경로는 파일 도구가 있으므로 이 주입을 적용하지 않는다.
 */
function injectTemplateReferences(prompt: string): string {
  const templatesDir = resolveTemplatesDir();
  if (!templatesDir) return prompt;

  // `templates/<...>.md` 형태의 상대 경로 참조를 모두 수집(중복 제거)
  const refRegex = /templates\/[^\s`"'()]+?\.md/gi;
  const matches = [...new Set(prompt.match(refRegex) ?? [])];
  if (matches.length === 0) return prompt;

  const blocks: string[] = [];
  for (const ref of matches) {
    // "templates/" 접두어 이후의 상대 경로를 templatesDir 기준으로 해석
    const relative = ref.replace(/^templates[\\/]/i, "");
    const absolute = path.join(templatesDir, relative);
    if (!existsSync(absolute)) continue;
    try {
      const content = readFileSync(absolute, "utf-8");
      blocks.push(`### 참조 템플릿: ${ref}\n\n${content}`);
    } catch (err) {
      sessionLogger.logSystemMessage(`템플릿 참조 읽기 실패(${ref}): ${String(err)}`);
    }
  }

  if (blocks.length === 0) return prompt;

  return [
    "다음은 참조해야 할 표준 산출물 템플릿의 실제 내용이다.",
    "아래 템플릿의 섹션 구성·표 헤더·열 순서·ID 체계를 정확히 그대로 따라 산출물을 작성하라.",
    "",
    blocks.join("\n\n---\n\n"),
    "",
    "─".repeat(20),
    "",
    prompt,
  ].join("\n");
}

// ─── 로컬 Ollama 모델 식별 ────────────────────────────────────────────────────

/** 모델 선택기의 Ollama 그룹에 등록된 모델 ID 집합. */
const OLLAMA_MODEL_IDS = new Set([
  "custom-gemma4:31b",
  "gemma4:31b",
  "gemma4:26b",
  "gemma4:latest",
  "qwen3.5:latest",
]);

/** Ollama GPU 서버 베이스 URL(OpenAI 호환). 환경변수로 재정의 가능. */
function resolveOllamaBaseUrl(): string {
  return process.env["OMX_OLLAMA_BASE_URL"] ?? "http://aic.iteyes.io:11434";
}

function isOllamaModel(model?: string): boolean {
  return typeof model === "string" && OLLAMA_MODEL_IDS.has(model);
}

// ─── 로컬 Ollama 직접 API 스트리밍 (OpenAI 호환 /v1/chat/completions) ──────────

async function streamOllamaDirect(
  model: string,
  prompt: string,
  signal: AbortSignal,
): Promise<void> {
  const url = `${resolveOllamaBaseUrl().replace(/\/+$/, "")}/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      sessionLogger.logError(`Ollama API error ${response.status}: ${errText}`);
      broadcastToRenderers(STREAM_ERROR_CHANNEL, {
        message: `Ollama API 오류 ${response.status}: ${errText}`,
      });
      broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const text = parsed?.choices?.[0]?.delta?.content;
          if (text) {
            sessionLogger.logLlmResponseToken(text);
            broadcastToRenderers(STREAM_TOKEN_CHANNEL, { text });
          }
        } catch {
          // malformed SSE line — ignore
        }
      }
    }

    sessionLogger.flushLlmResponse();
    broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 0 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return;
    const msg = e instanceof Error ? e.message : String(e);
    sessionLogger.logError(`Ollama stream error: ${msg}`);
    broadcastToRenderers(STREAM_ERROR_CHANNEL, { message: `Ollama 연결 실패: ${msg}` });
    broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
  } finally {
    _ollamaAbortController = null;
  }
}

// ─── Gemini 직접 API 스트리밍 ─────────────────────────────────────────────────

async function streamGeminiDirect(
  model: string,
  apiKey: string,
  prompt: string,
  signal: AbortSignal,
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      sessionLogger.logError(`Gemini API error ${response.status}: ${errText}`);
      broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            sessionLogger.logLlmResponseToken(text);
            broadcastToRenderers(STREAM_TOKEN_CHANNEL, { text });
          }
        } catch {
          // malformed SSE line — ignore
        }
      }
    }

    sessionLogger.flushLlmResponse();
    broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 0 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return;
    const msg = e instanceof Error ? e.message : String(e);
    sessionLogger.logError(`Gemini stream error: ${msg}`);
    broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
  } finally {
    _geminiAbortController = null;
  }
}

// ─── 스트리밍 세션 시작 ───────────────────────────────────────────────────────

/**
 * omx 에이전트 스트리밍 세션을 시작한다.
 *
 * @param command          omx 서브커맨드 ("ask" | "sparkshell")
 * @param args             추가 인자
 * @param reasoningEffort  추론 강도
 * @param provider         LLM 프로바이더 ("claude" | "gemini"). ask 커맨드 기본값: "claude"
 * @param model            모델 ID. "echo" / "echo-reverse"는 로컬 테스트 처리.
 * @param persona          역할 페르소나 ID (prompts/{persona}.md). 제공 시 exec 메시지에 역할 지시를 주입.
 */
export function startAgentStream(
  command: string,
  args: string[],
  reasoningEffort: ReasoningEffort = "standard",
  provider?: string,
  model?: string,
  persona?: string,
): void {
  // 기존 세션 정리
  if (_activeSession) {
    stopAgentStream();
  }

  // ─── LLM 요청 로그 기록 ───────────────────────────────────────────────────
  // echo/echo-reverse 테스트 모델은 실제 LLM 호출이 아니므로 제외
  if (model !== "echo" && model !== "echo-reverse") {
    sessionLogger.logLlmRequest(args[0] ?? "", model);
  }

  // ─── echo / echo-reverse 테스트 모델 (로컈, 네트워크 미사용) ───────────────────
  if (model === "echo" || model === "echo-reverse") {
    const inputText = args[0] ?? "";
    const responseText =
      model === "echo-reverse" ? [...inputText].reverse().join("") : inputText;

    // 문자 단위로 20 ms 간격 스트리밍
    let i = 0;
    const interval = setInterval(() => {
      if (i < responseText.length) {
        broadcastToRenderers(STREAM_TOKEN_CHANNEL, { text: responseText[i] });
        i++;
      } else {
        clearInterval(interval);
        broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 0 });
      }
    }, 20);
    return;
  }

  // ─── 로컬 Ollama 모델 직접 API 경로 (OpenAI 호환) ──────────────────────────
  if (isOllamaModel(model)) {
    const abort = new AbortController();
    _ollamaAbortController = abort;
    const ollamaPrompt = injectTemplateReferences(args[0] ?? "");
    void streamOllamaDirect(model as string, ollamaPrompt, abort.signal);
    return;
  }

  // ─── Gemini 모델 직접 API 경로 ─────────────────────────────────────────────
  const isGemini = (typeof model === "string" && model.startsWith("gemini-")) || provider === "gemini";
  if (isGemini) {
    const apiKey = loadGeminiApiKey();
    if (!apiKey) {
      sessionLogger.logError("GEMINI_API_KEY not configured");
      broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
      return;
    }
    const abort = new AbortController();
    _geminiAbortController = abort;
    const geminiPrompt = injectTemplateReferences(args[0] ?? "");
    void streamGeminiDirect(model ?? "gemini-2.5-flash", apiKey, geminiPrompt, abort.signal);
    return;
  }

  // ─── exec 커맨드 전용 경로 (codex exec --json) ──────────────────────────────
  if (command === "exec") {
    // omx exec --json --ephemeral --skip-git-repo-check -C . "message"
    // --json: codex-rs JSONL 이벤트 스트리밍 (--stream-json과 다름)
    // --ephemeral: 세션 파일 디스크 미저장
    // --skip-git-repo-check: git 저장소 체크 생략
    const modelArgs = model && model !== "auto" ? ["--model", model] : [];
    // 페르소나 선택 시 역할 프롬프트(prompts/{persona}.md)를 따르도록 메시지에 지시 주입
    const personaArgs =
      persona && args.length > 0
        ? [`prompts/${persona}.md 의 역할 페르소나로서 응답해줘.\n\n${args[0]}`, ...args.slice(1)]
        : args;
    const execArgs = ["--json", "--ephemeral", "--skip-git-repo-check", "-C", ".", ...modelArgs, ...personaArgs];

    const execHandle = executeCommand({
      command: "exec",
      provider: undefined,
      args: execArgs,
      streamJson: false, // --stream-json 미사용. codex JSONL은 --json 플래그 사용
      reasoningEffort,
      // onRawLine 미제공: execute-command의 StreamEnvelope 필터에서 걸린
      // codex 이벤트(VALID_STREAM_TYPES 미등록)를 에러로 브로드캐스트하지 않기 위함
      onError: (errText) => {
        sessionLogger.logSystemMessage(errText);
      },
    });

    const codexParser = createCodexStreamParser(execHandle.child, {
      onAgentInit: (e) => broadcastToRenderers("omx:stream-agent-init", e),
      onThinkingToken: (e) => broadcastToRenderers(STREAM_THINKING_CHANNEL, e),
      onContentToken: (e) => {
        sessionLogger.logLlmResponseToken(e.text);
        broadcastToRenderers(STREAM_TOKEN_CHANNEL, e);
      },
      onToolCall: (e) => {
        sessionLogger.logToolCall(e.toolName, e.args);
        applyTodoUpdateFromToolCall(e.toolName, e.args);
        broadcastToRenderers(STREAM_TOOL_CALL_CHANNEL, e);
      },
      onToolResult: (e) => broadcastToRenderers(STREAM_TOOL_RESULT_CHANNEL, e),
      onInterlude: (e) => broadcastToRenderers(STREAM_INTERLUDE_CHANNEL, e),
      onDone: (e) => {
        sessionLogger.flushLlmResponse();
        broadcastToRenderers(STREAM_DONE_CHANNEL, e);
        _activeSession = null;
      },
      onStreamError: (e) => {
        sessionLogger.logError(e.message);
        // 실패 원인을 Renderer로 전달하여 "Stream finished." 대신 표시되도록 함
        broadcastToRenderers(STREAM_ERROR_CHANNEL, { message: e.message });
      },
      onRawLine: (line) => {
        sessionLogger.logSystemMessage(line);
      },
    });

    _activeSession = { handle: execHandle, parser: codexParser };

    execHandle.exitCode
      .then(() => {
        if (_activeSession) {
          sessionLogger.flushLlmResponse();
          broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 0 });
          _activeSession = null;
        }
      })
      .catch(() => {
        if (_activeSession) {
          sessionLogger.flushLlmResponse();
          broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
          _activeSession = null;
        }
      });

    return;
  }

  // ─── 기존 ask / sparkshell 경로 ────────────────────────────────────────────
  // Gemini 모델 또는 provider=="gemini"  일 경우 API 키 환경변수 주입
  const isGeminiAsk =
    provider === "gemini" ||
    (typeof model === "string" && model.startsWith("gemini-"));
  const geminiKeyAsk = isGeminiAsk ? loadGeminiApiKey() : null;
  const askExtraEnv = geminiKeyAsk ? { GEMINI_API_KEY: geminiKeyAsk } : undefined;

  const handle = executeCommand({
    command,
    // ask 커맨드는 provider가 command 바로 뒤에 필요: omx ask <provider> --stream-json ...
    // 지정 없으면 "claude" 기본값 사용
    provider: command === "ask"
      ? (isGeminiAsk ? "gemini" : (provider ?? "claude"))
      : provider,
    args,
    streamJson: true,
    reasoningEffort,
    extraEnv: askExtraEnv,
    onRawLine: (line) => {
      // 비JSON 로그 → 로그 파일만 기록
      sessionLogger.logSystemMessage(line);
    },
    onError: (errText) => {
      sessionLogger.logSystemMessage(errText);
    },
  });

  const parser = createStreamParser(handle.child, {
    onAgentInit: (e) => broadcastToRenderers("omx:stream-agent-init", e),

    // 사고 과정 → 전용 채널 (UI 오버레이 박스)
    onThinkingToken: (e) => broadcastToRenderers(STREAM_THINKING_CHANNEL, e),

    // 결과 텍스트 → 메인 채팅 채널
    onContentToken: (e) => {
      sessionLogger.logLlmResponseToken(e.text);
      broadcastToRenderers(STREAM_TOKEN_CHANNEL, e);
    },

    onToolCall: (e) => {
      sessionLogger.logToolCall(e.toolName, e.args);
      applyTodoUpdateFromToolCall(e.toolName, e.args);
      broadcastToRenderers(STREAM_TOOL_CALL_CHANNEL, e);
    },
    onToolResult: (e) => broadcastToRenderers(STREAM_TOOL_RESULT_CHANNEL, e),
    onInterlude: (e) => broadcastToRenderers(STREAM_INTERLUDE_CHANNEL, e),
    onDone: (e) => {
      sessionLogger.flushLlmResponse();
      broadcastToRenderers(STREAM_DONE_CHANNEL, e);
      _activeSession = null;
    },
    onStreamError: (e) => {
      sessionLogger.logError(e.message);
    },
    onRawLine: (line) => {
      sessionLogger.logSystemMessage(line);
    },
  });

  _activeSession = { handle, parser };

  // 세션 종료 후 상태 정리 — onDone 미발생 시 fallback done 이벤트 전송
  handle.exitCode
    .then(() => {
      if (_activeSession) {
        sessionLogger.flushLlmResponse();
        broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 0 });
        _activeSession = null;
      }
    })
    .catch(() => {
      if (_activeSession) {
        sessionLogger.flushLlmResponse();
        broadcastToRenderers(STREAM_DONE_CHANNEL, { type: "done", exitCode: 1 });
        _activeSession = null;
      }
    });
}

// ─── 스트리밍 세션 중단 ───────────────────────────────────────────────────────

/**
 * 현재 활성 스트리밍 세션을 강제 종료한다.
 */
export function stopAgentStream(): void {
  if (_geminiAbortController) {
    _geminiAbortController.abort();
    _geminiAbortController = null;
  }
  if (_ollamaAbortController) {
    _ollamaAbortController.abort();
    _ollamaAbortController = null;
  }
  if (!_activeSession) {
    broadcastToRenderers("omx:lifecycle-change", { status: "idle", mergedModes: [], updatedAt: new Date().toISOString() });
    return;
  }

  const { handle, parser } = _activeSession;
  _activeSession = null;

  parser.detach();
  handle.child.kill("SIGTERM");
  broadcastToRenderers("omx:lifecycle-change", { status: "idle", mergedModes: [], updatedAt: new Date().toISOString() });
}

// ─── IPC 핸들러 등록 ──────────────────────────────────────────────────────────

/**
 * Main Process IPC 핸들러를 등록한다.
 * app.whenReady() 이후 한 번만 호출한다.
 */
export function registerStreamBridgeIpc(): void {
  ipcMain.handle(
    AGENT_STREAM_START_CHANNEL,
    (
      _event,
      payload: { command: string; args?: string[]; reasoningEffort?: ReasoningEffort; provider?: string; model?: string; persona?: string },
    ) => {
      const { command, args = [], reasoningEffort = "standard", provider, model, persona } = payload;
      // 스트리밍 시작 → lifecycle 상태를 running으로 즉시 업데이트
      broadcastToRenderers("omx:lifecycle-change", {
        status: "running",
        activeMode: command,
        mergedModes: [command],
        updatedAt: new Date().toISOString(),
      });
      startAgentStream(command, args, reasoningEffort, provider, model, persona);
      return { ok: true };
    },
  );

  ipcMain.handle(AGENT_STREAM_STOP_CHANNEL, () => {
    stopAgentStream();
    return { ok: true };
  });
}

// ─── 테스트용 내부 접근자 ─────────────────────────────────────────────────────

/** @internal 단위 테스트 전용 — 활성 세션 상태 확인 */
export function _getActiveSessionForTest(): ActiveSession | null {
  return _activeSession;
}

/** @internal 단위 테스트 전용 — 세션 상태 초기화 */
export function _resetSessionForTest(): void {
  _activeSession = null;
}
