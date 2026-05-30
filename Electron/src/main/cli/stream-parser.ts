/**
 * EL-213: Ndjson 스트림 파서 — 클로드 스타일 사고 과정 분기 모듈
 *
 * 자식 프로세스의 stdout(Ndjson 스트림)을 readline 기반으로 실시간 파싱하고,
 * LLM 토큰을 사고 과정(reasoning)과 결과 텍스트(content)로 정밀 분기한다.
 *
 * 핵심 구조:
 *   - createStreamParser(): readline 인터페이스를 child.stdout에 장착
 *   - parseStreamLine():    단일 원시 라인 → StreamEnvelope | null (방어적 파싱)
 *   - StreamParserCallbacks: 각 이벤트 타입별 독립 콜백
 *
 * 방어적 예외 처리 원칙:
 *   - 파싱 실패 라인은 크래시 처리 없이 onRawLine으로 안전 우회
 *   - 파이프라인 전체 다운타임 없이 유효 토큰만 선별
 */

import * as readline from "readline";
import type { ChildProcessWithoutNullStreams } from "child_process";
import {
  VALID_STREAM_TYPES,
  type StreamEnvelope,
  type TokenEnvelope,
  type AgentInitEnvelope,
  type ToolCallEnvelope,
  type ToolResultEnvelope,
  type InterludeEnvelope,
  type DoneEnvelope,
  type ErrorEnvelope,
} from "../cli/constants";

// ─── IPC 채널 상수 ────────────────────────────────────────────────────────────

/** 사고 과정 토큰 브로드캐스트 채널 (reasoning subType) */
export const STREAM_THINKING_CHANNEL = "omx:stream-thinking";

/** 결과 텍스트 토큰 브로드캐스트 채널 (content subType) */
export const STREAM_TOKEN_CHANNEL = "omx:stream-token";

/** 도구 호출 이벤트 채널 */
export const STREAM_TOOL_CALL_CHANNEL = "omx:stream-tool-call";

/** 도구 결과 이벤트 채널 */
export const STREAM_TOOL_RESULT_CHANNEL = "omx:stream-tool-result";

/** 인터류드(사용자 응답 대기) 이벤트 채널 */
export const STREAM_INTERLUDE_CHANNEL = "omx:stream-interlude";

/** 스트림 종료 이벤트 채널 */
export const STREAM_DONE_CHANNEL = "omx:stream-done";

/** 에러 이벤트 채널 */
export const STREAM_ERROR_CHANNEL = "omx:stream-error";

// ─── 콜백 인터페이스 ──────────────────────────────────────────────────────────

export interface StreamParserCallbacks {
  /** 세션 초기화 봉투 수신 */
  onAgentInit?: (envelope: AgentInitEnvelope) => void;
  /** 사고 과정 토큰 수신 (subType: "reasoning") — omx:stream-thinking 채널 */
  onThinkingToken?: (envelope: TokenEnvelope) => void;
  /** 결과 텍스트 토큰 수신 (subType: "content") — omx:stream-token 채널 */
  onContentToken?: (envelope: TokenEnvelope) => void;
  /** 도구 호출 요청 수신 */
  onToolCall?: (envelope: ToolCallEnvelope) => void;
  /** 도구 실행 결과 수신 */
  onToolResult?: (envelope: ToolResultEnvelope) => void;
  /** 사용자 응답 대기 국면 진입 */
  onInterlude?: (envelope: InterludeEnvelope) => void;
  /** 스트림 정상 종료 */
  onDone?: (envelope: DoneEnvelope) => void;
  /** 파이프라인 에러 */
  onStreamError?: (envelope: ErrorEnvelope) => void;
  /** 비JSON / 비표준 라인 (안전 우회 — 콘솔 로그 뷰 라우팅용) */
  onRawLine?: (line: string) => void;
}

// ─── parseStreamLine() ───────────────────────────────────────────────────────

/**
 * 원시 라인 하나를 StreamEnvelope로 파싱한다.
 * 실패 시 null 반환 (크래시 없음).
 *
 * @param raw  stdout에서 수신한 원시 라인 문자열
 * @returns    파싱된 StreamEnvelope 또는 null (비JSON / 비표준 타입)
 */
export function parseStreamLine(raw: string): StreamEnvelope | null {
  const line = raw.trim();
  if (!line) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    typeof (parsed as Record<string, unknown>)["type"] !== "string" ||
    !VALID_STREAM_TYPES.has((parsed as Record<string, unknown>)["type"] as string)
  ) {
    return null;
  }

  return parsed as StreamEnvelope;
}

// ─── StreamParser 클래스 ──────────────────────────────────────────────────────

/**
 * 자식 프로세스 stdout에 readline 파이프라인을 장착하고
 * 수신된 Ndjson 라인을 타입별로 분기하는 파서.
 */
export class StreamParser {
  private rl: readline.Interface | null = null;
  private callbacks: StreamParserCallbacks;

  constructor(callbacks: StreamParserCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 자식 프로세스의 stdout에 readline 파이프라인을 연결한다.
   * @param child  spawn()으로 생성된 자식 프로세스
   */
  attach(child: ChildProcessWithoutNullStreams): void {
    if (this.rl) {
      throw new Error("[StreamParser] 이미 파이프라인이 연결되어 있음. detach() 먼저 호출 필요");
    }

    this.rl = readline.createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    this.rl.on("line", (raw: string) => this._handleLine(raw));
  }

  /**
   * readline 파이프라인을 해제하고 파서를 초기화한다.
   */
  detach(): void {
    this.rl?.close();
    this.rl = null;
  }

  // ─── 내부: 라인 분기 라우터 ──────────────────────────────────────────────

  private _handleLine(raw: string): void {
    const envelope = parseStreamLine(raw);

    if (envelope === null) {
      // 방어적 예외 처리: 비JSON / 비표준 → 콘솔 뷰로 안전 우회
      this.callbacks.onRawLine?.(raw);
      return;
    }

    switch (envelope.type) {
      case "agent_init":
        this.callbacks.onAgentInit?.(envelope);
        break;

      case "token":
        // 클로드 스타일 이중 채널 분기
        if (envelope.subType === "reasoning") {
          this.callbacks.onThinkingToken?.(envelope);
        } else {
          this.callbacks.onContentToken?.(envelope);
        }
        break;

      case "tool_call":
        this.callbacks.onToolCall?.(envelope);
        break;

      case "tool_result":
        this.callbacks.onToolResult?.(envelope);
        break;

      case "interlude":
        this.callbacks.onInterlude?.(envelope);
        break;

      case "done":
        this.callbacks.onDone?.(envelope);
        break;

      case "error":
        this.callbacks.onStreamError?.(envelope);
        break;

      default:
        // exhaustive guard — 컴파일 시점 보장
        this.callbacks.onRawLine?.(raw);
    }
  }
}

// ─── 팩토리 함수 ──────────────────────────────────────────────────────────────

/**
 * StreamParser를 생성하고 즉시 자식 프로세스에 연결한다.
 *
 * @param child      spawn()으로 생성된 자식 프로세스
 * @param callbacks  이벤트별 콜백 맵
 * @returns          연결된 StreamParser 인스턴스
 */
export function createStreamParser(
  child: ChildProcessWithoutNullStreams,
  callbacks: StreamParserCallbacks,
): StreamParser {
  const parser = new StreamParser(callbacks);
  parser.attach(child);
  return parser;
}

// ─── CodexStreamParser ────────────────────────────────────────────────────────

/**
 * codex exec --json JSONL 이벤트 → StreamEnvelope 콜백 어댑터 파서.
 *
 * codex-rs JSONL 이벤트 형식 변환 맵:
 *   thread.started                       → onAgentInit
 *   item.delta (type: "output_text")     → onContentToken
 *   item.delta (type: "reasoning*")      → onThinkingToken
 *   thread.completed                     → onDone (exitCode: 0)
 *   error                                → onStreamError
 *   나머지 (item.started, turn.*, etc.)  → 무시 (정상 동작 이벤트)
 *
 * 주의: execute-command.ts의 readline도 동일 stdout에 연결되지만,
 * codex 이벤트 타입이 VALID_STREAM_TYPES에 없어 onRawLine으로 우회되며
 * onRawLine 미제공 시 무음 처리된다.
 */
export class CodexStreamParser {
  private rl: readline.Interface | null = null;
  private readonly callbacks: StreamParserCallbacks;

  constructor(callbacks: StreamParserCallbacks) {
    this.callbacks = callbacks;
  }

  attach(child: ChildProcessWithoutNullStreams): void {
    if (this.rl) {
      throw new Error("[CodexStreamParser] 이미 연결됨. detach() 먼저 호출 필요");
    }
    this.rl = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    this.rl.on("line", (raw: string) => this._handleLine(raw));
  }

  detach(): void {
    this.rl?.close();
    this.rl = null;
  }

  private _handleLine(raw: string): void {
    const line = raw.trim();
    if (!line) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      this.callbacks.onRawLine?.(raw);
      return;
    }

    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
      this.callbacks.onRawLine?.(raw);
      return;
    }

    const ev = parsed as Record<string, unknown>;
    const type = ev["type"] as string;

    switch (type) {
      case "thread.started": {
        const envelope: AgentInitEnvelope = {
          type: "agent_init",
          sessionId: (ev["thread_id"] as string | undefined) ?? "",
          model: "",
        };
        this.callbacks.onAgentInit?.(envelope);
        break;
      }

      case "item.delta": {
        const item = ev["item"] as Record<string, unknown> | undefined;
        if (!item) break;
        const delta = item["delta"];
        if (typeof delta !== "string") break;
        const itemType = item["type"] as string | undefined;
        if (itemType === "output_text") {
          const envelope: TokenEnvelope = { type: "token", subType: "content", text: delta };
          this.callbacks.onContentToken?.(envelope);
        } else if (typeof itemType === "string" && itemType.startsWith("reasoning")) {
          const envelope: TokenEnvelope = { type: "token", subType: "reasoning", text: delta };
          this.callbacks.onThinkingToken?.(envelope);
        }
        break;
      }

      case "item.started": {
        const item = ev["item"] as Record<string, unknown> | undefined;
        if (!item) break;
        const toolCall = this._mapItemStartedToToolCall(item);
        if (toolCall) {
          this.callbacks.onToolCall?.(toolCall);
        }
        break;
      }

      case "thread.completed":
      case "turn.completed": {
        const envelope: DoneEnvelope = { type: "done", exitCode: 0 };
        this.callbacks.onDone?.(envelope);
        break;
      }

      case "error": {
        const message = (ev["message"] as string | undefined) ?? JSON.stringify(parsed);
        const envelope: ErrorEnvelope = { type: "error", message };
        this.callbacks.onStreamError?.(envelope);
        break;
      }

      case "turn.failed": {
        // 세션 에러(사용량 초과, 인증 실패 등) — error 이벤트와 동일 채널로 라우팅
        const errorObj = ev["error"] as Record<string, unknown> | undefined;
        const message =
          (errorObj?.["message"] as string | undefined) ??
          (ev["message"] as string | undefined) ??
          "turn.failed";
        const envelope: ErrorEnvelope = { type: "error", message };
        this.callbacks.onStreamError?.(envelope);
        break;
      }

      // item.started, item.completed, turn.started, turn.completed — 정상 동작, 무시
      default:
        break;
    }
  }

  private _parseMaybeJson(value: unknown): unknown {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  private _mapItemStartedToToolCall(item: Record<string, unknown>): ToolCallEnvelope | null {
    const itemType = String(item["type"] ?? "");
    const isToolCallType =
      itemType === "function_call" ||
      itemType === "tool_call" ||
      itemType === "mcp_tool_call";
    if (!isToolCallType) return null;

    const toolNameRaw = item["name"] ?? item["tool_name"];
    const toolName = typeof toolNameRaw === "string" ? toolNameRaw : "";
    if (!toolName) return null;

    const callIdRaw = item["call_id"] ?? item["id"] ?? `call-${Date.now()}`;
    const callId = String(callIdRaw);

    const argsRaw =
      item["arguments"] ??
      item["args"] ??
      item["input"] ??
      item["parameters"] ??
      {};

    return {
      type: "tool_call",
      toolName,
      callId,
      args: this._parseMaybeJson(argsRaw),
    };
  }
}

/**
 * CodexStreamParser를 생성하고 즉시 자식 프로세스에 연결한다.
 *
 * @param child      spawn()으로 생성된 자식 프로세스
 * @param callbacks  StreamParserCallbacks (StreamParser와 동일 인터페이스)
 * @returns          연결된 CodexStreamParser 인스턴스
 */
export function createCodexStreamParser(
  child: ChildProcessWithoutNullStreams,
  callbacks: StreamParserCallbacks,
): CodexStreamParser {
  const parser = new CodexStreamParser(callbacks);
  parser.attach(child);
  return parser;
}
