# OMX Auth 모듈 개별 설계서

## 0. 문서 정보
- 모듈: auth
- 기준 분석 문서: Electron/analysis/auth-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 인증 슬롯 설정, 로테이션, 쿼터 탐지, 핫스왑 재개 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: slot config, rotation plan, quota detection, hotswap loop 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: auth 모듈은 OMX가 여러 Codex 인증 슬롯을 관리하고, 쿼터 소진 시 다른 슬롯으로 핫스왑하여 세션을 재개하는 서브시스템이다.
- 주요기능:
  - 설정 파싱: TOML 설정 파일에서 rotation 모드와 우선순위 읽기
  - 경로 보안: 슬롯명 검증과 심링크 차단
  - 슬롯 저장소: auth.json 복사와 메타데이터 갱신
  - 로테이션/핫스왑: 쿼터 탐지 후 다음 슬롯과 세션 재개

## 2. 책임과 경계
- 책임:
  - 인증 슬롯의 현재 상태와 사용 이력을 durable하게 관리
  - 쿼터/레이트리밋 오류를 탐지해 슬롯 교체를 조율
  - 민감정보를 로그에서 마스킹
- 비책임:
  - Codex 본체 동작이나 쿼터 정책 자체를 바꾸지 않는다.
- 경계:
  - auth는 슬롯 운용 계층이며, 실제 Codex 실행은 hotswap 오케스트레이터가 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - readAuthConfig(cwd?, home?)
  - resolveOmxAuthDir(home?)
  - resolveSlotPath(slot, home?)
  - listSlots(home?)
  - addSlotFromAuthFile(slot, liveAuthPath, home?, now?)
  - useSlot(slot, liveAuthPath, home?, now?)
  - buildRotationPlan(slots, config, currentSlot?)
  - isQuotaError(signal, config?)
  - redactAuthSecrets(value)
  - findLatestRolloutSession(codexHome, fallbackHome?)
  - runAuthHotswap(...)
- 내부 인터페이스:
  - storage.ts atomicWriteFile and metadata management
  - rotation.ts next slot selection
  - quota-detector.ts error matching
  - sessions.ts rollout session search
- 호출자:
  - omx --hotswap, runtime hooks, MCP 인증 도구

## 4. 데이터 구조와 계약
- 주요 타입:
  - AuthConfig: rotation, priority, quotaPatterns, sources
  - AuthSlotRecord: slot, createdAt, updatedAt, lastUsedAt, lastQuotaAt, exhaustedAt
  - AuthMetadata: version, currentSlot, slots[]
  - RotationPlan: mode, order[]
  - HotswapLifecycle interface
- 계약 원칙:
  - 슬롯명은 엄격한 패턴을 통과해야 한다.
  - auth dir/file은 private permission을 유지해야 한다.
  - quota 탐지는 stdout/stderr/structuredError를 합산해 판정한다.
  - round-robin, priority, manual 모드는 명확히 구분된다.

## 5. 상태 전이와 불변식
- 슬롯 상태 전이:
  - live auth -> slot record -> useSlot -> currentSlot 갱신
  - quota error -> markSlotQuota -> exhausted
- 핫스왑 상태 전이:
  - slot select -> codex run -> quota error -> next slot -> resume
  - manual mode에서는 자동 교체 없이 종료
- 불변식:
  - auth metadata는 알파벳 정렬을 유지해야 한다.
  - exhausted slot은 nextSlotAfter에서 제외된다.
  - 심링크 또는 traversal 경로는 절대 허용되지 않는다.

## 6. 핵심 시퀀스
- 핫스왑 시퀀스:
  1. config와 슬롯 목록 읽기
  2. rotation plan 생성
  3. 첫 슬롯을 live auth로 적용
  4. codex 실행 중 쿼터 오류 감지
  5. 다음 슬롯으로 교체 후 resume args 재조립
- 저장 시퀀스:
  1. auth.json을 slot 파일로 복사
  2. metadata 갱신 및 currentSlot 업데이트
  3. quota 기록 또는 exhaustion 해제

## 7. 오류 처리 및 복구
- 슬롯/경로 오류:
  - 잘못된 slot 이름과 심링크는 차단된다.
- 쿼터 미탐지:
  - 비쿼터 오류는 슬롯 교체 없이 종료된다.
- 세션 재개 실패:
  - rollout session을 찾지 못하면 안전하게 종료한다.
- 쓰기 실패:
  - atomic rename 실패 시 임시 파일을 정리한다.

## 8. 보안/성능 고려
- 보안:
  - private dir/file mode와 symlink 차단이 필수다.
  - redactAuthSecrets로 토큰/베어러/키를 마스킹한다.
- 성능:
  - 캐시된 설정과 최소한의 파일 I/O로 오케스트레이션 비용을 낮춘다.
  - 슬롯 순회는 제한된 개수 내에서 수행된다.

## 9. 테스트 케이스 맵
- 단위:
  - slot name validation and symlink blocking
  - rotation plan and next slot selection
  - quota detection and secret redaction
- 통합:
  - useSlot/addSlotFromAuthFile metadata updates
  - hotswap resume flow
- 회귀:
  - manual rotation no auto-switch
  - all slots exhausted 종료 처리

## 10. 오픈 이슈
- auth 설정과 Codex home 우선순위를 사용자 문서에 더 명확히 노출할 필요가 있음
- quotaPatterns 커스텀 규칙의 감사/추적 기준이 필요함
- 슬롯 교체 중 resume arg 보존 플래그 정책을 외부 규격으로 고정할 필요가 있음
