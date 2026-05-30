# OMX Test 모듈 개별 설계서

## 0. 문서 정보
- 모듈: test
- 기준 분석 문서: Electron/analysis/test-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: Electron 핵심 흐름의 회귀 테스트 범위, 통합 시나리오, 안정성 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 테스트 범위, 통합 시나리오, flaky/boundary 케이스 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: test 모듈은 CLI, 파서, 상태 감시, 드리프트, 서비스, UI 흐름의 회귀를 검증해 Electron 주요 경로의 안정성을 보장하는 테스트 계층이다.
- 주요기능:
  - 모듈 단위 테스트: 각 서브시스템의 계약을 빠르게 검증
  - 통합 시나리오: IPC, 상태 전이, 인터류드, UI/renderer 연동 검증
  - 경계 조건 확인: 대용량 스트림, malformed payload, flaky case 점검

## 2. 책임과 경계
- 책임:
  - 핵심 흐름의 회귀를 조기에 탐지한다.
  - 모듈별 contract 변경 시 빠르게 실패하도록 설계한다.
  - 통합 시나리오를 통해 실제 사용 경로를 일부 검증한다.
- 비책임:
  - 제품 기능 구현이나 런타임 상태를 변경하지 않는다.
- 경계:
  - test는 검증 계층이며, 그 외 모듈의 기능을 실행하지는 않는다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - *.test.ts, *.integrated.test.ts 테스트 파일 집합
  - test runner 구성과 픽스처
- 내부 인터페이스:
  - Electron API mocks
  - stream/IPC/state helpers
- 호출자:
  - CI, 로컬 dev scripts, regression gates

## 4. 데이터 구조와 계약
- 주요 타입:
  - test case, fixture, mock payload, snapshot-like assertions
  - integration scenario steps
- 계약 원칙:
  - 테스트는 결정적이어야 한다.
  - 계약 변경 시 대응 테스트가 함께 갱신되어야 한다.
  - flaky 테스트는 별도 점검 대상이어야 한다.

## 5. 상태 전이와 불변식
- 테스트 상태 전이:
  - authored -> executed -> passed/failed -> stabilized
- 불변식:
  - 실제 IPC e2e 시뮬레이션 부족 영역은 명시적 갭으로 남긴다.
  - 대용량/경계 케이스는 실패를 숨기지 않아야 한다.
  - flaky 여부는 반복 실행 또는 별도 점검으로 확인해야 한다.

## 6. 핵심 시퀀스
- 회귀 시퀀스:
  1. 대상 모듈 계약 정의
  2. mock/fixture 준비
  3. 단위 또는 통합 테스트 실행
  4. 결과 분석 및 regression fix 적용
- 경계 시퀀스:
  1. malformed payload 주입
  2. 대용량 스트림/잘못된 IPC 상태 검증
  3. UI 렌더러의 fallback과 에러 처리 확인

## 7. 오류 처리 및 복구
- flaky 실패:
  - 반복/격리 테스트로 원인을 축소한다.
- 통합 시나리오 실패:
  - mock 또는 fixture 갱신이 필요한지 확인한다.
- 경계 케이스 실패:
  - 계약 누락을 설계 문서와 함께 보강한다.

## 8. 보안/성능 고려
- 보안:
  - 테스트 픽스처에 민감정보가 포함되지 않도록 한다.
  - 외부 네트워크 의존을 최소화한다.
- 성능:
  - 빠른 피드백을 위해 단위 테스트와 통합 테스트를 분리한다.
  - 대용량 케이스는 별도 분류한다.

## 9. 테스트 케이스 맵
- 범위:
  - CLI/파서/상태 감시/드리프트/서비스/UI 통합 테스트
  - *.test.ts, *.integrated.test.ts 패턴
- 우선 검증:
  - 스트림 파싱
  - IPC 연동
  - 상태 전이
  - 인터류드 동작
- 개선 후보:
  - 실제 IPC end-to-end 시뮬레이션
  - malformed payload 경계 확대
  - flaky 테스트 주기 점검

## 10. 오픈 이슈
- 실행 러너와 픽스처의 표준화를 문서화할 필요가 있음
- 통합 테스트와 단위 테스트의 책임 경계를 더 명확히 할 필요가 있음
- flaky 케이스 추적 정책을 별도 운영 가이드로 고정할 필요가 있음
