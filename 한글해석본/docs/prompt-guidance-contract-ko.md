# GPT-5.5 신속한 지도 계약

상태: OMX 프롬프트 및 오케스트레이션 인터페이스에 대한 기여자 대상 계약입니다.

## 목적

이 문서에서는 [#2007](https://github.com/Yeachan-Heo/oh-my-codex/issues/2007) 발행 이후 OMX에 대한 활성 **행동 프롬프트 계약**에 대해 설명합니다. OMX 제품 계약을 유지하면서 프롬프트 및 지침 인터페이스을 OpenAI의 공식 [GPT-5.5 prompt guidance](https://developers.openai.com/api/docs/guides/prompt-guidance)에 맞추세요.

다음 인터페이스을 편집할 때 이를 사용하십시오.

- `AGENTS.md` 저장소가 프로젝트 루트 복사본을 추적하도록 선택한 경우
- `templates/AGENTS.md`
- `prompts/*.md`에 표준 XML 태그가 지정된 역할 프롬프트가 표시됩니다.
- `skills/*/SKILL.md`의 워크플로 기술 지침
- `src/hooks/` 및 `src/config/`에 따른 후크/생성기 프롬프트 안내 및 회귀 테스트

## 범위 및 현재 정보 소스

이 저장소의 현재 프롬프트 소스는 **`prompts/*.md`** 및 **`skills/*/SKILL.md`**에 있으며 `~/.codex/prompts/`, `~/.codex/skills/` 및 기본 에이전트(Agent) 래퍼에 설치됩니다. 소스 마크다운 본문을 표준으로 취급합니다. 런처별 TOML 또는 런타임 래퍼는 동일한 동작을 유지해야 합니다.

GPT-5.5 계약은 다음과 같이 배포됩니다.

- 오케스트레이션 인터페이스: `templates/AGENTS.md` 및 추적된 프로젝트 루트 `AGENTS.md`
- 공유 조각: `docs/prompt-guidance-fragments/*`
- 표준 XML 태그가 지정된 하위 에이전트 역할 프롬프트: `prompts/*.md`
- 작업 흐름 기술: `skills/*/SKILL.md`
- 생성된 최상위 Codex 구성 지침: `src/config/generator.ts`
- 회귀 테스트: `src/hooks/__tests__/prompt-guidance-*.test.ts`

## 워크플로 기술 지침 중복 제거

워크플로 스킬(Skill)은 모든 GPT-5.5 글머리 기호를 반복하는 대신 공유 워크플로 지침 패턴에 대한 간략한 참조를 사용할 수 있습니다. 해당 패턴은 결과 우선 프레이밍, 다단계 작업을 위한 간결하고 가시적인 업데이트, 범위가 지정된 작업 업데이트 재정의, 증거 기반 검증 및 명시적인 중지/상관 규칙을 유지해야 합니다. 상태 전환, 게이트, 정리, 취소 및 확인 명령과 같은 워크플로별 불변성은 소유 기술에서 명시적으로 유지됩니다.

## 정확한 모델 미니 적응 솔기

OMX에는 또한 **최종 해결 모델**이 정확히 `gpt-5.4-mini`인 하위 에이전트/작업자에 대한 좁은 **명령-구성 이음새**가 있습니다.
이 이음새는 신속한 전달의 일부이지만 아래 설명된 일반 GPT-5.5 행동 계약보다 의도적으로 좁습니다.

해당 이음새에 대한 기여자 규칙:

- 역할 이름, 파트 또는 기본 계층 멤버십이 아닌 **최종 해결 모델 문자열**을 벗어난 주요 미니 특정 지침 적응.
- `gpt-5.4-mini`에 **정확한 문자열 동일성**을 사용하세요. 동작을 `gpt-5.5`, `gpt-5.4-mini-tuned` 또는 기타 변형으로 확장하지 마세요.
- 모델 기반 프롬프트 적응을 위한 정보 소스로 하나의 공유 **내부 역할 지시 구성 도우미**를 유지하세요.
- `src/team/worker-bootstrap.ts`을 **외부 에이전트/런타임 래핑**으로 제한하세요. 자체 모델별 적응 논리가 아니라 이미 구성된 명령을 래핑해야 합니다.
- 최소한의 배관 변경이 불가피하지 않은 한 `src/team/role-router.ts`을 원시 역할 프롬프트 로더로 유지하세요.

이 솔기의 기본 구현 인터페이스:

| Responsibility | Primary sources |
|---|---|
| shared inner prompt composition | `src/agents/native-config.ts`, `src/agents/__tests__/native-config.test.ts` |
| team runtime/scaling plumbing | `src/team/runtime.ts`, `src/team/scaling.ts`, associated runtime/scaling tests |
| outer wrapper boundary | `src/team/worker-bootstrap.ts`, `src/team/__tests__/worker-bootstrap.test.ts` |

## 이 계약의 내용과 그렇지 않은 내용

이 계약은 **OMX 프롬프트의 작동 방식**에 관한 것입니다. OMX의 라우팅(Routing) 메타데이터와는 다릅니다.

- **행동 계약:** 결과 우선 기본값, 간결한 협업 스타일, 위험이 낮은 후속 조치, 현지화된 작업 업데이트, 증거 기반 검증 및 명시적인 중지 규칙.
- **인접하지만 별도의 라우팅 레이어:** `src/agents/native-config.ts` 및 `docs/shared/agent-tiers.md`의 `frontier-orchestrator`, `deep-worker` 및 `fast-lane`와 같은 역할/계층/상태 메타데이터.

프롬프트 문장을 변경하는 경우 이 문서를 먼저 사용하세요. 라우팅 메타데이터 또는 기본 구성 오버레이를 변경하는 경우 먼저 라우팅 문서/테스트를 사용하세요.

## OMX가 시행해야 하는 5가지 핵심 GPT-5.5 패턴

### 1. 결과 우선, 성공 기준 주도 프롬프트

기여자는 프로세스 세부 사항을 추가하기 전에 목표 결과, 성공 기준, 제약 조건, 사용 가능한 증거, 예상 출력 및 중지 조건을 설명해야 합니다. 프로세스 자체가 제품 계약이 아닌 이상 프로세스가 많은 스택을 피하세요.

대표 위치:

| Surface | Evidence |
|---|---|
| shared fragments | `docs/prompt-guidance-fragments/core-operating-principles.md` |
| root orchestration | `templates/AGENTS.md` |
| core roles | `prompts/executor.md`, `prompts/planner.md`, `prompts/verifier.md` |
| contract tests | `src/hooks/prompt-guidance-contract.ts` and `src/hooks/__tests__/prompt-guidance-*.test.ts` |

프롬프트 텍스트 예시:

> 결과 우선, 품질 중심 응답 기본값: 프로세스 세부 사항을 추가하기 전에 사용자의 목표 결과, 성공 기준, 제약 조건, 사용 가능한 증거, 예상 출력 및 중지 조건을 식별합니다.

### 2. 긴 업무를 위한 서문을 갖춘 간결한 성격/협업 스타일

어조와 협업을 짧게 유지하세요. 다단계 또는 도구가 많이 사용되는 작업의 경우 요청을 확인하고 첫 번째 단계의 이름을 지정하는 간략하고 눈에 띄는 서문으로 시작하세요. 이후 업데이트를 간략하고 증거에 기반하여 유지하세요.

대표 위치:

| Surface | Evidence |
|---|---|
| root orchestration | `templates/AGENTS.md` |
| executor/planner/verifier fragments | `docs/prompt-guidance-fragments/*-constraints.md` |
| core prompts | `prompts/executor.md`, `prompts/planner.md`, `prompts/verifier.md` |

### 3. 명확하고 위험도가 낮으며 되돌릴 수 있는 다음 단계에 대한 자동 후속 조치

기여자는 피할 수 있는 확인 질문을 하는 대신 자동으로 유용한 작업을 계속하도록 하는 편견을 유지해야 합니다.

프롬프트 텍스트 예시:

> 명확하고 위험도가 낮으며 되돌릴 수 있는 다음 단계를 자동으로 진행합니다. 되돌릴 수 없는, 자격 증명 제한, 외부 생산, 파괴적 또는 실질적으로 범위를 변경하는 작업만 요청하세요.

또한 에이전트 소유의 안전한 런타임 작업을 보존합니다.

> 인간에게 일반적인 비파괴적이고 되돌릴 수 있는 작업을 수행하도록 요청하거나 지시하지 마십시오. 안전하게 되돌릴 수 있는 OMX/런타임 작업과 일반 명령을 직접 실행하세요.

### 4. 충돌하지 않는 이전 지침을 보존하는 현지화된 작업 업데이트 재정의

기여자는 사용자 업데이트를 전체 프롬프트 재설정이 아닌 **범위가 지정된 재정의**로 처리해야 합니다.

프롬프트 텍스트 예시:

> 충돌하지 않는 이전 지침을 유지하면서 최신 사용자 작업 업데이트를 활성 작업에 대한 로컬 재정의로 처리합니다.

`continue`, `make a PR` 및 `merge if CI green`에 대한 시나리오 예제는 `prompts/executor.md`, `prompts/planner.md`, `prompts/verifier.md` 및 관련 테스트에서 이 동작을 강화합니다.

### 5. 증거 예산, 검증 및 명시적 중지 규칙

GPT-5.5 지침은 올바르게 대답할 수 있을 만큼 충분한 검색/검증을 선호한 다음 중지합니다. OMX 프롬프트는 도구 사용을 계속해야 하며 정확성은 저장소 검사, 공식 문서, 진단, 테스트, 인용 또는 확인에 따라 달라지지만 문구를 개선하거나 불필요한 증거를 수집하는 추가 루프는 피해야 합니다.

코딩 작업의 경우 프롬프트에서 구체적인 유효성 검사를 요청해야 합니다.

- 변화된 행동에 대한 표적 테스트
- 해당되는 경우 유형 검사/린트/빌드 검사
- 전체 검증에 비용이 너무 많이 드는 경우 최소한의 연기 테스트
- 유효성 검사를 실행할 수 없는 경우 명시적인 이유 및 파트책 확인

구현 계획은 요구 사항, 명명된 파일/리소스/API, 상태 전환 또는 관련된 데이터 흐름, 유효성 검사 명령, 실패 동작, 개인 정보 보호/보안 고려 사항 및 중요한 공개 질문 등 추적 가능해야 합니다.

## 절대 언어 규칙

실제 불변성에는 `MUST`, `NEVER`, `ALWAYS`, `only` 및 유사한 절대 표현(안전/보안 경계, 부작용 제약 조건, 필수 출력 필드, 워크플로 상태 전환, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/랄프 게이트 및 제품 계약)을 사용합니다. 다시 검색할지, 설명을 요청할지, 계속 반복할지 등의 판단 요구에 대해서는 결정 규칙과 중지 조건을 선호합니다.

## 활성 워크플로 터미널 핸드오프 계약

활성 워크플로를 제어하는 ​​프롬프트 화면에서는 터미널 사용자 측 응답을 일반적인 선택적 후속 조치가 아닌 명시적인 전달로 설명해야 합니다.

기여자 규칙:

1. 터미널 활성 워크플로 응답에는 `finished`, `blocked`, `failed`, `userinterlude` 또는 `askuserQuestion`와 같은 명시적인 결과 이름이 지정되어야 합니다.
2. 최종 답변에는 해당 결과를 정당화하는 증거나 차단 이유가 포함되어야 합니다.
3. 터미널 응답은 완료된 아티팩트, 차단 종속성, 오류 복구 소유자 또는 단일 필수 질문 등 핸드오프를 명확하게 식별해야 합니다.
4. 터미널 응답은 `If you want, I can ...`, `If you'd like, I can ...` 또는 `Would you like me to continue?`와 같은 권한 추구 연화기로 끝나서는 안 됩니다.

이 규칙은 활성 워크플로 전달에만 적용됩니다. 활성 워크플로 외부의 일반적인 설명 대화는 여전히 대화일 수 있지만 워크플로 소유 터미널 응답은 수명 주기 상태를 명시적으로 만들어야 합니다.

## 루트 AGENTS 인터페이스에 대한 오케스트레이션 선명도 규칙

`templates/AGENTS.md`, 추적된 루트 `AGENTS.md` 또는 기타 루트 오케스트레이션 지침을 편집할 때 오케스트레이션 계약 모드 기반 및 간결성을 유지하세요.

1. **모드 선택이 먼저입니다.** 하나의 일반 흐름으로 혼합하는 대신 `$deep-interview`, `$ralplan`, `$team`과 직접 단독 실행을 구별합니다.
2. **리더와 작업자의 책임은 별도로 유지됩니다.** 리더는 모드를 선택하고 자체 검증을 수행하며 작업을 통합합니다. 작업자는 할당된 슬라이스를 실행하고 차단기를 위쪽으로 보고합니다.
3. **중지/에스컬레이션 규칙은 명시적입니다.** 중지할 시기, 사용자에게 에스컬레이션해야 하는 시기, 작업자가 리더에게 다시 에스컬레이션해야 하는 시기를 프롬프트에 알려야 합니다.
4. **출력 계약은 엄격하게 유지됩니다.** 기본 진행률/최종 업데이트는 현재 모드, 작업/결과, 증거 또는 차단기/다음 단계 등 간결해야 합니다. 위험이나 결정이 변경되지 않는 한 전체 계획 근거를 반복하지 마십시오.

## 지침 스키마와의 관계

`docs/guidance-schema.md`은 AGENTS 및 작업자 인터페이스에 대한 **섹션 레이아웃 계약**을 정의합니다. 이 문서는 GPT-5.5 출시 후 해당 섹션 내에 표시되어야 하는 **행동 문구 계약**을 정의합니다.

두 문서를 함께 사용하십시오.

- 구조의 경우 `docs/guidance-schema.md`
- 행동에 대한 `docs/prompt-guidance-contract.md`

## 상태 인식 라우팅과의 관계

자세 인식 라우팅은 실제이지만 GPT-5.5 동작 롤아웃과 동일한 계약은 아닙니다. 문서와 프롬프트를 편집할 때 다음을 별도로 유지하세요.

| Topic | Primary sources |
|---|---|
| GPT-5.5 prompt behavior contract | `templates/AGENTS.md`, any tracked `AGENTS.md`, canonical XML-tagged role prompt surfaces in `prompts/*.md`, workflow skills in `skills/*/SKILL.md`, `src/config/generator.ts`, `src/hooks/__tests__/prompt-guidance-*.test.ts` |
| exact-model mini composition seam | `src/agents/native-config.ts`, `src/team/runtime.ts`, `src/team/scaling.ts`, `src/team/worker-bootstrap.ts`, targeted native/runtime/scaling/bootstrap tests |
| role/tier/posture routing | `README.md:133-179`, `docs/shared/agent-tiers.md`, `src/agents/native-config.ts` |

변경 사항이 상태 오버레이 또는 기본 에이전트 메타데이터에만 영향을 미치는 경우 이 계약을 불필요하게 확장하기보다는 라우팅 문서에 이를 문서화하십시오.

## 정식 역할 프롬프트와 특수 행동 프롬프트 비교

기본 역할 카탈로그는 기본 에이전트 생성 및 내부 역할 프롬프트 구성에 사용되는 설치 가능한 특수 에이전트 세트입니다.

- `prompts/executor.md`, `prompts/planner.md` 및 `prompts/architect.md`와 같은 파일은 표준 XML 태그가 지정된 역할 프롬프트 화면입니다.
- `prompts/sisyphus-lite.md`은 일류 기본 카탈로그 역할이 아닌 특수 작업자 행동 프롬프트로 처리되어야 합니다.
- 작업자/런타임 오버레이는 기본 공용 역할 카탈로그로 승격하지 않고 작업자 프로토콜 제약 조건에 따라 해당 동작을 구성할 수 있습니다.

## 신속한 변경을 위한 기여자 체크리스트

프롬프트 텍스트를 변경하는 PR을 열기 전에 다음 사항을 모두 확인하세요.

1. **5가지 핵심 행동을 유지합니다.** 변경 사항은 결과 우선 프레이밍, 간결한 협업/서문, 저위험 후속 조치, 범위가 지정된 재정의, 증거 기반 검증/중지 규칙을 유지하거나 강화해야 합니다.
2. **역할별 표현을 역할별로 유지하세요.** 표현은 역할에 따라 다를 수 있지만 동작은 의미상 일치해야 합니다.
3. **동작이 변경되면 시나리오 예시를 업데이트하세요.** 프롬프트가 `continue`, `make a PR` 또는 `merge if CI green`을 처리하는 방법을 변경하는 경우 프롬프트 예시와 관련 테스트를 업데이트하세요.
4. **미니 전용 이음새를 정확하고 중앙 집중화하십시오.** 미니 적응을 터치하는 경우 정확한 `gpt-5.4-mini` 동등성을 사용하여 최종 해결 모델에 게이트를 적용하고 공유 내부 도우미를 정보 소스로 유지하며 `worker-bootstrap.ts` 래퍼 전용을 유지합니다.
5. **라우팅 메타데이터와 프롬프트 동작을 혼동하지 마십시오.** 자세/계층 업데이트는 프롬프트 구문도 변경하지 않는 한 라우팅 문서/테스트에 속합니다.
6. **계약이 변경되면 회귀 적용 범위를 업데이트합니다.** `src/hooks/__tests__/prompt-guidance-contract.test.ts`, `prompt-guidance-wave-two.test.ts`, `prompt-guidance-scenarios.test.ts`, `prompt-guidance-catalog.test.ts`, `skill-guidance-contract.test.ts` 및 `prompt-guidance-fragments.test.ts`로 시작합니다. 미니 전용 이음새가 변경되면 네이티브/런타임/스케일링/부트스트랩 적용 범위를 추가합니다.

## 기여자를 위한 검증 작업 흐름

프롬프트 지침 편집을 위해서는 최소한 다음을 실행하십시오.

```bash
npm run build
node --test \
  dist/hooks/__tests__/prompt-guidance-contract.test.js \
  dist/hooks/__tests__/prompt-guidance-wave-two.test.js \
  dist/hooks/__tests__/prompt-guidance-scenarios.test.js \
  dist/hooks/__tests__/prompt-guidance-catalog.test.js \
  dist/hooks/__tests__/skill-guidance-contract.test.js \
  dist/hooks/__tests__/prompt-guidance-fragments.test.js \
  dist/hooks/__tests__/explicit-terminal-stop-docs-contract.test.js
```

정확한 모델 `gpt-5.4-mini` 컴포지션 이음새를 터치하는 경우 다음도 실행합니다.

```bash
node --test \
  dist/agents/__tests__/native-config.test.js \
  dist/team/__tests__/runtime.test.js \
  dist/team/__tests__/scaling.test.js \
  dist/team/__tests__/worker-bootstrap.test.js
```

더 광범위한 프롬프트 또는 기술 변경을 위해서는 전체 제품군을 선호합니다.

```bash
npm test
```

## 참고자료

- 구현 문제: [#2007](https://github.com/Yeachan-Heo/oh-my-codex/issues/2007)
- 공식 출처: [OpenAI GPT-5.5 prompt guidance](https://developers.openai.com/api/docs/guides/prompt-guidance)
- 이전 출시 기록: [#608](https://github.com/Yeachan-Heo/oh-my-codex/issues/608), [#611](https://github.com/Yeachan-Heo/oh-my-codex/pull/611), [#612](https://github.com/Yeachan-Heo/oh-my-codex/pull/612)
- 지침 스키마: `docs/guidance-schema.md`
