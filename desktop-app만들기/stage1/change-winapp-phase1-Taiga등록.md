# change-winapp Taiga 등록 기준서

이 문서는 change-winapp-phase1-tickets.md를 기준으로 Taiga 등록 시 사용하는 단일 기준 문서다.

## 1) 고정 컨텍스트
- 에픽 EP-01 : 윈도우 데스크탑 앱 구현
- 스프린트 SP-01 : 윈도우 데스크탑 앱(1단계, 최소기능)
- 스프린트 SP-02 : 윈도우 데스크탑 앱(2단계, 1차 기능 추가)

- 유저스토리 매핑:
  - US-01 ~ US-10 = WIN-001 ~ WIN-010

## 2) 유저스토리 매핑표

| User Story | 연동 WIN | 제목(권장) | Epic | Sprint |
|---|---|---|---|---|
| US-01 | WIN-001 | WIN-001 실행 코어 계약(Command Contract) 정의 | EP-01 | SP-01 |
| US-02 | WIN-002 | WIN-002 CLI 라우터를 코어 실행기로 분리 | EP-01 | SP-01 |
| US-03 | WIN-003 | WIN-003 CLI Adapter 명시화(출력/종료 경계) | EP-01 | SP-01 |
| US-04 | WIN-004 | WIN-004 이벤트 스트림 기본 인터페이스 도입 | EP-01 | SP-01 |
| US-05 | WIN-005 | WIN-005 Desktop 셸 기본 구조 스캐폴딩 | EP-01 | SP-01 |
| US-06 | WIN-006 | WIN-006 IPC Command Gateway(read-only 최소 기능) | EP-01 | SP-01 |
| US-07 | WIN-007 | WIN-007 최소 UI 진단 패널 구현 | EP-01 | SP-01 |
| US-08 | WIN-008 | WIN-008 CI/로컬 빌드 파이프라인 확장 | EP-01 | SP-01 |
| US-09 | WIN-009 | WIN-009 1단계 회귀 테스트 세트 정리 | EP-01 | SP-01 |
| US-10 | WIN-010 | WIN-010 1단계 릴리스 게이트 문서화 | EP-01 | SP-01 |

## 3) Task 등록 기준

각 User Story에 아래 Task 3개를 등록한다.

- [WIN-XXX] 구현 작업
- [WIN-XXX] 검증 작업
- [WIN-XXX] 문서/정합성 반영

US-01 예시:
- [WIN-001] 구현 작업
- [WIN-001] 검증 작업
- [WIN-001] 문서/정합성 반영

## 4) 등록 순서

1. Epic 생성/확인: EP-01 (윈도우 데스크탑 앱 구현)
2. Sprint 생성/확인:
   - SP-01 (윈도우 데스크탑 앱 1단계)
   - SP-02 (윈도우 데스크탑 앱 2단계)
3. User Story 생성/확인:
   - US-01~US-10을 WIN-001~WIN-010에 1:1 매핑
   - 현재는 US-01~US-10 전부 SP-01에 배정
4. Task 생성:
   - 각 User Story에 구현/검증/문서/정합성 3개 Task 등록

## 5) 운영 체크리스트

- [x] EP-01이 단일 Epic으로 등록되었는지 확인
- [x] SP-01, SP-02가 생성되었는지 확인
- [x] US-01~US-10이 WIN-001~WIN-010으로 매핑되었는지 확인
- [x] 각 US에 Task 3개가 생성되었는지 확인
- [x] 제목 규칙([WIN-XXX])이 일관되게 적용되었는지 확인
