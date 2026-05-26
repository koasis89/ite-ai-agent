$ErrorActionPreference = 'Stop'
$base = 'http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{ type='normal'; username='admin'; password='admin123!@' } | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }
$projectId = 1
$userId = $auth.id

$milestones = Invoke-RestMethod -Uri "$base/milestones?project=$projectId" -Headers $H
$sp = $milestones | Where-Object { $_.name -like 'ST3-SP-09*' } | Select-Object -First 1
if (-not $sp) {
  $mBody = @{
    project = $projectId
    name = 'ST3-SP-09 LLM Auth & Gateway (Phase 9)'
    estimated_start = '2026-05-25'
    estimated_finish = '2026-06-07'
  } | ConvertTo-Json -Depth 10
  $sp = Invoke-RestMethod -Uri "$base/milestones" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $mBody
}

$epics = Invoke-RestMethod -Uri "$base/epics?project=$projectId" -Headers $H
$ep = $epics | Where-Object { $_.subject -like 'ST3-EP-01*' } | Select-Object -First 1
if (-not $ep) {
  $eBody = @{
    project = $projectId
    subject = 'ST3-EP-01 LLM Auth & Gateway'
    description = 'Stage3 Phase 9: Auth and Gateway'
  } | ConvertTo-Json -Depth 10
  $ep = Invoke-RestMethod -Uri "$base/epics" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $eBody
}

$usSubject = '[ST3-WIN-097] Streaming timeout retry event contract'
$userStories = Invoke-RestMethod -Uri "$base/userstories?project=$projectId" -Headers $H
$us = $userStories | Where-Object { $_.subject -eq $usSubject } | Select-Object -First 1
if (-not $us) {
  $usDesc = @"
- Goal: finalize token/tool_call/done/error stream event contract
- Reuse-first modules: desktop/ipc/event-bus.ts, desktop/ipc/events.ts, desktop/main/updater/updater.ts
- Extension symbols: retry state machine, cancel token, timeout policy
- New files: prohibited unless justified
- Minimal scope: event types + execution loop + UI state badge
- Contract change: LLM_STREAM_EVENT v1
- Done criteria:
  - stream start p95 is measurable
  - retry/cancel follows policy
- Evidence: timeout/retry/cancel integration tests, progress event order checks
"@
  $usBody = @{
    project = $projectId
    subject = $usSubject
    description = $usDesc
    milestone = $sp.id
    assigned_to = $userId
    owner = $userId
  } | ConvertTo-Json -Depth 10
  $us = Invoke-RestMethod -Uri "$base/userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $usBody
}

try {
  $related = Invoke-RestMethod -Uri "$base/epics/$($ep.id)/related_userstories" -Headers $H
  $linked = $related | Where-Object { $_.id -eq $us.id } | Select-Object -First 1
  if (-not $linked) {
    $linkBody = @{ epic = $ep.id; user_story = $us.id } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/epics/$($ep.id)/related_userstories" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $linkBody | Out-Null
  }
} catch {
  Write-Host "epic-link warning: $($_.Exception.Message)"
}

$taskDefs = @(
  @{
    subject = '[Implementation] ST3-WIN-097 event stream and cancel propagation'
    description = "[Implementation] ST3-WIN-097`n- Changed files: desktop/renderer/app.ts, desktop/renderer/index.html, desktop/renderer/chat.css`n- Core: apply timeout/retry/cancel state machine to free-text run loop and wire status badge/cancel control"
  },
  @{
    subject = '[Validation] ST3-WIN-097 timeout retry cancel integration'
    description = "[Validation] ST3-WIN-097`n- Automated: npm run build:desktop and related regression tests`n- Manual: validate running/cancel/retry/timeout badge transitions"
  },
  @{
    subject = '[Documentation] ST3-WIN-097 streaming state policy update'
    description = "[Documentation] ST3-WIN-097`n- Write stage3 result document`n- Record state machine policy (running -> retries -> success/error)"
  }
)

$existingTasks = Invoke-RestMethod -Uri "$base/tasks?user_story=$($us.id)" -Headers $H
$tasks = @()
foreach ($td in $taskDefs) {
  $found = $existingTasks | Where-Object { $_.subject -eq $td.subject } | Select-Object -First 1
  if ($found) {
    $tasks += $found
    continue
  }
  $tBody = @{
    project = $projectId
    subject = $td.subject
    description = $td.description
    user_story = $us.id
    milestone = $sp.id
    assigned_to = $userId
    owner = $userId
  } | ConvertTo-Json -Depth 10
  $tasks += Invoke-RestMethod -Uri "$base/tasks" -Method Post -Headers $H -ContentType 'application/json; charset=utf-8' -Body $tBody
}

Write-Host "SPRINT id=$($sp.id) name=$($sp.name)"
Write-Host "EPIC id=$($ep.id) subject=$($ep.subject)"
Write-Host "US id=$($us.id) ref=$($us.ref) subject=$($us.subject)"
foreach ($t in $tasks) {
  Write-Host "TASK id=$($t.id) ref=$($t.ref) subject=$($t.subject)"
}
