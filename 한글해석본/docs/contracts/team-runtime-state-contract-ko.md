# team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 상태 계약

문제: #1243 작업 스트림 A

이 문서는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태, 알림 후크, 사서함 섀도우, tmux 관찰 및 런타임 브리지 호환성 파일에서 반복적으로 표류하는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 상태에 대한 현재 권한 있는 소유자를 기록합니다.

## 권위 있는 소유자

### `pending`, `notified`, `delivered`, `failed`
- 지속 소유자: team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 파견 요청 상태.
- 기본 TypeScript 진입점:
  - `src/team/state/dispatch.ts`
  - `src/team/state.ts`
- 녹 다리 모양:
  - `crates/omx-runtime-core/src/dispatch.rs`
  - `src/runtime/bridge.ts`
- 규칙: `status` 디스패치는 신뢰할 수 있습니다. 타임스탬프 필드는 증거를 뒷받침하며 `status`과 모순되어서는 안 됩니다.

### `integrated`
- 지속 소유자: team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임으로 작성된 모니터 스냅샷 `integrationByWorker`.
- 기본 진입점:
  - `src/team/runtime.ts`
  - `src/team/state/monitor.ts`
  - `src/team/state.ts`
- 규칙: 작업자는 리더 헤드 승급/격리 확인이 성공한 후에만 `integrated`입니다. 사서함 배달 및 tmux 활동이 충분하지 않습니다.

### `stale`
- 아직 단일 공유 소유자가 없습니다. 이는 경계로 분할된 상태로 유지됩니다.
- 런타임 권한이 오래되었습니다.
  - `crates/omx-runtime-core/src/lib.rs`
  - `src/runtime/bridge.ts`
- 리더 활동 부실:
  - `src/team/leader-activity.ts`
- 세션 비활성:
  - `src/hooks/session.ts`
- 규칙: 부실 상태는 현재 경계에 따라 다르며 디스패치/통합 상태만으로는 추론되어서는 안 됩니다.

## 알림 후크 경계

`notify-hook`은 메일박스/tmux 증거를 관찰할 수 있지만 디스패치 성공은 여전히 ​​디스패치-요청 상태 전환을 통해 표시됩니다. 사서함 `notified_at` / `delivered_at`은 파견 계약 자체가 아닌 파생 증거입니다.

## 작업 흐름 A 첫 번째 변경

1. `src/team/contracts.ts`에서 디스패치 및 통합 상태 열거를 중앙 집중화합니다.
2. 신뢰할 수 있는 디스패치 `status`과 모순되지 않도록 지속 디스패치 타임스탬프를 삭제합니다.
3. 독자가 계약 승인 값만 사용할 수 있도록 지속적인 통합 스냅샷 상태를 삭제합니다.

이는 읽기/정규화 경계에서 계약을 명시적으로 만드는 동시에 첫 번째 수정 범위를 좁게 유지합니다.
