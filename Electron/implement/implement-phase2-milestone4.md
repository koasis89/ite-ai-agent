# Phase 2 · Milestone 4 구현 보고서

| 항목 | 내용 |
|------|------|
| **Phase** | 2 |
| **Milestone** | 4 — Ndjson 스트림 파이프라인 |
| **날짜** | 2026-05-26 |
| **상태** | ✅ 완료 |
| **티켓** | EL-211, EL-212, EL-213 |

---

## 생성 파일 목록

| # | 파일 경로 | 티켓 | 역할 |
|---|-----------|------|------|
| 1 | `Electron/src/main/cli/constants.ts` | EL-212 | 글로벌 플래그·추론 강도·StreamEnvelope 유니온 타입 정의 |
| 2 | `Electron/src/main/cli/ask.ts` | EL-211 | `ask` 서브커맨드 비동기 래퍼 |
| 3 | `Electron/src/main/cli/sparkshell.ts` | EL-211 | `sparkshell` 서브커맨드 비동기 래퍼 (`--session` 지원) |
| 4 | `Electron/src/main/core/execute-command.ts` | EL-212 | spawn + readline + 3단계 직렬화 가드 핵심 실행기 |
| 5 | `Electron/src/main/cli/stream-parser.ts` | EL-213 | Ndjson 파싱 + 콜백 분기 + IPC 채널 상수 |
| 6 | `Electron/src/main/ipc/stream-bridge-ipc.ts` | EL-213 | IPC 핸들러 등록 + BrowserWindow 브로드캐스트 |
| 7 | `Electron/src/test/EL-211.test.ts` | EL-211 | ask/sparkshell 프로세스 기동·플래그·콜백 테스트 |
| 8 | `Electron/src/test/EL-212.test.ts` | EL-212 | executeCommand 직렬화 가드 필터 테스트 |
| 9 | `Electron/src/test/stream-parser.test.ts` | EL-213 | StreamParser·parseStreamLine·IPC 브로드캐스트 테스트 |

---

## 티켓별 구현 요약

### EL-211 — ask / sparkshell 비동기 래퍼

**`ask.ts`**
- `interface AskOptions { prompt, reasoningEffort?, streamJson?, onLine?, onError?, omxBin? }`
- `export function ask(opts): Promise<number>`
- `spawn("omx", ["ask", prompt, ...플래그])` → readline 비동기 읽기
- close(null) → reject("[ask] process killed by signal")

**`sparkshell.ts`**
- `interface SparkshellOptions { prompt, reasoningEffort?, streamJson?, sessionId?, onLine?, onError?, omxBin? }`
- `export function sparkshell(opts): Promise<number>`
- ask.ts 동일 패턴 + `--session sessionId` 옵션 추가

**테스트 (EL-211.test.ts) — 10개 시나리오:**
- A: 기본 실행 / B: --high 플래그 / C: --xhigh 플래그
- D: --stream-json 플래그 / E: 비정상 종료 / F: 기동 실패 reject
- G: onLine 콜백 / H: sparkshell 기본 실행
- I: --session 플래그 / J: null exitCode reject

---

### EL-212 — 글로벌 상수 + executeCommand 핵심 실행기

**`constants.ts`**
- `STREAM_JSON_FLAG = "--stream-json"`
- `ReasoningEffortFlag = { standard:[], high:["--high"], xhigh:["--xhigh"] }`
- `type ReasoningEffort = "standard" | "high" | "xhigh"`
- StreamEnvelope 판별 유니온 7종 + `VALID_STREAM_TYPES` Set

**`execute-command.ts`**
- `interface ExecuteCommandHandle { child, exitCode: Promise<number> }`
- 3단계 직렬화 가드:
  1. JSON 파싱 실패 → onRawLine
  2. type 미포함 or VALID_STREAM_TYPES 불일치 → onRawLine
  3. 유효 StreamEnvelope → onEnvelope
- 빈/공백 라인 자동 스킵

**테스트 (EL-212.test.ts) — 10개 시나리오:**
- A: 유효 봉투 onEnvelope / B: 비JSON onRawLine
- C: type 미포함 JSON / D: 비표준 type
- E: --stream-json 자동 삽입 / F: --high 플래그
- G: streamJson=false / H: onError stderr
- I: 혼합 봉투 타입 / J: 빈 라인 미전달

---

### EL-213 — 스트림 파서 + IPC 브릿지

**`stream-parser.ts`**
- IPC 채널 상수 7종 (omx:stream-thinking, omx:stream-token, ...)
- `parseStreamLine(raw): StreamEnvelope | null` — 방어적 파싱
- `class StreamParser { attach(child), detach(), _handleLine(raw) }`
- `createStreamParser(child, callbacks): StreamParser` — 팩토리
- reasoning/content 이중 채널 분기 (TokenEnvelope.subType 기반)

**`stream-bridge-ipc.ts`**
- `AGENT_STREAM_START_CHANNEL`, `AGENT_STREAM_STOP_CHANNEL` IPC 핸들러
- `startAgentStream(command, args, reasoningEffort)` — executeCommand + createStreamParser 통합
- `stopAgentStream()` — SIGTERM + parser.detach()
- `broadcastToRenderers(channel, payload)` — isDestroyed() 가드
- `_getActiveSessionForTest()`, `_resetSessionForTest()` — 테스트용 접근자

**테스트 (stream-parser.test.ts) — 13개 시나리오:**
- A~C: parseStreamLine 파싱 / D~I: StreamParser 콜백 분기
- J: detach 이후 라인 무시
- K: ipcMain.handle 2채널 등록
- L: BrowserWindow.webContents.send 브로드캐스트
- M: stopAgentStream SIGTERM + detach

---

## 아키텍처 결정

| 결정 | 근거 |
|------|------|
| readline + Readable(stdout) | ADR-001: spawnSync / stdio:'inherit' 금지 |
| VALID_STREAM_TYPES Set 필터 | 비JSON 로그 오염 방지 (EL-212 직렬화 가드) |
| onThinkingToken vs onContentToken | 클로드 스타일 reasoning/content 이중 채널 (EL-213) |
| isDestroyed() 가드 | 파괴된 윈도우 send() 크래시 방지 |
| _getActiveSessionForTest | 상태 캡슐화 유지하며 테스트 접근 허용 |
