# OMX Sidecar 모듈 개별 설계서

## 0. 문서 정보
- 모듈: sidecar
- 기준 분석 문서: Electron/analysis/sidecar-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 팀 상태 수집, 터미널 렌더링, tmux sidecar 실행 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: snapshot 스키마, render 패널, tmux/watch 플래그 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: sidecar 모듈은 OMX team 상태 디렉터리를 읽어 실시간 모니터링 스냅샷을 수집하고, ANSI 터미널 패널 또는 tmux watch 패인으로 시각화하는 운영 사이드카다.
- 주요기능:
  - snapshot 수집: manifest, phase, tasks, workers, events를 모아 SidecarSnapshot 구성
  - 터미널 렌더링: topology, agents, tasks, highlights, panes, events 패널 출력
  - watch 루프: 주기적 재렌더와 SIGINT 정리, 플리커 억제
  - tmux 패인 실행: 현재 세션의 우측 패인에 sidecar watch 모드 런치

## 2. 책임과 경계
- 책임:
  - team 상태 파일을 읽기 전용으로 수집해 정규화된 snapshot 생성
  - snapshot을 사람 친화적 텍스트 또는 JSON으로 표현
  - tmux와 watch 옵션을 포함한 CLI 진입점 제공
- 비책임:
  - team 상태를 수정하거나 태스크를 제어하지 않는다.
  - UI 비즈니스 정책이나 워커 분배 판단은 담당하지 않는다.
- 경계:
  - sidecar는 관측 계층이며, team 모듈이 생성한 상태를 소비해 운영 가시성을 제공한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - collectSidecarSnapshot(teamName, options)
  - renderSidecar(snapshot, options)
  - buildSidecarTmuxSplitArgs(options)
  - launchSidecarTmuxPane(options, execTmuxSync?)
  - parseSidecarArgs(args)
  - runSidecarWatch(...)
  - sidecarCommand()
- 내부 인터페이스:
  - readTasks, readEvents, readPhase, readMonitorSnapshot, buildWorkers, buildHighlights, buildTopology
  - clean, truncate, panel, withColorSetting 렌더 유틸
  - hud/tmux, utils/platform-command, utils/paths
- 호출자:
  - omx sidecar CLI, team 운영 세션, tmux 기반 모니터링 자동 런처

## 4. 데이터 구조와 계약
- 주요 타입:
  - SidecarSnapshot: schema_version, team_name, team_task, phase, topology, workers, tasks, events, panes, highlights, source_warnings
  - SidecarWorkerSnapshot: worker info, status, heartbeat, alive, current_task, turns_without_progress
  - SidecarTask: id, subject, status, owner, blocked_by, depends_on
  - SidecarHighlight: severity, kind, target, message
  - SidecarFlags: json, watch, tmux, width, intervalMs
- 계약 원칙:
  - schema_version은 omx.sidecar/v1을 유지한다.
  - 설정 파일은 manifest.v2.json 우선, 없으면 config.json 폴백을 사용한다.
  - readEvents는 NDJSON tail 64KB만 읽어 최신 이벤트만 해석한다.
  - width는 최소 30, 기본 48을 사용한다.

## 5. 상태 전이와 불변식
- 관측 상태 전이:
  - collect -> normalize -> render -> output
- watch 상태 전이:
  - initial render -> watch loop -> stopped(SIGINT)
- 불변식:
  - teamName은 TEAM_NAME_SAFE_PATTERN을 통과해야 한다.
  - 일부 상태 파일이 누락되어도 snapshot 수집은 가능한 범위 내에서 계속된다.
  - JSON 모드에서는 ANSI 색상을 사용하지 않는다.
  - watch 루프는 inFlight/queued 플래그로 중첩 렌더를 방지한다.

## 6. 핵심 시퀀스
- 단발 sidecar 시퀀스:
  1. parseSidecarArgs가 flags를 해석
  2. collectSidecarSnapshot이 team 상태 파일을 읽음
  3. JSON 모드면 정규화된 snapshot을 직렬화
  4. 기본 모드면 renderSidecar로 ANSI 패널을 출력
- watch 시퀀스:
  1. 첫 렌더에서 전체 화면을 지움
  2. collect -> render -> stdout 갱신을 intervalMs 주기로 반복
  3. SIGINT 수신 시 커서를 복원하고 핸들러를 해제
- tmux 실행 시퀀스:
  1. buildSidecarTmuxSplitArgs가 split-window 명령을 구성
  2. launchSidecarTmuxPane가 새 패인을 생성
  3. sidecar {teamName} --watch 명령을 패인에서 실행

## 7. 오류 처리 및 복구
- 설정 파일 없음:
  - collectSidecarSnapshot은 null을 반환하고 호출자가 빈 상태 또는 안내 메시지를 출력
- JSON 파싱 실패:
  - 개별 파일 읽기 실패는 null/[]로 흡수해 전체 수집을 지속
- 불완전 NDJSON:
  - tail 첫 줄이 깨진 경우 자동 제거 후 파싱
- tmux 실행 실패:
  - pane_id를 null로 반환하고 상위에서 일반 watch 또는 실패 안내로 복구

## 8. 보안/성능 고려
- 보안:
  - 팀 이름과 워커 이름은 안전한 패턴으로 검증한다.
  - clean()으로 ANSI/OSC/제어 문자를 제거해 렌더 주입을 방지한다.
- 성능:
  - tasks/events/phase/monitor-snapshot은 병렬 읽기를 사용한다.
  - readTailText와 최소 재드로우 전략으로 대형 로그와 화면 플리커를 억제한다.

## 9. 테스트 케이스 맵
- 단위:
  - snapshot 수집 정규화
  - highlight/topology 계산
  - width/interval 인수 파싱
  - tmux split args 생성
- 통합:
  - collect -> render 전체 출력 흐름
  - watch 루프와 SIGINT 종료
  - manifest.v2/config 레거시 폴백
- 회귀:
  - incomplete NDJSON tail 처리
  - resource leak 없는 watch 종료
  - ANSI clean/truncate 처리 유지

## 10. 오픈 이슈
- sidecar snapshot의 schema version 확장 정책을 별도 문서로 고정할 필요가 있음
- source_warnings 노출 범위와 운영 UI 연동 정책 정리가 필요
- 대규모 팀에서 eventLimit과 width 기본값 튜닝 기준이 필요
