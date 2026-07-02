import React, { useCallback, useEffect, useRef, useState } from "react";
import AdapterStatusBar from "./components/AdapterStatusBar";
import { ApiKeySettings } from "./components/ApiKeySettings";
import ChatContainer from "./components/ChatContainer";
import type { Message } from "./components/ChatContainer";
import { LifecycleDashboard } from "./components/LifecycleDashboard";
import PersonaSwitcher from "./components/PersonaSwitcher";
import {
  listChatSessions,
  ensureSession,
  createChatSession,
  deleteChatSession,
  upsertChatSession,
  type ChatSession,
} from "./history/chat-history";

type StreamToken = {
  text?: string;
  delta?: string;
  content?: string;
};

function readTokenText(payload: StreamToken): string {
  return payload.text ?? payload.delta ?? payload.content ?? "";
}

export default function App(): React.ReactElement {
  const [streamText, setStreamText] = useState("");
  const [streamErrors, setStreamErrors] = useState<string[]>([]);
  // onStreamDone 콜백 클로저에서 최신 에러를 읽기 위한 ref (state는 마운트 시점 값으로 캡처됨)
  const streamErrorsRef = useRef<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("echo");
  const [selectedPersona, setSelectedPersona] = useState("default");
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSeedMessages, setChatSeedMessages] = useState<Message[]>([]);

  const refreshSessions = useCallback((preferredId?: string) => {
    const listed = listChatSessions();
    const ensured = ensureSession(preferredId ?? listed[0]?.id);
    setSessions(listed.length > 0 ? listed : [ensured]);
    setActiveSessionId(ensured.id);
    setChatSeedMessages(ensured.messages);
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Gemini 키 상태 초기 로드
  useEffect(() => {
    void window.electronAPI?.geminiKey?.getStatus().then((result) => {
      setGeminiKeyAvailable(result?.available ?? false);
    });
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onStreamToken) return;

    const unsubToken = api.onStreamToken((payload: StreamToken) => {
      setStreamText((prev) => `${prev}${readTokenText(payload)}`);
    });
    const unsubError = api.onStreamError?.((payload: { message?: string }) => {
      if (payload?.message) {
        const message = payload.message;
        setStreamErrors((prev) => [...prev.slice(-4), message]);
        streamErrorsRef.current = [...streamErrorsRef.current.slice(-4), message];
      }
    });
    const unsubDone = api.onStreamDone?.((payload?: { type?: string; exitCode?: number }) => {
      const failed = typeof payload?.exitCode === "number" && payload.exitCode !== 0;
      if (failed) {
        const lastError = streamErrorsRef.current[streamErrorsRef.current.length - 1];
        const reason = lastError?.trim() || "알 수 없는 오류로 실행이 실패했습니다.";
        const failureLine = `\u274C 실행 실패: ${reason}`;
        setStreamText((prev) => (prev.trim() ? `${prev}\n\n${failureLine}` : failureLine));
      } else {
        setStreamText((prev) => (prev.trim() ? prev : "Stream finished."));
      }
    });

    return () => {
      unsubToken();
      unsubError?.();
      unsubDone?.();
    };
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    setStreamText("");
    setStreamErrors([]);
    streamErrorsRef.current = [];
    void window.electronAPI?.startAgentStream?.({
      command: "exec",
      args: [text],
      reasoningEffort: "standard",
      model: selectedModel,
      persona: selectedPersona === "default" ? undefined : selectedPersona,
    });
  }, [selectedModel, selectedPersona]);

  const handleMessagesChange = useCallback((messages: Message[]) => {
    if (!activeSessionId) return;
    const updated = upsertChatSession(activeSessionId, messages);
    const listed = listChatSessions();
    setSessions(listed);
    setChatSeedMessages(updated.messages);
  }, [activeSessionId]);

  const handleChangeSession = useCallback((sessionId: string) => {
    const loaded = ensureSession(sessionId);
    setActiveSessionId(loaded.id);
    setChatSeedMessages(loaded.messages);
    setSessions(listChatSessions());
    setStreamText("");
    setStreamErrors([]);
    streamErrorsRef.current = [];
  }, []);

  const handleCreateSession = useCallback(() => {
    const created = createChatSession();
    setSessions(listChatSessions());
    setActiveSessionId(created.id);
    setChatSeedMessages(created.messages);
    setStreamText("");
    setStreamErrors([]);
    streamErrorsRef.current = [];
  }, []);

  const handleDeleteSession = useCallback(() => {
    if (!activeSessionId) return;
    const next = deleteChatSession(activeSessionId);
    setSessions(listChatSessions());
    setActiveSessionId(next.id);
    setChatSeedMessages(next.messages);
    setStreamText("");
    setStreamErrors([]);
    streamErrorsRef.current = [];
  }, [activeSessionId]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">OMX Desktop Agent</div>
          <div className="app-subtitle">Electron + Vite hot reload dev shell</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select
            value={activeSessionId}
            onChange={(e) => handleChangeSession(e.target.value)}
            style={{
              minWidth: "220px",
              maxWidth: "320px",
              padding: "6px 8px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#fff",
            }}
            title="저장된 채팅 히스토리 선택"
          >
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateSession}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #10b981",
              background: "#ecfdf5",
              color: "#047857",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="새 채팅 세션 생성"
          >
            + 새 채팅
          </button>
          <button
            onClick={handleDeleteSession}
            disabled={sessions.length <= 1}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #fca5a5",
              background: sessions.length <= 1 ? "#f3f4f6" : "#fef2f2",
              color: sessions.length <= 1 ? "#9ca3af" : "#b91c1c",
              fontSize: "12px",
              fontWeight: 600,
              cursor: sessions.length <= 1 ? "not-allowed" : "pointer",
            }}
            title="현재 채팅 세션 삭제"
          >
            삭제
          </button>
        </div>
        <PersonaSwitcher value={selectedPersona} onChange={setSelectedPersona} />
      </header>

      <main className="app-main">
        <section className="chat-pane">
          {selectedModel.startsWith("gemini-") && !geminiKeyAvailable && (
            <ApiKeySettings onKeySet={() => setGeminiKeyAvailable(true)} />
          )}
          <ChatContainer
            key={activeSessionId || "chat-default"}
            initialMessages={[
              ...chatSeedMessages,
            ]}
            onSendMessage={handleSendMessage}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            streamingText={streamText}
            streamErrors={streamErrors}
            geminiKeyAvailable={geminiKeyAvailable}
            onMessagesChange={handleMessagesChange}
          />
        </section>
        <LifecycleDashboard />
      </main>

      <AdapterStatusBar />
    </div>
  );
}
