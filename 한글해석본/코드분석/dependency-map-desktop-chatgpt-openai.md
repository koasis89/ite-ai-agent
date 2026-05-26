# desktop ChatGPT/OpenAI 연동 의존성 맵

이 문서는 desktop 앱에서 free-text 경로가 ChatGPT/OpenAI로 호출되는 현재 구조를 코드 기준으로 정리한다.

범위:
- 포함: desktop renderer/ipc/main의 LLM gateway 경로
- 제외: Codex CLI setup/hooks/goal/workflow 계층 (`src/*` 중심)

관련 Codex 문서:
- `한글해석-분석본/설명문서/dependency-map-use-codex.md`
- `한글해석-분석본/설명문서/dependency-map-oh-my-codex-js.md`

## 1) 실행 경로 (요약)

1. renderer free-text 입력
2. `window.omx.runCommand({ command: "llm_gateway_invoke" ... })` 호출
3. ipc contract에서 payload(v1) 검증
4. main의 provider registry에서 adapter 선택
5. openai/chatgpt provider면 OpenAI 호환 API 호출
6. 결과를 v1 result/error envelope로 renderer에 반환

## 2) 핵심 파일

- `desktop/renderer/app.ts`
  - free-text 상태머신(timeout/retry/cancel)
  - `llm_gateway_invoke` IPC 요청 생성
- `desktop/ipc/commands.ts`
  - `llm_gateway_invoke` args schema(v1) 검증
  - backend 주입점 `setLlmGatewayBackend`
- `desktop/main/index.ts`
  - provider registry bootstrap
  - `makeOpenAiAdapter("openai")` 및 `chatgpt` alias
- `desktop/renderer/index.html`
  - provider/model selector UI (`openai`, `chatgpt`)

## 3) provider registry 현재 상태

`desktop/main/index.ts` 기준:
- mock providers
  - `mock-echo`
  - `mock-reverse`
- real providers
  - `openai`
  - `chatgpt` (openai adapter alias)

## 4) OpenAI adapter 동작 규칙

### 4.1 인증/엔드포인트
- `OPENAI_API_KEY` 필수
- base URL 우선순위:
  1. `OMX_DESKTOP_OPENAI_BASE_URL`
  2. `OPENAI_BASE_URL`
  3. `https://api.openai.com/v1`

### 4.2 모델 선택
- 요청 모델이 비어 있거나 `omx-desktop-*`이면:
  - `OMX_DESKTOP_OPENAI_MODEL` 사용
  - 미설정 시 `gpt-4o-mini`
- 요청 모델이 일반 모델명(`gpt-4o-mini` 등)이면 그대로 사용

### 4.3 타임아웃
- `OMX_DESKTOP_LLM_TIMEOUT_MS` 사용
- 허용 범위: 1000..120000 ms
- 미설정 시 30000 ms

### 4.4 API 호출
- endpoint: `${baseUrl}/chat/completions`
- body: `model`, `messages`, `temperature`, `max_tokens`
- 성공 시 `choices[0].message.content`를 `outputText`로 매핑

### 4.5 에러 매핑
- key 미설정: `AUTH_INVALID`
- 401/403: `AUTH_INVALID`
- 429/5xx: `PROVIDER_ERROR` (retryable=true)
- 기타 non-2xx: `PROVIDER_ERROR`
- timeout/network: `BACKEND_UNREACHABLE`
- content 비어 있음: `INVALID_RESPONSE`

## 5) Codex 계층과의 경계

Desktop OpenAI adapter는 현재 Codex CLI 로그인 세션을 직접 읽지 않는다.
인증은 desktop process의 환경변수(`OPENAI_API_KEY`)로만 전달된다.

참고:
- Codex provider env 주입은 `src/config/models.ts`의 `readActiveProviderEnvOverrides`를 통해
  team worker launch(`src/team/tmux-session.ts`) 경로에서 사용된다.
- desktop gateway는 별도 경로(`desktop/main/index.ts`)이므로 자동 공유가 없다.

## 6) 실제 동작 확인 체크리스트

1. desktop 실행 전 환경변수 설정
- `OPENAI_API_KEY`
- (선택) `OMX_DESKTOP_OPENAI_BASE_URL`
- (선택) `OMX_DESKTOP_OPENAI_MODEL`
- (선택) `OMX_DESKTOP_LLM_TIMEOUT_MS`

2. 앱 실행
- `npm run desktop:dev`

3. 채팅 패널 확인
- provider: `openai` 또는 `chatgpt`
- model: `gpt-4o-mini` 등 실제 모델 선택

4. 검증 포인트
- 정상 응답 시 `free-text: 완료`
- 인증 실패 시 `AUTH_INVALID`
- 타임아웃 유도 시 `TIMEOUT` 또는 `BACKEND_UNREACHABLE` 매핑 확인

## 7) 운영 권장

- 문서 운영 시 Codex/OMX 계층 문서와 desktop LLM 계층 문서를 분리 유지
- 변경 추적 시 우선 파일:
  - `desktop/main/index.ts`
  - `desktop/ipc/commands.ts`
  - `desktop/renderer/app.ts`
  - `desktop/renderer/index.html`
