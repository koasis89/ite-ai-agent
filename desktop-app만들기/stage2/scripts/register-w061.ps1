$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9   # EP-02 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4~8) — Phase 7 도 포함.
$userId=$auth.id

# 0) SP-07 sprint 보장 (없으면 신규 생성).
$ms = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
$sp7 = $ms | Where-Object { $_.name -like 'SP-07*' } | Select-Object -First 1
if(-not $sp7){
  $mBody = @{
    project=$projectId
    name='SP-07 윈도우 데스크탑 앱(7단계, 첨부 / 멀티모달)'
    estimated_start='2026-06-22'
    estimated_finish='2026-07-05'
  } | ConvertTo-Json
  $mBytes=[System.Text.Encoding]::UTF8.GetBytes($mBody)
  $mResp = Invoke-WebRequest -Uri "$base/milestones" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $mBytes -UseBasicParsing
  $sp7 = $mResp.Content | ConvertFrom-Json
  Write-Host "Sprint SP-07 created id=$($sp7.id)"
} else {
  Write-Host "Sprint SP-07 reused id=$($sp7.id)"
}
$sprintId = $sp7.id

# 1) US-61 user story.
$usBody = @{
  project=$projectId
  subject='WIN-061 Renderer 드롭 영역 + 파일 메타데이터 추출 (Phase 7 첨부/멀티모달 진입)'
  description='채팅 영역에 파일을 드래그-앤-드롭하거나 클립보드 이미지를 paste 하면 화이트리스트(20종)·단일 50MB·누적 200MB·최대 10건 정책으로 1차 검증하여 미확정(pending) 첨부 칩 UI 를 렌더링한다. text/uri-list / text/html 등 비-파일 드롭은 거부하고 채팅 패널에 system 역할 메시지로 사유를 안내한다. 본 티켓은 렌더러 전용 pending 단계 — IPC/디스크 저장은 WIN-062, 본문 인라인은 WIN-064 에서 이어진다. 신규 18 subtest (dropzone.test.ts) 추가 후 회귀 게이트 193 tests / 149 pass / 0 fail / 44 skipped 통과.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-61 id=$($us.id) ref=$($us.ref)"

# 2) Epic link.
try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 3) Tasks (3개 — 구현/검증/문서).
$taskIds=@()
foreach($tn in @('구현 작업','검증 작업','문서/정합성 반영')){
  $tBody = @{
    project=$projectId
    subject="[WIN-061] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-061] $tn"
}

$desc1 = @"
[WIN-061] 구현 작업

[작업내용]
- desktop/renderer/attachments/attachment-store.ts (신규) — 첨부 검증/저장 핵심.
  · 상수: DEFAULT_ATTACHMENT_WHITELIST (20종 frozen array — txt md json csv log png jpg jpeg gif webp svg pdf yaml yml ts js mjs cjs html xml), DEFAULT_MAX_FILE_BYTES=50MB, DEFAULT_MAX_TOTAL_BYTES=200MB, DEFAULT_MAX_FILES=10.
  · extractExtension(name): 소문자 확장자 추출 (점 없음 폴백 '').
  · validateAttachmentCandidate(candidate, ctx, opts?): 순수 검증 함수 → {ok:true, ext} | {ok:false, reason} (reason: empty-name|empty-size|extension-not-allowed|size-exceeded|total-exceeded|count-exceeded|non-file).
  · AttachmentStore class: list()/totalBytes()/count()/onChange(cb)→unsubscribe/tryAdd({name,size,mime,sourcePath?,blob?})→PendingAttachment|null/rejectNonFile(kind)/remove(id)/clear(). 내부 idGen 기본값은 'pa-<timestamp36>-<rand8>' (crypto.randomUUID 폴백).
  · formatRejection(name, rejection): 사용자 표시용 한국어 메시지 포매터. formatBytes(n): B/KB/MB. basename(p): / 와 \ 양쪽 strip.
  · listener 격리(한 listener throw 가 다른 listener 차단하지 않음 — try/catch).

- desktop/renderer/attachments/DropZone.ts (신규) — DOM 이벤트 ↔ Store 라우팅.
  · DropZoneOptions {root, chipsHost?, pasteTarget?, store, onReject?, onAdded?} — 외부 의존은 콜백으로만.
  · bind(): dragenter/over/leave/drop 핸들러 + dragDepth 카운터 + onChange 구독. dragenter 시 dataTransfer.types 가 'Files' 포함하면 root.classList.add('drop-active'), drop 시 제거.
  · handleDrop(e): dt.files 0건 + types 에 'text/uri-list' or 'text/html' 포함하면 store.rejectNonFile(type) 후 종료. 파일은 acceptFile() 로 전달.
  · handlePaste(e): clipboardData.items 중 kind==='file' && type.startsWith('image/') → blob 추출 → 이름 'paste-<Date.now()>.<ext>' 합성 → store.tryAdd. 1건 이상 수용되면 preventDefault.
  · acceptFile(file as ElectronFile): file.path 가 있으면 sourcePath, 없으면 blob=file 로 보관.
  · render() + renderChip(item): div.attachment-chip[role=listitem, tabindex=0, data-attachment-id] + span.attachment-chip-name + span.attachment-chip-size + button.attachment-chip-remove(×). chip 에 keydown 'Backspace'/'Delete' → store.remove.
  · hasFiles(e): dataTransfer.files.length>0 OR types.includes('Files') — Electron/Chromium dragenter 시점 files 가 비어있을 수 있어 양 조건 검사.

- desktop/renderer/attachments.css (신규) — UI 스타일.
  · .chat-pane-body.drop-active / .chat-center.drop-active: outline 2px dashed #4d8cf5 + 옅은 파란 배경.
  · #attachment-chips / .attachment-chips: flex-wrap 6px gap, border-top/bottom, [data-empty='true'] 일 때 display:none.
  · .attachment-chip: rounded pill 12px radius, 최대 220px, focus-visible outline.
  · .attachment-chip-name: ellipsis truncation 140px max. .attachment-chip-size: opacity 0.65, tabular-nums.
  · .attachment-chip-remove: 버튼 reset + × glyph + hover/focus 시 빨강 강조.

- desktop/renderer/index.html (수정) — <link rel='stylesheet' href='./attachments.css'> 추가 (chat.css 다음). <div id='attachment-chips' class='attachment-chips' role='list' aria-label='첨부 파일 목록' data-empty='true' data-win='WIN-061'> 를 .chat-input-row 직전, #chat-message-list 다음에 삽입.

- desktop/renderer/app.ts (수정) — AttachmentStore / DropZone import. ChatPanel 부트스트랩 직후 dropRoot=chatInputBox.closest('.chat-pane-body')||closest('.chat-center'), chipsHost=#attachment-chips 조회 후 new DropZone({root, chipsHost, pasteTarget:chatInputBox, store, onReject: msg => chatPanel?.viewModel().append('system', msg), onAdded: item => addTimeline('attachment.added id=… name=… size=…')}). addTimeline('dropzone.ready - WIN-061 attachment dropzone attached').

- desktop/scripts/copy-assets.mjs (수정) — sourceAttachmentsCss/targetAttachmentsCss/copyFileSync 트리플 추가. console.log 1줄 추가.

- desktop/__tests__/dropzone.test.ts (신규) — node:test 순수 회귀 18 subtests.
- package.json (수정) — test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/dropzone.test.js 추가.

[변경소스파일]
- 신규: desktop/renderer/attachments/attachment-store.ts
- 신규: desktop/renderer/attachments/DropZone.ts
- 신규: desktop/renderer/attachments.css
- 신규: desktop/__tests__/dropzone.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W061.md
- 신규: winapp만들기/stage2/scripts/register-w061.ps1
- 수정: desktop/renderer/index.html
- 수정: desktop/renderer/app.ts
- 수정: desktop/scripts/copy-assets.mjs
- 수정: package.json
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8 첨부/멀티모달 신설, §8 참고→§9)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-061 체크리스트 6/6 [x])
"@

$desc2 = @"
[WIN-061] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상 (renderer 4 asset attachments.css 포함 + migrations 4종 dist 복사 확인).
  · 초기 컴파일 오류 1건 식별·수정: interface ElectronFile extends File { readonly path?: string } → DOM lib 의 File.path 가 non-optional string 이라 TS2430 발생. readonly path: string 으로 변경하고 호출부에서 typeof file.path === 'string' && file.path.length > 0 가드.

- npm run test:phase2:common:compiled — node:test 게이트 통과.

[회귀 결과]
- tests=193 / pass=149 / fail=0 / cancelled=0 / skipped=44
- 직전 베이스라인(WIN-055 종료) 175/131/0/44 → +18 tests / +18 pass / +0 fail / +0 skipped (모두 dropzone.test.js 신규 분).
- 단독 확인: node --test dist-desktop/desktop/__tests__/dropzone.test.js → 18 subtests PASS.

[신규 회귀 — dropzone.test.ts 18 subtests]
1. extractExtension: 정상/비정상 (a.txt, Report.PDF, a.tar.gz, noext, '', 'trailing.').
2. basename: 절대 경로 → basename 추출 (Windows backslash + POSIX forward slash + 빈 문자열).
3. formatBytes: B/KB/MB 단위 변환.
4. validateAttachmentCandidate: 화이트리스트 20종 모두 통과.
5. 화이트리스트 외 거부 ('evil.exe' → reason='extension-not-allowed', ext='exe').
6. 단일 파일 상한 초과 거부 (size=DEFAULT_MAX_FILE_BYTES+1 → reason='size-exceeded', limit=50MB).
7. 누적 상한 초과 거부 (currentBytes 누계 + 신규 size > 200MB).
8. 동시 첨부 수 상한 거부 (currentCount=10 → reason='count-exceeded', limit=10).
9. 빈 이름 / 빈 크기 거부 (empty-name / empty-size 각각).
10. custom 옵션(whitelist/maxFileBytes 오버라이드) 적용.
11. AttachmentStore.tryAdd → added 이벤트 발행 + count/totalBytes/addedAt 갱신.
12. 화이트리스트 외 → rejected 이벤트 발행 + 항목 미추가.
13. paste image (sourcePath=null + blob 보관) 정상 등록.
14. remove + clear (remove non-existent → false / clear 후 count=0,total=0).
15. rejectNonFile('text/uri-list') → rejected({reason:'non-file', kind}) 발행.
16. 10개 누적 후 11번째 tryAdd → null + count 유지(=10).
17. listener 격리 — 한 listener throw 가 다른 listener 차단하지 않음 (secondCalled=1).
18. formatRejection 7개 사유 사용자 메시지 정규식 검증 (.exe 화이트리스트 / 50.0MB / 누적 / 10개 / text/html / 이름 / 크기).

[정합성/보안 검증]
- 모든 검증은 renderer 순수 함수에서 1차 차단 — IPC 호출 없음(WIN-061 범위 확정).
- text/uri-list / text/html 등 외부 URL/HTML 드롭은 파일 없이 들어오면 즉시 거부 (XSS/file-path-leak 회피).
- File.path 는 Electron 환경 한정 — 부재 시 sourcePath=null + blob 보관, 외부로 누설 없음.
- DropZone.dispose() 가 모든 listener 정리(detach 배열).
- 칩 UI 키보드 접근성: tabindex=0 + Backspace/Delete + 제거 버튼 aria-label.

[DoD 충족]
- DropZone 이벤트 핸들러 + 영역 활성 시각 피드백 ✓
- attachment-store.ts 미확정 첨부 in-memory + 변경 이벤트 ✓
- InputBox 칩 UI + 키보드 접근성 ✓
- 화이트리스트 / 크기 상한 / 거부 사유 ✓
- dropzone.test.ts (수용 / 거부 / paste 이미지) ✓ (18 subtests)
- 매뉴얼 §8.1 드롭 사용법 + 화이트리스트 표 ✓
"@

$desc3 = @"
[WIN-061] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §8 첨부 / 멀티모달 신설: winapp만들기/stage2/winapp-manual-v2.md
  · §8.1 드롭 사용법 — 드롭 영역 / 칩 UI / paste 이미지 / 시각 피드백 동작 설명.
  · 화이트리스트 표(20종) — 분류별(텍스트·문서 10 / 코드 4 / 이미지 6).
  · 상한 표 — 단일 50MB / 누적 200MB / 동시 10건.
  · 거부 사유 6종 표 + 사용자 표시 메시지 예시.
  · 보안/UX 가드 절 — text/uri-list 거부 / 순수 함수 1차 차단 / File.path 정책.
  · 관련 소스 4개 파일 링크.
  · 기존 '## 8. 참고' → '## 9. 참고' 로 재번호화 (Phase 6 WIN-055 가 §7→§8 로 옮겼던 참고 절을 이번에 §9 로 재이동).

- 작업내역 본 문서: winapp만들기/stage2/result/작업내역-W061.md — 7 섹션(식별/목표/변경 내역/핵심 API·정책/검증/후속/Taiga 반영) W055 포맷 미러. 작업내용 + 변경소스파일 + 검증 내역 + 결과 + 반영 내역 + 반영된 파일 모두 명시.

- 티켓 SSOT 갱신: winapp만들기/stage2/change-winapp-phase7-tickets.md
  · WIN-061 체크리스트 6/6 [x] 마감 (DropZone / attachment-store / InputBox 칩 / 화이트리스트·크기·거부 / dropzone.test / 매뉴얼 §8.1).
  · Taiga 등록 내역 라인 업데이트 (등록 완료 예정 → 실제 ID 는 스크립트 실행 후 기입).

- 등록 스크립트: winapp만들기/stage2/scripts/register-w061.ps1 — SP-07 sprint 보장 생성(없을 때만), US-61 POST + Epic 9(EP-02 — Phase 4~8 포함) link + 3 tasks POST + 3 tasks description PATCH (BOM-free Invoke-WebRequest, 3× HTTP 200 기대, version 1→2 확인). W044/W055 패턴 미러. Task description 형식은 본 작업 지시대로 [작업내용]/[변경소스파일], [검증 내역]/[결과], [반영 내역]/[반영된 파일] 3분할.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W061.md
- 신규: winapp만들기/stage2/scripts/register-w061.ps1
- 신규: desktop/renderer/attachments/attachment-store.ts
- 신규: desktop/renderer/attachments/DropZone.ts
- 신규: desktop/renderer/attachments.css
- 신규: desktop/__tests__/dropzone.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8 첨부/멀티모달 신설 — §8.1 드롭 사용법 + 화이트리스트·상한·거부 표, 기존 §8 참고 → §9)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-061 6/6 [x], Taiga 등록 라인)
- 수정: desktop/renderer/index.html
- 수정: desktop/renderer/app.ts
- 수정: desktop/scripts/copy-assets.mjs
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

Write-Host ''
Write-Host '=== SUMMARY ==='
Write-Host "Sprint  : SP-07 id=$sprintId"
Write-Host "Epic    : EP-02 id=$epicId (Phase 4~8 포함 — Phase 7 재사용)"
Write-Host "Story   : US-61 id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
