# src/renderer/components/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/renderer/components/

## 1. 구성 컴포넌트

- `AdapterStatusBar.tsx`
- `ApiKeySettings.tsx`
- `ChatContainer.tsx`
- `DeferredSkillsNotice.tsx`
- `ErrorGuideOverlay.tsx`
- `KnowledgePanel.tsx`
- `LifecycleDashboard.tsx`
- `ModelSelector.tsx`
- `TaskTimeline.tsx`
- `TodoPanel.tsx`
- `WikiOverlay.tsx`

## 2. 역할

`components`는 Renderer의 기능 단위 UI를 캡슐화한다.
채팅/상태/설정/오버레이를 조합해 사용자 워크플로우를 구성한다.

## 3. 핵심 설계 포인트

- 채팅 실행 루프: `ChatContainer` 중심의 메시지/스트림/인터류드 처리
- 상태 가시화: `LifecycleDashboard` + `TodoPanel` + `TaskTimeline`
- 설정/상태 보조 UI: `ModelSelector`, `ApiKeySettings`, `AdapterStatusBar`

## 4. 검증 포인트

- 이벤트 구독 누수(memory leak) 방지
- long text/markdown 렌더링 안전성
- 모바일/저해상도 레이아웃 대응
