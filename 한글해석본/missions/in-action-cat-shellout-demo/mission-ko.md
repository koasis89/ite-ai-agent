# 사명
`runAutoresearchLoop()` 내부의 `cat`에 대한 불필요한 쉘아웃을 제거하여 OMX 자동 조사 자체를 최적화합니다.

주요 대상:
- `src/cli/autoresearch.ts`

업데이트가 필요할 수 있는 지원 표면:
- `src/cli/__tests__/autoresearch.test.ts`
- 필요한 경우에만 기타 집중적인 자동 연구 테스트

성공은 다음을 의미합니다.
1. `runAutoresearchLoop()`은 더 이상 매니페스트/실행 ID를 읽기 위해 `cat`에 쉘 아웃하지 않습니다.
2. 자동 조사 CLI/런타임 테스트는 여전히 통과합니다.
3. 변화는 작고 행동을 보존합니다.
