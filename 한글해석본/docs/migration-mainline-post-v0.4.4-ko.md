# 마이그레이션 가이드: v0.4.4 이후 메인라인 변경 사항

이 가이드에서는 **v0.4.4**에서 이후에 병합된 현재 메인라인 변경 사항(PR #137 및 후속 수정 사항 포함)으로의 마이그레이션을 다룹니다.

## 영향을 받는 사람

다음과 같은 경우 영향을 받습니다.

- 이전 노트/스크립트에서 제거된 프롬프트나 스킬(Skill)을 호출합니다.
- 사전 통합 카탈로그 이름에 따라 달라집니다.
- `omx setup`을 사용하고 예측 가능한 설치 범위 동작이 필요합니다.
- `omx team`/tmux 워크플로를 실행하고 최신 안정성 수정을 원합니다.
- 알리미 출력을 사용하고 자세한 정보 제어가 필요합니다.

## 변경된 사항(높은 수준)

- 프롬프트/스킬을 위한 카탈로그 통합 및 더 이상 사용되지 않는 항목 정리.
- `omx setup`은 이제 범위 인식 설치 모드(`user`, `project`)를 지원합니다. 레거시 `project-local` 값은 자동으로 마이그레이션됩니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자(`--spark`, `--madmax-spark`)에 대한 Spark 작업자 라우팅(Routing)이 추가되었습니다.
- 알리미 세부 정보 컨트롤이 추가되었습니다.
- 검토 후 창 캡처/입력 강화를 포함하여 tmux 런타임 강화 업데이트가 시작되었습니다.
- 제거된 `scientist`/`pipeline`에 대한 오래된 참조가 정리되었습니다.

## 프롬프트 및 스킬이 제거되었습니다.

### 삭제된 메시지

- `deep-executor`
- `scientist`

### 제거된 스킬

- `deepinit`
- `learn-about-omx`
- `learner`
- `pipeline`
- `project-session-manager`
- `psm`
- `release`
- `ultrapilot`
- `writer-memory`

## 이전 참조를 현재 참조로 매핑

문서, 스크립트, 개인 바로가기에서 이러한 대체 항목을 사용하세요.

| Old reference | Use now | Notes |
|---|---|---|
| `/prompts:deep-executor` | `/prompts:executor` | `deep-executor` was a deprecated alias to executor behavior. |
| `/prompts:scientist` | `/prompts:researcher` | Use researcher for research-focused workflows in current catalog. |
| `$pipeline` | `$team` (or explicit `/prompts:*` sequencing) | Team is the default orchestrator pipeline surface. |
| `$ultrapilot` | `$team` | Use team-based parallel orchestration. |
| `$psm` / `$project-session-manager` | No in-repo replacement | Remove from automation or maintain out-of-tree tooling. |
| `$release` | No in-repo replacement | Use your project release process directly. |
| `$deepinit` | `omx agents-init [path]` | Lightweight CLI successor for AGENTS.md bootstrap only; immediate child directories only, unmanaged files preserved unless `--force`. |
| `$learn-about-omx` / `$learner` / `$writer-memory` | No in-repo replacement | Remove stale references from workflows/docs. |

## 업그레이드 후 확인 체크리스트

최신 메인라인을 가져온 후 이 체크리스트를 실행하십시오.

- [ ] 제거된 참조가 로컬 메모/스크립트에서 사라졌는지 확인합니다.
  ```bash
  rg -n "deep-executor|scientist|pipeline|project-session-manager|\bpsm\b|ultrapilot|learn-about-omx|writer-memory|learner|deepinit|\brelease\b" README.md docs scripts .omx -S
  ```
- [ ] 현재 프롬프트 카탈로그에 제거된 프롬프트가 더 이상 포함되어 있지 않은지 확인합니다.
  ```bash
  ls prompts
  ```
- [ ] 현재 기술 카탈로그에 더 이상 제거된 스킬이 포함되어 있지 않은지 확인합니다.
  ```bash
  ls skills
  ```
- [ ] 설정 범위 확인 옵션을 사용할 수 있습니다.
  ```bash
  omx help | rg -e "--scope|project"
  ```
- [ ] team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/tmux 상태 확인을 확인합니다.
  ```bash
  omx doctor --team
  ```
- [ ] Spark 작업자 라우팅을 사용하는 경우 확인 플래그를 사용할 수 있습니다.
  ```bash
  omx --help | rg "spark|madmax-spark"
  ```

## 관련 문서

- 릴리스 노트: [CHANGELOG.md](../CHANGELOG.md)
- 주요 개요: [README.md](../README.md)
