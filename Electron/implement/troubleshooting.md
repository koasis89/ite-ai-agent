# Troubleshooting Guide

## `spawn omx ENOENT` 에러 (Windows)

### 증상

`npm run dev:electron` 실행 시 콘솔에 다음 에러가 반복 출력됨:

```
Error: spawn omx ENOENT
    at Process.ChildProcess._handle.onexit (node:internal/child_process:...)
    at onErrorNT (node:internal/child_process:...)
    ...
```

`AdapterIpc` 폴링 루프(30초 간격)가 ENOENT를 catch하지 못해 에러가 반복됨.

---

### 근본 원인

Windows에서 npm 글로벌 명령(`omx`)은 실제로 `omx.cmd` 래퍼 파일로 설치됨.
`child_process.spawn('omx', args, { shell: false })` 호출 시 Windows의 `CreateProcess`는 `.cmd` 확장자 없이는 실행 파일을 찾지 못하므로 `ENOENT`가 발생함.

macOS/Linux에서는 `omx` 바이너리가 직접 존재하므로 동일 코드에서 문제가 없음.

---

### 수정 내용

#### 1. `Electron/src/main/cli/cli-wrapper.ts`

Windows에서만 `shell: true`를 사용하도록 `useShell` 프로퍼티 추가.

```typescript
private readonly baseCmd: string;
/** Windows에서 npm 글로벌 .cmd 래퍼를 통해 실행하기 위해 shell 모드 활성화 */
private readonly useShell: boolean;

constructor(baseCmd = "omx") {
  this.baseCmd = baseCmd;
  this.useShell = process.platform === "win32";
}
```

`executeUnary`와 `executeStream` 양쪽에 `shell: this.useShell` 적용:

```typescript
// 변경 전
const child = spawn(this.baseCmd, args, { shell: false });

// 변경 후
const child = spawn(this.baseCmd, args, { shell: this.useShell });
```

#### 2. `Electron/src/main/env/env-checker.ts`

내부 `runCommand` 헬퍼의 `spawn` 옵션 수정:

```typescript
// 변경 전
const child = spawn(cmd, args, { shell: false });

// 변경 후
const child = spawn(cmd, args, { shell: process.platform === "win32" });
```

#### 3. `Electron/src/main/cli/adapter-probe.ts`

`probeAdapter` 함수에 ENOENT graceful fallback 추가:

```typescript
// 변경 전
const statusEnvelope = await _cli.executeUnary(["adapt", target, "status", "--json"]);

// 변경 후
let statusEnvelope: CliEnvelope;
try {
  statusEnvelope = await _cli.executeUnary(["adapt", target, "status", "--json"]);
} catch (err) {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") {
    console.warn(`[AdapterProbe] omx CLI를 찾을 수 없음 (${target}):`, (err as Error).message);
  } else {
    console.warn(`[AdapterProbe] 상태 조회 실패 (${target}):`, err);
  }
  return { target, status: "unavailable", probed_at };
}
```

`CliEnvelope` 타입 import도 함께 추가:

```typescript
// 변경 전
import { CliWrapper } from "./cli-wrapper";

// 변경 후
import { CliWrapper, type CliEnvelope } from "./cli-wrapper";
```

---

### 수정 후 동작

| 상황 | 동작 |
|------|------|
| `omx` 설치됨 (Windows) | `omx.cmd`를 shell을 통해 정상 실행 |
| `omx` 설치됨 (macOS/Linux) | 기존과 동일하게 직접 실행 |
| `omx` 미설치 | ENOENT catch → `warn` 로그 출력 + `unavailable` 반환 → 앱 정상 기동 |

---

### ADR-001 원칙 유지

`shell: true` 사용은 보안상 주의가 필요하지만, `baseCmd`는 생성자에서 고정 문자열(`"omx"`)로만 설정되고 사용자 입력이 직접 전달되지 않으므로 셸 인젝션 위험이 없음.

> **주의**: `spawn(cmd, args, { shell: true })` 패턴에서 `cmd`나 `args`에 사용자 입력을 그대로 넣지 말 것.

---

## 관련 파일

- [`Electron/src/main/cli/cli-wrapper.ts`](../src/main/cli/cli-wrapper.ts)
- [`Electron/src/main/env/env-checker.ts`](../src/main/env/env-checker.ts)
- [`Electron/src/main/cli/adapter-probe.ts`](../src/main/cli/adapter-probe.ts)
- [`Electron/src/main/ipc/adapter-ipc.ts`](../src/main/ipc/adapter-ipc.ts)

---

## `봉투 스키마 불일치` 에러 (CliWrapper discriminator)

### 증상

`ENOENT` 수정 후 다음 에러가 반복 출력됨:

```
[AdapterProbe] 상태 조회 실패 (hermes): Error: [CliWrapper] 봉투 스키마 불일치: [
  {
    "code": "invalid_union",
    "note": "No matching discriminator",
    "discriminator": "ok",
    "options": [true, false],
    "path": ["ok"],
    "message": "Invalid discriminator value. Expected 'true' | 'false'"
  }
]
```

### 근본 원인

`CliEnvelopeSchema`는 `ok: true | false` discriminator를 가진 표준 봉투를 기대함:

```json
{ "schema_version": "1.0", "ok": true, "data": {...} }
```

그러나 `omx adapt <target> status --json`의 실제 출력은 자체 포맷:

```json
{
  "schemaVersion": "1.0",
  "target": "hermes",
  "adapter": { "state": "not-initialized", ... },
  "targetRuntime": { "state": "unavailable", ... },
  ...
}
```

`ok` 필드 자체가 없어 discriminatedUnion 파싱이 실패함.

---

### 수정 내용

#### 1. `Electron/src/main/cli/cli-wrapper.ts`

봉투 스키마 검증 없이 raw JSON을 반환하는 `executeUnaryRaw()` 메서드 추가:

```typescript
// 추가된 메서드
executeUnaryRaw(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(this.baseCmd, args, { shell: this.useShell });
    // ... stdout 수집 후
    resolve(JSON.parse(raw)); // parseEnvelope() 호출 없음
  });
}
```

#### 2. `Electron/src/main/cli/adapter-probe.ts`

실제 CLI 출력 스키마 및 상태 매핑 함수 추가:

```typescript
// omx adapt <target> status --json 실제 출력 스키마
const OmxAdaptStatusRawSchema = z.object({
  schemaVersion: z.string().optional(),
  adapter: z.object({ state: z.string() }).optional(),
  targetRuntime: z.object({ state: z.string() }).optional(),
});

// adapter.state / targetRuntime.state → AdapterStatus 매핑
function resolveAdapterStatus(
  adapterState: string | undefined,
  runtimeState: string | undefined
): AdapterStatus {
  if (runtimeState === "running" || adapterState === "running") return "running";
  if (runtimeState === "degraded" || adapterState === "degraded") return "degraded";
  if (adapterState === "ready" || adapterState === "installed") return "installed";
  return "unavailable";
}
```

status / envelope / probe 세 호출을 `executeUnary` → `executeUnaryRaw`로 교체:

```typescript
// 변경 전
const statusEnvelope = await _cli.executeUnary(["adapt", target, "status", "--json"]);
const status = AdapterStatusSchema.safeParse(statusEnvelope.data?.status).data ?? "unavailable";

// 변경 후
const rawStatusJson = await _cli.executeUnaryRaw(["adapt", target, "status", "--json"]);
const parsedStatus = OmxAdaptStatusRawSchema.safeParse(rawStatusJson);
const status = parsedStatus.success
  ? resolveAdapterStatus(parsedStatus.data.adapter?.state, parsedStatus.data.targetRuntime?.state)
  : "unavailable";
```

---

### 상태 매핑 표

| `adapter.state` / `targetRuntime.state` | `AdapterStatus` |
|---|---|
| `running` | `running` |
| `degraded` | `degraded` |
| `ready` / `installed` | `installed` |
| `not-initialized` / 기타 | `unavailable` |

---

### 관련 파일 (추가)

- [`Electron/src/main/cli/cli-wrapper.ts`](../src/main/cli/cli-wrapper.ts) — `executeUnaryRaw` 추가

---

## 채팅 입력 무응답 + CSP 경고

### 증상

1. 채팅창에 메시지를 입력하고 전송해도 아무런 응답이 없음
2. DevTools 콘솔에 보안 경고 출력:
   ```
   Electron Security Warning (Insecure Content-Security-Policy) This renderer process
   has either no Content Security Policy set or a policy with "unsafe-eval" enabled.
   ```
3. DevTools 콘솔에 무해한 Chromium 호환 에러 출력 (부수현상):
   ```
   Request Autofill.enable failed. {"code":-32601,"message":"'Autofill.enable' wasn't found"}
   Request Autofill.setAddresses failed. {"code":-32601,"message":"'Autofill.setAddresses' wasn't found"}
   ```

---

### 원인 분석

#### 원인 1 — 채팅 무응답: `execute-command.ts`의 `shell: false` (Windows 버그)

채팅 전송 경로:

```
ChatContainer.onSendMessage
  → App.handleSendMessage
  → window.electronAPI.startAgentStream({ command: "ask", args: [text] })
  → IPC: omx:agent-stream:start
  → stream-bridge-ipc.startAgentStream()
  → executeCommand({ command: "ask", ... })
  → spawn("omx", ["ask", text, "--stream-json", ...], { shell: false })  ← ❌ ENOENT
```

Windows에서 `omx`는 `omx.cmd` 래퍼로 설치됨. `shell: false` 상태에서 `spawn('omx', ...)`은
`CreateProcess`가 `.cmd`를 찾지 못해 조용히 실패함.
→ `executeCommand`의 `onError` / `onRawLine` 콜백이 호출되지 않아 Renderer에 응답이 전혀 없음.

> `cli-wrapper.ts`와 동일한 패턴 버그. `execute-command.ts`에도 동일하게 적용 필요.

#### 원인 2 — CSP 경고: 헤더/메타태그 미설정

`index.html`에 CSP 메타태그가 없고, `electron-main.ts`에서 `session.defaultSession.webRequest.onHeadersReceived`
핸들러가 미설정되어 있어 Electron이 보안 경고를 출력함.

#### 원인 3 — Autofill 에러: 무해 (수정 불필요)

`Autofill.enable` / `Autofill.setAddresses`는 Chrome DevTools Protocol 명령으로,
현재 Electron에 번들된 Chromium 버전이 해당 명령을 미구현. DevTools가 열릴 때 자동 발생.
앱 동작에 영향 없음 — Electron 버전 업그레이드 시 자연 해소됨.

---

### 수정 내용

#### 1. `Electron/src/main/core/execute-command.ts` — `shell: false` 수정

```typescript
// 변경 전
const child = spawn(omxBin, spawnArgs, {
  shell: false,
}) as ChildProcessWithoutNullStreams;

// 변경 후
const child = spawn(omxBin, spawnArgs, {
  // Windows에서 npm 글로벌 명령은 .cmd 래퍼로 설치됨 → shell 모드 필요
  shell: process.platform === "win32",
}) as ChildProcessWithoutNullStreams;
```

#### 2. `Electron/src/electron-main.ts` — CSP 헤더 설정

`session` 임포트 추가 후 `app.whenReady()` 내부 최상단에 헤더 핸들러 등록:

```typescript
import { app, BrowserWindow, session } from "electron";

// app.whenReady() 내부:
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  const csp = isDev
    ? [
        "default-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173;",
        "script-src 'self' 'unsafe-eval' http://127.0.0.1:5173;",  // Vite HMR 필요
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
```

> **Dev vs Prod 차이**: 개발 환경에서는 Vite HMR(`ws://`) 및 모듈 핫리로드(`'unsafe-eval'`)를 허용해야 하므로 분기 처리. 프로덕션 패키지 후에는 엄격한 CSP 적용.

---

### shell: false 버그 재발 방지

Windows에서 `child_process.spawn`으로 npm 글로벌 명령을 실행할 때 반드시 `shell: process.platform === "win32"` 패턴을 적용해야 함.

| 파일 | 상태 |
|---|---|
| `cli-wrapper.ts` (`executeUnary`, `executeStream`, `executeUnaryRaw`) | ✅ 수정 완료 |
| `env-checker.ts` (`runCommand`) | ✅ 수정 완료 |
| `adapter-probe.ts` (ENOENT graceful fallback) | ✅ 수정 완료 |
| `execute-command.ts` (`executeCommand`) | ✅ 수정 완료 (이번 세션) |

---

### 관련 파일

- [`Electron/src/main/core/execute-command.ts`](../src/main/core/execute-command.ts) — `shell` 수정
- [`Electron/src/electron-main.ts`](../src/electron-main.ts) — CSP 헤더 추가

---

## CSP `'unsafe-inline'` 누락으로 Vite React 플러그인 preamble 차단

### 증상

`npm run dev:electron` 실행 후 DevTools 콘솔에 다음 에러 연쇄 발생:

```
(index):4 Executing inline script violates the following Content Security Policy directive
'script-src 'self' 'unsafe-eval' http://127.0.0.1:5173'.
Either the 'unsafe-inline' keyword, a hash (...), or a nonce ('nonce-...') is required
to enable inline execution. The action has been blocked.

AdapterStatusBar.tsx:240 Uncaught Error: @vitejs/plugin-react can't detect preamble.
Something is wrong.
```

---

### 원인 분석

`@vitejs/plugin-react`는 React Fast Refresh(HMR)를 위해 `index.html` 빌드 시 인라인 스크립트를 주입한다:

```html
<!-- Vite가 자동 삽입 -->
<script>
  window.__vite_plugin_react_preamble_installed__ = true;
  // React Refresh 초기화 코드
</script>
```

이 스크립트는 **인라인 스크립트**(`<script>` 태그 내 직접 작성)이므로 CSP의 `script-src`에
`'unsafe-inline'`이 없으면 브라우저/Electron이 차단함.

이전 세션에서 CSP 헤더를 추가할 때 `'unsafe-eval'`만 추가하고 `'unsafe-inline'`을 빠뜨렸음:

```typescript
// 수정 전 (잘못됨)
"script-src 'self' 'unsafe-eval' http://127.0.0.1:5173;",
//                              ↑ 'unsafe-inline' 누락

// 수정 후 (올바름)
"script-src 'self' 'unsafe-eval' 'unsafe-inline' http://127.0.0.1:5173;",
```

`'unsafe-eval'`과 `'unsafe-inline'`의 역할 차이:

| 지시어 | 허용 범위 |
|---|---|
| `'unsafe-eval'` | `eval()`, `Function()` 등 문자열 → 코드 변환 (Vite HMR 모듈 로딩) |
| `'unsafe-inline'` | `<script>…</script>` 인라인 블록, `onclick=` 등 인라인 이벤트 핸들러 |

두 지시어는 서로 독립적이며 각각 지정해야 함.

---

### 수정 내용

**`Electron/src/electron-main.ts`** — dev CSP에 `'unsafe-inline'` 추가:

```typescript
const csp = isDev
  ? [
      "default-src 'self' http://127.0.0.1:5173 ws://127.0.0.1:5173;",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://127.0.0.1:5173;",  // ← 수정
      "style-src 'self' 'unsafe-inline';",
      "connect-src 'self' ws://127.0.0.1:5173;",
      "img-src 'self' data:;",
    ].join(" ")
  : ...
```

> **프로덕션 CSP는 변경 없음.** `'unsafe-inline'`은 dev 전용 허용이며 패키지 빌드 시에는 적용되지 않음.

---

### 관련 파일

- [`Electron/src/electron-main.ts`](../src/electron-main.ts) — dev CSP `'unsafe-inline'` 추가

---

## `Invalid provider "--stream-json"` 에러 (execute-command 인자 순서)

### 증상

채팅 메시지 전송 시 콘솔에 다음 에러가 출력되고 응답이 오지 않음:

```
Error: Invalid provider "--stream-json". Expected one of: claude, gemini.
Usage: omx ask <claude|gemini> <question or task>
  or: omx ask <claude|gemini> -p "<prompt>"
  or: omx ask claude --print "<prompt>"
  or: omx ask gemini --prompt "<prompt>"
```

---

### 근본 원인

`execute-command.ts`의 `spawnArgs` 구성 코드에서 provider 인자가 누락된 채 CLI가 호출됨:

```typescript
// 수정 전 spawnArgs 구성
const spawnArgs = [command];              // ["ask"]
spawnArgs.push(...effortFlags);           // ["ask"]  (standard = 빈 배열)
spawnArgs.push("--stream-json");          // ["ask", "--stream-json"]
spawnArgs.push(...args);                  // ["ask", "--stream-json", "user text"]
// → omx ask --stream-json "user text"
//                 ↑ CLI가 이 값을 provider로 파싱 → 에러!
```

`omx ask` CLI는 첫 번째 positional 인자를 provider(`claude` | `gemini`)로 파싱한다. `--stream-json` 플래그가 provider 위치에 오면 "Invalid provider" 에러가 발생한다.

---

### 수정 내용

#### 1. `Electron/src/main/core/execute-command.ts`

`ExecuteCommandOptions`에 `provider` 필드 추가, spawnArgs에서 command 바로 뒤 (플래그보다 앞)에 삽입:

```typescript
// ExecuteCommandOptions 인터페이스에 추가
provider?: string;  // "claude" | "gemini" — ask 커맨드 필수

// spawnArgs 구성 (수정 후)
const spawnArgs = [command];              // ["ask"]
if (provider) {
  spawnArgs.push(provider);              // ["ask", "claude"]
}
spawnArgs.push(...effortFlags);           // ["ask", "claude"]  (standard = 빈 배열)
spawnArgs.push("--stream-json");          // ["ask", "claude", "--stream-json"]
spawnArgs.push(...args);                  // ["ask", "claude", "--stream-json", "user text"]
// → omx ask claude --stream-json "user text"  ✓
```

#### 2. `Electron/src/main/ipc/stream-bridge-ipc.ts`

`startAgentStream` 함수 시그니처와 IPC 핸들러 payload에 `provider` 추가, "ask" 커맨드 기본값 `"claude"` 적용:

```typescript
// startAgentStream 시그니처
export function startAgentStream(
  command: string,
  args: string[],
  reasoningEffort: ReasoningEffort = "standard",
  provider?: string,          // ← 추가
): void {
  const handle = executeCommand({
    command,
    provider: command === "ask" ? (provider ?? "claude") : provider,  // ← "claude" 기본값
    args,
    ...
  });
}

// IPC 핸들러
ipcMain.handle(AGENT_STREAM_START_CHANNEL, (_event, payload: {
  command: string;
  args?: string[];
  reasoningEffort?: ReasoningEffort;
  provider?: string;           // ← 추가
}) => {
  const { command, args = [], reasoningEffort = "standard", provider } = payload;
  startAgentStream(command, args, reasoningEffort, provider);
  ...
});
```

#### 3. `Electron/src/preload.ts`

`startAgentStream` payload 타입에 `provider` 추가:

```typescript
startAgentStream: (payload: {
  command: string;
  args?: string[];
  reasoningEffort?: "low" | "standard" | "high";
  provider?: "claude" | "gemini";   // ← 추가
}) => ipcRenderer.invoke("omx:agent-stream:start", payload),
```

---

### 수정 후 동작

| provider 지정 | 동작 |
|---|---|
| 지정 없음 + command="ask" | 기본값 `"claude"` 자동 적용 |
| `provider: "gemini"` | `omx ask gemini --stream-json "..."` 실행 |
| `provider: "claude"` | `omx ask claude --stream-json "..."` 실행 |
| command="sparkshell" 등 | provider 삽입 없이 기존대로 실행 |

---

### 관련 파일

- [`Electron/src/main/core/execute-command.ts`](../src/main/core/execute-command.ts)
- [`Electron/src/main/ipc/stream-bridge-ipc.ts`](../src/main/ipc/stream-bridge-ipc.ts)
- [`Electron/src/preload.ts`](../src/preload.ts)

---

## `[ask-claude] Missing required local CLI binary: claude` 에러

### 증상

채팅 UI에서 메시지를 전송하면 에러 메시지가 렌더러에 표시됨:

```
[ask-claude] Missing required local CLI binary: claude
```

앱이 즉시 종료되거나 스트리밍이 멈춤.

### 근본 원인

두 가지 구조적 문제가 복합적으로 발생:

1. **`omx ask` 커맨드는 로컬 Claude CLI 바이너리 필요**
   - `src/scripts/run-provider-advisor.ts`의 `ensureBinary("claude")`가 `spawnSync("claude", ["--version"])`을 실행
   - Claude CLI 미설치 시 ENOENT → `process.exit(1)` 호출
   - OpenAI/Codex 사용자는 Claude CLI를 설치하지 않음

2. **`omx ask`는 내부 `spawnSync` 사용 — 스트리밍 불가**
   - `omx ask`는 블로킹 `spawnSync`로 구현되어 실시간 스트리밍 자체가 불가능
   - `--stream-json` 플래그를 붙여도 결과를 얻을 수 없음

### 해결 방향

`omx ask` 대신 `omx exec --json`으로 전환:

```
omx exec --json --ephemeral --skip-git-repo-check -C . "message"
```

- `--json`: codex-rs JSONL 이벤트를 stdout에 실시간 스트리밍 (블로킹 아님)
- `--ephemeral`: 세션 파일 디스크 미저장 (채팅 UI용으로 적합)
- `--skip-git-repo-check`: git 저장소 체크 생략
- 로컬 Claude/Gemini CLI 불필요 — OpenAI API 키만 있으면 동작

### codex exec `--json` JSONL 이벤트 형식

`omx exec --json` 출력은 StreamEnvelope(`--stream-json`)와 **다른 형식**:

| codex JSONL 이벤트 | 의미 |
|---|---|
| `{"type":"thread.started","thread_id":"..."}` | 세션 시작 |
| `{"type":"turn.started"}` | 에이전트 턴 시작 |
| `{"type":"item.delta","item":{"type":"output_text","delta":"..."}}` | 응답 텍스트 스트리밍 |
| `{"type":"item.delta","item":{"type":"reasoning...","delta":"..."}}` | 사고 과정 스트리밍 |
| `{"type":"thread.completed"}` | 세션 종료 |
| `{"type":"error","message":"..."}` | 에러 |

### 수정 내용

**codex JSONL → StreamEnvelope 변환 매핑:**

| codex 이벤트 | StreamEnvelope |
|---|---|
| `thread.started` | `agent_init` |
| `item.delta` (output_text) | `token` (subType: "content") |
| `item.delta` (reasoning*) | `token` (subType: "reasoning") |
| `thread.completed` | `done` (exitCode: 0) |
| `error` | `error` |
| 나머지 | 무시 |

#### 1. `Electron/src/main/cli/stream-parser.ts`

`CodexStreamParser` 클래스 및 `createCodexStreamParser()` 팩토리 추가.
codex JSONL 이벤트를 `StreamParserCallbacks`로 변환한다.

#### 2. `Electron/src/main/ipc/stream-bridge-ipc.ts`

`startAgentStream`에 `command === "exec"` 분기 추가:

```typescript
if (command === "exec") {
  const execArgs = ["--json", "--ephemeral", "--skip-git-repo-check", "-C", ".", ...args];
  const execHandle = executeCommand({ command: "exec", args: execArgs, streamJson: false, ... });
  const codexParser = createCodexStreamParser(execHandle.child, { ... });
  _activeSession = { handle: execHandle, parser: codexParser };
  return;
}
// 기존 ask/sparkshell 경로는 유지
```

#### 3. `Electron/src/renderer/App.tsx`

`command: "ask"` → `command: "exec"` 변경:

```typescript
void window.electronAPI?.startAgentStream?.({
  command: "exec",   // "ask" → "exec"
  args: [text],
  reasoningEffort: "standard",
});
```

### 수정 후 동작

```
사용자 메시지 → App.tsx(command:"exec") → stream-bridge-ipc.ts
  → omx exec --json --ephemeral --skip-git-repo-check -C . "message"
  → codex JSONL 이벤트 stdout 스트리밍
  → CodexStreamParser (thread.started → agent_init, item.delta → token, ...)
  → StreamEnvelope IPC 채널 → Renderer
```

### 관련 파일

- [`Electron/src/main/cli/stream-parser.ts`](../src/main/cli/stream-parser.ts)
- [`Electron/src/main/ipc/stream-bridge-ipc.ts`](../src/main/ipc/stream-bridge-ipc.ts)
- [`Electron/src/renderer/App.tsx`](../src/renderer/App.tsx)

