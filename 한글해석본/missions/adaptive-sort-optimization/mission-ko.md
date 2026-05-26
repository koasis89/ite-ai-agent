# 사명
여러 결정론적 입력 분포에 걸쳐 적응형 정렬 전략을 최적화합니다.

목표:
모든 벤치마크 사례에서 올바른 정렬을 유지하면서 `playground/adaptive_sort_demo/`에 대한 평가자 점수를 향상시킵니다.

주요 대상:
- `playground/adaptive_sort_demo/config.json`
- `playground/adaptive_sort_demo/sort_benchmark.py`

성공은 다음을 의미합니다.
1. 가중 비용 점수는 현재 유지된 기준보다 향상됩니다.
2. 모든 벤치마크 사례에 대해 정확성 유지
3. 전략은 여전히 ​​가볍고 결정적입니다.
