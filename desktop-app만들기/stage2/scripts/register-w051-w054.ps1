$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$userId = $auth.id
$projectId = 1
$epicId = 9   # EP-02 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4~8) — 재사용
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# --- 1) Sprint SP-06 생성 ---
$today = Get-Date -Format 'yyyy-MM-dd'
$end   = (Get-Date).AddDays(14).ToString('yyyy-MM-dd')
$spBody = @{
  project = $projectId
  name = 'SP-06 윈도우 데스크탑 앱(6단계, 도구 호출 + MCP)'
  estimated_start = $today
  estimated_finish = $end
} | ConvertTo-Json
$spBytes = [System.Text.Encoding]::UTF8.GetBytes($spBody)
$spResp = Invoke-WebRequest -Uri "$base/milestones" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $spBytes -UseBasicParsing
$sprint = $spResp.Content | ConvertFrom-Json
$sprintId = $sprint.id
Write-Host "SPRINT created id=$sprintId name=$($sprint.name)"

# --- 2) WIN-051..054 등록 ---
$tickets = @(
  @{
    id='WIN-051'
    subject='WIN-051 MCP 클라이언트 (stdio transport, 서버 매니페스트 로드)'
    usDesc='MCP(Model Context Protocol) 표준(JSON-RPC 2.0 over stdio) 서버를 spawn 해 도구 카탈로그(tools/list)와 호출(tools/call) 능력을 확보한다. LocalProcessTransport 보안 가드 100% 승계. P0 · Phase 6 1번째.'
    impl=@"
[WIN-051] 구현 작업

[작업내용]
- src/mcp/client.ts (신규): McpClient 클래스 — initialize/tools/list/tools/call/ping/notifications/cancelled
- src/mcp/transport-stdio.ts (신규): JSON-RPC 2.0 Content-Length 프레이밍, chunk split / 멀티 메시지 대응
- src/mcp/schema.ts (신규): zod — Tool / ServerManifest / JsonRpcRequest / JsonRpcResponse
- desktop/main/mcp/registry.ts (신규): config.json.mcp.servers[] spawn 관리, exponential backoff 재시작(최대 3회) 후 disabled
- 서버 spawn 은 LocalProcessTransport 경유 — allowedCommands/allowedCwdRoots/envAllowList/30s 워치독 승계
- JSON-RPC 페이로드 1MB 상한, zod 검증 실패 시 호출 거부
- 헬스 메트릭 EventBus 채널(mcp.server.health) 발행, tools/call 응답 streaming 은 Phase 4 WIN-034 채널 재사용

[변경소스파일]
- 신규: src/mcp/client.ts
- 신규: src/mcp/transport-stdio.ts
- 신규: src/mcp/schema.ts
- 신규: desktop/main/mcp/registry.ts
- 신규: src/mcp/__tests__/client.test.ts
"@
    verif=@"
[WIN-051] 검증 작업

[검증 내역]
- JSON-RPC 프레이밍 단위 테스트 (chunk split / 멀티 메시지 / 1MB 초과 거부)
- 샘플 MCP 서버(@modelcontextprotocol/server-filesystem) spawn → tools/list 응답 수신 → tools/call 1회 정상 동작
- 비정상 종료 시 exponential backoff 재시작(최대 3회 후 disabled) 동작
- LocalProcessTransport 보안 가드(allowedCommands/cwd/env/30s/8KB) 승계 확인
- 회귀: npm run test:phase2:windows:compiled 무영향

[결과]
- (착수 후 기록) — 신규 client.test.ts 통과 / 기존 phase2:windows 무영향
"@
    docs=@"
[WIN-051] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §7.1 'MCP 서버 등록 절차' 신설 — config.json.mcp.servers[] 스키마 + 보안 정책
- 티켓 SSOT 체크리스트 마감 + Taiga 라인 갱신
- 작업 결과 문서 신규 작성 (winapp만들기/stage2/result/작업내역-W051.md)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-051 블록)
- 신규: winapp만들기/stage2/result/작업내역-W051.md
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§7.1 신설)
- 수정: package.json (mcp-client.test.js 테스트 등록)
"@
  },
  @{
    id='WIN-052'
    subject='WIN-052 도구 카탈로그 UI + 활성/비활성 토글'
    usDesc='등록된 MCP 서버 + omx_* 내장 도구를 1곳에 카탈로그로 표시, 도구별 활성/비활성 토글 + 검색. Phase 5 config 영속. P0 · Phase 6 2번째.'
    impl=@"
[WIN-052] 구현 작업

[작업내용]
- desktop/renderer/tools/ToolCatalog.ts (신규): 서버 그룹별 expand/collapse + 검색 박스(이름/설명 부분 일치)
- desktop/renderer/tools/ToolCard.ts (신규): 이름/설명/스키마 요약(인자 이름·타입·필수)/Last used 표시, 클릭 시 채팅 InputBox 에 /tool <id> 프리필
- desktop/renderer/tools/tool-catalog-store.ts (신규): MCP tools/list 결과 + 내장 omx_* 3종 합본, <serverId>:<toolName> / builtin:<name> 네임스페이스
- desktop/ipc/commands.ts (수정): tool_list / tool_toggle 명령 화이트리스트 추가 — zod enum (등록 도구 ID)
- 비활성 도구는 /tool 슬래시 명령에서도 main 측이 거부
- 활성/비활성 상태는 Phase 5 ConfigStore.set('mcp.tools', ...) 에 영속

[변경소스파일]
- 신규: desktop/renderer/tools/ToolCatalog.ts
- 신규: desktop/renderer/tools/ToolCard.ts
- 신규: desktop/renderer/tools/tool-catalog-store.ts
- 수정: desktop/ipc/commands.ts (tool_list / tool_toggle)
- 신규: desktop/__tests__/tool-catalog.test.ts
"@
    verif=@"
[WIN-052] 검증 작업

[검증 내역]
- 등록 MCP 서버 도구 + omx_* 3종이 카탈로그에 표시
- tool_toggle 즉시 반영 + 재시작 후 유지 (ConfigStore 영속)
- 비활성 도구 호출 거부 (main 측 검증)
- ipc-contract.test.ts 에 tool_list / tool_toggle accept/reject 케이스 추가
- 회귀: npm run test:phase2:windows:compiled 무영향

[결과]
- (착수 후 기록) — tool-catalog.test.ts 신규 통과, ipc-contract 회귀 무영향
"@
    docs=@"
[WIN-052] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §7.2 '도구 카탈로그 UI 사용법' 추가 — 검색 / 토글 / 프리필 흐름
- 티켓 SSOT 체크리스트 마감 + Taiga 라인 갱신
- 작업 결과 문서 신규 작성 (winapp만들기/stage2/result/작업내역-W052.md)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-052 블록)
- 신규: winapp만들기/stage2/result/작업내역-W052.md
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§7.2 신설)
- 수정: package.json (tool-catalog.test.js 등록)
"@
  },
  @{
    id='WIN-053'
    subject='WIN-053 도구 호출 권한 다이얼로그 (1회/세션/영구 3단계)'
    usDesc='도구 호출 시 명시적 동의 다이얼로그 + 사용자 선택(1회/세션/영구 허용 또는 거부) 을 권한 저장소에 기록. 모든 도구 호출은 permissionBroker 단일 게이트 통과. P0 · Phase 6 3번째.'
    impl=@"
[WIN-053] 구현 작업

[작업내용]
- migrations/003_tool_permissions.sql (신규): tool_permissions(tool_id TEXT, session_id TEXT, decision TEXT, granted_at INTEGER, expires_at INTEGER)
- desktop/main/permissions/permission-store.ts (신규): Phase 5 SQLite + config 양쪽 사용. 키 (toolId, sessionId?) — 세션/영구 분리
- desktop/main/permissions/permission-broker.ts (신규): check/grant/revoke. 우선순위 — 영구 deny > 영구 allow > 세션 deny > 세션 allow > 미설정(다이얼로그)
- desktop/renderer/permissions/PermissionDialog.ts (신규): Question 모달 확장. 도구 ID / 서버 / 설명 / 인자 요약(민감 키 마스킹) + 4버튼(이번 1회 / 이 세션 / 영구 / 거부)
- desktop/ipc/commands.ts (수정): tool_permission_list / tool_permission_revoke 화이트리스트
- omx_* 3종도 broker 통과 — WIN-023 의 OMX_DESKTOP_ALLOW_EXEC=false 는 broker '거부' 단축으로 흡수
- 다이얼로그 인자 요약에서 비밀번호/토큰 패턴 마스킹 (WIN-043 패턴 재사용)
- 영구 deny 도구는 카탈로그에서도 visual 비활성

[변경소스파일]
- 신규: desktop/main/storage/migrations/003_tool_permissions.sql
- 신규: desktop/main/permissions/permission-store.ts
- 신규: desktop/main/permissions/permission-broker.ts
- 신규: desktop/renderer/permissions/PermissionDialog.ts
- 수정: desktop/ipc/commands.ts (tool_permission_list / tool_permission_revoke)
- 신규: desktop/__tests__/permission-store.test.ts
"@
    verif=@"
[WIN-053] 검증 작업

[검증 내역]
- 신규 도구 첫 호출 시 다이얼로그 표시 + 4선택지 동작
- '영구 허용' 선택 후 재시작에도 유지 (SQLite 영속)
- '세션 허용' 은 세션 종료 시 자동 만료
- 모든 도구 호출이 broker 를 통과함을 자동 테스트로 증명 (broker 우회 차단)
- 영구 deny 의 카탈로그 visual 비활성 검증
- 회귀: npm run test:phase2:windows:compiled 무영향

[결과]
- (착수 후 기록) — permission-store.test.ts 신규 통과 / broker 우회 차단 강제
"@
    docs=@"
[WIN-053] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §7.3 '권한 동의 UX' 추가 — 4단계 선택지 + 우선순위 표 + 마스킹 정책
- WIN-023 OMX_DESKTOP_ALLOW_EXEC 호환 처리 명시
- 티켓 SSOT 체크리스트 마감 + Taiga 라인 갱신
- 작업 결과 문서 신규 작성 (winapp만들기/stage2/result/작업내역-W053.md)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-053 블록)
- 신규: winapp만들기/stage2/result/작업내역-W053.md
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§7.3 신설)
- 수정: package.json (permission-store.test.js 등록)
"@
  },
  @{
    id='WIN-054'
    subject='WIN-054 도구 호출 이력 패널 (command.* 이벤트 일반화 + SQLite 영속)'
    usDesc='Phase 3 command.started/completed/failed 이벤트 페어를 도구 호출 로그로 일반화. Phase 5 SQLite tool_calls 영속 → 이력 패널 검색/재실행. omx_* + MCP 도구 일원화 라우터. P1 · Phase 6 4번째.'
    impl=@"
[WIN-054] 구현 작업

[작업내용]
- desktop/main/tools/tool-router.ts (신규): toolId 접두사 라우팅 — builtin:omx_doctor 등은 omxCliMatrix(WIN-023) 재사용, <serverId>:<toolName> 은 McpClient.callTool. 결과 정규화 {ok, exitCode?, stdout?, stderr?, result?, durationMs, truncated}
- desktop/main/storage/tool-call-repo.ts (신규): Phase 5 tool_calls 테이블 위 영속, permissionDecision(allow/deny + 1회/세션/영구) 기록
- desktop/renderer/tools/ToolHistoryPanel.ts (신규): 시간 역순, 필터(toolId/exit), 상세, 재실행 버튼
- desktop/ipc/commands.ts (수정): tool_call / tool_history_list / tool_history_replay 화이트리스트
- WIN-033 슬래시 라우터에 /tool <id> <args...> 매핑 추가
- WIN-034 streaming bridge 에 tool_call chunk 흐름 연결 (channel='stdout'|'stderr'|'mcp-progress')
- argsJson / stdout / stderr 비밀번호·토큰 마스킹(WIN-043/053 재사용), stdout·stderr 8KB 상한 + truncated 플래그
- tool_history_replay 도 broker 통과 (영구 허용 도구만 묵시적 진행)

[변경소스파일]
- 신규: desktop/main/tools/tool-router.ts
- 신규: desktop/main/storage/tool-call-repo.ts
- 신규: desktop/renderer/tools/ToolHistoryPanel.ts
- 수정: desktop/ipc/commands.ts (tool_call / tool_history_list / tool_history_replay)
- 수정: desktop/renderer/chat/slash-router.ts (/tool 매핑)
- 수정: desktop/renderer/streaming/bridge.ts (mcp-progress 채널)
- 신규: desktop/__tests__/tool-history.test.ts
"@
    verif=@"
[WIN-054] 검증 작업

[검증 내역]
- omx_* 3종 + 등록 MCP 도구가 동일 라우터/이력으로 호출
- 재시작 후 이력 패널에 직전 호출 보존 (tool_calls 영속)
- tool_history_replay 가 permission broker 를 거쳐 정상 재실행
- argsJson / stdout / stderr 마스킹 + 8KB truncated 회귀
- ipc-contract.test.ts + tool-history.test.ts 통과
- 회귀: npm run test:phase2:windows:compiled 무영향

[결과]
- (착수 후 기록) — tool-history.test.ts 신규 통과 / omx_* 분기 제거 후에도 회귀 없음
"@
    docs=@"
[WIN-054] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §7.4 '도구 호출 이력 패널' 추가 — 필터 / 상세 / 재실행 / 마스킹
- Phase 3 IPC 분기 제거 — omx_* 가 tool_router 위로 일원화됨을 명시
- 티켓 SSOT 체크리스트 마감 + Taiga 라인 갱신
- 작업 결과 문서 신규 작성 (winapp만들기/stage2/result/작업내역-W054.md)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-054 블록)
- 신규: winapp만들기/stage2/result/작업내역-W054.md
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§7.4 신설)
- 수정: package.json (tool-history.test.js 등록)
"@
  }
)

$summary = @()
foreach($t in $tickets){
  # User Story
  $usBody = @{
    project=$projectId
    subject=$t.subject
    description=$t.usDesc
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
  $usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
  $us = $usResp.Content | ConvertFrom-Json
  Write-Host "$($t.id) US id=$($us.id) ref=$($us.ref)"

  # Epic link
  try {
    $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  } catch { Write-Host "epic-link-warn $($t.id): $($_.Exception.Message)" }

  # Tasks
  $taskMap = [ordered]@{
    '구현 작업'        = $t.impl
    '검증 작업'        = $t.verif
    '문서/정합성 반영' = $t.docs
  }
  $taskIds = @()
  $taskRefs = @()
  foreach($tn in $taskMap.Keys){
    $tBody = @{
      project=$projectId
      subject="[$($t.id)] $tn"
      user_story=$us.id
      milestone=$sprintId
      assigned_to=$userId
      owner=$userId
    } | ConvertTo-Json
    $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
    $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
    $task = $tResp.Content | ConvertFrom-Json
    $taskIds += $task.id
    $taskRefs += $task.ref
    # PATCH description (UTF-8 bytes)
    $cur = Invoke-RestMethod -Uri "$base/tasks/$($task.id)" -Headers $H
    $payload = @{ description = $taskMap[$tn]; version = $cur.version } | ConvertTo-Json -Depth 4
    $pBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $patch = Invoke-WebRequest -Uri "$base/tasks/$($task.id)" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $pBytes -UseBasicParsing
    Write-Host "  task id=$($task.id) ref=$($task.ref) [$tn] PATCH=$($patch.StatusCode)"
  }

  $summary += [pscustomobject]@{
    Ticket=$t.id
    USId=$us.id; USRef=$us.ref
    TaskIds=($taskIds -join ',')
    TaskRefs=($taskRefs -join ',')
  }
}

Write-Host '---SUMMARY---'
Write-Host "SPRINT_ID=$sprintId EPIC_ID=$epicId"
$summary | Format-Table -AutoSize
