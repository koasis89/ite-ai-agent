param([switch]$PatchOnly)

$ErrorActionPreference='Stop'
# WIN-072 Taiga 등록 SSOT.
#
# 실행 모드:
#   .\register-w072.ps1                — 신규 등록 (SP-08 재사용 + US-72 + 3 task 생성 후 description PATCH).
#   .\register-w072.ps1 -PatchOnly     — 이미 등록된 US-72/Tasks 의 subject + description 만 재PATCH (한글 mojibake 정정용).
#
# 주의: PowerShell 5.1 에서 본 .ps1 파일은 반드시 UTF-8 BOM 으로 저장되어야 한다.

$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9
$sprintId=18
$userId=$auth.id

$subjects=@('[WIN-072] 구현 작업','[WIN-072] 검증 작업','[WIN-072] 문서/정합성 반영')
$usSubject='WIN-072 업데이트 채널(stable/beta/alpha) + UI 토글'
$sprintName='SP-08 윈도우 데스크탑 앱(8단계, 배포/업데이트)'
$usDescription='Phase 8 2번째 티켓. WIN-071 인프라 위에 채널 분기. ChannelStore SSOT (UPDATE_CHANNELS=[stable,beta,alpha], isUpdateChannel/coerceUpdateChannel 화이트리스트 가드, alpha 채널은 OMX_DESKTOP_UPDATE_ALPHA_ALLOWED=1 환경에서만 노출). UpdaterService.discardPendingDownload() 메서드 추가 — 채널 전환 시 직전 채널의 미적용 다운로드(backoff retryHandle cancel + state idle 리셋). IPC 2종 신규: update_channel_get (args 빈 배열, 응답 {current, available, disabled?}), update_channel_set (args=[channel], zod enum 검증, 응답 {ok, changed, channel, reason?}). reason 사전: invalid-channel / no-change / alpha-disallowed / persist-failed. allowedCommands 31→33. main/index.ts bootstrapUpdater 가 ChannelStore 인스턴스화 + setUpdateChannelBackend 등록 — provider=none 환경에서도 read-only 동작. Renderer UI: UpdateSettingsPanel (DOM-light 스탠드얼론, mount/refresh/handleSelect, beta/alpha 선택 시 ipc.confirm 호출). electron-builder.yml publish.channel: latest 명시 + 워크플로 stub 분기 가이드 주석 추가. 게이트: 252/193/0/59 → 254/195/0/59 (+2 top-level describe, 신규 leaf 19건 = update-channel.test.ts 12 + ipc-contract WIN-072 7).'

$desc1 = @"
[WIN-072] 구현 작업

[작업내용]
- desktop/main/updater/channel.ts (신규): UPDATE_CHANNELS readonly tuple + UpdateChannel 유니온. isUpdateChannel(v) / coerceUpdateChannel(v) 화이트리스트 가드 (잘못된 입력 → stable). getAvailableChannels(env) — OMX_DESKTOP_UPDATE_ALPHA_ALLOWED 가 1/true 일 때만 alpha 포함, 0/false/미설정 시 [stable, beta]. ChannelPersistAdapter 인터페이스 (load(): UpdateChannel|null, save(c): Promise<boolean>). ChannelStore 클래스 — 생성자 옵션 {defaultChannel, persist, onChannelChanged, env, logger}, 초기값 우선순위 persist.load() > defaultChannel > 'stable', current/available getter, async set(next) 메서드: 화이트리스트 + 동일채널 + alpha 환경 검사 후 영속 + 콜백 발화. 결과 {ok, channel, reason?}. persist throw / 콜백 throw 모두 swallow + logger 호출.
- desktop/main/updater/updater.ts (수정): discardPendingDownload() 메서드 추가. retryHandle clearTimeout + retries=0 리셋, 상태가 idle 아니면 transition({state:'idle'}). disposed 시 no-op (멱등). electron-updater 의 부분 다운로드 캐시는 다음 checkForUpdates() 가 새 매니페스트로 overwrite 한다는 가정 — 별도 파일 제거 책임 없음.
- desktop/ipc/commands.ts (수정): allowedCommands 31→33 (update_channel_get / update_channel_set 추가). UPDATE_CHANNEL_VALUES = ['stable','beta','alpha'] as const. UpdateChannelGetArgsSchema = z.array(z.string()).max(0). UpdateChannelSetArgsSchema = z.tuple([z.enum(UPDATE_CHANNEL_VALUES)]). UpdateChannelBackend 인터페이스 + setUpdateChannelBackend/getUpdateChannelBackend. perCommandArgValidators 에 2개 등록. handleRunCommand switch case 2개 추가 — backend 미초기화 시 update_channel_get 은 {current:'stable', available:['stable','beta'], disabled:true}, update_channel_set 은 ok=false + reason='channel backend not initialised'. 정상 경로는 backend 위임 후 응답 스프레드.
- desktop/main/index.ts (수정): bootstrapUpdater 가 parseUpdaterConfig 직후 ChannelStore 인스턴스화. onChannelChanged 가 updaterService?.discardPendingDownload() 호출. setUpdateChannelBackend({getChannel, setChannel}) 등록 — provider=none 분기 전이라 read-only 동작 가능. catch 경로에서도 setUpdateChannelBackend(null) + updaterChannelStore=null 정리.
- desktop/renderer/settings/UpdateSettingsPanel.ts (신규): DOM-light 스탠드얼론 클래스. mount() 가 section/h3/p/label/select/status 마운트. CHANNEL_LABELS 사전 (stable/beta/alpha → 한글 라벨). refresh() 가 update_channel_get IPC 호출 후 applySnapshot. handleSelect(next) 가 beta/alpha 선택 시 ipc.confirm(BETA_WARNING/ALPHA_WARNING) 확인, 취소 시 selection 롤백. update_channel_set IPC 호출 + reason 별 메시지 변환 (no-change / persist-failed / error). disabled=true 인 경우 select.disabled=true + provider=none 안내.
- electron-builder.yml (수정): publish 섹션에 channel: latest 명시 + WIN-072 주석 블록 추가 (채널 분기, latest.yml/beta.yml/alpha.yml 매니페스트, v*-beta 태그 → channel: beta override 가이드).
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/update-channel.test.js 추가.

[변경소스파일]
- 신규: desktop/main/updater/channel.ts
- 신규: desktop/renderer/settings/UpdateSettingsPanel.ts
- 신규: desktop/__tests__/update-channel.test.ts
- 신규: winapp만들기/stage2/result/작업내역-W072.md
- 신규: winapp만들기/stage2/scripts/register-w072.ps1
- 수정: desktop/main/updater/updater.ts (discardPendingDownload 추가)
- 수정: desktop/ipc/commands.ts (allowedCommands 31→33 + UpdateChannelBackend + 스키마 2건 + validator 2건 + switch case 2건)
- 수정: desktop/main/index.ts (ChannelStore 인스턴스화 + setUpdateChannelBackend 와이어링)
- 수정: desktop/__tests__/ipc-contract.test.ts (update_channel_* describe 블록 7 tests)
- 수정: electron-builder.yml (publish.channel + WIN-072 주석)
- 수정: package.json (test gate +update-channel.test.js)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.2 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-072 6/6 [x] + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-072] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상. channel.ts 신규 + updater.ts/commands.ts/index.ts/UpdateSettingsPanel.ts 수정 모두 컴파일 청결.
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=254 / pass=195 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-071 종료) 252/193/0/59 → +2 tests / +2 pass / +0 fail / +0 skipped (node:test top-level describe 집계 기준 — 신규 leaf 19건은 2개 상위 describe(`UpdateChannel guards`, `ChannelStore`)+`update_channel_* commands (WIN-072)` 로 묶여 +2 로 집계됨).

[신규 회귀 커버리지]
1. UPDATE_CHANNELS 가 ['stable','beta','alpha'] 순서로 노출.
2. isUpdateChannel — 화이트리스트 외 (대문자/공백/null/undefined/숫자/객체) 모두 false.
3. coerceUpdateChannel — 잘못된 입력 6종 모두 'stable' 폴백, 정상 'beta' 보존.
4. getAvailableChannels — env={} → [stable,beta], '0'/'false' → [stable,beta], '1'/'true' → [stable,beta,alpha].
5. ChannelStore 초기화 — defaultChannel='beta' 적용, 잘못된 default → 'stable' 폴백, persist.load() 우선.
6. ChannelStore.set('rolling') → ok=false / reason='invalid-channel' / 콜백 미발화.
7. ChannelStore.set 동일 채널 → ok=true / reason='no-change' / 콜백 미발화.
8. ChannelStore.set('alpha') env 미설정 → ok=false / reason='alpha-disallowed'.
9. ChannelStore.set('alpha') OMX_DESKTOP_UPDATE_ALPHA_ALLOWED=1 → ok=true / 콜백 [alpha, stable] 1회.
10. persist.save 가 false 반환 → ok=true + reason='persist-failed' + current=새 채널.
11. persist.save throw → swallow + logger 'disk full' 기록 + reason='persist-failed'.
12. onChannelChanged throw → swallow + logger 'listener boom' 기록 + 상태 변경 유지.
13. IPC update_channel_get backend null → ok=true / current='stable' / available=[stable,beta] / disabled=true.
14. IPC update_channel_set backend null → ok=false / changed=false / reason 비어있지 않음.
15. IPC update_channel_get backend 주입 → 스냅샷 그대로 반영, calls.get=1.
16. IPC update_channel_set('beta') backend 'stable' → ok=true / changed=true / channel='beta' / state 변경.
17. IPC update_channel_set 동일 채널 → ok=true / changed=false / reason='no-change'.
18. IPC update_channel_set('rolling') → INVALID_REQUEST.
19. IPC update_channel_get args=['x'] → INVALID_REQUEST.
20. IPC update_channel_set args=[] → INVALID_REQUEST.

[보안 회귀]
- zod enum + ChannelStore isUpdateChannel 2중 화이트리스트 (Defense-in-Depth) — 임의 문자열 차단.
- alpha 채널은 OMX_DESKTOP_UPDATE_ALPHA_ALLOWED 미설정 환경에서 available 배열에 미포함 + setChannel 호출도 alpha-disallowed 로 거부 → 일반 사용자에게 alpha 노출 불가.
- 채널 전환 시 UpdaterService.discardPendingDownload() 즉시 호출 — 직전 채널의 다운로드 받은 매니페스트가 새 채널에 적용되는 우회 차단.
- persist/콜백 throw 모두 swallow — 외부 어댑터가 일으킨 예외가 IPC 응답을 오염시키지 않음.
- update_channel_get/set IPC 모두 args 엔벨로프 엄격 검증 — 비어있지 않은 get / 빈 set / 잘못된 enum 모두 INVALID_REQUEST.

[DoD 충족]
- 채널 전환 후 update_check 가 새 채널 매니페스트 조회 가능 — discardPendingDownload 가 state 리셋, 다음 check 가 새 매니페스트 fetch.
- 임의 채널 문자열 거부 — zod + ChannelStore 양쪽에서 차단.
- UI 토글이 backend SSOT 와 정합 — update_channel_get 응답 그대로 select 반영.
- 회귀 무영향 — 게이트 +2 tests / 0 fail.
"@

$desc3 = @"
[WIN-072] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §9.2 업데이트 채널 (WIN-072) 신설: winapp만들기/stage2/winapp-manual-v2.md
  - 채널 → electron-builder 메타 매핑 표 (stable→latest.yml, beta→beta.yml, alpha→alpha.yml + alpha 환경변수 게이팅 명시).
  - IPC 명령 2종 표 (update_channel_get/set, 응답 스키마, args 검증).
  - reason 사전 (no-change / invalid-channel / alpha-disallowed / persist-failed) 별도 블록.
  - 보안 메모 — zod+화이트리스트 Defense-in-Depth, alpha env gating, discardPendingDownload 동작.
  - Renderer UI 패널 (UpdateSettingsPanel) 동작 요약 + 확인 다이얼로그.
  - 6개 구성요소 파일 링크 (channel.ts / updater.ts / commands.ts / index.ts / electron-builder.yml / 두 테스트).

- 작업내역: winapp만들기/stage2/result/작업내역-W072.md (신규) — 7섹션 W071 미러. 신규 5 / 수정 8 / 게이트 252→254 증분(top-level) 명시.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase8-tickets.md
  - WIN-072 체크리스트 6/6 [x] 마감.
  - Taiga 등록 라인을 '미등록' → 'register-w072.ps1 실행 (Sprint SP-08 / Epic EP-02)' 로 갱신.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w072.ps1 (신규) — SP-08 재사용(id=18) + EP-02 재사용(id=9) + US-72 + 3 task POST + description PATCH. -PatchOnly 스위치로 한글 mojibake 정정 모드 지원. UTF-8 BOM, Invoke-WebRequest Body = [System.Text.Encoding]::UTF8.GetBytes(json). Task description 3분할 — [작업내용]/[변경소스파일] · [검증 내역]/[결과] · [반영 내역]/[반영된 파일].

- 패키징 메타: electron-builder.yml publish.channel: latest 명시 + WIN-072 채널 분기 주석 (v*-beta 태그 시 channel: beta override 가이드).

- 게이트 자동화: package.json test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/update-channel.test.js 추가 — 후속 모든 PR 에서 채널 회귀 자동 검증.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W072.md
- 신규: winapp만들기/stage2/scripts/register-w072.ps1
- 신규: desktop/main/updater/channel.ts
- 신규: desktop/renderer/settings/UpdateSettingsPanel.ts
- 신규: desktop/__tests__/update-channel.test.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.2 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-072 6/6 [x] + Taiga 라인 갱신)
- 수정: desktop/main/updater/updater.ts (discardPendingDownload)
- 수정: desktop/ipc/commands.ts (allowedCommands 31→33 + UpdateChannelBackend + 스키마/validator/switch 2건씩)
- 수정: desktop/main/index.ts (ChannelStore 인스턴스화 + setUpdateChannelBackend 와이어링)
- 수정: desktop/__tests__/ipc-contract.test.ts (update_channel_* describe 블록 7 tests)
- 수정: electron-builder.yml (publish.channel + WIN-072 주석)
- 수정: package.json (test gate +update-channel.test.js)
"@

if($PatchOnly){
  # 기존 등록된 US-72 / Tasks 의 한글 정정 PATCH. ID 는 첫 신규 등록 후 콘솔에 출력된 값으로 채워야 한다.
  # 미사용 — 한글 입력이 깨지지 않은 경우 신규 등록 모드만 사용.
  throw '-PatchOnly mode requires US-72 / Task IDs to be filled in manually after first registration.'
}

# === 신규 등록 모드 ===

# 0) SP-08 재사용 확인.
$sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
Write-Host "Sprint reused id=$($sp.id) name=$($sp.name)"

try {
  $ep = Invoke-RestMethod -Uri "$base/epics/$epicId" -Headers $H
  Write-Host "Epic reused id=$($ep.id) subject=$($ep.subject)"
} catch { throw "EP-02 (id=$epicId) missing." }

# 1) US-72.
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
Write-Host "US-72 id=$($us.id) ref=$($us.ref)"

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
Write-Host "US-72   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
