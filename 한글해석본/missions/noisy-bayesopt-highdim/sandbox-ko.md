---
평가자:
  명령: PYTHONDONTWRITEBYTECODE=1 python3 scripts/eval-noisy-bayesopt-highdim.py
  형식: JSON
  keep_policy: 점수_개선
---
`playground/bayesopt_highdim_demo/`까지 범위를 엄격하게 유지하세요.

허용된 변경 사항:
- 검색 전략
- 획득 논리
- 활성 차원 논리
- 하이퍼파라미터 및 구성 검색
- 최적화를 직접 지원하는 경우 데모의 작은 구조적 리팩터링

피하다:
- 관련 없는 저장소 편집
- 새로운 Python 종속성 추가
- 단지 점수를 얻기 위해 평가 예산을 늘리는 것

이것을 더 어려운 연구 문제로 취급하십시오. 시끄러운 목표, 관련 없는 많은 차원, 제한된 평가, 탐색, 활용 및 차원 처리 간의 실제 균형.
