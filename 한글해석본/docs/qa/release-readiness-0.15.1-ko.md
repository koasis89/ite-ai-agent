# 릴리스 준비 평가 - 0.15.1

날짜: 2026-04-29
대상 버전: **0.15.1**
후보 소스 브랜치: `dev` / `origin/dev`
로컬 범프 전 후보 소스 SHA: `50b68ee5`
후보 소스에서 접근 가능한 기본 태그: `v0.14.3`
비교 링크: [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.14.3...v0.15.1)
범위 참고: `v0.15.0`이 존재하지만 현재 `dev` 릴리스 트파트의 조상이 아니므로 태그 트리거 릴리스 워크플로는 `v0.14.3`를 연결 가능한 비교 기반으로 사용해야 합니다.

## 범위

`0.15.1`은(는) 직접/비 tmux 실행 제어, 수동 상태 읽기, 작업 생성 후 저장소 인식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) DAG 종속성 재매핑, 설정/플러그인 모드 강화, 감사된 실행 후속 조치, MCP/런타임 신뢰성 수정, 문서 및 릴리스 자료를 다루는 패치 릴리스 후보입니다.

## 변경된 실행 경로가 검토되었습니다.

- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, `plugins/oh-my-codex/.codex-plugin/plugin.json` — `0.15.1`에 맞춰 정렬된 릴리스 메타데이터입니다.
- `CHANGELOG.md`, `RELEASE_BODY.md`, `docs/release-notes-0.15.1.md`, `docs/qa/release-readiness-0.15.1.md` — `0.15.1`에 맞춰 정렬된 릴리스 담보입니다.
- `src/state/operations.ts` 및 상태 MCP 테스트 — 읽기 전용 상태 작업은 부작용 없이 유지되며 변경 작업은 여전히 ​​필요한 런타임 상태를 초기화합니다.
- `src/team/repo-aware-decomposition.ts`, `src/team/runtime.ts` 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 테스트 — 기호화된 DAG 종속성은 작업 생성 후 구체적인 작업 ID로 다시 매핑됩니다.
- `src/cli/index.ts`, README, 릴리스 노트 및 실행 폴백 테스트 — direct/detached-tmux 실행 정책 및 탈출구가 문서화되고 테스트되었습니다.

## 검증 증거

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| TypeScript build | `npm run build` | PASS | Rebuilt `dist/` after local 0.15.1 bump. |
| Native agent generation check | `npm run verify:native-agents` | PASS | `verified 20 installable native agents and 33 setup prompt assets`. |
| Plugin bundle / mirror check | `npm run verify:plugin-bundle` | PASS | `verified 29 canonical skill directories and plugin metadata`. |
| Lint | `npm run lint` | PASS | `Checked 581 files ... No fixes applied.` |
| No-unused typecheck | `npm run check:no-unused` | PASS | Completed with exit code `0`. |
| Focused recent regression lane | `npm run test:recent-bug-regressions:compiled` | PASS | 462 tests passed after local 0.15.1 metadata bump. |

## 알려진 제한/건너뛴 검사

- 외부 GitHub CI, 릴리스 태그 생성, npm 게시 및 GitHub 릴리스 게시는 의도적으로 이 로컬 준비 단계에서 실행되지 않습니다.
- GitHub CI를 사용할 수 없는 경우 외부 게시 전에 전체 `npm test`, 패키지 설치 스모크, OS 간 수동 확인 및 Cargo 작업 공간 테스트를 권장합니다.

## 평결

**최종 검증 통과 후 로컬 릴리스 준비가 준비됩니다.** CI가 녹색이고 유지 관리 담당자가 의도적으로 태그/게시 릴리스 흐름을 실행할 때까지 `v0.15.1`에 태그를 지정하거나 게시하지 마세요.
