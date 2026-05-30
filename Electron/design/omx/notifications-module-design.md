# OMX Notifications 모듈 개별 설계서

## 0. 문서 정보
- 모듈: notifications
- 기준 분석 문서: Electron/analysis/notifications-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 세션 라이프사이클 알림, 플랫폼 발송, 답장 주입, 쿨다운 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: notification event, dispatch platform, tmux/reply registry, cooldown 정책 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: notifications 모듈은 OMX 세션 이벤트를 Discord/Telegram/Slack/Webhook으로 비동기 전달하고, 답장을 Codex CLI 세션으로 다시 주입하는 알림 서브시스템이다.
- 주요기능:
  - 설정 병합: 파일, 환경변수, hook 템플릿, temp 계약 조합
  - 메시지 포맷: 이벤트별 메시지와 tmux tail 정제
  - 다중 플랫폼 발송: webhook/bot API/HTTP 발송
  - reply listener: 메시지 ID와 tmux pane 매핑을 통한 역방향 주입

## 2. 책임과 경계
- 책임:
  - lifecycle/idle/dispatch 알림을 verbosity와 cooldown 정책에 따라 조절
  - 템플릿 엔진으로 안전한 메시지 포맷을 생성
  - 플랫폼별 발송 실패를 훅 블로킹 없이 흡수
  - 답장 수신을 tmux pane으로 전달하는 백그라운드 데몬 제공
- 비책임:
  - 세션 상태 자체를 수정하거나 코드 실행을 제어하지 않는다.
- 경계:
  - notifications는 전달 계층이며, 실제 세션/태스크 변경은 상위 런타임과 state/mcp가 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - getNotificationConfig(cwd?, opts?)
  - dispatchNotifications(config, payload)
  - formatNotification(event, payload)
  - renderTemplate(template, vars)
  - getCurrentTmuxSession()
  - captureTmuxPane(paneId?, lines?)
  - lookupByMessageId(platform, messageId)
  - notify(payload, config?)
- 내부 인터페이스:
  - lifecycle-dedupe, dispatch/idle cooldown, session-registry
  - tmux-detector, reply-listener, temp-contract
  - http-client, notifier legacy fallback
- 호출자:
  - hooks, runtime lifecycle, team dispatch, reply listener daemon

## 4. 데이터 구조와 계약
- 주요 타입:
  - NotificationEvent, NotificationPlatform, VerbosityLevel
  - FullNotificationConfig, EventNotificationConfig
  - FullNotificationPayload, NotificationResult, DispatchResult
  - HookNotificationConfig, HookEventConfig
  - SessionMapping, cooldown state records
- 계약 원칙:
  - 이벤트는 enabled와 verbosity 조건을 만족해야만 발송된다.
  - 템플릿은 undefined 변수를 빈 문자열로 치환한다.
  - 웹훅/봇 API 발송은 플랫폼별 허용 URL과 멘션 규칙을 따라야 한다.
  - reply registry는 messageId↔paneId 상관관계를 유지한다.

## 5. 상태 전이와 불변식
- 알림 상태 전이:
  - event 발생 -> dedupe -> cooldown 검사 -> format -> dispatch -> result 기록
- reply listener 상태 전이:
  - polling -> message received -> pane analysis -> inject -> ack
- 불변식:
  - 동일 fingerprint는 dedupe window 내 중복 전송되지 않아야 한다.
  - session-idle과 dispatch 알림은 별도 쿨다운 상태를 사용한다.
  - 실패는 기본적으로 훅을 막지 않아야 한다.

## 6. 핵심 시퀀스
- lifecycle 알림 시퀀스:
  1. event와 payload를 수신
  2. config와 hook 설정 병합
  3. dedupe/cooldown 조건 검사
  4. formatter/template-engine으로 메시지 생성
  5. dispatcher가 플랫폼별 전송
- reply 주입 시퀀스:
  1. reply-listener가 Discord/Telegram 답장을 폴링
  2. session-registry에서 messageId로 pane을 조회
  3. tmux-detector가 pane content를 분석
  4. sendToPane으로 답장을 주입

## 7. 오류 처리 및 복구
- 설정 누락:
  - 알림이 비활성 상태면 조용히 null/false 경로로 종료한다.
- 플랫폼 발송 실패:
  - Promise.allSettled 기반으로 실패를 흡수하고 다른 플랫폼 발송을 보존한다.
- tmux 분석 실패:
  - reply listener는 분석 신뢰도가 낮으면 주입을 보류한다.
- 레거시 설정:
  - temp-contract나 구버전 config는 마이그레이션 경로로 처리한다.

## 8. 보안/성능 고려
- 보안:
  - 멘션/URL 검증과 텍스트 정제로 SSRF와 알림 주입을 완화한다.
  - reply listener는 messageId 상관관계 없이는 pane 주입을 하지 않는다.
- 성능:
  - 쿨다운과 dedupe로 알림 폭발을 억제한다.
  - tmux tail은 필요한 블록만 추출해 전송한다.

## 9. 테스트 케이스 맵
- 단위:
  - config merge and hook templates
  - message formatting and tmux tail parsing
  - cooldown/dedupe fingerprints
- 통합:
  - multi-platform dispatch and reply registry correlation
  - reply listener pane injection
- 회귀:
  - webhook SSRF 방지
  - 실패한 플랫폼이 전체 훅을 막지 않음

## 10. 오픈 이슈
- 플랫폼별 payload 스키마를 공통 contract로 더 엄격히 고정할 필요가 있음
- reply listener의 폴링/웹훅 혼합 전략을 운영 정책으로 정리할 필요가 있음
- hookTemplates와 legacy config 간 우선순위를 명시적으로 문서화할 필요가 있음
