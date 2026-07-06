import React, { useCallback, useEffect, useRef, useState } from "react";
import AdapterStatusBar from "./components/AdapterStatusBar";
import { ApiKeySettings } from "./components/ApiKeySettings";
import ChatContainer from "./components/ChatContainer";
import type { Message } from "./components/ChatContainer";
import { LifecycleDashboard } from "./components/LifecycleDashboard";
import PersonaSwitcher from "./components/PersonaSwitcher";
import SkillCatalogPanel from "./components/SkillCatalogPanel";
import WorkspacePermissionBanner from "./components/WorkspacePermissionBanner";
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
  const panel = new URLSearchParams(window.location.search).get("panel");

  if (panel === "skills") {
    return (
      <div style={{ height: "100vh", padding: "12px", boxSizing: "border-box", background: "#f8fafc" }}>
        <SkillCatalogPanel />
      </div>
    );
  }

  const [streamText, setStreamText] = useState("");
  const [streamErrors, setStreamErrors] = useState<string[]>([]);
  // onStreamDone 콜백 클로저에서 최신 에러를 읽기 위한 ref (state는 마운트 시점 값으로 캡처됨)
  const streamErrorsRef = useRef<string[]>([]);
  // onStreamDone 클로저에서 최신 streamText를 읽기 위한 ref
  const streamTextRef = useRef("");
  const [selectedModel, setSelectedModel] = useState("custom-gemma4:31b");
  const [selectedPersona, setSelectedPersona] = useState("default");
  const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatSeedMessages, setChatSeedMessages] = useState<Message[]>([]);
  // 답변 완료 시 xlsx 산출물을 자동 저장할지 여부(기본 ON)
  const [autoSaveXlsx, setAutoSaveXlsx] = useState(true);
  const autoSaveXlsxRef = useRef(true);
  // 자동 저장 결과 알림(배너)
  const [autoSaveNotice, setAutoSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    autoSaveXlsxRef.current = autoSaveXlsx;
  }, [autoSaveXlsx]);

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

  // 답변 완료 시 xlsx 표준 산출물을 감지해 자동 저장한다.
  // (알려진 산출물 템플릿 키워드 + 마크다운 표가 있을 때만 동작)
  const maybeAutoSaveXlsx = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === "Stream finished.") return;

    const hasTable = trimmed.includes("|") && /\|[-: ]+\|/.test(trimmed);
    if (!hasTable) return;

    let templateName: string | undefined;
    let defaultFileName: string | undefined;
    if (trimmed.toUpperCase().includes("WBS")) {
      templateName = "WBS-Template_표준양식.xlsx";
      defaultFileName = "WBS-산출물";
    } else if (trimmed.includes("공수")) {
      templateName = "Effort-Estimation_표준양식.xlsx";
      defaultFileName = "공수산정-산출물";
    } else if (trimmed.includes("갭분석") || trimmed.includes("Gap")) {
      templateName = "Gap-Analysis-Report_표준양식.xlsx";
      defaultFileName = "갭분석-산출물";
    }

    // 알려진 xlsx 산출물이 아니면 자동 저장하지 않는다.
    if (!templateName) return;

    try {
      const api = window.electronAPI;
      if (!api?.exportDocument) return;
      const res = await api.exportDocument({
        fileType: "xlsx",
        rawContent: trimmed,
        defaultFileName,
        templateName,
        autoSave: true,
      });
      if (res?.ok && res.filePath) {
        setAutoSaveNotice(`✅ 엑셀 자동 저장 완료: ${res.filePath}`);
        setTimeout(() => setAutoSaveNotice(null), 8000);
      } else if (res && !res.cancelled && res.error) {
        setAutoSaveNotice(`⚠️ 엑셀 자동 저장 실패: ${res.error}`);
        setTimeout(() => setAutoSaveNotice(null), 8000);
      }
    } catch (err) {
      setAutoSaveNotice(`⚠️ 엑셀 자동 저장 실패: ${String((err as Error)?.message ?? err)}`);
      setTimeout(() => setAutoSaveNotice(null), 8000);
    }
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onStreamToken) return;

    const unsubToken = api.onStreamToken((payload: StreamToken) => {
      setStreamText((prev) => {
        const next = `${prev}${readTokenText(payload)}`;
        streamTextRef.current = next;
        return next;
      });
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
        // 성공 완료 시: xlsx 산출물이면 자동 저장
        if (autoSaveXlsxRef.current) {
          void maybeAutoSaveXlsx(streamTextRef.current);
        }
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
    streamTextRef.current = "";
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
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="답변 완료 시 xlsx 산출물을 문서/OMX-Exports 폴더에 자동 저장"
          >
            <input
              type="checkbox"
              checked={autoSaveXlsx}
              onChange={(e) => setAutoSaveXlsx(e.target.checked)}
            />
            엑셀 자동 저장
          </label>
        </div>
        <PersonaSwitcher value={selectedPersona} onChange={setSelectedPersona} />
      </header>

      <WorkspacePermissionBanner />

      {autoSaveNotice && (
        <div
          style={{
            margin: "8px 16px 0",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #a7f3d0",
            background: "#ecfdf5",
            color: "#065f46",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {autoSaveNotice}
        </div>
      )}

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
            selectedPersona={selectedPersona}
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
