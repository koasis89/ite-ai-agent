# 릴리스 노트 — 0.13.0

## 요약

`0.13.0`은(는) 배송된 델타가 새로운 `omx adapt` 기반을 추가하는 동시에 Ralph/세션 권한, 기본 중지 라우팅(Routing), HUD 상태 바인딩, macOS 오래된 폴링, 실행 경로 탐색, 56개의 첫 번째 상위 PR 병합과 `v0.12.6..origin/dev` 열차의 최신 `dev` 후속 커밋 전반에 걸친 릴리스/운영자 워크플로를 강화하기 때문에 `0.12.6` 이후의 부 릴리스입니다.

## 하이라이트

- **`omx adapt`은(는) 차세대 영구 대상 기반이 됩니다** — OMX는 이제 OpenClaw 및 Hermes를 시작으로 외부 대상을 위한 자사 어댑터 인터페이스을 보유하고 있습니다. 어댑터 아티팩트는 `.omx/adapters/<target>/...` 아래에 유지되고, 표준 계획 아티팩트에 연결되며, 양방향 제어 플파트을 요청하지 않고 로컬/읽기 전용 런타임 증거를 보고합니다(#1600, #1599, #1598).
- **Ralph/세션 권한이 더 엄격해졌습니다** — Ralph 할당, tmux Ralph 넛지, 프롬프트 측 활성화, PRD CLI 의미 체계 및 기본 중지 핸드오프가 이제 모두 세션 소유권을 보다 일관되게 존중합니다(#1604, #1608, #1591, #1590, #1611).
- **교차 플랫폼 실행 경로는 더 안전합니다** — 탐색/코덱스 해상도는 사용할 수 없는 PATH 항목을 건너뛰고, 샌드박스 PATH에서 pnpm 스타일 POSIX shim을 처리하고, Windows-POSIX 래퍼 혼동을 방지하고, 신호 종료 시 분리된 리더 하위 항목을 정리합니다(#1562, #1610, #1605).
- **후크, HUD 및 알림 상태가 더 조용하고 정확합니다** — 실시간 세션 HUD 바인딩, 시작/디스패치 회귀 범위, Slack 멘션 구문 분석, macOS 오래된 폴링 git-probe 감소, 메타데이터 라우팅 및 수신 에이전트(Agent) 소유권 안내를 통해 오래되거나 사용자가 직면하는 소음을 줄입니다(#1573, #1595, #1585, #1619, #1611).
- **설정 및 릴리스 작업 흐름이 더 명확해졌습니다** — Wiki 설정 등록, 네이티브 후크 의사 적용 범위, 개발 기반 기여 지침 및 종속성 새로 고침을 통해 릴리스/운영자 경로가 정렬된 상태로 유지됩니다(#1571, #1546, #1567, #1575, #1576, #1577, #1578).

## 수정 사항 및 변경 사항이 포함되었습니다.

### 추가됨 - 기초 적응
- `omx adapt <target> <probe|status|init|envelope|doctor>`은 영구 외부 대상에 대한 OMX 소유 어댑터 인터페이스을 노출합니다. (홍보 [#1600](https://github.com/Yeachan-Heo/oh-my-codex/pull/1600))
- OpenClaw 적응은 명령 게이트웨이 옵트인 게이트를 보존하면서 로컬 구성, 게이트웨이, 후크 매핑 및 수명 주기 브리지 증거를 관찰합니다. (홍보 [#1599](https://github.com/Yeachan-Heo/oh-my-codex/pull/1599))
- Hermes 적응은 어댑터 소유 OMX 경로에 쓰기를 유지하면서 ACP, 게이트웨이, 영구 세션 및 부트스트랩 증거를 읽습니다. (홍보 [#1598](https://github.com/Yeachan-Heo/oh-my-codex/pull/1598))

### 수정됨 — Ralph / 런타임 권한 / 워크플로 의미 체계
- Ralph 할당이 더 이상 동시 OMX 세션에서 누출되지 않습니다. (홍보 [#1604](https://github.com/Yeachan-Heo/oh-my-codex/pull/1604))
- 프롬프트 측 `$ralph` 활성화는 PRD 제어 `omx ralph --prd ...` CLI 시작 경로와 명시적으로 다릅니다. (홍보 [#1608](https://github.com/Yeachan-Heo/oh-my-codex/pull/1608))
- Tmux Ralph는 이제 조치를 취하기 전에 표준 세션 워크플로 상태를 확인합니다. (홍보 [#1591](https://github.com/Yeachan-Heo/oh-my-codex/pull/1591))
- 기본 중지는 권한 탐색 핸드오프를 재개하고 세션 ID 드리프트 전반에 걸쳐 안정적으로 유지됩니다. (PR [#1590](https://github.com/Yeachan-Heo/oh-my-codex/pull/1590), 직접 커밋 `4377e1e`)
- 네이티브 후크 메타데이터는 더 이상 실제 사용자 프롬프트를 위한 라우팅을 하이재킹하지 않습니다. (홍보 [#1611](https://github.com/Yeachan-Heo/oh-my-codex/pull/1611))
- 재개된 MCP 상태 작성기는 중복된 코디네이션(Coordination)/자체 해제 경로에서 살아남습니다. (홍보 [#1596](https://github.com/Yeachan-Heo/oh-my-codex/pull/1596))

### 수정됨 — 실행/플랫폼/작업 트리 안전
- `omx explore`은 이제 사용할 수 없는 노드 PATH 항목을 건너뛰고 샌드박스 POSIX Codex shim을 올바르게 해결합니다. (홍보 [#1562](https://github.com/Yeachan-Heo/oh-my-codex/pull/1562), [#1610](https://github.com/Yeachan-Heo/oh-my-codex/pull/1610))
- POSIX 허용 목록 대체가 Windows 경로에 대해 실행되기 전에 Windows 탐색이 닫히지 않습니다. (직접 커밋 `72b1e5d`)
- 분리된 리더 신호 종료는 Codex 하위 프로세스를 종료하고 회귀 적용 범위를 수행합니다. (홍보 [#1605](https://github.com/Yeachan-Heo/oh-my-codex/pull/1605))
- Windows OMX 정리는 실제 고아 서버를 다시 검색합니다. (홍보 [#1589](https://github.com/Yeachan-Heo/oh-my-codex/pull/1589))
- 분리된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작은 오래되고 누락된 작업 트리 레코드를 허용합니다. (홍보 [#1582](https://github.com/Yeachan-Heo/oh-my-codex/pull/1582))

### 수정됨 — 후크/HUD/알림
- HUD 상태는 오래된/루트 대체 대신 라이브 OMX 세션에 고정된 상태로 유지됩니다. (홍보 [#1573](https://github.com/Yeachan-Heo/oh-my-codex/pull/1573))
- 리더 비활성 폴링은 이제 macOS에서 반복되는 git 프로브를 줄여 장기 실행 세션 중 높은 CPU 변동을 낮춥니다. (홍보 [#1619](https://github.com/Yeachan-Heo/oh-my-codex/pull/1619))
- 대기 중인 Codex 시작 배너 및 받은 편지함 발송 동작은 회귀 적용 범위 뒤에 잠겨 있습니다. (홍보 [#1595](https://github.com/Yeachan-Heo/oh-my-codex/pull/1595))
- Slack 멘션 환경 구문 분석에는 전용 알림 적용 범위가 있습니다. (홍보 [#1585](https://github.com/Yeachan-Heo/oh-my-codex/pull/1585))
- 안전한 가역적 OMX/런타임 작업은 이제 생성된 지침에서 수신 에이전트 소유 작업으로 처리됩니다. (직접 커밋 `76e808e`)

### 수정됨 — 설정/문서/릴리스 워크플로
- 이제 Wiki 설정 등록이 배송된 자산과 일치하게 유지됩니다. (홍보 [#1571](https://github.com/Yeachan-Heo/oh-my-codex/pull/1571))
- 기본 후크 닥터/구성은 사용자가 구성 드리프트를 OMX 손상으로 착각하기 전에 인터페이스 누락된 적용 범위를 확인합니다. (홍보 [#1546](https://github.com/Yeachan-Heo/oh-my-codex/pull/1546))
- 일반 기여자 지침은 이제 `dev`을 명시적인 PR 기반으로 만듭니다. (홍보 [#1567](https://github.com/Yeachan-Heo/oh-my-codex/pull/1567))

### 변경됨
- 릴리스 워크플로/도구 종속성이 새로 고쳐졌습니다: `actions/github-script@9`, `softprops/action-gh-release@3`, `@types/node@25.6.0` 및 `@biomejs/biome@2.4.11`. (PR [#1575](https://github.com/Yeachan-Heo/oh-my-codex/pull/1575), [#1576](https://github.com/Yeachan-Heo/oh-my-codex/pull/1576), [#1577](https://github.com/Yeachan-Heo/oh-my-codex/pull/1577), [#1578](https://github.com/Yeachan-Heo/oh-my-codex/pull/1578))
- Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트는 `0.13.0`에 정렬됩니다.

## 이것이 마이너 릴리스인 이유

- 패치 수준 수정 사항이 아닌 새로운 사용자 지향 `omx adapt` CLI 인터페이스과 대상별 어댑터 기반을 추가합니다.
- 릴리스 트파트은 광범위합니다. 56개의 첫 번째 상위 PR이 `v0.12.6..origin/dev`에 병합되고 기본 `v0.12.6` 태그를 기준으로 99개의 파일이 변경됩니다.
- 런타임 소유권, 기본 후크/중지 동작, 플랫폼 간 실행 안전성이 운영자가 볼 수 있는 방식으로 변경되었습니다.

## 검증 증거

릴리스 확인 증거는 `docs/qa/release-readiness-0.13.0.md`에 기록됩니다.

- `npm run build` ✅
- `npm run lint` ✅
- `npm test` ✅
- `npm run test:recent-bug-regressions` ✅
- `node --test dist/cli/__tests__/version-sync-contract.test.js` ✅
- `npm run smoke:packed-install` ✅

## 남은 위험

- 이는 전체 GitHub Actions 매트릭스 재실행이 아닌 로컬 릴리스 준비 단계입니다.
- `omx adapt`은 의도적으로 얇은 로컬 증거 기반입니다. 다운스트림 Hermes/OpenClaw 런타임 승인은 출시 후 관찰 영역으로 유지됩니다.
- 릴리스에서는 기본 후크, Ralph/세션 범위 지정, Windows/탐색 실행 경로 및 알림/HUD 상태를 함께 다루므로 릴리스 후 모니터링은 장기 실행 OMX 세션 및 혼합 tmux/비 tmux 환경에 중점을 두어야 합니다.
