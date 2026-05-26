# `omx autoresearch` 심층 인터뷰 UX 리뷰 노트

날짜: 2026-03-17
리뷰어 파트: 작업자-3

## 검토된 범위

현재 구현 및 운영자 관련 문서를 다음과 비교했습니다.

- `.omx/plans/prd-autoresearch-ux-deep-interview.md`
- `.omx/plans/test-spec-autoresearch-ux-deep-interview.md`

검토된 파일:

- `src/cli/autoresearch.ts`
- `src/cli/autoresearch-guided.ts`
- `src/cli/__tests__/autoresearch-guided.test.ts`
- `src/cli/__tests__/autoresearch.test.ts`
- `skills/deep-interview/SKILL.md`
- `README.md`
- `docs/contracts/autoresearch-command-contract.md`
- 작업자-2의 진행 중인 계약 테스트 델타: `src/hooks/__tests__/deep-interview-contract.test.ts`

## 현황

**상태:** PRD/테스트 사양 동작은 검토된 분기에서 아직 구현되지 않았습니다.

현재 코드는 여전히 이전의 초기화 흐름을 반영합니다.

- 인수가 없는 `omx autoresearch`은 `guidedAutoresearchSetup()`을 입력하고 즉시 원시 평가자 명령을 요청합니다.
- 베어 `init`은 여전히 ​​명시적인 초보자 호환성 브리지 대신 동일한 안내 경로로 라우팅(Routing)됩니다.
- 자동 연구 전용 접수 모듈, 정식 `.omx/specs/deep-interview-autoresearch-{slug}.md` 아티팩트 및 확인/정제 실행 게이트가 없습니다.
- 안내 설정이 반환된 후에도 여전히 실행이 즉시 발생합니다.
- README/도움말/계약 문서에는 여전히 Thin-Supervisor 런타임이 설명되어 있지만 이 PRD의 새로운 초보자 심층 인터뷰 흡입 인터페이스은 설명되어 있지 않습니다.

## 관찰된 증거

### 코드 경로 발견 항목
- `src/cli/autoresearch.ts`
  - `parseAutoresearchArgs()`은 인수 없음 안내 모드인 `init`, `--resume` 및 `<mission-dir>`만 인식합니다.
  - 최상위 `--topic/--evaluator/--keep-policy/--slug` 시드된 초보자 플래그는 라우팅되지 않습니다.
  - 안내/초기 흐름은 미션 생성 직후에도 여전히 `spawnAutoresearchTmux()`을 호출합니다.
- `src/cli/autoresearch-guided.ts`
  - `guidedAutoresearchSetup()`은(는) 여전히 `Evaluator command`에 대한 직접 메시지를 표시합니다.
  - `parseSandboxContract()` 이후에는 자리 표시자/준비 거부가 없습니다.
  - `.omx/specs/` 아래에는 초안 아티팩트가 작성되지 않습니다.
- `skills/deep-interview/SKILL.md`
  - 일반 실행 브리지는 존재하지만 PRD에서 요구하는 자동 연구 전문화 섹션은 이 분기에 없습니다.

### 테스트/문서 정렬 결과
- `src/cli/__tests__/autoresearch-guided.test.ts`
  - 이전 초기화/안내 흐름에 대한 미션/스캐폴드 생성 및 플래그 구문 분석만 다룹니다.
- `src/cli/__tests__/autoresearch.test.ts`
  - 여전히 이전 `omx autoresearch init [--topic ...]` 도움말 인터페이스과 비대화형 `mission-dir is required` 실패를 주장합니다.
- 작업자-2에는 `src/hooks/__tests__/deep-interview-contract.test.ts`에서 예상되는 심층 인터뷰 전문화 텍스트를 올바르게 잠그기 시작하는 진행 중인 테스트 추가가 있습니다.

## PRD 체크리스트 평가

### 1. 평가자 기초 지식 없이 막연한 목표의 초보자 섭취
**현재 분기에서 실패합니다.**
첫 번째 안내 프롬프트에서는 여전히 구체적인 평가자 셸 명령을 요청합니다.

### 2. Autoresearch 전용 심층인터뷰/정제 브릿지
**현재 분기에서 실패합니다.**
자동 연구별 정제 루프나 시드된 초보자 브리지가 존재하지 않습니다.

### 3. `.omx/specs/deep-interview-autoresearch-{slug}.md`의 정식 초안 아티팩트
**현재 분기에서 실패합니다.**
`.omx/specs/` 초안 아티팩트는 생성되지 않습니다.

### 4. 명시적인 `refine further` 대 `launch` 확인 경계
**현재 분기에서 실패합니다.**
안내 설정은 출시 준비 임무 데이터를 반환하고 tmux 실행은 즉시 발생합니다.

### 5. 출시 전 자리표시자 평가자 거부
**현재 분기에서 실패합니다.**
자리 표시자 평가자 명령에는 차단 패턴 게이트가 없습니다.

### 6. 최상위 시드 초보자 플래그(`--topic`, `--evaluator`, `--keep-policy`, `--slug`)
**현재 분기에서 실패합니다.**
이러한 플래그는 최상위 수준에서 허용되지 않습니다. 오늘은 `init`만 구문 분석합니다.

### 7. 전문가 흐름 보존(`<mission-dir>`, `init --flags`, `--resume`)
**현재 분기를 전달합니다.**
기존 전문가/런타임 흐름은 그대로 유지됩니다.

### 8. 초보자 별칭으로 문서화된 베어 `omx autoresearch init`
**현재 분기에서 실패합니다.**
Bare `init`은 안내 모드로 라우팅되지만 도움말/문서에서는 PRD에 필요한 호환성 의미를 설명하지 않습니다.

### 9. 비대화형 no-arg 실패가 보존됩니다.
**현재 분기를 전달합니다.**
TTY 가드는 여전히 인수가 없는 비대화형 호출을 거부합니다.

### 10. 인터뷰/초안/경로 확인에 대한 회귀 적용 범위
**현재 분기에서 실패합니다.**
해당 테스트는 아직 존재하지 않습니다.

## 구현이 완료되면 문서 후속 조치

1. 새로운 초보자 진입 인터페이스으로 `README.md`을 업데이트합니다.
   - `omx autoresearch` 심층인터뷰 스타일의 개선 흐름으로
   - 최상위 시드 초보자 플래그
   - 명시적인 실행 전 확인 동작
2. 다음을 추가하려면 `docs/contracts/autoresearch-command-contract.md`을 업데이트하세요.
   - 표준 초안 아티팩트 경로
   - 출시 준비 자리 표시자 거부 규칙
   - 브릿지 의미론 확인/정제
3. PRD 필수 `Autoresearch specialization` 섹션과 필수 아티팩트 표제를 사용하여 `skills/deep-interview/SKILL.md`을 확장합니다.
4. 초보자 개선 모드와 전문가 `init --flags` / `<mission-dir>` / `--resume` 흐름 간의 분할에 대한 도움말 텍스트를 명시적으로 유지하세요.

## 리뷰어 결론

이 검토 파트은 현재 분기가 기존 자동 조사 런타임 동작을 유지하지만 아직 심층 인터뷰 UX 향상 PRD를 만족하지 **않음**을 확인할 수 있습니다. 따라서 가장 유용한 단기 검토 결과는 이 기본 격차 평가와 위의 문서 체크리스트입니다. 작업자-1이 구현을 시작하면 이 파일은 최종 통과/실패 검토 및 확인 증거로 새로 고쳐져야 합니다.
