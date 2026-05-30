# OMX IPC 모듈 개별 설계서

## 0. 문서 정보
- 모듈: ipc
- 기준 분석 문서: Electron/analysis/ipc-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 구현, 리뷰, 테스트 시 공통 판단 기준 제공
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 구조 또는 계약 변경 시 4, 5, 10장을 우선 갱신

## 1. 개요와 주요기능
- 개요: ipc 모듈은 Electron Main Process의 요청/이벤트 관문으로, Renderer 요청을 서비스 호출로 변환하고 스트림/상태 변경을 창 전체에 브로드캐스트한다.
- 주요기능:
  - 채널 라우팅: 기능별 IPC 채널을 분리해 핸들러를 등록하고 책임을 모듈화
  - 요청 중개: Renderer 입력을 검증 후 서비스 계층 호출로 위임
  - 이벤트 전파: lifecycle/todo/stream/interlude 이벤트를 다중 창으로 동기화
  - 상태 정합성: 시작/중단/종료 이벤트와 lifecycle 상태 전이를 맞춘다

## 2. 책임과 경계
- 책임:
  - 채널별 핸들러를 등록하고 중복 등록 없이 안정적으로 유지한다.
  - Renderer 요청 파라미터를 검증하고 오류를 안전한 형태로 반환한다.
  - 상태 변경 및 스트림 이벤트를 event broadcast 규약으로 전달한다.
- 비책임:
  - UI 렌더링, 도메인 비즈니스 규칙, 파일 저장 정책 결정은 담당하지 않는다.
- 경계:
  - ipc는 transport adapter 계층으로 동작하며, 도메인 로직은 `services` 및 `core`로 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스 (Renderer에서 invoke/on):
  - `adapter-ipc`: 어댑터 점검/상태 조회 채널
  - `cli-ipc`: 실행 환경/CLI 관련 질의 채널
  - `env-ipc`: 환경 변수/설정 조회 채널
  - `interlude-ipc`: 인터류드 이벤트/응답 채널
  - `ops-ipc`: 운영 명령/제어 채널
  - `state-ipc`: lifecycle/todo 상태 조회 및 구독 채널
  - `stream-bridge-ipc`: 에이전트 스트림 시작/중지/토큰/종료 채널
  - `task-ipc`: 태스크 수행/조회 채널
- 내부 인터페이스 (ipc 내부 결합점):
  - `event-broadcast-ipc`의 공통 브로드캐스트 유틸
  - `state-ipc.pushTodoState`를 통한 즉시 todo 동기화 훅
  - stream parser 결과를 tool-call/todo 이벤트로 변환하는 브리지

## 4. 데이터 구조와 계약
- 공통 응답 계약:
  - 성공: `{ ok: true, data: T }`
  - 실패: `{ ok: false, error: { code: string, message: string } }`
- lifecycle 페이로드 계약:
  - `{ status, activeMode?, activeSkill?, mergedModes, updatedAt, reason? }`
- todo 페이로드 계약:
  - `{ items: Array<{ id: number, title: string, status: 'not-started' | 'in-progress' | 'completed' }> }`
- stream 이벤트 계약:
  - token: `{ streamId, textChunk }`
  - tool_call: `{ streamId, toolName, args? }`
  - done: `{ streamId, exitCode, reason? }`
- 계약 원칙:
  - preload 타입 선언과 메인 채널 이름은 1:1 매칭해야 한다.
  - 선택 필드 누락 시 기본값으로 보정해 Renderer 파싱 실패를 방지한다.

## 5. 상태 전이와 불변식
- 스트림 상태 전이:
  - idle -> starting -> streaming -> completed | failed | cancelled
- lifecycle 상태 전이:
  - idle -> active -> waiting-interlude -> active -> completed
- 불변식:
  - 채널명은 preload와 메인 간 단일 소스 규약을 유지한다.
  - 동일 채널 핸들러는 프로세스당 1회 등록을 보장한다.
  - stream `done` 이후 해당 streamId에 대한 token 브로드캐스트는 발생하지 않는다.
  - todo 상태는 파일 watcher 경로와 스트림 기반 즉시 업데이트 중 최신 이벤트를 반영한다.

## 6. 핵심 시퀀스
- 에이전트 스트림 시작/종료 시퀀스:
  1. Renderer가 `startAgentStream` invoke
  2. `stream-bridge-ipc`가 실행 컨텍스트 생성 및 lifecycle active 전이 브로드캐스트
  3. stream parser가 token/tool 이벤트를 파싱
  4. `event-broadcast-ipc`를 통해 `onStreamToken`, `onStreamToolCall` 전파
  5. 종료 시 `onStreamDone` 전파 및 lifecycle completed/idle 정리
- todo 즉시 동기화 시퀀스:
  1. parser가 `manage_todo_list` tool call 감지
  2. `stream-bridge-ipc`가 payload를 추출
  3. `state-ipc.pushTodoState` 호출로 캐시 갱신
  4. `onTodoChange` 브로드캐스트로 Renderer 패널 즉시 갱신
- 상태 초기 로드 시퀀스:
  1. Renderer 마운트 시 `getLifecycleState`, `getTodoList` invoke
  2. `state-ipc`가 workspace `.omx/state` 우선 경로에서 스냅샷 로드
  3. 초기 값 반환 후 watcher 이벤트를 실시간 반영

## 7. 오류 처리 및 복구
- 입력 검증 오류:
  - 필수 파라미터 누락/형식 불일치 시 명시적 `code`를 포함한 실패 응답 반환
- 런타임 예외:
  - 핸들러 내부 예외는 캡슐화해 Renderer에 스택을 직접 노출하지 않는다.
- watcher 경로 오류:
  - 사용자 홈 `.omx/state` 미존재 시 workspace `.omx/state` fallback 적용
- 스트림 중단/실패:
  - stop 요청 또는 비정상 종료 시 done 이벤트를 강제 전파해 UI 대기 상태를 해제

## 8. 보안/성능 고려
- 보안:
  - IPC 노출 표면 최소화: 필요한 채널만 preload로 공개
  - 입력 데이터는 문자열 길이/구조 검증 후 처리
  - 민감 정보(API 키/토큰)는 로깅 페이로드에서 마스킹
- 성능:
  - 브로드캐스트는 이벤트 타입 기준으로 최소 payload만 전송
  - 파일 watcher와 스트림 이벤트를 병행하되 중복 렌더를 줄이도록 이벤트 병합
  - 장시간 세션에서 구독 해제 누락이 없도록 dispose 경로 보장

## 9. 테스트 케이스 맵
- 단위:
  - 채널 핸들러 등록/중복 방지
  - 파라미터 검증 실패 응답 포맷
  - parser -> tool_call -> todo push 연결
- 통합:
  - start/stop/done 이벤트와 lifecycle 전이 정합성
  - workspace state 경로 fallback 및 초기 snapshot 로드
  - multi-window 브로드캐스트 동기화
- 회귀:
  - done 이후 token 추가 전송 방지
  - preload 채널명 변경 시 컴파일/런타임 불일치 탐지

## 10. 오픈 이슈
- 채널 상수와 preload 타입을 코드 생성 기반 단일 소스로 통합할지 결정 필요
- 브로드캐스트 이벤트 스키마 버전 관리(하위 호환) 정책 필요
- state watcher debounce 정책을 문서화하고 대용량 파일 변경 시 부하 측정 필요
