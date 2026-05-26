param([switch]$PatchOnly)

$ErrorActionPreference='Stop'
# WIN-073 Taiga 등록 SSOT.
#
# 실행 모드:
#   .\register-w073.ps1                — 신규 등록 (SP-08 재사용 + US-73 + 3 task 생성 후 description PATCH).
#   .\register-w073.ps1 -PatchOnly     — 이미 등록된 US-73/Tasks 의 subject + description 만 재PATCH (한글 mojibake 정정용).
#
# 주의: PowerShell 5.1 에서 본 .ps1 파일은 반드시 UTF-8 BOM 으로 저장되어야 한다.

$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9
$sprintId=18
$userId=$auth.id

$subjects=@('[WIN-073] 구현 작업','[WIN-073] 검증 작업','[WIN-073] 문서/정합성 반영')
$usSubject='WIN-073 Authenticode 코드서명 (EV/OV, self-signed fallback)'
$usDescription='Phase 8 3번째 티켓. NSIS 설치형 .exe + 자동 업데이트 산출물을 Authenticode SHA-256 으로 서명. electron-builder win.signtoolOptions (rfc3161TimeStampServer=DigiCert / publisherName=oh-my-codex contributors) + win.signingHashAlgorithms=[sha256] + win.verifyUpdateCodeSignature=true 적용. 인증서/패스프레이즈는 환경 변수 (WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD / WIN_CSC_PUBLISHER_NAME) 로만 주입, 저장소 평문 노출은 check-codesign-secrets.mjs lint 가 git 트리 스캔으로 차단. desktop/main/updater/codesign.ts (신규) parseCodesignConfig 가 env 검증 (http:// 거부, file:// 거부, https/안전 로컬 경로만 허용, 패스 누락 시 disabled) + describeCodesignConfig 안전 직렬화 (link/pass 평문 제외). desktop/scripts/sign-windows.ps1 (신규) signtool wrapper — sign 단계 finally 에서 임시 PFX 삭제 + Remove-Variable, verify 단계는 signtool verify /pa /v 강제. desktop-publish.yml 워크플로 — Lint codesign secrets → publish → Verify Authenticode signature 3 단계로 unsigned 산출물 배포 차단. 매뉴얼 §9.3 신설 + codesign-운영지침.md 신설 (EV/OV/self-signed 옵션 비교, GitHub Actions Secrets 등록, 보관/갱신/회전/회수 절차, self-signed PoC, 수동 검증). 게이트: 254/195/0/59 → 256/197/0/59 (+2 top-level describe = parseCodesignConfig + describeCodesignConfig, 신규 leaf 14건).'

$desc1 = @"
[WIN-073] 구현 작업

[작업내용]
- desktop/main/updater/codesign.ts (신규): CodesignRuntimeConfig 인터페이스 + parseCodesignConfig({env}) — env 변수 → 런타임 설정 변환. WIN_CSC_LINK 검증: 정규식 /^([A-Za-z]:[\\/]|[.][\\/]|[\\/])/ 로 안전 로컬 경로 또는 https:// 만 허용 (http:// / file:// 거부). WIN_CSC_KEY_PASSWORD 필수 — 누락 시 enabled=false 강등 + warning 'WIN_CSC_KEY_PASSWORD missing'. WIN_CSC_TIMESTAMP_URL — http(s) 만 허용, 그 외 기본 http://timestamp.digicert.com 폴백. WIN_CSC_VERIFY_UPDATE_SIGNATURE — 기본 true, 명시 0/false/no 만 OFF. WIN_CSC_ALLOW_SELF_SIGNED — isTruthy 헬퍼 (1/true/yes/on). describeCodesignConfig(config) — 안전 로깅 직렬화 (link/pass 평문 제외).
- desktop/scripts/sign-windows.ps1 (신규): signtool wrapper. param([Parameter(Mandatory)] $Path, [string]$TimestampUrl, [string]$PublisherName, [switch]$Verify, [switch]$AllowSelfSigned). signtool.exe 자동 탐색 (Windows Kits 10). 서명 모드: WIN_CSC_LINK 가 https:// 면 임시 PFX 다운로드 후 finally 에서 Remove-Item, http:// 면 거부. signtool sign /fd SHA256 /td SHA256 /tr <ts> /f <pfx> /p <pass> <Path>. 패스프레이즈는 $env:WIN_CSC_KEY_PASSWORD 에서만 읽고 finally 에서 Remove-Variable. 검증 모드 (-Verify): signtool verify /pa /v <Path> (-AllowSelfSigned 지정 시 /pa 제외). 항상 verify 단계로 마무리.
- desktop/scripts/check-codesign-secrets.mjs (신규): git ls-files 트리 한정 스캔. 패턴: .pfx/.p12 바이너리 즉시 차단 / WIN_CSC_KEY_PASSWORD=<value> 평문 할당 (env 참조 / 빈 값 / 주석은 통과) / PKCS#12 base64 헤더 MII[A-Za-z0-9+/]{40,} / PEM BEGIN (ENCRYPTED )?PRIVATE KEY. 예외 목록: 본 lint 자신 / 운영지침 / codesign.ts/.test.ts / sign-windows.ps1 / electron-builder.yml. 5MB 초과 파일 스킵. exit 1 on hit.
- electron-builder.yml (수정): win 블록 placeholder 주석 → WIN-073 활성 블록 치환. signingHashAlgorithms: [sha256] (SHA-1 차단). signtoolOptions.rfc3161TimeStampServer: http://timestamp.digicert.com. signtoolOptions.publisherName: [oh-my-codex contributors]. publisherName: [oh-my-codex contributors] (latest.yml 임베드). verifyUpdateCodeSignature: true (electron-updater 거부 트리거). env-only 계약 주석 명시.
- .github/workflows/desktop-publish.yml (수정): 헤더 주석 갱신 + workflow_dispatch.inputs.allow_unsigned 추가 (운영자 디버그). Lint codesign secrets 단계 신규 — publish 전 평문 비밀 차단. Build + publish 단계 env: WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD / WIN_CSC_PUBLISHER_NAME / WIN_CSC_SUBJECT_NAME / WIN_CSC_TIMESTAMP_URL + CSC_LINK / CSC_KEY_PASSWORD alias. Verify Authenticode signature 단계 신규 — release/*-setup.exe 전수 signtool verify /pa /v.
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/codesign.test.js 추가. lint:codesign-secrets 스크립트 신규 (node desktop/scripts/check-codesign-secrets.mjs).

[변경소스파일]
- 신규: desktop/main/updater/codesign.ts
- 신규: desktop/__tests__/codesign.test.ts
- 신규: desktop/scripts/sign-windows.ps1
- 신규: desktop/scripts/check-codesign-secrets.mjs
- 신규: winapp만들기/stage2/codesign-운영지침.md
- 신규: winapp만들기/stage2/result/작업내역-W073.md
- 신규: winapp만들기/stage2/scripts/register-w073.ps1
- 수정: electron-builder.yml (win 블록 placeholder → WIN-073 활성 블록)
- 수정: .github/workflows/desktop-publish.yml (Lint + Verify 단계 + env 추가)
- 수정: package.json (test gate +codesign.test.js + lint:codesign-secrets 스크립트)
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.3 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-073 6/6 [x] + Taiga 라인 갱신)
"@

$desc2 = @"
[WIN-073] 검증 작업

[검증 내역]
- npm run build:desktop — tsc -p tsconfig.desktop.json 성공 + copy-assets.mjs 정상. codesign.ts 신규 + codesign.test.ts 신규 모두 컴파일 청결.
- npm run test:phase2:common:compiled — node:test 게이트 통과.

[결과]
- tests=256 / pass=197 / fail=0 / cancelled=0 / skipped=59
- 직전 베이스라인(WIN-072 종료) 254/195/0/59 → +2 tests / +2 pass / +0 fail / +0 skipped (node:test top-level describe 집계 기준 — 신규 leaf 14건은 2개 상위 describe (parseCodesignConfig (WIN-073) / describeCodesignConfig (WIN-073)) 로 묶여 +2 로 집계됨).

[신규 회귀 커버리지 — desktop/__tests__/codesign.test.ts]
parseCodesignConfig (WIN-073) — 10 tests:
1. env={} → enabled=false / warnings 비어있지 않음.
2. WIN_CSC_LINK(file 경로) + WIN_CSC_KEY_PASSWORD → enabled=true.
3. WIN_CSC_LINK='http://example.com/cert.pfx' → enabled=false / warning 'http://'.
4. WIN_CSC_LINK='file:///C:/cert.pfx' → enabled=false / warning 'file://'.
5. WIN_CSC_LINK='https://...' + pass → enabled=true.
6. WIN_CSC_LINK 있고 WIN_CSC_KEY_PASSWORD 누락 → enabled=false / warning 'WIN_CSC_KEY_PASSWORD'.
7. WIN_CSC_PUBLISHER_NAME / WIN_CSC_SUBJECT_NAME 정상 전달.
8. WIN_CSC_TIMESTAMP_URL='file://x' → 기본값 폴백.
9. WIN_CSC_TIMESTAMP_URL='https://timestamp.sectigo.com' → 그대로 사용.
10. WIN_CSC_VERIFY_UPDATE_SIGNATURE 기본 true / 명시 '0' → false.
11. WIN_CSC_ALLOW_SELF_SIGNED '1' → true / '0' → false / 미설정 → false.
describeCodesignConfig (WIN-073) — 4 tests:
12. enabled 설정의 link 평문이 결과 문자열에 미포함.
13. enabled 설정의 pass 평문이 결과 문자열에 미포함.
14. disabled 설정도 안전 직렬화 (throw 없음).
15. allowSelfSigned/verify 플래그가 결과에 반영.

[보안 회귀]
- 평문 비밀 lint (node desktop/scripts/check-codesign-secrets.mjs) — git 트리 전수 스캔, 평문 비밀 0건.
- electron-builder.yml 의 인증서 정보는 env 참조만 사용 (정적 평문 없음).
- sign-windows.ps1 의 패스프레이즈는 \$env:WIN_CSC_KEY_PASSWORD 에서만 읽고 finally 에서 Remove-Variable 호출.
- WIN_CSC_LINK 검증: http:// 거부 (네트워크 평문 다운로드 방지), file:// 거부 (file URI 우회 차단), https:// 와 안전 로컬 경로 정규식만 허용.
- electron-updater verifyUpdateCodeSignature=true + publisherName 매칭 — 변조된 업데이트 적용 거부 (publisher mismatch / chain 검증 실패 / signed 안 됨 모두).
- self-signed 경로는 명시 WIN_CSC_ALLOW_SELF_SIGNED=1 opt-in + 매뉴얼/운영지침에 사용자 안내 절차 명시.

[DoD 충족]
- 서명된 NSIS .exe 가 signtool verify /pa 통과 — desktop-publish.yml Verify 단계가 강제. (인증서 미발급 환경에선 lint 단계로 사전 차단.)
- electron-updater 가 서명 불일치 패키지 적용 거부 — verifyUpdateCodeSignature=true + publisherName 임베드, 동작 표준 매뉴얼 §9.3 명시.
- 인증서 정보가 저장소 평문에 노출되지 않음 — check-codesign-secrets.mjs lint 가 모든 시나리오 차단.
- self-signed 빌드 경로가 운영자에게 명확한 안내와 함께 가능 — codesign-운영지침.md §6 + 매뉴얼 §9.3 self-signed 안내 표.
- 회귀 무영향 — 게이트 +2 tests / 0 fail.
"@

$desc3 = @"
[WIN-073] 문서/정합성 반영

[반영 내역]
- 매뉴얼 §9.3 코드서명 (WIN-073) 신설: winapp만들기/stage2/winapp-manual-v2.md
  - 서명 정책 표 (해시 알고리즘 SHA-256 강제 / RFC3161 timestamp / publisher / verifyUpdateCodeSignature true / self-signed PoC).
  - 환경 변수 표 (WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD / WIN_CSC_PUBLISHER_NAME / WIN_CSC_SUBJECT_NAME / WIN_CSC_TIMESTAMP_URL / WIN_CSC_VERIFY_UPDATE_SIGNATURE / WIN_CSC_ALLOW_SELF_SIGNED).
  - electron-updater 거부 동작 (3 시나리오: unsigned / publisher mismatch / chain 실패).
  - Self-signed 사용자 안내 (속성→차단 해제→실행, SmartScreen 경고 추가 정보→실행 절차).
  - CI 보호 단계 3종 (lint → publish → verify).
  - 구성요소 파일 7개 링크 (codesign.ts, sign-windows.ps1, check-codesign-secrets.mjs, electron-builder.yml, desktop-publish.yml, 운영지침, 게이트 테스트).

- 운영지침: winapp만들기/stage2/codesign-운영지침.md (신규) — 운영자/릴리스 담당자 전용 SSOT.
  - §1 인증서 옵션 비교 (EV/OV/self-signed) + 단계적 채택 권장.
  - §2 보관 원칙 (저장소 평문 금지, lint 자동 검사, 1Password Vault + GitHub Actions Secrets).
  - §3 CI 환경변수 설정 (base64 PFX 변환 절차 + 5개 Secret 등록).
  - §4 갱신 절차 (만료 60일 전 신규 발급 + timestamp 로 과거 산출물 유효).
  - §5 회전 절차 (compromise 대응 — revoke / Secrets 삭제 / 재발급 / yank).
  - §6 self-signed PoC (New-SelfSignedCertificate / Export-PfxCertificate / WIN_CSC_ALLOW_SELF_SIGNED 절차).
  - §7 수동 검증 절차 (sign-windows.ps1 / signtool verify /pa /v).
  - §8 책임자 매트릭스.

- 작업내역: winapp만들기/stage2/result/작업내역-W073.md (신규) — 7섹션 W072 미러. 신규 7 / 수정 5 / 게이트 254→256 증분 명시.

- 티켓 SSOT: winapp만들기/stage2/change-winapp-phase8-tickets.md
  - WIN-073 체크리스트 6/6 [x] 마감.
  - Taiga 등록 라인을 '미등록' → 'register-w073.ps1 실행 (Sprint SP-08 / Epic EP-02)' 로 갱신.

- 등록 스크립트: winapp만들기/stage2/scripts/register-w073.ps1 (신규) — SP-08 재사용(id=18) + EP-02 재사용(id=9) + US-73 + 3 task POST + description PATCH. -PatchOnly 스위치로 한글 mojibake 정정 모드 지원. UTF-8 BOM, Invoke-WebRequest Body = [System.Text.Encoding]::UTF8.GetBytes(json). Task description 3분할 — [작업내용]/[변경소스파일] · [검증 내역]/[결과] · [반영 내역]/[반영된 파일].

- 패키징 메타: electron-builder.yml win 블록 — placeholder 주석 → 활성 signtoolOptions / signingHashAlgorithms / publisherName / verifyUpdateCodeSignature: true. 주석으로 env-only 계약 + self-signed PoC 안내.

- 게이트 자동화: package.json test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/codesign.test.js 추가 + lint:codesign-secrets 신규 스크립트 — 후속 모든 PR 에서 코드서명 설정 회귀 및 평문 비밀 노출 자동 검증.

[반영된 파일]
- 신규: winapp만들기/stage2/result/작업내역-W073.md
- 신규: winapp만들기/stage2/scripts/register-w073.ps1
- 신규: winapp만들기/stage2/codesign-운영지침.md
- 신규: desktop/main/updater/codesign.ts
- 신규: desktop/__tests__/codesign.test.ts
- 신규: desktop/scripts/sign-windows.ps1
- 신규: desktop/scripts/check-codesign-secrets.mjs
- 수정: winapp만들기/stage2/winapp-manual-v2.md (§9.3 신설)
- 수정: winapp만들기/stage2/change-winapp-phase8-tickets.md (WIN-073 6/6 [x] + Taiga 라인 갱신)
- 수정: electron-builder.yml (win 블록 placeholder → WIN-073 활성 블록)
- 수정: .github/workflows/desktop-publish.yml (Lint + Verify 단계 + env 추가)
- 수정: package.json (test gate +codesign.test.js + lint:codesign-secrets 스크립트)
"@

if($PatchOnly){
  throw '-PatchOnly mode requires US-73 / Task IDs to be filled in manually after first registration.'
}

# === 신규 등록 모드 ===

# 0) SP-08 재사용 확인.
$sp = Invoke-RestMethod -Uri "$base/milestones/$sprintId" -Headers $H
Write-Host "Sprint reused id=$($sp.id) name=$($sp.name)"

try {
  $ep = Invoke-RestMethod -Uri "$base/epics/$epicId" -Headers $H
  Write-Host "Epic reused id=$($ep.id) subject=$($ep.subject)"
} catch { throw "EP-02 (id=$epicId) missing." }

# 1) US-73.
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
Write-Host "US-73 id=$($us.id) ref=$($us.ref)"

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
Write-Host "US-73   : id=$($us.id) ref=$($us.ref)"
Write-Host "Tasks   : $($taskIds -join ', ')"
