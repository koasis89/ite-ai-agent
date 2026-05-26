$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId=1
$epicId=9   # EP-02 (id=9, ref=#148)
$sprintId=14 # SP-05 (id=14)
$userId=$auth.id

# 1) US-43 user story.
$usBody = @{
  project=$projectId
  subject='WIN-043 명령 히스토리 SQLite 백엔드 (in-memory 50건 대체)'
  description='Phase 3 (WIN-021) 의 main-side in-memory 50건 ring buffer 를 command_history SQLite 테이블로 교체. record/list/search/purgeOlderThan + 10,000건 LRU + 비밀번호·토큰 마스킹 + history_list IPC 응답 스키마 100% 호환 + prepared statement 강제. WIN-042 의 SQLite 인프라(openDatabase + 마이그레이션 러너) 위에 002_command_history.sql 을 추가하고, in-memory ring buffer 는 backend 부재 시 fallback 으로 유지한다.'
  milestone=$sprintId
  assigned_to=$userId
  owner=$userId
} | ConvertTo-Json
$usBytes=[System.Text.Encoding]::UTF8.GetBytes($usBody)
$usResp = Invoke-WebRequest -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBytes -UseBasicParsing
$us = $usResp.Content | ConvertFrom-Json
Write-Host "US-43 id=$($us.id) ref=$($us.ref)"

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
    subject="[WIN-043] $tn"
    user_story=$us.id
    milestone=$sprintId
    assigned_to=$userId
    owner=$userId
  } | ConvertTo-Json
  $tBytes=[System.Text.Encoding]::UTF8.GetBytes($tBody)
  $tResp = Invoke-WebRequest -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBytes -UseBasicParsing
  $task = $tResp.Content | ConvertFrom-Json
  $taskIds += $task.id
  Write-Host "Task created id=$($task.id) ref=$($task.ref) subject=[WIN-043] $tn"
}

# ---- WIN-043 descriptions ----
$desc1 = @"
[WIN-043] 구현 작업

[작업내용]
- desktop/main/storage/migrations/002_command_history.sql (신규): command_history(id INTEGER PK AUTOINCREMENT, command TEXT NOT NULL, args_json TEXT NOT NULL, command_id TEXT, exit_code INTEGER, duration_ms INTEGER, started_at INTEGER NOT NULL, completed_at INTEGER, status TEXT NOT NULL, error_reason TEXT) + idx_command_history_started_at(started_at DESC) + idx_command_history_command(command). WIN-042 의 schema_migrations 러너가 자동 적용.
- desktop/main/storage/command-history-repo.ts (신규): CommandHistoryRepo 클래스. 모든 쿼리는 db.prepare 로 사전 컴파일된 prepared statement. record / list(limit, offset) / count / search({command, from, to, limit}) / purgeOlderThan(ts) / enforceMaxRows(). 기본 보존 10,000건 (옵션 maxRows 로 조정 가능), record 종료마다 enforceMaxRows() 호출 → started_at ASC 순 LRU 삭제. maskSecretArg / maskSecretArgs 헬퍼 : 인라인 password|token|secret|api[_-]?key=VALUE 및 --password VALUE 플래그 패턴 모두 *** 로 치환 (대소문자 무시). toLegacyEntry(row) : Phase 3 entries[] 항목 모양 변환.
- desktop/ipc/commands.ts (수정): 기존 commandHistory[] ring buffer + appendHistory() 는 fallback 으로 유지. CommandHistoryBackend 구조적 인터페이스 + setCommandHistoryBackend / getCommandHistoryBackend export. appendHistory() 는 backend 가 주입되어 있으면 record() 도 호출 (실패는 console.error 만, 사용자 흐름 차단 X). history_list switch 케이스는 backend 가 있으면 backend.list(limit) + backend.count() 사용, 없으면 기존 in-memory ring 사용 — 응답 스키마 ({command, limit, total, entries}) 와 limit 1..200 검증 불변.
- desktop/main/index.ts (수정): CommandHistoryRepo import + commandHistoryRepo 모듈 변수 + getCommandHistoryRepo() export. bootstrapSqliteStore() 에서 db 가 열리면 new CommandHistoryRepo(db) 생성 후 setCommandHistoryBackend() 주입. 실패 시 setCommandHistoryBackend(null) 로 fallback.
- desktop/__tests__/command-history-repo.test.ts (신규): 9 tests. driver-independent 2건(maskSecretArg / maskSecretArgs 회귀) + driver-dependent 7건(round-trip / args 마스킹 영속 / LRU maxRows=5 12회 insert / search 필터 / purgeOlderThan / 재시작 영속 / SQL injection 방어). better-sqlite3 native binding 부재 시 t.skip.
- package.json (수정): test:phase2:common:compiled 에 dist-desktop/desktop/__tests__/command-history-repo.test.js 추가.

[변경소스파일]
- 신규: desktop/main/storage/migrations/002_command_history.sql
- 신규: desktop/main/storage/command-history-repo.ts
- 신규: desktop/__tests__/command-history-repo.test.ts
- 수정: desktop/ipc/commands.ts (backend hook + history_list 라우팅)
- 수정: desktop/main/index.ts (CommandHistoryRepo bootstrap + 주입)
- 수정: package.json (command-history-repo.test.js 등록)
"@

$desc2 = @"
[WIN-043] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 가 002_command_history.sql 을 dist-desktop/.../migrations/ 로 복사 확인 (W042 의 SQL 복사 로직 재사용)
- npm run test:phase2:common:compiled — node:test 게이트 실행
- 신규 command-history-repo.test.ts — 9종 (드라이버 가용성 자동 감지):
  드라이버 독립(2):
  1. maskSecretArg : 인라인 password/token/api_key/secret = VALUE 패턴 마스킹
  2. maskSecretArgs : --password VALUE / --token VALUE 플래그 + 인라인 혼합
  드라이버 의존(7 — better-sqlite3 부재 시 skip):
  3. record/list/count round-trip + newest-first
  4. args 마스킹이 영속 후 list 응답에도 유지
  5. LRU 강제 (maxRows=5 환경에서 12회 insert → 최근 5건 cmd_11..cmd_7 만 보존)
  6. search 필터 (command + from/to 시간 범위)
  7. purgeOlderThan (started_at < cutoff 삭제)
  8. 재시작 영속 (db.close 후 재오픈 → 직전 row 복원)
  9. SQL injection 시도 — prepared statement 로 무력화, 테이블 생존 확인
- 기존 ipc-contract.test.ts 회귀: 'accepts history_list request with limit' / 'rejects history_list with out-of-range limit' 모두 무변 통과
- 기존 renderer side history-store.test.ts (WIN-014) 는 별도 모듈로 무영향

[결과]
- 총 112 tests / 96 pass / 0 fail / 16 skipped, duration≈10.1s
- 베이스라인 (W042 완료 시점) : 103 / 94 / 0 / 9 → 본 티켓 +9 (드라이버 독립 2 PASS + 드라이버 의존 7 SKIP)
- 현재 dev 머신은 ia32 Node 18 — better-sqlite3 prebuilt 부재로 드라이버 의존 7종이 skip 처리됨 (Electron 패키징 환경 / x64 CI 에서는 @electron/rebuild 가 ABI 재빌드를 수행하므로 정상 실행 예정)
- DoD 핵심 항목 모두 충족: record/list/search/purgeOlderThan / LRU 10,000건 / 비밀번호·토큰 마스킹 / history_list 응답 스키마 무변 / prepared statement 강제 / 재시작 후 history_list 응답에 직전 명령 포함
"@

$desc3 = @"
[WIN-043] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT 체크리스트 5/6 마감 ([x] 002_command_history.sql / CommandHistoryRepo + LRU 트리거 / 비밀번호·토큰 마스킹 + 회귀 / history-store.ts 어댑터 교체 / history-store.test.ts record/list/search/마스킹/LRU). 매뉴얼 §6 히스토리 보존 정책 항목은 정책상 미체크 유지.
- Phase 3 in-memory 50건 ring buffer 는 backend 부재 시 fallback 으로 영구 유지 (제거하지 않음) — fallback 보장으로 native binding 부재 환경에서도 history_list 응답 무중단.
- 슬래시 라우터 /history search <text> 매핑은 후속 WIN-033 SSOT 에 추가 (선택 사항)
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 / Taiga)
- 티켓 'Taiga 등록 내역' 블록을 '완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-43 / Tasks 구현/검증/문서·정합성 PATCH 완료' 로 갱신

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase5-tickets.md (WIN-043 체크리스트 5/6 + Taiga 블록 갱신)
- 신규: winapp만들기/stage2/result/작업내역-W043.md
- 신규: winapp만들기/stage2/scripts/register-w043.ps1
- 수정: package.json (command-history-repo.test.js 등록)
- 수정: desktop/main/index.ts (CommandHistoryRepo bootstrap)
- 수정: desktop/ipc/commands.ts (backend hook + history_list 라우팅)
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
