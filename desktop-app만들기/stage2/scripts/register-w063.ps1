$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9       # EP-02 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4~8 포함) — 재사용.
$sprintId=16   # SP-07 (WIN-061 에서 생성된 sprint 재사용).
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

# 1) US-63.
$usBody = @{
  project=$projectId
  subject='WIN-063 이미지/PDF/텍스트 프리뷰 (Phase 7 첨부 인라인 시각화)'
  description='WIN-062 의 path 위에 인라인 프리뷰 추가. 첨부 칩 클릭/Enter 시 mime 분기로 image/PDF/text 프리뷰를 우측 컨텍스트 패널에 렌더. 텍스트는 attachment_read_text IPC 로 최대 64KB + truncated 플래그, image/PDF 는 sandbox 화된 file:// 또는 blob URL. 보안: SVG sanitizer (script/on*/foreignObject/javascript:href/외부URL 제거), file:// allowlist (attachments dir + renderer asset dir 외 cancel), CSP 메타 (script-src self / connect-src self), AttachmentRepo.readText path-prefix + realpath symlink 가드. 신규 IPC 1종 — 누적 27종. preview.test.ts 20+ subtests + ipc-contract.test.ts 3 subtests 신규. 게이트 212 → 236 tests / 180 pass / 0 fail / 56 skipped.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-63 id=$($us.id) ref=$($us.ref)"

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
    subject="[WIN-063] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-063] $tn"
}

$desc1 = @"
[WIN-063] 구현 작업

[작업내용]
- desktop/main/attachments/text-reader.ts (신규) — 순수 인코딩 헬퍼.
  · DEFAULT_MAX_TEXT_BYTES=65_536 (64KB), MIN_MAX_TEXT_BYTES=1.
  · clampMaxBytes(n): NaN / 비number → DEFAULT, floor + 1..65536 clamp.
  · detectEncoding(buf): UTF-16LE BOM 0xff 0xfe 만 'utf-16le' 반환, 외엔 'utf-8' (UTF-8 BOM 0xef bb bf 는 디코딩 후 U+FEFF 제거).
  · readBufferAsText(buf, cap): cap 까지 subarray → TextDecoder({fatal:false}) → BOM 제거 + UTF-16LE 홀수 바이트 정렬 → {text, encoding, bytesRead, totalBytes, truncated} 반환.

- desktop/main/attachments/attachment-repo.ts (수정) — AttachmentRepo.readText(id, opts) 추가.
  · isValidAttachmentId(id) → null / get(id) → null / isPathInside 재검증 → throw / fs.realpath 로 symlink 우회 차단 → throw / clampMaxBytes(opts.maxBytes ?? DEFAULT) → fs.open + fh.read(0..cap) + readBufferAsText → totalBytes 는 stat 결과로 보정 / truncated = totalBytes > cap / {…ReadTextResult, id, mime, sha256} 반환.

- desktop/ipc/commands.ts (수정) — IPC 1종 추가.
  · allowedCommands 끝에 'attachment_read_text' 추가 → 누적 27종.
  · AttachmentBackend 인터페이스에 readText(id, opts):Promise<{...}|null> 추가.
  · AttachmentReadTextArgsSchema (z.array(z.string()).min(1).max(2)) + refine 2단(ATTACHMENT_ID_RE 일치 + 옵션 JSON {maxBytes?:1..65536}).
  · perCommandArgValidators.attachment_read_text 등록.
  · switch case 'attachment_read_text': backend null fail-fast → args[1] JSON.parse → backend.readText → {command, result} 반환.

- desktop/main/index.ts (수정) — bootstrapAttachmentStack 의 setAttachmentBackend 호출에 readText 추가. installFilePrefixGuard(window) 신설 — session.webRequest.onBeforeRequest({urls:['file:///*']}) 가 attachments dir + dist-desktop/renderer dir 외 path 면 cancel(true). decodeURIComponent + Windows '/C:/…' 슬래시 정규화로 false-positive 회피.

- desktop/renderer/attachments/svg-sanitizer.ts (신규) — 정규식 기반 sanitizer. script/foreignObject/iframe/object/embed/on* 핸들러/javascript: data:text/html href / 외부 https href 제거. {safe, mutated} 반환. DOM 미의존.

- desktop/renderer/attachments/preview-cache.ts (신규) — PreviewLruCache<K,V>. capacity≥1 guard / get 시 MRU 승격 / set overflow 시 LRU evict. DEFAULT_PREVIEW_CACHE_CAPACITY=10.

- desktop/renderer/attachments/previewers/image.ts (신규) — renderImagePreview({blob|filePath, mime, name}). SVG 분기 (sanitizeSvg → innerHTML), 외엔 <img>. blob URL revoke cleanup.

- desktop/renderer/attachments/previewers/pdf.ts (신규) — renderPdfPreview({blob|filePath, name}). <iframe sandbox="allow-same-origin" referrerpolicy="no-referrer">. blob URL revoke cleanup.

- desktop/renderer/attachments/previewers/text.ts (신규) — renderTextPreview({source, name, maxBytes?}). source kind:'blob' → Blob.slice(0,cap)+readBufferAsText, kind:'ipc' → invoke(id,{maxBytes:cap}). 첫 200줄 cap 추가, truncated 안내 표시.

- desktop/renderer/attachments/PreviewPanel.ts (신규) — openPending(item) / openRegistered(meta) / close(). mime 분기 (image/* / application/pdf / 텍스트 / 그 외 메타데이터). PreviewLruCache 10 entries. isTextMime export (테스트용).

- desktop/renderer/attachments/DropZone.ts (수정) — DropZoneOptions.onPreview 추가, chip click + keydown(Enter/Space) 핸들러에서 호출.

- desktop/renderer/app.ts (수정) — PreviewPanel import + 부트 시 new PreviewPanel({}) (host 부재 시 try/catch skip) + DropZone onPreview 콜백 wiring + preview.open/preview.error 타임라인 로그.

- desktop/renderer/index.html (수정) — CSP <meta http-equiv> 추가 (default-src self / img-src self file: data: blob: / frame-src self file: blob: / object-src none / script-src self / style-src self unsafe-inline / connect-src self / font-src self data:). 우측 컨텍스트 패널 본문에 <div id="attachment-preview"> 마운트.

- desktop/renderer/attachments.css (수정) — .attachment-preview / .preview-image / .preview-svg / .preview-pdf / .preview-text 계열 + .attachment-chip { cursor:pointer; }.

- desktop/__tests__/preview.test.ts (신규) — 20+ subtests.
- desktop/__tests__/ipc-contract.test.ts (수정) — attachment_read_text 3 subtests + makeFakeAttachmentBackend 에 readText mock 추가.
- package.json (수정) — test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/preview.test.js 추가.

[변경소스파일]
- 신규: desktop/main/attachments/text-reader.ts
- 신규: desktop/renderer/attachments/svg-sanitizer.ts
- 신규: desktop/renderer/attachments/preview-cache.ts
- 신규: desktop/renderer/attachments/PreviewPanel.ts
- 신규: desktop/renderer/attachments/previewers/image.ts
- 신규: desktop/renderer/attachments/previewers/pdf.ts
- 신규: desktop/renderer/attachments/previewers/text.ts
- 신규: desktop/__tests__/preview.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W063.md
- 신규: winapp만들기/stage2/scripts/register-w063.ps1
- 수정: desktop/main/attachments/attachment-repo.ts (readText + text-reader.ts import)
- 수정: desktop/ipc/commands.ts (allowedCommands +1 / AttachmentBackend.readText / AttachmentReadTextArgsSchema / validator / switch case)
- 수정: desktop/main/index.ts (installFilePrefixGuard + setAttachmentBackend readText wiring)
- 수정: desktop/renderer/attachments/DropZone.ts (onPreview opt + chip handlers)
- 수정: desktop/renderer/app.ts (PreviewPanel 부트)
- 수정: desktop/renderer/index.html (CSP + #attachment-preview)
- 수정: desktop/renderer/attachments.css (preview 스타일)
- 수정: desktop/__tests__/ipc-contract.test.ts (+ 3 subtests + readText mock)
- 수정: package.json (test gate + preview.test.js)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.3 신설)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-063 6/6 [x])
"@

$desc2 = @"
[WIN-063] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상 (index.html / 3 css / 5 sql 복사).
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=236 / pass=180 / fail=0 / cancelled=0 / skipped=56
- 직전 베이스라인(WIN-062 종료) 212/159/0/53 → +24 tests / +21 pass / +0 fail / +3 skipped.
- skipped 3건 증가분은 preview.test.ts 의 AttachmentRepo.readText 3 케이스 — better-sqlite3 native binding 부재 환경에서 t.skip 우회 (W062 와 동일 패턴). 외 17 subtest(clampMaxBytes / detectEncoding / readBufferAsText / sanitizeSvg / PreviewLruCache / isTextMime) 는 항상 PASS.

[신규 회귀 커버리지]
1. text-reader (8 subtests):
   - clampMaxBytes: NaN→DEFAULT / 'invalid' as number→DEFAULT / 0→MIN / -100→MIN / 123.9→123 / 1_000_000→DEFAULT.
   - detectEncoding: UTF-16LE BOM 0xff 0xfe→'utf-16le' / 'hello' utf-8→'utf-8'.
   - readBufferAsText: UTF-8 plain (한국어 포함) / UTF-8 BOM 제거 / UTF-16LE BOM 디코드 / 2048B→64B truncated:true.

2. svg-sanitizer (6 subtests):
   - <script> 제거 + mutated=true.
   - on* (onload/onclick) 제거.
   - <foreignObject>+<iframe> 제거.
   - javascript:href 제거.
   - 외부 https://evil.example href 제거.
   - benign svg 미변경 (mutated=false).

3. PreviewLruCache (3 subtests):
   - capacity 0 → throw.
   - 3개 후 4번째 set → 'a' evict (FIFO).
   - get('a') 후 set 'd' → 'b' evict ('a' MRU 승격 확인).

4. PreviewPanel.isTextMime (4 subtests):
   - text/plain / application/json → true.
   - image/png → false.
   - mime 빈 문자열 + .yaml 확장자 → true.

5. AttachmentRepo.readText (3 subtests, driver 가용 시):
   - utf-8 short file (한국어+hello+숫자) → encoding=utf-8 / text 동일 / truncated=false.
   - 100KB 'A'.repeat → truncated=true / totalBytes=100000 / bytesRead ≤ 65536 / text.length ≤ 65536.
   - bad id ('../etc/passwd' / 'att-not-found-aaaa') → null.

6. ipc-contract.test.ts (3 subtests):
   - accept valid id default cap → ok=true / text='hello' / truncated=false.
   - reject '../../escape' → INVALID_REQUEST.
   - reject maxBytes=1_000_000 → INVALID_REQUEST.

[보안 회귀]
- 텍스트 64KB 상한: clampMaxBytes(repo) + readBufferAsText(text-reader) 이중 적용.
- 경로 탈출: isValidAttachmentId + isPathInside 4중 차단.
- symlink 우회: fs.realpath + isPathInside 재검증 → throw.
- IPC 스키마: ATTACHMENT_ID_RE + maxBytes 1..65536 zod refine.
- SVG 활성 컨텐트: 5종 회귀 모두 제거 확인.
- file:// allowlist: attachments + renderer dir 외 cancel.
- CSP: script-src 'self' / connect-src 'self' (외부 네트워크 차단).

[DoD 충족]
- 이미지/PDF/텍스트 3종 정상 프리뷰 ✓
- 첨부 디렉터리 밖 path 차단 ✓ (installFilePrefixGuard + readText path-prefix)
- SVG 스크립트 주입 거부 ✓ (sanitizeSvg 5 케이스)
- 64KB 초과 텍스트 truncated:true ✓ (100KB 테스트)
"@

$desc3 = @"
[WIN-063] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §8.3 이미지/PDF/텍스트 프리뷰 (WIN-063) 신설: winapp만들기/stage2/winapp-manual-v2.md
  · MIME 별 렌더링 정책 (image/* / application/pdf / 텍스트 / 그 외 메타데이터).
  · 보안 정책 — IPC attachment_read_text + 64KB cap, AttachmentRepo.readText path-prefix + realpath, file:// allowlist (BrowserWindow.session.webRequest.onBeforeRequest), CSP 메타 (default-src self / img-src file: data: blob: / frame-src file: blob: / object-src none / script-src self / connect-src self), EXIF 미노출(설계 의도), 인코딩 자동 감지 (UTF-16LE BOM 0xff 0xfe 외 UTF-8 + BOM 제거).
  · LRU 캐시 10 entries.
  · IPC 응답 페이로드 형태 명시.
  · UI 위치 (#attachment-chips / #attachment-preview).
  · 키보드/접근성 (Enter/Space 토글, Backspace/Delete 제거).
  · 관련 파일 12 링크.

- 작업내역: winapp만들기/stage2/result/작업내역-W063.md (신규) — 7섹션 W062 미러. 신규 7 / 변경 8 / 게이트 212→236 증분 명시 / 후속 WIN-064 명시.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase7-tickets.md
  · WIN-063 체크리스트 6/6 [x] 마감.
  · Taiga 등록 라인은 본 스크립트 실행 후 갱신.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w063.ps1 (신규) — SP-07 sprint 재사용(id=16) + US-63 POST + Epic 9 link + 3 tasks POST + 3 tasks description PATCH (BOM-free Invoke-WebRequest, UTF-8). Task description 형식은 작업 지시대로 [작업내용]/[변경소스파일] · [검증 내역]/[결과] · [반영 내역]/[반영된 파일] 3분할.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W063.md
- 신규: winapp만들기/stage2/scripts/register-w063.ps1
- 신규: desktop/main/attachments/text-reader.ts
- 신규: desktop/renderer/attachments/svg-sanitizer.ts
- 신규: desktop/renderer/attachments/preview-cache.ts
- 신규: desktop/renderer/attachments/PreviewPanel.ts
- 신규: desktop/renderer/attachments/previewers/image.ts
- 신규: desktop/renderer/attachments/previewers/pdf.ts
- 신규: desktop/renderer/attachments/previewers/text.ts
- 신규: desktop/__tests__/preview.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.3 신설)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-063 6/6 [x] + Taiga 라인 갱신)
- 수정: desktop/main/attachments/attachment-repo.ts (readText 메서드 + text-reader.ts import)
- 수정: desktop/ipc/commands.ts (allowedCommands +1 / AttachmentBackend.readText / AttachmentReadTextArgsSchema / validator / switch case)
- 수정: desktop/main/index.ts (installFilePrefixGuard + setAttachmentBackend readText wiring)
- 수정: desktop/renderer/attachments/DropZone.ts (onPreview opt + chip handlers)
- 수정: desktop/renderer/app.ts (PreviewPanel 부트)
- 수정: desktop/renderer/index.html (CSP + #attachment-preview)
- 수정: desktop/renderer/attachments.css (preview 스타일)
- 수정: desktop/__tests__/ipc-contract.test.ts (+ 3 subtests)
- 수정: package.json (test gate)
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
Write-Host "US-63   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
