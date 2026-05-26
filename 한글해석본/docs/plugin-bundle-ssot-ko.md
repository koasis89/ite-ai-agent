# 플러그인 번들 SSOT 계약

저장소는 각 플러그인/설정 자산 유형에 대해 하나의 표준 저작 인터페이스을 유지하고 `plugins/oh-my-codex`을 생성되거나 확인된 플러그인 출력으로 처리합니다.

## 정식 뿌리

- **플러그인 기술:** 루트 `skills/<name>/SKILL.md`은 표준입니다. `plugins/oh-my-codex/skills/<name>/`의 플러그인 미러는 `npm run sync:plugin`에 의해 새로 고쳐지고 `npm run verify:plugin-bundle`에 의해 확인됩니다.
- **플러그인 스킬(Skill) 멤버십:** `templates/catalog-manifest.json`은 설치 가능한 카탈로그 스킬을 제어합니다. 활성/내부 스킬과 설정 전용 정책 추가에는 정식 루트 스킬 디렉터리와 플러그인 미러가 있어야 합니다.
- **플러그인 MCP 메타데이터:** `src/config/omx-first-party-mcp.ts`은 표준입니다. `plugins/oh-my-codex/.mcp.json`은 `buildOmxPluginMcpManifest()`과 일치해야 합니다.
- **플러그인 매니페스트 버전 및 경로:** `package.json`은 플러그인 버전의 표준입니다. 플러그인 매니페스트는 `./skills/`, `./.mcp.json` 및 `./.app.json`을 가리켜야 합니다.
- **기본 에이전트(Agent) 및 프롬프트:** 루트 `prompts/` 및 `src/agents/definitions.ts`은 레거시 설정 모드에 대한 설정 소유 정식 소스입니다. 공식 플러그인은 의도적으로 플러그인 범위의 `agents`, `prompts` 또는 후크를 제공하지 않습니다. 플러그인 설정은 기존 OMX 관리 프롬프트 및 기본 에이전트 파일을 보관/제거하므로 사용자가 오래된 혼합 인터페이스을 유지하지 않습니다.

## 명령

```bash
npm run sync:plugin           # mutate plugin mirror/metadata from canonical roots
npm run verify:plugin-bundle  # non-mutating SSOT check for CI/review
npm run sync:plugin:check     # compatibility alias for the same non-mutating check
```

`prepack`은 패키징하기 전에 동기화 및 확인을 실행하지만, 기여자는 검토 전에 비변형 확인을 실행해야 릴리스 시간 동기화가 오래된 플러그인 아티팩트를 숨기지 않습니다.

## 스킬 추가 또는 변경

1. `skills/<name>/SKILL.md`에서 루트 스킬을 편집하거나 추가합니다.
2. `templates/catalog-manifest.json` 및 `src/catalog/manifest.json`의 기술 항목을 추가/업데이트합니다.
3. `npm run build && npm run sync:plugin`을(를) 실행하세요.
4. `npm run verify:plugin-bundle`을(를) 실행하세요.

플러그인에 표시되어서는 안 되는 루트 스킬 디렉터리는 카탈로그에 `alias` 또는 `merged`로 표시되어야 합니다. 그렇지 않으면 루트 디렉터리가 설치 가능하지도 않고 명시적으로 제외되지도 않기 때문에 플러그인 번들 검증 프로그램이 실패합니다.

## 네이티브 에이전트 SSOT

네이티브 에이전트는 플러그인 범위의 번들 자산이 아닌 설정 소유 자산입니다. 생성된 기본 에이전트 TOML 및 프롬프트 파일은 의도적으로 다른 설정 정책을 사용합니다.

1. `templates/catalog-manifest.json` 및 `src/catalog/manifest.json`은 `active` 또는 `internal` 상태의 설치 가능한 기본 에이전트 TOML을 선택합니다.
2. `src/agents/definitions.ts`은 각 기본 에이전트의 메타데이터, 모델 파트, 상태, 라우팅(Routing) 역할 및 도구 상태를 정의합니다.
3. `prompts/<name>.md`은 즉각적인 지침을 제공합니다. 카탈로그된 프롬프트 파일은 에이전트 상태가 `merged`, `alias` 또는 `deprecated`인 경우에도 설정 소유 프롬프트 자산으로 유지됩니다. 하네스/오케스트레이터 프롬프트와 같은 명시적인 비네이티브 프롬프트 자산도 설정 소유입니다.
4. `src/agents/native-config.ts`은 정의에서 기본 Codex TOML을 생성하고 활성/내부 기본 에이전트에 대한 프롬프트만 생성합니다.
5. `omx setup`은 생성된 TOML을 선택한 범위에 대해 `.codex/agents/<name>.toml`에 쓰고 설치 소유 프롬프트를 `.codex/prompts/<name>.md`에 설치합니다.

검토 또는 출시 전에 돌연변이가 없는 네이티브 에이전트 검증 도구를 실행하세요.

```bash
npm run verify:native-agents
```

설치 가능한 카탈로그 에이전트에 정의 또는 프롬프트가 누락된 경우, 정의에 카탈로그 행이 누락된 경우, 병합/별칭 정식 대상이 설치 가능한 에이전트로 직접 확인되지 않는 경우, 프롬프트 파일이 카탈로그된 기본 에이전트도 아니고 명시적인 설정 프롬프트 자산도 아닌 경우 또는 생성된 TOML이 필수 메타데이터를 잃어버린 경우 검증 프로그램이 실패합니다.

`omx setup`은(는) 생성된 기본 에이전트 TOML을 안전하게 수렴합니다. 일반 설정은 동일한 카탈로그 에이전트 이름에 대해 정확한 `# oh-my-codex agent: <name>` 생성 마커를 전달하는 경우에만 설치 불가능한 오래된 TOML을 제거합니다. 사용자가 작성했거나 모호한 TOML은 일반 설정 중에 보존됩니다. `--force`는 설치 불가능한 오래된 기본 에이전트 파일에 대한 명시적 파괴적 정리 경로로 유지됩니다. 프롬프트 정리는 프롬프트 자산 정책을 사용하므로 설치 가능한 기본 에이전트 TOML이 아닌 경우에도 카탈로그화된 프롬프트 파일과 명시적 설정 프롬프트 자산이 보존됩니다.

공식 플러그인 매니페스트에서는 `agents`, `prompts` 및 `hooks`을 계속 생략해야 합니다. 레거시 설정 모드는 프롬프트/네이티브 에이전트를 설치하는 반면, 플러그인 설정 모드는 플러그인 범위 프롬프트 또는 에이전트 자산을 새로 고치는 대신 보관된 레거시 복사본을 제거합니다.
