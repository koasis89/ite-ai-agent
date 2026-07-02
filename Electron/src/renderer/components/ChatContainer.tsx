/**
 * EL-216: 차단형 인터뷰 모드 UI 컴포넌트 — ChatContainer
 *
 * 에이전트 인터류드 신호 수신 시 채팅창을 차단형(Blocking) 인터뷰 모드로
 * 강제 전환하는 Renderer 컴포넌트.
 *
 * 모드 전환 흐름:
 *   [일반 채팅] → (omx:interlude-start) → [인터뷰 모드 - Dim + 포커스 폼]
 *              → (사용자 제출)          → [처리 중 - 스피너 + 락]
 *              → (omx:interlude-resolved / cancelled) → [일반 채팅]
 *
 * UI 특화 요소:
 *   - 배경 Dim 처리 (이전 메시지 영역 opacity 저하)
 *   - 페르소나 뱃지 (Planner / Executor / Verifier 등 역할 시각화)
 *   - 원자성 락 (제출 후 스피너 유지 → 디스크 상태 갱신 이벤트 수신 시까지)
 *   - 취소 버튼 (SIGTERM 롤백 루틴 실행)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { ModelSelector } from "./ModelSelector";
import { TemplateQuickMenu } from "./TemplateQuickMenu";

// pdfjs 워커 설정 (Vite가 new URL(..., import.meta.url) 자산 경로를 번들링)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// ─── 마크다운 메시지 버블 ────────────────────────────────────────────────────

const MdBubble: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      // 코드 블록 스타일
      code({ className, children, ...props }) {
        const isBlock = className?.includes("language-");
        return isBlock ? (
          <code
            className={className}
            style={{
              display: "block",
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: "10px 14px",
              borderRadius: "6px",
              fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
              fontSize: "0.82rem",
              overflowX: "auto",
              whiteSpace: "pre",
              margin: "8px 0",
            }}
            {...props}
          >
            {children}
          </code>
        ) : (
          <code
            style={{
              background: "#e5e7eb",
              padding: "2px 5px",
              borderRadius: "3px",
              fontFamily: '"Fira Code", Consolas, monospace',
              fontSize: "0.82rem",
            }}
            {...props}
          >
            {children}
          </code>
        );
      },
      pre({ children }) {
        return <pre style={{ margin: 0 }}>{children}</pre>;
      },
      // 헤더 스타일
      h1: ({ children }) => <h1 style={{ fontSize: "1.2rem", margin: "10px 0 6px", fontWeight: 700 }}>{children}</h1>,
      h2: ({ children }) => <h2 style={{ fontSize: "1.05rem", margin: "8px 0 4px", fontWeight: 600 }}>{children}</h2>,
      h3: ({ children }) => <h3 style={{ fontSize: "0.95rem", margin: "6px 0 3px", fontWeight: 600 }}>{children}</h3>,
      // 단락 여백
      p: ({ children }) => <p style={{ margin: "4px 0", lineHeight: 1.6 }}>{children}</p>,
      // 리스트
      ul: ({ children }) => <ul style={{ paddingLeft: "18px", margin: "4px 0" }}>{children}</ul>,
      ol: ({ children }) => <ol style={{ paddingLeft: "18px", margin: "4px 0" }}>{children}</ol>,
      li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
      // 인용
      blockquote: ({ children }) => (
        <blockquote
          style={{
            borderLeft: "3px solid #9ca3af",
            margin: "6px 0",
            paddingLeft: "10px",
            color: "#6b7280",
          }}
        >
          {children}
        </blockquote>
      ),
      // 링크
      a: ({ href, children }) => (
        <a href={href} style={{ color: "#2563eb", textDecoration: "underline" }}>
          {children}
        </a>
      ),
      // 구분선
      hr: () => <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "8px 0" }} />,
      // 테이블 (remark-gfm)
      table: ({ children }) => (
        <table style={{ borderCollapse: "collapse", width: "100%", margin: "6px 0", fontSize: "0.85rem" }}>{children}</table>
      ),
      th: ({ children }) => (
        <th style={{ border: "1px solid #d1d5db", padding: "5px 8px", background: "#f9fafb", fontWeight: 600 }}>{children}</th>
      ),
      td: ({ children }) => (
        <td style={{ border: "1px solid #d1d5db", padding: "5px 8px" }}>{children}</td>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// ─── IPC 타입 (Electron contextBridge 경유) ──────────────────────────────────

// Electron preload에서 window.electronAPI로 노출됨을 가정
declare global {
  interface Window {
    electronAPI: any;
  }
}

// ─── 페이로드 타입 ────────────────────────────────────────────────────────────

interface InterludePayload {
  callId: string;
  kind: "askUserQuestion" | "worker_merge_conflict" | "pre-tool-use" | "needs-input";
  question: string;
  persona: "planner" | "executor" | "verifier" | "reviewer" | "unknown";
}

// ─── 페르소나 뱃지 메타데이터 ────────────────────────────────────────────────

const PERSONA_META: Record<
  InterludePayload["persona"],
  { label: string; color: string; emoji: string }
> = {
  planner:  { label: "Planner",  color: "#6366f1", emoji: "🗺️" },
  executor: { label: "Executor", color: "#10b981", emoji: "⚡" },
  verifier: { label: "Verifier", color: "#f59e0b", emoji: "🔍" },
  reviewer: { label: "Reviewer", color: "#3b82f6", emoji: "📋" },
  unknown:  { label: "Agent",    color: "#6b7280", emoji: "🤖" },
};

const KIND_LABEL: Record<InterludePayload["kind"], string> = {
  askUserQuestion:      "추가 정보 요청",
  worker_merge_conflict:"병합 충돌 해결",
  "pre-tool-use":       "도구 실행 승인",
  "needs-input":        "입력 컨텍스트 필요",
};

// ─── 복사 및 표준오피스 내보내기 컴포넌트 ───────────────────────────────────

const ExportActions: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // GFM 테이블 탐색 (단순 | 감지 및 정렬 구분선 체크)
  const hasTable = content.includes("|") && /\|[-: ]+\|/.test(content);
  // ADR 혹은 API 세부 검사
  const isADR = content.toUpperCase().includes("ADR");
  const isAPI = content.toUpperCase().includes("API") || content.includes("엔드포인트") || content.includes("요청");
  const hasWordCandidate = isADR || isAPI;

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (fileType: "xlsx" | "docx") => {
    setLoading(true);
    setResult(null);
    try {
      let templateName: string | undefined = undefined;
      let defaultFileName = `omx-export-${new Date().toISOString().slice(0, 10)}`;

      if (fileType === "xlsx") {
        if (content.toUpperCase().includes("WBS")) {
          templateName = "WBS-Template_표준양식.xlsx";
          defaultFileName = "WBS-상출물";
        } else if (content.includes("공수")) {
          templateName = "Effort-Estimation_표준양식.xlsx";
          defaultFileName = "공수산정-상출물";
        } else if (content.includes("갭분석") || content.includes("Gap")) {
          templateName = "Gap-Analysis-Report_표준양식.xlsx";
          defaultFileName = "갭분석-상출물";
        }
      } else if (fileType === "docx") {
        if (isADR) {
          templateName = "ADR-Template_표준양식.docx";
          defaultFileName = `ADR-${new Date().toISOString().slice(0, 10)}`;
        } else {
          templateName = "API-Spec-Standard_표준양식.docx";
          defaultFileName = `API-Spec-${new Date().toISOString().slice(0, 10)}`;
        }
      }

      const api = window.electronAPI;
      if (!api || !api.exportDocument) {
        throw new Error("Electron API (exportDocument)가 활성화되어 있지 않습니다.");
      }

      const res = await api.exportDocument({
        fileType,
        rawContent: content,
        defaultFileName,
        templateName,
      });

      if (res.ok) {
        setResult({ ok: true, message: `성공: ${res.filePath}` });
      } else if (res.cancelled) {
        // 취소 시 조용히 무시
      } else {
        throw new Error(res.error || "취소됨");
      }
    } catch (err: any) {
      setResult({ ok: false, message: `실패: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 4000);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "4px" }}>
      {result && (
        <span style={{ 
          fontSize: "11px", 
          padding: "2px 6px", 
          borderRadius: "4px",
          backgroundColor: result.ok ? "#ecfdf5" : "#fef2f2",
          color: result.ok ? "#059669" : "#dc2626",
          border: `1px solid ${result.ok ? "#a7f3d0" : "#fecaca"}`,
          maxWidth: "200px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis"
        }} title={result.message}>
          {result.message}
        </span>
      )}
      
      {hasTable && (
        <button
          onClick={() => handleExport("xlsx")}
          disabled={loading}
          title="엑셀 표준양식 컴포지션 내보내기"
          style={{
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#047857",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 8px",
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          📈 {loading ? "처리중.." : "엑셀 저장"}
        </button>
      )}

      {hasWordCandidate && (
        <button
          onClick={() => handleExport("docx")}
          disabled={loading}
          title="워드 표준양식 지문 치환 내보내기"
          style={{
            background: "#eff6ff",
            border: "1px solid #3b82f6",
            color: "#1d4ed8",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            padding: "2px 8px",
            fontWeight: "bold",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          📄 {loading ? "처리중.." : "워드 저장"}
        </button>
      )}

      <button
        onClick={handleCopy}
        title="내용 복사"
        className="btn-copy-response"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
          opacity: copied ? 1 : 0.4,
          transition: "opacity 0.2s",
          padding: "4px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = copied ? "1" : "0.4")}
      >
        {copied ? "✔️" : "📋"}
      </button>
    </div>
  );
};

// ─── ChatContainer 컴포넌트 ───────────────────────────────────────────────────

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachedFiles?: string[];
}

interface ContextAttachment {
  id: string;
  name: string;
  content: string;
  truncated: boolean;
}

const MAX_CONTEXT_CHARS = 4000;
const TOOL_ARGS_PREVIEW_CHARS = 120;

/** PDF 파일의 텍스트를 페이지 순서대로 추출해 하나의 문자열로 합친다. */
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }
  await loadingTask.destroy();
  return pages.join("\n\n");
}

/** XLSX/XLS 파일의 데이터를 추출하여 텍스트 형태로 변환한다. */
async function extractXlsxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const sheetsText: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    if (csv.trim()) {
      sheetsText.push(`## 시트명: ${sheetName}\n${csv}`);
    }
  }
  return sheetsText.join("\n\n");
}

interface ChatContainerProps {
  /** 초기 메시지 목록 (스토어 연동 시 대체 가능) */
  initialMessages?: Message[];
  /** 일반 채팅 전송 핸들러 */
  onSendMessage?: (text: string) => void;
  /** 현재 선택된 모델 ID */
  selectedModel?: string;
  /** 모델 변경 콜백 */
  onModelChange?: (modelId: string) => void;
  /** 스트리밍 중인 응답 텍스트 (assistant 버블로 실시간 표시) */
  streamingText?: string;
  /** 스트림 에러 목록 */
  streamErrors?: string[];  /** Gemini API 키 설정 여부 — ModelSelector로 전달하여 Gemini 항목 활성화 제어 */
  geminiKeyAvailable?: boolean;
  /** 메시지 배열 변경 콜백 (히스토리 저장 연동) */
  onMessagesChange?: (messages: Message[]) => void;
}

/**
 * ChatContainer
 *
 * 일반 채팅 UI와 인터뷰 모드 UI를 단일 컴포넌트에서 제어.
 * Electron IPC 이벤트를 직접 구독하여 모드를 전환함.
 */
export const ChatContainer: React.FC<ChatContainerProps> = ({
  initialMessages = [],
  onSendMessage,
  selectedModel = "echo",
  onModelChange,
  streamingText = "",
  streamErrors = [],
  geminiKeyAvailable = false,
  onMessagesChange,
}) => {
  // ─── 상태 ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<ContextAttachment[]>([]);
  const [lastToolCallDebug, setLastToolCallDebug] = useState<{
    toolName: string;
    argsPreview: string;
    isTodoTool: boolean;
    at: string;
  } | null>(null);

  /** 현재 활성 인터류드 페이로드 — null이면 일반 채팅 모드 */
  const [activeInterlude, setActiveInterlude] = useState<InterludePayload | null>(null);

  /** 처리 중 락 — 제출 후 스피너 표시 및 입력 동결 */
  const [isProcessingLock, setIsProcessingLock] = useState(false);

  /** 인터뷰 모드 텍스트 입력 */
  const [interviewInput, setInterviewInput] = useState("");

  const interviewInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  /** 직전 streamingText 값 추적 — 비워질 때 assistant 메시지로 확정 */
  const prevStreamingRef = useRef("");

  // ─── streamingText 확정: 새 질문 전송 시 이전 응답을 messages에 저장 ───────

  useEffect(() => {
    const prev = prevStreamingRef.current.trim();
    const isCleared = prev && !streamingText;
    if (isCleared && prev !== "Stream finished.") {
      setMessages((m) => [
        ...m,
        { id: `assistant-${Date.now()}`, role: "assistant", content: prev },
      ]);
    }
    prevStreamingRef.current = streamingText;
  }, [streamingText]);

  // ─── 스트림 tool_call 디버그 표시 ─────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const toolCallUnsub = api.onStreamToolCall?.((payload: { toolName?: string; args?: unknown; callId?: string }) => {
      const toolName = (payload?.toolName ?? "unknown").trim() || "unknown";
      const isTodoTool = toolName.toLowerCase().includes("manage_todo_list");
      const rawArgs =
        typeof payload?.args === "string"
          ? payload.args
          : JSON.stringify(payload?.args ?? {});
      const argsPreview = rawArgs.length > TOOL_ARGS_PREVIEW_CHARS
        ? `${rawArgs.slice(0, TOOL_ARGS_PREVIEW_CHARS)}...`
        : rawArgs;

      setLastToolCallDebug({
        toolName,
        argsPreview,
        isTodoTool,
        at: new Date().toLocaleTimeString("ko-KR"),
      });
    });

    const streamDoneUnsub = api.onStreamDone?.(() => {
      setLastToolCallDebug(null);
    });

    return () => {
      toolCallUnsub?.();
      streamDoneUnsub?.();
    };
  }, []);

  // ─── IPC 이벤트 구독 ──────────────────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // 인터류드 시작 → 인터뷰 모드 진입
    const unsubStart = api.onInterludeStart((payload: InterludePayload) => {
      setActiveInterlude(payload);
      setIsProcessingLock(false);
      setInterviewInput("");
      // 포커스를 인터뷰 입력창으로 이동
      setTimeout(() => interviewInputRef.current?.focus(), 50);
    });

    // 인터류드 해제 → 일반 채팅 복귀
    const unsubResolved = api.onInterludeResolved(() => {
      setActiveInterlude(null);
      setIsProcessingLock(false);
      setInterviewInput("");
    });

    // 인터류드 취소 → 일반 채팅 복귀
    const unsubCancelled = api.onInterludeCancelled(() => {
      setActiveInterlude(null);
      setIsProcessingLock(false);
    });

    return () => {
      unsubStart();
      unsubResolved();
      unsubCancelled();
    };
  }, []);

  // ─── 메시지 목록 하단 자동 스크롤 ───────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // ─── 일반 채팅 전송 ───────────────────────────────────────────────────────

  const isTextLikeFile = (file: File) => {
    if (file.type.startsWith("text/")) return true;
    const lower = file.name.toLowerCase();
    return [
      ".md", ".txt", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx",
      ".py", ".rs", ".go", ".java", ".cs", ".html", ".css", ".sql", ".xml",
    ].some((ext) => lower.endsWith(ext));
  };

  const handleAddContextClick = () => {
    contextFileInputRef.current?.click();
  };

  const handleContextFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const nextAttachments: ContextAttachment[] = await Promise.all(
      files.map(async (file, index) => {
        const id = `${Date.now()}-${index}`;

        // PDF: pdfjs로 텍스트 추출 후 기존 길이 제한 로직 재사용
        if (file.name.toLowerCase().endsWith(".pdf")) {
          try {
            const raw = await extractPdfText(file);
            const trimmed = raw.slice(0, MAX_CONTEXT_CHARS);
            return {
              id,
              name: file.name,
              content: trimmed.trim()
                ? trimmed
                : `[파일: ${file.name}] 추출 가능한 텍스트가 없습니다. (스캔/이미지 PDF일 수 있습니다.)`,
              truncated: raw.length > MAX_CONTEXT_CHARS,
            };
          } catch (err) {
            return {
              id,
              name: file.name,
              content: `[파일: ${file.name}] PDF 텍스트 추출에 실패했습니다: ${
                err instanceof Error ? err.message : String(err)
              }`,
              truncated: false,
            };
          }
        }

        // Excel: xlsx로 데이터 추출 후 기존 길이 제한 로직 재사용
        const fileNameLower = file.name.toLowerCase();
        if (fileNameLower.endsWith(".xlsx") || fileNameLower.endsWith(".xls")) {
          try {
            const raw = await extractXlsxText(file);
            const trimmed = raw.slice(0, MAX_CONTEXT_CHARS);
            return {
              id,
              name: file.name,
              content: trimmed.trim()
                ? trimmed
                : `[파일: ${file.name}] 추출 가능한 엑셀 데이터가 없습니다.`,
              truncated: raw.length > MAX_CONTEXT_CHARS,
            };
          } catch (err) {
            return {
              id,
              name: file.name,
              content: `[파일: ${file.name}] 엑셀 데이터 추출에 실패했습니다: ${
                err instanceof Error ? err.message : String(err)
              }`,
              truncated: false,
            };
          }
        }

        if (!isTextLikeFile(file)) {
          return {
            id,
            name: file.name,
            content: `[파일: ${file.name}] 바이너리 파일은 텍스트 컨텍스트로 자동 추출되지 않습니다.`,
            truncated: false,
          };
        }

        const raw = await file.text();
        const trimmed = raw.slice(0, MAX_CONTEXT_CHARS);
        return {
          id,
          name: file.name,
          content: trimmed,
          truncated: raw.length > MAX_CONTEXT_CHARS,
        };
      }),
    );

    setAttachments((prev) => [...prev, ...nextAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const buildContextPrefix = () => {
    if (!attachments.length) return "";
    const blocks = attachments.map((item) => {
      const suffix = item.truncated ? "\n[일부만 포함됨: 길이 제한 적용]" : "";
      return `### 첨부 컨텍스트: ${item.name}\n${item.content}${suffix}`;
    });
    return `${blocks.join("\n\n")}\n\n`;
  };

  const handleSendMessage = useCallback(() => {
    const text = inputText.trim();
    if (activeInterlude) return;

    const contextPrefix = buildContextPrefix();
    const payload = `${contextPrefix}${text}`.trim();
    if (!payload) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text, // 화면에는 사용자가 입력한 텍스트만 표시
      attachedFiles: attachments.length > 0 ? attachments.map((a) => a.name) : undefined,
    };

    const pendingStream = streamingText.trim();
    if (pendingStream && pendingStream !== "Stream finished.") {
      // 진행 중인 스트리밍 응답을 사용자 메시지보다 먼저 확정 (원자적 추가)
      const assistantMsg: Message = {
        id: `assistant-flush-${Date.now()}`,
        role: "assistant",
        content: pendingStream,
      };
      setMessages((prev) => [...prev, assistantMsg, newMsg]);
      // useEffect의 중복 추가 방지: prevStreamingRef를 미리 비움
      prevStreamingRef.current = "";
    } else {
      setMessages((prev) => [...prev, newMsg]);
    }

    setInputText("");
    setAttachments([]);
    onSendMessage?.(payload);
  }, [inputText, activeInterlude, onSendMessage, streamingText, attachments]);

  // ─── 인터뷰 모드 승인 제출 ────────────────────────────────────────────────

  const handleInterviewSubmit = useCallback(async () => {
    if (!activeInterlude || isProcessingLock) return;

    setIsProcessingLock(true);

    const result = await window.electronAPI.sendInterludeAck({
      callId: activeInterlude.callId,
      approved: true,
      userInput: interviewInput.trim() || undefined,
    });

    if (!result.ok) {
      // 오류 시 락 해제 — 재시도 허용
      setIsProcessingLock(false);
    }
    // 성공 시 onInterludeResolved IPC 이벤트가 락을 해제함 (원자성 보장)
  }, [activeInterlude, isProcessingLock, interviewInput]);

  // ─── 인터뷰 모드 취소/롤백 ───────────────────────────────────────────────

  const handleInterviewCancel = useCallback(async () => {
    if (!activeInterlude || isProcessingLock) return;

    setIsProcessingLock(true);

    await window.electronAPI.sendInterludeAck({
      callId: activeInterlude.callId,
      approved: false,
    });
    // onInterludeCancelled IPC 이벤트가 락을 해제함
  }, [activeInterlude, isProcessingLock]);

  // ─── 키 이벤트 핸들러 ────────────────────────────────────────────────────

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInterviewKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleInterviewSubmit();
    }
  };

  // ─── 렌더링 ───────────────────────────────────────────────────────────────

  const isInterludeMode = activeInterlude !== null;
  const persona = activeInterlude ? PERSONA_META[activeInterlude.persona] : null;

  return (
    <div
      className="chat-container"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ── 메시지 목록 영역 ── */}
      <div
        className="messages-area"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          // 인터뷰 모드 시 Dim 처리 (포커스 집중 효과)
          opacity: isInterludeMode ? 0.35 : 1,
          transition: "opacity 0.3s ease",
          pointerEvents: isInterludeMode ? "none" : "auto",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message message-${msg.role}`}
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: msg.role === "user" ? "#e0e7ff" : "#f3f4f6",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              position: "relative",
            }}
          >
            {msg.role === "user" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {msg.attachedFiles.map((name, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "12px",
                          background: "#c7d2fe",
                          color: "#3730a3",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        📎 {name}
                      </span>
                    ))}
                  </div>
                )}
                {msg.content && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>}
              </div>
            ) : (
              // assistant & system 메시지는 MdBubble과 함께 복사/내보내기 버튼 제공
              <>
                <MdBubble content={msg.content} />
                <ExportActions content={msg.content} />
              </>
            )}
          </div>
        ))}
        {/* 스트리밍 중인 응답 — 마지막 메시지 바로 아래 assistant 버블로 표시 */}
        {streamingText && (
          <div
            className="message message-assistant"
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#f3f4f6",
              alignSelf: "flex-start",
              maxWidth: "80%",
              position: "relative",
            }}
          >
            <MdBubble content={streamingText} />
            <ExportActions content={streamingText} />
          </div>
        )}
        {/* 스트림 에러 표시 */}
        {streamErrors.map((error, index) => (
          <div
            key={`err-${index}`}
            className="message message-error"
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              alignSelf: "flex-start",
              maxWidth: "80%",
              fontSize: "0.875rem",
            }}
          >
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{error}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 인터뷰 모드 오버레이 ── */}
      {isInterludeMode && persona && activeInterlude && (
        <div
          className="interview-overlay"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTop: "2px solid #e5e7eb",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
            padding: "20px 24px",
            zIndex: 100,
          }}
        >
          {/* 페르소나 뱃지 */}
          <div
            className="persona-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: persona.color + "20",
              border: `1.5px solid ${persona.color}`,
              marginBottom: "12px",
            }}
          >
            <span>{persona.emoji}</span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: persona.color,
              }}
            >
              {persona.label}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginLeft: "4px",
              }}
            >
              {KIND_LABEL[activeInterlude.kind]}
            </span>
          </div>

          {/* 질문 본문 */}
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "15px",
              fontWeight: 500,
              color: "#111827",
              lineHeight: 1.6,
            }}
          >
            {activeInterlude.question}
          </p>

          {/* 입력 텍스트에어리어 */}
          <textarea
            ref={interviewInputRef}
            value={interviewInput}
            onChange={(e) => setInterviewInput(e.target.value)}
            onKeyDown={handleInterviewKeyDown}
            disabled={isProcessingLock}
            placeholder="답변을 입력하세요… (Ctrl+Enter로 전송)"
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1.5px solid #d1d5db",
              fontSize: "14px",
              resize: "vertical",
              boxSizing: "border-box",
              marginBottom: "12px",
              opacity: isProcessingLock ? 0.5 : 1,
            }}
          />

          {/* 버튼 영역 */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            {/* 취소(롤백) 버튼 */}
            <button
              onClick={() => void handleInterviewCancel()}
              disabled={isProcessingLock}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "1.5px solid #e5e7eb",
                background: "#fff",
                color: "#374151",
                fontSize: "14px",
                cursor: isProcessingLock ? "not-allowed" : "pointer",
                opacity: isProcessingLock ? 0.5 : 1,
              }}
            >
              취소
            </button>

            {/* 제출 버튼 or 스피너 */}
            <button
              onClick={() => void handleInterviewSubmit()}
              disabled={isProcessingLock}
              style={{
                padding: "8px 22px",
                borderRadius: "6px",
                border: "none",
                background: persona.color,
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isProcessingLock ? "not-allowed" : "pointer",
                opacity: isProcessingLock ? 0.85 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isProcessingLock ? (
                <>
                  <span
                    className="spinner"
                    style={{
                      display: "inline-block",
                      width: "14px",
                      height: "14px",
                      border: "2px solid #ffffff66",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  처리 중…
                </>
              ) : (
                "전송"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── 일반 채팅 입력창 (인터뷰 모드에서는 숨김) ── */}
      {!isInterludeMode && (
        <div className="chat-input-area">
          <input
            ref={contextFileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              void handleContextFilesSelected(e);
            }}
            style={{ display: "none" }}
          />
          {/* 텍스트 입력 */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="메시지 입력…"
            className="chat-input-field"
          />
          {attachments.length > 0 && (
            <div className="context-chip-list">
              {attachments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="context-chip"
                  onClick={() => removeAttachment(item.id)}
                  title="클릭하면 제거"
                >
                  <span>{item.name}</span>
                  <span className="context-chip-remove">×</span>
                </button>
              ))}
            </div>
          )}
          {lastToolCallDebug && (
            <div
              style={{
                fontSize: "11px",
                color: lastToolCallDebug.isTodoTool ? "#065f46" : "#6b7280",
                background: lastToolCallDebug.isTodoTool ? "#ecfdf5" : "#f9fafb",
                border: `1px solid ${lastToolCallDebug.isTodoTool ? "#a7f3d0" : "#e5e7eb"}`,
                borderRadius: "6px",
                padding: "4px 8px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={`tool=${lastToolCallDebug.toolName} args=${lastToolCallDebug.argsPreview}`}
            >
              tool_call {lastToolCallDebug.at}: {lastToolCallDebug.toolName}
              {lastToolCallDebug.isTodoTool ? " (todo 감지)" : " (todo 미감지)"}
            </div>
          )}
          {/* 하단 툴바: 모델 선택 + 전송 버튼 */}
          <div className="chat-toolbar">
            <div className="chat-toolbar-left">
              <button
                type="button"
                className="chat-context-btn"
                onClick={handleAddContextClick}
                title="파일 컨텍스트 추가"
              >
                + 컨텍스트 추가
              </button>
              <TemplateQuickMenu
                onSelectTemplate={(prompt) => setInputText(prompt)}
              />
              <ModelSelector
                value={selectedModel}
                onChange={onModelChange ?? (() => undefined)}
                geminiKeyAvailable={geminiKeyAvailable}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() && attachments.length === 0}
              className={`chat-send-btn${inputText.trim() || attachments.length > 0 ? "" : " disabled"}`}
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
                <path d="M8 2L8 14M8 2L3 7M8 2L13 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 스피너 애니메이션 키프레임 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChatContainer;
