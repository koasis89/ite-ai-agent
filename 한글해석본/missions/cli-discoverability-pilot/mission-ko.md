# 임무: CLI 검색 가능성 강화

다음에 중점을 두고 OMX CLI 전체에서 명령 검색 가능성을 개선합니다.
- 최상위 도움말
- 중첩된 도움말 라우팅(Routing)
- 스파크셸 검색 가능성
- 세션 검색 검색 가능성

## 목표
도움말 텍스트만으로 올바른 CLI 표면을 찾으려고 할 때 운영자의 성공을 향상시키는 가장 작은 변경 사항을 찾으십시오.

## 중점 분야
- `README.md`
- `src/cli/index.ts`
- `src/cli/__tests__/index.test.ts`
- `src/cli/__tests__/nested-help-routing.test.ts`
- `src/cli/__tests__/sparkshell-cli.test.ts`
- `src/cli/__tests__/session-search-help.test.ts`

## 원하는 출력
다음과 같은 컴팩트한 개선 세트를 생성합니다.
1. 기존 명령 라우팅 의미 체계를 유지합니다.
2. 도움말 명확성/검색 가능성 향상
3. 타겟 CLI 검색 가능성 테스트를 녹색으로 유지

## 성공 힌트
- 작은 도움말 텍스트 또는 라우팅 명확성 변경을 선호합니다.
- 관련 없는 명령 동작으로 범위를 확대하지 마십시오.
- 검색 가능성 개선을 위해 정렬된 편집이 필요한 경우를 제외하고 기존 문서/계약을 보존합니다.
