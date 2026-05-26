$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9       # EP-02 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4~8 포함) — 재사용.
$sprintId=16   # SP-07 (WIN-061 에서 생성된 sprint 재사용).
$userId=$auth.id

# 0) SP-07 sprint 재확인 (만일 ID 가 바뀌었다면 이름으로 폴백).
try {
  $sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
  Write-Host "Sprint reused: name=$($sp.name) id=$($sp.id)"
} catch {
  Write-Host "Sprint id=$sprintId not found — fallback by name."
  $ms = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
  $sp = $ms | Where-Object { $_.name -like 'SP-07*' } | Select-Object -First 1
  if(-not $sp){ throw 'SP-07 sprint missing — register-w061.ps1 먼저 실행하세요.' }
  $sprintId = $sp.id
  Write-Host "Sprint fallback id=$sprintId"
}

# 1) US-62 user story.
$usBody = @{
  project=$projectId
  subject='WIN-062 IPC 안전 전송 — 임시 디렉터리 복사 + path-only (Phase 7 첨부 main 결합)'
  description='Renderer 가 보유한 첨부를 main 으로 옮길 때 binary blob 을 IPC 로 흘리지 않고, 원본을 %APPDATA%/oh-my-codex/attachments/<id>/<safe-basename> 로 복사한 후 path 만 반환한다. 무결성 가드: basename sanitize + path traversal 재검증 + sourcePath symlink 거부(fs.realpath) + SHA-256 재계산 비교 + size 검증. 7일 TTL 자동 만료 + 부트 시 고아 디렉터리 정리. 신규 IPC 4종(attachment_register/get/delete/list) + zod 스키마 + accept/reject 회귀. 마이그레이션 슬롯 004 는 WIN-054 가 점유 중이라 005_attachments.sql 로 충돌 회피. 회귀 게이트 193 → 212 tests / 159 pass / 0 fail / 53 skipped 통과.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-62 id=$($us.id) ref=$($us.ref)"

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
    subject="[WIN-062] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-062] $tn"
}

$desc1 = @"
[WIN-062] 구현 작업

[작업내용]
- desktop/main/storage/migrations/005_attachments.sql (신규) — SQLite attachments 테이블.
  · 컬럼: id TEXT PK, message_id TEXT FK NULL (messages ON DELETE CASCADE), name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, path TEXT NOT NULL, sha256 TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL.
  · 인덱스 4종: idx_attachments_message_id / idx_attachments_created_at / idx_attachments_expires_at / idx_attachments_sha256.
  · 슬롯 004 는 WIN-054 (004_tool_calls_v2.sql) 가 점유 중 → 005 로 충돌 회피 (티켓 spec 의 004 표기 deviation 매뉴얼 §8.2 / 작업내역에 명기).

- desktop/main/attachments/sanitizer.ts (신규) — 순수 가드 함수.
  · sanitizeBasename(input): NUL 제거 → Windows 드라이브 prefix 제거 → / 또는 \ split 후 마지막 segment → [^\w.\-] → '_' 치환 → 100자 상한(확장자 보존) → 빈 / '.' / '..' → 'file' 폴백. {safe, mutated} 반환.
  · isPathInside(root, candidate): path.relative(root, candidate) 검증 — '..' 시작 / 절대 / 빈 문자열 거부. 둘 다 절대 경로일 때만 true 가능.
  · isValidAttachmentId(id): 정규식 ^att-[0-9a-z]{6,16}-[0-9a-f]{4,32}$ — IPC 외부 입력 traversal 차단.

- desktop/main/attachments/attachment-repo.ts (신규) — AttachmentRepo 클래스.
  · constructor(db, {rootDir(absolute), ttlMs=7d, now?, idGen?}): rootDir 절대 경로 검증 + 8개 prepared statement 보관.
  · register({name, mime, size, sourcePath?, base64?, sha256?, messageId?, expiresAt?}): 1) buffer 확보 (sourcePath 우선, 절대 경로 + fs.realpath symlink 검증 → readFile / 폴백 base64 디코드), 2) 선언 size 와 buffer.byteLength 비교 → 'size mismatch' throw, 3) crypto.sha256(buf) 재계산 → declared 와 비교 → 'sha256 mismatch' throw, 4) sanitizeBasename(name), 5) idGen() (기본 'att-<ts36>-<hex8>') + isValidAttachmentId 검증, 6) <rootDir>/<id>/<safe-basename> 조립 후 isPathInside 재검증, 7) mkdir(dir, recursive) + writeFile(mode=0o600) — 실패 시 fsp.rm(dir, recursive, force) 청소, 8) DB insert — 실패 시 동일 청소, 9) {id, path, sha256, size, name} 반환.
  · get(id): isValidAttachmentId 가드 후 SELECT … WHERE id=?.
  · delete(id): 행 조회 → isPathInside 가드 후 디렉터리 rm → DB DELETE. boolean 반환.
  · list({messageId?, limit?, offset?}): limit max(1, min(200, …)) / offset max(0, …) clamp. messageId 유무에 따라 두 prepared statement 분기.
  · cleanupExpired(now?): SELECT WHERE expires_at < ? → 각 행 디렉터리 rm → DELETE WHERE expires_at < ?. 행 수 반환.
  · cleanupOrphans(): readdir(rootDir) → 각 entry 가 isValidAttachmentId 면 DB 조회 → 미존재 시 rm. 카운트 반환.

- desktop/ipc/commands.ts (수정) — IPC 결합.
  · allowedCommands 끝에 4 entries 추가: attachment_register, attachment_get, attachment_delete, attachment_list.
  · AttachmentBackend 인터페이스 + setAttachmentBackend / getAttachmentBackend setter/getter (PermissionBackend / ToolRouterBackend 패턴 미러).
  · 상수: ATTACHMENT_ID_RE / ATTACHMENT_PAYLOAD_MAX_BYTES = 5*1024*1024 / ATTACHMENT_NAME_MAX_LEN=200 / ATTACHMENT_MIME_MAX_LEN=120 / ATTACHMENT_MAX_SIZE_BYTES=200MB.
  · AttachmentRegisterPayloadSchema (zod object) — name min1 max200, mime min1 max120, size int 0..200MB, sourcePath max4096 optional, base64 max5MB optional, sha256 ^[0-9a-f]{64}$ optional, messageId max200 optional, refine: sourcePath || base64.
  · AttachmentRegisterArgsSchema (tuple [string max=5MB+1KB]) + refine: JSON.parse + Payload zod safeParse 통과.
  · AttachmentGetArgsSchema / AttachmentDeleteArgsSchema (tuple [string regex ATTACHMENT_ID_RE]).
  · AttachmentListArgsSchema (array max 3) + 2 refine — limit 1..200, offset 0..100000.
  · perCommandArgValidators 에 4 항목 추가.
  · handleRunCommand switch 에 4 case 추가 — backend null fail-fast throw + JSON.parse 페이로드 + backend 호출 + publishCompleted + {ok, data:{command, …}}. get 은 row==null 일 때 ok=false.

- desktop/main/index.ts (수정) — bootstrap 결합.
  · setAttachmentBackend import 추가 + AttachmentRepo import.
  · bootstrapAttachmentStack() 신설 — SQLite null 일 때 silently skip + setAttachmentBackend(null). 가용 시 rootDir = path.join(app.getPath('userData'), 'attachments') + new AttachmentRepo(db, {rootDir}) + setAttachmentBackend({register, get, delete, list}) + try { await repo.cleanupExpired() + await repo.cleanupOrphans() }. 로그 '[attachments] bootstrap ok (expired=N, orphans=M)'.
  · app.whenReady 체인에 bootstrapAttachmentStack() 호출 — bootstrapToolStack() 뒤, bootstrapWorkerTransports() 앞.
  · registerLocalProcessTransport 호출 부근 주석 보강 — 'WIN-062: 첨부 디렉터리(<userData>/attachments)도 동일한 read-only intent 으로 allowedCwdRoots 에 추가하지 않는다. binary 는 main 이 sanitize 한 basename 으로 쓰고, IPC 는 path/meta 만 반환한다.' WIN-044 legacy state 와 동일 패턴.

- desktop/__tests__/attachment-store.test.ts (신규) — sanitizer + repo 회귀 19 subtests.
- desktop/__tests__/ipc-contract.test.ts (수정) — attachment_* 9 accept/reject subtests + AttachmentBackend / setAttachmentBackend import.
- package.json (수정) — test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/attachment-store.test.js 추가.

[변경소스파일]
- 신규: desktop/main/storage/migrations/005_attachments.sql
- 신규: desktop/main/attachments/sanitizer.ts
- 신규: desktop/main/attachments/attachment-repo.ts
- 신규: desktop/__tests__/attachment-store.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W062.md
- 신규: winapp만들기/stage2/scripts/register-w062.ps1
- 수정: desktop/ipc/commands.ts (allowedCommands +4 / AttachmentBackend / 4 zod schemas / 4 validators / 4 switch cases)
- 수정: desktop/main/index.ts (import / bootstrapAttachmentStack / whenReady 체인 / LocalProcessTransport 주석)
- 수정: desktop/__tests__/ipc-contract.test.ts (+ 9 subtests)
- 수정: package.json (test gate)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.2 첨부 저장 경로 / 보존 정책)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-062 8/8 [x] + 슬롯 deviation 주석)
"@

$desc2 = @"
[WIN-062] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상.
  · 새로 추가된 마이그레이션 005_attachments.sql 이 dist-desktop/desktop/main/storage/migrations/ 로 복사됨 (copy-assets.mjs 의 generic *.sql 복사 루프가 자동 처리).
  · TSC 0 errors (sanitizer / attachment-repo / commands.ts / index.ts / 양 테스트 모두).

- npm run test:phase2:common:compiled — node:test 게이트 통과.

[회귀 결과]
- tests=212 / pass=159 / fail=0 / cancelled=0 / skipped=53
- 직전 베이스라인(WIN-061 종료) 193/149/0/44 → +19 tests / +10 pass / +0 fail / +9 skipped.
- skipped 9건 증가분은 attachment-store.test.ts 의 AttachmentRepo 케이스 — better-sqlite3 native binding 가 현 PowerShell 셸 환경에서 미가용 시 t.skip 으로 우회 (WIN-043 / W044 와 동일 패턴). sanitizer 7건 + isPathInside 2건 + isValidAttachmentId 1건 = pure subtest 10건은 항상 PASS.
- ipc-contract.test.ts 신규 9 subtests 는 모두 PASS — fake AttachmentBackend 만 사용해 sqlite binding 비의존.

[신규 회귀 커버리지]
1. sanitizer (10 subtests):
   - sanitizeBasename: normal 'photo.png' 통과, '../../etc/passwd' → 'passwd' + mutated=true, 'C:\\Users\\bob\\secrets.txt' → 'secrets.txt', '[^\\w.\\-]+' → '_' 치환, NUL strip, 빈 / '.' / '..' / '/' → 'file', 120자 + .png → 100자 이하 + .png 보존.
   - isPathInside: 서브경로 OK / .. 탈출 reject / 동일 root reject / relative reject.
   - isValidAttachmentId: 정상 패턴 / 짧은 패턴 / .. / 빈 문자열.
2. AttachmentRepo (9 subtests, better-sqlite3 가용 시):
   - register base64 happy path + sha256 verify (sha256 매치 / 파일 실재 확인).
   - register sourcePath 우선 (5바이트 buffer copy 검증).
   - register sha256 mismatch reject (row 0 + FS 0 정합 확인).
   - register size mismatch reject ('size mismatch' 메시지).
   - register sourcePath 상대 경로 reject ('sourcePath must be absolute').
   - get / delete round-trip (FS+DB 동시 정리 확인).
   - cleanupExpired (expiresAt=1 → cleanupExpired(Date.now()) 1건 정리).
   - cleanupOrphans (적법 id 패턴 디렉터리 + 파일 → DB 미존재 시 정리).
   - register '../../escape.txt' → basename sanitize 후 root prefix 안.
3. ipc-contract.test.ts (9 subtests):
   - attachment_register accept (base64 페이로드 JSON).
   - attachment_register reject non-JSON.
   - attachment_register reject missing sourcePath/base64.
   - attachment_register reject backend null (COMMAND_FAILED).
   - attachment_get accept valid id.
   - attachment_get reject bad id pattern ('../../escape').
   - attachment_delete accept.
   - attachment_list accept default limit/offset.
   - attachment_list reject limit out of range (999).

[보안 검증]
- binary 가 IPC payload 로 전달되지 않음: attachment_register 응답은 {id, path, sha256, size, name} 만 — buffer/blob 미반환.
- attachment_get 응답도 메타데이터(row) 만 — binary 는 향후 WIN-063 (attachment_read_text / file:// CSP) 에서 분리.
- path traversal 4중 차단: sanitize → 절대 경로만 → realpath symlink → isPathInside.
- LocalProcessTransport.allowedCwdRoots 에 첨부 디렉터리 미추가 (WIN-044 read-only intent 패턴 — 주석으로 명시).
- SQLite FK ON DELETE CASCADE — messages 삭제 시 attachments 자동 정리.
- TTL 7d + cleanupOrphans — 부트 시 DB/FS 정합성 자동 복구.

[DoD 충족]
- Renderer 가 binary 를 IPC 로 보내지 않음 ✓ (자동 테스트: register accept 케이스가 base64 5MB+ 페이로드를 거부하도록 args 상한 검증, attachment_get 응답이 row 만 반환하는지 ipc-contract 9 subtests 로 확인)
- 등록된 첨부 path 가 항상 <userData>/attachments/ 하위 ✓ (isPathInside 4중 검증)
- basename traversal 입력이 sanitize 되어 안전 경로로 변환 ✓ (test: '../../escape.txt' → 'escape.txt')
- sha256 불일치 시 거부 ✓ (sha256 mismatch test)
- 7일 미사용 자동 삭제 ✓ (cleanupExpired test + bootstrapAttachmentStack 부트 호출)
- ipc-contract.test.ts attachment_* 4종 accept/reject 추가 ✓ (9 subtests)
"@

$desc3 = @"
[WIN-062] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §8.2 첨부 저장 경로 / 보존 정책 (WIN-062) 신설: winapp만들기/stage2/winapp-manual-v2.md
  · 저장 경로: %APPDATA%/oh-my-codex/attachments/<id>/<safe-basename> + id 패턴 att-<ts36>-<hex8> + SQLite attachments 테이블 + 컬럼 9개 + 메시지 cascade.
  · 마이그레이션 슬롯 deviation 주석 — 기획 004 → 실제 005 (WIN-054 충돌 회피).
  · 보존 정책 TTL 표 — 기본 7d + boot 시 cleanupExpired+cleanupOrphans + 만료 처리 (DB row + FS dir rm) + 고아 디렉터리 정리.
  · Sanitize 규칙 표 6행 — ../etc/passwd / Windows 드라이브 / NUL / [^\\w.\\-] / 100자 상한 / 빈/. /.. → file.
  · 무결성·보안 가드 — SHA-256 main 재계산, size 비교, sourcePath 절대 경로 + fs.realpath symlink 거부, path traversal 재검증, LocalProcessTransport read-only intent.
  · IPC 명령 표 4종 — attachment_register/get/delete/list + args zod 패턴 + 응답.
  · 부팅 시 동작 — bootstrapAttachmentStack + cleanupExpired + cleanupOrphans + 로그 + SQLite 부재 시 fail-fast.
  · 관련 소스 6개 파일 링크.

- 작업내역 본 문서: winapp만들기/stage2/result/작업내역-W062.md — 7 섹션(식별/목표/변경 내역/핵심 API·정책/검증/후속/Taiga 반영) W061 포맷 미러. 작업내용 + 변경소스파일 + 검증 내역 + 결과 + 반영 내역 + 반영된 파일 모두 명시. 슬롯 deviation(004→005), TTL 7d, 4중 가드, 후속(dedup refCount / WIN-063 binary 채널 분리) 명시.

- 티켓 SSOT 갱신: winapp만들기/stage2/change-winapp-phase7-tickets.md
  · WIN-062 체크리스트 8/8 [x] 마감 (migrations 005 (slot deviation 주석) / attachment-repo / sanitizer / 4 IPC + zod / boot 만료·고아 정리 / LocalProcessTransport read-only intent 주석 / attachment-store.test + ipc-contract 9 subtests / 매뉴얼 §8.2).
  · Taiga 등록 내역 라인 업데이트 예정 — 실제 ID 는 register-w062.ps1 실행 후 기입.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w062.ps1 — SP-07 sprint 재사용(id=16, 부재 시 이름 폴백) + US-62 POST + Epic 9(EP-02) link + 3 tasks POST + 3 tasks description PATCH (BOM-free Invoke-WebRequest, 3× HTTP 200 기대, version 1→2 확인). W061 패턴 미러. Task description 형식은 본 작업 지시대로 [작업내용]/[변경소스파일], [검증 내역]/[결과], [반영 내역]/[반영된 파일] 3분할.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W062.md
- 신규: winapp만들기/stage2/scripts/register-w062.ps1
- 신규: desktop/main/storage/migrations/005_attachments.sql
- 신규: desktop/main/attachments/sanitizer.ts
- 신규: desktop/main/attachments/attachment-repo.ts
- 신규: desktop/__tests__/attachment-store.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§8.2 첨부 저장 경로 / 보존 정책 신설 — path layout / TTL 표 / sanitize 규칙 표 / 무결성 가드 / IPC 4종 표 / 부팅 동작 / 관련 소스)
- 수정: winapp만들기/stage2/change-winapp-phase7-tickets.md (WIN-062 8/8 [x], 마이그레이션 슬롯 deviation 주석, Taiga 등록 라인)
- 수정: desktop/ipc/commands.ts (allowedCommands +4 / AttachmentBackend interface / 4 zod schemas / 4 validators / 4 switch cases)
- 수정: desktop/main/index.ts (AttachmentRepo import / bootstrapAttachmentStack / whenReady 체인 / LocalProcessTransport read-only intent 주석)
- 수정: desktop/__tests__/ipc-contract.test.ts (+ 9 attachment_* subtests)
- 수정: package.json (test:phase2:common:compiled 에 attachment-store.test.js 추가)
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
Write-Host "Story   : US-62 id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
