$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Method Post -Uri "$base/auth" -Body (@{type='normal';username='admin';password='admin123!@'} | ConvertTo-Json) -ContentType 'application/json'
$tok=$auth.auth_token
$h=@{Authorization="Bearer $tok"}

function PostJson($url, $obj) {
  $json = $obj | ConvertTo-Json -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method Post -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $bytes
}
function PatchJson($url, $obj) {
  $json = $obj | ConvertTo-Json -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method Patch -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $bytes
}

# 기존 SP-03 (id=12), EP-01 (id=8) 재사용
$sprintId = 12
$epicId = 8

$us = PostJson "$base/userstories" @{project=1; subject='WIN-022 명령 패널 확장 B - Parameterized 진단 명령군'; milestone=$sprintId; assigned_to=6; owner=6}
"US_ID=$($us.id) US_REF=$($us.ref)"

$link = PostJson "$base/epics/$epicId/related_userstories" @{epic=$epicId; user_story=$us.id}
"LINKED=$($link.epic)/$($link.user_story)"

$t1 = PostJson "$base/tasks" @{project=1; subject='[WIN-022] 구현 작업'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
$t2 = PostJson "$base/tasks" @{project=1; subject='[WIN-022] 검증 작업'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
$t3 = PostJson "$base/tasks" @{project=1; subject='[WIN-022] 문서/정합성 반영'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
"T1=$($t1.id)/$($t1.ref) T2=$($t2.id)/$($t2.ref) T3=$($t3.id)/$($t3.ref)"

$descMap = @{
  ($t1.id) = "# [WIN-022] 구현 작업 — 완료 (2026-05-23)`n`n## 변경 요약`n- ``desktop/ipc/commands.ts``: ``allowedCommands`` 8종 → 12종 확장.`n  - 신규: ``state_get_field``, ``question_ask``, ``noop_echo``, ``noop_sleep``.`n- **명령별 zod 스키마 4종 + ``perCommandArgValidators`` 디스패치 테이블** 도입.`n- ``publishStarted()`` 직후 pre-switch 인자 검증 블록 추가 → 실패 시 ``command.failed`` 페어로 마감하고 ``INVALID_REQUEST`` 반환.`n- 옵션 라벨 보안 정규식 ``^[\p{L}\p{N} _-]+$`` — 제어문자 차단, 한글/영문 허용.`n- ``noop_sleep`` 은 ``setTimeout`` 으로 대기 후 ``actualMs`` 반환 — 스트리밍 타이밍 검증용.`n`n## 산출물`n- ``desktop/ipc/commands.ts`` 1개 파일 변경, ~120 LOC 추가."
  ($t2.id) = "# [WIN-022] 검증 작업 — 완료 (2026-05-23)`n`n## 추가된 회귀 테스트`n- ``desktop/__tests__/ipc-contract.test.ts``: **accept 4 + reject 4** 케이스 추가 (총 19 케이스).`n  - accept: ``state_get_field platform``, ``noop_echo a b c``, ``noop_sleep 0``, ``question_ask`` (sender 없음 → ``COMMAND_FAILED`` 명확화).`n  - reject: ``state_get_field bogus_field``, ``question_ask args=['']``, ``noop_echo args=['x'.repeat(201)]``, ``noop_sleep args=['99999']`` — 모두 ``INVALID_REQUEST``.`n- ``desktop/__tests__/event-bus.test.ts``: ``noop_sleep 120ms`` 호출 → ``command.started``→``command.completed`` 타임스탬프 차이 ≥ 100ms 어서션.`n`n## 실행 결과`n- ``npm run build:desktop`` → 성공.`n- ``npm run test:phase2:windows:compiled`` → ``# tests 19 # pass 19 # fail 0`` (common) + ``# tests 1 # pass 1 # fail 0`` (smoke).`n- 영향받은 두 파일 단독 실행: ``ipc-contract`` 19/19, ``event-bus integration`` 4/4 PASS."
  ($t3.id) = "# [WIN-022] 문서/정합성 반영 — 완료 (2026-05-23)`n`n## 갱신 문서`n- ``winapp만들기/stage1/winapp-manual.md`` §4.1 명령 표를 8행 → **12행** 으로 확장 (각 신규 명령의 인자 패턴/응답 형태 명시).`n- ``desktop/renderer/index.html`` 명령 패널 안내를 12개 명령 나열로 갱신.`n- ``winapp만들기/stage1/change-winapp-phase3-tickets.md`` WIN-022 체크리스트 6/7 [x] (수동 모달 검증 1건은 후속) + ``작업 결과`` 링크.`n- 신규: ``winapp만들기/stage1/result/작업내역-W022.md`` (8 section).`n`n## Taiga 동기화`n- US-22 (id=$($us.id), ref=$($us.ref)) → EP-01 (id=8) ``related_userstories`` 연결 → SP-03 (id=12) 배정.`n- 본 작업으로 세 Task (id $($t1.id)/$($t2.id)/$($t3.id)) PATCH 완료 + status=4."
}

foreach ($task in @($t1, $t2, $t3)) {
  $cur = Invoke-RestMethod -Method Get -Uri "$base/tasks/$($task.id)" -Headers $h
  $patched = PatchJson "$base/tasks/$($task.id)" @{version=$cur.version; status=4; description=$descMap[$task.id]}
  "TASK $($task.id) → status=$($patched.status) version=$($patched.version)"
}
