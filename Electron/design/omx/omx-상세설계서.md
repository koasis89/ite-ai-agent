# OMX 상세 설계서

## 문서 정보
- 문서명: OMX 상세 설계서
- 버전: v0.1
- 작성일: 2026-05-29
- 기준 분석 문서: Electron/analysis/*module-analysis.md
- 기준 설계 문서: Electron/design/omx/*-module-design.md
- 작성자: 고종훈
- 검토자: 고종훈, 고종훈
- 목적: OMX 전역 아키텍처, 런타임, 데이터 모델, 인터페이스, 보안, 성능, 테스트, 변경 관리, 모듈별 상세 설계를 한 문서에서 이해할 수 있게 정리한다.

## 1. 문서 개요

### 1.1 작성 목적
이 문서는 OMX 전체를 처음 보는 개발자가 “무엇이 어디에 있고, 어떤 순서로 호출되며, 어디까지가 공개 계약인지”를 빠르게 이해하도록 돕는 공식 상세 설계서이다. 특히 초보 개발자가 자주 헷갈리는 용어를 많이 풀어 설명하고, 모듈별 책임과 공개 API를 연결해서 읽을 수 있게 구성한다.

### 1.2 범위(In Scope)
- Electron Main/Renderer/Preload 구조
- OMX CLI, hooks, runtime, state, IPC, logs, hud, team, workflow, agent, adapter 계층
- .omx/state 기반 상태 파일과 session-scoped 상태
- 공개 API, 이벤트 채널, CLI 커맨드, 주요 데이터 계약
- 보안, 성능, 테스트, 마이그레이션, 변경 관리
- 모듈별 상세 설계 13장 전 항목

### 1.3 비범위(Out of Scope)
- 내부 구현 코드의 라인별 상세 설명
- 특정 버그 수정 이력의 재현
- 외부 서비스의 운영 정책 원문 전체
- 각 모듈 내부 helper 함수의 세부 구현
- UI 픽셀 단위 스타일링 세부 사항

### 1.4 독자 대상
- OMX 저장소를 처음 접한 신규 개발자
- Electron, IPC, CLI, 상태 파일 구조를 빠르게 파악해야 하는 개발자
- 기능 추가나 리팩터링 전에 호출 관계를 확인하려는 개발자
- 문서를 기준으로 API 변경 영향을 검토하는 리뷰어

## 2. 참조 및 용어

### 2.1 참조 문서
- Electron/design/omx/*-module-design.md
- Electron/design/omx/omx-api-명세서.md
- Electron/design/omx/13-design-review-checklist.md
- Electron/design/design-work-plan-phase2.md
- Electron/analysis/*module-analysis.md

### 2.2 용어/약어 정의
아래 표는 초보 개발자가 전체 설계서를 빠르게 이해하도록, 용어의 정의와 설계 맥락을 함께 정리한 용어집이다.

| 용어 | 정의 | 설계 맥락(어디서 쓰는가) | 초보자 해설(어떻게 이해하면 쉬운가) | 관련 모듈/경로 |
|---|---|---|---|---|
| OMX | 저장소 전체의 제품/런타임/워크플로 시스템 명칭 | 모든 설계 장의 상위 개념 | 앱 이름이 아니라 실행 운영 체계 전체 이름으로 이해 | 전역 |
| Intent 및 라우팅 엔진 | 사용자 입력의 의도를 감지하고 작업 규모를 분류해 실행 레인으로 바인딩하는 엔진 | 입력 해석, triage, 모드 선택, 워크플로 시작점 | "무슨 일을 어디로 보낼지" 결정하는 관제 타워 | `src/hooks/`, `hooks` |
| Intent | 현재 실행 의도를 태그나 상태로 표현한 값 | 후속 실행 분기, 재시도/복구 방향 결정 | 같은 요청이어도 intent가 달라지면 처리 방식이 달라짐 | `hooks`, `pipeline`, `state` |
| Orchestration | 여러 모듈/에이전트/단계를 규칙대로 조정하는 운영 기법 | pipeline/team/ralph의 단계 전이 | "누가, 언제, 무엇을" 실행할지 순서를 잡는 기술 | `pipeline`, `team`, `ralph` |
| Orchestration Intent Tag | 오케스트레이션 의도를 문자열로 표준화한 태그 | 런타임/로그/상태 파일 간 의도 동기화 | 사람이 아니라 시스템이 읽기 좋게 만든 intent 코드 | `state`, `logs` |
| 다중 에이전트 코어 | Planner/Executor/Verifier 등 페르소나 협업 실행 레이어 | 팀 분업, 합의, 검증 루프의 핵심 | 한 명이 다 하는 대신 역할 분리로 품질을 올림 | `src/agents/`, `team`, `ralplan` |
| Planner | 계획 수립 담당 에이전트 역할 | 요구사항 정리, 단계 설계, 리스크 식별 | 먼저 길을 그리는 역할 | `agents`, `planning` |
| Executor | 구현/수정 담당 에이전트 역할 | 코드/문서 실제 변경 수행 | 실제 손을 움직이는 역할 | `agents`, 실행 전 모듈 |
| Verifier | 검증 담당 에이전트 역할 | 테스트/정합성/완료 판정 | "끝났다"를 증거로 확인하는 역할 | `agents`, `test`, `logs` |
| 자가 적응형 기억 엔진 | 턴 결과와 사용자 피드백을 분석해 프로젝트 특화 규칙/스택을 학습하는 계층 | 세션 간 지식 누적, 문맥 재사용, 운영 규칙 적응 | 사람의 해마처럼 경험을 축적해 다음 턴 품질을 높임 | `src/adapt/`, `wiki`, `state` |
| Autopilot Mode | 복수 에이전트의 순차/병렬 협업 루프를 제어하며 목표 달성까지 단계를 갱신하는 모드 | 장기 과제 자동 실행, 단계형 파이프라인 운영 | "자동 주행"처럼 단계 전개를 시스템이 관리 | `pipeline`, `team`, `goal-workflows` |
| Ralph Mode | 기술적 blocking 전까지 사용자 개입 없이 연속 최적화 루프를 수행하는 모드 | 지속 실행, 검증, 수정 루프 | "멈추지 말고 계속" 원칙의 단일 실행 루프 | `ralph`, `runtime` |
| Deep-Interview Mode | 입력 모호성이 높을 때 심층 질의 라운드를 강제하는 모드 | 요구사항 명확화, 오판 방지, 승인 오남용 차단 | 애매하면 구현 전에 반드시 질문으로 명확화 | `question`, `hooks`, `planning` |
| input_lock | Deep-Interview 중 성급한 승인 문자를 일시 차단하는 필드 | 인터뷰 라운드 강제 유지 | `yes/y/proceed`로 조기 종료되는 실수를 막는 안전장치 | `question`, `interlude` |
| Blocking | 기술적으로 현재 레인을 계속 진행할 수 없는 상태 | Ralph/Team 루프 중단 및 재계획 트리거 | 단순 지연이 아니라 "진행 불가" 상태로 이해 | `runtime`, `team`, `ralph` |
| Hook | 런타임 이벤트 시 자동 실행되는 트리거 | 입력/도구/종료 시점 자동화 | 이벤트 기반 자동 스크립트 갈고리 | `hooks`, `scripts` |
| Hook Event | 훅이 발행하는 표준 이벤트 레코드 | 로그/알림/상태 반영의 공통 입력 | 시스템 활동의 공통 로그 단위 | `hooks`, `logs`, `notifications` |
| MCP | 도구/서버/상태를 표준 연결하는 프로토콜 계층 | 외부 도구 서버 연동, stdio 서버 관리 | "플러그인 표준 포트"처럼 이해 | `mcp`, 외부 MCP 서버 |
| ACP | 외부 에이전트 런타임 증거를 읽고 브리지하는 통합 표면 | adapt/hermes 연동 관측 | 외부 에이전트 세계와 OMX를 잇는 제어 평면 | `adapt`, `openclaw` |
| Exclusive File Locking | 동시 수정 충돌을 막기 위한 파일 시스템 기반 배타 락 전략 | AGENTS.md 같은 단일 중요 파일 보호 | 동시에 여러 프로세스가 수정해 깨지는 문제를 예방 | `utils`, `hooks`, 파일 락 구현부 |
| `agents-md.lock/` | AGENTS.md 수정 시 생성되는 배타 락 디렉터리 | 락 소유권 표시 및 충돌 차단 | "지금 내가 수정 중" 표식 디렉터리 | 락 디렉터리 경로 |
| Zombie Lock(좀비 락) | 프로세스가 죽었지만 락만 남아있는 고아 락 상태 | 영구 대기/교착 방지 대상 | 락이 안 풀려 모두 멈추는 상황을 의미 | 락 감시 루틴 |
| PID 생존 감지 (`process.kill(pid, 0)`) | 락 소유 PID가 살아있는지 시그널 0으로 확인하는 점검 방식 | 좀비 락 자동 회수 판단 기준 | 프로세스가 실제 살아있는지 안전하게 확인하는 표준 트릭 | 락 회수 로직 |
| Lock 회수/파기 | 비정상 사멸 소유자의 락을 정리하는 복구 동작 | 장기 교착 해소, 자동 복구 | 죽은 소유자의 잠금을 시스템이 대신 치운다 | 락 관리 유틸 |
| Team | tmux 기반 멀티에이전트 실행 모드 | 리더-워커, 태스크 큐, 메일박스 운영 | 여러 작업자를 동시에 운용하는 팀 실행 | `team`, `sidecar` |
| Team Worker | Team 모드에서 실제 작업을 수행하는 실행 주체 | inbox/task/status 갱신 및 결과 보고 | 팀원 프로세스로 이해 | `team` |
| Team Dispatch | 리더가 워커에게 작업을 배포하는 전달 계층 | 병렬 작업 분배, 우선순위 전달 | "업무 배정" 기능 | `team` |
| Team Mailbox | 리더/워커 메시지 교환 채널 | 상태 보고, 질의/응답, 제어 메시지 | 팀 내부 메신저 | `team` |
| State | 현재 실행 상태를 파일/메모리로 표현한 값 | 모드 동기화, HUD/UI 반영, 재개 근거 | 시스템의 현재 위치를 기록하는 지도 | `state`, `.omx/state` |
| Session Scope | 세션 ID 기준으로 격리된 상태/로그/질문 범위 | 세션 간 충돌 방지, 재현성 확보 | 작업 단위를 폴더로 분리한다고 이해 | `state`, `logs`, `question` |
| Ledger | 상태 변화를 시간 순으로 남기는 append-only 기록 | 감사 추적, 원인 분석, 완료 증거 | "히스토리 장부" | `goal-workflows`, `performance-goal`, `ralph` |
| Snapshot | 특정 시점 상태를 읽기 전용으로 묶은 값 | 비교/검증/표시 기준점 | 사진처럼 그 시점 상태를 고정 저장 | `runtime`, `sidecar`, `hud` |
| Atomic Write | 임시 파일 후 rename으로 교체하는 안전 쓰기 | 파일 손상/부분 쓰기 방지 | 저장 중 비정상 종료에도 파일 일관성 유지 | `state`, `utils` |
| Preflight | 실행 전 환경/조건 사전 점검 단계 | 실패 조기 발견, 불필요 실행 방지 | 출발 전 체크리스트 | `env`, `cli` |
| Graceful Degradation | 일부 실패에도 핵심 기능을 유지하는 전략 | 외부 장애 시 서비스 연속성 확보 | 전부 멈추지 않고 가능한 범위만 유지 | `runtime`, `notifications`, `openclaw` |
| Idempotent | 같은 작업을 반복해도 결과가 안정적인 성질 | 재시도 안전성, 장애 복구 품질 | 재실행해도 부작용이 작아야 함 | `state`, `services`, `scripts` |

### 2.3 전제 및 제약사항
- Electron Main은 권한이 큰 작업을 담당하므로 Renderer가 직접 파일 시스템이나 프로세스를 만지지 않도록 설계한다.
- 공개 API는 내부 helper보다 우선하여 문서화한다.
- 상태 파일은 가능한 한 원자적 쓰기와 검증을 거친다.
- 초보 개발자가 읽는 문서이므로, 약어는 처음 등장 시 풀어쓴다.
- 일부 모듈은 채널명이나 컴포넌트 이름이 공개 API 역할을 한다.

## 3. 시스템 컨텍스트

### 3.1 상위 아키텍처 개요
OMX는 크게 네 층으로 이해하면 쉽다.
- 실행 진입층: CLI, hooks, scripts, main
- 오케스트레이션층: pipeline, planning, team, question, goal-workflows, ralph, ralplan, performance-goal, autoresearch
- 관측/표현층: logs, hud, sidecar, notifications, renderer, components
- 기반/공통층: state, runtime, ipc, services, utils, env, mcp, catalog, auth, agents, adapt, openclaw, wiki, core

이 구조의 핵심은 “사용자 입력이 들어오면 CLI나 Renderer에서 시작되고, Main/IPC를 거쳐 상태와 워크플로로 연결되며, 결과는 다시 Renderer/HUD/로그로 반영된다”는 점이다.

### 3.2 실행 환경(Electron Main/Renderer/Preload)
- Main: 파일 읽기/쓰기, process spawn, IPC handler 등록, state synchronizing을 담당한다.
- Renderer: 채팅 화면, 대시보드, 상태 패널, 마크다운 렌더링을 담당한다.
- Preload: Renderer가 안전하게 호출할 수 있는 API만 노출한다.

초보자 관점에서 중요한 점은 다음과 같다.
- Renderer는 “화면”이다.
- Main은 “권한과 실행”이다.
- Preload는 “안전한 통로”다.

### 3.3 외부 연동 경계(OMX CLI, MCP, OpenClaw 등)
- OMX CLI: 터미널에서 실행하는 사용자 명령의 첫 진입점이다.
- MCP: 외부 서버를 표준 방식으로 띄우고 연결한다.
- OpenClaw: 알림/연동 게이트웨이로 외부 시스템에 메시지를 전달한다.
- Tmux: HUD, 팀 워커, 사이드카 같은 터미널 기반 운영 보조에 사용된다.
- Git/Codex/Filesystem: 상태 파일, 릴리스, 워크트리, 문서 생성에 자주 사용된다.

## 4. 논리 아키텍처 상세

### 4.1 모듈 계층 구조
- 진입점 계층: cli, main, scripts, hooks
- 실행 계층: runtime, core, ipc, mcp
- 워크플로 계층: pipeline, planning, question, goal-workflows, performance-goal, ralph, ralplan, autoresearch, team
- 상태 계층: state, logs, services, utils
- UI/관측 계층: renderer, components, hud, sidecar, notifications
- 통합 계층: adapt, agents, auth, catalog, env, openclaw, wiki, ops

### 4.2 모듈 간 의존성 규칙
- Renderer는 Main과 Preload를 통해서만 소통한다.
- Main은 Renderer 상태를 직접 만지지 않고 IPC를 통해 이벤트를 보낸다.
- 워크플로 계층은 상태 계층에 기록하고, 관측 계층은 이를 읽어 보여준다.
- utils는 공통 기반이므로 가장 아래에 위치한다.
- 상위 레이어가 하위 레이어를 호출하는 방향은 허용되지만, 반대 방향의 강결합은 피한다.

### 4.3 이벤트/명령 흐름 개요
1. 사용자가 Renderer나 CLI에서 입력한다.
2. Main 또는 CLI가 입력을 해석한다.
3. 필요한 경우 hooks가 키워드/트리지를 확인한다.
4. runtime, pipeline, team, question, ralph 등 워크플로로 전달한다.
5. 상태 파일과 로그가 갱신된다.
6. Renderer/HUD/사이드카/알림이 최신 상태를 반영한다.

## 5. 런타임 시퀀스

### 5.1 사용자 입력 처리 시퀀스
1. 사용자가 채팅 입력창 또는 CLI에 명령을 넣는다.
2. 입력은 유효성 검사를 거친다.
3. 키워드나 커맨드가 있으면 적절한 라우터로 전달된다.
4. 도구 호출이 있으면 스트림과 상태가 분리 기록된다.
5. 결과는 메시지, HUD, 태스크, 할일, 알림으로 반영된다.

### 5.2 라우팅/계획/실행 시퀀스
1. planning이 문서와 테스트 스펙을 읽는다.
2. pipeline이 단계 순서를 만든다.
3. question이 사용자 확인이 필요한 질문을 발행한다.
4. team, ralph, ralplan, goal-workflows가 실제 작업/검증/합의 과정을 수행한다.
5. 완료되면 상태와 ledger가 남고, 다음 단계로 handoff된다.

### 5.3 상태 동기화 및 UI 반영 시퀀스
1. Main이 상태 파일과 런타임 스냅샷을 읽는다.
2. IPC 이벤트가 Renderer로 전달된다.
3. Renderer가 `components`를 통해 화면을 갱신한다.
4. HUD와 sidecar는 터미널 상태를 갱신한다.
5. logs는 세션/턴/툴 호출을 기록한다.

### 5.4 오류/중단/재시도 시퀀스
1. 실패가 감지되면 원인과 범위를 분리한다.
2. 복구 가능한 경우 fallback 경로를 시도한다.
3. 사용자 확인이 필요한 경우 question 또는 interlude를 연다.
4. 불가한 경우 명시적 error를 반환하고 상태를 정리한다.
5. 반복 가능 작업은 재시도 가능하게 설계한다.

## 6. 데이터/상태 모델

### 6.1 공통 데이터 계약
- Message: `{ id, role, content }`
- Task: `{ id, title, status }`
- Lifecycle: `{ status, activeMode?, mergedModes, updatedAt, audit? }`
- Stream event: `{ streamId, textChunk }`, `{ streamId, toolName, args? }`, `{ streamId, exitCode, reason? }`
- Goal/workflow state: `version`, `workflow`, `slug`, `status`, `ledger`, `artifactDir`

### 6.2 상태 파일(.omx/state) 모델
- `.omx/state`는 현재 실행 상태를 저장하는 기준 위치다.
- 세션이 있으면 세션 범위를 우선하고, 없으면 루트 범위를 사용한다.
- 상태 파일은 일반적으로 JSON이며, 일부는 JSONL(추가 전용 로그)이다.
- 읽기 전용 파일과 쓰기 파일을 분리해 충돌을 줄인다.

### 6.3 IPC payload 계약
- payload는 채널마다 고정 구조를 가진다.
- 선택 필드가 비어 있을 수 있으므로 기본값 병합이 필요하다.
- 오류 payload는 `code`, `message`를 포함하는 것이 좋다.
- tool call, token, done, lifecycle, todo, interlude, task 이벤트는 서로 다른 계약을 가진다.

### 6.4 버전/호환성 정책
- 스키마 버전이 있는 데이터는 버전 필드를 반드시 유지한다.
- 필드 추가는 backward compatible하게 한다.
- 필드 제거는 deprecated 기간을 두고 진행한다.
- 공개 API 이름 변경은 별도 호환성 계획이 필요하다.

## 7. 인터페이스 설계

### 7.1 Main-Renderer IPC 채널 설계
- Renderer는 `window.electronAPI`만 사용한다.
- Main은 채널별로 invoke/on handler를 등록한다.
- 채널은 역할별로 나눈다: stream, state, task, interlude, env, cli, ops, adapter.
- 채널 간 payload 구조는 단일 소스로 관리하는 것이 이상적이다.

### 7.2 CLI 실행 인터페이스 설계
- `omx <command> [subcommand] [args...]` 형태를 따른다.
- CLI는 읽기/실행/검증/도구 호출을 묶는 최상위 표면이다.
- 커맨드 결과는 종료 코드와 표준 출력/에러로 표현한다.
- 장기 실행 명령은 스트림이나 watch 모드가 될 수 있다.

### 7.3 MCP/Adapter 인터페이스 설계
- MCP는 서버 자동 시작, 상태 경로 해석, 생명주기 telemetry를 담당한다.
- Adapter는 외부 목표 시스템에 대한 읽기/보고/초기화 표면을 제공한다.
- OpenClaw는 외부 통지와 연동을 처리한다.
- auth/catalog/agents/adapt는 설치·구성·관찰용 인터페이스를 제공한다.

## 8. 보안 및 권한 설계

### 8.1 인증/권한 모델
- Main이 권한이 큰 연산을 담당한다.
- Renderer는 직접 권한이 큰 작업을 할 수 없다.
- auth는 슬롯 기반 인증 전환을 관리한다.
- safeStorage 같은 OS 보호 기능은 민감 정보 저장에 사용한다.

### 8.2 입력 검증/무결성
- 경로는 traversal 공격을 막기 위해 검증한다.
- 세션 ID, 슬러그, 모드 이름은 안전한 문자 집합만 허용한다.
- JSON은 파싱 실패 시 안전하게 fallback한다.
- UI에서 받는 payload는 절대 완전히 신뢰하지 않는다.

### 8.3 민감정보/키 관리
- API 키와 토큰은 평문 저장을 피한다.
- 로그에는 민감한 값을 남기지 않는다.
- auth, services, logs, notifications는 마스킹 정책을 지켜야 한다.

### 8.4 감사 추적(Audit)
- ledger.jsonl과 이벤트 로그는 변경 추적을 위한 핵심 수단이다.
- team, ralph, goal-workflows, performance-goal은 상태 변화 이유를 남긴다.
- 알림과 hooks는 언제 어떤 트리거가 발생했는지 기록하는 것이 중요하다.

## 9. 성능 및 안정성 설계

### 9.1 성능 목표 및 지표
- 빠른 초기 로드
- 스트림 응답의 낮은 지연
- 상태 파일 읽기의 최소 I/O
- UI 리렌더 최소화
- tmux/HUD watch loop의 과도한 CPU 사용 방지

### 9.2 병목 구간/최적화 전략
- 상태 파일은 필요한 것만 읽는다.
- 스트림 token은 바로 렌더하되 전체 화면을 매번 다시 그리지 않는다.
- 반복 검사 항목은 캐시한다.
- tmux와 IPC 같은 외부 호출은 최소한으로 사용한다.

### 9.3 장애 복구/폴백 전략
- workspace state가 없으면 user home state를 fallback으로 본다.
- 외부 게이트웨이 실패 시 로컬 안내 메시지를 사용한다.
- 여러 번 실패해도 앱 전체가 죽지 않도록 설계한다.
- task claim 충돌, state lock 충돌, hook dispatch 실패는 복구 경로를 둔다.

### 9.4 관측성(로그/메트릭/트레이스)
- logs는 세션과 툴 호출을 기록한다.
- hud는 현재 활성 상태를 표시한다.
- notifications는 실행 중 주요 이벤트를 외부로 전달한다.
- sidecar는 팀 상태 요약을 보여준다.

## 10. 테스트 전략

### 10.1 단위 테스트 범위
- 경로/문자열/상태 정규화
- payload 파싱
- 상태 전이 규칙
- UI prop 조합
- 안전 JSON과 플랫폼 명령 처리

### 10.2 통합 테스트 범위
- Main-Renderer IPC 연동
- stream token/tool/done 흐름
- state watcher 반영
- team/pipeline/goal-workflow 상태 흐름
- tmux/HUD/sidecar 실행

### 10.3 E2E/시나리오 테스트
- 사용자 입력에서 최종 응답까지의 전체 흐름
- 계획 생성 후 실행 승인까지의 전체 흐름
- 질문/인터류드/재개 시나리오
- 알림/로그/상태 반영 시나리오

### 10.4 회귀 테스트 및 검증 게이트
- 공개 API 변경 시 관련 모듈 설계서와 함께 검토
- 상태 파일 구조 변경 시 읽기/쓰기 동작 확인
- IPC 채널 추가/변경 시 preload와 Main의 일치 여부 확인
- 중요한 워크플로 변경은 체크리스트 기반 검토 수행

## 11. API 완전판 명세 (공개 API 1:1)

- 이 장의 상세 1:1 API 표는 Electron/design/omx/omx-api-명세서.md로 이관했다.
- 본 문서에서는 API 사용 맥락과 설계 원칙만 유지한다.



## 13. 모듈별 상세 설계 (분석 문서 기준)

- 안내: 본 장은 예시 1개(13.34) 포함 템플릿이며, 나머지 모듈은 동일 구조로 확장 작성한다.
- 공통 읽기 규칙:
  - 각 모듈은 책임과 경계
  - 주요 타입/데이터 계약
  - 핵심 시퀀스
  - 상태 전이/불변식
  - 실패 시나리오/복구
  - 테스트 포인트
  를 기준으로 읽는다.

#### 13.1 adapt 모듈 설계
- 기준 문서: Electron/analysis/adapt-module-analysis.md
- 책임: 외부 타겟별 경로/보고서/초기화 산출물 생성
- 핵심 용어: target, envelope, doctor report, probe report, foundation
- 중요한 공개 API: `resolveAdaptPaths`, `buildAdaptEnvelope`, `buildAdaptDoctorReportForTarget`, `initAdaptFoundation`
- 초보자 포인트: “어댑터는 대상 시스템을 직접 바꾸는 모듈이 아니라, 그 대상에 맞춘 진단/초기화 정보를 만들어 주는 모듈”로 이해하면 된다.

#### 13.2 agents 모듈 설계
- 기준 문서: Electron/analysis/agents-module-analysis.md
- 책임: 에이전트 정의를 찾아 설치 가능한 TOML/프롬프트로 변환
- 핵심 용어: agent definition, canonical target, reasoning effort, model overlay
- 중요한 공개 API: `getAgent`, `generateAgentToml`, `composeRoleInstructions`, `installNativeAgentConfigs`
- 초보자 포인트: “agents는 실행 로직보다 설치와 구성에 가까운 모듈”이다.

#### 13.3 auth 모듈 설계
- 기준 문서: Electron/analysis/auth-module-analysis.md
- 책임: 인증 슬롯, 회전 정책, hotswap
- 핵심 용어: slot, quota, hotswap, rotation plan, exhausted
- 중요한 공개 API: `readAuthConfig`, `buildRotationPlan`, `useSlot`, `runAuthHotswap`
- 초보자 포인트: “auth는 로그인 자체보다 ‘어떤 인증 슬롯을 언제 쓸지’ 관리하는 모듈”이다.

#### 13.4 autoresearch 모듈 설계
- 기준 문서: Electron/analysis/autoresearch-module-analysis.md
- 책임: 연구 런, 후보 산출물, 평가자 판정, goal 완료
- 핵심 용어: mission, sandbox, evaluator, candidate, keep_policy
- 중요한 공개 API: `loadAutoresearchMissionContract`, `runAutoresearchEvaluator`, `decideAutoresearchOutcome`, `completeAutoresearchGoal`
- 초보자 포인트: “autoresearch는 실험을 반복하면서 어떤 결과를 남길지 평가하는 자동 연구 워크플로”다.

#### 13.5 catalog 모듈 설계
- 기준 문서: Electron/analysis/catalog-module-analysis.md
- 책임: 카탈로그 스키마, 공개 계약, 설치 가능 여부 판단
- 핵심 용어: manifest, public contract, canonical, mirror, installable
- 중요한 공개 API: `readCatalogManifest`, `validateCatalogManifest`, `toPublicCatalogContract`, `compareSkillMirror`
- 초보자 포인트: “catalog는 OMX가 제공하는 목록과 설치 규칙의 기준표”다.

#### 13.6 cli 모듈 설계
- 기준 문서: Electron/analysis/cli-module-analysis.md
- 책임: 사용자 명령 라우팅
- 핵심 용어: command, subcommand, flag, long-running mode
- 중요한 공개 API: `omx <command> [subcommand] [args...]`
- 초보자 포인트: “cli는 사용자가 가장 먼저 만나는 문 앞”이다.

#### 13.7 goal-workflows 모듈 설계
- 기준 문서: Electron/analysis/goal-workflows-module-analysis.md
- 책임: 목표 런 상태와 handoff/ledger 관리
- 핵심 용어: workflow run, status.json, ledger.jsonl, handoff, validation_passed
- 중요한 공개 API: `createGoalWorkflowRun`, `transitionGoalWorkflowRun`, `assertGoalWorkflowCanComplete`, `buildGoalWorkflowHandoff`
- 초보자 포인트: “goal-workflows는 목표를 하나의 기록 가능한 실행 단위로 다루는 모듈”이다.

#### 13.8 hooks 모듈 설계
- 기준 문서: Electron/analysis/hooks-module-analysis.md
- 책임: keyword 탐지, triage, AGENTS.md overlay, hook event dispatch
- 핵심 용어: prompt routing, triage, overlay, keyword registry, fail-closed
- 중요한 공개 API: `detectKeywords`, `triagePrompt`, `applyAgentsMdOverlay`, `dispatchHookEvent`
- 초보자 포인트: “hooks는 입력이 들어왔을 때 자동 판단과 부가 작업을 수행하는 문지기”다.

#### 13.9 hud 모듈 설계
- 기준 문서: Electron/analysis/hud-module-analysis.md
- 책임: 상태 수집, ANSI 렌더, tmux HUD 관리, authority tick
- 핵심 용어: HUD, tmux pane, render preset, authority, watch loop
- 중요한 공개 API: `readAllState`, `renderHud`, `reconcileHudForPromptSubmit`, `hudCommand`
- 초보자 포인트: “hud는 터미널 한쪽에 현재 상태를 계속 보여주는 계기판”이다.

#### 13.10 mcp 모듈 설계
- 기준 문서: Electron/analysis/mcp-module-analysis.md
- 책임: MCP 서버 자동 시작과 상태 경로 관리
- 핵심 용어: stdio transport, lifecycle telemetry, state path, notepad prune
- 중요한 공개 API: `autoStartStdioMcpServer`, `getStatePath`, `writeMcpLifecycleTelemetry`
- 초보자 포인트: “mcp는 서버를 띄우고 상태 경로를 안정적으로 찾게 해 주는 기반”이다.

#### 13.11 notifications 모듈 설계
- 기준 문서: Electron/analysis/notifications-module-analysis.md
- 책임: 알림 포맷과 발송, tmux 세션 조회, reply listener
- 핵심 용어: dedupe, cooldown, platform, template, fingerprint
- 중요한 공개 API: `getNotificationConfig`, `dispatchNotifications`, `formatNotification`, `notify`
- 초보자 포인트: “notifications는 이벤트를 사람이나 외부 도구가 알아볼 수 있게 전달하는 모듈”이다.

#### 13.12 openclaw 모듈 설계
- 기준 문서: Electron/analysis/openclaw-module-analysis.md
- 책임: 외부 게이트웨이 설정, URL 검증, instruction 전달
- 핵심 용어: gateway, whitelist, SSRF, command gateway, template interpolation
- 중요한 공개 API: `getOpenClawConfig`, `validateGatewayUrl`, `wakeGateway`, `wakeOpenClaw`
- 초보자 포인트: “openclaw는 외부 시스템으로 메시지를 보내는 안전한 출구”다.

#### 13.13 performance-goal 모듈 설계
- 기준 문서: Electron/analysis/performance-goal-module-analysis.md
- 책임: 성능 목표의 생성, 체크포인트, 완료
- 핵심 용어: state.json, ledger.jsonl, evaluator.md, validation pass, reconciliation
- 중요한 공개 API: `createPerformanceGoal`, `checkpointPerformanceGoal`, `completePerformanceGoal`
- 초보자 포인트: “performance-goal은 성능 작업을 작은 검증 가능한 목표로 관리”한다.

#### 13.14 pipeline 모듈 설계
- 기준 문서: Electron/analysis/pipeline-module-analysis.md
- 책임: 단계 흐름, 재개, 취소
- 핵심 용어: stage, canSkip, review cycle, artifact, failedStage
- 중요한 공개 API: `runPipeline`, `canResumePipeline`, `cancelPipeline`, `createStrictAutopilotStages`
- 초보자 포인트: “pipeline은 여러 단계를 순서대로 묶는 실행 계획”이다.

#### 13.15 planning 모듈 설계
- 기준 문서: Electron/analysis/planning-module-analysis.md
- 책임: 계획 산출물 탐색, 최신 항목 선택, 실행 힌트 읽기
- 핵심 용어: PRD, test spec, artifact, visible markdown, ambiguous outcome
- 중요한 공개 API: `readPlanningArtifacts`, `selectMatchingTestSpecsForPrd`, `readApprovedExecutionLaunchHint`
- 초보자 포인트: “planning은 문서 파일을 읽어 무엇을 실행할지 결정하게 돕는다.”

#### 13.16 question 모듈 설계
- 기준 문서: Electron/analysis/question-module-analysis.md
- 책임: 대화형 질문 레코드, 답변 수집, 중단 관리
- 핵심 용어: prompting, answered, aborted, renderer, obligation
- 중요한 공개 API: `createQuestionRecord`, `markQuestionAnswered`, `waitForQuestionAnswer`, `submitQuestionAnswer`
- 초보자 포인트: “question은 사람에게 물어보고 그 답을 안전하게 기록하는 모듈”이다.

#### 13.17 ralph 모듈 설계
- 기준 문서: Electron/analysis/ralph-module-analysis.md
- 책임: 단일 실행 루프의 상태/감사/원장
- 핵심 용어: phase, audit evidence, visual feedback, canonical artifacts
- 중요한 공개 API: `normalizeRalphPhase`, `validateAndNormalizeRalphState`, `evaluateRalphCompletionAuditEvidence`
- 초보자 포인트: “ralph는 작업을 끝낼 때 완료 근거를 엄격하게 확인하는 루프”다.

#### 13.18 ralplan 모듈 설계
- 기준 문서: Electron/analysis/ralplan-module-analysis.md
- 책임: 합의 검증과 계획 복귀 판단
- 핵심 용어: consensus, architect review, critic review, blocked_reason
- 중요한 공개 API: `runRalplanConsensus`, `buildRalplanConsensusGateForCwd`, `hasDurableRalplanConsensusEvidenceForCwd`
- 초보자 포인트: “ralplan은 여러 검토자가 합의했는지 확인하는 모듈”이다.

#### 13.19 runtime 모듈 설계
- 기준 문서: Electron/analysis/runtime-module-analysis.md
- 책임: 실행 결과 분류, 루프, state sync, bridge, process tree
- 핵심 용어: run outcome, lifecycle outcome, bridge, terminal, maxIterations
- 중요한 공개 API: `runUntilTerminal`, `readRunState`, `syncRunStateFromModeState`, `getDefaultBridge`
- 초보자 포인트: “runtime은 실제 실행을 돌리고, 끝났는지 판단하는 엔진”이다.

#### 13.20 scripts 모듈 설계
- 기준 문서: Electron/analysis/scripts-module-analysis.md
- 책임: 훅 진입점, 빌드/검증, 코드 생성, 동기화
- 핵심 용어: notify hook, postinstall, eval, build manifest, version sync
- 중요한 공개 API: `codex-native-hook`, `notify-hook`, `build-api`, `check-version-sync`, `generate-catalog-docs`
- 초보자 포인트: “scripts는 운영 자동화의 손과 발”이다.

#### 13.21 sidecar 모듈 설계
- 기준 문서: Electron/analysis/sidecar-module-analysis.md
- 책임: 팀 상태를 읽어 사이드 패널로 보여주는 관측 계층
- 핵심 용어: snapshot, highlight, watch, tmux split, source warnings
- 중요한 공개 API: `collectSidecarSnapshot`, `renderSidecar`, `launchSidecarTmuxPane`, `sidecarCommand`
- 초보자 포인트: “sidecar는 팀 진행을 옆에서 훑어보는 보조 창”이다.

#### 13.22 state 모듈 설계
- 기준 문서: Electron/analysis/state-module-analysis.md
- 책임: 모드 상태와 canonical skill 상태를 읽고 쓰는 저장소
- 핵심 용어: state_write, state_read, canonical sync, transition reconcile
- 중요한 공개 API: `executeStateOperation`, `listActiveStateModes`, `listStateStatuses`
- 초보자 포인트: “state는 현재 활성 상태를 파일로 보관하는 핵심 창고”다.

#### 13.23 team 모듈 설계
- 기준 문서: Electron/analysis/team-module-analysis.md
- 책임: 멀티에이전트 실행, 태스크 할당, 워커 관리
- 핵심 용어: claim, lease, worker, mailbox, phase transition
- 중요한 공개 API: `startTeam`, `monitorTeam`, `shutdownTeam`, `team-ops gateway`
- 초보자 포인트: “team은 여러 작업자를 한 팀처럼 움직이게 하는 모듈”이다.

#### 13.24 utils 모듈 설계
- 기준 문서: Electron/analysis/utils-module-analysis.md
- 책임: 경로, AGENTS.md, 플랫폼 명령, 안전 JSON, sleep
- 핵심 용어: SSOT, canonical path, PATHEXT, safe json, abortable sleep
- 중요한 공개 API: `omxRoot`, `resolveProjectMemoryPath`, `upsertManagedAgentsBlock`, `buildPlatformCommandSpec`, `safeReadJsonFile`
- 초보자 포인트: “utils는 다른 모든 모듈이 공통으로 쓰는 기초 도구 상자”다.

#### 13.25 wiki 모듈 설계
- 기준 문서: Electron/analysis/wiki-module-analysis.md
- 책임: 지식 문서 ingest, query, lint, lifecycle capture
- 핵심 용어: frontmatter, page, ingest, query, lint, reserved file
- 중요한 공개 API: `ingestKnowledge`, `queryWiki`, `lintWiki`, `readPage`, `writePage`
- 초보자 포인트: “wiki는 마크다운 지식을 저장하고 검색하는 지식 창고”다.

#### 13.26 main 모듈 설계
- 기준 문서: Electron/analysis/main-module-analysis.md
- 책임: Main 프로세스의 IPC, 실행, state, stream 통제
- 핵심 용어: ipc handler, preload bridge, stream bridge, lifecycle, todo sync
- 중요한 공개 API: `window.electronAPI`가 노출하는 채널들
- 초보자 포인트: “main은 앱의 중앙 통제실”이다.

#### 13.27 core 모듈 설계
- 기준 문서: Electron/analysis/core-module-analysis.md
- 책임: 외부 프로세스 실행과 스트림 분해
- 핵심 용어: spawn, envelope, raw line, done, error
- 중요한 공개 API: `execute-command`, `onEnvelope`, `onRawLine`, `onDone`, `onError`
- 초보자 포인트: “core는 명령을 실행하고 결과를 줄 단위로 쪼개는 기본 엔진”이다.

#### 13.28 env 모듈 설계
- 기준 문서: Electron/analysis/env-module-analysis.md
- 책임: 실행 전 환경 점검과 차단
- 핵심 용어: preflight, pass, warn, fail, hint
- 중요한 공개 API: `env-checker` 기반 점검 함수, 점검 결과 객체
- 초보자 포인트: “env는 시작 전에 ‘이 실행이 가능한지’ 미리 검사하는 안전장치”다.

#### 13.29 ipc 모듈 설계
- 기준 문서: Electron/analysis/ipc-module-analysis.md
- 책임: Main-Renderer transport adapter
- 핵심 용어: channel, broadcast, invoke, on, payload
- 중요한 공개 API: `adapter-ipc`, `cli-ipc`, `state-ipc`, `stream-bridge-ipc`, `task-ipc`
- 초보자 포인트: “ipc는 서로 다른 프로세스 사이의 택배 시스템”이다.

#### 13.30 logs 모듈 설계
- 기준 문서: Electron/analysis/logs-module-analysis.md
- 책임: 세션 로그, hook tailing, 이벤트 브로드캐스트
- 핵심 용어: response buffer, hook tailer, priority channel, schema version
- 중요한 공개 API: `init`, `logLlmRequest`, `flushLlmResponse`, `start`, `dispatch`
- 초보자 포인트: “logs는 무슨 일이 일어났는지 기록하는 관측 장치”다.

#### 13.31 ops 모듈 설계
- 기준 문서: Electron/analysis/ops-module-analysis.md
- 책임: 드리프트 진단과 요약
- 핵심 용어: drift, degraded analyze, source warning
- 중요한 공개 API: drift-detector 함수 집합
- 초보자 포인트: “ops는 시스템이 기준에서 얼마나 벗어났는지 확인한다.”

#### 13.32 services 모듈 설계
- 기준 문서: Electron/analysis/services-module-analysis.md
- 책임: 태스크 서비스와 Gemini 키 저장소
- 핵심 용어: claim, version, invalid transition, safeStorage, encrypted key
- 중요한 공개 API: `readTask`, `claimTask`, `transitionTaskStatus`, `saveGeminiApiKey`, `loadGeminiApiKey`
- 초보자 포인트: “services는 비즈니스 규칙을 가진 순수 API 층”이다.

#### 13.33 renderer 모듈 설계
- 기준 문서: Electron/analysis/renderer-module-analysis.md
- 책임: 화면 구성과 사용자 상호작용
- 핵심 용어: stream token, markdown rendering, interlude, deferred skills
- 중요한 공개 API: `ChatContainer.onSendMessage`, `LifecycleDashboard.defaultOpen`
- 초보자 포인트: “renderer는 사용자가 보는 화면과 상호작용을 담당한다.”

#### 13.34 components 모듈 설계 (예시 섹션)
- 기준 문서: Electron/analysis/components-module-analysis.md
- 안내: 본 섹션은 템플릿 작성 방식 예시다. 다른 모듈은 동일 구조(개요/주요기능 + 13.xx.1~13.xx.9)로 확장 작성한다.
- 개요: `components` 모듈은 Renderer UI를 기능 단위로 분리한 프레젠테이션 계층이며, 채팅/상태/설정/보조 오버레이를 조합해 사용자 워크플로우를 구성한다.
- 주요기능:
  - 채팅 상호작용: `ChatContainer`를 중심으로 메시지 입력, 스트리밍 응답, 인터류드 모드, 컨텍스트 첨부 처리
  - 상태 시각화: `LifecycleDashboard`, `TodoPanel`, `TaskTimeline`으로 실행 상태/할일/이력 표시
  - 모델 및 환경 제어: `ModelSelector`, `ApiKeySettings`, `AdapterStatusBar`를 통한 모델 선택, API 키 상태, 어댑터 상태 표시
  - 보조 UX: `WikiOverlay`, `DeferredSkillsNotice`, `ErrorGuideOverlay`, `KnowledgePanel` 기반의 안내/지식 탐색/오류 피드백 제공

##### 13.34.1 책임과 경계
- `components`는 기능 단위 UI 캡슐화를 담당한다.
- 도메인 상태 소스는 Main/IPC이며, 컴포넌트는 구독/표현/입력 수집에 집중한다.
- 주요 축:
  - 대화 축: `ChatContainer`
  - 상태 축: `LifecycleDashboard`, `TodoPanel`, `TaskTimeline`
  - 설정/보조 축: `ModelSelector`, `ApiKeySettings`, `AdapterStatusBar`, `WikiOverlay`

##### 13.34.2 외부/내부 인터페이스
- 외부 인터페이스: `window.electronAPI` 구독/요청 메서드
- 내부 인터페이스: 컴포넌트 props 기반 조합
  - 예: `ChatContainer.onSendMessage`, `ModelSelector.onChange`, `LifecycleDashboard.stateDir`

##### 13.34.3 데이터 구조와 계약
- 메시지 모델: `{ id, role, content }`
- 할일 모델: `{ id, title, status }`
- 수명주기 모델: `{ status, activeMode?, mergedModes, updatedAt, audit? }`
- UI는 수신 payload를 신뢰하지 않고 기본값으로 방어 병합한다.

##### 13.34.4 상태 전이와 불변식
- 채팅 전송 후 스트리밍 시작 전에는 입력 상태를 초기화한다.
- 인터류드 활성 시 일반 입력창은 비활성/오버레이 모드로 전환한다.
- 스트림 완료 시 임시 스트리밍 텍스트를 확정 메시지로 반영한다.

##### 13.34.5 핵심 시퀀스
- 사용자 메시지 전송:
  1. 입력/첨부 컨텍스트 결합
  2. `onSendMessage`로 상위 전달
  3. 스트리밍 token 수신 시 assistant 버블 갱신
  4. done 수신 시 메시지 확정 및 디버그 상태 초기화

##### 13.34.6 오류 처리 및 복구
- IPC 미존재/구독 실패 시 컴포넌트 크래시 없이 no-op 처리
- stream error는 사용자 가시 영역(에러 버블)로 표준 출력
- 구독 해제(cleanup)를 강제해 메모리 누수를 방지

##### 13.34.7 보안/성능 고려
- Markdown 렌더링은 컴포넌트 매핑으로 표시 규칙을 제어한다.
- 긴 텍스트/테이블 렌더링에서 overflow 스타일을 적용해 레이아웃 붕괴를 방지한다.
- 불필요한 리렌더를 줄이기 위해 상태 업데이트 범위를 최소화한다.

##### 13.34.8 테스트 케이스 맵
- 채팅 입력/전송/엔터 키 동작.
- 인터류드 진입/해제 시 UI 잠금 및 복귀.
- todo/lifecycle/tool_call 이벤트 수신 시 화면 갱신.

##### 13.34.9 오픈 이슈
- 컴포넌트별 스타일 분리(CSS module 또는 토큰화) 필요.
- 장문 대화 이력 가상 스크롤 도입 검토.

#### 13.35 test 모듈 설계
- 기준 문서: Electron/analysis/test-module-analysis.md
- 작성 항목: 공통 템플릿 동일
- 책임: 회귀와 통합을 검증하는 테스트 계층
- 핵심 용어: mock, fixture, integration, flaky, regression gate
- 중요한 공개 API: `*.test.ts`, `*.integrated.test.ts`
- 초보자 포인트: “test는 기능이 망가졌는지 빨리 알려주는 안전망”이다.

### 14. 모듈 공통 상세 템플릿 (복붙용)
#### 14.1 책임과 경계
#### 14.2 외부/내부 인터페이스(타입, 스키마, IPC/이벤트)
#### 14.3 데이터 구조와 계약
#### 14.4 상태 전이와 불변식
#### 14.5 핵심 시퀀스 다이어그램
#### 14.6 오류 처리 및 복구
#### 14.7 보안/성능 고려
#### 14.8 테스트 케이스 맵
#### 14.9 오픈 이슈

### 15. 추적성 매트릭스
#### 15.1 요구사항-모듈 매핑
- 사용자 입력 처리: cli, main, ipc, renderer, components
- 상태 동기화: state, logs, hud, sidecar
- 워크플로 실행: pipeline, planning, question, team, goal-workflows, ralph, ralplan, performance-goal, autoresearch
- 외부 연동: mcp, openclaw, auth, agents, adapt, catalog, wiki, ops
- 기반 유틸: runtime, core, utils, env, services

#### 15.2 요구사항-테스트 매핑
- 입력 검증: env, utils, state, services
- 스트림/IPC: core, ipc, main, renderer, components, logs
- 워크플로: pipeline, question, team, ralph, ralplan, performance-goal, goal-workflows
- 관측/알림: hud, sidecar, notifications, openclaw
- 외부 연동: mcp, auth, catalog, adapt, agents, wiki, ops

### 16. 부록
#### 16.1 상태 전이 다이어그램 목록
- runtime terminal flow
- pipeline stage flow
- team phase flow
- question lifecycle flow
- ralph completion gate flow

#### 16.2 시퀀스 다이어그램 목록
- 사용자 입력 처리 시퀀스
- Main-Renderer IPC 시퀀스
- 계획-실행-검증 시퀀스
- 상태 동기화 시퀀스
- 오류/복구 시퀀스

#### 16.3 ADR 요약
- A1: Renderer는 Main을 직접 호출하지 않고 Preload/IPC로만 연결한다.
- A2: 상태 파일은 canonical 경로를 우선하되 fallback을 허용한다.
- A3: 워크플로 완료는 ledger와 snapshot reconciliation을 함께 요구한다.
- A4: 공개 API는 문서화된 이름을 우선 유지한다.

#### 16.4 변경 이력
- v0.1: 초안 작성
- v0.2 예정: 모듈별 세부 API 표와 예제 추가

