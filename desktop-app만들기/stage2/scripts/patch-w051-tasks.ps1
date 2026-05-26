$ErrorActionPreference='Stop'
$base='http://20.194.2.62:9000/api/v1'
$auth = Invoke-RestMethod -Uri "$base/auth" -Method Post -ContentType 'application/json' -Body (@{type='normal'; username='admin'; password='admin123!@'} | ConvertTo-Json)
$H = @{ Authorization = "Bearer $($auth.auth_token)" }

# Phase 6 / WIN-051 / Tasks 128(구현)/129(검증)/130(문서)
$desc128 = @"
[WIN-051] 구현 작업

[작업내용]
- src/mcp/schema.ts (신규) — zod 스키마. JSON-RPC 2.0 (Request/Response/Notification/Error), JsonRpcInbound 통합, InitializeResult/McpTool/ToolsListResult/ToolsCallResult, McpServerManifest (id slug + command + args default [] + cwd?/env?/enabled default true/autoStart default true), MCP_PAYLOAD_MAX_BYTES=1MB.
- src/mcp/transport-stdio.ts (신규) — LSP 호환 Content-Length 프레이밍. encodeFrame() / FrameDecoder. chunk split (헤더 중간/본문 중간/멀티 메시지), utf-8 byte 단위 본문 슬라이싱(Buffer.subarray), 4096-char 헤더 가드, 1MB 페이로드 가드 (인/아웃바운드 양방향), Content-Length 누락·비숫자·음수 throw.
- src/mcp/client.ts (신규) — McpClient. start(spec)/initialize/listTools/callTool/ping/notify/onNotification/stop. pending Map<number,…> + 30s 타임아웃, ID 정수 자동 증가, initialize 응답 직후 notifications/initialized 자동 전송, 응답 zod 검증 실패 throw, stderr 진단 로그, transport.onExit → pending 일괄 fail.
- desktop/main/mcp/registry.ts (신규) — McpServerRegistry. 매니페스트 배열 + transportFactory 주입. enabled+autoStart 부트, exponential backoff `1s/2s/4s` 최대 3회 후 status='disabled', status/restartCount/lastError/tools health 스냅샷 + onHealthChange 콜백, schedule 주입으로 결정적 테스트, normalizeManifests(unknown) export (zod 통과 + 중복 id 제거).
- tsconfig.desktop.json — include 에 src/mcp/{schema,transport-stdio,client}.ts 추가하여 데스크탑 빌드가 MCP 코어를 함께 컴파일하도록 함.
- package.json — test:phase2:common:compiled 에 mcp-client.test.js + mcp-registry.test.js 추가.

[변경소스파일]
- 신규: src/mcp/schema.ts
- 신규: src/mcp/transport-stdio.ts
- 신규: src/mcp/client.ts
- 신규: desktop/main/mcp/registry.ts
- 신규: desktop/__tests__/mcp-client.test.ts
- 신규: desktop/__tests__/mcp-registry.test.ts
- 수정: tsconfig.desktop.json
- 수정: package.json
"@

$desc129 = @"
[WIN-051] 검증 작업

[검증 내역]
- npm run build:desktop — tsc 0 에러
- npm run test:phase2:common:compiled — node:test 게이트 실행
- mcp-client.test.ts 13 subtest:
  1. FrameDecoder 단일 메시지 한 청크
  2. FrameDecoder 멀티 메시지 한 청크
  3. FrameDecoder chunk split — 헤더 중간 분할
  4. FrameDecoder chunk split — 본문 중간 분할 + 다음 메시지 결합
  5. FrameDecoder Content-Length 누락 → throw
  6. FrameDecoder 페이로드 상한 초과 → throw
  7. encodeFrame 1MB 초과 outbound → throw
  8. McpClient initialize → tools/list 흐름 (응답 zod 통과 + notifications/initialized 자동 송신 확인)
  9. McpClient callTool 결과 반환 + ToolsCallResult 스키마 통과
  10. McpClient JSON-RPC error 응답 → mcp-error[method] reject
  11. McpClient 알림 수신 콜백 (onNotification)
  12. McpClient 요청 타임아웃 → reject
  13. McpClient 응답 zod 검증 실패 → reject
- mcp-registry.test.ts 5 subtest:
  1. normalizeManifests 비배열/잘못된 항목 skip + 중복 id 제거
  2. 정상 spawn → running + tools 캐시
  3. spawn 실패 → exponential backoff (delays=[100,200,400]ms) → maxRestarts 초과 시 disabled
  4. disabled 서버 callTool 거부 ('not running')
  5. enabled=false 매니페스트 spawn 안 함
- LocalProcessTransport 보안 가드 (shell:false / allowedCommands / allowedCwdRoots / envAllowList / kill 3s grace) 는 transport 계층에서 그대로 적용 — registry 는 transportFactory 만 wrapping (보안 가드 변경 없음).

[결과]
- 총 140 tests / 123 pass / 0 fail / 0 cancelled / 17 skipped (duration≈7.2s)
- 직전 베이스라인(W044 종료): 122/105 pass / 0 fail / 17 skipped → +18 tests / +18 pass
- 회귀 무영향: 기존 21개 테스트 파일 모두 그대로 통과
- DoD 충족: tools/list+tools/call 정상 / backoff 재시작 동작 / 1MB 거부 / 회귀 무영향
"@

$desc130 = @"
[WIN-051] 문서/정합성 반영

[반영 내역]
- 티켓 SSOT(change-winapp-phase6-tickets.md) WIN-051 체크리스트 5/6 마감:
  [x] McpClient + stdio 프레이밍 구현
  [x] schema.ts zod (Tool / ServerManifest / JSON-RPC)
  [x] registry.ts 서버 라이프사이클 (spawn/restart/disable)
  [x] LocalProcessTransport 경유 spawn (보안 가드 승계)
  [x] client.test.ts (initialize / tools/list / tools/call / 프레이밍 / backoff)
  [ ] 매뉴얼 §7.1 MCP 서버 등록 절차 추가 — Phase 6 종료 일괄 매뉴얼 갱신 정책에 따라 미체크 유지 (W030~W044 정책 승계)
- Taiga 등록 내역 라인: 이미 등록 완료 (2026-05-24) — Sprint SP-06(15)/Epic EP-02(9)/US-51(48, ref=#185)/Tasks 128·129·130 description PATCH 완료
- 작업 결과 문서 신규 작성 (7 섹션: 식별 / 목표 / 변경 내역 / 핵심 API·정책 / 검증 / 후속 / Taiga 반영)
- patch 스크립트 신규 (Tasks 128/129/130 description 본 PATCH 호출)

[반영된 파일]
- 수정: winapp만들기/stage2/change-winapp-phase6-tickets.md (WIN-051 체크리스트 5/6 → [x])
- 신규: winapp만들기/stage2/result/작업내역-W051.md
- 신규: winapp만들기/stage2/scripts/patch-w051-tasks.ps1
- 신규: src/mcp/schema.ts
- 신규: src/mcp/transport-stdio.ts
- 신규: src/mcp/client.ts
- 신규: desktop/main/mcp/registry.ts
- 신규: desktop/__tests__/mcp-client.test.ts
- 신규: desktop/__tests__/mcp-registry.test.ts
- 수정: tsconfig.desktop.json
- 수정: package.json
"@

$payloads = @{
  128 = $desc128
  129 = $desc129
  130 = $desc130
}

foreach($id in 128,129,130){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id current version=$($t.version) (descLen before=$($t.description.Length))"
  $payload = @{ description = $payloads[$id]; version = $t.version } | ConvertTo-Json -Depth 4
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-WebRequest -Uri "$base/tasks/$id" -Method Patch -Headers $H -ContentType 'application/json; charset=utf-8' -Body $bytes -UseBasicParsing
  Write-Host "PATCH $id -> $($resp.StatusCode)"
}

foreach($id in 128,129,130){
  $t = Invoke-RestMethod -Uri "$base/tasks/$id" -Headers $H
  Write-Host "task $id new version=$($t.version) descLen=$($t.description.Length)"
}
