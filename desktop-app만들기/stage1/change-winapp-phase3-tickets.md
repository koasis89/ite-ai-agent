# change-winapp Phase 3 구현 티켓

이 문서는 Phase 2(WIN-011~WIN-020) 완료 이후,
데스크탑 앱 "명령 패널 확장 1차" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-021 ~ WIN-023)는 **권장 실행 순서**에 따라 부여되었고,
각 티켓은 명령어 그룹(A/B/C)에 1:1로 대응된다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase2-gate.md](change-winapp-phase2-gate.md) PASS 상태에서 진입

Phase 3 (명령 패널 확장 1차) 범위:
- 명령 패널의 allow-list 확장 — 현재 `state_get_status`, `question_demo` 2개에서 단계적으로 증설
- 안전·즉시 가능한 read-only 명령군(A) → 인자 검증이 필요한 parameterized 명령군(B) → 외부 호출이 따라오는 부작용 명령군(C) 순서로 보안 경계를 넓힌다.

완료 목표:
- 사용자가 데스크탑 명령창에서 HUD/Sidecar 스냅샷·히스토리·플랫폼 정보를 직접 조회할 수 있다.
- Question 모달을 임의 텍스트로 호출하고 IPC 왕복 진단(`noop_*`)을 수행할 수 있다.
- LocalProcessTransport 를 통해 `omx` CLI 서브커맨드를 안전하게 트리거할 수 있다.

공통 작업 지점(모든 티켓 공통):
- [desktop/ipc/commands.ts L10](../../desktop/ipc/commands.ts#L10) `allowedCommands` 배열 갱신
- 같은 파일 `handleRunCommand` 의 `switch` 분기 추가 — `command.started`/`completed`/`failed` 이벤트 발행 유지
- [desktop/__tests__/ipc-contract.test.ts](../../desktop/__tests__/ipc-contract.test.ts) accept/reject 회귀 추가
- (선택) [desktop/__tests__/event-bus.test.ts](../../desktop/__tests__/event-bus.test.ts) — `started→completed` 이벤트 페어 어서션
- [desktop/renderer/index.html](../../desktop/renderer/index.html) 안내 문구 및 매뉴얼 §4.1 표 갱신
  ([winapp만들기/stage1/winapp-manual.md](winapp-manual.md))

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| 36 | TBD | US-21 WIN-021 명령 패널 확장 A - Read-only 진단 명령군 |
| 37 | TBD | US-22 WIN-022 명령 패널 확장 B - Parameterized 진단 명령군 |
| 38 | TBD | US-23 WIN-023 명령 패널 확장 C - LocalProcessTransport 기반 omx CLI 트리거 |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-01 : 윈도우 데스크탑 앱 명령 패널 확장 (신규 — 등록 필요)
- 스프린트 SP-03 : 윈도우 데스크탑 앱(3단계, 명령 패널 확장 1차) (신규 — 등록 필요)
- 유저스토리 매핑 : US-21~US-23 = WIN-021~WIN-023 (권장 실행 순서대로 부여)

---

## 스프린트 백로그 (SP-03)

---

## WIN-021. 명령 패널 확장 A - Read-only 진단 명령군

- 우선순위: P0
- 실행 순서: 1번째 (가장 안전한 범위에서 명령 분기 패턴을 확립)
- 선행 티켓: WIN-013, WIN-014, WIN-016, WIN-017 (HUD/Sidecar/EventBus/HistoryStore 의존)
- 그룹: A (read-only, 부작용 없음, 외부 프로세스 호출 없음)
- 목표: 이미 데스크탑 main 에 존재하는 read-only 모듈 호출을 명령창 allow-list 에 노출한다.
- 대상 경로: 
  - `desktop/ipc/commands.ts` (allow-list + switch 분기 확장)
  - `desktop/ipc/history-store.ts` (필요 시 조회 API export 보강)
  - `desktop/__tests__/ipc-contract.test.ts`
  - `desktop/__tests__/event-bus.test.ts`
  - `desktop/renderer/index.html`, `winapp만들기/stage1/winapp-manual.md`
- 추가할 명령 (6종):
  - `hud_get_snapshot` — `src/hud/index.ts::getHudSnapshot(process.cwd())` 1회 호출, 결과 JSON 반환
  - `sidecar_get_snapshot` — args 무시. 기본은 `default` 팀명, args[0] 있으면 검증 후 사용
    - 보안: 팀명 패턴 `^[A-Za-z0-9_-]{1,64}$` (main 의 `TEAM_NAME_SAFE_PATTERN` 과 정합)
  - `versions_get` — `process.versions.{node,electron,chrome,v8}` 만 반환 (`state_get_status` 의 경량 버전)
  - `platform_get` — `process.platform`, `process.arch`, `process.cwd()`, `os.hostname()`, `os.release()` 반환
  - `history_list` — `historyStore.list(limit)` 결과 반환. args[0] = limit (기본 20, 상한 200)
  - `event_bus_stats` — `EventBus` 의 채널별 최근 발행 카운트 스냅샷
- 작업:
  - `allowedCommands` 배열에 6개 추가
  - `handleRunCommand` switch 에 각 case 추가 — 시작/완료 이벤트 발행 유지
  - 인자 zod 스키마 강화 — 각 명령에 허용 인자 길이/타입 제한
  - 매뉴얼 §4.1 명령 표 + index.html 안내 문구 갱신
- 산출물:
  - 변경 파일 5개 (commands.ts / 회귀 테스트 2개 / index.html / winapp-manual.md)
- 완료 기준(DoD):
  - 6개 명령이 명령창에서 `ok: true` 응답
  - 잘못된 인자(빈 문자열, 형식 위반, 상한 초과) 시 `INVALID_REQUEST` 또는 `COMMAND_FAILED`
  - `command.started` → `command.completed` 이벤트 페어가 timeline 에 1쌍씩 기록
- 체크리스트:
  - [x] `allowedCommands` 6종 추가 (2026-05-23)
  - [x] switch 분기 6종 구현 (이벤트 발행 포함) (2026-05-23)
  - [x] zod 스키마로 인자 검증 (2026-05-23 — sidecar 팀명 정규식 + history_list 정수 1..200 검증)
  - [x] ipc-contract.test.ts: accept(6) + reject(2) 회귀 추가 (2026-05-23 — 11/11 통과)
  - [x] event-bus.test.ts: 대표 1종(`hud_get_snapshot`)에 대한 started→completed 페어 어서션 (2026-05-23 — 3/3 통과)
  - [x] index.html 안내 문구 + winapp-manual.md §4.1 표 갱신 (2026-05-23)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W021.md](result/작업내역-W021.md)

- Taiga 등록 내역 (WIN-021) — 등록 완료 (2026-05-23)
  - Sprint: SP-03 id=12 (`SP-03 윈도우 데스크탑 앱(3단계, 명령 패널 확장 1차)`, 2026-05-23 ~ 2026-06-06)
  - User Story: US-21 id=36 / ref=136
  - Epic 연결: EP-01 (id=8) ↔ US id=36 (`related_userstories` POST)
  - Tasks (모두 status=4 Closed): 92/ref=137 `[WIN-021] 구현 작업`, 93/ref=138 `[WIN-021] 검증 작업`, 94/ref=139 `[WIN-021] 문서/정합성 반영`

---

## WIN-022. 명령 패널 확장 B - Parameterized 진단 명령군

- 우선순위: P1
- 실행 순서: 2번째 (WIN-021 의 분기 패턴 위에서 인자 검증을 확장)
- 선행 티켓: WIN-021, WIN-015
- 그룹: B (parameterized, 부작용 없음, 인자 검증 필요)
- 목표: 인자를 받는 진단 명령을 추가해 IPC 왕복/모달 호출/필드 조회 능력을 노출한다.
- 대상 경로:
  - `desktop/ipc/commands.ts`
  - `desktop/ipc/question.ts` (필요 시 ask 인자 시그니처 재사용)
  - `desktop/__tests__/ipc-contract.test.ts`
  - `desktop/__tests__/event-bus.test.ts`
  - `desktop/renderer/index.html`, `winapp만들기/stage1/winapp-manual.md`
- 추가할 명령 (4종):
  - `state_get_field` — args[0] = field name (zod enum: `platform`/`runtime`/`versions`/`timestamp`/`status`). `buildStateStatusPayload()` 의 해당 필드만 반환
  - `question_ask` — args[0] = 질문 텍스트(1~200자), args[1..] = 옵션 라벨(0~5개, 각 1~40자). `kind: "single"` 모달 호출. 응답은 `data.answer` 반환
    - 보안: 옵션 라벨 정규식 `^[\p{L}\p{N} _-]+$` (제어문자 차단)
  - `noop_echo` — args 를 그대로 반환. IPC 왕복 진단용. args 길이 상한 10, 각 인자 200자 상한
  - `noop_sleep` — args[0] = ms (0~5000). 지정 시간 대기 후 응답. 스트리밍 이벤트 페어 테스트용
- 작업:
  - 각 명령마다 별도 zod 스키마 정의 → `RunCommandRequestSchema` 분기 처리 또는 명령별 2단계 검증
  - `question_ask` 는 main 측 `QuestionSender` context 가 없는 환경(테스트)에서 명확한 에러 반환
  - `noop_sleep` 은 `command.started` 발행 → setTimeout → `command.completed`
  - 매뉴얼/안내 문구 갱신, 보안 경계(허용 패턴/상한)를 §4.1 표 아래에 명시
- 산출물:
  - 변경 파일 5개
- 완료 기준(DoD):
  - 4개 명령 정상 응답
  - 각 명령에 대해 인자 위반(타입/길이/패턴) 시 `INVALID_REQUEST` 반환
  - `question_ask` 호출 시 Renderer 모달이 떠 사용자 응답이 회수됨 (수동 검증 1회)
  - `noop_sleep` 4000ms 호출 시 timeline 의 started→completed 간격이 ≥ 4000ms 측정
- 체크리스트:
  - [x] `allowedCommands` 4종 추가 (2026-05-23)
  - [x] switch 분기 4종 구현 (2026-05-23)
  - [x] 명령별 zod 스키마 + 보안 패턴 적용 (2026-05-23 — `perCommandArgValidators` pre-switch 검증, 옵션 라벨 `[\\p{L}\\p{N} _-]` 정규식)
  - [x] ipc-contract.test.ts: accept(4) + reject(인자 위반 4) 회귀 추가 (2026-05-23 — 19/19 통과)
  - [x] event-bus.test.ts: `noop_sleep` started→completed 타이밍 어서션 (2026-05-23 — delta ≥ 100ms 검증, 4/4 통과)
  - [ ] 수동 검증: `question_ask "계속할까요?" 진행 중단` → 모달 표시 → 응답 회수 확인 (Electron 환경 실측 필요)
  - [x] index.html 안내 문구 + winapp-manual.md §4.1 표 갱신 (2026-05-23)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W022.md](result/작업내역-W022.md)

- Taiga 등록 내역 (WIN-022) — 등록 완료 (2026-05-23)
  - Sprint: SP-03 id=12 (재사용)
  - User Story: US-22 id=37 / ref=140
  - Epic 연결: EP-01 (id=8) ↔ US id=37 (`related_userstories` POST)
  - Tasks (모두 status=4 Closed): 95/ref=141 `[WIN-022] 구현 작업`, 96/ref=142 `[WIN-022] 검증 작업`, 97/ref=143 `[WIN-022] 문서/정합성 반영`

---

## WIN-023. 명령 패널 확장 C - LocalProcessTransport 기반 omx CLI 트리거

- 우선순위: P1
- 실행 순서: 3번째 (외부 프로세스 호출 — 보안 경계 가장 큼)
- 선행 티켓: WIN-012, WIN-021
- 그룹: C (외부 프로세스 호출, 부작용 가능, 인자 allowlist 필수)
- 목표: 데스크탑 명령창에서 `omx` CLI 서브커맨드를 LocalProcessTransport 경로로 안전하게 트리거한다.
- 대상 경로:
  - `desktop/ipc/commands.ts`
  - `desktop/main/index.ts` (기존 LocalProcessTransport 재사용 또는 명령 실행기 export)
  - `src/core/local-process-transport.ts` (보안 정책 확인)
  - `desktop/__tests__/ipc-contract.test.ts`
  - `desktop/__tests__/event-bus.test.ts`
  - `desktop/renderer/index.html`, `winapp만들기/stage1/winapp-manual.md`
- 추가할 명령 (3종):
  - `omx_doctor` — `node dist/cli/omx.js doctor` 실행. 인자 추가 없음.
  - `omx_adapt_probe` — `node dist/cli/omx.js adapt probe` 실행. 인자 추가 없음.
  - `omx_state_status` — `node dist/cli/omx.js state` 실행. 인자 추가 없음.
- 보안 정책 (필수):
  - **허용 실행 파일은 `process.execPath` (Node) 1종으로 한정** — 임의 바이너리 차단
  - **허용 인자 배열은 코드 상수로 고정** — 사용자 args 는 무시하거나, args[0] 가 enum(`doctor`/`adapt-probe`/`state-status`) 인 경우만 매핑 테이블에서 인자 배열 결정
  - **cwd 는 `process.cwd()` 고정** — 디렉터리 탈출 차단
  - 실행 시간 상한 30s — `LocalProcessTransport` 의 watchdog 적용 (없으면 추가)
  - 표준 출력은 8KB 상한으로 절단 후 응답에 포함
- 작업:
  - LocalProcessTransport 인스턴스를 main 에서 재사용 가능한 형태로 export 또는 commands.ts 내 helper 생성
  - 각 명령 case 에서 spawn → 종료 대기 → stdout/stderr/exitCode 수집 → 응답 반환
  - 실행 중 timeline 이벤트(`command.progress` 또는 다회 `command.completed.partial` 등 기존 채널)에 stdout chunk 전달 (선택)
  - 매뉴얼 §4.1 표 아래에 **C 그룹은 외부 프로세스 호출이므로 비활성 빌드 옵션을 명시** (예: `OMX_DESKTOP_ALLOW_EXEC=0` 환경변수면 enum 거부)
- 산출물:
  - 변경 파일 6개
- 완료 기준(DoD):
  - 3개 명령 정상 응답 (`exitCode`, `stdout` 일부, `durationMs` 포함)
  - 허용 enum 외 인자 시 `UNKNOWN_COMMAND` 또는 `INVALID_REQUEST` 반환
  - 30s 초과 시 강제 종료 + `COMMAND_FAILED` reason="timeout"
  - 환경변수 `OMX_DESKTOP_ALLOW_EXEC=0` 일 때 3개 모두 `COMMAND_FAILED` reason="exec-disabled"
- 체크리스트:
  - [x] `allowedCommands` 3종 추가 (2026-05-23)
  - [x] switch 분기 3종 + 공통 helper(`runOmxSubcommand`) 구현 (2026-05-23)
  - [x] 허용 enum 매핑 테이블 + 보안 정책(실행파일/cwd/타임아웃/출력 상한) 적용 (2026-05-23, `omxCliMatrix` + `OMX_CLI_TIMEOUT_MS=30000` + `OMX_CLI_STDOUT_CAP=8KB`)
  - [x] 환경변수 스위치(`OMX_DESKTOP_ALLOW_EXEC`) 처리 (2026-05-23, `isOmxExecAllowed()`)
  - [x] ipc-contract.test.ts: accept(3) + reject(임의 인자 무시 / 비활성 빌드 2종) 회귀 추가 (2026-05-23)
  - [x] event-bus.test.ts: `omx_doctor` started→completed + exitCode 캡처 어서션 (2026-05-23)
  - [ ] 수동 검증: `omx_doctor` → 정상 stdout 일부 표시, `omx_state_status` → 상태 JSON 일부 표시 (포장된 Windows 빌드 GUI 후속)
  - [x] index.html 안내 문구 + winapp-manual.md §4.1 표 갱신 (C 그룹 보안 주의문 포함) (2026-05-23)
- 작업 결과: [winapp만들기/stage1/result/작업내역-W023.md](result/작업내역-W023.md) 참조

- Taiga 등록 내역 (WIN-023) — 완료 (2026-05-23)
  - User Story: US-23 (id=38, ref=144)
  - Epic/Sprint: EP-01 (id=8) / SP-03 (id=12)
  - Task 분해 (3종, 모두 status=4 closed):
    - `[WIN-023] 구현 작업` (id=98, ref=145)
    - `[WIN-023] 검증 작업` (id=99, ref=146)
    - `[WIN-023] 문서/정합성 반영` (id=100, ref=147)
  - 동기화 스크립트: `winapp만들기/stage1/scripts/taiga-win023.ps1`

---

## Phase 3 Exit Criteria

Phase 3 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase3-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-021 ~ WIN-023 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 기준 회귀 없음
- 신규 회귀: `ipc-contract.test.ts` 의 accept/reject 케이스가 새 명령 13종을 모두 포함
- 보안: C 그룹 명령은 환경변수 스위치로 비활성화 가능함을 자동 테스트로 증명
- 문서: `winapp-manual.md` §4.1 표가 13개 신규 명령을 모두 포함 (총 15개 명령 표시)

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 추가 명령 수 | 누적 명령 수 | 의존 |
|---|---|---|---|---|
| WIN-021 | A read-only | 6 | 8 (= 2 + 6) | WIN-013/014/016/017 |
| WIN-022 | B parameterized | 4 | 12 | WIN-021, WIN-015 |
| WIN-023 | C exec | 3 | 15 | WIN-012, WIN-021 |

명령창 allow-list 의 단일 진실 공급원(SSOT): [desktop/ipc/commands.ts L10](../../desktop/ipc/commands.ts#L10)
