# change-winapp Phase 4 구현 티켓

이 문서는 Phase 3(WIN-021~WIN-023) 완료 이후,
데스크탑 앱 "대화 UI 셸 전환" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-030 ~ WIN-034)는 **권장 실행 순서**에 따라 부여되었고,
WIN-030 은 [stage2-win12-tmux대체구현.md §4.2 옵션 B (node-pty)](stage2-win12-tmux대체구현.md#42-옵션-b-node-pty-2차-확장-후보) 의
2단계 전환을 Phase 4 의 **선행 인프라**로 격상한 항목이다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](../stage1/개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase2-gate.md](../stage1/change-winapp-phase2-gate.md) PASS + Phase 3 티켓 ([change-winapp-phase3-tickets.md](../stage1/change-winapp-phase3-tickets.md)) 마감 상태에서 진입
- 갭 분석 출처: [stage2-roadmap-winapp.md §3·§4 Phase 4](stage2-roadmap-winapp.md)

Phase 4 (대화 UI 셸) 범위:
- TUI/색상/raw-input 지원 워커 transport 확보 — 옵션 A(`child_process.spawn`) 위에 옵션 B(`node-pty`) 보강
- 명령 패널 → 채팅 UI 1차 전환 — 기존 15종 IPC 명령을 "도구(tool)" 로 흡수
- 좌측 세션 목록 + 슬래시 명령(`/hud`, `/omx doctor`) 자연어 진입점 도입
- 응답 스트리밍 채널 — Phase 3 의 `command.progress` + WIN-030 PTY `onData` 를 채팅 버블 토큰 추가에 연결

완료 목표:
- 사용자가 명령어 화이트리스트 암기 없이 좌측 세션 목록 + 중앙 채팅 입력만으로 일상 운영 가능
- TUI 워커(claude-code / codex 등) 가 Renderer 의 터미널 뷰에서 색상·리사이즈·raw-input 깨짐 없이 동작
- 기존 15종 IPC 명령이 슬래시 명령으로 100% 매핑되어 회귀 없음

공통 작업 지점(모든 티켓 공통):
- [desktop/ipc/commands.ts](../../desktop/ipc/commands.ts) — 신규 명령은 기존 `allowedCommands` 화이트리스트 패턴 그대로 추가
- [desktop/__tests__/ipc-contract.test.ts](../../desktop/__tests__/ipc-contract.test.ts) accept/reject 회귀 추가
- [desktop/__tests__/event-bus.test.ts](../../desktop/__tests__/event-bus.test.ts) — `started→completed` 이벤트 페어 어서션
- [desktop/renderer/](../../desktop/renderer/) 채팅 UI 신규 컴포넌트
- [winapp만들기/stage2/winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 매뉴얼 갱신

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| 39 | #149 | US-30 WIN-030 PtyLocalTransport 도입 (node-pty / 옵션 B, WIN-031 선행) |
| 40 | #153 | US-31 WIN-031 채팅 영역 ViewModel (메시지 버블/스트리밍/마크다운) |
| 41 | #157 | US-32 WIN-032 좌측 세션 목록 (신규/삭제/이름변경) |
| 42 | #161 | US-33 WIN-033 슬래시 명령 라우터 (`/hud`, `/omx doctor` 등 자연어 진입점) |
| 43 | #165 | US-34 WIN-034 응답 스트리밍 채널 (채팅 버블 토큰 추가) |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-02 (id=9, ref=#148) : 윈도우 데스크탑 앱 대화 UI 셸 (Phase 4) — 등록 완료
- 스프린트 SP-04 (id=13) : 윈도우 데스크탑 앱(4단계, 대화 UI 셸) — 등록 완료
- 유저스토리 매핑 : US-30~US-34 = WIN-030~WIN-034 (권장 실행 순서대로 부여) — 5건 등록 완료
- Owner / Assigned / Watcher(Reviewer 대용) : admin (user id=6) — US 5건 + Task 15건 동일 적용

---

## 스프린트 백로그 (SP-04)

---

## WIN-030. PtyLocalTransport 도입 (node-pty / 옵션 B, WIN-031 선행)

- 우선순위: P0
- 실행 순서: 1번째 (Phase 4 의 모든 채팅 UI 가 의존하는 인프라)
- 선행 티켓: WIN-011 (`WorkerTransport` 인터페이스), WIN-012 (`LocalProcessTransport` 옵션 A)
- 그룹: Infra (워커 transport 확장)
- 목표: TUI/색상/리사이즈/raw-input 지원 transport 를 ConPTY(`node-pty`) 위에 구현해 Phase 4 채팅 UI 의 터미널 뷰 기반을 확보한다.
- 근거: [stage2-win12-tmux대체구현.md §4.2](stage2-win12-tmux대체구현.md#42-옵션-b-node-pty-2차-확장-후보) (옵션 B 장단점) + [§5.2 2단계](stage2-win12-tmux대체구현.md#52-2단계-별도-후속-티켓-필요-시-ptylocaltransport-옵션-b) (책임 5항목)
- 대상 경로:
  - `src/core/pty-local-transport.ts` (신규)
  - `src/core/transport.ts` (확장 인터페이스 — `resize(cols, rows)` 추가)
  - `src/core/__tests__/pty-local-transport.test.ts` (신규)
  - `desktop/main/index.ts` (capability 기반 PTY ↔ LocalProcess 선택)
  - `package.json` (`node-pty`, `@electron/rebuild` devDependency 추가)
  - `electron-builder.yml` (prebuilt x64/arm64 바이너리 포함 옵션)
- 구현 책임:
  - `pty.spawn(command, args, { name: 'xterm-color', cols, rows, cwd, env })` 기반 `WorkerTransport` 구현
  - `onData(handler)` → 기존 `onOutput` 핸들러 라우팅 (ANSI 포함 그대로)
  - `onExit({ exitCode, signal })` → 기존 `onExit` 정규화
  - `write(input)` raw 입력, `resize(cols, rows)` 신규 메서드 노출, idempotent `kill()`
  - capability detection: `node-pty` 로드 실패 시 `LocalProcessTransport` fallback (TUI 워커 자동 비활성)
- 보안 정책 (Phase 3 정책 100% 승계):
  - `allowedCommands` 화이트리스트 동일 적용 (`process.execPath` 1종 한정 + `omxCliMatrix` 고정 인자)
  - `allowedCwdRoots` 제한
  - `envAllowList` 통과 키만 자식 프로세스에 전달
  - 30s SIGKILL 워치독 + 8KB stdout/stderr 절단 + `stdoutTruncated`/`stderrTruncated` 플래그
  - `shell:false` 강제 (옵션 B 에서도 동일)
- 작업:
  - `node-pty` + `@electron/rebuild` 추가 → Electron 35.7.5 ABI 매칭 확인
  - prebuilt 빌드 실패 fallback 로직 ([§4.2 비용](stage2-win12-tmux대체구현.md#42-옵션-b-node-pty-2차-확장-후보) 참조)
  - `WorkerTransport` 인터페이스에 `resize?: (cols, rows) => void` 옵션 메서드 추가 — 기존 `LocalProcessTransport` 는 no-op 구현
  - `desktop/main/index.ts` capability 선택 로직 — `process.env.OMX_DESKTOP_FORCE_LOCAL_PROCESS=1` override 지원
- 산출물:
  - 변경 파일 6개 (pty-local-transport.ts / transport.ts / 테스트 / main/index.ts / package.json / electron-builder.yml)
- 완료 기준(DoD):
  - `PtyLocalTransport` 가 `WorkerTransport` 계약을 만족 (`isAvailable`/`spawn`/`stop`/`write`/`onOutput`/`onExit`/`resize`)
  - TUI 워커 1종(예: `claude-code --print` 비-TTY 와 비교군으로 색상 차이 검증) 가 ANSI 색상 보존 상태로 출력 캡처
  - 30s 워치독 / 8KB 절단 회귀가 옵션 A 와 동일하게 동작
  - capability fallback: `node-pty` 모듈 강제 unload 시 `LocalProcessTransport` 로 자동 전환
  - `npm run test:phase2:windows:compiled` 19/19 + 1/1 회귀 무영향
  - 신규 PTY smoke 1종 통과 (resize 호출 후 child 가 `SIGWINCH`-등가 수신)
- 체크리스트:
  - [x] `node-pty` + `@electron/rebuild` devDependency 추가 (optionalDependencies 로 분리)
  - [x] `WorkerTransport` 인터페이스에 `resize` 옵션 메서드 추가 (기존 transport 영향도 검토 — `LocalProcessTransport` no-op 구현)
  - [x] `src/core/pty-local-transport.ts` 구현 + 보안 정책 승계 (allowedCommands/allowedCwdRoots/envAllowList/path-traversal/null-byte 가드)
  - [x] capability detection + fallback 로직 (`desktop/main/index.ts`, `OMX_DESKTOP_FORCE_LOCAL_PROCESS=1` override)
  - [x] `electron-builder.yml` prebuilt x64/arm64 포함 설정 (`asarUnpack: node_modules/node-pty/**`)
  - [x] `src/core/__tests__/pty-local-transport.test.ts` smoke 작성 (모킹된 PTY 모듈로 native 의존 없이 lifecycle/security/resize 전 경로 검증)
  - [x] `winapp-manual.md` §4 transport 섹션에 옵션 B 사용설명 추가
  - [ ] 수동 검증: 데스크탑 빌드에서 TUI 워커 1회 기동 → xterm.js(또는 콘솔) 에서 색상 보존 확인 *(후속 — Phase 4 UI 작업(WIN-031/032/033)에서 xterm.js 패널 합류 시 함께 수행)*
- 작업 결과: [winapp만들기/stage2/result/작업내역-W030.md](result/작업내역-W030.md) — 완료 (2026-05-23)

- Taiga 등록 내역 (WIN-030) — 완료 (2026-05-23)
  - Sprint: SP-04 (id=13)
  - User Story: US-30 (id=39, ref=#149) — Owner/Assigned/Watcher=admin(6)
  - Epic 연결: EP-02 (id=9, ref=#148)
  - Tasks: `[WIN-030] 구현 작업` (id=101, ref=#150) / `[WIN-030] 검증 작업` (id=102, ref=#151) / `[WIN-030] 문서/정합성 반영` (id=103, ref=#152) — 3종 Owner/Assigned/Watcher=admin(6)

---

## WIN-031. 채팅 영역 ViewModel (메시지 버블/스트리밍/마크다운)

- 우선순위: P0
- 실행 순서: 2번째 (WIN-030 완료 후, 채팅 UI 의 가장 큰 사용자 체감 항목)
- 선행 티켓: **WIN-030 (PTY transport)**, WIN-014 (운영형 UI), WIN-016/017 (HUD/Sidecar ViewModel 패턴)
- 그룹: UI (Renderer 핵심 컴포넌트 신규)
- 목표: 명령 패널 + 출력 패널 2분할을 좌측 세션 / 중앙 채팅 / 우측 컨텍스트 3분할로 1차 전환하고, 메시지 버블·스트리밍 텍스트·마크다운/코드 렌더를 도입한다.
- 대상 경로:
  - `desktop/renderer/chat/` (신규 디렉터리 — ChatPanel/MessageList/MessageBubble/InputBox)
  - `desktop/renderer/index.html` (레이아웃 3분할 전환)
  - `desktop/renderer/styles/chat.css` (신규)
  - `desktop/__tests__/chat-viewmodel.test.ts` (신규)
- 구현 책임:
  - `ChatMessage` 타입(`{ id, role: 'user'|'assistant'|'tool'|'system', content, timestamp, streaming? }`)
  - 사용자 메시지 즉시 표시 → assistant 응답 토큰 추가(streaming) → 완료 시 streaming 플래그 해제
  - 마크다운 렌더: 기본은 안전 화이트리스트(코드블록/리스트/인라인 강조/링크) — 임의 HTML 차단
  - 코드 블록 syntax highlight (선택 — 기본은 plain `<pre>` 로 안전 우선)
  - 메시지 ring buffer 500건 (메모리) — Phase 5 영속화 전 임시 한도
- 보안 정책:
  - Renderer 의 마크다운 → DOM 변환 시 `innerHTML` 직접 주입 금지 — 화이트리스트 기반 토큰화
  - 외부 링크는 `target="_blank" rel="noopener noreferrer"` 강제
  - 이미지/스크립트/iframe 태그 거부
- 작업:
  - 기존 명령 입력 패널을 InputBox 로 흡수 — 평문 입력은 user 메시지로 추가
  - 슬래시 시작 입력은 WIN-033 슬래시 라우터로 위임(이 티켓에서는 stub 만 노출)
  - assistant streaming 은 WIN-030 의 PTY `onData` 또는 WIN-034 의 `command.progress` 이벤트를 임시 source 로 사용
- 산출물:
  - 변경/신규 파일 5~7개
- 완료 기준(DoD):
  - 좌/중/우 3분할 레이아웃 동작 (좌측은 WIN-032 전까지 placeholder)
  - user/assistant 메시지 버블이 시각적으로 구분
  - assistant streaming 토큰이 점진 표시 (60fps 부드러움)
  - 마크다운 코드블록/리스트가 정상 렌더, 임의 HTML 주입 차단 회귀
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `ChatMessage` 타입 + `chat-viewmodel.ts` 구현
  - [x] 3분할 레이아웃(`desktop/renderer/index.html` + chat.css)
  - [x] 마크다운 화이트리스트 렌더러 + XSS 회귀 테스트
  - [x] streaming 토큰 추가 데모 (WIN-030 PTY 또는 mock source)
  - [ ] 매뉴얼 §5(가칭 "대화 UI") 신규 섹션 추가 — 사용자 정책상 매뉴얼은 별도 일괄 갱신, 본 티켓 범위에서 제외(W030 manual undo 반영)
- 작업 결과: [`winapp만들기/stage2/result/작업내역-W031.md`](result/작업내역-W031.md)

- Taiga 등록 내역 (WIN-031) — 완료 (2026-05-23)
  - Sprint: SP-04 (id=13)
  - User Story: US-31 (id=40, ref=#153) — Owner/Assigned/Watcher=admin(6)
  - Epic 연결: EP-02 (id=9, ref=#148)
  - Tasks: `[WIN-031] 구현 작업` (id=104, ref=#154) / `[WIN-031] 검증 작업` (id=105, ref=#155) / `[WIN-031] 문서/정합성 반영` (id=106, ref=#156) — 3종 Owner/Assigned/Watcher=admin(6)

---

## WIN-032. 좌측 세션 목록 (신규/삭제/이름변경)

- 우선순위: P1
- 실행 순서: 3번째 (WIN-031 의 placeholder 좌측 패널을 실 컴포넌트로 교체)
- 선행 티켓: WIN-031
- 그룹: UI (Renderer 보조 컴포넌트)
- 목표: Claude Desktop 의 좌측 "Conversations" 영역을 1차 구현한다. 영속성은 Phase 5(WIN-041~044) 에서 별도 처리.
- 대상 경로:
  - `desktop/renderer/chat/SessionList.ts` (신규)
  - `desktop/renderer/chat/session-store.ts` (in-memory, Phase 5 에서 SQLite 백엔드로 교체 예정)
  - `desktop/__tests__/session-store.test.ts` (신규)
- 구현 책임:
  - `Session` 타입(`{ id, name, createdAt, updatedAt, messageIds: string[] }`)
  - CRUD: `create()` / `rename(id, name)` / `delete(id)` / `select(id)` / `list()`
  - 활성 세션 변경 시 `ChatPanel` 의 메시지 목록 갱신
- 보안 정책:
  - 세션 이름 정규식 `^[\p{L}\p{N} _\-()]{1,64}$` (제어문자 차단, 64자 상한)
  - 삭제 시 확인 모달(`question_ask` 재사용) — 즉시 삭제 금지
- 작업:
  - in-memory store 는 Phase 5 의 SQLite 어댑터에서 동일 인터페이스로 교체 가능하도록 분리
  - 좌측 패널 키보드 단축키 (`Ctrl+N` 신규, `F2` 이름변경, `Delete` 삭제)
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - 세션 신규/삭제/이름변경 동작 + 활성 세션 변경 시 채팅 메시지 목록 즉시 교체
  - 잘못된 이름(빈/제어문자/65자+) 거부
  - 회귀 무영향
- 체크리스트:
  - [x] `Session` 타입 + in-memory `session-store.ts`
  - [x] `SessionList.ts` UI + 키보드 단축키
  - [x] 삭제 확인 모달(`question_ask` 재사용 → renderer 측 `QuestionModal` 재사용으로 구현)
  - [x] `session-store.test.ts` (CRUD + 이름 검증 회귀)
  - [ ] 매뉴얼 §5 에 세션 관리 절차 추가 — 사용자 정책상 매뉴얼은 별도 일괄 갱신, 본 티켓 범위에서 제외(W030/W031 정책 승계)
- 작업 결과: [winapp만들기/stage2/result/작업내역-W032.md](result/작업내역-W032.md)

- Taiga 등록 내역 (WIN-032) — 완료 (2026-05-23)
  - Sprint: SP-04 (id=13)
  - User Story: US-32 (id=41, ref=#157) — Owner/Assigned/Watcher=admin(6)
  - Epic 연결: EP-02 (id=9, ref=#148)
  - Tasks: `[WIN-032] 구현 작업` (id=107, ref=#158) / `[WIN-032] 검증 작업` (id=108, ref=#159) / `[WIN-032] 문서/정합성 반영` (id=109, ref=#160) — 3종 Owner/Assigned/Watcher=admin(6), description PATCH 완료

---

## WIN-033. 슬래시 명령 라우터 (자연어 진입점)

- 우선순위: P1
- 실행 순서: 4번째 (WIN-031 의 InputBox stub 을 실제 라우터로 교체)
- 선행 티켓: WIN-031
- 그룹: UI + IPC bridging
- 목표: 사용자가 명령어 화이트리스트 15종을 암기하지 않고 `/hud`, `/omx doctor`, `/state` 같은 슬래시 명령으로 호출할 수 있도록 한다.
- 대상 경로:
  - `desktop/renderer/chat/slash-router.ts` (신규)
  - `desktop/renderer/chat/slash-commands.ts` (명령 매핑 SSOT)
  - `desktop/__tests__/slash-router.test.ts` (신규)
  - `winapp만들기/stage1/winapp-manual.md` 매뉴얼 §4·§5 갱신
- 슬래시 명령 매핑(초기 안 — Phase 3 의 15종 100% 커버):
  - `/state` → `state_get_status`
  - `/state field <name>` → `state_get_field`
  - `/hud` → `hud_get_snapshot`
  - `/sidecar [team]` → `sidecar_get_snapshot`
  - `/versions` → `versions_get`
  - `/platform` → `platform_get`
  - `/history [N]` → `history_list`
  - `/bus` → `event_bus_stats`
  - `/ask <질문> [옵션1] [옵션2] ...` → `question_ask`
  - `/echo <args...>` → `noop_echo`
  - `/sleep <ms>` → `noop_sleep`
  - `/omx doctor` → `omx_doctor`
  - `/omx adapt probe` → `omx_adapt_probe`
  - `/omx state` → `omx_state_status`
  - `/help` → 슬래시 명령 목록을 system 메시지로 표시
- 보안 정책:
  - 슬래시 명령 → IPC 호출 시 기존 `allowedCommands` 화이트리스트 + zod 검증을 그대로 통과 (라우터는 syntactic 변환만 담당, 검증은 main 측 SSOT 유지)
  - 미매핑 슬래시(`/foo`)는 system 메시지 `Unknown command: /foo` 표시, IPC 호출 금지
- 작업:
  - 슬래시 토큰 파서(따옴표 그룹 지원: `/ask "계속할까요?" 진행 중단`)
  - 결과는 assistant 메시지가 아닌 `tool` role 메시지로 표시 (Phase 6 에서 도구 호출 카드로 일반화)
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - Phase 3 의 15종 명령이 모두 슬래시로 호출 가능
  - 미매핑 슬래시 거부 + `/help` 동작
  - 회귀: `npm run test:phase2:windows:compiled` 19/19 + 1/1 + slash-router 신규 케이스 통과
- 체크리스트:
  - [x] `slash-commands.ts` 매핑 SSOT 작성
  - [x] `slash-router.ts` 파서 + IPC dispatcher
  - [x] `slash-router.test.ts` (15종 매핑 + 미매핑 거부 + `/help` 회귀)
  - [x] InputBox 입력이 `/` 로 시작하면 slash-router 로 분기
  - [ ] 매뉴얼 §4.1 표 옆에 슬래시 명령 표 신규 추가 — 사용자 정책상 매뉴얼은 별도 일괄 갱신 (W030/W031/W032 정책 승계)
- 작업 결과: [winapp만들기/stage2/result/작업내역-W033.md](result/작업내역-W033.md)

- Taiga 등록 내역 (WIN-033) — 완료 (2026-05-23)
  - Sprint: SP-04 (id=13)
  - User Story: US-33 (id=42, ref=#161) — Owner/Assigned/Watcher=admin(6)
  - Epic 연결: EP-02 (id=9, ref=#148)
  - Tasks: `[WIN-033] 구현 작업` (id=110, ref=#162) / `[WIN-033] 검증 작업` (id=111, ref=#163) / `[WIN-033] 문서/정합성 반영` (id=112, ref=#164) — 3종 Owner/Assigned/Watcher=admin(6), description PATCH 완료

---

## WIN-034. 응답 스트리밍 채널 (채팅 버블 토큰 추가)

- 우선순위: P1
- 실행 순서: 5번째 (WIN-030/031/033 의 streaming 통합 마무리)
- 선행 티켓: WIN-030, WIN-031, WIN-033
- 그룹: IPC + UI (이벤트 페어 → 채팅 버블 토큰 추가)
- 목표: WIN-030 PTY `onData` 와 기존 `command.progress`/`command.completed.partial` 이벤트를 채팅 버블 streaming 토큰 추가에 정식 연결한다.
- 대상 경로:
  - `desktop/ipc/commands.ts` (`command.progress` 이벤트 페이로드에 `chunk`/`channel`(`stdout`|`stderr`)/`messageId` 추가)
  - `desktop/renderer/chat/streaming-bridge.ts` (신규 — IPC 이벤트 → ChatMessage 토큰 추가)
  - `desktop/__tests__/streaming-bridge.test.ts` (신규)
- 구현 책임:
  - 슬래시 명령 실행 시작 시 `tool` role 메시지를 streaming=true 로 생성 → `messageId` 를 IPC 호출 컨텍스트에 부착
  - main → renderer `command.progress` 수신 시 해당 `messageId` 의 `content` 끝에 chunk append
  - `command.completed` 또는 `command.failed` 수신 시 streaming=false 처리 + exitCode/stdout/stderr 요약을 메시지 푸터에 표시
- 보안 정책:
  - chunk 크기 상한 8KB(Phase 3 정책 승계) — 초과 시 `truncated=true` 플래그
  - `messageId` 위조 방지: 호출 시 main 측에서 생성한 ID 만 신뢰
- 작업:
  - `command.progress` 이벤트 페이로드 스키마 zod 갱신 (`chunk: string`, `channel: 'stdout'|'stderr'`, `messageId: string`)
  - `WorkerTransport.onOutput` → IPC `command.progress` 발행 어댑터 (LocalProcessTransport + PtyLocalTransport 양쪽)
  - 백 압력: chunk 가 60Hz 초과 시 16ms 윈도우 단위 batch flush
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - `/omx doctor` 실행 시 stdout 이 채팅 버블에 점진 표시
  - exit 후 푸터에 exitCode + duration 표시
  - 8KB 초과 stdout 은 truncated 플래그 + 잘림 표시
  - 회귀: ipc-contract 19 + streaming-bridge 신규 케이스
- 체크리스트:
  - [x] `command.progress` 페이로드 스키마 확장 (`messageId?`, `truncated?` + 기존 `stream`/`chunk` 유지)
  - [x] `WorkerTransport.onOutput` → IPC progress 어댑터(`runOmxSubcommand` 의 onChunk 훅 + omx_* 케이스에서 `eventBus.publish('command.progress', …)`)
  - [x] `streaming-bridge.ts` (messageId → 토큰 append + lazy streamStart)
  - [x] 백 압력 batch flush (16ms 윈도우, `batchWindowMs` 주입 가능)
  - [x] `streaming-bridge.test.ts` (chunk append / 종료 / truncate / 다중 messageId / failed footer / 회귀)
  - [ ] 매뉴얼 §5 streaming 동작 설명 추가 — 사용자 정책상 매뉴얼은 별도 일괄 갱신 (W030/W031/W032/W033 정책 승계)
- 작업 결과: [winapp만들기/stage2/result/작업내역-W034.md](result/작업내역-W034.md)

- Taiga 등록 내역 (WIN-034) — 완료 (2026-05-23)
  - Sprint: SP-04 (id=13)
  - User Story: US-34 (id=43, ref=#165) — Owner/Assigned/Watcher=admin(6)
  - Epic 연결: EP-02 (id=9, ref=#148)
  - Tasks: `[WIN-034] 구현 작업` (id=113, ref=#166) / `[WIN-034] 검증 작업` (id=114, ref=#167) / `[WIN-034] 문서/정합성 반영` (id=115, ref=#168) — 3종 Owner/Assigned/Watcher=admin(6), description PATCH 완료

---

## Phase 4 Exit Criteria

Phase 4 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase4-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-030 ~ WIN-034 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 회귀 없음
- 신규 회귀: `pty-local-transport.test.ts` / `chat-viewmodel.test.ts` / `session-store.test.ts` / `slash-router.test.ts` / `streaming-bridge.test.ts` 5종 통과
- 보안: 슬래시 라우터를 거치는 호출도 main 측 zod 검증을 우회하지 못함을 자동 테스트로 증명
- 보안: 채팅 메시지 렌더가 임의 HTML/스크립트 주입을 차단함을 자동 테스트로 증명
- 문서: [winapp-manual.md](../stage1/winapp-manual.md) 에 §5 "대화 UI" 섹션 신규 추가 (3분할 레이아웃 / 슬래시 명령 표 / 세션 관리 / streaming 동작)
- 사용자 체감: Phase 3 의 15종 명령이 슬래시로 모두 호출 가능 + TUI 워커 1종이 색상 보존 상태로 출력

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 신규 모듈 / 변경 영역 | 의존 |
|---|---|---|---|
| WIN-030 | Infra | `src/core/pty-local-transport.ts` + `WorkerTransport.resize` | WIN-011, WIN-012 |
| WIN-031 | UI | `desktop/renderer/chat/{ChatPanel,MessageList,MessageBubble,InputBox}` | WIN-030, WIN-014, WIN-016/017 |
| WIN-032 | UI | `desktop/renderer/chat/{SessionList,session-store}` | WIN-031 |
| WIN-033 | UI+IPC | `desktop/renderer/chat/{slash-router,slash-commands}` | WIN-031 |
| WIN-034 | IPC+UI | `command.progress` 확장 + `streaming-bridge.ts` | WIN-030, WIN-031, WIN-033 |

채팅 슬래시 명령 매핑의 단일 진실 공급원(SSOT): `desktop/renderer/chat/slash-commands.ts` (WIN-033 에서 신규 생성)
IPC 명령 화이트리스트 SSOT(불변): [desktop/ipc/commands.ts L10](../../desktop/ipc/commands.ts#L10) — Phase 4 에서는 신규 IPC 명령 추가 없음(기존 15종 재사용만)
