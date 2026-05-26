# Phase 1 Milestone 3 구현 티켓: 백그라운드 MCP 서버 연동 및 훅 로그 테일러(Tailer) 배치

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 1의 세 번째 마일스톤인 "백그라운드 MCP 서버 연동 및 훅 로그 테일러(Tailer) 배치" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

에이전트의 실시간 동작 상태를 감시하고, 기존 MCP(Model Context Protocol) 자산을 Electron 환경으로 브릿징하여 동적인 상호작용의 기반을 마련하는 것을 목표로 한다.

## 🎯 Phase 1 Milestone 3 범위
- **MCP 서버 브릿지**: `omx mcp-serve` 명령의 `stdio`를 가로채어 백엔드 툴 체인 활성화.
- **Ndjson 로그 테일러**: `.omx/logs/hooks-*.jsonl` 파일의 실시간 스트림 구독 및 이벤트 추출.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-206 | EL-206 | `omx mcp-serve` 기반 MCP 서버 브릿지 구현 |
| US-207 | EL-207 | Ndjson 훅 로그 실시간 감시(Tailer) 및 파일 로테이션 핸들링 |
| US-208 | EL-208 | 런타임 이벤트(Hook Event) 추출 및 Renderer 브로드캐스팅 |

---

### Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기
- **스프린트**: SP-23 : Phase 1 - 런타임 감시 및 서비스 연동
- **유저스토리 매핑**: US-206~US-208 = EL-206~EL-208 (마일스톤 2 이후 순번)

---

## 🎫 EL-206. omx mcp-serve 기반 MCP 서버 브릿지 구현

- **우선순위**: P0
- **실행 순서**: 6번째
- **전제 티켓**: EL-202 (비차단 CLI 실행 인프라 전제)
- **그룹**: Infra (MCP Connection)
- **목표**: `omx mcp-serve <서버명>` 명령을 활용하여 백그라운드 리소스 소유 프로세스를 가동하고, Electron 메인 프로세스와 stdio JSON-RPC 메시지 브릿지를 활성화한다.
- **대상 경로**:
  - `src/main/mcp/mcp-bridge.ts` (신규)
  - `src/main/mcp/mains/mcp-manager.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **다중 서버 풀 제어**: 관리 매니페스트(`manifest.json` 혹은 `.mcp.json`) 스펙에 정의된 `state`, `memory`, `code-intel`, `wiki` 등의 백엔드 서버를 `child_process.spawn`으로 각각 격리 구동.
  2. **좀비 프로세스 원천 차단 (추가)**: Electron Main의 수명주기(`app.on('before-quit')`, `window-all-closed`) 이벤트를 가로채 가동 중인 모든 MCP 하위 프로세스에 `SIGTERM`을 전달하고, 5초 내 미종료 시 `SIGKILL`로 자원을 강제 해제하는 **완전 정리(Teardown) 파이프라인 구현**.
  3. **에러 라우팅**: MCP 서브 프로세스의 `stderr` 출력을 가로채 Main Process 전역 trace 시스템에 기록 및 비정상 크래시 시 재기동(Respawn) 카운트 제어 가드 구현.
- **DoD (완료 기준)**:
  - Electron 구동 시 백그라운드에서 MCP 서버가 정상 실행됨.
  - Renderer에서 특정 툴 호출 시 Main을 거쳐 MCP 서버에 도달하고 결과를 반환받음.
  - 앱 종료 시 자식 프로세스가 유실 없이 정리되어 좀비 프로세스가 남지 않음.
  - 자동 테스트: `mcp-bridge.test.ts` 에서 가상 MCP stdio 에코 테스트 세션 통과.
- **체크리스트**:
  - [ ] 매니페스트 인자를 기반으로 서브 프로세스 그룹을 동적 구동하는 매니저 구조 확립
  - [ ] **[자원 누수 게이트]** Main Process 종료 시 자식 MCP 프로세스를 영구 파괴하는 Teardown 훅 탑재
  - [ ] `stdio` 스트림 파이프 바인딩 및 입출력 채널 정상 격리 확인
  - [ ] `mcp-bridge.test.ts` 에서 가상 MCP stdio 에코 테스트 세션 통과

---

## 🎫 EL-207. Ndjson 훅 로그 실시간 감시(Tailer) 및 파일 로테이션 핸들링

- **우선순위**: P0
- **실행 순서**: 7번째
- **전제 티켓**: EL-201 (환경 경로 검증 완료 필수)
- **그룹**: Infra (Log Stream)
- **목표**: 에이전트 커맨드 가동 시 생성되는 날짜별 줄바꿈 구분 로그 파일(`.omx/logs/hooks-*.jsonl`)의 끝(Tail)을 실시간으로 추적하여 유실 없이 메모리 스트림으로 수집한다.
- **대상 경로**:
  - `src/main/logs/hook-tailer.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **비차단 추적**: `fs.watch` 또는 `chokidar`를 이용하여 디렉터리 내 최신 `.jsonl` 파일 생성 및 수정을 비동기 모니터링하고 폴링 방식을 완전 금지.
  2. **스트림 버퍼 어셈블러 구현 (추가)**: 초당 대량의 디스크 I/O가 쏟아질 때 개행 문자(`\n`) 단위로 잘리지 않은 불완전한 청크 조각(Fragment)이 인입될 경우를 대비, **완전한 줄이 완성될 때까지 잔여 문자열을 누적 보관하는 라인 버퍼링 모듈을 자체 장착**하여 `JSON.parse` 에러 방지.
  3. **날짜 로테이션 스위칭**: 자정이 지나거나 새 세션이 시작되어 파일명이 변경될 경우 기존 읽기 스트림을 `close`하고 새 파일 스트림으로 무중단 핫스위핑(Hot-swapping) 연결을 유지.
- **DoD (완료 기준)**:
  - 에이전트가 로그를 기록하는 즉시 Main Process에서 해당 라인을 가로챌 수 있음.
  - 파일이 변경되거나 다시 생성되어도 끊김 없이 감시가 유지됨.
  - 자동 테스트: `hook-tailer.test.ts` 에서 모킹된 고속 JSONL 데이터 쓰기 테스트 시 누수 0% 달성.
- **체크리스트**:
  - [ ] 파일 워처 인터페이스 기반 신규 파일 생성 및 리스너 가동 구현
  - [ ] **[파싱 안전 게이트]** incomplete 스트림 청크를 안전하게 조립하는 라인 버퍼 어셈블러 구현 완료
  - [ ] 날짜 변경 및 로테이션 발생 시 파일 포인터 무중단 추적 전환 유효성 확인
  - [ ] `hook-tailer.test.ts` 에서 모킹된 고속 JSONL 데이터 쓰기 테스트 시 누수 0% 달성

---

## 🎫 EL-208. 런타임 이벤트(Hook Event) 추출 및 Renderer 브로드캐스팅

- **우선순위**: P1
- **실행 순서**: 8번째
- **전제 티켓**: EL-207 (로그 테일러)
- **그룹**: Logic (Event Dispatcher)
- **목표**: 테일러 스트림에서 파싱된 JSON 이벤트를 가공하여 정식 훅 확장 계약에 부합하는 형태로 정제한 뒤, Electron IPC를 통해 Renderer 레이어의 대시보드로 실시간 전송한다.
- **대상 경로**:
  - `src/main/logs/event-dispatcher.ts` (신규)
  - `src/main/ipc/event-broadcast-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **정식 훅 확장 계약 준수 (추가)**: `hooks-extension-ko.md` 스펙 문서의 규격과 100% 일치하도록 **`schema_version: "1"`, `event`, `timestamp`, `source`, `context`, `session_id/mode` 6대 필드를 온전히 보존 및 매핑하는 검증 계층 적용**.
  2. **특수 파생 신호 필터링**: 프론트엔드 UI가 입체적으로 반응해야 하는 특수 런타임 이벤트(`needs-input`, `pre-tool-use`, `post-tool-use`)를 식별하여 우선순위 패스트 채널로 라우팅.
  3. **무상태 단방향 브로드캐스트**: 메인 프로세스 내부에 과거 이벤트 히스토리 상태를 중복 누적하지 않고, 오직 Renderer로 토스하는 무상태(Stateless) 단방향 파이프라인 설계 원칙 고수.
- **DoD (완료 기준)**:
  - 백그라운드에서 에이전트가 도구 사용 승인을 기다릴 때, UI에 즉각적인 알림이나 모달이 표시됨.
  - 계약 필드가 유실 없이 Renderer에 도달함.
  - 자동 테스트: `event-dispatcher.test.ts` 단위 테스트에서 IPC 이벤트 전송 성공 확인.
- **체크리스트**:
  - [ ] `hooks-extension-ko.md` 양식 계약에 부합하는 Zod 이벤트 필터 가드 구현
  - [ ] UI 바인딩용 `needs-input` 및 도구 실행 전후 상태 알림용 이벤트 특화 디스패처 완료
  - [ ] Renderer 레이어로 이벤트를 단방향 송신할 `omx:runtime-hook-event` IPC 채널 등록
  - [ ] `event-dispatcher.test.ts` 단위 테스트 작성 및 IPC 이벤트 전송 성공 확인
