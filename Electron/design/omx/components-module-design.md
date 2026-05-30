# OMX Components 모듈 개별 설계서

## 0. 문서 정보
- 모듈: components
- 기준 분석 문서: Electron/analysis/components-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: renderer 기능 단위 UI 컴포넌트의 책임, 조합, 렌더 안정성 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: ChatContainer, LifecycleDashboard, TodoPanel, WikiOverlay 등 핵심 컴포넌트 계약 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: components 모듈은 renderer의 화면 조각을 독립 컴포넌트로 캡슐화하여 채팅, 상태, 설정, 오버레이, 타임라인, 위키 보조 UI를 조합하는 프론트엔드 UI 계층이다.
- 주요기능:
  - 채팅 UI 구성: ChatContainer 중심 메시지/스트림/인터류드 처리
  - 상태 가시화: LifecycleDashboard, TodoPanel, TaskTimeline 조합
  - 설정/보조 UI: ModelSelector, ApiKeySettings, AdapterStatusBar
  - 오버레이 경험: ErrorGuideOverlay, KnowledgePanel, WikiOverlay

## 2. 책임과 경계
- 책임:
  - 기능 단위 UI를 재사용 가능하게 분리하고 렌더 책임을 집중
  - long text/markdown/스트림 상태가 안전하게 표시되도록 한다.
  - 이벤트 구독과 렌더 부작용을 최소화한다.
- 비책임:
  - 상태 갱신, IPC 호출, 도메인 정책 판정은 담당하지 않는다.
- 경계:
  - components는 순수 UI 조합 계층이며, 데이터와 이벤트는 상위 renderer/container에서 공급한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - ChatContainer, LifecycleDashboard, TodoPanel, TaskTimeline, ModelSelector, ApiKeySettings, AdapterStatusBar, KnowledgePanel, ErrorGuideOverlay, DeferredSkillsNotice, WikiOverlay
- 내부 인터페이스:
  - props-driven composition
  - renderer state/event subscription
  - markdown/stream rendering helpers
- 호출자:
  - Electron renderer pages, chat shell, dashboard layout, settings panels

## 4. 데이터 구조와 계약
- 주요 타입:
  - Chat message, stream event, tool-call payload
  - lifecycle snapshot, todo item, task timeline entry
  - settings state, adapter status state, wiki overlay state
- 계약 원칙:
  - 각 컴포넌트는 최소한의 props만 요구하고 상위 계층 상태를 직접 수정하지 않는다.
  - markdown 출력은 안전한 렌더링 경로를 사용해야 한다.
  - 상태 패널은 긴 텍스트와 작은 화면에서도 읽기 가능해야 한다.

## 5. 상태 전이와 불변식
- UI 상태 전이:
  - idle -> streaming -> done/error -> idle
  - hidden -> visible -> dismissed (overlay)
- 불변식:
  - 이벤트 구독은 unmount 시 정리되어야 한다.
  - 컴포넌트는 데이터 소유권을 갖지 않는다.
  - 동일 상태가 반복 렌더되어도 부작용이 없어야 한다.

## 6. 핵심 시퀀스
- 채팅 렌더 시퀀스:
  1. ChatContainer가 메시지와 스트림 이벤트를 수신
  2. assistant 응답은 markdown으로 렌더
  3. tool-call/인터류드 상태는 보조 컴포넌트로 분리 표시
- 상태 대시보드 시퀀스:
  1. LifecycleDashboard가 현재 실행 상태를 요약
  2. TodoPanel과 TaskTimeline이 진행/할일을 시각화
  3. 작업 완료/실패는 색상과 상태 배지로 구분

## 7. 오류 처리 및 복구
- 렌더 오류:
  - 개별 컴포넌트 오류는 전체 앱 붕괴 대신 fallback UI로 완화한다.
- 긴 텍스트:
  - truncation, wrap, overflow 제어로 레이아웃 붕괴를 방지한다.
- 저해상도 화면:
  - responsive layout과 축약 표시를 사용한다.

## 8. 보안/성능 고려
- 보안:
  - markdown/overlay는 안전한 렌더링 가드를 사용해야 한다.
  - 외부 링크/위키 내용은 오버레이 수준에서만 노출한다.
- 성능:
  - 이벤트 리스너를 최소화하고 불필요한 리렌더를 줄인다.
  - 렌더링 비용이 큰 패널은 필요 시 조건부로 표시한다.

## 9. 테스트 케이스 맵
- 단위:
  - ChatContainer markdown/stream 렌더
  - LifecycleDashboard/TodoPanel/Timeline 조합
  - overlay dismissal 및 fallback UI
- 통합:
  - renderer event subscription/unsubscription
  - mobile layout 대응
- 회귀:
  - memory leak 방지
  - long text wrap 안전성

## 10. 오픈 이슈
- 컴포넌트별 접근성 레이블과 키보드 내비게이션 기준을 더 세분화할 필요가 있음
- 공통 상태 패널 스타일을 design token 수준에서 정리할 필요가 있음
- markdown/오버레이 렌더링의 XSS 방지 정책을 문서화할 필요가 있음
