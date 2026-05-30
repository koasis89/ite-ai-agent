# src/test/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/test/

## 1. 테스트 범위

- CLI/파서/상태 감시/드리프트/서비스/UI 통합 테스트 포함
- 파일명 패턴: `*.test.ts`, `*.integrated.test.ts`

## 2. 역할

`test` 모듈은 메인 도메인과 Renderer 핵심 흐름의 회귀 안정성을 보장한다.
특히 스트림 파싱, IPC 연동, 상태 전이, 인터류드 동작을 중점 검증한다.

## 3. 핵심 설계 포인트

- 모듈 단위 테스트 + 일부 통합 시나리오 혼합
- Electron API mock 기반 UI 테스트 케이스 존재
- 상태/이벤트 계약 변경 시 빠른 회귀 탐지 가능

## 4. 개선 후보

- 실제 IPC end-to-end 시뮬레이션 강화
- 경계 조건(대용량 스트림, malformed payload) 케이스 확대
- flaky 테스트 여부 주기 점검
