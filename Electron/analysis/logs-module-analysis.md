# src/main/logs/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/logs/

## 1. 구성 파일

- `event-dispatcher.ts`
- `hook-tailer.ts`
- `session-logger.ts`

## 2. 역할

`logs`는 실행 가시성 계층이다.
LLM 요청/응답, 시스템 메시지, 도구 호출, 훅 이벤트를 수집해 문제 재현성과 운영 추적성을 보장한다.

## 3. 핵심 설계 포인트

- 세션 단위 로그 파일 분리
- 스트림 토큰 누적 후 완료 시점 flush
- hooks JSONL tail 기반 이벤트 브리지

## 4. 검증 포인트

- 대용량 로그 환경에서 파일 I/O 안정성
- 로그 파싱 실패 시 시스템 영향 최소화
- 민감정보 마스킹 정책 필요 여부
