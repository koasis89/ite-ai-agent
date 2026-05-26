---
평가자:
  명령: node scripts/eval-in-action-cat-shellout-demo.js
  형식: JSON
  keep_policy: pass_only
---
자동 조사 CLI 루프 정리 범위를 엄격하게 유지하세요.

허용된 변경 사항:
- `src/cli/autoresearch.ts`
- 필요한 경우 집중적인 자동 연구 테스트

피하다:
- 관련 없는 리팩터링
- 정리에서 요구되지 않는 한 미션/런타임 계약 변경
- 광범위한 문서 이탈

통과 결과는 쉘아웃이 제거되고 집중된 자동 연구 테스트가 통과된 결과입니다.
