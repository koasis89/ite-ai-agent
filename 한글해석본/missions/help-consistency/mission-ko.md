# 사명
CLI 도움말 텍스트, 호환성 고정 장치 및 테스트가 모두 동일한 `omx autoresearch` 단어를 설명하도록 실패한 도움말 일관성 회귀를 수정합니다.

주요 대상:
- `src/cli/__tests__/session-search-help.test.ts`

정렬이 필요할 수 있는 지지 표면:
- `src/cli/index.ts`
- `src/compat/fixtures/help.stdout.txt`
- 필요한 경우 관련 도움말 라우팅(Routing)/도움말 계약 테스트

성공은 다음을 의미합니다.
1. `node --test dist/cli/__tests__/session-search-help.test.js` 통과
2. `omx autoresearch`에 대한 최상위 도움말 문구는 소스, 내장된 출력 예상 및 고정 장치 전반에서 내부적으로 일관됩니다.
3. 관련 없는 CLI 도움말 동작이 재발되지 않습니다.
