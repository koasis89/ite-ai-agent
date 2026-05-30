# OMX Runtime 모듈 개별 설계서

## 0. 문서 정보
- 모듈: runtime
- 기준 분석 문서: Electron/analysis/runtime-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 실행 생명주기 계약(run outcome)과 루프/상태/브리지/프로세스 관리를 통합 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 결과 타입/루프 종료 규칙/브리지 명령 변경 시 4, 5, 6장을 우선 갱신

## 1. 개요와 주요기능
- 개요: runtime 모듈은 OMX 실행 생명주기 기반 계층으로, 결과 타입 정규화, 반복 실행 루프, 상태 파일 동기화, Rust 런타임 브리지, 프로세스 트리 제어를 담당한다.
- 주요기능:
  - 실행 결과 계약: run_outcome과 lifecycle_outcome 정규화 및 상호 변환
  - 루프 엔진: 터미널 결과까지 반복 실행(runUntilTerminal)
  - 상태 영속화: run-state.json 원자적 쓰기 및 추론 기반 동기화
  - Rust 브리지: omx-runtime 바이너리와 명령/스냅샷 교환
  - 프로세스 제어: 타임아웃/출력 제한/프로세스 수 제한을 포함한 트리 관리

## 2. 책임과 경계
- 책임:
  - 실행 결과 타입을 단일 계약으로 유지해 모드별 구현 차이를 흡수
  - 반복 실행 종료 조건을 명확히 제어하고 무한 루프를 방지
  - 상태 파일 I/O 일관성과 비정상 중단 안전성을 보장
  - 외부 프로세스와 브리지 통신 실패를 격리해 상위 루프를 보호
- 비책임:
  - 사용자 인터페이스, IPC 채널 정의, 도메인 정책 승인 절차는 담당하지 않는다.
- 경계:
  - runtime은 실행 인프라 계층이며, 상위 모드(ralph/team 등)가 정책을 결정한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - run-outcome: normalize/classify/infer/apply contract 함수군
  - run-loop: runUntilTerminal, shouldContinueRun
  - run-state: readRunState, syncRunStateFromModeState
  - bridge: execCommand, readSnapshot, getDefaultBridge
  - process-tree: runProcessTreeWithTimeout
- 내부 인터페이스:
  - mcp/state-paths 경로 해석
  - safe-json, team/state-root, platform-command 유틸
  - child_process 및 파일시스템 API

## 4. 데이터 구조와 계약
- 결과 타입 계약:
  - RunOutcome: progress, continue, finish, blocked_on_user, failed, cancelled
  - TerminalLifecycleOutcome: finished, blocked, failed, userinterlude, askuserQuestion
- RunState 계약:
  - `{ version:1, mode, active, outcome, lifecycle_outcome?, updated_at, current_phase?, completed_at?, ... }`
- 루프 결과 계약:
  - terminal outcome, iteration, final state, history를 포함
- 브리지 계약:
  - RuntimeCommand 집합과 RuntimeSnapshot 스키마를 version 검증 후 사용
  - RuntimeBridgeError는 명령 단위 실패로 캡슐화
- 파일 쓰기 계약:
  - 임시 파일 -> rename 원자적 교체로 partial write 노출 차단

## 5. 상태 전이와 불변식
- 실행 결과 상태 전이:
  - progress/continue -> finish | blocked_on_user | failed | cancelled
- 루프 상태 전이:
  - iteration n -> classify outcome -> terminal 판정 -> 종료 또는 n+1
- run-state 상태 전이:
  - mode-state 입력 -> outcome 추론 -> contract 적용 -> atomic write
- 불변식:
  - 터미널 outcome과 active=true 조합은 허용하지 않는다.
  - maxIterations 초과 시 예외로 강제 종료한다.
  - completed_at은 터미널 결과에서만 설정한다.
  - bridge 스키마 검증 실패 시 명령 실행을 중단한다.

## 6. 핵심 시퀀스
- runUntilTerminal 시퀀스:
  1. step(iteration) 실행
  2. outcome 정규화(classify)
  3. terminal이면 결과 반환
  4. 아니면 iteration 증가 후 반복
- run-state 동기화 시퀀스:
  1. mode-state 입력 수신
  2. inferRunOutcome/inferLifecycle 적용
  3. applyRunOutcomeContract 검증
  4. run-state.json 원자적 쓰기
- runtime bridge 시퀀스:
  1. 바이너리 경로 해석 및 schema check
  2. execCommand로 Rust 명령 실행
  3. JSON 응답 파싱/검증
  4. 오류 시 RuntimeBridgeError로 캡슐화
- process tree 시퀀스:
  1. 프로세스 실행
  2. timeout/output/process-limit 모니터링
  3. 초과 시 terminate -> grace -> kill
  4. 결과 객체(status/signal/flags) 반환

## 7. 오류 처리 및 복구
- 결과 타입 불일치:
  - normalize 실패 시 classify에서 progress 폴백
- 루프 과도 반복:
  - maxIterations 초과 예외로 안전 중단
- 파일 쓰기 경합/실패:
  - 원자적 쓰기 실패 시 임시 파일 정리 후 예외 전파
- 브리지 비정상 응답:
  - 비JSON/스키마 불일치 시 RuntimeBridgeError로 처리
- 프로세스 폭주:
  - maxOutputBytes/maxProcessCount 초과 시 강제 종료

## 8. 보안/성능 고려
- 보안:
  - 브리지 명령은 스키마 검증을 통과한 타입만 허용
  - 상태 파일 읽기 실패 시 민감 오류 상세를 직접 노출하지 않음
- 성능:
  - run-loop는 최소 상태 스냅샷만 유지
  - run-state 원자적 쓰기로 관찰 일관성 확보
  - process-tree 제한 옵션으로 자원 고갈 방지

## 9. 테스트 케이스 맵
- 단위:
  - run-outcome alias 정규화/추론 우선순위
  - run-loop terminal 도달/최대 반복 초과
  - run-state contract 적용과 completed_at 규칙
  - bridge schema 검증/오류 캡슐화
  - process-tree timeout/output/process-limit 제어
- 통합:
  - 모드 상태 입력 -> run-state 파일 반영 end-to-end
  - 브리지 명령 왕복 + snapshot 읽기 경로 검증
- 회귀:
  - 터미널/active 모순 상태 재발 방지
  - truncate-then-write 경합 상황에서 null-safe 읽기 유지

## 10. 오픈 이슈
- run_outcome과 lifecycle_outcome 호환성 정책을 문서 기준으로 고정할지 검토 필요
- bridge 명령 세트 변화에 대한 자동 계약 테스트 강화 필요
- Linux 이외 플랫폼의 프로세스 수 제한 전략 보강 필요
