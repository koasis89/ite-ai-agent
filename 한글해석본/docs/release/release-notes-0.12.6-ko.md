# 릴리스 노트 — 0.12.6

## 요약

`0.12.6`은 `v0.12.5..v0.12.6` 패치 트파트입니다. Wiki 우선 지식 워크플로, 알림 및 후크 전달 강화, 더티 작업 트리 및 승인 흐름 안정성에 초점을 맞춘 32개의 PR 병합과 `dev` 병합 후 명시적으로 연결된 문제를 닫는 새로운 자동화입니다.

## 하이라이트

- **OMX 위키는 최고 수준의 워크플로가 됩니다** — 이번 릴리스에는 CLI/MCP 패리티, 쿼리/린트/새로 고침 흐름, 저장 및 수집 프리미티브가 포함된 로컬 마크다운 위키가 추가되었으며 더 광범위한 저장소 검색 전에 위키 컨텍스트를 삽입할 수 있는 탐색 통합이 추가되었습니다(#1481).
- **세션 가시성 및 알림 강화** — 회신 수신기/세션 상태 상태, 수명 주기 중복 제거, 유휴 휴지 및 tmux 알림 동작이 모두 강화되어 라이브 세션 상태가 더 명확하고 잡음이 적습니다(#1495, #1518, #1520, #1527, #1538).
- **후크 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 전달 안정성** — 기본 후크, 알림 후크 디스패치, 리더 넛지, 관리형 tmux, 폴백 감시자 및 시작/런타임 경로는 오래된 상태, 중복 넛지 및 메일박스/전달 경합을 줄이기 위해 또 다른 안정화 패스를 받았습니다(#1487, #1491, #1493, #1496, #1514, #1525).
- **실행 및 운영자 안전** — 더티 작업 트리 실행 처리는 이제 재사용 전에 경고하지만 주의 흐름 외부에서 심각한 오류를 계속 유지하는 반면 Claude 문제 세션은 불필요한 승인 프롬프트로 인한 지연 없이 명백한 저장소 읽기를 진행할 수 있습니다(#1532, #1536).
- **개발자 병합 문제 자동 종료** — `dev`에 병합된 PR은 이제 관리자 설명과 함께 명시적으로 연결된 로컬 문제를 자동으로 닫아 개발→문제 워크플로를 강화할 수 있습니다(#1541).

## 수정 사항 및 변경 사항이 포함되었습니다.

### 추가됨
- **OMX 위키 워크플로 및 스토리지** — 로컬 위키 페이지, 인덱스/로그 관리, 쿼리/린트/새로 고침 도우미, 위키 MCP 서버 + CLI 패리티, 위키 인식 대체 동작 탐색. (홍보 [#1481](https://github.com/Yeachan-Heo/oh-my-codex/pull/1481))
- **Discord 작업 제어 기본** — 추적된 OMX Discord 세션은 이제 안전한 첫 번째 제어 계층과 더 나은 세션/메시지 재사용 처리를 지원합니다. (PR [#1530](https://github.com/Yeachan-Heo/oh-my-codex/pull/1530), 발행 [#1528](https://github.com/Yeachan-Heo/oh-my-codex/issues/1528))
- **개발자 병합 문제 자동 종료 워크플로** — 병합된 `dev` PR은 병합 후 명시적으로 연결된 저장소 문제를 자동으로 닫을 수 있습니다. (PR [#1541](https://github.com/Yeachan-Heo/oh-my-codex/pull/1541), 발행 [#1540](https://github.com/Yeachan-Heo/oh-my-codex/issues/1540))

### 수정됨 — 후크/알림/세션 상태
- **어레이 지원 보조자 프롬프트는 이제 입력 요구 사항 보기를 올바르게 트리거합니다.** (PR [#1487](https://github.com/Yeachan-Heo/oh-my-codex/pull/1487), 문제 [#1486](https://github.com/Yeachan-Heo/oh-my-codex/issues/1486))
- **로컬 작업자 런타임 시작은 더 이상 오래된 대기열 초안이나 오해의 소지가 있는 스크롤백 때문에 중단되지 않습니다.** (PR [#1491](https://github.com/Yeachan-Heo/oh-my-codex/pull/1491), [#1493](https://github.com/Yeachan-Heo/oh-my-codex/pull/1493), 발행 [#1490](https://github.com/Yeachan-Heo/oh-my-codex/issues/1490), 발행 [#1492](https://github.com/Yeachan-Heo/oh-my-codex/issues/1492))
- **후크 cwd 별칭 불일치로 인해 더 이상 관리 세션 논리 또는 소유권 추적이 중단되지 않습니다.** (PR [#1495](https://github.com/Yeachan-Heo/oh-my-codex/pull/1495))
- **Ralph 조종/인계 및 릴리스 준비는 로직을 세션 전반에 걸쳐 범위가 지정되고 고정되지 않게 마무리합니다.** (PR [#1496](https://github.com/Yeachan-Heo/oh-my-codex/pull/1496), [#1514](https://github.com/Yeachan-Heo/oh-my-codex/pull/1514), 이슈 [#1494](https://github.com/Yeachan-Heo/oh-my-codex/issues/1494), 이슈 [#1513](https://github.com/Yeachan-Heo/oh-my-codex/issues/1513))
- **라이프사이클 브로드캐스트, 후속 키워드 경고, 메타데이터 파생 거짓 긍정 및 사후 중지 키워드 재생이 중복 제거되거나 억제됩니다.** (PR [#1518](https://github.com/Yeachan-Heo/oh-my-codex/pull/1518), [#1520](https://github.com/Yeachan-Heo/oh-my-codex/pull/1520), [#1526](https://github.com/Yeachan-Heo/oh-my-codex/pull/1526), [#1529](https://github.com/Yeachan-Heo/oh-my-codex/pull/1529), 문제 [#1515](https://github.com/Yeachan-Heo/oh-my-codex/issues/1515), [#1519](https://github.com/Yeachan-Heo/oh-my-codex/issues/1519), [#1525](https://github.com/Yeachan-Heo/oh-my-codex/issues/1525), [#1527](https://github.com/Yeachan-Heo/oh-my-codex/issues/1527))
- **오래된 정지 세션 HUD 잔여물은 후속 도구에서 읽기 전에 지워집니다.** (PR [#1539](https://github.com/Yeachan-Heo/oh-my-codex/pull/1539), 문제 [#1538](https://github.com/Yeachan-Heo/oh-my-codex/issues/1538))

### 수정됨 — CLI/설정/실행 동작
- **작업 트리 종속성 부트스트랩**은 이제 강제로 새로 설치하는 대신 안전한 실행 작업 트리를 위해 상위 저장소 종속성을 재사용합니다. (PR [#1510](https://github.com/Yeachan-Heo/oh-my-codex/pull/1510), 발행 [#1507](https://github.com/Yeachan-Heo/oh-my-codex/issues/1507))
- **잘못된 네이티브 후크 stdin JSON**은 런타임 불안정성을 초래하는 대신 방어적으로 처리됩니다. (PR [#1504](https://github.com/Yeachan-Heo/oh-my-codex/pull/1504), 발행 [#1503](https://github.com/Yeachan-Heo/oh-my-codex/issues/1503))
- **사용자가 작성한 AGENTS 콘텐츠는 설정을 새로 고쳐도 유지됩니다.** (PR [#1524](https://github.com/Yeachan-Heo/oh-my-codex/pull/1524), 문제 [#1521](https://github.com/Yeachan-Heo/oh-my-codex/issues/1521))
- **tmux team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자는 프록시 환경 액세스를 유지합니다.** (PR [#1523](https://github.com/Yeachan-Heo/oh-my-codex/pull/1523), 문제 [#1522](https://github.com/Yeachan-Heo/oh-my-codex/issues/1522))
- **더티 작업 트리 주의 흐름**은 이제 재사용 가능한 더티 작업 트리에 대해 경고하는 동시에 실행 주의 경로 외부에 심각한 오류 의미 체계를 유지합니다. (PR [#1535](https://github.com/Yeachan-Heo/oh-my-codex/pull/1535), 발행 [#1532](https://github.com/Yeachan-Heo/oh-my-codex/issues/1532))
- **Claude 문제 세션**은 불필요한 승인 프롬프트로 인해 지연되지 않고 확실한 저장소 읽기를 통해 계속될 수 있습니다. (PR [#1537](https://github.com/Yeachan-Heo/oh-my-codex/pull/1537), 발행 [#1536](https://github.com/Yeachan-Heo/oh-my-codex/issues/1536))

### 수정됨 — MCP/wiki/앱 서버 인터페이스
- **대체된 MCP stdio 형제**는 더 이상 라이브 Codex 앱 서버 상위 항목에 누적되지 않습니다. (PR [#1517](https://github.com/Yeachan-Heo/oh-my-codex/pull/1517), 발행 [#1516](https://github.com/Yeachan-Heo/oh-my-codex/issues/1516))
- **상태 및 위키 MCP 패리티 인터페이스**은 이제 전용 CLI 라우팅(Routing) 및 부트스트랩 등록을 통해 사용할 수 있습니다. (홍보 [#1481](https://github.com/Yeachan-Heo/oh-my-codex/pull/1481))

### 변경됨
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.6`에 맞춰 정렬됩니다.
- **README 및 현지화된 문서**는 이제 표준 혼합 OMX + Codex 기술 루트와 새로운 Wiki 작업 흐름 진입점을 문서화합니다. (PR [#1534](https://github.com/Yeachan-Heo/oh-my-codex/pull/1534), 발행 [#1531](https://github.com/Yeachan-Heo/oh-my-codex/issues/1531))

## 검증 증거

- `npm run build` ✅
- `npm run lint` ✅
- `npm test` ✅
- `npm run test:recent-bug-regressions` ✅
- `node --test dist/cli/__tests__/version-sync-contract.test.js` ✅
- `npm run smoke:packed-install` ✅
