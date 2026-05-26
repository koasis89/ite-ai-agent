$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Method Post -Uri "$base/auth" -Body (@{type='normal';username='admin';password='admin123!@'} | ConvertTo-Json) -ContentType 'application/json'
$tok=$auth.auth_token
$h=@{Authorization="Bearer $tok"}

function PatchJson($url, $obj) {
  $json = $obj | ConvertTo-Json -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  return Invoke-RestMethod -Method Patch -Uri $url -Headers $h -ContentType 'application/json; charset=utf-8' -Body $bytes
}

# 각 task 현재 version 조회 후 PATCH
$ids = @(92,93,94)
$descMap = @{
  92 = "# [WIN-021] 구현 작업 — 완료 (2026-05-23)`n`n## 변경 요약`n- ``desktop/ipc/commands.ts``: ``allowedCommands`` 2종 → 8종 확장.`n  - 신규: ``hud_get_snapshot``, ``sidecar_get_snapshot``, ``versions_get``, ``platform_get``, ``history_list``, ``event_bus_stats``.`n- ``publishStarted()`` / ``publishCompleted()`` 헬퍼 추출 — 신규 6 case 가 동일 패턴 재사용.`n- Main 측 in-memory **command history ring buffer** (``HISTORY_CAPACITY=50``) 신설 → ``history_list`` 응답 소스.`n- **이벤트 발행 카운터** (``eventCounts``) 신설 → ``event_bus_stats`` 응답 소스 (``bumpEvent()`` 헬퍼).`n- ``sidecar_get_snapshot`` 팀명 정규식 ``^[A-Za-z0-9_-]{1,64}$`` (main 의 ``TEAM_NAME_SAFE_PATTERN`` 과 정합).`n- ``hud_get_snapshot`` / ``sidecar_get_snapshot`` 는 fs 읽기 실패 시 ``warning`` 필드만 채우고 ``ok:true`` 유지 (읽기 시도 결과).`n`n## 산출물`n- ``desktop/ipc/commands.ts`` 1개 파일 변경, ~150 LOC 추가."
  93 = "# [WIN-021] 검증 작업 — 완료 (2026-05-23)`n`n## 추가된 회귀 테스트`n- ``desktop/__tests__/ipc-contract.test.ts``: **accept 6 + reject 2** 케이스 추가 (총 11 케이스).`n  - accept: ``hud_get_snapshot``, ``sidecar_get_snapshot`` (default team), ``versions_get``, ``platform_get``, ``history_list`` (limit 5), ``event_bus_stats``.`n  - reject: ``sidecar_get_snapshot args=['bad/name']`` → ``COMMAND_FAILED``, ``history_list args=['9999']`` → ``COMMAND_FAILED``.`n- ``desktop/__tests__/event-bus.test.ts``: 대표 ``hud_get_snapshot`` 의 ``command.started`` → ``command.completed`` 동일 ``commandId`` 페어 어서션 추가.`n`n## 실행 결과`n- ``npm run build:desktop`` → 성공 (TS compile + copy-assets).`n- ``npm run test:phase2:windows:compiled`` → ``# tests 19 # pass 19 # fail 0`` (common) + ``# tests 1 # pass 1 # fail 0`` (smoke).`n- 영향받은 두 파일 단독 실행: ``ipc-contract`` 11/11, ``event-bus integration`` 3/3 PASS."
  94 = "# [WIN-021] 문서/정합성 반영 — 완료 (2026-05-23)`n`n## 갱신 문서`n- ``winapp만들기/stage1/winapp-manual.md`` §4.1 명령 표를 2행 → **8행** 으로 확장.`n  - 각 행에 인자/응답 데이터 형태 명시.`n- ``desktop/renderer/index.html`` 명령 패널 안내를 8개 명령 나열로 갱신.`n- ``winapp만들기/stage1/change-winapp-phase3-tickets.md`` WIN-021 체크리스트 6/6 [x] + ``작업 결과`` 링크.`n- 신규: ``winapp만들기/stage1/result/작업내역-W021.md`` (8 section, 320+ LOC).`n`n## Taiga 동기화`n- SP-03 신규 스프린트 생성 (id=12).`n- US-21 (id=36, ref=136) → EP-01 (id=8) 에 ``related_userstories`` 로 연결.`n- 본 작업으로 세 Task (id 92/93/94) PATCH 완료 + status=4."
}

foreach ($id in $ids) {
  $cur = Invoke-RestMethod -Method Get -Uri "$base/tasks/$id" -Headers $h
  $patched = PatchJson "$base/tasks/$id" @{version=$cur.version; status=4; description=$descMap[$id]}
  "TASK $id → status=$($patched.status) version=$($patched.version)"
}
