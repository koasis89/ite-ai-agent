제시한 아키텍처(Phase 1: 실행 제어 백엔드, Phase 2: 대화형 지능 및 UI 레이어)과 제공된 OMX 정적 분석 지도를 기반으로, 기존 데스크톱 코드를 배제하고 클로드 AI 스타일의 '데스크톱 에이전트'를 안정적으로 구축하기 위한 **단계별 통합 로드맵**을 제안합니다.

제시해주신 소스코드 분석 결과(CLI 내부에 이미 `reasoningEffort` 추상화 및 `model-contract.ts` 계약 계층이 구축 완료됨)를 적극 반영하여, LLM 공급자 통합 책임을 Electron Main Process에서 OMX CLI 코어 엔진으로 전면 이관하는 방향으로 고도화된 새로운 단계별 통합 로드맵(v2)을 제안합니다.

이 구조를 채택하면 Electron은 복잡한 LLM SDK 제어나 프롬프트 파싱 로직을 직접 품지 않고, CLI 프로세스를 비차단 스트림으로 조율하며 화면을 그려주는 '수려한 상태 비저장 뷰(Stateless View)'의 책임을 명확히 수행하게 됩니다.
로드맵에 기존 인프라(MCP Stdio, Ndjson 훅 로그, 팀 이벤트 계약)를 명시하지 않으면, 개발팀은 똑같은 기능을 하는 스트리밍 파이프라인이나 폴링(Polling) 메커니즘을 처음부터 다시 만드는 실수를 범하게 됩니다.

기존 자산의 재사용률을 획기적으로 높이고, Electron 메인 프로세스를 가볍게 유지할 수 있도록 기존 백엔드 코드의 구체적인 명칭과 연동 포인트가 결합된 최종 완결판 로드맵(v3)을 제시합니다.

현재 CLI 출력의 파편화 상태(Legacy `spawnSync` 기반의 `Raw Inherit`, 단발성 `Unary JSON`, 그리고 활용되지 못하던 `CommandEventEmitter` 자산)를 해결하기 위한 **구체적인 리팩토링 단계와 스키마 설계 규약**을 반영하여, 완결판 로드맵을 최종 수정 및 보완하였습니다.

이 개정판은 백엔드 코어 엔진팀과 Electron UI 개발팀이 매끄럽게 협업할 수 있도록 **프로세스 제어 방식 전환 및 이벤트를 Ndjson 스트림으로 직렬화하는 규격**을 명확히 명시합니다.

---

# 🚀 OMX 데스크톱 에이전트 구축 최종 로드맵 (v4)

## 🏗️ Phase 1: 실행 제어 및 상태 백엔드 레이어 (Action & State Layer)

이 단계의 목표는 Electron Main Process를 "공식 상호 운용성(Interop) 브로커"로 만들어, CLI 및 MCP 서버 파이프라인과 완벽한 정합성을 이루는 제어 평면을 완성하는 것입니다.

### 📍 Milestone 1: 환경 진단 및 CLI 비차단 래퍼(Wrapper) 구축

* **OMX 환경 검증**: Electron 구동 시 `omx setup` 상태를 점검하고, `omx doctor`를 호출하여 필수 설정 파일(`.codex/config.toml`, `.codex/hooks.json`) 및 런타임 이상 여부를 진단하는 헬스체크 모듈을 작성합니다.
* **비차단 CLI 실행기 구현**: 별도의 HTTP 서버 없이 Electron의 `child_process` 패키지를 활용해 단발성 명령인 `omx team api <명령어> --json`을 비동기식으로 제어하는 래퍼 클래스를 자산화합니다.

### 📍 Milestone 2: Interop Broker 계약 기반 팀/태스크 제어 평면 구현

* **표준 JSON 봉투(Envelope) 파서**: `Unary JSON` 형태로 완료 시점에 단발성으로 반환되는 기계 판독 가능 스키마(`schema_version: "1.0"`, `ok: true/false`, `data`, `error`)를 유효성 검증하는 파이프라인을 구축합니다.
* **태스크 생명주기 제어 API 매핑**: 태스크 상태를 조회하는 `read-task`, 낙관적 버전을 주장해 선점하는 `claim-task`, 그리고 `in_progress -> completed | failed`의 상태 전이를 제어하는 `transition-task-status` API 연동을 완료합니다. 직접적인 tmux 키 입력(`tmux send-keys`) 대신 JSON API 및 파일 상태 결과 조회를 신뢰할 수 있는 제어 경로로 채택합니다.

### 📍 Milestone 3: 백그라운드 MCP 서버 연동 및 훅 로그 테일러(Tailer) 배치

* **기존 코드 재사용 (`src/cli/mcp-serve.ts`)**: `omx mcp-serve` 명령으로 구동되는 서버들의 `stdio`를 전송 계층으로 바인딩하여 백엔드 연결을 활성화합니다.
* **기존 Ndjson 로그 파일 감시**: 에이전트가 동작하면서 자동으로 쌓는 줄바꿈 구분 JSON 파일(`.omx/logs/hooks-*.jsonl`)을 Electron 백엔드가 `tail` 스트림 방식으로 실시간 구독합니다. 이를 통해 폴링 방식의 오버헤드 없이 `needs-input`, `pre-tool-use` 등의 런타임 이벤트를 백그라운드에서 실시간으로 가로챕니다.

---

## 🧠 Phase 2: CLI 스트림 오케스트레이션 및 UI 결합 레이어 (Stream & UI Layer)

이 단계의 목표는 Legacy 파편화 출력을 리팩토링하고, `CommandEventEmitter` 자산을 Stdout 스트림으로 직렬화하여 클로드 AI 스타일의 유기적인 스트리밍 UX를 완성하는 단계입니다.

### 📍 Milestone 4: CLI 출길 통합 및 Ndjson 토큰 스트리밍 파이프라인 구축

* **Legacy 제어 구조 타파 (`spawnSync` -> `spawn` 전환)**: `ask`, `sparkshell` 등 레거시 AI 커맨드가 소유한 기존 `child_process.spawnSync` 및 `stdio: 'inherit'` 구조를 과감히 제거합니다. Electron 백엔드가 표준 출력 스트림을 직접 가로챌 수 있도록 비동기 `spawn` 제어 방식으로 전면 리팩토링합니다.
* **코어 이벤트 직렬화 및 플래그 도입**: `src/cli/ask.ts` 및 관련 스크립트 계층에 `--stream-json` 플래그를 추가 정의합니다. 이 플래그가 활성화되면 `src/core/execute-command.ts` 내에 이미 구현된 `CommandEventEmitter`의 `command.progress` 이벤트를 가로채어, 아래의 **표준화된 Ndjson 봉투 계약** 포맷으로 표준 출력(`process.stdout.write`)에 실시간 한 줄씩 밀어주도록 확장합니다.
* **통합 스트리밍 스키마 규칙 준수**: Electron 메인 프로세스가 줄 단위로 분기할 수 있도록 출력을 통일합니다.
* *에이전트 정보 초기화*: `{"schema_version":"1.0","ok":true,"type":"agent_init","data":{"persona":"planner","reasoningEffort":"high"}}`
* *실시간 글자 토큰*: `{"schema_version":"1.0","ok":true,"type":"token","data":{"text":"출력"}}`
* *백그라운드 도구 호출 감지*: `{"schema_version":"1.0","ok":true,"type":"tool_call","data":{"tool":"claim-task","arguments":{...}}}`



### 📍 Milestone 5: 팀 이벤트 구독 기반 `stdin` 제어 및 블로킹 UI 구현

* **`stdin` 쓰기 파이프라인 형성**: `src/team/state/` 제어 평면의 `read-events` 및 `await-event` 계약 계층 코드를 호출합니다. 에이전트 가동 중 사용자 판단이 수반되는 상태 가동 시 CLI 서브 프로세스를 종료하지 않고 입력 대기 상태로 유지합니다.
* **`wakeable_only=true` 인터랙션 인터류드**: CLI 스트림으로부터 `type: "interlude"` 또는 `askuserQuestion` 결과 유형의 차단형 신호가 전송되면, Electron UI는 채팅창을 즉각 '차단형 인터뷰 모드'로 전환합니다. 사용자가 화면에 입력한 텍스트 맥락은 Node.js `readline` 모듈을 경유하여 가동 중인 하위 프로세스의 writable 스트림(`child.stdin.write(userInput + '\n')`)으로 전달해 연속적인 대화를 이어나갑니다.

### 📍 Milestone 6: 정식 수명주기 결과 기반 오버레이 시각화

* **진실의 경계(Truth Boundary) 기반 렌더링**: 에이전트 상태를 데스크톱 앱 내부에 별도로 저장하지 않고, CLI의 작동 결과로 갱신되는 `.omx/state/` 내부 파일을 절대적 원본으로 신뢰합니다.
* **수명주기 상태 시각화**: 백엔드 감시자로부터 파일 변화를 전달받는 즉시, 화면에 정식 런타임 수명주기 결과(`finished`, `blocked`, `failed`, `userinterlude`)를 대시보드와 사이드바 타임라인 형태로 시각화합니다.

---

## 🛡️ Phase 3: 특수 기능 통합 및 고도화 안정화 (Hardening & Specialized Features)

실제 개발 시나리오에서 누적되는 문서 및 지식 자산을 다루고 시스템 안정성을 강화하는 단계입니다.

### 📍 Milestone 7: 마크다운 프로젝트 위키(Wiki) 및 외부 어댑터 검색 고도화

* **에이전트 검색용 위키 연동**: 벡터 임베딩 없이도 에이전트가 직접 쿼리 및 린트를 수행할 수 있는 마크다운 우선 지식 계층인 `omx wiki query`, `wiki read` 기능을 LLM 도구에 추가 연결합니다. 이를 통해 LLM이 넓은 범위의 레포지토리 탐색을 하기 전에 `omx_wiki/` 디렉터리의 정적 컨텍스트를 우선 검색하여 영속적인 지식 기반 답변을 하도록 유도합니다.
* **외부 어댑터 적응면 확보**: 외부 에이전트 시스템 환경 조회를 위한 어댑터 명령 (`omx adapt openclaw probe`, `hermes status`)을 바인딩하여 확장 가능한 비대칭 능력 보고 기능을 UI에 지원합니다.

### 📍 Milestone 8: 다중 상태 정합성 검증 및 예외 처리 하드닝

* **다중 상태 전이 규칙 준수**: `team + ralph` 또는 `team + ultrawork`와 같이 허용 목록에 있는 중복 결합 상태를 정상적으로 해석하고, 금지된 롤백(실행형 모드에서 기획형 모드로의 강제 전환) 발생 시 UI 단에서 명확한 상태 클리어 가이드를 출력하도록 비즈니스 예외 로직을 정교화합니다.
* **정합성 확인 및 테스트 자동화**: 플러그인 디스패치 로그(`.omx/logs/hooks-*.jsonl`)와 카탈로그 원본(`manifest.json`) 간의 미러 불일치(Drift) 여부를 빌드 타임 및 검증 타임에 추적할 수 있도록 릴리즈 게이트 검증 체계를 유지합니다.

---

## 💡 데스크톱 개발팀을 위한 실무 팁

1. **UI 앱의 경량화 및 상태 비저장 유지**: Electron 앱은 무거운 프롬프트 파일(`.md`) 직접 로드 로직이나 `reasoningEffort` 변환 논리, LLM SDK 통합 로직을 품을 필요가 없습니다. 오직 CLI가 분출하는 Ndjson 파이프라인의 입출력 조율과 수려한 시각화에만 기술 공수를 집중하십시오.
2. **복합 스트림 에러 핸들링**: CLI 내부에서 예기치 못한 레거시 텍스트 로그나 바이너리 워닝이 `stdout`에 불규칙하게 섞여 출력될 수 있습니다. Electron Main Process 내부 파서에는 `try-catch` 블록을 엄격히 구성하여, 유효한 JSON 봉투가 아닌 라인은 UI 안정성을 위해 일반 텍스트 로그 세션으로 우회(Fallback) 처리하는 방어적 예외 로직을 심어두어야 합니다.
3. **도구 지연(Deferred) 메시징 처리**: 단일 프롬프트에서 여러 개의 `$skill` 토큰이 동시에 식별되는 경우, 앱 UI는 즉각적인 다중 자동 실행 대신 계획형 단계를 보존하고 지연된 스킬을 알림 영역에 명시적으로 노출해 주어야 사용자가 에이전트의 다음 행동을 예측할 수 있습니다.

