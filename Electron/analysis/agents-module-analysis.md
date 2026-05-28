# src/agents/ 모듈 분석

## 폴더 구조

```
src/agents/
├── definitions.ts     # 에이전트 정의 레지스트리 (AGENT_DEFINITIONS)
├── native-config.ts   # TOML 설정 생성 + ~/.codex/agents/ 설치기
├── policy.ts          # 카탈로그 기반 설치 정책 필터
└── __tests__/         # 단위 테스트
```

---

## 모듈 역할 개요

| 파일 | 핵심 역할 |
|------|-----------|
| `definitions.ts` | 모든 에이전트의 정적 메타데이터(이름·포스처·모델·도구 권한) 선언 |
| `native-config.ts` | 에이전트 메타데이터 + 프롬프트 파일 → Codex TOML 설정 파일 조립·설치 |
| `policy.ts` | 카탈로그 manifest 기준으로 설치 가능한 에이전트 집합 결정 |

---

## 파일별 상세 분석

### 1. `definitions.ts` — 에이전트 레지스트리

**목적**: OMX에서 사용하는 모든 역할 에이전트의 정적 속성을 단일 레코드(`AGENT_DEFINITIONS`)로 관리한다.

#### `AgentDefinition` 인터페이스

```ts
interface AgentDefinition {
  name: string;
  description: string;
  reasoningEffort: 'low' | 'medium' | 'high';
  posture: 'frontier-orchestrator' | 'deep-worker' | 'fast-lane';
  modelClass: 'frontier' | 'standard' | 'fast';
  routingRole: 'leader' | 'specialist' | 'executor';
  tools: 'read-only' | 'analysis' | 'execution' | 'data';
  category: 'build' | 'review' | 'domain' | 'product' | 'coordination';
}
```

#### 에이전트 목록 (카테고리별)

**build 카테고리** — 구현·분석 실행 레인

| 에이전트 | posture | modelClass | reasoningEffort | tools |
|---------|---------|------------|-----------------|-------|
| `explore` | fast-lane | fast | low | read-only |
| `analyst` | frontier-orchestrator | frontier | medium | analysis |
| `planner` | frontier-orchestrator | frontier | medium | analysis |
| `architect` | frontier-orchestrator | frontier | high | read-only |
| `debugger` | deep-worker | standard | high | analysis |
| `executor` | deep-worker | standard | medium | execution |
| `team-executor` | deep-worker | frontier | medium | execution |
| `verifier` | frontier-orchestrator | standard | high | analysis |

**review 카테고리** — 코드 리뷰 레인

| 에이전트 | posture | modelClass | reasoningEffort | 설명 |
|---------|---------|------------|-----------------|------|
| `style-reviewer` | fast-lane | fast | low | 포맷·네이밍·린트 규칙 |
| `quality-reviewer` | frontier-orchestrator | standard | medium | 로직 결함·유지보수성·안티패턴 |
| `api-reviewer` | frontier-orchestrator | standard | medium | API 계약·버전·하위 호환성 |
| `security-reviewer` | frontier-orchestrator | frontier | medium | 취약점·신뢰 경계·인증인가 |
| `performance-reviewer` | frontier-orchestrator | standard | medium | 핫스팟·복잡도·메모리/레이턴시 |
| `code-reviewer` | frontier-orchestrator | frontier | high | 전체 관심사 종합 리뷰 |

**domain 카테고리** — 도메인 전문가 레인

| 에이전트 | posture | modelClass | reasoningEffort | tools | 설명 |
|---------|---------|------------|-----------------|-------|------|
| `dependency-expert` | frontier-orchestrator | standard | high | analysis | 외부 SDK/API/패키지 평가 |
| `test-engineer` | deep-worker | frontier | medium | execution | 테스트 전략·커버리지·flaky 테스트 |
| `quality-strategist` | frontier-orchestrator | standard | medium | analysis | 품질 전략·릴리스 준비도·리스크 |
| `build-fixer` | deep-worker | standard | high | execution | 빌드/타입 실패 해결 |
| `designer` | deep-worker | standard | high | execution | UX/UI 아키텍처·인터랙션 설계 |
| `writer` | fast-lane | standard | high | execution | 문서·마이그레이션 노트·사용자 가이드 |
| `qa-tester` | deep-worker | standard | low | execution | CLI/서비스 런타임 인터랙티브 검증 |
| `git-master` | deep-worker | standard | high | execution | 커밋 전략·히스토리 정리·리베이스 |
| `code-simplifier` | deep-worker | frontier | high | execution | 동작 변경 없이 코드 단순화 |
| `researcher` | fast-lane | standard | high | analysis | 외부 문서·레퍼런스 조사 (gpt-5.4-mini 고정) |

**product 카테고리** — 제품 관리 레인

| 에이전트 | 설명 |
|---------|------|
| `product-manager` | 문제 프레이밍·페르소나/JTBD·PRD |
| `ux-researcher` | 휴리스틱 감사·사용성·접근성 |
| `information-architect` | 분류체계·내비게이션·발견가능성 |
| `product-analyst` | 제품 지표·퍼널 분석·실험 |

**coordination 카테고리** — 조율 특수 에이전트

| 에이전트 | 설명 |
|---------|------|
| `prometheus-strict-metis` | 요구사항 인터뷰·모호성 매핑 |
| `prometheus-strict-momus` | 플랜 비판·리스크 도전자 |
| `prometheus-strict-oracle` | 구현 준비도 검증·핸드오프 판정 |
| `critic` | 플랜/설계 비판적 검토 |
| `scholastic` | 존재론적 추론 리뷰어·스콜라적 비평 |
| `vision` | 이미지/스크린샷/다이어그램 분석 |

#### 헬퍼 함수

```ts
getAgent(name: string): AgentDefinition | undefined
getAgentsByCategory(category): AgentDefinition[]
getAgentNames(): string[]
```

---

### 2. `native-config.ts` — TOML 설정 조립기 + 설치기

**목적**: `AgentDefinition` + `prompts/<name>.md` 파일 내용을 결합하여 Codex CLI가 읽는 `.toml` 에이전트 설정을 생성하고 `~/.codex/agents/`에 설치한다.

#### 포스처 오버레이 (`POSTURE_OVERLAYS`)

각 posture 값에 따라 에이전트 프롬프트에 동적으로 추가되는 XML 블록:

| posture | 핵심 지침 |
|---------|----------|
| `frontier-orchestrator` | 인텐트 분류 우선, 위임 선호, 설계 결함 사전 도전 |
| `deep-worker` | 직접 실행 편향, 기존 패턴 따르기, 검증 필수 |
| `fast-lane` | 빠른 트리아지·경량 합성, 범위 확장 시 에스컬레이션 |

#### 모델 클래스 오버레이 (`MODEL_CLASS_OVERLAYS`)

| modelClass | 핵심 지침 |
|-----------|----------|
| `frontier` | 조율·트레이드오프 추론에 frontier 모델 조종성 활용 |
| `standard` | 자율성과 명확한 경계 균형 |
| `fast` | 빠른 검색·합성·라우팅 선호, 깊은 작업은 에스컬레이션 |

#### 모델 해결 로직

```
resolveAgentModel(agent, options):
  ├─ agent.name === 'researcher' → EXACT_GPT_5_4_MINI_MODEL
  ├─ agent.name === 'executor'  → resolveFrontierModel()
  ├─ modelClass === 'frontier'  → resolveFrontierModel()
  ├─ modelClass === 'fast'      → getSparkDefaultModel()
  └─ modelClass === 'standard'  → resolveStandardModel()

resolveFrontierModel():
  1. config.toml의 root model 읽기 (getRootModelName)
  2. 없으면 getMainDefaultModel() 폴백

resolveStandardModel():
  1. OMX_DEFAULT_STANDARD_MODEL 환경변수 확인
  2. 없으면 getStandardDefaultModel() 폴백
```

#### 핵심 함수 흐름

```
composeRoleInstructions(promptContent, metadata, resolvedModel)
  └─ stripFrontmatter(promptContent)   // YAML 프론트매터 제거
  └─ + POSTURE_OVERLAYS[posture]       // 포스처 오버레이 추가
  └─ + MODEL_CLASS_OVERLAYS[modelClass]
  └─ + EXACT_MINI_MODEL_OVERLAY        // gpt-5.4-mini 전용 (해당 시)
  └─ + "## OMX Agent Metadata" 섹션    // role/posture/model_class/resolved_model

generateAgentToml(agent, promptContent, options)
  ├─ resolveAgentModel(agent, options) → model 문자열
  ├─ composeRoleInstructions(...)      → developer_instructions
  └─ generateStandaloneAgentToml(config) → TOML 문자열

installNativeAgentConfigs(pkgRoot, options)
  ├─ getInstallableNativeAgentNames(catalogManifest) → 설치 대상 집합
  │     (allowUncatalogedDefinitions=true 시 AGENT_DEFINITIONS 전체 사용)
  ├─ for each name (정렬 순):
  │   ├─ AGENT_DEFINITIONS[name] 없으면 skip (verbose 로그)
  │   ├─ prompts/<name>.md 없으면 skip (verbose 로그)
  │   ├─ force=false + 기존 .toml 존재 시 skip
  │   └─ generateAgentToml() → writeFile(~/.codex/agents/<name>.toml)
  └─ return count (설치된 파일 수)

options:
  force              기존 파일 덮어쓰기 (기본 false)
  dryRun             실제 파일 쓰기 생략 (기본 false)
  verbose            진행 로그 출력 (기본 false)
  agentsDir          대상 디렉토리 오버라이드 (기본 codexAgentsDir())
  catalogManifest    외부에서 주입된 manifest (없으면 readCatalogManifest() 호출)
  allowUncatalogedDefinitions  카탈로그 필터 우회 — 테스트·개발용
```

#### 특수 모델 처리

- **`researcher`**: 항상 `gpt-5.4-mini` 고정 (EXACT_RESEARCHER_MODEL)
- **`executor`**: 항상 frontier 모델 사용 (표준 에이전트 중 frontier로 격상)
- **gpt-5.4-mini 감지 시**: `EXACT_MINI_MODEL_OVERLAY` 추가 (명확한 실행 순서 지시)

---

### 3. `policy.ts` — 설치 정책 필터

**목적**: 카탈로그 manifest를 기반으로 어떤 에이전트를 native config로 설치할지 결정한다.

#### 상수

```ts
NON_NATIVE_AGENT_PROMPT_ASSETS = new Set([
  'explore-harness',   // 설치 자산이지만 네이티브 에이전트 아님
  'sisyphus-lite',
  'team-orchestrator',
])
```

#### 주요 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `isNativeAgentInstallableStatus(status)` | `boolean` | `'active'` 또는 `'internal'`이면 설치 가능 |
| `getCatalogAgentStatusByName(manifest)` | `Map<string, CatalogEntryStatus>` | 이름 → 상태 맵 |
| `getCatalogAgentByName(manifest)` | `Map<string, CatalogAgentEntry>` | 이름 → 엔트리 맵 |
| `getInstallableNativeAgentNames(manifest)` | `Set<string>` | 설치 가능 에이전트 이름 집합 |
| `getNonInstallableNativeAgentNames(manifest)` | `Set<string>` | 설치 불가능 에이전트 이름 집합 |
| `isSetupPromptAssetName(promptName, manifest)` | `boolean` | 설정 프롬프트 자산인지 (에이전트 + 비네이티브 포함) |
| `assertNativeAgentCanonicalTargets(manifest)` | `void` (throws) | alias/merged 에이전트의 canonical 유효성 검증 |

#### `assertNativeAgentCanonicalTargets` 검증 규칙

```
for each agent where status === 'alias' or 'merged':
  1. agent.canonical 존재 여부 확인 (없으면 throw)
  2. canonical 에이전트가 manifest에 존재 여부 확인
  3. canonical 에이전트가 installable 상태인지 확인
```

---

## 모듈 간 호출 관계

```
installNativeAgentConfigs()          ← 외부 (setup 명령어)
        │
        ├─ getInstallableNativeAgentNames(manifest)
        │         └─ policy.ts: isNativeAgentInstallableStatus()
        │
        ├─ AGENT_DEFINITIONS[name]   ← definitions.ts
        │
        ├─ readFile(prompts/<name>.md)
        │
        └─ generateAgentToml(agent, promptContent, options)
                  └─ native-config.ts:
                       ├─ resolveAgentModel()
                       ├─ composeRoleInstructions()
                       │    └─ stripFrontmatter()
                       │    └─ POSTURE_OVERLAYS[posture]
                       │    └─ MODEL_CLASS_OVERLAYS[modelClass]
                       └─ generateStandaloneAgentToml()

agents/policy.ts ← 외부 호출처:
  - src/agents/native-config.ts (installNativeAgentConfigs)
  - src/catalog/ (getCatalogAgentByName 등 재사용)
```

---

## 외부 의존성

```
agents/ → config/models.ts        # getMainDefaultModel, getSparkDefaultModel 등
agents/ → config/generator.ts     # getRootModelName
agents/ → catalog/reader.ts       # readCatalogManifest
agents/ → catalog/schema.ts       # CatalogManifest, CatalogAgentEntry 타입
agents/ → utils/paths.ts          # codexAgentsDir()
```

---

## 타입 요약

| 타입 | 위치 | 설명 |
|------|------|------|
| `AgentDefinition` | definitions.ts | 에이전트 정적 메타데이터 |
| `GeneratedNativeAgentConfig` | native-config.ts | TOML 생성 입력 구조체 |
| `AgentModelResolutionOptions` | native-config.ts | 모델 해결 옵션 (codexHomeOverride, env) |
| `RoleInstructionMetadata` | native-config.ts (internal) | 프롬프트 조립 시 메타데이터 |

---

## 설계 원칙

1. **데이터-코드 분리**: 에이전트 속성은 `definitions.ts`에 선언형으로 집중, 동적 생성 로직은 `native-config.ts`에 격리
2. **카탈로그 우선 필터링**: `definitions.ts`에 정의된 에이전트라도 `catalog/manifest.json`에서 `active`/`internal` 상태여야 설치됨
3. **프롬프트 조립 레이어**: 기본 프롬프트(`prompts/<name>.md`) + 포스처 오버레이 + 모델 클래스 오버레이 + 메타데이터 섹션을 조합하여 최종 `developer_instructions` 구성
4. **특수 에이전트 예외 처리**: `researcher`는 mini 모델 고정, `executor`는 frontier 모델 격상
5. **dry-run / force 안전망**: `dryRun`으로 변경 없이 사전 확인, `force`로 명시적 덮어쓰기를 요구하여 실수 방지
6. **카탈로그 우회 탈출구**: `allowUncatalogedDefinitions=true`로 테스트·개발 시 카탈로그 필터 없이 전체 AGENT_DEFINITIONS 설치 가능
7. **메타데이터 자기 기술**: 생성된 TOML의 `developer_instructions` 말미에 `## OMX Agent Metadata` 섹션을 주입하여 에이전트 자신이 자신의 역할·모델·posture를 알 수 있게 함
