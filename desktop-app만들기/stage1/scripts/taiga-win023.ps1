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

$us = PostJson "$base/userstories" @{project=1; subject='WIN-023 명령 패널 확장 C - LocalProcessTransport 기반 omx CLI 트리거'; milestone=$sprintId; assigned_to=6; owner=6}
"US_ID=$($us.id) US_REF=$($us.ref)"

$link = PostJson "$base/epics/$epicId/related_userstories" @{epic=$epicId; user_story=$us.id}
"LINKED=$($link.epic)/$($link.user_story)"

$t1 = PostJson "$base/tasks" @{project=1; subject='[WIN-023] 구현 작업'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
$t2 = PostJson "$base/tasks" @{project=1; subject='[WIN-023] 검증 작업'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
$t3 = PostJson "$base/tasks" @{project=1; subject='[WIN-023] 문서/정합성 반영'; user_story=$us.id; milestone=$sprintId; assigned_to=6; owner=6}
"T1=$($t1.id)/$($t1.ref) T2=$($t2.id)/$($t2.ref) T3=$($t3.id)/$($t3.ref)"

$descMap = @{
  ($t1.id) = "# [WIN-023] 구현 작업 — 완료 (2026-05-23)`n`n## 변경 요약`n- ``desktop/ipc/commands.ts``: ``allowedCommands`` 12종 → **15종** 확장 (``omx_doctor``, ``omx_adapt_probe``, ``omx_state_status``).`n- **``omxCliMatrix`` 매핑 테이블** — 사용자 args 를 무시하고 코드 상수 인자 배열만 사용 (인젝션 차단).`n  - ``omx_doctor`` → ``[dist/cli/omx.js, doctor]``.`n  - ``omx_adapt_probe`` → ``[dist/cli/omx.js, adapt, openclaw, probe, --json]``.`n  - ``omx_state_status`` → ``[dist/cli/omx.js, state, list-active, --json]`` (read-only).`n- ``runOmxSubcommand()`` helper — ``child_process.spawn(process.execPath, args, { cwd: process.cwd(), shell:false, windowsHide:true })``.`n- 30초 watchdog (``OMX_CLI_TIMEOUT_MS``) + ``SIGKILL``, stdout/stderr 8KB 절단 (``OMX_CLI_STDOUT_CAP``) + 절단 플래그 응답 포함.`n- ``isOmxExecAllowed()`` — 환경변수 ``OMX_DESKTOP_ALLOW_EXEC=0|false`` 시 즉시 거부 (``COMMAND_FAILED reason=exec-disabled``).`n`n## 산출물`n- ``desktop/ipc/commands.ts`` 1개 파일 변경, ~110 LOC 추가."
  ($t2.id) = "# [WIN-023] 검증 작업 — 완료 (2026-05-23)`n`n## 추가된 회귀 테스트`n- ``desktop/__tests__/ipc-contract.test.ts``: **accept 3 + reject 2** 케이스 추가.`n  - accept: ``omx_doctor``, ``omx_adapt_probe`` (사용자 args ``[ignored, --rm, -rf, /]`` 입력에도 ``argv`` 매트릭스 고정값 유지 검증), ``omx_state_status``.`n  - reject: ``OMX_DESKTOP_ALLOW_EXEC=0`` / ``=false`` 양쪽 ``COMMAND_FAILED`` + ``/exec-disabled/`` 매칭.`n- ``desktop/__tests__/event-bus.test.ts``: ``omx_doctor`` started→completed 페어 + ``exitCode`` 캡처 어서션.`n`n## 실행 결과`n- ``npm run build:desktop`` → 성공.`n- ``npm run test:phase2:windows:compiled`` → ``# tests 19 # pass 19 # fail 0`` (common) + ``# tests 1 # pass 1 # fail 0`` (smoke).`n`n## 한계`n- 30s 실제 타임아웃 회귀는 테스트 시간 비용으로 생략 — 정책 코드 리뷰로 대체.`n- 수동 GUI 검증(패키징 빌드 실행 후 명령 패널에서 stdout 표시)은 후속 게이트에서 수행."
  ($t3.id) = "# [WIN-023] 문서/정합성 반영 — 완료 (2026-05-23)`n`n## 갱신 문서`n- ``winapp만들기/stage1/winapp-manual.md`` §4.1 명령 표를 12행 → **15행** 으로 확장 + **C 그룹 보안 정책 경고 블록** 추가 (실행파일/cwd/타임아웃/출력 상한/환경변수/``dist`` 빌드 전제).`n- ``desktop/renderer/index.html`` 명령 패널 안내를 **15개 명령** 나열로 갱신 (레이블 WIN-021/022/023).`n- ``winapp만들기/stage1/change-winapp-phase3-tickets.md`` WIN-023 체크리스트 **7/8 [x]** (수동 GUI 1건 후속) + ``작업 결과`` 링크.`n- 신규: ``winapp만들기/stage1/result/작업내역-W023.md`` (8 section).`n`n## Taiga 동기화`n- US-23 (id=$($us.id), ref=$($us.ref)) → EP-01 (id=8) ``related_userstories`` 연결 → SP-03 (id=12) 배정.`n- 본 작업으로 세 Task (id $($t1.id)/$($t2.id)/$($t3.id)) PATCH 완료 + status=4."
}

foreach ($task in @($t1, $t2, $t3)) {
  $cur = Invoke-RestMethod -Method Get -Uri "$base/tasks/$($task.id)" -Headers $h
  $patched = PatchJson "$base/tasks/$($task.id)" @{version=$cur.version; status=4; description=$descMap[$task.id]}
  "TASK $($task.id) → status=$($patched.status) version=$($patched.version)"
}
