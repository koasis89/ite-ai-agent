param([switch]$PatchOnly)

$ErrorActionPreference='Stop'
# WIN-071 Taiga 등록 SSOT.
#
# 실행 모드:
#   .\register-w071.ps1                — 신규 등록 (SP-08 생성/재사용 + US-71 + 3 task 생성 후 description PATCH).
#   .\register-w071.ps1 -PatchOnly     — 이미 등록된 SP-08/US-71/Tasks 의 subject + description 만 재PATCH (한글 mojibake 정정용).
#
# 주의: PowerShell 5.1 에서 본 .ps1 파일은 반드시 UTF-8 BOM 으로 저장되어야 한다.
# Get-Content -Raw 가 cp949 로 잘못 디코딩하지 않도록 BOM 이 필수.

$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9
$userId=$auth.id

$subjects=@('[WIN-071] 구현 작업','[WIN-071] 검증 작업','[WIN-071] 문서/정합성 반영')
$usSubject='WIN-071 electron-updater 통합 (GitHub Releases / private feed)'
$sprintName='SP-08 윈도우 데스크탑 앱(8단계, 배포/업데이트)'
$usDescription='Phase 8 첫 티켓. electron-updater 위에 좁은 UpdaterAdapter 추상화 + UpdaterService 상태 머신(idle→checking→available→downloading→downloaded→error). update_check / update_status / update_apply_on_restart IPC 3종 신규 (allowedCommands 28→31). electron-builder publish(github, publishAutoUpdate=true) + desktop:publish 스크립트 + desktop-publish.yml 워크플로 stub. parseUpdaterConfig 가 env(OMX_DESKTOP_UPDATE_PROVIDER) > config > github 기본 우선순위, generic provider https 강제, intervalMs 5분..24h 클램프. UpdaterService 부트 1회 + 6h 주기 자동 확인 + 다운로드 실패 시 1s/2s/4s 지수 백오프(최대 3회). 진행률은 command.progress(commandId=updater) 채널로 발행. electron-updater 모듈은 Function 기반 동적 import 로 TS module resolution 우회 (optionalDependency). 게이트: 249/190/0/59 → 252/193/0/59 (+3/+3/+0/+0, node:test top-level 집계 기준 — 신규 leaf 24건은 4개 상위 describe 로 묶임).'

$desc1 = @"
[WIN-071] 구현 작업

[작업내용]
- desktop/main/updater/types.ts (신규): UpdaterState union, UpdaterProvider union, UpdateInfo / UpdateProgressDetail / UpdaterStatus 도메인 타입, UpdaterAdapter 인터페이스 (checkForUpdates / downloadUpdate / quitAndInstall + onProgress / onDownloaded / onError — 모두 dispose 함수 반환), UpdaterRuntimeConfig.
- desktop/main/updater/config.ts (신규): parseUpdaterConfig({env?, configBlock?}) → {config, warnings}. env(OMX_DESKTOP_UPDATE_PROVIDER) > config > 'github' 우선순위. isHttpsUrl() 로 generic provider URL 검증 — https 외 거부. generic + 비-https → 'none' 폴백 + warning. intervalMs 5분..24h 클램프 (기본 6h). channel stable/beta/alpha 외 입력은 stable 폴백.
- desktop/main/updater/null-adapter.ts (신규): NullUpdaterAdapter — 모든 메서드 no-op, 구독은 () => {} 반환. provider='none' 또는 electron-updater 미설치 시 fallback.
- desktop/main/updater/updater.ts (신규, ~330 라인): UpdaterService 상태 머신 + 자동 다운로드 + exponential backoff(1s/2s/4s, maxRetries=3). check/getStatus/applyOnRestart/start/dispose. provider='none' check → 즉시 {available:false} + idle. publishProgress 콜백으로 EventBus 결합 회피. autoCheck=true + start() → 부트 1회 + intervalMs 주기. setTimeoutFn/clearTimeoutFn 주입으로 테스트 결정성 확보. dispose() 가 모든 타이머/구독 해제. transition() 이 idle 진입 시 잔여 정보 초기화.
- desktop/main/updater/electron-updater-adapter.ts (신규): createElectronUpdaterAdapter 비동기 팩토리. loadElectronUpdaterModule() 이 new Function('m','return import(m)') 패턴으로 TS module resolution 우회 → electron-updater 미설치 환경에서도 빌드/테스트 통과. 모듈 로드 실패 시 NullUpdaterAdapter 폴백. autoDownload=false (UpdaterService 가 트리거 책임). allowPrerelease = channel !== 'stable'. generic provider 시 setFeedURL. 'download-progress'/'update-downloaded'/'error' 이벤트 → onProgress/onDownloaded/onError 위임, au.off() disposer 반환.
- desktop/ipc/commands.ts (수정): allowedCommands 28 → 31. UpdaterBackendStatus + UpdaterBackend 인터페이스 + setUpdaterBackend/getUpdaterBackend. UpdateNoArgsSchema = z.array(z.string()).max(0) — 3종 모두 args 빈 배열만 허용. perCommandArgValidators 3개 등록. handleRunCommand switch case 3개 추가 — backend 없을 때 disabled/idle/ok=false 폴백, 있을 때 메서드 위임.
- desktop/main/index.ts (수정): bootstrapUpdater() 추가. configStore.updater 블록 + env → parseUpdaterConfig. provider='none' 이면 setUpdaterBackend(null). 아니면 createElectronUpdaterAdapter → UpdaterService 인스턴스화 → publishProgress 콜백으로 eventBus.publish({type:'command.progress', commandId:'updater', detail:{stream:'updater', chunk:JSON.stringify(detail)}}). setUpdaterBackend + service.start(). app.whenReady() chain 끝에 추가.
- electron-builder.yml (수정): publish 섹션 신규 — github / owner=Yeachan-Heo / repo=oh-my-codex / publishAutoUpdate=true / releaseType=release.
- package.json (수정): scripts.desktop:publish 추가. optionalDependencies.electron-updater: ^6.3.9 추가. test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/updater.test.js 추가.
- .github/workflows/desktop-publish.yml (신규): workflow_dispatch 전용 stub. windows-latest, Node 20, npm ci, npm run desktop:publish, GH_TOKEN secret.
- desktop/__tests__/ipc-contract.test.ts (수정): setUpdaterBackend / UpdaterBackend import + update_* describe 블록 신규 — 9 tests (backend 미초기화 3 + mock backend 위임 3 + arg 검증 3).
- desktop/__tests__/updater.test.ts (신규): createMockAdapter / createSyncTimer 헬퍼. parseUpdaterConfig 7 tests + isHttpsUrl 1 + NullUpdaterAdapter 1 + UpdaterService 6 = 총 15 tests.

[변경소스파일]
- 신규: desktop/main/updater/types.ts
- 신규: desktop/main/updater/config.ts
- 신규: desktop/main/updater/null-adapter.ts
- 신규: desktop/main/updater/updater.ts
- 신규: desktop/main/updater/electron-updater-adapter.ts
- 신규: desktop/__tests__/updater.test.ts
- 신규: .github/workflows/desktop-publish.yml
- 신규: winapp만들기/stage2/result/작업내역-W071.md
- 신규: winapp만들기/stage2/scripts/register-w071.ps1
- 수정: desktop/ipc/commands.ts (allowedCommands 28→31 + UpdaterBackend + UpdateNoArgsSchema + validator 3건 + switch case 3건)
- 수정: desktop/main/index.ts (bootstrapUpdater + setUpdaterBackend 와이어링)
- 수정: electron-builder.yml (publish 섹션)
- 수정: package.json (desktop:publish + electron-updater optionalDep + test gate +updater.test.js)
- 수정: desktop/__tests__/ipc-contract.test.ts (update_* describe 블록)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9 신설 + §9.1 + 기존 §9 → §10)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-071 6/6 [x] + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-071] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상. updater/*.ts 5개 신규 모듈 모두 컴파일 청결.
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=252 / pass=193 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-064 종료) 249/190/0/59 → +3 tests / +3 pass / +0 fail / +0 skipped (node:test top-level describe 집계 기준 — 신규 leaf 24건은 4개 상위 describe 로 묶여 +3 으로 집계됨).

[신규 회귀 커버리지]
1. parseUpdaterConfig 기본값 (provider='github', autoCheck=true, intervalMs=6h, channel='stable', warnings=[]).
2. env OMX_DESKTOP_UPDATE_PROVIDER='none' → provider='none' + autoCheck 강제 false.
3. env 가 configBlock.provider 보다 우선.
4. generic + http URL → 'none' 폴백 + warning '/https/' 매치.
5. generic + https URL 정상 수용.
6. intervalMs 5분 미만 / 24h 초과 클램프, 10분 그대로 통과.
7. channel='edge' → 'stable' 폴백 + warning 1건.
8. isHttpsUrl — https/http/file/빈문자/undefined/'not a url' 6 case.
9. NullUpdaterAdapter — checkForUpdates=null, downloadUpdate/quitAndInstall no-op, 3 구독 모두 함수 반환.
10. UpdaterService provider='none' → check {available:false}, state 'idle' 유지.
11. UpdaterService 해피패스 — check → available → microtask yield 후 download 호출 → fireProgress(42%) → state='downloading' + progress.percent=42 → fireDownloaded → state='downloaded' + version 보존. publishProgress 가 checking/available/downloading(42%)/downloaded(100%) 모두 발행.
12. applyOnRestart 상태 가드 — 'downloaded' 외에서는 ok=false / error '/downloaded/' 매치, quit=0. fireDownloaded 후 ok=true + quit=1.
13. exponential backoff 4사이클 — 1차 실패 → timer pending=1, runAll 후 download=2. 2/3차 동일 (download=3, 4). 4차 실패 → state='error', error='net fail final'.
14. dispose 후 timer pending=0 + 이벤트 발화 무시 (상태 변경 없음).
15. autoCheck=false + start() → timer pending=0 (no-op).
16. downloading 중 재 check() — 두번째 호출은 현재 스냅샷 반환, checkForUpdates 추가 호출 없음 (calls.check=1).
17. IPC update_check backend 없음 → ok=true / available=false / disabled=true.
18. IPC update_status backend 없음 → ok=true / state='idle' / disabled=true.
19. IPC update_apply_on_restart backend 없음 → ok=false / applied=false / reason 비어있지 않음.
20. IPC mock backend 주입 — check available=true + version='9.9.9' + downloadSize=1024, getStatus state='downloaded' + version='9.9.9', apply applied=true.
21. IPC update_check args=['bogus'] → INVALID_REQUEST.
22. IPC update_status args=['x'] → INVALID_REQUEST.
23. IPC update_apply_on_restart args=['y'] → INVALID_REQUEST.

[보안 회귀]
- generic + http/file/data URL 거부 (isHttpsUrl + parseUpdaterConfig 자동 'none' 폴백).
- intervalMs DoS 방어 (5분 미만 거부, 1ms → 5분으로 클램프).
- env 강제 비활성 (OMX_DESKTOP_UPDATE_PROVIDER=none) — IPC 전부 idle.
- update_* IPC 모두 args 빈 배열 강제 — 토큰/경로 등 사용자 입력 미수용.
- applyOnRestart state='downloaded' 가드 — quitAndInstall() 임의 호출 차단.
- electron-updater 동적 import 실패 시 NullUpdaterAdapter 폴백 — 모듈 미설치 환경 폭주 없음.
- 매니페스트 서명 검증은 electron-updater 가 수행 (latest.yml + blockmap 무결성).

[DoD 충족]
- 모의 provider 흐름(생성 → 발견 → 다운로드 → 완료 → 적용)이 자동 테스트로 동작 OK.
- OMX_DESKTOP_UPDATE_PROVIDER=none 시 IPC 모두 idle 반환 OK.
- https 외 URL 거부 OK.
- 회귀 무영향 (게이트 +3 tests / 0 fail) OK.
"@

$desc3 = @"
[WIN-071] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §9 배포 / 업데이트 / 진단 신설 + §9.1 자동 업데이트(WIN-071): winapp만들기/stage2/winapp-manual-v2.md
  - 흐름 5단계 (부트1회+6h 주기 → checking → available → downloading(progress) → downloaded → applyOnRestart).
  - IPC 3종 표 (update_check/status/apply_on_restart, args 빈 배열, 응답 스키마).
  - 런타임 제어 — OMX_DESKTOP_UPDATE_PROVIDER env, ConfigStore updater 블록, generic https 강제, intervalMs 클램프.
  - 보안 메모 — electron-updater 매니페스트 서명, GitHub Releases latest.yml/blockmap, 사용자 입력 미사용.
  - 11개 구성요소 파일 링크 (updater.ts / types.ts / config.ts / electron-updater-adapter.ts / null-adapter.ts / index.ts / commands.ts / electron-builder.yml / package.json / desktop-publish.yml / 두 테스트).
  - 기존 §9 참고 섹션을 §10 으로 재배치.

- 작업내역: winapp만들기/stage2/result/작업내역-W071.md (신규) — 7섹션 W064 미러. 신규 9 / 변경 7 / 게이트 249→252 증분(top-level) 명시.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase8-tickets.md
  - WIN-071 체크리스트 6/6 [x] 마감.
  - Taiga 등록 라인을 '미등록' → 'register-w071.ps1 실행 (Sprint SP-08 / Epic EP-02)' 로 갱신.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w071.ps1 (신규) — SP-08 신규 생성/재사용 + EP-02 재사용(id=9) + US-71 + 3 task POST + description PATCH. -PatchOnly 스위치로 한글 mojibake 정정 모드 지원. BOM-free Invoke-WebRequest, UTF-8. Task description 3분할 — [작업내용]/[변경소스파일] · [검증 내역]/[결과] · [반영 내역]/[반영된 파일].

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W071.md
- 신규: winapp만들기/stage2/scripts/register-w071.ps1
- 신규: desktop/main/updater/types.ts
- 신규: desktop/main/updater/config.ts
- 신규: desktop/main/updater/null-adapter.ts
- 신규: desktop/main/updater/updater.ts
- 신규: desktop/main/updater/electron-updater-adapter.ts
- 신규: desktop/__tests__/updater.test.ts
- 신규: .github/workflows/desktop-publish.yml
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9 신설 + §9.1 + 기존 §9 → §10)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-071 6/6 [x] + Taiga 라인 갱신)
- 수정: desktop/ipc/commands.ts (allowedCommands 28→31 + UpdaterBackend + UpdateNoArgsSchema + validator + switch case)
- 수정: desktop/main/index.ts (bootstrapUpdater + setUpdaterBackend 와이어링)
- 수정: electron-builder.yml (publish 섹션)
- 수정: package.json (desktop:publish + electron-updater optionalDep + test gate +updater.test.js)
- 수정: desktop/__tests__/ipc-contract.test.ts (update_* describe 블록)
"@

if($PatchOnly){
  # 기존 등록된 SP-08(id=18) / US-71(id=58) / Tasks(155,156,157) 의 한글 정정 PATCH 만 수행.
  $sprintId=18; $usId=58; $taskIds=@(155,156,157)

  $sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
  $spPayload = @{ name=$sprintName; estimated_start=$sp.estimated_start; estimated_finish=$sp.estimated_finish } | ConvertTo-Json
  $spBytes=[System.Text.Encoding]::UTF8.GetBytes($spPayload)
  $resp = Invoke-WebRequest -Uri "$base/milestones/$sprintId" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $spBytes -UseBasicParsing
  Write-Host "PATCH sprint $sprintId -> $($resp.StatusCode)"

  $usCur = Invoke-RestMethod -Uri "$base/userstories/$usId" -Headers $H
  $usPayload = @{ subject=$usSubject; description=$usDescription; version=$usCur.version } | ConvertTo-Json -Depth 4
  $usBytes=[System.Text.Encoding]::UTF8.GetBytes($usPayload)
  $resp = Invoke-WebRequest -Uri "$base/userstories/$usId" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
  Write-Host "PATCH US $usId -> $($resp.StatusCode)"

  $descs=@($desc1, $desc2, $desc3)
  for($i=0; $i -lt 3; $i++){
    $id=$taskIds[$i]
    $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
    $payload = @{ subject=$subjects[$i]; description=$descs[$i]; version=$t.version } | ConvertTo-Json -Depth 4
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
    Write-Host "PATCH task $id -> $($resp.StatusCode) (descLen=$($descs[$i].Length))"
  }

  Write-Host ''
  Write-Host '=== PATCH SUMMARY ==='
  Write-Host "Sprint  : SP-08 id=$sprintId"
  Write-Host "US-71   : id=$usId"
  Write-Host "Tasks   : $($taskIds -join ', ')"
  return
}

# === 신규 등록 모드 ===

# 0) SP-08 (없으면 생성).
$ms = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
$sp = $ms | Where-Object { $_.name -like 'SP-08*' } | Select-Object -First 1
if(-not $sp){
  $start = (Get-Date).ToString('yyyy-MM-dd')
  $end = (Get-Date).AddDays(28).ToString('yyyy-MM-dd')
  $spBody = @{
    project=$projectId
    name=$sprintName
    estimated_start=$start
    estimated_finish=$end
  } | ConvertTo-Json
  $spBytes=[System.Text.Encoding]::UTF8.GetBytes($spBody)
  $spResp = Invoke-WebRequest -Uri "$base/milestones" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $spBytes -UseBasicParsing
  $sp = $spResp.Content | ConvertFrom-Json
  Write-Host "Sprint created id=$($sp.id)"
} else {
  Write-Host "Sprint reused id=$($sp.id)"
}
$sprintId=$sp.id

try {
  $ep = Invoke-RestMethod -Uri "$base/epics/$epicId" -Headers $H
  Write-Host "Epic reused id=$($ep.id)"
} catch { throw "EP-02 (id=$epicId) missing." }

# 1) US-71.
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
Write-Host "US-71 id=$($us.id) ref=$($us.ref)"

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
  Write-Host "PATCH task $id -> $($resp.StatusCode)"
}

Write-Host ''
Write-Host '=== SUMMARY ==='
Write-Host "Sprint  : SP-08 id=$sprintId"
Write-Host "Epic    : EP-02 id=$epicId"
Write-Host "US-71   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
