$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

# ---- WIN-033 descriptions ----
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

# ---- WIN-034 descriptions ----
$desc113 = @"
[WIN-034] 구현 작업

[작업내용]
- desktop/ipc/events.ts: CommandProgressDetail 에 optional messageId, truncated 추가 (기존 stream/chunk 유지, 하위 호환).
- desktop/ipc/commands.ts: RunCommandRequestSchema 에 optional messageId(≤128) 추가. runOmxSubcommand(args, { onChunk }) 시그니처로 확장 — child stdout/stderr data 마다 cap 처리 후 onChunk(stream, kept, truncated) 호출. omx_doctor/omx_adapt_probe/omx_state_status 케이스에서 messageId 가 있으면 chunk 단위로 eventBus.publish('command.progress', { stream, chunk, messageId, truncated }) 발행.
- desktop/renderer/chat/streaming-bridge.ts (신규): 순수 TS — messageId 키로 lazy streamStart('tool') + 16ms batch flush + truncated 표식 + completed/failed footer + detach 시 잔여 flush. timer 추상화로 결정성 테스트 가능. 다른 type 이벤트(hud.update 등) 는 무시.
- desktop/renderer/app.ts: window.omx.runCommand 타입에 messageId? 추가. slashDispatcher 가 호출마다 slash-<cmd>-<ts>-<seq> 형태 messageId 할당해 IPC 첨부. StreamingBridge 인스턴스화 + window.omx.subscribeEvents 구독.

[변경소스파일]
- 신규: desktop/renderer/chat/streaming-bridge.ts (StreamingBridge, formatCompletedFooter, formatFailedFooter, STREAMING_TRUNCATED_MARK)
- 신규: desktop/__tests__/streaming-bridge.test.ts
- 수정: desktop/ipc/events.ts (CommandProgressDetail 확장)
- 수정: desktop/ipc/commands.ts (Schema messageId + onChunk 훅 + omx_* progress 발행)
- 수정: desktop/renderer/app.ts (slashDispatcher messageId + StreamingBridge 부착)
- 수정: package.json (test:phase2:common:compiled 에 streaming-bridge.test.js 추가)
"@

$desc114 = @"
[WIN-034] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러
- npm run test:phase2:common:compiled — node:test 게이트 실행
- 신규 streaming-bridge.test.ts 13 subtest:
  1. messageId 미존재 progress → 메시지 미생성 (non-streaming 명령 무영향)
  2. 첫 progress → lazy streamStart('tool') + 16ms batch 후 합쳐 streamAppend
  3. batchWindowMs=0 → 즉시 flush
  4. command.completed → 잔여 flush + '*— 종료 exitCode=N duration=Nms*' footer + streamEnd
  5. command.failed → '*— 실패 exitCode=N <message>*' footer
  6. truncated 플래그 → finalize 단계에 '…(잘림 — 8KB 상한 초과)' 표식 추가
  7. progress 없이 completed 만 → 무시 (entry 없음)
  8. 다중 messageId 동시 추적 — 도착 순서대로 ring push
  9. alien event type (hud.update 등) 무시
  10. detach → 잔여 flush + 구독 해제 (이후 emit throw)
  11. flushAll 헬퍼 — 모든 pending 을 즉시 비움
  12. trackedIds 노출 + completed 후 entry 정리
  13. formatCompletedFooter/formatFailedFooter 결정성 (exitCode null, message 부재 케이스 포함)

[결과]
- 총 75/75 PASS (기존 62 + 신규 13), fail=0, skipped=0, duration≈5.7s
- 회귀 무영향: event-bus, history-store, question-broker, hud/sidecar viewmodel, ipc-contract, packaging-config, release-gate, transport, local-process-transport, pty-local-transport, chat-viewmodel, session-store, slash-router 모두 변경 없음
- DoD 4항 (omx 명령 stdout 점진 표시 / exitCode·duration footer / 8KB truncated 표시 / 회귀 무영향) 모두 충족
"@

$desc115 = @"
[WIN-034] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT 체크리스트 5/6 마감 ([x] command.progress 스키마 확장 / WorkerTransport→IPC progress 어댑터 / streaming-bridge.ts / 16ms batch flush / streaming-bridge.test.ts)
- 매뉴얼 §5 streaming 동작 설명은 [ ] 유지 — 사용자 정책상 매뉴얼은 별도 일괄 갱신 (W030/W031/W032/W033 정책 승계)
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API / 검증 / 후속 작업 / Taiga 메모)
- 티켓 'Taiga 등록 내역' 블록을 '완료 (2026-05-23) — description PATCH 완료' 로 갱신

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase4-tickets.md (WIN-034 체크리스트 + 결과 링크 + Taiga 블록)
- 신규: winapp만들기/stage2/result/작업내역-W034.md
- 수정: package.json (test:phase2:common:compiled 에 streaming-bridge.test.js 추가)
"@

$descMap = @{
  110 = $desc110
  111 = $desc111
  112 = $desc112
  113 = $desc113
  114 = $desc114
  115 = $desc115
}

foreach($id in 110,111,112,113,114,115){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  $payload = @{ description = $descMap[$id]; version = $t.version }
  $json = $payload | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id (ver $($t.version) -> next) -> $($resp.StatusCode)"
}

[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
foreach($id in 110,111,112,113,114,115){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "---$id v$($t.version)---"
  Write-Host $t.description.Substring(0,80)
}
