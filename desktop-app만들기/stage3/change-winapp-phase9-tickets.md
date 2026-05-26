# change-winapp Phase 9 구현 티켓

기준 문서: stage3-roadmap-winapp-v2.0.md
Phase 목표: LLM Auth + Backend Gateway를 선행 게이트로 고정

## 공통 원칙

- 신규 파일 생성 기본 금지 (예외 시 근거 3문장 + 대체안 비교 필수)
- 변경 순서: 계약(IPC/Event/Schema) -> 런타임 -> UI
- 각 티켓 필수: 재사용 우선 모듈, 확장 심볼, 최소 변경 범위, 검증 증거

---

## ST3-WIN-095 인증 계층 표준화

- 우선순위: P0
- 목표: 인증 상태/만료/실패 코드를 제품 레벨로 표준화
- 재사용 우선 모듈: src/cli/codex-home.ts, src/cli/index.ts
- 확장 심볼: 인증 저장소 초기화, 프로필 스코프 분기, 만료 판정기
- 신규 파일 생성: 금지 (예외 승인 필요)
- 최소 변경 범위: 핵심 2~3파일 + 테스트 1~2
- 계약 변경: AUTH_INVALID, AUTH_EXPIRED, BACKEND_UNREACHABLE 에러 코드
- 완료 기준:
  - 인증 실패 사유가 코드/메시지로 분리 노출
  - 개인/조직/프로젝트 프로필 저장 분리
- 검증 증거:
  - 타입체크
  - 인증 만료/무효/네트워크 실패 시나리오 테스트

## ST3-WIN-096 Backend Gateway

- 우선순위: P0
- 목표: 단일 모델 호출 계약(요청/응답/에러) 고정
- 재사용 우선 모듈: desktop/ipc/commands.ts, desktop/main/index.ts
- 확장 심볼: set*Backend 주입 지점, gateway adapter registry, renderer provider/model selector
- 신규 파일 생성: 금지
- 최소 변경 범위: IPC 계약 + main 주입 + adapter 연결 + renderer free-text 선택 UI
- 계약 변경: LLM 요청/응답 공통 스키마 v1
- 완료 기준:
  - 백엔드별 구현 차이가 어댑터 내부로 캡슐화
  - 호출부는 공통 인터페이스만 사용
  - renderer에서 provider/model 전환으로 mock-echo/mock-reverse 즉시 스모크 가능
- 검증 증거:
  - 어댑터 단위 테스트
  - 2개 이상 백엔드 스모크

## ST3-WIN-097 스트리밍/타임아웃/재시도

- 우선순위: P0
- 목표: token/tool_call/done/error 스트림 표준 이벤트 확정
- 재사용 우선 모듈: desktop/ipc/event-bus.ts, desktop/ipc/events.ts, desktop/main/updater/updater.ts
- 확장 심볼: 재시도 상태머신, 취소 토큰, 타임아웃 정책
- 신규 파일 생성: 금지
- 최소 변경 범위: 이벤트 타입 + 실행 루프 + UI 상태 표시
- 계약 변경: LLM_STREAM_EVENT v1
- 완료 기준:
  - 스트림 시작 p95 측정 가능
  - 재시도/취소가 정책대로 동작
- 검증 증거:
  - timeout/retry/cancel 통합 테스트
  - 진행 이벤트 순서 검증
- Taiga 등록 내역 (완료)
  - Sprint: ST3-SP-09 (id=19)
  - Epic: ST3-EP-01 (id=10)
  - US: id=65, ref=251, 제목='[ST3-WIN-097] Streaming timeout retry event contract'
  - Tasks: id=176(ref=252), id=177(ref=253), id=178(ref=254)
- 작업 결과 문서: desktop-app만들기/stage3/result/ST3-WIN-097-작업결과.md

## ST3-WIN-098 비용/쿼터/레이트리밋 보호

- 우선순위: P1
- 목표: 세션 예산 상한 + 자동 다운시프트 정책 적용
- 재사용 우선 모듈: desktop/main/storage/command-history-repo.ts, desktop/main/storage/tool-call-history-repo.ts
- 확장 심볼: 비용 필드, 모델별 사용량 집계, 429 보호기
- 신규 파일 생성: 금지
- 최소 변경 범위: 저장소 스키마 확장 + 정책 핸들러
- 계약 변경: usage/cost 메타데이터 필드
- 완료 기준:
  - 한도 초과 전에 경고/차단/다운시프트 적용
- 검증 증거:
  - 429/쿼터 초과 시나리오 테스트
  - 비용 집계 정확도 검증

## ST3-WIN-099 백엔드 장애 복구

- 우선순위: P1
- 목표: 주/보조 백엔드 페일오버 자동화
- 재사용 우선 모듈: desktop/main/updater/config.ts, desktop/main/updater/channel.ts
- 확장 심볼: fallback 규칙, 수동 전환 경로, 상태 이벤트
- 신규 파일 생성: 금지
- 최소 변경 범위: 전환 정책 + 상태 통지
- 계약 변경: FAILOVER_REASON/FALLBACK_PROVIDER 필드
- 완료 기준:
  - 장애 시 자동 전환 + 사용자 영향 범위 표시
- 검증 증거:
  - 강제 장애 주입 테스트
  - 전환 성공률 메트릭 수집

---

## Phase 9 Exit Criteria

- ST3-WIN-095~099 체크리스트 전부 완료
- LLM 질문->응답 기본 경로 실동작
- 스트리밍/재시도/페일오버 자동 검증 통과
- Stage2 회귀 없음 (권한/명령 실행/이력/업데이트)

---

## Taiga 등록 섹션

### 등록 컨텍스트

- URL: http://20.194.2.62:9000/
- Project: AI-Isaki
- Epic: ST3-EP-01 (LLM Auth & Gateway)
- Sprint: ST3-SP-09

### User Story 템플릿

복붙 템플릿:

```
제목: [ST3-WIN-09x] <항목명>
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

복붙 템플릿:

```
[구현] ST3-WIN-09x
- 변경 파일:
- 핵심 구현:

[검증] ST3-WIN-09x
- 자동 테스트:
- 수동 시나리오:

[문서/정합성] ST3-WIN-09x
- 매뉴얼/로드맵 반영:
- 계약 문서 반영:
```

### ST3-WIN별 US/Task 제목 초안

- ST3-WIN-095
  - US 제목: [ST3-WIN-095] 인증 계층 표준화 (프로필 분리/만료 코드)
  - Task 제목: [구현] ST3-WIN-095 인증 저장소/만료 판정 표준화
  - Task 제목: [검증] ST3-WIN-095 AUTH_INVALID/EXPIRED/UNREACHABLE 시나리오
  - Task 제목: [문서] ST3-WIN-095 인증 정책/에러코드 정합성 반영
- ST3-WIN-096
  - US 제목: [ST3-WIN-096] Backend Gateway 단일 호출 계약 고정
  - Task 제목: [구현] ST3-WIN-096 adapter registry + set*Backend 결선
  - Task 제목: [검증] ST3-WIN-096 다중 백엔드 공통 스키마 회귀
  - Task 제목: [문서] ST3-WIN-096 요청/응답/에러 계약 문서화
- ST3-WIN-097
  - US 제목: [ST3-WIN-097] 스트리밍/타임아웃/재시도 표준 이벤트 확정
  - Task 제목: [구현] ST3-WIN-097 token/tool_call/done/error 이벤트 + 취소 전파
  - Task 제목: [검증] ST3-WIN-097 timeout/retry/cancel 통합 테스트
  - Task 제목: [문서] ST3-WIN-097 스트리밍 상태머신/정책 반영
- ST3-WIN-098
  - US 제목: [ST3-WIN-098] 비용/쿼터/레이트리밋 보호 정책 적용
  - Task 제목: [구현] ST3-WIN-098 usage/cost 계측 + 429 보호기
  - Task 제목: [검증] ST3-WIN-098 예산 상한/다운시프트 정책 테스트
  - Task 제목: [문서] ST3-WIN-098 비용 메타데이터/한도 정책 정리
- ST3-WIN-099
  - US 제목: [ST3-WIN-099] 백엔드 장애 복구 및 페일오버 자동화
  - Task 제목: [구현] ST3-WIN-099 provider fallback + 수동 전환 경로
  - Task 제목: [검증] ST3-WIN-099 장애 주입 기반 페일오버 성공률 검증
  - Task 제목: [문서] ST3-WIN-099 장애 영향/복구 플로우 문서화

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
