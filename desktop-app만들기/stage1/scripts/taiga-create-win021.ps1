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

$sp = PostJson "$base/milestones" @{project=1; name='SP-03 윈도우 데스크탑 앱(3단계, 명령 패널 확장 1차)'; estimated_start='2026-05-23'; estimated_finish='2026-06-06'}
"SPRINT_ID=$($sp.id)"

$us = PostJson "$base/userstories" @{project=1; subject='WIN-021 명령 패널 확장 A - Read-only 진단 명령군'; milestone=$sp.id; assigned_to=6; owner=6}
"US_ID=$($us.id) US_REF=$($us.ref)"

$link = PostJson "$base/epics/8/related_userstories" @{epic=8; user_story=$us.id}
"LINKED=$($link.epic)/$($link.user_story)"

$t1 = PostJson "$base/tasks" @{project=1; subject='[WIN-021] 구현 작업'; user_story=$us.id; milestone=$sp.id; assigned_to=6; owner=6}
$t2 = PostJson "$base/tasks" @{project=1; subject='[WIN-021] 검증 작업'; user_story=$us.id; milestone=$sp.id; assigned_to=6; owner=6}
$t3 = PostJson "$base/tasks" @{project=1; subject='[WIN-021] 문서/정합성 반영'; user_story=$us.id; milestone=$sp.id; assigned_to=6; owner=6}
"T1=$($t1.id)/$($t1.ref) T2=$($t2.id)/$($t2.ref) T3=$($t3.id)/$($t3.ref) US_VER=$($us.version) T1_VER=$($t1.version) T2_VER=$($t2.version) T3_VER=$($t3.version)"
