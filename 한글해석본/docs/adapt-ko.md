# `omx adapt`

`omx adapt <target>`은 지속적인 외부 에이전트(Agent) 적응을 위한 OMX 소유 인터페이스입니다.

공유 기반 동작:

- `probe`, `status`, `init`, `envelope` 및 `doctor`용 CLI 스캐폴드
- 명시적 소유권이 있는 공유 기능 보고(`omx-owned`, `shared-contract`, `target-observed`)
- `.omx/adapters/<target>/...` 아래의 어댑터 소유 경로
- `.omx/state/...`을 건드리지 않는 공유 봉투/상태/의사/초기 동작

OpenClaw 후속 동작:

- `omx adapt openclaw probe`은 기존 로컬 OpenClaw 구성/환경/게이트웨이 증거를 관찰합니다.
- `omx adapt openclaw status`은 env 게이트, 구성 소스, 후크 매핑 및 명령 게이트웨이 옵트인에서 로컬 어댑터 상태를 합성합니다.
- `omx adapt openclaw envelope`에는 기존 OMX와 OpenClaw 이벤트 매핑에 대한 라이프사이클 브리지 메타데이터가 포함되어 있습니다.
- `omx adapt openclaw init --write`은(는) 여전히 `.omx/adapters/openclaw/...`에서만 씁니다.

현재 목표:

- `openclaw`
- `hermes`

이 작업 트리의 Hermes 후속 동작:

- `probe`은 외부 Hermes ACP, 게이트웨이 및 세션 저장소 증거를 검사합니다.
- `status`은 관찰 가능한 Hermes 파일에서만 `unavailable` / `installed` / `degraded` / `running`를 합성합니다.
- `envelope`에는 ACP 명령, 수명 주기 브리지 지침 및 상태 명령에 대한 Hermes 부트스트랩 메타데이터가 포함되어 있습니다.
- `init --write`은 여전히 ​​`.omx/adapters/hermes/...`에서만 씁니다. Hermes 런타임 파일은 읽기 전용 입력으로 유지됩니다.

예:

```bash
omx adapt openclaw probe
omx adapt hermes status --json
omx adapt openclaw init --write
omx adapt hermes envelope --json
```

기초 제약:

- 얇은 어댑터 인터페이스만 있고 양방향 제어 평면은 아님
- `.omx/state/...`에 직접 쓰지 않습니다.
- 외부 런타임 내부에 직접 쓰지 않음
- 목표 능력 보고는 비대칭으로 유지됩니다. OMX는 자신이 소유한 것, 공유된 것, 대상이 관찰한 것만 보고합니다.
- OpenClaw 상태는 지역 증거일 뿐입니다. 다운스트림 런타임 승인 또는 실행을 요구하지 않습니다.
- 명령 게이트웨이 준비에는 여전히 `OMX_OPENCLAW_COMMAND=1`이 필요합니다.

Hermes 관련 증거 검색은 `HERMES_HOME`과 재정의 가능한 Hermes 소스 루트(`OMX_ADAPT_HERMES_ROOT`)를 사용하므로 OMX는 벤더링이나 변경 없이 외부 런타임을 검사할 수 있습니다.
