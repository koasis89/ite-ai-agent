# OMX Renderer 모듈 개별 설계서

## 0. 문서 정보
- 모듈: renderer
- 기준 분석 문서: Electron/analysis/renderer-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 구현, 리뷰, 테스트 시 공통 판단 기준 제공
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 구조 또는 계약 변경 시 4, 5, 10장을 우선 갱신

## 1. 개요와 주요기능
- 개요: renderer 모듈은 Electron 앱의 사용자 인터페이스 계층으로, 사용자 입력을 수집하고 Main Process에서 전달되는 스트림/상태 이벤트를 시각화한다.
- 주요기능:
  - 채팅 인터랙션: 메시지 입력, 전송, 스트리밍 응답 렌더링
  - 상태 가시화: lifecycle/todo/툴 이벤트를 대시보드로 표시
  - 설정 제어: 모델 선택, API 키 상태, 어댑터 상태 노출
  - 오버레이 UX: 인터류드/경고/오류/지식 패널 표시

## 2. 책임과 경계
- 책임:
  - Main에서 전달된 이벤트를 화면 상태로 투영한다.
  - 사용자 액션을 preload API 호출로 변환한다.
  - 컴포넌트 단위로 관심사를 분리한다.
- 비책임:
  - 비즈니스 규칙 결정, 상태 파일 직접 수정, 프로세스 제어는 담당하지 않는다.
- 경계:
  - Renderer는 직접 Node API를 사용하지 않고 `window.electronAPI` 경유로만 Main과 통신한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스 (preload 제공):
  - 요청: `startAgentStream`, `stopAgentStream`, `sendInterludeAck`, `getLifecycleState`, `getTodoList`, `probeAdapter`
  - 구독: `onStreamToken`, `onStreamToolCall`, `onStreamDone`, `onStreamError`, `onLifecycleChange`, `onTodoChange`, `onInterludeStart`
- 내부 인터페이스 (주요 props):
  - `ChatContainer.onSendMessage(text)`
  - `ChatContainer.selectedModel`, `ChatContainer.onModelChange(modelId)`
  - `LifecycleDashboard.defaultOpen`, `LifecycleDashboard.stateDir`

## 4. 데이터 구조와 계약
- 메시지 모델:
  - `{ id: string, role: 'user' | 'assistant' | 'system', content: string }`
- 할일 모델:
  - `{ id: number, title: string, status: 'not-started' | 'in-progress' | 'completed' }`
- 수명주기 모델:
  - `{ status, activeMode?, activeSkill?, mergedModes, updatedAt, audit?, reason? }`
- 렌더링 계약:
  - 수신 payload 누락 필드는 기본값 병합으로 보정한다.
  - 스트림 텍스트는 done 시점에 확정 메시지로 전환한다.

## 5. 상태 전이와 불변식
- 채팅 상태:
  - 입력 가능 -> 전송 -> 스트리밍 -> 완료/오류
- 인터류드 상태:
  - 일반 모드 -> 인터류드 시작 -> 처리중 락 -> 해제/취소 -> 일반 모드
- 불변식:
  - 인터류드 활성 중 일반 입력 전송 금지
  - 스트림 종료 이후 임시 버퍼는 비워진 상태여야 함
  - 구독 등록된 이벤트는 언마운트 시 반드시 해제

## 6. 핵심 시퀀스
- 사용자 질의 전송 시퀀스:
  1. 사용자가 입력창에 질의 작성
  2. `ChatContainer`가 `onSendMessage` 호출
  3. 상위 `App`이 `startAgentStream` 요청
  4. token 이벤트 수신 시 assistant 버블 누적 렌더링
  5. done 이벤트 수신 시 최종 메시지 확정
- 상태 대시보드 시퀀스:
  1. 초기 마운트 시 `getLifecycleState`, `getTodoList` 호출
  2. 이후 `onLifecycleChange`, `onTodoChange` 구독으로 실시간 반영

## 7. 오류 처리 및 복구
- 스트림 오류:
  - `onStreamError` 수신 시 에러 버블로 노출하고 사용자가 재시도 가능하도록 입력 유지
- API 미노출/구독 실패:
  - optional chaining 기반 no-op로 처리, 화면 크래시 방지
- 비정상 종료:
  - done(exitCode!=0)에서 실패 상태로 표시 후 다음 요청 가능 상태 복귀

## 8. 보안/성능 고려
- 보안:
  - Renderer에서 직접 파일/프로세스 접근 금지(contextIsolation 가정)
  - 링크/마크다운 렌더링 시 표현 계층 제약 유지
- 성능:
  - 스트림 토큰 누적 시 불필요한 대규모 리렌더 최소화
  - 장문 메시지 overflow 처리로 레이아웃 붕괴 방지
  - 이벤트 구독 해제로 메모리 누수 방지

## 9. 테스트 케이스 맵
- 단위:
  - 메시지 전송, 엔터 키 동작, 인터류드 입력 잠금
- 통합:
  - 스트림 token/done/error 이벤트의 UI 반영
  - lifecycle/todo 이벤트 수신 후 대시보드 동기화
- 회귀:
  - 메시지 순서 역전 방지
  - Markdown 렌더링 정상 여부

## 10. 오픈 이슈
- 컴포넌트 스타일 체계 통일(CSS 모듈/토큰화) 필요
- 대용량 대화 이력에서 가상 스크롤 도입 검토
- 이벤트 스키마 타입을 preload와 단일 소스로 자동 생성할지 검토
