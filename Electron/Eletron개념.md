# Electron 이란?

**Electron** = 데스크탑 앱(Windows / macOS / Linux 실행파일)을 **웹 기술(HTML + CSS + JavaScript)** 로 만들 수 있게 해주는 오픈소스 프레임워크. GitHub 가 Atom 에디터를 위해 만들었고 현재는 OpenJS Foundation 산하.

## 구성 — 두 개의 런타임이 묶여있음

| 구성요소 | 역할 |
|---------|------|
| **Chromium** | UI 렌더링 엔진. 실제 UI 는 브라우저 안의 웹페이지처럼 동작 (HTML/CSS/JS). |
| **Node.js** | 파일 시스템·OS API·네이티브 모듈 접근. 브라우저는 못 하는 일을 처리. |

두 런타임이 결합된 결과 → 웹 개발자가 익숙한 기술로 **시스템 권한이 있는 데스크탑 앱**을 만들 수 있음.

## 프로세스 모델

- **Main process** (Node.js 환경) — 앱 생명주기, 창 생성, 파일 I/O, IPC 허브. 이 프로젝트의 index.ts 가 여기.
- **Renderer process** (Chromium 환경) — 각 창마다 1개. UI 코드. 이 프로젝트의 app.ts 가 여기.
- **Preload script** — main 과 renderer 사이의 안전한 브릿지. desktop/preload/index.js → `window.omx.runCommand` 같은 API 노출.
- **IPC** (`ipcMain` / `ipcRenderer`) — 두 프로세스 간 메시지 통로. commands.ts 의 `wizard_state_get` 등이 이걸로 동작.

## 대표 사용 사례

VS Code, Discord, Slack, Figma 데스크탑, Notion, WhatsApp Desktop, GitHub Desktop, 1Password 등 — 거의 다 Electron 으로 만들어졌습니다.

## 이번 프로젝트(`ite-ai-codex-js`)에서

- **버전**: Electron 35.7.5
- **실행 명령**: `npm run desktop:dev` → `electron dist-desktop/desktop/main/index.js` 가 Electron 런타임을 띄워서 main process 진입점을 실행
- **렌더러 보안 설정**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` — 렌더러에서 직접 Node.js API 호출 불가, preload 의 `contextBridge` 로 노출된 함수만 호출 가능 (XSS·악성 코드 방어)
- **`window.prompt()` 가 동작 안 한 이유 (§7)**: Electron 의 Chromium 은 의도적으로 `prompt()` 를 비활성화 (보안·UX 이유). Chrome 브라우저도 v95+ 부터 cross-origin iframe 에서 prompt 차단.
- **SQLite 가 죽었던 이유 (§8)**: Electron 의 Node 부분은 표준 Node.js 와 **Node ABI (Application Binary Interface) 버전이 다름**. C++ native module (`better-sqlite3` 같은) 은 특정 ABI 로 컴파일되어 있어야 하며, 일반 `npm install` 은 시스템 Node 용으로만 빌드 → Electron 에서 로딩 실패. 그래서 `electron-rebuild` 로 재컴파일이 필요.

## 장단점

**장점**: 크로스 플랫폼 단일 코드베이스, 웹 개발 생태계 활용, 빠른 개발.
**단점**: 메모리 사용량 큼(Chromium + Node 각각 메모리 점유), 앱 패키지 크기 100MB+, native 앱 대비 성능·OS 통합도 떨어짐.

요약: **"브라우저 + Node.js 를 통째로 앱에 끼워 넣어, 웹 페이지를 데스크탑 창처럼 실행시켜주는 런타임"** 이라고 보면 됩니다.
