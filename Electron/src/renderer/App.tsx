import React, { useCallback, useEffect, useRef, useState } from "react";
import AdapterStatusBar from "./components/AdapterStatusBar";
import { ApiKeySettings } from "./components/ApiKeySettings";
import ChatContainer from "./components/ChatContainer";
import { LifecycleDashboard } from "./components/LifecycleDashboard";
import PersonaSwitcher from "./components/PersonaSwitcher";

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">OMX Desktop Agent</div>
          <div className="app-subtitle">Electron + Vite hot reload dev shell</div>
        </div>
        <PersonaSwitcher value={selectedPersona} onChange={setSelectedPersona} />
      </header>

      <main className="app-main">
        <section className="chat-pane">
          {selectedModel.startsWith("gemini-") && !geminiKeyAvailable && (
            <ApiKeySettings onKeySet={() => setGeminiKeyAvailable(true)} />
          )}
          <ChatContainer
            initialMessages={[
              {
                id: "welcome",
                role: "system",
                content: "OMX desktop development shell is running.",
              },
            ]}
            onSendMessage={handleSendMessage}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            streamingText={streamText}
            streamErrors={streamErrors}
            geminiKeyAvailable={geminiKeyAvailable}
          />
        </section>
        <LifecycleDashboard />
      </main>

      <AdapterStatusBar />
    </div>
  );
}
