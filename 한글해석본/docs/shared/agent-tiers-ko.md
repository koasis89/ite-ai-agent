# 에이전트(Agent) 계층

이 파일은 OMX 에이전트 라우팅(Routing)에 대한 실용적인 계층 지침을 정의합니다.

## 정신 모델

OMX는 이제 세 가지 개념을 분리합니다.

- `role`: 에이전트가 담당하는 것(`executor`, `planner`, `architect`)
- `tier`: 지출할 추론/비용(`LOW`, `STANDARD`, `THOROUGH`)
- `posture`: 역할의 작동 방식(`frontier-orchestrator`, `deep-worker`, `fast-lane`)

역할을 사용하여 책임을 선택하고, 계층을 사용하여 깊이를 선택하고, 자세를 사용하여 운영 스타일을 선택하세요.

## 계층

- `LOW`:
  빠른 조회와 좁은 검사.
  간단한 탐색, 스타일 확인, 간단한 문서 편집에 사용합니다.
  일반적인 역할: `explore`, `style-reviewer`, `writer`.

- `STANDARD`:
  구현, 디버깅, 일반 검증을 위한 기본 계층입니다.
  일반적인 역할: `executor`, `debugger`, `test-engineer`, `quality-reviewer`.

- `THOROUGH`:
  아키텍처, 보안에 민감하거나 영향력이 큰 다중 파일 작업에 사용합니다.
  일반적인 역할: `architect`, `critic`, `security-reviewer`, `executor`.
  참고: `deep-executor`은 더 이상 사용되지 않습니다. 구현을 `executor`로 라우팅합니다.

## 선택 규칙

1. 대부분의 코드 변경은 `STANDARD`에서 시작하세요.
2. 작업이 제한적이고 비침습적인 경우에만 `LOW`을 사용하세요.
3. 다음의 경우 `THOROUGH`로 에스컬레이션하세요.
   - 보안/인증/신뢰 경계 변경
   - 시스템 전반에 영향을 미치는 아키텍처 결정
   - 여러 파일에 걸친 대규모 리팩터링
4. Ralph 완료 확인을 위해서는 최소한 `STANDARD` 아키텍트 검증을 사용하세요.

## 자세 지도

- `frontier-orchestrator`:
  - 조종 가능한 프론티어 모델과 리더 스타일 역할에 가장 적합합니다.
  - 의도 분류, 위임, 검증 및 아키텍처 판단을 우선시합니다.
  - 일반적인 역할: `planner`, `analyst`, `architect`, `critic`, `code-reviewer`.

- `deep-worker`:
  - 작업을 완료해야 하는 구현 중심 역할에 가장 적합합니다.
  - 직접 실행, 최소 차이, 엄격한 검증을 우선시합니다.
  - 일반적인 역할: `executor`, `debugger`, `test-engineer`, `build-fixer`.

- `fast-lane`:
  - 분류, 검색 및 좁은 합성에 사용되는 저렴하고 빠른 모델에 가장 적합합니다.
  - 심층적인 자율 작업보다 빠른 라우팅, 간결한 검색, 에스컬레이션을 우선시합니다.
  - 일반적인 역할: `explore`, `writer` 및 경량 연구/검색 전문가.
