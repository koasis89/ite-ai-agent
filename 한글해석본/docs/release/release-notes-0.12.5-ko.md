# 릴리스 노트 — 0.12.5

## 요약

`0.12.5`은 25개 PR(74개 파일 변경)에 걸친 광범위한 안정성 패치입니다. `0.12.4` 이후 누적된 상호 관련된 세션 범위 지정, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작/종료, Windows 작업자 경로 및 tmux cwd 버그 클러스터를 해결하고 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자를 위한 현재 작업 기준 분기 가드레일을 도입하고 다중 워크플로 상태 관리를 강화합니다.

## 하이라이트

- **다중 기술 계획 상태 보존** — 혼합 워크플로 프롬프트가 비행 중에 다시 라우팅(Routing)될 때 `ralplan`/`ralph` 계획 상태가 더 이상 삭제되지 않습니다. 이는 복합 스킬(Skill) 프롬프트의 두 번째 라우팅 패스에서 `ralPlan`/심층 인터뷰 상태가 지워지는 자동 회귀였습니다. PR [#1471](https://github.com/Yeachan-Heo/oh-my-codex/pull/1471)에 의해 수정되었습니다.
- **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 복구** — 부팅 중에 일찍 멈추는 작업자는 더 이상 전체 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 시퀀스를 중단하지 않습니다. 이제 런타임은 정지 조건을 감지하고 교착 상태 대신 복구 가능한 상태로 돌아갑니다. PR [#1444](https://github.com/Yeachan-Heo/oh-my-codex/pull/1444)에 의해 수정되었습니다.
- **Windows 안정성 클러스터** — 오래된 리더 창 종료 대상 지정(#1470), psmux 작업자 실행 프로그램 경로 확인(#1469), 상위 종료 시 MCP 고아 정리(#1437), 업그레이드 시 폐기된 MCP 구성 복구(#1436) 등 4개의 독립적인 Windows 수정 사항이 함께 제공됩니다.
- **tmux/shell cwd 정확성** — 분리된 tmux 창, 지원되는 셸 작업자 실행 및 Homebrew zsh 경로가 이제 모두 요청된 작업 디렉터리를 따릅니다. 오랫동안 지속되어 온 "작업자가 잘못된 디렉터리에서 시작" 버그를 수정합니다(#1468, #1460, #1462).
- **HUD 및 세션 고정** — HUD 상태는 이제 활성 OMX 세션으로 엄격하게 범위가 지정됩니다. 기본 세션 ID 드리프트로 인해 더 이상 전송 오류가 HUD에서 자동으로 사라지지 않습니다(#1453, #1458).
- **Ralph 스톱-훅 세션 격리** — 세션 전반에 걸친 스톱-훅 누출이 제거됩니다. 이제 중지 후크는 게이팅 전에 세션 권한을 검증합니다(#1466, 문제 #1461).
- **현재 작업 기준 가드레일** — 새로운 작업별 기준 분기 추적을 통해 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자가 올바른 시작 커밋에 고정되도록 유지하여 장기 실행 작업 중에 분기 왜곡을 방지합니다(#1419, 문제 #1407).

## 수정 사항 및 변경 사항이 포함되었습니다.

### 추가됨
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자를 위한 현재 작업 기준 분기 가드레일(PR [#1419](https://github.com/Yeachan-Heo/oh-my-codex/pull/1419), 문제 [#1407](https://github.com/Yeachan-Heo/oh-my-codex/issues/1407))
- 세션 가시성을 손상시키지 않고 표준 상태에서 다중 워크플로 중복 지원이 승인되었습니다(PR [#1427](https://github.com/Yeachan-Heo/oh-my-codex/pull/1427)).
- 네이티브 `ps`(PR [#1457](https://github.com/Yeachan-Heo/oh-my-codex/pull/1457))이 없는 시스템의 알림 후크에 대한 Windows `ps` 대체

### 수정됨 — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작/종료
- 지연된 작업자 시작으로 인해 더 이상 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 부팅이 중단되지 않습니다. (PR [#1444](https://github.com/Yeachan-Heo/oh-my-codex/pull/1444))
- 세션 간 오래된 루트 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 차단 중지 제거(PR [#1451](https://github.com/Yeachan-Heo/oh-my-codex/pull/1451))
- Linux tmux 시작 핸드오프 및 종료 상태 지속성(PR [#1438](https://github.com/Yeachan-Heo/oh-my-codex/pull/1438))
- `session.json` 소유권 및 대체 의미 체계가 강화되었습니다. 오래된 포인터는 더 이상 잘못된 런타임 상태를 되살릴 수 없습니다. (PR [#1447](https://github.com/Yeachan-Heo/oh-my-codex/pull/1447))

### 수정됨 — 다중 기술/워크플로 상태
- 혼합 워크플로 프롬프트 라우팅에 보존된 계획 상태(PR [#1471](https://github.com/Yeachan-Heo/oh-my-codex/pull/1471), 문제 [#1353](https://github.com/Yeachan-Heo/oh-my-codex/issues/1353))
- 워크플로 핸드오프 정확성: 코디네이션(Coordination) 중에 잘못된 형식의 상태가 거부되었습니다. 오래된 상태는 더 이상 실제 핸드오프를 차단하지 않습니다. (PR [#1442](https://github.com/Yeachan-Heo/oh-my-codex/pull/1442))
- 비정상적인 후크 및 HUD 상태 범위가 해결되었습니다. CI 정렬 세션 범위 후크 계약 시행(PR [#1446](https://github.com/Yeachan-Heo/oh-my-codex/pull/1446))

### 고정 — Windows
- 분할 창 종료: 오래된 리더 창 ID가 더 이상 종료 신호를 잘못 전달하지 않습니다(PR [#1470](https://github.com/Yeachan-Heo/oh-my-codex/pull/1470), 문제 [#1353](https://github.com/Yeachan-Heo/oh-my-codex/issues/1353)).
- 기본 psmux 작업자 시작: 작업자는 이제 해결된 Codex 실행 프로그램 경로에서 시작됩니다(PR [#1469](https://github.com/Yeachan-Heo/oh-my-codex/pull/1469), 문제 [#1361](https://github.com/Yeachan-Heo/oh-my-codex/issues/1361)).
- MCP 고아 정리: Windows MCP 하위 프로세스는 더 이상 상위 종료를 유지하지 않습니다(PR [#1437](https://github.com/Yeachan-Heo/oh-my-codex/pull/1437), 문제 [#1435](https://github.com/Yeachan-Heo/oh-my-codex/issues/1435)).
- 폐기된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) MCP 구성 복구: `omx doctor` 및 실행 경로는 업그레이드 시 폐기된 항목을 다시 정렬합니다(PR [#1436](https://github.com/Yeachan-Heo/oh-my-codex/pull/1436)).

### 수정됨 — tmux / macOS / shell
- 분리된 tmux 실행 cwd: 이제 요청된 디렉터리에서 창이 시작됩니다(PR [#1468](https://github.com/Yeachan-Heo/oh-my-codex/pull/1468), 문제 [#1374](https://github.com/Yeachan-Heo/oh-my-codex/issues/1374)).
- 지원되는 셸 실행(zsh, bash) 시 작업자 cwd가 보존됩니다(PR [#1460](https://github.com/Yeachan-Heo/oh-my-codex/pull/1460)).
- macOS에서 Homebrew zsh 정규화: tmux 창 시작 전에 정규화된 경로(PR [#1462](https://github.com/Yeachan-Heo/oh-my-codex/pull/1462), 문제 [#1439](https://github.com/Yeachan-Heo/oh-my-codex/issues/1439))
- tmux 시작 PID 확인이 강화되었습니다. 연결 후 복사 모드 정리됨(PR [#1459](https://github.com/Yeachan-Heo/oh-my-codex/pull/1459))

### 수정됨 — HUD/세션 앵커링
- 활성 OMX 세션에 고정된 HUD 상태. 세션 간 HUD 드리프트 제거(PR [#1453](https://github.com/Yeachan-Heo/oh-my-codex/pull/1453))
- 기본 세션 ID 드리프트는 더 이상 HUD에서 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 전송 실패를 숨기지 않습니다. (PR [#1458](https://github.com/Yeachan-Heo/oh-my-codex/pull/1458))

### 수정됨 — 심층 인터뷰
- 심층 인터뷰 의도 우선 질문 단계 중에 자동 계속 중지가 더 이상 실행되지 않습니다. 이제 해당 단계는 계속을 강제하는 대신 기본 중단 감지를 계획하는 것으로 처리됩니다. (PR [#1473](https://github.com/Yeachan-Heo/oh-my-codex/pull/1473), 발행 [#1472](https://github.com/Yeachan-Heo/oh-my-codex/issues/1472))

### 수정됨 — 하네스 탐색
- `omx explore`은 이제 화물이 기본 툴체인이 구성되지 않은 녹슨 심인 경우 원시 녹슬림 오류를 표시하는 대신 명확한 실행 가능한 오류를 내보냅니다. 사용자는 `rustup default stable`, `OMX_EXPLORE_BIN` 또는 `omx doctor`로 이동됩니다. (`src/cli/explore.ts`)

### 수정됨 — 후크 / 인증 / 알림
- 세션 전반에 걸쳐 Ralph 스톱훅 누출이 제거되었습니다. 게이팅 이전에 세션 권한이 적용됨(PR [#1466](https://github.com/Yeachan-Heo/oh-my-codex/pull/1466), 발행 [#1461](https://github.com/Yeachan-Heo/oh-my-codex/issues/1461))
- 자동 넛지 인증 누출: 읽기 전용 및 계획 흐름은 더 이상 전체 실행 넛지를 수신하지 않습니다(PR [#1434](https://github.com/Yeachan-Heo/oh-my-codex/pull/1434), 문제 [#1416](https://github.com/Yeachan-Heo/oh-my-codex/issues/1416)).
- 대략적인 상태 드리프트를 통해 후크가 라이브 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)을 계속 추적하도록 알림(PR [#1428](https://github.com/Yeachan-Heo/oh-my-codex/pull/1428))
- 실행기 지원 MCP 다시 시작이 제한적으로 지연됨(PR [#1408](https://github.com/Yeachan-Heo/oh-my-codex/pull/1408))

### 문서
- README에서 오래된 `prompts/` 호출 지침을 제거했습니다(PR [#1417](https://github.com/Yeachan-Heo/oh-my-codex/pull/1417)).

## 검증 증거

- `npm run build` ✅
- `npm run lint` ✅
- `npm test` ✅
- `node --test dist/cli/__tests__/version-sync-contract.test.js` ✅
- `npm run smoke:packed-install` ✅
