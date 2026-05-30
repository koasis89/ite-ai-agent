요청하신 대로 `src/hooks/`, `src/adapt/` 등 다른 서브시스템의 내용은 철저히 배제하고, 제공된 분석 내용 및 관련 문서(`agents-module-analysis.md`, `prompt-guidance-contract-ko.md`, `guidance-schema-ko.md`, `runtime-model-metadata-cleanup-ko.md` 등)를 바탕으로 **`src/agents/` (에이전트 페르소나 및 오케스트레이션) 모듈에 대한 상세 설계 문서**만 집중하여 작성해 드립니다.

---

# Oh-My-Codex (OMX) `src/agents/` 서브시스템 상세 설계 문서

**Subsystem: Agent Persona & Orchestration Core**

## 1. 문서 개요 및 시스템 목적 (Overview & Purpose)

`src/agents/` 모듈은 Oh-My-Codex (OMX) 시스템 내에서 동작하는 **다양한 에이전트 페르소나(예: Planner, Executor, Verifier 등)의 정적 메타데이터를 정의하고, 이를 바탕으로 실제 Codex 런타임이 이해할 수 있는 설정 파일(TOML)로 조립 및 설치하는 핵심 역할**을 수행합니다.

본 모듈의 핵심 아키텍처 철학은 "데이터와 코드의 완전한 분리(Data-Code Separation)"입니다. 에이전트의 성향, 도구 권한, 추론 수준 등은 TypeScript 코드(`definitions.ts`)로 중앙 관리되며, 실제 에이전트가 어떻게 행동해야 하는지에 대한 자연어 지시문은 독립된 마크다운 파일(`prompts/*.md`)로 관리되어 유연한 확장을 보장합니다.

---

## 2. 서브시스템 모듈별 상세 설계 (Component Design)

### 2.1 폴더 구조 및 모듈 토폴로지

```text
src/agents/
├── definitions.ts     # 에이전트 정적 메타데이터 레지스트리 (SSOT)
├── native-config.ts   # 프롬프트 마크다운 결합 및 TOML 설정 빌더/설치기
├── policy.ts          # 카탈로그 매니페스트 기반 설치 정책 필터
└── __tests__/         # 단위 및 회귀 테스트

```

### 2.2 `definitions.ts` (에이전트 레지스트리)

* **역할**: OMX에서 사용하는 모든 역할(Role) 에이전트의 정적 속성을 단일 레코드(`AGENT_DEFINITIONS`)로 선언하는 단일 진실 공급원입니다.
* **설계 특징 (메타데이터 최적화)**:
* 과거 하드코딩되었던 레거시 모델 별칭(`haiku`, `sonnet`, `opus`)을 완전히 제거하고, 이를 **`reasoningEffort` (`low`, `medium`, `high`)** 라는 추상화된 추론 노력 지표로 대체했습니다.
* 이를 통해 벤치마크나 UX 출력 시 생성된 하위 에이전트가 잘못된 구형 모델 라벨을 노출하는 유출(Leak) 현상을 원천 차단했습니다.



### 2.3 `native-config.ts` (TOML 빌더 및 설치기)

* **역할**: `definitions.ts`의 메타데이터와 `prompts/*.md`의 텍스트 지시문을 하나로 융합하여, 최종적으로 `~/.codex/agents/*.toml` 형태의 네이티브 에이전트 설정 파일을 생성하고 디스크에 설치합니다.
* **동작 매커니즘**:
1. `definitions.ts`에서 에이전트의 `reasoningEffort` 값을 읽어옵니다.
2. 해당 값을 파생하여 런타임에 맞는 `model_reasoning_effort`로 변환합니다.
3. 역할별 프롬프트 파일(`executor.md` 등)을 읽어와 `developer_instructions` 블록에 삽입하여 TOML을 조립합니다.



### 2.4 `policy.ts` (설치 정책 관리기)

* **역할**: 시스템에 정의된 에이전트 중 실제로 로컬 환경에 설치를 허용할 에이전트 집합을 결정합니다.
* **설계 원칙 (카탈로그 우선 필터링)**: `definitions.ts`에 정의되어 있더라도, 무조건 설치되는 것이 아닙니다. 반드시 `catalog/manifest.json`을 참조하여 해당 에이전트의 상태가 `active` 또는 `internal`로 명시된 경우에만 설치를 허가합니다.

---

## 3. 핵심 데이터 모델 및 타입 (Data Types & Interfaces)

에이전트 생성을 제어하는 핵심 타입 스키마는 다음과 같습니다.

| 타입 / 인터페이스 | 선언 위치 | 역할 및 설명 |
| --- | --- | --- |
| **`AgentDefinition`** | `definitions.ts` | 에이전트의 이름, 설명, `reasoningEffort`('low'|'medium'|'high'), `posture` (예: 'frontier-orchestrator', 'deep-worker') 등을 정의하는 정적 메타데이터 구조체. |
| **`GeneratedNativeAgentConfig`** | `native-config.ts` | 컴파일이 완료되어 TOML로 쓰이기 직전의 에이전트 설정 구조체. |
| **`AgentModelResolutionOptions`** | `native-config.ts` | 환경 변수나 설정 오버라이드(`codexHomeOverride`)에 따라 에이전트의 모델을 동적으로 결정하기 위한 옵션. |
| **`RoleInstructionMetadata`** | `native-config.ts` | 프롬프트를 조립할 때 사용되는 내부 메타데이터 (경로, 삽입 마커 정보 등). |

---

## 4. 에이전트 프롬프트 스키마 및 계약 (Agent Prompt Contract)

`src/agents/` 모듈이 에이전트를 조립하기 위해 로드하는 `prompts/*.md` 파일들(예: `planner.md`, `executor.md`, `verifier.md`)은 단순한 텍스트가 아니며, 시스템의 통제를 받기 위해 "통합 지침 스키마 (Guidance Schema)"라는 엄격한 계약을 준수해야 합니다.

해당 프롬프트 파일들은 모두 마크다운 섹션 제목을 기반으로 아래의 **6가지 필수 섹션**을 반드시 포함하여 작성됩니다.

1. **역할 및 의도 (Role & Intent)**: 해당 에이전트(작업자)의 정체성과 성공 조건 정의.
2. **작동 원리 (Operating Posture)**: 품질, 속도, 검증에 대한 고차원적인 결정 규칙 및 태도.
3. **실행 프로토콜 (Execution Protocol)**: 해당 전문가가 수행해야 할 순서가 지정된 세부 워크플로우 단계.
4. **제약사항 및 안전 (Constraints & Safety)**: 역할의 경계, 금지된 파괴적 행동, 핸드오프(Handoff) 한계 (예: 하위 에이전트를 무한 재귀 호출하지 말 것).
5. **검증 및 완료 (Verification & Completion)**: 작업을 완료했다고 주장하기 전에 반드시 확보해야 하는 증거(Evidence) 요구사항 (근거 기반 검증).
6. **복구 및 수명주기 (Recovery & Lifecycle)**: 작업 실패 시나리오 처리 방법, 취소/정리 동작 및 최종 체크리스트.

> **마이그레이션 참고**: 과거에는 XML 태그(`<Agent_Prompt>`, `<Output_Format>` 등)를 사용했으나, 현재는 가독성과 런타임 호환성을 위해 **마크다운(Markdown) 글머리 기호 및 번호 매기기 형태**로 병합 및 마이그레이션이 완료되었습니다. 그러나 내부적으로는 여전히 시스템이 요구하는 "표준 XML 태그가 지정된 하위 에이전트 역할 인터페이스"로서의 지위를 동일하게 가집니다.