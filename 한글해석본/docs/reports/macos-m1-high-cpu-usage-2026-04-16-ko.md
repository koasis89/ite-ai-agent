## macOS M1 높은 CPU 사용량 조사

날짜: 2026-04-16

### 징후

Apple Silicon Mac에서 `omx --madmax --xhigh`을(를) 실행하면 `syspolicyd`이(가) 발생했습니다.
`sysmond`에서 눈에 띄는 CPU 변동과 함께 급증하는 경우가 많습니다.

### 근본 원인

지배적인 유발 요인은 `syspolicyd` 자체가 아니었습니다. OMX 시작이 시작되었습니다.
오래된 런타임 상태가 있는 저장소의 대체 감시자 경로로 인해
`leader_nudge` 폴링은 대략 250~350ms마다 실행됩니다.

리더 git을 읽는 `isLeaderRuntimeStale()`이라는 폴링 경로
여러 개의 단기 `git` 프로세스를 쉘아웃하여 활동:

- `git rev-parse --git-dir`
- `git symbolic-ref --quiet --short HEAD`
- `git rev-parse --git-path logs/HEAD`
- `git rev-parse --git-path logs/refs/heads/<branch>`
- `git show -s --format=%ct HEAD`

macOS에서는 수명이 짧은 `git` 각각의 exec가 코드 서명을 트리거하고
`syspolicyd`의 정책을 확인합니다. 반복되는 exec 버스트만으로도 충분했습니다.
시작하는 동안 정상적인 유휴 수준보다 훨씬 높은 `syspolicyd` CPU를 구동합니다.

### 반점

변경된 파일:

- `src/team/leader-activity.ts`

구현:

- 리더 Git 활동 조회를 위한 프로세스 로컬 캐시를 추가했습니다.
- 캐시 키는 `stateDir`에서 파생된 저장소 루트입니다.
- 캐시 TTL은 `1000 ms`과 `5000 ms` 사이로 제한됩니다.
- TTL은 `thresholdMs / 4`으로 계산되며 해당 범위로 고정됩니다.
- `readLeaderRuntimeSignalStatuses()`은 이제 캐시된 Git 활동 조회를 사용합니다.
  모든 폴링 주기에서 git-reading 경로를 호출하는 대신.

### 왜 이 모양인가

- 수정 사항은 확인된 핫스팟을 직접 대상으로 합니다.
- 오래된 감지 의미 체계를 유지합니다.
- 감시자 흐름이나 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 수명 주기 동작에 대한 광범위한 변경을 방지합니다.
- 차이를 작고 되돌릴 수 있게 유지합니다.

### 확인

패치 전 재생산 제어:

- `omx --madmax --xhigh`(`GhostVMPriv`)
- `notify-fallback-watcher`은(는) `poll_ms = 250`로 활성 상태입니다.
- `leader_nudge` 반복적으로 발사
- `syspolicyd`은 `66% CPU` 주변에서 관찰되었습니다.
- `fs_usage -f exec`에서 `git` 실행 버스트가 반복적으로 표시되었습니다.

패치 후 재생산 제어:

- 동일한 저장소 및 시작 명령
- 동일한 `leader_nudge` 루프가 여전히 활성 상태입니다.
- 4초 시작 후 샘플링 기간이 관찰되었습니다. `0` `git` execs
- `syspolicyd`의 CPU 사용량이 낮은 한 자릿수로 떨어졌습니다.

### 남은 위험

- 오래된 `.omx/state`은 `leader_nudge` 폴링을 계속 활성 상태로 유지할 수 있습니다. 이번 패치
  주요 git-exec 핫스팟을 제거하지만 폴링 루프를 중지하지는 않습니다.
- 다른 동기식 Git 메타데이터 읽기는 여전히 다음과 같은 별도의 경로에 존재합니다.
  작전 이벤트 강화 및 HUD 렌더링은 더 이상 주요 기능이 아니었습니다.
  재현된 창에서 지배적인 시작 핫스팟.
- 이제 Git 활동의 최신 상태가 잠시 캐시되므로 오래된 감지가 지연될 수 있습니다.
  최대 구성된 캐시 TTL입니다.
