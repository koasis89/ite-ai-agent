# OMX Hooks 모듈 개별 설계서

## 0. 문서 정보
- 모듈: hooks
- 기준 분석 문서: Electron/analysis/hooks-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 프롬프트 키워드 라우팅, triage 분류, AGENTS.md 오버레이, 확장 훅 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: keyword registry, triage heuristic, overlay marker, extensibility contracts 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: hooks 모듈은 사용자 프롬프트를 받아 keyword detection과 triage를 거쳐 적절한 skill/agent로 라우팅하고, 세션 맥락을 AGENTS.md 오버레이와 외부 플러그인 훅에 주입하는 라우팅 엔진이다.
- 주요기능:
  - 키워드 탐지: 명시적 skill 호출과 자연어 trigger 매칭
  - triage 분류: PASS/LIGHT/HEAVY 레인 판정
  - 세션 오버레이: AGENTS.md에 코드베이스 맵과 상태 요약 주입
  - 확장성 훅: 외부 플러그인 이벤트 디스패치

## 2. 책임과 경계
- 책임:
  - 프롬프트 입력에서 skill activation을 결정하고 상태 파일을 기록
  - triage 결과와 session state를 캐시/영속화
  - AGENTS.md 오버레이를 멱등하게 apply/strip
  - 외부 hook plugin에 이벤트를 안전하게 전달
- 비책임:
  - 실제 skill 실행 구현과 하위 도메인 업무 처리는 담당하지 않는다.
- 경계:
  - hooks는 라우팅과 컨텍스트 주입 계층이며, 실행 본체는 skill/agent 또는 후속 파이프라인이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - detectKeywords(prompt)
  - detectPrimaryKeyword(prompt)
  - parseExplicitSkillInvocations(prompt)
  - recordSkillActivation(input)
  - triagePrompt(prompt)
  - readTriageConfig()
  - readTriageState(opts)
  - writeTriageState(decision, opts)
  - applyAgentsMdOverlay(...)
  - dispatchHookEvent(...)
- 내부 인터페이스:
  - keyword-registry.ts, task-size-detector.ts, triage-config.ts, triage-state.ts
  - codebase-map.ts, explore-routing.ts, prompt-guidance-contract.ts
  - extensibility loader/dispatcher/runtime/sdk
- 호출자:
  - codex-native-hook.ts, session lifecycle, prompt submit path

## 4. 데이터 구조와 계약
- 주요 타입:
  - KeywordTriggerDefinition, KeywordMatch
  - SkillActiveState, DeepInterviewInputLock
  - TriageDecision, TriageConfig, TriageStateFile
  - Agents overlay marker block contract
  - HookEvent/Plugin runtime contracts
- 계약 원칙:
  - keyword registry는 SSOT이며 priority 순서로 비교된다.
  - deep-interview 자동 승인 문맥에서는 입력 잠금이 적용될 수 있다.
  - triage는 fail-closed를 기본으로 한다.
  - AGENTS.md 오버레이는 marker block으로만 추가/제거된다.

## 5. 상태 전이와 불변식
- 라우팅 상태 전이:
  - prompt received -> keyword detect -> triage -> overlay -> plugin dispatch
- triage 전이:
  - PASS는 저장하지 않음
  - LIGHT/HEAVY만 triage-state에 기록
- 오버레이 전이:
  - base AGENTS.md -> runtime overlay applied -> session end strip
- 불변식:
  - 상태 파일은 session scoped와 root scoped 규칙을 따른다.
  - triage config 파싱 실패 시 비활성 처리되어야 한다.
  - overlay marker는 중첩되거나 중복되면 안 된다.

## 6. 핵심 시퀀스
- 프롬프트 라우팅 시퀀스:
  1. 사용자 입력 수신
  2. keyword-registry로 명시적 skill 및 trigger 탐지
  3. 탐지 실패 시 triage heuristic 실행
  4. 필요 시 AGENTS.md overlay 적용
  5. extension dispatcher로 외부 훅 이벤트 전달
- session overlay 시퀀스:
  1. codebase map과 session metadata 수집
  2. active mode/state와 explore guidance 조립
  3. marker block으로 AGENTS.md에 주입
  4. 세션 종료 시 동일 marker만 제거

## 7. 오류 처리 및 복구
- 설정 파싱 실패:
  - triage config는 fail-closed로 비활성화한다.
- 상태 파일 충돌:
  - lock 기반으로 멱등 갱신과 재시도를 수행한다.
- plugin 실패:
  - dispatcher 오류는 라우팅 본체를 중단시키지 않고 경고/격리한다.
- 잘못된 prompt guidance:
  - contract 검증 실패 시 overlay 주입을 차단할 수 있다.

## 8. 보안/성능 고려
- 보안:
  - AGENTS.md에 주입되는 정보는 session/context whitelist를 따른다.
  - plugin 이벤트는 sandboxed runtime 계약을 따라야 한다.
- 성능:
  - keyword 탐지와 triage는 순수 함수/경량 I/O로 유지한다.
  - codebase map과 overlay는 필요 최소 범위로 생성한다.

## 9. 테스트 케이스 맵
- 단위:
  - keyword priority 및 explicit invocation 탐지
  - triage lane 분류와 fail-closed config
  - overlay marker apply/strip 멱등성
- 통합:
  - prompt submit -> routing -> state 기록
  - plugin dispatcher 이벤트 전달
- 회귀:
  - continuation prompt와 previous skill 재사용
  - deep-interview input lock 차단 동작

## 10. 오픈 이슈
- triage 규칙과 keyword registry의 중복/우선순위 정책을 별도 문서로 고정할 필요가 있음
- AGENTS.md 오버레이 컨텍스트 항목의 상한과 압축 정책이 필요함
- plugin 이벤트 스키마 버전 관리 기준을 명시할 필요가 있음
