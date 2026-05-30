# OMX Services 모듈 개별 설계서

## 0. 문서 정보
- 모듈: services
- 기준 분석 문서: Electron/analysis/services-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 구현, 리뷰, 테스트 시 공통 판단 기준 제공
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 구조 또는 계약 변경 시 4, 5, 10장을 우선 갱신

## 1. 개요와 주요기능
- 개요: services 모듈은 IPC와 인프라 사이에 위치한 도메인 규칙 계층으로, 태스크 생명주기 정책과 Gemini API 키 저장 정책을 캡슐화한다.
- 주요기능:
  - 태스크 조회/선점/해제/상태전이 API 오케스트레이션
  - 상태전이 불변성 가드(역전 전이 차단) 적용
  - 낙관적 락(version) 기반 claim 충돌 처리 규약 제공
  - Gemini API 키의 OS 네이티브 암호화 저장/복호화/삭제
  - 서비스 계층 표준 오류 코드 전달(Conflict, NotFound 등)

## 2. 책임과 경계
- 책임:
  - `task-service`에서 팀 태스크 명령 실행과 응답 스키마 검증을 수행한다.
  - 금지된 태스크 상태 전이를 사전에 차단한다.
  - `gemini-key-store`에서 키 저장소 암호화와 fallback 규칙을 제공한다.
- 비책임:
  - IPC 채널 등록/브로드캐스트, Renderer UI 반영, 상태 파일 직접 쓰기 로직은 담당하지 않는다.
- 경계:
  - 서비스는 비즈니스 정책 단위의 순수 API를 제공하며 실행 transport는 `CliWrapper`와 Electron `safeStorage`에 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스 (`task-service.ts`):
  - `readTask(taskId): Promise<TaskData>`
  - `claimTask(taskId, version): Promise<void>`
  - `releaseTaskClaim(taskId): Promise<void>`
  - `transitionTaskStatus(taskId, current, target, resultData?): Promise<unknown>`
  - `InvalidTransitionError`
- 외부 인터페이스 (`gemini-key-store.ts`):
  - `saveGeminiApiKey(plaintext): void`
  - `loadGeminiApiKey(): string | null`
  - `clearGeminiApiKey(): void`
  - `isValidGeminiKeyFormat(key): boolean`
- 내부 인터페이스:
  - `CliWrapper.executeUnary(args)`를 통한 명령 실행
  - `EnvelopeParser`/스키마 검증(`zod`) 기반 응답 정합성 검증
  - Electron `safeStorage` 기반 암호화/복호화

## 4. 데이터 구조와 계약
- 태스크 상태 계약:
  - `TaskStatus = 'not_started' | 'planning' | 'in_progress' | 'completed' | 'failed' | 'blocked'`
- 태스크 데이터 계약:
  - `{ id: string, status: TaskStatus, version: number, title?, assignee?, result?, metadata? }`
- 전이 계약:
  - `TransitionTarget = 'completed' | 'failed'`
  - `transitionTaskStatus` 호출 시 현재 상태(`current`)와 목표 상태(`target`)를 함께 받아 불변성 가드를 통과해야 한다.
- 키 저장 계약:
  - 저장 파일: Electron userData 하위 `gemini-key.bin`
  - 저장 시 OS 암호화 가능해야 하며(`safeStorage.isEncryptionAvailable()`), 불가 시 실패 처리
  - 로드 시 파일 미존재/빈 파일은 `process.env.GEMINI_API_KEY` fallback

## 5. 상태 전이와 불변식
- 태스크 전이 규칙:
  - `in_progress -> not_started/planning` 금지
  - `completed -> not_started/planning/in_progress/blocked` 금지
  - `failed -> not_started/planning/in_progress/blocked` 금지
- 선점(Claim) 상태 흐름:
  - 읽기 -> claim(version 포함) -> 작업 -> complete/failed 전이 -> 필요 시 release
- 키 저장 상태 흐름:
  - 미저장 -> 암호화 저장 -> 복호화 로드 -> clear(빈 버퍼)
- 불변식:
  - 태스크 전이는 금지 규칙 위반 시 반드시 `InvalidTransitionError`를 발생시킨다.
  - claim은 항상 version 인수를 포함해 낙관적 락 충돌을 서버가 감지할 수 있어야 한다.
  - 키 파일 clear는 삭제가 아니라 0바이트 초기화로 수행한다.

## 6. 핵심 시퀀스
- 태스크 선점/전이 시퀀스:
  1. `readTask(taskId)`로 현재 `status`, `version` 조회
  2. `claimTask(taskId, version)` 호출
  3. 작업 결과 생성 후 `transitionTaskStatus(taskId, current, target, resultData)` 호출
  4. 실패/중단 시 `releaseTaskClaim(taskId)`로 복구
- 전이 가드 시퀀스:
  1. 호출자가 `current`, `target` 전달
  2. `assertTransitionAllowed`가 금지 맵 조회
  3. 금지 시 `InvalidTransitionError` throw
  4. 허용 시 CLI 전이 명령 실행
- Gemini 키 저장/로드 시퀀스:
  1. 저장: 암호화 가능 여부 확인 -> encryptString -> `gemini-key.bin` 기록
  2. 로드: 파일 존재/크기 확인 -> 복호화 또는 환경변수 fallback 반환
  3. 삭제: 파일 존재 시 빈 버퍼 기록

## 7. 오류 처리 및 복구
- 태스크 API 오류:
  - CLI 응답 envelope가 실패이면 `OMXError`로 상위 계층에 전달한다.
  - `claimTask` 충돌은 `OMXError.code='Conflict'`로 식별하여 호출자가 충돌 이벤트를 처리한다.
- 복구 흐름:
  - `releaseTaskClaim`에서 `NotFound`는 이미 해제된 상태로 간주하고 오류를 삼킨다.
- 스키마 불일치:
  - `readTask` 응답이 `TaskDataSchema`를 통과하지 못하면 명시적 예외를 발생시킨다.
- 키 저장소 오류:
  - safeStorage 비가용/복호화 실패 시 null 또는 예외로 안전 종료한다.

## 8. 보안/성능 고려
- 보안:
  - API 키는 평문 저장 금지, OS 네이티브 암호화 저장 원칙 준수
  - 키 로드 실패 시 민감정보를 로그로 노출하지 않는다.
  - 태스크 결과 payload 직렬화 시 민감 필드 포함 여부를 호출자에서 통제해야 한다.
- 성능:
  - 서비스 계층은 단일 책임 함수로 구성해 호출 비용을 최소화한다.
  - read 후 claim 패턴에서 불필요 재조회 횟수를 줄이고 version 충돌은 서버 단에서 빠르게 판별한다.
  - 키 로드는 파일 존재/크기 체크 후 필요 시에만 복호화하여 오버헤드를 줄인다.

## 9. 테스트 케이스 맵
- 단위:
  - `assertTransitionAllowed` 금지 전이 예외 발생 검증
  - `TaskDataSchema` 검증 실패 시 예외 처리
  - `isValidGeminiKeyFormat` 규칙 검증
- 통합:
  - read -> claim(version) -> transition 성공 흐름
  - claim Conflict 발생 시 오류 코드 전달
  - release NotFound 삼킴 동작 검증
  - save/load/clear + env fallback 흐름 검증
- 회귀:
  - 완료/실패 태스크의 역전 전이 허용 회귀 방지
  - safeStorage 비가용 환경에서 비정상 크래시 방지

## 10. 오픈 이슈
- `transitionTaskStatus` 목표 상태가 현재 `completed|failed`로 제한되어 있어 `blocked` 등 확장 정책 필요 여부 검토
- Gemini 키 파일의 권한 모델(사용자 계정 전환/로밍 프로필) 운영 가이드 문서화 필요
- 서비스 예외 매핑 표준(IPC 사용자 메시지, 재시도 가능 여부)을 공통 에러 카탈로그로 통합할지 검토
