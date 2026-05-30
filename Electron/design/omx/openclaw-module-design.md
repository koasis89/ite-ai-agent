# OMX OpenClaw 모듈 개별 설계서

## 0. 문서 정보
- 모듈: openclaw
- 기준 분석 문서: Electron/analysis/openclaw-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: OpenClaw 게이트웨이 설정, 이벤트 매핑, 발송 보안 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: gateway config, event mapping, dispatcher security policy 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: openclaw 모듈은 OMX 훅 이벤트를 외부 HTTP 게이트웨이 또는 로컬 CLI 명령으로 비동기 전송하는 웨이커(waker) 서브시스템이다.
- 주요기능:
  - 설정 로딩: env와 .omx-config.json에서 openclaw 설정 읽기
  - 이벤트 매핑: session-start/end/idle, ask-user-question, stop 훅 전달
  - 발송 분기: HTTP 게이트웨이 또는 command 게이트웨이
  - 보안 검증: SSRF 방지, 셸 이스케이프, 타임아웃 제어

## 2. 책임과 경계
- 책임:
  - 활성화 게이트(OMX_OPENCLAW) 및 설정 캐시 관리
  - webhook/command 게이트웨이의 이벤트-인스트럭션 매핑
  - whitelist 기반 컨텍스트 축소와 안전한 발송
- 비책임:
  - 훅 이벤트 생성이나 세션 상태 변경은 담당하지 않는다.
- 경계:
  - openclaw는 외부 통지/연동 계층이며, 훅 발화 자체는 hooks 또는 상위 런타임이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - getOpenClawConfig()
  - inspectOpenClawConfig()
  - resolveGateway(config, event)
  - interpolateInstruction(template, variables)
  - validateGatewayUrl(url)
  - wakeGateway(name, config, payload)
  - wakeCommandGateway(name, config, variables)
  - wakeOpenClaw(event, context)
- 내부 인터페이스:
  - config alias normalization
  - dispatcher shell escaping and timeout resolution
  - process-tree command execution
- 호출자:
  - hooks 이벤트 브리지, CLI/세션 종료 훅, 외부 알림 자동화

## 4. 데이터 구조와 계약
- 주요 타입:
  - OpenClawConfig: enabled, gateways, hooks
  - OpenClawGatewayConfig: http or command union
  - OpenClawHookMapping: gateway, instruction, enabled
  - OpenClawContext: sessionId, projectPath, prompt, contextSummary, question, tmuxTail, replyChannel, replyTarget, replyThread
  - OpenClawPayload: event, instruction, text, timestamp, context and alias fields
- 계약 원칙:
  - HTTPS는 기본 허용이며 HTTP는 localhost만 허용한다.
  - command 게이트웨이는 별도 opt-in 환경변수를 요구한다.
  - context는 whitelist 필드만 포함한다.
  - undefined variable은 빈 문자열로 치환한다.

## 5. 상태 전이와 불변식
- 설정 상태 전이:
  - disabled -> missing-config -> invalid-config -> not-configured -> configured
- 발송 상태 전이:
  - resolved gateway -> wake -> success | failure
- 불변식:
  - 이벤트별 hook mapping은 enabled일 때만 유효하다.
  - command 게이트웨이는 명시적 timeout 범위를 따라야 한다.
  - payload에 unknown field가 누출되면 안 된다.

## 6. 핵심 시퀀스
- 설정 로딩 시퀀스:
  1. OMX_OPENCLAW 확인
  2. 별도 설정 파일 또는 .omx-config.json 읽기
  3. explicit openclaw 설정이 있으면 우선 사용
  4. alias 설정은 정규화하여 폴백으로 사용
- 발송 시퀀스:
  1. event에 대한 gateway를 resolve
  2. context whitelist와 template interpolation 수행
  3. HTTP면 validateGatewayUrl 후 requestJson 발송
  4. command면 shellEscape와 process-tree timeout 실행

## 7. 오류 처리 및 복구
- 설정 없음:
  - wakeOpenClaw는 null 반환 또는 비활성 상태를 보고한다.
- SSRF/URL 위반:
  - localhost HTTP 또는 HTTPS가 아니면 차단한다.
- command opt-in 누락:
  - OMX_OPENCLAW_COMMAND 미설정 시 command gateway를 실패 처리한다.
- 게이트웨이 미해결:
  - mapping/gateway 부재 시 null 또는 실패 결과를 반환한다.

## 8. 보안/성능 고려
- 보안:
  - URL 검증으로 SSRF를 방지한다.
  - 셸 명령은 인자별 이스케이프와 shell meta 감지로 보호한다.
  - whitelist context만 payload에 포함한다.
- 성능:
  - 설정 캐시로 반복 로딩 비용을 줄인다.
  - 비동기 발송은 세션 본체와 분리해 블로킹을 최소화한다.

## 9. 테스트 케이스 맵
- 단위:
  - config loading and alias normalization
  - URL validation and shell escaping
  - template interpolation
- 통합:
  - event-to-gateway resolution
  - HTTP/command wake success/failure paths
- 회귀:
  - localhost-only HTTP rule
  - command opt-in gate 유지

## 10. 오픈 이슈
- openclaw 이벤트/게이트웨이 스키마 버전 정책을 별도 문서로 고정할 필요가 있음
- command gateway의 허용 명령 범위와 감사 기록 기준이 필요함
- alias 기반 설정과 explicit openclaw 설정의 우선순위를 사용자 문서와 맞출 필요가 있음
