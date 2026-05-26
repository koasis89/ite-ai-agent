# 연구 전문가 평가 인터페이스 - 2026-04-18

날짜: **2026-04-18**
범위: 문제 **#1712** — `researcher`, `dependency-expert` 및 `explore`에 대한 더욱 명확한 경계 및 핸드오프 회귀 적용 범위

## 이 검증 인터페이스이 보장하는 것

- 다음을 위한 대표적인 라우팅(Routing) 설비가 존재합니다.
  - `explore`
  - `researcher`
  - `dependency-expert`
  - 혼합된 `explore + researcher`
  - 혼합된 `explore + dependency-expert`
- 역할 출력 계약 확인은 다음을 주장합니다.
  - `researcher`은 소스 URL, 공식 문서 기본 설정 및 버전 메모 언어를 유지합니다.
  - `researcher`은 자동 종속성 비교 대신 선택한 기술 문서/행동 질문을 유지합니다.
  - `dependency-expert`은 후보 비교, 유지 관리/라이센스/위험 언어를 유지합니다.
  - `dependency-expert`은(는) 채택/업그레이드/교체/마이그레이션 결정을 소유하고 선택한 기술 문서 질문을 `researcher`에 다시 전달합니다.
  - `explore`은 로컬/읽기 전용으로 유지되고 절대 경로/관계 지침을 반환합니다.
  - `explore`은 repo-local 사실을 소유하고 외부 문서/종속성 권장 사항을 위쪽으로 전달합니다.

## 현재 회귀 인터페이스

| Surface | Files | Coverage |
|---|---|---|
| routing heuristics | `src/team/__tests__/role-router.test.ts` | direct role routing for local exploration, chosen-technology research, dependency evaluation, and mixed local-usage-plus-upgrade prompts |
| execution handoff staffing | `src/team/__tests__/followup-planner.test.ts` | mixed-lane staffing fixtures for `explore + researcher` and `explore + dependency-expert` |
| role output contracts | `src/hooks/__tests__/prompt-guidance-wave-two.test.ts` | prompt-level output-shape and boundary checks for the three specialist roles |

## 확인 명령

- `npm run build`
- `node --test dist/team/__tests__/role-router.test.js dist/team/__tests__/followup-planner.test.js dist/hooks/__tests__/prompt-guidance-wave-two.test.js`

## 고의적인 비목표

- 새로운 벤치마크 하네스 없음
- 실시간 웹 품질 점수 없음
- 기존 테스트 인터페이스 외에는 별도의 런타임/e2e 인프라가 없습니다.
