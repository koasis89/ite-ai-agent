# OMX 상세설계 작업 계획 (2차 모듈 확장)

## 0) 목적
- 1차 완료 모듈(renderer, ipc, state, services, logs)과 동일한 기준으로 나머지 모듈 상세 설계서를 작성한다.
- 모든 모듈 문서를 동일 템플릿(0~10장)과 동일 검토 체계(체크리스트, 추적성, 다이어그램, 단독 리뷰)로 관리한다.

## 1) 적용 기준 (1차와 동일)
- 문서 구조: 0) 문서 정보, 1) 개요/주요기능, 2) 책임과 경계, 3) 외부/내부 인터페이스, 4) 데이터 구조/계약, 5) 상태 전이/불변식, 6) 핵심 시퀀스, 7) 오류 처리/복구, 8) 보안/성능, 9) 테스트 맵, 10) 오픈 이슈
- 문서 메타: 문서 목적, 용어 기준, 업데이트 기준 포함
- 검토 기준: Electron/design/omx/13-design-review-checklist.md 적용
- 추적성 기준: Electron/design/omx/requirements-traceability-matrix.md에 요구사항-모듈-테스트 연결

## 2) 대상 범위

### 2-1. 1차 완료 (제외)
- renderer, ipc, state, services, logs

### 2-2. 2차 작성 대상 모듈 (30개)
1. adapt
2. agents
3. auth
4. autoresearch
5. catalog
6. cli
7. components
8. core
9. env
10. goal-workflows
11. hooks
12. hud
13. main
14. mcp
15. notifications
16. openclaw
17. ops
18. performance-goal
19. pipeline
20. planning
21. question
22. ralph
23. ralplan
24. runtime
25. scripts
26. sidecar
27. team
28. test
29. utils
30. wiki

## 3) 우선순위 및 Phase 전략 (5개 x 6개)

### 3-1. Phase 1: 실행 진입/기반 코어
- core, main, env, cli, runtime
- 목표: 실행 진입점과 공통 런타임 계약을 먼저 고정

### 3-2. Phase 2: 워크플로우 오케스트레이션
- pipeline, planning, question, team, goal-workflows
- 목표: 단계 전환과 오케스트레이션 흐름의 일관성 확보

### 3-3. Phase 3: 모드/계획 특화 흐름
- ralph, ralplan, autoresearch, sidecar, ops
- 목표: 모드별 정책과 운영 제어 포인트를 정합적으로 연결

### 3-4. Phase 4: 확장/연동 계층
- mcp, hooks, agents, openclaw, adapt
- 목표: 외부 연동 인터페이스와 이벤트 계약을 표준화

### 3-5. Phase 5: 사용자 접점/보조 기능
- components, notifications, auth, catalog, wiki
- 목표: 사용자 접점과 보조 기능의 책임 경계를 명확화

### 3-6. Phase 6: 품질/성능/유틸리티
- scripts, performance-goal, utils, test, hud
- 목표: 검증 체계, 성능 기준, 관측 보조 계층을 완성

## 4) 실행 절차
1. 분석 문서 확인: Electron/analysis/*-module-analysis.md 근거 확인
2. 개별 설계서 생성: Electron/design/omx/{module}-module-design.md
3. 템플릿 채움: 0~10장 본문 작성
4. 메타 통일: 문서 목적/용어 기준/업데이트 기준 추가
5. 체크리스트 1차 판정: design-review-round2.md에 모듈별 결과 기록
6. 추적성 반영: requirements-traceability-matrix.md에 모듈/테스트 매핑 추가
7. 다이어그램 보강: core-sequence-diagrams-phase2.md에 상위 시퀀스/전이도 추가
8. 단독 최종 검토: design-review-final-phase2.md 작성

## 5) 산출물 계획

### 5-1. 개별 설계서
- Electron/design/omx/{module}-module-design.md (총 30개)

### 5-2. 검토/추적/다이어그램 문서
- Electron/design/omx/design-review-round2.md
- Electron/design/omx/core-sequence-diagrams-phase2.md
- Electron/design/omx/design-review-final-phase2.md
- Electron/design/omx/design-review-round6.md
- Electron/design/omx/requirements-traceability-matrix.md (기존 문서 확장)

## 6) 완료 기준
- 작성률: 2차 대상 30개 문서 작성률 100%
- 형식 일관성: 30개 문서 모두 0~10장 구조 및 메타 기준 충족
- 검토 완결성: design-review-round2.md, design-review-final-phase2.md 작성 완료
- 추적성 완결성: 각 모듈 최소 1개 요구사항과 1개 테스트 케이스 연결
- 오픈 이슈 관리: 모듈별 오픈 이슈 담당/목표일 지정 완료

## 7) 리스크 및 대응
- 리스크 1: 테스트 러너 미설치로 실행 검증 지연
  - 대응: 문서 작성과 추적성 연결을 우선 완료하고, 실행 결과는 설치 후 상태 업데이트
- 리스크 2: 모듈 수 증가로 용어 불일치 가능성
  - 대응: 각 Phase 종료 시 용어/메타 통일 점검 라운드 수행
- 리스크 3: 상태 전이 정의 중복
  - 대응: Phase 2 완료 시 canonical 전이 정의 위치를 별도 메모로 고정

## 8) 작업 순서 (즉시 시작)
1. Phase 1 (5개) 설계서 본문 작성 완료, design-review-round2.md 1차 판정 기록 시작
2. Phase 2 (5개) 설계서 본문 작성 완료, design-review-round2.md에 Phase 2 판정 추가 완료
3. Phase 3 (5개) 설계서 본문 작성 완료, design-review-round3.md에 Phase 3 판정 추가 완료
4. Phase 4 (5개) 설계서 본문 작성 완료, design-review-round4.md에 Phase 4 판정 추가 완료
5. Phase 5 (5개) 설계서 본문 작성 완료, design-review-round5.md에 Phase 5 판정 추가 완료
6. Phase 6 (5개) 설계서 본문 작성 완료, design-review-round6.md에 Phase 6 판정 추가 완료
7. round2/final 문서 작성 후 전체 정합성 점검
