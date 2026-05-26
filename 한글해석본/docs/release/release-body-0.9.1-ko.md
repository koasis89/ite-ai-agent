# 오마이코덱스 v0.9.1

<p align="center">
  <img src="https://raw.githubusercontent.com/Yeachan-Heo/oh-my-codex/v0.9.1/docs/shared/omx-character-spark-initiative.jpg" alt="OMX character sparked for the Spark Initiative" width="720">
</p>

`0.9.1`은(는) 대상 Spark Initiative 핫픽스 릴리스입니다.

## 이 릴리스가 존재하는 이유

- `v0.9.0`은 역사적으로 빨간색으로 유지됩니다.
- 필수 패키지 설치 연기 수화 수정 사항은 나중에 PR [#806](https://github.com/Yeachan-Heo/oh-my-codex/pull/806)의 `dev`에 도착했습니다.
- `v0.9.1`은 해당 수정 사항이 적용된 `main`의 깨끗한 대체 릴리스입니다.

## 수정 사항이 포함됨

### 연기 수화 자산 현지화

이제 패키지 설치 연기 워크플로가 로컬 연기 작업 공간에서 수화 자산을 복사하고 확인하므로 릴리스 확인이 패키지 설치 동작과 더욱 안정적으로 일치합니다.

변경된 파일:
- `scripts/smoke-packed-install.mjs`
- `scripts/__tests__/smoke-packed-install.test.mjs`

## 현지 출시 확인 요약

`0.9.1`에 대해 계획된 로컬 릴리스에 중요한 검증:

- `node scripts/check-version-sync.mjs --tag v0.9.1`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run check:no-unused`
- `npm test`
- `node --test scripts/__tests__/smoke-packed-install.test.mjs`
- `npm run build:full`
- `npm run smoke:packed-install`
- `npm pack --dry-run`

## 역사적 메모

`v0.9.0`은 역사적으로 빨간색으로 유지됩니다. `v0.9.1`은 완전한 대체 릴리스입니다.
