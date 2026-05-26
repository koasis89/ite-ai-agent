# 사명
이 저장소 내에서 Kaggle 스타일의 표 형식 분류 파이프라인을 최적화합니다.

목표:
고정된 결정론적 검증 분할에서 `playground/ml_kaggle_demo/` 데모 모델의 기준 ROC AUC를 개선합니다.

주요 대상:
- `playground/ml_kaggle_demo/config.json`
- `playground/ml_kaggle_demo/model_factory.py`
- `playground/ml_kaggle_demo/train.py`

성공은 다음을 의미합니다.
1. 평가자 점수(ROC AUC)는 현재 유지된 기준보다 향상됩니다.
2. 솔루션은 결정적이고 재현 가능하게 유지됩니다.
3. 관련 없는 저장소 편집보다는 모델 아키텍처/기능 파이프라인 선택에 변경 사항이 계속 집중됩니다.
