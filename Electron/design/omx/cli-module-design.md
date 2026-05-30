# OMX CLI 모듈 개별 설계서

## 0. 문서 정보
- 모듈: cli
- 기준 분석 문서: Electron/analysis/cli-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: OMX 커맨드 라우팅 허브의 실행 계약, 서브커맨드 경계, 런치 정책 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 커맨드 표면 또는 런치 정책 변경 시 1, 3, 4, 6장을 우선 갱신

## 1. 개요와 주요기능
- 개요: cli 모듈은 omx 명령의 단일 진입점으로, 실행 모드/설치/탐색/팀 운영/디버깅 커맨드를 라우팅하고 런타임 정책(launch policy, reasoning, sidecar)을 일관되게 적용한다.
- 주요기능:
  - 명령 라우팅: index.ts main()에서 전체 커맨드를 분기 처리
  - 런치 정책 적용: auto/direct/tmux 정책과 플래그 오버라이드 처리
  - 사이드카 연동: explore, sparkshell, api, mcp-serve 네이티브 바이너리 브리지
  - 설치/운영 명령 제공: setup, doctor, update, state, hooks, team 등 운영 커맨드 집합 제공

## 2. 책임과 경계
- 책임:
  - 사용자 입력 argv를 안정적으로 해석하고 대상 명령에 위임
  - 글로벌 플래그와 명령별 플래그 우선순위를 일관성 있게 적용
  - 네이티브 바이너리 경로 해석 및 폴백 정책 관리
- 비책임:
  - UI 렌더링, ipc 이벤트 브로드캐스트, 도메인 상태 정책 결정은 담당하지 않는다.
- 경계:
  - cli는 오케스트레이션 계층이며, 실제 동작은 하위 모듈(team/runtime/mcp/state 등)에 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - `omx <command> [subcommand] [args...]`
  - 주요 커맨드: launch/exec/team/ralph/ultragoal, setup/update/doctor, explore/sparkshell/api/mcp-serve, state/hooks/cleanup/auth/session
- 내부 인터페이스:
  - `omx.ts`: dist/cli/index.js 부트스트랩
  - `index.ts`: main 라우팅 허브
  - `constants.ts`: 글로벌 플래그 상수
  - 서브커맨드 파일(setup.ts, explore.ts, team.ts, state.ts 등)
- 네이티브 인터페이스:
  - omx-runtime, omx-sparkshell, omx-api, omx-explore-harness

## 4. 데이터 구조와 계약
- 입력 계약:
  - argv는 command, subcommand, options로 분해되어 main()에 전달
  - launch policy는 환경변수와 CLI 플래그 우선순위 규칙을 따른다.
- 플래그 계약:
  - `--high`, `--xhigh`, `--spark`, `--madmax`, `--worktree` 등은 사전 정의된 상수로만 허용
- 출력 계약:
  - 일반 명령은 종료 코드 반환
  - `mcp-serve`는 long-running 모드로 process exit를 호출하지 않는다.
- 백엔드 선택 계약(explore):
  - local-fast-path -> sparkshell -> harness 순으로 조건부 선택

## 5. 상태 전이와 불변식
- 실행 상태 전이:
  - parse -> route -> execute -> success | failed
- 런치 정책 상태 전이:
  - auto -> direct | tmux (환경/플래그에 따라 결정)
- 불변식:
  - 알려지지 않은 핵심 명령은 help 또는 오류 경로로 명시 처리한다.
  - `mcp-serve` 실행 중에는 프로세스를 강제 종료하지 않는다.
  - 환경변수 정책보다 CLI 명시 플래그가 우선한다.

## 6. 핵심 시퀀스
- 기본 런치 시퀀스:
  1. 사용자 `omx` 실행
  2. omx.ts가 dist entry를 import
  3. index.ts main()이 argv 파싱
  4. launch policy 계산
  5. direct 또는 tmux 경로로 실행 위임
- explore 실행 시퀀스:
  1. query/환경조건 점검
  2. backend(local/sparkshell/harness) 선택
  3. 결과를 stdout 또는 구조화 출력으로 반환
- setup 실행 시퀀스:
  1. 범위(user/project), 모드(plugin/legacy) 파싱
  2. config/hooks/agent 카탈로그 동기화
  3. 설치 결과 요약 출력

## 7. 오류 처리 및 복구
- dist 엔트리 누락:
  - build 선행 안내 메시지 출력 후 종료
- 커맨드 파싱 실패:
  - help 경로 또는 명시 오류 코드로 반환
- 네이티브 바이너리 미탐지:
  - 환경변수 오버라이드/폴백 경로를 순차 시도
- 사이드카 실행 실패:
  - 원인 메시지와 재시도 힌트를 제공

## 8. 보안/성능 고려
- 보안:
  - 위험 플래그(`--dangerously-*`)는 명시적 opt-in으로만 활성화
  - 외부 명령 전달 시 인자 escaping 정책 유지
- 성능:
  - explore 로컬 fast-path로 단순 조회 지연 최소화
  - 긴 실행 명령은 sidecar 또는 tmux 모드로 분리해 메인 루프 블로킹 완화

## 9. 테스트 케이스 맵
- 단위:
  - command 라우팅 분기 및 플래그 우선순위
  - setup 모드/범위 파서
  - 런치 정책 계산 로직
- 통합:
  - explore/backend 선택 경로
  - team/ralph 런치 및 상태 명령 연계
- 회귀:
  - mcp-serve exit 계약 유지
  - deprecated command 경고/차단 동작

## 10. 오픈 이슈
- 커맨드 표면 증가에 따른 help/문서 자동 동기화 파이프라인 필요
- 네이티브 바이너리 탐색 우선순위를 플랫폼별 정책으로 세분화할지 검토 필요
- 위험 플래그 사용 감사 로그(감사 추적) 도입 검토 필요
