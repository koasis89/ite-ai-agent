# Troubleshoot-01: `npm run desktop:dev` 첫 실행 마법사 미표시 + 버튼·Ctrl+N 무반응

- 작성일: 2026-05-24
- 관련 작업: WIN-063 (file:// 가드), WIN-074 (첫 실행 마법사)
- 영향 버전: 0.16.2 (post-WIN-075)

## 1. 증상

`npm run desktop:dev` 실행 시:

1. 9.4 절에 명세된 첫 실행 마법사(Welcome → Workspace → Updates → Telemetry → Done) 가 표시되지 않음.
2. 메인 윈도우의 모든 버튼이 클릭되지 않고, `Ctrl+N` ("＋ 새 세션") 단축키도 무반응.
3. 메뉴/HUD/사이드카 패널은 정적으로 렌더링되나 인터랙션 자체가 동작하지 않음.

## 2. 근본 원인

### 2.1 (주 원인) `installFilePrefixGuard` 화이트리스트 과축소

`desktop/main/index.ts` 의 file:// 가드(WIN-063)가 `<dist>/desktop/renderer/` 디렉터리만 허용:

```ts
const rendererDir = path.resolve(path.join(__dirname, "../renderer"));
const allowedPrefixes = [attachmentsDir, rendererDir];
```

그러나 렌더러 `app.js` 는 ES 모듈로 형제 디렉터리 `<dist>/desktop/ipc/` 의 모듈을 import:

```ts
import { HudViewModel } from "../ipc/hud.js";
import { SidecarViewModel } from "../ipc/sidecar.js";
```

해당 import 가 file:// 단계에서 `cancel: true` 로 차단되어 **app.js 의 첫 import 에서 모듈 로딩 실패** → 이후 모든 DOM 이벤트 핸들러 부착 코드가 실행되지 않음 → 버튼·Ctrl+N 전체 무반응.

### 2.2 (부수 원인) `FirstRunWizard` 미마운트

`desktop/renderer/first-run/Wizard.ts` 및 step 모듈은 컴파일되어 dist 에 존재하나, 렌더러 진입점 `desktop/renderer/app.ts` 에서 import/instantiate 하지 않음. 또한 `index.html` 에 호스트 노드가 없고, `preload` 또는 `runCommand` 어댑터를 통한 마운트 시퀀스 자체가 미구현.

## 3. 수정 내역

### 3.1 `desktop/main/index.ts` — file:// 가드 화이트리스트 확장

```ts
function installFilePrefixGuard(window: BrowserWindow): void {
  const attachmentsDir = path.resolve(path.join(app.getPath("userData"), "attachments"));
  const rendererDir = path.resolve(path.join(__dirname, "../renderer"));
  // WIN-063 fix: renderer app.js 는 ES 모듈로 `../ipc/*.js` (형제 dist 디렉터리) 를
  //   import 한다. 화이트리스트가 `renderer/` 만 허용하면 file:// 단계에서 차단되어
  //   app.js 가 첫 import 에서 실패 → 모든 버튼/Ctrl+N 무반응. 안전 경계는 여전히
  //   `<dist>/desktop/` 내부 — 사용자 임의 디렉터리 노출은 차단된 상태로 유지된다.
  const desktopDistDir = path.resolve(path.join(__dirname, ".."));
  const allowedPrefixes = [attachmentsDir, rendererDir, desktopDistDir];
  /* … 이하 동일 … */
}
```

보안 경계: 허용 prefix 가 `<dist>/desktop/` 으로 한정되어, 사용자 홈/임의 디렉터리 노출 차단은 그대로 유지.

### 3.2 `desktop/renderer/index.html` — 마법사 호스트 노드 추가

```html
<body>
  <!-- WIN-074: 첫 실행 마법사 호스트. 미완료 시 app.ts 가 .visible 클래스를 부여하고
                마법사가 메인 UI 위로 풀스크린 오버레이된다. 완료 후 hidden 처리. -->
  <div id="first-run-wizard-host" class="first-run-wizard-host" hidden></div>
  <main class="app">
```

### 3.3 `desktop/renderer/styles.css` — 마법사 오버레이 스타일 추가

말미에 `.first-run-wizard-host` 풀스크린 오버레이 + `.first-run-wizard` 카드 + `.first-run-step__*` 컴포넌트 스타일 블록 추가. 핵심:

```css
.first-run-wizard-host {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(15, 23, 42, 0.72);
  display: none; align-items: flex-start; justify-content: center;
  overflow-y: auto; padding: 48px 16px;
}
.first-run-wizard-host.visible { display: flex; }
.first-run-wizard {
  background: var(--panel); color: var(--ink);
  width: min(720px, 100%); border-radius: 14px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.45);
  padding: 24px 28px; display: flex; flex-direction: column; gap: 14px;
}
```

### 3.4 `desktop/renderer/app.ts` — `FirstRunWizard` 마운트

import 추가:

```ts
// WIN-074: 첫 실행 마법사 (4단계 — workspace / updates / telemetry / done).
import { FirstRunWizard } from "./first-run/Wizard.js";
```

진입 시퀀스 말미에 마운트 블록 추가:

```ts
const wizardHost = document.getElementById("first-run-wizard-host");
if (wizardHost && typeof window.omx?.runCommand === "function") {
  const hide = (): void => {
    wizardHost.classList.remove("visible");
    wizardHost.setAttribute("hidden", "");
    wizardHost.textContent = "";
  };
  const wizard = new FirstRunWizard({
    host: wizardHost,
    ipc: {
      runCommand: async (payload) => {
        const args = Array.isArray(payload.args)
          ? payload.args.filter((a): a is string => typeof a === "string")
          : [];
        const resp = (await window.omx!.runCommand({ command: payload.command, args })) as
          | { ok: boolean; data?: unknown; error?: { code?: string; message?: string } }
          | undefined;
        if (!resp) {
          return { ok: false, error: { code: "NO_BRIDGE", message: "window.omx.runCommand unavailable" } };
        }
        return resp;
      },
    },
    onComplete: () => {
      addTimeline("first-run-wizard.completed - WIN-074 wizard finished");
      hide();
    },
  });
  wizardHost.removeAttribute("hidden");
  wizardHost.classList.add("visible");
  void wizard.mount().catch((err) => {
    addTimeline(`first-run-wizard.error - ${(err as Error).message}`);
    hide();
  });
}
```

IPC 어댑터는 `window.omx.runCommand` 를 `WizardIpc` 인터페이스로 감싸 `wizard_state_get` / `wizard_step_complete` 채널을 사용. `completed=true` 또는 `disabled=true` 응답 시 `Wizard.refresh()` 내부에서 `onComplete` 즉시 호출 → 호스트 hide.

## 4. 검증 절차

```powershell
npm run build:desktop    # exit 0 확인
npm run desktop:dev      # 데스크탑 앱 기동
```

기대 동작:

1. 첫 실행 시(또는 `<userData>/first-run.json` 미존재 시) 풀스크린 오버레이 마법사 표시.
2. 4단계 (workspace → updates → telemetry → done) 진행 가능, primary 버튼 동작.
3. Done 단계 완료 시 오버레이 사라지고 메인 UI 노출.
4. 이미 완료된 상태(`completed=true`)면 마법사가 즉시 hide.
5. 메인 UI 의 모든 버튼·`Ctrl+N` ("＋ 새 세션") 정상 동작.
6. DevTools Console 빨간 에러 없음.

회귀 테스트:

- `npm run test:phase1:ipc-contract`
- `npm run test:phase2:common:compiled` (baseline 287/228/0/59)

## 5. 잔존 위험·후속 작업

- **(R1)** 만약 마법사 완료 후에도 일부 버튼이 무반응이면 별개의 ES 모듈 import 실패 가능성 (예: `DropZone` / `PreviewPanel` / `ToolHistoryPanel` 신규 모듈). DevTools Console 의 첫 빨간 에러를 기반으로 추가 진단 필요.
- **(R2)** file:// 가드의 허용 prefix 가 `<dist>/desktop/` 전체로 넓어졌으므로, 만약 미래에 main process 가 사용자 입력 파일을 동일 dist 경로 하위에 쓰는 경로 흐름이 생기면 path traversal 회귀 가능. 현재는 dist 디렉터리는 readonly 배포 산출물이므로 문제 없음.
- **(R3)** 마법사 호스트가 `z-index: 9999` 풀스크린이지만 키보드 트랩 처리는 브라우저 기본 동작에 의존. WCAG 2.1 focus trap 보강은 별도 태스크로 추적 권장.

## 6. 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `desktop/main/index.ts` | `installFilePrefixGuard` 화이트리스트에 `<dist>/desktop/` 부모 디렉터리 추가 |
| `desktop/renderer/index.html` | `#first-run-wizard-host` 마법사 호스트 노드 추가 |
| `desktop/renderer/styles.css` | `.first-run-wizard-host` / `.first-run-wizard` / `.first-run-step__*` 스타일 블록 추가 |
| `desktop/renderer/app.ts` | `FirstRunWizard` import + 마운트 블록 + IPC 어댑터 추가 |

---

## 7. 추가 이슈 ① — `＋ 새 세션` / `Ctrl+N` 클릭 시 세션이 생성되지 않음

### 7.1 증상

좌측 세션 패널의 `＋ 새 세션` 버튼 또는 `Ctrl+N` 단축키를 눌러도 세션이 생성되지 않고 placeholder "아직 세션이 없습니다" 가 그대로 표시됨. 콘솔 에러 없음.

### 7.2 원인

`desktop/renderer/chat/session-list.ts` 의 `createSession()` / `renameSession()` 기본 구현이 `window.prompt('세션 이름', ...)` 을 사용:

```ts
const promptFn = this.opts.promptName ?? ((cur) => window.prompt('세션 이름', cur ?? ''));
const raw = promptFn(def, 'create');
if (raw === null) return; // 취소
```

**Electron 은 `window.prompt()` 를 의도적으로 비활성화** — 호출 시 항상 `null` 반환 + DevTools Console 에 `Electron does not support prompt()` 경고. 결과적으로 "사용자가 취소함" 으로 해석되어 함수가 조용히 종료.

### 7.3 수정

**`desktop/renderer/chat/session-list.ts`** — `promptName` 시그니처를 비동기 가능하도록 확장하고 호출부를 `await` 화:

```ts
readonly promptName?: (
  currentName: string | null,
  mode: 'create' | 'rename',
) => string | null | Promise<string | null>;
```

`createSession` / `renameSession` 을 `async` 로 전환, 이벤트 핸들러는 `void this.createSession()` / `void this.renameSession(id)` 로 fire-and-forget.

**`desktop/renderer/app.ts`** — `SessionList` 생성자에 인라인 HTML 모달 기반 `promptName` 주입:

```ts
const promptName = (currentName, mode): Promise<string | null> => {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "session-prompt-backdrop";
    const card = document.createElement("div");
    card.className = "session-prompt-card";
    const input = document.createElement("input");
    input.type = "text"; input.value = currentName ?? ""; input.maxLength = 64;
    /* … OK/취소 버튼 + Enter/Escape 키 핸들러 + backdrop 클릭 시 취소 … */
    document.body.appendChild(backdrop);
    setTimeout(() => { input.focus(); input.select(); }, 0);
  });
};
sessionList = new SessionList({ /* els */ }, { promptName });
```

DOM 은 `textContent` / `value` 만 사용 — `innerHTML` 미사용 (XSS 회피).

**`desktop/renderer/styles.css`** — `.session-prompt-backdrop` / `.session-prompt-card` / `.session-prompt-input` / `.session-prompt-ok` / `.session-prompt-cancel` 추가.

### 7.4 검증

```powershell
npm run build:desktop
npm run desktop:dev
```

- `＋ 새 세션` 클릭 → 모달 표시 → 이름 입력 → `생성` → 세션 목록 갱신
- `Ctrl+N` (좌측 패널 활성 상태) 동일하게 모달 표시
- `F2` (이름 변경), `Delete` (삭제 확인 QuestionModal) 모두 정상 동작
- DevTools Console 에 `Electron does not support prompt()` 경고 사라짐

### 7.5 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `desktop/renderer/chat/session-list.ts` | `promptName` 비동기 시그니처 확장, `createSession`/`renameSession` async 전환 |
| `desktop/renderer/app.ts` | `SessionList` 인스턴스화 시 인라인 HTML 모달 prompt 주입 |
| `desktop/renderer/styles.css` | `.session-prompt-*` 모달 스타일 추가 |

---

## 8. 추가 이슈 ② — `[tool-stack] sqlite 미초기화 → bootstrap skip` / `[attachments] sqlite 미초기화 → bootstrap skip`

### 8.1 증상

`npm run desktop:dev` 콘솔에 다음 두 줄 출력:

```
[tool-stack] sqlite 미초기화 — bootstrap skip
[attachments] sqlite 미초기화 — bootstrap skip
```

연쇄 영향:

- **세션·메시지 영속 비활성** — 메모리 전용으로 동작하여 재시작 시 모든 세션·대화가 소실
- **도구 카탈로그 / 권한 / 호출 이력 IPC 비활성** — `tool_list` / `tool_call` / `tool_history_list` / `tool_permission_list` 등 `tool_*` 명령 fail-fast
- **첨부 IPC 전부 비활성** — `attachment_register` / `attachment_get` / `attachment_read_text` 등 fail-fast → 드래그·드롭/붙여넣기 첨부 실패

### 8.2 원인

[desktop/main/index.ts](desktop/main/index.ts) `bootstrapSqliteStore()` 에서 `openDatabase()` 가 예외를 던지면 `sqliteDb = null` 로 fallback:

```ts
} catch (err) {
  // native binding 부재 / ABI 불일치 등 — 앱 부팅은 계속 (Phase 4 in-memory fallback).
  console.error(`[sqlite] bootstrap failed: ${(err as Error).message}`);
  sqliteDb = null;
  /* …repo refs도 null… */
}
```

이후 `bootstrapToolStack()` (line 559~) 및 `bootstrapAttachmentStack()` (line 798~) 가 `if (!sqliteDb) { console.log("… bootstrap skip"); return; }` 로 조기 종료 → 사용자가 본 두 줄의 로그.

근본 원인: **`better-sqlite3` native binding 이 Node.js 20.19.4 ABI 로 빌드되어 있으나 Electron 35 는 자체 Chromium Node ABI 를 사용** → 모듈 `require()` 시 `NODE_MODULE_VERSION` 불일치로 로딩 실패. `package.json` 의 `postinstall` (`node src/scripts/postinstall-bootstrap.js`) 은 electron-rebuild 를 실행하지 않으므로 `npm ci` 직후엔 항상 이 상태가 됨.

### 8.3 수정

`@electron/rebuild` 로 `better-sqlite3` 만 Electron ABI 에 맞춰 재컴파일:

```powershell
npx --no-install electron-rebuild -f -w "better-sqlite3" --only "better-sqlite3"
```

성공 시 `Rebuild Complete` 출력. 이후 `npm run desktop:dev` 콘솔에서:

```
[sqlite] opened C:\Users\<user>\AppData\Roaming\oh-my-codex\data.sqlite (applied=5)
```

가 표시되고 `bootstrap skip` 메시지가 사라져야 함. (PowerShell 환경에서 stderr 진행 표시 때문에 exit code 1 이 떠도 "Rebuild Complete" 가 출력되었다면 정상.)

### 8.4 잔존 위험

- **(R4)** **`node-pty` 재빌드 실패** — `electron-rebuild` 가 node-pty 까지 포함하면 VS 2022 의 MSB8040 (Spectre-mitigated 라이브러리 부재) 로 실패. 해결안:
  - Visual Studio Installer → 개별 구성 요소 → `MSVC v143 - VS 2022 C++ x64/x86 Spectre 완화 라이브러리(최신)` 설치 후 재빌드, 또는
  - `--only better-sqlite3` 로 한정해 node-pty 재빌드를 회피 (현재 PTY 의존 기능이 활성 사용되지 않는 경우만 안전).
- **(R5)** **`npm ci` 직후 동일 증상 재발** — `postinstall` 에 electron-rebuild 가 자동 수행되지 않으므로 깨끗한 클론·CI 환경에서 동일 재현됨. 권장 후속:
  - `package.json` 의 `scripts` 에 `"electron:rebuild": "electron-rebuild -f -w better-sqlite3 --only better-sqlite3"` 추가
  - `desktop:dev` / `desktop:pack` / `desktop:package` 의 prelude 로 `electron:rebuild` 자동 실행
  - 또는 `postinstall-bootstrap.js` 에 native module 검출 → Electron ABI mismatch 시 자동 rebuild 로직 추가
- **(R6)** **실제 `[sqlite] bootstrap failed: <message>`** — 재빌드 후에도 skip 로그가 다시 나타나면 두 줄 직전의 `[sqlite] bootstrap failed: ...` 에러 메시지가 ABI 외 다른 원인 (디스크 권한, 마이그레이션 오류 등) 을 가리킴 → 별도 조사 필요.

### 8.5 변경 파일

없음 (코드 수정 아닌 빌드 환경 조치). 대신 다음을 후속 작업으로 추적 권장:

| 파일 | 권장 변경 |
|------|-----------|
| `package.json` | `electron:rebuild` 스크립트 추가 + `desktop:dev`/`desktop:pack`/`desktop:package` 전 prerequisite 로 호출 |
| `src/scripts/postinstall-bootstrap.js` | Electron 설치 확인 후 native module ABI mismatch 시 자동 rebuild 분기 |

