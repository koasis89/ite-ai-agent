# 요구사항 추적성 매트릭스

## 0) 목적
- 요구사항, 설계 모듈, 테스트 케이스의 연결을 명시해 누락과 중복을 식별한다.

## 1) 범위
- 1차 대상 모듈: renderer, ipc, state, services, logs
- 관련 문서:
  - Electron/design/omx/renderer-module-design.md
  - Electron/design/omx/ipc-module-design.md
  - Electron/design/omx/state-module-design.md
  - Electron/design/omx/services-module-design.md
  - Electron/design/omx/logs-module-design.md

## 2) 요구사항-모듈 매핑
| Req ID | 요구사항 | 모듈 | 설계 근거 섹션 | 구현 파일 | 상태 |
|---|---|---|---|---|---|
| R-001 | 채팅 스트림 응답을 실시간으로 UI에 표시 | renderer, ipc | renderer 6, ipc 6 | Electron/src/renderer/components/ChatContainer.tsx, Electron/src/main/ipc/stream-bridge-ipc.ts | Draft |
| R-002 | todo 상태를 실행 중에 즉시 반영 | ipc, state, renderer | ipc 5/6, state 6, renderer 6 | Electron/src/main/ipc/state-ipc.ts, Electron/src/main/ipc/stream-bridge-ipc.ts, Electron/src/renderer/components/LifecycleDashboard.tsx | Draft |
| R-003 | 상태 파일을 세션 우선 규칙으로 읽고 기록 | state | state 4/6 | src/state/operations.ts, src/state/paths.ts | Draft |
| R-004 | 태스크 claim 충돌을 감지하고 복구 | services, ipc | services 5/7, ipc 7 | Electron/src/main/services/task-service.ts, Electron/src/main/ipc/task-ipc.ts | Draft |
| R-005 | 실행 로그와 hooks 이벤트를 관측 가능하게 유지 | logs, ipc, renderer | logs 1/6, ipc 6 | Electron/src/main/logs/session-logger.ts, Electron/src/main/logs/hook-tailer.ts, Electron/src/main/logs/event-dispatcher.ts | Draft |

## 3) 요구사항-테스트 매핑
| Req ID | Case ID | 테스트 유형 | 테스트 항목 | 테스트 파일 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| R-001 | TC-R001-01 | 단위+통합 | start, token, done 이벤트 브리지 및 파싱 | Electron/src/test/stream-parser.test.ts | High | Blocked (Runner 미설치) |
| R-001 | TC-R001-02 | 통합 | interlude UI 반영 및 입력 제어 | Electron/src/test/interlude-ui.integrated.test.ts | High | Blocked (Runner 미설치) |
| R-002 | TC-R002-01 | 단위+통합 | state 파일 변경 감지 및 todo/lifecycle 반영 | Electron/src/test/state-watcher.test.ts | High | Blocked (Runner 미설치) |
| R-002 | TC-R002-02 | 단위+통합 | tool call 기반 즉시 todo 갱신 경로 | Electron/src/test/stream-parser.test.ts | High | Blocked (Runner 미설치) |
| R-003 | TC-R003-01 | 단위 | 세션 우선 경로 해석 및 상태 읽기/쓰기 | src/state/__tests__/operations.test.ts | High | Blocked (Runner 미설치) |
| R-003 | TC-R003-02 | 단위 | path traversal 방어 | src/state/__tests__/path-traversal.test.ts | High | Blocked (Runner 미설치) |
| R-003 | TC-R003-03 | 단위 | 모드 전환 규칙 및 컨텍스트 동작 | src/state/__tests__/workflow-transition.test.ts, src/state/__tests__/mode-state-context.test.ts | High | Blocked (Runner 미설치) |
| R-004 | TC-R004-01 | 단위 | claim conflict 처리, release NotFound 복구 | Electron/src/test/task-service.test.ts | High | Blocked (Runner 미설치) |
| R-004 | TC-R004-02 | 단위 | lifecycle 전이 가드 검증 | Electron/src/test/task-service.lifecycle.test.ts | High | Blocked (Runner 미설치) |
| R-005 | TC-R005-01 | 단위 | hooks tail 라인 버퍼, 로테이션, 유실 방지 | Electron/src/test/hook-tailer.test.ts | Medium | Blocked (Runner 미설치) |
| R-005 | TC-R005-02 | 단위 | 이벤트 스키마 검증 및 우선 채널 분기 | Electron/src/test/event-dispatcher.test.ts | Medium | Blocked (Runner 미설치) |

## 4) 누락, 중복 식별
### 4-1. 잠재 누락
- 요구사항별 명시적인 수용 기준(acceptance criteria) 상세 수치가 부족함
- 운영 관점의 알림 정책과 장애 시 대응 시간 목표가 문서화되지 않음

### 4-2. 잠재 중복
- ipc와 state 문서에 lifecycle 상태 기술이 중복되므로 canonical 정의 위치를 명확히 분리할 필요
- logs와 ipc에서 이벤트 브로드캐스트 책임 범위 경계가 일부 겹칠 수 있음

## 5) 다음 업데이트 항목
- 테스트 러너(jest/vitest) 설치 후 케이스 상태를 Passed/Failed로 갱신
- 각 오픈 이슈의 담당자와 목표 완료일 추가
- 상태를 Draft에서 Reviewed로 승격하기 위한 판정 기준 추가

## 6) 테스트 실행 제약
- 실행 점검 일시: 2026-05-29
- 확인 명령:
  - `npm ls jest --depth=0`
  - `npm ls vitest --depth=0`
- 결과: 루트 워크스페이스 기준 jest/vitest 미설치로 테스트 실행이 차단됨

## 7) 오픈 이슈 책임자 및 목표일
| Issue ID | 이슈 | 담당 | 목표일 | 상태 |
|---|---|---|---|---|
| OI-001 | 수용 기준 수치화(성능, 실패율, 응답시간) 미정 | Design Owner | 2026-06-05 | Open |
| OI-002 | 운영 알림 정책 및 장애 대응 목표 미정 | Ops Owner | 2026-06-07 | Open |
| OI-003 | ipc/state lifecycle canonical 위치 분리 필요 | Architecture Owner | 2026-06-04 | Open |
| OI-004 | logs/ipc 이벤트 브로드캐스트 책임 경계 명확화 필요 | Architecture Owner | 2026-06-04 | Open |
