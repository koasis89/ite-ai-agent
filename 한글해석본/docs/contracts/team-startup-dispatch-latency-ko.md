# team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 스타트업 파견 지연 계약

날짜: 2026-04-30

검토 파트: 작업자-3

## 범위

이 노트에는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 할당 지연에 대한 검토 계약이 문서화되어 있습니다.
`.omx/plans/ralplan-team-worker-assignment-delay-20260430T110158Z.md`에 설명된 수정 사항입니다.
tmux 작업자 창이 생성된 후와 생성되기 전의 시작 창에 중점을 둡니다.
작업자는 첫 번째 받은 편지함 트리거를 받습니다.

문제는 작업 할당이 아닙니다: 작업, 작업자 ID, 작업자 받은 편지함 파일
시작 알림 시도가 시작되기 전에 이미 내구성이 있습니다. 대기 시간 위험
현재 있는 준비, 파견 및 시작 증거 게이트에 있습니다.
창 생성과 첫 번째 트리거 사이.

## 현재 시작 경로를 검토 중입니다.

1. `src/team/tmux-session.ts:createTeamSession()`은 리더/작업자 창을 분할하고
   구체적인 `workerPaneIds`을 반환합니다.
2. `src/team/runtime.ts:startTeam()`은 모든 작업자 ID와 받은 편지함 파일을 작성합니다.
   team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 구성을 저장한 다음 각 작업자에 대해 `runWorkerStartupAttempt()`을 팬아웃합니다.
3. `initialPrompt` 호출이 없는 대화형 작업자
   `waitForWorkerReadyAsync()`은(는) `dispatchCriticalInboxInstruction()` 이전입니다.
4. 기본 디스패치 정책은 `hook_preferred_with_fallback`을 사용하므로 시작
   받은편지함 발송은 먼저 알림 후크에 대한 대기열에 추가된 다음
   직접 tmux 보내기로 돌아가기 전에 수신합니다.
5. 시작 디스패치는 `waitForWorkerStartupEvidence()`을(를) 추가로 기다릴 수 있습니다.
   첫 번째 트리거를 해결된 것으로 처리하기 전에.

## 계측해야 하는 대기 시간 단계

시작 타이밍 로그는 단조로운 타이밍 델타를 사용해야 하며 최소한 다음을 포함해야 합니다.
각 작업자에 대한 다음 단계 마커는 다음과 같습니다.

| Marker | Meaning |
|---|---|
| `pane_id_captured` | `createTeamSession()` returned the worker pane id. |
| `identity_inbox_written` | worker identity and inbox state were written. |
| `ready_wait_start` | interactive readiness polling began. |
| `ready_wait_end` | readiness polling returned ready, timed out, or hit a prompt guard. |
| `dispatch_queued` | startup inbox dispatch request was persisted. |
| `hook_receipt` | hook-preferred path observed `notified`, `delivered`, `failed`, or timeout. |
| `direct_trigger_attempt` | direct tmux trigger injection was attempted. |
| `direct_trigger_result` | direct injection result was recorded. |
| `startup_evidence` | worker startup evidence (`task_claim`, `worker_progress`, `leader_ack`, `none`) was observed. |

운영자에게 유용한 요약은 다음의 작업자당 델타입니다.
`pane_id_captured` 첫 번째 트리거 시도 및 최종 시작 여부
합의는 후크 전달, 직접 대체 또는 비동기 증거를 통해 이루어졌습니다.

## 빠른 경로 안전 계약

시작 전용 직접 트리거 경로는 다음이 모두 충족되는 경우에만 허용됩니다.
조건 유지:

- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 중 첫 번째 작업자 받은 편지함 트리거에 대해서만 실행됩니다.
- 지속 가능한 할당 상태가 이미 작성되었습니다: 작업 JSON, ID JSON, 받은 편지함,
  매니페스트/구성 창 ID 및 디스패치 요청 메타데이터.
- 후속 작업자 메시지에 대한 사서함 발송을 대체하거나 우회하지 않습니다.
- 눈에 보이는 Codex 신뢰 프롬프트를 통해 전송하지 않습니다.
- 눈에 보이는 Claude 우회 권한 프롬프트를 통해 전송하지 않습니다.
  기존의 명시적 자동 수락 경로는 프롬프트를 먼저 처리했습니다.
- 단지 직접적인 트리거 때문에 후크 전달이 성공한 것으로 표시되지는 않습니다.
  시도되었습니다.
- 시작 증거가 부족하면 복구 가능한 관찰 가능성으로 보고됩니다.
  작업자 창이 살아 있습니다. 형제자매 근로자가 자신의 권리를 받는 것을 방해해서는 안 됩니다.
  시작 트리거.

## 체크리스트 검토

구현을 검토할 때 다음 체크리스트를 사용하세요.

- [ ] 시작 타이밍 계측은 위의 모든 위상 마커를 기록하지 않고 기록합니다.
      첫 번째 트리거 중요 경로의 후크/증거 확인 부분을 만듭니다.
- [ ] 직접 트리거 빠른 경로는 시작 전용이며 다음 사용자가 접근할 수 없습니다.
      일반 우편함 또는 후속 파견.
- [ ] 신뢰 및 우회 프롬프트 가드는 동일한 창 캡처 안전 의미 체계를 재사용합니다.
      `waitForWorkerReadyAsync()` / 알림 후크 파견으로.
- [ ] 디스패치 요청 상태는 `pending`, `notified`에 대한 권한을 유지합니다.
      `delivered` 및 `failed`; 타이밍 로그는 증거만을 뒷받침합니다.
- [ ] 기존 `hook_preferred_with_fallback` 사서함 동작은 변경되지 않았습니다.
      비 시작 메시지.
- [ ] 테스트는 준비 대기 시간, 후크 수신/증거 대기 시간 및
      빠른 경로를 별도로 시작하면 오류가 재발된 단계를 식별할 수 있습니다.

## 회귀 테스트가 예상됨

집중적인 보장에는 다음이 포함되어야 합니다.

1. 먼저 지연하는 데 사용되는 느린 `waitForWorkerReadyAsync()`을 증명하는 런타임 테스트
   구성된 준비 시간 제한까지 시작 디스패치를 ​​수행합니다.
2. 후크 우선 시작 디스패치를 ​​입증하는 런타임 테스트는 더 이상 기다리지 않습니다.
   첫 번째 안전한 트리거를 시도하기 전의 시작 증거.
3. 시작 직접 트리거가 없음을 증명하는 tmux/세션 또는 알림 후크 가드 테스트는 다음과 같습니다.
   눈에 보이는 신뢰 또는 우회 프롬프트를 통해 전송됩니다.
4. 일반적인 사서함 발송을 입증하는 사서함 회귀 테스트에서는 여전히
   시작 외부의 기존 후크 우선/대체 동작.
5. 작업자 1 증거 지연이 차단되지 않음을 입증하는 다중 작업자 시작 테스트
   작업자-2는 첫 번째 트리거를 수신하지 못합니다.

## 알려진 검토 위험

- `waitForWorkerReadyAsync()`에는 현재 유용한 프롬프트 처리 안전성이 포함되어 있습니다.
  트리거를 더 일찍 이동하면 삭제하는 대신 프롬프트 가드를 유지해야 합니다.
  스타트업 이야기에서 나온 것들입니다.
- Notify-hook 사후 주입 검증은 의도적으로 작업자 확인을 거부합니다.
  창이 준비되지 않은 동안 전달됩니다. 시작 빠른 경로는 조기에 시도할 수 있습니다.
  하지만 확인과 증거 의미 체계를 별도로 유지해야 합니다.
- 시작 증거는 작업자 CLI에 따라 다릅니다. Codex ACK 전용 메시지로는 충분하지 않습니다.
  스타트업을 정착시키기 위한 클로드 리더 ACK가 그 증거가 될 수 있습니다. 검토자는 다음을 수행해야 합니다.
  타이밍 로그를 해석할 때 이러한 구별을 유지하십시오.
