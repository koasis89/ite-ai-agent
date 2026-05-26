$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9   # EP-02 (id=9)
$sprintId=15 # SP-06 (id=15)
$userId=$auth.id

# 1) US-55 user story.
$usBody = @{
  project=$projectId
  subject='WIN-055 Phase 6 마감 통합 (bootstrap 결선 + UI 마운트 + 매뉴얼 §7)'
  description='WIN-051~WIN-054 후속검증에서 식별된 5건 미진(broker catalog 게이트, mcpSource registry 와이어링, broker.onChange→eventBus, ToolRouter bootstrap, ToolHistoryPanel 마운트) 을 단일 P0 마감 티켓으로 일괄 해소한다. 메인 프로세스의 bootstrapToolStack() 신설로 Phase 4 SQLite / Phase 5 MCP / Phase 6 카탈로그·권한·이력 6개 컴포넌트를 결선하고, ToolHistoryPanel 을 renderer 에 마운트하며 매뉴얼 §7 4절(MCP 등록 / 카탈로그 UI / 권한 UX / 호출 이력 패널) 을 신설한다. SQLite 미초기화 환경에서는 silent fallback. 회귀: permission-broker-catalog-gate.test.ts +4 subtest 통과 (175/131/0/44).'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-55 id=$($us.id) ref=$($us.ref)"

# 2) Epic link.
try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 3) Tasks.
$taskIds=@()
foreach($tn in @('구현 작업','검증 작업','문서/정합성 반영')){
  $tBody = @{
    project=$projectId
    subject="[WIN-055] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-055] $tn"
}

$desc1 = @"
[WIN-055] 구현 작업

[작업내용]
- desktop/main/permissions/permission-broker.ts (수정) — PermissionBrokerOptions.catalog?: { isEnabled(toolId: string): boolean } 옵션 추가. constructor 에서 this.catalog 저장. check() 메서드 step 0: catalog && !catalog.isEnabled(input.toolId) 면 store/env/prompt 진입 없이 즉시 onChange({kind:'denied', toolId, scope:'once'}) 통지 후 {decision:'deny', source:'override-deny'} 반환. 기존 env override / store / prompt 우선순위 보존.
- desktop/ipc/events.ts (수정) — OmxEventType union 에 'tool.permission.changed' 추가 (16번째). export interface ToolPermissionChangedDetail = { kind: 'granted'|'denied'; toolId: string; scope: 'permanent'|'session'|'once' }.
- desktop/ipc/commands.ts (수정) — omxCliMatrix / isOmxExecAllowed / runOmxSubcommand export. 신규 interface ToolRouterCallHooks { onChunk?(stream:'stdout'|'stderr'|'pane'|'info', chunk:string, truncated:boolean): void }. ToolRouterBackend.call(input, hooks?) / replay(historyId, overrides?, hooks?) 시그니처 확장. tool_call switch case: messageId 가 있을 때 hooks 합성 → bumpEvent('command.progress') + eventBus.publish(EventBus.event<CommandProgressDetail>('command.progress', {stream, chunk, messageId, truncated}, commandId)). tool_history_replay 도 동일 패턴 (replayMsgId/replayHooks).
- desktop/main/index.ts (수정) — bootstrapToolStack() 함수 신설 (app.whenReady 직전, bootstrapLegacyState 다음). SQLite 미초기화 시 3 backend null 로 set 후 silent return. ToolEnabledStore({filePath: userData/mcp-tools.json}) load → ToolCatalogStore({enabledRepo, mcpSource: () => mcpServerRegistry?.list() flat or []}) → setToolCatalogBackend → PermissionStore(db) + PermissionBroker({store, catalog:{isEnabled}, omxAllowExecOverride, prompt: deny-once 폴백, onChange: eventBus.publish ToolPermissionChangedDetail}) → setPermissionBackend → ToolCallHistoryRepo(db) + ToolRouter({catalog, broker, repo, executors:{omx: runOmxSubcommand 스트리밍, mcp: mcpServerRegistry.callTool(server, name, JSON.parse(args[0]) kwargs)}}) → setToolRouterBackend (hooks.onChunk 매핑: stdout/stderr→그대로, 외→info). mcpServerRegistry=null (Phase 7 확장 여지). 모듈 레벨 let + getter export 추가.
- desktop/renderer/index.html (수정) — <article class='panel' id='tool-history-host' data-win='WIN-054'><h2>도구 호출 이력</h2><div id='tool-history-mount'></div></article> sidecar 패널 다음에 추가.
- desktop/renderer/app.ts (수정) — ToolHistoryPanel import. 세션 리스트 초기화 직후 #tool-history-mount 에 new ToolHistoryPanel({host, onToast:addTimeline, ipc:{runCommand: window.omx.runCommand 어댑터 (readonly args → [...req.args] 스프레드)}}) 마운트 후 void panel.refresh().
- desktop/__tests__/permission-broker-catalog-gate.test.ts (신규) — broker catalog 게이트 회귀 4 테스트: 비활성 즉시 deny + prompt 미호출 / 활성 prompt 정상 / catalog 미주입 폴백 / catalog vs omxAllowExecOverride 우선순위.
- package.json (수정) — test:phase2:common:compiled 에 permission-broker-catalog-gate.test.js 추가.
- winapp만들기/stage2/winapp-manual-v2.md (수정) — §7 도구 호출/MCP 신설 (§7.1 MCP 서버 등록 절차 / §7.2 도구 카탈로그 UI / §7.3 권한 동의 UX 우선순위 6단계 + tool.permission.changed 이벤트 / §7.4 호출 이력 패널 + tool_history_replay + command.progress 스트리밍). 기존 §7 참고 → §8 로 번호 이동.
- winapp만들기/stage2/change-winapp-phase6-tickets.md (수정) — WIN-055 P0 섹션 신설 (DoD + 7 항목 체크리스트). WIN-055 체크리스트 8/8 [x] + WIN-051~W054 매뉴얼 §7.x 4 항목 [x] 일괄 갱신.
- winapp만들기/stage2/result/후속검증-W051-W054.md (신규) — W051~W054 5건 미진 매트릭스 + WIN-055 일괄 마감 결정.

[변경소스파일]
- 신규: desktop/__tests__/permission-broker-catalog-gate.test.ts
- 신규: winapp만들기/stage2/result/후속검증-W051-W054.md
- 신규: winapp만들기/stage2/result/작업내역-W055.md
- 신규: winapp만들기/stage2/scripts/register-w055.ps1
- 수정: desktop/main/permissions/permission-broker.ts
- 수정: desktop/ipc/events.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/main/index.ts
- 수정: desktop/renderer/index.html
- 수정: desktop/renderer/app.ts
- 수정: package.json
- 수정: winapp만들기/stage2/winapp-manual-v2.md
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md
"@

$desc2 = @"
[WIN-055] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 정상 (renderer 3 asset + migrations 4종 dist 복사 확인).
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[신규 회귀 — permission-broker-catalog-gate.test.ts 4 subtest]
1. 비활성 도구는 store/prompt 진입 전 즉시 deny: catalog.isEnabled=()=>false → broker.check 결과 {decision:'deny', source:'override-deny'} + prompt 콜백 0회 + onChange [{kind:'denied', toolId, scope:'once'}].
2. 활성 도구 기존 prompt 경로 정상: catalog.isEnabled=()=>true + prompt → once/allow → decision='allow' + source='once' + prompt 1회.
3. catalog 미주입 → 게이트 비활성화 (기존 동작 유지) — prompt 정상 호출.
4. catalog 비활성 + omxAllowExecOverride=true (env 허용) → 그래도 deny: override-deny (catalog 우선순위 검증).

[전체 회귀]
- 175 tests / 131 pass / 0 fail / 0 cancelled / 44 skipped
- 직전 베이스라인(WIN-054 종료) 171/127/0/44 → +4 tests / +4 pass / +0 skipped (모두 인메모리 store mock 사용으로 better-sqlite3 binding 무관)
- 단독 확인: node --test dist-desktop/desktop/__tests__/permission-broker-catalog-gate.test.js → 4 PASS

[결선 정합성 검증]
- bootstrapToolStack 흐름이 SQLite 부재 시 silent fallback (3 backend 모두 null) — Phase 4 이전 호환.
- ToolRouter.executors.omx 는 omxCliMatrix → runOmxSubcommand 스트리밍 (Phase 3 streaming bridge 와 동일 경로 재사용).
- ToolRouter.executors.mcp 는 mcpServerRegistry=null 일 때 throw → catch → status='failed' (Phase 7 mcp.servers 스키마 도입 시 자동 활성).
- broker.onChange → eventBus 결선이 ToolPermissionChangedDetail 타입 강제 (compile-time 검증).
- tool_call/tool_history_replay 의 messageId 가 있을 때만 hooks 합성 → 비-스트리밍 호출은 hooks=undefined 로 short-circuit.
- renderer ToolHistoryPanel 마운트 시 readonly string[] → 스프레드 [...req.args] 어댑팅으로 window.omx.runCommand 시그니처 충돌 해소.

[DoD 충족]
- WIN-052#2 broker catalog 게이트 ✓ (회귀 4건 통과)
- WIN-052#4 mcpSource registry 와이어링 ✓ (bootstrap 내 null-safe 함수)
- WIN-053#3 broker.onChange → eventBus ✓ (tool.permission.changed 이벤트)
- WIN-054#2 ToolRouter bootstrap ✓ (setToolRouterBackend 결선)
- WIN-054#4 ToolHistoryPanel 마운트 ✓ (index.html + app.ts)
- 매뉴얼 §7.1~§7.4 4절 추가 ✓ (winapp-manual-v2.md)
- 회귀 무영향: 기존 testfile 모두 통과 (171 baseline → 175 with new 4).
"@

$desc3 = @"
[WIN-055] 문서/정합성 반영

[반영 내역]
- 후속검증 매트릭스 신규 문서화: winapp만들기/stage2/result/후속검증-W051-W054.md — W051(매뉴얼만) / W052(broker 게이트 + bootstrap 결선 2건) / W053(eventBus 결선) / W054(ToolRouter bootstrap + Panel 마운트 2건) 총 5건 미진 식별 + WIN-055 일괄 마감 결정.
- 티켓 SSOT 갱신: winapp만들기/stage2/change-winapp-phase6-tickets.md — WIN-055 P0 섹션 신설 (목표 / DoD 5개 / 체크리스트 8 항목) + 체크리스트 8/8 [x] 마감 + WIN-051~W054 의 매뉴얼 §7.x 4 항목 [x] 일괄 갱신 (Phase 6 마감 정책 승계).
- 매뉴얼 §7 신설: winapp만들기/stage2/winapp-manual-v2.md — §7.1 MCP 서버 등록 (config 키 + start 흐름 + status='ready'|'error') / §7.2 카탈로그 UI (위치 + 토글 동작 + ToolEnabledStore 영속 + tool.catalog.changed 이벤트) / §7.3 권한 동의 UX (결정 우선순위 6단계 + tool.permission.changed payload + Phase 7 다이얼로그 보류 주석) / §7.4 호출 이력 패널 (#tool-history-mount data-win + tool_history_list IPC + tool_history_replay + command.progress 스트리밍). 기존 §7 참고 → §8 번호 이동.
- 작업내역 본 문서: winapp만들기/stage2/result/작업내역-W055.md — 7 섹션(식별/목표/변경 내역/핵심 API·정책/검증/후속/Taiga 반영) W054 포맷 미러.
- 등록 스크립트: winapp만들기/stage2/scripts/register-w055.ps1 — US-55 POST + Epic 9 link + 3 tasks POST + 3 tasks description PATCH (BOM-free, Invoke-WebRequest, 3× HTTP 200 기대, version 1→2 확인). W044 패턴 미러.

[반영된 파일]
- 신규: winapp만들기/stage2/result/후속검증-W051-W054.md
- 신규: winapp만들기/stage2/result/작업내역-W055.md
- 신규: winapp만들기/stage2/scripts/register-w055.ps1
- 신규: desktop/__tests__/permission-broker-catalog-gate.test.ts
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-055 신설 + 8/8 [x] + 매뉴얼 §7.x 4 항목 [x])
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§7 신설, 4 subsection, 기존 §7→§8)
- 수정: desktop/main/permissions/permission-broker.ts
- 수정: desktop/ipc/events.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/main/index.ts
- 수정: desktop/renderer/index.html
- 수정: desktop/renderer/app.ts
- 수정: package.json
"@

$payloads = @{
  ($taskIds[0]) = $desc1
  ($taskIds[1]) = $desc2
  ($taskIds[2]) = $desc3
}

foreach($id in $taskIds){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id current version=$($t.version) (descLen before=$($t.description.Length))"
  $payload = @{ description = $payloads[$id]; version = $t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in $taskIds){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id new version=$($t.version) descLen=$($t.description.Length)"
}
