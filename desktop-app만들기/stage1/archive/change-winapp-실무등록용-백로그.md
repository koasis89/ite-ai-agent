# change-winapp 실무 등록용 백로그 (Epics/Sprints/User Stories/Tasks)

기준 문서:
- [change-winapp.md](change-winapp.md)

문서 목적:
- Taiga/Jira에 바로 등록 가능한 수준으로
- Epics, Sprints, User Stories, Tasks의 명칭/정의/예상기간을 표준화한다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](개발-보완-검증-체크리스트.md)

---

- URL: http://20.194.2.62:9000/
- ID: admin
- PW: admin123!@
- Project: AI-Isaki

---
## 0. Taiga 생성 결과 ID 매칭표 (운영용)

아래 표는 이 문서의 항목과 Taiga에 실제 생성된 객체 ID를 매칭한 운영 테이블이다.

생성 기준:
- Project ID: 1 (`AI-Isaki`)
- 생성 일시: 2026-05-22
- 생성 방식: Epic/Sprint 먼저 생성 후 Story/Task 생성

### 0.1 Epic 매칭

| 문서 Epic ID | Epic 명칭 | Taiga Epic ID |
|---|---|---|
| EP-01 | 실행 코어 분리 | 1 |
| EP-02 | Desktop Shell 기본 구축 | 2 |
| EP-03 | IPC Command Gateway | 3 |
| EP-04 | 출력/이벤트 표준화 | 4 |
| EP-05 | Team Transport 추상화 | 5 |
| EP-06 | Question/HUD/Sidecar Desktop UX | 6 |
| EP-07 | 배포/운영 체계 | 7 |

### 0.2 Sprint(Milestone) 매칭

| 문서 Sprint ID | Sprint 명칭 | Taiga Milestone ID |
|---|---|---|
| SP-01 | Core Split Sprint | 1 |
| SP-02 | Desktop Skeleton Sprint | 2 |
| SP-03 | IPC Gateway Sprint | 3 |
| SP-04 | Event Standard Sprint | 4 |
| SP-05 | Transport Refactor Sprint-1 | 5 |
| SP-06 | Transport Refactor Sprint-2 | 6 |
| SP-07 | Desktop UX Sprint-1 | 7 |
| SP-08 | Desktop UX Sprint-2 | 8 |
| SP-09 | Release Hardening Sprint | 9 |

### 0.3 User Story 매칭

| 문서 Story ID | Story 제목 | Taiga User Story ID | Owner | Reviewer |
|---|---|---|---|---|
| US-001 | Command Contract 정의 | 1 | TBD | TBD |
| US-002 | executeCommand 코어 분리 | 2 | TBD | TBD |
| US-003 | CLI Adapter 경계 고정 | 3 | TBD | TBD |
| US-004 | 코어 이벤트 인터페이스 | 4 | TBD | TBD |
| US-005 | Electron Main 최소 부팅 | 5 | TBD | TBD |
| US-006 | Preload 보안 브리지 기본형 | 6 | TBD | TBD |
| US-007 | Renderer 기본 진단 화면 | 7 | TBD | TBD |
| US-008 | IPC runCommand 최소 경로 | 8 | TBD | TBD |
| US-009 | IPC 입력 검증/allowlist | 9 | TBD | TBD |
| US-010 | 결과 스키마 표준 응답 | 10 | TBD | TBD |
| US-011 | 이벤트 구독 채널 구현 | 11 | TBD | TBD |
| US-012 | 1단계 회귀 테스트 세트 | 12 | TBD | TBD |

### 0.4 Task 매칭

| 문서 Task ID | Task 명칭 | 상위 Story | Taiga Task ID | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-001-1 | 계약 타입 파일 생성 | US-001 | 1 | TBD | TBD |
| TS-001-2 | 에러 코드 체계 정의 | US-001 | 2 | TBD | TBD |
| TS-001-3 | 계약 단위 테스트 | US-001 | 3 | TBD | TBD |
| TS-002-1 | 분기 로직 추출 | US-002 | 4 | TBD | TBD |
| TS-002-2 | context 주입 | US-002 | 5 | TBD | TBD |
| TS-002-3 | 코어 호출 테스트 | US-002 | 6 | TBD | TBD |
| TS-003-1 | 출력 경계 정리 | US-003 | 7 | TBD | TBD |
| TS-003-2 | 종료코드 경계 정리 | US-003 | 8 | TBD | TBD |
| TS-003-3 | CLI 회귀 검증 | US-003 | 9 | TBD | TBD |
| TS-005-1 | main 프로세스 작성 | US-005 | 10 | TBD | TBD |
| TS-005-2 | 프로젝트 스크립트 연결 | US-005 | 11 | TBD | TBD |
| TS-005-3 | 윈도우 기동 스모크 | US-005 | 12 | TBD | TBD |
| TS-006-1 | preload API 정의 | US-006 | 13 | TBD | TBD |
| TS-006-2 | 보안 옵션 적용 | US-006 | 14 | TBD | TBD |
| TS-006-3 | 보안 점검 체크 | US-006 | 15 | TBD | TBD |
| TS-008-1 | IPC 핸들러 등록 | US-008 | 16 | TBD | TBD |
| TS-008-2 | state_get_status 연동 | US-008 | 17 | TBD | TBD |
| TS-008-3 | Renderer 왕복 검증 | US-008 | 18 | TBD | TBD |
| TS-011-1 | 이벤트 채널 스펙 | US-011 | 19 | TBD | TBD |
| TS-011-2 | main emit 구현 | US-011 | 20 | TBD | TBD |
| TS-011-3 | renderer 구독 UI | US-011 | 21 | TBD | TBD |

### 0.5 빠른 조회 규칙

- 규칙 1: 문서 식별자(EP/SP/US/TS)를 먼저 찾고, 위 매칭표에서 Taiga ID를 확인한다.
- 규칙 2: Taiga 검색창에는 식별자(예: `US-008`, `TS-011-2`)를 그대로 입력한다.
- 규칙 3: 운영 중 항목이 추가되면 0번 섹션 매칭표를 먼저 갱신한 뒤 본문을 수정한다.

---
## 1. 등록 단위 정의

## Epic
- 정의: 비즈니스 가치 단위의 상위 목표 묶음
- 권장 기간: 2~8주
- 완료 기준: 하위 User Story 핵심 범위 80% 이상 완료 + 릴리스 게이트 통과

## Sprint
- 정의: 고정 기간 실행 단위
- 권장 기간: 2주(10영업일)
- 완료 기준: Sprint Goal 달성 + 계획 대비 완료율 확인

## User Story
- 정의: 사용자 가치 중심의 구현 요구 단위
- 권장 기간: 1~5일
- 권장 포인트: 2/3/5/8 (13 이상 분할)

## Task
- 정의: User Story를 구현 가능한 작업으로 분해한 단위
- 권장 기간: 0.5~2일
- 권장 크기: 최대 1.5일 초과 시 추가 분할

---

## 2. 산정 기준(예상기간/포인트)

- 1 Story Point(SP) 기준: 팀 평균 반나절~1일
- 표준 매핑(권장):
  - 2SP = 0.5~1일
  - 3SP = 1~1.5일
  - 5SP = 2~3일
  - 8SP = 3~5일
- 버퍼 정책:
  - Sprint 총용량의 15~20%는 버퍼로 남김

---

## 3. Epic 카탈로그 (등록용)

| Epic ID | Epic 명칭 | 정의 | 범위(요약) | 예상기간 | 우선순위 |
|---|---|---|---|---|---|
| EP-01 | 실행 코어 분리 | CLI 진입/출력과 코어 실행 로직을 분리해 Desktop/CLI 공용화 | command contract, executeCommand, CLI adapter 경계 | 2주 | Highest |
| EP-02 | Desktop Shell 기본 구축 | Windows 앱 Main/Preload/Renderer 골격 구축 | Electron shell, 보안 옵션, 앱 기동 | 2주 | Highest |
| EP-03 | IPC Command Gateway | Renderer와 Core 간 안전한 IPC 브리지 구축 | allowlist 명령, 입력 검증, 이벤트 채널 | 2주 | High |
| EP-04 | 출력/이벤트 표준화 | 콘솔 중심 출력에서 구조화 결과/이벤트로 전환 | command result schema, progress events | 2주 | High |
| EP-05 | Team Transport 추상화 | tmux 의존 흐름을 transport 인터페이스 기반으로 분리 | LocalProcessTransport 도입, tmux fallback | 4주 | High |
| EP-06 | Question/HUD/Sidecar Desktop UX | 터미널 UI를 데스크톱 패널/모달로 전환 | question modal, hud panel, sidecar panel | 4주 | Medium |
| EP-07 | 배포/운영 체계 | 패키징/업데이트/진단 운영 체계 수립 | NSIS/MSIX, logs, smoke tests | 2주 | Medium |

---

## 4. Sprint 계획안 (2주 단위, 등록용)

| Sprint ID | Sprint 명칭 | Sprint Goal | 포함 Epic | 예상기간 | 목표 포인트 |
|---|---|---|---|---|---|
| SP-01 | Core Split Sprint | CLI 호환 유지 + 코어 실행 API 분리 완료 | EP-01 | 2주 | 35 |
| SP-02 | Desktop Skeleton Sprint | 데스크톱 앱 최소 실행 + 보안 기본값 고정 | EP-02 | 2주 | 30 |
| SP-03 | IPC Gateway Sprint | Renderer에서 상태 명령 호출/응답 성공 | EP-03, EP-04(일부) | 2주 | 35 |
| SP-04 | Event Standard Sprint | 구조화 결과/이벤트 계약 정착 | EP-04 | 2주 | 30 |
| SP-05 | Transport Refactor Sprint-1 | Team transport 인터페이스 + LocalProcess 초안 | EP-05 | 2주 | 30 |
| SP-06 | Transport Refactor Sprint-2 | tmux fallback + 안정화 테스트 | EP-05 | 2주 | 30 |
| SP-07 | Desktop UX Sprint-1 | Question 모달 + 기본 HUD 패널 | EP-06 | 2주 | 30 |
| SP-08 | Desktop UX Sprint-2 | Sidecar 패널 + 통합 회귀 테스트 | EP-06, EP-07(일부) | 2주 | 30 |
| SP-09 | Release Hardening Sprint | 패키징/업데이트/진단 번들/최종 게이트 | EP-07 | 2주 | 25 |

---

## 5. User Story 등록 목록 (우선 등록 권장)

아래는 SP-01~SP-03에서 바로 등록 가능한 핵심 User Story다.

| Story ID | 제목 | 정의(As-Is/To-Be) | Epic | 권장 Sprint | SP | 예상기간 | 우선순위 | Owner | Reviewer |
|---|---|---|---|---|---|---|---|---|---|
| US-001 | Command Contract 정의 | As desktop-main, I need 표준 요청/응답 계약 so that CLI/Desktop 공통 실행 가능 | EP-01 | SP-01 | 3 | 1일 | Highest | TBD | TBD |
| US-002 | executeCommand 코어 분리 | As maintainer, I need command 분기 코어화 so that adapter 교체 가능 | EP-01 | SP-01 | 5 | 2~3일 | Highest | TBD | TBD |
| US-003 | CLI Adapter 경계 고정 | As maintainer, I need exit/console 책임 분리 so that 회귀 리스크 축소 | EP-01 | SP-01 | 3 | 1~1.5일 | Highest | TBD | TBD |
| US-004 | 코어 이벤트 인터페이스 | As UI, I need started/progress/completed/failed 이벤트 so that 실시간 표시 가능 | EP-04 | SP-01 | 3 | 1~1.5일 | High | TBD | TBD |
| US-005 | Electron Main 최소 부팅 | As user, I need 앱 창 실행 so that 데스크톱 환경에서 시작 가능 | EP-02 | SP-02 | 5 | 2~3일 | Highest | TBD | TBD |
| US-006 | Preload 보안 브리지 기본형 | As security, I need 제한된 API 노출 so that renderer 보안 강화 | EP-02 | SP-02 | 3 | 1~1.5일 | Highest | TBD | TBD |
| US-007 | Renderer 기본 진단 화면 | As operator, I need 명령 실행/결과 보기 so that 운영 검증 가능 | EP-02 | SP-02 | 3 | 1~1.5일 | High | TBD | TBD |
| US-008 | IPC runCommand 최소 경로 | As renderer, I need state_get_status 호출 so that E2E 왕복 검증 | EP-03 | SP-03 | 5 | 2~3일 | Highest | TBD | TBD |
| US-009 | IPC 입력 검증/allowlist | As security, I need 허용 명령 제한 so that 임의 실행 차단 | EP-03 | SP-03 | 3 | 1~1.5일 | Highest | TBD | TBD |
| US-010 | 결과 스키마 표준 응답 | As renderer, I need 구조화 응답 so that UI 분기 단순화 | EP-04 | SP-03 | 3 | 1~1.5일 | High | TBD | TBD |
| US-011 | 이벤트 구독 채널 구현 | As renderer, I need progress 구독 so that 실시간 로그/상태 표시 | EP-03 | SP-03 | 5 | 2~3일 | High | TBD | TBD |
| US-012 | 1단계 회귀 테스트 세트 | As team, I need core/cli/ipc 회귀 테스트 so that 안정 릴리스 가능 | EP-01/03/04 | SP-03 | 5 | 2~3일 | High | TBD | TBD |

---

## 6. Task 템플릿 (등록용)

아래 템플릿을 User Story 하위 Task로 복제해서 사용한다.

### Task 템플릿
- 제목: [US-XXX] 작업명
- 정의: 해당 Story 완료를 위한 구현/테스트/문서 작업
- 예상기간: 0.5~2일
- Owner: 실제 구현 담당자
- Reviewer: 코드 리뷰 담당자
- 완료조건:
  - 코드 반영
  - 테스트 통과
  - 리뷰 반영

---

## 7. User Story별 Task 분해 (초기 3개 Sprint용)

## US-001 Command Contract 정의 (3SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-001-1 | 계약 타입 파일 생성 | request/result/event 타입 정의 | 0.5일 | TBD | TBD |
| TS-001-2 | 에러 코드 체계 정의 | 공통 에러 코드 enum + 매핑 규칙 | 0.5일 | TBD | TBD |
| TS-001-3 | 계약 단위 테스트 | 타입/직렬화/필드 검증 테스트 | 0.5일 | TBD | TBD |

## US-002 executeCommand 코어 분리 (5SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-002-1 | 분기 로직 추출 | src/cli/index 분기 로직 코어로 이전 | 1일 | TBD | TBD |
| TS-002-2 | context 주입 | runtime/context 전달 구조 정리 | 0.5일 | TBD | TBD |
| TS-002-3 | 코어 호출 테스트 | 주요 명령 3종 회귀 테스트 | 1일 | TBD | TBD |

## US-003 CLI Adapter 경계 고정 (3SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-003-1 | 출력 경계 정리 | console 출력 위치 adapter로 통일 | 0.5일 | TBD | TBD |
| TS-003-2 | 종료코드 경계 정리 | process.exitCode 처리 adapter로 통일 | 0.5일 | TBD | TBD |
| TS-003-3 | CLI 회귀 검증 | help/state/question --help 검증 | 0.5일 | TBD | TBD |

## US-005 Electron Main 최소 부팅 (5SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-005-1 | main 프로세스 작성 | BrowserWindow 생성/앱 라이프사이클 | 1일 | TBD | TBD |
| TS-005-2 | 프로젝트 스크립트 연결 | desktop:dev/build 스크립트 추가 | 0.5일 | TBD | TBD |
| TS-005-3 | 윈도우 기동 스모크 | 로컬 실행/기동 로그 확인 | 0.5일 | TBD | TBD |

## US-006 Preload 보안 브리지 (3SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-006-1 | preload API 정의 | 최소 API 노출(runCommand/subscribe) | 0.5일 | TBD | TBD |
| TS-006-2 | 보안 옵션 적용 | contextIsolation/nodeIntegration 설정 | 0.5일 | TBD | TBD |
| TS-006-3 | 보안 점검 체크 | 노출 API 화이트리스트 확인 | 0.5일 | TBD | TBD |

## US-008 IPC runCommand 최소 경로 (5SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-008-1 | IPC 핸들러 등록 | main에서 runCommand 채널 연결 | 1일 | TBD | TBD |
| TS-008-2 | state_get_status 연동 | 코어 실행기와 IPC 연결 | 0.5일 | TBD | TBD |
| TS-008-3 | Renderer 왕복 검증 | 버튼 클릭 -> 결과 JSON 표시 | 1일 | TBD | TBD |

## US-011 이벤트 구독 채널 구현 (5SP)

| Task ID | Task 명칭 | 정의 | 예상기간 | Owner | Reviewer |
|---|---|---|---|---|---|
| TS-011-1 | 이벤트 채널 스펙 | started/progress/completed/failed 정의 | 0.5일 | TBD | TBD |
| TS-011-2 | main emit 구현 | 코어 이벤트를 IPC로 브로드캐스트 | 1일 | TBD | TBD |
| TS-011-3 | renderer 구독 UI | 실시간 이벤트 로그 렌더링 | 1일 | TBD | TBD |

---

## 8. Taiga 등록 필드 매핑 (복붙용)

## Epic 등록
- Subject: Epic 명칭
- Description: 정의 + 범위 + 완료기준
- Tags: `winapp`, `desktop`, `epic`

## Sprint 등록
- Name: Sprint ID + 명칭
- Start/End Date: 2주 고정
- Goal: 표의 Sprint Goal 사용

## User Story 등록
- Subject: Story ID + 제목
- Description:
  - As a ...
  - I want ...
  - So that ...
  - Acceptance Criteria ...
- Points: 표의 SP 값
- Priority: Highest/High/Medium
- Tags: `winapp`, `phase1`, `epic-xx`
- Milestone: 권장 Sprint 지정

## Task 등록
- Subject: Task ID + 명칭
- Description: 작업 정의 + 완료조건
- Assigned to: 담당자
- Status: New

---

## 9. 완료 정의(DoD) 공통 규칙

- 코드 반영 + PR 생성
- 단위/스모크 테스트 통과
- 리뷰 코멘트 반영
- 사용자 영향/운영 영향 문서 업데이트

### 9.1 실무 검증 체크(추가)

- [ ] 문서 식별자(EP/SP/US/TS)와 Taiga ID 매칭표 일치 확인
- [ ] Story와 Milestone 연결 누락 없음 확인
- [ ] Task가 상위 Story에 모두 연결되었는지 확인
- [ ] Sprint 용량 대비 포인트 과부하 여부 확인
- [ ] 보안 민감정보(계정/토큰) 문서 평문 노출 여부 점검

---

## 10. 첫 등록 배치(권장)

실무에서 먼저 아래 순서로 등록하면 된다.

1. Epics EP-01 ~ EP-04 등록
2. Sprints SP-01 ~ SP-03 등록
3. User Stories US-001 ~ US-012 등록
4. Story별 Tasks 등록
5. 담당자/포인트/우선순위 확정

이 배치까지 완료하면 1단계 실행 준비가 끝난다.
