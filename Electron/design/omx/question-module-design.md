# OMX Question 모듈 개별 설계서

## 0. 문서 정보
- 모듈: question
- 기준 분석 문서: Electron/analysis/question-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 질문 레코드 생명주기, 렌더러 전략, 응답 제출 잠금 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: QuestionRecord 스키마, renderer 전략, deep-interview obligation 브릿지 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: question 모듈은 OMX 실행 중 사람에게 질문을 제시하고 답을 수집하는 전체 파이프라인으로, 정책 검사부터 상태 파일 기록, UI 렌더링, 응답 제출, 이벤트 로그까지 담당한다.
- 주요기능:
  - 질문 레코드 생성: QuestionRecord JSON 생성 및 상태 전이 관리
  - 실행 정책 적용: worker/team/autopilot 문맥에서 질문 허용 여부 판단
  - 렌더러 전략 선택: tmux-pane, tmux-session, inline-tty, windows-console 중 적합 경로 선택
  - 응답 수집/로그: 제출 잠금, answered 이벤트 dedup, JSONL 로그 기록

## 2. 책임과 경계
- 책임:
  - 질문 입력을 정규화해 단일/다중 질문 구조로 저장
  - pending -> prompting -> answered | aborted | error 상태 전이를 일관되게 관리
  - 응답 제출 중복과 충돌을 submit lock으로 방지
  - deep-interview obligation 흐름과 omx question CLI 간 연결 제공
- 비책임:
  - 상위 워크플로의 질문 필요 여부 판단 자체, 팀 orchestration, 계획 문서 생성은 담당하지 않는다.
- 경계:
  - question은 대화형 인간 입력 계층이며, 정책 승인 결과를 받아 렌더링/저장/반환만 수행한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - createQuestionRecord(cwd, input, sessionId?, now?, options?)
  - readQuestionRecord(recordPath)
  - updateQuestionRecord(recordPath, updater)
  - markQuestionPrompting(recordPath, renderer)
  - markQuestionAnswered(recordPath, answer)
  - markQuestionAborted(recordPath, code, message)
  - submitQuestionAnswer(recordPath, entries)
  - waitForQuestionAnswer(recordPath, timeoutMs?)
  - appendQuestionEvent(cwd, type, record)
  - appendQuestionAnsweredEventOnce(cwd, record)
- 내부 인터페이스:
  - types.ts 정규화 함수
  - renderer.ts 전략 선택과 패인/콘솔 런칭
  - ui.ts TTY 위저드
  - client.ts omx question 서브프로세스 실행
  - deep-interview.ts obligation bridge
- 호출자:
  - deep-interview 훅, CLI question 명령, 정책 기반 사용자 확인 흐름

## 4. 데이터 구조와 계약
- 주요 타입:
  - QuestionItem / NormalizedQuestionItem
  - QuestionAnswer / QuestionAnswerEntry
  - QuestionRecord: kind, question_id, status, questions, answer, answers, renderer, error
  - QuestionRendererState: renderer, target, launched_at, return_target?, return_transport?, pid?
  - QuestionEventType: question-created, question-answered, question-error
- 계약 원칙:
  - 멀티 질문 위저드는 answers 배열을 표준으로 사용하고 answer는 하위 호환용으로 유지한다.
  - question_id는 상태 파일명과 이벤트 dedup 기준으로 재사용된다.
  - prompting 상태에서만 submitQuestionAnswer가 허용된다.
  - answer entry는 선택지 존재 여부와 중복 인덱스를 검증해야 한다.

## 5. 상태 전이와 불변식
- 질문 상태 전이:
  - pending -> prompting -> answered
  - pending | prompting -> aborted
  - pending | prompting -> error
- 렌더러 상태 전이:
  - strategy-detect -> launch -> attached -> finished | failed
- 불변식:
  - 질문 레코드는 kind = omx.question/v1을 유지한다.
  - answered/aborted/error는 terminal 상태이며 이후 prompting으로 되돌아가지 않는다.
  - 동일 recordPath에 대해 submit lock은 한 번에 하나의 제출만 허용한다.
  - question-answered 이벤트는 appendQuestionAnsweredEventOnce로 중복 기록을 방지한다.

## 6. 핵심 시퀀스
- 질문 생성 및 응답 시퀀스:
  1. 호출자가 raw input을 전달
  2. normalizeQuestionInput이 질문/옵션을 정규화
  3. createQuestionRecord가 pending 레코드를 저장
  4. policy와 renderer가 실행 경로를 결정하고 markQuestionPrompting 수행
  5. ui 또는 외부 입력이 submitQuestionAnswer 호출
  6. validateAnswerEntries 후 answered 상태와 question-answered 이벤트를 기록
  7. client.ts가 stdout JSON을 파싱해 호출자에 반환
- deep-interview obligation 시퀀스:
  1. obligation이 발생
  2. omx question 서브프로세스를 생성
  3. answer를 받아 obligation 해제 후 상위 deep-interview 라운드 진행

## 7. 오류 처리 및 복구
- 정책 차단:
  - worker/team/autopilot 제약에 걸리면 질문 생성 또는 렌더링 전 차단 사유를 반환
- 렌더러 실패:
  - tmux 패인 또는 windows-console 런칭 실패 시 대체 전략 또는 aborted/error 상태로 전환
- 제출 충돌:
  - stale lock 복구와 타임아웃을 통해 submit lock 교착을 완화
- 응답 타임아웃:
  - waitForQuestionAnswer가 시간 초과 시 markQuestionAborted 후 예외를 반환

## 8. 보안/성능 고려
- 보안:
  - 질문/답변 로그에는 필요한 최소 정보만 저장하고 민감 입력 자유 텍스트는 노출 범위를 제한해야 한다.
  - return_target과 renderer target은 신뢰된 런타임 경로만 허용한다.
- 성능:
  - 질문 레코드와 이벤트는 JSON/JSONL append 기반으로 가볍게 유지한다.
  - waitForQuestionAnswer는 100ms 폴링 방식이므로 장시간 대기 시 파일 I/O 부담 상한을 검토해야 한다.

## 9. 테스트 케이스 맵
- 단위:
  - normalizeQuestionInput과 type 정규화
  - validateAnswerEntries의 중복/없는 옵션 차단
  - question event payload 정규화
- 통합:
  - create -> prompting -> answered 전이
  - submit lock과 answered event dedup
  - renderer 전략 선택 및 deep-interview bridge
- 회귀:
  - answers/answer 하위 호환성 유지
  - timeout 시 aborted 상태 보장

## 10. 오픈 이슈
- 폴링 기반 wait 전략을 이벤트 기반 대기로 대체할지 검토 필요
- windows-console 경로의 종료 감시와 pid 정리 기준을 더 명확히 할 필요가 있음
- 자유 입력 answer의 보존 기간과 마스킹 정책 정의가 필요
