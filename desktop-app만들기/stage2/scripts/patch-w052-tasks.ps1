$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

# Phase 6 / WIN-052 / Tasks 131(구현)/132(검증)/133(문서)
$desc131 = @"
[WIN-052] 구현 작업

[작업내용]
- desktop/main/tools/tool-enabled-store.ts (신규) — %APPDATA%/oh-my-codex/mcp-tools.json 영속 저장소. zod FileSchema(schemaVersion=1 + enabled Record<string,boolean>), atomic write(tmp+rename), JSON 파싱/스키마 실패 시 기본값 복원, isEnabled(id, defaultValue=true) 정책.
- desktop/main/tools/tool-catalog-store.ts (신규) — 카탈로그 SSOT. BUILTIN_TOOLS 3종(builtin:omx_doctor / builtin:omx_adapt_probe / builtin:omx_state_status) + mcpSource 합본. list/search/get/toggleTool/assertEnabled. 정렬 builtin 우선·name asc. enabled 오버레이 default=true.
- desktop/renderer/tools/ToolCard.ts (신규) — DOM 카드 1건 렌더(이름/서버/설명/args 요약/토글 버튼). update() 불변 갱신, onSelect 프리필 훅.
- desktop/renderer/tools/ToolCatalog.ts (신규) — 검색 입력(디바운스 200ms) + 서버 그룹 expand/collapse + tool_list/tool_toggle IPC 연동. ipc 주입형(window.omx.runCommand 호환 인터페이스).
- desktop/ipc/commands.ts (수정) — allowedCommands 에 tool_list, tool_toggle 추가(Phase 3 15종 → 17종). TOOL_ID_RE = ^[a-z0-9][a-z0-9_-]{0,63}:[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,255}$. ToolListArgsSchema(0~1 문자열) / ToolToggleArgsSchema(tuple[toolId regex, enum 'on'|'off']) + perCommandArgValidators 등록. ToolCatalogBackend 인터페이스 + setToolCatalogBackend/getToolCatalogBackend setter(commandHistoryBackend 패턴 승계). switch 분기에 tool_list/tool_toggle 핸들러 추가.

[변경소스파일]
- 신규: desktop/main/tools/tool-enabled-store.ts
- 신규: desktop/main/tools/tool-catalog-store.ts
- 신규: desktop/renderer/tools/ToolCard.ts
- 신규: desktop/renderer/tools/ToolCatalog.ts
- 신규: desktop/__tests__/tool-catalog.test.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: package.json
"@

$desc132 = @"
[WIN-052] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러, copy-assets 정상.
- npm run test:phase2:common:compiled — node:test 게이트 실행.
- desktop/__tests__/tool-catalog.test.ts (신규) 13 subtest:
  ToolEnabledStore 5종 — (1) 신규 파일 생성 + schemaVersion=1, (2) 미존재 id default=true / explicit override false, (3) setEnabled 영속 + 재기동 후 복원, (4) JSON 파싱 손상 시 기본값 복원, (5) schemaVersion 불일치 시 복원.
  ToolCatalogStore 8종 — (1) mcpSource 미지정 시 builtin 3종, (2) builtin+MCP 병합 + namespaced id(`fs:read_file`/`github:search_repos`), (3) enabled 오버레이(default=true / explicit false 반영), (4) search 이름·서버·설명 case-insensitive + empty=all, (5) get(unknown)=null, (6) toggleTool 영속 + onChange 발화 + 재조회 반영, (7) toggleTool(unknown) → throw 'unknown toolId', (8) assertEnabled disabled/unknown throw + 정상 통과.
- desktop/__tests__/ipc-contract.test.ts WIN-052 describe 6 신규 it:
  accept tool_list(no args, tools.length=2) / accept tool_list(query='read', fs:read_file 1건) / accept tool_toggle(['builtin:omx_doctor','off']) backend 호출 검증 / reject tool_toggle(['bad@id','on'])=INVALID_REQUEST(regex) / reject tool_toggle([..,'maybe'])=INVALID_REQUEST(enum) / reject tool_toggle(['builtin:ghost','on'])=COMMAND_FAILED('unknown toolId').
- desktop/__tests__/slash-router.test.ts — ALLOWED_COMMANDS 에 tool_list/tool_toggle 추가 + SLASH_EXCLUDED(question_demo, tool_list, tool_toggle) 도입 후 회귀 통과.
- 보안 회귀: TOOL_ID_RE 화이트리스트 + ToolCatalogBackend.get null 가드 이중. 미주입 상태(toolCatalogBackend=null)에서 tool_list 는 빈 배열, tool_toggle 은 COMMAND_FAILED 반환(부트 누락 안전망).

[결과]
- 총 142 tests / 125 pass / 0 fail / 0 cancelled / 17 skipped (≈7.8s)
- 직전 베이스라인(W051 종료) 140/123 → +2 tests / +2 pass (node:test 가 describe 단위로 합산, 실제 신규 subtest 19종)
- 회귀 무영향: 기존 21개 테스트 파일 모두 통과 (slash-router 단언식 갱신 포함)
- DoD 충족: 카탈로그 표시 / 토글 영속 / 비활성 거부 가드 / accept·reject 회귀
"@

$desc133 = @"
[WIN-052] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT(change-winapp-phase6-tickets.md) WIN-052 체크리스트 4/5 마감:
  [x] ToolCatalog/ToolCard UI + 검색
  [x] tool_list / tool_toggle IPC 명령 + zod 스키마
  [x] config 영속 (%APPDATA%/oh-my-codex/mcp-tools.json — ToolEnabledStore. Phase 5 v1 strict 회피, WIN-053 SQLite 흡수 시점 재검토 메모 추가)
  [x] tool-catalog.test.ts (목록 / 토글 / 비활성 거부)
  [ ] 매뉴얼 §7.2 카탈로그 UI 사용법 추가 — Phase 6 종료 일괄 매뉴얼 갱신 정책에 따라 미체크 유지 (W030~W051 정책 승계)
- Taiga 등록 내역 라인: 이미 등록 완료 (2026-05-24) — Sprint SP-06(15)/Epic EP-02(9)/US-52(49, ref=#189)/Tasks 131·132·133 description PATCH 완료
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속·미진 / Taiga 반영)
- patch 스크립트 신규 (Tasks 131/132/133 description 본 PATCH 호출)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-052 체크리스트 4/5 → [x], 영속 라인 보완)
- 신규: winapp만들기/stage2/result/작업내역-W052.md
- 신규: winapp만들기/stage2/scripts/patch-w052-tasks.ps1
- 신규: desktop/main/tools/tool-enabled-store.ts
- 신규: desktop/main/tools/tool-catalog-store.ts
- 신규: desktop/renderer/tools/ToolCard.ts
- 신규: desktop/renderer/tools/ToolCatalog.ts
- 신규: desktop/__tests__/tool-catalog.test.ts
- 수정: desktop/ipc/commands.ts
- 수정: desktop/__tests__/ipc-contract.test.ts
- 수정: desktop/__tests__/slash-router.test.ts
- 수정: package.json
"@

$payloads = @{
  131 = $desc131
  132 = $desc132
  133 = $desc133
}

foreach($id in 131,132,133){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id current version=$($t.version) (descLen before=$($t.description.Length))"
  $payload = @{ description = $payloads[$id]; version = $t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in 131,132,133){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id new version=$($t.version) descLen=$($t.description.Length)"
}
