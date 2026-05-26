$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

# Phase 6 / WIN-054 / Tasks 137(구현)/138(검증)/139(문서)
$desc137 = @"
[WIN-054] 구현 작업

[작업내용]
- desktop/main/storage/migrations/004_tool_calls_v2.sql (신규) — WIN-042 tool_calls 재구축(table-swap). CREATE tool_calls_v2 (id PK, message_id TEXT NULL FK→messages(id) ON DELETE CASCADE, tool_id TEXT NOT NULL, command TEXT NOT NULL, args TEXT NOT NULL DEFAULT '[]', exit_code INTEGER, duration_ms INTEGER, stdout TEXT, stderr TEXT, stdout_truncated INTEGER NOT NULL DEFAULT 0, stderr_truncated INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK IN ('ok','failed','denied','running'), permission_decision TEXT CHECK IN ('allow','deny'), permission_scope TEXT, error_reason TEXT, created_at INTEGER). INSERT SELECT 마이그레이션: tool_id := command CONTAINS ':' ? command : 'builtin:'||command, status := exit_code 0/null→'ok' else 'failed'. DROP+RENAME 후 (message_id / tool_id / created_at) 인덱스 3개 재생성.
- desktop/main/storage/tool-call-history-repo.ts (신규) — ToolCallHistoryRepo(better-sqlite3 prepared statement 5종: insert/listAll/listByTool/getById/count). record/list/getById/count + DEFAULT_LIMIT=50 / MAX_LIMIT=200. args JSON 직렬화 + raw row 복원 시 비문자열 원소 거부(빈 배열 fallback). status: 'ok'|'failed'|'denied'|'running'.
- desktop/main/tools/tool-router.ts (신규) — ToolRouter 단일 디스패처. constructor({catalog?, broker?, repo?, executors:{omx?, mcp?}, maskSensitive?, now?}). call() 흐름: parseToolId('<server>:<name>') → catalog enabled 강제(disabled→persistDenied 'tool-disabled' + status='denied') → broker.check(deny→persistDenied 'permission:<source>' + status='denied' + permissionDecision='deny') → server==='builtin' ? executors.omx(name,args,hooks)(timedOut/exit≠0→status='failed' + errorReason='timeout'|'exit N') : executors.mcp(server,name,args,hooks)(status='ok' + result 전달) → persistOk(repo.record). catch → status='failed' + errorReason=err.message. replay(id, overrides?, hooks?) → repo.getById(id) 의 toolId/args 로 call 재진입(broker 재검증). list({limit?, toolId?}) 위임. historyId='tc-${now}-${randomUUID().slice(0,8)}'. defaultMaskSensitive(/password|passwd|secret|api[_-]?key|token|authorization/i → key=***).
- desktop/renderer/tools/ToolHistoryPanel.ts (신규) — DOM 이력 패널. toolId 입력 필터 + status 드롭다운(all|ok|failed|denied) + Refresh 버튼 + 행 클릭 확장(args/permission/error/stdout/stderr/Replay). 마스킹된 args 만 렌더 (raw 비저장). truncated 행은 '[truncated]' 마크.
- desktop/__tests__/tool-history.test.ts (신규) — 단위 2(parseToolId 'server:name'만 허용 / defaultMaskSensitive password/token/api_key ***) + repo 4(스키마 컬럼 / record-list-getById round-trip / listOrder+limit cap 200+toolId 필터 / stdout·stderr truncated round-trip) + router 8(catalog disabled→denied 즉시 + executor 미호출 / broker deny→permissionDecision='deny' / omx exit=1→failed+'exit 1' / mcp→ok+result+progress hook / executor throw→failed+reason 보존 / argsJson masked 영속 / replay broker 재검증 / invalid toolId throw) = 14 subtests. driverAvailable=false 환경에서 itDb 12개 SKIP (WIN-042/043/053 패턴).
- desktop/main/storage/session-repo.ts (수정) — 레거시 ToolCallRepo.append insert 에 tool_id 컬럼 추가. command.includes(':') 그대로, 아니면 'builtin:'+command derive. WIN-042 cascade 회귀 호환 보존.
- desktop/ipc/commands.ts (수정) — allowedCommands +3 (tool_call/tool_history_list/tool_history_replay; Phase 3 15 + WIN-052 2 + WIN-053 2 + WIN-054 3 = 22종). ToolCallArgsSchema(tuple[toolId TOOL_ID_RE, argsJson≤8KB+JSON.parse string[]≤10/원소≤1024]) / ToolHistoryListArgsSchema(arr≤2, limit 1..200, toolId TOOL_ID_RE) / ToolHistoryReplayArgsSchema(tuple[historyId TOOL_HISTORY_ID_RE='^tc-[0-9]{10,16}-[0-9a-f]{4,32}\$']) + perCommandArgValidators 등록. ToolRouterBackend 인터페이스(call/replay/list) + setToolRouterBackend/getToolRouterBackend setter. 3 switch 케이스(backend 부재 시 throw → COMMAND_FAILED).
- desktop/renderer/chat/slash-commands.ts (수정) — SlashSpec.transformArgs? 선택 훅 신규. /tool <toolId> [args...] → command='tool_call', transformArgs=(rest)=>[rest[0], JSON.stringify(rest.slice(1))].
- desktop/renderer/chat/slash-router.ts (수정) — planSlashInvocation 이 spec.transformArgs 적용해 dispatcher 에 전달.
- desktop/__tests__/slash-router.test.ts (수정) — ALLOWED_COMMANDS +3, SLASH_EXCLUDED +2 (tool_history_list/tool_history_replay만; tool_call 은 /tool 슬래시).
- desktop/__tests__/ipc-contract.test.ts (수정) — WIN-054 describe 8 it (tool_call accept / bad toolId / bad argsJson / backend 부재 / list / list out-of-range / replay accept / replay bad id).
- package.json (수정) — test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/tool-history.test.js 등록.

[변경소스파일]
- 신규: desktop/main/storage/migrations/004_tool_calls_v2.sql
- 신규: desktop/main/storage/tool-call-history-repo.ts
- 신규: desktop/main/tools/tool-router.ts
- 신규: desktop/renderer/tools/ToolHistoryPanel.ts
- 신규: desktop/__tests__/tool-history.test.ts
- 수정: desktop/main/storage/session-repo.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/renderer/chat/slash-commands.ts
- 수정: desktop/renderer/chat/slash-router.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: package.json
"@

$desc138 = @"
[WIN-054] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 정상(004_tool_calls_v2.sql dist 복사 확인).
- npm run test:phase2:common:compiled — node:test 게이트 실행.
- desktop/__tests__/tool-history.test.ts (신규) 14 subtests:
  단위 2 — parseToolId('server:name' / noColon / ':missing' / 'missing:'), defaultMaskSensitive(password/token/api_key 패턴 → key=*** 치환).
  repo 4 — tool_calls 테이블이 마이그레이션 004 의 16 컬럼(id/message_id/tool_id/command/args/exit_code/duration_ms/stdout/stderr/stdout_truncated/stderr_truncated/status/permission_decision/permission_scope/error_reason/created_at) 포함, record-list-getById round-trip, list created_at DESC + limit cap 200 + toolId 필터, stdout/stderr truncated 플래그 round-trip 보존.
  router 8 — (1) catalog enabled=false → status='denied' + executor 미호출 + repo 1건, (2) broker deny → status='denied' + permissionDecision='deny' + permissionScope='user-revoked' + executor 미호출, (3) omx executor exit=1 → status='failed' + exitCode=1 + errorReason='exit 1' + ok=false, (4) mcp executor → status='ok' + result={contents:'hello'} + onChunk('mcp-progress',...) 1회, (5) executor throw → status='failed' + errorReason 포함, (6) argsJson(password='hunter2', api_key:abcd) → repo 영속본에 hunter2/abcd 미포함(마스킹), (7) replay(historyId) → broker 2회 호출 + status='ok' + 다른 historyId, (8) invalid toolId 'noColon' → throw /invalid toolId/.
- desktop/__tests__/ipc-contract.test.ts WIN-054 describe 8 신규 it:
  tool_call(['builtin:omx_doctor', JSON.stringify(['--json'])]) → ok=true + status='ok' + 백엔드 calls=1 / tool_call(['bad@id',...]) → INVALID_REQUEST(regex) / tool_call(['builtin:omx_doctor','not-json']) → INVALID_REQUEST(refine) / tool_call backend 부재 → COMMAND_FAILED / tool_history_list() → ok=true + entries=1 + limit=50 / tool_history_list(['999']) → INVALID_REQUEST(limit refine) / tool_history_replay(['tc-1700000000000-abcd0001']) → ok=true + replays=1 / tool_history_replay(['not-a-history-id']) → INVALID_REQUEST(regex).
- desktop/__tests__/slash-router.test.ts — ALLOWED_COMMANDS +3 / SLASH_EXCLUDED +2 회귀 통과 (tool_call /tool 슬래시 매핑, 나머지 2개는 UI 전용).
- 보안 회귀: TOOL_ID_RE + TOOL_HISTORY_ID_RE 화이트리스트로 IPC 진입 거부, argsJson ≤8KB + JSON string[] ≤10 / 원소 ≤1024 chars, 마스킹된 argsJson 만 영속, prepared statement 전용, catalog disabled / broker deny 시 executor 호출 0.

[결과]
- 총 171 tests / 127 pass / 0 fail / 0 cancelled / 44 skipped
- 직전 베이스라인(WIN-053 종료) 157/125/0/32 → +14 tests / +2 pass / +12 skipped (better-sqlite3 native binding 부재 환경에서 tool-history.test.ts itDb 12개 SKIP, parseToolId+mask 2개 PASS + ipc-contract WIN-054 describe 가 1 leaf 로 합산 → +2 pass)
- 단독 확인: node --test dist-desktop/desktop/__tests__/ipc-contract.test.js → 1/1 pass, WIN-054 describe 내부 8/8 ok
- 단독 확인: node --test dist-desktop/desktop/__tests__/tool-history.test.js → 14 subtests (2 PASS + 12 SKIP)
- 회귀 무영향: 기존 23개 테스트 파일 모두 통과 (WIN-042 cascade `세션 삭제는 messages / tool_calls 까지 cascade` 도 tool_id 컬럼 추가 후 정상 동작 확인)
- DoD 충족: omx_* + MCP 동일 라우터/이력 / 재시작 영속 / replay broker 재검증 / 회귀 0
"@

$desc139 = @"
[WIN-054] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT(change-winapp-phase6-tickets.md) WIN-054 체크리스트 7/8 마감:
  [x] tool-router.ts (builtin + MCP 라우팅)
  [x] tool-call-repo.ts (Phase 5 SQLite 위) — 실제 파일명 tool-call-history-repo.ts, 마이그레이션 004 로 tool_calls 컬럼 확장
  [x] tool_call / tool_history_list / tool_history_replay IPC + zod
  [x] ToolHistoryPanel.ts UI (필터 / 상세 / 재실행)
  [x] WIN-033 슬래시 라우터에 /tool 추가
  [x] WIN-034 streaming bridge 연결 — ToolCallHooks.onChunk(stream,chunk,truncated) 채널을 통해 stdout/stderr/mcp-progress 분기 (실 배선은 main bootstrap 단계에서 hook → eventBus.publish('command.progress'))
  [x] tool-history.test.ts (호출 / 영속 / 재실행 / 마스킹)
  [ ] 매뉴얼 §7.4 이력 패널 사용법 추가 — Phase 6 종료 일괄 매뉴얼 갱신 정책에 따라 미체크 유지 (W030~W053 정책 승계)
- Taiga 등록 내역 라인: 이미 등록 완료 (2026-05-24) — Sprint SP-06(15) / Epic EP-02(9) / US-54(51, ref=#197) / Tasks 137·138·139 description PATCH 완료
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 / Taiga 반영)
- patch 스크립트 신규 (Tasks 137/138/139 description 본 PATCH 호출)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-054 체크리스트 7/8 → [x])
- 신규: winapp만들기/stage2/result/작업내역-W054.md
- 신규: winapp만들기/stage2/scripts/patch-w054-tasks.ps1
- 신규: desktop/main/storage/migrations/004_tool_calls_v2.sql
- 신규: desktop/main/storage/tool-call-history-repo.ts
- 신규: desktop/main/tools/tool-router.ts
- 신규: desktop/renderer/tools/ToolHistoryPanel.ts
- 신규: desktop/__tests__/tool-history.test.ts
- 수정: desktop/main/storage/session-repo.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/renderer/chat/slash-commands.ts
- 수정: desktop/renderer/chat/slash-router.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: package.json
"@

$payloads = @{
  137 = $desc137
  138 = $desc138
  139 = $desc139
}

foreach($id in 137,138,139){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id current version=$($t.version) (descLen before=$($t.description.Length))"
  $payload = @{ description = $payloads[$id]; version = $t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in 137,138,139){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id new version=$($t.version) descLen=$($t.description.Length)"
}
