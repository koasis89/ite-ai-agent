$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9   # EP-02 (id=9, ref=#148)
$sprintId=14 # SP-05 (id=14)
$userId=$auth.id

# 1) US-44 user story.
$usBody = @{
  project=$projectId
  subject='WIN-044 기존 .omx/state/* 호환 어댑터 (read-only 공유)'
  description='기존 CLI 사용자가 보유한 .omx/state/* 디렉터리를 데스크탑 앱에서 read-only 로 인식하고, 데스크탑 앱의 쓰기는 %APPDATA%/oh-my-codex/state/ 로 일원화한다. 탐색 우선순위(OMX_STATE_DIR > cwd/.omx/state > userData/legacy-state-link) + symlink 탈출 차단 + omx_state_status 응답에 source 구분(desktop/legacy) 추가. 데스크탑 transport 의 allowedCwdRoots 에는 legacy 경로를 의도적으로 추가하지 않아 read-only intent 를 강제.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-44 id=$($us.id) ref=$($us.ref)"

# 2) Epic link.
try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 3) Tasks (구현/검증/문서).
$taskIds=@()
foreach($tn in @('구현 작업','검증 작업','문서/정합성 반영')){
  $tBody = @{
    project=$projectId
    subject="[WIN-044] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-044] $tn"
}

# ---- WIN-044 descriptions ----
$desc1 = @"
[WIN-044] 구현 작업

[작업내용]
- desktop/main/storage/legacy-state-resolver.ts (신규): resolveLegacyStateDir({env, cwd, userDataDir}) 3단계 우선순위 탐색 — 1) process.env.OMX_STATE_DIR 2) process.cwd()/.omx/state 3) <userData>/legacy-state-link. 각 후보는 statSync().isDirectory() 확인 후 fs.realpathSync 정규화. 어디에도 없으면 null. LegacyStateLocation = {source: 'env'|'cwd'|'userdata-link', rootDir}.
- desktop/main/storage/legacy-state-adapter.ts (신규): LegacyStateAdapter (read-only). root() / readState(name) / listActiveStates(). 파일명 검증 정규식 STATE_NAME_RE=/^[A-Za-z0-9._-]{1,128}$/ — 경로 분리자/제어문자/.. 차단. 심볼릭 링크 탈출 차단: fs.realpathSync 후 path.relative 기반 prefix 검사 → 밖이면 LegacyStateEscapeError. JSON 파싱 실패는 null + 로거 진단만. listActiveStates 는 root 의 *.json 만 flat ASC 정렬, 파싱/탈출 실패 항목 skip (throw X). writeState/deleteState 는 LegacyStateReadOnlyError throw — 데스크탑 앱의 신규 상태는 %APPDATA%/oh-my-codex/state/ 로 일원화.
- desktop/ipc/commands.ts (수정): LegacyStateBackend 구조적 인터페이스 + setLegacyStateBackend/getLegacyStateBackend export. omx_state_status 케이스에서 backend 가 있으면 listActiveStates() 결과를 data.legacy = {source, rootDir, readonly:true, items[]} 로 첨부, data.source='desktop' 추가. 기존 응답 필드(argv/exitCode/signal/stdout/stderr/...) 무변 — ipc-contract 회귀 무영향. legacy 탐색 실패는 console.error 만, 사용자 흐름 차단 X.
- desktop/main/index.ts (수정): bootstrapLegacyState() 신설 — resolveLegacyStateDir({userDataDir:app.getPath('userData')}) → LegacyStateAdapter 생성 → setLegacyStateBackend({rootDir, source, listActiveStates}) 주입. app.whenReady 체인에 bootstrapConfigStore → bootstrapSqliteStore → bootstrapLegacyState → bootstrapWorkerTransports 순서로 삽입. getLegacyStateLocation/getLegacyStateAdapter export. LocalProcessTransport/PtyLocalTransport 의 allowedCwdRoots 에는 legacy 경로를 일부러 추가하지 않음 — read-only intent 라는 정책 주석 명시 (legacy 경로가 transport cwd 로 사용되어 탈출하는 경로 차단).
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/legacy-state-adapter.test.js 추가.

[변경소스파일]
- 신규: desktop/main/storage/legacy-state-resolver.ts
- 신규: desktop/main/storage/legacy-state-adapter.ts
- 신규: desktop/__tests__/legacy-state-adapter.test.ts
- 수정: desktop/ipc/commands.ts (LegacyStateBackend 후크 + omx_state_status 응답 확장)
- 수정: desktop/main/index.ts (bootstrapLegacyState + allowedCwdRoots 정책 주석)
- 수정: package.json (legacy-state-adapter.test.js 등록)
"@

$desc2 = @"
[WIN-044] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 정상
- npm run test:phase2:common:compiled — node:test 게이트 실행
- 신규 legacy-state-adapter.test.ts — 10 tests:
  resolver(4):
  1. OMX_STATE_DIR 명시 지정 우선
  2. cwd/.omx/state fallback
  3. userData/legacy-state-link fallback
  4. 모두 미존재 시 null 반환
  adapter(6):
  5. readState — 유효 JSON 파싱 성공
  6. readState — 무효 JSON 은 null + parse-fail 로그
  7. readState — 잘못된 이름(../etc/passwd, a/b, 빈문자열) 거부
  8. listActiveStates — *.json 만 ASC 정렬, .txt/잘못된 JSON skip
  9. writeState/deleteState — LegacyStateReadOnlyError throw
  10. symlink 탈출 — readState 는 LegacyStateEscapeError throw, listActiveStates 는 skip (Windows 권한 부재 시 t.skip)
- 기존 ipc-contract.test.ts 회귀: 'accepts omx_state_status request (spawn)' / 'rejects omx_state_status when OMX_DESKTOP_ALLOW_EXEC=false' 모두 무변 통과
- 보안 정책 검증: 파일명 정규식 / realpath prefix 검사 / 쓰기 메서드 throw / 탈출 시 throw

[결과]
- 총 122 tests / 105 pass / 0 fail / 17 skipped, duration≈6.3s
- 베이스라인 (WIN-043 완료 시점) : 112 / 96 / 0 / 16 → 본 티켓 +10 (9 PASS + symlink 1 SKIP — Windows 비-관리자 환경)
- DoD 핵심 항목 모두 충족: legacy 인식 / 쓰기 시도 거부 / omx_state_status 응답 source 구분 / symlink 탈출 거부 / test:phase2:windows:compiled 무영향
"@

$desc3 = @"
[WIN-044] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT 체크리스트 5/6 마감 ([x] legacy-state-resolver.ts 3단계 탐색 / legacy-state-adapter.ts read-only API / omx_state_status 응답 source 구분 / allowedCwdRoots 정책 갱신 + 주석 / legacy-state-adapter.test.ts 탐색·read-only·symlink 탈출). 매뉴얼 §6 'CLI 와의 상태 공유' 절은 정책상 미체크 유지.
- allowedCwdRoots 정책: legacy 경로는 read-only intent 이므로 transport 의 cwd 로 사용되지 않도록 의도적으로 추가하지 않음 — desktop/main/index.ts 의 LocalProcessTransport/PtyLocalTransport 등록부에 정책 주석으로 명시.
- 데스크탑 앱의 신규 상태 쓰기 경로는 %APPDATA%/oh-my-codex/state/ 로 일원화 — legacy 경로는 항상 read-only.
- 후속: UI 배너 'CLI 와 공유 중인 상태 N개 (read-only)' / 매뉴얼 §6 표는 별도 미니티켓에서 처리.
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 / Taiga)
- 티켓 'Taiga 등록 내역' 블록을 '완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-44 / Tasks 구현/검증/문서·정합성 PATCH 완료' 로 갱신

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase5-tickets.md (WIN-044 체크리스트 5/6 + Taiga 블록 갱신)
- 신규: winapp만들기/stage2/result/작업내역-W044.md
- 신규: winapp만들기/stage2/scripts/register-w044.ps1
- 수정: package.json (legacy-state-adapter.test.js 등록)
- 수정: desktop/main/index.ts (bootstrapLegacyState + allowedCwdRoots 정책 주석)
- 수정: desktop/ipc/commands.ts (LegacyStateBackend 후크 + omx_state_status 응답 확장)
"@

$descMap = @{
  ($taskIds[0]) = $desc1
  ($taskIds[1]) = $desc2
  ($taskIds[2]) = $desc3
}

foreach($id in $taskIds){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  $payload = @{ description = $descMap[$id]; version = $t.version }
  $json = $payload | ConvertTo-Json -Depth 4
  $bytes=[System.Text.Encoding]::UTF8.GetBytes($json)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

Write-Host "---SUMMARY---"
Write-Host "SPRINT_ID=$sprintId US_ID=$($us.id) US_REF=$($us.ref) TASK_IDS=$($taskIds -join ',')"
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
foreach($id in $taskIds){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id ref=$($t.ref) v$($t.version) descLen=$($t.description.Length)"
}
