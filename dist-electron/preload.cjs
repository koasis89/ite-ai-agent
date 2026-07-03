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
  getTodoList: () => import_electron.ipcRenderer.invoke("omx:todo-get"),
  onTodoChange: (callback) => on("omx:todo-change", callback),
  onAdapterStatus: (callback) => on("omx:adapter-status", callback),
  probeAdapter: (target) => import_electron.ipcRenderer.invoke("omx:adapter-probe", target),
  geminiKey: {
    save: (key) => import_electron.ipcRenderer.invoke("omx:gemini-key:save", key),
    clear: () => import_electron.ipcRenderer.invoke("omx:gemini-key:clear"),
    getStatus: () => import_electron.ipcRenderer.invoke("omx:gemini-key:status")
  },
  /** EL-241: AI 답변을 오피스 파일(.xlsx/.docx)로 내보내기 */
  exportDocument: (payload) => import_electron.ipcRenderer.invoke("omx:export-document", payload),
  getSkillCatalog: () => import_electron.ipcRenderer.invoke("omx:skill-catalog:get"),
  getSkillCatalogWithPolicy: (payload) => import_electron.ipcRenderer.invoke("omx:skill-catalog:get", payload),
  invokeSkill: (payload) => import_electron.ipcRenderer.invoke("omx:skills:invoke", payload),
  listSkillContracts: () => import_electron.ipcRenderer.invoke("omx:skills:list"),
  getSkillExecutionPolicy: (payload) => import_electron.ipcRenderer.invoke("omx:skills:status-policy", payload),
  getSkillObservability: () => import_electron.ipcRenderer.invoke("omx:skills:observability:get"),
  onSkillFeedback: (callback) => on("omx:skills:feedback", callback),
  checkWorkspaceAccess: () => import_electron.ipcRenderer.invoke("omx:workspace-access:check"),
  convertMarkdownToDocx: (payload) => import_electron.ipcRenderer.invoke("omx:convert-md-to-docx", payload)
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.cjs.map
