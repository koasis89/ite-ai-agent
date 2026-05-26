# change-winapp Phase 2 구현 티켓

이 문서는 Phase 1(WIN-001~WIN-010) 완료 이후,
데스크탑 앱 "1차 기능 추가" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-011 ~ WIN-020)는 **권장 실행 순서**에 따라 부여되었다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](개발-보완-검증-체크리스트.md)

Phase 2 범위 (change-winapp분석.md 2단계 기준):
- Transport 추상화 계층 도입 (tmux 의존 분리 시작)
- LocalProcessTransport 구현 (Windows 기본 경로)
- 상태 이벤트 스트리밍 구현 (IPC 구독 채널)
- 진단 UI → 운영형 UI 전환 (명령 히스토리/검색/필터)
- Question 모달 UI 구현
- HUD/Sidecar 패널 UI 구현
- OS별 회귀 테스트 프로파일 분리
- 배포 패키징 준비 (electron-builder)
- Phase 2 릴리스 게이트 문서화

완료 목표:
- tmux 없이 Windows에서 기본 실행 가능한 Transport 경로 확보,
- 진단 패널을 일상 운영 가능한 UI로 격상,
- Question/HUD/Sidecar 핵심 도메인 기능을 데스크탑 패널에서 동작.

---
10개 User Story subject

| US ID | ref | 새 subject |
|---|---|---|
| 26 | 96 | US-11 WIN-011 Transport 추상화 계층 도입 (WorkerTransport 인터페이스) |
| 27 | 100 | US-12 WIN-012 LocalProcessTransport 구현 (Windows 기본 transport) |
| 28 | 104 | US-13 WIN-013 상태 이벤트 스트리밍 구현 (IPC 구독 채널) |
| 29 | 108 | US-14 WIN-014 운영형 UI 전환 - 명령 히스토리/검색/필터 |
| 30 | 112 | US-15 WIN-015 Question 모달 UI 구현 |
| 31 | 116 | US-16 WIN-016 HUD 패널 UI 구현 |
| 32 | 120 | US-17 WIN-017 Sidecar 패널 UI 구현 |
| 33 | 124 | US-18 WIN-018 OS별 회귀 테스트 프로파일 분리 (CI 안정성 강화) |
| 34 | 128 | US-19 WIN-019 배포 패키징 준비 (electron-builder NSIS) |
| 35 | 132 | US-20 WIN-020 Phase 2 릴리스 게이트 문서화 |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-01 : 윈도우 데스크탑 앱 구현
- 스프린트 SP-02 : 윈도우 데스크탑 앱(2단계, 1차 기능 추가)
- 유저스토리 매핑 : US-11~US-20 = WIN-011~WIN-020 (권장 실행 순서대로 부여)

---

## 스프린트 백로그 (SP-02)

---

## WIN-011. Transport 추상화 계층 도입 (WorkerTransport 인터페이스)

- 우선순위: P0
- 실행 순서: 1번째 (모든 후속 티켓의 기반)
- 목표: tmux 의존을 `TmuxTransport`로 국한하고, Transport 인터페이스를 고정한다.
- 대상 경로:
  - `src/core/transport.ts` (신규)
  - `src/team/runtime.ts`
  - `src/team/tmux-session.ts`
- 작업:
  - `WorkerTransport` 인터페이스 정의
    - `start(command, args)`: 프로세스/워커 기동
    - `send(data)`: 입력 전달
    - `onOutput(handler)`: 출력 수신
    - `stop()`: 종료
  - `TmuxTransport` 구현 — 기존 tmux 로직 이전
  - `runtime.ts`가 `WorkerTransport` 인터페이스만 의존하도록 정리
- 산출물:
  - `WorkerTransport` 인터페이스 파일 1개
  - `TmuxTransport` 구현 파일 1개
- 완료 기준(DoD):
  - `runtime.ts`에서 tmux 직접 호출 제거
  - 기존 팀 실행 흐름 회귀 없음
- 체크리스트:
  - [x] `WorkerTransport` 인터페이스 정의 (2026-05-23 완료, `src/core/transport.ts`)
  - [x] `TmuxTransport` 구현 (기존 로직 위임) (2026-05-23 완료, `src/core/tmux-transport.ts`)
  - [~] `runtime.ts` 인터페이스 의존으로 교체 (인터페이스/어댑터 도입 완료. 호출부 점진 전환은 WIN-012/WIN-013에서 회귀 위험 분산)
  - [x] 팀 실행 회귀 테스트 통과 (2026-05-23: 본 변경에 의한 신규 회귀 없음, 신규 계약 테스트 11/11 통과)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W011.md](result/작업내역-W011.md)

- Taiga 등록 내역 (WIN-011) — 등록 완료 (2026-05-23)

  - User Story: US-11 (WIN-011 Transport 추상화 계층)
  - Taiga User Story ID: 26 / Ref: #96
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 62, 63, 64
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-011] 구현 작업`(62), `[WIN-011] 검증 작업`(63), `[WIN-011] 문서/정합성 반영`(64)

---

## WIN-012. LocalProcessTransport 구현 (Windows 기본 transport)

- 우선순위: P0
- 실행 순서: 2번째 (Windows 기본 실행 경로 확보)
- 선행 티켓: WIN-011
- 목표: tmux 없이 Windows에서 child process 기반으로 워커를 실행한다.
- 대상 경로:
  - `src/core/local-process-transport.ts` (신규)
  - `desktop/main/index.ts`
- 작업:
  - `LocalProcessTransport` 구현 (`WorkerTransport` 인터페이스 구현)
    - Node.js `child_process.spawn` 기반
    - stdout/stderr 스트림 → `onOutput` 연결
    - stdin → `send` 연결
  - 명령 인자 escaping/검증 적용 (보안)
  - 작업 디렉터리 제한 정책 적용 (보안)
  - `desktop/main`에서 `LocalProcessTransport` 기본 선택
- 산출물:
  - `LocalProcessTransport` 구현 파일 1개
  - Windows 환경 기본 실행 경로 확보
- 완료 기준(DoD):
  - tmux 미설치 Windows 환경에서 워커 기동 성공
  - 출력 스트림이 Renderer 이벤트로 전달
- 체크리스트:
  - [x] `LocalProcessTransport` 구현 (2026-05-23 완료, `src/core/local-process-transport.ts`)
  - [x] 명령 인자 escaping 적용 (null byte / `..` traversal 거부, `shell:false` 강제)
  - [x] 작업 디렉터리 제한 로직 추가 (`allowedCwdRoots` 화이트리스트)
  - [x] Desktop Main에서 기본 transport로 등록 (`desktop/main/index.ts` — Windows 시 setDefault)
  - [x] Windows 환경 실행 smoke 테스트 추가 (2026-05-23: 신규 16/16 subtests 통과, `TEST_EXIT:0`)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W012.md](result/작업내역-W012.md)
- 설계 참고: [phase2-win12-tmux대체구현.md](phase2-win12-tmux대체구현.md)

- Taiga 등록 내역 (WIN-012) — 등록 완료 (2026-05-23)

  - User Story: US-12 (WIN-012 LocalProcessTransport 구현)
  - Taiga User Story ID: 27 / Ref: #100
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 65, 66, 67
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-012] 구현 작업`(65), `[WIN-012] 검증 작업`(66), `[WIN-012] 문서/정합성 반영`(67)

---

## WIN-013. 상태 이벤트 스트리밍 구현 (IPC 구독 채널)

- 우선순위: P0
- 실행 순서: 3번째 (WIN-014~017 공통 기반)
- 선행 티켓: WIN-012
- 목표: Main → Renderer 방향의 실시간 이벤트 스트림을 IPC로 구현한다.
- 대상 경로:
  - `desktop/ipc/events.ts` (기존 파일 확장)
  - `desktop/preload/index.ts`
  - `desktop/renderer/app.ts`
- 작업:
  - `ipcMain.on` 대신 `ipcMain` 이벤트 push 채널 정의
  - `window.omx.subscribeEvents(handler)` preload API 추가
  - Renderer에서 이벤트 구독 후 타임라인 패널 실시간 갱신
  - `command.started`, `command.progress`, `command.completed`, `command.failed` 이벤트 전달
- 산출물:
  - IPC 구독 API + Renderer 실시간 타임라인
- 완료 기준(DoD):
  - 명령 실행 중 progress 이벤트가 타임라인에 실시간 표시
  - 구독 해제(unsubscribe) 시 이벤트 수신 중단
- 체크리스트:
  - [x] IPC 이벤트 push 채널 구현 (`omx:event` 채널) (2026-05-23 완료, `desktop/ipc/events.ts` + `desktop/ipc/event-bus.ts` 신규)
  - [x] `subscribeEvents` / `unsubscribeEvents` preload API 추가 (2026-05-23 완료, `desktop/preload/index.ts` 확장)
  - [x] Renderer 타임라인 실시간 갱신 연결 (2026-05-23 완료, `desktop/renderer/app.ts` 구독 + 포맷터)
  - [x] 구독 해제 흐름 구현 (2026-05-23 완료, preload 참조 카운팅 + Main `destroyed` 자동 정리)
  - [x] IPC 구독 계약 테스트 추가 (2026-05-23 완료, `desktop/__tests__/event-bus.test.ts` 12 subtests 통과)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W013.md](result/작업내역-W013.md)

- Taiga 등록 내역 (WIN-013) — 등록 완료 (2026-05-23)

  - User Story: US-13 (WIN-013 상태 이벤트 스트리밍)
  - Taiga User Story ID: 28 / Ref: #104
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 68, 69, 70
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-013] 구현 작업`(68), `[WIN-013] 검증 작업`(69), `[WIN-013] 문서/정합성 반영`(70)

---

## WIN-014. 운영형 UI 전환 — 명령 히스토리/검색/필터

- 우선순위: P0
- 실행 순서: 4번째 (독립 작업, WIN-013과 병행 가능)
- 목표: 진단 전용 패널을 일상 운영 가능한 UI로 격상한다.
- 대상 경로:
  - `desktop/renderer/app.ts`
  - `desktop/renderer/styles.css`
  - `desktop/renderer/index.html`
- 작업:
  - 명령 히스토리 목록 표시 (최근 N개, 스크롤 가능)
  - 명령 검색/필터 입력 필드 추가
  - 재실행(Replay) 버튼 추가
  - 히스토리 항목 클릭 시 결과 패널에 재표시
- 산출물:
  - 운영형 Renderer UI (히스토리/검색 포함)
- 완료 기준(DoD):
  - 명령 실행 후 히스토리에 자동 추가
  - 검색어 입력 시 목록 실시간 필터
  - 재실행 버튼으로 동일 명령 재실행 성공
- 체크리스트:
  - [x] 히스토리 저장 자료구조 설계 (in-memory) (2026-05-23 완료, `desktop/renderer/history-store.ts` `HistoryStore` 클래스 신규 — FIFO max=50, onChange/idFactory/now 주입 지원)
  - [x] 히스토리 목록 컴포넌트 구현 (2026-05-23 완료, `desktop/renderer/index.html` 패널 + `desktop/renderer/styles.css` 스타일 + `desktop/renderer/app.ts` `renderHistory()`)
  - [x] 검색/필터 UI 구현 (2026-05-23 완료, `#history-search` input → `HistoryStore.filter()` 위임, command/args/error 부분 일치)
  - [x] 재실행 기능 구현 (2026-05-23 완료, 항목 클릭 → `showHistoryEntry`, Replay 버튼 → `runCommand` 재호출)
  - [x] 기존 진단 패널 기능 회귀 없음 확인 (2026-05-23 완료, `ipc-contract.test.js` 3/3 + `event-bus.test.js` 12/12 통과)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W014.md](result/작업내역-W014.md)

- Taiga 등록 내역 (WIN-014) — 등록 완료 (2026-05-23)

  - User Story: US-14 (WIN-014 운영형 UI 전환)
  - Taiga User Story ID: 29 / Ref: #108
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 71, 72, 73
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-014] 구현 작업`(71), `[WIN-014] 검증 작업`(72), `[WIN-014] 문서/정합성 반영`(73)

---

## WIN-015. Question 모달 UI 구현

- 우선순위: P0
- 실행 순서: 5번째 (WIN-013 완료 후)
- 선행 티켓: WIN-013
- 목표: CLI의 블로킹 질문 루프를 데스크탑 모달/패널로 대체한다.
- 대상 경로:
  - `desktop/renderer/question-modal.ts` (신규)
  - `desktop/ipc/question.ts` (신규)
  - `desktop/preload/index.ts`
  - `src/question/renderer.ts` (desktop-ipc 전략 추가)
- 작업:
  - Main에서 질문 레코드 생성 후 IPC로 Renderer에 전달
  - Renderer 모달에 질문 표시 (텍스트/선택지)
  - 답변 입력 후 IPC로 Main에 제출
  - 기존 CLI 질문 루프(`runQuestionUi`)는 CLI 전용으로 격리 유지
- 산출물:
  - `window.omx.question` IPC API
  - Renderer 질문 모달 UI
- 완료 기준(DoD):
  - `question` 명령 실행 시 모달 표시
  - 답변 제출 후 IPC로 결과 반환 성공
  - CLI 기존 질문 흐름 회귀 없음
- 체크리스트:
  - [x] IPC question 채널 정의 (`omx:question:ask`, `omx:question:answer`, +`omx:question:cancel`) — 2026-05-23
  - [x] Renderer 모달 UI 구현 — `desktop/renderer/question-modal.ts` (단일/복수 + allow_other) — 2026-05-23
  - [x] Main 질문 상태 관리 구현 — `desktop/ipc/question.ts` (`QuestionBroker`, pending/answer/cancel/cancelBySender/dispose) — 2026-05-23
  - [x] `src/question/renderer.ts`에 `desktop-ipc` 전략 추가 — `OMX_QUESTION_RENDERER=desktop-ipc` env 옵트인 — 2026-05-23
  - [x] CLI 격리 확인 (TTY/readline 루프 영향 없음) — env 미설정 시 default 회귀 테스트 추가 — 2026-05-23
  - [x] 질문-답변 왕복 통합 테스트 추가 — `desktop/__tests__/question-broker.test.ts` 12 subtests pass — 2026-05-23
- 작업 결과: [winapp만들기/stage1/result/작업내역-W015.md](result/작업내역-W015.md)

- Taiga 등록 내역 (WIN-015) — 등록 완료 (2026-05-23)

  - User Story: US-15 (WIN-015 Question 모달 UI)
  - Taiga User Story ID: 30 / Ref: #112
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 74, 75, 76
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-015] 구현 작업`(74), `[WIN-015] 검증 작업`(75), `[WIN-015] 문서/정합성 반영`(76)

---

## WIN-016. HUD 패널 UI 구현

- 우선순위: P1
- 실행 순서: 6번째 (WIN-013 완료 후)
- 선행 티켓: WIN-013
- 목표: tmux 기반 HUD 렌더를 데스크탑 패널 ViewModel로 전환한다.
- 구현 상세 : `winapp만들기\stage1\winapp-phase2-win16-HUD대체.md`
- 대상 경로:
  - `desktop/renderer/hud-panel.ts` (신규)
  - `desktop/ipc/hud.ts` (신규)
  - `src/hud/index.ts` (ViewModel API 노출)
- 작업:
  - `readAllState()` 결과를 IPC로 Renderer에 전달
  - Renderer HUD 패널에서 상태 실시간 표시
  - ANSI 시퀀스 제거 (패널에서 파싱 불필요)
  - HUD watch 갱신을 IPC 이벤트 스트림으로 연결
- 산출물:
  - Renderer HUD 패널 + `window.omx.hud` IPC API
- 완료 기준(DoD):
  - HUD 패널에서 현재 상태 표시 확인
  - 상태 변경 시 패널 자동 갱신
  - 기존 CLI HUD 출력 회귀 없음
- 체크리스트:
  - [x] `src/hud/index.ts`에 ViewModel 반환 경로 추가 (2026-05-23) — `readAllState`/`readHudConfig`/`DEFAULT_HUD_CONFIG` 재노출 + `getHudSnapshot(cwd)` 추가
  - [x] IPC HUD 채널 정의 (`omx:hud:snapshot`, `omx:hud:watch`) (2026-05-23) — `HUD_SNAPSHOT`(invoke), `HUD_WATCH`/`HUD_UNWATCH`(send), `hud.update` push 이벤트 추가
  - [x] Renderer HUD 패널 UI 구현 (2026-05-23) — `desktop/renderer/hud-panel.ts` + `<section id="panel-hud">` + `.panel-hud` 스타일
  - [x] ANSI 시퀀스 제거/무해화 처리 (2026-05-23) — `stripAnsi` 헬퍼 + `normalizeHudContext` 적용
  - [x] CLI HUD 회귀 확인 (2026-05-23) — `src/hud/*` 무변경(추가 export만), CLI HUD 테스트 41/42(사전 실패 1건 — baseline 동일)

- 작업 결과: [winapp만들기/stage1/result/작업내역-W016.md](result/작업내역-W016.md)

- Taiga 등록 내역 (WIN-016) — 등록 완료 (2026-05-23)

  - User Story: US-16 (WIN-016 HUD 패널 UI)
  - Taiga User Story ID: 31 / Ref: #116
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 77, 78, 79
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-016] 구현 작업`(77), `[WIN-016] 검증 작업`(78), `[WIN-016] 문서/정합성 반영`(79)

---

## WIN-017. Sidecar 패널 UI 구현

- 우선순위: P1
- 실행 순서: 7번째 (WIN-016 이후 병행 가능)
- 선행 티켓: WIN-013
- 목표: tmux 기반 Sidecar 렌더를 데스크탑 패널 ViewModel로 전환한다.
- 대상 경로:
  - `desktop/renderer/sidecar-panel.ts` (신규)
  - `desktop/ipc/sidecar.ts` (신규)
  - `src/sidecar/index.ts` (ViewModel API 노출)
- 작업:
  - `collectSidecarSnapshot()` 결과를 IPC로 Renderer에 전달
  - Renderer Sidecar 패널에서 스냅샷 표시
  - watch 갱신을 IPC 이벤트 스트림으로 연결
  - ANSI 시퀀스 제거
- 산출물:
  - Renderer Sidecar 패널 + `window.omx.sidecar` IPC API
- 완료 기준(DoD):
  - Sidecar 패널에서 스냅샷 표시 확인
  - 상태 변경 시 패널 자동 갱신
  - CLI Sidecar 회귀 없음
- 체크리스트:
  - [x] `src/sidecar/index.ts`에 ViewModel 반환 경로 추가 — (2026-05-23) `collectSidecarSnapshot` / 타입 re-export + `getSidecarSnapshot(teamName)` thin wrapper 추가
  - [x] IPC Sidecar 채널 정의 (`omx:sidecar:snapshot`, `omx:sidecar:watch`) — (2026-05-23) `omx:sidecar:snapshot/watch/unwatch` + `sidecar.update` 이벤트 타입 추가
  - [x] Renderer Sidecar 패널 UI 구현 — (2026-05-23) `SidecarViewModel` + `SidecarPanel` DOM 어댑터 + 팀 입력/시작·중지 컨트롤
  - [x] CLI Sidecar 회귀 확인 — (2026-05-23) `dist/sidecar/__tests__/*.test.js` 5/5 통과, desktop 테스트 0 fail
- 작업 결과: [winapp만들기/stage1/result/작업내역-W017.md](result/작업내역-W017.md)

- Taiga 등록 내역 (WIN-017) — 등록 완료 (2026-05-23)

  - User Story: US-17 (WIN-017 Sidecar 패널 UI)
  - Taiga User Story ID: 32 / Ref: #120
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 80, 81, 82
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-017] 구현 작업`(80), `[WIN-017] 검증 작업`(81), `[WIN-017] 문서/정합성 반영`(82)

---

## WIN-018. OS별 회귀 테스트 프로파일 분리 (CI 안정성 강화)

- 우선순위: P1
- 실행 순서: 8번째 (WIN-012 완료 후)
- 선행 티켓: WIN-012
- 목표: Windows/Linux 프로파일을 분리해 CI에서 플랫폼 오탐을 없앤다.
- 대상 경로:
  - `package.json` 스크립트
  - `src/cli/__tests__/`
  - `desktop/__tests__/`
- 작업:
  - `test:phase2:windows` / `test:phase2:linux` 스크립트 분리
  - tmux 전제 테스트를 `TmuxTransport` 전용 플래그로 격리
  - CI yml(또는 로컬 실행 가이드)에 OS 조건 기재
  - Windows 전용 smoke 테스트 세트 추가 (LocalProcessTransport 기반)
- 산출물:
  - OS별 테스트 실행 명령 문서화
  - 분리된 테스트 세트
- 완료 기준(DoD):
  - Windows 프로파일이 tmux 없이 일관되게 통과
  - Linux 프로파일에서 기존 테스트 회귀 없음
- 체크리스트:
  - [x] `test:phase2:windows` 스크립트 추가 (2026-05-23)
  - [x] `test:phase2:linux` 스크립트 추가 (2026-05-23)
  - [x] tmux 전제 테스트 격리 플래그 적용 (2026-05-23, `test:phase2:linux:compiled` 전용 묶음)
  - [x] Windows smoke 테스트 세트 추가 (2026-05-23, `desktop/__tests__/win-smoke.test.ts`)
  - [x] 실행 가이드 문서 갱신 (2026-05-23, [winapp만들기/stage1/result/작업내역-W018.md](result/작업내역-W018.md))
- 작업 결과: [winapp만들기/stage1/result/작업내역-W018.md](result/작업내역-W018.md)

- Taiga 등록 내역 (WIN-018) — 등록 완료 (2026-05-23)

  - User Story: US-18 (WIN-018 OS별 회귀 테스트 프로파일 분리)
  - Taiga User Story ID: 33 / Ref: #124
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 83, 84, 85
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-018] 구현 작업`(83), `[WIN-018] 검증 작업`(84), `[WIN-018] 문서/정합성 반영`(85)

---

## WIN-019. 배포 패키징 준비 (electron-builder NSIS)

- 우선순위: P1
- 실행 순서: 9번째 (기능 완료 후)
- 선행 티켓: WIN-011~WIN-017
- 목표: 설치형 `.exe` 산출물을 `npm run desktop:package`로 생성할 수 있게 한다.
- 대상 경로:
  - `package.json`
  - `electron-builder.yml` (신규) 또는 `package.json` build 필드
- 작업:
  - `electron-builder` 의존성 추가
  - NSIS 타겟 설정 (개발/사내 배포용)
  - 앱 설정 저장 경로 명시 (`%APPDATA%/oh-my-codex/`)
  - `desktop:package` 스크립트 추가
  - 코드서명 설정 자리 잡기 (인증서 미적용 시 placeholder 기록)
- 산출물:
  - `dist-desktop/*.exe` 설치 파일
  - `desktop:package` 빌드 스크립트
- 완료 기준(DoD):
  - `npm run desktop:package` 실행 후 `.exe` 파일 생성
  - 설치 후 앱 기동 성공
- 체크리스트:
  - [x] `electron-builder` 설치 및 설정 (2026-05-23, devDependencies + `electron-builder.yml`)
  - [x] NSIS 타겟 설정 (2026-05-23, x64, oneClick=false, shortcut on)
  - [x] 앱 설정 경로 정의 (2026-05-23, `app.setName("oh-my-codex")` → `%APPDATA%/oh-my-codex/`)
  - [x] `desktop:package` 스크립트 추가 (2026-05-23, `desktop:package` + `desktop:pack` --dir)
  - [x] 패키징 smoke 테스트 (2026-05-23, `desktop/__tests__/packaging-config.test.ts`)
  - [x] 코드서명 플레이스홀더 문서화 (2026-05-23, `electron-builder.yml` 주석 + 작업내역)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W019.md](result/작업내역-W019.md)

- Taiga 등록 내역 (WIN-019) — 등록 완료 (2026-05-23)

  - User Story: US-19 (WIN-019 배포 패키징 준비)
  - Taiga User Story ID: 34 / Ref: #128
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 86, 87, 88
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-019] 구현 작업`(86), `[WIN-019] 검증 작업`(87), `[WIN-019] 문서/정합성 반영`(88)

---

## WIN-020. Phase 2 릴리스 게이트 문서화

- 우선순위: P0
- 실행 순서: 10번째 (전 항목 완료 후)
- 선행 티켓: WIN-011~WIN-019
- 목표: "Phase 2 완료"를 판단하는 객관 기준을 문서로 고정한다.
- 대상 경로:
  - `winapp만들기/stage1/change-winapp-phase2-gate.md` (신규)
- 작업:
  - 기능 게이트 (WIN-011~WIN-017 산출물 기준)
  - 보안 게이트 (LocalProcessTransport 보안 검증 포함)
  - 빌드/테스트 게이트 (OS별 프로파일 포함)
  - 배포 게이트 (패키징 smoke)
  - 데모 시나리오 게이트
- 산출물:
  - 승인 체크리스트 문서
- 완료 기준(DoD):
  - 리뷰어 1명 이상이 문서 기준으로 PASS/FAIL 가능
- 체크리스트:
  - [x] 기능 게이트 정의 (WIN-011~WIN-017) (2026-05-23, G1 7항목)
  - [x] 보안 게이트 정의 (2026-05-23, G2 4항목)
  - [x] 빌드/테스트 게이트 정의 (2026-05-23, G3 5항목)
  - [x] 배포 게이트 정의 (2026-05-23, G4 3항목)
  - [x] 데모 시나리오 정의 (2026-05-23, G5 4항목)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W020.md](result/작업내역-W020.md)

- Taiga 등록 내역 (WIN-020) — 등록 완료 (2026-05-23)

  - User Story: US-20 (WIN-020 Phase 2 릴리스 게이트 문서화)
  - Taiga User Story ID: 35 / Ref: #132
  - Epic/Sprint: EP-01 / SP-02
  - Taiga Task IDs: 89, 90, 91
  - Owner/Reviewer: admin (user_id=6)
  - 등록 완료 내역:
    - Story 생성 완료, EP-01 연결
    - Task 등록 완료: `[WIN-020] 구현 작업`(89), `[WIN-020] 검증 작업`(90), `[WIN-020] 문서/정합성 반영`(91)

---

## Phase 2 공통 수용 기준 (Exit Criteria)

아래 7개를 모두 만족하면 Phase 2 완료로 본다.

1. Transport 추상화 완료
   - `runtime.ts`가 `WorkerTransport` 인터페이스만 의존
   - tmux 없는 Windows 환경에서 `LocalProcessTransport`로 기동 성공

2. 이벤트 스트리밍 동작
   - `command.progress` 이벤트가 Renderer 타임라인에 실시간 표시

3. 운영형 UI 동작
   - 명령 히스토리/검색/재실행이 앱 내에서 동작

4. Question 모달 동작
   - 데스크탑 모달로 질문/답변 왕복 성공

5. HUD/Sidecar 패널 동작
   - 패널에서 현재 상태 표시 및 자동 갱신

6. OS별 테스트 프로파일 통과
   - Windows 프로파일이 tmux 없이 일관되게 통과

7. 배포 패키징 성공
   - `npm run desktop:package`로 `.exe` 생성 후 설치/기동 확인

---

## 권장 실행 순서 (티켓 번호 순서와 동일)

| 순서 | 티켓 | 내용 | 우선순위 | 선행 |
|------|------|------|---------|------|
| 1 | WIN-011 | Transport 추상화 (`WorkerTransport`) | P0 | - |
| 2 | WIN-012 | LocalProcessTransport (Windows 기본) | P0 | WIN-011 |
| 3 | WIN-013 | 상태 이벤트 스트리밍 IPC | P0 | WIN-012 |
| 4 | WIN-014 | 운영형 UI (히스토리/검색/필터) | P0 | - (병행) |
| 5 | WIN-015 | Question 모달 UI | P0 | WIN-013 |
| 6 | WIN-016 | HUD 패널 UI | P1 | WIN-013 |
| 7 | WIN-017 | Sidecar 패널 UI | P1 | WIN-013 |
| 8 | WIN-018 | OS별 회귀 테스트 프로파일 분리 | P1 | WIN-012 |
| 9 | WIN-019 | 배포 패키징 (electron-builder NSIS) | P1 | WIN-011~017 |
| 10 | WIN-020 | Phase 2 릴리스 게이트 문서화 | P0 | WIN-011~019 |
