# Phase 1, Milestone 3 구현 보고서

| 항목 | 내용 |
|------|------|
| **Phase** | Phase 1 — Electron 기반 Desktop Agent Shell |
| **Milestone** | Milestone 3 — MCP 브릿지 · Hook 로그 Tailer · 이벤트 디스패처 |
| **작성일** | 2026-05-26 |
| **완료일** | 2026-05-26 |
| **상태** | ✅ 완료 |
| **티켓** | EL-206, EL-207, EL-208 |

---

## 생성 파일 목록

| # | 파일 경로 | 티켓 | 역할 |
|---|-----------|------|------|
| 1 | `Electron/src/main/mcp/mcp-bridge.ts` | EL-206 | omx mcp-serve 기반 MCP 서버 stdio 브릿지 |
| 2 | `Electron/src/main/mcp/mains/mcp-manager.ts` | EL-206 | 다중 MCP 서버 풀 제어 · Teardown 파이프라인 |
| 3 | `Electron/src/test/mcp-bridge.test.ts` | EL-206 DoD | McpBridge 9개 시나리오 단위 테스트 |
| 4 | `Electron/src/main/logs/hook-tailer.ts` | EL-207 | `.omx/logs/hooks-*.jsonl` 비차단 라인 Tailer |
| 5 | `Electron/src/test/hook-tailer.test.ts` | EL-207 DoD | HookTailer 7개 시나리오 단위 테스트 |
| 6 | `Electron/src/main/logs/event-dispatcher.ts` | EL-208 | hooks-extension 스펙 기반 이벤트 파싱+필터+브로드캐스트 |
| 7 | `Electron/src/main/ipc/event-broadcast-ipc.ts` | EL-208 | omx:runtime-hook-event IPC 채널 등록 · HookTailer ↔ EventDispatcher 연결 |
| 8 | `Electron/src/test/event-dispatcher.test.ts` | EL-208 DoD | EventDispatcher 10개 시나리오 단위 테스트 |

---

## EL-206: MCP 서버 브릿지 (mcp-bridge · mcp-manager)

### 구현 내용

#### McpBridge (`mcp-bridge.ts`)
- `spawn("omx", ["mcp-serve", serverName], { stdio: ["pipe","pipe","pipe"] })` 비동기 기동
- `readline.createInterface`로 stdout 라인 단위 JSON-RPC 수신
- `send(msg)`: `stdin.write(JSON.stringify(msg) + "\n")` 전송
- `kill()`: SIGTERM → 5초 대기(`TEARDOWN_GRACE_MS=5000`) → SIGKILL 강제 해제
- stderr → `console.error` 기록 + `onError` 핸들러 호출
- 비정상 크래시 시 자동 Respawn — `respawnCount < MAX_RESPAWN_COUNT(3)` 가드
- Respawn 쿨다운: `RESPAWN_COOLDOWN_MS=2000`

#### McpManager (`mains/mcp-manager.ts`)
- 싱글턴 패턴 (`McpManager.getInstance()`)
- `startAll(specs)`: McpBridge 인스턴스 생성 + 풀 등록 + 기동
- `stopAll()`: `Promise.allSettled` 병렬 kill
- `registerTeardownHooks()`: `app.on("before-quit")` + `app.on("window-all-closed")` 바인딩
- 좀비 프로세스 원천 차단 (ADR-001 #5)

### DoD 체크리스트

- [x] McpBridge start() — spawn 호출 확인 (시나리오 A)
- [x] McpBridge send() — stdin JSON 전달 (시나리오 B)
- [x] McpBridge onMessage() — stdout 라인 수신 (시나리오 C)
- [x] McpBridge stderr 캡처 — console.error 기록 (시나리오 D)
- [x] McpBridge kill() — SIGTERM 정상 종료 (시나리오 E)
- [x] McpBridge SIGKILL 폴백 — 5초 초과 시 SIGKILL (시나리오 F)
- [x] Respawn — 비정상 종료 시 자동 재기동 (시나리오 G)
- [x] Respawn 한도 초과 시 재기동 중단 (시나리오 H)
- [x] stdio 에코 통합 테스트 (시나리오 I)

---

## EL-207: Hook 로그 Tailer (`hook-tailer.ts`)

### 구현 내용

- `fs.watch(logsDir, { persistent: false }, ...)` — 폴링 금지, 이벤트 기반 감시
- `_findLatestFile()`: `readdirSync` + `statSync` mtime 기준 최신 `hooks-*.jsonl` 탐색
- `_attachStream(filePath)`: `fs.createReadStream({ highWaterMark: 4096 })` 비차단 청크 읽기
- **라인 버퍼 어셈블러**: `lineBuffer += chunk` → `split("\n")` → 마지막 불완전 청크 보존
- **날짜 로테이션 핫스위핑**: `_onRotation(newFile)` — 기존 스트림 `destroy()` → 새 스트림 `_attachStream()`
- `stop()`: `watcher.close()` + `currentStream.destroy()` + 버퍼 초기화

### DoD 체크리스트

- [x] start() — fs.watch 호출, 최신 파일 스트림 구독 (시나리오 A)
- [x] 라인 버퍼 어셈블러 — 불완전 청크 조립 (시나리오 B)
- [x] 고속 JSONL 100개 라인 유실 0% (시나리오 C)
- [x] 날짜 로테이션 핫스위핑 (시나리오 D)
- [x] stop() — 자원 해제 (시나리오 E)
- [x] 멀티 핸들러 동시 수신 (시나리오 F)
- [x] 빈 라인 필터링 (시나리오 G)

---

## EL-208: 이벤트 디스패처 + IPC 브로드캐스트

### 구현 내용

#### HookEventSchema (Zod, `event-dispatcher.ts`)
```
schema_version: z.literal("1")
event: z.enum(["session-start","keyword-detector","pre-tool-use","post-tool-use",
               "stop","session-end","turn-complete","session-idle","needs-input"])
timestamp: z.string()
source: z.enum(["native","derived"])
context: z.unknown()
session_id: z.string().optional()
thread_id: z.string().optional()
turn_id: z.string().optional()
mode: z.string().optional()
```

#### dispatch() 함수
1. `JSON.parse(rawLine)` — 실패 시 silent ignore
2. `HookEventSchema.safeParse()` — 실패 시 debug 로그만 기록, IPC 미전송
3. `PRIORITY_EVENTS.has(event)` → `"omx:runtime-hook-event:priority"` 채널
4. 그 외 → `"omx:runtime-hook-event"` 채널

#### PRIORITY_EVENTS
```
Set { "needs-input", "pre-tool-use", "post-tool-use" }
```

#### IPC 채널 (`event-broadcast-ipc.ts`)
| 방향 | 채널 | 설명 |
|------|------|------|
| Renderer → Main | `omx:hook-stream:start` | 스트림 구독 시작 (인수: logsDir) |
| Renderer → Main | `omx:hook-stream:stop` | 스트림 구독 중지 |
| Main → Renderer | `omx:runtime-hook-event` | 일반 훅 이벤트 |
| Main → Renderer | `omx:runtime-hook-event:priority` | 파생 신호 우선 채널 |

#### broadcastToRenderers()
- `BrowserWindow.getAllWindows()` 반복
- `win.isDestroyed()` 가드 후 `win.webContents.send(channel, payload)`

### DoD 체크리스트

- [x] 일반 이벤트 → omx:runtime-hook-event 채널 (시나리오 A)
- [x] needs-input → 우선 채널 (시나리오 B)
- [x] pre-tool-use → 우선 채널 (시나리오 C)
- [x] post-tool-use → 우선 채널 (시나리오 D)
- [x] 스키마 불일치 → IPC 미전송 (시나리오 E)
- [x] 6대 필수 필드 무손실 전달 (시나리오 F)
- [x] session_id / mode 선택 필드 보존 (시나리오 G)
- [x] 잘못된 JSON → 무시 (시나리오 H)
- [x] source 필드 검증 (시나리오 I)
- [x] schema_version 불일치 → 무시 (시나리오 J)

---

## ADR-001 준수 사항

| 규칙 | 내용 | 준수 여부 |
|------|------|-----------|
| #2 | spawnSync/stdio:inherit 금지, spawn 비동기만 사용 | ✅ 전 파일 spawn() 사용 |
| #2 | 폴링(setInterval) 기반 파일 감시 금지 | ✅ fs.watch 이벤트 기반 |
| #3 | 직접 파일 쓰기 금지 | ✅ 미사용 |
| #5 | 좀비 프로세스 원천 차단 | ✅ SIGTERM→5s→SIGKILL + McpManager teardown |

---

## 테스트 시나리오 요약

| 파일 | 시나리오 수 | 주요 커버리지 |
|------|------------|--------------|
| `mcp-bridge.test.ts` | 9개 (A~I) | spawn, send, onMessage, stderr, SIGTERM, SIGKILL 폴백, Respawn, 한도 초과, 에코 |
| `hook-tailer.test.ts` | 7개 (A~G) | fs.watch, 라인 버퍼, 100개 유실 0%, 로테이션, stop(), 멀티 핸들러, 빈 라인 필터 |
| `event-dispatcher.test.ts` | 10개 (A~J) | 일반/우선 채널 분기, 스키마 검증, 6대 필드, 선택 필드, JSON 에러, source 검증, schema_version |

**총 테스트 시나리오: 26개**
