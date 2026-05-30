# OMX Logs 모듈 개별 설계서

## 0. 문서 정보
- 모듈: logs
- 기준 분석 문서: Electron/analysis/logs-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 구현, 리뷰, 테스트 시 공통 판단 기준 제공
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 구조 또는 계약 변경 시 4, 5, 10장을 우선 갱신

## 1. 개요와 주요기능
- 개요: logs 모듈은 에이전트 실행 가시성 계층으로, 세션 로그 파일 기록, hooks JSONL tail, 이벤트 스키마 검증 및 우선순위 브로드캐스트를 통해 문제 재현성과 운영 추적성을 제공한다.
- 주요기능:
  - 세션 단위 로그 파일 생성 및 라인 append 기록
  - LLM 요청/응답 토큰 버퍼링 후 완료 시점 flush
  - 도구 호출 중 md 자산 호출(agents/prompts/skills) 분류 기록
  - hooks-*.jsonl 최신 파일 추적 및 로테이션 핫스위핑
  - hooks 이벤트 JSON 파싱 + Zod 스키마 검증 + 채널 라우팅
  - 우선 이벤트(needs-input/pre-tool-use/post-tool-use) 분리 전송

## 2. 책임과 경계
- 책임:
  - session-logger가 대화/도구/시스템/오류 로그를 세션 파일에 기록한다.
  - hook-tailer가 logs 디렉터리의 hook 파일 신규 라인을 비차단으로 수신한다.
  - event-dispatcher가 이벤트 계약 검증 후 일반/우선 채널로 분배한다.
- 비책임:
  - UI 표출, IPC 창 브로드캐스트 구현, 비즈니스 정책 의사결정은 담당하지 않는다.
- 경계:
  - logs 모듈은 관측성 계층이며, 상태 변경의 소스 오브 트루스가 아니다.
  - 파싱 실패나 로깅 실패는 가능한 한 조용히 처리해 본 실행 흐름을 방해하지 않는다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스 (session-logger):
  - init(logDir)
  - getLogPath()
  - logLlmRequest(text, model?)
  - logLlmResponseToken(token)
  - flushLlmResponse()
  - logToolCall(toolName, args)
  - logSystemMessage(message)
  - logError(message)
- 외부 인터페이스 (hook-tailer):
  - start(logsDir)
  - onLine(cb)
  - offLine(cb)
  - stop()
- 외부 인터페이스 (event-dispatcher):
  - dispatch(rawLine, broadcast)
  - 상수: HOOK_IPC_CHANNEL, HOOK_IPC_PRIORITY_CHANNEL, PRIORITY_EVENTS
- 내부 인터페이스:
  - hook-tailer의 라인 콜백 출력은 event-dispatcher의 입력으로 연결된다.
  - session-logger의 md 분류는 args 문자열/JSON에서 md 경로 추출 규칙을 사용한다.

## 4. 데이터 구조와 계약
- 세션 로그 레코드 계약:
  - 공통 포맷: `[YYYY-MM-DD HH:mm:ss] [TAG] message`
  - 태그: REQUEST, RESPONSE, MD_CALL, TOOL, SYSTEM, ERROR
- 응답 버퍼 계약:
  - token 수신 중에는 파일 쓰기 대신 responseBuffer에 누적
  - 완료 이벤트에서 한 번에 RESPONSE로 flush 후 버퍼 초기화
- hook 이벤트 계약:
  - schema_version은 문자열 "1" 이어야 한다.
  - 필수 필드: event, timestamp, source(native|derived), context
  - 선택 필드: session_id, thread_id, turn_id, mode
- 채널 라우팅 계약:
  - priority 이벤트는 HOOK_IPC_PRIORITY_CHANNEL
  - 그 외 이벤트는 HOOK_IPC_CHANNEL

## 5. 상태 전이와 불변식
- session logger 상태 전이:
  - uninitialized -> initialized(logPath 설정) -> active append -> closed(프로세스 종료)
- response buffer 상태 전이:
  - empty -> buffering(token 누적) -> flushed(RESPONSE 기록) -> empty
- hook tailer 상태 전이:
  - stopped -> started(watcher 시작) -> attached(최신 파일 스트림 연결) -> rotated(새 파일 재연결) -> stopped
- 불변식:
  - init 전 append 요청은 무시되어 앱 동작을 방해하지 않는다.
  - flush 이후 responseBuffer는 항상 빈 문자열이어야 한다.
  - tailer는 최대 1개의 current stream만 유지한다.
  - 이벤트 스키마 검증 실패 라인은 IPC로 전송하지 않는다.

## 6. 핵심 시퀀스
- LLM 요청/응답 기록 시퀀스:
  1. 사용자 요청 시 logLlmRequest 호출(버퍼 초기화)
  2. 스트림 token마다 logLlmResponseToken 누적
  3. 완료 시 flushLlmResponse 호출
  4. RESPONSE와 문자 수를 단일 로그 항목으로 기록
- hooks 이벤트 브리지 시퀀스:
  1. hook-tailer.start(logsDir)로 최신 hooks 파일 연결
  2. data chunk 수신 시 라인 버퍼 어셈블
  3. 완전 라인을 dispatch(rawLine)로 전달
  4. JSON 파싱 + 스키마 검증 성공 시 채널 선택
  5. broadcast(channel, payload) 호출
- 로테이션 시퀀스:
  1. fs.watch가 hooks 파일 생성/변경 이벤트 감지
  2. 최신 파일 재탐색
  3. 새 파일이면 기존 stream destroy
  4. lineBuffer 초기화 후 새 stream attach

## 7. 오류 처리 및 복구
- 로그 파일 쓰기 실패:
  - appendFileSync 예외는 삼키고 실행 플로우를 유지한다.
- hook 디렉터리 감시 실패:
  - fs.watch 실패 시 경고 로그만 남기고 크래시를 방지한다.
- stream 오류:
  - read stream error는 콘솔 에러로 기록하되 tailer 전체 중단은 피한다.
- JSON 파싱/스키마 오류:
  - dispatch에서 무시(silent ignore 또는 debug 로그)하여 잘못된 라인 전파를 차단한다.
- 콜백 오류:
  - 개별 line callback 예외는 캡처해 다른 콜백 처리에 영향이 없도록 한다.

## 8. 보안/성능 고려
- 보안:
  - 로그에 민감정보가 포함되지 않도록 상위 호출자에서 입력 마스킹 정책이 필요하다.
  - md path 기록 시 경로 노출 범위를 운영 정책에 맞춰 제한할 필요가 있다.
  - hooks 이벤트는 스키마 검증으로 비정상 입력을 차단한다.
- 성능:
  - tailer는 폴링 없이 fs.watch 이벤트 기반으로 동작한다.
  - read stream highWaterMark 4096으로 메모리 사용을 완만하게 유지한다.
  - response 버퍼 일괄 flush로 token 단위 디스크 쓰기 비용을 줄인다.
  - 우선 이벤트 분리 채널로 UI 반응성 확보에 유리하다.

## 9. 테스트 케이스 맵
- 단위:
  - md 경로 추출 및 category 분류 규칙 검증
  - RESPONSE flush 후 버퍼 초기화 검증
  - HookEventSchema 검증 성공/실패 분기 검증
  - PRIORITY_EVENTS 채널 라우팅 검증
- 통합:
  - hook-tailer 라인 수신 -> dispatcher -> broadcast end-to-end
  - 파일 로테이션 시 스트림 핫스위핑 동작
  - logger init 전/후 로깅 동작 차이
- 회귀:
  - 대량 token 스트림에서 로그 누락/중복 방지
  - 잘못된 JSONL 라인 유입 시 IPC 오염 방지
  - callback 예외가 전체 tail 파이프라인을 중단시키지 않음 검증

## 10. 오픈 이슈
- 로그 민감정보 마스킹 규칙(키, 토큰, 절대경로) 표준화 필요
- 로그 파일 보관 주기와 최대 용량 회전 정책(압축/삭제) 필요
- 우선 채널 이벤트 폭주 시 백프레셔 또는 샘플링 전략 검토 필요
