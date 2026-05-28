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
import {
  createStreamParser,
  createCodexStreamParser,
  STREAM_THINKING_CHANNEL,
  STREAM_TOKEN_CHANNEL,
  STREAM_TOOL_CALL_CHANNEL,
  STREAM_TOOL_RESULT_CHANNEL,
  STREAM_INTERLUDE_CHANNEL,
  STREAM_DONE_CHANNEL,
  type StreamParser,
  type CodexStreamParser,
} from "../cli/stream-parser";
import { executeCommand, type ExecuteCommandHandle } from "../core/execute-command";
import type { ReasoningEffort } from "../cli/constants";
import { loadGeminiApiKey } from "../services/gemini-key-store";
import { sessionLogger } from "../logs/session-logger";

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
 * @param model            모델 ID. "echo" / "echo-reverse"는 로컈 테스트 처리.
 */
export function startAgentStream(
  command: string,
  args: string[],
  reasoningEffort: ReasoningEffort = "standard",
  provider?: string,
  model?: string,
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
    void streamGeminiDirect(model ?? "gemini-2.5-flash", apiKey, args[0] ?? "", abort.signal);
    return;
  }

  // ─── exec 커맨드 전용 경로 (codex exec --json) ──────────────────────────────
  if (command === "exec") {
    // omx exec --json --ephemeral --skip-git-repo-check -C . "message"
    // --json: codex-rs JSONL 이벤트 스트리밍 (--stream-json과 다름)
    // --ephemeral: 세션 파일 디스크 미저장
    // --skip-git-repo-check: git 저장소 체크 생략
    const modelArgs = model && model !== "auto" ? ["--model", model] : [];
    const execArgs = ["--json", "--ephemeral", "--skip-git-repo-check", "-C", ".", ...modelArgs, ...args];

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
  if (!_activeSession) return;

  const { handle, parser } = _activeSession;
  _activeSession = null;

  parser.detach();
  handle.child.kill("SIGTERM");
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
      payload: { command: string; args?: string[]; reasoningEffort?: ReasoningEffort; provider?: string; model?: string },
    ) => {
      const { command, args = [], reasoningEffort = "standard", provider, model } = payload;
      startAgentStream(command, args, reasoningEffort, provider, model);
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
