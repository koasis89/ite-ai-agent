---
평가자:
  명령: python3 scripts/eval-adaptive-sort-optimization.py
  형식: JSON
  keep_policy: 점수_개선
---
`playground/adaptive_sort_demo/`까지 범위를 엄격하게 유지하세요.

허용된 변경 사항:
- 하이브리드 정렬 디스패치 논리
- 임계값 코디네이션(Coordination)
- 경량 결정론적 휴리스틱
- 최적화를 직접 지원하는 작은 구조 정리

피하다:
- 관련 없는 저장소 변경
- 새로운 종속성 추가
- 점수를 더 쉽게 만들기 위해서만 벤치마크 사례를 변경합니다.

이를 알고리즘 엔지니어링 작업으로 처리합니다. 벤치마크 결정성을 유지하고 혼합 데이터 분포 전반에 걸쳐 가중치 비용을 개선합니다.
