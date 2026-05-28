# src/catalog/ 모듈 분석

## 폴더 구조

```
src/catalog/
├── schema.ts           # 타입 정의 + 유효성 검사 + 통계 함수
├── reader.ts           # manifest.json 읽기 + 공개 계약 변환
├── installable.ts      # 설치 가능한 스킬 집합 결정
├── skill-mirror.ts     # 스킬 디렉토리 동기화 검증 (CI용)
├── manifest.json       # 실제 카탈로그 데이터 (단일 진실 소스)
├── generated/
│   └── public-catalog.json  # toPublicCatalogContract() 결과 캐시
└── __tests__/          # 단위 테스트
```

---

## 모듈 역할 개요

| 파일 | 핵심 역할 |
|------|-----------|
| `schema.ts` | 카탈로그 타입·검증 규칙·통계 함수 정의 |
| `reader.ts` | manifest.json 파싱·검증·캐싱 + 공개 API 포맷 변환 |
| `installable.ts` | setup 시 설치할 스킬 집합 계산 |
| `skill-mirror.ts` | 소스 skills 디렉토리 ↔ 배포 디렉토리 동기화 검증 |
| `manifest.json` | 전체 스킬·에이전트 메타데이터 (SSOT) |
| `generated/public-catalog.json` | 빌드 시 생성되는 공개 배포용 카탈로그 |

---

## 시스템 개요

```
manifest.json (SSOT)
    │
    ├─ reader.ts (readCatalogManifest)
    │       ├─ schema.ts (validateCatalogManifest)   // 읽을 때 즉시 검증
    │       └─ 모듈 수준 캐시 (cachedManifest)
    │
    ├─ installable.ts (getSetupInstallableSkillNames)
    │       └─ isCatalogInstallableStatus()          // 'active'|'internal'
    │
    ├─ skill-mirror.ts (compareSkillMirror)
    │       └─ compareDirectoryMirror()             // CI 동기화 검증
    │
    └─ generated/public-catalog.json
            └─ toPublicCatalogContract()             // 빌드 시 생성
```

---

## 파일별 상세 분석

### 1. `schema.ts` — 카탈로그 타입 + 유효성 검사

**목적**: 카탈로그의 모든 타입과 유효성 검사 규칙, 통계 함수를 단일 파일에 집중한다.

#### 타입 계층

```ts
// 스킬 카테고리
CatalogSkillCategory = 'execution' | 'planning' | 'shortcut' | 'utility'

// 에이전트 카테고리
CatalogAgentCategory = 'build' | 'review' | 'domain' | 'product' | 'coordination'

// 엔트리 상태
CatalogEntryStatus = 'active' | 'alias' | 'merged' | 'deprecated' | 'internal'
```

#### 상태별 의미

| 상태 | 의미 | canonical 필요? | 설치 가능? |
|------|------|----------------|-----------|
| `active` | 정상 활성 엔트리 | 아니오 | 예 |
| `alias` | 다른 엔트리의 단축 이름 | **필수** | 아니오 (canonical로 리다이렉트) |
| `merged` | 다른 엔트리에 통합됨 | **필수** | 아니오 |
| `deprecated` | 지원 중단 | 아니오 | 아니오 |
| `internal` | 내부 전용 | 아니오 | 예 (숨김) |

#### 엔트리 인터페이스

```ts
CatalogSkillEntry {
  name: string
  category: CatalogSkillCategory
  status: CatalogEntryStatus
  canonical?: string    // alias/merged 전용
  core?: boolean        // 필수 스킬 여부
  internalRequired?: boolean  // internal 스킬 중 setup 필수 여부
}

CatalogAgentEntry {
  name: string
  category: CatalogAgentCategory
  status: CatalogEntryStatus
  canonical?: string
}

CatalogManifest {
  schemaVersion: number      // 현재 1
  catalogVersion: string     // 현재 "2026.02.28.1"
  skills: CatalogSkillEntry[]
  agents: CatalogAgentEntry[]
}
```

#### 필수 코어 스킬 (`REQUIRED_CORE_SKILLS`)

```ts
['ralplan', 'team', 'ralph', 'ultrawork', 'ultragoal', 'autopilot']
```

모두 manifest에 존재하고 `status: 'active'`여야 한다.

#### `validateCatalogManifest(manifest)` — 검증 규칙

```
1. schemaVersion 확인 (미존재/비수치)
2. skills 배열 존재 확인
3. agents 배열 존재 확인
4. 스킬 중복 이름 검사
5. 에이전트 중복 이름 검사
6. alias/merged 스킬에 canonical 필수 여부 확인
7. alias/merged 에이전트에 canonical 필수 여부 확인
8. REQUIRED_CORE_SKILLS 모두 active 상태인지 확인
```

오류 발생 시 `CatalogManifestValidationError` throw.

#### `summarizeCatalogCounts(manifest)`

```ts
{
  skillCount: number        // 전체 스킬 수
  promptCount: number       // promptCount (스킬 + 에이전트)
  activeSkillCount: number  // active 스킬 수
  activeAgentCount: number  // active 에이전트 수
}
```

---

### 2. `reader.ts` — manifest 읽기 + 공개 계약

**목적**: manifest.json을 파싱·검증·캐싱하고 외부 공개용 JSON 포맷으로 변환한다.

#### 탐색 경로 우선순위 (`MANIFEST_CANDIDATE_PATHS`)

```
1. templates/catalog-manifest.json    (배포 루트)
2. src/catalog/manifest.json          (개발 소스)
3. dist/catalog/manifest.json         (빌드 아웃풋)
```

첫 번째로 존재하는 파일을 사용한다.

#### 모듈 수준 캐시

```ts
let cachedManifest: CatalogManifest | null = null;
let cachedPath: string | null = null;
```

프로세스 수명 동안 한 번만 읽고 캐시한다.

#### 주요 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `readCatalogManifest(packageRoot?)` | `CatalogManifest` | 캐시 포함 읽기, 실패 시 throw |
| `tryReadCatalogManifest(packageRoot?)` | `CatalogManifest \| null` | 실패 시 null 반환 |
| `getCatalogCounts(packageRoot?)` | 통계 객체 | 편의 통계 함수 |
| `toPublicCatalogContract(manifest)` | `PublicCatalogContract` | 공개 포맷 변환 |

#### `PublicCatalogContract` — 공개 API 포맷

```ts
PublicCatalogContract {
  generatedAt: string       // ISO 타임스탬프
  version: string           // catalogVersion
  counts: {skillCount, promptCount, activeSkillCount, activeAgentCount}
  coreSkills: string[]      // core: true인 스킬 이름들
  skills: CatalogSkillEntry[]      // active 스킬만
  agents: CatalogAgentEntry[]      // active/internal 에이전트만
  aliases: string[]         // alias/merged 이름 목록
  internalHidden: string[]  // internal 이름 목록
}
```

변환 시 alias/merged → `aliases` 배열, internal → `internalHidden` 배열로 분리하여 외부에 노출한다.

---

### 3. `installable.ts` — 설치 가능 스킬 집합

**목적**: `omx setup` 등 설치 과정에서 복사·설치할 스킬 이름 집합을 결정한다.

#### 카탈로그 외 추가 스킬

```ts
SETUP_ONLY_INSTALLABLE_SKILLS = new Set(['wiki'])
// 카탈로그에 없지만 setup 시 항상 설치되는 스킬
```

#### 주요 함수

```ts
isCatalogInstallableStatus(status): boolean
// 'active' | 'internal' → true, 그 외 → false

getSetupInstallableSkillNames(manifest): Set<string>
// catalog active/internal 스킬 + SETUP_ONLY 합집합
```

---

### 4. `skill-mirror.ts` — 디렉토리 동기화 검증

**목적**: 소스 `skills/` 디렉토리와 배포/설치 경로의 파일 구조 및 내용이 일치하는지 CI에서 검증한다.

#### 불일치 타입

```ts
DirectoryMirrorMismatch {
  kind: 'missing-directory' | 'file-list' | 'content' | 'not-directory'
  path?: string
  expected?: string[]
  actual?: string[]
}

SkillMirrorMismatch {
  kind: 'skill-list' | 'unexpected-entry' | 'skill-directory'
  skillName?: string
  message: string
  expected?: string[]
  actual?: string[]
}
```

#### 핵심 함수

```ts
compareDirectoryMirror(expectedDir, actualDir, options)
// 1. 두 디렉토리 재귀 파일 목록 비교 (sort된 상대경로 리스트)
// 2. 목록 일치 시 각 파일 내용 비교
// 3. options.expectedContent?(): 비교 전 변환 함수 (예: 경로 치환)
// 4. 불일치 시 → DirectoryMirrorMismatch 반환
// 5. 모두 일치 시 → null 반환

compareSkillMirror(expectedSkillsDir, actualSkillsDir, expectedSkillNames, options)
// 1. actualSkillsDir에 비디렉토리 항목 존재 여부 (unexpected-entry)
// 2. 실제 스킬 디렉토리 목록 vs expectedSkillNames 비교
// 3. 각 스킬에 대해 compareDirectoryMirror() 재귀 호출
// 4. 불일치 시 → SkillMirrorMismatch 반환
// 5. 모두 일치 시 → null 반환
```

---

### 5. `manifest.json` — 카탈로그 데이터 (단일 진실 소스)

**schemaVersion**: 1  
**catalogVersion**: `2026.02.28.1`

#### 스킬 전체 목록 (카테고리별)

**execution 카테고리 — 활성**

| 이름 | core | 비고 |
|------|------|------|
| `autopilot` | ✅ | |
| `ralph` | ✅ | |
| `ultrawork` | ✅ | |
| `team` | ✅ | |
| `ultragoal` | ✅ | |
| `ultraqa` | | |
| `autoresearch` | | |
| `autoresearch-goal` | | |
| `performance-goal` | | |
| `pipeline` | | |
| `ecomode` | | deprecated |
| `swarm` | | deprecated |

**planning 카테고리 — 활성**

| 이름 | canonical | 비고 |
|------|-----------|------|
| `plan` | | active |
| `ralplan` | `plan` | core, alias |
| `deep-interview` | | |
| `prometheus-strict` | | |
| `best-practice-research` | | |

**shortcut 카테고리 — 활성**

| 이름 | canonical | 비고 |
|------|-----------|------|
| `analyze` | | |
| `ai-slop-cleaner` | | |
| `code-review` | `code-reviewer` | alias |
| `visual-ralph` | `designer` | alias |
| `design` | `designer` | alias |
| `git-master` | `git-master` | alias |
| `ask` | | |
| 그 외 | | deprecated |

**utility 카테고리**

| 이름 | status | 비고 |
|------|--------|------|
| `cancel` | active | |
| `doctor` | active | |
| `skill` | active | |
| `hud` | active | |
| `omx-setup` | active | |
| `configure-notifications` | active | |
| `configure-discord` | merged | → configure-notifications |
| `configure-telegram` | merged | → configure-notifications |
| `configure-slack` | merged | → configure-notifications |
| `configure-openclaw` | merged | → configure-notifications |
| `worker` | **internal** | internalRequired: true |
| 그 외 | deprecated | |

#### 에이전트 전체 목록 (카테고리별)

**build 카테고리**

| 이름 | status |
|------|--------|
| `explore` | active |
| `analyst` | active |
| `planner` | active |
| `architect` | active |
| `debugger` | active |
| `executor` | active |
| `team-executor` | internal |
| `verifier` | active |

**review 카테고리**

| 이름 | status | canonical |
|------|--------|-----------|
| `style-reviewer` | merged | code-reviewer |
| `quality-reviewer` | merged | code-reviewer |
| `api-reviewer` | merged | code-reviewer |
| `security-reviewer` | merged | code-reviewer |
| `performance-reviewer` | merged | code-reviewer |
| `code-reviewer` | active | |

**domain 카테고리** (active 기준)

`dependency-expert`, `test-engineer`, `quality-strategist`, `build-fixer`, `designer`, `writer`, `qa-tester`, `git-master`, `code-simplifier`, `researcher`

**product 카테고리** (active 기준)

`product-manager`, `ux-researcher`, `information-architect`, `product-analyst`

**coordination 카테고리** (active 기준)

`prometheus-strict-metis`, `prometheus-strict-momus`, `prometheus-strict-oracle`, `critic`, `scholastic`, `vision`

---

## 모듈 간 호출 관계

```
외부 (setup 명령어)
  ├─ getSetupInstallableSkillNames(manifest)
  │       └─ installable.ts
  │               └─ schema.ts (isCatalogInstallableStatus)
  │
  ├─ readCatalogManifest(packageRoot)
  │       └─ reader.ts
  │               ├─ MANIFEST_CANDIDATE_PATHS 순서로 파일 탐색
  │               └─ validateCatalogManifest(manifest)
  │                       └─ schema.ts
  │
  └─ (빌드 스크립트)
          └─ toPublicCatalogContract(manifest)
                  └─ reader.ts → generated/public-catalog.json 쓰기

외부 (CI 테스트)
  └─ compareSkillMirror(expectedDir, actualDir, names)
          └─ skill-mirror.ts
                  └─ compareDirectoryMirror() (재귀)

src/agents/policy.ts
  └─ readCatalogManifest()         // 에이전트 설치 정책 필터링에 재사용
src/agents/native-config.ts
  └─ readCatalogManifest()         // 설치 가능 에이전트 목록 조회
```

---

## 외부 의존성

```
catalog/ → node:fs/promises   # readFile, stat, readdir (skill-mirror)
catalog/ → node:fs            # existsSync (skill-mirror)
catalog/ → node:path          # join, relative, sep (skill-mirror)
```

---

## 타입 요약

| 타입 | 파일 | 설명 |
|------|------|------|
| `CatalogSkillCategory` | schema.ts | execution/planning/shortcut/utility |
| `CatalogAgentCategory` | schema.ts | build/review/domain/product/coordination |
| `CatalogEntryStatus` | schema.ts | active/alias/merged/deprecated/internal |
| `CatalogSkillEntry` | schema.ts | 스킬 엔트리 |
| `CatalogAgentEntry` | schema.ts | 에이전트 엔트리 |
| `CatalogManifest` | schema.ts | 전체 manifest 구조 |
| `PublicCatalogContract` | reader.ts | 외부 공개용 포맷 |
| `DirectoryMirrorMismatch` | skill-mirror.ts | 디렉토리 불일치 정보 |
| `DirectoryMirrorOptions` | skill-mirror.ts | 비교 옵션 (변환 함수 포함) |
| `SkillMirrorMismatch` | skill-mirror.ts | 스킬 디렉토리 불일치 정보 |

---

## 설계 원칙

1. **SSOT(단일 진실 소스)**: `manifest.json`이 모든 스킬·에이전트 메타데이터의 유일한 원천이다
2. **읽기 시 즉시 검증**: `readCatalogManifest()`는 파싱 직후 `validateCatalogManifest()`를 실행하므로 무효한 manifest가 캐시에 들어가지 않는다
3. **공개/내부 분리**: `toPublicCatalogContract()`는 internal 항목을 `internalHidden` 배열로 분리, alias/merged는 `aliases`로 격리하여 외부 API 표면을 최소화한다
4. **카탈로그 필터 재사용**: `installable.ts`와 `src/agents/policy.ts` 모두 동일한 `isCatalogInstallableStatus()` 로직을 사용하여 설치 가능성 기준을 일원화한다
5. **CI 동기화 검증**: `skill-mirror.ts`는 소스와 배포 디렉토리 간 파일 목록·내용 불일치를 자동 감지하여 배포 드리프트를 방지한다
6. **모듈 수준 캐싱**: manifest 파일은 프로세스당 한 번만 읽으므로 반복 I/O 비용 없이 어디서든 `readCatalogManifest()`를 호출할 수 있다
