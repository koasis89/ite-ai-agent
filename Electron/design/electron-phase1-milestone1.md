# Phase 1 Milestone 1 구현 티켓: 환경 진단 및 CLI 비차단 래퍼 구축

**Reference Architecture:** [ADR-001-electron-agent-architecture.md](./ADR-001-electron-agent-architecture.md)

이 문서는 [ite-ai-roadmap.md](./ite-ai-roadmap.md) Phase 1의 첫 번째 마일스톤인 "환경 진단 및 CLI 비차단 래퍼(Wrapper) 구축" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(EL-201 ~ EL-202)는 권장 실행 순서에 따라 부여되었으며, Electron Main Process가 OMX CLI와 통신하기 위한 기초 인프라를 마련하는 것을 목표로 한다.

## 🎯 Phase 1 Milestone 1 범위
- **OMX 환경 검증**: `omx setup` 및 `omx doctor` 연동을 통한 런타임 환경 진단.
- **비차단(Non-blocking) CLI 실행기**: `child_process.spawn` 기반의 비동기 CLI 제어 및 JSON 응답 파싱.

## 📋 신규 User Story 및 티켓 요약

| US ID | 티켓 ID | Subject |
|---|---|---|
| US-201 | EL-201 | OMX 환경 진단 및 헬스체크 모듈 구현 (`omx setup/doctor`) |
| US-202 | EL-202 | 비차단(Non-blocking) CLI 래퍼 클래스 구현 (`spawn` 기반) |

---

### Taiga 접속 정보
- **URL**: http://20.194.2.62:9000/
- **ID**: admin
- **PW**: admin123!@
- **Project**: AI-Isaki

## 🛠️ Taiga 등록 컨텍스트
- **에픽**: EP-03 : CLI기반 Electron 앱 만들기 (신규 — 등록 필요)
- **스프린트**: SP-21 : Phase 1 - 기초 인프라 구축
- **유저스토리 매핑**: US-201~US-202 = EL-201~EL-202 (권장 실행 순서대로 부여)

---

## 🎫 EL-201. OMX 환경 진단 및 헬스체크 모듈 구현

- **우선순위**: P1
- **실행 순서**: 1번째
- **그룹**: Infra (Environment)
- **목표**: Electron 앱 구동 시 로컬 환경의 OMX 코어 엔진 상태 및 Codex 실질 인증 정합성을 엄격하게 진단하는 가용성 체크 파이프라인을 구축한다.
- **대상 경로**:
  - `src/main/env/env-checker.ts` (신규)
  - `src/main/ipc/env-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **정적 환경 진단**: `omx doctor --json` 명령을 실행하여 필수 설정 파일(`.codex/config.toml`, `.codex/hooks.json`) 누락 여부 파싱.
  2. **실질 인증 계약 검증 (추가)**: `omx doctor` 성공 이후, `codex login status` 프로필 인증 상태를 연이어 점검.
  3. **실행 동작 연기 테스트 (추가)**: 쉘 권한 샌드박스 돌파 여부를 확증하기 위해 `omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"` 임시 커맨드를 쏴서 정확한 가용 문자열이 반환되는지 최종 확인.
- **DoD (완료 기준)**:
  - CLI 미설치 또는 버전 불일치 시 Renderer UI에 에러 상태를 전달할 수 있음.
  - `omx doctor`의 결과를 JSON으로 파싱하여 누락된 설정을 정확히 식별함.
  - 자동 테스트: `env-checker.test.ts` 에서 정상/미설치/인증누락 시나리오 검증 성공.
- **체크리스트**:
  - [ ] `omx --version` 전역 CLI 가용성 체크 로직 구현
  - [ ] `omx doctor --json` 표준 반환 스키마 유효성 파서 구현
  - [ ] `codex login status` 파싱 및 불일치 예외 처리 가이드라인 수립
  - [ ] `omx exec` 핸드셰이크 커맨드를 이용한 런타임 쉘 연기 테스트 구현
  - [ ] Renderer 레이어로 가용 상태를 전달할 `env_status_get` IPC 쿼리 채널 개방
  - [ ] `env-checker.test.ts` 에서 정상/미설치/인증누락 시나리오 검증 성공

---

## 🎫 EL-202. 비차단(Non-blocking) CLI 래퍼 클래스 구현

- **우선순위**: P0
- **실행 순서**: 2번째
- **전제 티켓**: EL-201 (환경 진단 인프라 통과 후 기동)
- **그룹**: Infra (CLI Bridge)
- **목표**: Electron Main Process에서 `child_process.spawn`을 사용하여 코어 명령을 비동기로 실행하고, 단발성 JSON 응답 뿐만 아니라 향후 스트리밍(Ndjson) 데이터까지 유연하게 소화할 수 있는 스트림 기반 래퍼 클래스를 자산화한다.
- **대상 경로**:
  - `src/main/cli/cli-wrapper.ts` (신규)
  - `src/main/ipc/cli-ipc.ts` (신규)
- **핵심 구현 로직 (보완됨)**:
  1. **비차단 아키텍처**: 레거시 데스크톱 코드의 `spawnSync` 계열을 전면 배제하고, 무조건 비동기 `spawn`으로 실행 프로세스 수명주기 관리.
  2. **스트림 아키텍처 인터페이스 (추가)**: 응답 전체를 버퍼링하여 한 번에 반환하는 메서드(`executeUnary`)와 별개로, `stdout` 스트림에 Node.js `readline` 인터페이스를 탑재해 라인 단위 이벤트(줄바꿈 구분 JSON)를 트리거할 수 있는 **스트림 핸들러 인터페이스(`executeStream`)를 미리 설계에 선반영**.
  3. **표준 봉투 계약 검증**: `interop-team-mutation-contract-ko.md`에 명시된 공통 구조 스키마(`schema_version: "1.0"`, `ok: true/false`, `data`, `error`) 파싱용 Zod 스키마 검증기 탑재.
- **DoD (완료 기준)**:
  - `omx team api <명령어> --json` 호출 시 UI 블로킹 없이 결과를 Promise로 반환함.
  - 응답 JSON 봉투(Envelope)가 유효하지 않을 경우 명확한 파싱 에러 반환.
  - 자동 테스트: `cli-wrapper.test.ts` 에서 mock process를 이용한 비동기 흐름 검증 성공.
- **체크리스트**:
  - [ ] `child_process.spawn` 기반 비동기 커맨드 실행기 설계 및 에러 핸들링 구조 확립
  - [ ] Unary JSON 명령 처리를 위한 완료 시점 버퍼 합산 및 Zod 스키마 파서 구현
  - [ ] **[확장성 게이트]** `readline` 모듈 기반 Ndjson 파이프라인 대응용 스트림 바인딩 인터페이스 구현
  - [ ] 표준 JSON 봉투 양식(`ok: false` 시 `error: { message, code }`) 분기 처리 모듈 자산화
  - [ ] `cli-wrapper.test.ts` 에서 `omx team api read-task` 모킹 시나리오로 단위 테스트 완료

