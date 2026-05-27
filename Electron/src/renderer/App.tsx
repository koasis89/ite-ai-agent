import React, { useCallback, useEffect, useState } from "react";
import AdapterStatusBar from "./components/AdapterStatusBar";
import ChatContainer from "./components/ChatContainer";
import { LifecycleDashboard } from "./components/LifecycleDashboard";

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
  const [selectedModel, setSelectedModel] = useState("echo");

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onStreamToken) return;

    const unsubToken = api.onStreamToken((payload: StreamToken) => {
      setStreamText((prev) => `${prev}${readTokenText(payload)}`);
    });
    const unsubError = api.onStreamError?.((payload: { message?: string }) => {
      if (payload?.message) {
        setStreamErrors((prev) => [...prev.slice(-4), payload.message]);
      }
    });
    const unsubDone = api.onStreamDone?.(() => {
      setStreamText((prev) => (prev.trim() ? prev : "Stream finished."));
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
    void window.electronAPI?.startAgentStream?.({
      command: "exec",
      args: [text],
      reasoningEffort: "standard",
      model: selectedModel,
    });
  }, [selectedModel]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="app-title">OMX Desktop Agent</div>
          <div className="app-subtitle">Electron + Vite hot reload dev shell</div>
        </div>
      </header>

      <main className="app-main">
        <section className="chat-pane">
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
          />
        </section>
        <LifecycleDashboard />
      </main>

      <AdapterStatusBar />
    </div>
  );
}
