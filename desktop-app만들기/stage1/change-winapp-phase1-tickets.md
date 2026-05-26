# change-winapp분석.md 기반 1단계 구현 체크리스트 (작업 티켓)

이 문서는 [change-winapp.md](change-winapp.md)의 "1단계"를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](개발-보완-검증-체크리스트.md)

범위(1단계):
- 실행 코어 분리
- CLI adapter 유지
- Desktop Main에서 코어 호출 가능한 IPC 게이트웨이 구축
- 보안 기본값 고정 (`contextIsolation`, `nodeIntegration`)

완료 목표:
- 기존 CLI 동작을 깨지 않고,
- 데스크톱 셸에서 최소 1개 명령(`state_get_status`)을 IPC로 호출 가능,
- 표준 응답/이벤트 계약으로 결과를 수신 가능.

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-01 : 윈도우 데스크탑 앱 구현
- 스프린트 SP-01 : 윈도우 데스크탑 앱(1단계, 최소기능)
- 스프린트 SP-02 : 윈도우 데스크탑 앱(2단계, 1차 기능 추가)
- 유저스토리 매핑 : US-01~US-10 = WIN-001~WIN-010

---
## 스프린트 백로그 (P0)

## WIN-001. 실행 코어 계약(Command Contract) 정의

- 우선순위: P0
- 목표: CLI/Desktop 공용 실행 인터페이스를 먼저 고정한다.
- 대상 경로:
  - `src/core/contracts/command.ts` (신규)
- 작업:
  - `CommandRequest`, `CommandResult`, `CommandEvent` 타입 정의
  - 런타임 구분 필드 정의: `runtime: 'cli' | 'desktop-main'`
  - 공통 에러 코드 enum 정의
- 산출물:
  - 타입 파일 1개
  - 간단한 사용 예시 주석
- 완료 기준(DoD):
  - 타입 파일이 빌드 통과
  - 이후 티켓에서 import 가능한 안정 이름 확정
- 체크리스트:
  - [x] `CommandRequest` 정의
  - [x] `CommandResult` 정의
  - [x] `CommandEvent` 정의
  - [x] 에러 코드 enum 정의
  - [x] `npm run build` 통과

- Taiga 등록 내역 (WIN-001)

  - User Story: US-01 (WIN-001 실행 코어 계약(Command Contract) 정의)
  - Taiga User Story ID: 15
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 28, 29, 30
  - 등록 업무:
    - Story 생성, 설명/DoD 입력, 체크리스트 연결
    - Task 등록: `[WIN-001] 구현 작업`, `[WIN-001] 검증 작업`, `[WIN-001] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-002. CLI 라우터를 코어 실행기로 분리

- 우선순위: P0
- 목표: `src/cli/index.ts`의 switch 분기를 코어 실행 함수로 이전한다.
- 대상 경로:
  - `src/cli/index.ts`
  - `src/core/execute-command.ts` (신규)
- 작업:
  - 기존 command 분기 로직을 `executeCommand()`로 이동
  - `main(args)`는 파싱 + adapter 역할만 수행
  - 기존 콘솔/종료코드 동작은 유지(회귀 방지)
- 산출물:
  - 코어 실행 파일 1개
  - CLI 파일 최소 변경(diff 최소화)
- 완료 기준(DoD):
  - 기존 CLI 명령 3개 이상 수동 검증 (`help`, `state`, `question --help`)
  - 기존 테스트 주요 스모크 통과
- 체크리스트:
  - [x] `executeCommand()` 신규 작성
  - [x] `src/cli/index.ts`에서 코어 호출로 변경
  - [x] `help` 동작 동일 확인 (2026-05-23 재검증: exit 0)
  - [x] `state` 동작 동일 확인 (2026-05-23 재검증: `state --help` exit 0)
  - [x] `question --help` 동작 동일 확인 (2026-05-23 재검증: exit 0)

- Taiga 등록 내역 (WIN-002)

  - User Story: US-02 (WIN-002 CLI 라우터를 코어 실행기로 분리)
  - Taiga User Story ID: 16
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 31, 32, 33
  - 등록 업무:
    - Story 생성, 기존 CLI 회귀 조건 명시
    - Task 등록: `[WIN-002] 구현 작업`, `[WIN-002] 검증 작업`, `[WIN-002] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-003. CLI Adapter 명시화 (출력/종료 처리 경계 확정)

- 우선순위: P0
- 목표: `process.exit*`, `console.*` 사용 책임을 CLI adapter로 고정한다.
- 대상 경로:
  - `src/cli/index.ts`
  - `src/cli/omx.ts`
- 작업:
  - 코어는 `CommandResult` 반환만 하도록 정리
  - CLI adapter에서만 출력/exitCode 처리
- 산출물:
  - adapter 경계 문서 주석
- 완료 기준(DoD):
  - 코어 계층에서 `process.exit` 직접 호출 없음
  - CLI 실행 결과가 기존과 동일
- 체크리스트:
  - [x] 코어 계층 `process.exit` 제거
  - [x] CLI adapter 종료코드 처리 유지
  - [x] 빌드 및 기본 실행 검증 (2026-05-23 재검증: `npm run build` exit 0, `omx help/state/question --help` exit 0)

- Taiga 등록 내역 (WIN-003)

  - User Story: US-03 (WIN-003 CLI Adapter 명시화(출력/종료 경계))
  - Taiga User Story ID: 8
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 25, 26, 27
  - 등록 업무:
    - Story 생성, adapter 경계 기준 입력
    - Task 등록: `[WIN-003] 구현 작업`, `[WIN-003] 검증 작업`, `[WIN-003] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-004. 이벤트 스트림 기본 인터페이스 도입

- 우선순위: P0
- 목표: 데스크톱/CLI 공용 진행 이벤트 계약을 만든다.
- 대상 경로:
  - `src/core/events.ts` (신규)
- 작업:
  - `emit(event)` 가능한 간단한 emitter 인터페이스 정의
  - 최소 이벤트 4종 정의
    - `command.started`
    - `command.progress`
    - `command.completed`
    - `command.failed`
- 산출물:
  - 이벤트 타입 + emitter 인터페이스
- 완료 기준(DoD):
  - 코어 실행기가 optional emitter를 받아 이벤트 발생 가능
- 체크리스트:
  - [x] 이벤트 타입 정의
  - [x] emitter 인터페이스 정의
  - [x] 코어 실행기와 연결

- Taiga 등록 내역 (WIN-004)

  - User Story: US-04 (WIN-004 이벤트 스트림 기본 인터페이스 도입)
  - Taiga User Story ID: 18
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 40, 41, 42
  - 등록 업무:
    - Story 생성, 이벤트 4종 기준 입력
    - Task 등록: `[WIN-004] 구현 작업`, `[WIN-004] 검증 작업`, `[WIN-004] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-005. Desktop 셸 기본 구조 스캐폴딩 (Electron 기준)

- 우선순위: P0
- 목표: 앱 Main/Preload/Renderer 최소 구조를 만든다.
- 대상 경로:
  - `desktop/main/index.ts` (신규)
  - `desktop/preload/index.ts` (신규)
  - `desktop/renderer/index.html` (신규)
  - `desktop/renderer/app.ts` (신규)
- 작업:
  - 브라우저 창 1개 생성
  - 보안 옵션 강제
    - `contextIsolation: true`
    - `nodeIntegration: false`
  - preload 브리지 로드
- 산출물:
  - 데스크톱 빈 앱 실행 가능 상태
- 완료 기준(DoD):
  - `npm run desktop:dev` (또는 동등 스크립트)로 창 기동
  - 콘솔 경고 없이 preload 로드 확인
- 체크리스트:
  - [x] main 프로세스 파일 생성
  - [x] preload 파일 생성
  - [x] renderer 최소 화면 생성
  - [x] 보안 옵션 적용 확인

- Taiga 등록 내역 (WIN-005)

  - User Story: US-05 (WIN-005 Desktop 셸 기본 구조 스캐폴딩)
  - Taiga User Story ID: 19
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 43, 44, 45
  - 등록 업무:
    - Story 생성, 보안 옵션 기준 입력
    - Task 등록: `[WIN-005] 구현 작업`, `[WIN-005] 검증 작업`, `[WIN-005] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-006. IPC Command Gateway (read-only 최소 기능)

- 우선순위: P0
- 목표: Renderer가 안전하게 코어 명령 1개를 호출할 수 있게 한다.
- 대상 경로:
  - `desktop/ipc/commands.ts` (신규)
  - `desktop/ipc/events.ts` (신규)
  - `desktop/preload/index.ts`
- 작업:
  - IPC 채널 정의 (화이트리스트)
  - 최소 허용 명령: `state_get_status`만 오픈
  - 입력값 기본 검증(zod 권장)
- 산출물:
  - `window.omx.runCommand(request)` API
- 완료 기준(DoD):
  - Renderer 버튼 클릭 -> `state_get_status` 호출 -> JSON 수신
- 체크리스트:
  - [x] IPC 핸들러 등록
  - [x] preload 브리지 API 노출
  - [x] 허용 명령 allowlist 적용
  - [x] 결과 JSON 렌더 확인

- Taiga 등록 내역 (WIN-006)

  - User Story: US-06 (WIN-006 IPC Command Gateway(read-only 최소 기능))
  - Taiga User Story ID: 20
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 46, 47, 48
  - 등록 업무:
    - Story 생성, allowlist/입력 검증 기준 입력
    - Task 등록: `[WIN-006] 구현 작업`, `[WIN-006] 검증 작업`, `[WIN-006] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-007. 최소 UI 진단 패널 구현

- 우선순위: P0
- 목표: Claude Desktop 스타일의 기본 UX 골격(명령 실행 + 결과 보기)을 확보한다.
- 대상 경로:
  - `desktop/renderer/app.ts`
  - `desktop/renderer/styles.css` (신규)
- 작업:
  - 좌측: 명령 실행 패널
  - 우측: 결과 JSON/로그 패널
  - 이벤트 로그 타임라인 표시(가능 범위)
- 산출물:
  - 단일 창 내 운영 패널
- 완료 기준(DoD):
  - 앱에서 명령 실행/결과 확인 가능
  - 실패 응답 시 에러 UI 표시
- 체크리스트:
  - [x] 실행 버튼/입력 UI
  - [x] 결과 뷰어
  - [x] 에러 상태 뷰
  - [x] 이벤트 로그 뷰

- Taiga 등록 내역 (WIN-007)

  - User Story: US-07 (WIN-007 최소 UI 진단 패널 구현)
  - Taiga User Story ID: 21
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 49, 50, 51
  - 등록 업무:
    - Story 생성, 실패 UI/로그 기준 입력
    - Task 등록: `[WIN-007] 구현 작업`, `[WIN-007] 검증 작업`, `[WIN-007] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-008. CI/로컬 빌드 파이프라인 확장

- 우선순위: P0
- 목표: 기존 CLI 빌드를 깨지 않고 Desktop 빌드 타겟을 추가한다.
- 대상 경로:
  - `package.json`
  - `tsconfig.*` (필요 시)
- 작업:
  - 스크립트 추가
    - `desktop:dev`
    - `desktop:build`
  - CLI 기존 스크립트 영향 여부 점검
- 산출물:
  - 빌드/개발 커맨드 문서화
- 완료 기준(DoD):
  - CLI build/test 통과
  - desktop dev/build 통과
- 체크리스트:
  - [x] `package.json` 스크립트 추가
  - [x] 데스크톱 빌드 확인
  - [x] 기존 CLI 빌드 회귀 없음 확인 (2026-05-23 재검증: `npm run build` exit 0)

- Taiga 등록 내역 (WIN-008)

  - User Story: US-08 (WIN-008 CI/로컬 빌드 파이프라인 확장)
  - Taiga User Story ID: 22
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 52, 53, 54
  - 등록 업무:
    - Story 생성, `desktop:dev`/`desktop:build` 조건 입력
    - Task 등록: `[WIN-008] 구현 작업`, `[WIN-008] 검증 작업`, `[WIN-008] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-009. 1단계 회귀 테스트 세트 정리

- 우선순위: P0
- 목표: 코어 분리 후 회귀를 빠르게 감지할 최소 테스트 묶음을 만든다.
- 대상 경로:
  - `src/cli/__tests__/...` (보정)
  - `desktop/__tests__/...` (신규, 가능 시)
- 작업:
  - CLI 회귀 스모크 5개 선정
  - IPC 계약 테스트 최소 1개 추가
- 산출물:
  - 테스트 실행 명령 문서
- 완료 기준(DoD):
  - 로컬에서 일관되게 통과
- 체크리스트:
  - [x] CLI 스모크 테스트 셋 확정
  - [x] IPC 계약 테스트 추가
  - [x] 테스트 실행 명령 README 반영

- Taiga 등록 내역 (WIN-009)

  - User Story: US-09 (WIN-009 1단계 회귀 테스트 세트 정리)
  - Taiga User Story ID: 23
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 55, 56, 57
  - 등록 업무:
    - Story 생성, CLI/IPC 테스트 범위 입력
    - Task 등록: `[WIN-009] 구현 작업`, `[WIN-009] 검증 작업`, `[WIN-009] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## WIN-010. 1단계 릴리스 게이트 문서화

- 우선순위: P0
- 목표: "1단계 완료"를 판단하는 객관 기준을 문서로 고정한다.
- 대상 경로:
  - `한글해석-분석본/작업문서/change-winapp-phase1-gate.md` (신규)
- 작업:
  - 기능 게이트
  - 보안 게이트
  - 빌드/테스트 게이트
  - 데모 시나리오 게이트
- 산출물:
  - 승인 체크리스트 문서
- 완료 기준(DoD):
  - 리뷰어 1명 이상이 문서 기준으로 PASS/FAIL 가능
- 체크리스트:
  - [x] 기능 게이트 정의
  - [x] 보안 게이트 정의
  - [x] 테스트 게이트 정의
  - [x] 데모 시나리오 정의

- Taiga 등록 내역 (WIN-010)

  - User Story: US-10 (WIN-010 1단계 릴리스 게이트 문서화)
  - Taiga User Story ID: 24
  - Epic/Sprint: EP-01 / SP-01
  - Taiga Task IDs: 58, 59, 60
  - 등록 업무:
    - Story 생성, PASS/FAIL 판단 기준 입력
    - Task 등록: `[WIN-010] 구현 작업`, `[WIN-010] 검증 작업`, `[WIN-010] 문서/정합성 반영`
    - Owner/Reviewer 지정 (미정 시 `TBD`)

---

## 1단계 공통 수용 기준 (Exit Criteria)

아래 6개를 모두 만족하면 1단계 완료로 본다.

1. CLI 호환성 유지
- 기존 주요 명령 동작/출력/종료코드 회귀 없음

2. 코어 실행기 분리 완료
- Desktop과 CLI가 동일 `executeCommand()` 경로 사용

3. IPC 최소 게이트웨이 동작
- Renderer -> Main -> Core -> Renderer 왕복 성공

4. 보안 기본값 적용
- `contextIsolation: true`
- `nodeIntegration: false`
- preload 최소 API

5. 최소 UI 동작
- 앱에서 `state_get_status` 실행/결과 확인 가능

6. 빌드/테스트 통과
- CLI build/test + Desktop dev/build 모두 성공

---

위 순서를 따르면 "코어 안정화 -> 데스크톱 셸 연결 -> 품질 게이트" 흐름으로 리스크를 가장 낮게 관리할 수 있다.
