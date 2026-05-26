# 오마이코덱스 v0.9.0

초안 작성일: 2026-03-12

`v0.8.15` 이후 출시되지 않은 `dev` 변경 사항을 기반으로 한 사전 출시 초안입니다.

`v0.8.15..dev`의 비병합 커밋 55개.
기여자: Yeachan-Heo, Bellman, 2233admin, 승환 엄, hoky1227.

## 하이라이트

### Spark 이니셔티브: `omx explore` 및 `omx sparkshell`

이제 OMX에는 저장소 검색 및 셸 기본 검사를 위한 더욱 강력한 기본 빠른 경로가 있습니다.

이번 릴리스:
- `omx explore`을 기본 읽기 전용 탐색 진입점으로 도입합니다.
- Rust 지원 탐색 하네스와 패키징 및 소스 대체 흐름을 추가합니다.
- `omx sparkshell <command> [args...]`을 명시적인 운영자 측 네이티브 사이드카로 도입합니다.
- 읽기 전용 셸 네이티브 `omx explore` 작업을 `omx sparkshell`을 통해 라우팅(Routing)할 수 있도록 허용합니다.
- 탐색 경로를 의도적으로 제한된 상태로 유지합니다: 셸 전용, 읽기 전용 및 허용 목록

대표적인 변경사항:
- `fb07c3c` — 묘기: omx 탐색 하네스 및 패키징 흐름 추가
- `71858c3` — feat: omx Sparkshell 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 검사 메타데이터 추가
- `e8e7594` — feat(explore): Sparkshell을 통해 한정된 읽기 전용 셸 작업을 라우팅합니다.
- `dc83dfd` — 수정(탐색): Sparkshell 대체 경로 강화
- `25bdd23` — docs(guidance): 탐색 및 Sparkshell 사용법 개선

### 중요한 Spark 이니셔티브 참고 사항

`0.9.0`의 중요한 배포 계약은 다음과 같습니다.

- 사용자는 `npm install -g oh-my-codex`을(를) 사용하여 OMX를 정상적으로 설치할 수 있습니다.
- npm 패키지는 의도적으로 모든 기본 바이너리를 직접 번들링하지 **않습니다**
- 태그가 지정된 릴리스는 다음에 대한 크로스 플랫폼 기본 아카이브를 게시합니다.
  - `omx-explore-harness`
  - `omx-sparkshell`
- 패키지 설치는 `native-release-manifest.json`을 통해 GitHub 릴리스 자산에서 일치하는 기본 바이너리를 수화합니다.
- CI는 이제 다음을 통해 Rust 경로를 더욱 직접적으로 검증합니다.
  - 전체 빌드 파트에서 명시적인 Rust 툴체인 설정
  - `cargo fmt --all --check`
  - `cargo clippy --workspace --all-targets -- -D warnings`

이를 통해 검증된 크로스 플랫폼 네이티브 도우미를 계속 제공하면서 사용자를 위한 npm 설치를 간단하게 유지합니다.

### 네이티브 릴리스 자산은 이제 최고 수준입니다.

`0.9.0`은 또한 OMX의 릴리스 형태를 업그레이드하여 새로운 기본 인터페이스을 플랫폼 전반에 걸쳐 게시하고 사용할 수 있도록 합니다.

이번 릴리스:
- `omx-explore-harness` 및 `omx-sparkshell`에 대한 크로스 플랫폼 기본 게시를 통합합니다.
- 대상별 메타데이터 및 체크섬이 포함된 기본 릴리스 매니페스트를 생성합니다.
- 릴리스 워크플로우에 패키지 설치 스모크 검증을 추가합니다.
- CI에서 직접 `build:full`을 검증합니다.
- 환경 재정의, 수화 캐시, 패키지 아티팩트 및 repo-local 빌드 전반에 걸쳐 런타임 대체 순서를 명시적으로 유지합니다.

대표적인 변경사항:
- `23d1cf5` — feat(release): 크로스 플랫폼 네이티브 퍼블리싱 통합
- `559089f` — ci(릴리스): 패키지 설치 스모크 게이트 추가
- `99ce264` — ci: 작업 흐름에서 빌드 확인:전체 확인
- `d12e5f4` — 빌드: 빌드 추가:전체 및 문서 전체 및 TS 전용 빌드 추가
- `7aee91d` — 수정(네이티브 자산): 누락된 매니페스트 폴백 완화

### Sparkshell은 직접적으로나 내부 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 운영 모두에 유용합니다.

스파크셸 라인은 단순한 숨겨진 백엔드가 아닙니다. 이제는 운영자 이야기의 일부입니다.

이번 릴리스:
- 명시적인 창 요약을 위해 `omx sparkshell --tmux-pane <pane-id> --tail-lines <100-1000>`을 노출합니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 흐름에 Sparkshell 검사 메타데이터 표시
- 긴 출력 요약을 더 예측 가능하게 만듭니다.
- 시끄럽고 적대적인 출력에 대한 스트레스 적용 범위를 추가합니다.

대표적인 변경사항:
- `71858c3` — feat: omx Sparkshell 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 검사 메타데이터 추가
- `b890123` — fix: force low reasoning for sparkshell summaries (#781)
- `a653376` — 테스트: 탐색 및 스파크셸 스트레스 적용 범위 추가

### 런타임 및 연산자 개선 지원

불꽃에 초점을 맞춘 작업과 함께 `dev`은 릴리스를 더욱 완벽하게 만드는 지원 개선 사항도 선택했습니다.

- 작업자 사서함/트리거 문구는 이제 작업자가 응답 후 중지하는 대신 진행 상황을 보고하고 실행을 계속하도록 유도합니다(`#805`).
- 중앙 집중식 기본 모델 해상도(`94769c1`, PR `#787`)
- `ask` 및 `hud`에 대한 현지 도움말 라우팅 정리(`6b0b560`, `6dc245e`, PR `#786`)
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 수명 주기 및 정리 강화(`a0a9626`, PR `#785`)
- Windows Codex 명령 심 프로브 수정(`8fc859c`, PR `#793`)
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자를 위한 측면 작업 분배 수정(`ce35d37`, PR `#789`)

## 업그레이드 참고사항

- 프로젝트 범위 OMX 설치를 사용하는 경우 다음을 다시 실행하세요.

```bash
omx setup --force --scope project
```

- 명시적인 바이너리 재정의 또는 repo-local 아티팩트가 없는 경우 `omx explore` 및 `omx sparkshell` 패키지 설치는 릴리스 자산 하이드레이션에 의존할 것으로 예상됩니다.
- `npm pack`은 의도적으로 준비된 네이티브 바이너리를 제공하지 **않습니다**. 네이티브 아카이브는 GitHub 릴리스에 첨부되고 네이티브 자산 워크플로를 통해 사용됩니다.

## 통계 비교

- 커밋 창: **55개의 비병합 커밋**(`2026-03-10` ~ `2026-03-12`)
- 차이점 스냅샷(`v0.8.15...dev`): **149개 파일이 변경됨, +12,325 / -254**

## 릴리스 창에서 PR 병합

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

## 이번 릴리스에서 강조된 관련 문제

- [#781](https://github.com/Yeachan-Heo/oh-my-codex/pull/781) — Sparkshell 요약에 대해 낮은 추론을 강제합니다.
- [#744](https://github.com/Yeachan-Heo/oh-my-codex/issues/744) — 연결된 Ralph와 기본 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 실행에 대한 수명 주기 프로필 유지
- [#745](https://github.com/Yeachan-Heo/oh-my-codex/issues/745) — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 정리 정책 강화
- [#746](https://github.com/Yeachan-Heo/oh-my-codex/issues/746) — team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 정책/거버넌스 분할 후속 조치
- [#741](https://github.com/Yeachan-Heo/oh-my-codex/issues/741) — 릴리스 준비 / 연결된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)-Ralph 런타임 후속 조치
- [#732](https://github.com/Yeachan-Heo/oh-my-codex/issues/732) — 관련 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 정지/수명 주기 정리 후속 조치
