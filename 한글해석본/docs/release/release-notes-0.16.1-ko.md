# 릴리스 노트 — 0.16.1

## 요약

`0.16.1`은(는) 광범위한 `0.16.0` 이후 강화 릴리스입니다. `omx explore` 안전성 및 제한된 실행, 세션 범위 런타임 권한, team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 승인 핸드오프 복구 경로, Codex 목표 모드 내구성, 플러그인/캐시 동작, 기본 실행 이식성, CI 신뢰성 및 릴리스 설치 증명을 개선합니다.

이 릴리스는 `v0.16.0..v0.16.1`에서 구축되었으며 25개의 병합된 PR과 로컬 빠른 경로 탐색 및 CI 종속성 설치를 위한 최종 릴리스-검토 차단 수정 사항이 포함되어 있습니다.

## 하이라이트

- **탐색 안전 및 제한된 실행** — Codex 지원 탐색 실행은 의미론적 폴백 전에 제한되고, 프로세스 스톰은 호스트 OOM 전에 제한되고, 심볼릭 링크된 로컬 빠른 경로 파일 읽기는 더 이상 저장소 외부로 누출되지 않으며, 크기가 큰 로컬 텍스트 검색 읽기는 제한된 처리로 대체됩니다.
- **런타임/세션 권한** — 세션 범위 런타임 상태는 이제 활성 권한이고 오래된 루트 스킬(Skill) 활성/HUD 상태는 터미널 워크플로 후에 정리되며 프로젝트 범위 Codex 목표 상태는 지속성을 유지합니다.
- **team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 승인-핸드오프 강화** — 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 실행은 모호한 바인딩, 바인딩 전송, 선택된 핸드오프, 유효하지 않은 컨텍스트 팩 진단, 준비되지 않은 복구 전용 동작, DAG 폴백 상태 및 읽기 전용 컨텍스트 팩 상태 가시성을 유지합니다.
- **목표 모드 및 인터뷰 흐름** — 계획 핸드오프는 목표 모드 후속 조치로 코디네이션(Coordination)되고 차단된 `ultragoal` Codex 목표 핸드오프는 처리되며 심층 인터뷰 라우팅(Routing)은 사실과 판단을 분리합니다.
- **플러그인, 실행 및 플랫폼 수정** — 플러그인 MCP 실행 동작이 더 명확해지고, 플러그인 기술 캐시 새로 고침이 작동하고, 관리형 도우미가 현재 JS 런타임을 사용하고, Windows OMX 루트 실행 경로가 수정되고, Darwin 실행 대체 작업 트리 어설션이 경로 안정적이며, 일회용 실행 작업 트리 상태가 내구성을 유지합니다.
- **CI 및 릴리스 무결성** — 릴리스 게이트를 유지하면서 CI 중요 경로 대기 시간이 단축되었습니다. 이제 Node 작업은 무조건 `npm ci`을 사용하여 깨끗한 잠금 파일 설치를 증명하고, Node/Cargo/플러그인 메타데이터 전체에서 버전 동기화가 확인되고, 태그 워크플로를 통해 기본 릴리스 아티팩트가 빌드됩니다.

## 병합된 PR

### 탐색 및 실행 안전

- [#2120](https://github.com/Yeachan-Heo/oh-my-codex/pull/2120) — 의미 폴백 전 바운드 탐색 실행
- [#2146](https://github.com/Yeachan-Heo/oh-my-codex/pull/2146) — 호스트 OOM 이전에 프로세스 폭풍을 탐색합니다.

### 런타임, 세션 상태 및 목표 내구성

- [#2136](https://github.com/Yeachan-Heo/oh-my-codex/pull/2136) — 터미널 ralplan/Ralph 이후 오래된 루트 스킬 상태 수정
- [#2138](https://github.com/Yeachan-Heo/oh-my-codex/pull/2138) — 목표 모드 후속 조치에 대한 계획 핸드오프 안내
- [#2140](https://github.com/Yeachan-Heo/oh-my-codex/pull/2140) — 차단된 Ultragoal Codex 목표 핸드오프 처리
- [#2141](https://github.com/Yeachan-Heo/oh-my-codex/pull/2141) — 세션 범위 런타임 상태를 신뢰할 수 있게 유지합니다.
- [#2151](https://github.com/Yeachan-Heo/oh-my-codex/pull/2151) — 프로젝트 범위 세션에서 Codex 목표 상태를 지속 가능하게 유지합니다.

### team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 승인 핸드오프 및 컨텍스트 팩 안정성

- [#2169](https://github.com/Yeachan-Heo/oh-my-codex/pull/2169) — 준비되지 않은 승인된 핸드오프를 수리 전용으로 유지합니다.
- [#2170](https://github.com/Yeachan-Heo/oh-my-codex/pull/2170) — 잘못된 컨텍스트 팩 역할 진단 유지
- [#2171](https://github.com/Yeachan-Heo/oh-my-codex/pull/2171) — 승인된 남은 핸드오프 대체 격차 해소
- [#2172](https://github.com/Yeachan-Heo/oh-my-codex/pull/2172) — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) DAG 폴백을 핸드오프 상태에 맞춰 유지

### 출시, 플러그인, MCP 및 플랫폼 수정

- [#2122](https://github.com/Yeachan-Heo/oh-my-codex/pull/2122) — 플러그인 MCP 출시 사실을 명확히 합니다.
- [#2134](https://github.com/Yeachan-Heo/oh-my-codex/pull/2134) — 단독/일회성 실행 작업 트리 상태를 내구성 있게 유지합니다.
- [#2135](https://github.com/Yeachan-Heo/oh-my-codex/pull/2135) — imagegen 인터럽트 주변에서 Ralph 연속성을 유지합니다.
- [#2144](https://github.com/Yeachan-Heo/oh-my-codex/pull/2144) — 자사 MCP 앱 서버 사전 트래픽 누출 수정
- [#2152](https://github.com/Yeachan-Heo/oh-my-codex/pull/2152) — 플러그인 스킬 캐시 새로 고침 수정
- [#2153](https://github.com/Yeachan-Heo/oh-my-codex/pull/2153) — 관리형 OMX 도우미에 현재 JS 런타임을 사용합니다.
- [#2154](https://github.com/Yeachan-Heo/oh-my-codex/pull/2154) — 출시 정책 도움말 출력 강화
- [#2155](https://github.com/Yeachan-Heo/oh-my-codex/pull/2155) — 조용한 네이티브 후크 배경 출력
- [#2157](https://github.com/Yeachan-Heo/oh-my-codex/pull/2157) — Windows OMX 루트 실행 경로 수정
- [#2178](https://github.com/Yeachan-Heo/oh-my-codex/pull/2178) — Darwin 시작-대체 작업 트리 루트 어설션 정규화

### 모델, CI, 문서 및 워크플로우 개선

- [#2131](https://github.com/Yeachan-Heo/oh-my-codex/pull/2131) — 에이전트(Agent)에 대한 구성 수준 xhigh 추론 재정의 추가
- [#2158](https://github.com/Yeachan-Heo/oh-my-codex/pull/2158) — CI 중요 경로 대기 시간 감소
- [#2159](https://github.com/Yeachan-Heo/oh-my-codex/pull/2159) — 심층 인터뷰 사실 전달 개선
- [#2168](https://github.com/Yeachan-Heo/oh-my-codex/pull/2168) — UI 디자인 경사 방지 신호 추가

## 추가 릴리스 준비 커밋

- `f5e1e79e` — 오래된 자동 조종 장치 스킬 활성 HUD 상태 수정
- `e1711433` — 모호하게 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 바인딩 유지
- `c6f5d46a` — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 간부 승인 바인딩 전송 유지
- `3e8767bb` — 초안이 불완전한 경우 선택된 승인된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 핸드오프를 유지합니다.
- `8c8d2ed5` — 읽기 전용 컨텍스트 팩 핸드오프 상태 추가
- `9e4d118b` — 0.16.1에 대한 0.16.0 이후 열차를 강화합니다.
- `cfc29185` — 검토된 0.16.1 열차를 메인 열차로 승격

## 업그레이드 참고사항

- `omx explore` 로컬 빠른 경로 파일 읽기는 더 이상 심볼릭 링크를 따르지 않습니다. 심볼릭 링크된 경로는 하네스 경로로 대체됩니다.
- 로컬 탐색 텍스트 검색은 빠른 경로에서 큰 파일을 건너뛰고 제한된 대체 처리를 통해 더 넓은 검색을 처리할 수 있습니다.
- CI는 더 이상 캐시된 `node_modules` 트리를 복원/건너뛰지 않습니다. `npm ci`은 잠금 파일 설치 무결성을 입증하기 위해 각 노드 작업에서 실행됩니다.

## 확인

- `9e4d118b`에 대한 개발 CI: 통과되었습니다.
- `cfc29185`에 대한 기본 CI: 통과되었습니다.
- `v0.16.1`에 대한 릴리스 태그 워크플로: 버전 동기화, 기본 아티팩트 게시, 기본 자산 스모크 확인, 팩형 글로벌 설치 스모크 테스트 및 npm 패키지 게시를 포함하여 통과되었습니다.
- 로컬 릴리스 준비 게이트에는 Rust 작업 공간 테스트, TypeScript 빌드, Lint/미사용 검사, 대상 노드 테스트 및 `npm pack --dry-run`이 포함되었습니다.

## 기여자

`0.16.1` 트파트을 구성한 PR 및 수정 사항과 최종 태그를 강화한 릴리스 준비/검토 작업을 해주신 @Yeachan-Heo, @lkraider, @HaD0Yun, @pgagarinov 및 @qzzqzzb에게 감사드립니다.

**전체 변경 로그**: ​​[__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.16.0...v0.16.1)
