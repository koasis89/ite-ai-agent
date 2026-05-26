# 릴리스 노트 — 0.14.4

## 요약

`0.14.4`은 정확한 `gpt-5.4-mini` 표준/미니 이음새와 `gpt-5.3-codex-spark` 스파크 파트을 의도적으로 유지하면서 기본 프론티어 파트을 `gpt-5.4`에서 `gpt-5.5`으로 승격시키는 `0.14.3` 이후의 패치 릴리스입니다.

## 하이라이트

- 런타임 기본값, Codex 에이전트(Agent) 기본값 및 `omx explore` 대체 동작은 이제 프론티어 파트을 `gpt-5.5`로 확인합니다. 설정 및 실행 작업자 추론 기본값은 이제 높음 대신 중간을 사용합니다.
- 설정/구성 시드 문서 및 회귀 적용 범위는 이제 기존 `model_context_window = 250000` 및 `model_auto_compact_token_limit = 200000` 권장 사항을 사용하여 `gpt-5.5`을 설명합니다.
- 정확히 일치하는 `gpt-5.4-mini` 동작은 변경되지 않습니다.
- Spark 기본값은 `gpt-5.3-codex-spark`에 유지됩니다.
- 릴리스/패키지 메타데이터는 `0.14.4` 컷에 맞춰 정렬됩니다.

## 호환성

- 사용자 마이그레이션이 필요하지 않습니다.
- 기존 `gpt-5.4-mini` 및 `gpt-5.3-codex-spark` 재정의는 현재 의미를 유지합니다.
- 새로운/기본 프론티어 관리 구성 경로는 이제 `gpt-5.5`을 선호합니다.

## 확인

- `npm run build` ✅
- 모델/기본 변경을 위한 대상 노드 제품군 ✅
- `npm run lint`, `npm run check:no-unused` 및 `cargo test --workspace`가 이 분기에서 앞서 통과되었습니다 ✅
- 전체 `npm test`은 최종 빠른 경로 실행기 추론 코디네이션(Coordination) 후에 의도적으로 다시 실행되지 않았습니다.

릴리스 확인 증거는 `docs/qa/release-readiness-0.14.4.md`에 기록됩니다.
