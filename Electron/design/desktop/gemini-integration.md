# Gemini 통합 설계 문서

> 작성일: 2025-06  
> 대상 브랜치: Electron 앱 — `src/` 전체  
> 목적: codex-rs CLI를 통해 Gemini 모델을 ITE AI Agent에 추가하는 전체 설계

---

## 1. 현재 아키텍처 분석

### 1.1 요청 흐름 전체 다이어그램

```
Renderer (React)
  │  selectedModel, prompt
  ▼
App.tsx → handleSendMessage()
  │  IPC: omx:agent-stream:start { command, args, reasoningEffort, provider, model }
  ▼
stream-bridge-ipc.ts → startAgentStream(command, args, reasoningEffort, provider, model)
  │
  ├── [echo / echo-reverse]  → 로컬 타이머 스트리밍 (네트워크 없음)
  │
  ├── [command === "exec"]   → codex exec --json --ephemeral --skip-git-repo-check
  │       │                      -C . [--model <model>] <prompt>
  │       └── CodexStreamParser (JSONL 이벤트 → StreamEnvelope 변환)
  │
  └── [command === "ask"]    → omx ask [provider] [--high/--xhigh] --stream-json <prompt>
          └── StreamParser  (Ndjson → StreamEnvelope 변환)
```

### 1.2 핵심 실행 경로: `execute-command.ts`

```typescript
// omx <command> [provider] [effortFlags] --stream-json [...args]
// Windows: 전체 문자열을 shell:true로 실행 (cmd.exe 경유)
// macOS/Linux: spawn(omxBin, spawnArgs, { shell: false })
spawn(omxBin, spawnArgs, { stdio: ["ignore", "pipe", "pipe"] })
```

- `env` 옵션을 명시하지 않으므로 **Electron 메인 프로세스의 `process.env`를 자동 상속**
- `GEMINI_API_KEY`가 시스템 환경 변수에 있으면 자동으로 전달됨

### 1.3 codex exec 모델/프로바이더 지정 방식

codex-rs CLI는 **모델 이름으로 프로바이더를 자동 추론**한다.

| 모델 이름 패턴     | 내부 프로바이더 | 필요 인증          |
|--------------------|-----------------|-------------------|
| `gpt-5.5`, `o3`, `gpt-4o` | OpenAI   | codex login (ChatGPT Plus) |
| `gemini-2.5-pro`, `gemini-2.5-flash` | Google Gemini | `GEMINI_API_KEY` 환경 변수 |
| `claude-sonnet-4-5` 등 | Anthropic | `ANTHROPIC_API_KEY` 환경 변수 |

**CLI 호출 방식**:
```bash
# Gemini 모델 직접 지정
codex exec --json --ephemeral --skip-git-repo-check \
  -C . \
  --model gemini-2.5-pro \
  "사용자 프롬프트"
```

`-c model=gemini-2.5-pro` 방식도 동일하게 동작하나, `--model` 플래그가 더 명확하고 이미 `stream-bridge-ipc.ts`에 구현되어 있다.

### 1.4 현재 `stream-bridge-ipc.ts`의 `--model` 주입 로직

```typescript
// 이미 구현된 코드 (수정 불필요)
const modelArgs = model && model !== "auto" ? ["--model", model] : [];
const execArgs = [
  "--json", "--ephemeral", "--skip-git-repo-check",
  "-C", ".", ...modelArgs, ...args
];
```

`--model gemini-2.5-pro`는 이 경로로 자동 전달되므로 **IPC 레이어 추가 수정 불필요**.

### 1.5 omx ask 경로의 provider 파라미터

```typescript
// execute-command.ts: provider를 command 바로 뒤에 위치
// omx ask gemini --stream-json <prompt>
if (provider) {
  spawnArgs.push(provider);
}
```

`omx ask` 경로는 provider 파라미터를 위치 인자로 받는다. Gemini 모델 사용 시 `provider: "gemini"` 전달이 필요하다.

---

## 2. 설계 목표

1. **ModelSelector에 Gemini 모델 추가** — UI에서 선택 가능하게
2. **GEMINI_API_KEY 안전한 저장 및 주입** — Electron 앱 내 SecureStorage 활용
3. **env-checker에 Gemini 인증 체크 추가** — 앱 시작 시 키 유효성 진단
4. **기존 echo/echo-reverse 테스트 경로 유지** — 회귀 없음
5. **codex exec 경로 최소 변경** — 이미 `--model` 플래그 지원

---

## 3. 변경 파일 목록 및 상세 설계

### 3.1 `ModelSelector.tsx` — Gemini 모델 추가

**파일**: `Electron/src/renderer/components/ModelSelector.tsx`

**변경 내용**: `MODEL_LIST`에 Gemini 그룹 추가

```typescript
export type ModelGroup = "test" | "standard" | "gemini";

export const MODEL_LIST: ModelDef[] = [
  // 테스트 모델 (변경 없음)
  { id: "echo",         label: "Echo",         badge: "테스트", badgeAccent: true, group: "test" },
  { id: "echo-reverse", label: "Echo Reverse",  badge: "테스트", badgeAccent: true, group: "test" },

  // OpenAI / Claude 모델 (변경 없음)
  { id: "gpt-4o",            label: "GPT-4o",            badge: "1x",   group: "standard" },
  { id: "gpt-4o-mini",       label: "GPT-4o mini",       badge: "0.1x", group: "standard" },
  { id: "o3",                label: "o3",                badge: "8x",   group: "standard" },
  { id: "o4-mini",           label: "o4-mini",           badge: "0.5x", group: "standard" },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", badge: "1x",   group: "standard" },

  // Gemini 모델 (신규)
  { id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   badge: "Google", group: "gemini" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash",  badge: "Google", group: "gemini" },
];
```

**드롭업 그룹 렌더링 확장**:
```tsx
// 기존: test / 구분선 / standard
// 변경: test / 구분선 / standard / 구분선 / Gemini
{geminiModels.length > 0 && (
  <>
    <div className="model-group-divider" />
    <div className="model-group-label">Google Gemini</div>
    {geminiModels.map(renderItem)}
  </>
)}
```

**Gemini 키 미설정 시 비활성화 처리** (선택적):
```tsx
// GEMINI_API_KEY 상태를 props로 받아 해당 항목에 disabled 표시
interface ModelSelectorProps {
  geminiKeyAvailable?: boolean;
}
```

---

### 3.2 `stream-bridge-ipc.ts` — Gemini 환경 변수 주입

**파일**: `Electron/src/main/ipc/stream-bridge-ipc.ts`

**현재 상태**: `exec` 경로에서 `--model gemini-2.5-pro`는 이미 전달됨. 그러나 `execute-command.ts`의 `spawn()` 호출 시 `env`를 명시하지 않아 `GEMINI_API_KEY`는 **시스템 환경 변수에만 의존**.

**설계**: `model`이 `gemini-` 접두사로 시작할 때 앱 저장소에서 읽은 키를 환경 변수로 주입.

`execute-command.ts`에 `extraEnv` 옵션 추가:
```typescript
export interface ExecuteCommandOptions {
  // ... 기존 필드
  /** 자식 프로세스에 주입할 추가 환경 변수 (process.env를 기반으로 merge) */
  extraEnv?: Record<string, string>;
}
```

`spawn` 호출부에 `env` 옵션 추가:
```typescript
const spawnOpts = {
  stdio: ["ignore", "pipe", "pipe"] as const,
  env: extraEnv ? { ...process.env, ...extraEnv } : undefined,
};
```

`stream-bridge-ipc.ts`에서 Gemini 모델 감지 후 키 주입:
```typescript
const isGemini = typeof model === "string" && model.startsWith("gemini-");
const geminiKey = isGemini ? getGeminiApiKey() : undefined; // secureStorage에서 읽기
const execHandle = executeCommand({
  command: "exec",
  provider: undefined,
  args: execArgs,
  streamJson: false,
  reasoningEffort,
  extraEnv: geminiKey ? { GEMINI_API_KEY: geminiKey } : undefined,
  onError: (errText) => { ... },
});
```

---

### 3.3 API Key 저장소 — `gemini-key-store.ts` (신규)

**파일**: `Electron/src/main/services/gemini-key-store.ts`

Electron의 `safeStorage` API를 사용해 OS 키체인에 암호화 저장.

```typescript
import { safeStorage, app } from "electron";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const KEY_FILE = path.join(app.getPath("userData"), "gemini-key.bin");

export function saveGeminiApiKey(plaintext: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("OS 키체인 암호화를 사용할 수 없습니다");
  }
  const encrypted = safeStorage.encryptString(plaintext);
  const dir = path.dirname(KEY_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(KEY_FILE, encrypted);
}

export function loadGeminiApiKey(): string | null {
  if (!existsSync(KEY_FILE)) {
    // 시스템 환경 변수 fallback
    return process.env["GEMINI_API_KEY"] ?? null;
  }
  if (!safeStorage.isEncryptionAvailable()) return null;
  const encrypted = readFileSync(KEY_FILE);
  return safeStorage.decryptString(encrypted);
}

export function clearGeminiApiKey(): void {
  if (existsSync(KEY_FILE)) {
    writeFileSync(KEY_FILE, Buffer.alloc(0)); // 내용 초기화
  }
}
```

**보안 원칙**:
- `safeStorage.encryptString()` — Windows: DPAPI, macOS: Keychain, Linux: libsecret
- 키 파일은 `userData` 디렉토리 (앱 전용 공간)에 저장
- 키 원문은 메모리에서 최소 체류 시간 유지

---

### 3.4 IPC 핸들러 확장 — `env-ipc.ts`

**파일**: `Electron/src/main/ipc/env-ipc.ts`

Gemini API 키 저장/삭제/상태 확인 IPC 핸들러 추가:

```typescript
// 채널 상수
export const GEMINI_KEY_SAVE_CHANNEL = "omx:gemini-key:save";
export const GEMINI_KEY_CLEAR_CHANNEL = "omx:gemini-key:clear";
export const GEMINI_KEY_STATUS_CHANNEL = "omx:gemini-key:status";

// 핸들러 등록
ipcMain.handle(GEMINI_KEY_SAVE_CHANNEL, (_event, key: string) => {
  saveGeminiApiKey(key);
  return { ok: true };
});

ipcMain.handle(GEMINI_KEY_CLEAR_CHANNEL, () => {
  clearGeminiApiKey();
  return { ok: true };
});

ipcMain.handle(GEMINI_KEY_STATUS_CHANNEL, () => {
  const key = loadGeminiApiKey();
  return { available: key !== null && key.length > 0 };
});
```

---

### 3.5 `preload.ts` — Renderer IPC 바인딩 추가

**파일**: `Electron/src/preload.ts`

```typescript
geminiKey: {
  save: (key: string) =>
    ipcRenderer.invoke("omx:gemini-key:save", key),
  clear: () =>
    ipcRenderer.invoke("omx:gemini-key:clear"),
  getStatus: () =>
    ipcRenderer.invoke("omx:gemini-key:status") as Promise<{ available: boolean }>,
},
```

---

### 3.6 `env-checker.ts` — Gemini 키 검증 추가

**파일**: `Electron/src/main/env/env-checker.ts`

**현재 인증 파이프라인**: `checkCliVersion → runOmxDoctor → verifyCodexAuth → handshakeCheck`

**확장**: `verifyGeminiKey()` 함수 추가 (선택적 실행)

```typescript
/**
 * Gemini API 키 유효성 검증 (선택적)
 * GEMINI_API_KEY가 설정되어 있을 때만 실행.
 * 미설정이라도 앱 기동은 계속 진행 (OpenAI 경로는 영향 없음).
 */
export async function verifyGeminiKey(): Promise<EnvStatus> {
  const key = loadGeminiApiKey();
  if (!key) {
    return {
      ok: true,                   // 경고지만 오류는 아님
      code: "ok",
      message: "GEMINI_API_KEY 미설정 — Gemini 모델은 사용 불가",
    };
  }

  // 키 형식 검증 (AIzaSy 접두사)
  if (!key.startsWith("AIzaSy") || key.length < 39) {
    return {
      ok: false,
      code: "auth_missing",
      message: "GEMINI_API_KEY 형식이 올바르지 않습니다 (AIzaSy... 39자 이상 필요)",
    };
  }

  return { ok: true, code: "ok" };
}
```

---

### 3.7 설정 화면 — `ApiKeySettings.tsx` (신규, 선택적)

**파일**: `Electron/src/renderer/components/ApiKeySettings.tsx`

Gemini API 키를 입력하고 저장하는 설정 패널:

```tsx
export function ApiKeySettings() {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleSave = async () => {
    try {
      await window.electronAPI.geminiKey.save(apiKey);
      setStatus("saved");
      setApiKey(""); // 입력창 초기화 (키 원문 미노출)
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="api-key-settings">
      <label>Google Gemini API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="AIzaSy..."
        autoComplete="off"
      />
      <button onClick={handleSave}>저장</button>
      <button onClick={() => window.electronAPI.geminiKey.clear()}>삭제</button>
    </div>
  );
}
```

---

## 4. omx ask 경로에서의 Gemini 처리

`omx ask` 경로는 `execute-command.ts`의 `provider` 위치 인자를 사용한다.

```typescript
// omx ask gemini --stream-json <prompt>
executeCommand({
  command: "ask",
  provider: "gemini",   // ← 이 값이 command 바로 뒤에 삽입됨
  args: [prompt],
  streamJson: true,
  reasoningEffort,
})
```

`stream-bridge-ipc.ts`의 `ask` 경로에서 Gemini 모델이 선택된 경우 `provider: "gemini"` 주입:

```typescript
const askProvider =
  command === "ask"
    ? (typeof model === "string" && model.startsWith("gemini-") ? "gemini" : (provider ?? "claude"))
    : provider;
```

---

## 5. `codex exec` vs `omx ask` 경로 선택 기준

| 기준                    | `codex exec` 경로          | `omx ask` 경로             |
|------------------------|---------------------------|---------------------------|
| **파서**               | CodexStreamParser (JSONL) | StreamParser (Ndjson)      |
| **현재 Gemini 지원**   | `--model gemini-2.5-pro`  | `provider: "gemini"` 위치 인자 |
| **추론 토큰 분리**     | `item.delta` 타입 분기     | `subType: "reasoning"/"content"` |
| **툴콜 지원**          | 지원 (`ToolCallEnvelope`)  | 지원                       |
| **권장 경로**          | ✅ **Gemini는 exec 경로 권장** | 보조 경로                 |

**근거**: `codex exec`는 codex-rs 내부에서 프로바이더 전환이 일어나고, `--model` 플래그 하나로 동작하므로 구현이 단순하다. `omx ask gemini`는 omx 레이어 래퍼를 추가로 거치므로 Gemini 응답 형식의 불일치 가능성이 있다.

---

## 6. 구현 순서 (추천)

```
Phase 1 — 핵심 (UI + 즉시 동작)
  ① ModelSelector.tsx: Gemini 모델 항목 추가
  ② stream-bridge-ipc.ts: GEMINI_API_KEY 환경 변수 주입 (process.env 상속 확인)
  ③ execute-command.ts: extraEnv 옵션 추가

Phase 2 — API 키 관리
  ④ gemini-key-store.ts: safeStorage 기반 키 저장소 신규 생성
  ⑤ env-ipc.ts: IPC 핸들러 등록 (save / clear / status)
  ⑥ preload.ts: geminiKey API 바인딩 추가
  ⑦ electron-main.ts: registerEnvIpc() 추가

Phase 3 — UX 완성
  ⑧ ApiKeySettings.tsx: 설정 UI 컴포넌트
  ⑨ ModelSelector.tsx: geminiKeyAvailable props → 비활성화 표시
  ⑩ env-checker.ts: verifyGeminiKey() 추가

Phase 4 — 검증
  ⑪ echo 테스트로 기존 경로 회귀 확인
  ⑫ GEMINI_API_KEY 설정 후 gemini-2.5-flash로 실제 스트리밍 확인
  ⑬ TypeScript 타입체크: npx tsc --noEmit
```

---

## 7. 환경 변수 주입 흐름 (완성 상태)

```
사용자가 ApiKeySettings.tsx에 키 입력
  → preload: geminiKey.save(key)
  → IPC: omx:gemini-key:save
  → env-ipc.ts → gemini-key-store.ts → safeStorage.encryptString()
  → userData/gemini-key.bin 저장 (OS 키체인 암호화)

사용자가 "gemini-2.5-pro" 모델 선택 후 메시지 전송
  → App.tsx: handleSendMessage({ model: "gemini-2.5-pro" })
  → IPC: omx:agent-stream:start { model: "gemini-2.5-pro" }
  → stream-bridge-ipc.ts: startAgentStream(...)
      → isGemini = true
      → geminiKey = loadGeminiApiKey() ← safeStorage 복호화
      → executeCommand({ ..., extraEnv: { GEMINI_API_KEY: geminiKey } })
  → execute-command.ts: spawn("codex", [..., "--model", "gemini-2.5-pro", prompt],
                               { env: { ...process.env, GEMINI_API_KEY: "AIzaSy..." } })
  → codex-rs 내부: Google Generative AI API 호출
  → JSONL 이벤트 → CodexStreamParser → Renderer 토큰 브로드캐스트
```

---

## 8. 리스크 및 대응

| 리스크 | 원인 | 대응 |
|--------|------|------|
| codex-rs Gemini JSONL 이벤트 형식 불일치 | Gemini가 reasoning 이벤트를 다르게 방출 | echo 테스트 후 실제 Gemini 출력 JSONL 수집·검증 필요 |
| safeStorage 미지원 환경 | Linux/특수 환경에서 libsecret 없음 | `process.env.GEMINI_API_KEY` fallback 항상 유지 |
| Windows `shell:true` 인자 쿼팅 | `quoteWinArg`가 `GEMINI_API_KEY`를 포함하지 않음 | env 주입이므로 CLI 인자에 키가 포함되지 않아 문제 없음 |
| 추론 토큰 미지원 | Gemini 2.5 Flash는 reasoning 미지원 | `subType: "content"` 단일 채널만 방출하면 되므로 영향 없음 |
| `--model gemini-X` 이름 불일치 | codex-rs 버전에 따라 모델 이름 다를 수 있음 | `-c model=...` 방식을 fallback으로 지원 고려 |

---

## 9. 관련 파일 목록 (전체 요약)

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/renderer/components/ModelSelector.tsx` | 수정 | Gemini 그룹 + 모델 항목 추가 |
| `src/main/core/execute-command.ts` | 수정 | `extraEnv` 옵션 추가 → spawn env 주입 |
| `src/main/ipc/stream-bridge-ipc.ts` | 수정 | isGemini 감지 → GEMINI_API_KEY extraEnv 주입 / ask provider 분기 |
| `src/main/services/gemini-key-store.ts` | 신규 | safeStorage 기반 API 키 저장소 |
| `src/main/ipc/env-ipc.ts` | 수정 | geminiKey IPC 핸들러 등록 |
| `src/preload.ts` | 수정 | geminiKey contextBridge API 추가 |
| `src/electron-main.ts` | 수정 | registerEnvIpc() 호출 추가 |
| `src/main/env/env-checker.ts` | 수정 | `verifyGeminiKey()` 함수 추가 |
| `src/renderer/components/ApiKeySettings.tsx` | 신규 | API 키 입력/저장 UI |

---

## 10. 참고: codex-rs 공식 문서 기준 Gemini 설정

codex-rs CLI가 Gemini를 인식하는 조건:

```toml
# ~/.codex/config.toml에 추가 (전역 설정)
model = "gemini-2.5-pro"
```

또는 실행 시:
```bash
codex exec --model gemini-2.5-pro ...
# 또는
codex exec -c model="gemini-2.5-pro" ...
```

**필수 환경 변수**:
```bash
export GEMINI_API_KEY="AIzaSy..."    # Google AI Studio에서 발급
```

Gemini API 키 발급: https://aistudio.google.com/apikey
