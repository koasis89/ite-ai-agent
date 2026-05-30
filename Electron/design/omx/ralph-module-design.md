# OMX Ralph 모듈 개별 설계서

## 0. 문서 정보
- 모듈: ralph
- 기준 분석 문서: Electron/analysis/ralph-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: Ralph 실행 루프의 상태 계약, 완료 감사, 진행 원장 보존 규칙을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: phase 상태 기계, completion audit, progress ledger 스키마 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: ralph 모듈은 OMX Ralph 실행 루프의 핵심 기반으로, 상태 기계 검증, 완료 감사 증거 평가, 진행 원장 파일 I/O와 레거시 마이그레이션을 담당한다.
- 주요기능:
  - 상태 계약 검증: RalphPhase와 RalphState를 정규화하고 유효 전환 여부를 검증
  - 완료 감사: completion_audit 오브젝트 또는 JSON 파일 참조를 검사해 실제 완료 증거 여부를 판정
  - 진행 원장 관리: ralph-progress.json 생성, 갱신, 레거시 progress/prd 파일 마이그레이션
  - 시각 피드백 축적: visual feedback 기록과 rolling window 유지

## 2. 책임과 경계
- 책임:
  - active/current_phase/iteration/max_iterations 필드를 포함한 Ralph 상태의 단일 계약 유지
  - complete 선언 전에 감사 증거의 실질성과 파일 시스템 보안 경계를 검증
  - Ralph 진행 이력을 canonical 경로에 JSON으로 영속화
- 비책임:
  - 실제 작업 실행이나 팀 분배, 계획 합의 생성은 담당하지 않는다.
- 경계:
  - ralph는 단일 실행 루프의 상태/감사/원장 계층이며, 상위 CLI나 워크플로가 이를 소비해 실행을 조율한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - normalizeRalphPhase(rawPhase)
  - validateAndNormalizeRalphState(candidate, options?)
  - evaluateRalphCompletionAuditEvidence(state, cwd)
  - isRalphCompletePhase(value)
  - ensureCanonicalRalphArtifacts(cwd, sessionId?)
  - recordRalphVisualFeedback(cwd, feedback, sessionId?, baseStateDir?)
- 내부 인터페이스:
  - completion-audit의 JSON artifact loader
  - persistence의 ledger 초기화와 migration marker 기록
  - modes/state 계층과 연동되는 progress file 경로 계산
- 호출자:
  - omx ralph 실행 루프, completion gate, 시각 검증 루틴, 레거시 호환 부트스트랩

## 4. 데이터 구조와 계약
- 주요 타입:
  - RalphPhase: starting, executing, verifying, fixing, blocked_on_user, complete, failed, cancelled
  - RalphCompletionAuditResult: complete, reason, source
  - RalphProgressLedger: schema_version, source, entries, visual_feedback, created_at, updated_at
  - RalphVisualFeedback: score, verdict, category_match, differences, suggestions, threshold
  - RalphCanonicalArtifacts: canonicalPrdPath, canonicalProgressPath, migratedPrd, migratedProgress
- 계약 원칙:
  - 터미널 phase와 active=true는 공존할 수 없다.
  - iteration은 0 이상 정수, max_iterations는 1 이상 정수여야 한다.
  - completion audit passed는 boolean true만 유효하며 문자열 passed는 허용하지 않는다.
  - audit artifact 경로는 상대 경로의 JSON 파일만 허용한다.

## 5. 상태 전이와 불변식
- Ralph 상태 전이:
  - starting -> executing -> verifying -> complete
  - verifying -> fixing -> executing 재진입 가능
  - executing | verifying | fixing -> blocked_on_user | failed | cancelled 가능
- 원장 상태 전이:
  - 미존재 -> canonical progress 생성 -> entries/visual_feedback 누적
- 불변식:
  - terminal phase에서는 completed_at이 기록되어야 한다.
  - started_at/completed_at는 ISO8601 형식이어야 한다.
  - completion audit 평가 결과 complete=true가 아니면 complete phase를 신뢰하지 않는다.
  - visual_feedback는 최신 30개만 유지한다.

## 6. 핵심 시퀀스
- Ralph 상태 정규화 시퀀스:
  1. candidate state를 입력받음
  2. normalizeRalphPhase가 legacy alias를 canonical phase로 변환
  3. validateAndNormalizeRalphState가 기본값과 시간 필드를 보완
  4. 유효성 실패 시 즉시 에러를 반환
- 완료 감사 시퀀스:
  1. state의 inline audit 키를 우선 탐색
  2. 없으면 *_path 키에서 JSON artifact를 상대 경로로 로드
  3. checklist와 verification evidence 존재 여부를 점검
  4. source와 reason을 포함한 완료 판정 반환
- 원장 초기화/마이그레이션 시퀀스:
  1. .omx/plans와 .omx/state 경로를 보장
  2. legacy prd.json, progress.txt 존재 여부 확인
  3. 필요 시 canonical markdown/json으로 마이그레이션
  4. progress ledger를 초기화하고 경로 요약 반환

## 7. 오류 처리 및 복구
- phase 정규화 실패:
  - 알 수 없는 legacy phase는 즉시 validation error로 차단
- 터미널 phase + active 충돌:
  - 상태 불일치로 간주하고 자동 보정 대신 오류 반환
- audit artifact 보안 위반:
  - 절대 경로, workspace 외부, 비JSON, symlink 탈출은 모두 무시 또는 실패 처리
- 레거시 마이그레이션 실패:
  - 원본 파일은 수정하지 않고 marker와 canonical 생성 결과만 기록

## 8. 보안/성능 고려
- 보안:
  - completion audit 파일은 4단계 경로 경계를 통과해야만 읽는다.
  - 레거시 파일은 읽기 전용으로 취급해 손상 위험을 줄인다.
- 성능:
  - progress ledger는 stableJsonPretty 기반 단일 파일 갱신으로 관리한다.
  - visual feedback rolling window로 원장 비대화를 억제한다.

## 9. 테스트 케이스 맵
- 단위:
  - legacy phase alias 정규화
  - terminal phase와 active 충돌 검증
  - audit evidence 필수 필드 판정
- 통합:
  - canonical artifact 생성과 legacy migration
  - visual feedback rolling window 유지
- 회귀:
  - absolute path/symlink audit 탈출 차단
  - completion_audit 문자열 passed 오인 판정 방지

## 10. 오픈 이슈
- Ralph phase 전이 규칙을 상위 실행 문서와 더 강하게 동기화할 필요가 있음
- completion audit evidence의 공통 스키마를 goal-workflows와 통합할지 결정 필요
- progress ledger의 장기 보존 정책과 압축 기준이 필요
