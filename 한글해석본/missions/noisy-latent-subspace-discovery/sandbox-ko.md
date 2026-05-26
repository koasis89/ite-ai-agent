---
평가자:
  명령: PYTHONDONTWRITEBYTECODE=1 python3 scripts/eval-noisy-latent-subspace-discovery.py
  형식: JSON
  keep_policy: 점수_개선
---
`playground/bayesopt_latent_discovery_demo/`까지 범위를 엄격하게 유지하세요.

허용된 변경 사항:
- 검색 전략
- 스크리닝/구조발견 로직
- 획득 논리
- 하이퍼파라미터 및 구성 검색
- 최적화를 직접 지원하는 경우 데모의 작은 구조적 리팩터링

피하다:
- 관련 없는 저장소 편집
- 새로운 Python 종속성 추가
- 단지 점수를 얻기 위해 평가 예산을 늘리는 것

이를 명시적 활성 차원 검색보다 더 어려운 연구 문제로 간주합니다. 유용한 방향은 잠재 구조를 통해 혼합되고, 목표는 잡음이 많으며, 솔루션은 유한한 예산 하에서 유용한 좌표 또는 부분 공간을 찾아야 합니다.
