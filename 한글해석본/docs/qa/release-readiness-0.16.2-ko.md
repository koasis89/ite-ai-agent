# 릴리스 준비 평가 - 0.16.2

대상 버전: **0.16.2**
날짜: 2026-05-08
비교 링크: [__TOK_0__](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.16.1...v0.16.2)
릴리즈: https://github.com/Yeachan-Heo/oh-my-codex/releases/tag/v0.16.2

## 평결

**배송됨.** `0.16.2`은 릴리스 노트/본문 인벤토리를 수정한 후 GitHub 릴리스 및 npm에 게시됩니다.

## 릴리스 인터페이스

- #2174 — Codex 후크 기능 플래그 마이그레이션 작업, 릴리스 검토 중에 감사 및 수정되었습니다.
- #2188 — `$ultragoal` Codex 목표 모드 및 계획/기술/문서 지침을 집계합니다.
- #2180 — 커밋 공유 `omx_wiki/` 스토리지와 네이티브 컴팩트 후크.
- #2194 — 설정 소유 Codex 후크 신뢰 상태입니다.
- #2193 — 세션 격리 상태 저장 워크플로 상태입니다.
- 릴리스 검토 수정 사항 — 생성된 `[features].codex_hooks = true` 복원, 오래된 `hooks = true` 별칭 복구, 플러그인 모드 후크 신뢰 상태 보존, 릴리스 본문 기여자 앵커 복원.

## 검증 증거

| Gate | Result |
| --- | --- |
| Official Codex docs check | PASS — lifecycle hooks use `[features].codex_hooks = true`. |
| Local release-review gates | PASS — build, no-unused, targeted setup/config/uninstall/hook tests, native-agent verify, plugin-bundle verify, catalog-doc check, `cargo test`. |
| Main CI | PASS — run `25545439756` on `d1863f72` after rerun of transient `team-state-runtime` lane. |
| Release workflow | PASS — run `25546037771` built native assets, published GitHub release assets, smoke verified archives/global install, and published npm. |
| GitHub release | PASS — `v0.16.2`, non-draft, non-prerelease, 43 native assets. |
| npm | PASS — `npm view oh-my-codex version` returned `0.16.2`. |

## 메모

- 이전 릴리스 본문 텍스트에서는 릴리스 범위를 단지 Codex 후크 설정 차단기로 과소평가했습니다. 이 준비 기록과 릴리스 노트에는 이제 전체 `v0.16.1...v0.16.2` PR 인벤토리와 주요 `$ultragoal`/wiki/state 변경 사항이 나열되어 있습니다.
