$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

$desc110 = @"
[WIN-033] 구현 작업

[작업내용]
- 채팅 InputBox 입력이 '/' 로 시작하면 SlashRouter 로 분기 (ChatPanel onSlashCommand 진입점 연결).
- SLASH_COMMANDS SSOT 14종 + /help (allowedCommands 15종 중 데모 전용 question_demo 의도적 제외).
- 다중 토큰 패턴(/state field, /omx adapt probe) 이 단일 토큰(/state, /omx state) 보다 먼저 매칭되도록 SLASH_COMMANDS_SORTED 길이 내림차순 정렬.
- 따옴표 그룹 + 백슬래시 이스케이프 지원 토크나이저 (예: /ask "계속할까요?" 진행 중단).
- 입력 64KB / 토큰 32개 상한, 미완료 따옴표 throw.
- 인자 개수 검증 (minRest/maxRest) 실패 시 IPC 미호출.
- 실제 검증/실행은 main 측 allowedCommands + zod SSOT 유지 — 라우터는 syntactic 변환만.
- 결과는 tool role 메시지에 markdown 코드블록(JSON) 으로 표시. dispatcher 예외는 system 메시지로 격리.

[변경소스파일]
- 신규: desktop/renderer/chat/slash-commands.ts (SlashSpec, SLASH_COMMANDS, SLASH_COMMANDS_SORTED, buildHelpText)
- 신규: desktop/renderer/chat/slash-router.ts (tokenizeSlashInput, matchSlashSpec, planSlashInvocation, formatDispatchResult, SlashRouter)
- 수정: desktop/renderer/app.ts (SlashRouter import + slashDispatcher 어댑터 + ChatPanel onSlashCommand 연결 + emitTool/emitSystem 바인딩)
"@

$desc111 = @"
[WIN-033] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러
- npm run test:phase2:common:compiled — node:test 게이트 실행
- 신규 slash-router.test.ts 17 subtest:
  * SSOT 정합: 14개 매핑이 main allowedCommands(15) 에서 question_demo 만 제외하고 정확히 일치
  * SLASH_COMMANDS_SORTED 인덱스 검증: /state field < /state, /omx adapt probe < /omx state
  * tokenizeSlashInput: 기본/연속 공백/한글 따옴표/\" 이스케이프/\\ 이스케이프/미완료 throw/슬래시 부재 throw
  * matchSlashSpec: 15케이스 슬래시 패턴 + 미매핑 null
  * planSlashInvocation: argsFrom=none 잔여 토큰 거부, /sleep 인자 부족·초과, /ask 6개 초과 거부
  * SlashRouter.handle: 정상 → tool emit, 미매핑 → system + IPC 미호출, /help → system 안내(모든 usage 포함), 인자 부족 → IPC 미호출, dispatcher ok=false → tool '실행 실패', dispatcher throw → system 'IPC 호출 실패', 미완료 따옴표 → system '파싱 오류'
  * formatDispatchResult 성공/실패 markdown 코드블록 회귀
  * buildHelpText 14 usage + /help 회귀

[결과]
- 총 62/62 PASS (기존 45 + 신규 17), fail=0, skipped=0, duration≈5.5s
- 회귀 무영향: 진단 grid / HUD / Sidecar / IPC contract / session-store / chat-viewmodel 전부 변경 없음
- DoD 3항 (15종 슬래시 호출 가능 / 미매핑·/help / 회귀 무영향) 모두 충족
"@

$desc112 = @"
[WIN-033] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT 체크리스트 4/5 마감 ([x] slash-commands.ts / slash-router.ts / slash-router.test.ts / InputBox 분기)
- 매뉴얼 §4.1 슬래시 표 항목은 [ ] 유지 — 사용자 정책상 매뉴얼은 별도 일괄 갱신 (W030/W031/W032 정책 승계)
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 슬래시 매핑·우선순위·보안 / 검증 / 후속 작업 / Taiga 메모)
- 티켓 'Taiga 등록 내역' 블록을 '완료 (2026-05-23) — description PATCH 완료' 로 갱신

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase4-tickets.md (WIN-033 체크리스트 + 결과 링크 + Taiga 블록)
- 신규: winapp만들기/stage2/result/작업내역-W033.md
- 수정: package.json test:phase2:common:compiled 에 slash-router.test.js 추가
"@

$payloads = @{
  110 = @{ description = $desc110; version = 2 }
  111 = @{ description = $desc111; version = 2 }
  112 = @{ description = $desc112; version = 2 }
}

foreach($id in 110,111,112){
  $json = $payloads[$id] | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in 110,111,112){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id version=$($t.version) descLen=$($t.description.Length)"
}
