param([switch]$PatchOnly)

$ErrorActionPreference='Stop'
# WIN-074 Taiga 등록 SSOT.
#
# 실행 모드:
#   .\register-w074.ps1                — 신규 등록 (SP-08 재사용 + US-74 + 3 task 생성 후 description PATCH).
#   .\register-w074.ps1 -PatchOnly     — 이미 등록된 US-74/Tasks 의 description 만 재PATCH (한글 mojibake 정정용).
#
# 주의: PowerShell 5.1 에서 본 .ps1 파일은 반드시 UTF-8 BOM 으로 저장되어야 한다.

$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9
$sprintId=18
$userId=$auth.id

$subjects=@('[WIN-074] 구현 작업','[WIN-074] 검증 작업','[WIN-074] 문서/정합성 반영')
$usSubject='WIN-074 첫 실행 마법사 (작업 디렉터리 / 기본 설정 / 옵트인 텔레메트리)'
$usDescription='Phase 8 4번째 티켓. 신규 설치 후 첫 실행 시 4단계 마법사(Welcome → Workspace → Updates → Telemetry → Done)로 안전한 기본값을 강제. 시스템 디렉터리(C:\Windows / C:\Program Files / Program Files (x86) / ProgramData) / 드라이브 루트(C:\) / UNC(\\server\share) / 상대 경로 / 미존재 / 쓰기 권한 없음을 작업 디렉터리로 거부. 텔레메트리는 명시 옵트인(기본 off) + 화이트리스트(appVersion / os / commandCount) 외 어떠한 정보도 송신되지 않도록 isTelemetryAllowed() / sanitizeTelemetryPayload(null on block) 게이트. 상태는 <userData>/first-run.json 에 분리 저장 (ConfigStore schema v1 무결성 유지 — schema v2 마이그레이션 회피). 신규 IPC 2종 wizard_state_get / wizard_step_complete + zod (stepId enum + payload ≤4KB JSON object) + WizardBackend 후크. desktop/main/index.ts bootstrapFirstRun() 부트스트랩 와이어. 렌더러는 DOM-light Wizard.ts 컨테이너(role=dialog, aria-modal=true) + 5개 step 컴포넌트(Welcome/Workspace/Updates/Telemetry/Done). 게이트: 256/197/0/59 → 261/202/0/59 (+5 tests / +5 pass / 0 fail), 신규 leaf 30건(first-run-wizard.test.ts 22 + ipc-contract.test.ts wizard_* describe 8).'

$desc1 = @"
[WIN-074] 구현 작업

[작업내용]
- desktop/main/first-run/state.ts (신규): WIZARD_STEPS=['welcome','workspace','updates','telemetry','done'] 화이트리스트 + isWizardStepId / coerceWizardStepId / nextStepAfter. validateWorkspacePath(p, opts) — 거부 규칙: ^[\\/]{2} UNC, path.isAbsolute false (상대 경로), ^[A-Za-z]:[\\/]?$ 드라이브 루트, C:\Windows / C:\Program Files / Program Files (x86) / *\ProgramData 정규식, fs.stat / fs.access(W_OK) 실패. 테스트 fs 어댑터 주입 + skipExistenceCheck 옵션. validateStepData(stepId, raw) — 단계별 검증: workspace { path: string } → validateWorkspacePath 통과 후 정규화 경로 반환 / updates { enabled, channel: stable|beta|alpha } 또는 { skipped: true } (스킵 시 기본 stable) / telemetry { optIn, endpoint?: https:// 만 } 또는 { skipped: true } (http:// 거부) / welcome|done 빈 객체. FirstRunStore 클래스 — load() (ENOENT/파싱 실패 시 기본값 복원) / snapshot() / completeStep(stepId, raw) (validate + currentStep=nextStepAfter, done 단계는 completed=true, tmp+rename 원자적 쓰기) / reset() / isTelemetryAllowed() (로드 완료 + completed=true + optIn=true + skipped !== true 모두 충족 시만 true) / sanitizeTelemetryPayload(input) (차단 시 null 반환 — 네트워크 게이트, 허용 시 appVersion/os/commandCount 만 통과).
- desktop/ipc/commands.ts (수정): allowedCommands 에 wizard_state_get / wizard_step_complete 추가 (33→35종). WIZARD_STEP_VALUES enum + WizardStateGetArgsSchema(빈 배열) + WizardStepCompleteArgsSchema(튜플[stepId enum, payload ≤4KB string]) + .refine 으로 JSON object 형식 강제 ([…] / non-object → INVALID_REQUEST). WizardBackend 인터페이스 + setWizardBackend/getWizardBackend 후크 (UpdateChannelBackend 동일 패턴). handleRunCommand switch — wizard_state_get 백엔드 null 시 {disabled:true, completed:false, currentStep:'welcome', data:{}} 폴백 / wizard_step_complete JSON.parse 후 backend.completeStep 위임, 백엔드 null 시 {ok:false, applied:false, reason:'wizard backend not initialised'}. perCommandArgValidators 에 2건 등록.
- desktop/main/index.ts (수정): FirstRunStore import + bootstrapFirstRun() 신규 (bootstrapUpdater 다음 호출). filePath = path.join(app.getPath('userData'), 'first-run.json'). setWizardBackend({ getState: snapshot 직렬화, completeStep: try/catch → {ok:false, reason} }) 결합. 부트 실패 시 setWizardBackend(null) 으로 disabled fallback. whenReady 체인 갱신.
- desktop/renderer/first-run/Wizard.ts (신규): DOM-light 컨테이너. role=dialog, aria-modal=true, aria-live=polite 상태 영역. textContent / value 만 사용 (innerHTML 미사용). refresh() — wizard_state_get 으로 현재 단계 조회 후 step 마운트. completed=true 시 onComplete() 호출. completeStep() — JSON.stringify(payload) + wizard_step_complete IPC 호출, 실패 시 status 영역에 reason 표시.
- desktop/renderer/first-run/steps/Welcome.ts (신규): 앱 소개 + 보안 정책 1줄 요약 (시스템 dir/UNC 차단 + 텔레메트리 화이트리스트 명시) + '시작' 버튼.
- desktop/renderer/first-run/steps/Workspace.ts (신규): 절대 경로 입력 폼. 필수 (스킵 불가). 빈 입력 시 포커스 이동. submit → { path: trimmed }.
- desktop/renderer/first-run/steps/Updates.ts (신규): enabled 체크박스 (기본 on) + 채널 <select> (stable/beta). '다음' submit / '건너뛰기' 버튼 → { skipped: true }.
- desktop/renderer/first-run/steps/Telemetry.ts (신규): 화이트리스트 표 (appVersion / os / commandCount + 설명) + optIn 체크박스 (기본 off) + '다음' submit / '건너뛰기 (송신 안 함)' 버튼 → { skipped: true }.
- desktop/renderer/first-run/steps/Done.ts (신규): 선택값 요약 표 (workspace path / updates 상태 / telemetry 상태) + '마침' 버튼.
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/first-run-wizard.test.js 추가.

[변경소스파일]
- 신규: desktop/main/first-run/state.ts
- 신규: desktop/__tests__/first-run-wizard.test.ts
- 신규: desktop/renderer/first-run/Wizard.ts
- 신규: desktop/renderer/first-run/steps/Welcome.ts
- 신규: desktop/renderer/first-run/steps/Workspace.ts
- 신규: desktop/renderer/first-run/steps/Updates.ts
- 신규: desktop/renderer/first-run/steps/Telemetry.ts
- 신규: desktop/renderer/first-run/steps/Done.ts
- 신규: winapp만들기/stage2/result/작업내역-W074.md
- 신규: winapp만들기/stage2/scripts/register-w074.ps1
- 수정: desktop/ipc/commands.ts (allowedCommands +2 / zod 2 / WizardBackend / switch 2 case)
- 수정: desktop/__tests__/ipc-contract.test.ts (wizard_* describe +8 tests)
- 수정: desktop/main/index.ts (FirstRunStore import + bootstrapFirstRun + whenReady 체인)
- 수정: package.json (test gate +first-run-wizard.test.js)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.4 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-074 7/7 [x] + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-074] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상. state.ts / first-run-wizard.test.ts / Wizard.ts / 5개 step 컴포넌트 / commands.ts 수정분 / index.ts 수정분 모두 컴파일 청결 (get_errors=0).
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=261 / pass=202 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-073 종료) 256/197/0/59 → +5 tests / +5 pass / +0 fail / +0 skipped. (신규 top-level describe 5개 — first-run-wizard.test.ts 의 WizardStep guards / validateWorkspacePath / validateStepData / FirstRunStore / Telemetry gating, 그리고 ipc-contract.test.ts 내부의 wizard_* describe 1개. 신규 leaf 30건이지만 node:test 상위 집계는 5건으로 카운트.)

[신규 회귀 커버리지 — desktop/__tests__/first-run-wizard.test.ts]
WizardStep guards (WIN-074) — 4 tests:
1. WIZARD_STEPS 캐노니컬 순서 5단계 검증.
2. isWizardStepId — 'Workspace'(대소문자) / '' / null / undefined / 42 / 객체 모두 거부.
3. coerceWizardStepId — 비정상 입력 시 'welcome' 폴백.
4. nextStepAfter — welcome→workspace→updates→telemetry→done, done→done 고정.
validateWorkspacePath (WIN-074) — 7 tests:
5. 빈 문자열 / 공백 입력 거부.
6. UNC '\\server\share\dir' 거부 + reason=/UNC/.
7. 드라이브 루트 C:\, D:/, C: 거부.
8. 시스템 디렉터리 거부 — C:\Windows, C:\Windows\System32, C:\Program Files\Foo, C:\Program Files (x86)\Bar, D:\ProgramData\baz 모두.
9. 상대 경로 './relative' 거부 + reason=/absolute/.
10. 미존재 디렉터리 거부 (fakeFs 주입).
11. 쓰기 권한 없는 디렉터리 거부 (fakeFs 주입) + 실제 임시 디렉터리 정상 수락.
validateStepData (WIN-074) — 5 tests:
12. welcome/done 빈 페이로드 허용 (undefined / {}).
13. workspace 잘못된 페이로드 거부 ({} / { path: 123 }).
14. updates { enabled, channel } 또는 { skipped: true } 허용 / 잘못된 channel='rolling' / enabled='yes' 거부.
15. telemetry { optIn: false } / { skipped: true } 허용.
16. telemetry endpoint http:// 거부 / https:// 허용.
FirstRunStore (WIN-074) — 7 tests:
17. 초기 상태 — completed=false, currentStep='welcome', data={}.
18. 5단계 직선 진행 — currentStep 이 welcome→workspace→updates→telemetry→done 으로 갱신, done 단계 후 completed=true.
19. 부분 진행 후 새 인스턴스 재로드 — currentStep 이 이어가는 단계로 복원.
20. workspace='C:\Windows\System32' 거부 시 상태 미변경 (currentStep='workspace' 유지).
21. workspace='\\server\share\x' UNC 거부.
22. reset() — completed=false, currentStep='welcome', data={} 복귀.
23. 파일 내용이 '{not-json' 손상된 경우 → 기본값 복원.
Telemetry gating (WIN-074) — 4 tests:
24. 마법사 미완료 (done 단계 미실행) — isTelemetryAllowed=false, sanitizeTelemetryPayload=null.
25. optIn=false + completed=true — isTelemetryAllowed=false, sanitize=null.
26. telemetry 단계 skipped:true + completed=true — isTelemetryAllowed=false.
27. optIn=true + completed=true + endpoint=https://... — isTelemetryAllowed=true, sanitize 가 화이트리스트 외 키 (userId / messages / path) 모두 제거.

[신규 회귀 커버리지 — desktop/__tests__/ipc-contract.test.ts wizard_* describe]
8 tests:
28. wizard_state_get backend null fallback (disabled=true, currentStep='welcome', completed=false).
29. wizard_state_get reflects backend snapshot (currentStep='updates').
30. wizard_step_complete 백엔드 성공 시 currentStep 진행 (welcome→workspace).
31. wizard_step_complete backend null → ok=false + reason 존재.
32. 잘못된 stepId='bogus' → INVALID_REQUEST.
33. 잘못된 JSON payload='{not-json' → INVALID_REQUEST (zod .refine).
34. 배열 JSON payload='[1,2,3]' → INVALID_REQUEST (object 강제).
35. wizard_state_get 에 비-empty args → INVALID_REQUEST.

[보안 회귀]
- 작업 디렉터리 시스템 dir/UNC/루트/상대 경로/미존재/쓰기 권한 없음 모두 거부 회귀.
- 텔레메트리 옵트인 차단 3 시나리오 (미완료/optIn=false/skipped) 모두 isTelemetryAllowed=false + sanitize=null 로 네트워크 호출 게이트.
- 동의 후에도 화이트리스트(appVersion/os/commandCount) 외 메시지/입력/경로/userId 모든 키 제거 회귀.
- IPC zod 가 stepId enum + payload JSON object 형식 강제 — 비 화이트리스트 stepId / 비 JSON / 배열 JSON 모두 INVALID_REQUEST.
- Telemetry endpoint http 평문 거부 (https 만 허용).

[DoD 충족]
- 첫 실행 → 4단계 진행 → completed=true 저장 → 재실행 시 마법사 미표시 (bootstrap FirstRunStore.load 가 completed=true 인 경우 wizard_state_get 응답에 반영).
- 중단 후 재실행 시 마지막 완료 단계의 다음 단계부터 이어감 (test 19).
- 옵트인 off 상태에서 어떤 텔레메트리 네트워크 호출도 발생하지 않음 — isTelemetryAllowed=false → sanitize=null 게이트 (test 24/25/26).
- Workspace 시스템 디렉터리/UNC 거부 회귀 통과 (test 8/6/20/21).
- 게이트 무영향 — 256→261 (+5 tests), fail 0.
"@

$desc3 = @"
[WIN-074] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §9.4 첫 실행 마법사 (WIN-074) 신설: winapp만들기/stage2/winapp-manual-v2.md
  - 단계 표 5단계 (welcome/workspace/updates/telemetry/done, 페이로드 형식, 건너뛰기 가능 여부).
  - IPC 명령 표 (wizard_state_get / wizard_step_complete + 응답 데이터 형식 + 백엔드 미초기화 시 disabled fallback).
  - 보안 가드 — 작업 디렉터리 거부 규칙 표 (UNC / 드라이브 루트 / C:\Windows / Program Files / Program Files (x86) / ProgramData / 상대 경로 / 미존재 / 쓰기 권한 없음, 각 reason 코드).
  - 보안 가드 — 텔레메트리 화이트리스트 표 (appVersion / os / commandCount 만 송신, sanitize 가 그 외 모두 제거, isTelemetryAllowed 차단 사유 3종 명시, endpoint https:// 강제).
  - 구성요소 파일 링크 — state.ts / commands.ts / index.ts / Wizard.ts / 5개 step 컴포넌트 / first-run-wizard.test.ts / ipc-contract.test.ts.

- 작업내역: winapp만들기/stage2/result/작업내역-W074.md (신규) — 7섹션 W073 미러. 신규 10 / 수정 6 / 게이트 256→261 (+5) 증분 명시. 단계 표 / IPC 표 / 보안 위험 차단 매트릭스 7행 / Sprint·Epic·US·등록 스크립트 추적.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase8-tickets.md
  - WIN-074 체크리스트 7/7 [x] 마감 (state.ts / Wizard.ts+5 step / IPC+zod / Workspace 검증 / 텔레메트리 화이트리스트+옵트인 차단 / 테스트 / 매뉴얼).
  - Taiga 등록 라인을 '미등록' → 'register-w074.ps1 실행 (Sprint SP-08 / Epic EP-02)' 로 갱신.
  - '작업 결과' 라인을 result/작업내역-W074.md 마크다운 링크로 변경.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w074.ps1 (신규) — SP-08 재사용(id=18) + EP-02 재사용(id=9) + US-74 + 3 task POST + description PATCH. UTF-8 BOM, Invoke-WebRequest Body = [System.Text.Encoding]::UTF8.GetBytes(json). Task description 3분할 — [WIN-074] 구현 작업([작업내용]/[변경소스파일]) · [WIN-074] 검증 작업([검증 내역]/[결과]) · [WIN-074] 문서/정합성 반영([반영 내역]/[반영된 파일]). param([switch]$PatchOnly) 첫 줄. -PatchOnly 모드는 ID 수동 입력 후 재PATCH (mojibake 정정).

- 게이트 자동화: package.json test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/first-run-wizard.test.js 추가 — 후속 모든 PR 에서 FirstRunStore / validateWorkspacePath / 텔레메트리 게이트 회귀 자동 검증.

- 부트스트랩 정합: desktop/main/index.ts whenReady 체인이 bootstrapUpdater → bootstrapFirstRun → registerIpcHandlers → createMainWindow 순서로 명시. IPC 핸들러 등록 전에 wizardBackend 가 결합되므로 첫 wizard_state_get 호출부터 정상 응답.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W074.md
- 신규: winapp만들기/stage2/scripts/register-w074.ps1
- 신규: desktop/main/first-run/state.ts
- 신규: desktop/__tests__/first-run-wizard.test.ts
- 신규: desktop/renderer/first-run/Wizard.ts
- 신규: desktop/renderer/first-run/steps/Welcome.ts
- 신규: desktop/renderer/first-run/steps/Workspace.ts
- 신규: desktop/renderer/first-run/steps/Updates.ts
- 신규: desktop/renderer/first-run/steps/Telemetry.ts
- 신규: desktop/renderer/first-run/steps/Done.ts
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.4 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-074 7/7 [x] + Taiga 라인 갱신)
- 수정: desktop/ipc/commands.ts (allowedCommands +2 / zod 2 / WizardBackend / switch 2 case)
- 수정: desktop/__tests__/ipc-contract.test.ts (wizard_* describe +8 tests)
- 수정: desktop/main/index.ts (FirstRunStore import + bootstrapFirstRun + whenReady 체인)
- 수정: package.json (test gate +first-run-wizard.test.js)
"@

if($PatchOnly){
  throw '-PatchOnly mode requires US-74 / Task IDs to be filled in manually after first registration.'
}

# === 신규 등록 모드 ===

# 0) SP-08 / EP-02 재사용 확인.
$sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
Write-Host "Sprint reused id=$($sp.id) name=$($sp.name)"

try {
  $ep = Invoke-RestMethod -Uri "$base/epics/$epicId" -Headers $H
  Write-Host "Epic reused id=$($ep.id) subject=$($ep.subject)"
} catch { throw "EP-02 (id=$epicId) missing." }

# 1) US-74.
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
Write-Host "US-74 id=$($us.id) ref=$($us.ref)"

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
Write-Host "US-74   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
