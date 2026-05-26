# change-winapp Phase 12 구현 티켓

기준 문서: stage3-roadmap-winapp-v2.0.md
Phase 목표: 자율 워크플로 오케스트레이션

## ST3-WIN-111 작업 큐/스케줄러

- 우선순위: P0
- 재사용 우선 모듈: src/team/team-ops.ts, src/team/runtime.ts
- 확장 심볼: 우선순위 큐, 동시성 제한, 취소/재개 API
- 신규 파일 생성: 금지
- 최소 변경 범위: 큐 상태 + 실행 루프
- 계약 변경: QUEUE_STATE, TASK_LEASE
- 완료 기준: 장시간 작업 안정 수행
- 검증 증거: 취소/재개/병렬 제한 테스트

## ST3-WIN-112 체크포인트/재개

- 우선순위: P0
- 재사용 우선 모듈: src/modes/base.ts, src/state/workflow-transition.ts, desktop/main/first-run/state.ts
- 확장 심볼: 단계 스냅샷 저장/복원
- 신규 파일 생성: 금지
- 최소 변경 범위: 영속 상태 + 복원 엔트리
- 계약 변경: CHECKPOINT_META 스키마
- 완료 기준: 앱 재시작 후 이어서 실행
- 검증 증거: 재시작 복원 테스트

## ST3-WIN-113 멀티에이전트 협업 UI

- 우선순위: P1
- 재사용 우선 모듈: src/team/runtime.ts, src/team/team-ops.ts, desktop/renderer/chat/*
- 확장 심볼: 역할별 진행률, 산출물 비교, 충돌 표시
- 신규 파일 생성: 금지
- 최소 변경 범위: 상태 투영 + UI 컴포넌트
- 계약 변경: AGENT_ROLE_STATUS
- 완료 기준: planner/executor/reviewer 가시화
- 검증 증거: 상태 동기화/충돌 표시 테스트

## ST3-WIN-114 실패 복구 플레이북

- 우선순위: P0
- 재사용 우선 모듈: desktop/main/updater/updater.ts, src/state/workflow-transition.ts, desktop/ipc/question.ts
- 확장 심볼: 실패 유형별 재시도/대체 경로/질의 흐름
- 신규 파일 생성: 금지
- 최소 변경 범위: 복구 규칙 + 사용자 질문 루프
- 계약 변경: RECOVERY_PLAN, BLOCK_REASON
- 완료 기준: 반복 실패 임계치 초과 시 강제 차단
- 검증 증거: 실패 주입/복구 경로 테스트

## ST3-WIN-115 Human-in-the-loop 강화

- 우선순위: P1
- 재사용 우선 모듈: desktop/renderer/permissions/PermissionDialog.ts, desktop/main/permissions/permission-broker.ts, desktop/ipc/question.ts
- 확장 심볼: 영향 diff, 부작용, 롤백 계획 카드
- 신규 파일 생성: 금지
- 최소 변경 범위: 승인 모델 + 다이얼로그 확장
- 계약 변경: APPROVAL_CONTEXT 스키마
- 완료 기준: 승인 시 근거 정보 동시 제공
- 검증 증거: 승인 UX 테스트, 거부/재질문 루프 테스트

## Phase 12 Exit Criteria

- ST3-WIN-111~115 완료
- 큐/체크포인트/복구/승인 경로 통합 동작
- 부분 성공/남은 블로커 구조화 표시

---

## Taiga 등록 섹션

### 등록 컨텍스트

- URL: http://20.194.2.62:9000/
- Project: AI-Isaki
- Epic: ST3-EP-04 (Autonomous Workflow Orchestration)
- Sprint: ST3-SP-12

### User Story 템플릿

```
제목: [ST3-WIN-11x] <항목명>
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
[구현] ST3-WIN-11x
- 변경 파일:
- 핵심 구현:

[검증] ST3-WIN-11x
- 자동 테스트:
- 수동 시나리오:

[문서/정합성] ST3-WIN-11x
- 매뉴얼/로드맵 반영:
- 계약 문서 반영:
```

### ST3-WIN별 US/Task 제목 초안

- ST3-WIN-111
	- US 제목: [ST3-WIN-111] DB migration 슬롯/순서 SSOT 고정
	- Task 제목: [구현] ST3-WIN-111 migration 네이밍/실행 순서 검증기 추가
	- Task 제목: [검증] ST3-WIN-111 신규/업그레이드 경로 migration 회귀 테스트
	- Task 제목: [문서] ST3-WIN-111 migration 규약/슬롯 표기 정리
- ST3-WIN-112
	- US 제목: [ST3-WIN-112] Repository 계층 CRUD 책임 경계 정리
	- Task 제목: [구현] ST3-WIN-112 command/tool/permission repo 인터페이스 정돈
	- Task 제목: [검증] ST3-WIN-112 트랜잭션/롤백/중복 저장 회귀 검증
	- Task 제목: [문서] ST3-WIN-112 저장소 책임 분리 기준 문서화
- ST3-WIN-113
	- US 제목: [ST3-WIN-113] Attachment/Artifact 보존 정책 일원화
	- Task 제목: [구현] ST3-WIN-113 attachment metadata/path 정규화
	- Task 제목: [검증] ST3-WIN-113 파일 누락/권한 오류/정리 정책 테스트
	- Task 제목: [문서] ST3-WIN-113 보존주기/정리 정책 운영 가이드 반영
- ST3-WIN-114
	- US 제목: [ST3-WIN-114] Audit trail 이벤트와 DB 기록 상호 추적성 확보
	- Task 제목: [구현] ST3-WIN-114 eventId-recordId 연결 키 저장/조회 지원
	- Task 제목: [검증] ST3-WIN-114 감사 추적 검색/복원 시나리오 테스트
	- Task 제목: [문서] ST3-WIN-114 감사로그 조회 절차/제약 정리
- ST3-WIN-115
	- US 제목: [ST3-WIN-115] 데이터 정합성 백필/클린업 유틸 제공
	- Task 제목: [구현] ST3-WIN-115 orphan/중복/불일치 레코드 정리 유틸 작성
	- Task 제목: [검증] ST3-WIN-115 dry-run/실행 모드 결과 비교 검증
	- Task 제목: [문서] ST3-WIN-115 백필 절차/롤백 가이드 업데이트

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
