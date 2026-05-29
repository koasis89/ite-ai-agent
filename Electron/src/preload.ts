import { contextBridge, ipcRenderer } from "electron";

type Listener<T = unknown> = (payload: T) => void;

function on<T = unknown>(channel: string, callback: Listener<T>): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const electronAPI = {
  cliExec: (args: string[]) => ipcRenderer.invoke("cli_exec", { args }),

  startAgentStream: (payload: {
    command: string;
    args?: string[];
    reasoningEffort?: "low" | "standard" | "high";
    provider?: "claude" | "gemini";
    model?: string;
  }) => ipcRenderer.invoke("omx:agent-stream:start", payload),
  stopAgentStream: () => ipcRenderer.invoke("omx:agent-stream:stop"),
  onStreamToken: (callback: Listener) => on("omx:stream-token", callback),
  onStreamThinking: (callback: Listener) => on("omx:stream-thinking", callback),
  onStreamToolCall: (callback: Listener) => on("omx:stream-tool-call", callback),
  onStreamToolResult: (callback: Listener) => on("omx:stream-tool-result", callback),
  onStreamDone: (callback: Listener) => on("omx:stream-done", callback),
  onStreamError: (callback: Listener) => on("omx:stream-error", callback),

  onInterludeStart: (callback: Listener) => on("omx:interlude-start", callback),
  onInterludeResolved: (callback: Listener) => on("omx:interlude-resolved", callback),
  onInterludeCancelled: (callback: Listener) => on("omx:interlude-cancelled", callback),
  sendInterludeAck: (ack: { callId: string; approved: boolean; userInput?: string }) =>
    ipcRenderer.invoke("omx:interlude-ack", ack),

  getLifecycleState: () => ipcRenderer.invoke("omx:lifecycle-get"),
  onLifecycleChange: (callback: Listener) => on("omx:lifecycle-change", callback),
  startLifecycleWatcher: (stateDir: string) => ipcRenderer.invoke("omx:lifecycle-start", stateDir),
  stopLifecycleWatcher: () => ipcRenderer.invoke("omx:lifecycle-stop"),

  getTodoList: () => ipcRenderer.invoke("omx:todo-get"),
  onTodoChange: (callback: Listener) => on("omx:todo-change", callback),

  onAdapterStatus: (callback: Listener) => on("omx:adapter-status", callback),
  probeAdapter: (target: "openclaw" | "hermes") => ipcRenderer.invoke("omx:adapter-probe", target),

  geminiKey: {
    save: (key: string) => ipcRenderer.invoke("omx:gemini-key:save", key) as Promise<{ ok: boolean }>,
    clear: () => ipcRenderer.invoke("omx:gemini-key:clear") as Promise<{ ok: boolean }>,
    getStatus: () => ipcRenderer.invoke("omx:gemini-key:status") as Promise<{ available: boolean }>,
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
