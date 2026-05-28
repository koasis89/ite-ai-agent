# src/adapt/ 모듈 분석

## 폴더 구조

```
src/adapt/
├── contracts.ts    # 모든 타입 정의 (AdaptTarget, Report/Envelope 인터페이스)
├── paths.ts        # 어댑터 경로 해결 (.omx/adapters/<target>/...)
├── registry.ts     # 타겟 디스크립터 + capability 선언
├── index.ts        # 서브커맨드 구현 (probe/status/envelope/doctor/init)
├── openclaw.ts     # OpenClaw 타겟 어댑터 구현
├── hermes.ts       # Hermes 타겟 어댑터 구현
└── __tests__/      # 단위 테스트
```

---

## 모듈 역할 개요

| 파일 | 핵심 역할 |
|------|-----------|
| `contracts.ts` | 어댑터 시스템 전체의 타입 계약 선언 |
| `paths.ts` | `.omx/adapters/<target>/` 경로 집합 계산 |
| `registry.ts` | 지원 타겟(openclaw/hermes)의 디스크립터 + capability 정의 |
| `index.ts` | probe/status/envelope/doctor/init 서브커맨드 공통 조립 로직 |
| `openclaw.ts` | OpenClaw config/gateway/hook 관찰·보고 구현 |
| `hermes.ts` | Hermes ACP/gateway/session-store 증거 수집·보고 구현 |

---

## 시스템 개요: `omx adapt` 명령어

`src/adapt/`는 OMX가 외부 런타임(OpenClaw, Hermes)과 연동하는 어댑터 레이어이다.

```
omx adapt <target> <subcommand>
          │         │
          │         ├─ probe     → buildAdaptProbeReportForTarget()
          │         ├─ status    → buildAdaptStatusReportForTarget()
          │         ├─ envelope  → buildAdaptEnvelopeForTarget()
          │         ├─ doctor    → buildAdaptDoctorReportForTarget()
          │         └─ init      → (initOpenClawFoundation 등)
          │
          └─ openclaw | hermes
```

**핵심 설계 원칙**:
- OMX가 직접 쓰는 위치는 `.omx/adapters/<target>/`만 허용
- 타겟 런타임 내부나 `.omx/state/`에는 직접 쓰기 금지
- capability는 `omx-owned` / `shared-contract` / `target-observed` 세 가지로 소유권 분리

---

## 파일별 상세 분석

### 1. `contracts.ts` — 타입 계약

**목적**: adapt 모듈 전체가 공유하는 타입을 단일 파일에 집중 선언한다.

#### 핵심 상수

```ts
ADAPT_TARGETS = ['openclaw', 'hermes']
ADAPT_SUBCOMMANDS = ['probe', 'status', 'init', 'envelope', 'doctor']
ADAPT_SCHEMA_VERSION = "1.0"
```

#### Capability 타입

```ts
AdaptCapabilityOwnership = 'omx-owned' | 'shared-contract' | 'target-observed'
AdaptCapabilityStatus    = 'ready' | 'stub' | 'unsupported'

AdaptCapabilityReport {
  id, label, ownership, status, summary
}
```

#### 경로 집합

```ts
AdaptPathSet {
  adapterRoot:     .omx/adapters/<target>/
  configPath:      .omx/adapters/<target>/adapter.json
  envelopePath:    .omx/adapters/<target>/envelope.json
  reportsDir:      .omx/adapters/<target>/reports/
  probeReportPath: .omx/adapters/<target>/reports/probe.json
  statusReportPath:.omx/adapters/<target>/reports/status.json
}
```

#### 보고서 타입 계층

```
AdaptProbeReport          ← target + foundation + runtime 관찰 전체
AdaptStatusReport         ← adapter 초기화 상태 + runtime 상태
AdaptEnvelope             ← planning 링크 + capabilities + constraints 포함
AdaptDoctorReport         ← issues[] + nextSteps[]
AdaptInitResult           ← write 결과 + envelope 포함
```

#### OpenClaw 특화 타입

```ts
AdaptOpenClawGatewayObservation   # 게이트웨이 설정 관찰
AdaptOpenClawHookObservation      # 훅 이벤트 매핑 상태 (wired/blocked/unmapped)
AdaptOpenClawMetadata             # config/gateways/hooks/lifecycleBridge 전체
```

---

### 2. `paths.ts` — 경로 해결

**목적**: 어댑터 아티팩트가 위치할 경로 집합을 계산한다.

```ts
resolveAdaptPaths(cwd, target): AdaptPathSet
  // 내부: omxAdaptersDir(cwd) → join(..., target) → 각 하위 경로 결합
```

의존: `../utils/paths.js` → `omxAdaptersDir()`

---

### 3. `registry.ts` — 타겟 디스크립터

**목적**: 각 타겟의 displayName, summary, followupHint, capabilities를 중앙 관리한다.

#### 공통 Foundation Capabilities (3개)

| id | ownership | status | 설명 |
|----|-----------|--------|------|
| `omx-adapter-paths` | omx-owned | ready | 어댑터 아티팩트는 .omx/adapters/<target>/ 아래 |
| `planning-artifact-linkage` | shared-contract | ready | PRD/test-spec 아티팩트 링크 |
| `foundation-reporting` | shared-contract | ready | probe/status/envelope/init/doctor 공통 출력 계약 |

#### OpenClaw 추가 Capabilities

| id | ownership | status | 설명 |
|----|-----------|--------|------|
| `gateway-observation` | target-observed | ready | 로컬 OpenClaw 설정/게이트웨이 증거 관찰 |
| `lifecycle-bridge` | shared-contract | ready | OMX ↔ OpenClaw 이벤트 매핑 메타데이터 |

#### Hermes 추가 Capabilities (런타임 오버라이드됨)

| id | ownership | 초기값 | 런타임 결정 | 설명 |
|----|-----------|--------|------------|------|
| `persistent-session-observation` | target-observed | **stub** | stateDbReadable→ready / installed→stub / 없음→unsupported | Hermes state.db 세션 스토어 읽기 |
| `acp-envelope-bridge` | shared-contract | **stub** | acp.present→ready / installed→stub / 없음→unsupported | ACP 엔트리포인트 + 게이트웨이 안내 메타데이터 |

> 위 두 역량은 `buildHermesCapabilityOverrides(capabilities, evidence)`가 `applyHermes*` 시점에 stub → ready/unsupported로 동적 교체한다.

```ts
listAdaptTargets(): AdaptTargetDescriptor[]
getAdaptTargetDescriptor(target): AdaptTargetDescriptor | null
```

---

### 4. `index.ts` — 서브커맨드 조립 로직

**목적**: 모든 서브커맨드(probe/status/envelope/doctor/init)의 공통 조립 로직을 담는 진입점 모듈이다. 타겟별 특화 로직은 openclaw.ts/hermes.ts에 위임한다.

#### 함수 목록

| 함수 | sync/async | 설명 |
|------|-----------|------|
| `supportedAdaptTargets()` | sync | 지원 타겟 문자열 목록 |
| `buildAdaptPlanningLink(cwd)` | sync | PRD/test-spec 아티팩트 링크 생성 |
| `buildAdaptEnvelope(cwd, target)` | sync | Envelope JSON 생성 |
| `buildAdaptEnvelopeForTarget(cwd, target)` | **async** | hermes 비동기 증거 포함 |
| `buildAdaptProbeReport(cwd, target)` | sync | Probe 보고서 생성 |
| `buildAdaptProbeReportForTarget(cwd, target)` | **async** | hermes 비동기 버전 |
| `buildAdaptStatusReport(cwd, target)` | sync | Status 보고서 생성 |
| `buildAdaptStatusReportForTarget(cwd, target)` | **async** | hermes 비동기 버전 |
| `buildAdaptDoctorReport(cwd, target)` | sync | Doctor 보고서 생성 |
| `buildAdaptDoctorReportForTarget(cwd, target)` | **async** | hermes 비동기 버전 |
| `initAdaptFoundation(cwd, target, write?, now?)` | sync | 어댑터 초기화 (write=true 시 파일 실제 생성) |

#### `initAdaptFoundation` 쓰기 흐름

```
write=false (기본): previewPaths만 반환, 파일 쓰기 없음
write=true:
  1. mkdir -p reportsDir
  2. writeFileSync(configPath) — {schemaVersion, target, phase, summary, ...}
  3. writeFileSync(envelopePath) — envelope 전체 JSON
  4. wrotePaths = [configPath, envelopePath]
```

#### 타겟 분기 패턴 (모든 빌드 함수 공통)

```
build*(cwd, target):
  ├─ getAdaptTargetDescriptor(target)   // 유효성 검사
  ├─ resolveAdaptPaths(cwd, target)     // 경로 집합
  ├─ buildAdaptPlanningLink(cwd)        // PRD 링크
  │
  ├─ if target === 'openclaw':
  │    └─ openclaw.ts 전용 함수 위임
  │
  └─ else (hermes / 기타 stub):
       └─ 공통 기본 보고서 반환

build*ForTarget(cwd, target):           // async 래퍼
  ├─ build*(cwd, target)               // 동기 기반 생성
  └─ if target === 'hermes':
       └─ collectHermesEvidence(cwd)   // 비동기 파일시스템 읽기
          └─ apply*(report, evidence)  // hermes.ts에서 강화
```

#### Foundation Constraints (공통 제약 문자열 3개)

1. 얇은 어댑터 표면만; 양방향 컨트롤 플레인 미지원
2. `.omx/state/` 또는 타겟 런타임 내부에 직접 쓰기 금지
3. capability 보고는 비대칭: omx-owned/shared-contract/target-observed 분리

---

### 5. `openclaw.ts` — OpenClaw 어댑터 구현

**목적**: OpenClaw 로컬 설정/게이트웨이/훅 상태를 관찰하고 보고서를 생성한다.

#### 모니터링 이벤트

```ts
OPENCLAW_HOOK_EVENTS = [
  'session-start', 'session-end', 'session-idle',
  'ask-user-question', 'stop'
]
```

#### OMX ↔ OpenClaw 이벤트 매핑 (`OPENCLAW_LIFECYCLE_BRIDGE`)

| OMX 이벤트 | OpenClaw 이벤트 |
|-----------|----------------|
| session-start | session-start |
| session-end | session-end |
| session-idle | session-idle |
| ask-user-question | ask-user-question |
| session-stop | stop |

#### 핵심 함수: `observeOpenClaw(paths, planning)`

```
inspectOpenClawConfig()          // ../openclaw/config.ts에서 설정 읽기
  │
  ├─ gateways 순회 → AdaptOpenClawGatewayObservation[]
  │    (type, configured, commandGateRequired/Enabled, timeoutMs)
  │
  └─ OPENCLAW_HOOK_EVENTS 순회 → AdaptOpenClawHookObservation[]
       ├─ mapping 없음/disabled → status: 'unmapped'
       ├─ gateway 미해결 → status: 'blocked'
       ├─ command gateway + OMX_OPENCLAW_COMMAND=1 미설정 → status: 'blocked'
       └─ 정상 → status: 'wired'

observedState 결정:
  inspection.state === 'configured' AND hooks 중 'blocked' 존재 → 'degraded'
  otherwise → inspection.state 그대로
```

#### 생성 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `buildOpenClawEnvelope(...)` | `AdaptEnvelope` | OpenClaw 전용 Envelope |
| `buildOpenClawProbeReport(...)` | `AdaptProbeReport` | OpenClaw Probe 보고서 |
| `buildOpenClawStatusReport(...)` | `AdaptStatusReport` | OpenClaw Status 보고서 |
| `buildOpenClawDoctorReport(...)` | `AdaptDoctorReport` | OpenClaw Doctor 보고서 |
| `initOpenClawFoundation(...)` | `AdaptInitResult` | 어댑터 초기화 (파일 쓰기) |

#### `buildOpenClawDoctorReport` issue 코드

| code | 감지 조건 |
|------|----------|
| `adapter_not_initialized` | configPath/envelopePath 미존재 |
| `openclaw_disabled` | `OMX_OPENCLAW=1` 미설정 |
| `openclaw_config_missing` | 활성화됐으나 설정 파일 없음 |
| `openclaw_config_invalid` | 설정 키 존재하나 유효하지 않음 |
| `openclaw_hook_blocked` | 활성 훅 중 blocked 상태 존재 |
| `planning_artifacts_missing` | PRD 아티팩트 없음 |

---

### 6. `hermes.ts` — Hermes 어댑터 구현

**목적**: Hermes 외부 런타임(ACP 서버, gateway 프로세스, session-store)의 존재 여부와 상태를 파일시스템에서 비동기로 수집한다.

#### 환경변수

| 환경변수 | 기본값 | 설명 |
|----------|--------|------|
| `HERMES_HOME` | `~/.hermes` | Hermes 홈 디렉토리 |
| `OMX_ADAPT_HERMES_ROOT` | sibling 기본값 | Hermes 소스 루트 |
| `OMX_ADAPT_HERMES_BOOTSTRAP` | - | 부트스트랩 설정 |

#### `HermesEvidence` 구조

```ts
HermesEvidence {
  hermesRoot, hermesHome
  sources: { root: 'override'|'sibling-default', home: 'env'|'default' }
  sourceRuntime: {
    present, acp(files/missing), gateway(files/missing),
    docs, stateStore, acpRegistry
  }
  installed: boolean                // ACP/gateway 엔트리포인트 존재 여부
  runtimeFiles: {
    gatewayPidPath, gatewayStatePath, stateDbPath,
    gatewayPidReadable, gatewayStateReadable,
    stateDbReadable, stateDbExists
  }
  gateway: {
    pidRecord, runtimeRecord, live, connectedPlatforms, stale
  }
  resumable: boolean                // 재개 가능한 세션 존재 여부
}
```

#### 주요 함수

| 함수 | sync/async | 설명 |
|------|-----------|------|
| `collectHermesEvidence(cwd)` | **async** | 파일시스템 전체 증거 수집 |
| `buildHermesRuntimeObservation(evidence)` | sync | 런타임 상태 요약 생성 |
| `buildHermesBootstrapMetadata(evidence)` | sync | 부트스트랩 안내 메타데이터 |
| `buildHermesCapabilityOverrides(capabilities, evidence)` | sync | stub 역량을 런타임 증거로 ready/unsupported 업데이트 |
| `applyHermesEnvelope(envelope, evidence)` | sync | Envelope에 hermes 관찰 결과 병합 |
| `applyHermesProbe(report, evidence)` | sync | Probe에 hermes 관찰 결과 병합 |
| `applyHermesStatus(report, evidence)` | sync | Status에 hermes 관찰 결과 병합 |

#### `buildHermesRuntimeObservation` 상태 결정 로직

```
evidence.installed === false
  → state: "unavailable" (hermesRoot 경로에서 미감지)

evidence.gateway.live === true
  → state: "running" (PID 유효 + gateway_state ∈ {starting, running, draining})

runtime 파일 readable (pid/state/stateDb 중 하나)
  → state: "degraded" (파일 있지만 live 아님, stale 포함)

installed, 하지만 runtime 파일 없음
  → state: "installed" (소스 감지됨, 아직 실행 전)
```

#### Hermes 이벤트 브릿지 (`buildHermesBootstrapMetadata`)

| OMX 이벤트 | Hermes ACP 이벤트 |
|-----------|------------------|
| session-start | session:start |
| session-end | session:end |
| session-idle | agent:end |
| ask-user-question | agent:step |
| stop | session:end |
| gateway-startup | gateway:startup |

---

## 모듈 간 호출 관계

```
외부 (omx adapt 명령어)
     │
     ▼
index.ts
  ├─ buildAdaptPlanningLink()
  │       └─ planning/artifacts.ts (readLatestPlanningArtifacts)
  │
  ├─ resolveAdaptPaths()
  │       └─ paths.ts → utils/paths.ts
  │
  ├─ getAdaptTargetDescriptor()
  │       └─ registry.ts
  │
  ├─ [openclaw 분기]
  │       └─ openclaw.ts
  │               └─ openclaw/config.ts (inspectOpenClawConfig, resolveGateway)
  │
  └─ [hermes 분기]
          └─ collectHermesEvidence()
                  └─ hermes.ts (파일시스템 비동기 읽기)
          └─ applyHermes*() 함수들
                  └─ hermes.ts (동기 변환)
```

---

## 외부 의존성

```
adapt/ → planning/artifacts.ts    # readLatestPlanningArtifacts
adapt/ → openclaw/config.ts       # inspectOpenClawConfig, resolveGateway
adapt/ → utils/paths.ts           # omxAdaptersDir
adapt/ → contracts.ts             # 타입 공유 (모듈 내부)
```

---

## 타입 요약

| 타입 | 파일 | 설명 |
|------|------|------|
| `AdaptTarget` | contracts.ts | `'openclaw' \| 'hermes'` |
| `AdaptSubcommand` | contracts.ts | probe/status/init/envelope/doctor |
| `AdaptCapabilityReport` | contracts.ts | 개별 capability 상태 |
| `AdaptTargetDescriptor` | contracts.ts | 타겟의 전체 메타데이터 |
| `AdaptPathSet` | contracts.ts | 어댑터 관련 6개 경로 |
| `AdaptPlanningLink` | contracts.ts | PRD/test-spec 링크 |
| `AdaptEnvelope` | contracts.ts | 어댑터 전체 현황 파일 |
| `AdaptProbeReport` | contracts.ts | 탐침 보고서 |
| `AdaptStatusReport` | contracts.ts | 초기화 상태 보고서 |
| `AdaptDoctorReport` | contracts.ts | 문제 진단 보고서 |
| `AdaptOpenClawMetadata` | contracts.ts | OpenClaw 관찰 전체 |
| `HermesEvidence` | hermes.ts | Hermes 증거 수집 결과 (internal) |

---

## 아티팩트 위치

```
.omx/adapters/
├── openclaw/
│   ├── adapter.json          # 어댑터 설정
│   ├── envelope.json         # Envelope (buildAdaptEnvelope)
│   └── reports/
│       ├── probe.json        # Probe 보고서
│       └── status.json       # Status 보고서
└── hermes/
    ├── adapter.json
    ├── envelope.json
    └── reports/
        ├── probe.json
        └── status.json
```

---

## 설계 원칙

1. **단방향 관찰**: 어댑터는 타겟 런타임 상태를 읽기만 하며, 타겟 내부나 `.omx/state/`에는 쓰지 않는다
2. **sync/async 쌍**: 동기 버전(기본 로직) + async ForTarget 버전(hermes 비동기 증거 포함) 패턴으로 일관성 유지
3. **capability 소유권 분리**: `omx-owned`(OMX 직접 구현) / `shared-contract`(양측 합의 계약) / `target-observed`(타겟에서 읽기만)
4. **Foundation 먼저**: openclaw/hermes 모두 공통 3개 foundation capability를 기반으로 타겟별 capability를 추가
5. **오버레이 방식 역량 업데이트**: Hermes 역량은 registry.ts에 stub으로 선언한 뒤 `buildHermesCapabilityOverrides()`가 런타임 증거에 따라 ready/unsupported로 동적 교체한다. 공통 구조를 유지하면서 타겟 특화 상태를 반영한다.
6. **write=false 기본 안전망**: `initAdaptFoundation`은 기본적으로 파일을 쓰지 않고 previewPaths만 반환한다. 실제 초기화는 `--write` 플래그 명시 필요.
