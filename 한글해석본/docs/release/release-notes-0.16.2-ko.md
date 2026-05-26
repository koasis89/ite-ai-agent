# 릴리스 노트 — 0.16.2

`0.16.2`은(는) `0.16.1` 이후 릴리스-트파트 수정 및 워크플로 강화 릴리스입니다. 이는 주요 `$ultragoal` 총 목표 수정 사항, 커밋 공유 위키/압축 지원, 상태 격리 수정 사항 및 릴리스 검토 중에 발견된 Codex 네이티브 후크 설정 수정 사항을 제공합니다.

## 하이라이트

- **`$ultragoal`은(는) 이제 Codex 총 목표를 기본값으로 설정합니다** — 새로운 계획은 하나의 총 Codex 목표를 사용하는 반면 OMX는 스토리별 `G001`/`G002` 체크포인트를 추적합니다. 기존/모드 없음 계획은 레거시 스토리별 동작을 유지하며 명시적인 `--codex-goal-mode per-story`은 계속 지원됩니다. 계획, ralplan, 심층 인터뷰, 플러그인 기술 미러, 도움말 텍스트 및 문서는 이제 사용자에게 기본 목표 모드 후속 조치로 `$ultragoal`을 가리킵니다. ([#2188](https://github.com/Yeachan-Heo/oh-my-codex/pull/2188))
- **프로젝트 위키 페이지는 이제 커밋 공유됩니다** — 정식 위키 저장소는 저장소 루트 `omx_wiki/`로 이동되었으며 레거시 `.omx/wiki/`은 읽기 전용 폴백으로 유지됩니다. 기본 `PreCompact`/`PostCompact` 후크는 이제 내구성 있는 압축 결과를 공유 위키 화면으로 보존하고 승격합니다. ([#2180](https://github.com/Yeachan-Heo/oh-my-codex/pull/2180))
- **상태 저장 워크플로는 OMX 세션으로 격리됩니다** — 세션 범위 워크플로 상태는 더 이상 루트/전역 상태에서 상속되거나 자동 완성되지 않으며 명시적인 `all_sessions` 정리는 전역 재설정 경로로 유지됩니다. ([#2193](https://github.com/Yeachan-Heo/oh-my-codex/pull/2193))

## Codex 기본 후크 및 설정

- 생성된 후크를 수동 `/hooks` 검토 없이 신뢰할 수 있도록 설정 소유 `codex-native-hook.js` 래퍼에 대한 Codex 호환 신뢰 상태 생성이 추가되었으며, 사용자 후크 항목과 사용자 소유 후크 상태는 유지됩니다. ([#2194](https://github.com/Yeachan-Heo/oh-my-codex/pull/2194))
- 릴리스 검토 중에 [#2174](https://github.com/Yeachan-Heo/oh-my-codex/pull/2174)의 후크 기능 플래그 마이그레이션 작업을 감사하고 생성된 설정 구성을 공식 수명 주기 후크 플래그인 `[features].codex_hooks = true`로 복원했습니다.
- 설치 중에 오래된/출시되지 않은 `[features].hooks = true` 별칭을 `codex_hooks`로 다시 복구하고 설치, 제거, 문서, 테스트 및 플러그인 기술 미러를 업데이트하여 지원되는 플래그를 일관되게 문서화했습니다.

## 병합된 PR 인벤토리

- [#2174](https://github.com/Yeachan-Heo/oh-my-codex/pull/2174) — 수정: 지원되는 Codex 후크 기능 플래그 사용
- [#2188](https://github.com/Yeachan-Heo/oh-my-codex/pull/2188) — Codex 목표를 집계하기 위한 기본 울트라골
- [#2180](https://github.com/Yeachan-Heo/oh-my-codex/pull/2180) — OMX 위키를 커밋 공유로 만들고 컴팩트 후크를 추가합니다.
- [#2194](https://github.com/Yeachan-Heo/oh-my-codex/pull/2194) — 설정 중 설정 소유 Codex 후크를 신뢰합니다.
- [#2193](https://github.com/Yeachan-Heo/oh-my-codex/pull/2193) — 상태 저장 워크플로 세션 격리 수정

## 확인

- 로컬 릴리스 검토 게이트: `npm run build`, `npm run check:no-unused`, 대상 설정/구성/제거/후크 노드 테스트, `npm run verify:native-agents`, `npm run verify:plugin-bundle`, 카탈로그 문서 확인 및 `cargo test`.
- 변경된 영역 PR 게이트에는 대상 `$ultragoal`, wiki/MCP/스토리지, 상태/세션, 네이티브 후크, 설정, 린트, 미사용 및 플러그인 번들 검사가 포함되었습니다.
- `dev` 및 `main`에 전달된 GitHub CI; 태그 릴리스 워크플로는 네이티브 빌드, 릴리스 자산 게시, 스모크 확인, 팩형 글로벌 설치 스모크 및 npm 게시를 통과했습니다.

**전체 변경 로그**: ​​[__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.16.1...v0.16.2)
