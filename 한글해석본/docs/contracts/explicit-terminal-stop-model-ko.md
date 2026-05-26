# 명시적 종단 정지 모델 계약

상태: 런타임, 후크, MCP 상태 및 프롬프트/문서 인터페이스에 대해 승인된 마이그레이션 계약입니다.

## 목적

이 문서는 활성 OMX 워크플로에 대한 표준 터미널 중지 용어를 잠급니다.
런타임 코드, 기본/대체 중지 핸들러, MCP 상태 및 사용자 측 핸드오프 지침이 모두 동일한 턴 종료 의미 체계를 설명하도록 존재합니다.

## 정식 터미널 수명주기 결과

명시적 중지 모델에 대한 유일한 표준 사용자 대상 터미널 수명 주기 결과는 다음과 같습니다.

| Outcome | Meaning | Continuation rule | User-facing expectation |
| --- | --- | --- | --- |
| `finished` | The workflow completed successfully. | Do not auto-continue. | Report completion evidence and resulting artifacts. |
| `blocked` | Progress cannot continue because a non-user prerequisite is missing. | Do not auto-continue until the blocker changes. | Report the blocker, why it matters, and the required handoff. |
| `failed` | The workflow or verification failed. | Do not auto-continue until the failure is addressed. | Report failure evidence, impact, and recommended recovery. |
| `userinterlude` | The user intentionally interrupted or paused the run. | Do not auto-continue unless the user explicitly restarts it. | Report that the stop was user-originated, not model-originated. |
| `askuserQuestion` | OMX must ask the user a blocking question before safe progress can continue. | Do not auto-continue until the question is answered. | Ask one concrete blocking question and record the question metadata. |

`askuserQuestion` 및 `userinterlude`은 의도적으로 구별됩니다.

- `askuserQuestion`은 모델에서 시작되었으며 일반적으로 `omx question` 또는 동등한 기계 판독 가능 질문 메타데이터로 뒷받침되어야 합니다.
- `userinterlude`은 사용자가 시작한 중단/중지 의도입니다.

## 레거시 호환성 규칙

레거시 값은 마이그레이션 중에 지속된 상태로 계속 나타날 수 있지만 이는 공개 표준 어휘가 아닌 호환성 입력입니다.

| Legacy value | Canonical interpretation |
| --- | --- |
| `finish`, `complete`, `completed`, `done` | normalize to `finished` |
| `blocked_on_user` | compatibility-only user-wait signal; map to `askuserQuestion` when question metadata proves OMX asked a blocking question, otherwise map to `userinterlude`/user-wait compatibility according to the surrounding context |
| `cancelled`, `canceled`, `abort`, `aborted` | internal legacy/admin stop compatibility only; do **not** present as a canonical user-facing lifecycle outcome |

### `cancelled` 정책

`cancelled`은 레거시 관리 상태, 해체 또는 이전 버전과 호환되는 읽기에 대해 계속 유효합니다.
이는 명시적 중지 모델의 표준 사용자 대상 터미널 수명 주기 결과가 **아닙니다**.
문서, 프롬프트 및 런타임 요약은 다음 중 하나를 선호해야 합니다.

- `finished`
- `blocked`
- `failed`
- `userinterlude`
- `askuserQuestion`

## 상태/MCP 우선순위

터미널 수명 주기 메타데이터는 다음 순서로 해석되어야 합니다.

1. `lifecycle_outcome`과 같은 전용 정식 수명 주기 필드
2. 레거시 `run_outcome` 호환성 데이터
3. `current_phase`, 질문 메타데이터 및 기타 지속되는 컨텍스트의 대체 추론

참고:

- `current_phase`과 수명 주기 결과는 관련되어 있지만 동일하지는 않습니다. 워크플로는 정식 수명 주기 메타데이터를 계속 노출하면서 레거시 단계 이름을 유지할 수 있습니다.
- 정식 수명 주기 메타데이터와 레거시 `run_outcome`이 모두 존재하는 경우 정식 수명 주기 필드가 우선합니다.
- `run_outcome`은 장기 공개 계약이 아닌 마이그레이션 중에 호환성 읽기/쓰기 인터페이스으로 처리되어야 합니다.

## 중지/감시자 해석 규칙

중지 판독기, 기본 후크 및 대체 감시자는 보조 산문 휴리스틱보다 명시적인 수명 주기 메타데이터를 선호해야 합니다.
마이그레이션 중에는 다음을 수행해야 합니다.

- 정식 `finished`, `blocked`, `failed`, `userinterlude` 및 `askuserQuestion` 메타데이터를 먼저 적용합니다.
- 억제-연속 호환성 신호로 레거시 `blocked_on_user`을 계속 존중합니다.
- 선택적 보조 문구를 수명 주기 상태의 의미론적 소유자로 취급하지 마세요.
- 사용자에게 표시되는 수명 주기 요약으로 변환할 때 `cancelled` 내부 레거시 전용을 유지합니다.

## 활성 워크플로 터미널 핸드오프 계약

활성 워크플로가 터미널 사용자에게 표시되는 메시지를 생성할 때 전달은 명시적이고 구조화되어야 합니다.
최종 요약에는 다음이 포함되어야 합니다.

1. **결과** — 명시적인 수명 주기 라벨 1개
2. **증거** — 구체적인 검증 결과, 실패 증거 또는 누락된 종속성/질문
3. **아티팩트/상태** — 관련된 경우 변경된 파일, 저장된 아티팩트 또는 녹음된 질문 식별자
4. **인계** — 권한을 구하는 선택적 문구 없이 정확한 다음 소유자 또는 필수 답변

### 금지된 터미널 패턴

다음과 같은 선택적 후속 연화제를 사용하여 활성 워크플로 터미널 핸드오프를 종료하지 **마세요**.

- `If you want, I can ...`
- `If you'd like, I can ...`
- `Would you like me to continue?`

이러한 문구는 수명 주기 상태를 모호하게 만듭니다. 최종 결과는 실행이 완료되었는지, 실패했는지, 차단되었는지, 사용자 막간으로 진입했는지 또는 필수 사용자 질문을 기다리고 있는지를 이미 설명해야 합니다.

## 논골

이 계약에서는 모든 레거시 내부 단계 이름을 즉시 변경할 것을 요구하지 **않습니다**.
위의 표준 터미널 수명 주기 개념을 노출하고 선호하려면 마이그레이션된 모든 인터페이스이 필요합니다.
