# OMX Scripts 모듈 개별 설계서

## 0. 문서 정보
- 모듈: scripts
- 기준 분석 문서: Electron/analysis/scripts-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 훅 진입점, 빌드/검증, 코드 생성, notify 보조 스크립트의 실행 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: codex hook entry, build/verify scripts, notify-hook submodule, eval 스크립트 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: scripts 모듈은 Codex 훅 진입점, 릴리스/빌드 보조, 검증, 코드 생성, 실험 실행 스크립트를 모아 OMX의 운영 자동화를 담당한다.
- 주요기능:
  - 훅 진입점: codex-native-hook, notify-hook, dispatcher, watcher
  - 실행 표면 탐지: native vs cli, attached-tmux vs outside-tmux 판별
  - 빌드/릴리스: Rust 바이너리 및 네이티브 아티팩트 빌드
  - 코드 생성/동기화: 카탈로그/프롬프트/플러그인/가이던스 생성 및 sync

## 2. 책임과 경계
- 책임:
  - 훅 이벤트 파이프라인을 순수/비순수 단계로 분리해 운영
  - 빌드·검증·릴리스 스크립트의 반복 실행을 표준화
  - notify-hook 하위 모듈의 책임을 세분화
- 비책임:
  - 도메인 상태 수정이나 렌더링/UI 정책은 담당하지 않는다.
- 경계:
  - scripts는 실행 경계 계층이며, 실제 도메인 상태와 렌더링은 다른 모듈이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - codex-native-hook.ts, notify-hook.ts, notify-dispatcher.ts
  - codex-execution-surface.ts, tmux-hook-engine.ts
  - build-api.ts, build-explore-harness.ts, build-sparkshell.ts
  - check-version-sync.ts, check-runtime-syntax.ts, run-test-files.ts
  - generate-catalog-docs.ts, generate-release-body.ts, sync-plugin-mirror.ts
  - postinstall.ts, postinstall-bootstrap.js
- 내부 인터페이스:
  - notify-hook/ 하위 모듈, eval/ 스크립트, fixture/test runner helpers
- 호출자:
  - CLI, git hooks, release pipelines, local validation commands

## 4. 데이터 구조와 계약
- 주요 타입:
  - CodexExecutionSurface, TmuxHookConfig, Notification payloads
  - Build/verify result objects
  - PostinstallStatus, notification state records
  - notify-hook state, team dispatch, orchestration intent tags
- 계약 원칙:
  - 훅 출력은 입력이 없어도 안전하게 종료할 수 있어야 한다.
  - 빌드/검증 스크립트는 실패 원인을 명시적으로 반환해야 한다.
  - notify-hook은 블로킹보다 복원력 우선이어야 한다.

## 5. 상태 전이와 불변식
- 훅 상태 전이:
  - input received -> surface detect -> route -> build/dispatch -> complete
- notify 상태 전이:
  - turn complete -> notify dispatch -> tmux injection -> log
- 불변식:
  - native outside-tmux 환경에서 tmux 의존 작업은 건너뛰어야 한다.
  - 동일 이벤트는 쿨다운/중복제거 규칙을 따른다.
  - postinstall은 로컬 설치에서 noop이어야 한다.

## 6. 핵심 시퀀스
- Codex native hook 시퀀스:
  1. SessionStart/PreToolUse/PostToolUse/Stop 수신
  2. 키워드 탐지와 run state 확인
  3. notify-hook 및 HUD/wiki 정합성 조정
  4. 팀 워커/리더 경고와 자동 nudge 처리
- 빌드/릴리스 시퀀스:
  1. 바이너리 빌드 또는 패키지 검증
  2. 릴리스 매니페스트/바디 생성
  3. 아티팩트와 버전 동기화 검증
- notify-hook 시퀀스:
  1. 턴 페이로드 정규화
  2. 상태/운영 컨텍스트 수집
  3. 팀 디스패치, tmux 주입, 리더 넛지 수행

## 7. 오류 처리 및 복구
- 훅 실패:
  - 각 훅은 실패를 삼켜 상위 실행을 막지 않도록 설계한다.
- tmux 주입 실패:
  - 가드 실패 시 폴백 또는 스킵 경로로 복구한다.
- 빌드/검증 실패:
  - 원인과 후속 조치를 명시한다.
- postinstall 오류:
  - 로컬 환경에서는 noop으로 안전 종료한다.

## 8. 보안/성능 고려
- 보안:
  - shell 인자 인젝션과 path traversal을 방지한다.
  - prompt/guidance 생성 시 민감정보 누출을 제한한다.
- 성능:
  - 스크립트는 경량 진입점이어야 하며, 불필요한 재실행을 줄인다.
  - notify/dispatch는 직렬화와 코얼레스싱으로 폭주를 억제한다.

## 9. 테스트 케이스 맵
- 단위:
  - execution surface 판별
  - tmux hook config 정규화
  - notify dispatcher와 payload parser
- 통합:
  - codex hook 이벤트별 분기
  - build/verify 스크립트 성공/실패 흐름
  - generate/sync 스크립트 출력 일치
- 회귀:
  - postinstall noop 유지
  - eval 스크립트 경로별 인자 유지

## 10. 오픈 이슈
- notify-hook/ 하위 모듈과 scripts 상위 진입점의 문서 경계를 더 명확히 할 필요가 있음
- 릴리스/검증 스크립트의 공통 result schema를 고정할 필요가 있음
- 훅 출력 메시지 표준 포맷을 외부 운영 문서와 맞출 필요가 있음
