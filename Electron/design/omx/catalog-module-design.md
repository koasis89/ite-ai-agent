# OMX Catalog 모듈 개별 설계서

## 0. 문서 정보
- 모듈: catalog
- 기준 분석 문서: Electron/analysis/catalog-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 스킬/에이전트 카탈로그의 SSOT, 검증, 설치 가능 집합, 미러 검증 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: manifest schema, installable rules, public contract, mirror validation 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: catalog 모듈은 OMX의 스킬/에이전트 메타데이터를 단일 매니페스트로 관리하고, 설치 가능 여부와 공개 배포 계약을 산출하는 카탈로그 SSOT 계층이다.
- 주요기능:
  - manifest 검증: 중복/alias/canonical/core skill 규칙 검증
  - 공개 계약 변환: public-catalog.json 생성
  - 설치 집합 결정: setup/install 대상 스킬 계산
  - 디렉터리 미러 검증: source와 deployment 간 동기화 검사

## 2. 책임과 경계
- 책임:
  - 카탈로그 데이터를 읽을 때 즉시 검증해 무효 manifest 유입을 막는다.
  - active/internal/installable 규칙을 일관되게 적용한다.
  - 공개/내부/alias 항목을 분리해 배포 계약을 최소화한다.
- 비책임:
  - 실제 스킬 실행이나 프롬프트 내용은 담당하지 않는다.
- 경계:
  - catalog는 메타데이터 관리 계층이며, agents/setup/prompt 디렉터리 동기화를 지원한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - readCatalogManifest(packageRoot?)
  - tryReadCatalogManifest(packageRoot?)
  - getCatalogCounts(packageRoot?)
  - toPublicCatalogContract(manifest)
  - getSetupInstallableSkillNames(manifest)
  - compareSkillMirror(expectedDir, actualDir, expectedSkillNames, options)
  - validateCatalogManifest(manifest)
- 내부 인터페이스:
  - schema.ts, reader.ts, installable.ts, skill-mirror.ts
  - manifest.json SSOT
- 호출자:
  - agents install policy, setup flow, CI mirror validation, build pipeline

## 4. 데이터 구조와 계약
- 주요 타입:
  - CatalogSkillCategory, CatalogAgentCategory, CatalogEntryStatus
  - CatalogSkillEntry, CatalogAgentEntry, CatalogManifest
  - PublicCatalogContract
  - DirectoryMirrorMismatch, SkillMirrorMismatch
- 계약 원칙:
  - manifest는 schemaVersion과 catalogVersion을 가져야 한다.
  - alias/merged 엔트리는 canonical을 반드시 가져야 한다.
  - core skills는 active 상태여야 한다.
  - internal 엔트리는 공개 계약에서 숨겨져야 한다.

## 5. 상태 전이와 불변식
- 카탈로그 상태 전이:
  - raw manifest -> validate -> cache -> public contract
- 설치 가능성 전이:
  - active/internal -> installable
  - alias/merged/deprecated -> non-installable 또는 canonical redirect
- 불변식:
  - readCatalogManifest는 검증 실패 manifest를 캐시하지 않는다.
  - getSetupInstallableSkillNames는 setup-only 스킬을 합집합으로 포함한다.
  - mirror 비교는 파일 목록과 내용 모두 일치해야 통과한다.

## 6. 핵심 시퀀스
- manifest 읽기 시퀀스:
  1. 후보 경로를 순서대로 탐색
  2. 파싱 직후 validateCatalogManifest 실행
  3. 캐시하고 통계/공개 계약을 생성
- 설치 집합 결정 시퀀스:
  1. active/internal skill을 선택
  2. setup-only installable 스킬을 추가
  3. canonical validation을 점검
- 미러 검증 시퀀스:
  1. source/actual 디렉터리 목록 비교
  2. 파일 내용 비교
  3. 불일치 정보 반환 또는 null

## 7. 오류 처리 및 복구
- manifest 오류:
  - 중복 이름, 누락된 canonical, core skill 비활성은 예외 처리된다.
- 캐시 실패:
  - 잘못된 manifest는 캐시에 들어가지 않는다.
- 미러 불일치:
  - 불일치 종류를 구조적으로 반환해 CI에서 해석 가능하게 한다.

## 8. 보안/성능 고려
- 보안:
  - 공개 계약은 internal/alias 정보를 분리해 외부 노출을 최소화한다.
  - 파일 읽기는 경로 후보를 제한된 세트로 유지한다.
- 성능:
  - 모듈 수준 캐시로 반복 I/O를 줄인다.
  - public contract는 필요한 항목만 포함해 크기를 줄인다.

## 9. 테스트 케이스 맵
- 단위:
  - manifest validation and counts
  - installable set calculation
  - public contract filtering
- 통합:
  - reader cache and CI mirror validation
- 회귀:
  - canonical missing alias/merged 차단
  - setup-only wiki 포함 유지

## 10. 오픈 이슈
- catalogVersion 및 배포 버전 정책을 별도 문서로 고정할 필요가 있음
- internal/alias 공개 범위를 사용자 문서에 맞춰 지속 점검할 필요가 있음
- skill-mirror의 내용 치환 규칙을 더 명시적으로 문서화할 필요가 있음
