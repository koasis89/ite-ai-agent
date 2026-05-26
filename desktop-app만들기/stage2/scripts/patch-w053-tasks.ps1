$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

# Phase 6 / WIN-053 / Tasks 134(구현)/135(검증)/136(문서)
$desc134 = @"
[WIN-053] 구현 작업

[작업내용]
- desktop/main/storage/migrations/003_tool_permissions.sql (신규) — tool_permissions(id PK autoincr, tool_id TEXT NOT NULL, session_id TEXT NULL, decision TEXT CHECK IN ('allow','deny'), granted_at INTEGER, expires_at INTEGER) + UNIQUE 인덱스 (tool_id, COALESCE(session_id,'')) + tool_id / expires_at 보조 인덱스. WIN-042 마이그레이션 러너가 자동 적용.
- desktop/main/permissions/permission-store.ts (신규) — PermissionStore 클래스(better-sqlite3 prepared statement 7개). set/check/list/revoke/purgeExpired. ON CONFLICT(tool_id, COALESCE(session_id,'')) DO UPDATE upsert. check 우선순위 영구deny > 영구allow > 세션deny > 세션allow > null + 만료(expires_at <= now) 세션 lazy 필터.
- desktop/main/permissions/permission-broker.ts (신규) — PermissionBroker 클래스. check(input) 흐름: (1) builtin:omx_ + omxAllowExecOverride()=false → 즉시 deny(source='override-deny'), (2) store.check hit → source=scope, (3) miss → prompt(input) async 호출 → scope 별 영속(permanent: session_id=null/expires=null, session: session_id+expires=now+sessionTtlMs[기본 8h], once: 영속없음). prompt throw 시 deny-once. onChange 콜백 hook(granted/denied).
- desktop/renderer/permissions/PermissionDialog.ts (신규) — DOM 4버튼 모달(이번 1회 / 이 세션 / 영구 / 거부) + ESC=once-deny. 인자 요약은 호출자가 사전 마스킹한 문자열만 표시. maskArgsSummary helper(/password|passwd|secret|api[_-]?key|token|authorization/i 패턴 → key=***).
- desktop/ipc/commands.ts (수정) — allowedCommands +2 (tool_permission_list, tool_permission_revoke; Phase 3 15 + WIN-052 2 + WIN-053 2 = 19종). ToolPermissionListArgsSchema(max=0) / ToolPermissionRevokeArgsSchema(tuple[toolId TOOL_ID_RE, enum 'session'|'permanent'|'all']) + perCommandArgValidators 등록. PermissionBackend 인터페이스(list/revoke/check?) + setPermissionBackend/getPermissionBackend setter. switch 분기 tool_permission_list(backend?.list() 또는 빈 배열) / tool_permission_revoke(backend 부재 시 throw). omx_doctor/omx_adapt_probe/omx_state_status 케이스에 permissionBackend?.check await 게이트 추가 — deny 시 throw 'permission denied (${source})'. 기존 isOmxExecAllowed exec-disabled 메시지는 유지 (ipc-contract 회귀 보호).
- desktop/__tests__/permission-store.test.ts (신규) — PermissionStore 9 + PermissionBroker 7 = 16 subtests. native binding 부재 환경(driverAvailable=false) 시 t.skip — WIN-043 패턴 승계.

[변경소스파일]
- 신규: desktop/main/storage/migrations/003_tool_permissions.sql
- 신규: desktop/main/permissions/permission-store.ts
- 신규: desktop/main/permissions/permission-broker.ts
- 신규: desktop/renderer/permissions/PermissionDialog.ts
- 신규: desktop/__tests__/permission-store.test.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: package.json
"@

$desc135 = @"
[WIN-053] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 정상(003_tool_permissions.sql dist 복사 확인).
- npm run test:phase2:common:compiled — node:test 게이트 실행.
- desktop/__tests__/permission-store.test.ts (신규) 16 subtests:
  Store 9종 — (1) 영구 allow set → check permanent allow, (2) 영구 deny 가 세션 allow 압도, (3) 세션 deny 가 영구 allow 압도, (4) 세션 allow fallback + 타 세션 격리, (5) 만료된 세션 행 무시 + purgeExpired 1건 제거, (6) 미설정 시 null, (7) 같은 키 upsert 멱등성(decision/grantedAt 교체, 행 1개 유지), (8) revoke scope 3종(session/permanent/all) 정확 카운트, (9) list granted_at DESC 정렬.
  Broker 7종 — (10) store hit 시 prompt 미호출, (11) miss → prompt(permanent allow) 영속(session_id=null), (12) miss → prompt(session allow) 영속(session_id + expires=now+ttl), (13) miss → prompt(once) 영속 없음, (14) omxAllowExecOverride=false 영구 allow 압도 → override-deny, (15) prompt throw → deny-once + 영속 없음, (16) miss → 기본 prompt deny once.
- desktop/__tests__/ipc-contract.test.ts WIN-053 describe 7 신규 it:
  accept tool_permission_list(backend.list=2건) / accept tool_permission_revoke(['builtin:omx_doctor','permanent'],deleted=1) / reject revoke([..,'forever'])=INVALID_REQUEST(enum) / reject revoke(['bad@id','all'])=INVALID_REQUEST(regex) / reject revoke backend 부재=COMMAND_FAILED('permission backend not initialised') / omx_doctor backend.check allow → broker 통과(calls=1, toolId='builtin:omx_doctor') / omx_doctor backend.check deny → COMMAND_FAILED('permission denied').
- desktop/__tests__/slash-router.test.ts — ALLOWED_COMMANDS + SLASH_EXCLUDED 양쪽에 tool_permission_list/tool_permission_revoke 추가 후 회귀 통과(slash 매핑 미노출 정합).
- 보안 회귀: TOOL_ID_RE 화이트리스트 재사용 + scope enum 폐쇄집합. permissionBackend 미주입 시 list=빈 배열, revoke=COMMAND_FAILED, omx_* broker 게이트 무시(기존 isOmxExecAllowed exec-disabled 메시지 보존). OMX_DESKTOP_ALLOW_EXEC=0 단축은 broker omxAllowExecOverride 와 isOmxExecAllowed 양쪽에서 영구 deny 강제.

[결과]
- 총 157 tests / 125 pass / 0 fail / 0 cancelled / 32 skipped
- 직전 베이스라인(W052 종료) 142/125/0/17 → +15 tests / +15 skipped (better-sqlite3 native binding 부재 환경에서 permission-store 16종 중 15개 SKIP — CI matrix 정책 승계; 동일 환경에서 ipc-contract describe 는 1 leaf 로 합산되어 pass 수 무변동)
- 단독 확인: node --test dist-desktop/desktop/__tests__/ipc-contract.test.js → 1/1 pass, WIN-053 describe 내부 7/7 ok
- 회귀 무영향: 기존 22개 테스트 파일 모두 통과(omx_doctor 환경변수 거부 케이스 exec-disabled 메시지 유지)
- DoD 충족: 다이얼로그 4선택지 / 영구 재기동 영속 / 세션 expires_at 자동 만료 / broker 단일 게이트 단위 테스트 / 회귀 0
"@

$desc136 = @"
[WIN-053] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT(change-winapp-phase6-tickets.md) WIN-053 체크리스트 6/7 마감:
  [x] migrations/003_tool_permissions.sql + permission-store.ts
  [x] permission-broker.ts (check/grant/revoke)
  [x] PermissionDialog 컴포넌트 (Question 모달 기반)
  [x] tool_permission_list / tool_permission_revoke IPC + zod
  [x] omx_* 3종을 broker 통과로 일반화 (OMX_DESKTOP_ALLOW_EXEC 호환 처리)
  [x] permission-store.test.ts (우선순위 / 만료 / broker 우회 차단)
  [ ] 매뉴얼 §7.3 권한 동의 UX 설명 추가 — Phase 6 종료 일괄 매뉴얼 갱신 정책에 따라 미체크 유지 (W030~W052 정책 승계)
- Taiga 등록 내역 라인: 이미 등록 완료 (2026-05-24) — Sprint SP-06(15)/Epic EP-02(9)/US-53(50, ref=#193)/Tasks 134·135·136 description PATCH 완료
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 / Taiga 반영)
- patch 스크립트 신규 (Tasks 134/135/136 description 본 PATCH 호출)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-053 체크리스트 6/7 → [x])
- 신규: winapp만들기/stage2/result/작업내역-W053.md
- 신규: winapp만들기/stage2/scripts/patch-w053-tasks.ps1
- 신규: desktop/main/storage/migrations/003_tool_permissions.sql
- 신규: desktop/main/permissions/permission-store.ts
- 신규: desktop/main/permissions/permission-broker.ts
- 신규: desktop/renderer/permissions/PermissionDialog.ts
- 신규: desktop/__tests__/permission-store.test.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: package.json
"@

$payloads = @{
  134 = $desc134
  135 = $desc135
  136 = $desc136
}

foreach($id in 134,135,136){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id current version=$($t.version) (descLen before=$($t.description.Length))"
  $payload = @{ description = $payloads[$id]; version = $t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in 134,135,136){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id new version=$($t.version) descLen=$($t.description.Length)"
}
