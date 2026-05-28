제공해주신 `hooks-module-analysis.md` 분석 내용과 시스템 내 마크다운 파일들의 활용 분석(Markdown Usage Analysis)을 결합하여, Oh-My-Codex(OMX) 시스템의 인텐트 분석, 런타임 오버레이 및 마크다운 계약 검증 파이프라인에 대한 상세 설계 문서(Detailed Architecture & Design Specification)를 작성했습니다.

# Oh-My-Codex (OMX) Hooks 서브시스템 상세 설계 문서

**Subsystem: Intent Routing, Runtime Overlay, and Prompt Contract Verification**

## 1. 시스템 아키텍처 개요 (Architecture Overview)

Oh-My-Codex(OMX)의 `src/hooks/` 서브시스템은 사용자 프롬프트를 입력받아 적절한 Skill/Agent로 바인딩하고, 실행 시점에 동적 컨텍스트(코드베이스 구조, 세션 상태 등)를 시스템 프롬프트에 주입하며, 템플릿 마크다운 파일들이 비즈니스 계약 조건(Contract Pattern)을 준수하는지 검증하는 **오케스트레이션 및 라우팅 프레임워크**입니다.

### 1.1 제어 흐름 분리 (Separation of Concerns)

본 서브시스템은 정교한 상태 제어와 라우팅 논리를 가지고 있으나, 구동에 필요한 정적 선언부(시스템 프롬프트 지침 및 페르소나 정의)를 외부 마크다운(`.md`) 파일로 완전히 격리시켰습니다. 이 구조를 통해 핵심 제어 엔진의 수정 없이도 에이전트의 행동 가이던스를 유연하게 변경할 수 있습니다.

## 2. 마크다운 프롬프트 구조 및 연동 모델 (Markdown Prompt & Usage Analysis)

시스템이 완벽히 유기적으로 작동하기 위해서는 정밀하게 설계된 마크다운 기반의 지시문 파일들이 외부 디렉토리에 배치되어야 합니다. 본 절에서는 이 마크다운 파일들의 역할과 런타임 결합 방식을 분석합니다.

### 2.1 외부 마크다운 파일 구조 및 배치 토폴로지

```
[OMX 프로젝트 루트]
├── templates/
│   └── AGENTS.md                  # 전역 에이전트 오케스트레이션 설정 템플릿
├── prompts/
│   ├── root-template.md           # 기본 최상위 프롬프트 구조체
│   ├── planner.md                 # 계획 수립 에이전트용 페르소나/지침
│   ├── executor.md                # 코드 수정 및 도구 실행 에이전트용 지침
│   └── verifier.md                # 검증 및 테스트 에이전트용 지침
└── skills/
    ├── ralph/
    │   └── SKILL.md               # Ralph 스킬 고유의 자율 행동 루프 정의
    ├── autopilot/
    │   └── SKILL.md               # Autopilot 자율 반복 다중 에이전트 제어 지침
    └── [other-skills]/
        └── SKILL.md               # 각 도구 및 특화 목적별 가이드라인

```

### 2.2 마크다운 컴포넌트 간 상호작용 및 런타임 바인딩

1. **정적 템플릿 로딩**: 시스템 기동 시 `prompts/root-template.md` 및 `templates/AGENTS.md`를 메모리로 인덱싱합니다.
2. **동적 컨텍스트 수집**: 런타임 논리 엔진이 현재 Git 상태, 코드 아키텍처 맵, 세션 이력, 메모리 버퍼를 파싱하여 정적 데이터 형태로 구조화합니다.
3. **오버레이 가공 및 주입**: `agents-overlay.ts` 모듈을 통해 `AGENTS.md` 내부에 정의된 마커 주석 쌍 사이에 가공된 동적 텍스트를 인젝션(Injection)하여 최종 에이전트 시스템 프롬프트 스트링을 완성합니다.

## 3. 서브시스템별 상세 설계 (Component Detailed Design)

### 3.1 인텐트 파악 및 라우팅 엔진 (Intent & Routing Subsystem)

#### 3.1.1 keyword-registry.ts

* **개념 및 목적**: 사용자의 텍스트 입력에서 스킬 명시적/암시적 호출을 해석하기 위한 매핑 정보의 단일 진실 공급원(SSOT).
* **주요 인터페이스 사양**:
```typescript
export interface KeywordTriggerDefinition {
  keyword: string;   // 패턴 매칭용 트리거 토큰/문자열
  skill: string;     // 매핑될 타깃 스킬 식별자
  priority: number;  // 매칭 경합 발생 시 해결 우선순위 (Desc)
  guidance: string;  // 해당 스킬 활성화 시 프롬프트에 동적 결합될 추가 가이던스
}

```


* **동작 매커니즘 (`compareKeywordMatches`)**:
다중 키워드가 동시 검출되는 경우, 결정론적 라우팅을 보장하기 위해 우선순위 내림차순($\downarrow$) $\rightarrow$ 문자열 길이 내림차순($\downarrow$) $\rightarrow$ 사전식 알파벳 오름차순($\uparrow$) 순서로 정렬 체인을 수행합니다.

#### 3.1.2 keyword-detector.ts

* **개념 및 목적**: 프롬프트 분석의 1단계 진입점으로, 오타 정규화, 명시적 스킬 호출 파싱, 세션 간 스킬 연속성 보장을 전담.
* **알고리즘 흐름 및 예외 처리**:
1. 입력 프롬프트 문자열 전처리 및 오타 정규화 수행 (예: `ralplan` 변형 패턴 교정).
2. `parseExplicitSkillInvocations()`를 실행하여 `$skill` 접두사 또는 `/prompts:role` 지시자 추출.
3. 키워드 검출 성공 시, 해당 스킬이 컨텍스트 검증이 필요한 부류(`KEYWORDS_REQUIRING_INTENT`)에 속하는지 판별하여 추가 패턴 매칭 유효성 검증.
4. 이전 턴의 상태 파일(`.omx/state/skill-active-state.json`)이 존재하고, 현재 입력이 연장어 패턴("continue", "keep going")일 경우 기존 활성 스킬 상태를 계승 및 재사용.



### 3.2 Triage 폴백 분류 엔진 (Fallback Classifier Subsystem)

#### 3.2.1 triage-heuristic.ts

* **개념 및 목적**: 키워드 탐지가 누락되었을 때 동작하는 폴백 장치로, 부작용이 전혀 없는 순수 동기 함수 형태로 프롬프트를 3-레인으로 분류.
* **분류 결정 트리 규칙 (11단계 선점형 순차 적용)**:
1. **빈 입력 및 얕은 인사말 검사**: 단어 수가 임계값 이하이거나 단순 감사 표현인 경우 $\rightarrow$ `PASS` 레인 배정.
2. **명시적 거부(Opt-Out) 검사**: "just chat", "no workflow" 등 워크플로우 억제 표현 포함 시 $\rightarrow$ `PASS` 레인 배정.
3. **단답형 탐색 질문 검사**: 단어 수 10개 이하의 의문문(`?`) $\rightarrow$ `LIGHT` 레인 / `explore` 목적지 확정.
4. **파일 경로 앵커링 검사**: 구체적인 소스 파일 경로가 포함되어 있고 단어 수 15개 이하 $\rightarrow$ `LIGHT` 레인 / `executor` 목적지 확정.
5. **복합 리서치 및 구현 골(Goal) 검사**: 단어 수 5개 초과 및 로컬 컨텍스트를 벗어난 구현 요구 $\rightarrow$ `HEAVY` 레인 / `autopilot` 목적지 확정.
6. **UI/비주얼 재설계 요구**: 시각적 레이아웃 변경 관련 구문 검출 시 $\rightarrow$ `LIGHT` 레인 / `designer` 목적지 확정.
7. **기타 포괄 명령**: 단어 수 5개 초과 및 명령형 동사 스타터 $\rightarrow$ `HEAVY` 레인 확정.



#### 3.2.2 triage-config.ts & triage-state.ts

* **보안 및 상태 격리 설계**:
* **Fail-Closed 안전장치**: 전역 설정 파일 파싱 중 에러 발생 혹은 규격 변형 감지 시, 라우팅 오류 확산을 차단하기 위해 Triage 기능을 `false`("invalid")로 강제 고정하여 격리합니다.
* **상태 원자성**: `writeTriageState()`는 파일 쓰기 시 부분 쓰기로 인한 파일 손상을 원천 봉쇄하기 위해 임시 파일에 선기록 후 원자적 리네임(Atomic Rename) 매커니즘을 적용합니다.



### 3.3 런타임 오버레이 및 컨텍스트 관리 (Runtime Overlay & Context Subsystem)

#### 3.3.1 agents-overlay.ts

* **개념 및 목적**: `AGENTS.md` 파일에 런타임 전용 세션 및 프로젝트 메타데이터를 주입 및 해제하는 동적 변환 가속기.
* **컨텍스트 주입 아티팩트 파이프라인**:
```
[정적 AGENTS.md]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 락 획득 (agents-md.lock/)                              │
│ 마커 탐색: │
├────────────────────────────────────────────────────────┤
│ 1. codebase-map.ts 데이터 압축본 주입                   │
│ 2. .omx/notepad.md 내 개발자 우선순위 메모 결합        │
│ 3. .omx/project-memory.json 기반 기술 스택 서머리 바인딩 │
│ 4. explore-routing.ts 기반 라우팅 지침 삽입              │
├────────────────────────────────────────────────────────┤
│ 마커 마감: │
│ 락 해제 및 보정 (최대 3500자 크기 엄수)                   │
└────────────────────────────────────────────────────────┘
       │
       ▼
[최종 컴파일된 AGENTS.md]

```


* **동시성 배타적 제어**: 복수의 비동기 프로세스 또는 MCP 도구가 동시에 `AGENTS.md`를 오염시키는 것을 방지하기 위해 파일 시스템 기반의 배타적 디렉토리 락을 운영하며, 좀비 프로세스 방지를 위해 기존 소유자의 PID 사멸 여부를 `process.kill(pid, 0)`으로 감지하여 자동으로 락을 회수합니다.

#### 3.3.2 codebase-map.ts

* **개념 및 목적**: 프로젝트 구조 정보 수집으로 인한 LLM의 탐색 토큰 낭비를 절감하기 위해 구조 맵을 압축 생성하는 지능형 스냅샷 모듈.
* **캐싱 수명 주기 전략**:
파일 변경 감지를 위해 프로젝트 소스를 상시 순회하는 무거운 오버헤드를 배제하고, `.git/index` 파일의 최종 수정 시간(`mtime`)과 파일 크기(`size`)를 조합하여 고유 시그니처 해시를 산출합니다. 이 시그니처가 유지될 경우 복잡한 정규식 스캔 코드를 스킵하고 `.omx/cache/codebase-map.json` 내 캐시 데이터를 즉시 서빙합니다.

## 4. 마크다운 계약 검증 표준 설계 (Prompt Guidance Contract)

### 4.1 prompt-guidance-contract.ts의 검증 아키텍처

LLM 에이전트들이 통제 불가능한 상태로 폭주하거나 사용자 승인 없이 파괴적인 행동을 하는 것을 컴파일 레벨(또는 프리훅 단계)에서 전면 차단하기 위해, 이 모듈은 로딩되는 모든 마크다운 프롬프트 파일 내부의 문구를 엄격한 정규식(Regex) 규칙으로 전수 검사합니다.

### 4.2 필수 검증 계약 조건 매트릭스 (Regex Rule Matrix)

각 외부 마크다운 파일들은 빌드 및 기동 단계에서 아래 정의된 정규식 계약 파싱 그룹을 무조건 통과해야만 실행 컨텍스트에 포함될 수 있습니다.

| 검증 대상 프롬프트 종류 | 필수 계약 범주 (Contract Group) | 정규식 매칭 타깃 및 검증 의미 |
| --- | --- | --- |
| **Root Template / Core Roles**<br>

<br>(`executor`, `planner`, `verifier`) | **AUTO-CONTINUE 원칙** | `AUTO-CONTINUE.*clear.*already-requested.*low-risk`<br>

<br>→ 저위험군 반복 작업이고 선행 요청이 명확할 때만 컨티뉴를 자율 허용하는지 검증 |
| **Core Roles 전체** | **ASK 제한적 제약 조건** | `ASK only.*destructive.*irreversible.*credential-gated`<br>

<br>→ 파괴적이거나 되돌릴 수 없는 도구 실행, 인증이 필요한 영역 진입 전에만 사용자 응답을 요구하도록 규정했는지 검증 |
| **AGENTS.md / Templates** | **Repo-Local 라우팅 계약** | `Route to 'explore' for repo-local file / symbol`<br>

<br>→ 로컬 소스 및 심볼 탐색 시 외부 LLM이 아닌 내부 고속 탐색 명령어로 전송하도록 분기 명시 여부 체크 |
| **Wave-two / Catalog / Skills** | **역할 책임 구체화 분리** | `Leader responsibilities`<br>

<br>`Worker responsibilities`<br>

<br>→ 다중 에이전트 구동 시 지휘조직과 수행조직의 수직적 책임 관계가 문서 내 기술되었는지 검증 |
| **Verifier 프롬프트** | **근거 기반 검증 완성 원칙** | `task is grounded and verified`<br>

<br>→ 주관적 판단에 의존하지 않고 테스트 실행 및 소스 정합성 추적을 강제했는지 검증 |

## 5. 런타임 엔지니어링 및 확장 아키텍처 (Extensibility & Runtime)

### 5.1 extensibility/ 서브 패키지 기반 플러그인 토폴로지

외부 관제 시스템 및 사용자 정의 자동화 파이프라인 연동을 위해 이벤트 구동 구조의 훅 아키텍처를 제공합니다.

```
       [OMX 내부 이벤트 발생] (예: turn-complete, blocked, pr-created)
                 │
                 ▼
     [extensibility/dispatcher.ts]
                 │
                 ├─ 억제 장치: 환경변수 OMX_TEAM_WORKER 존재 시 전송 차단
                 ▼
     [extensibility/loader.ts]  ── 검색 경로: .omx/hooks/*.mjs 스캔
                 │
                 ▼
    [extensibility/plugin-runner.ts]
                 │
                 ├─ 독립 서브프로세스 생성 (spawn)
                 ├─ 격리형 런타임 브릿지 (runtime.ts ↔ sdk.ts)
                 └─ 타이머 구동: HOOK_PLUGIN_TIMEOUT_MS (기본 1500ms) 강제 적용

```

* **오류 격리 (Fault Isolation)**: 각 플러그인은 메인 루프에 영향을 주지 않는 독립 프로세스로 실행되며, 플러그인의 무한 루프나 블로킹으로 인한 전체 코덱스 마비 현상을 막기 위해 지정된 타임아웃 경과 즉시 프로세스 핸들을 강제 회수(`SIGKILL`)합니다.

### 5.2 code-simplifier/ 자동 코드 최적화 서브시스템

* **작업 처리 매커니즘**:
에이전트의 턴이 완료(`turn-complete`)되거나 CLI가 정지할 때 활성화되는 스톱 훅(Stop-hook) 인터페이스입니다.
1. `git status --porcelain` 명령을 하위 파이프라인으로 열어 현재 작업 트리에서 오염되거나 수정된 파일 목록을 실시간 여과합니다.
2. 설정 파일(`~/.omx/config.json`)에 선언된 확장자 필터(기본값: `.ts`, `.tsx`, `.js`, `.py`)와 매칭 여부를 검사합니다.
3. 무한 리팩토링 루프에 빠지는 부작용을 사전에 조율하기 위해, 대상 파일 유효성 검사 통과 시 해당 턴 내에 중복 실행을 막는 락킹용 마커인 `code-simplifier-triggered.marker` 파일을 작업 공간에 생성한 후 `code-simplifier` 에이전트에게 가벼운 최적화 작업을 위임합니다.



## 6. 핵심 데이터 트랜잭션 정의 (Data Flow Model)

### 6.1 스킬 활성 상태 트랜잭션 스키마 (`SkillActiveState`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SkillActiveState",
  "type": "object",
  "required": ["version", "active", "skill", "keyword", "phase", "activated_at", "updated_at", "source"],
  "properties": {
    "version": { "type": "integer", "enum": [1] },
    "active": { "type": "boolean" },
    "skill": { "type": "string" },
    "keyword": { "type": "string" },
    "phase": { "type": "string" },
    "activated_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" },
    "source": { "type": "string", "enum": ["keyword-detector"] },
    "session_id": { "type": "string" },
    "input_lock": {
      "type": "object",
      "properties": {
        "active": { "type": "boolean" },
        "scope": { "type": "string", "enum": ["deep-interview-auto-approval"] },
        "blocked_inputs": { "type": "array", "items": { "type": "string" } },
        "message": { "type": "string" }
      }
    },
    "deep_interview_config": { "type": "object" }
  }
}

```

### 6.2 데이터 흐름 및 세션 생존 주기 상태 머신

시스템 내 세션 트래킹은 시간 경과로 상태를 만료하지 않고, 오직 소유 프로세스의 운영체제 수준 생존 여부만을 신뢰합니다.

```
[CLI 명령어 실행] 
       │
       ▼
[startSession()] ── 기존 만료 세션 정리 (session.json & session-history.jsonl)
       │
       ▼
┌────────────────────────┐
│  세션 활성 루프 상태    │ ◀───┐  정기적인 PID 체크 메커니즘
│  (Session Valid)       │ ────┘  `process.kill(pid, 0)` 성공
└────────────────────────┘
       │
       ├─► process.kill(pid, 0) 실패 (프로세스 급작 종료 / 비정상 사멸)
       ├─► 명시적 명령 호출 `endSession()`
       ▼
[세션 만료 및 정리 정리] ── `stripAgentsMdOverlay()` 실행 및 정적 파일 상태 복원

```

## 7. 시스템 운영 및 제어 임계치 명세 (Control Thresholds)

모듈의 연산 안정성과 자원 제약을 관리하기 위한 고정 임계 지표들은 다음과 같이 설계 규격으로 작동합니다.

* **분류 지표 (Triage Limits)**:
* 비단순 텍스트 목표 구분을 위한 단어 수 최소 한계선 (`HEAVY_WORD_THRESHOLD`): **5단어**
* 단순 조회용 문답 식별 최대 한계선 (`SHORT_QUESTION_WORD_LIMIT`): **10단어**
* 단일 파일 패치 처리를 위한 최대 단어 범위 (`ANCHORED_EDIT_WORD_LIMIT`): **15단어**


* **작업 규모 판단 지표 (Task Sizing Limits)**:
* 소형 작업 강제 전환 최대 단어 한도 (`smallWordLimit`): **50단어** (이하일 경우 무거운 오케스트레이션 로직 완전 차단)
* 대형 다중 에이전트 활성화 하한 단어 한도 (`largeWordLimit`): **200단어**


* **자원 압축 및 최적화 규격 (Resource Buffers)**:
* `AGENTS.md` 주입 시 허용되는 컨텍스트의 최대 글자 한도 (`MAX_OVERLAY_SIZE`): **3,500자**
* 생성되는 압축 코드베이스 구조의 최대 글자 제한선 (`MAX_MAP_CHARS`): **1,000자**
* 스냅샷에 수집 가능한 프로젝트 디렉토리 최대 개수 (`MAX_DIRS`): **14개**
* 개별 디렉토리당 구조 추출을 허용할 최대 소스 파일 개수 (`MAX_FILES_PER_DIR`): **10개**