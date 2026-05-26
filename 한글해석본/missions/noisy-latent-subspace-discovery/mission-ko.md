# 사명
유용한 구조가 명백한 활성 좌표로 노출되지 않고 잠재되어 있는 시끄러운 고차원 블랙박스 검색 문제를 최적화합니다.

목표:
목표가 직접 명명된 정보 차원 대신 숨겨진 혼합 방향에 따라 달라지더라도 고정된 평가 예산 하에서 `playground/bayesopt_latent_discovery_demo/`의 현재 유지 점수를 능가합니다.

주요 대상:
- `playground/bayesopt_latent_discovery_demo/config.json`
- `playground/bayesopt_latent_discovery_demo/optimizer.py`
- `playground/bayesopt_latent_discovery_demo/run_search.py`
- `playground/bayesopt_latent_discovery_demo/problem.py`

성공은 다음을 의미합니다.
1. 평가자 점수는 현재 유지된 기준보다 향상됩니다.
2. 전략은 결정적이고 예산을 존중합니다.
3. 검색은 순진한 무작위 검색보다 잠재 구조를 더 잘 처리합니다.
