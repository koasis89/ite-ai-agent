# 변경 내역

이 프로젝트의 모든 주목할만한 변경 사항은 이 파일에 문서화되어 있습니다.

## [미공개]

## [0.16.2] - 2026-05-08

`0.16.1` 릴리스 후 수정 및 작업 흐름 강화: `$ultragoal` Codex 목표 집계, 커밋 공유 wiki/압축 지원, 세션 격리 상태 저장 작업 흐름, 설정 소유 Codex 후크 신뢰 상태 및 생성된 후크 기능 플래그에 대한 릴리스 검토 수정.

### 추가됨

- **집계 `$ultragoal` 모드** — OMX가 스토리별 체크포인트를 기록하는 동안 새로운 울트라 목표 계획은 기본적으로 하나의 집계 Codex 목표로 설정됩니다. 레거시 스토리별 모드는 기존/모드 없음 계획 및 명시적인 `--codex-goal-mode per-story`에 계속 사용할 수 있습니다.
- **커밋 공유 프로젝트 위키** — 정식 위키 저장소는 이제 내구성 있는 압축 결과를 보존하기 위해 기본 `PreCompact`/`PostCompact` 후크와 함께 저장소 루트 `omx_wiki/`에 있습니다.
- **설치 프로그램 소유 Codex 후크 신뢰 상태** — 설치 프로그램은 사용자 후크 상태를 유지하면서 생성된 `codex-native-hook.js` 래퍼에 대한 신뢰 레코드를 작성합니다.

### 변경됨

- **목표 모드 핸드오프 지침** — Ultragoal 문서, 스킬/플러그인 미러, 계획, ralplan, 심층 인터뷰 및 플래너 지침은 이제 `$ultragoal`을 기본 내구성 목표 모드 후속 조치로 권장합니다.
- **Wiki 호환성 경계** — 레거시 `.omx/wiki/`은 정식 `omx_wiki/`이 없을 때 읽기 전용 폴백으로 유지됩니다.

### 결정된

- **상태 저장 워크플로 세션 격리** — 세션 범위 워크플로 상태는 더 이상 루트/전역 워크플로 항목에서 상속되거나 자동 완성되지 않습니다. 명시적 `all_sessions` 지우기는 전역 정리 경로를 유지합니다.
- **Codex 후크 기능 플래그 회귀** — 릴리스 검토를 통해 생성된 구성을 `[features].codex_hooks = true`으로 복원하고, 오래되거나 릴리스되지 않은 `[features].hooks = true` 별칭을 복구하고, 이에 따라 설정/문서/테스트/플러그인 미러를 업데이트합니다.
- **릴리스 본문 생성** — `RELEASE_BODY.md`에는 생성된 GitHub 릴리스 노트에 필요한 기여자 앵커가 다시 포함됩니다.

### PR

- #2174, #2188, #2180, #2194, #2193

### 확인

- 릴리스 준비 증거는 `docs/qa/release-readiness-0.16.2.md`에서 추적됩니다.

## [0.16.1] - 2026-05-08

`0.16.0` 이후 안정성 및 릴리스 안전성 강화에 초점을 맞춘 패치 릴리스: 제한된 탐색 실행, 더 안전한 로컬 탐색 빠른 경로 읽기, 깨끗한 CI 종속성 설치 증명, 세션 범위 런타임 권한, 승인된 팀 핸드오프 복구 동작, 컨텍스트 팩 상태 가시성, 심층 인터뷰 흐름 명확성 및 실행/런타임 수정.

### 추가됨
- **컨텍스트 팩 핸드오프 상태 가시성** — 승인된 실행 경로는 읽기 전용 컨텍스트 팩 준비 상태/상태를 노출할 수 있으므로 후속 복구 동작이 명시적입니다.
- **빠른 경로 회귀 적용 범위 살펴보기** — 이제 로컬 탐색 테스트에서 심볼릭 링크 대체 및 대형 텍스트 검색 대체 동작을 다룹니다.

### 변경됨
- **CI 종속성 증명이 다시 깨끗해졌습니다** — 노드 CI 작업은 복원된 `node_modules` 캐시에서 설치를 건너뛰는 대신 무조건 `npm ci`을 실행합니다.
- **팀 승인 핸드오프는 더 엄격하고 수리 가능성이 더 높습니다** - 선택된 핸드오프, 유효하지 않은 진단, 준비되지 않은 수리 전용 처리, 바인딩 전송 및 DAG 대체 상태가 정렬된 상태로 유지됩니다.
- **런타임/세션 권한이 더 내구성이 있습니다** — 세션 범위 런타임 상태, 프로젝트 범위 Codex 목표 상태 및 오래된 스킬 활성/HUD 정리가 강화되었습니다.

### 결정된
- **로컬 빠른 경로 경계 강화 살펴보기** — 명시적 로컬 파일 읽기는 읽기 전에 심볼릭 링크를 거부하고 텍스트 검색은 크기가 큰 파일을 로드하는 대신 제한된 읽기를 사용합니다.
- **탐색 프로세스 폭풍 보호** — Codex 지원 탐색 실행에는 의미 폴백 이전에 더 강력한 프로세스/출력 제한이 있습니다.
- **실행/런타임 안정성** — Darwin 작업 트리 실행 어설션, Windows OMX 루트 경로, 현재 JS 런타임 도우미, 플러그인 기술 캐시 새로 고침, MCP 형제 정리, 시각적 Ralph 복구 및 기본 후크 배경 출력이 강화되었습니다.

### 확인
- 릴리스 준비 증거는 `docs/qa/release-readiness-0.16.1.md`에서 추적됩니다.

## [0.16.0] - 2026-05-06

기술 지원 중단 및 기본 Codex 목표 모드 통합에 초점을 맞춘 부 릴리스입니다. 이 릴리스에서는 내구성 있는 목표 워크플로, Codex 목표 스냅샷 조정, 팀/Ralph 목표 전달 안전 및 `0.15.3` 이후 카탈로그/플러그인 기술 전달 정리를 준비합니다.

### 추가됨
- **기본 목표 모드 워크플로** — `ultragoal`, `performance-goal` 및 `autoresearch-goal`는 내구성 있는 저장소 아티팩트, 모델 지향 Codex 목표 전달, 검증 원장 및 완료 조정을 제공합니다.
- **목표 워크플로 검증 기반** — 공유 도우미는 완료를 수락하기 전에 워크플로 상태, 원장, 검증 요약 및 새로운 Codex 목표 스냅샷 확인을 기록합니다.
- **파이프라인 패키지 템플릿 및 문서** — GitHub 패키지 파이프라인 템플릿, 목표 워크플로 문서, Discord 통합 문서 및 릴리스 준비 증거가 확장되었습니다.

### 변경됨
- **Ralph와 팀의 목표 전달이 더욱 엄격해졌습니다** - 이제 완료 경로가 Codex 목표 모드 진실 경계와 승인된 실행 컨텍스트를 존중합니다.
- **탐색, 알림 및 CI 경로가 강화되었습니다** - 시작 범위 탐색, 알림 프록시 처리, 질문 핸드셰이크, 박스형 상태 라우팅 및 분할 CI/패키지 확인을 통해 릴리스 안정성이 향상됩니다.

### 더 이상 사용되지 않음
- **직접 `omx autoresearch` 실행은 더 이상 사용되지 않습니다** — 목표 모드 지원 연구 워크플로에 `$autoresearch` 또는 `omx autoresearch-goal`을 사용합니다.

### 제거됨
- **카탈로그에서 더 이상 사용되지 않는 플러그인 기술 전달** — 카탈로그에서 더 이상 사용되지 않는 설치 가능/플러그인 전달에서 더 이상 사용되지 않는 기술입니다. 더 이상 사용되지 않는 루트 래퍼는 호환성 스텁으로 남아 있을 수 있습니다.

### 결정된
- **목표 워크플로우의 허위 완료 위험** — 완료 체크포인트에는 새로운 Codex 목표 스냅샷의 일치하는 목표/상태 증거가 필요합니다.
- **런타임 수명 주기 누출** — 오래된 중지 처리, MCP 형제 정리, Ralph 세션 리바인딩, 박스형 상태 라우팅 및 작업자 중지 동작이 강화되었습니다.

### 확인
- 릴리스 준비 증거는 `docs/qa/release-readiness-0.16.0.md`에서 추적됩니다. 게시는 로컬 게이트 및 GitHub CI가 통과될 때까지 차단된 상태로 유지됩니다.

## [0.15.1] - 2026-04-29

`0.15.0` 이후 릴리스 트레인 강화에 초점을 맞춘 패치 릴리스: 직접/비 tmux 리더 실행 제어, 수동적 읽기 전용 상태 작업, 구체적인 저장소 인식 팀 DAG 종속성 재매핑, 설정/플러그인 모드 복구, 감사된 실행 후속 조치 및 런타임/후크 신뢰성 수정.

### 추가됨
- **직접 리더 실행 제어** — `omx --direct` 및 `OMX_LAUNCH_POLICY=direct|tmux|detached-tmux|auto`을 통해 운영자는 기본 분리형 tmux 시작 동작을 변경하지 않고도 OMX tmux/HUD 관리를 선택 해제할 수 있습니다.
- **감사된 exec 후속 작업** — 비대화형 `omx exec` 작업을 실행하면 감사된 주입 경로를 통해 대기 중인 후속 작업 지침을 받을 수 있습니다.

### 변경됨
- **상태 읽기는 수동적입니다** — `state_read`, `state_list_active` 및 `state_get_status`는 더 이상 부작용으로 `.omx/state` 또는 tmux-hook 구성을 초기화하지 않습니다.
- **리포지 인식 팀 DAG 핸드오프는 구체적인 작업 ID를 사용합니다** — 기호 종속성은 작업 생성 후 다시 매핑된 다음 작업자 받은 편지함/부트스트랩 생성 전에 런타임 작업 레코드에 패치됩니다.
- **설정/플러그인 지침이 더 명확해졌습니다** — 설정에서는 명시적인 레거시/플러그인 선택을 유지하고, 오래된 레거시 자산을 플러그인 모드에서 보관하며, 직접 실행 탈출구를 문서화합니다.

### 결정된
- **런타임 및 후크 강화** — 수명 주기 읽기 중지는 표준 실행 상태를 선호하고, MCP 상태 지속성은 전송 연결 끊김에도 살아남고, 프롬프트 재개는 확인되지 않은 PID 하드 오류를 방지하고, 소스 로그 텍스트가 더 이상 후크 블록을 트립하지 않으며, macOS 시작 폴링 압력이 감소합니다.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 플러그인 매니페스트, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.15.1`에 맞춰집니다.

## [0.15.0] - 2026-04-25

Minor release focused on making OMX easier to install, ship, and operate across Codex CLI, Codex App, plugin, native-agent, tmux, and Rust-backed execution surfaces. This release prepares the plugin delivery train, Visual Ralph, setup install-mode selection, native agent/model routing, hook/runtime hardening, Windows/tmux question reliability, CI hang protection, Rust compatibility fixes, and release collateral for the `0.15.0` cut.

### 추가됨
- **자사 Codex 플러그인 패키징** — OMX는 이제 미러링된 `plugins/oh-my-codex` 번들, 플러그인 마켓플레이스 메타데이터, Codex 앱 호환성 설명자, 플러그인 번들 SSOT 검사 및 설치 모드 설정 적용 범위를 제공합니다.
- **시각적 Ralph 워크플로** — `visual-ralph`은 이제 라우팅, 메타데이터 검증, 생성된 문서 및 회귀 적용 범위를 갖춘 일류 워크플로 기술입니다.
- **네이티브 에이전트 정책/모델 라우팅** — 네이티브 하위 에이전트 정의, 모델 테이블 생성 및 설정 덮어쓰기 테스트는 이제 `gpt-5.5` 프론티어, `gpt-5.4-mini` 표준 및 `gpt-5.3-codex-spark` 빠른 차선 계약을 유지합니다.
- **문서 새로 ​​고침 시행 및 자사 MCP 표면** - 이제 설정/구성 경로에 새로운 새로 고침 시행 및 자사 MCP 구성 적용 범위가 포함됩니다.

### 변경됨
- **설정에서 플러그인 또는 레거시 기술 전달을 선택할 수 있습니다** — 프로젝트 설정은 이제 지속 설치 모드를 유지하고, 플러그인 정리/백업을 보고하고, 관리되는 후크/런타임 자산을 정렬하고, Codex 앱 및 CLI 사용자를 위해 다음 단계를 더 명확하게 만듭니다.
- **플러그인과 생성된 자산은 단일 진실 소스에서 확인됩니다** — 기본 에이전트 확인, 플러그인 미러 동기화, 생성된 카탈로그 문서 및 패키지 저장소/레이아웃 테스트가 이제 릴리스 패키징 드리프트를 보호합니다.
- **팀/런타임 프롬프트는 안전한 실행에 대해 더 명확합니다** — 작업자, 팀, Ralph, 의사, 도움말 및 설정 지침은 이제 플러그인 모드, 런타임 소유권 및 작업 우선 실행 경계를 더 잘 설명합니다.
- **릴리스 기반 처리가 명시적입니다** — `v0.14.4`이 존재하지만 현재 `dev` 후보의 조상이 아닙니다. 이 릴리스에서는 `v0.14.3`를 확인된 연결 가능한 비교 기반으로 사용하고 릴리스 자료에 해당 범위의 주의 사항을 기록합니다.

### 결정된
- **Codex 앱 및 플러그인 후크 호환성** — 앱 세션은 tmux 전용 런타임 경로를 방지하고, 플러그인 접두사가 붙은 기술이 올바르게 라우팅되고, 범위가 지정된 플러그인 콘텐츠가 표준 소스와 정렬된 상태를 유지하며, 설정에서 로컬 무시 상태 덮어쓰기를 방지합니다.
- **Windows/tmux 질문 안정성** — Windows/연결되지 않은 질문 렌더링 및 콘솔 동작은 더 강력한 대체 및 회귀 적용 범위를 갖습니다.
- **후크 및 감시자 강화** — 알림 폴백 감시자, 파생 감시자, 오래된 tmux 소켓, Stop-hook 구문 분석 기능 및 설정 플러그인 수정 사항이 대상 회귀에 포함됩니다.
- **CI 및 Rust 호환성** — 노드 테스트 실행에는 제한된 무음 처리 기능이 있으며 탐색 하네스는 Cargo/Rust 1.73 시대 제약 조건과 호환됩니다.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.15.0`에 맞춰져 있습니다.

## [0.14.4] - 2026-04-24

패치 릴리스는 정확한 `gpt-5.4-mini` 표준/미니 이음새와 `gpt-5.3-codex-spark` 스파크 레인을 유지하면서 기본 프론티어 레인을 `gpt-5.4`에서 `gpt-5.5`로 승격시키는 데 중점을 두었습니다. 문서, 설정/구성 지침, 템플릿, 회귀 적용 범위 및 릴리스 메타데이터가 해당 계약에 맞춰 조정됩니다.

### 변경됨
- **프론티어 기본값은 이제 `gpt-5.5`을 대상으로 합니다** — 런타임 기본값, Codex 에이전트 기본값 및 `omx explore` 대체 동작은 이제 `gpt-5.4` 대신 `gpt-5.5`를 사용합니다.
- **설정/구성 지침은 새로운 프론티어 기본값과 일치합니다** — 구성 시드 문서 및 회귀 적용 범위는 이제 동일한 `250000 / 200000` 컨텍스트 권장 사항을 유지하면서 `gpt-5.5`을 설명합니다.
- **설정 및 실행기 추론 기본값은 중간입니다** — 생성된 설정 구성 및 실행기 작업자 실행 기본값은 이제 높음 대신 중간 추론을 사용합니다.
- **미니 및 스파크 레인은 정확하게 유지됩니다** — `gpt-5.4-mini` 및 `gpt-5.3-codex-spark` 동작은 변경되지 않고 즉각적인 지침과 테스트를 통해 여전히 정확한 일치 의미를 적용합니다.

### 결정된
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.14.4`에 맞춰져 있습니다.

## [0.14.3] - 2026-04-22

`0.14.2` 이후 최신 `dev` 강화 트레인에 초점을 맞춘 패치 릴리스: 질문/심층 인터뷰 반환 창 안정성, 프로젝트-로컬 탐색 실행 컨텍스트, TOML 복구 안전 설정, HUD 조정 창 대상 지정, Ultrawork 프로토콜 정렬, BusyBox 정리 호환성, 오래된 중지/자동 조종 장치 상태 처리, 표준 런타임 감독자 이벤트, Docker-host tmux 질문 렌더링 및 기본 Windows psmux 작업자 창 부트스트랩 강화.

### 추가됨
- **표준 감독자 런타임 이벤트** — 런타임 명령-이벤트 계약에는 이제 감독자 제어 및 다운스트림 파견/준비 결정을 위한 표준 이벤트 유형이 포함됩니다.
- **심층 인터뷰 요약 게이트** — 대규모 인터뷰 흐름에서는 이제 계속하기 전에 간결한 요약이 필요합니다.
- **Docker-host tmux 질문 브리지** — 질문 렌더링은 운영자 프롬프트가 표시되도록 docker-host tmux 감지를 브리지할 수 있습니다.

### 변경됨
- **질문 답변은 리더 창을 유지합니다** — 도구 실행 `omx question` 흐름은 프롬프트 다시 시드 및 렌더러 메타데이터 경합 전반에 걸쳐 올바른 반환 창을 유지하고 재사용합니다.
- **Explore는 프로젝트-로컬 Codex 홈을 존중합니다** — 시작/세션 도우미는 적절한 경우 `CODEX_HOME`을 프로젝트 `.codex` 디렉터리로 확인하여 지속적인 프로젝트 설정 범위를 존중합니다.
- **설정 구성 복구가 더 안전합니다** — 여러 줄의 루트 TOML 문자열은 루트 항목으로 구문 분석되므로 설정에서 더 이상 고아 조각이나 손상된 `developer_instructions` 스타일 값을 새로 고치지 않습니다.
- **HUD 조정은 창 로컬로 유지됩니다** — 후크 기반 HUD 크기 조정/조정 작업은 방출하는 tmux 창을 대상으로 합니다.
- **Ultrawork 프로토콜은 업스트림 정렬 상태를 유지합니다** — 제공된 Ultrawork 기술에는 oh-my-openagent에서 사용하는 업스트림 프로토콜 새로 고침이 통합되어 있습니다.
- **기본 Windows 작업자 창이 더욱 강력해졌습니다** — psmux 작업자 부트스트랩은 오래된 창/시작 가정을 방지합니다.

### 결정된
- **답변된 심층 인터뷰 라운드에서 더 이상 메시지가 다시 표시되지 않습니다** — 집행이 다시 요청하기 전에 오래된 질문 상태가 답변된 기록과 조정됩니다.
- **렌더러 메타데이터 경합에서 질문 답변이 더 이상 지연되지 않습니다** - 렌더러 반환 대상 메타데이터가 안정화되어 답변을 호출 창에 다시 주입할 수 있습니다.
- **분리/숨겨진 질문 프롬프트는 운영자에게 계속 표시됩니다** — 운영자에게 프롬프트를 숨겨 두는 대신 질문 렌더링이 닫히거나 표시되는 tmux 컨텍스트에 연결되지 않습니다.
- **BusyBox 정리 호환성** — `ps`이 `command`을 거부할 때 정리는 BusyBox 호환 `args` 필드를 사용하여 프로세스 검색을 다시 시도합니다.
- **기본 중지는 더 이상 오래된 자동 조종 장치 계획 상태에서 반복되지 않습니다** — 중지 처리가 반복되기 전에 오래된 계획 상태가 지워지거나 조정됩니다.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.14.3`에 맞춰져 있습니다.

## [0.14.2] - 2026-04-21

`0.14.1` 이후 빠른 후속 운영자 신뢰성에 초점을 맞춘 패치 릴리스: 연결된 tmux 창 외부에서 더 안전한 `omx question` 렌더러 동작, 누출 방지 MCP 중복 정리, 더 엄격한 심층 인터뷰 세션 상태 처리, `ulw` ultrawork 약어에 대한 한국어 IME 드리프트 처리, `omx question`에 대한 공유 tmux 응답 제출 의미 체계, 더 명확한 심층 인터뷰 배경 질문 지침, TypeScript/Biome 기준선을 새로 고치고 부차적인 정렬을 해제합니다.

### 추가됨
- **한국어 `ulw` 키보드 드리프트 처리** — 한국어 2세트 키보드에서 `ㅕㅣㅈ`을 입력한 프롬프트는 작업 흐름 활성화 전에 기존 `ulw` ultrawork 속기로 정규화됩니다.
- **백그라운드 `omx question` 지침** — 이제 심층 인터뷰 기술/템플릿/네이티브 후크 지침은 상담원에게 백그라운드 질문 터미널이 완료될 때까지 기다렸다가 계속하기 전에 JSON 답변을 읽도록 지시합니다.

### 변경됨
- **질문 답변 삽입은 이제 공유 tmux 제출 의미 체계를 재사용합니다** — `src/question/renderer.ts`은 `buildSendPaneArgvs`에 위임하여 리터럴 텍스트 전달, 개행 삭제 및 격리된 `C-m` 제출을 응답 리스너 창 전송 경로에 맞춰 정렬합니다.
- **질문 렌더러는 이제 연결된 tmux 외부에서 닫히지 않습니다** — `omx question`은 이제 표시되는 연결된 창이 없을 때 분리된 tmux 세션 생성을 거부하여 보이지 않는 렌더러를 시작하는 대신 명확한 운영자 측 오류를 표시합니다.
- **심층 인터뷰 키워드 의도가 더 좁습니다** — 활성화 의도가 명시되지 않는 한 정리/상태 관리에서 "심층 인터뷰"에 대한 언급이 더 이상 워크플로를 트리거하지 않습니다.
- **TypeScript 기준이 새로 고쳐졌습니다** — TypeScript는 `6.0.3`으로 업데이트되고 Biome 잠금 파일 메타데이터는 `2.4.12`로 새로 고쳐지고 `tsconfig.json`는 TS 6 빌드 경로에 대한 노드 주변 유형을 고정합니다.

### 결정된
- **오래된 중복 MCP 형제** — 이전 중복 stdio 서버는 이제 트래픽을 확인한 후 무기한 머무르는 대신 안전한 트래픽 후 유휴 기간이 지나면 자동 종료됩니다.
- **세션 범위의 명확한 폴백 누출** - 이제 활성 세션에서 추적된 모드를 지우면 필요할 때 비활성 세션 삭제 표시가 작성되므로 레거시 루트 폴백 상태는 모드가 다시 활성화된 것을 즉시 보고하지 않습니다.
- **실패한 질문은 명확한 심층 인터뷰 의무를 시작합니다** — 심층 인터뷰는 렌더러를 시작할 수 없을 때 더 이상 보류 중인 질문 의무를 남기지 않습니다.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.14.2`에 맞춰져 있습니다.

## [0.14.1] - 2026-04-21

`0.14.0`에 제공된 새로운 대화형 오케스트레이션 표면 강화에 초점을 맞춘 패치 릴리스: tmux 환경 전반의 질문 창 안정성, 심층 인터뷰 중지 시행 및 재사용 세션 브리징, 새로 고침 복원력 설정/업데이트, 수명 주기 계약 중복 제거, 코드 검토/경량 대체 지침 다듬기.

### 추가됨
- **재사용 세션에 대한 심층 인터뷰 브리지 지침** — 이제 `omx question`을 사용할 수 없을 때 프롬프트 측 컨텍스트에 구체적인 현재 세션 CLI 브리지 명령이 포함됩니다.
- **분리된 질문 렌더러 활성 범위** - 이제 회귀 테스트에서는 분리된 tmux 질문 세션이 실행 후에도 유지되고 즉시 사라지면 페일클로즈되는 것을 확인합니다.

### 변경됨
- **코드 검토 워크플로 지침이 더욱 강력해졌습니다** — 이제 제공된 코드 검토 기술에는 보다 포괄적인 이중 관점 검토 자세가 필요합니다.
- **경량 네이티브 폴백 레인은 더 간결합니다** — `omx explore` / `omx sparkshell` 폴백 지침은 일반 역할 명단을 오염시키지 않고 미니/스파크 레인에 유지됩니다.
- **라이프사이클 정규화는 이제 공유 계약에 위임됩니다** — 터미널 라이프사이클 호환성 도우미는 다양한 복사본을 운반하는 대신 중앙 집중식 실행 결과 계약을 재사용합니다.

### 결정된
- **대기 중인 심층 인터뷰 질문은 이제 모드가 자체적으로 비활성 상태로 표시된 후에도 중지가 차단된 상태로 유지됩니다**.
- **질문 창은 POSIX가 아닌 tmux 셸에서 활성 상태로 유지되며 시작 중에 창/세션이 사라질 때 닫히지 않습니다**.
- **승인된 설정 새로 고침은 더 이상 관리되는 `AGENTS.md`을 삭제하지 않으며, 설치 후/설정 새로 고침은 npm의 설치 접두사에 뿌리를 두고 있습니다**.
- **명시적 `omx update`은 설치된 코드가 최신이지만 설정 스탬프가 오래되고 업데이트 확인 상태 쓰기 실패가 더 이상 명시적 업데이트를 차단하지 않는 경우 설정 새로 고침을 다시 실행합니다**.
- **Stale Ralph/skill-active/ultrawork 중지 상태가 더 이상 세션 또는 플러드 전체에서 누출되지 않습니다. 처리 중지**.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.14.1`에 맞춰져 있습니다.

## [0.14.0] - 2026-04-19

대화형 오케스트레이션 변경 사항을 중심으로 한 마이너 릴리스: 새로운 `omx question` 차단 질문 진입점, 심층 인터뷰 및 자동 조사 흐름 강화, 자문 분류 라우팅, 명시적 런타임 실행 결과, 전문가 라우팅 정리 및 배송된 패키지에 대한 릴리스 방지 강화.

### 추가됨
- **`omx question` CLI 진입점** — 이제 OMX는 구조화된 프롬프트 페이로드를 허용하고, 질문 상태를 기록하고, tmux/네이티브 UI 흐름을 렌더링하고, 호출 에이전트/런타임에 구조화된 답변을 반환하는 자체 차단 질문 명령을 노출합니다.
- **구조화된 심층 인터뷰 질문 의무** — 이제 심층 인터뷰 라운드에서 명시적인 보류 질문 의무가 생성되므로 OMX는 완료를 추적하고 필수 질문에 아직 답변하지 않은 동안 조기 중지를 방지할 수 있습니다.
- **자문 분류 라우팅 계층** - 이제 키워드가 아닌 프롬프트도 지속적인 분류 상태 및 후속 조치 억제를 통해 지원되는 PASS/LIGHT/HEAVY 라우팅 힌트를 받을 수 있습니다.

### 변경됨
- **심층 인터뷰에서는 `omx question` 엔드투엔드를 사용합니다** — 대화식 설명은 이제 대체 임시 프롬프트 대신 구조화된 질문 UI를 통해 라우팅되어 질문 소유권과 수명 주기를 명시적으로 만듭니다.
- **자동 연구는 이제 스킬 우선 및 검증자 중심입니다** — 프롬프트/스킬 워크플로를 위해 직접 `omx autoresearch` 호출은 더 이상 사용되지 않으며, 이제 완료하려면 검증자 증거가 필요합니다.
- **런타임 연속 의미 체계는 명시적입니다** - 실행 결과는 공유 터미널/비터미널 계약으로 정규화되므로 중지/계속 동작이 런타임 루프와 상태 표면 전체에서 일관되게 유지됩니다.
- **전문가 라우팅 지침이 더 명확해졌습니다** - 저장소 조회, 공식 문서 연구 및 종속성 평가 경로가 이제 프롬프트 및 역할 라우팅에서 더 좁은 소유권 경계를 갖습니다.
- **Lint 검증은 이제 추적된 소스 루트를 대상으로 합니다** — `npm run lint`은 `src` 및 `bin`을 직접 검증하므로 자체 Biome 루트가 있는 중첩된 로컬 작업 트리/런타임 디렉터리가 더 이상 릴리스 게이팅을 중단하지 않습니다.

### 결정된
- **대화형 작업에 대한 게이팅 중지** — 대기 중인 심층 인터뷰 질문 및 불완전한 자동 조사 검증은 이제 필요한 대화형/검증기 작업이 충족될 때까지 지속적으로 중지를 차단합니다.
- **질문/런타임 UI 통합** — 렌더러 전략 선택, 답변 삽입 및 질문 상태 전환은 분할 임시 처리 대신 새로운 질문 런타임 경로로 처리됩니다.
- **릴리스 메타데이터 드리프트** — 노드/화물 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 자료가 `0.14.0`에 맞춰져 있습니다.

## [0.13.2] - 2026-04-18

보안 강화, 영구 후크 및 중지 처리 정확성, Ralph 활성화 및 복구 안전, 재진입 가드 탐색, 작업자 런타임 ID 보존, 기술 UX 개선 및 릴리스 워크플로 메타데이터 다듬기를 다루는 패치 릴리스입니다.

### 추가됨
- **기술 부활 분석** — `analyze` 기술이 OMX 세션에 대한 읽기 전용 진실 조사 표면으로 돌아옵니다. (홍보 [#1687](https://github.com/Yeachan-Heo/oh-my-codex/pull/1687))
- **OMX 기술 표시 접두사** — 이제 OMX 설치 기술은 이름 변경 없이 `/skills`에 표시되므로 사용자는 OMX 관리 기술을 로컬 기술과 구분할 수 있습니다. (홍보 [#1686](https://github.com/Yeachan-Heo/oh-my-codex/pull/1686))
- **Shift+Enter tmux 분류 문서** — 운영자가 OMX 회귀에서 터미널/환경 문제를 분리할 수 있도록 tmux에서 Shift+Enter 줄바꿈 동작을 문서화했습니다. (PR [#1683](https://github.com/Yeachan-Heo/oh-my-codex/pull/1683), 발행 [#1682](https://github.com/Yeachan-Heo/oh-my-codex/issues/1682))

### 결정된

#### 보안/강화
- **식별자 처리의 경로 순회** — 팀/세션 조인에 도달하고 상위 경로 순회 표면을 닫기 전에 식별자를 검증합니다. (PR [#1658](https://github.com/Yeachan-Heo/oh-my-codex/pull/1658), [#1674](https://github.com/Yeachan-Heo/oh-my-codex/pull/1674), 발행 [#1650](https://github.com/Yeachan-Heo/oh-my-codex/issues/1650))
- **HUD 상태 셸 및 정규식 삽입** — `execFileSync`은 리더 git 폴링에서 비동기 `execFile`로 대체되었으며, git 도우미는 이제 HUD `remoteName` 입력에 대한 회귀 적용 범위를 사용하여 셸/정규식 메타 문자를 거부합니다. (홍보 [#1662](https://github.com/Yeachan-Heo/oh-my-codex/pull/1662), [#1652](https://github.com/Yeachan-Heo/oh-my-codex/pull/1652))
- **답장 승인 수정** — 알림 응답 승인은 더 이상 관련 없는 감시자 이탈을 부활시키지 않고 인용된 비밀 또는 여러 부분으로 구성된 비밀을 유출하지 않습니다. (홍보 [#1670](https://github.com/Yeachan-Heo/oh-my-codex/pull/1670))
- **전이적 종속성 취약성** — `npm audit fix`은 전이적 종속성 CVE 패치에 적용됩니다. (홍보 [#1669](https://github.com/Yeachan-Heo/oh-my-codex/pull/1669))

#### 중지/지속적 후크
- **기본 중지 자동 넛지** — 기본 중지 자동 넛지는 이제 OMX 런타임에 의해 제어되지 않고 실행되는 반면 활성 OMX 워크플로는 실제로 완료될 때까지 중지를 계속 차단합니다. 중지 후크 정리는 사용되지 않은 CI 확인 아래에서 녹색으로 유지됩니다. (홍보 [#1707](https://github.com/Yeachan-Heo/oh-my-codex/pull/1707))

#### Ralph/런타임 권한
- **대화형 Ralph 언급 게이팅** - 대화에서 Ralph에 대한 우연한 언급이 더 이상 워크플로 상태를 시드하지 않아 실수로 활성화되는 것을 방지합니다. (PR [#1697](https://github.com/Yeachan-Heo/oh-my-codex/pull/1697), 발행 [#1696](https://github.com/Yeachan-Heo/oh-my-codex/issues/1696))
- **Ralph 연속 복구** — Ralph는 연속 복구 전반에 걸쳐 눈에 띄게 활성 상태를 유지하며 죽은 Ralph 쿨다운 상태가 제거되어 CI가 녹색으로 유지됩니다. (PR [#1681](https://github.com/Yeachan-Heo/oh-my-codex/pull/1681), 발행 [#1677](https://github.com/Yeachan-Heo/oh-my-codex/issues/1677))
- **Ralph 조향 잠금 재시도 제한** — 이제 무한한 오래된 잠금 루프를 방지하기 위해 `withRalphSteerLock` 재시도에 제한이 적용됩니다. (홍보 [#1663](https://github.com/Yeachan-Heo/oh-my-codex/pull/1663))
- **작업자 런타임 ID 보존** — 작업자 런타임 역할 ID는 시작 및 확장 후에도 유지되며 작업자 ID 확인은 하나의 좁고 검토 가능한 경로로 축소됩니다. (홍보 [#1676](https://github.com/Yeachan-Heo/oh-my-codex/pull/1676))

#### 탐색/발사 안전
- **쉘 시작 재진입 실패 시 종료됨** — `omx explore`은 반복되는 대신 쉘 시작 재진입 시 실패 종료됩니다. (PR [#1700](https://github.com/Yeachan-Heo/oh-my-codex/pull/1700), 발행 [#1698](https://github.com/Yeachan-Heo/oh-my-codex/issues/1698))
- **허용 목록 래퍼 자체 해결 살펴보기** — `omx explore` 허용 목록 래퍼는 더 이상 자체 해결 및 반복되지 않습니다. (PR [#1695](https://github.com/Yeachan-Heo/oh-my-codex/pull/1695), 발행 [#1692](https://github.com/Yeachan-Heo/oh-my-codex/issues/1692))

#### 후크/알림/세션 상태
- **포크된 알림 후크 라우팅** — 포크된 알림 후크 활동은 표류하는 대신 활성 포크 세션에 연결된 상태로 유지됩니다. (PR [#1680](https://github.com/Yeachan-Heo/oh-my-codex/pull/1680), 발행 [#1679](https://github.com/Yeachan-Heo/oh-my-codex/issues/1679))
- **오래된 감시자 PID 재사용** — inform-fallback-watcher는 일반 텍스트 PID 대체, 잠금 디렉터리 홀더 PID, 활성 확인 및 Windows 가드를 사용하여 오래된 PID를 확보하기 전에 프로세스 ID를 확인합니다. (PR [#1672](https://github.com/Yeachan-Heo/oh-my-codex/pull/1672), 발행 [#1657](https://github.com/Yeachan-Heo/oh-my-codex/issues/1657))
- **tmux 확장 키 오래된 잠금 복구** — tmux 확장 키 임대 잠금은 이제 무기한 정지 대신 오래된 홀더에서 복구됩니다. (PR [#1668](https://github.com/Yeachan-Heo/oh-my-codex/pull/1668), 발행 [#1655](https://github.com/Yeachan-Heo/oh-my-codex/issues/1655))
- **MCP 중복 형제 정리** - 트래픽 후 중복 MCP 형제가 누출되는 대신 연장된 유휴 후에 자체 종료됩니다. (홍보 [#1666](https://github.com/Yeachan-Heo/oh-my-codex/pull/1666))
- **프로젝트 루트 검색** — OMX는 이제 하드코딩된 디렉터리 깊이 대신 `.omx`으로 이동하여 프로젝트 루트를 확인합니다. (홍보 [#1664](https://github.com/Yeachan-Heo/oh-my-codex/pull/1664))
- **설정 새로 고침 시 AGENTS.md 보존** — 자동 업데이트 새로 고침 중에 로컬 `AGENTS.md` 콘텐츠가 보존됩니다. (PR [#1673](https://github.com/Yeachan-Heo/oh-my-codex/pull/1673), 발행 [#1671](https://github.com/Yeachan-Heo/oh-my-codex/issues/1671))
- **새 세션 컨텍스트 격리** — 새 세션은 오래된 작업 범위 시작 컨텍스트에서 격리됩니다. (PR [#1634](https://github.com/Yeachan-Heo/oh-my-codex/pull/1634), 발행 [#1624](https://github.com/Yeachan-Heo/oh-my-codex/issues/1624))

#### HUD / 작업자 시작
- **부실한 시작 HUD보다 정식 팀 단계** — HUD는 오래된 시작 상태보다 정식 팀 단계를 선호합니다. (홍보 [#1646](https://github.com/Yeachan-Heo/oh-my-codex/pull/1646))
- **위키 유니코드 제목 슬러그** — `wiki.titleToSlug`은 유니코드 문자를 유지합니다. (홍보 [#1645](https://github.com/Yeachan-Heo/oh-my-codex/pull/1645))
- **작업자 셸 시작 명령 인용** — `processSpec.command`은 작업자 셸 시작 중에 올바르게 인용됩니다. (홍보 [#1644](https://github.com/Yeachan-Heo/oh-my-codex/pull/1644))

#### 워크플로/문서 출시
- **릴리스 기여자 메타데이터 범위** — 릴리스 기여자 메타데이터는 실제 릴리스 커밋 범위와 계속 일치하며 릴리스 본문 회귀 테스트는 더 이상 CI 환경에서 중단되지 않습니다. (PR [#1639](https://github.com/Yeachan-Heo/oh-my-codex/pull/1639), 발행 [#1623](https://github.com/Yeachan-Heo/oh-my-codex/issues/1623))
- **의사 준비 명확성** — 의사 출력은 이제 설정이 완료된 시기와 Codex가 실제로 실행될 수 있는 시기를 명확하게 보여줍니다. (PR [#1630](https://github.com/Yeachan-Heo/oh-my-codex/pull/1630), 발행 [#1626](https://github.com/Yeachan-Heo/oh-my-codex/issues/1626))

### 변경됨
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 문서가 `0.13.2`에 맞춰 정렬됩니다.

## [0.13.1] - 2026-04-16

`0.13.0`에 도입된 분리된 tmux 시작 회귀를 위한 핫픽스 릴리스입니다.

### 결정된
- **분리된 tmux stdin 보존** — 분리된 리더 쉘은 이제 백그라운드 시작 중에 Codex stdin을 연결된 상태로 유지하므로 `omx --madmax --high` 및 관련 분리된 실행 경로는 더 이상 macOS/iTerm2 스타일 대화형 세션에서 즉시 종료되지 않습니다. (PR [#1631](https://github.com/Yeachan-Heo/oh-my-codex/pull/1631), 이슈 [#1627](https://github.com/Yeachan-Heo/oh-my-codex/issues/1627), [#1628](https://github.com/Yeachan-Heo/oh-my-codex/issues/1628))

### 변경됨
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 문서가 `0.13.1`에 맞춰 정렬됩니다.

## [0.13.0] - 2026-04-16

새로운 `omx adapt` 표면을 위한 마이너 릴리스, 더 강력한 Ralph/런타임 세션 권한, 더 안전한 크로스 플랫폼 실행 동작, 또 다른 광범위한 후크 오버 패스, HUD, 알림 및 릴리스 프로세스 정확성.

### 추가됨
- **OMX 적응 기반** — `omx adapt`은 이제 읽기 전용 프로브/상태/의사 표면, `.omx/adapters/<target>/...` 아래의 초기화/봉투 출력, 계획 아티팩트 연결, 대상별 OpenClaw 및 Hermes 증거를 포함하여 영구 외부 대상에 대한 OMX 소유 어댑터 기반을 노출합니다. (PR [#1600](https://github.com/Yeachan-Heo/oh-my-codex/pull/1600), [#1599](https://github.com/Yeachan-Heo/oh-my-codex/pull/1599), [#1598](https://github.com/Yeachan-Heo/oh-my-codex/pull/1598))
- **Hermes 런타임 관찰** — Hermes 적응은 Hermes 런타임에 기록하지 않고도 ACP, 게이트웨이, 세션 저장소 및 부트스트랩 증거를 보고합니다. (홍보 [#1598](https://github.com/Yeachan-Heo/oh-my-codex/pull/1598))
- **OpenClaw 로컬 관찰** — OpenClaw 적응은 명령 게이트웨이를 제어하는 ​​동시에 로컬 구성, 게이트웨이, 후크 매핑 및 수명 주기 브리지 증거를 요약합니다. (홍보 [#1599](https://github.com/Yeachan-Heo/oh-my-codex/pull/1599))

### 결정된

#### Ralph/런타임 권한/워크플로 의미 체계
- **Ralph 세션 권한** — Ralph 할당 및 tmux Ralph 넛지는 이제 동시 OMX 세션 간에 표류하는 대신 활성화/현재 세션 범위를 유지합니다. (PR [#1604](https://github.com/Yeachan-Heo/oh-my-codex/pull/1604), [#1591](https://github.com/Yeachan-Heo/oh-my-codex/pull/1591))
- **프롬프트 측 Ralph 대 PRD CLI 시작** — 프롬프트 활성화는 더 이상 `omx ralph --prd`인 척하지 않으며 명시적 CLI 경로에서는 PRD 스토리 검증이 계속 필요합니다. (홍보 [#1608](https://github.com/Yeachan-Heo/oh-my-codex/pull/1608))
- **네이티브 중지 안정성** — 세션 ID 드리프트 전반에 걸쳐 중지 처리가 안정적이고 권한 검색 핸드오프가 자동으로 재개되며 네이티브 후크 메타데이터가 더 이상 라우팅을 가로채지 않습니다. (PR [#1590](https://github.com/Yeachan-Heo/oh-my-codex/pull/1590), [#1611](https://github.com/Yeachan-Heo/oh-my-codex/pull/1611); 직접 커밋 `4377e1e`)
- **MCP 상태 전송 탄력성** — 재개된 중복 MCP 상태 기록기는 조정/자체 해제 경로 후에도 계속 유지됩니다. (홍보 [#1596](https://github.com/Yeachan-Heo/oh-my-codex/pull/1596))

#### 출시/플랫폼/작업 트리 안전
- **하네스 해결 방법 살펴보기** — `omx explore`은 사용할 수 없는 PATH 노드 항목을 건너뛰고, 샌드박스 pnpm 스타일 PATH에서 POSIX Codex shim을 해결하고, Windows 경로가 POSIX 허용 목록 래퍼에 도달하기 전에 실패 처리됩니다. (PR [#1562](https://github.com/Yeachan-Heo/oh-my-codex/pull/1562), [#1610](https://github.com/Yeachan-Heo/oh-my-codex/pull/1610); 직접 커밋 `72b1e5d`)
- **분리된 리더 정리** — 분리된 Codex 하위 항목은 고아 경로에 대한 회귀 적용 범위와 함께 리더 쉘이 신호에 따라 종료될 때 종료됩니다. (홍보 [#1605](https://github.com/Yeachan-Heo/oh-my-codex/pull/1605))
- **Windows 정리 검색** — Windows OMX 정리는 실제 분리된 서버를 다시 찾습니다. (홍보 [#1589](https://github.com/Yeachan-Heo/oh-my-codex/pull/1589))
- **오래된 작업 트리 시작** — 이전에 기록된 작업 트리 경로가 누락되었기 때문에 분리된 팀 시작이 더 이상 실패하지 않습니다. (홍보 [#1582](https://github.com/Yeachan-Heo/oh-my-codex/pull/1582))

#### 후크/HUD/알림
- **HUD 활성 세션 바인딩** — HUD 상태는 오래된 루트 범위로 돌아가는 대신 라이브 OMX 세션에 바인딩된 상태를 유지합니다. (홍보 [#1573](https://github.com/Yeachan-Heo/oh-my-codex/pull/1573))
- **macOS 리더 오래된 폴링** — 리더 오래된 폴링은 이제 macOS에서 반복되는 git 프로브를 줄여 장기 실행 세션에서 높은 CPU 폴링 이탈을 줄입니다. (홍보 [#1619](https://github.com/Yeachan-Heo/oh-my-codex/pull/1619))
- **대기 중인 시작 및 디스패치 회귀** — Codex 시작 배너, 대기 중인 초안 및 디스패치 잠금 동작이 포함되므로 받은 편지함/작업자 시작이 자동으로 회귀할 수 없습니다. (홍보 [#1595](https://github.com/Yeachan-Heo/oh-my-codex/pull/1595))
- **Slack 멘션 구문 분석** — Slack 알림 멘션 환경 구문 분석은 회귀 적용 범위에 중점을 두었습니다. (홍보 [#1585](https://github.com/Yeachan-Heo/oh-my-codex/pull/1585))
- **수신 에이전트 소유권** — 생성된 지침은 이제 사용자에게 일반적인 정리를 수행하도록 요청하는 대신 안전한 가역적 OMX/런타임 작업을 수신 에이전트의 책임으로 처리합니다. (직접 커밋 `76e808e`)

#### 설정/문서/릴리스 워크플로우
- **Wiki 설정 등록** — `omx setup`은 제공된 Wiki 기술/구성 자산을 일관되게 설치합니다. (홍보 [#1571](https://github.com/Yeachan-Heo/oh-my-codex/pull/1571))
- **네이티브 후크 닥터 적용 범위** — 이제 doctor/config 출력에서 ​​손상된 OMX 설치처럼 보이기 전에 네이티브 후크 적용 범위가 누락된 것으로 표시됩니다. (홍보 [#1546](https://github.com/Yeachan-Heo/oh-my-codex/pull/1546))
- **기여 지점 가드레일** — 이제 일반적인 기여 안내가 `dev`을 확실한 PR 기반으로 만듭니다. (홍보 [#1567](https://github.com/Yeachan-Heo/oh-my-codex/pull/1567))

### 변경됨
- **릴리스 워크플로 종속성 새로 고침** — 릴리스 파이프라인 및 TypeScript/Biome 기준선에 대한 GitHub Action 및 도구 종속성이 새로 고쳐집니다. (PR [#1575](https://github.com/Yeachan-Heo/oh-my-codex/pull/1575), [#1576](https://github.com/Yeachan-Heo/oh-my-codex/pull/1576), [#1577](https://github.com/Yeachan-Heo/oh-my-codex/pull/1577), [#1578](https://github.com/Yeachan-Heo/oh-my-codex/pull/1578))
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 문서가 `0.13.0`에 맞춰 정렬됩니다.

## [0.12.6] - 2026-04-13

Wiki 우선 지식 워크플로, 알림 및 후크 전달 강화, 실행/작업 트리 안전성 개선, `dev`이 32개의 PR에 병합된 후 명시적으로 링크된 문제의 자동 종료.

### 추가됨
- **OMX 위키 워크플로** — 로컬 마크다운 위키 저장소, 수집/쿼리/린트/새로 고침 흐름, 위키 MCP 서버 지원, CLI 패리티 및 위키 인식 탐색 통합. (홍보 [#1481](https://github.com/Yeachan-Heo/oh-my-codex/pull/1481))
- **Discord 작업 제어 기본** — 추적된 OMX Discord 세션은 안전한 첫 번째 제어 계층과 더 나은 메시지/세션 재사용 처리를 얻습니다. (PR [#1530](https://github.com/Yeachan-Heo/oh-my-codex/pull/1530), 발행 [#1528](https://github.com/Yeachan-Heo/oh-my-codex/issues/1528))
- **개발자 병합 문제 자동 종료** — `dev`에 병합된 PR은 이제 명시적으로 연결된 로컬 문제를 자동으로 닫을 수 있습니다. (PR [#1541](https://github.com/Yeachan-Heo/oh-my-codex/pull/1541), 발행 [#1540](https://github.com/Yeachan-Heo/oh-my-codex/issues/1540))

### 결정된

#### 후크/알림/세션 상태
- **입력 필요 감시자 패리티** — 이제 어레이 지원 보조자 프롬프트가 입력 필요 감시자를 올바르게 트리거합니다. (PR [#1487](https://github.com/Yeachan-Heo/oh-my-codex/pull/1487), 발행 [#1486](https://github.com/Yeachan-Heo/oh-my-codex/issues/1486))
- **로컬 작업자 런타임/배달 안정성** — 오래된 스크롤백, 대기열에 있는 초안 및 디스패치 드레인 경쟁으로 인해 더 이상 로컬 작업자 시작 또는 사서함 진행이 지연되지 않습니다. (PR [#1491](https://github.com/Yeachan-Heo/oh-my-codex/pull/1491), [#1493](https://github.com/Yeachan-Heo/oh-my-codex/pull/1493), 문제 [#1490](https://github.com/Yeachan-Heo/oh-my-codex/issues/1490), [#1492](https://github.com/Yeachan-Heo/oh-my-codex/issues/1492))
- **관리형 세션 후크 안정성** — cwd 별칭 불일치로 인해 더 이상 관리형 tmux 소유권 또는 후크 세션 논리가 중단되지 않습니다. (홍보 [#1495](https://github.com/Yeachan-Heo/oh-my-codex/pull/1495))
- **Ralph/릴리스 준비 후속 범위 지정** — 오래된 세션 범위 억제 및 일반 중지 잔여물이 더 이상 관련 없는 흐름을 가로채지 않습니다. (PR [#1496](https://github.com/Yeachan-Heo/oh-my-codex/pull/1496), [#1514](https://github.com/Yeachan-Heo/oh-my-codex/pull/1514), 문제 [#1494](https://github.com/Yeachan-Heo/oh-my-codex/issues/1494), [#1513](https://github.com/Yeachan-Heo/oh-my-codex/issues/1513))
- **알림 노이즈 감소** — 중복된 수명 주기 브로드캐스트, 오래된 후속 알림, 메타데이터 거짓 긍정 및 중지 후 키워드 재생이 억제됩니다. (PR [#1518](https://github.com/Yeachan-Heo/oh-my-codex/pull/1518), [#1520](https://github.com/Yeachan-Heo/oh-my-codex/pull/1520), [#1526](https://github.com/Yeachan-Heo/oh-my-codex/pull/1526), [#1529](https://github.com/Yeachan-Heo/oh-my-codex/pull/1529))
- **데드 세션 HUD 잔여물** — 후속 도구가 이를 읽기 전에 오래된 HUD 상태가 지워집니다. (PR [#1539](https://github.com/Yeachan-Heo/oh-my-codex/pull/1539), 발행 [#1538](https://github.com/Yeachan-Heo/oh-my-codex/issues/1538))

#### 출시/설정/운영자 안전
- **재사용 가능한 작업 트리 종속성 부트스트랩** — 시작 작업 트리는 강제로 새로 설치하는 대신 안전한 상위 `node_modules`을 재사용할 수 있습니다. (PR [#1510](https://github.com/Yeachan-Heo/oh-my-codex/pull/1510), 발행 [#1507](https://github.com/Yeachan-Heo/oh-my-codex/issues/1507))
- **잘못된 네이티브 후크 stdin 처리** — 깨진 네이티브 후크 JSON 입력으로 인해 런타임이 더 이상 불안정해지지 않습니다. (PR [#1504](https://github.com/Yeachan-Heo/oh-my-codex/pull/1504), 발행 [#1503](https://github.com/Yeachan-Heo/oh-my-codex/issues/1503))
- **설정 중 AGENTS 보존** — `omx setup`은 사용자가 작성한 AGENTS 지침을 그대로 유지합니다. (PR [#1524](https://github.com/Yeachan-Heo/oh-my-codex/pull/1524), 발행 [#1521](https://github.com/Yeachan-Heo/oh-my-codex/issues/1521))
- **tmux 작업자 환경 상속** — 팀 작업자는 호출 환경에서 프록시 액세스를 유지합니다. (PR [#1523](https://github.com/Yeachan-Heo/oh-my-codex/pull/1523), 발행 [#1522](https://github.com/Yeachan-Heo/oh-my-codex/issues/1522))
- **더티 작업 트리 주의 흐름** — 재사용 가능한 더티 작업 트리는 이제 주의 흐름 외부에 심각한 오류를 유지하면서 내부에 경고합니다. (PR [#1535](https://github.com/Yeachan-Heo/oh-my-codex/pull/1535), 발행 [#1532](https://github.com/Yeachan-Heo/oh-my-codex/issues/1532))
- **Claude 이슈 승인 프롬프트** — 명백한 저장소 읽기로 인해 불필요한 승인 프롬프트에서 더 이상 이슈 세션이 중단되지 않습니다. (PR [#1537](https://github.com/Yeachan-Heo/oh-my-codex/pull/1537), 발행 [#1536](https://github.com/Yeachan-Heo/oh-my-codex/issues/1536))

#### MCP/문서/워크플로 표면
- **대체된 MCP stdio 형제 정리** — 라이브 Codex 앱 서버 상위는 더 이상 오래된 MCP 형제를 축적하지 않습니다. (PR [#1517](https://github.com/Yeachan-Heo/oh-my-codex/pull/1517), 발행 [#1516](https://github.com/Yeachan-Heo/oh-my-codex/issues/1516))
- **표준 스킬 루트 문서** — 이제 혼합 OMX + Codex 환경에서 올바른 스킬 루트와 Wiki 작업 흐름 진입점을 문서화합니다. (PR [#1534](https://github.com/Yeachan-Heo/oh-my-codex/pull/1534), 발행 [#1531](https://github.com/Yeachan-Heo/oh-my-codex/issues/1531))

### 변경됨
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문, 릴리스 노트 및 릴리스 준비 문서가 `0.12.6`에 맞춰 정렬됩니다.


## [0.12.5] - 2026-04-11

팀 런타임 및 다중 워크플로 상태 강화, Windows 안정성 수정, tmux/shell 안정성 개선, 25개 PR에 걸친 HUD 세션 고정.

### 추가됨
- **현재 작업 기준 분기 가드레일** — `omx team`은 이제 작업당 기준 분기를 추적하므로 작업자는 올바른 시작 지점에 고정됩니다. (PR [#1419](https://github.com/Yeachan-Heo/oh-my-codex/pull/1419), 발행 [#1407](https://github.com/Yeachan-Heo/oh-my-codex/issues/1407))
- **승인된 다중 워크플로 중복** — 이제 표준 상태는 세션 가시성을 손상시키지 않고 승인된 워크플로 중복을 허용합니다. (홍보 [#1427](https://github.com/Yeachan-Heo/oh-my-codex/pull/1427))
- **알림에 대한 Windows ps 대체** — `omx notify`은 정상적인 프로세스 목록 대체를 통해 Windows에서 `ps` 누락을 허용합니다. (홍보 [#1457](https://github.com/Yeachan-Heo/oh-my-codex/pull/1457))

### 결정된

#### 팀 시작/종료
- **지연된 작업자 시작 복구** — 이제 전체 부팅 시퀀스를 중단하는 대신 초기 작업자가 시작 중에 중단되는 경우 팀 시작이 복구 가능한 상태로 유지됩니다. (홍보 [#1444](https://github.com/Yeachan-Heo/oh-my-codex/pull/1444))
- **교차 세션 오래된 루트 팀 중지** — 루트 팀 중지는 더 이상 팀을 시작하지 않은 세션을 차단하지 않습니다. (홍보 [#1451](https://github.com/Yeachan-Heo/oh-my-codex/pull/1451))
- **Linux tmux 시작 핸드오프 및 종료 지속성** — 이제 Linux tmux 경로에서 시작 핸드오프 및 종료 상태 지속성이 정확합니다. (홍보 [#1438](https://github.com/Yeachan-Heo/oh-my-codex/pull/1438))
- **session.json 소유권 강화** — 오래된 세션 포인터는 더 이상 잘못된 런타임 상태를 되살릴 수 없습니다. 대체 의미론은 이제 명시적입니다. (홍보 [#1447](https://github.com/Yeachan-Heo/oh-my-codex/pull/1447))

#### 다중 기술/워크플로 상태
- **혼합 프롬프트 라우팅에 보존된 계획 상태** — 다중 기술 프롬프트가 흐름 중간에 다시 라우팅될 때 `ralplan` / `ralph` 계획 상태가 더 이상 삭제되지 않습니다. (PR [#1471](https://github.com/Yeachan-Heo/oh-my-codex/pull/1471), 발행 [#1353](https://github.com/Yeachan-Heo/oh-my-codex/issues/1353))
- **워크플로 핸드오프 정확성** — 이제 조정 중에 잘못된 워크플로 상태 개체가 거부됩니다. 오래된 워크플로 상태는 더 이상 실제 핸드오프를 차단할 수 없습니다. (홍보 [#1442](https://github.com/Yeachan-Heo/oh-my-codex/pull/1442))
- **불안정한 후크 및 HUD 상태 범위** — CI 정렬 세션 범위 후크 계약; 후크와 HUD는 더 이상 오래된 세션 범위로 이동하지 않습니다. (홍보 [#1446](https://github.com/Yeachan-Heo/oh-my-codex/pull/1446))

#### 윈도우
- **분할 창 종료 리더 창 타겟팅** — 오래된 리더 창 ID가 더 이상 분할 창 종료 신호를 잘못 전달하지 않습니다. (PR [#1470](https://github.com/Yeachan-Heo/oh-my-codex/pull/1470), 발행 [#1353](https://github.com/Yeachan-Heo/oh-my-codex/issues/1353))
- **기본 psmux 작업자 시작 경로** — Windows 작업자는 이제 오래된 진입점이 아닌 해결된 Codex 실행 프로그램 경로에서 시작됩니다. (PR [#1469](https://github.com/Yeachan-Heo/oh-my-codex/pull/1469), 발행 [#1361](https://github.com/Yeachan-Heo/oh-my-codex/issues/1361))
- **MCP 고아 정리** — Windows MCP 하위 프로세스는 더 이상 상위 종료 후에도 유지되지 않습니다. (PR [#1437](https://github.com/Yeachan-Heo/oh-my-codex/pull/1437), 발행 [#1435](https://github.com/Yeachan-Heo/oh-my-codex/issues/1435))
- **폐기된 팀 MCP 구성 복구** — `omx doctor` 및 실행 경로는 이제 업그레이드 시 폐기된 팀 MCP 구성 항목을 다시 정렬합니다. (홍보 [#1436](https://github.com/Yeachan-Heo/oh-my-codex/pull/1436))

#### tmux / macOS / 쉘
- **분리된 tmux 실행 cwd** — 이제 분리된 tmux 창은 호출자의 cwd가 아닌 요청된 작업 디렉터리에서 시작됩니다. (PR [#1468](https://github.com/Yeachan-Heo/oh-my-codex/pull/1468), 발행 [#1374](https://github.com/Yeachan-Heo/oh-my-codex/issues/1374))
- **셸 시작 시 작업자 cwd** — 지원되는 셸(zsh, bash)은 팀 창을 시작할 때 작업자 cwd를 유지합니다. (홍보 [#1460](https://github.com/Yeachan-Heo/oh-my-codex/pull/1460))
- **Homebrew zsh 정규화** — 이제 macOS Homebrew zsh 경로가 tmux 창 실행 전에 정규화되므로 창이 올바른 셸을 상속합니다. (PR [#1462](https://github.com/Yeachan-Heo/oh-my-codex/pull/1462), 발행 [#1439](https://github.com/Yeachan-Heo/oh-my-codex/issues/1439))
- **tmux PID 해상도 강화** — 시작 PID 해상도가 더욱 강력해졌습니다. 복사 모드는 연결 후 정리됩니다. (홍보 [#1459](https://github.com/Yeachan-Heo/oh-my-codex/pull/1459))

#### HUD/세션 앵커링
- **HUD 상태 세션 범위** — HUD 상태는 이제 활성 OMX 세션에 고정됩니다. 세션 간 HUD 드리프트가 제거됩니다. (홍보 [#1453](https://github.com/Yeachan-Heo/oh-my-codex/pull/1453))
- **기본 세션 ID 드리프트** — 기본 세션 ID 드리프트는 더 이상 HUD에서 팀 전송 실패를 숨기지 않습니다. (홍보 [#1458](https://github.com/Yeachan-Heo/oh-my-codex/pull/1458))

#### 심층 인터뷰
- **의도 우선 단계에서 자동 계속 중지** — 심층 인터뷰가 사용자에게 질문하는 단계에 있는 동안 기본 중지는 더 이상 자동 계속을 실행하지 않습니다. 이제 해당 단계는 중단 감지 계획으로 처리됩니다. (PR [#1473](https://github.com/Yeachan-Heo/oh-my-codex/pull/1473), 발행 [#1472](https://github.com/Yeachan-Heo/oh-my-codex/issues/1472))

#### 하네스 살펴보기
- **기본 툴체인이 없는 Rustup shim** — `omx explore`은 이제 `cargo`이 shim으로 존재하지만 기본 툴체인이 구성되지 않은 경우 원시 Rustup 메시지를 표시하는 대신 명확한 실행 가능한 오류를 내보냅니다. (`src/cli/explore.ts`)

#### 후크/인증/알림
- **Stop-hook Ralph 세션 범위 지정** — Ralph stop-hook은 더 이상 세션 간에 누출되지 않습니다. 세션 권한은 게이팅 전에 적용됩니다. (PR [#1466](https://github.com/Yeachan-Heo/oh-my-codex/pull/1466), 발행 [#1461](https://github.com/Yeachan-Heo/oh-my-codex/issues/1461))
- **자동 넛지 인증 누출** — 읽기 전용 및 계획 흐름은 더 이상 전체 실행 흐름을 위한 도구 사용 인증 넛지를 받지 않습니다. (PR [#1434](https://github.com/Yeachan-Heo/oh-my-codex/pull/1434), 발행 [#1416](https://github.com/Yeachan-Heo/oh-my-codex/issues/1416))
- **알림 후크는 라이브 팀을 추적합니다** - 턴 사이에 대략적인 팀 상태가 표류할 때 알림 후크가 정렬 상태를 유지합니다. (홍보 [#1428](https://github.com/Yeachan-Heo/oh-my-codex/pull/1428))
- **런처 지원 MCP 다시 시작 지연** — 수명이 긴 MCP 서버 다시 시작 지연이 이제 제한되어 팀 복구를 무기한 차단하지 않습니다. (홍보 [#1408](https://github.com/Yeachan-Heo/oh-my-codex/pull/1408))

### 변경됨
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.5`에 맞춰 정렬됩니다.

### 문서
- README에서 오래된 `prompts/` 호출 지침을 제거했습니다. (홍보 [#1417](https://github.com/Yeachan-Heo/oh-my-codex/pull/1417))

## [0.12.4] - 2026-04-09

MCP-CLI 패리티 표면, HUD 복구 및 조정 강화, 네이티브 후크 및 팀 런타임 안정성 수정, 상태 운영 모듈 추출.

### 추가됨
- **MCP-CLI 패리티 표면** — 새로운 `omx state`, `omx notepad`, `omx project-memory`, `omx trace` 및 `omx code-intel` CLI 하위 명령은 CLI를 통해 MCP 서버 도구를 노출하므로 MCP 전송 없이 스크립트 가능한 액세스가 가능합니다. (`src/cli/mcp-parity.ts`, `src/cli/state.ts`)
- **HUD 조정 모듈** — 새로운 `src/hud/reconcile.ts`은 세션 경계에 걸쳐 HUD 창 상태를 자동 조정합니다.
- **공유 HUD tmux 도우미** — CLI 및 조정에서 공유 사용하기 위해 `src/hud/tmux.ts`로 추출된 tmux 창 관리(`parseTmuxPaneSnapshot`, `createHudWatchPane`, `killTmuxPane` 등).
- **상태 작업 모듈** — 새로운 `src/state/operations.ts`은 모드 상태에 대한 읽기/쓰기/지우기/목록-활성/상태 가져오기를 제공하여 MCP 상태 서버와 새로운 CLI 패리티 표면을 모두 지원합니다.
- **경로 순회 보호** — `src/utils/paths.ts`은 경로 검증을 위한 안전 유틸리티를 추가합니다.

### 결정된
- **OMX CLI 항목을 통한 HUD 복구** — 프롬프트 제출 복구는 이제 자동으로 건너뛰는 대신 실제 HUD 프로세스를 복원합니다. (PR [#1413](https://github.com/Yeachan-Heo/oh-my-codex/pull/1413), [#1414](https://github.com/Yeachan-Heo/oh-my-codex/pull/1414))
- **사용자 소유 Codex 후크 보존** — `omx setup`은 OMX 래퍼를 새로 고칠 때 더 이상 사용자가 작성한 후크를 방해하지 않습니다.
- **HUD 프롬프트 제출 레이아웃 변경** — ​​복구 동작을 유지하면서 프롬프트 제출 자동 크기 조정이 중지되었습니다.
- **중복된 기본 후크 연속** — 오래된 Ralph 상태 및 알 수 없는 `$tokens`은 더 이상 중복 후크 연속을 트리거하지 않습니다.
- **오래된 팀 작업 트리 정리** — `startTeam()`은 시작 시 오래된 작업 트리를 감지하고 정리합니다. (PR [#1382](https://github.com/Yeachan-Heo/oh-my-codex/pull/1382), 발행 [#1354](https://github.com/Yeachan-Heo/oh-my-codex/issues/1354))
- **부실한 스톱훅 심층 인터뷰 억제** — 스킬 상태 정규화 후 심층 인터뷰 억제가 더 이상 세션 이후에도 지속되지 않습니다.
- **네이티브 Stop 오래된 차단기** — Stop은 더 이상 오래된 차단기 기술 상태를 신뢰하지 않습니다.
- **MCP 수송 사망 복구** — 수송 사망으로 인해 더 이상 팀 복구가 지연되지 않습니다.
- **클린 팀 종료** - 더티 작업 트리의 안전을 약화시키지 않고 명시적으로 종료합니다.
- **분리된 세션 트랩** — 세션 정리는 신호가 아닌 일반 종료(`status < 128`)에서만 실행됩니다. `EXIT`로만 범위가 좁아진 트랩입니다.
- **CI 중단 방지** — 분해 데드타임 감소; CI 중단으로 인해 더 이상 근본 원인 작업이 중단되지 않습니다. (홍보 [#1405](https://github.com/Yeachan-Heo/oh-my-codex/pull/1405))

### 변경됨
- **상태 CLI 라우팅** — `omx state`은 `src/cli/state.ts`을 통해 CLI를 통해 일관되게 라우팅됩니다.
- **Tmux 세션 이름 잘림** — 이름이 120자를 초과하는 경우 더 스마트한 잘림 기능으로 세션 토큰이 보존됩니다.
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.4`에 맞춰 정렬됩니다.

### 확인됨
- `npm run build` ✅
- `npx biome lint src/` ✅ (435개 파일)
- `npm test` — 3068/3070 통과. 2개의 실패(`state.test.ts: dispatch request store keeps failed requests failed`, `runtime.test.ts: sendWorkerMessage keeps failed hook receipts failed`)는 `main`(`3a193cfb` 커밋)에 이미 존재하며 이 릴리스에서 도입된 회귀가 아닙니다.

## [0.12.3] - 2026-04-08

`v0.12.2..v0.12.3` 열차의 후속 패치 릴리스: `$team` 프롬프트 라우팅 정확성 및 중복 팀 출시 해제. 이는 `0.12.2`용으로 의도되었지만 `0.12.2` 컷 이후 충돌 해결을 완료한 PR [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364)을 제공합니다.

### 결정된
- **`$team` 키워드 프롬프트 라우팅** — `UserPromptSubmit` `$team` 감지는 이제 프롬프트를 자동으로 잘못 라우팅하는 대신 루트 `team-state.json`을 시드하고 운영자를 `omx team ...` / `omx team --help`로 이동시킵니다. (홍보 [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364))
- **중복된 활성 동명 팀 시작** — `startTeam`은 이제 팀 상태를 변경하거나 작업 트리를 프로비저닝하기 전에 `team_name_conflict` 오류로 중복된 활성 동명 팀 시작을 거부하므로 기존 팀 구성 및 작업은 그대로 유지됩니다. (홍보 [#1364](https://github.com/Yeachan-Heo/oh-my-codex/pull/1364))

### 변경됨
- **릴리스 메타데이터 동기화** — Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.3`에 정렬됩니다.

### 확인됨
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run smoke:packed-install`

## [0.12.2] - 2026-04-08

`v0.12.1..v0.12.2` 열차용 패치 릴리스: Windows 팀 작업자 부팅 및 종료 강화, 출시 후 모드 상태 종료-경주 복구, 표준 HUD 기술 상태 가시성 및 모니터 기반 종료 시 팀 상태 보존.

### 결정된
- **Windows 분할 창 종료 안전** — `omx team shutdown --force`은 리더/클라이언트 조상이 겹칠 때 프로세스 트리 사전 종료 단계를 건너뛰어 기본 Windows + psmux 분할 창 세션에서 더 이상 리더 창을 종료하지 않습니다. (홍보 [#1358](https://github.com/Yeachan-Heo/oh-my-codex/pull/1358))
- **PostLaunch 모드 상태 종료 경쟁** — 세션 종료 중에 동시 작성자가 남긴 비어 있거나 잘린 모드 상태 JSON이 이제 충돌 정리 대신 최소 비활성 레코드로 복구됩니다. 구조적으로 완전한 잘못된 JSON에 경고가 표시되지만 그대로 유지됩니다. (홍보 [#1360](https://github.com/Yeachan-Heo/oh-my-codex/pull/1360))
- **Windows psmux 작업자 부팅** — 기본 Windows 팀 작업자는 이제 POSIX `/bin/sh -lc`을 통해 라우팅되는 대신 명시적인 PowerShell 경로를 통해 시작됩니다. 이로 인해 작업자는 준비가 보고되지 않습니다. (홍보 [#1362](https://github.com/Yeachan-Heo/oh-my-codex/pull/1362))
- **오래된 HUD 워크플로 배지** — 이제 표준 세션 범위 스킬 활성 상태가 HUD 배지 가시성을 높여 세션보다 오래 지속된 오래된 루트 전용 모드 배지를 억제하는 동시에 레거시 단일 스킬 리더에 대한 이전 버전과의 호환성을 유지합니다. (홍보 [#1367](https://github.com/Yeachan-Heo/oh-my-codex/pull/1367))
- **팀 상태가 자동으로 삭제됨** — `runtime-cli`의 모니터 감지 터미널 및 오류 조건이 더 이상 종료 정리를 트리거하지 않습니다. 팀 상태는 운영자가 명시적으로 종료를 요청할 때까지 보존됩니다. (홍보 [#1369](https://github.com/Yeachan-Heo/oh-my-codex/pull/1369))

### 변경됨
- **릴리스 메타데이터 동기화** — Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.2`에 정렬됩니다.

### 확인됨
- `npm run build`
- `npm run lint`
- `npm test`
- `npm run smoke:packed-install`

## [0.12.1] - 2026-04-07

`v0.12.0..v0.12.1` 열차의 패치 릴리스: 팀 런타임 위생, 출시/정리 후속 조치, 알림-대체 강화 및 릴리스-부차 동기화.

### 결정된
- **기계 판독 가능 팀 상태 출력** — 리더 사서함 정리는 더 이상 중복된 배달 메시지 브리지 호출을 재발행하지 않으므로 `omx team status --json`은 사서함 배달 표준 오류 노이즈가 누출되는 대신 구문 분석 가능한 상태를 유지합니다.
- **대화형 작업자 PID 캡처** — 팀 시작은 이제 실제 창 ID에서 작업자 PID를 확인하고 진단 및 정리를 위해 작업자 메타데이터에 유지합니다.
- **실행 안전 고아 정리** — 오래된 OMX MCP 정리는 여전히 활성 트리에 속하는 프로세스를 제거하는 대신 실시간 실행기/세션 조상을 보존합니다.
- **대체 로그 증가 알림** — 이제 1회 모드 대체 감시자 로그는 장기간 실행 시 자동으로 증가하는 대신 순환됩니다.

### 변경됨
- **기본적으로 직접 리더 실행** - tmux 외부에서 OMX는 이제 운영자가 분리된 tmux 동작을 명시적으로 요청하지 않는 한 리더를 직접 실행합니다.
- **신속한 보조 강화** — 정보 설계자 프롬프트가 더 슬림해지고 `0.12.1` 릴리스/준비 보조가 이제 실제 패치 범위와 일치합니다.
- **릴리스 메타데이터 동기화** — Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 본문 및 릴리스 노트가 `0.12.1`에 정렬됩니다.

### 확인됨
- `npm run build`
- `npx biome lint src/cli/index.ts src/cli/cleanup.ts src/cli/__tests__/index.test.ts src/cli/__tests__/cleanup.test.ts src/scripts/notify-fallback-watcher.ts src/hooks/__tests__/notify-fallback-watcher.test.ts src/team/runtime.ts src/team/state/mailbox.ts src/team/__tests__/runtime.test.ts src/team/__tests__/state.test.ts package.json`
- `node --test dist/cli/__tests__/cleanup.test.js dist/cli/__tests__/index.test.js dist/cli/__tests__/version-sync-contract.test.js`
- `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js`
- `node --test dist/team/__tests__/state.test.js dist/team/__tests__/runtime.test.js`
- `npm run smoke:packed-install`

## [0.12.0] - 2026-04-06

기본 Codex 후크 소유권, 자사 Bash 사전/사후 도구 지침, 런타임/팀 제공 강화 및 `0.11.13` 이후 워크플로 문서 새로 ​​고침을 위한 부 릴리스입니다.

### 추가됨
- **자사 네이티브 Bash 사전/사후 후크** — OMX는 이제 문서화된 `PreToolUse` / `PostToolUse` Bash 지침을 제공하고 네이티브 후크 연결을 지원하므로 운영자는 임시 쉘 글루에 의존하지 않고도 도구 수명 주기 동작을 확장할 수 있습니다. (홍보 [#1316](https://github.com/Yeachan-Heo/oh-my-codex/pull/1316))

### 결정된
- **네이티브 후크 소유권 + 연속성** — repo-local 네이티브 Codex 후크 소유권은 이제 세션 시작 및 중지 상태 연속성을 더욱 안정적으로 유지하며 설정/제거 흐름은 랜딩된 런타임 계약과 일치합니다. (PR [#1306](https://github.com/Yeachan-Heo/oh-my-codex/pull/1306), [#1314](https://github.com/Yeachan-Heo/oh-my-codex/pull/1314))
- **팀/런타임 전달 + 조정 안정성** — 사서함 배달, 다음 작업 조정, 잘못된 핸드오프 신호, 지속적인 오류 표시 및 tsconfig 없는 진단 동작이 라이브 운영자 경로 전반에 걸쳐 강화됩니다. (PR [#1293](https://github.com/Yeachan-Heo/oh-my-codex/pull/1293), [#1294](https://github.com/Yeachan-Heo/oh-my-codex/pull/1294), [#1300](https://github.com/Yeachan-Heo/oh-my-codex/pull/1300), [#1303](https://github.com/Yeachan-Heo/oh-my-codex/pull/1303), [#1304](https://github.com/Yeachan-Heo/oh-my-codex/pull/1304), [#1305](https://github.com/Yeachan-Heo/oh-my-codex/pull/1305))
- **Windows/tmux/런처 감독** — 분리된 실행, Shift-Enter 처리, PowerShell 명령 확인 및 tmux 하위 바인딩은 플랫폼별 에지 전체에서 더 예측 가능합니다. (PR [#1265](https://github.com/Yeachan-Heo/oh-my-codex/pull/1265), [#1273](https://github.com/Yeachan-Heo/oh-my-codex/pull/1273), [#1275](https://github.com/Yeachan-Heo/oh-my-codex/pull/1275), [#1282](https://github.com/Yeachan-Heo/oh-my-codex/pull/1282))

### 변경됨
- **품질 우선 지침 기본값** — 생성된 에이전트/프롬프트 지침은 이제 압축 우선 만족 대신 의도 심화, 증거 및 검증 순서 지정에 더 중점을 둡니다. (홍보 [#1281](https://github.com/Yeachan-Heo/oh-my-codex/pull/1281))
- **문서 + 현지화 새로 고침** — README 변형은 `docs/readme/`에 적용되고 우크라이나어 OpenClaw/docs 적용 범위가 추가되며 사용자 대상 문서는 최신 심층 인터뷰 → ralplan → 팀/ralph 워크플로를 중심으로 새로 고쳐집니다. (홍보 [#1270](https://github.com/Yeachan-Heo/oh-my-codex/pull/1270), [#1308](https://github.com/Yeachan-Heo/oh-my-codex/pull/1308))
- **릴리스 메타데이터 동기화** — 노드/화물 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 노트, QA/준비 노트 및 릴리스 본문이 `0.12.0`에 정렬됩니다.

### 확인됨
- `npm ci`
- `npm run build`
- `node dist/cli/omx.js version`
- `node --test dist/cli/__tests__/version-sync-contract.test.js`
- `npm run lint`
- `npm test`
- `cargo test -p omx-runtime-core`
- `npm run smoke:packed-install`
- `git diff --check origin/main...HEAD`

## [0.11.13] - 2026-04-04

`0.11.12` 이후 팀/런타임 전달 무결성, 바쁜 리더 넛지 처리, 릴리스 위생 수정 및 Windows/작업 트리 안정성 후속 조치를 위한 패치 릴리스입니다.

### 결정된
- **리더 + 메일함 전달 무결성** — 팀 리더 메일함 전달은 런타임/CLI 이음새 전체에서 안정적인 상태를 유지하고, 런타임 핸드오프 중에 잘못된 팀 조정 신호가 억제되며, 바쁜 Codex 리더 창은 이제 자동으로 연기하는 대신 대기 중인 넛지를 수신할 수 있습니다. (PR [#1217](https://github.com/Yeachan-Heo/oh-my-codex/pull/1217), [#1223](https://github.com/Yeachan-Heo/oh-my-codex/pull/1223), [#1224](https://github.com/Yeachan-Heo/oh-my-codex/pull/1224))
- **Windows/tmux 작업 트리 감독** — 리더 활동 폴링, HUD 타겟팅 및 Windows 작업 트리/세션 처리는 분리된 실행 및 작업 트리 체크아웃 전반에 걸쳐 안정적으로 유지됩니다. (PR [#1212](https://github.com/Yeachan-Heo/oh-my-codex/pull/1212), [#1213](https://github.com/Yeachan-Heo/oh-my-codex/pull/1213), [#1191](https://github.com/Yeachan-Heo/oh-my-codex/pull/1191))
- **심층 인터뷰 + 제거 경로 관련 워크플로 위생** — 폴백 넛지는 활성 심층 인터뷰 입력 잠금을 존중하고, 제거는 레거시 기술에 대해 명확하게 경고하며, 종료 정리는 분리된 작업자 하위 항목을 보다 안정적으로 가져옵니다. (PR [#1203](https://github.com/Yeachan-Heo/oh-my-codex/pull/1203), [#1193](https://github.com/Yeachan-Heo/oh-my-codex/pull/1193), [#1204](https://github.com/Yeachan-Heo/oh-my-codex/pull/1204))

### 변경됨
- **릴리스 메타데이터 동기화** — Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그, 릴리스 노트 및 릴리스 본문이 `0.11.13`에 정렬됩니다.
- **릴리스 브랜치 복구** — `src/hooks/__tests__/notify-fallback-watcher.test.ts`의 우발적인 자리 표시자 손상은 패치 컷 전에 복원되므로 릴리스 브랜치가 다시 깔끔하게 빌드됩니다.

### 확인됨
- `cargo test -p omx-runtime-core`
- `npm run build`
- `npm run lint`
- `node --test dist/hooks/__tests__/notify-fallback-watcher.test.js`
- `node --test dist/cli/__tests__/version-sync-contract.test.js`
- `npm test`
- `npm run smoke:packed-install`
- `git diff --check origin/main...HEAD`

## [0.11.12] - 2026-04-02

Windows 깜박임 감소, 팀/런타임 이음새 정리, 보다 안전한 자동 넛지 위생, 크로스 플랫폼 노드 테스트 실행 및 `0.11.11` 이후 워크플로 문서 정렬을 위한 패치 릴리스입니다.

### 결정된
- **Windows 터미널 깜박임 감소** — `windowsHide` 적용 범위는 이제 나머지 하위 프로세스 시작 경로에 걸쳐 있으며, 파일 시스템 기반 git 정보 읽기는 추가 Windows 콘솔 플래시 경로를 피합니다. (PR [#1104](https://github.com/Yeachan-Heo/oh-my-codex/pull/1104), [#1107](https://github.com/Yeachan-Heo/oh-my-codex/pull/1107), [#1123](https://github.com/Yeachan-Heo/oh-my-codex/pull/1123))
- **팀/런타임 심 정리** — 이제 팀 cwd 메타데이터가 `manifest.v2`에서 정식으로 확인되며 발송/사서함 전환이 더 이상 나머지 이중 쓰기 심 간격에 걸치지 않습니다. (홍보 [#1114](https://github.com/Yeachan-Heo/oh-my-codex/pull/1114), [#1126](https://github.com/Yeachan-Heo/oh-my-codex/pull/1126))
- **자동 넛지/tmux 세션 위생** — 오래된 전환 자동 넛지는 쿨다운 후에도 해제 상태를 유지하고, 준비 확인은 프롬프트 스크롤 오프를 허용하며, 넛지는 OMX 관리 tmux 세션으로 제한됩니다. (PR [#1091](https://github.com/Yeachan-Heo/oh-my-codex/pull/1091), [#1093](https://github.com/Yeachan-Heo/oh-my-codex/pull/1093), [#1119](https://github.com/Yeachan-Heo/oh-my-codex/pull/1119))

### 변경됨
- **교차 플랫폼 노드 테스트 실행기** — 이제 노드 테스트 실행에서 POSIX `find`에 의존하지 않고 컴파일된 테스트 파일을 열거할 수 있으므로 플랫폼 간에 릴리스/CI 테스트 경로를 이식할 수 있습니다. (홍보 [#1122](https://github.com/Yeachan-Heo/oh-my-codex/pull/1122))
- **표준화된 워크플로 문서** — 이제 온보딩/문서는 심층 인터뷰 -> ralplan -> 팀/ralph를 통해 지속적으로 사용자를 안내하며, 연결된 레거시 기술 루트는 하나의 표준 경로를 통해 해결됩니다. (PR [#1128](https://github.com/Yeachan-Heo/oh-my-codex/pull/1128), [#1132](https://github.com/Yeachan-Heo/oh-my-codex/pull/1132))
- **릴리스 메타데이터 동기화** — Node/Cargo 패키지 메타데이터, 잠금 파일, 변경 로그 및 릴리스 자료는 패치 컷을 위해 `0.11.12`에 정렬됩니다.

### 확인됨
- `cargo check --workspace`
- `npm run build`
- `npm run lint`
- `node --test dist/cli/__tests__/version-sync-contract.test.js`
- `.github/workflows/release.yml`에서 릴리스 워크플로 인라인 버전 동기화 확인
- `npm run test:node:cross-platform`
- `npm run smoke:packed-install`

## [0.11.10] - 2026-03-30

`0.11.9` 이후 승인된 핸드오프 별칭 구문 분석 강화 및 릴리스 메타데이터 동기화를 위한 패치 릴리스입니다.

### 결정된
- **승인된 핸드오프 별칭 구문 분석 회귀 적용 범위** — 계획 아티팩트 테스트는 이제 `$ralph` 및 `$team`에 대해 작은따옴표로 묶인 승인된 시작 힌트를 보호하여 실행 핸드오프 구문 분석에서 인용 형식 드리프트를 방지합니다. (직접 커밋 `e08a746`)

### 변경됨
- **릴리스 메타데이터 동기화** — 이번 패치 릴리스에서는 Node 및 Cargo 패키지 메타데이터가 `0.11.10`에 추가됩니다.
- **릴리스 자료 새로 고침** — `0.11.10` 컷에 대해 릴리스 노트와 `RELEASE_BODY.md`이 새로 고쳐졌습니다.

### 확인됨
- `npx biome lint src/planning/__tests__/artifacts.test.ts`
- `npm run build && node --test dist/planning/__tests__/artifacts.test.js`
- `npm run test:sparkshell`
- `npm run test:team:cross-rebase-smoke`
- `npm run smoke:packed-install`
- `npm test`

## [0.11.9] - 2026-03-25

`0.11.8` 이후 더 심층적인 심층 인터뷰/랠리 계획 조정, 설정 수리 및 보다 안전한 실시간 팀 감독을 위한 패치 릴리스입니다.

### 추가됨
- **실시간 랠리 계획 상태 가시성** — 합의 계획은 이제 관찰 가능한 런타임 상태를 노출하므로 파이프라인, HUD 및 첨부된 지침이 활성 랠리 계획 진행 상황을 보다 충실하게 반영할 수 있습니다. (홍보 [#1060](https://github.com/Yeachan-Heo/oh-my-codex/pull/1060))
- **분석 기술 추적 새로 고침** - 이제 제공된 분석 기술은 복원된 실행 정책 계약 문구를 사용하여 OmC 추적 방법을 따르므로 조사 지침이 향상됩니다. (직접 커밋 `fa01cb5`, `c0a0e1a`)

### 결정된
- **심층 인터뷰 잠금은 tmux-pane nudges를 억제합니다** — 활성 deep-interview 잠금 상태는 이제 대체 tmux-pane nudges를 차단하고 계획 핸드오프는 실행이 진행되기 전에 더 강력한 심층 인터뷰 압력을 적용합니다. (PR [#1062](https://github.com/Yeachan-Heo/oh-my-codex/pull/1062), [#1058](https://github.com/Yeachan-Heo/oh-my-codex/pull/1058))
- **설정은 Codex 관리형 TUI 구성과 계속 호환됩니다** — 설정을 다시 실행해도 더 이상 관리형 TUI 섹션이 다시 중단되지 않으며 탐색 라우팅 기본값은 설정 지침에 맞춰 유지됩니다. (PR [#1048](https://github.com/Yeachan-Heo/oh-my-codex/pull/1048), [#1053](https://github.com/Yeachan-Heo/oh-my-codex/pull/1053))
- **HUD 상태 저장 모드 가시성이 복원됨** — 활성 상태 저장 모드가 라이브 세션 중에 사라지는 대신 HUD에 다시 표시됩니다. (홍보 [#1055](https://github.com/Yeachan-Heo/oh-my-codex/pull/1055))
- **실시간 작업자 감독은 복원력을 유지합니다** — 이제 팀 작업자가 활성 상태인 동안 대체 오케스트레이션이 활성 상태로 유지되며, 팀 흐름은 필요한 경우 Claude 우회 프롬프트를 자동으로 수락합니다. (PR [#1043](https://github.com/Yeachan-Heo/oh-my-codex/pull/1043), 직접 커밋 `3f2eb67`)

### 변경됨
- **유지 관리 새로 고침** — 이제 개발 종속성 기준이 `c8@11.0.0` 및 `@types/node@25.5.0`을 사용하고 README에 별 기록 차트가 추가됩니다. (PR [#1049](https://github.com/Yeachan-Heo/oh-my-codex/pull/1049), [#1051](https://github.com/Yeachan-Heo/oh-my-codex/pull/1051); 문서 커밋 `ed96d42`)
- **릴리스 메타데이터 동기화** — 이번 패치 릴리스에서는 Node 및 Cargo 패키지 메타데이터가 `0.11.9`에 추가됩니다.

### 확인됨
- `cargo check --workspace`
- `npm run build`
- `npm run lint`
- `npm run check:no-unused`
- `node --test --test-reporter=spec dist/cli/__tests__/version-sync-contract.test.js`
- `node --test --test-reporter=spec dist/cli/__tests__/setup-refresh.test.js dist/cli/__tests__/setup-scope.test.js dist/cli/__tests__/doctor-warning-copy.test.js`
- `node --test --test-reporter=spec dist/hooks/__tests__/explore-routing.test.js dist/hooks/__tests__/explore-sparkshell-guidance-contract.test.js dist/hooks/__tests__/deep-interview-contract.test.js dist/hooks/__tests__/notify-fallback-watcher.test.js dist/hooks/__tests__/notify-hook-auto-nudge.test.js dist/hooks/__tests__/agents-overlay.test.js`
- `node --test --test-reporter=spec dist/hud/__tests__/index.test.js dist/hud/__tests__/render.test.js dist/hud/__tests__/state.test.js`
- `node --test --test-reporter=spec dist/pipeline/__tests__/stages.test.js dist/ralplan/__tests__/runtime.test.js`

## [0.11.8] - 2026-03-23

심층 인터뷰 넛지 억제 및 중복된 새로운 리더 넛지 방지를 위한 핫픽스 릴리스입니다.

### 결정된
- **심층 인터뷰 넛지 억제** — 심층 인터뷰 상태가 존재할 때 통지 후크와 폴백 감시자는 이제 리더 넛지, 작업자 유휴 넛지, Ralph 계속 조정 및 자동 넛지를 억제하여 자동화된 중단 없이 인터뷰를 진행할 수 있습니다.
- **신선한 리더 중복 제거 강화** — 폴백 감시자 리더 넛지는 이제 오래된 상태로만 유지되는 반면, 알림 후크 회귀 적용 범위는 동일한 새 메일함 메시지가 반복적인 리더 넛지를 다시 트리거하지 않음을 증명합니다.

### 변경됨
- **릴리스 메타데이터 동기화** — 이 핫픽스 릴리스에서는 Node 및 Cargo 패키지 메타데이터가 `0.11.8`에 추가됩니다.

### 확인됨
- `cargo check --workspace`
- `npm run build`
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-hook-auto-nudge.test.js`
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-hook-team-leader-nudge.test.js`
- `node --test --test-reporter=spec dist/hooks/__tests__/notify-fallback-watcher.test.js`

## [0.11.7] - 2026-03-23

저하된 상태의 자동 넛지 복구, 더 엄격한 팀 제어 평면 정확성 및 `v0.11.6..dev` 핫픽스 트레인 전반에 걸친 릴리스 메타데이터 일관성을 위한 패치 릴리스입니다.

### 결정된
- **감시자/디스패치 복구** — 팀 디스패치는 이제 공유 런타임 바이너리를 올바르게 해결하고, 폴백 워처 쿨다운이 프로세스 전반에 걸쳐 디바운싱되고, 지속 디스패치 ID가 런타임 브리지 요청 ID와 정렬된 상태를 유지하며, 성공적인 tmux 폴백 전달이 요청을 `notified`으로 다시 복구합니다. (PR #1002, #1004, #1020, #1021)
- **리더 넛지 정확도** — 완료된 팀 또는 외부 세션 팀은 더 이상 오래된 리더 넛지로 다시 나타나지 않으며, 리더 제어는 사서함에서만 유지되며, 전진하는 작업자 차례는 지연이 선언되기 전에 진행률로 계산됩니다. (홍보 #1001, #1023)
- **연결된 Ralph + 팀 수명 주기** — 연결된 Ralph는 이제 전체 팀 실행 동안 활성 상태를 유지하고, 프롬프트 모드 실행은 브리지를 올바르게 건너뛰고, 중복된 리더 사서함 전송이 중복 제거되고, 누락된 팀 정리는 이제 연결된 Ralph를 무기한 활성 상태로 두는 대신 마무리합니다. (홍보 #1011, #1012, #1013, #1017, #1025)

### 변경됨
- **생성된 기본값 및 프롬프트 지침** - 이제 기본 상태 줄에 `weekly-limit`이 포함되고, 정확한 `gpt-5.4-mini` 작업자/하위 에이전트 실행이 더 좁은 프롬프트 이음새를 가져오며, AGENTS 지침은 이제 오래된 명시적 하위 모델 핀보다 현재 프론티어 기본값을 선호합니다. (홍보 #1009, #1016, #1018)
- **릴리스 메타데이터 동기화** — 노드 및 Cargo 릴리스 메타데이터는 `0.11.7`로 재정렬되어 릴리스 브랜치에 대한 저장소 버전 동기화 계약을 그대로 유지합니다. (후속 커밋 `c4c5b75` 릴리스)

### 확인됨
- **커밋 창 검토** — `main...dev`에 대한 병렬 모듈 검토에서 `3` 기본 전용 병합 커밋(`#995`, `#997`, `#1000`)이 발견되었지만 체리 선택 제거 후 기본 전용 패치 콘텐츠가 없으므로 배송된 릴리스 델타는 전적으로 `dev` 측에 있습니다.
- **대상 후크 + 감시자 회귀 제품군** — `notify-fallback-watcher` 및 `notify-hook auto-nudge`은 저하된 상태 적용 범위(`49/49` 통과)로 통과합니다.
- **저하된 자동 넛지를 위한 실제 tmux 연기** — HUD 상태만 사용할 수 있는 5초 지연 회전 창 이후 라이브 Codex 창은 폴백 감시자로부터 `yes, proceed [OMX_TMUX_INJECT]`를 수신했습니다.
- **Ralph 스팸 방지를 위한 실제 tmux 연기** — 두 개의 연속 폴백 감시자 틱이 반복적으로 `Ralph loop active continue` 전송을 방출하지 않았습니다. 지속 상태는 쿨다운(`startup_cooldown`) 상태로 유지되었습니다.

## [0.11.6] - 2026-03-21

Ralph 계속-조정 재시작 조절을 위한 패치 릴리스입니다.

### 결정된
- **Ralph 연속 조종 재시작 조절** — 폴백 감시자 쿨다운 앵커는 이제 재시작 및 잘못된 지속 타임스탬프에서 살아남아 Ralph가 재개된 후 반복되는 연속 조종 주입 스팸을 방지합니다. (PR [#998](https://github.com/Yeachan-Heo/oh-my-codex/pull/998), [#996](https://github.com/Yeachan-Heo/oh-my-codex/issues/996) 종료)

## [0.11.5] - 2026-03-21

오래된 리더 넛지 오탐지 및 README 온보딩 명확성을 위한 핫픽스 릴리스입니다.

### 결정된
- **거짓 긍정 리더의 오래된 넛지** — 이제 리더 활동 최신성 검사에서 최근 리더 활동을 고려하여 리더가 적극적으로 작업 중일 때 가짜 오래된 넛지를 방지합니다. (홍보 [#993](https://github.com/Yeachan-Heo/oh-my-codex/pull/993))

### 변경됨
- **README 온보딩에 다시 초점을 맞췄습니다** — 이제 README는 더 명확한 첫 실행 지침을 위해 실제 기본 OMX 경로를 중심으로 온보딩을 집중합니다. (홍보 [#992](https://github.com/Yeachan-Heo/oh-my-codex/pull/992))

## [0.11.4] - 2026-03-20


팀 작업자 전달 회귀를 위한 핫픽스 릴리스입니다.

### 결정된
- **패키지 감시자 진입점 해결** — 이제 팀 폴백 감시자 시작 및 원샷 플러시 경로가 존재하지 않는 최상위 수준 `scripts/*.js` 대신 배송된 `dist/scripts/*.js` 진입점을 확인하여 압축 설치에서 작업자 메시지 전달 및 상태 변경 전달을 복원합니다.
- **패키지된 감시자 경로에 대한 CI 스모크 적용 범위** — 이제 스모크 CI는 패키지된 감시자 경로 확인 계약을 실행하므로 향후 릴리스 빌드는 출시 전에 이러한 회귀 클래스를 포착합니다.

## [0.11.2] - 2026-03-20

`v0.11.1` 이후 6개의 PR이 도착했습니다. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

### 추가됨
- **양방향 텔레그램/Discord 회신 지원** — 회신 수신기는 이제 Telegram 및 Discord 통합을 위한 폴링 기반 양방향 메시징을 지원합니다. (홍보 [#984](https://github.com/Yeachan-Heo/oh-my-codex/pull/984))
- **OMX SDK 아키텍처 개선** — 외부 통합을 위한 SDK 퍼사드 계약 및 확인 패턴이 개선되었습니다. (홍보 [#985](https://github.com/Yeachan-Heo/oh-my-codex/pull/985))

### 결정된
- **심층 인터뷰 상태 모드 호환성** — 이제 심층 인터뷰 워크플로는 레거시 OMC 상태 경로 대신 OMX 상태 API를 올바르게 사용합니다. (PR [#987](https://github.com/Yeachan-Heo/oh-my-codex/pull/987), [#1783](https://github.com/Yeachan-Heo/oh-my-codex/issues/1783) 종료)
- **실제 tmux 테스트 격리** — 간섭을 방지하기 위해 이제 tmux/세션 테스트가 라이브 유지관리자 세션에서 격리됩니다. (PR [#980](https://github.com/Yeachan-Heo/oh-my-codex/pull/980), [#960](https://github.com/Yeachan-Heo/oh-my-codex/issues/960) 종료)
- **npm pack 테스트 실행 경쟁 조건** — npm pack 테스트 실행 중에 병렬 테스트 실행이 dist를 다시 빌드하는 것을 방지했습니다. (홍보 [#986](https://github.com/Yeachan-Heo/oh-my-codex/pull/986))
- **주변 tmux 부트스트랩 복원** — 정렬된 가짜 tmux 고정 장치가 있는 상태 도구에 대한 주변 tmux 부트스트랩을 복원했습니다. (핫픽스 커밋)

### 변경됨
- **Hook SDK 문서 정렬** — 도움말, init 및 상태 명령 전체에 걸쳐 통합된 후크 활성화 문구 및 메시징입니다.

## [0.11.1] - 2026-03-20

`v0.11.0` 이후 5개의 PR이 도착했습니다. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

### 결정된
- **유리창 감지 회귀** — 표준 유리창 라우팅에 맞춰 정렬된 자동 넛지 픽스처로 후크 너지가 HUD 창에 착지하는 것을 방지합니다. (홍보 [#981](https://github.com/Yeachan-Heo/oh-my-codex/pull/981))
- **테스트 중 라이브 세션 간섭** — tmux/세션 검색이 이제 라이브 유지관리자 상태에서 격리됩니다. (PR [#979](https://github.com/Yeachan-Heo/oh-my-codex/pull/979), [#963](https://github.com/Yeachan-Heo/oh-my-codex/issues/963) 종료)
- **엄격한 패키지 설치 허용 목록** — 이제 Explore Harness는 ripgrep 없이도 패키지 설치를 유지하면서 비-rg 허용 목록 누락에 대해 빠르게 실패합니다. (PR [#978](https://github.com/Yeachan-Heo/oh-my-codex/pull/978), [#964](https://github.com/Yeachan-Heo/oh-my-codex/issues/964) 종료)
- **연기 초점 해제** — 이제 연기 테스트는 부팅 안전 패키지 설치에 중점을 둡니다. (PR [#983](https://github.com/Yeachan-Heo/oh-my-codex/pull/983), [#982](https://github.com/Yeachan-Heo/oh-my-codex/issues/982) 종료)

### 변경됨
- **CI 워크플로 정리** — 릴리스 연기 테스트를 간소화하고 테스트 환경에서 외부 도구 종속성을 줄였습니다.

## [0.11.0] - 2026-03-19

출시를 위한 버전 범프입니다.

## [0.10.3] - 2026-03-18

`v0.10.2..dev`의 21개 PR에 걸쳐 46개 커밋. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@lifrary](https://github.com/lifrary)(이승우).

### 추가됨
- **AGENTS.md 템플릿의 Lore 커밋 프로토콜** — 실행기 프롬프트와 AGENTS.md 템플릿에는 이제 구조화된 커밋 메타데이터를 위한 Lore 커밋 프로토콜이 포함됩니다. (홍보 [#916](https://github.com/Yeachan-Heo/oh-my-codex/pull/916))
- **AGENTS.md 설정 중에 자동 생성된 모델 기능 테이블** — `omx setup`은 이제 빠른 참조를 위해 AGENTS.md에 모델 기능 테이블을 생성합니다. (홍보 [#894](https://github.com/Yeachan-Heo/oh-my-codex/pull/894))
- **기본 Skill_ref 브리지 및 하위 에이전트 추적** — 이제 수명 주기 추적을 통해 기술 참조를 기본 하위 에이전트에 브리지할 수 있습니다. (홍보 [#892](https://github.com/Yeachan-Heo/oh-my-codex/pull/892))
- **Codex 기본 하위 에이전트 통합 단계 1** — Codex CLI 기본 하위 에이전트 생성 및 조정의 첫 번째 통과 통합입니다. (홍보 [#886](https://github.com/Yeachan-Heo/oh-my-codex/pull/886))
- **AGENTS 자율성 지시문** — AGENTS.md에는 이제 자체 지시 에이전트 작업을 위한 명시적인 자율성 지시문이 포함되어 있습니다. (홍보 [#883](https://github.com/Yeachan-Heo/oh-my-codex/pull/883))
- **자동 연구 초보자 심층 인터뷰 유입 브리지** — 이제 자동 연구는 자율 연구를 시작하기 전에 심층 인터뷰 유입 흐름을 통해 초보자 사용자를 라우팅할 수 있습니다. (홍보 [#906](https://github.com/Yeachan-Heo/oh-my-codex/pull/906))
- **`omx cleanup` 분리된 MCP 서버용** — 새로운 정리 명령은 분리된 MCP 서버 프로세스를 감지하고 제거합니다. (PR [#901](https://github.com/Yeachan-Heo/oh-my-codex/pull/901), [#900](https://github.com/Yeachan-Heo/oh-my-codex/issues/900) 종료)
- **`omx cleanup`의 오래된 `/tmp` 정리** — 이제 정리는 `/tmp`에서 오래된 임시 파일도 제거합니다. (PR [#912](https://github.com/Yeachan-Heo/oh-my-codex/pull/912), [#908](https://github.com/Yeachan-Heo/oh-my-codex/issues/908) 종료)
- **자동 조사 쇼케이스 허브** — 적응형 정렬, 잠재 부분 공간 발견, 시끄러운 Bayesopt 및 Kaggle 스타일 ML 임무를 위한 쇼케이스 인덱스, 실행기 스크립트 및 완료된 데모가 추가되었습니다. (홍보 [#884](https://github.com/Yeachan-Heo/oh-my-codex/pull/884))

### 변경됨
- **자동 연구 계약 및 런타임 삭제됨** — 명확성과 일관성을 위해 자동 연구 계약 인터페이스 및 런타임을 정리했습니다. (홍보 [#918](https://github.com/Yeachan-Heo/oh-my-codex/pull/918))

### 결정된
- **작업 트리에서 부트스트랩된 패키지 설치 스모크 뎁** - 이제 작업 트리 기반 CI가 패키지 설치에 대한 스모크 테스트 종속성을 올바르게 부트스트랩합니다. (PR [#919](https://github.com/Yeachan-Heo/oh-my-codex/pull/919), [#917](https://github.com/Yeachan-Heo/oh-my-codex/issues/917) 종료)
- **자동 조사 접수를 위한 심층 인터뷰 실행** — 이제 자동 조사 접수가 심층 인터뷰 실행 경로를 올바르게 사용합니다. (PR [#915](https://github.com/Yeachan-Heo/oh-my-codex/pull/915), [#911](https://github.com/Yeachan-Heo/oh-my-codex/issues/911) 종료)
- **glibc 이전에 musl Linux 자산 선호** — 기본 자산 확인은 이제 더 넓은 호환성을 위해 glibc보다 musl 연결 Linux 바이너리를 선호합니다. (PR [#914](https://github.com/Yeachan-Heo/oh-my-codex/pull/914), [#907](https://github.com/Yeachan-Heo/oh-my-codex/pull/907))
- **자동 조사 작업 트리 경로는 프로젝트 로컬 `.omx/`을 사용합니다. ** — 작업 트리는 이제 전역 경로 대신 `.omx/worktrees/` 아래에 생성됩니다. (홍보 [#913](https://github.com/Yeachan-Heo/oh-my-codex/pull/913))
- **오래된 네이티브 에이전트 정리** — 더 이상 사용하지 않는 남은 네이티브 에이전트 파일을 제거했습니다. (홍보 [#899](https://github.com/Yeachan-Heo/oh-my-codex/pull/899))
- **스킬 에이전트 생성이 중지되었습니다** — 설정에서 더 이상 스킬에 대한 에이전트 파일을 생성하지 않아 파일 팽창이 줄어듭니다. (홍보 [#897](https://github.com/Yeachan-Heo/oh-my-codex/pull/897))
- **`__dirname` 자동 조사 안내 흐름의 ESM 오류** — ESM 컨텍스트에서 CommonJS `__dirname` 참조를 해결했습니다. (홍보 [#903](https://github.com/Yeachan-Heo/oh-my-codex/pull/903))
- **자동 조사를 위한 macOS 테스트 호환성** — `execFileSync('cat')`을 `readFileSync`로 대체하고 BSD `find` 비호환성을 수정했습니다. (홍보 [#891](https://github.com/Yeachan-Heo/oh-my-codex/pull/891) — @lifrary)
- **심각도가 높은 전이적 취약점 패치됨** — 심각도가 높은 CVE를 해결하기 위해 전이적 종속성을 업데이트하고 dependencyabot 구성을 추가했습니다. (PR [#889](https://github.com/Yeachan-Heo/oh-my-codex/pull/889), [#888](https://github.com/Yeachan-Heo/oh-my-codex/issues/888) 종료)

## [0.10.2] - 2026-03-16

3개의 PR은 `0.10.1` 릴리스 태그 이후 및 이 `0.10.2` 릴리스 준비 커밋 이전에 전달되었습니다. 3개 모두 대상 수정 사항입니다. `0.10.1` 태그가 `2026-03-16 06:57 UTC`에 도착했습니다. 마지막으로 배송된 병합(`#878`)은 릴리스 준비가 패치를 종료하기 전 약 1시간 46분의 처리 시간 동안 `2026-03-16 08:43 UTC`에 도착했습니다.

### 결정된
- **샌드박스 우회를 위해 정규화된 자동 조사 코덱 인수** — 코덱 실행 인수를 구성할 때 `--dangerously-bypass-approvals-and-sandbox` 플래그가 올바르게 정규화되어 이중 플래그 또는 누락된 플래그 엣지 케이스를 방지합니다. (홍보 [#875](https://github.com/Yeachan-Heo/oh-my-codex/pull/875))
- **Codex CLI 실행 전에 중복된 `[tui]` 구성 섹션이 자동 복구됨** — Codex를 호출하기 전에 `config.toml`에서 중복된 `[tui]` 섹션을 감지하고 병합하여 TOML 구문 분석 실패를 방지합니다. (홍보 [#876](https://github.com/Yeachan-Heo/oh-my-codex/pull/876))
- **darwin의 tmux 시작 정책** — macOS에서 올바른 tmux 시작 정책을 사용하여 tmux 서버가 아직 실행되지 않을 때 세션 시작 실패를 방지합니다. (홍보 [#878](https://github.com/Yeachan-Heo/oh-my-codex/pull/878))

### CI
- 이제 릴리스 워크플로는 `softprops/action-gh-release`을 통해 `RELEASE_BODY.md`에서 GitHub 릴리스 제목과 본문을 설정합니다.

## [0.10.1] - 2026-03-16

`0.10.0` 릴리스 범프 이후 및 이 `0.10.1` 릴리스 준비 커밋 이전에 6개의 PR이 도착했습니다. 4개의 긴급 핫픽스 PR, 1개의 빠른 후속 자동 조사 UX PR 및 1개의 문서 후속 조치. `0.10.0` 범프 커밋이 `2026-03-15 17:22 UTC`에 도착했습니다. 긴급 핫픽스 열차는 `2026-03-16 03:18 UTC`에 의해 병합되었으며 마지막으로 배송된 `dev` 후속 병합은 `2026-03-16 05:59 UTC`에 도착하여 릴리스 준비가 패치를 종료하기 약 12시간 37분 전에 처리되었습니다.

### 추가됨
- **안내 자동 조사 설정 및 `init` 스캐폴딩** — `omx autoresearch`은 이제 TTY에 대한 대화형 안내 설정과 미션 파일 생성 및 감독자를 깔끔하게 시작하기 위한 스크립트 가능한 `omx autoresearch init` 경로를 지원합니다. (PR [#873](https://github.com/Yeachan-Heo/oh-my-codex/pull/873), [#863](https://github.com/Yeachan-Heo/oh-my-codex/issues/863) 종료)

### 결정된
- **자동 조사는 이제 기본적으로 승인 및 샌드박스를 우회합니다** — 호출자가 이미 자체 플래그를 제공하지 않는 한 승인/샌드박스 프롬프트에서 자율 실행이 중단되는 것을 방지합니다. (PR [#856](https://github.com/Yeachan-Heo/oh-my-codex/pull/856), [#855](https://github.com/Yeachan-Heo/oh-my-codex/issues/855) 종료)
- **자동 조사 작업 트리 정리는 `.omx/` 런타임 아티팩트를 무시합니다** — 세션 상태 및 기타 런타임 파일로 인해 발생하는 잘못된 작업 트리 오류를 방지합니다. (PR [#858](https://github.com/Yeachan-Heo/oh-my-codex/pull/858), [#857](https://github.com/Yeachan-Heo/oh-my-codex/issues/857) 종료)
- **설치된 스킬은 프로젝트 및 사용자 범위 전체에서 중복 제거됩니다** — 이제 프로젝트 로컬 스킬이 우선 적용되며 숨겨진 중복은 구성된 에이전트/팀 지침에서 필터링됩니다. (PR [#864](https://github.com/Yeachan-Heo/oh-my-codex/pull/864), [#861](https://github.com/Yeachan-Heo/oh-my-codex/issues/861) 종료)
- **팀 작업자 준비 상태 감지는 Codex 0.114.0 시작 동작과 일치합니다** — 새로운 환영 도우미 텍스트를 수락하고 더 안전한 준비 대기 경로를 사용하여 잘못된 시작 실패를 줄입니다. (PR [#868](https://github.com/Yeachan-Heo/oh-my-codex/pull/868), [#866](https://github.com/Yeachan-Heo/oh-my-codex/issues/866) 종료)

### 문서
- 기본 다국어 README에 Discord 커뮤니티 서버 배지를 추가했습니다. (홍보 [#869](https://github.com/Yeachan-Heo/oh-my-codex/pull/869))

## [0.10.0] - 2026-03-15

`v0.9.1..dev`의 26개 PR에 걸쳐 54개 커밋. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun).

### 추가됨
- **`omx autoresearch`** _(실험)_ — 주제를 반복적으로 탐색하고 반복적인 noop 반복 후에 자체 종료되는 새로운 자율 연구 모드입니다. (홍보 [#847](https://github.com/Yeachan-Heo/oh-my-codex/pull/847), [#849](https://github.com/Yeachan-Heo/oh-my-codex/pull/849))
- **`omx exec` 래퍼** — 사용자가 OMX 오케스트레이션 계층을 통해 직접 명령을 실행할 수 있게 해주는 1차 실행 래퍼입니다. (홍보 [#832](https://github.com/Yeachan-Heo/oh-my-codex/pull/832))
- **기본적으로 팀 작업 트리 적용** — 이제 팀 모드는 기본적으로 각 작업자에 대해 격리된 Git 작업 트리를 생성하여 병렬 안전성을 향상시킵니다. (홍보 [#804](https://github.com/Yeachan-Heo/oh-my-codex/pull/804))
- **심층 인터뷰 의도 우선 모드** — 이제 심층 인터뷰는 소크라테스식 질문 루프에 들어가기 전에 사용자 의도를 미리 분류합니다. (홍보 [#829](https://github.com/Yeachan-Heo/oh-my-codex/pull/829))
- **증분 작업 트리 병합 추적** — 이제 팀 작업 트리 병합이 증분 추적되므로 더욱 스마트한 충돌 감지 및 해결이 가능합니다. (홍보 [#846](https://github.com/Yeachan-Heo/oh-my-codex/pull/846))

### 변경됨
- **심층 인터뷰 실행 핸드오프 계약이 문서화됨** — 인터뷰와 자율 실행 사이의 연결은 이제 명시적이고 테스트 가능한 계약입니다. (홍보 [#851](https://github.com/Yeachan-Heo/oh-my-codex/pull/851))
- **팀 이벤트/문서 계약이 명확해졌습니다** — 이제 Interop 계약은 정식 이벤트 읽기, 절전 모드 해제 가능 신호와 감사 전용 신호 및 `allocation_reason` 검토 이음새를 문서화합니다.
- **CI Rust 런타임 정렬이 되돌려졌습니다** — 호환성 문제 이후 상자 런타임 패키징이 되돌려졌습니다. (PR [#821](https://github.com/Yeachan-Heo/oh-my-codex/pull/821), [#840](https://github.com/Yeachan-Heo/oh-my-codex/pull/840))

### 결정된
- **Windows psmux 부트스트랩 강화** — 이제 Windows에서 분리된 psmux 부트스트랩이 자동 오류를 발생시키는 극단적인 경우를 처리합니다. (PR [#854](https://github.com/Yeachan-Heo/oh-my-codex/pull/854), [#853](https://github.com/Yeachan-Heo/oh-my-codex/issues/853) 종료)
- **팀 작업 트리 지속적인 통합** — 안정적인 작업 트리 동기화를 위한 자동 커밋 및 작업자 간 리베이스를 갖춘 하이브리드 병합 전략입니다. (홍보 [#852](https://github.com/Yeachan-Heo/oh-my-codex/pull/852))
- **설정 스킬 검증** — 이제 스킬 디렉터리 손상을 방지하기 위해 설치 전에 스킬을 검증합니다. (PR [#845](https://github.com/Yeachan-Heo/oh-my-codex/pull/845), 발행 [#844](https://github.com/Yeachan-Heo/oh-my-codex/issues/844))
- **Ralph 자동 확장 반복** — 이제 활성 Ralph 세션이 조기에 중단되는 대신 `max_iterations`을 자동 확장합니다. (PR [#843](https://github.com/Yeachan-Heo/oh-my-codex/pull/843), 발행 [#842](https://github.com/Yeachan-Heo/oh-my-codex/issues/842))
- **설정 기본값은 CODEX_HOME** — 이제 사용자 기술 경로의 기본값은 `CODEX_HOME`로 올바르게 설정됩니다. (홍보 [#839](https://github.com/Yeachan-Heo/oh-my-codex/pull/839))
- **계획 후 팀 컨텍스트 보존** — 랄플랜이 완료된 후 팀 후속 컨텍스트가 더 이상 손실되지 않습니다. (홍보 [#833](https://github.com/Yeachan-Heo/oh-my-codex/pull/833))
- **파이프라인 계획 아티팩트 검사 통합** — 계획-완료 아티팩트 감지는 이제 일관된 단일 검사를 사용합니다. (PR [#828](https://github.com/Yeachan-Heo/oh-my-codex/pull/828), 발행 [#827](https://github.com/Yeachan-Heo/oh-my-codex/issues/827))
- **Config.toml 병합 수정** — 이제 구성 병합 중에 기존 알림 및 tui 항목이 보존됩니다. (PR [#826](https://github.com/Yeachan-Heo/oh-my-codex/pull/826), 발행 [#825](https://github.com/Yeachan-Heo/oh-my-codex/issues/825))
- **프로젝트 .omx gitignore sync** — 프로젝트 범위 `.omx` 디렉터리에 대한 gitignore 동기화를 수정했습니다. (PR [#824](https://github.com/Yeachan-Heo/oh-my-codex/pull/824), 발행 [#823](https://github.com/Yeachan-Heo/oh-my-codex/issues/823))
- **팀 HUD 전체 너비** — 팀 HUD 레이아웃이 이제 전체 터미널 너비에 걸쳐 있습니다. (PR [#822](https://github.com/Yeachan-Heo/oh-my-codex/pull/822), 발행 [#822](https://github.com/Yeachan-Heo/oh-my-codex/issues/822))
- **tmux 마우스 상태 누출** — 세션 전반에 걸쳐 서버 전역 마우스 상태 누출을 중지했습니다. (PR [#820](https://github.com/Yeachan-Heo/oh-my-codex/pull/820), 발행 [#817](https://github.com/Yeachan-Heo/oh-my-codex/issues/817))
- **Sparkshell glibc 폴백** — 이제 이전 Linux 시스템에서 glibc 불일치가 발생할 때 Sparkshell이 ​​정상적으로 폴백합니다. (PR [#813](https://github.com/Yeachan-Heo/oh-my-codex/pull/813), 발행 [#812](https://github.com/Yeachan-Heo/oh-my-codex/issues/812))
- **macOS 클립보드 이미지 붙여넣기** — macOS에서 올바른 클립보드 이미지 붙여넣기 경로가 유지됩니다. (PR [#810](https://github.com/Yeachan-Heo/oh-my-codex/pull/810), 발행 [#809](https://github.com/Yeachan-Heo/oh-my-codex/issues/809))
- **연기 수화 방출** — 오프라인 검증을 위해 현지화된 연기 수화 자산입니다. (홍보 [#806](https://github.com/Yeachan-Heo/oh-my-codex/pull/806))

### 내부
- 사용되지 않는 `sendRebaseConflictMessageToWorker` 함수를 제거했습니다. (홍보 [#852](https://github.com/Yeachan-Heo/oh-my-codex/pull/852))
- 더 나은 테스트 위생을 위해 격리된 더티 작업 트리 테스트 도우미입니다. (홍보 [#849](https://github.com/Yeachan-Heo/oh-my-codex/pull/849))

## [0.9.1] - 2026-03-13

### 결정된
- **연기 수화 핫픽스 릴리스** — PR [#806](https://github.com/Yeachan-Heo/oh-my-codex/pull/806)의 패키지 설치 연기 수정을 `main`에 선택하여 릴리스 확인 중에 수화 자산이 올바르게 현지화되도록 합니다. (`d86165d` 커밋)

### 변경됨
- **대체 패치 릴리스에 대한 릴리스 메타데이터** — 패키지/작업 공간 버전을 `0.9.1`에 추가하고 기록 기록을 명시적으로 보존하는 릴리스 노트/준비 문서를 추가했습니다. `v0.9.0`은 빨간색으로 유지되고 `v0.9.1`는 완전한 대체 릴리스입니다.

## [0.9.0] - 2026-03-12

`v0.8.15..dev`의 비병합 커밋 55개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo/oh-my-codex), Bellman, 2233admin, [@seunghwaneom](https://github.com/seunghwaneom), [@hoky1227](https://github.com/hoky1227).

### 추가됨
- **`omx explore` 기본 하네스 및 패키징 흐름** — OMX는 이제 Rust 하네스, 패키지/소스 대체 논리 및 릴리스 인식 기본 자산 확인을 통해 지원되는 전용 읽기 전용 탐색 진입점을 제공합니다. (`fb07c3c` 커밋)
- **`omx sparkshell` 운영자 측 네이티브 사이드카** — 운영자 검사 워크플로우를 위한 직접적인 셸 네이티브 전문가 표면과 명시적인 tmux 창 요약 지원을 추가했습니다. (`71858c3` 커밋)
- **교차 플랫폼 기본 릴리스 게시** — 릴리스 자동화는 이제 생성된 릴리스 매니페스트 메타데이터 및 압축 설치 스모크 게이트와 함께 `omx-explore-harness` 및 `omx-sparkshell`에 대한 기본 아카이브를 게시합니다. (`23d1cf5`, `559089f` 커밋)
- **`build:full` 원샷 빌드 경로** — TypeScript와 패키지된 탐색 하네스 및 Sparkshell 바이너리를 컴파일하고 이를 CI에서 검증하는 릴리스 지향 빌드 명령을 추가했습니다. (`d12e5f4`, `99ce264` 커밋)

### 변경됨
- **적격한 `omx explore` 셸 기본 프롬프트는 스파크셸을 통해 라우팅할 수 있습니다** — 간단한 읽기 전용 셸 작업은 이제 직접 탐색 하네스에 대한 명시적 폴백을 유지하면서 더 저렴할 때 스파크셸을 백엔드로 사용합니다. (홍보 [#782](https://github.com/Yeachan-Heo/oh-my-codex/pull/782))
- **기본 모델 확인이 이제 중앙 집중화되었습니다** — 이제 런타임/문서/테스트가 분산된 모델 기본 처리 대신 하나의 OMX 기본 모델 확인 경로를 중심으로 정렬됩니다. (홍보 [#787](https://github.com/Yeachan-Heo/oh-my-codex/pull/787))
- **릴리스/런타임 지침은 이제 기본 탐색 스택을 더욱 명시적으로 문서화합니다** — README 및 지침 화면은 탐색/스파크셸 라우팅, 기본 하이드레이션 및 원시 대 요약 기대치를 더 잘 설명합니다. (`25bdd23`, `c83223d` 커밋)

### 결정된
- **탐색/스파크셸 대체 강화** — 강화된 스파크셸 대체 동작, 누락된 네이티브 매니페스트 처리 및 릴리스 자산/네이티브 캐시 조회를 통해 패키지 설치가 더 깔끔하게 실패하고 더 예측 가능하게 복구됩니다. (`dc83dfd`, `7aee91d` 커밋)
- **Sparkshell 요약 동작은 시끄러운 출력에서 ​​더 안정적입니다** — 요약 추론이 제한되고 스트레스 적용 범위가 추가되어 긴 출력 요약이 더 예측 가능하게 유지되고 핵심 사실이 보존됩니다. (PR [#781](https://github.com/Yeachan-Heo/oh-my-codex/pull/781), `a653376` 커밋)
- **새 스택에 대한 CLI/도움말/런타임 개선** — 로컬 `ask`/`hud` 도움말 라우팅, HUD 분기/구성 처리, Windows Codex 명령 검색 및 팀 런타임 수명 주기/정리 경로가 동일한 릴리스 기간 동안 강화되었습니다. (PR [#785](https://github.com/Yeachan-Heo/oh-my-codex/pull/785), [#786](https://github.com/Yeachan-Heo/oh-my-codex/pull/786), [#788](https://github.com/Yeachan-Heo/oh-my-codex/pull/788), [#793](https://github.com/Yeachan-Heo/oh-my-codex/pull/793))

## [0.8.13] - 2026-03-11

`main..dev`의 비병합 커밋 19개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@gobylor](https://github.com/gobylor).

### 추가됨
- **최상위 `omx resume` 명령** — `omx resume` 패스스루를 추가하여 OMX가 CLI/help/docs 적용 범위에서 `codex resume`를 미러링하도록 했습니다. (홍보 [#752](https://github.com/Yeachan-Heo/oh-my-codex/pull/752) — @gobylor)
- **팀 할당 및 보수적인 재조정 정책 연결** - 이제 팀 시작 할당이 레인을 인식하고 런타임 모니터링을 통해 청구 모델을 다시 작성하지 않고도 회수된 보류 작업을 적격 유휴 작업자에게 안전하게 재할당할 수 있습니다. (홍보 [#761](https://github.com/Yeachan-Heo/oh-my-codex/pull/761) — @HaD0Yun)

### 변경됨
- **팀 정책 매니페스트 경계가 더욱 명확해졌습니다** - 이제 지속 전송/런타임 정책이 수명 주기 거버넌스와 분리되어 중첩된 팀 확인, 승인/위임 게이트 및 종료 정리 규칙이 권한 있는 런타임 측에서 제공됩니다. (PR [#753](https://github.com/Yeachan-Heo/oh-my-codex/pull/753), 발행 [#746](https://github.com/Yeachan-Heo/oh-my-codex/issues/746))
- **공유 tmux 지연 휴리스틱은 이제 후크 및 런타임 경로를 모두 구동합니다** — 공통 지연/부트스트랩/준비/활성 작업 감지가 알림 후크 디스패치/가드 로직 및 팀 tmux 세션 런타임에 의해 재사용되는 공유 엔진으로 이동되었습니다. (PR [#758](https://github.com/Yeachan-Heo/oh-my-codex/pull/758), 발행 [#732](https://github.com/Yeachan-Heo/oh-my-codex/issues/732))
- **팀 모드 문서 및 지침이 새로 고쳐졌습니다** — README 사본은 이제 팀 모드에 대해 OMX를 더 명확하게 배치하고 직접 실행 및 증거 지원 검증을 위해 기본 지침 문구를 강화했습니다. (PR [#765](https://github.com/Yeachan-Heo/oh-my-codex/pull/765), [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/commit/5ced66db873b2cf729f66075062df3c2a8599357) 커밋)

### 결정된
- **대체 팀 전달 및 오래된 알림 대기 시간** — 더 빠른 대체 감시자 흐름, 대체 틱에 대한 리더 넛지 평가, 더 큰 기본 디스패치 승인 예산으로 팀 메시지 전달 지연 및 오래된 알림이 줄어듭니다. (PR [#739](https://github.com/Yeachan-Heo/oh-my-codex/pull/739), 발행 [#738](https://github.com/Yeachan-Heo/oh-my-codex/issues/738))
- **`omx doctor`에서 잘못된 Codex TOML 감지** — 이제 의사는 더 명확한 중복 테이블 힌트를 사용하여 잘못된 형식의 `~/.codex/config.toml`에 플래그를 표시합니다. (PR [#740](https://github.com/Yeachan-Heo/oh-my-codex/pull/740), 관련 이슈 [#486](https://github.com/Yeachan-Heo/oh-my-codex/issues/486))
- **연결된 팀 Ralph 수명 주기 동기화** — `omx team ralph`은 이제 실행 시 연결된 Ralph 상태를 설정하고, 연결된 터미널 취소를 런타임 전환에서 직접 전파하며, Ralph 작업이 계속 활성 상태인 동안 실행기 상위 항목이 종료될 때 계속 조정을 유지합니다. (PR [#749](https://github.com/Yeachan-Heo/oh-my-codex/pull/749), 발행 [#742](https://github.com/Yeachan-Heo/oh-my-codex/issues/742), PR [#750](https://github.com/Yeachan-Heo/oh-my-codex/pull/750), 발행 [#743](https://github.com/Yeachan-Heo/oh-my-codex/issues/743), PR [#751](https://github.com/Yeachan-Heo/oh-my-codex/pull/751))
- **팀 작업자 및 리더 넛지가 더 실행 가능해졌습니다** — 자동 넛지 후속 문구가 더 안정적으로 감지되고, 리더 넛지가 이제 실시간 팀 상태에서 다음 작업을 파생하고, 사서함 지침이 더 명확해지고, 오래된 "계속 폴링" 문구가 오케스트레이션 지침으로 대체되었습니다. (PR [#754](https://github.com/Yeachan-Heo/oh-my-codex/pull/754); PR [#759](https://github.com/Yeachan-Heo/oh-my-codex/pull/759), 발행 [#759](https://github.com/Yeachan-Heo/oh-my-codex/issues/759); PR [#763](https://github.com/Yeachan-Heo/oh-my-codex/pull/763); PR [#766](https://github.com/Yeachan-Heo/oh-my-codex/pull/766))
- **팀 종료 중 HUD 정리** — 대화식 종료는 이제 빠른 재실행 주기에 걸쳐 오래된 창을 방지하기 위해 HUD 창을 깔끔하게 해체합니다. (PR [#764](https://github.com/Yeachan-Heo/oh-my-codex/pull/764), 발행 [#764](https://github.com/Yeachan-Heo/oh-my-codex/issues/764))
- **CLI 시작은 더 이상 `doctor`을 즉시 로드하지 않습니다** — `doctor` 명령은 이제 지연 로드되므로 관련되지 않은 CLI 호출로 인해 불필요한 작업이 방지됩니다. ([__TOK_2__](https://github.com/Yeachan-Heo/oh-my-codex/commit/2503d9528d175a032bbc247f61137c5daf547923) 커밋)

## [0.8.12] - 2026-03-11

`v0.8.11..dev`의 비병합 커밋 12개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@gobylor](https://github.com/gobylor).

### 추가됨
- **팀 조정자 브레인 및 실행자 레인 분할** — 팀 워크플로는 이제 계획과 실행 문제를 보다 명확하게 분리하기 위해 전용 `team-orchestrator` 및 `team-executor` 에이전트 역할을 사용합니다. (홍보 [#715](https://github.com/Yeachan-Heo/oh-my-codex/pull/715))
- **세션 기록 검색 명령** — `omx session-history search`(별칭: `omx sh search`)을 사용하면 다중 필드 일치 및 대화형 필터링을 통해 명령 기록, 프롬프트 및 도구 상호 작용 전반에 걸쳐 전체 텍스트 검색이 가능합니다. (홍보 [#724](https://github.com/Yeachan-Heo/oh-my-codex/pull/724))
- **팀 유휴 및 정지 읽기 API** — `omx team api`은 이제 팀 작업자 상태의 프로그래밍 방식 모니터링을 위해 `idle-read` 및 `stall-read` 작업을 노출합니다. (홍보 [#720](https://github.com/Yeachan-Heo/oh-my-codex/pull/720))
- **Ralph 주기적인 활성 계속 조종** — 이제 Ralph 모드는 진행이 멈췄을 때 활성 에이전트에게 계속하라는 메시지를 주기적으로 표시하여 유휴 대기 시간을 줄입니다. (홍보 [#733](https://github.com/Yeachan-Heo/oh-my-codex/pull/733))
- **팀 리더 상태 모니터링 힌트** — 팀 구성원의 진행 상황과 정지 상태에 대한 더 나은 가시성을 위해 리더 측 상태 힌트가 개선되었습니다. (홍보 [#734](https://github.com/Yeachan-Heo/oh-my-codex/pull/734))

### 변경됨
- **신뢰도가 낮은 분석 프롬프트는 단일 레인을 유지합니다** — 이제 팀 분해는 신뢰도가 낮을 ​​때 분석 프롬프트를 단일 레인에 유지하여 불확실한 작업의 단편화를 방지합니다. (홍보 [#726](https://github.com/Yeachan-Heo/oh-my-codex/pull/726))

### 결정된
- **Windows psmux 분리 실행 안정성** — Windows에서 팀 작업자를 시작할 때 프로세스 분리 문제가 해결되었습니다. (홍보 [#725](https://github.com/Yeachan-Heo/oh-my-codex/pull/725))
- **tmux를 사용할 수 없는 경우 tmux 부트스트랩 건너뛰기** — tmux가 설치되지 않았거나 PATH에 없을 때의 우아한 대체입니다. (PR [#722](https://github.com/Yeachan-Heo/oh-my-codex/pull/722) — @gobylor)
- **부실 게이트 이전에 중단된 팀 리더 넛지** — 팀 리더는 이제 오래된 감지 임계값에 도달하기 전에 사전 넛지를 받습니다. (홍보 [#729](https://github.com/Yeachan-Heo/oh-my-codex/pull/729))

### 되돌림
- **실험적인 Rust CLI 패리티 하네스** — TypeScript CLI 안정성을 유지하기 위해 커밋 #728 및 #730이 개발에서 되돌려졌습니다. (홍보 [#736](https://github.com/Yeachan-Heo/oh-my-codex/pull/736))

## [0.8.11] - 2026-03-10

최신 병합된 `dev` 런타임/모델 기본 작업에서 생성되고 릴리스 전 `dev`에서 검증되었습니다.

### 추가됨
- **추가 팀 이벤트 쿼리 API** — `omx team api`은 이제 전용 이벤트 쿼리 작업을 노출하므로 팀 런타임 신호를 보다 구조적으로 사용할 수 있습니다. (홍보 [#714](https://github.com/Yeachan-Heo/oh-my-codex/pull/714))
- **명시적 모델-기본 계약** — 이제 런타임/문서/테스트가 의도된 메인/스파크 기본 모델 동작(`gpt-5.5` / `gpt-5.3-codex-spark`)을 중심으로 정렬됩니다. (홍보 [#718](https://github.com/Yeachan-Heo/oh-my-codex/pull/718))

### 변경됨
- **팀 프롬프트 분해는 산문 프롬프트의 경우 덜 불안정합니다** — 자연어 작업 프롬프트는 더 이상 병리학적 하위 작업으로 쉽게 분할되지 않습니다. (홍보 [#712](https://github.com/Yeachan-Heo/oh-my-codex/pull/712))

### 결정된
- **터미널 팀 상태 후 셸 창 알림 정리** — 팀 알림 주입은 이제 완료 후 셸 창에서 벗어납니다. (홍보 [#668](https://github.com/Yeachan-Heo/oh-my-codex/pull/668))
- **Clawhip 수명 주기 이벤트 소음 감소** — 필요한 가시성을 유지하면서 작동 이벤트 방출이 더 조용해졌습니다. (홍보 [#713](https://github.com/Yeachan-Heo/oh-my-codex/pull/713))
- **시작/작업 트리/유휴-실행-인수 경로 전반에 걸친 팀 런타임 강화** — PR [#696](https://github.com/Yeachan-Heo/oh-my-codex/pull/696), [#697](https://github.com/Yeachan-Heo/oh-my-codex/pull/697), [#700](https://github.com/Yeachan-Heo/oh-my-codex/pull/700), [#707](https://github.com/Yeachan-Heo/oh-my-codex/pull/707), [#708](https://github.com/Yeachan-Heo/oh-my-codex/pull/708) 및 [#711](https://github.com/Yeachan-Heo/oh-my-codex/pull/711)의 병합된 수정 사항을 포함합니다.
- **설정 새로 고침 테스트를 위한 릴리스 게이트 안정성** — 이제 테스트 중에 설정 AGENTS 덮어쓰기 적용 범위가 비대화형으로 유지되므로 릴리스 게이트가 더 이상 모델 업그레이드 프롬프트에서 중단되지 않습니다.

## [0.8.10] - 2026-03-09

`v0.8.9..dev`의 비병합 커밋 5개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun).

### 추가됨
- **릴리스에 중요한 회귀 적용 범위 및 테스트 환경 격리** — 성공, 거부, 실패 및 이미 최신 경로 전반에 걸쳐 CLI 자동 업데이트 회귀 적용 범위를 확장하고 주변 `CODEX_HOME` 누출에 대해 강화된 CLI/OpenClaw 통합 제품군을 제공하므로 릴리스 검증이 결정적으로 유지됩니다. (직접 커밋 `aedd068` — @Yeachan-Heo)

### 변경됨
- **루트 프롬프트 계약은 이제 직접 실행 및 증거 기반 검증에 더욱 명시적으로 편향됩니다** — 워크플로, 팀 및 검증 보장을 유지하면서 최상위 `AGENTS.md` / 템플릿 계약을 강화하고 핵심 프롬프트 표면을 단순화했습니다. (홍보 [#646](https://github.com/Yeachan-Heo/oh-my-codex/pull/646) — @HaD0Yun)
- **로컬 개발 아티팩트는 이제 git에서 무시됩니다** — 로컬 세션 상태 및 생성된 적용 범위 데이터 커밋을 방지하기 위해 `.codex/` 및 `coverage/`이 무시됩니다. (직접 커밋 `3149747` — @Yeachan-Heo)

### 결정된
- **이제 자동 업데이트는 성공적인 전역 설치 후 즉시 OMX 설정을 새로 고칩니다.** — 성공적인 `omx` 자체 업데이트는 이제 강제로 설정 새로 고침을 수행하므로 별도의 수동 새로 고침 없이 프롬프트, 기술 및 `AGENTS.md`이 동기화 상태를 유지합니다. (PR [#648](https://github.com/Yeachan-Heo/oh-my-codex/pull/648) — @Yeachan-Heo)
- **tmux Enter 제출은 대체 화면 UI에서 더 안정적입니다** — 첫 번째 `C-m` 제출 전에 정착 지연을 추가하고 후크 확장성 tmux 제출 경로에 해당 보호를 미러링했습니다. (PR [#649](https://github.com/Yeachan-Heo/oh-my-codex/pull/649) — @Yeachan-Heo, [#647](https://github.com/Yeachan-Heo/oh-my-codex/issues/647) 수정)

## [0.8.9] - 2026-03-08

`v0.8.8..dev`의 비병합 커밋 2개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

### 변경됨
- **팀 작업자 시작은 이제 역할별 지침 표면을 엔드 투 엔드로 사용합니다** — 라우팅된 작업자 역할은 이제 라이브 팀 구성/ID에 유지되고, 해결된 역할 프롬프트에서 작업자별 시작 `AGENTS.md` 파일을 작성하며, 명시적인 시작 재정의가 없는 한 역할 기반 기본 추론을 계속 적용합니다. (홍보 [#643](https://github.com/Yeachan-Heo/oh-my-codex/pull/643))

### 결정된
- **조정된 작업 부트스트랩은 이제 작업자 핸드오프 전에 표준 작업 상태를 유지합니다** — 동적 확장은 부트스트랩 중에 합성 작업 메타데이터를 재구성하는 대신 작업자 받은 편지함 및 역할 해결을 위한 안정적인 작업 ID/소유자/역할을 유지하면서 먼저 표준 팀 상태를 통해 새 작업을 작성합니다.

## [0.8.8] - 2026-03-08

`main..dev`의 비병합 커밋 5개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

### 추가됨
- **슬롭 방지 워크플로 및 카탈로그 연결** — 루트/템플릿 지침에 슬롭 방지 워크플로 계약을 추가하고, 전용 `ai-slop-cleaner` 기술을 도입하고, 새 워크플로가 생성된 기술 표면의 일부가 되도록 카탈로그 매니페스트/테스트를 업데이트했습니다. (홍보 [#634](https://github.com/Yeachan-Heo/oh-my-codex/pull/634))
- **팀 실행을 위한 팀 동료별 추론 노력 할당** — 이제 팀 조정을 통해 업데이트된 런타임/모델 계약 동작과 런타임, tmux 세션 및 모델 선택 경로에 대한 회귀 적용 범위를 통해 작업자별 추론 노력을 해결할 수 있습니다. (홍보 [#642](https://github.com/Yeachan-Heo/oh-my-codex/pull/642))

### 변경됨
- **팀 시작/모델 계약이 강화되었습니다** — 작업자 시작 인수, 확장 경로, tmux 세션 처리 및 README/기술 안내가 조정되어 팀 실행 중에 팀원별 추론 노력이 보다 일관되게 전파됩니다.

### 결정된
- **심층 인터뷰 자동 승인 주입은 이제 잠금으로 보호됩니다** — 키워드 감지 및 알림 후크 자동 넛지 경로가 강화되어 알림 후크 모듈 및 키워드 라우팅에 대한 회귀 범위가 확장되어 심층 인터뷰 자동 승인 주입이 제한적으로 유지됩니다. (홍보 [#637](https://github.com/Yeachan-Heo/oh-my-codex/pull/637))
- **게시된 npm bin 경로 정규화** — 패키지 bin 경로 계약을 정규화하고 게시된 `omx` 진입점을 정렬된 상태로 유지하기 위해 패키지 bin 회귀 테스트를 업데이트했습니다. (홍보 [#638](https://github.com/Yeachan-Heo/oh-my-codex/pull/638))
- **작업자 역할 예약은 팀 전용으로 유지됩니다** — 프롬프트 지침 계약 시행은 이제 라우팅 회귀 적용 범위를 통해 지원되는 팀 모드에 대한 작업자 역할을 명시적으로 예약합니다.

## [0.8.7] - 2026-03-08

`v0.8.6..dev`의 비병합 커밋 12개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@marlocarlo](https://github.com/marlocarlo).

### 추가됨
- **신속한 지침 계약 문서 및 재사용 가능한 조각** — 최고 수준의 프롬프트 지침 계약 문서, 재사용 가능한 지침 조각, 동기화 스크립트 및 공유 계약 테스트 도우미를 추가하여 루트 지침, 템플릿 및 프롬프트를 보다 체계적으로 정렬할 수 있습니다. (홍보 [#620](https://github.com/Yeachan-Heo/oh-my-codex/pull/620) — @Yeachan-Heo)
- **팀 강화 벤치마크 및 심층적인 런타임/작업 트리 적용 범위** — 전용 강화 벤치마크와 만료된 청구 복구 및 작업자 위생을 위한 더 넓은 런타임, 상태, 작업 트리 및 엔드투엔드 회귀 적용 범위가 추가되었습니다. (홍보 [#624](https://github.com/Yeachan-Heo/oh-my-codex/pull/624) — @HaD0Yun)
- **중앙 집중식 MCP stdio 수명 주기 부트스트랩** — 상태, 메모리, 코드 인텔, 추적 및 팀 MCP 서버는 이제 공통 `autoStartStdioMcpServer` 도우미와 유휴 해제를 위한 전용 수명 주기 회귀 제품군을 공유합니다. (홍보 [#626](https://github.com/Yeachan-Heo/oh-my-codex/pull/626), [#627](https://github.com/Yeachan-Heo/oh-my-codex/pull/627) — @Yeachan-Heo)
- **전역 설치를 위한 패키지 빈 계약 적용** — 게시된 npm bin 경로를 전역 `omx` 설치 동작에 맞게 유지하기 위해 명시적인 계약 테스트를 추가했습니다. (PR [#633](https://github.com/Yeachan-Heo/oh-my-codex/pull/633) — @Yeachan-Heo)

### 변경됨
- **계약 기반 XML 구조를 중심으로 프롬프트 표면이 정규화되었습니다** — 프롬프트 지침 검증이 중앙 집중화되고, 공유 조각이 추출되었으며, 모든 에이전트 프롬프트가 마크다운 스타일 제목에서 XML 태그 구조로 마이그레이션되었으며, 문서, 템플릿 및 구성 생성 전반에 걸쳐 2계층 오케스트레이터/역할 프롬프트 모델이 명확해졌습니다. (PR [#619](https://github.com/Yeachan-Heo/oh-my-codex/pull/619), [#623](https://github.com/Yeachan-Heo/oh-my-codex/pull/623) — @HaD0Yun)
- **빠른 경로 에이전트 추론 기본값이 재조정되었습니다** — 분석가, 플래너 및 관련 빠른 차선 에이전트 기본값이 의도한 운영 상태에 더 잘 일치하도록 하향 조정되었습니다.

### 결정된
- **Windows 기본 시작 및 tmux 기능 감지** — OMX는 이제 `win32`에서 하드 차단 대신 tmux 기능을 확인하고, `psmux`을 지원하고, 필요한 경우 Windows에 적합한 명령 확인을 사용하고, 플랫폼 설정 경로를 더 명확하게 문서화합니다. (홍보 [#616](https://github.com/Yeachan-Heo/oh-my-codex/pull/616) — @marlocarlo)
- **프롬프트 화면의 리더 전용 오케스트레이션 경계** — 작업자 지향 및 역할별 프롬프트는 이제 경계 계약에 대한 회귀 적용 범위를 통해 리더 오케스트레이션 책임을 보다 명시적으로 유지합니다. (홍보 [#625](https://github.com/Yeachan-Heo/oh-my-codex/pull/625) — @HaD0Yun)
- **npm global-install bin contract** — `package.json`에 게시된 `omx` bin 경로 항목을 수정하고 압축된 tarball 및 전역 설치 동작에 대한 전용 계약 테스트로 이를 잠갔습니다. (PR [#633](https://github.com/Yeachan-Heo/oh-my-codex/pull/633) — @Yeachan-Heo)

## [0.8.6] - 2026-03-07

`main..dev`의 비병합 커밋 4개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

### 추가됨
- **이벤트 인식 팀 대기 및 정식 이벤트 정규화** — 팀 런타임/상태 처리에는 이제 `omx_run_team_wait`에서 대기하는 추가 `wake_on=event` / `after_event_id`, 공유 이벤트 정규화/커서 도우미, 런타임/상태/API 계층 전반에 걸친 정식 이벤트 입력 및 새로운 `omx team await <team-name>` CLI 지원이 포함됩니다. 이제 런타임은 레거시 `worker_idle` 호환성을 유지하면서 `worker_state_changed`을 내보냅니다. (홍보 [#609](https://github.com/Yeachan-Heo/oh-my-codex/pull/609) — @Yeachan-Heo)
- **핵심 프롬프트 표면 전반에 걸친 GPT-5.4 프롬프트 지침 롤아웃** — 루트/템플릿 `AGENTS.md`, 실행기/플래너/검증기 프롬프트, 생성된 `developer_instructions` 및 회귀 적용 범위가 압축 출력 기본값, 저위험 후속 조치, 현지화된 작업 업데이트 재정의 및 종속성 인식 도구 지속성을 보다 명시적으로 인코딩하도록 업데이트되었습니다. (PR [#611](https://github.com/Yeachan-Heo/oh-my-codex/pull/611) — @Yeachan-Heo, 주소 [#608](https://github.com/Yeachan-Heo/oh-my-codex/issues/608))
- **GPT-5.4 프롬프트 지침 확장이 더 넓은 프롬프트 카탈로그 및 실행 중심 기술 전반에 걸쳐 확장됨** - 동일한 지침이 나머지 에이전트 프롬프트와 `analyze`, `autopilot`, `plan`, `ralph`, `ralplan`, `team`, `ultraqa`, `code-review`, `security-review` 및 `build-fix`에는 프롬프트 카탈로그, 웨이브 2 지침 및 기술 계약을 위해 시나리오 중심 회귀 적용 범위가 추가되었습니다. (홍보 [#612](https://github.com/Yeachan-Heo/oh-my-codex/pull/612) — @Yeachan-Heo, [#611](https://github.com/Yeachan-Heo/oh-my-codex/pull/611) 후속작)

### 결정된
- **리더 후속 조치, 감시자 유출 가시성 및 유휴/넛지 조정** — 작업자 전용 넛지의 용도를 변경하지 않고 팀 리더의 후속 조치가 강화되었습니다. 이벤트 모드 대기, 디스패치 중복 제거, 모든 작업자 유휴 및 리더 알림 흐름에 대한 더 강력한 회귀 적용 범위를 통해 감시자/디스패치 드레인 활성이 이제 런타임/상태 경로에서 더 명확하게 표시됩니다. (홍보 [#609](https://github.com/Yeachan-Heo/oh-my-codex/pull/609))
- **`team-ops` 게이트웨이 계약 회귀** — 이벤트 인식 대기 변경 후에도 엄격한 `team-ops` 계약이 안정적으로 유지되도록 실수로 `teamEventLogPath` 다시 내보내기를 제거했습니다. (홍보 [#610](https://github.com/Yeachan-Heo/oh-my-codex/pull/610))

## [0.8.5] - 2026-03-06

`v0.8.4..dev`의 비병합 커밋 7개. 기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@sjals93](https://github.com/sjals93).

### 추가됨
- **상태 인식 에이전트 라우팅** — 에이전트는 이제 역할, 추론 계층 및 운영 스타일을 구분하는 Sisyphus 스타일 상태 메타데이터(`frontier-orchestrator`, `deep-worker`, `fast-lane`)를 전달합니다. 기본 에이전트 구성에는 `## OMX Posture Overlay`, `## Model-Class Guidance` 및 `## OMX Agent Metadata` 섹션이 포함됩니다. (PR [#588](https://github.com/Yeachan-Heo/oh-my-codex/pull/588), [#592](https://github.com/Yeachan-Heo/oh-my-codex/pull/592) — @HaD0Yun)
- **관리자 섹션**이 @Yeachan-Heo 및 @HaD0Yun으로 README에 추가되었습니다.

### 결정된
- **Windows ESM 가져오기 충돌** — `bin/omx.js`은 이제 `import()` 이전의 `file://` URL로 절대 경로를 변환하여 Windows에서 `ERR_UNSUPPORTED_ESM_URL_SCHEME`을 수정합니다. (PR [#589](https://github.com/Yeachan-Heo/oh-my-codex/pull/589) — @sjals93, [#557](https://github.com/Yeachan-Heo/oh-my-codex/issues/557) 수정)
- **tmux 캡처 창 기록 플래그** — 잘못된 `-l` 플래그를 올바른 `-S` 음수 오프셋 형식으로 대체하여 `capture-pane`가 실제로 최근 출력을 반환하도록 합니다. (홍보 [#593](https://github.com/Yeachan-Heo/oh-my-codex/pull/593), [#591](https://github.com/Yeachan-Heo/oh-my-codex/issues/591) 수정)
- **레거시 모델 별칭 정리** — 15개의 프롬프트 파일 및 런타임 에이전트 메타데이터 생성에서 오래된 `gpt-5.3-codex` / `o3` 참조를 제거하여 상태 라우팅이 활성화될 때 혼란을 방지합니다. (PR [#592](https://github.com/Yeachan-Heo/oh-my-codex/pull/592)의 일부)

## [0.8.4] - 2026-03-06

`v0.8.3..dev`(비병합 커밋)에서 생성되고 `dev`에 대한 릴리스 유효성 검사가 수행됩니다.

### 변경됨
- 패키지 버전을 `0.8.4`로 변경했습니다.
- `omx setup`은(는) 이제 해당되는 경우 덮어쓴 파일의 백업을 보존하면서 기본적으로 관리형 OMX 아티팩트를 새로 고칩니다.

### 추가됨
- 관리형 아티팩트 교체, 범위 인식 업데이트 및 제거 호환성 경로에 대한 새로 고침 적용 범위를 설정합니다.

### 결정된
- 이제 관리형 Codex 모델 참조를 `gpt-5.3-codex`에서 `gpt-5.5`로 업그레이드하기 전에 설치 프로그램에서 메시지를 표시하여 새로 고침 중 예상치 못한 구성 이탈을 줄입니다.
- 구성 생성 및 설정 새로 고침 흐름은 반복 실행 및 범위 지정 설치 전반에 걸쳐 더 멱등성이 있고 탄력적입니다.

### 문서
- 새로운 새로 고침/업그레이드 동작을 문서화하기 위해 README의 설정 지침이 새로 고쳐졌습니다.

### CI/테스트
- 전체 제품군이 실행되는 동안 임시 디렉터리를 정리하기 전에 감시자가 종료될 때까지 기다리도록 알림 대체 감시자 스트리밍 테스트를 강화했습니다.
- `check:no-unused` 릴리스 게이트에 의해 포착된 사용되지 않은 설정 덮어쓰기 프롬프트 코드 경로를 제거했습니다.

## [0.8.3] - 2026-03-06

`dev`의 Gemini 작업자 핫픽스와 `dev`의 릴리스 검증 강화 및 확인에서 생성됩니다.

### 변경됨
- 패키지 버전을 `0.8.3`로 변경했습니다.

### 결정된
- 이제 팀 런타임은 stdin 전용 시작 동작(`#585`)에 의존하는 대신 신속한 대화형 실행(`--approval-mode yolo -i <inbox prompt>`)으로 Gemini 작업자를 시드합니다.
- 이제 Gemini 작업자는 명시적인 Gemini 모델이 요청되지 않는 한 Gemini가 아닌 기본 모델 패스스루를 삭제하여 잘못된 혼합 제공자 시작 인수(`#585`)를 방지합니다.
- Gemini 프롬프트 모드 작업자 시작 및 인수 변환(`#585`)을 위한 확장된 런타임 및 tmux 세션 적용 범위.

### CI/테스트
- 전체 제품군 실행 중 EOF-tail 동작을 주장하기 전에 감시자가 준비될 때까지 기다리도록 알림 대체 감시자 스트리밍 테스트를 강화했습니다.

## [0.8.2] - 2026-03-06

`v0.8.1..main`(비병합 커밋)에서 생성되고 `main`에 대한 릴리스 유효성 검사가 수행됩니다.

### 추가됨
- 혼합 CLI 맵 및 `--model` 패스스루(`#576`, `#579`, 관련 문제 `#573`)를 포함하여 OMX 팀 모드에 대한 Gemini CLI 작업자 지원.
- 기본 프론티어 모델 폴백은 이제 하드코딩된 참조(`#583`) 대신 `DEFAULT_FRONTIER_MODEL`(현재 `gpt-5.5`)을 통해 중앙 집중화됩니다.
- `configure-notifications`은 이제 문서(`#584`)와 일치하도록 카탈로그/설정 동작이 정렬된 표준 제공 알림 설정 기술입니다.

### 변경됨
- 패키지 버전을 `0.8.2`로 변경했습니다.
- 이제 설정/설치는 카탈로그 매니페스트를 더욱 엄격하게 따르며 `--force`은 오래된 배송/레거시 알림 기술 디렉터리(`#575`, `#580`, `#584`, `#574` 닫기)를 정리합니다.
- 확장된 OpenClaw 통합 문서 및 현지화된 탐색 링크(`#571`).

### 결정된
- `omx setup`은 이제 Codex CLI `>= 0.107.0`(`#572`, `#564` 수정)에 대해 더 이상 사용되지 않는 `[tui]` 섹션 작성을 건너뜁니다.
- OpenClaw 후크 명령 템플릿(`#581`, `#578` 닫기)에서 해결되지 않은 자리 표시자 누출을 방지했습니다.
- 직접 `/prompts:<name>` 호출(`#582`)에 대한 명시적 다중 기술 순서를 강화하고 암시적 키워드 자동 활성화를 차단했습니다.

### 문서
- 알림 기술 인벤토리/문서를 표준 `configure-notifications` 모델과 정렬하고 이전 릴리스 노트 가독성을 향상했습니다.

## [0.8.1] - 2026-03-05

`4141fd6..HEAD`(비병합 커밋)에서 생성되고 `dev`에 대한 릴리스 유효성 검사가 수행됩니다.

### 추가됨
- 레거시 `team_*` MCP 도구를 강력히 지원하지 않는 팀 CLI 상호 운용성 API(`omx team api ...`).
- CLI 우선 팀 상호 운용성/디스패치 신뢰성 흐름을 마무리했습니다.

### 변경됨
- 패키지 버전을 `0.8.1`로 변경했습니다.
- 통합된 `configure-notifications` 흐름으로 알림 설정을 리팩터링했습니다.
- CLI 우선 팀 프로토콜 + 상호 운용성 계약을 선호하도록 문서를 업데이트했습니다.

### 결정된
- CLI 우선 디스패치 정책을 시행하고 작동하지 않는 상태 서버 도우미를 제거했습니다.
- OpenClaw 명령 시간 초과는 이제 제한된 안전 제한으로 구성 가능합니다.

### CI / 테스트 / 문서
- 커버리지 게이팅을 위한 포괄적인 팀 API 상호 운용성 테스트가 추가되었습니다.
- README에 구성 알림 설정 지침을 추가했습니다.
- 토큰/명령 안전 지침 및 개발 런북이 포함된 확장된 OpenClaw 문서입니다.

## [0.8.0] - 2026-03-04

`v0.7.6..dev`(비병합 커밋)에서 생성되고 `dev`에 대한 릴리스 유효성 검사가 수행됩니다.

### 추가됨
- 새로운 정식 공급자 조언자 명령: `omx ask <claude|gemini> "<prompt>"`.
- 요구 사항 명확화를 위한 Ouroboros에서 영감을 받은 모호성 기반 심층 인터뷰 워크플로우(`$deep-interview`).
- 실행이 많은 흐름(자동 조종 장치, ralph, 팀, ralplan 및 심층 인터뷰 프리플라이트)에 필요한 사전 컨텍스트 유입 게이트입니다.
- URL 기반 웹사이트 복제 및 확인 루프를 위한 새로운 `$web-clone` 기술.
- 카탈로그에 내장된 `ask-claude` 및 `ask-gemini` 기술.
- 시각적 Ralph 반복을 위한 시각적 판정 피드백 루프를 지원합니다.

### 변경됨
- 패키지 버전을 `0.8.0`로 변경했습니다.
- `ask-claude` 및 `ask-gemini` 기술 지침은 이제 정식 `omx ask ...` 사용으로 라우팅됩니다.
- 이제 문서/CLI 구문 분석이 공급자 도움말 플래그(`claude --print|-p`, `gemini --prompt|-p`)와 명시적으로 정렬됩니다.
- 레거시 래퍼/npm 스크립트 진입점은 마이그레이션 힌트와 함께 전환 호환성 경로로 계속 사용할 수 있습니다.
- 팀 상태 파사드를 제한된 모듈로 리팩터링하고 정식 상태 루트 확인을 추출했습니다.
- `omx ralph --prd`, `--version` 라우팅 및 PRD 중심 도움말 지침에 대한 CLI 동작이 개선되었습니다.
- 강화된 런타임 품질/성능/동시성 경로(디스패치 폴링 백오프, 메모장 원자성, 확장 롤백, 종료 가드).

### 결정된
- 여러 보안 문제(셸 주입 벡터 교체 및 보안 강화 청소 포함)가 해결되었습니다.
- 기존 경로를 정상적으로 처리하기 위해 시작 작업 트리 재사용을 수정했습니다.
- 팀 청구 수명 주기 계약 시행(`releaseTaskClaim` 토큰 유효성 검사) 및 작업자 부트스트랩 수명 주기 문서를 수정했습니다.
- `writeAtomic` ENOENT 마스킹 동작 및 팀 리베이스/타입 확인 회귀를 수정했습니다.
- `omx doctor`의 온보딩 경고 문구 명확성을 수정했습니다.
- 팀/ralplan 기술 문서에 대한 사전 컨텍스트 게이트 텍스트가 누락된 문제를 수정했습니다.

### CI / 테스트 / 문서
- 핵심 검사를 위해 노드 `20/22` CI 매트릭스를 추가했습니다.
- 보고와 함께 필수 CI 린트 게이트 및 팀/상태 적용 범위 게이트를 추가했습니다.
- 유휴 넛지 분기/스로틀 동작 및 팀 운영 계약에 대한 확장 테스트입니다.
- 12개 언어 모두에 대한 다국어 README 번역을 완료했습니다.

## [0.7.6] - 2026-03-02

### 변경됨
- `0.7.5` 게시 후 패키지 버전이 `0.7.6`으로 변경되었습니다.

### 메모
- 연기 확인 증거를 포함하여 `docs/release-notes-0.7.6.md`에 준비된 자세한 릴리스 노트입니다.

## [0.7.5] - 2026-03-02

`main..dev`의 커밋 로그에서 엄격하게 생성됩니다.

- 커밋 창: **26개의 비병합 커밋**(`2026-02-28` ~ `2026-03-02`)
- 차이점 스냅샷(`main...dev`): **55개 파일이 변경됨, +4,437 / -242**
- 소스 명령:
  - `git rev-list --no-merges --count main..dev`
  - `git diff --shortstat main...dev`
  - `git log --no-merges --date=short --pretty=format:'%ad %h %s' --reverse main..dev`

### 추가됨(`feat(...)` 과목에서)
- `c235a5a` feat(팀): 전용 ralph 자동 실행 정리 정책 추가 (#407) (#412)
- `1653aa7` feat(team): 작업자 격리를 위한 전용 tmux 세션 모드 추가(#416)
- `7413fe3` feat(team): 작업자별 역할 라우팅 및 작업 분해 추가

### 변경됨/Docs/CI/리팩터링
- `0c68a02` 문서: 알림을 위한 OpenClaw 통합 가이드(#413)
- `56091a4` ci: 분기 보호를 위한 CI 상태 게이트 작업 추가(#423)
- `3f6b3fd` 리팩터링(mcp): omx_run_team_*을 전용 team-server.ts로 추출합니다(#431).
- `6c1c4eb` docs(changelog): 메인 개발에 대한 미공개 노트 업데이트

### 수정됨(`fix(...)` 과목에서)
- `8d3fef0` 수정(알림): 기본 OpenClaw 게이트웨이 지원 (#414) (#415)
- `383d79d` fix(tmux): 분리된 세션 시작을 위한 소스 셸 프로필(.zshrc/.bashrc)
- `d4f6803` 수정(팀): 전용 tmux 세션 모드 되돌리기, 분할 창 기본값 복원
- `576ec9c` fix(ralph): CLI 작업 설명에서 옵션 값 제외(#424)
- `6eed3c6` 수정(notify-hook): 시각적 결과 구문 분석/지속 실패에 대한 구조적 로깅 추가(#428)
- `b5dc657` 수정(팀): 팀/ralph 종료 및 재개 경로의 3개 회귀 수정(#430)
- `c3d1220` 수정(팀): 작업자 위치 힌트를 사용하여 전용 tmux 세션을 옵트인으로 전환합니다(#432).
- `454e69d` 수정(팀): 실패/취소된 실행에 대한 강제 정리, 작업 트리 롤백 대기, 죽은 작업자 창 새로 고침(#438)
- `c8632fa` 수정(팀): 알림 후크 디스패치 및 런타임 폴백의 리더 창 타겟팅 수정 (#433, #437) (#439)
- `587ec94` 수정(팀): 자동 크기 조정 창 정리 및 해제 강화
- `12dea24` 수정(팀): 확장 시 레이아웃 유지 및 회귀 테스트 추가
- `f5d47f4` 수정(tmux): 창이 셸로 돌아갈 때 주입 건너뛰기(#441) (#442)
- `cc64635` fix(tmux): 팀 창을 생성할 때 올바른 세션을 대상으로 합니다.
- `d33ecfc` 수정(팀): PR 검토에 표시된 사용되지 않은 기호 제거
- `f0cc833` fix(tmux): 범위 모드 상태가 누락된 경우 주입 복원
- `baeb8e7` 수정(기술): 시각적 평결 계약 및 랄프 시각적 루프 지침 복원
- `e0c5974` 수정(기술): OMX 정식 경로에 대한 분기된 OMC 참조를 정규화합니다.

### 되돌리기
- `ee72e1f` "수정(팀): 전용 tmux 세션을 작업자 위치 힌트를 사용하여 옵트인으로 전환(#432)" 되돌리기
- `a5f2b77` "수정(기술): 시각적 평결 계약 및 랄프 시각적 루프 지침 복원" 되돌리기

### 전체 `main..dev` 커밋 로그(`git log --reverse` 기록 순서, 엄격한 날짜 정렬 아님)
- `2026-02-28` `c235a5a` feat(team): 전용 ralph 자동 실행 정리 정책 추가 (#407) (#412)
- `2026-02-28` `8d3fef0` 수정(알림): 기본 OpenClaw 게이트웨이 지원 (#414) (#415)
- `2026-03-01` `1653aa7` feat(팀): 작업자 격리를 위한 전용 tmux 세션 모드 추가(#416)
- `2026-03-01` `0c68a02` 문서: 알림을 위한 OpenClaw 통합 가이드(#413)
- `2026-03-01` `383d79d` fix(tmux): 분리된 세션 시작을 위한 소스 셸 프로필(.zshrc/.bashrc)
- `2026-03-01` `d4f6803` 수정(팀): 전용 tmux 세션 모드 되돌리기, 분할 창 기본값 복원
- `2026-03-01` `56091a4` ci: 분기 보호를 위한 CI 상태 게이트 작업 추가(#423)
- `2026-03-01` `576ec9c` fix(ralph): CLI 작업 설명에서 옵션 값 제외(#424)
- `2026-03-01` `6eed3c6` 수정(notify-hook): 시각적 결과 구문 분석/지속 실패에 대한 구조적 로깅 추가(#428)
- `2026-03-01` `b5dc657` 수정(팀): 팀/랄프 종료 및 재개 경로의 3가지 회귀 수정(#430)
- `2026-03-01` `3f6b3fd` 리팩터링(mcp): omx_run_team_*을 전용 team-server.ts로 추출합니다(#431)
- `2026-03-01` `ee72e1f` "수정(팀): 작업자 위치 힌트를 사용하여 전용 tmux 세션을 옵트인으로 전환(#432)" 되돌리기
- `2026-03-02` `c3d1220` 수정(팀): 작업자 위치 힌트를 사용하여 전용 tmux 세션을 옵트인으로 전환합니다(#432)
- `2026-03-02` `454e69d` 수정(팀): 실패/취소된 실행에 대한 강제 정리, 작업 트리 롤백 대기, 죽은 작업자 창 새로 고침(#438)
- `2026-03-02` `c8632fa` 수정(팀): 알림 후크 디스패치 및 런타임 폴백의 리더 창 타겟팅 수정 (#433, #437) (#439)
- `2026-03-01` `587ec94` 수정(팀): 자동 크기 조정 창 정리 및 해제 강화
- `2026-03-02` `12dea24` 수정(팀): 확장 시 레이아웃 유지 및 회귀 테스트 추가
- `2026-03-02` `f5d47f4` 수정(tmux): 창이 셸로 돌아갈 때 주입 건너뛰기(#441) (#442)
- `2026-03-02` `7413fe3` feat(팀): 작업자별 역할 라우팅 및 작업 분해 추가
- `2026-03-02` `cc64635` 수정(tmux): 팀 창을 생성할 때 올바른 세션을 대상으로 합니다.
- `2026-03-02` `d33ecfc` 수정(팀): PR 검토에 표시된 사용되지 않은 기호 제거
- `2026-03-02` `f0cc833` fix(tmux): 범위 모드 상태가 누락된 경우 주입 복원
- `2026-03-02` `baeb8e7` 수정(기술): 시각적 평결 계약 및 랄프 시각적 루프 지침 복원
- `2026-03-02` `a5f2b77` "수정(기술): 시각적 판정 계약 및 랄프 시각적 루프 지침 복원" 되돌리기
- `2026-03-02` `6c1c4eb` docs(changelog): 메인 개발에 대한 미공개 노트 업데이트
- `2026-03-02` `e0c5974` 수정(기술): OMX 정식 경로에 대한 분기된 OMC 참조를 정규화합니다.

## [0.7.3] - 2026-02-28

55개의 파일이 변경되었습니다. 파이프라인 오케스트레이터, 제거 명령, 팀 디스패치 강화 및 구성 멱등성.

### 추가됨
- 단계 기반 실행(ralph-verify, ralplan, team-exec)을 갖춘 구성 가능한 파이프라인 오케스트레이터(#398)
- `--dry-run`, `--keep-config`, `--purge` 및 `--scope` 옵션이 포함된 `omx uninstall` 명령(#389)
- Openclaw 디스패처는 원래 채널 컨텍스트를 웹훅 후크에 전달합니다(#387).

### 결정된
- CLI 하위 명령 `--help` 플래그는 이제 명령을 실행하는 대신 도움말 텍스트를 표시합니다(#404).
- Claude와 Codex 작업자 간의 팀 유휴/디스패치 감지 패리티(#402).
- 팀 디스패치 잠금 시간 초과 및 바이너리 경로 불일치가 해결되었습니다(#401).
- 롤백하는 대신 Codex 신뢰 프롬프트에서 팀 파견을 다시 시도합니다(#395).
- 알림으로 표시하기 전에 팀 파견 초안 소비가 확인되었습니다(#392).
- 구성 생성기는 반복되는 `omx setup`(#386)에서 중복 OMX 블록을 방지합니다.
- 팀 운영자 문서는 이제 Claude-pane Enter(`C-m`)가 통화 중일 때 대기열에 들어갈 수 있음을 명확히 하고 `$team`에 대한 상태 우선/안전 수동 개입 지침을 문서화합니다.

### 변경됨
- Ultrapilot, 파이프라인 및 에코모드 모드는 더 이상 사용되지 않습니다(#399).
- 상태 서버에서 사용되지 않은 `DEPRECATED_MODE_MAP`을(를) 제거했습니다.
- 파이프라인 테스트 상태 파일 경로가 업데이트되고 카탈로그가 다시 생성되었습니다.
- README에 CLI 참조, 알림 및 워크플로에 대한 링크가 추가되었습니다.

## [0.7.2] - 2026-02-26

핫픽스: 팀 종료 `--force` 플래그가 CLI 인수에서 구문 분석되지 않았습니다.

### 결정된
- 이제 팀 종료 `--force` 플래그가 `false`(`src/cli/team.ts`)로 하드코딩되는 대신 CLI 인수에서 올바르게 구문 분석됩니다.
- 강제 우회가 사용될 때 `shutdown_gate_forced` 감사 이벤트를 추가하여 이벤트 로그의 관찰 가능성 격차를 줄였습니다.

### 변경됨
- `[--force]` 옵션을 문서화하기 위해 사용 문자열을 업데이트했습니다: `omx team shutdown <team-name> [--force]`.
- `shutdown_gate_forced`을 `TeamEventType` 공용체 및 `TEAM_EVENT_TYPES` 상수에 추가했습니다.

## [0.7.1] - 2026-02-26

4개의 파일이 변경되었습니다. 팀 파견 안정성 개선 — 후크 우선 폴백을 통한 상태 우선 라우팅.

### 변경됨
- 팀 디스패치가 상태 우선 및 후크 우선 방식으로 다시 작성되어 리더 창 대상 지정이 다양할 때 안정성이 향상되었습니다(#379).
- 리더 사서함 배달은 일관된 메시지 라우팅을 위해 후크 우선 디스패치 경로를 사용합니다(#378).

### 결정된
- 실제 창 대상만 대상으로 보호되는 리더 폴백 패리티는 오래되거나 누락된 창으로의 디스패치를 ​​방지합니다(#379).
- 추가 오류 보호 및 폴백 시퀀싱(#378)을 통해 후크 디스패치 신뢰성 경로가 강화되었습니다.

## [0.7.0] - 2026-02-26

153개 파일이 변경되었습니다. +12,852 / -1,044줄. 주요 기능 추가, 포괄적인 감사 수정, 강화된 안정성.

### 추가됨

#### 팀 및 확장
- 동적 팀 작업자 확장 — 1단계 수동 `scale_up` / `scale_down` 세션 중간(#363).
- 작업자별 유휴 알림이 리더 창으로 전달됩니다(#335).
- 대화형 팀 워크플로를 위한 프롬프트 모드 작업자 실행 전송(#264)
- 작업자 모델 기본값은 `OMX_TEAM_WORKER_CLI_MAP`(#263)을 사용하여 구성에서 확인되었습니다.
- 작업자 하드 캡이 20(#343)으로 증가했습니다.
- 조기 해체를 방지하기 위해 해결되지 않은 작업에 대해 팀 종료를 제한합니다(#320, #322).
- MSYS2 / Git Bash tmux 작업자 지원(#266).
- 공유 유형 정의(#319, #323)를 위한 중앙 집중식 팀/상태 계약 모듈(`contracts.ts`).

#### 기획 및 실행
- 합의 계획을 위한 RALPLAN-DR 구조화된 심의 — 기획자 + 설계자 + 비평가 루프(#366).
- Ralplan 우선 실행 게이트 시행: ralph는 `prd-*.md` 및 `test-spec-*.md`이 존재할 때까지 구현을 차단합니다(#261).
- 전용 테스트 스위트를 사용한 사전 실행 범위 지정 지침을 위한 작업 크기 감지기(`task-size-detector.ts`).
- 31개 키워드 트리거 모두에 대한 표준 단일 정보 소스인 키워드 트리거 레지스트리(`keyword-registry.ts`).

#### 알림
- OMC 4.5.x(#373)의 전체 알림 엔진 점검: 템플릿 엔진, 유휴 휴지, 후크 구성 유형, 세션 레지스트리.
- `buildConfigFromEnv()`을 통한 Slack / Discord / Telegram env-var 구성.
- 비활성화된 채널에 대한 응답 수신기 채널별 게이팅 및 자격 증명 격리.
- 자동 계속을 위한 알림 후크의 스킬 활성 수명 주기 추적(#262)
- 라틴어가 아닌 사용자 입력에 대한 언어 알림 삽입(#260)

#### 오픈클로
- 후크 이벤트 시 외부 자동화 및 AI 에이전트를 깨우기 위한 OpenClaw 게이트웨이 통합(`src/openclaw/`) — 구성, 디스패처 및 전체 테스트 제품군.

#### CLI 및 설정
- 테스트 적용 범위를 포함한 프롬프트 관리를 위한 Star-prompt CLI 명령(`star-prompt.ts`).
- 3개 범위에서 2개(사용자, 프로젝트)로 설정이 단순화되었습니다(#245).
- 기존 AGENTS.md(#242)를 덮어쓰기 전에 설치 메시지가 표시됩니다.
- 에이전트 및 기술 설치 모두에 대해 `--force` 덮어쓰기 제어를 설정합니다(#275).
- 작업 트리 시작을 위한 tmux 세션 이름에 Repo 이름이 포함됩니다(#360, #362).

#### MCP 및 코드 인텔리전스
- 자동 시작 가드(#317)가 있는 MCP 부트스트랩 모듈(`bootstrap.ts`).
- 프로젝트 메모리 쓰기를 위한 메모리 유효성 검사 계층(`memory-validation.ts`)입니다.
- `includeDeclaration`은(는) `lsp_find_references`(#299, #327)에서 선정되었습니다.

#### HUD
- 중복된 쓰기를 방지하기 위해 HUD 시계 렌더링 직렬화(#274).
- 집중된 사전 설정의 할당량 렌더링(5시간 및 주간 제한 비율)
- 세션 기간 렌더링(초/분/시간 형식)
- hudNotify 턴 타임스탬프의 마지막 활동 렌더링.

#### 하부 구조
- `tsconfig.no-unused.json` — 사용되지 않은 기호 CI 게이트(#312, #333)에 대한 전용 구성입니다.
- 종료 시 아카이브 및 오버레이 스트립이 포함된 세션 수명 주기 후크.
- 주요 생산 모듈(#321, #324)에 대한 직접 지원.
- 확장성 디스패처 및 로더에 대한 전용 후크 적용 범위(#316)

### 변경됨
- `KEYWORD_TRIGGER_DEFINITIONS`에서 파생된 `KEYWORD_TRIGGERS` — 템플릿과 런타임 레지스트리가 항상 동기화되어 드리프트를 제거합니다.
- 자연어에 대한 잘못된 트리거를 방지하기 위해 의도 인식 매칭으로 팀/군집 키워드 감지가 강화되었습니다(#292, #356).
- Ralph 계약은 수명 주기 불변성과 정수 카운터를 적용합니다(#355).
- 직접 상태 작성자에서 Ralph 계약 유효성 검사가 시행됩니다(#296, #353).
- 상태 쓰기는 원자성이며 파일 잠금(#354)을 통해 직렬화됩니다.
- 알림 후크에 최대 반복 종료가 적용됩니다(#345).
- 별칭/병합된 카탈로그 항목(#318, #344)에 대해 시행되는 정식 대상입니다.
- 의사 진단은 원인이 없는 tmux 고아 경고를 다운그레이드합니다(#277).
- HUD 지연 조정 폴백이 10초에서 2초로 감소했습니다.
- 사용하지 않는 HUD 색상 도우미 내보내기를 제거했습니다(#280).
- CLI 진입점(#283)에서 데드 TS 대체 경로가 제거되었습니다.
- 생산 데드 코드를 제거하고 사용하지 않는 기호 CI 게이트(#312, #333)를 추가했습니다.
- `packageRoot`은 `require()`(#310, #330) 없이 ESM 안전을 보장합니다.
- Tmux 후크 엔진 유형 선언은 런타임 내보내기와 동기화됩니다(#313, #328).

### 결정된
- **CI**: 해결된 유형 검사(6개의 미사용 가져오기) 및 7개의 테스트 실패 — HUD NaN/향후 타임스탬프 처리, 상태 모드 유효성 검사, Slack 구성 `deepStrictEqual`, 키워드 템플릿-레지스트리 동기화.
- **팀**: 결정적 프롬프트 작업자 해체(#349). 런타임 완료 게이트(#298, #351)에 연결된 확인 프로토콜입니다. 거짓 프롬프트 모드 재개 준비가 방지되었습니다(#352). 크기 조정 후크 등록 취소에 실패하면 종료가 계속됩니다(#302, #347). 명시적인 상태 루트를 위한 팀 경로 가드입니다.
- **Ralph**: 잘못된 상태에서 배타적 잠금 검사가 실패합니다(#357). 직접 상태 작성기에 수명 주기 불변이 적용됩니다(#296, #353).
- **알림**: 응답 구성은 활성화된 채널을 확인하고 적용합니다(#281, #287). 알리미 HTTP 상태 및 시간 초과 확인이 시행되었습니다(#286). Slack 구성은 정의되지 않은 경우 `mention` 속성을 생략합니다.
- **후크**: 플러그인 디스패치 시간 초과 해결이 보장됩니다(#269). 상위 후크 플러그인 가져오기 검증이 올바르게 건너뛰었습니다(#268). 스킬 스위치 시 키워드 활성화 타임스탬프가 재설정됩니다(#290).
- **설정**: `--force`(#275)이 아니면 스킬 덮어쓰기를 건너뜁니다.
- **코드 인텔리전스**: `dryRun=false`(#295, #358)일 때 AST-grep 재작성이 적용됩니다.
- **코드 단순화**: 선택 항목에 포함된 추적되지 않은 파일(#308). `trim()` 및 `homedir()`의 CI 테스트 실패가 해결되었습니다.
- **MCP**: 메모장 `daysOld` 경계가 검증되었습니다(#309, #334).
- **구성**: `mergeConfig`(#307, #337)에서 이스케이프된 Windows MCP 서버 경로.
- **세션**: 오래된 감지의 PID 재사용 오탐 문제가 수정되었습니다(#338).
- **추적**: 대규모 JSONL 기록의 메모리 사용량이 수정되었습니다(#336).
- **Tmux**: 부호 있는 32비트 범위(#240, #241)로 고정된 후크 인덱스입니다. macOS에서 HUD 크기 조정 소음이 조용해졌습니다. 서명된 32비트 후크 해시 강제 적용(#265)
- **기타**: 수명 주기 최선의 실패 경고가 표시되었습니다(#315, #346). 상속된 팀 환경에서 격리된 Notify-hook 교차 작업 트리 테스트입니다.

### 보안
- 유효성 검사 및 허용 목록 정책(#289)을 통해 MCP `workingDirectory` 처리가 강화되었습니다.
- 모드 허용 목록 적용을 통해 상태 및 팀 도구 호출에 대한 경로 탐색 방지.
- 터미널 이스케이프 주입을 방지하기 위해 HUD 동적 텍스트를 삭제했습니다(#271).

### 테스트
- 308개 제품군에 대한 1,472개의 테스트 — 모두 통과되었습니다.
- 새로운 테스트 스위트: `scaling.test.ts`, `task-size-detector.test.ts`, `session.test.ts`, `consensus-execution-handoff.test.ts`, `notify-hook-worker-idle.test.ts`, `template-engine.test.ts`, `hook-config.test.ts`, `idle-cooldown.test.ts`, `reply-config.test.ts`, `path-traversal.test.ts`, `memory-server.test.ts`, `memory-validation.test.ts`, `bootstrap.test.ts`, `code-intel-server.test.ts`, `openclaw/*.test.ts`, `star-prompt.test.ts`, `setup-agents-overwrite.test.ts`, `setup-skills-overwrite.test.ts`, `error-handling-warnings.test.ts`, `catalog-contract.test.ts`.
- 코드 단순화 후크 적용 범위가 결정적으로 만들어졌습니다(#311, #348).
- CI의 Ralph 지속성 게이트 검증 매트릭스.

## [0.6.4] - 2026-02-24

### 결정된
- 이제 Team Claude 작업자 시작이 `--dangerously-skip-permissions`을 사용하여 명시적으로 시작되어 tmux 팀 실행 중에 대화형 권한 프롬프트가 표시되지 않습니다.

### 테스트
- Claude 실행 인수가 올바르게 번역되고 Codex 전용 플래그가 전달되지 않도록 작업자 CLI 재정의 경로에 대한 회귀 적용 범위가 추가되었습니다.

## [0.6.3] - 2026-02-24

### 추가됨
- 분리 실행 초기 창 레이아웃 조정을 위한 클라이언트 연결 HUD 조정 후크입니다.

### 결정된
- tmux 창이 표류할 때 경합 상태를 방지하기 위해 분리된 세션 크기 조정 후크 흐름을 강화했습니다.
- 연결/분리 주기 전반에 걸쳐 일관된 창 구성을 위해 HUD/팀 크기 조정 조정이 강화되었습니다.
- 더 빠른 레이아웃 수정을 위해 HUD 지연 조정 폴백을 10초에서 2초로 줄였습니다.
- 이제 클라이언트 연결 후크가 추적되어 롤백 중에 올바르게 등록 해제됩니다.

### 테스트
- 경로 크기 조정/조정을 위한 tmux 세션 및 CLI 시퀀스 테스트가 추가되었습니다.

## [0.6.2] - 2026-02-24

### 결정된
- 이제 Team Claude 작업자 실행은 삽입된 실행 인수 없이 일반 `claude`을 사용하므로 로컬 `settings.json`은 여전히 ​​신뢰할 수 있습니다.
- 팀 시작 해결 로깅은 이제 Claude를 인식합니다. Claude 경로는 `model=claude source=local-settings`을 보고하고 `thinking_level`을 생략합니다.

### 변경됨
- 일반 Claude 실행 의미 체계를 반영하기 위해 README 및 `skills/team/SKILL.md`의 팀 작업자 CLI 동작에 대한 문서를 명확히 했습니다.
- Claude no-args 실행 동작을 시행하면서 Codex 추론 동작을 유지하기 위해 회귀 적용 범위를 추가했습니다.

## [0.6.1] - 2026-02-23

### 추가됨
- 혼합된 Codex/Claude 팀원 및 안정성 업데이트에 대한 주요 내용을 포함하는 새로운 "0.6.0의 새로운 기능" 섹션을 문서 사이트 홈페이지에 추가했습니다.

### 변경됨
- `N:agent-type`이 작업자 역할 프롬프트(CLI 선택 아님)를 선택한다는 `skills/team/SKILL.md` 문서를 명확히 하고 Claude 팀원을 시작하기 위한 `OMX_TEAM_WORKER_CLI` / `OMX_TEAM_WORKER_CLI_MAP` 사용법을 문서화했습니다.

## [0.6.0] - 2026-02-23

### 추가됨
- `OMX_TEAM_WORKER_CLI_MAP`을 통한 혼합 팀 작업자 CLI 라우팅으로 단일 `$team` 실행으로 Codex 및 Claude 작업자를 함께 시작할 수 있습니다(예: `codex,codex,claude,claude`).
- Claude 팀에 대한 리더 측 모든 작업자 유휴 넛지 폴백을 통해 작업자 측 Codex 후크를 사용할 수 없는 경우에도 리더 알림이 계속 발생합니다.
- 적응형 트리거는 재시도 가드 도우미 및 테스트를 제출하여 거짓 긍정 재전송 에스컬레이션을 줄입니다.

### 변경됨
- 이제 팀 트리거 폴백은 적응형 재전송 전에 더 안전한 준비 프롬프트 + 비활성 작업 게이트를 사용합니다.
- 적응형 재시도 폴백 동작은 이제 자동 모드에서 인터럽트 에스컬레이션 대신 라인 지우기 + 재전송을 사용합니다.

### 결정된
- 이제 사전 할당된 작업자 작업을 `pending` 상태에서 할당된 소유자가 청구할 수 있어 Codex 작업자 부트스트랩 청구 흐름이 차단 해제됩니다.
- `OMX_TEAM_WORKER_CLI_MAP` 구문 분석은 이제 빈 항목을 거부하고 지도별 유효성 검사 오류를 보고합니다.
- `OMX_TEAM_WORKER_CLI_MAP=auto`은 이제 실행 인수/모델 감지에서 확인되며 더 이상 `OMX_TEAM_WORKER_CLI` 재정의를 예기치 않게 상속하지 않습니다.
- 팀 리더 넛지 타겟팅은 이제 `leader_pane_id`의 우선순위를 지정하여 혼합/Claude 작업자 설정으로 안정성을 향상합니다.

## [0.5.1] - 2026-02-23

### 추가됨
- **팀 모드를 위한 기본 작업 트리 오케스트레이션**: 이제 작업자는 표준 상태 루트 메타데이터를 사용하여 git 작업 트리에서 실행되어 병렬 팀 작업 스트림에 대한 진정한 격리가 가능해집니다.
- **작업 트리 간 팀 상태 해결**: MCP 상태 도구 및 알림 후크는 작업 트리 전체에서 팀 상태를 확인하므로 리더는 작업자가 실행 중인 작업 트리에 관계없이 항상 올바른 공유 상태를 볼 수 있습니다.
- **`omx ralph` CLI 하위 명령**: `omx ralph "<task>"`은 명령줄에서 직접 ralph 지속성 루프를 시작하므로 세션 내에서 기술을 수동으로 호출할 필요가 없습니다(#153 종료).
- **정식 지속성 마이그레이션을 사용하는 범위가 지정된 ralph 상태**: Ralph 상태는 이제 세션/작업 트리별로 범위가 지정되고 레거시 단순 경로에서 표준 `.omx/state/sessions/` 레이아웃으로 자동으로 마이그레이션됩니다.
- **MCP 상호 운용성을 위한 클레임 안전 팀 전환 도구**: 새로운 `team_transition_task` MCP 도구는 클레임 ​​토큰 확인을 통해 원자적으로 상태 전환을 적용하여 동시 작업자 간의 경합 상태를 방지합니다.
- **알림 전 tmux 창 출력 정리**: 알림 통합으로 전송되기 전에 알림 콘텐츠가 삭제되어(ANSI 이스케이프, tmux 아티팩트 제거) 잘못된 메시지가 제거됩니다.
- **시작 코드베이스 맵 삽입 후크**: 세션 시작은 가벼운 파일 트리 스냅샷을 에이전트 컨텍스트에 삽입하므로 작업자는 추가 탐색 전환 없이 프로젝트에 대한 구조적 인식을 가질 수 있습니다(#136 닫기).

### 변경됨
- **`notify-hook.js` 계층화된 하위 모듈로 리팩터링됨**: 모놀리식 후크 스크립트는 유지관리 용이성과 쉬운 확장을 위해 집중 모듈(이벤트 라우팅, tmux 통합, 알림 발송)로 분할됩니다(#177 닫기).
- **`ralplan`은 기본적으로 비대화형 합의 모드로 설정됨**: 기본적으로 대화형 프롬프트를 위해 계획 루프가 더 이상 일시 중지되지 않습니다. `--interactive`을 전달하여 프롬프트 게이트 흐름을 복원합니다(#144 닫기).
- **제거된 `/research` 스킬**: `$research` 스킬이 완전히 제거되었습니다. 데이터/분석 작업에는 `$scientist`를 사용하고 웹 검색에는 `$external-context`을 사용하세요(#148 닫기).

### 결정된

#### 보안
- **`capturePaneContent`**의 명령 주입은 문자열 셸 보간에서 안전한 인수 배열로 전환하여 방지됩니다(#156 닫기).
- **알림자에 명령 삽입** `exec` 문자열 보간을 `execFile` + args 배열로 대체하여 수정되었습니다(#157 닫기).
- **Stale/reused PID risk in reply-listener**: The process-kill path now verifies process identity before sending signals, preventing an unrelated process from being killed if a PID is recycled (closes #158).
- **MCP 상태/팀 도구 식별자의 경로 탐색**: `../` 이스케이프가 파일 시스템에 도달하는 것을 방지하기 위해 도구 입력이 검증되고 정규화됩니다(#159 닫기).
- **추적되지 않은 파일은 코드베이스 맵에서 제외** 의도하지 않은 파일이 에이전트 컨텍스트로 실수로 파일 이름이 유출되는 것을 방지합니다.

#### 팀/클레임 수명 주기
- 작업 전환 및 릴리스 흐름에서 클레임 임대 만료가 적용됩니다. 만료된 클레임은 상태 변경이 발생하기 전에 거부됩니다(#176 종료).
- `monitorTeam`에서 중복된 `task_completed` 이벤트가 제거되었습니다. 이벤트는 소스에서 중복 제거됩니다(#161 종료).
- `claimTask`은 누락된 작업 ID에 대해 `task_not_found`(일반 오류 아님)을 반환하여 작업자 오류 처리를 개선합니다(#167 종료).
- 이미 완료되었거나 이미 실패한 작업에 대한 청구는 사전에 거부됩니다(#160 종료).
- 고스트 작업자 ID(더 이상 존재하지 않는 작업자)는 `claimTask`에서 거부됩니다(#179 종료).
- 터미널 → `transitionTaskStatus`의 비 터미널 상태 회귀가 차단됩니다. 작업이 `completed`/`failed`에 도달하면 해당 상태를 해제할 수 없습니다.
- 요청에서 `expected_version`이 생략되면 진행 중인 청구 인계가 방지됩니다(#173 종료).
- `releaseTaskClaim`은 더 이상 터미널 작업을 다시 열지 않습니다. 완료/실패한 작업에 대한 릴리스는 작동하지 않습니다(#174 닫기).
- 이제 작업 실패 시 오해의 소지가 있는 `worker_stopped` 이벤트 대신 `task_failed` 이벤트가 발생합니다(#171 종료).
- `team_update_task`은 유효한 클레임 토큰 없이 도착하는 수명 주기 필드 변형(`status`, `claimed_by`)을 거부합니다(#172 닫기).
- `updateTask` 부분/손상된 작업 객체가 지속되는 것을 방지하기 위해 페이로드 유효성 검사가 추가되었습니다(#163 종료).
- `team_leader_nudge`이 `team_append_event` MCP 스키마 열거형에 추가되어 Nudge 이벤트가 스키마 유효성 검사를 통과합니다(#175 닫기).
- `getTeamTmuxSessions`에서 일관되게 사용되는 정식 세션 이름(#170 닫기)

#### 워크트리/CLI
- `--worktree <name>` 공백으로 구분된 인수 형식이 이제 올바르게 사용됩니다. 이전에는 지점 이름이 자동으로 삭제되었습니다(#203 닫기).
- Codex CLI 구문 분석 오류를 일으키는 중복 플래그를 방지하기 위해 작업자 argv에서 고아 `--model` 플래그가 삭제되었습니다(#162 종료).
- `spawnSync` 절전 모드가 `Atomics.wait`로 대체되므로 `sleep` 바이너리가 없는 경우에도 타이밍 지연이 안정적으로 작동합니다(#164 닫기).

#### 후크/tmux
- `xhigh`/`madmax` tmux 세션에서 복사 모드 스크롤 및 클립보드 복사가 다시 활성화되었습니다(#206 종료).
- 리팩터링을 실수로 제거한 후 `notify-hook.js`에서 복원된 씬 오케스트레이터입니다(#205 닫기).

#### 종속성
- 전이적 취약성 권고를 해결하기 위해 npm `overrides`을 통해 `ajv`을 `>=8.18.0`에 고정하고 `hono`을 `>=4.11.10`에 고정했습니다.

### 성능
- `listTasks` 파일은 `Promise.all`과 병렬로 읽혀 작업이 많은 팀의 작업 목록 대기 시간을 줄입니다(#168 닫기).

## [0.5.0] - 2026-02-21

### 추가됨
- 메인라인 병합 후 프롬프트/스킬 카탈로그와 강화된 팀 런타임 계약을 통합했습니다(PR #137).
- 지속적인 범위 동작을 사용하여 설정 범위 인식 설치 모드(`user`, `project`)를 추가했습니다.
- 팀 작업자가 리더 모델을 강제하지 않고도 `gpt-5.3-codex-spark`을 사용할 수 있도록 `--spark` / `--madmax-spark`을 통한 Spark 작업자 라우팅이 추가되었습니다.
- CCNotifier 출력 제어를 위한 알리미 상세 수준을 추가했습니다.

### 변경됨
- 통합 카탈로그 및 현재 지원되는 프롬프트/스킬 화면과 일치하도록 설정 및 문서 참조가 업데이트되었습니다.

### 결정된
- 창 타겟팅 및 입력 제출 안정성을 포함하여 강화된 tmux 런타임 동작입니다.
- 강화된 tmux 창 캡처 입력 처리(검토 후 수정)
- 제거된 `scientist` 프롬프트 및 `pipeline` 스킬에 대한 오래된 참조를 제거했습니다(검토 후 수정).

### 제거됨
- 더 이상 사용되지 않는 프롬프트 제거: `deep-executor`, `scientist`.
- 더 이상 사용되지 않는 기술 제거: `deepinit`, `learn-about-omx`, `learner`, `pipeline`, `project-session-manager`, `psm`, `release`, `ultrapilot`, `writer-memory`.

## [0.4.4] - 2026-02-19

### 추가됨
- 자동 리팩토링을 위해 코드 단순화 중지 후크를 추가했습니다.
- OMX 에이전트를 Codex 기본 다중 에이전트 에이전트 역할로 등록했습니다.

### 결정된
- 런타임 테스트를 통해 팀 모드 알림 스팸을 수정했습니다.
- 생성된 구성에서 더 이상 사용되지 않는 `collab` 플래그를 제거했습니다.
- tmux 세션 이름 처리가 수정되었습니다.

## [0.4.2] - 2026-02-18

### 추가됨
- 집중된 마지막 줄 핫존을 통해 더 광범위한 자동 넛지 지연 감지 패턴(예: "다음에 할 수 있어", "가자", "계속 운전")을 추가했습니다.
- 모든 작업자가 유휴/완료되면 팀 리더에게 경고를 보낼 수 있도록 작업자-유휴 집계 알림이 추가되었습니다(휴지 및 이벤트 로깅 포함).
- 팀 세션에 대한 자동 tmux 마우스 스크롤을 추가했습니다(`OMX_TEAM_MOUSE=0`을 통해 선택 해제).

### 결정된
- 제출 키 라운드 전과 도중에 확정/지연 시간을 추가하여 작업자 메시지 제출 신뢰성을 수정했습니다.
- `bin/omx.js`에서 `main(...)`을 기다려 `/exit`이 완전히 종료되도록 CLI 종료 동작을 수정했습니다.
- 생성기 논리, 문서 및 테스트 전체에서 더 이상 사용되지 않는 `collab` 기능 참조를 `multi_agent`로 대체했습니다.

### 테스트
- `all workers idle` 알림 후크 동작에 대한 적용 범위가 추가되고 자동 너지 패턴 테스트가 확장되었습니다.
- 후크 확장성 런타임, HUD 렌더링/유형/색상, 검증자 및 유틸리티 도우미를 위한 새로운 유닛 제품군을 추가했습니다.
- tmux 마우스 모드 활성화 동작에 대한 테스트가 추가되었습니다.

## [0.4.0] - 2026-02-17

### 추가됨
- CLI 통합을 통해 후크 확장성 런타임이 추가되었습니다.
- 후크 확장에 대한 예제 이벤트 테스트 적용 범위가 추가되었습니다.

### 결정된
- 코드베이스 전체에서 `C-m`에 대한 표준화된 tmux `send-keys` 제출.

## [0.3.9] - 2026-02-15

### 변경됨
- 제거된 `/oh-my-codex:start-work` 명령 대신 실행 가능한 `$ralph` / `$team` 명령을 사용하도록 플래너 핸드오프 지침을 업데이트했습니다.
- 팀 범위의 `worker-agents.md` 구성(프로젝트 `AGENTS.md` 변형 없음)을 설명하기 위해 팀 기술 문서를 업데이트했습니다.

### 결정된
- 리더 구성 방해를 방지하기 위해 팀 시작 롤백/종료 중에 기존 `OMX_MODEL_INSTRUCTIONS_FILE` 값을 보존하고 복원했습니다.

## [0.3.8] - 2026-02-15

### 결정된
- tmux 외부에서 실행될 때 `omx`이 tmux 세션을 시작하지 않는 문제를 수정했습니다(0.3.7의 회귀).

## [0.3.7] - 2026-02-15

### 추가됨
- `docs/guidance-schema.md`의 AGENTS 표면에 대한 지침 스키마 문서를 추가했습니다.
- 작업자/런타임 AGENTS 마커 상호작용을 위한 더욱 강력한 오버레이 안전 적용 범위를 추가했습니다.
- 세션 범위 동작에 대한 더 넓은 후크 및 작업자 부트스트랩 테스트 적용 범위를 추가했습니다.

### 변경됨
- 복잡도가 낮은 팀 작업자의 기본값은 `gpt-5.3-codex-spark`입니다.
- 세션 범위 `model_instructions_file` 처리를 위한 `omx` CLI 동작이 개선되었습니다.
- 강화된 작업자 부트스트랩/오케스트레이터 지침 흐름 및 실행기 신속한 마이그레이션.
- tmux 워크플로에서 HUD 창 중복 제거 및 `--help` 실행 동작이 개선되었습니다.

### 결정된
- HUD 상태 테스트를 위해 git이 아닌 디렉토리에서 시끄러운 git-branch 감지 동작을 수정했습니다.
- 겹치는 PR 분기를 `dev`에 보수적으로 통합하여 병합 순서 위험을 수정했습니다.

## [0.2.2] - 2026-02-13

### 추가됨
- 복구/대체 동작에 대한 창 표준 tmux 후크 라우팅 테스트를 추가했습니다.
- 캡처 모드 tmux 창 메타데이터에 공유 모드 런타임 컨텍스트 래퍼를 추가했습니다.
- `omx-<directory>-<branch>-<sessionid>` 형식의 tmux 세션 이름 생성을 추가했습니다.

### 변경됨
- 레거시 세션 대상에서 마이그레이션하여 tmux 후크 대상을 창 표준 동작으로 전환했습니다.
- `C-m` 및 `Enter` 제출 키를 모두 전송하여 tmux 키 삽입 안정성이 향상되었습니다.
- 레거시 세션 가시성을 통해 창 추적에 초점을 맞추도록 `tmux-hook` CLI 상태 출력을 업데이트했습니다.
- 패키지 버전을 `0.2.2`로 변경했습니다.
