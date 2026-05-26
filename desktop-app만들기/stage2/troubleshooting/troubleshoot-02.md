# Troubleshoot-02 — 채팅창 내부 수직 스크롤 (윈도우 전체 스크롤 제거)

> 작성일: 2026-05-24
> 관련 티켓: WIN-031 (채팅 UI 3분할 레이아웃) 후속 UX 보정
> 선행 문서: [troubleshoot-01.md](troubleshoot-01.md)

---

## 1. 증상

채팅 메시지가 누적되면 **Electron 윈도우 전체에 수직 스크롤바**가 생김.

- 기대: 채팅 메시지 영역(`#chat-message-list`) 내부에서만 스크롤
- 실제: `body` 가 늘어나면서 헤더·하단 패널(명령 실행 / HUD / Sidecar / 도구 호출 이력)까지 한 덩어리로 스크롤됨

## 2. 원인 — flex/grid 높이 체인이 끊겨 있음

`overflow: auto` 가 자식 요소에 걸려 있어도, **부모 체인 어딘가에 확정된 높이(`height`)** 가 없으면 부모가 자식 콘텐츠만큼 그냥 늘어나 버려 스크롤이 활성화되지 않는다.

기존 상태 — [desktop/renderer/chat.css](../../../desktop/renderer/chat.css):

```css
.chat-shell {
  /* ... */
  min-height: 420px;   /* 하한만 있고 상한 없음 → 콘텐츠가 자라면 같이 자람 */
  overflow: hidden;
}

.chat-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  /* min-height: 0 누락 — flex item 기본값 auto 가 자식 overflow 를 무력화 */
}

.chat-pane-body {
  flex: 1 1 auto;
  overflow: auto;
  /* min-height: 0 누락 — 동일 문제 */
}

#chat-message-list {
  flex: 1 1 auto;
  overflow: auto;
  /* 여기까지 도달해도 부모가 자라기 때문에 스크롤 발생 안 함 */
}
```

요약 두 가지 함정:

1. **상한 없는 높이**: `.chat-shell` 이 `min-height: 420px` 만 가지고 있어 메시지가 쌓이면 셸 자체가 세로로 늘어나 `body` 를 밀어냄.
2. **flex/grid 자식의 `min-height: auto` 함정**: flexbox/grid 자식은 기본적으로 콘텐츠 최소 크기(`min-height: auto`)를 가지며, 이것이 `overflow: auto` 를 무력화한다. 명시적으로 `min-height: 0` 을 줘야 자식이 줄어들 수 있어 내부 스크롤이 켜진다.

## 3. 수정

[desktop/renderer/chat.css](../../../desktop/renderer/chat.css) 3곳 변경:

### 3.1 `.chat-shell` — 뷰포트 기반 확정 높이

```css
.chat-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  /* ... */
  /* 변경: min-height: 420px 제거, height clamp 으로 상하한 확정 */
  height: clamp(360px, 65vh, 720px);
  overflow: hidden;
}
```

- `clamp(360px, 65vh, 720px)`: 뷰포트의 65% 를 기본 사용하되, 최소 360px / 최대 720px 로 캡.
- 셸 높이가 확정되어 내부 자식 `overflow: auto` 가 동작할 기반이 생긴다.

### 3.2 `.chat-pane` — `min-height: 0`

```css
.chat-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;   /* 추가 */
}
```

### 3.3 `.chat-pane-body` — `min-height: 0`

```css
.chat-pane-body {
  flex: 1 1 auto;
  overflow: auto;
  /* ... */
  min-height: 0;   /* 추가 */
}
```

> `#chat-message-list` 의 `overflow: auto` 는 기존 그대로 — 이제 부모 체인 높이가 확정되어 정상 활성화된다.

## 4. 적용 절차

```powershell
npm run build:desktop   # copy-assets 가 chat.css 를 dist-desktop 으로 복사
npm run desktop:dev     # 재실행
```

`build:desktop` 만 다시 돌리면 `dist-desktop/desktop/renderer/chat.css` 가 갱신된다. `tsc` 재컴파일은 CSS 변경에는 불필요하지만 한 번에 안전하게 돌리는 것이 편하다.

## 5. 검증

- [ ] 채팅 메시지를 20+ 건 누적해도 윈도우 전체 스크롤바가 생기지 않음
- [ ] `#chat-message-list` 내부에서만 마우스 휠 / 스크롤바 작동
- [ ] 좌측 세션 목록(`.chat-left .chat-pane-body`)과 우측 컨텍스트 패널도 자체 스크롤 가능 (동일 규칙 공유)
- [ ] 윈도우 리사이즈 시 65vh 비율로 부드럽게 따라옴 (최소 360 / 최대 720 캡 적용)
- [ ] 하단 명령 실행 / HUD / Sidecar / 도구 호출 이력 패널은 기존대로 페이지 스크롤로 접근

## 6. 배경 지식 — Flexbox/Grid Overflow Pitfall

CSS 작업에서 가장 자주 마주치는 함정 중 하나.

| 조건 | 결과 |
|------|------|
| 부모 `display: flex` 또는 `grid` | 자식의 `min-height` 기본값이 `auto` 가 됨 |
| 자식 `min-height: auto` | 자식이 콘텐츠 크기 이하로 줄어들지 못함 |
| 자식 `overflow: auto` 설정 | 줄어들지 못하므로 스크롤이 활성화되지 않고 부모가 늘어남 |
| **해결** | 자식에 명시적으로 `min-height: 0` (가로면 `min-width: 0`) |

또한 `overflow: auto` 의 스크롤이 생기려면 **그 요소 또는 조상 어딘가에 확정된 높이** 가 있어야 한다. `min-height` 만으로는 부족하며 `height` / `max-height` / `100%` 등으로 캡이 필요하다.

## 7. 대안 — 전체 화면을 차지하는 채팅 UI 로 가는 경우

향후 채팅이 메인 화면으로 승격되면 다음 패턴이 일반적:

```css
html, body { height: 100%; margin: 0; overflow: hidden; }
.app { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.chat-shell { flex: 1 1 auto; min-height: 0; height: auto; }
```

지금은 진단 패널들과 공존하는 단계이므로 `clamp()` 로 캡만 잡는 방식을 채택했다.

---

**Status**: ✅ 적용 완료 (CSS only, 빌드 산출물 갱신 필요)
**Touched files**: [desktop/renderer/chat.css](../../../desktop/renderer/chat.css)

---

# §8. 데모 echo 안내문의 슬래시 명령이 실제로 동작하지 않던 문제

## 8.1 증상

자유 텍스트 입력 후 표시되는 데모 echo 안내문:

```
지금 사용 가능한 실제 동작 명령:
- /omxstatestatus — 런타임 상태 조회
- /tool_list — 도구 카탈로그
- /history_list — 명령 이력
- /diagbundlecreate — 진단 번들 생성
```

→ 위 4개 모두 입력해도 `Unknown command:` 응답. 실제 슬래시 명령 목록과 다름.

## 8.2 원인 — 두 겹

### A) 안내문 자체가 잘못된 명령명을 하드코딩

[desktop/renderer/app.ts](../../../desktop/renderer/app.ts) 의 `onUserMessage` 데모 echo 가 슬래시 명령 SSOT 인 [desktop/renderer/chat/slash-commands.ts](../../../desktop/renderer/chat/slash-commands.ts) 를 참조하지 않고 IPC 명령명(`omx_state_status`, `tool_call` 등)을 슬래시 패턴으로 착각해 작성됨.

| 안내문 (잘못) | 실제 슬래시 패턴 (SSOT) | IPC command |
|---|---|---|
| `/omx_state_status` | `/omx state` | `omx_state_status` |
| `/tool_list` | (없음 — 도구 호출은 `/tool <toolId>`) | `tool_call` |
| `/history_list` | `/history [N]` | `history_list` |
| `/diag_bundle_create` | **(슬래시 매핑 없음)** | — |

슬래시 라우터는 공백 구분 토큰 패턴(`/omx state`, `/state field`) 으로 매칭하며 underscore 식별자를 받지 않는다.

### B) 채팅 렌더에서 `_` 가 italic 마커로 해석됨

`/omx_state_status` 가 화면에서 `/omxstatestatus` 로 보이는 이유 — 마크다운 렌더가 `_..._` 를 italic 처리해 `_` 를 제거함. 따라서 사용자가 화면 텍스트 그대로 복사해 입력하면 더 어긋남.

## 8.3 수정

[desktop/renderer/app.ts](../../../desktop/renderer/app.ts) 데모 echo 가 SSOT 의 `buildHelpText()` 를 그대로 사용하도록 변경 — 향후 슬래시 명령이 추가/변경돼도 안내문이 자동 동기화됨.

```ts
import { SlashRouter, type SlashDispatcher } from "./chat/slash-router.js";
import { buildHelpText } from "./chat/slash-commands.js";   // 추가

// ...

onUserMessage: (text, vm) => {
  const msg = vm.streamStart("assistant");
  const reply =
    `⚠️ 이 답변은 데모 echo 입니다 — 실제 LLM 백엔드 호출은 아직 연결되어 있지 않습니다.\n\n` +
    `> ${text}\n\n` +
    `자유 텍스트 채팅용 LLM IPC (chat_complete 등) 는 후속 스프린트에서 추가됩니다. ` +
    `지금 사용 가능한 실제 동작 명령은 아래 슬래시 명령뿐입니다 (\`/help\` 로도 확인 가능):\n\n` +
    buildHelpText();
  // ...
},
```

`buildHelpText()` 출력 (현재 시점):

```
### 슬래시 명령 목록

- `/state field <name>` — 상태 단일 필드 조회 (→ state_get_field)
- `/state` — 전체 상태 스냅샷 (→ state_get_status)
- `/hud` — HUD 스냅샷 조회 (→ hud_get_snapshot)
- `/sidecar [team]` — Sidecar 스냅샷 (→ sidecar_get_snapshot)
- `/versions` — 런타임 버전 정보 (→ versions_get)
- `/platform` — 플랫폼/OS 정보 (→ platform_get)
- `/history [N]` — 최근 명령 이력 N건 (→ history_list)
- `/bus` — 이벤트 버스 통계 (→ event_bus_stats)
- `/ask "<질문>" [옵션...]` — 질문 모달 (→ question_ask)
- `/echo <args...>` — 입력을 그대로 반환 (→ noop_echo)
- `/sleep <ms>` — 지정 시간 대기 (→ noop_sleep)
- `/omx adapt probe` — omx adapt probe (→ omx_adapt_probe)
- `/omx doctor` — omx doctor (→ omx_doctor)
- `/omx state` — omx state status (→ omx_state_status)
- `/tool <toolId> [args...]` — MCP/builtin 도구 호출 (→ tool_call)
- `/help` — 본 목록 표시
```

> 라우터 자체도 `/help` 입력을 받으면 동일 텍스트를 출력한다 ([slash-router.ts](../../../desktop/renderer/chat/slash-router.ts) line 195).

## 8.4 적용 절차

```powershell
npm run build:desktop
npm run desktop:dev
```

## 8.5 검증

- [ ] 자유 텍스트 입력 → 응답에 표시된 슬래시 명령을 그대로 복사해서 입력해도 동작
- [ ] `/help` 입력 시 동일한 명령 목록 출력
- [ ] `/omx state`, `/state`, `/hud`, `/history`, `/tool <toolId>` 동작 확인
- [ ] 향후 [slash-commands.ts](../../../desktop/renderer/chat/slash-commands.ts) 에 명령 추가 시 데모 echo 안내문도 자동 반영

## 8.6 향후 개선 메모

- `/diag_bundle_create` 같은 진단 번들 생성 명령은 IPC handler/슬래시 매핑이 아직 없음 → 별도 티켓에서 도입.
- free-text → LLM 호출용 `chat_complete` IPC 는 SP-08 이후 스프린트에 예정.

**Status**: ✅ 적용 완료 ([desktop/renderer/app.ts](../../../desktop/renderer/app.ts) — import 1줄 + 데모 echo 본문 SSOT 화)
**Touched files**:
- [desktop/renderer/app.ts](../../../desktop/renderer/app.ts) — `buildHelpText` import 및 데모 echo 본문 교체

---

# §9. `/omx doctor` → `permission denied (once)` (도구 권한 다이얼로그 미결선)

## 9.1 증상

```
/omx doctor
→ omx_doctor 실행 실패: omx_doctor: permission denied (once)
```

다른 builtin 도구(`/omx state`, `/omx adapt probe`)도 동일하게 `permission denied (once)` 반환.

## 9.2 원인 — PermissionBroker.prompt 가 임시 stub (deny-once)

[desktop/main/index.ts:624-630](../../../desktop/main/index.ts) (수정 전):

```ts
// prompt — Phase 7 후속에서 PermissionDialog 결선 예정. 현재는 안전 deny-once.
prompt: async (info) => {
  console.warn(`[permission-broker] prompt fallback (deny-once): ...`);
  return { scope: "once" as const, decision: "deny" as const };
},
```

권한 브로커의 의사결정 흐름:

1. 카탈로그 게이트 (도구 enabled 여부) — 통과
2. `OMX_DESKTOP_ALLOW_EXEC` env 단축 — 미설정 시 통과 (true)
3. **PermissionStore 조회 — miss (첫 호출이므로 저장된 권한 없음)**
4. **`prompt()` 호출 → stub 이 deny-once 반환 → throw `permission denied (once)`**

[desktop/renderer/permissions/PermissionDialog.ts](../../../desktop/renderer/permissions/PermissionDialog.ts) 컴포넌트 자체는 WIN-053 에서 완성돼 있었지만, main↔renderer **IPC 결선이 누락**된 상태였다.

## 9.3 수정 — main↔renderer 권한 다이얼로그 IPC 정식 결선

`QuestionBroker` 와 동일 패턴(broker singleton + 3개 IPC 채널) 으로 결선.

### 9.3.1 IPC 채널 정의 — [desktop/ipc/events.ts](../../../desktop/ipc/events.ts)

```ts
PERMISSION_PROMPT: "omx:permission:prompt",   // Main → Renderer push
PERMISSION_ANSWER: "omx:permission:answer",   // Renderer → Main reply
PERMISSION_CANCEL: "omx:permission:cancel",   // Renderer → Main 취소
```

### 9.3.2 권한 브로커 신설 — [desktop/ipc/permission-prompt.ts](../../../desktop/ipc/permission-prompt.ts) (신규)

`PermissionPromptBroker` 클래스 + 싱글톤 `permissionPromptBroker`. `QuestionBroker` 와 동일 구조:

- `ask(sender, input, opts)` → Promise (PROMPT push + pending 보관)
- `answer(payload)` / `cancel(payload)` — 매칭 후 resolve/reject
- `cancelBySender(senderId)` — 렌더러 종료 시 일괄 정리

### 9.3.3 main 결선 — [desktop/main/index.ts](../../../desktop/main/index.ts)

세 가지 변경:

```ts
// (a) mainWindow 모듈 캡처 — prompt callback 이 webContents 에 접근.
let currentMainWindow: BrowserWindow | null = null;

const createMainWindow = (): BrowserWindow => {
  // ...
  currentMainWindow = mainWindow;
  mainWindow.once("closed", () => {
    if (currentMainWindow === mainWindow) currentMainWindow = null;
  });
  return mainWindow;
};

// (b) ipcMain 리스너 — ANSWER/CANCEL.
ipcMain.on(IPC_CHANNELS.PERMISSION_ANSWER, (_e, payload) => {
  if (typeof payload === "object" && payload !== null) {
    permissionPromptBroker.answer(payload as ...);
  }
});
ipcMain.on(IPC_CHANNELS.PERMISSION_CANCEL, ... );

// 렌더러 destroyed 시 pending prompt 도 일괄 취소.
wc.once("destroyed", () => {
  // ...
  permissionPromptBroker.cancelBySender(wc.id, "renderer-destroyed");
});

// (c) PermissionBroker 의 prompt stub → 실제 다이얼로그 호출.
permissionBroker = new PermissionBroker({
  // ...
  prompt: async (info) => {
    const win = currentMainWindow;
    if (!win || win.isDestroyed()) return { scope: "once", decision: "deny" };
    const wc = win.webContents;
    try {
      const result = await permissionPromptBroker.ask(
        { id: wc.id, send: (c, p) => wc.send(c, p), isDestroyed: () => wc.isDestroyed() },
        { toolId: info.toolId, server: info.server, toolName: info.toolName,
          description: info.description, argsSummary: info.argsSummary },
      );
      return { scope: result.scope, decision: result.decision };
    } catch (err) {
      // 다이얼로그 실패/취소 → 안전한 deny-once.
      return { scope: "once", decision: "deny" };
    }
  },
});
```

### 9.3.4 preload 노출 — [desktop/preload/index.ts](../../../desktop/preload/index.ts)

`window.omx` 에 3개 메서드 추가:

```ts
onPermissionPrompt(handler) → unsubscribe   // ipcRenderer.on(PERMISSION_PROMPT)
answerPermission({ id, scope, decision })   // ipcRenderer.send(PERMISSION_ANSWER)
cancelPermission({ id, reason })            // ipcRenderer.send(PERMISSION_CANCEL)
```

### 9.3.5 렌더러 부착 — [desktop/renderer/app.ts](../../../desktop/renderer/app.ts)

QuestionModal 부착부 바로 아래에 PermissionDialog 부착 블록 추가:

```ts
const permissionDialog = new PermissionDialog();
let permissionUnsubscribe: (() => void) | null = null;

if (typeof window.omx?.onPermissionPrompt === "function") {
  permissionUnsubscribe = window.omx.onPermissionPrompt((rawPayload) => {
    if (!isPermissionPromptPayload(rawPayload)) return;
    const safeArgsSummary = rawPayload.argsSummary
      ? maskArgsSummary(rawPayload.argsSummary)   // 방어적 재마스킹
      : undefined;
    permissionDialog.open(
      { ...rawPayload, argsSummary: safeArgsSummary },
      {
        onSubmit: (answer) => window.omx?.answerPermission?.(answer),
        onCancel: (payload) => window.omx?.cancelPermission?.(payload),
      },
    );
  });
}

// beforeunload 에서도 unsubscribe.
```

### 9.3.6 CSS 추가 — [desktop/renderer/styles.css](../../../desktop/renderer/styles.css)

`PermissionDialog.ts` 가 생성하는 BEM 클래스(`omx-permission-modal__*`) 4선택지(`once/session/permanent/deny`) 스타일.

## 9.4 사용 흐름

1. 사용자가 `/omx doctor` 입력
2. main: `PermissionBroker.check()` → store miss → `prompt()` 호출
3. `PermissionPromptBroker.ask()` → `PERMISSION_PROMPT` push to renderer
4. 렌더러: `PermissionDialog.open()` 호출 → 모달 표시
   - 도구 ID `builtin:omx_doctor`, 서버 `builtin`, 이름 `omx_doctor`, 인자 요약
5. 사용자 선택: **이번 1회 / 이 세션 / 영구 / 거부**
6. 렌더러: `answerPermission({ id, scope, decision })` send
7. main: `PermissionPromptBroker.answer()` → 대기 중인 Promise resolve
8. PermissionBroker: scope 가 `permanent`/`session` 이면 PermissionStore 에 저장, decision 반환
9. ToolRouter: allow → `omx doctor` 실제 실행 결과 표시

## 9.5 적용 절차

```powershell
npm run build:desktop
npm run desktop:dev
```

빌드 성공 확인됨 (tsc 에러 0).

## 9.6 검증

- [ ] `/omx doctor` 입력 시 **권한 다이얼로그 모달**이 뜸 (기존: 즉시 deny)
- [ ] **이번 1회 허용** 선택 → 1회만 통과, 다음 호출 시 다시 모달
- [ ] **영구 허용** 선택 → 이후 같은 도구는 모달 없이 즉시 통과 (`<userData>/data.sqlite` 의 permissions 테이블에 영구 저장)
- [ ] **거부** 선택 또는 ESC → `permission denied (once)` 응답
- [ ] `OMX_DESKTOP_ALLOW_EXEC=0` 환경변수 설정 시 다이얼로그 없이 즉시 deny (env 단축 유지)
- [ ] `/tool <toolId>` (MCP 도구) 도 동일 흐름으로 동작

## 9.7 보안 메모

- `argsSummary` 는 main 측에서 호출 전에 마스킹돼서 전달되지만 렌더러도 `maskArgsSummary()` 한 번 더 적용 (defense in depth, `password=*** / api_key=***` 패턴).
- ESC / 외부 클릭은 **deny-once** 처리(안전한 기본값). 사용자가 명시적으로 "거부" 버튼을 누르지 않아도 자동 거부됨.
- 렌더러 종료/언로드 시 main 의 미응답 prompt 도 `cancelBySender` 로 자동 정리되어 promise leak 방지.
- 영구 허용은 SQLite (`<userData>/data.sqlite`) 에 저장되므로 앱 재시작 후에도 유지. 회수는 차후 UI(설정 패널) 또는 직접 DB 조작.

## 9.8 후속 개선 메모

- 권한 회수 UI(설정 패널 → 도구별 권한 목록 + revoke 버튼) — 별도 티켓.
- `tool.permission.changed` 이벤트는 이미 main → renderer 로 publish 중 ([desktop/main/index.ts:632-643](../../../desktop/main/index.ts)) → 향후 system 메시지로 채팅에 띄우는 것도 검토.

**Status**: ✅ 적용 완료 (IPC 결선 신규)
**Touched files**:
- [desktop/ipc/events.ts](../../../desktop/ipc/events.ts) — 3개 채널 추가
- [desktop/ipc/permission-prompt.ts](../../../desktop/ipc/permission-prompt.ts) — **신규** `PermissionPromptBroker` + 싱글톤
- [desktop/main/index.ts](../../../desktop/main/index.ts) — `currentMainWindow` 캡처, ipcMain 리스너, `prompt` 콜백 결선
- [desktop/preload/index.ts](../../../desktop/preload/index.ts) — `onPermissionPrompt` / `answerPermission` / `cancelPermission` 노출
- [desktop/renderer/app.ts](../../../desktop/renderer/app.ts) — `PermissionDialog` 인스턴스 + 구독/응답/언로드 정리
- [desktop/renderer/styles.css](../../../desktop/renderer/styles.css) — `omx-permission-modal__*` 4선택지 스타일
