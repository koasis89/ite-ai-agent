# Gemini 통합 구현 결과

> 설계 문서: `Electron/design/gemini-integration.md`
> 구현 완료일: 2025-07

---

## 개요

Electron 앱에 Google Gemini 모델(gemini-2.5-pro, gemini-2.5-flash)을 통합했습니다.
OS 키체인(safeStorage)을 통한 안전한 API 키 저장, IPC 채널 노출, UI 컴포넌트 제공이 포함됩니다.

---

## 변경 파일 목록

| # | 파일 | 유형 | 변경 내용 |
|---|------|------|-----------|
| 1 | `src/main/services/gemini-key-store.ts` | 신규 생성 | safeStorage 기반 API 키 저장/조회/삭제 |
| 2 | `src/renderer/components/ApiKeySettings.tsx` | 신규 생성 | Gemini 키 입력 UI 패널 |
| 3 | `src/renderer/components/ModelSelector.tsx` | 수정 | Gemini 모델 그룹 추가 |
| 4 | `src/main/core/execute-command.ts` | 수정 | `extraEnv` 옵션으로 환경 변수 주입 지원 |
| 5 | `src/main/ipc/stream-bridge-ipc.ts` | 수정 | exec/ask 경로 모두 Gemini 키 주입 |
| 6 | `src/main/ipc/env-ipc.ts` | 수정 | Gemini 키 IPC 핸들러 3개 등록 |
| 7 | `src/preload.ts` | 수정 | `geminiKey` API contextBridge 노출 |
| 8 | `src/electron-main.ts` | 수정 | `registerEnvIpc()` 등록 추가 |
| 9 | `src/main/env/env-checker.ts` | 수정 | `verifyGeminiKey()` 함수 추가 |
| 10 | `src/renderer/components/ChatContainer.tsx` | 수정 | `geminiKeyAvailable` prop 추가 |
| 11 | `src/renderer/App.tsx` | 수정 | 상태 관리 + ApiKeySettings 조건부 렌더링 |

---

## 상세 구현 내용

### 1. `gemini-key-store.ts` (신규)

OS 네이티브 키체인을 활용하는 Gemini API 키 저장소.

```typescript
// safeStorage 사용 불가 시 환경 변수 GEMINI_API_KEY 로 폴백
export function saveGeminiApiKey(plaintext: string): void
export function loadGeminiApiKey(): string | null
export function clearGeminiApiKey(): void
export function isValidGeminiKeyFormat(key: string): boolean  // AIzaSy... 39자+
```

- **Windows**: DPAPI 암호화
- **macOS**: Keychain
- **Linux**: libsecret (미지원 시 환경 변수 폴백)
- 키 파일 위치: `app.getPath("userData")/gemini-key.bin`

---

### 2. `ApiKeySettings.tsx` (신규)

Gemini 모델 선택 시 키가 없을 때 표시되는 인라인 설정 패널.

```tsx
<ApiKeySettings onKeySet={() => setGeminiKeyAvailable(true)} />
```

- password input + AIzaSy 형식 검증 (클라이언트)
- `window.electronAPI.geminiKey.save()` / `.clear()` 호출
- 저장 성공/오류 상태 표시

---

### 3. `ModelSelector.tsx` (수정)

```typescript
// 추가된 Gemini 모델
{ id: "gemini-2.5-pro",   label: "Gemini 2.5 Pro",   badge: "Google", group: "gemini" },
{ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash",  badge: "Google", group: "gemini" },
```

- `geminiKeyAvailable` prop이 `false`일 때 Gemini 항목 비활성화(disabled)
- 비활성화 상태: opacity 0.45, cursor not-allowed, 클릭 무시

---

### 4. `execute-command.ts` (수정)

```typescript
interface ExecuteCommandOptions {
  // ...기존 필드...
  /** 자식 프로세스에 주입할 추가 환경 변수. 예: { GEMINI_API_KEY: "..." } */
  extraEnv?: Record<string, string>;
}
```

환경 변수 주입:
```typescript
const envOverride = extraEnv
  ? { env: { ...process.env, ...extraEnv } as NodeJS.ProcessEnv }
  : {};
const spawnOpts = { stdio: [...], ...envOverride };
```

---

### 5. `stream-bridge-ipc.ts` (수정)

**exec 경로** (codex exec):
```typescript
const isGeminiExec = typeof model === "string" && model.startsWith("gemini-");
const geminiKeyExec = isGeminiExec ? loadGeminiApiKey() : null;
const execExtraEnv = geminiKeyExec ? { GEMINI_API_KEY: geminiKeyExec } : undefined;
// executeCommand(..., extraEnv: execExtraEnv)
```

**ask 경로** (omx ask):
```typescript
const isGeminiAsk =
  provider === "gemini" ||
  (typeof model === "string" && model.startsWith("gemini-"));
const geminiKeyAsk = isGeminiAsk ? loadGeminiApiKey() : null;
const askExtraEnv = geminiKeyAsk ? { GEMINI_API_KEY: geminiKeyAsk } : undefined;
// provider: command === "ask" ? (isGeminiAsk ? "gemini" : ...) : provider
// executeCommand(..., extraEnv: askExtraEnv)
```

---

### 6. `env-ipc.ts` (수정)

새로 추가된 IPC 채널:

| 채널 | 방향 | 기능 |
|------|------|------|
| `omx:gemini-key:save` | Renderer → Main | API 키 암호화 저장 |
| `omx:gemini-key:clear` | Renderer → Main | 저장된 키 삭제 |
| `omx:gemini-key:status` | Renderer → Main | 키 존재 여부 조회 (`{ available: boolean }`) |

---

### 7. `preload.ts` (수정)

```typescript
contextBridge.exposeInMainWorld("electronAPI", {
  // ...기존...
  geminiKey: {
    save: (key: string) => ipcRenderer.invoke("omx:gemini-key:save", key),
    clear: () => ipcRenderer.invoke("omx:gemini-key:clear"),
    getStatus: () => ipcRenderer.invoke("omx:gemini-key:status") as Promise<{ available: boolean }>,
  },
});
```

---

### 8. `electron-main.ts` (수정)

```typescript
import { registerEnvIpc } from "./main/ipc/env-ipc";

function registerIpc(): void {
  registerCliIpc();
  registerEnvIpc();  // ← 추가
  // ...
}
```

---

### 9. `env-checker.ts` (수정)

```typescript
export function verifyGeminiKey(): EnvStatus {
  const key = loadGeminiApiKey();
  if (!key) return { ok: true, code: "ok", message: "GEMINI_API_KEY 미설정 — Gemini 모델은 사용 불가" };
  if (!isValidGeminiKeyFormat(key)) return { ok: false, code: "auth_missing", ... };
  return { ok: true, code: "ok" };
}
```

---

### 10. `ChatContainer.tsx` (수정)

```typescript
interface ChatContainerProps {
  // ...기존...
  geminiKeyAvailable?: boolean;  // ← 추가
}

// ModelSelector에 전달
<ModelSelector value={selectedModel} onChange={...} geminiKeyAvailable={geminiKeyAvailable} />
```

---

### 11. `App.tsx` (수정)

```typescript
const [geminiKeyAvailable, setGeminiKeyAvailable] = useState(false);

// 초기 키 상태 로드
useEffect(() => {
  void window.electronAPI?.geminiKey?.getStatus().then((result) => {
    setGeminiKeyAvailable(result?.available ?? false);
  });
}, []);

// 조건부 렌더링
{selectedModel.startsWith("gemini-") && !geminiKeyAvailable && (
  <ApiKeySettings onKeySet={() => setGeminiKeyAvailable(true)} />
)}
```

---

## 데이터 흐름

```
사용자 UI
  │
  ├─[모델 선택: gemini-2.5-pro]
  │   └─ geminiKeyAvailable=false → ApiKeySettings 표시
  │       └─ 키 입력 → geminiKey.save() → IPC → safeStorage 암호화 저장
  │           └─ onKeySet() → geminiKeyAvailable=true → ModelSelector 활성화
  │
  └─[메시지 전송]
      └─ startAgentStream({ model: "gemini-2.5-pro" })
          └─ stream-bridge-ipc → loadGeminiApiKey()
              └─ executeCommand({ extraEnv: { GEMINI_API_KEY } })
                  └─ spawn("omx" / "codex", ..., env: { ...process.env, GEMINI_API_KEY })
```

---

## 보안 고려사항

- **safeStorage**: OS 제공 암호화 사용 (DPAPI/Keychain/libsecret)
- **contextIsolation**: contextBridge를 통해서만 IPC 접근
- **환경 변수 격리**: `GEMINI_API_KEY`는 자식 프로세스에만 주입; renderer 프로세스에는 노출되지 않음
- **형식 검증**: `AIzaSy` 접두사 + 39자 이상 검증으로 잘못된 키 저장 방지
- **폴백**: safeStorage 미지원 환경에서는 `process.env.GEMINI_API_KEY` 환경 변수 사용

---

## 타입 검사 결과

```
npx tsc --noEmit → 오류 없음 (출력 없음)
```

---

## 남은 작업 (선택적)

- Gemini API 연결 테스트 (실제 `GEMINI_API_KEY` 필요)
- `verifyGeminiKey()`를 `runFullEnvCheck()` 파이프라인에 통합 (현재 선택적 호출)
- Gemini 스트리밍 응답 파서 검증 (현재 기존 StreamParser 재사용)
