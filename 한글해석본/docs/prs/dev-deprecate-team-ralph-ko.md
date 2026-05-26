# PR 초안: `omx team ralph` 지원 중단 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)을 독립형으로 유지

## 대상 지점
`dev`

## 제목
`omx team ralph` 지원 중단 및 연결된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)←Ralph 수명 주기 기계 제거

## 요약
이 PR은 기본적으로 연결된 `omx team ralph` 워크플로를 제거하고 `team`과 `ralph` 간의 명확한 구분을 복원합니다.

이 변경 후:
- `omx team ...` / `$team ...`은 지원되는 유일한 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 시작 경로입니다.
- `omx ralph ...` / `$ralph ...`은 별도의 명시적인 후속 조치로 계속 제공됩니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)은 더 이상 연결된 Ralph 상태를 생성, 동기화 또는 의존하지 않습니다.
- 레거시 `omx team ralph ...` 사용은 이제 자동으로 허용되는 대신 명확한 지원 중단 오류와 함께 실패합니다.

이는 의도한 제품 모델과 일치합니다. team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)은 코디네이션(Coordination)된 실행 및 검증 자체를 소유할 수 있는 반면 Ralph는 리더 또는 별도의 작업자가 나중에 실행하도록 선택할 수 있는 독립적인 지속성 루프로 유지됩니다.

## 왜
이전 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) ← Ralph 연결은 부풀어 오르는 오케스트레이션 접착제가되었습니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)과 Ralph 모드 상태 간의 브리지 코드
- 연결된 수명 주기/프로필 분기
- 알림 후크 터미널 동기화 동작
- 정리/종료 특수 케이스
- 두 개의 별도 도구여야 하는 동작에 대한 추가 테스트 및 문서

이러한 결합으로 인해 복잡성을 정당화할 만큼 충분한 가치를 제공하지 않으면 런타임을 추론하기가 더 어려워졌습니다.

## 무엇이 바뀌었나
### 제거됨
- 연결된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) ← Ralph 런타임 브리지
- 연결된 알림-훅 터미널 동기화
- 연결된 정리/종료 정책 동작
- `linked_ralph` 수명 주기 프로필 처리
- 광고/생성된 `omx team ralph ...` 출시 힌트
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 내의 연결된 Ralph 관련 테스트 및 호환성 경로

### 업데이트됨
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 도움말/사용법 텍스트는 이제 문서만 `omx team [N:agent-type] "<task>"`
- 계획, ralplan, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 및 심층 인터뷰 지침은 이제 내장된 `team -> ralph` 수명 주기가 아닌 **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 확인 경로**를 설명합니다.
- 후속 계획자 및 파이프라인 실행 힌트는 이제 일반 `omx team ...`을 생성합니다.
- 종료/재개/상태 흐름은 이제 독립형 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 의미론에서만 작동합니다.

### 행동 변화
- `omx team ralph ...`은 이제 명시적인 지원 중단 오류로 인해 거부됩니다.
  - 조율된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 실행을 위해 `omx team ...` 사용
  - 나중에 지속적인 후속 루프가 여전히 필요한 경우 `omx ralph ...`을 별도로 사용하십시오.

## 주목할만한 구현 영역
- `src/cli/team.ts`
- `src/cli/index.ts`
- `src/team/runtime.ts`
- `src/team/runtime-cli.ts`
- `src/team/api-interop.ts`
- `src/team/state.ts`
- `src/team/state/types.ts`
- `src/scripts/notify-hook.ts`
- `src/team/followup-planner.ts`
- `src/pipeline/stages/team-exec.ts`

## 삭제된 인터페이스
- `src/team/linked-ralph-bridge.ts`
- `src/scripts/notify-hook/linked-sync.ts`
- `src/cli/__tests__/team-linked-ralph.test.ts`
- `src/team/__tests__/linked-ralph-bridge.test.ts`
- `src/hooks/__tests__/notify-hook-linked-sync.test.ts`

## 영향
### 전에
- `omx team ralph ...`에는 특별한 런타임 동작이 있었습니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태는 연결된 Ralph 메타데이터를 전달할 수 있습니다.
- 알림 후크 및 종료 논리가 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) ← Ralph 분기를 연결했습니다.
- 문서/계획 아티팩트는 내장된 링크 확인 경로를 승격시켰습니다.

### 후에
- `omx team ...`은 코디네이션(Coordination)된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 실행만 실행합니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)은 자체 검증 파트과 종료 증거를 보유하고 있습니다.
- `omx ralph ...`은 분리되어 있고 명시적입니다.
- 리더나 별도의 작업자는 나중에 Ralph를 실행하도록 선택할 수 있습니다.
- 더 이상 내장된 연결된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)+Ralph 수명 주기가 없습니다.

## 확인
- [x] `npm run build`
- [x] CLI 구문 분석, 런타임/상태 동작, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) API 상호 운용성, 플래너 핸드오프 생성 및 후크/계약 기대치를 다루는 대상 테스트

확인 명령:
```bash
npm run build && node --test   dist/cli/__tests__/team.test.js   dist/team/__tests__/followup-planner.test.js   dist/pipeline/__tests__/stages.test.js   dist/hooks/__tests__/keyword-detector.test.js   dist/hooks/__tests__/consensus-execution-handoff.test.js   dist/hooks/__tests__/deep-interview-contract.test.js   dist/team/__tests__/runtime.test.js   dist/team/__tests__/state.test.js   dist/team/__tests__/api-interop.test.js
```

결과:
- `428 pass, 0 fail`

## 위험/주의사항
- 이는 여전히 `omx team ralph ...`을 호출하는 사용자를 위한 의도적인 CLI 동작 중단입니다.
- 이전의 자동 호환성 경로보다 중단이 이제 명시적이고 이해하기 쉽습니다.
- 별도의 Ralph 실행은 계속 지원되지만 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 의미 체계에 포함되지 않고 의도적으로 시작되어야 합니다.
