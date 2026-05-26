$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9  # EP-02 (id=9, ref=#148)
$userId=$auth.id

# 1) SP-05 milestone 신규 (없으면 생성).
$ms = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
$sp05 = $ms | Where-Object { $_.name -like 'SP-05*' } | Select-Object -First 1
if(-not $sp05){
  $body = @{
    project=$projectId
    name='SP-05 윈도우 데스크탑 앱(5단계, 영속성/저장소)'
    estimated_start=(Get-Date -Format 'yyyy-MM-dd')
    estimated_finish=(Get-Date).AddDays(14).ToString('yyyy-MM-dd')
  } | ConvertTo-Json
  $bytes=[System.Text.Encoding]::UTF8.GetBytes($body)
  $resp = Invoke-WebRequest -Uri "$base/milestones" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  $sp05 = $resp.Content | ConvertFrom-Json
  Write-Host "SP-05 created id=$($sp05.id)"
} else {
  Write-Host "SP-05 exists id=$($sp05.id)"
}
$sprintId = $sp05.id

# 2) US-41 user story.
$usBody = @{
  project=$projectId
  subject='WIN-041 설정 저장소(config.json) + 마이그레이션 훅'
  description='%APPDATA%/oh-my-codex/config.json 을 단일 진실 공급원으로 정의하고, 스키마 변경 시 자동 마이그레이션이 동작한다.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-41 id=$($us.id) ref=$($us.ref)"

# 3) Epic link.
try {
  $linkBody = @{ epic=$epicId; user_story=$us.id } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/epics/$epicId/related_userstories" -Method Post -Headers $H -ContentType 'application/json' -Body $linkBody | Out-Null
  Write-Host "epic link ok"
} catch { Write-Host "epic-link-warn: $($_.Exception.Message)" }

# 4) Tasks (구현/검증/문서) — 우선 빈 description 으로 생성, 그 다음에 PATCH 로 한글 description 주입.
$taskIds=@()
foreach($tn in @('구현 작업','검증 작업','문서/정합성 반영')){
  $tBody = @{
    project=$projectId
    subject="[WIN-041] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-041] $tn"
}

# ---- WIN-041 descriptions ----
$desc1 = @"
[WIN-041] 구현 작업

[작업내용]
- desktop/main/config/schema.ts (신규): zod 기반 ConfigV1Schema + CONFIG_SCHEMA_VERSION=1 + DEFAULT_CONFIG_V1 + SETTABLE_KEYS 화이트리스트 (ui/transport/exec/telemetry) + isSettableKey 가드. strict() 로 미지 필드 거부.
- desktop/main/config/migrations/index.ts (신규): ConfigMigration 인터페이스, v1Migration(0→1, DEFAULT 반환), PRODUCTION_MIGRATIONS, runMigrationChain(inputVersion, data, migrations, targetVersion) 순차 적용. 다운그레이드/누락/잘못된 +1 단계 모두 throw + 안전 가드 (length+1).
- desktop/main/config/store.ts (신규): ConfigStore — load()/get()/getAll()/set()/getFilePath(). load() 흐름 — ENOENT → migration(0→target) + atomic write; JSON 파싱 실패 → 백업 + 기본값; schemaVersion 누락/미래 버전/스키마 위반 → 백업 + 기본값; 정상 + 구버전 → migrate + 디스크 동기화. atomic write = tmp+rename (크래시 안전). set() 은 SETTABLE_KEYS 검사 + zod 검증 후 디스크 반영.
- desktop/main/index.ts (수정): bootstrapConfigStore() 신설 — app.whenReady 진입 시 가장 먼저 호출, %APPDATA%/oh-my-codex/config.json 적재. 결과는 console.log("[config] loaded vN created=… restored=… migrated=…"). 실패해도 앱은 계속 부팅.
- desktop/__tests__/config-store.test.ts (신규): 17 subtest — SSOT 정합 / 절대경로 검증 / 신규 생성 / 재적재 noop / 손상 JSON 백업 / 스키마 위반 백업 / 미래 버전 백업 / schemaVersion 누락 백업 / load 전 접근 throw / set 정상+재적재 보존 / 화이트리스트 외 키 거부 / 값 검증 실패 거부 / runMigrationChain noop / 다운그레이드 throw / 다음 단계 없음 throw / dry-run v1→v2 (테스트 전용 v2 주입) / PRODUCTION_MIGRATIONS SSOT 회귀.

[변경소스파일]
- 신규: desktop/main/config/schema.ts
- 신규: desktop/main/config/migrations/index.ts
- 신규: desktop/main/config/store.ts
- 신규: desktop/__tests__/config-store.test.ts
- 수정: desktop/main/index.ts (bootstrapConfigStore + app.whenReady 첫 단계 호출 + getConfigStore export)
- 수정: package.json (test:phase2:common:compiled 에 config-store.test.js 추가)
"@

$desc2 = @"
[WIN-041] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러
- npm run test:phase2:common:compiled — node:test 게이트 실행
- 신규 config-store.test.ts 17 subtest:
  1. schema/마이그레이션 SSOT 정합 (CONFIG_SCHEMA_VERSION=1, DEFAULT 일치, SETTABLE_KEYS=4종, PRODUCTION_MIGRATIONS=1단계)
  2. filePath 는 절대경로여야 함 → 상대경로 throw
  3. 파일 없음 → migration(0→1) + 기본값 atomic write + .tmp 잔여 없음
  4. 기존 유효 v1 → 재적재 created=false migrated=[] version=1
  5. 손상 JSON → backup=file.bak.<ts> + 기본값 복원 + 백업 원본 보존
  6. schemaVersion 만 있고 ui 누락 → 백업 + 기본값 복원
  7. 미래 버전 (schemaVersion=99) → 백업 + 기본값 복원
  8. schemaVersion 누락 → 백업 + 기본값 복원
  9. load() 전 get/set 호출 → throw
  10. set('ui', valid) → 디스크 반영 + 재적재 후 보존
  11. set('schemaVersion'|'__proto__') → 'key not allowed' throw (런타임 화이트리스트 보호)
  12. set 값 검증 실패 (theme='neon', fontSize=9999) → 'validation failed' + 기존 값 유지
  13. runMigrationChain target==input → noop
  14. runMigrationChain 다운그레이드 → 'downgrade not supported'
  15. runMigrationChain 다음 단계 없음 → 'no migration from version N'
  16. dry-run v1→v2 (테스트 전용 v2 주입, target=2) → applied=[{1,2}], 디스크에 schemaVersion=2 + ui.density='comfortable', logger 에 'migrated 1->2'
  17. PRODUCTION_MIGRATIONS SSOT 보호 — 항상 from=0 to=1 단일 단계 유지

[결과]
- 총 92/92 PASS (기존 75 + 신규 17), fail=0, skipped=0, duration≈6.1s
- 회귀 무영향: event-bus / history-store / question-broker / hud-view-model / sidecar-view-model / ipc-contract / packaging-config / release-gate / chat-viewmodel / session-store / slash-router / streaming-bridge / transport / local-process-transport / pty-local-transport 전부 변경 없음
- DoD 4항 (첫 실행 v1 자동 생성 / 손상 시 백업+복원 후 부팅 / npm test:phase2 회귀 무영향 / v1→v2 dry-run 마이그레이션 1종) 모두 충족
- atomic write 검증: tmp 잔여 없음 회귀 1종 + 재적재 보존 회귀 1종
- 보안 정책 검증: SETTABLE_KEYS 외부 입력 거부 (schemaVersion / __proto__ 케이스 2종) + zod 거부 (theme enum / fontSize 범위 2종)
"@

$desc3 = @"
[WIN-041] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT 체크리스트 4/5 마감 ([x] ConfigStore + zod 스키마 v1 / atomic write / 마이그레이션 chain runner + 백업 / config-store.test.ts)
- 매뉴얼 §6 "데이터 저장 경로" 신규 섹션은 [ ] 유지 — 사용자 정책상 매뉴얼은 별도 일괄 갱신 (W030/W031/W032/W033/W034 정책 승계)
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 작업 / Taiga 동기화 메모)
- 티켓 'Taiga 등록 내역' 블록을 '완료 (2026-05-23) — Sprint SP-05 / US-41 / Tasks N/N/N description PATCH 완료' 로 갱신
- Phase 5 SP-05 milestone 신규 등록 (EP-02 재사용 — 기존 'EP-02 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4~8)' 가 Phase 5 를 포괄)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase5-tickets.md (WIN-041 체크리스트 + 결과 링크 + Taiga 블록)
- 신규: winapp만들기/stage2/result/작업내역-W041.md
- 수정: package.json (test:phase2:common:compiled 에 config-store.test.js 추가)
- 수정: desktop/main/index.ts (config bootstrap)
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
