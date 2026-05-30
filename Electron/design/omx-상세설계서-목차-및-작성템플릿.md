
## OMX 설계서 목차 및 작성 템플릿

### 문서 정보
- 문서명: OMX 설계서
- 버전: v0.1
- 작성일: 2026-05-29
- 기준 분석 문서: Electron/analysis/*module-analysis.md
- 작성자: [고종훈] 
- 검토자: [고종훈], [고종훈]
### 1. 문서 개요
#### 1.1 작성 목적
#### 1.2 범위(In Scope)
#### 1.3 비범위(Out of Scope)
#### 1.4 독자 대상

### 2. 참조 및 용어
#### 2.1 참조 문서
#### 2.2 용어/약어 정의
#### 2.3 전제 및 제약사항

### 3. 시스템 컨텍스트
#### 3.1 상위 아키텍처 개요
#### 3.2 실행 환경(Electron Main/Renderer/Preload)
#### 3.3 외부 연동 경계(OMX CLI, MCP, OpenClaw 등)

### 4. 논리 아키텍처 상세
#### 4.1 모듈 계층 구조
#### 4.2 모듈 간 의존성 규칙
#### 4.3 이벤트/명령 흐름 개요

### 5. 런타임 시퀀스
#### 5.1 사용자 입력 처리 시퀀스
#### 5.2 라우팅/계획/실행 시퀀스
#### 5.3 상태 동기화 및 UI 반영 시퀀스
#### 5.4 오류/중단/재시도 시퀀스

### 6. 데이터/상태 모델
#### 6.1 공통 데이터 계약
#### 6.2 상태 파일(.omx/state) 모델
#### 6.3 IPC payload 계약
#### 6.4 버전/호환성 정책

### 7. 인터페이스 설계
#### 7.1 Main-Renderer IPC 채널 설계
#### 7.2 CLI 실행 인터페이스 설계
#### 7.3 MCP/Adapter 인터페이스 설계

### 8. 보안 및 권한 설계
#### 8.1 인증/권한 모델
#### 8.2 입력 검증/무결성
#### 8.3 민감정보/키 관리
#### 8.4 감사 추적(Audit)

### 9. 성능 및 안정성 설계
#### 9.1 성능 목표 및 지표
#### 9.2 병목 구간/최적화 전략
#### 9.3 장애 복구/폴백 전략
#### 9.4 관측성(로그/메트릭/트레이스)

### 10. 테스트 전략
#### 10.1 단위 테스트 범위
#### 10.2 통합 테스트 범위
#### 10.3 E2E/시나리오 테스트
#### 10.4 회귀 테스트 및 검증 게이트

### 12. 마이그레이션 및 변경 관리
#### 12.1 기존 구조와의 차이
#### 12.2 단계별 전환 계획
#### 12.3 위험요소 및 대응

### 13. 모듈별 상세 설계 (분석 문서 기준)

- 안내: 본 장은 예시 1개(13.34) 포함 템플릿이며, 나머지 모듈은 동일 구조로 확장 작성한다.

#### 13.1 adapt 모듈 설계
- 기준 문서: Electron/analysis/adapt-module-analysis.md
- 작성 항목:
  - 책임과 경계
  - 주요 타입/데이터 계약
  - 핵심 시퀀스
  - 상태 전이/불변식
  - 실패 시나리오/복구
  - 테스트 포인트

#### 13.2 agents 모듈 설계
- 기준 문서: Electron/analysis/agents-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.3 auth 모듈 설계
- 기준 문서: Electron/analysis/auth-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.4 autoresearch 모듈 설계
- 기준 문서: Electron/analysis/autoresearch-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.5 catalog 모듈 설계
- 기준 문서: Electron/analysis/catalog-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.6 cli 모듈 설계
- 기준 문서: Electron/analysis/cli-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.7 goal-workflows 모듈 설계
- 기준 문서: Electron/analysis/goal-workflows-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.8 hooks 모듈 설계
- 기준 문서: Electron/analysis/hooks-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.9 hud 모듈 설계
- 기준 문서: Electron/analysis/hud-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.10 mcp 모듈 설계
- 기준 문서: Electron/analysis/mcp-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.11 notifications 모듈 설계
- 기준 문서: Electron/analysis/notifications-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.12 openclaw 모듈 설계
- 기준 문서: Electron/analysis/openclaw-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.13 performance-goal 모듈 설계
- 기준 문서: Electron/analysis/performance-goal-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.14 pipeline 모듈 설계
- 기준 문서: Electron/analysis/pipeline-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.15 planning 모듈 설계
- 기준 문서: Electron/analysis/planning-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.16 question 모듈 설계
- 기준 문서: Electron/analysis/question-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.17 ralph 모듈 설계
- 기준 문서: Electron/analysis/ralph-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.18 ralplan 모듈 설계
- 기준 문서: Electron/analysis/ralplan-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.19 runtime 모듈 설계
- 기준 문서: Electron/analysis/runtime-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.20 scripts 모듈 설계
- 기준 문서: Electron/analysis/scripts-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.21 sidecar 모듈 설계
- 기준 문서: Electron/analysis/sidecar-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.22 state 모듈 설계
- 기준 문서: Electron/analysis/state-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.23 team 모듈 설계
- 기준 문서: Electron/analysis/team-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.24 utils 모듈 설계
- 기준 문서: Electron/analysis/utils-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.25 wiki 모듈 설계
- 기준 문서: Electron/analysis/wiki-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.26 main 모듈 설계
- 기준 문서: Electron/analysis/main-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.27 core 모듈 설계
- 기준 문서: Electron/analysis/core-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.28 env 모듈 설계
- 기준 문서: Electron/analysis/env-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.29 ipc 모듈 설계
- 기준 문서: Electron/analysis/ipc-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.30 logs 모듈 설계
- 기준 문서: Electron/analysis/logs-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.31 ops 모듈 설계
- 기준 문서: Electron/analysis/ops-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.32 services 모듈 설계
- 기준 문서: Electron/analysis/services-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.33 renderer 모듈 설계
- 기준 문서: Electron/analysis/renderer-module-analysis.md
- 작성 항목: 공통 템플릿 동일

#### 13.34 components 모듈 설계 (예시 섹션)
- 기준 문서: Electron/analysis/components-module-analysis.md

- 안내: 본 섹션은 템플릿 작성 방식 예시다. 다른 모듈은 동일 구조(개요/주요기능 + 13.xx.1~13.xx.9)로 확장 작성한다.

- 개요: `components` 모듈은 Renderer UI를 기능 단위로 분리한 프레젠테이션 계층이며, 채팅/상태/설정/보조 오버레이를 조합해 사용자 워크플로우를 구성한다.
- 주요기능:
  - 채팅 상호작용: `ChatContainer`를 중심으로 메시지 입력, 스트리밍 응답, 인터류드 모드, 컨텍스트 첨부 처리
  - 상태 시각화: `LifecycleDashboard`, `TodoPanel`, `TaskTimeline`으로 실행 상태/할일/이력 표시
  - 모델 및 환경 제어: `ModelSelector`, `ApiKeySettings`, `AdapterStatusBar`를 통한 모델 선택, API 키 상태, 어댑터 상태 표시
  - 보조 UX: `WikiOverlay`, `DeferredSkillsNotice`, `ErrorGuideOverlay`, `KnowledgePanel` 기반의 안내/지식 탐색/오류 피드백 제공

##### 13.34.1 책임과 경계
- `components`는 기능 단위 UI 캡슐화를 담당한다.
- 도메인 상태 소스는 Main/IPC이며, 컴포넌트는 구독/표현/입력 수집에 집중한다.
- 주요 축:
  - 대화 축: `ChatContainer`
  - 상태 축: `LifecycleDashboard`, `TodoPanel`, `TaskTimeline`
  - 설정/보조 축: `ModelSelector`, `ApiKeySettings`, `AdapterStatusBar`, `WikiOverlay`

##### 13.34.2 외부/내부 인터페이스
- 외부 인터페이스: `window.electronAPI` 구독/요청 메서드
- 내부 인터페이스: 컴포넌트 props 기반 조합
  - 예: `ChatContainer.onSendMessage`, `ModelSelector.onChange`, `LifecycleDashboard.stateDir`

##### 13.34.3 데이터 구조와 계약
- 메시지 모델: `{ id, role, content }`
- 할일 모델: `{ id, title, status }`
- 수명주기 모델: `{ status, activeMode?, mergedModes, updatedAt, audit? }`
- UI는 수신 payload를 신뢰하지 않고 기본값으로 방어 병합한다.

##### 13.34.4 상태 전이와 불변식
- 채팅 전송 후 스트리밍 시작 전에는 입력 상태를 초기화한다.
- 인터류드 활성 시 일반 입력창은 비활성/오버레이 모드로 전환한다.
- 스트림 완료 시 임시 스트리밍 텍스트를 확정 메시지로 반영한다.

##### 13.34.5 핵심 시퀀스
- 사용자 메시지 전송:
  1. 입력/첨부 컨텍스트 결합
  2. `onSendMessage`로 상위 전달
  3. 스트리밍 token 수신 시 assistant 버블 갱신
  4. done 수신 시 메시지 확정 및 디버그 상태 초기화

##### 13.34.6 오류 처리 및 복구
- IPC 미존재/구독 실패 시 컴포넌트 크래시 없이 no-op 처리
- stream error는 사용자 가시 영역(에러 버블)로 표준 출력
- 구독 해제(cleanup)를 강제해 메모리 누수를 방지

##### 13.34.7 보안/성능 고려
- Markdown 렌더링은 컴포넌트 매핑으로 표시 규칙을 제어한다.
- 긴 텍스트/테이블 렌더링에서 overflow 스타일을 적용해 레이아웃 붕괴를 방지한다.
- 불필요한 리렌더를 줄이기 위해 상태 업데이트 범위를 최소화한다.

##### 13.34.8 테스트 케이스 맵
- 채팅 입력/전송/엔터 키 동작.
- 인터류드 진입/해제 시 UI 잠금 및 복귀.
- todo/lifecycle/tool_call 이벤트 수신 시 화면 갱신.

##### 13.34.9 오픈 이슈
- 컴포넌트별 스타일 분리(CSS module 또는 토큰화) 필요.
- 장문 대화 이력 가상 스크롤 도입 검토.

#### 13.35 test 모듈 설계
- 기준 문서: Electron/analysis/test-module-analysis.md
- 작성 항목: 공통 템플릿 동일

### 14. 모듈 공통 상세 템플릿 (복붙용)
#### 14.1 책임과 경계
#### 14.2 외부/내부 인터페이스(타입, 스키마, IPC/이벤트)
#### 14.3 데이터 구조와 계약
#### 14.4 상태 전이와 불변식
#### 14.5 핵심 시퀀스 다이어그램
#### 14.6 오류 처리 및 복구
#### 14.7 보안/성능 고려
#### 14.8 테스트 케이스 맵
#### 14.9 오픈 이슈

### 15. 추적성 매트릭스
#### 15.1 요구사항-모듈 매핑
#### 15.2 요구사항-테스트 매핑

### 16. 부록
#### 16.1 상태 전이 다이어그램 목록
#### 16.2 시퀀스 다이어그램 목록
#### 16.3 ADR 요약
#### 16.4 변경 이력
