# OMX HUD 모듈 개별 설계서

## 0. 문서 정보
- 모듈: hud
- 기준 분석 문서: Electron/analysis/hud-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 터미널 HUD 상태 집계, 렌더링, tmux 페인 재조정, 권한 틱 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: HUD state aggregation, render presets, tmux pane management, authority tick 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: hud 모듈은 .omx/state를 읽어 현재 활성 모드, 메트릭, 세션 정보를 수집하고 ANSI 스테이터스라인으로 렌더링하는 터미널 HUD 서브시스템이다.
- 주요기능:
  - 상태 집계: 여러 모드/세션 상태를 읽어 HudRenderContext 조립
  - ANSI 렌더링: preset별 상태바 출력
  - tmux HUD 운영: watch pane 생성/재조정/훅 등록
  - authority tick: notify-fallback-watcher 권한 틱 갱신

## 2. 책임과 경계
- 책임:
  - 읽기 전용 상태를 수집해 표시 가능한 컨텍스트로 변환
  - tmux 환경에서 HUD 패인을 유지·재조정
  - 시각적 상태와 메트릭을 빠르게 보여준다.
- 비책임:
  - 상태를 변경하거나 워커를 제어하지 않는다.
- 경계:
  - hud는 관측 계층이며, 실제 상태 변화는 runtime/team/notifications가 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - readAllState(cwd, config?)
  - renderHud(ctx, preset, options)
  - reconcileHudForPromptSubmit(cwd, deps)
  - createHudWatchPane(...)
  - killTmuxPane(...)
  - runHudAuthorityTick(options, deps?)
  - hudCommand(args)
- 내부 인터페이스:
  - types.ts, constants.ts, colors.ts, state.ts, render.ts, reconcile.ts, tmux.ts, authority.ts
- 호출자:
  - CLI hud command, prompt-submit hook, tmux watch automation

## 4. 데이터 구조와 계약
- 주요 타입:
  - HudRenderContext, HudMetrics, HudNotifyState, SessionStateForHud
  - mode-specific state projections for ralph, ultragoal, autopilot, ralplan, team, deep-interview, autoresearch, ultraqa, ultrawork
  - HudConfig, ResolvedHudConfig, HudPreset
- 계약 원칙:
  - preset은 minimal/focused/full만 허용한다.
  - inactive/terminal phase는 HUD에서 숨길 수 있다.
  - readAllState는 가능한 상태를 최대한 조립해야 한다.
  - tmux 페인은 소유권과 세션 ID를 기준으로 관리한다.

## 5. 상태 전이와 불변식
- HUD 상태 전이:
  - collect -> render -> output
  - watch loop -> authority tick -> resize/reconcile
- tmux 상태 전이:
  - missing pane -> create
  - stale/duplicate pane -> kill + recreate
  - valid pane -> resize/register hook
- 불변식:
  - 색상 렌더는 설정에 따라 on/off 가능해야 한다.
  - HUD는 비활성 모드 상태를 숨길 수 있어야 한다.
  - watch 루프는 중복 렌더를 방지해야 한다.

## 6. 핵심 시퀀스
- 렌더 시퀀스:
  1. readAllState로 context 수집
  2. preset에 맞는 요소 구성
  3. renderHud로 ANSI 문자열 생성
  4. stdout 또는 tmux pane으로 출력
- tmux 재조정 시퀀스:
  1. prompt-submit 훅 발생
  2. HUD pane 존재/소유권 검사
  3. resize 또는 recreate 수행
  4. hook registration 갱신

## 7. 오류 처리 및 복구
- 상태 누락:
  - 일부 state 파일이 없어도 가능한 범위로 렌더한다.
- tmux 오류:
  - pane이 없으면 새로 만들고, 실패하면 경고를 남긴다.
- authority tick 실패:
  - HUD 본체는 계속 동작하되 권한 갱신을 재시도한다.

## 8. 보안/성능 고려
- 보안:
  - 상태 파일은 읽기 전용으로 취급한다.
  - tmux 명령 인수는 argv 기반으로 구성한다.
- 성능:
  - 병렬 상태 읽기와 최소 렌더를 사용한다.
  - watch loop는 1초 주기와 중복 방지 플래그로 제어한다.

## 9. 테스트 케이스 맵
- 단위:
  - state aggregation and config normalization
  - render preset/element output
  - tmux pane detection/resizing
  - authority tick owner file
- 통합:
  - watch mode loop and SIGINT handling
  - prompt-submit HUD reconciliation
- 회귀:
  - terminal/inactive phase hiding
  - ANSI color toggle 유지

## 10. 오픈 이슈
- HUD 구성 요소와 components renderer의 역할 중복을 더 명확히 구분할 필요가 있음
- tmux hook 재조정 정책을 사용자 가이드로 고정할 필요가 있음
- 상태 파일/메트릭 표시 우선순위와 공간 제한을 더 세밀하게 조정할 필요가 있음
