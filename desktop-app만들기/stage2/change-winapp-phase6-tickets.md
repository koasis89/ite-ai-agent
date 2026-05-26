# change-winapp Phase 6 구현 티켓

이 문서는 Phase 5(WIN-041~WIN-044) 완료 이후,
데스크탑 앱 "도구(Tool) 호출 + MCP 클라이언트" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-051 ~ WIN-054)는 **권장 실행 순서**에 따라 부여되었고,
Phase 3 의 `omx_*` 외부 프로세스 호출 패턴을 일반화해 **표준 MCP 서버를 권한 모델 아래에서 호출**할 수 있도록
도구 라우터 / 카탈로그 UI / 권한 다이얼로그 / 호출 이력 4개 축을 도입한다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](../stage1/개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase4-tickets.md](change-winapp-phase4-tickets.md) + [change-winapp-phase5-tickets.md](change-winapp-phase5-tickets.md) 마감 상태에서 진입
- 갭 분석 출처: [stage2-roadmap-winapp.md §3·§4 Phase 6](stage2-roadmap-winapp.md), [future-winapp.md C3·C7](../stage1/future-winapp.md)

Phase 6 (도구 호출 + MCP 클라이언트) 범위:
- MCP(Model Context Protocol) stdio transport 클라이언트 구현 — 서버 매니페스트 로드 + 도구 카탈로그 수집
- 좌/우측 패널의 도구 카탈로그 UI + 활성/비활성 토글
- 도구 호출 권한 다이얼로그 (1회 / 세션 / 영구 허용 3단계) — Phase 2 `question_ask` 모달 재사용
- 도구 호출 이력 패널 — Phase 3 `command.started/completed/failed` 페어를 도구 호출 로그로 일반화 + Phase 5 SQLite `tool_calls` 테이블 영속

완료 목표:
- 사용자가 설정에 등록한 MCP 서버의 도구를 권한 동의 다이얼로그를 거쳐 채팅에서 호출할 수 있다.
- `omx_*` 3종(WIN-023) 도 동일한 도구 라우터·권한 모델 위에서 호출되도록 일반화되어, 별도 IPC 분기가 사라진다.
- 모든 도구 호출이 SQLite `tool_calls` 에 영속 기록되고, 이력 패널에서 검색/재실행 가능.

공통 작업 지점(모든 티켓 공통):
- [desktop/ipc/commands.ts](../../desktop/ipc/commands.ts) — 신규 IPC 명령(`tool_*`) 화이트리스트 추가
- [desktop/__tests__/](../../desktop/__tests__/) — 신규 회귀 테스트 (`mcp-client.test.ts` / `tool-router.test.ts` / `permission-store.test.ts` / `tool-history.test.ts`)
- [src/core/local-process-transport.ts](../../src/core/local-process-transport.ts) — MCP 서버 stdio spawn 시 기존 보안 가드 승계 (allowedCommands / cwd / env / 30s 워치독 / 8KB 절단)
- [desktop/main/storage/](../../desktop/main/) — Phase 5 SQLite 위에 `tool_servers` / `tool_permissions` 테이블 추가
- [winapp만들기/stage2/winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 매뉴얼 §7 (신설) "도구 호출 / MCP" 갱신

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| TBD | TBD | US-51 WIN-051 MCP 클라이언트 (stdio transport, 서버 매니페스트 로드) |
| TBD | TBD | US-52 WIN-052 도구 카탈로그 UI + 활성/비활성 토글 |
| TBD | TBD | US-53 WIN-053 도구 호출 권한 다이얼로그 (1회/세션/영구 3단계) |
| TBD | TBD | US-54 WIN-054 도구 호출 이력 패널 (`command.*` 이벤트 일반화 + SQLite 영속) |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-02 : 윈도우 데스크탑 앱 도구 호출 + MCP (신규 — 등록 필요)
- 스프린트 SP-06 : 윈도우 데스크탑 앱(6단계, 도구/MCP) (신규 — 등록 필요)
- 유저스토리 매핑 : US-51~US-54 = WIN-051~WIN-054 (권장 실행 순서대로 부여)

---

## 스프린트 백로그 (SP-06)

---

## WIN-051. MCP 클라이언트 (stdio transport, 서버 매니페스트 로드)

- 우선순위: P0
- 실행 순서: 1번째 (이후 모든 도구 호출이 의존하는 코어 클라이언트)
- 선행 티켓: WIN-012 (LocalProcessTransport), WIN-030 (PtyLocalTransport 옵션), WIN-041 (config 저장소)
- 그룹: Infra (프로토콜 클라이언트)
- 목표: MCP 표준(JSON-RPC 2.0 over stdio) 서버를 spawn 해 도구 카탈로그(`tools/list`)와 호출(`tools/call`) 능력을 확보한다.
- 대상 경로:
  - `src/mcp/client.ts` (신규 — `McpClient` 클래스)
  - `src/mcp/transport-stdio.ts` (신규 — stdio JSON-RPC 프레이밍)
  - `src/mcp/schema.ts` (신규 — zod: `Tool`, `ServerManifest`, `JsonRpcRequest/Response`)
  - `desktop/main/mcp/registry.ts` (신규 — `config.json` 의 `mcp.servers[]` 항목을 spawn 관리)
  - `src/mcp/__tests__/client.test.ts` (신규)
- 서버 매니페스트 스키마(`config.json.mcp.servers[]`):
  - `{ id, name, command, args, cwd?, env?, enabled, autoStart }`
  - 예: `{ id:'fs', name:'Filesystem', command:'node', args:['./mcp-fs/server.js'], enabled:true, autoStart:true }`
- 구현 책임:
  - JSON-RPC 2.0 프레이밍 (Content-Length 헤더 기반) — MCP 표준 준수
  - 메서드: `initialize` / `tools/list` / `tools/call` / `notifications/cancelled` / `ping`
  - 서버별 health (last pong, restart count) 추적
  - 비정상 종료 시 exponential backoff 재시작 (최대 3회, 이후 disabled)
- 보안 정책:
  - 서버 spawn 은 `LocalProcessTransport` 경유 — 기존 `allowedCommands`/`allowedCwdRoots`/`envAllowList`/30s 워치독 100% 승계
  - `command` 화이트리스트 확장 정책: `config.json` 의 `mcp.servers[].command` 가 `allowedCommands` 에 자동 등록되지 않음 — 사용자가 명시적으로 허용해야 함 (WIN-053 권한 다이얼로그에서 수행)
  - JSON-RPC 페이로드 크기 상한 1MB
  - 응답 zod 검증 실패 시 호출 거부
- 작업:
  - JSON-RPC 프레이밍 단위 테스트 (chunk split, 멀티 메시지)
  - `tools/call` 응답 streaming 대응 (Phase 4 WIN-034 streaming 채널 재사용)
  - 헬스 메트릭 EventBus 채널(`mcp.server.health`) 발행
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 샘플 MCP 서버(예: 공식 `@modelcontextprotocol/server-filesystem`) 를 spawn → `tools/list` 응답 수신 → `tools/call` 1회 정상 동작
  - 비정상 종료 시 backoff 재시작 동작
  - JSON-RPC 페이로드 1MB 초과 거부 회귀
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `McpClient` + stdio 프레이밍 구현
  - [x] `schema.ts` zod (Tool / ServerManifest / JSON-RPC)
  - [x] `registry.ts` 서버 라이프사이클 (spawn/restart/disable)
  - [x] `LocalProcessTransport` 경유 spawn (보안 가드 승계)
  - [x] `client.test.ts` (initialize / tools/list / tools/call / 프레이밍 / backoff)
  - [x] 매뉴얼 §7.1 MCP 서버 등록 절차 추가 (WIN-055 일괄 반영)
- 작업 결과: `winapp만들기/stage2/result/작업내역-W051.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-051) — 등록 완료 (2026-05-24) — Sprint SP-06 (id=15) / Epic EP-02 (id=9) / US-51 (id=48, ref=#185) / Tasks 128(#186)/129(#187)/130(#188) description PATCH 완료

---

## WIN-052. 도구 카탈로그 UI + 활성/비활성 토글

- 우선순위: P0
- 실행 순서: 2번째 (WIN-051 의 `tools/list` 결과를 UI 로 노출)
- 선행 티켓: WIN-051, WIN-031 (Phase 4 채팅 ViewModel — 우측 패널)
- 그룹: UI (Renderer 신규 컴포넌트)
- 목표: 등록된 MCP 서버 + `omx_*` 내장 도구를 1곳에 카탈로그로 표시하고, 사용자가 도구별 활성/비활성을 토글할 수 있다.
- 대상 경로:
  - `desktop/renderer/tools/ToolCatalog.ts` (신규)
  - `desktop/renderer/tools/ToolCard.ts` (신규)
  - `desktop/renderer/tools/tool-catalog-store.ts` (신규 — `tools/list` 결과 + 내장 도구 합본)
  - `desktop/ipc/commands.ts` (신규 명령 `tool_list` / `tool_toggle`)
  - `desktop/__tests__/tool-catalog.test.ts` (신규)
- 추가 IPC 명령(2종):
  - `tool_list` — args 없음. `{ tools: [{ id, server, name, description, schema, enabled }, ...] }` 반환
  - `tool_toggle` — args[0]=`toolId`, args[1]=`'on'|'off'`. 응답 `{ enabled }`
- 구현 책임:
  - 카탈로그 SSOT: 외부 MCP 도구 (`<serverId>:<toolName>`) + 내장 도구 (`builtin:omx_doctor` 등 3종)
  - 우측 패널에 서버 그룹별 expand/collapse, 도구 카드(이름/설명/스키마 요약/Last used)
  - 검색 박스(이름/설명 부분 일치)
  - 비활성 도구는 채팅 슬래시 명령(`/tool ...`)에서도 호출 거부 (검증은 main 측)
- 보안 정책:
  - `tool_toggle` 의 toolId 는 zod enum (등록된 도구 ID 화이트리스트)
  - 활성/비활성 상태는 Phase 5 `config.json` 의 `mcp.tools[toolId].enabled` 에 영속
- 작업:
  - 도구 스키마(JSON Schema) 요약 렌더 — 인자 이름/타입/필수여부만 표시
  - 도구 카드 클릭 → 채팅 InputBox 에 `/tool <id> ` 프리필
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 등록된 MCP 서버의 도구 + `omx_*` 3종이 카탈로그에 표시
  - 토글 시 즉시 반영 + 재시작 후에도 유지
  - 비활성 도구 호출 거부 회귀
  - 회귀: `ipc-contract.test.ts` 에 `tool_list`/`tool_toggle` accept/reject 케이스 추가
- 체크리스트:
  - [x] `ToolCatalog`/`ToolCard` UI + 검색
  - [x] `tool_list` / `tool_toggle` IPC 명령 + zod 스키마
  - [x] config 영속 (`%APPDATA%/oh-my-codex/mcp-tools.json` — `ToolEnabledStore`. Phase 5 v1 strict 회피, WIN-053 SQLite 흡수 시점 재검토)
  - [x] `tool-catalog.test.ts` (목록 / 토글 / 비활성 거부)
  - [x] 매뉴얼 §7.2 카탈로그 UI 사용법 추가 (WIN-055 일괄 반영)
- 작업 결과: `winapp만들기/stage2/result/작업내역-W052.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-052) — 등록 완료 (2026-05-24) — Sprint SP-06 (id=15) / Epic EP-02 (id=9) / US-52 (id=49, ref=#189) / Tasks 131(#190)/132(#191)/133(#192) description PATCH 완료

---

## WIN-053. 도구 호출 권한 다이얼로그 (1회/세션/영구 3단계)

- 우선순위: P0
- 실행 순서: 3번째 (WIN-051/052 의 도구 호출을 실제 보안 게이트 뒤로 보냄)
- 선행 티켓: WIN-015 (Question 모달), WIN-051, WIN-052, WIN-041 (config 저장소)
- 그룹: Security + UI
- 목표: 도구 호출 시 명시적 동의 다이얼로그를 띄우고, 사용자의 선택(1회/세션/영구 허용 또는 거부)을 권한 저장소에 기록한다.
- 대상 경로:
  - `desktop/main/permissions/permission-store.ts` (신규 — Phase 5 config + SQLite 양쪽 사용)
  - `desktop/main/permissions/permission-broker.ts` (신규 — 다이얼로그 호출 + 결과 기록)
  - `desktop/renderer/permissions/PermissionDialog.ts` (신규 — Question 모달 확장 또는 별도)
  - `desktop/ipc/commands.ts` (신규 명령 `tool_permission_list` / `tool_permission_revoke`)
  - `desktop/__tests__/permission-store.test.ts` (신규)
- 권한 모델:
  - 키: `(toolId, sessionId?)` — 세션 허용은 sessionId 종속, 영구 허용은 sessionId=null
  - 값: `'allow' | 'deny'` + `grantedAt` + `expiresAt?` (영구는 null)
  - 우선순위 (조회 시): 영구 deny > 영구 allow > 세션 deny > 세션 allow > 미설정(다이얼로그 표시)
- 추가 IPC 명령(2종):
  - `tool_permission_list` — 전체 권한 목록 반환
  - `tool_permission_revoke` — args[0]=`toolId`, args[1]=`'session'|'permanent'|'all'`
- 구현 책임:
  - 도구 호출 진입점에서 `permissionBroker.check(toolId, sessionId)` 호출
    - hit → 통과
    - miss → 다이얼로그 표시 → 선택 결과 저장 + 호출 진행/중단
  - 다이얼로그 표시 항목: 도구 ID / 서버 / 설명 / 인자 요약(민감 키 마스킹) / 선택 4버튼(이번 1회 / 이 세션 / 영구 / 거부)
  - 영구 deny 는 카탈로그에서도 visual 비활성
- 보안 정책:
  - 권한 저장: Phase 5 SQLite `tool_permissions(tool_id TEXT, session_id TEXT, decision TEXT, granted_at INTEGER, expires_at INTEGER)` 신규 테이블 (`migrations/003_tool_permissions.sql`)
  - 권한 우회 금지: 모든 도구 호출은 broker 통과 후에만 실행 (테스트로 강제)
  - 다이얼로그 인자 요약에서 비밀번호/토큰 패턴 마스킹 (Phase 5 WIN-043 패턴 재사용)
- 작업:
  - `omx_*` 3종도 동일 broker 통과 (WIN-023 의 `OMX_DESKTOP_ALLOW_EXEC` 환경변수는 broker 의 "거부" 단축으로 흡수)
  - 권한 변경 시 UI 알림(채팅 system 메시지)
- 산출물:
  - 변경/신규 파일 6~7개
- 완료 기준(DoD):
  - 신규 도구 첫 호출 시 다이얼로그 표시 + 4선택지 동작
  - "영구 허용" 선택 후 재시작에도 유지
  - "세션 허용" 은 세션 종료 시 자동 만료
  - 모든 도구 호출이 broker 를 통과함을 자동 테스트로 증명
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `migrations/003_tool_permissions.sql` + `permission-store.ts`
  - [x] `permission-broker.ts` (check/grant/revoke)
  - [x] `PermissionDialog` 컴포넌트 (Question 모달 기반)
  - [x] `tool_permission_list` / `tool_permission_revoke` IPC + zod
  - [x] `omx_*` 3종을 broker 통과로 일반화 (`OMX_DESKTOP_ALLOW_EXEC` 호환 처리)
  - [x] `permission-store.test.ts` (우선순위 / 만료 / broker 우회 차단)
  - [x] 매뉴얼 §7.3 권한 동의 UX 설명 추가 (WIN-055 일괄 반영)
- 작업 결과: `winapp만들기/stage2/result/작업내역-W053.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-053) — 등록 완료 (2026-05-24) — Sprint SP-06 (id=15) / Epic EP-02 (id=9) / US-53 (id=50, ref=#193) / Tasks 134(#194)/135(#195)/136(#196) description PATCH 완료

---

## WIN-054. 도구 호출 이력 패널 (`command.*` 이벤트 일반화 + SQLite 영속)

- 우선순위: P1
- 실행 순서: 4번째 (WIN-051~053 결과를 영속 + 검색 가능한 형태로 마무리)
- 선행 티켓: WIN-051, WIN-052, WIN-053, WIN-042 (SQLite `tool_calls` 테이블)
- 그룹: IPC + UI
- 목표: Phase 3 의 `command.started/completed/failed` 이벤트 페어를 도구 호출 로그로 일반화하고, Phase 5 SQLite `tool_calls` 테이블에 영속해 이력 패널에서 검색/재실행할 수 있게 한다.
- 대상 경로:
  - `desktop/main/storage/tool-call-history-repo.ts` (신규 — Phase 5 `tool_calls` 테이블 사용)
  - `desktop/main/tools/tool-router.ts` (신규 — `omx_*` 3종 + MCP 도구 일원화 디스패처)
  - `desktop/renderer/tools/ToolHistoryPanel.ts` (신규)
  - `desktop/ipc/commands.ts` (신규 명령 `tool_call` / `tool_history_list` / `tool_history_replay`)
  - `desktop/__tests__/tool-history.test.ts` (신규)
- 추가 IPC 명령(3종):
  - `tool_call` — args[0]=`toolId`, args[1]=`argsJson`(zod 통과 후 도구별 스키마 검증). broker 통과 후 실행, `command.progress` 로 streaming
  - `tool_history_list` — args[0]=limit(1..200), args[1]=`toolId?` 필터. `tool_calls` 조회
  - `tool_history_replay` — args[0]=호출 ID. 동일 인자로 재호출 (권한은 다시 broker 통과)
- 구현 책임:
  - `tool-router` 는 toolId 접두사(`builtin:` / `<serverId>:`) 로 라우팅
    - `builtin:omx_doctor` 등 → 기존 `omxCliMatrix` (WIN-023) 재사용
    - `<serverId>:<toolName>` → WIN-051 `McpClient.callTool(...)`
  - 결과 정규화: `{ ok, exitCode?, stdout?, stderr?, result?, durationMs, truncated }` 통일
  - 이력 항목에 `permissionDecision` (allow/deny + 1회/세션/영구) 기록
- 보안 정책:
  - argsJson 직렬화 시 비밀번호/토큰 마스킹 (WIN-043 / WIN-053 재사용)
  - `tool_history_replay` 도 broker 통과 (영구 허용된 도구만 묵시적 진행)
  - `tool_calls` 의 stdout/stderr 도 8KB 상한 + `truncated` 플래그
- 작업:
  - Phase 4 WIN-033 슬래시 라우터에 `/tool <id> <args...>` 매핑 추가
  - Phase 4 WIN-034 streaming bridge 에 `tool_call` 의 chunk 흐름 연결 (`channel='stdout'|'stderr'|'mcp-progress'`)
  - 이력 패널: 시간 역순, 필터(toolId/exit), 클릭 시 인자/출력 상세, 재실행 버튼
- 산출물:
  - 변경/신규 파일 6~7개
- 완료 기준(DoD):
  - `omx_*` 3종 + 등록된 MCP 도구가 동일 라우터/이력으로 호출
  - 재시작 후 이력 패널에 직전 호출이 보존
  - `tool_history_replay` 가 권한 모델을 거쳐 정상 재실행
  - 회귀: `ipc-contract.test.ts` + `tool-history.test.ts` 통과
- 체크리스트:
  - [x] `tool-router.ts` (builtin + MCP 라우팅)
  - [x] `tool-call-history-repo.ts` (Phase 5 SQLite 위, 마이그레이션 004 로 `tool_calls` 컬럼 확장)
  - [x] `tool_call` / `tool_history_list` / `tool_history_replay` IPC + zod
  - [x] `ToolHistoryPanel.ts` UI (필터 / 상세 / 재실행)
  - [x] WIN-033 슬래시 라우터에 `/tool` 추가
  - [x] WIN-034 streaming bridge 연결 — `ToolCallHooks.onChunk(stream, chunk, truncated)` 채널을 통해 `stdout`/`stderr`/`mcp-progress` 분기 (실 배선은 main bootstrap 단계에서 hook → `eventBus.publish('command.progress')`)
  - [x] `tool-history.test.ts` (호출 / 영속 / 재실행 / 마스킹)
  - [x] 매뉴얼 §7.4 이력 패널 사용법 추가 (WIN-055 일괄 반영)
- 작업 결과: `winapp만들기/stage2/result/작업내역-W054.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-054) — 등록 완료 (2026-05-24) — Sprint SP-06 (id=15) / Epic EP-02 (id=9) / US-54 (id=51, ref=#197) / Tasks 137(#198)/138(#199)/139(#200) description PATCH 완료

---

## WIN-055. Phase 6 마감 통합 (bootstrap 결선 + UI 마운트 + 매뉴얼 §7)

- 우선순위: P0
- 실행 순서: 5번째 (WIN-051~054 모듈을 production 활성화하는 마감 통합)
- 선행 티켓: WIN-051, WIN-052, WIN-053, WIN-054
- 그룹: Bootstrap + UI + Docs
- 목표: WIN-051~054 가 모듈/IPC/DB/렌더러 단위로 각자 완성됐지만 `desktop/main/index.ts` 와 `desktop/renderer/app.ts` 결선이 0건이라 production 빌드에서 활성화되지 않는다. 본 티켓은 후속 검증 결과(`winapp만들기/stage2/result/후속검증-W051-W054.md`)에서 식별된 5개 코드 미진 항목 + 매뉴얼 §7.1~§7.4 를 일괄 마감한다.
- 대상 경로:
  - `desktop/main/index.ts` — bootstrap 결선 (단일 진입점)
  - `desktop/main/permissions/permission-broker.ts` — `catalog` 게이트 흡수
  - `desktop/ipc/events.ts` — `tool.permission.changed` 이벤트 타입 추가
  - `desktop/ipc/commands.ts` — `tool_call` switch case 가 `onChunk` → `command.progress` 발행하도록 `ToolRouterBackend.call` 시그니처 확장
  - `desktop/renderer/index.html` — `tool-history-panel` host element 추가
  - `desktop/renderer/app.ts` — `ToolHistoryPanel` 마운트
  - `winapp만들기/stage2/winapp-manual-v2.md` — §7 "도구 호출 / MCP" 신규 4절
  - `desktop/__tests__/permission-broker-catalog-gate.test.ts` (신규 — broker 단일 게이트 회귀)
- 후속 검증 매핑 (총 5건):
  - W052#2 broker 가 `catalog.isEnabled` 흡수 → `PermissionBroker` 옵션에 `catalog?: { isEnabled(toolId): boolean }` 추가 + `check()` 진입부에서 deny 분기
  - W052#4 `mcpSource` ↔ `McpServerRegistry.healthSnapshot()` 결선 → main bootstrap 에서 registry.list() 의 tools 를 `{serverId, tool}` Iterable 로 변환해 `ToolCatalogStore` 에 주입
  - W053#3 권한 변경 main↔renderer 통지 → `broker.onChange` 콜백을 `eventBus.publish('tool.permission.changed', detail)` 로 결선
  - W054#2 `ToolRouter` 인스턴스화 + `setToolRouterBackend` → bootstrap 에서 `executors.omx = (name, args, hooks) => runOmxSubcommand(omxCliMatrix[name], { onChunk: hooks.onChunk })`, `executors.mcp = (server, name, args, hooks) => registry.callTool(server, name, parsedArgs)`
  - W054#4 `ToolHistoryPanel` desktop 마운트 → 우측 콘텍스트 패널 / 또는 신규 `<article>` 마운트
- 구현 책임:
  - bootstrap 순서: configStore → sqliteDb → legacyState → workerTransports → `bootstrapToolStack` (mcpRegistry → enabledStore → catalogStore → permissionStore → permissionBroker → toolRouter → setBackends).
  - `bootstrapToolStack` 는 sqliteDb 부재 시 silent skip (Phase 4 fallback 유지). configStore 의 `mcp.servers` 미정의 시 registry 미생성 (mcpSource = () => []).
  - `tool_call` switch case 가 `backend.call({..., onChunk})` 로 콜백 전달 → ToolRouter 가 executors 에 forward → onChunk 호출마다 `eventBus.publish('command.progress', { messageId, stream, chunk, truncated })` 발행.
  - `permission-broker` 의 prompt 콜백은 WIN-055 범위에서는 안전 fallback (deny-once + 로그) — 다이얼로그 UI 전체 wiring 은 Phase 7 별도 티켓으로 분리. 단 `omx_*` 빌트인은 env override 단축으로 정상 동작.
- 보안 정책:
  - broker catalog 게이트는 store 조회 *이전* 에 적용 (비활성 도구는 영구 deny 보다도 빠르게 차단).
  - `tool.permission.changed` 이벤트의 `argsSummary`/`toolId` 만 발행 (raw args 미발행).
  - prompt fallback 의 deny-once 는 `onChange("denied")` 통지로 시스템 메시지 발화.
- 작업:
  - main bootstrap 7개 후크 결선
  - `permission-broker.ts` catalog 옵션 추가 + check() 진입부 가드
  - `events.ts` enum + detail 인터페이스 1개 추가
  - `commands.ts` `ToolRouterBackend.call` 시그니처에 optional `onChunk` 추가 + `tool_call` switch 에서 콜백 결선
  - `index.html` + `app.ts` 패널 마운트 (renderer)
  - 매뉴얼 §7.1~§7.4 4절 작성 (MCP 등록 / 카탈로그 / 권한 / 이력 사용법)
  - 회귀 테스트 1종 추가 (`permission-broker-catalog-gate.test.ts`)
- 산출물:
  - 변경/신규 파일 8~10개
- 완료 기준(DoD):
  - production `npm run desktop:build` 후 `desktop/main/index.js` 가 `setToolRouterBackend` / `setToolCatalogBackend` / `setPermissionBackend` 호출을 1회씩 포함
  - `tool_call('builtin:omx_doctor', '[]')` IPC 가 broker 통과 후 정상 종료 + `command.progress` 이벤트 발행
  - 비활성 도구 `tool_call` 이 broker 단계에서 deny 로 차단 (회귀 테스트)
  - `ToolHistoryPanel` 이 renderer 에 마운트되어 `tool_history_list` IPC 호출 후 카드 렌더
  - 매뉴얼 §7.1~§7.4 4절 추가
  - 회귀: `npm run test:phase2:common:compiled` 무영향
- 체크리스트:
  - [x] `permission-broker.ts` catalog 옵션 + check() 진입부 가드 (W052#2)
  - [x] main bootstrap `bootstrapToolStack` 신설 — McpServerRegistry / ToolEnabledStore / ToolCatalogStore / PermissionStore / PermissionBroker / ToolCallHistoryRepo / ToolRouter (W052#4, W053#3, W054#2)
  - [x] `events.ts` `tool.permission.changed` 추가 + broker.onChange → eventBus.publish 결선 (W053#3)
  - [x] `commands.ts` `ToolRouterBackend.call` 시그니처에 `onChunk` 추가 + `tool_call` switch 가 `command.progress` 발행 (W054#3)
  - [x] `index.html` + `app.ts` `ToolHistoryPanel` 마운트 (W054#4)
  - [x] 매뉴얼 §7.1~§7.4 4절 추가 (W051#1, W052#1, W053#1, W054#1)
  - [x] `permission-broker-catalog-gate.test.ts` 회귀 추가
  - [x] W051~W054 의 §7.x 매뉴얼 체크박스 일괄 [x] 갱신
- 작업 결과: `winapp만들기/stage2/result/작업내역-W055.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-055) — 등록 완료 — Sprint SP-06 (id=15) / Epic EP-02 (id=9) / US-55 (id=52, ref=#201) / Tasks 140(#202 구현) / 141(#203 검증) / 142(#204 문서·정합성) — description PATCH 3× 200, version 1→2

---

## Phase 6 Exit Criteria

Phase 6 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase6-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-051 ~ WIN-054 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 회귀 없음
- 신규 회귀: `mcp-client.test.ts` / `tool-catalog.test.ts` / `permission-store.test.ts` / `tool-history.test.ts` 4종 통과
- 보안: 모든 도구 호출이 `permissionBroker.check(...)` 를 통과함을 자동 테스트로 증명 (우회 시 fail)
- 보안: 비활성 도구 + 영구 deny 도구 호출이 거부됨을 자동 테스트로 증명
- 일반화: Phase 3 의 `omx_*` 3종이 신규 `tool_router` 위에서 호출되며, 별도 IPC 분기가 제거됨
- 영속: 호출 이력이 SQLite `tool_calls` 에 기록되고 재시작 후 이력 패널에 표시
- 문서: [winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 에 §7 "도구 호출 / MCP" 섹션 신규 추가 (MCP 서버 등록 / 카탈로그 / 권한 / 이력 4절)

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 신규 모듈 / 변경 영역 | 의존 |
|---|---|---|---|
| WIN-051 | Infra | `src/mcp/{client,transport-stdio,schema}` + `desktop/main/mcp/registry.ts` | WIN-012, WIN-030, WIN-041 |
| WIN-052 | UI | `desktop/renderer/tools/{ToolCatalog,ToolCard,tool-catalog-store}` + `tool_list`/`tool_toggle` IPC | WIN-051, WIN-031 |
| WIN-053 | Security+UI | `desktop/main/permissions/{permission-store,permission-broker}` + `PermissionDialog` + `migrations/003_tool_permissions.sql` | WIN-015, WIN-051, WIN-052, WIN-041 |
| WIN-054 | IPC+UI | `desktop/main/tools/tool-router.ts` + `tool-call-history-repo.ts` + `ToolHistoryPanel.ts` + `tool_call`/`tool_history_*` IPC | WIN-051~053, WIN-042 |

도구 라우팅 SSOT: `desktop/main/tools/tool-router.ts` (WIN-054 — builtin `omx_*` + MCP `<server>:<tool>` 일원화)
권한 모델 SSOT: `desktop/main/permissions/permission-broker.ts` (WIN-053 — 모든 도구 호출의 단일 게이트)
이력 SSOT: Phase 5 SQLite `tool_calls` 테이블 (WIN-042 신설, WIN-054 에서 확장 사용)
IPC 명령 화이트리스트(누적): Phase 3 15종 + WIN-052 (2) + WIN-053 (2) + WIN-054 (3) = **22종**
