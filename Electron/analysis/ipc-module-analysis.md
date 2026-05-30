# src/main/ipc/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/ipc/

## 1. 구성 파일

- `adapter-ipc.ts`
- `cli-ipc.ts`
- `env-ipc.ts`
- `event-broadcast-ipc.ts`
- `interlude-ipc.ts`
- `ops-ipc.ts`
- `state-ipc.ts`
- `stream-bridge-ipc.ts`
- `task-ipc.ts`

## 2. 역할

`ipc`는 Main Process 진입점 어댑터다.
Renderer 요청을 도메인 서비스 호출로 변환하고, 상태/스트림 이벤트를 브로드캐스트한다.

## 3. 핵심 설계 포인트

- 채널별 책임 분리(상태, 스트림, 인터류드, 태스크, 환경)
- 브로드캐스트 패턴으로 다중 창 동기화
- 입력 검증 및 예외 캡슐화로 Renderer 단 오류 전파 최소화

## 4. 검증 포인트

- 채널명 일관성(preload 선언과 동기화)
- 핸들러 중복 등록 방지
- 종료/중단 이벤트에서 lifecycle 상태 정합성
