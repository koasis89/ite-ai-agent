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
import { ModelSelector } from "./ModelSelector";

// ─── IPC 타입 (Electron contextBridge 경유) ──────────────────────────────────

// Electron preload에서 window.electronAPI로 노출됨을 가정
declare global {
  interface Window {
    electronAPI: {
      onInterludeStart: (
        callback: (payload: InterludePayload) => void,
      ) => () => void;
      onInterludeResolved: (callback: (data: { callId: string }) => void) => () => void;
      onInterludeCancelled: (callback: (data: { callId: string }) => void) => () => void;
      sendInterludeAck: (ack: {
        callId: string;
        approved: boolean;
        userInput?: string;
      }) => Promise<{ ok: boolean; error?: string }>;
    };
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

// ─── ChatContainer 컴포넌트 ───────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
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
  streamErrors?: string[];
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
}) => {
  // ─── 상태 ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");

  /** 현재 활성 인터류드 페이로드 — null이면 일반 채팅 모드 */
  const [activeInterlude, setActiveInterlude] = useState<InterludePayload | null>(null);

  /** 처리 중 락 — 제출 후 스피너 표시 및 입력 동결 */
  const [isProcessingLock, setIsProcessingLock] = useState(false);

  /** 인터뷰 모드 텍스트 입력 */
  const [interviewInput, setInterviewInput] = useState("");

  const interviewInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── IPC 이벤트 구독 ──────────────────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // 인터류드 시작 → 인터뷰 모드 진입
    const unsubStart = api.onInterludeStart((payload) => {
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

  // ─── 일반 채팅 전송 ───────────────────────────────────────────────────────

  const handleSendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || activeInterlude) return;

    const msg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, msg]);
    setInputText("");
    onSendMessage?.(text);
  }, [inputText, activeInterlude, onSendMessage]);

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
            }}
          >
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</p>
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
            }}
          >
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{streamingText}</p>
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
          {/* 텍스트 입력 */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="메시지 입력…"
            className="chat-input-field"
          />
          {/* 하단 툴바: 모델 선택 + 전송 버튼 */}
          <div className="chat-toolbar">
            <ModelSelector
              value={selectedModel}
              onChange={onModelChange ?? (() => undefined)}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className={`chat-send-btn${inputText.trim() ? "" : " disabled"}`}
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
