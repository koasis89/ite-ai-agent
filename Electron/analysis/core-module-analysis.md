# src/main/core/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/core/

## 1. 구성 파일

- `execute-command.ts`

## 2. 역할

`core`는 외부 명령 실행의 최소 공통 기반 레이어다.
현재는 `execute-command.ts`가 사실상 표준 실행 엔진으로 사용된다.

## 3. 핵심 로직

- `spawn` 기반 비동기 실행(동기 실행 금지 원칙 준수)
- stdout 라인 단위 처리 + JSON 파싱 가드
- `onEnvelope`/`onRawLine` 분기 처리로 파이프라인 오염 완화

## 4. 검증 포인트

- Windows shell quoting
- stderr 라우팅 시 UI 노이즈 제어
- 종료 코드/비정상 종료 시 done 이벤트 정합성
