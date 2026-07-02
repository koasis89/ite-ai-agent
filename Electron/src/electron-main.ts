import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import { registerAdapterIpc } from "./main/ipc/adapter-ipc";
import { registerCliIpc } from "./main/ipc/cli-ipc";
import { registerEnvIpc } from "./main/ipc/env-ipc";
import { registerExportIpc } from "./main/ipc/export-ipc";
import { registerInterludeIpc } from "./main/ipc/interlude-ipc";
import { registerStateIpc } from "./main/ipc/state-ipc";
import { registerStreamBridgeIpc } from "./main/ipc/stream-bridge-ipc";
import { sessionLogger } from "./main/logs/session-logger";

const bundleDir = __dirname;
const isDev = !app.isPackaged;

function registerIpc(): void {
  registerCliIpc();
  registerEnvIpc();
  registerInterludeIpc();
  registerStateIpc();
  registerStreamBridgeIpc();
  registerAdapterIpc();
  registerExportIpc();
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(bundleDir, "preload.cjs"),
    },
  });

  if (isDev) {
    await win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await win.loadFile(path.join(bundleDir, "renderer", "index.html"));
}

app.whenReady().then(async () => {
  // CSP 헤더 설정 (Electron Security Warning 해소)
  // dev: Vite HMR을 위해 unsafe-eval 허용, prod: 엄격 제한
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? [
          "default-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173;",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://127.0.0.1:5173;",
          "style-src 'self' 'unsafe-inline';",
          "connect-src 'self' ws://127.0.0.1:5173;",
          "img-src 'self' data:;",
        ].join(" ")
      : [
          "default-src 'self';",
          "script-src 'self';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data:;",
        ].join(" ");

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  // 세션 로거 초기화 — IPC 등록 전에 실행하여 첫 메시지부터 캡처
  sessionLogger.init(path.join(app.getPath("userData"), "logs"));

  registerIpc();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
