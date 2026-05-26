# 오마이코덱스 v0.9.0

<p align="center">
  <img src="https://raw.githubusercontent.com/Yeachan-Heo/oh-my-codex/v0.9.0/docs/shared/omx-character-spark-initiative.jpg" alt="OMX character sparked for the Spark Initiative" width="720">
</p>

`0.9.0`은 Spark Initiative 릴리스입니다. 이제 OMX는 저장소 검색, 셸 기본 검사 및 플랫폼 간 기본 배포를 위한 더욱 강력한 기본 빠른 경로를 제공합니다.

## 하이라이트

### `omx explore`

- 전용 읽기 전용 탐색 진입점을 추가합니다.
- Rust 지원 탐색 하네스를 사용합니다.
- 셸 기본 탐색을 제한하고, 허용 목록에 추가하고, 읽기 전용으로 유지합니다.
- 패키지된 기본 해상도와 소스/저장소-로컬 대체 경로를 지원합니다.

### `omx sparkshell`

- 운영자용 기본 셸 사이드카를 추가합니다.
- 직접 명령 실행 지원
- 긴 출력을 컴팩트한 섹션으로 요약합니다.
- 명시적인 tmux-pane 요약을 지원합니다.

```bash
omx sparkshell --tmux-pane %12 --tail-lines 400
```

### 탐색 ⇔ Sparkshell 통합

- 한정된 읽기 전용 쉘 네이티브 `omx explore` 프롬프트는 `omx sparkshell`을 통해 라우팅(Routing)될 수 있습니다.
- 대체 동작은 명시적이고 강화된 상태로 유지됩니다.
- 지침/문서/테스트가 이 계약을 중심으로 코디네이션(Coordination)되었습니다.

### 작업자 후속 연마

- 작업자 사서함 안내는 이제 응답 후 작업을 중지해야 함을 암시하지 않고 구체적인 진행 상황 업데이트를 요청합니다.
- 받은 편지함/사서함 트리거 문구는 이제 작업자에게 상태 보고 후 할당된 작업이나 다음 가능한 작업을 계속하도록 지시합니다.
- 런타임/부트스트랩 문구 및 관련 테스트가 이 동작을 중심으로 정렬되었습니다.

### 릴리스 파이프라인 업그레이드

- 다음을 위한 크로스 플랫폼 기본 게시:
  - `omx-explore-harness`
  - `omx-sparkshell`
- 대상별 메타데이터를 사용한 기본 릴리스 매니페스트 생성
- 릴리스 워크플로의 압축 설치 연기 확인
- `build:full`은 일회성 릴리스 지향 빌드 경로로 검증되었습니다.

## 중요한 Spark 이니셔티브 참고 사항

- 사용자는 `npm install -g oh-my-codex`을(를) 사용하여 OMX를 정상적으로 설치할 수 있습니다.
- npm tarball은 의도적으로 단계적 크로스 플랫폼 네이티브 바이너리를 제외합니다.
- 태그가 지정된 릴리스는 `omx-explore-harness` 및 `omx-sparkshell`에 대해 검증된 기본 아카이브를 게시합니다.
- 패키지 설치는 `native-release-manifest.json`을 통해 일치하는 네이티브 바이너리를 수화합니다.
- CI는 이제 명시적인 툴체인 설정, `cargo fmt --all --check` 및 `cargo clippy --workspace --all-targets -- -D warnings`을 통해 Rust 경로를 강화합니다.

## 업그레이드 참고사항

If you use project-scoped OMX installs, rerun:

```bash
omx setup --force --scope project
```

업그레이드 후 관리되는 구성/네이티브 에이전트(Agent) 경로가 새로 고쳐집니다.

## 현지 출시 확인 요약

태그를 지정하기 전에 `dev`에서 로컬로 검증되었습니다.

- `node scripts/check-version-sync.mjs --tag v0.9.0`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run check:no-unused`
- `npm test`
- `npm run build:full`
- `npm run test:explore`
- `npm run test:sparkshell`
- `node bin/omx.js doctor`
- `node bin/omx.js setup --dry-run`
- `npm pack --dry-run`

## 주목할만한 PR

- [#782](https://github.com/Yeachan-Heo/oh-my-codex/pull/782) — Sparkshell을 통해 읽기 전용 셸 작업을 한정하는 경로 탐색
- [#784](https://github.com/Yeachan-Heo/oh-my-codex/pull/784) — 크로스 플랫폼 네이티브 게시 및 릴리스 파이프라인 후속 조치
- [#785](https://github.com/Yeachan-Heo/oh-my-codex/pull/785) — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 수명 주기 및 정리 강화
- [#786](https://github.com/Yeachan-Heo/oh-my-codex/pull/786) — 중첩된 도움말 라우팅 정리
- [#787](https://github.com/Yeachan-Heo/oh-my-codex/pull/787) — 중앙 집중식 OMX 기본 모델 해상도
- [#788](https://github.com/Yeachan-Heo/oh-my-codex/pull/788) — HUD 분기/구성 로딩 강화
- [#789](https://github.com/Yeachan-Heo/oh-my-codex/pull/789) — 생성된 측면 작업을 작업자 전체에 배포
- [#793](https://github.com/Yeachan-Heo/oh-my-codex/pull/793) — Windows Codex 명령 심 프로빙 수정
- [#794](https://github.com/Yeachan-Heo/oh-my-codex/pull/794) — `experimental/dev`을 `dev`에 병합
- [#805](https://github.com/Yeachan-Heo/oh-my-codex/pull/805) — 사서함 응답 후에도 작업자를 계속 실행합니다.

## 관련 문제

- [#781](https://github.com/Yeachan-Heo/oh-my-codex/pull/781) — 스파크셸 요약 추론 강화
- [#744](https://github.com/Yeachan-Heo/oh-my-codex/issues/744) — 수명 주기 프로필 지속성
- [#745](https://github.com/Yeachan-Heo/oh-my-codex/issues/745) — 정리 정책 강화
- [#746](https://github.com/Yeachan-Heo/oh-my-codex/issues/746) — 거버넌스 분할 후속 조치
- [#741](https://github.com/Yeachan-Heo/oh-my-codex/issues/741) — 연결된 Ralph/team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 후속 조치
- [#732](https://github.com/Yeachan-Heo/oh-my-codex/issues/732) — 관련 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 수명주기 후속 조치
