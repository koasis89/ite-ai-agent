# OMX Adapt 모듈 개별 설계서

## 0. 문서 정보
- 모듈: adapt
- 기준 분석 문서: Electron/analysis/adapt-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 외부 런타임(OpenClaw, Hermes) 어댑터의 경로, capability, probe/status/envelope 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: target registry, path contract, capability report, init/report flow 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: adapt 모듈은 OMX가 OpenClaw와 Hermes 같은 외부 런타임과 상호작용할 때 사용하는 어댑터 계층으로, 각 타겟의 초기화·probe·status·envelope·doctor 보고서를 생성한다.
- 주요기능:
  - 타겟 registry: openclaw/hermes 대상과 capability 선언
  - 경로 해석: .omx/adapters/<target>/ 하위 경로 집합 계산
  - 보고서 생성: probe/status/envelope/doctor/init 조립
  - target observed evidence: OpenClaw/Hermes 증거를 보고서에 반영

## 2. 책임과 경계
- 책임:
  - OMX가 직접 소유하는 어댑터 아티팩트 경로를 canonical하게 유지
  - capability ownership을 omx-owned/shared-contract/target-observed로 분리
  - target별 foundation report와 planning linkage를 생성
- 비책임:
  - 타겟 런타임 내부 상태를 직접 수정하지 않는다.
- 경계:
  - adapt는 얇은 어댑터 표면이며, 실제 타겟 runtime 동작은 외부 시스템이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - resolveAdaptPaths(cwd, target)
  - listAdaptTargets()
  - getAdaptTargetDescriptor(target)
  - buildAdaptPlanningLink(cwd)
  - buildAdaptEnvelope(cwd, target)
  - buildAdaptEnvelopeForTarget(cwd, target)
  - buildAdaptProbeReportForTarget(cwd, target)
  - buildAdaptStatusReportForTarget(cwd, target)
  - buildAdaptDoctorReportForTarget(cwd, target)
  - initAdaptFoundation(cwd, target, write?, now?)
- 내부 인터페이스:
  - openclaw.ts 관찰 함수
  - hermes.ts 증거 수집 및 override 함수
  - registry.ts capability descriptors
- 호출자:
  - omx adapt <target> <subcommand>, bootstrap scripts, integration tooling

## 4. 데이터 구조와 계약
- 주요 타입:
  - ADAPT_TARGETS / ADAPT_SUBCOMMANDS / ADAPT_SCHEMA_VERSION
  - AdaptCapabilityOwnership: omx-owned, shared-contract, target-observed
  - AdaptCapabilityStatus: ready, stub, unsupported
  - AdaptPathSet: adapterRoot, configPath, envelopePath, reportsDir, probeReportPath, statusReportPath
  - AdaptProbeReport, AdaptStatusReport, AdaptEnvelope, AdaptDoctorReport, AdaptInitResult
  - OpenClaw/Hermes specific metadata and evidence types
- 계약 원칙:
  - `.omx/adapters/<target>/` 외 직접 쓰기는 금지한다.
  - capability는 소유권과 상태를 함께 보고해야 한다.
  - planning artifact linkage는 모든 어댑터 보고서에 공통으로 포함된다.
  - hermes capability의 stub -> ready/unsupported 전환은 증거 기반이다.

## 5. 상태 전이와 불변식
- 어댑터 상태 전이:
  - target discovered -> paths resolved -> report built -> init written (optional)
- capability 상태 전이:
  - stub -> ready / unsupported
  - ready -> degraded (OpenClaw 관찰 결과에 따라)
- 불변식:
  - target이 지원 목록 외이면 descriptor는 null이어야 한다.
  - init write는 explicit write=true일 때만 수행한다.
  - report는 읽기 전용 요약이어야 하며 target runtime에 직접 쓰면 안 된다.

## 6. 핵심 시퀀스
- envelope/probe/status 생성 시퀀스:
  1. target descriptor와 paths를 해석
  2. planning link를 생성
  3. openclaw 또는 hermes 전용 관찰/증거 수집 수행
  4. 보고서 본문과 capability list를 조립
- init 시퀀스:
  1. preview 모드면 경로만 반환
  2. write 모드면 config와 envelope JSON을 생성
  3. reports 디렉터리와 foundation 아티팩트를 저장

## 7. 오류 처리 및 복구
- target 미지원:
  - descriptor null 반환 또는 명시 오류 처리
- 경로 해석 실패:
  - adapterRoot/보고서 경로 생성 실패 시 해당 타겟 초기화 중단
- 증거 수집 실패:
  - hermes/openclaw observer 실패는 degraded 또는 stub 상태로 표현
- write 충돌:
  - 이미 존재하는 파일은 정책에 따라 덮어쓰기 여부를 제어한다.

## 8. 보안/성능 고려
- 보안:
  - 타겟 런타임 내부나 .omx/state/ 직접 쓰기를 금지한다.
  - hermes/openclaw 증거는 화이트리스트된 경로와 컨텍스트만 사용한다.
- 성능:
  - 공통 probe/status/envelope 조립을 최대한 재사용한다.
  - async evidence collection은 target별로만 분기한다.

## 9. 테스트 케이스 맵
- 단위:
  - path set 계산
  - capability ownership/status 전이
  - planning link 생성
- 통합:
  - openclaw/hermes target별 probe/status/envelope 생성
  - init foundation write/preview 경로
- 회귀:
  - .omx/adapters 외 쓰기 차단
  - stub capability override 유지

## 10. 오픈 이슈
- 보고서 스키마와 사용자 운영 문서의 버전 동기화가 필요하다.
- hermes evidence override와 openclaw observation의 공통 정책 계층이 필요하다.
- target capability 추가 시 registry와 report 템플릿의 자동 검증이 필요하다.
