# change-winapp Phase 11 구현 티켓

기준 문서: stage3-roadmap-winapp-v2.0.md
Phase 목표: 메모리/지식 엔진 구축

## ST3-WIN-101 장기 메모리 계층

- 우선순위: P0
- 재사용 우선 모듈: src/state/skill-active.ts, src/modes/base.ts, src/hooks/session.ts
- 확장 심볼: 사용자/레포/세션 스코프 모델, 선호/패턴 저장
- 신규 파일 생성: 금지
- 최소 변경 범위: 상태 모델 확장 + 저장 정책
- 계약 변경: MEMORY_SCOPE, MEMORY_ENTRY 스키마
- 완료 기준: 스코프 자동 분리 저장
- 검증 증거: 스코프 경계 테스트, 세션 재개 테스트

## ST3-WIN-102 프로젝트 지식 인덱서

- 우선순위: P0
- 재사용 우선 모듈: src/team/role-router.ts, src/cli/setup.ts, src/autoresearch/contracts.ts
- 확장 심볼: 입력원 수집기(prompts/skills/missions/docs/code), 증분 갱신기
- 신규 파일 생성: 금지
- 최소 변경 범위: 수집 + 인덱싱 + 증분 동기화
- 계약 변경: INDEX_SOURCE, INDEX_VERSION 필드
- 완료 기준: 변경 감지 후 증분 재인덱싱
- 검증 증거: 변경 감지/재색인 테스트

## ST3-WIN-103 RAG 근거 합성

- 우선순위: P1
- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/main/storage/*-history-repo.ts
- 확장 심볼: 문서 스코어러, freshness 판정기, 출처 블록 생성기
- 신규 파일 생성: 금지
- 최소 변경 범위: 검색 결과 병합 + 출력 모델
- 계약 변경: CITATION_BLOCK, FRESHNESS_SCORE
- 완료 기준: 출처 없는 주장 자동 경고
- 검증 증거: 근거 누락/오래된 근거 테스트

## ST3-WIN-104 메모리 품질 관리

- 우선순위: P1
- 재사용 우선 모듈: desktop/main/diag/maskers.ts, src/state/skill-active.ts
- 확장 심볼: 중복/상충 감지 규칙, 사용 이유 추적 필드
- 신규 파일 생성: 금지
- 최소 변경 범위: 품질 규칙 + 정리 워크플로
- 계약 변경: MEMORY_CONFLICT, MEMORY_REASON
- 완료 기준: 중복/상충 정리 가능 + 추적 가능
- 검증 증거: conflict 정리 테스트, 추적 필드 검증

## Phase 11 Exit Criteria

- ST3-WIN-101~104 완료
- 인덱스 stale 감지 + 수동 재인덱싱 경로 제공
- RAG 결과 근거/최신성 표기 동작

---

## Taiga 등록 섹션

### 등록 컨텍스트

- URL: http://20.194.2.62:9000/
- Project: AI-Isaki
- Epic: ST3-EP-03 (Memory & Knowledge Engine)
- Sprint: ST3-SP-11

### User Story 템플릿

```
제목: [ST3-WIN-10x] <항목명>
설명:
- 목표: <로드맵 목표 1문장>
- 재사용 우선 모듈: <module list>
- 확장 심볼: <symbol list>
- 신규 파일 생성: 금지 / 예외(근거 링크)
- 최소 변경 범위: 핵심 N파일, 테스트 N파일, 문서 N파일
- 계약 변경: <IPC/Event/Schema>
- 완료 기준: <2~3줄>
- 검증 증거: <typecheck/test/recovery>
```

### Task 템플릿

```
[구현] ST3-WIN-10x
- 변경 파일:
- 핵심 구현:

[검증] ST3-WIN-10x
- 자동 테스트:
- 수동 시나리오:

[문서/정합성] ST3-WIN-10x
- 매뉴얼/로드맵 반영:
- 계약 문서 반영:
```

### ST3-WIN별 US/Task 제목 초안

- ST3-WIN-101
	- US 제목: [ST3-WIN-101] 패널 렌더 상태머신 정규화(loading/stream/done/error)
	- Task 제목: [구현] ST3-WIN-101 renderer 상태 전이/중단 처리 단일화
	- Task 제목: [검증] ST3-WIN-101 race condition/중복 렌더 회귀 테스트
	- Task 제목: [문서] ST3-WIN-101 UI 상태 전이 다이어그램 반영
- ST3-WIN-102
	- US 제목: [ST3-WIN-102] Slash/Command tokenizer 일관성 유지
	- Task 제목: [구현] ST3-WIN-102 tokenizeInput 옵션 정책 정리
	- Task 제목: [검증] ST3-WIN-102 quote/escape/unterminated 케이스 테스트
	- Task 제목: [문서] ST3-WIN-102 명령 입력 규칙/예시 업데이트
- ST3-WIN-103
	- US 제목: [ST3-WIN-103] tool_call 표시/접기/카운트 정책 통일
	- Task 제목: [구현] ST3-WIN-103 history_list 집계/중복 표시 규칙 적용
	- Task 제목: [검증] ST3-WIN-103 tool_call replay 제외/카운트 시나리오 검증
	- Task 제목: [문서] ST3-WIN-103 사용자 안내(이력 의미/집계 기준) 반영
- ST3-WIN-104
	- US 제목: [ST3-WIN-104] 접근성/국제화 레이블 일관성 강화
	- Task 제목: [구현] ST3-WIN-104 aria-label/키보드 포커스 흐름 보강
	- Task 제목: [검증] ST3-WIN-104 ko/en 문자열 키 누락/회귀 검사
	- Task 제목: [문서] ST3-WIN-104 접근성 점검표 및 번역 가이드 업데이트

### Definition of Ready (DoR)

- [ ] 재사용 우선 모듈/확장 심볼이 명시됨
- [ ] 선행 의존 티켓 상태 확인 완료
- [ ] 계약 변경 항목(IPC/Event/Schema) 정의 완료
- [ ] 테스트 방법(자동/수동) 합의 완료
- [ ] 신규 파일 생성 필요 시 예외 근거 준비

### Definition of Done (DoD)

- [ ] 구현 완료 및 최소 변경 범위 준수
- [ ] 타입체크/테스트/복구 시나리오 통과
- [ ] Stage2 핵심 경로 회귀 없음 확인
- [ ] 증거(로그/테스트 결과/스크린샷) 첨부
- [ ] 티켓/문서/체크리스트 동기화 완료
