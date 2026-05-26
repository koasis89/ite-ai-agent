# 릴리스 노트 — 0.13.1

## 요약

`0.13.1`은 분리된 대화형 Codex 시작을 복원하는 `0.13.0` 이후의 집중된 핫픽스 릴리스입니다.

## 결정된

- **분리된 tmux 시작은 더 이상 Codex stdin을 삭제하지 않습니다** — 분리된 리더 래퍼는 이제 Codex를 배경화하는 동안 stdin을 유지하므로 `omx --madmax --high`과 같은 대화형 분리 실행은 더 이상 시작 시 즉시 종료되지 않습니다. (PR [#1631](https://github.com/Yeachan-Heo/oh-my-codex/pull/1631), 이슈 [#1627](https://github.com/Yeachan-Heo/oh-my-codex/issues/1627), [#1628](https://github.com/Yeachan-Heo/oh-my-codex/issues/1628))
- **분리 실행 회귀 적용 범위** - 이제 CLI 회귀 테스트에서는 분리된 리더 명령이 리더 정리 의미 체계를 유지하면서 Codex 하위에 대해 stdin을 열어두는 것으로 확인합니다.

## 검증 증거

릴리스 확인 증거는 `docs/qa/release-readiness-0.13.1.md`에 기록됩니다.

- `npm run build` ✅
- `npx biome lint src/cli/index.ts src/cli/__tests__/index.test.ts` ✅
- `node --test dist/cli/__tests__/index.test.js dist/cli/__tests__/launch-fallback.test.js` ✅

## 남은 위험

- 이는 전체 GitHub Actions 매트릭스 재실행이 아닌 좁은 로컬 핫픽스 패스입니다.
- 가장 강력한 증거는 집중된 회귀 범위와 정확한 분리 래퍼 차이입니다. 이 컷은 릴리스 전에 별도의 패키지 macOS 설치에서 재검증되지 않았습니다.
