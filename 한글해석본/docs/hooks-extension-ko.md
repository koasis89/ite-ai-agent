# Hooks 확장(사용자 정의 플러그인)

OMX는 `.omx/hooks/*.mjs` 아래의 사용자 플러그인에 대한 추가 후크 확장 지점을 지원합니다.

`plugins/oh-my-codex`의 공식 패키지 Codex 플러그인도 플러그인 범위로 제공됩니다.
동반 메타데이터 파일(`.mcp.json`, `.app.json`)이므로 플러그인 번들이 이를 설명합니다.
플러그인 루트 내부의 인터페이스. 네이티브/런타임 후크는 의도적으로 분리되어 있습니다.
오히려 런타임/구성 측(`.codex/hooks.json` + `.omx/hooks/*.mjs`)에 유지됩니다.
설치 가능한 플러그인 매니페스트 내부보다

기본 Codex 후크 소유권은 별도로 문서화되어 있습니다.
[Codex native hook mapping](./codex-native-hooks.md). 간단히 말해서:

- `.codex/hooks.json` = `omx setup`에 의해 설치된 네이티브 Codex 후크 등록
- `.omx/hooks/*.mjs` = 런타임/네이티브 이벤트에 의해 전달된 OMX 플러그인 후크
- `omx tmux-hook` / 알림 후크 / 파생된 감시자 = tmux/런타임 폴백 인터페이스

`omx setup`은 `.codex/hooks.json`을 공유 소유권 파일로 처리합니다. OMX 관리 파일만 새로 고칩니다.
`dist/scripts/codex-native-hook.js`을 호출하고 사용자 후크 항목을 유지하는 래퍼 항목
같은 파일. `omx uninstall`은 OMX 관리 래퍼만 제거하고 `.codex/hooks.json`은 그대로 둡니다.
사용자 후크가 남아 있을 때 배치합니다.

> 호환성 보장: `omx tmux-hook`은(는) 완전히 지원되며 변경되지 않습니다.
> 새로운 `omx hooks` 명령 그룹은 추가되며 tmux-hook 워크플로를 대체하지 **않습니다**.

## 빠른 시작

```bash
omx hooks init
omx hooks status
omx hooks validate
omx hooks test
```

그러면 다음 위치에 비계 플러그인이 생성됩니다.

- `.omx/hooks/sample-plugin.mjs`

## 활성화 모델

플러그인은 **기본적으로 활성화되어 있습니다**.

플러그인 디스패치를 ​​명시적으로 비활성화합니다.

```bash
export OMX_HOOK_PLUGINS=0
```

선택적 제한 시간 코디네이션(Coordination)(기본값: 1500ms):

```bash
export OMX_HOOK_PLUGIN_TIMEOUT_MS=1500
```

## 네이티브 이벤트 파이프라인(v1)

네이티브/파생 플러그인 이벤트는 두 곳에서 발생합니다.

1. 기존 수명 주기/알림 경로
2. 네이티브 Codex 후크 진입점 디스패치(`dist/scripts/codex-native-hook.js`)

OMX 플러그인에 노출된 현재 이벤트 어휘:

- `session-start`
- `keyword-detector`
- `pre-tool-use`
- `post-tool-use`
- `stop`
- `session-end`
- `turn-complete`
- `session-idle`

OMX는 원시 Codex 후크 이름을 직접 노출하는 대신 기존 이벤트 어휘를 유지합니다.
이를 통해 기본 Codex 후크와 대체/파생 경로가 하나의 공유 플러그인/런타임 인터페이스을 제공할 수 있습니다.

클로힙 중심의 운영 라우팅(Routing)에 대해서는 [Clawhip Event Contract](./clawhip-event-contract.md)을 참조하세요.

봉투 필드에는 다음이 포함됩니다.

- `schema_version: "1"`
- `event`
- `timestamp`
- `source`(`native` 또는 `derived`)
- `context`
- 선택적 ID: `session_id`, `thread_id`, `turn_id`, `mode`

## 파생 신호(선택)

최선 노력 파생 이벤트는 기본적으로 제한되고 비활성화됩니다.

```bash
export OMX_HOOK_DERIVED_SIGNALS=1
```

파생된 신호에는 다음이 포함됩니다.

- `needs-input`
- `pre-tool-use`
- `post-tool-use`

파생 이벤트에는 다음과 같은 라벨이 지정됩니다.

- `source: "derived"`
- `confidence`
- 파서별 컨텍스트 힌트

## team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 안전 행동

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자 세션(`OMX_TEAM_WORKER` 세트)에서는 기본적으로 플러그인 부작용을 건너뜁니다.
이렇게 하면 리드 세션을 표준 부작용 이미터로 유지하고 중복 전송을 방지합니다.

## 플러그인 계약

각 플러그인은 다음을 내보내야 합니다.

```js
export async function onHookEvent(event, sdk) {
  // handle event
}
```

SDK 인터페이스에는 다음이 포함됩니다.

- `sdk.tmux.sendKeys(...)`
- `sdk.log.info|warn|error(...)`
- `sdk.state.read|write|delete|all(...)`(플러그인 네임스페이스 범위)
- `sdk.omx.session.read()`
- `sdk.omx.hud.read()`
- `sdk.omx.notifyFallback.read()`
- `sdk.omx.updateCheck.read()`

`sdk.omx`은 1단계에서 의도적으로 범위를 좁히고 읽기 전용입니다. 이 도우미들은 다음을 읽습니다.
현재 작업공간에 대한 repo-root `.omx/state/*.json` 런타임 파일.

호환성 참고 사항:

- `omx tmux-hook`은 `sdk.omx.tmuxHook.*`이 아닌 CLI/런타임 워크플로로 유지됩니다.
- 1을 통과하면 `sdk.omx.tmuxHook.*`을 추가하지 않습니다. tmux 플러그인 동작이 `sdk.tmux.sendKeys(...)`에 유지됩니다.
- 1번을 통과하면 일반 `sdk.omx.readJson(...)`, `sdk.omx.list()` 또는 `sdk.omx.exists()`을 추가하지 않습니다.
- 1을 통과하면 `sdk.pluginState`을 추가하지 않습니다. `sdk.state`을 계속 사용하세요

## 로그

플러그인 디스패치 및 플러그인 로그는 다음 위치에 기록됩니다.

- `.omx/logs/hooks-YYYY-MM-DD.jsonl`
