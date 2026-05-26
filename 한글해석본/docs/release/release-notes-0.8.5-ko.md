# 오마이코덱스 v0.8.5

출시일: 2026-03-06

`v0.8.4..dev`의 비병합 커밋 7개.
기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@sjals93](https://github.com/sjals93).

## 하이라이트

### 상태 인식 에이전트(Agent) 라우팅(Routing)(실험적)

이제 에이전트는 세 가지 차원을 구분하는 Sisyphus 스타일의 상태 메타데이터를 전달합니다.

- **역할**: 에이전트 책임(`executor`, `planner`, `architect`)
- **계층**: 추론 깊이/비용(`LOW`, `STANDARD`, `THOROUGH`)
- **자세**: 작동 스타일(`frontier-orchestrator`, `deep-worker`, `fast-lane`)

`omx setup` 이후 `~/.omx/agents/`의 기본 에이전트 구성에는 새 섹션이 포함됩니다.
`## OMX Posture Overlay`, `## Model-Class Guidance` 및 `## OMX Agent Metadata`.

대표 라우팅:
- `planner` / `architect` / `critic` -> `frontier-orchestrator`
- `executor` / `build-fixer` / `test-engineer` -> `deep-worker`
- `explore` / `writer` -> `fast-lane`

PR: [#588](https://github.com/Yeachan-Heo/oh-my-codex/pull/588), [#592](https://github.com/Yeachan-Heo/oh-my-codex/pull/592)([@HaD0Yun](https://github.com/HaD0Yun))

## 버그 수정

### Windows ESM 가져오기 충돌

`import()`이 `file://` URL 대신 순수 절대 경로(`C:\...`)를 수신했기 때문에 `ERR_UNSUPPORTED_ESM_URL_SCHEME`이 있는 Windows에서 `bin/omx.js`이(가) 실패했습니다.

수정: 동적 가져오기 전에 `url.pathToFileURL()`을 통해 확인된 경로를 `file://` URL로 변환합니다.

홍보: [#589](https://github.com/Yeachan-Heo/oh-my-codex/pull/589) ([@sjals93](https://github.com/sjals93))
수정: [#557](https://github.com/Yeachan-Heo/oh-my-codex/issues/557)

### tmux 캡처 창은 빈 출력을 반환합니다.

`capture-pane`은 `-S -<N>` 대신 `-l <N>`(잘못된 플래그 사용)으로 호출되었으므로 최근 터미널 출력이 캡처되지 않았습니다. 이로 인해 HUD 최근 출력 표시 및 알림 콘텐츠 추출이 중단되었습니다.

수정: 마지막 N 줄을 캡처하기 위한 올바른 tmux API인 `-S -<N>`(음수 시작 줄 오프셋)을 사용하세요.

홍보: [#593](https://github.com/Yeachan-Heo/oh-my-codex/pull/593)
수정: [#591](https://github.com/Yeachan-Heo/oh-my-codex/issues/591)

### 레거시 모델 별칭 유출

15개의 프롬프트 파일과 런타임 기본 구성 생성기는 v0.8.2의 구성 계층에서 제거된 `gpt-5.3-codex` 및 `o3` 모델 별칭을 계속 참조했습니다. 상태 라우팅이 활성화되면 이러한 오래된 참조가 계층/모델 클래스 지침을 혼동할 수 있습니다.

수정: 프롬프트 및 `definitions.ts` 메타데이터에서 모든 레거시 별칭 참조를 제거했습니다.

PR의 일부: [#592](https://github.com/Yeachan-Heo/oh-my-codex/pull/592)([@HaD0Yun](https://github.com/HaD0Yun))

## 기타 변경사항

- README에 유지관리자 섹션을 추가했습니다([@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun)).
- 문서에 벤치마크 비교 스크린샷을 추가했습니다(`docs/benchmarks/`).

## 전체 커밋 로그(v0.8.4..v0.8.5)

```
07e2cfd chore: bump version to 0.8.5 and add maintainers to README
9bbe1e8 fix(notifications): use valid tmux capture-pane history flag
0ae60af docs(bench): add benchmark comparison screenshot
2f4862a docs(omx): remove remaining legacy model alias references
0d2115c fix(omx): remove legacy model aliases from prompts and runtime metadata
8fb3aa0 fix(bin): use file:// URL for dynamic import on Windows
f448108 feat(omx): add posture-aware agent routing metadata
```
