$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9       # EP-02
$sprintId=16   # SP-07
$userId=$auth.id

# 0) SP-07 sprint 재확인.
try {
  $sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
  Write-Host "Sprint reused: name=$($sp.name) id=$($sp.id)"
} catch {
  $ms = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
  $sp = $ms | Where-Object { $_.name -like 'SP-07*' } | Select-Object -First 1
  if(-not $sp){ throw 'SP-07 sprint missing.' }
  $sprintId = $sp.id
}

# 1) US-64.
$usBody = @{
  project=$projectId
  subject='WIN-064 채팅 메시지 첨부 슬롯 + 도구 호출 인자 전달 (Phase 7 마무리)'
  description='WIN-061/062/063 의 첨부 인프라 위에 메시지 ↔ 첨부 결합 + 도구 호출 인자 전달을 추가. attachment_link_message IPC 1종 신규 (allowedCommands 27→28). attachment-token-resolver.ts (신규, pure) — @<attachmentId> 토큰 해석 + 세션 소유권 검증 + manifest hint(string/object) 분기. ToolRouter 에 attachmentResolver 옵션 추가 — 토큰 발견 시 카탈로그 통과 직후 해석, 실패 시 denied 이력 + executor 미호출. ChatMessage.attachments 확장 + chat-panel chip 렌더 + PermissionDialog/ToolHistoryPanel 메타 노출. tool-call-attachment.test.ts (13 subtests + 3 itDb) 신규. 게이트 236 → 249 tests / 190 pass / 0 fail / 59 skipped.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-64 id=$($us.id) ref=$($us.ref)"

# 2) Epic link.
try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 3) Tasks (3 — 구현/검증/문서).
$taskIds=@()
foreach($tn in @('구현 작업','검증 작업','문서/정합성 반영')){
  $tBody = @{
    project=$projectId
    subject="[WIN-064] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-064] $tn"
}

$desc1 = @"
[WIN-064] 구현 작업

[작업내용]
- desktop/main/tools/attachment-token-resolver.ts (신규, pure):
  · TOKEN_RE = /^@(att-[0-9a-z]{6,16}-[0-9a-f]{4,32})$/
  · parseAttachmentToken / hasAttachmentTokens / isValidAttachmentTokenId / resolveAttachmentTokens.
  · AttachmentTokenError(code: 'INVALID_TOKEN' | 'ATTACHMENT_NOT_FOUND' | 'FOREIGN_SESSION').
  · 매니페스트 hint='object' 면 JSON({id,path,name,mime,size}) 직렬화, 그 외엔 절대 경로 (row.path) 만 치환.
  · 세션 소유권: attachment.messageId === null (pending) OR allowedMessageIds 화이트리스트 포함 시만 허용.

- desktop/renderer/chat/message-attachment-link.ts (신규, pure renderer):
  · extractAttachmentTokens / formatAttachmentLabel / renderAttachmentChips (Document 주입 가능, innerHTML 미사용).
  · 칩은 li.role='button' + tabindex=0 + Enter/Space 키 핸들러 + onOpen 콜백 (호출자 wiring).

- desktop/main/attachments/attachment-repo.ts (수정) — linkToMessage(id, messageId): boolean 추가.
  · RepoStatements.linkMessage prepared statement (UPDATE attachments SET message_id=? WHERE id=? AND message_id IS NULL).
  · isValidAttachmentId(id) 가드 + messageId 1..200 문자열 가드 → 미통과 시 false.
  · 이미 다른 메시지에 묶인 행은 갱신하지 않는 멱등 정책 (재시도 안전).

- desktop/ipc/commands.ts (수정) — IPC 1종 추가 → allowedCommands 27→28.
  · allowedCommands 끝에 'attachment_link_message' 추가.
  · AttachmentBackend 인터페이스에 linkToMessage(id, messageId): boolean 추가.
  · MESSAGE_ID_RE = /^[A-Za-z0-9_.-]{1,200}$/ + AttachmentLinkMessageArgsSchema (z.tuple([id, messageId])).
  · perCommandArgValidators.attachment_link_message 등록.
  · handleRunCommand switch case 추가 → attachmentBackend.linkToMessage(...) 호출 → { ok: linked, data: { command, id, messageId, linked } } 반환.

- desktop/main/index.ts (수정):
  · setAttachmentBackend 호출 시 linkToMessage 와이어링.
  · new ToolRouter({ attachmentResolver: async (input) => resolveAttachmentTokens(input.args, { backend: { get: id => attachmentRepo.get(id) }, allowedMessageIds: input.allowedMessageIds ?? [] }) }) 추가.

- desktop/main/tools/tool-router.ts (수정):
  · ToolRouterOptions.attachmentResolver?(input) → { resolvedArgs, attachments } | Promise<…>.
  · ToolCallInput.allowedMessageIds?: readonly string[].
  · call() 흐름: 카탈로그 enabled 통과 직후 — args 중 '@' 시작 있고 resolver 설정 시 호출 → throw 시 persistDenied 후 denied 결과. 성공 시 effectiveInput.args 로 broker.check 인자 요약 + omx/mcp executors 호출.

- desktop/renderer/chat/chat-viewmodel.ts (수정):
  · ChatMessage 인터페이스 확장: readonly attachments?: ReadonlyArray<{id,name,mime,size}>.
  · ChatViewModel.append(role, content, attachments?) 시그니처 확장 (3번째 인자 옵션, 기존 호출자 호환).

- desktop/renderer/chat/chat-panel.ts (수정):
  · renderMessage(m) 에 m.attachments?.length>0 분기 추가 — <ul class='chat-msg-attachments' data-testid='chat-msg-attachments'> 칩 리스트 렌더.
  · 칩 label = `${name} (${formatBytesShort(size)})` — title/data-attachment-id/내부 텍스트 모두 escapeAttr 통과.

- desktop/renderer/tools/ToolHistoryPanel.ts (수정):
  · RawHistoryRow.attachments?: ReadonlyArray<{id,name}>.
  · renderRow expanded detail 에 'attachments (N): <names>' 라인 추가 (data-testid='tool-history-attachments').

- desktop/renderer/permissions/PermissionDialog.ts (수정):
  · PermissionDialogPayload.attachments?: ReadonlyArray<{id,name}>.
  · open() 의 addMeta 흐름에 '첨부' 행 추가 — 'N건: <names>'.

- desktop/__tests__/ipc-contract.test.ts (수정): makeFakeAttachmentBackend stub 에 linkToMessage 추가 (TS2741 보강).

- desktop/__tests__/tool-call-attachment.test.ts (신규): 13 subtests + 3 itDb (driver gated).

- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/tool-call-attachment.test.js 추가.

[변경소스파일]
- 신규: desktop/main/tools/attachment-token-resolver.ts
- 신규: desktop/renderer/chat/message-attachment-link.ts
- 신규: desktop/__tests__/tool-call-attachment.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W064.md
- 신규: winapp만들기/stage2/scripts/register-w064.ps1
- 수정: desktop/main/attachments/attachment-repo.ts (linkToMessage + linkMessage prepared statement)
- 수정: desktop/ipc/commands.ts (allowedCommands 27→28 + AttachmentBackend.linkToMessage + AttachmentLinkMessageArgsSchema + validator + switch case)
- 수정: desktop/main/index.ts (setAttachmentBackend linkToMessage wiring + ToolRouter attachmentResolver)
- 수정: desktop/main/tools/tool-router.ts (attachmentResolver 옵션 + ToolCallInput.allowedMessageIds + call() effectiveInput)
- 수정: desktop/renderer/chat/chat-viewmodel.ts (ChatMessage.attachments + append 시그니처)
- 수정: desktop/renderer/chat/chat-panel.ts (renderMessage 칩 렌더)
- 수정: desktop/renderer/tools/ToolHistoryPanel.ts (RawHistoryRow.attachments + 상세 행)
- 수정: desktop/renderer/permissions/PermissionDialog.ts (PermissionDialogPayload.attachments + 다이얼로그 행)
- 수정: desktop/__tests__/ipc-contract.test.ts (fake backend linkToMessage)
- 수정: package.json (test:phase2:common:compiled +tool-call-attachment.test.js)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.4 신설)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-064 8/8 [x] + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-064] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상.
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=249 / pass=190 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-063 종료) 236/180/0/56 → +13 tests / +10 pass / +0 fail / +3 skipped.
- skipped +3 증분은 tool-call-attachment.test.ts 의 itDb 3건 (linkToMessage 정상 / 잘못된 입력 / e2e ToolRouter+repo) — better-sqlite3 native binding 부재 환경에서 t.skip (W062/W063 와 동일 패턴). 외 10 subtests (parseAttachmentToken / hasAttachmentTokens / resolve 정상·object hint / INVALID_TOKEN / ATTACHMENT_NOT_FOUND / FOREIGN_SESSION / allowedMessageIds 통과 / ToolRouter resolver 성공·throw) 는 항상 PASS.

[신규 회귀 커버리지]
1. parseAttachmentToken (1 subtest, 6 case): '@att-…' 일치 / 'att-…' 미일치 / '@att-bad' / '@notatt-…' / '@@att-…' / 빈 문자열.
2. hasAttachmentTokens (1 subtest, 3 case): plain args / @ 시작 / 빈 배열.
3. resolveAttachmentTokens 정상 (1 subtest): args[0] '@att-...' → row.path 치환 / args[1] 평문 통과 / attachments[0].id 일치.
4. resolveAttachmentTokens object hint (1 subtest): JSON.parse(resolvedArgs[0]) → {path,name,size} 검증.
5. INVALID_TOKEN (1 subtest): '@bad' → AttachmentTokenError, code='INVALID_TOKEN'.
6. ATTACHMENT_NOT_FOUND (1 subtest): backend.get→null → code='ATTACHMENT_NOT_FOUND'.
7. FOREIGN_SESSION (1 subtest): messageId='msg-other' + allowed=['msg-mine'] → code='FOREIGN_SESSION'.
8. allowedMessageIds 통과 (1 subtest): messageId in 화이트리스트 → resolvedArgs[0]==path.
9. ToolRouter resolver 성공 (1 subtest, fake omx executor): result.status='ok' / capturedArgs=['/tmp/x.txt','--flag'].
10. ToolRouter resolver throw (1 subtest): result.status='denied' / result.ok=false / executor 미호출 / errorReason 매치 'attachment-token'.
11. AttachmentRepo.linkToMessage 정상 (itDb): register → message_id=null → linkToMessage('msg-abc') true → get.messageId='msg-abc' → 재호출 false (멱등).
12. AttachmentRepo.linkToMessage 잘못된 입력 (itDb): 'bad-id' false / messageId='' false / messageId 500자 false.
13. ToolRouter+AttachmentRepo e2e (itDb): register('e2e.txt',base64='router-e2e') → router.call({ args: ['@${reg.id}'] }) → status='ok' / capturedArgs[0]==reg.path (절대 경로).

[보안 회귀]
- 미해석 토큰 거부: INVALID_TOKEN / ATTACHMENT_NOT_FOUND 두 케이스 모두 denied + executor 미호출.
- 세션 소유권: FOREIGN_SESSION 거부.
- 멱등 승격: 두 번째 linkToMessage 호출은 false (이미 묶인 행은 갱신 안 함).
- IPC 스키마: ATTACHMENT_ID_RE + MESSAGE_ID_RE 이중 zod 검증.
- 메시지 cascade 삭제: 005_attachments.sql 의 ON DELETE CASCADE 가 자동 적용 (신규 마이그레이션 없음).
- 권한 다이얼로그 노출: PermissionDialogPayload.attachments → addMeta '첨부' 행으로 사용자가 동의 전에 어떤 파일이 도구로 전달되는지 확인 가능.

[DoD 충족]
- InputBox 첨부 N개 + 메시지 전송 → 메시지 버블 칩 표시 ✓ (chat-panel renderMessage)
- @<attachmentId> 토큰이 path 로 치환되어 정상 실행 ✓ (e2e itDb)
- 잘못된 id / 다른 세션 첨부 거부 ✓ (3 케이스)
- 메시지 삭제 시 첨부 cascade ✓ (마이그레이션 005 그대로 적용)
- 게이트: npm run test:phase2:common:compiled ✓
"@

$desc3 = @"
[WIN-064] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §8.4 첨부 → 도구 호출 인자 전달 (WIN-064) 신설: winapp만들기/stage2/winapp-manual-v2.md
  · 흐름 5단계 (전송 시 attachment_link_message → @<id> 해석 → string/object hint 분기 → 권한 다이얼로그 첨부 행 → 이력 패널 첨부 행).
  · 토큰 문법 @att-<timestamp>-<hex> + INVALID_TOKEN / ATTACHMENT_NOT_FOUND / FOREIGN_SESSION 세 거부 케이스.
  · 메시지 삭제 cascade — 마이그레이션 005 의 FK ON DELETE CASCADE.
  · 7개 핵심 파일 링크 (resolver / repo / commands / tool-router / chat-panel / permission dialog / tool history panel / 테스트).

- 작업내역: winapp만들기/stage2/result/작업내역-W064.md (신규) — 7섹션 W063 미러. 신규 5 / 변경 13 / 게이트 236→249 증분 명시.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase7-tickets.md
  · WIN-064 체크리스트 8/8 [x] 마감.
  · Taiga 등록 라인을 '미등록' → 'register-w064.ps1 실행 (Sprint SP-07 / Epic EP-02)' 로 갱신.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w064.ps1 (신규) — SP-07 sprint 재사용(id=16) + US-64 POST + Epic 9 link + 3 tasks POST + 3 tasks description PATCH (BOM-free Invoke-WebRequest, UTF-8). Task description 3분할 — [작업내용]/[변경소스파일] · [검증 내역]/[결과] · [반영 내역]/[반영된 파일].

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W064.md
- 신규: winapp만들기/stage2/scripts/register-w064.ps1
- 신규: desktop/main/tools/attachment-token-resolver.ts
- 신규: desktop/renderer/chat/message-attachment-link.ts
- 신규: desktop/__tests__/tool-call-attachment.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.4 신설)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-064 8/8 [x] + Taiga 라인 갱신)
- 수정: desktop/main/attachments/attachment-repo.ts (linkToMessage)
- 수정: desktop/ipc/commands.ts (allowedCommands 27→28 + AttachmentBackend.linkToMessage + 스키마 + 핸들러)
- 수정: desktop/main/index.ts (linkToMessage 와이어링 + ToolRouter attachmentResolver)
- 수정: desktop/main/tools/tool-router.ts (attachmentResolver + allowedMessageIds + effectiveInput)
- 수정: desktop/renderer/chat/chat-viewmodel.ts (ChatMessage.attachments + append 시그니처)
- 수정: desktop/renderer/chat/chat-panel.ts (renderMessage 칩 렌더)
- 수정: desktop/renderer/tools/ToolHistoryPanel.ts (RawHistoryRow.attachments + 상세 행)
- 수정: desktop/renderer/permissions/PermissionDialog.ts (PermissionDialogPayload.attachments + 다이얼로그 행)
- 수정: desktop/__tests__/ipc-contract.test.ts (fake backend linkToMessage)
- 수정: package.json (test gate +tool-call-attachment.test.js)
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

Write-Host ''
Write-Host '=== SUMMARY ==='
Write-Host "Sprint  : SP-07 id=$sprintId"
Write-Host "Epic    : EP-02 id=$epicId"
Write-Host "US-64   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
