"use strict";

// Electron/src/preload.ts
var import_electron = require("electron");
function on(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  import_electron.ipcRenderer.on(channel, listener);
  return () => import_electron.ipcRenderer.removeListener(channel, listener);
}
var electronAPI = {
  cliExec: (args) => import_electron.ipcRenderer.invoke("cli_exec", { args }),
  startAgentStream: (payload) => import_electron.ipcRenderer.invoke("omx:agent-stream:start", payload),
  stopAgentStream: () => import_electron.ipcRenderer.invoke("omx:agent-stream:stop"),
  onStreamToken: (callback) => on("omx:stream-token", callback),
  onStreamThinking: (callback) => on("omx:stream-thinking", callback),
  onStreamToolCall: (callback) => on("omx:stream-tool-call", callback),
  onStreamToolResult: (callback) => on("omx:stream-tool-result", callback),
  onStreamDone: (callback) => on("omx:stream-done", callback),
  onStreamError: (callback) => on("omx:stream-error", callback),
  onInterludeStart: (callback) => on("omx:interlude-start", callback),
  onInterludeResolved: (callback) => on("omx:interlude-resolved", callback),
  onInterludeCancelled: (callback) => on("omx:interlude-cancelled", callback),
  sendInterludeAck: (ack) => import_electron.ipcRenderer.invoke("omx:interlude-ack", ack),
  getLifecycleState: () => import_electron.ipcRenderer.invoke("omx:lifecycle-get"),
  onLifecycleChange: (callback) => on("omx:lifecycle-change", callback),
  startLifecycleWatcher: (stateDir) => import_electron.ipcRenderer.invoke("omx:lifecycle-start", stateDir),
  stopLifecycleWatcher: () => import_electron.ipcRenderer.invoke("omx:lifecycle-stop"),
  onAdapterStatus: (callback) => on("omx:adapter-status", callback),
  probeAdapter: (target) => import_electron.ipcRenderer.invoke("omx:adapter-probe", target)
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.cjs.map
