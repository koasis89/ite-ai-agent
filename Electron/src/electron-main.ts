import { app, BrowserWindow, Menu, shell, session } from "electron";
import path from "node:path";
import { registerAdapterIpc } from "./main/ipc/adapter-ipc";
import { registerCliIpc } from "./main/ipc/cli-ipc";
import { registerEnvIpc } from "./main/ipc/env-ipc";
import { registerExportIpc } from "./main/ipc/export-ipc";
import { registerInterludeIpc } from "./main/ipc/interlude-ipc";
import { registerStateIpc } from "./main/ipc/state-ipc";
import { registerStreamBridgeIpc } from "./main/ipc/stream-bridge-ipc";
import { registerSkillCatalogIpc } from "./main/ipc/skill-catalog-ipc";
import { registerSkillsIpc } from "./main/ipc/skills-ipc";
import { registerWorkspaceAccessIpc } from "./main/ipc/workspace-access-ipc";
import { registerMdDocxIpc } from "./main/ipc/md-docx-ipc";
import { sessionLogger } from "./main/logs/session-logger";

const bundleDir = __dirname;
const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let skillWindow: BrowserWindow | null = null;

function isBrokenPipeError(error: unknown): error is NodeJS.ErrnoException {
  if (!(error instanceof Error)) {
    return false;
  }
  const errno = error as NodeJS.ErrnoException;
  return errno.code === "EPIPE";
}

function installBrokenPipeGuards(): void {
  const swallowBrokenPipe = (error: unknown) => {
    if (isBrokenPipeError(error)) {
      return;
    }
  };

  process.stdout?.on("error", swallowBrokenPipe);
  process.stderr?.on("error", swallowBrokenPipe);
}

installBrokenPipeGuards();

function registerIpc(): void {
  registerCliIpc();
  registerEnvIpc();
  registerInterludeIpc();
  registerStateIpc();
  registerStreamBridgeIpc();
  registerSkillCatalogIpc();
  registerSkillsIpc();
  registerWorkspaceAccessIpc();
  registerMdDocxIpc();
  registerAdapterIpc();
  registerExportIpc();
}

async function loadAppWindow(win: BrowserWindow, panel?: "skills"): Promise<void> {
  if (isDev) {
    const url = panel ? `http://127.0.0.1:5173/?panel=${panel}` : "http://127.0.0.1:5173";
    await win.loadURL(url);
    return;
  }

  await win.loadFile(path.join(bundleDir, "renderer", "index.html"), {
    search: panel ? `?panel=${panel}` : "",
  });
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

  mainWindow = win;

  await loadAppWindow(win);

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }
}

async function openSkillWindow(): Promise<void> {
  if (skillWindow && !skillWindow.isDestroyed()) {
    skillWindow.focus();
    return;
  }

  skillWindow = new BrowserWindow({
    width: 460,
    height: 760,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: "#f8fafc",
    title: "Skill List",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(bundleDir, "preload.cjs"),
    },
  });

  skillWindow.on("closed", () => {
    skillWindow = null;
  });

  await loadAppWindow(skillWindow, "skills");
}

function buildAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "View",
      submenu: [
        {
          label: "Log",
          click: async () => {
            const logPath = sessionLogger.getLogPath();
            if (!logPath) {
              return;
            }
            await shell.openPath(logPath);
          },
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
      ],
    },
    {
      label: "Skill",
      submenu: [
        {
          label: "View",
          click: () => {
            void openSkillWindow();
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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

  // 세션 로거 초기화 — 실행 위치 기준 log 폴더에 파일 저장
  sessionLogger.init(path.join(process.cwd(), "log"));

  registerIpc();
  buildAppMenu();
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
