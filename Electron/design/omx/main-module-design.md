# OMX Main 모듈 개별 설계서

## 0. 문서 정보
- 모듈: main
- 기준 분석 문서: Electron/analysis/main-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: Main Process 백엔드 엔진의 계층 책임과 통합 흐름을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 하위 폴더 책임 변경 또는 이벤트 경로 변경 시 2, 3, 6장을 우선 갱신

## 1. 개요와 주요기능
- 개요: main 모듈은 Electron Main Process의 백엔드 엔진으로, IPC 라우팅, CLI 스트림 브리지, 상태 감시, 로그 수집, 외부 어댑터 연동을 통합 제어한다.
- 주요기능:
  - IPC 제어: preload로 노출된 요청을 실제 실행 로직으로 라우팅
  - 스트림 브리지: CLI 출력 이벤트를 token/tool/done 단위로 분해해 전파
  - 상태 동기화: 파일 기반 .omx/state 감시와 즉시 업데이트 경로를 병행
  - 운영 관측: logs/ops 계층을 통해 실행 가시성과 진단 데이터를 유지

## 2. 책임과 경계
- 책임:
  - renderer가 직접 접근하지 못하는 시스템 리소스(프로세스, 파일, 환경)를 안전하게 중개
  - 하위 모듈(cli/core/env/ipc/logs/mcp/ops/services/state)의 책임을 조합해 일관된 사용자 흐름 제공
  - 이벤트 채널 계약과 상태 정합성을 유지
- 비책임:
  - UI 렌더링, 사용자 인터랙션 세부 동작, 문서 작성 정책은 담당하지 않는다.
- 경계:
  - renderer와의 경계는 preload API로 제한하며, business policy는 services/state 쪽에 위임한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - preload를 통한 invoke/on 채널 집합
  - 시작/중단/상태조회/도구호출/인터류드/태스크 관련 IPC 엔드포인트
- 내부 인터페이스:
  - `cli/`: 프로세스 실행 및 스트림 파싱
  - `ipc/`: 채널 핸들러와 브로드캐스트
  - `state/`: 파일 watcher, lifecycle 파서
  - `logs/`: 세션/훅 이벤트 수집
  - `services/`: 키 저장/태스크 전이 정책
- 의존 경계:
  - Node/Electron API 접근은 main 내부로 제한

## 4. 데이터 구조와 계약
- 이벤트 계약:
  - stream token/tool/done/error 이벤트는 채널별 고정 payload를 사용
  - lifecycle/todo 상태 이벤트는 누락 필드 보정 규칙을 따른다.
- 상태 소스 계약:
  - 기본 기준선은 `.omx/state` 파일
  - 보조 경로는 스트림 도구 호출 기반 즉시 업데이트
- 경로 계약:
  - workspace `.omx/state` 우선, 필요 시 fallback 경로 적용

## 5. 상태 전이와 불변식
- 실행 상태 전이:
  - idle -> active -> waiting-interlude -> active -> completed | failed | cancelled
- 동기화 상태 전이:
  - snapshot-load -> watch-sync -> stream-immediate-sync
- 불변식:
  - preload로 노출되지 않은 내부 API는 renderer에서 호출할 수 없다.
  - done 이후 해당 stream 컨텍스트는 재사용하지 않는다.
  - 상태 브로드캐스트는 최신 이벤트 기준으로 병합 반영한다.

## 6. 핵심 시퀀스
- 사용자 요청 처리 시퀀스:
  1. renderer가 IPC 채널 invoke
  2. main/ipc가 요청 검증 후 cli/services/state에 위임
  3. 실행 결과를 이벤트 채널로 브로드캐스트
  4. renderer가 token/todo/lifecycle 갱신
- 상태 동기화 시퀀스:
  1. 초기 snapshot 로드
  2. 파일 watcher 이벤트 반영
  3. tool-call 기반 즉시 갱신 이벤트 반영

## 7. 오류 처리 및 복구
- 경로 불일치:
  - workspace/home state 경로 차이를 fallback으로 완화
- 파서 호환성 저하:
  - 미지원 이벤트는 raw 또는 안전 무시 경로로 격리
- 채널 충돌:
  - 핸들러 등록 시 중복 방지 규칙 적용
- 비정상 종료:
  - done(exitCode)와 error 이벤트를 분리 전달해 UI 복구 가능 상태 유지

## 8. 보안/성능 고려
- 보안:
  - contextIsolation + preload 제약을 전제로 최소 권한 노출 유지
  - 민감정보는 로그/이벤트 페이로드에서 마스킹
- 성능:
  - 스트림 이벤트 최소 payload 전송
  - watcher + 즉시 동기화 병행 시 중복 이벤트 병합
  - 장시간 세션 메모리 누수 방지를 위한 구독 해제 보장

## 9. 테스트 케이스 맵
- 단위:
  - 채널 등록/중복 방지, 파서 분기, 상태 병합 로직
- 통합:
  - start/token/tool/done 흐름의 renderer 반영
  - workspace state 경로 fallback 동작
- 회귀:
  - 이벤트 타입 변경 시 파서 호환성 저하 탐지
  - 채널 이름 충돌/누락 검출

## 10. 오픈 이슈
- main 하위 모듈 간 canonical 이벤트 스키마를 단일 소스로 생성할지 검토 필요
- watcher와 스트림 즉시 반영의 충돌 해결 우선순위 정책 문서화 필요
- IPC 채널 증설 시 네임스페이스 규칙 자동 검증 도구 도입 검토 필요
