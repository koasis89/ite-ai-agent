# 릴리스 준비 초안 - 0.9.0

날짜: **2026-03-12**
대상 버전: **0.9.0**
평결: **GO** ✅

`0.9.0`은 이제 로컬에서 버전 범프되었으며 범프 후 릴리스 게이트는 `dev`에서 성공적으로 다시 실행되었습니다.

## 검토된 범위

- `v0.8.15` 이후 출시되지 않은 `dev` 작업
- 스파크 이니셔티브 인터페이스:
  - `omx explore`
  - `omx sparkshell`
  - 읽기 전용 셸 작업에 적합한 탐색-스파크셸 라우팅(Routing)
- 네이티브 릴리스 파이프라인 작업:
  - 크로스 플랫폼 네이티브 퍼블리싱
  - 매니페스트 생성 릴리스
  - 포장 설치 연기 게이트
  - `build:full` 작업흐름 검증
- `0.9.0`에 대한 릴리스 노트 및 QA 초안 생성

## 검증 증거 완료

| Check | Command | Result |
|---|---|---|
| Full source build | `npm run build:full` | PASS |
| CLI help smoke | `node bin/omx.js --help` | PASS |
| Version smoke | `node bin/omx.js version` | PASS (`oh-my-codex v0.9.0`) |
| Version sync | `node scripts/check-version-sync.mjs --tag v0.9.0` | PASS |
| Ask help smoke | `node bin/omx.js ask --help` | PASS |
| HUD help smoke | `node bin/omx.js hud --help` | PASS |
| Doctor smoke | `node bin/omx.js doctor` | PASS (`10 passed, 0 warnings, 0 failed`) |
| Status smoke | `node bin/omx.js status` | PASS |
| Setup dry-run smoke | `node bin/omx.js setup --dry-run` | PASS |
| Explore help smoke | `node bin/omx.js explore --help` | PASS |
| Explore prompt-file smoke | `node bin/omx.js explore --prompt-file /tmp/omx-explore-smoke.txt` | PASS |
| Explore→sparkshell routing smoke | `OMX_SPARKSHELL_LINES=1 node bin/omx.js explore --prompt 'git log --oneline -10'` | PASS (summary output emitted) |
| Sparkshell help smoke | `node bin/omx.js sparkshell --help` | PASS |
| Sparkshell direct smoke | `node bin/omx.js sparkshell git --version` | PASS (`git version 2.34.1`) |
| Sparkshell summary smoke | `OMX_SPARKSHELL_LINES=1 node bin/omx.js sparkshell git log --oneline -10` | PASS (summary output emitted) |
| Sparkshell tmux-pane smoke | `node bin/omx.js sparkshell --tmux-pane %2141 --tail-lines 120` | PASS |
| Full test suite | `npm test` | PASS (`2375` pass / `0` fail) |
| Packed tarball dry run | `npm pack --dry-run` | PASS (`oh-my-codex-0.9.0.tgz`) |
| Explore verification lane | `npm run test:explore` | PASS (`39` pass / `0` fail) |
| Sparkshell verification lane | `npm run test:sparkshell` | PASS (Rust suites passed: `32 + 11 + 5`, `0` fail) |

## 현재 릴리스 형태 증거

- 현재 패키지 버전: `0.9.0`
- 저장소의 최신 기존 git 태그: `v0.8.15`
- 현재 분기: `dev`
- 출시되지 않은 헤드 및 태그: **55개의 비병합 커밋**
- 미공개 차이점과 태그 비교: **149개 파일 변경됨, +12,325 / -254**

## 남은 릴리스 작업

- `v0.9.0` 태그를 지정하고 GitHub Actions 릴리스 작업이 완료되었는지 확인하세요.
  - 네이티브 자산 게시
  - 네이티브 자산 매니페스트 확인
  - 포장 설치 연기 검증
  - npm 게시
- `docs/release-notes-0.9.0.md`을 사용하여 GitHub 릴리스를 게시합니다.

## 위험 참고 사항

- 기본 회귀 인터페이스은 새로운 기본 배포 계약(수화, 대체 순서 지정 및 크로스 플랫폼 자산 확인)입니다.
- `omx explore`은 의도적으로 제한됩니다. 릴리스 유효성 검사에서는 Sparkshell 라우팅이 활성화된 동안 셸 전용/읽기 전용 경계가 그대로 유지되는지 계속 확인해야 합니다.
- `omx sparkshell --tmux-pane`은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 디버깅에 있어 운영자에게 매우 중요하므로 창 요약 동작은 숨겨진 내부 세부 정보가 아닌 릴리스 관련 기능으로 처리되어야 합니다.
- `npm pack --dry-run` 녹색을 유지하는 것이 중요합니다. 패키지 설치에서는 의도적으로 단계적 네이티브 바이너리를 제외하기 때문입니다. 릴리스 워크플로는 대신 GitHub 릴리스 자산을 통해 해당 바이너리를 제공해야 합니다.
- 크로스 플랫폼 Windows 관련 수정 사항이 릴리스 창에 포함되었지만 이 Linux 스모크 패스는 Windows 런타임 동작을 직접 확인할 수 없습니다. 이는 여전히 CI/릴리스 매트릭스 확인에 달려 있습니다.

## 최종 현지 평결

릴리스 **0.9.0**은 위의 성공적인 로컬 범프 후 확인을 기반으로 **태그 및 게시 준비가 완료되었습니다**.
