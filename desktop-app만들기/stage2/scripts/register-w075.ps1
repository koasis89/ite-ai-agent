param([switch]$PatchOnly)

$ErrorActionPreference='Stop'
# WIN-075 Taiga 등록 SSOT.
#
# 실행 모드:
#   .\register-w075.ps1                — 신규 등록 (SP-08 / EP-02 재사용 + US-75 + 3 task 생성 후 description PATCH).
#   .\register-w075.ps1 -PatchOnly     — 이미 등록된 US-75 / Tasks 의 description 만 재PATCH (한글 mojibake 정정용).
#
# 주의: PowerShell 5.1 에서 본 .ps1 파일은 반드시 UTF-8 BOM 으로 저장되어야 한다.

$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9
$sprintId=18
$userId=$auth.id

$subjects=@('[WIN-075] 구현 작업','[WIN-075] 검증 작업','[WIN-075] 문서/정합성 반영')
$usSubject='WIN-075 진단 번들 (logs / config / history / 마스킹 / sanity)'
$usDescription='Phase 8 5번째(마지막) 티켓. 사용자가 한 번의 IPC 호출(diag_bundle_create)로 진단 번들(zip)을 생성하고 diag_bundle_open_folder 로 폴더를 열어 공유할 수 있게 한다. 의존성 없는 STORED-only ZipWriter(IEEE CRC32) 로 8 entry(meta / config / logs main+renderer / history / mcp-servers / tool-permissions / attachments-meta) 작성. 마스킹 정책 SSOT 는 desktop/main/diag/maskers.ts — 시크릿 KV(password/token/secret/api_key/access_key/client_secret/private_key/bearer/authorization + 선택적 Bearer/Basic/Token/Digest 스킴 접두어 포함) / 이메일 / Windows 사용자 경로(C:\\Users\\<name>\\) / POSIX 사용자 경로(/home,/Users) / 객체 키 화이트리스트(env 전체 + 시크릿 key 명) 5 카테고리. 첨부 메타는 explicit 화이트리스트({id,name,size,mime,sha256,createdAt}) — body/content 같은 미래 필드가 AttachmentRow 에 추가돼도 zip 미노출(코드 레벨 차단). 생성 직후 모든 텍스트 entry 를 findSensitiveLeaks((?!\*\*\*) 음수 lookahead) 로 재스캔하여 1건 이상이면 BundleSanityError(DIAG_BUNDLE_SANITY_FAILED) 로 실패 + zip 미저장. IPC 2종 — diag_bundle_create(optionsJson ≤1024자 JSON 객체, includeLogsBytes 0..50MB / includeHistory 0..2000 / includeAttachmentsMeta boolean) / diag_bundle_open_folder(zod .. + UNC + 상대 경로 거부 + 런타임 isPathInside(outDir,…) 가드). DiagBundleBackend 후크 + bootstrapDiagBundle 가 <userData>/diag 출력 디렉터리 + <logs>/main.log,renderer.log 꼬리 결합 + shell.showItemInFolder 주입. 자동 업로드 경로 없음(수동 트리거만). 게이트: 261/202/0/59 → 287/228/0/59 (+26 tests / +26 pass / 0 fail), 신규 leaf — diag-bundle.test.ts 26개 top-level + ipc-contract.test.ts diag_bundle_* describe 8 leaf.'

$desc1 = @"
[WIN-075] 구현 작업

[작업내용]
- desktop/main/diag/maskers.ts (신규 — 마스킹 SSOT): SECRET_KEY_PATTERN = /\b(password|passwd|token|secret|api[_-]?key|access[_-]?key|client[_-]?secret|private[_-]?key|bearer|authorization)\b(\s*[:=]\s*|\s+)(?:(?:Bearer|Basic|Token|Digest)\s+)?("[^"]*"|'[^']*'|[^\s,;]+)/gi — Authorization: Bearer eyJ... 같은 HTTP 스킴 접두어를 비-캡처로 흡수하여 토큰 전체를 *** 로 치환. EMAIL_PATTERN = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g. WINDOWS_USER_PATH_PATTERN = /([A-Za-z]):([\\/])Users\2([^\\/\s"']+)/gi. POSIX_HOME_PATTERN = /(\/(?:home|Users)\/)([^/\s"']+)/g. LEAK_PATTERN — 동일 시크릿 KV 패턴에 (?!\*\*\*) 음수 lookahead 추가하여 이미 마스킹된 *** 을 leak 으로 오탐하지 않음. applyMasks(text) — 시크릿 KV → 이메일 → Windows → POSIX 순 치환. maskEnv(env) — 모든 값 ***. applyMasksDeep(value) — WeakSet 사이클 가드, env 키는 maskEnv 위임, 시크릿 key 명(SECRET_KEY_NAMES Set) 은 값 형식 무관 강제 마스킹. findSensitiveLeaks(text, limit=5) — sanity check 용 leak 위치 + preview 배열 반환. 멱등성 보장(*** 재치환 없음).
- desktop/main/diag/bundle.ts (신규 — STORED-only zip + sanity): ZipWriter 클래스 — addEntry(name, Buffer|string) (중복 / 절대 경로(/ 시작) / .. / 빈 이름 거부) + finalize() → Buffer (1회만). IEEE 0xedb88320 CRC32 테이블 init. DOS time/date 인코딩 + UTF-8 filename 플래그 0x0800. BundleProvider 인터페이스(getMeta/getConfig/getHistory/getMcpServers/getToolPermissions/getAttachmentsMeta/readLog). buildBundle(provider, options) 8 entry — meta.json / config.json / logs/main.log / logs/renderer.log / history.json (includeHistory>0 일 때) / mcp-servers.json / tool-permissions.json / attachments-meta.json (includeAttachmentsMeta=true 일 때). 첨부 메타는 명시 화이트리스트 {id,name,size,mime,sha256,createdAt} 만 통과 — body/content 등 미래 필드 차단. 모든 텍스트 entry 를 findSensitiveLeaks 로 재스캔 → 누출 시 BundleSanityError(code='DIAG_BUNDLE_SANITY_FAILED', leaks 배열). formatBundleFilename(date) — oh-my-codex-diag-yyyyMMdd-HHmmss.zip (0-padding). BundleOptions 기본값 — includeLogsBytes=5MB / includeHistory=200 / includeAttachmentsMeta=true / maxTotalBytes=50MB.
- desktop/main/diag/runtime.ts (신규 — Electron 측 런타임): DiagBundleRuntime 클래스. 옵션 — outDir / mainLogPath? / rendererLogPath? / providers: DiagDataProviders / now?: () => Date / showItemInFolder?: (path) => void. DiagDataProviders — BundleProvider 와 동일 getter 형식이지만 meta 는 createdAt 제외(런타임이 now().toISOString() 주입) + readLog 제외(런타임이 mainLogPath/rendererLogPath + readLogTail 헬퍼로 끝에서 maxBytes 읽기). create(options) — ensureOutDir → buildProvider → buildBundle(BundleSanityError 별도 캐치) → fsp.writeFile → {ok,path,filename,sizeBytes,entries,warnings}. openInFolder(zipPath) — path.resolve → isPathInside(outDir, resolved) 가드 → fsp.stat().isFile() 확인 → showItemInFolder 호출. outDir 외부 / 파일 아님 / 미존재 모두 reason 반환. readLogTail(filePath, maxBytes) — fs.statSync + fs.openSync('r') + fs.readSync(max(0, size-maxBytes)). 헬퍼 isPathInside / defaultLogPaths / describeOs (`<platform> <release> (<arch>)`).
- desktop/ipc/commands.ts (수정): allowedCommands 35 → 37 (diag_bundle_create / diag_bundle_open_folder 추가, wizard_step_complete 다음). DIAG_BUNDLE_MAX_LOG_BYTES = 50*1024*1024 상수. DiagBundleCreateArgsSchema = z.array(z.string()).max(1).refine — 선택 optionsJson ≤1024자, JSON object(null/배열 거부), includeLogsBytes 0..50MB, includeHistory 0..2000, includeAttachmentsMeta boolean. DiagBundleOpenFolderArgsSchema = z.tuple([z.string().min(1).max(2048)]).refine — .. 금지 + 절대 경로([A-Za-z]:[\\/] 또는 /…) + UNC \\\\ 거부. DiagBundleBackend 인터페이스 + setDiagBundleBackend / getDiagBundleBackend 후크(WizardBackend 동일 패턴). perCommandArgValidators 2건 + handleRunCommand switch case 2건. 백엔드 null 시 {ok:false, applied:false, reason:'diag bundle backend not initialised'} fallback. 성공 응답 — create: {command, applied, reason, path, filename, sizeBytes, entries, warnings} / open: {command, applied, reason}.
- desktop/main/index.ts (수정): shell import (electron) + DiagBundleRuntime / defaultLogPaths / describeOs / DiagDataProviders import + setDiagBundleBackend import. bootstrapDiagBundle() 신규 — <userData>/diag 출력 디렉터리 + app.getPath('logs') 의 main/renderer 로그 결합 + configStore/commandHistoryRepo/permissionStore/attachmentRepo/mcpServerRegistry/firstRunStore best-effort 결합. DiagBundleRuntime 인스턴스화 + ensureOutDir 호출 + setDiagBundleBackend 등록. 부트 실패 시 setDiagBundleBackend(null) 비활성 fallback. whenReady 체인에 await bootstrapDiagBundle(); 을 bootstrapFirstRun 다음, registerIpcHandlers 직전에 삽입.
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/diag-bundle.test.js 추가 (first-run-wizard.test.js 다음, codesign.test.js 앞).

[변경소스파일]
- 신규: desktop/main/diag/maskers.ts
- 신규: desktop/main/diag/bundle.ts
- 신규: desktop/main/diag/runtime.ts
- 신규: desktop/__tests__/diag-bundle.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W075.md
- 신규: winapp만들기/stage2/scripts/register-w075.ps1
- 수정: desktop/ipc/commands.ts (allowedCommands +2 / zod 2 / DiagBundleBackend / switch 2 case)
- 수정: desktop/__tests__/ipc-contract.test.ts (diag_bundle_* describe +8 tests)
- 수정: desktop/main/index.ts (shell import + DiagBundleRuntime import + bootstrapDiagBundle + whenReady 체인)
- 수정: package.json (test gate +diag-bundle.test.js)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.5 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-075 8/8 체크리스트 마감 + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-075] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상. maskers.ts / bundle.ts / runtime.ts / diag-bundle.test.ts / commands.ts 수정분 / ipc-contract.test.ts 수정분 / index.ts 수정분 모두 컴파일 청결 (get_errors=0).
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=287 / pass=228 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-074 종료) 261/202/0/59 → +26 tests / +26 pass / +0 fail / +0 skipped.

[신규 회귀 커버리지 — desktop/__tests__/diag-bundle.test.ts (26 top-level)]
maskers — 13 tests:
1. applyMasks: password / token / api_key / Authorization Bearer KV — Bearer 스킴 접두어 흡수로 토큰 전체가 *** 로 치환됨.
2. applyMasks: email.
3. applyMasks: Windows 사용자 경로 (C:\Users\<name>\).
4. applyMasks: POSIX home (/home/<name>/, /Users/<name>/).
5. applyMasks: 복합 텍스트 — password + email + 경로 + Authorization Bearer 모두 마스킹 + 원본 비밀값 잔존 0.
6. applyMasks: 이미 마스킹된 *** 텍스트는 멱등.
7. applyMasks: 안전 문자열 통과.
8. maskEnv: 모든 값 ***.
9. maskEnv: null / undefined → {}.
10. applyMasksDeep: 시크릿 key 명(token/apiKey 등) 은 값 형식 무관 강제 마스킹.
11. applyMasksDeep: env 객체 모든 값 마스킹.
12. applyMasksDeep: 배열 + 순환 참조 안전.
13. findSensitiveLeaks: 마스킹된 *** 무시, 평문만 검출.
ZipWriter — 3 tests:
14. STORED zip 의 EOCD / CD / local header 구조 검증.
15. 중복 이름 / .. traversal / 절대 경로(/foo) / 빈 이름 거부.
16. finalize() 1회만 허용.
buildBundle — 9 tests:
17. 8 canonical entry 모두 생성.
18. config 의 token / Windows 경로 / env 마스킹.
19. 로그 본문의 시크릿 KV / Bearer 토큰 마스킹 + sanity 통과.
20. 첨부 본문 미포함 — body:'RAW-BINARY-BODY-MUST-NOT-LEAK' + content:'PLAINTEXT' 주입 시 zip 전체 바이트 어디에도 노출 안 됨 + attachments-meta key 화이트리스트 외 키 0.
21. 로그가 maxBytes 초과 시 truncated 마커 삽입.
22. 로그 누락 시 warning 만 발생(에러 아님).
23. includeHistory=0 시 history 항목 미생성.
24. 로그에 평문 secret 주입 + 마스킹 우회 모킹 → sanity 실패.
25. BundleSanityError 가 code='DIAG_BUNDLE_SANITY_FAILED' + leaks 배열 보유.
26. formatBundleFilename 0-padding yyyyMMdd-HHmmss.

[신규 회귀 커버리지 — desktop/__tests__/ipc-contract.test.ts diag_bundle_* describe (8 leaf)]
27. diag_bundle_create 백엔드 null fallback ({ok:false, applied:false, reason}).
28. diag_bundle_create 성공 시 백엔드에 옵션 위임 (includeHistory:50 전달 회귀).
29. diag_bundle_create optionsJson='{not-json' → INVALID_REQUEST.
30. diag_bundle_create includeLogsBytes 범위(0..50MB) 초과 거부.
31. diag_bundle_create 배열 JSON 거부 (object 강제).
32. diag_bundle_open_folder 백엔드 null → disabled.
33. diag_bundle_open_folder 정상 절대 경로 → 백엔드 위임.
34. diag_bundle_open_folder 상대 경로 / UNC(\\\\) / .. traversal 모두 INVALID_REQUEST.

[보안 회귀]
- 첨부 본문이 zip 에 노출되지 않음 회귀 (buildBundle 화이트리스트 — test 20).
- 비밀번호 / 토큰 평문이 zip 에 잔존하지 않음 회귀 (applyMasks + sanity — test 1, 19, 24).
- Authorization: Bearer <token> 같은 HTTP 스킴 접두어로 마스킹 우회 시도 차단 — SECRET_KEY_PATTERN 의 비-캡처 스킴 접두어 흡수 (test 1, 5).
- env / 시크릿 키 객체 마스킹 누락 회귀 — applyMasksDeep key 화이트리스트 강제 (test 10, 11, 18).
- 자동 업로드 경로 없음 — 수동 IPC 트리거만, 백엔드 null 시 disabled fallback (test 27).
- path-traversal 로 임의 폴더 열기 차단 — zod .refine + 런타임 isPathInside (test 34).
- zip 내부 파일 이름 충돌 / traversal 차단 — ZipWriter addEntry 검증 (test 15).

[DoD 충족]
- 번들 zip 생성 + shell.showItemInFolder 동작 (런타임 wire 완료, IPC 회귀 통과).
- 마스킹 fixture 4종(비밀번호/토큰/이메일/Windows path) 모두 마스킹됨 (test 1~5).
- 첨부 본문이 zip 에 포함되지 않음을 자동 테스트로 증명 (test 20 — zip 전체 바이트 스캔).
- 자동 sanity check — 생성된 zip 안에 (password|secret)=[^*] 패턴 0개 (test 19 통과 + test 24 누출 시 실패 확인).
- 게이트 무영향 — 261→287 (+26 tests), fail 0.
"@

$desc3 = @"
[WIN-075] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §9.5 진단 번들 (WIN-075) 신설: winapp만들기/stage2/winapp-manual-v2.md
  - zip 구성 표 8 entries (meta / config / logs main+renderer / history / mcp-servers / tool-permissions / attachments-meta + 마스킹 적용 여부).
  - IPC 명령 표 (diag_bundle_create / diag_bundle_open_folder + args 형식 + 응답 데이터 형식).
  - 마스킹 정책 표 5 카테고리 (시크릿 KV / 이메일 / Windows 경로 / POSIX 경로 / 객체 키 deep).
  - 보안 보장 표 5행 (첨부 본문 미포함 / 자동 업로드 없음 / Sanity check / Path-traversal 방지 / 마스킹 멱등).
  - 구성요소 파일 링크 — maskers.ts / bundle.ts / runtime.ts / commands.ts / index.ts / diag-bundle.test.ts / ipc-contract.test.ts.

- 작업내역: winapp만들기/stage2/result/작업내역-W075.md (신규) — 7섹션 W074 미러. 신규 6 / 수정 6 / 게이트 261→287 (+26) 증분 명시. 보안 회귀 매트릭스 7행 / 보안 정책 결정 메모 (동의 다이얼로그 [N/A] 사유 + STORED zip 채택 사유 + 마스킹 우선순위) / Sprint·Epic·US·등록 스크립트 추적.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase8-tickets.md
  - WIN-075 체크리스트 7/8 [x] + 1/8 [N/A 동의 다이얼로그 — 자동 업로드 경로 없음 + 매뉴얼 §9.5 사전 안내 + sanity 미저장 보호] 마감.
  - Taiga 등록 라인을 '미등록' → 'register-w075.ps1 실행 (Sprint SP-08 / Epic EP-02)' 로 갱신.
  - '작업 결과' 라인을 result/작업내역-W075.md 마크다운 링크로 변경.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w075.ps1 (신규) — SP-08 재사용(id=18) + EP-02 재사용(id=9) + US-75 + 3 task POST + description PATCH. UTF-8 BOM, Invoke-WebRequest Body = [System.Text.Encoding]::UTF8.GetBytes(json). Task description 3분할 — [WIN-075] 구현 작업([작업내용]/[변경소스파일]) · [WIN-075] 검증 작업([검증 내역]/[결과]) · [WIN-075] 문서/정합성 반영([반영 내역]/[반영된 파일]). param([switch]$PatchOnly) 첫 줄.

- 게이트 자동화: package.json test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/diag-bundle.test.js 추가 — 후속 모든 PR 에서 마스킹 / ZipWriter / buildBundle / 첨부 본문 미포함 / sanity 회귀 자동 검증.

- 부트스트랩 정합: desktop/main/index.ts whenReady 체인이 bootstrapUpdater → bootstrapFirstRun → bootstrapDiagBundle → registerIpcHandlers → createMainWindow 순서로 명시. IPC 핸들러 등록 전에 diagBundleBackend 가 결합되므로 첫 diag_bundle_create 호출부터 정상 응답.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W075.md
- 신규: winapp만들기/stage2/scripts/register-w075.ps1
- 신규: desktop/main/diag/maskers.ts
- 신규: desktop/main/diag/bundle.ts
- 신규: desktop/main/diag/runtime.ts
- 신규: desktop/__tests__/diag-bundle.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.5 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-075 8/8 체크리스트 마감 + Taiga 라인 갱신)
- 수정: desktop/ipc/commands.ts (allowedCommands +2 / zod 2 / DiagBundleBackend / switch 2 case)
- 수정: desktop/__tests__/ipc-contract.test.ts (diag_bundle_* describe +8 tests)
- 수정: desktop/main/index.ts (shell import + DiagBundleRuntime import + bootstrapDiagBundle + whenReady 체인)
- 수정: package.json (test gate +diag-bundle.test.js)
"@

if($PatchOnly){
  throw '-PatchOnly mode requires US-75 / Task IDs to be filled in manually after first registration.'
}

# === 신규 등록 모드 ===

# 0) SP-08 / EP-02 재사용 확인.
$sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
Write-Host "Sprint reused id=$($sp.id) name=$($sp.name)"

try {
  $ep = Invoke-RestMethod -Uri "$base/epics/$epicId" -Headers $H
  Write-Host "Epic reused id=$($ep.id) subject=$($ep.subject)"
} catch { throw "EP-02 (id=$epicId) missing." }

# 1) US-75.
$usBody = @{
  project=$projectId
  subject=$usSubject
  description=$usDescription
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json -Depth 4
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-75 id=$($us.id) ref=$($us.ref)"

try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 2) Tasks.
$taskIds=@()
for($i=0; $i -lt 3; $i++){
  $tBody = @{
    project=$projectId
    subject=$subjects[$i]
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task $($task.id) created"
}

# 3) Task description PATCH.
$descs=@($desc1, $desc2, $desc3)
for($i=0; $i -lt 3; $i++){
  $id=$taskIds[$i]
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  $payload = @{ description=$descs[$i]; version=$t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH task $id -> $($resp.StatusCode) (descLen=$($descs[$i].Length))"
}

Write-Host ''
Write-Host '=== SUMMARY ==='
Write-Host "Sprint  : SP-08 id=$sprintId"
Write-Host "Epic    : EP-02 id=$epicId"
Write-Host "US-75   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
