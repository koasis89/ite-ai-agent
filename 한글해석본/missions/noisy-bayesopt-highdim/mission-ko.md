# 사명
고정된 평가 예산으로 시끄러운 고차원 블랙박스 검색 문제를 최적화합니다.

목표:
몇 가지 차원만 유익하고 관측값에는 잡음이 많은 `playground/bayesopt_highdim_demo/` 벤치마크에서 현재 유지된 점수를 능가합니다.

주요 대상:
- `playground/bayesopt_highdim_demo/config.json`
- `playground/bayesopt_highdim_demo/optimizer.py`
- `playground/bayesopt_highdim_demo/run_search.py`
- `playground/bayesopt_highdim_demo/problem.py`

성공은 다음을 의미합니다.
1. 평가자 점수는 현재 유지된 기준보다 향상됩니다.
2. 솔루션은 여전히 ​​결정적이고 예산을 고려합니다.
3. 검색 전략은 순진한 무작위 검색보다 차원의 저주를 더 잘 처리합니다.
