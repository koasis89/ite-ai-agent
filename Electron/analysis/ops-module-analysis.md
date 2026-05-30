# src/main/ops/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/ops/

## 1. 구성 파일

- `drift-detector.ts`

## 2. 역할

`ops`는 운영 진단 및 드리프트 점검 계층이다.
실행 로그와 정책 기준의 차이를 탐지해 이상 징후를 조기에 보고한다.

## 3. 핵심 설계 포인트

- `.omx/logs`/manifest 기반의 읽기 전용 분석
- 결과를 요약 가능한 구조체로 반환하여 UI/IPC 연동 용이

## 4. 검증 포인트

- 로그 누락/파손 시 graceful degradation
- 경로/권한 이슈 대응
- 진단 기준 버전 관리
