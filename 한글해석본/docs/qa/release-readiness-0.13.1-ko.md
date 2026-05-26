# 릴리스 준비 평가 - 0.13.1

날짜: **2026-04-16**
대상 버전: **0.13.1**
비교 기준: **`v0.13.0..origin/dev`**
평결: **GO** ✅

`0.13.1`은 `0.13.0`에 도입된 분리된 tmux stdin 시작 회귀를 위한 좁은 핫픽스 릴리스입니다.

## 검토된 범위

### 분리된 시작 회귀
- `src/cli/index.ts` — 분리된 리더 래퍼 시작 경로
- `src/cli/__tests__/index.test.ts` — 분리된 리더 표준 입력 보존 회귀 적용 범위

### 자료 공개
- `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`
- `CHANGELOG.md`, `RELEASE_BODY.md`
- `docs/release-notes-0.13.1.md`

## 검증 증거

| Check | Command | Result |
|---|---|---|
| Build | `npm run build` | PASS |
| Targeted lint | `npx biome lint src/cli/index.ts src/cli/__tests__/index.test.ts` | PASS |
| Targeted regression tests | `node --test dist/cli/__tests__/index.test.js dist/cli/__tests__/launch-fallback.test.js` | PASS |

## 위험 평가

- 코드 차이점은 의도적으로 범위를 좁히고 분리된 리더 래퍼와 집중 테스트로 지역화되었습니다.
- 이는 릴리스에 중요한 시작 수정 사항입니다. 더 광범위한 매트릭스 검증은 태그에 의해 트리거된 릴리스 워크플로에 위임됩니다.

## 최종 평결

릴리스 **0.13.1**은 위의 목표 핫픽스 검증 통과를 기반으로 **`origin/dev`**에서 커밋/태그 컷을 릴리스할 준비가 되었습니다.
