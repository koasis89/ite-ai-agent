# 오마이코덱스 v0.8.7

출시일: 2026-03-08

`v0.8.6..dev`의 비병합 커밋 12개.
기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo), [@HaD0Yun](https://github.com/HaD0Yun), [@marlocarlo](https://github.com/marlocarlo).

## 하이라이트

### 신속한 시스템 계약 정리 및 XML 정규화

이제 OMX의 지침 화면에는 루트 오케스트레이터, 템플릿, 생성된 지침 및 프롬프트 카탈로그 전반에 걸쳐 더욱 깔끔한 공유 계약이 있습니다.

이번 릴리스:
- 신속한 지침 계약 검증을 중앙 집중화합니다.
- 재사용 가능한 프롬프트 안내 조각과 동기화 스크립트를 추출합니다.
- 에이전트(Agent) 프롬프트 카탈로그를 마크다운 스타일 제목에서 XML 태그 구조로 변환합니다.
- 문서와 템플릿의 2계층 오케스트레이터/역할 프롬프트 모델을 명확히 합니다.
- GPT-5.4 신속한 안내 계약을 저장소에 직접 문서화합니다.

대표홍보:
- [#619](https://github.com/Yeachan-Heo/oh-my-codex/pull/619) — XML 태그 프롬프트 마이그레이션
- [#620](https://github.com/Yeachan-Heo/oh-my-codex/pull/620) — 신속한 안내 계약 문서
- [#623](https://github.com/Yeachan-Heo/oh-my-codex/pull/623) — 2계층 오케스트레이터/역할 프롬프트 문서
- [#625](https://github.com/Yeachan-Heo/oh-my-codex/pull/625) — 리더 전용 오케스트레이션 경계

### team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 강화

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 오케스트레이션은 만료된 클레임 복구, 작업 트리 위생 및 더 강력한 회귀 적용 범위에 초점을 맞춘 강화 패스를 받았습니다.

주목할만한 효과:
- 임대 만료 시 더욱 안전한 청구 회복 행동
- 더 나은 작업 트리 정리 및 위생 경로
- 더 넓은 런타임/상태/작업 트리/종단 간 회귀 범위
- 전용 강화 벤치마크 스크립트

홍보: [#624](https://github.com/Yeachan-Heo/oh-my-codex/pull/624)

### MCP 서버 stdio 분해 통합

OMX의 MCP stdio 진입점은 이제 각 서버에서 원시 전송 부트스트랩 논리를 복제하는 대신 하나의 멱등성 종료 경로를 공유합니다.

이번 릴리스:
- `src/mcp/bootstrap.ts`에 `autoStartStdioMcpServer`을 추가합니다.
- 상태, 메모리, 코드 인텔, 추적 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) MCP 진입점을 공유 도우미로 마이그레이션합니다.
- 하나의 수명 주기 경로를 통해 stdin close, Transport close, `SIGTERM` 및 `SIGINT`을 라우팅(Routing)합니다.
- MCP 서버 진입점 전반에 걸쳐 유휴 해제에 대한 회귀 적용 범위를 추가합니다.

PR: [#626](https://github.com/Yeachan-Heo/oh-my-codex/pull/626), [#627](https://github.com/Yeachan-Heo/oh-my-codex/pull/627)

### npm global-install bin 계약 수정

이 릴리스에는 전역 설치 동작에 대한 최종 패키징 수정 사항도 포함되어 있습니다.

그것:
- `package.json`에 게시된 npm bin 경로 계약을 수정합니다.
- `src/cli/__tests__/package-bin-contract.test.ts`을 추가하여 전역 설치 `omx` 진입점이 CI에 포함되도록 유지합니다.

홍보: [#633](https://github.com/Yeachan-Heo/oh-my-codex/pull/633)

## 버그 수정 및 운영 개선

### Windows/tmux 기능 처리

OMX는 플랫폼이 `win32`이기 때문에 더 이상 기본 Windows를 차단하지 않습니다.

대신 지금은 다음과 같습니다.
- 실제 tmux 기능을 확인합니다.
- `psmux` 지원
- Windows에서 적절한 경우 `where`을 사용합니다.
- README에 플랫폼별 설정 경로를 더 명확하게 문서화합니다.

홍보: [#616](https://github.com/Yeachan-Heo/oh-my-codex/pull/616)

### 빠른 경로 에이전트 상태 코디네이션(Coordination)

분석가, 플래너 및 기타 빠른 경로 에이전트 기본값은 경량 작업을 위한 의도된 라우팅 상태에 더 잘 일치하도록 하향 코디네이션(Coordination)되었습니다.

커밋:
- `3c461ba` 잡일: 하위 분석가 및 기획자의 추론 노력
- `4a93de1` 잡일: 빠른 경로 에이전트 추론 노력 감소

## 통계 비교

- 커밋 창: **12개의 비병합 커밋**(`2026-03-07` ~ `2026-03-08`)
- 차이점 스냅샷(`v0.8.6...dev`): **91개 파일 변경됨, +3,486 / -1,747**

## 전체 커밋 로그(`v0.8.6..dev`)

```text
3a42dc6 refactor: centralize prompt guidance contract validation
9b3b336 fix(platform): replace win32 hard-block with tmux capability check; add psmux support
379f52e refactor: extract shared prompt guidance fragments
9ab2f55 refactor: convert all agent prompts from Markdown headers to XML tag structure
e53c915 docs: document GPT-5.4 prompt guidance contract (#620)
3c461ba chore: lower analyst and planner reasoning effort
4a93de1 chore: lower fast-path agent reasoning effort
810549a docs(prompt): clarify 2-layer orchestrator and role prompt model
7b193d7 fix(prompts): enforce leader-only orchestration boundaries
adcc5b6 feat(team): harden expired-claim recovery and worktree hygiene (#624)
577c416 fix(mcp): centralize stdio lifecycle teardown for OMX servers (#626) (#627)
50619d7 Fix npm bin path contract for global install (#633)
```
