# OMX State Model

이 문서에서는 OMX가 워크플로/기술 상태를 추적하는 방법, 전환 규칙을 평가하는 방법, 일반적으로 허용되거나 차단되는 전환에 대해 설명합니다.

## 목표

- CLI, MCP, 후크 및 HUD 전반에서 모드 상태를 예측 가능하게 만듭니다.
- 어떤 파일이 신뢰할 수 있는지, 호환성만 있는지 표시
- 허용 목록에 있는 핸드오프 및 중복 규칙이 작동하는 방식을 설명합니다.
- 공통 워크플로 전환을 한 곳에 문서화

## 국가 당국

### 1. 모드별 상태 파일 - 권한 있음

신뢰할 수 있는 워크플로 상태는 `.omx/state/` 아래의 모드별 파일에 있습니다.

- 루트 범위: `.omx/state/<mode>-state.json`
- 세션 범위: `.omx/state/sessions/<session_id>/<mode>-state.json`

예:

- `.omx/state/ralplan-state.json`
- `.omx/state/sessions/<session_id>/ralph-state.json`
- `.omx/state/team-state.json`

이러한 파일은 워크플로 모드가 활성, 완료, 취소 또는 실패인지 여부를 결정합니다. 이러한 모드 단계는 사용자가 직면하는 터미널 수명주기 용어와 항상 동일하지는 않습니다. 해당 호환성 경계에 대해서는 아래의 명시적인 터미널 수명 주기 섹션을 참조하세요.

### 2. `skill-active-state.json` — 호환성/가시성 레이어

`skill-active-state.json`은 여전히 ​​후크/HUD/네이티브 메시징을 위한 호환성 인터페이스으로 사용되지만 전환 코디네이션(Coordination)은 임시 의미 체계를 다시 파생시키는 대신 공유 전환/코디네이션(Coordination) 도우미에서 구동되어야 합니다.

위치:

- `.omx/state/skill-active-state.json`
- `.omx/state/sessions/<session_id>/skill-active-state.json`

### 3. 세션 우선순위

읽기 우선순위는 다음과 같습니다.

1. 명시적 세션 범위
2. 현재 세션 범위
3. 루트 범위 대체

루트와 세션이 동일한 모드에 대해 동의하지 않으면 활성 실행 컨텍스트에 대해 세션이 승리하지만 오래된 루트 생존자는 그렇지 않으면 이전 상태를 부활시킬 수 있으므로 코디네이션(Coordination) 중에 종료되어야 합니다.

## 터미널 수명주기 결과 호환성

명시적인 터미널 중지 모델의 경우 워크플로 `current_phase` 및 사용자 대상 터미널 수명 주기 결과를 관련되어 있지만 별도의 개념으로 처리합니다.

정식 사용자 대상 수명 주기 결과는 다음과 같습니다.

- `finished`
- `blocked`
- `failed`
- `userinterlude`
- `askuserQuestion`

호환성 규칙:

- 둘 다 존재하는 경우 레거시 `run_outcome`보다 전용 정식 수명 주기 필드를 선호합니다.
- 마이그레이션 중에 레거시 `run_outcome`을 호환성 레이어로 처리합니다.
- 정식 수명 주기 메타데이터나 레거시 `run_outcome`을 모두 사용할 수 없는 경우에만 `current_phase`에서 추론하세요.
- `cancelled`을 표준 공개 수명 주기 어휘가 아닌 내부 레거시/관리 단계로 유지하세요.

터미널 수명주기 해석에 권장되는 읽기 우선순위:

1. 정식 수명 주기 메타데이터(예: `lifecycle_outcome`)
2. 레거시 `run_outcome`
3. `current_phase`, 질문 메타데이터 및 지속되는 오류/완료 필드로부터의 호환성 추론

`blocked_on_user`도 호환성 전용입니다. 주변 질문 메타데이터가 OMX가 차단 질문을 했다는 것을 증명하면 이를 `askuserQuestion`로 분류합니다. 그렇지 않으면 표준 어휘로 직접 노출하는 대신 사용자 대기 호환성 신호로 처리합니다.

## 핵심 파일

- `src/state/workflow-transition.ts` — 전환 정책 및 결정 모델
- `src/state/workflow-transition-reconcile.ts` — 공유 전환 코디네이션(Coordination) 도우미
- `src/modes/base.ts` — 모드 시작/업데이트 수명 주기
- `src/mcp/state-server.ts` — MCP 상태 쓰기/읽기/지우기
- `src/hooks/keyword-detector.ts` — 프롬프트 키워드 활성화 + 상태 시딩
- `src/scripts/codex-native-hook.ts` — 기본 후크 라우팅(Routing) 및 프롬프트 제출 출력

## 전환 흐름

```mermaid
flowchart TD
  A[Prompt / CLI / MCP request] --> B[Detect requested workflow skill(s)]
  B --> C[Evaluate transition policy]
  C -->|deny| D[Return denial message]
  C -->|allow overlap| E[Keep current active modes + add destination]
  C -->|allow auto-complete| F[Complete source mode(s)]
  F --> G[Sync compatibility skill-active state]
  G --> H[Activate destination mode(s)]
  E --> G
  H --> I[Emit routing / transition message]
```

## 코디네이션(Coordination) 순서

공유 코디네이션(Coordination) 도우미는 다음 순서를 따라야 합니다.

1. 결과를 결정하다
2. 감사 메타데이터가 포함된 완전한 소스 모드
3. 동기화 호환성 `skill-active` 상태
4. 대상 모드 활성화
5. 렌더링을 위한 전환 메시지 반환

너무 일찍 동기화하면 방금 자동 완성된 모드가 부활할 수 있기 때문에 이 순서가 중요합니다.

## 프롬프트 제출 흐름

```mermaid
flowchart TD
  A[UserPromptSubmit] --> B[detectKeywords()]
  B --> C[ordered explicit skill list]
  C --> D[recordSkillActivation()]
  D --> E[shared reconciliation helper]
  E --> F[final active skills]
  F --> G[buildAdditionalContextMessage()]
  G --> H[native hook output]
```

## 전환 규칙 카테고리

### A. 변경 없이 허용

요청한 모드가 이미 활성화되어 있습니다.

### B. 중복 허용

소스 모드를 완료하지 않은 상태에서 요청한 모드가 추가됩니다.

예:

- `team + ralph`
- `ultrawork + <any tracked mode>`

### C. 소스 자동 완성으로 허용

소스 모드가 종료되고 대상이 활성화됩니다.

현재 허용 목록에 있는 전달 핸드오프:

- `deep-interview -> ralplan`
- `ralplan -> team`
- `ralplan -> ralph`
- `ralplan -> autopilot`
- `autopilot -> ralplan` Autopilot의 코드 검토 단계가 깨끗하지 않은 경우

### D. 거부

요청한 전환이 허용되지 않으며 상태가 변경되지 않습니다.

## 일반적인 전환 규칙

| From | To | Result |
|---|---|---|
| `deep-interview` | `ralplan` | auto-complete `deep-interview`, start `ralplan` |
| `ralplan` | `team` | auto-complete `ralplan`, start `team` |
| `ralplan` | `ralph` | auto-complete `ralplan`, start `ralph` |
| `ralplan` | `autopilot` | auto-complete `ralplan`, start `autopilot` |
| `autopilot` | `ralplan` | auto-complete `autopilot`, start `ralplan` for review-driven loopback |
| `team` | `ralph` | allowed overlap |
| `ralph` | `team` | allowed overlap |
| `<any tracked mode>` | `ultrawork` | allowed overlap |
| `ultrawork` | `<any tracked mode>` | allowed overlap |
| execution-like mode | planning-like mode | denied rollback auto-complete, except the explicit `autopilot -> ralplan` review loopback |
| anything else non-allowlisted | new conflicting mode | denied |

## 계획형 vs 실행형

### 기획적인

- `deep-interview`
- `ralplan`
- `autoresearch`

### 실행과 유사한

- `team`
- `ralph`
- `autopilot`
- `ultrawork`
- `ultraqa`

실행형 -> 계획형 롤백 자동 완성은 금지됩니다. 거부는 사용자에게 다음 내용을 실질적으로 알려야 합니다.

> 먼저 현재 상태를 지우고 이 작업이 의도된 경우 다시 시도하세요.

## 다중 기술 프롬프트 제출 동작

단일 프롬프트는 여러 개의 연속된 `$skill` 토큰을 명시적으로 호출할 수 있습니다.

예:

```text
$ralplan $team $ralph ship this fix
```

예상 결과:

1. `ralplan`은(는) 계획 소스로 인식됩니다.
2. 동시 실행 후속 작업은 자동 시작 대신 연기됩니다.
3. 최종 활성 스킬(Skill)은 `ralplan` 남았습니다.
4. 추적성을 위해 지연된 실행 스킬이 네이티브 후크 출력에 표시됩니다.
5. 기본 후크 출력은 기본 기술뿐만 아니라 모든 명시적 스킬을 설명해야 합니다.

권장되는 메시지 형태:

- 감지된 키워드 요약
- 지연된 기술 요약, 예: `planning preserved over simultaneous execution follow-up; deferred skills: team, ralph`
- 최종 액티브 스킬 / 초기화 상태 요약
- `team`이 실제로 최종 활성 기술 중 하나인 경우에만 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 힌트

## 자동 완성을 위한 감사 필드

전환 중에 소스 모드가 자동 완성되면 소스 상태는 다음을 기록해야 합니다.

- `active: false`
- `current_phase: completed`
- `completed_at`
- `auto_completed_reason` 또는 이에 상응하는 것
- `completion_note` 또는 이에 상응하는 것
- 유용한 경우 대상 메타데이터(`transition_target_mode`, 소스 경로 등)

## 불변성

의도적으로 변경하지 않는 한 다음 규칙은 그대로 유지되어야 합니다.

- 계획으로의 롤백은 자동 완료되지 않습니다.
- 허용 목록에 없는 전환은 차단된 상태로 유지됩니다.
- `ultrawork` 중첩 - `ralplan-first` 게이팅을 약화해서는 안 됩니다.
- 네이티브 후크 출력은 별도의 의사 결정 엔진이 아닌 공유 전환 결과에 대한 프레젠테이션 계층입니다.
- 호환성 동기화는 완료된 소스 모드를 부활시켜서는 안 됩니다.

## 실무지도

### 전환 규칙을 변경하는 경우

함께 업데이트:

- `src/state/workflow-transition.ts`
- `src/state/workflow-transition-reconcile.ts`
- 라이프사이클/MCP 호출자
- 프롬프트 제출/네이티브 후크 렌더링
- 회귀 테스트

### 오래된 상태를 디버깅하는 경우

다음을 순서대로 확인하세요.

1. 세션 범위 `<mode>-state.json`
2. 루트 `<mode>-state.json`
3. 세션/루트 `skill-active-state.json`
4. 이전 자동 완성에서 감사 메타데이터를 썼지만 호환성 동기화에서 해당 모드를 다시 도입했는지 여부

### 새로운 허용 목록에 있는 핸드오프를 추가하는 경우

정의하다:

- 소스 모드
- 대상 모드
- 소스 자동 완성 또는 대상 중복 여부
- 롤백 동작
- 예상되는 네이티브 후크/CLI/MCP 전환 출력
- 세션 및 루트 범위 모두에 대한 회귀 테스트
