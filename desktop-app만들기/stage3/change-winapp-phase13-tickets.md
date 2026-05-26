# change-winapp Phase 13 구현 티켓

기준 문서: stage3-roadmap-winapp-v2.0.md
Phase 목표: Trust/Security/Enterprise Ops 완성

## ST3-WIN-121 정책 엔진 2단계

- 우선순위: P0
- 재사용 우선 모듈: desktop/main/permissions/permission-broker.ts, desktop/main/permissions/permission-store.ts, desktop/main/tools/tool-router.ts
- 확장 심볼: 도구/경로/환경별 Allow/Deny/Ask 템플릿
- 신규 파일 생성: 금지
- 최소 변경 범위: 정책 평가기 + 라우터 연동
- 계약 변경: POLICY_RULESET_VERSION
- 완료 기준: 판정 근거와 적용 로그 추적 가능
- 검증 증거: 정책 매트릭스 테스트

## ST3-WIN-122 비밀·개인정보 보호

- 우선순위: P0
- 재사용 우선 모듈: desktop/main/diag/maskers.ts, desktop/main/diag/bundle.ts, desktop/main/attachments/*
- 확장 심볼: 실시간 스캐너, 전송 전 DLP 게이트, 마스킹 규칙
- 신규 파일 생성: 금지
- 최소 변경 범위: 스캔/차단/마스킹 파이프라인
- 계약 변경: DLP_DECISION 이벤트
- 완료 기준: 외부 전송 전 민감정보 차단
- 검증 증거: 민감 패턴 fixture 테스트

## ST3-WIN-123 감사 추적/리포트

- 우선순위: P1
- 재사용 우선 모듈: desktop/main/storage/tool-call-history-repo.ts, desktop/main/storage/command-history-repo.ts, tool_permissions
- 확장 심볼: 호출 주체/권한/시간축 조인 리포트
- 신규 파일 생성: 금지
- 최소 변경 범위: 리포트 쿼리 + 내보내기
- 계약 변경: AUDIT_EXPORT_SCHEMA
- 완료 기준: 감사 추적 완전성 보장
- 검증 증거: 샘플 리포트 회귀 테스트

## ST3-WIN-124 관측성/SLO

- 우선순위: P1
- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/ipc/commands.ts, desktop/main/updater/updater.ts
- 확장 심볼: 지연/실패/재시도/거부율 메트릭
- 신규 파일 생성: 금지
- 최소 변경 범위: 메트릭 수집 + 대시보드 입력
- 계약 변경: METRIC_EVENT v1
- 완료 기준: SLO 위반 조기 경보
- 검증 증거: 임계치 경보 테스트

## ST3-WIN-125 배포 안전장치

- 우선순위: P0
- 재사용 우선 모듈: desktop/main/updater/channel.ts, desktop/main/updater/updater.ts, desktop/main/storage/migrations/*
- 확장 심볼: 카나리 채널, 원클릭 롤백, 마이그레이션 사전검증
- 신규 파일 생성: 금지
- 최소 변경 범위: 배포 정책 + 복구 자동화
- 계약 변경: RELEASE_GUARD_RESULT
- 완료 기준: 업데이트 실패 자동 복구율 목표 달성
- 검증 증거: 카나리/롤백/마이그레이션 리허설 테스트

## Phase 13 Exit Criteria

- ST3-WIN-121~125 완료
- 정책 위반 0건 운영 지표 확보
- 감사/관측/배포 가드 운영 경로 문서화 완료

---

## Taiga 등록 섹션

### 등록 컨텍스트

- URL: http://20.194.2.62:9000/
- Project: AI-Isaki
- Epic: ST3-EP-05 (Trust, Security, Enterprise Ops)
- Sprint: ST3-SP-13

### User Story 템플릿

```
제목: [ST3-WIN-12x] <항목명>
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
[구현] ST3-WIN-12x
- 변경 파일:
- 핵심 구현:

[검증] ST3-WIN-12x
- 자동 테스트:
- 수동 시나리오:

[문서/정합성] ST3-WIN-12x
- 매뉴얼/로드맵 반영:
- 계약 문서 반영:
```

### ST3-WIN별 US/Task 제목 초안

- ST3-WIN-121
	- US 제목: [ST3-WIN-121] E2E 회귀 파이프라인(윈도우 기준) 표준화
	- Task 제목: [구현] ST3-WIN-121 핵심 시나리오 smoke/e2e 워크플로우 정리
	- Task 제목: [검증] ST3-WIN-121 flaky 분석/재시도 정책 검증
	- Task 제목: [문서] ST3-WIN-121 테스트 실행 매트릭스/판정기준 반영
- ST3-WIN-122
	- US 제목: [ST3-WIN-122] 성능 예산(FCP/응답지연/메모리) 게이트 도입
	- Task 제목: [구현] ST3-WIN-122 perf 측정 훅/리포트 수집 파이프라인 연결
	- Task 제목: [검증] ST3-WIN-122 baseline 대비 퇴행 임계치 경보 테스트
	- Task 제목: [문서] ST3-WIN-122 성능 목표/측정법/예외 처리 절차 정리
- ST3-WIN-123
	- US 제목: [ST3-WIN-123] 보안 체크(경로탐색/권한/입력검증) 자동화
	- Task 제목: [구현] ST3-WIN-123 보안 규칙 lint/test 훅 통합
	- Task 제목: [검증] ST3-WIN-123 path traversal/권한우회 공격 시나리오 테스트
	- Task 제목: [문서] ST3-WIN-123 보안 체크리스트/대응 프로토콜 업데이트
- ST3-WIN-124
	- US 제목: [ST3-WIN-124] 릴리즈 게이팅과 증거 아카이브 체계 구축
	- Task 제목: [구현] ST3-WIN-124 build/test/evidence 아티팩트 묶음 자동 생성
	- Task 제목: [검증] ST3-WIN-124 게이트 실패/승인 흐름 점검
	- Task 제목: [문서] ST3-WIN-124 릴리즈 프로토콜/증적 템플릿 반영
- ST3-WIN-125
	- US 제목: [ST3-WIN-125] Stage3 종료 리뷰 및 운영 이관 패키지 완성
	- Task 제목: [구현] ST3-WIN-125 운영 핸드오프 체크리스트/소유권 정리
	- Task 제목: [검증] ST3-WIN-125 운영 리허설(장애/복구/온콜) 수행
	- Task 제목: [문서] ST3-WIN-125 종료 보고서/잔여 리스크 기록

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
