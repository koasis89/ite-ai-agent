# OMX Utils 모듈 개별 설계서

## 0. 문서 정보
- 모듈: utils
- 기준 분석 문서: Electron/analysis/utils-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: OMX 전반에서 공통으로 쓰는 경로, AGENTS.md, 플랫폼 명령, 안전 JSON, 수면 유틸 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: paths, agents-md, platform-command, safe-json, sleep 계약 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: utils 모듈은 OMX 전 레이어가 공유하는 순수 유틸리티 계층으로, 경로 해석, AGENTS.md 조작, 플랫폼 명령 추상화, 안전한 JSON, 비동기 sleep을 제공한다.
- 주요기능:
  - 경로 SSOT: codex/omx 디렉터리 및 스킬/패키지 루트 계산
  - AGENTS.md 관리: generated marker와 managed block 삽입/교체
  - 플랫폼 명령: Windows/POSIX 실행 파일 탐색과 래핑
  - 안전 유틸: JSON 파싱 격리, AbortSignal sleep

## 2. 책임과 경계
- 책임:
  - 공통 경로와 디렉터리 해석을 하나의 허브에서 제공
  - AGENTS.md 관리 블록을 멱등하게 조작
  - 플랫폼별 명령 실행 차이를 추상화
- 비책임:
  - 도메인 상태, 렌더링, 네트워크, 워크플로 로직은 담당하지 않는다.
- 경계:
  - utils는 순수/공통 유틸 계층이며, 나머지 모듈은 이를 의존한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - codexHome(), omxRoot(), omxStateDir(), omxPlansDir(), omxLogsDir()
  - omxProjectMemoryPath(), resolveProjectMemoryPath(), omxWikiDir()
  - addGeneratedAgentsMarker(), upsertManagedAgentsBlock(), renderAgentsModelTableBlock()
  - resolveCommandPathForPlatform(), buildPlatformCommandSpec(), spawnPlatformCommandSync()
  - safeJsonParse(), safeReadJsonFile(), sleep(), sleepSync()
- 내부 인터페이스:
  - git-layout, package root, repo-deps
- 호출자:
  - runtime, cli, hooks, team, adapt, planning, state, sidecar, mcp

## 4. 데이터 구조와 계약
- 주요 타입:
  - GitLayout, PlatformCommandSpec, ProbedPlatformCommand, SpawnErrorKind
  - Auth/agents metadata helper inputs
  - JSON fallback value contracts
- 계약 원칙:
  - 경로 함수는 canonical/legacy/override 우선순위를 명확히 해야 한다.
  - AGENTS.md marker는 고정 문자열을 사용해야 한다.
  - platform-command는 인수 인젝션을 방지해야 한다.
  - safe-json은 예외를 전파하지 않는 것이 기본이다.

## 5. 상태 전이와 불변식
- 경로 해석 전이:
  - env override -> canonical path -> legacy fallback -> cwd fallback
- AGENTS.md 전이:
  - base -> managed block added -> managed block updated -> stripped
- 불변식:
  - sameFilePath는 realpath 정규화를 통해 동일 파일을 판별해야 한다.
  - sleep는 abort signal에 응답해야 한다.
  - platform command는 플랫폼별 래핑 규칙을 따라야 한다.

## 6. 핵심 시퀀스
- 경로 해석 시퀀스:
  1. codex/omx 루트를 탐색
  2. state/plans/logs/wiki/adapters 경로를 생성
  3. legacy fallback을 확인
- AGENTS.md 시퀀스:
  1. generated marker 존재 여부 확인
  2. managed block 삽입 또는 교체
  3. 모델 테이블/오버레이를 함께 렌더
- 플랫폼 명령 시퀀스:
  1. command path resolve
  2. OS별 래핑 결정
  3. spawnSync 실행

## 7. 오류 처리 및 복구
- 경로 누락:
  - fallback 경로를 순차 시도한다.
- JSON 파싱 실패:
  - fallback 값을 반환한다.
- 플랫폼 명령 미탐지:
  - missing/blocked/error로 분류한다.
- sleep abort:
  - signal abort에 즉시 반응한다.

## 8. 보안/성능 고려
- 보안:
  - 경로 traversal과 symlink 위험을 줄여야 한다.
  - AGENTS.md 삽입 블록은 마커 기반으로만 수정한다.
  - command 실행은 플랫폼별 래핑으로 인젝션 위험을 줄인다.
- 성능:
  - 경로 계산은 순수 함수 중심으로 유지한다.
  - safe-json과 sleep는 경량 공통 유틸로 재사용한다.

## 9. 테스트 케이스 맵
- 단위:
  - path resolution and fallback
  - agents markdown marker/update
  - platform command resolution and error classification
  - safe-json and sleep abort
- 통합:
  - runtime/team/hooks/adapt에서의 공통 경로 사용
- 회귀:
  - same file path 비교 정합성
  - Windows/POSIX command wrapping 유지

## 10. 오픈 이슈
- 경로 함수가 많아 SSOT 문서와 사용자 안내를 더 명확히 분리할 필요가 있음
- AGENTS.md 관리와 hooks overlay의 공통 마커 정책을 더 강하게 고정할 필요가 있음
- platform-command의 OS별 예외 메시지 표준화가 필요함
