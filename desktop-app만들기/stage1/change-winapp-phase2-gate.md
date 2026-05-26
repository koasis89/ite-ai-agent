# Phase 2 릴리스 게이트 (oh-my-codex desktop, Windows)

> 문서 ID: change-winapp-phase2-gate
> 대상: WIN-011 ~ WIN-019 산출물 일괄 수용
> 작성일: 2026-05-23 (WIN-020)
> 사용법: 리뷰어 1명 이상이 본 문서의 모든 항목을 PASS / FAIL / N/A 로 채점한다.
>         하나라도 FAIL 이면 Phase 2 미완료. N/A 는 사유를 함께 적는다.

## 0. 게이트 개요

| 게이트 | 항목 수 | PASS 조건 |
|---|---|---|
| G1. 기능 | 7 | 7/7 PASS |
| G2. 보안 | 4 | 4/4 PASS |
| G3. 빌드/테스트 | 5 | 5/5 PASS |
| G4. 배포 | 3 | 3/3 PASS (실측 1건은 환경 의존, §G4 참조) |
| G5. 데모 시나리오 | 4 | 4/4 PASS |

각 항목은 “검증 명령(또는 절차)” 과 “기대 결과” 를 함께 명시하여 리뷰어가 재현 가능하도록 한다.

---

## G1. 기능 게이트 (WIN-011 ~ WIN-017)

| ID | 항목 | 검증 절차 | 기대 결과 |
|---|---|---|---|
| G1-1 | Transport 추상화 | `src/core/transport.ts` 의 `WorkerTransport` 인터페이스 + `workerTransportRegistry` 존재. `runtime.ts` 가 tmux 직접 의존 없음. | `grep`/`import` 결과상 `runtime.ts` → `WorkerTransport` 만 참조. (WIN-011) |
| G1-2 | LocalProcessTransport | Windows 에서 `registerLocalProcessTransport` 가 default 로 등록되고 `isAvailable() === true`. | `desktop/__tests__/win-smoke.test.ts` 4/4 PASS. (WIN-012/018) |
| G1-3 | 이벤트 스트리밍 IPC | Main → Renderer `command.progress` 이벤트가 EventBus 를 통해 전달됨. | `dist-desktop/desktop/__tests__/event-bus.test.js` PASS, IPC 채널 컨트랙트 테스트 PASS. (WIN-013) |
| G1-4 | 운영형 UI | 명령 히스토리/검색/재실행 ViewModel. | `dist-desktop/desktop/__tests__/history-store.test.js` PASS. (WIN-014) |
| G1-5 | Question 모달 | CLI 블로킹 질문 → Renderer 모달 round-trip. | `dist-desktop/desktop/__tests__/question-broker.test.js` PASS. (WIN-015) |
| G1-6 | HUD 패널 | tmux pane 의존 제거, ViewModel 기반 스냅샷 렌더. | `dist-desktop/desktop/__tests__/hud-view-model.test.js` PASS. (WIN-016) |
| G1-7 | Sidecar 패널 | tmux pane 의존 제거, ViewModel 기반 스냅샷 렌더. | `dist-desktop/desktop/__tests__/sidecar-view-model.test.js` PASS. (WIN-017) |

## G2. 보안 게이트

| ID | 항목 | 검증 절차 | 기대 결과 |
|---|---|---|---|
| G2-1 | 명령 허용 목록 | `LocalProcessTransport` 가 허용 외 명령(`cmd.exe`, `/bin/sh`) 실행을 거부. | `win-smoke.test.ts` 의 “rejects disallowed commands” 서브테스트 PASS. |
| G2-2 | argv 인젝션 차단 | `validateArg` 가 셸 메타문자/공백 포함 인자 거부. shell 모드 강제 OFF. | `dist/core/__tests__/local-process-transport.test.js` PASS (argv 검증 케이스 포함). |
| G2-3 | cwd 화이트리스트 | `allowedCwdRoots = [process.cwd(), app.getPath("userData")]` 외 경로 거부. | `desktop/main/index.ts` 부트스트랩 코드 리뷰 + transport 테스트 PASS. |
| G2-4 | IPC 메시지 검증 | `handleRunCommand` 가 정의된 zod 스키마로 입력 검증. | `dist-desktop/desktop/__tests__/ipc-contract.test.js` PASS. |

## G3. 빌드/테스트 게이트

| ID | 항목 | 검증 절차 | 기대 결과 |
|---|---|---|---|
| G3-1 | 풀 빌드 | `npm run build && npm run build:desktop` | exit 0, `dist/` + `dist-desktop/` 생성. |
| G3-2 | Phase 2 Windows 프로파일 | `npm run test:phase2:windows:compiled` | common 18/18 + smoke 1/1 PASS, fail 0. |
| G3-3 | Phase 2 Linux 프로파일 | `npm run test:phase2:linux:compiled` (POSIX 러너) | common 18/18 + tmux/compat 3종 PASS. |
| G3-4 | Phase 1 회귀 | `npm run test:phase1:regression` | fail 0. |
| G3-5 | 컴파일러 경고 | `npm run check:no-unused` | exit 0, 미사용 export 0건. |

## G4. 배포 게이트 (WIN-019)

| ID | 항목 | 검증 절차 | 기대 결과 |
|---|---|---|---|
| G4-1 | 설정 정합성 | `dist-desktop/desktop/__tests__/packaging-config.test.js` | 5/5 PASS. (electron-builder.yml 필드, NSIS 옵션, 코드서명 placeholder, 스크립트 wiring, devDependency) |
| G4-2 | 패키징 스크립트 wiring | `npm run desktop:pack` (--dir, 서명 인프라 불필요) | exit 0, `dist-desktop/win-unpacked/oh-my-codex.exe` 생성. **환경 제약**: Windows Developer Mode 또는 관리자 셸 필요 (winCodeSign 캐시 심볼릭 링크 추출). |
| G4-3 | 실측 NSIS 산출 | `npm run desktop:package` (관리자 또는 Developer Mode) | `release/oh-my-codex-<version>-x64-setup.exe` 생성, 설치 후 앱 기동 성공. |

> G4-2 / G4-3 가 권한 제약으로 미수행이면 “N/A (사유: 비-Developer-Mode 환경)” 로 표기하고, 후속 CI 러너(관리자/Developer Mode 활성) 에서 1회 실측한 결과 캡처를 함께 첨부한다.

## G5. 데모 시나리오 게이트

각 시나리오는 “신규 클린 워크스페이스 / Windows 11 / tmux 미설치” 가정 하에 수동 수행한다.

| ID | 시나리오 | 절차 | 기대 결과 |
|---|---|---|---|
| G5-1 | 콜드 스타트 | `npm install` → `npm run desktop:dev` | Electron 창 정상 기동, 첫 화면에 명령 입력 UI 표시. |
| G5-2 | 명령 실행 + 이벤트 스트리밍 | UI 에서 임의 허용 명령 실행 | 진행 이벤트가 Renderer 타임라인에 실시간 표시되고 종료 시 exit code 노출. |
| G5-3 | Question 모달 round-trip | 워커가 질문을 던지는 명령을 실행 | 모달이 떠 답변 입력 → 워커가 답을 받아 계속 진행. |
| G5-4 | HUD + Sidecar | 명령 실행 중 HUD/Sidecar 패널 갱신 확인 | 두 패널 모두 최신 상태/스냅샷 표시. |

---

## A. 통합 PASS 판정

- [PASS] 위 G1~G5 가 모두 PASS (또는 G4-2/G4-3 는 N/A + 첨부) → Phase 2 완료.
- [FAIL] 한 개 이상 FAIL → 해당 항목의 후속 티켓을 발행 (WIN-021 이상) 후 재게이트.

## B. Phase 2 → Phase 3 진입 조건

본 게이트 PASS 와 별개로 Phase 3 진입 전에 다음을 추가 결정한다.

1. 설치형 코드서명 정책 확정 (인증서 발급 일정 + CSC_LINK 비밀 보관 방법).
2. 자동 업데이트(autoUpdater) 도입 여부.
3. Linux/macOS 패키징 우선순위.

세부 사항은 Phase 3 킥오프 미팅에서 정한다.

---

## C. 추적 가능성

- 본 문서의 각 항목은 WIN-011~WIN-019 의 [작업내역-W0XX.md](result/) 및 Taiga User Story 26~34 (Ref #100/#104/#108/#112/#116/#120/#124/#128) 에 1:1 로 대응한다.
- 본 게이트 자체는 WIN-020 (Story 35 / Ref #132 / Tasks 89~91) 산출물이다.
