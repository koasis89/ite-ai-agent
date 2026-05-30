# OMX MCP 모듈 개별 설계서

## 0. 문서 정보
- 모듈: mcp
- 기준 분석 문서: Electron/analysis/mcp-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 퍼스트파티 MCP 서버군의 공통 생명주기, 상태 경로, 서버별 도구 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: bootstrap, state-paths, lifecycle telemetry, server 도구 목록 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: mcp 모듈은 OMX의 퍼스트파티 MCP 서버군(state, memory, code-intel, trace, wiki, hermes)을 stdio JSON-RPC 기반으로 실행·자동 시작·감시하는 공통 인프라 계층이다.
- 주요기능:
  - 생명주기 부트스트랩: autoStartStdioMcpServer와 와치독 관리
  - 상태 경로 보안: working directory와 state path의 traversal 방지
  - 생명주기 텔레메트리: 서버 시작/종료 이벤트 NDJSON 로깅
  - 서버별 MCP 도구 집합 제공: state/memory/code-intel/trace/wiki/hermes

## 2. 책임과 경계
- 책임:
  - MCP 서버 프로세스의 자동 시작, 중복 형제 감지, 부모 종료 감시
  - 상태 파일과 로그 파일의 canonical 경로 및 보안 정책 유지
  - 서버별 도구 스키마와 반환 계약 제공
- 비책임:
  - 서버별 비즈니스 로직 계산 자체는 hermes-bridge, wiki/index, state operations 등 하위 모듈이 담당한다.
- 경계:
  - mcp는 공통 인프라와 서버 진입점 관리 계층이며, 실제 지식 조작이나 상태 편집은 각 서버 구현이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - autoStartStdioMcpServer(name, server)
  - shouldAutoStartMcpServer(name)
  - getBaseStateDir(wd?)
  - getStateDir(wd?, sessionId?)
  - getStatePath(mode, wd?, sessionId?)
  - writeMcpLifecycleTelemetry(event, env?)
  - parseNotepadPruneDaysOld(value, defaultDays)
- MCP 서버 진입점:
  - state-server.ts, memory-server.ts, code-intel-server.ts, trace-server.ts, wiki-server.ts, hermes-server.ts
- 내부 인터페이스:
  - bootstrap.ts 프로세스 테이블/와치독 헬퍼
  - state-paths.ts 경로 해결/검증
  - lifecycle-telemetry.ts NDJSON append
- 호출자:
  - cli mcp-serve, 독립 서버 실행, 테스트 harness

## 4. 데이터 구조와 계약
- 주요 타입:
  - McpServerName: state, memory, code_intel, trace, wiki, hermes
  - ResolvedStateScope: 작업 디렉토리/세션/루트 범위 해석 결과
  - State path 파일명 계약: {mode}-state.json, prompt-routing-state.json 등
  - Opened server tool request/response contract (JSON-RPC)
- 계약 원칙:
  - 상태 경로는 workspace 내부 또는 허용된 루트만 사용해야 한다.
  - MCP 서버는 stdio transport를 기본으로 사용한다.
  - 생명주기 로그는 NDJSON append-only다.
  - notepad_prune는 음수/비정수 daysOld를 허용하지 않는다.

## 5. 상태 전이와 불변식
- 서버 생명주기 전이:
  - not-started -> auto-started -> running -> shutdown
  - 부모 종료 또는 중복 형제 감지 -> shutdown
- 상태 경로 전이:
  - wd/session 입력 -> scope 해석 -> canonical state path 결정
- 불변식:
  - 동일 엔트리포인트 중복 형제는 제한 수를 넘으면 자가 종료 후보가 된다.
  - state path/file name은 traversal 패턴을 포함하면 안 된다.
  - auto start 비활성화 환경변수는 전역/서버별로 우선 적용된다.

## 6. 핵심 시퀀스
- 서버 자동 시작 시퀀스:
  1. CLI가 MCP 서버 파일을 import
  2. autoStartStdioMcpServer가 활성화 여부를 검사
  3. 부모 와치독과 중복 형제 와치독을 시작
  4. stdio transport에 server를 연결
  5. lifecycle telemetry를 기록
- 상태 읽기 시퀀스:
  1. state-paths가 세션/루트 스코프를 해석
  2. state-server가 해당 mode state JSON을 읽음
  3. 필요한 경우 session-scoped 파일을 우선 사용
- hermes/wiki/memory 시퀀스:
  1. 서버가 입력을 검증
  2. 허용 경로와 도구 스키마를 확인
  3. 결과를 JSON-RPC response로 반환

## 7. 오류 처리 및 복구
- 자동 시작 비활성화:
  - 환경변수로 비활성화된 서버는 조용히 스킵하거나 안내 로그를 남긴다.
- 경로 위반:
  - NUL 바이트, .., 분리자, 허용 루트 외 경로를 거부한다.
- 로그 기록 실패:
  - lifecycle telemetry 실패는 서버 기능을 중단시키지 않는 비치명 오류로 처리한다.
- 중복 형제 감지:
  - 초기 지연과 하드캡 정책을 통해 superseded 서버를 정리한다.

## 8. 보안/성능 고려
- 보안:
  - state-paths는 path traversal 방지와 session id 패턴 검증을 수행한다.
  - hermes allow_mutation 도구는 명시적 가드가 없으면 실행되지 않아야 한다.
- 성능:
  - 로그 테일 읽기와 process table 분석은 필요한 범위로 제한한다.
  - server lifecycle telemetry는 4MB 로테이션으로 로그 비대화를 억제한다.

## 9. 테스트 케이스 맵
- 단위:
  - path traversal 차단
  - auto-start gate와 중복 형제 판정
  - notepad_prune 입력 검증
- 통합:
  - state/memory/hermes 서버의 도구 목록 계약
  - telemetry file rotation
- 회귀:
  - Windows/POSIX 프로세스 테이블 파서 유지
  - 세션 스코프 state 파일 우선순위 유지

## 10. 오픈 이슈
- 서버별 도구 스키마 버전 관리와 MCP client 호환 정책 고정 필요
- 와치독 임계값(초기 지연/형제 수) 운영 기본값을 문서화할 필요가 있음
- hermes의 변형 도구 가드 정책을 외부 운영 가이드와 더 강하게 연결할 필요가 있음
