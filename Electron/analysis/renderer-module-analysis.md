# src/renderer/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/renderer/

## 1. 구성 요소

- `App.tsx`
- `main.tsx`
- `styles.css`
- `components/`

## 2. 역할

`renderer`는 사용자 UI 계층이다.
채팅, 상태 대시보드, 설정, 오버레이를 렌더링하고 preload API를 통해 Main과 통신한다.

## 3. 핵심 설계 포인트

- 상태 흐름: stream token/tool/lifecycle/todo 이벤트 구독
- UI 분리: ChatContainer, LifecycleDashboard, TodoPanel 등 컴포넌트 단 책임 분리
- CSS 기반 공통 스타일 + 컴포넌트별 인라인 스타일 혼합

## 4. 검증 포인트

- IPC 이벤트 해제(unsubscribe) 누락 방지
- 스트림 완료/오류 시 상태 초기화
- 대시보드와 채팅 동기화 정합성
