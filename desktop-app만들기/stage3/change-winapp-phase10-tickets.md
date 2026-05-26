# change-winapp Phase 10 구현 티켓

기준 문서: stage3-roadmap-winapp-v2.0.md
Phase 목표: 계획-실행-검증 루프 내장

## ST3-WIN-091 작업 플래너

- 우선순위: P0
- 재사용 우선 모듈: src/team/role-router.ts, src/team/allocation-policy.ts, src/pipeline/stages/*
- 확장 심볼: task graph 생성기, 선행조건/완료조건 매퍼
- 신규 파일 생성: 금지
- 최소 변경 범위: 핵심 2~3파일 + 테스트
- 계약 변경: PLAN_STEP, PLAN_DEPENDENCY 스키마
- 완료 기준: 요청 입력 시 계획/리스크/검증 항목 자동 생성
- 검증 증거: 계획 생성 회귀 테스트, 병렬 가능 단계 판정 테스트

## ST3-WIN-092 실행 정책 엔진

- 우선순위: P0
- 재사용 우선 모듈: desktop/main/permissions/permission-broker.ts, src/state/workflow-transition.ts
- 확장 심볼: AUTO-CONTINUE/ASK 분기 규칙, 고위험 차단기
- 신규 파일 생성: 금지
- 최소 변경 범위: 정책 매핑 + 승인 경로
- 계약 변경: POLICY_DECISION 이벤트
- 완료 기준: 고위험 행위는 강제 승인, 저위험 자동 진행
- 검증 증거: 정책 테이블 테스트, 승인/차단 E2E

## ST3-WIN-093 검증 게이트

- 우선순위: P0
- 재사용 우선 모듈: src/verification/verifier.ts, src/pipeline/stages/ralph-verify.ts, desktop/ipc/commands.ts
- 확장 심볼: 타입체크/테스트/린트 체인 오케스트레이터
- 신규 파일 생성: 금지
- 최소 변경 범위: 검증 체인 + 실패 재시도 정책
- 계약 변경: VERIFY_RESULT 스키마
- 완료 기준: 검증 실패를 성공으로 표시하지 않음
- 검증 증거: 실패/재시도/중단 조건 테스트

## ST3-WIN-094 근거 표시 UX

- 우선순위: P1
- 재사용 우선 모듈: desktop/main/storage/command-history-repo.ts, desktop/main/storage/tool-call-history-repo.ts, desktop/renderer/chat/*
- 확장 심볼: evidence card 모델, 로그 링크, 요약 카드
- 신규 파일 생성: 금지
- 최소 변경 범위: 데이터 매핑 + 렌더러 갱신
- 계약 변경: EVIDENCE_REF 필드
- 완료 기준: 결과마다 근거 링크 표시
- 검증 증거: 렌더링 테스트, 누락 근거 경고 테스트

## ST3-WIN-100 Desktop SessionStart Context Overlay

- 우선순위: P1
- 배경: `src/hooks/agents-overlay.ts`의 AGENTS.md 동적 오버레이(`<!-- OMX:RUNTIME:START -->`/`END`) 흐름은 OMX CLI + Codex 네이티브 훅(`SessionStart`/`Stop`) 경로에서만 동작하며, 데스크탑 앱은 Codex CLI를 외부 spawn 으로만 호출하므로 현재 미적용 상태이다. 데스크탑 LLM Gateway 요청에도 코드베이스 맵/활성 스킬/모드 상태/notepad 컨텍스트를 동일하게 주입해 응답 정확성과 근거 추적성을 끌어올린다.
- 재사용 우선 모듈:
	- `src/hooks/agents-overlay.ts` (`applyAgentsOverlay`, `stripAgentsOverlay`, `buildSessionAgentsMarkdown`)
	- `src/hooks/codebase-map.ts` (`generateCodebaseMap`)
	- `src/hooks/explore-routing.ts` (`buildExploreRoutingGuidance`)
	- `src/state/skill-active.ts` (`listActiveSkills`)
	- `desktop/main/index.ts` (`makeCodexCliAdapter`, `buildCodexExecPrompt`, LLM Gateway 호출 경로)
- 확장 심볼:
	- `applyDesktopSessionOverlay(cwd, opts)`: Codex CLI exec 직전 호출되어 임시 AGENTS.md 머지를 보장하는 어댑터 후크
	- `stripDesktopSessionOverlay(cwd)`: exec 완료/취소/타임아웃 시 마커 구간 제거
	- `buildSessionAgentsMarkdown` 재사용 — 3,500 byte 한도 그대로 유지
- 신규 파일 생성: 금지 (예외 필요 시 `desktop/main/codex/session-overlay.ts` 한 개에 한해 데스크탑 측 thin adapter 만 허용, 핵심 로직은 `src/hooks/*` 재사용)
- 최소 변경 범위:
	- `desktop/main/index.ts` 2개 지점(`makeCodexCliAdapter.invoke` 진입/종료) 후크 호출 삽입
	- `src/hooks/agents-overlay.ts`에 외부 호출자가 사용할 수 있는 cwd-기반 진입점 노출(이미 export 되어 있다면 변경 없음)
	- 단위 테스트 1~2개 추가
- 계약 변경:
	- IPC: 없음 (LLM Gateway 응답 envelope 그대로)
	- Event: `llm_gateway.overlay_applied` / `llm_gateway.overlay_stripped` 진단용 이벤트만 추가(옵션)
	- Schema: 변경 없음
- 락/동시성:
	- `agents-overlay.ts`의 `acquireLock()` (`.omx/agents-md.lock`)을 그대로 재사용. 동시 Codex 세션과 안전하게 공존.
- 실패/복구 정책:
	- exec 실패/취소/타임아웃 시 `stripDesktopSessionOverlay`를 `finally`에서 보장 호출
	- 마커가 잔존하면 다음 호출 시 멱등 제거 → 원본 AGENTS.md 무손상
- 완료 기준:
	- 채팅에서 입력 → Codex CLI exec 직전 AGENTS.md 에 `OMX:RUNTIME` 마커가 주입되고 응답 종료 후 제거된다
	- 코드베이스 맵/활성 스킬/notepad 변경이 다음 요청에서 즉시 반영된다
	- AGENTS.md 가 없는 환경에서도 오류 없이 작동(빈 base 위에 마커만 주입)
- 검증 증거:
	- 단위: `buildSessionAgentsMarkdown` 결과 ≤ 3,500 byte, 멱등성(2회 apply 후 1회 strip → 원본 복원)
	- 통합: 데스크탑 모킹 어댑터로 invoke 라이프사이클 동안 apply/strip 페어 호출 확인
	- 회귀: Codex CLI 미설치/`CODEX_HOME` 미설정 케이스에서 graceful degrade (마커 주입 스킵 후 정상 실행)
- 비범위(Out of Scope):
	- 팀 멀티에이전트 워커 마커(`OMX:TEAM:WORKER:*`) — 별도 티켓
	- Codex 네이티브 훅 등록(`hooks.session_start`) — 데스크탑은 spawn 경로라 불필요

## Phase 10 Exit Criteria

- ST3-WIN-091~094 완료
- 계획->실행->검증 단일 흐름 동작
- 실패를 성공으로 표기하는 케이스 0건
- ST3-WIN-100 완료: 채팅 입력 → AGENTS.md 오버레이 적용/제거 페어 동작, 마커 잔존 0건

---

## Taiga 등록 섹션

### 등록 컨텍스트

- URL: http://20.194.2.62:9000/
- Project: AI-Isaki
- Epic: ST3-EP-02 (Agent Runtime 2.0)
- Sprint: ST3-SP-10

### User Story 템플릿

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

- ST3-WIN-091
	- US 제목: [ST3-WIN-091] Command Registry SSOT와 alias 정책 고정
	- Task 제목: [구현] ST3-WIN-091 command-meta 단일 소스/alias 정규화
	- Task 제목: [검증] ST3-WIN-091 /help/자동완성/실행 경로 정합성 테스트
	- Task 제목: [문서] ST3-WIN-091 명령 카탈로그/등록 규약 정리
- ST3-WIN-092
	- US 제목: [ST3-WIN-092] IPC 입력 스키마 강제 및 오류 계약 통일
	- Task 제목: [구현] ST3-WIN-092 zod 검증 + error envelope 표준화
	- Task 제목: [검증] ST3-WIN-092 invalid payload/경계값 회귀 테스트
	- Task 제목: [문서] ST3-WIN-092 IPC contract/에러코드 표기 정합화
- ST3-WIN-093
	- US 제목: [ST3-WIN-093] 이벤트 네이밍 및 버전 관리 정책 정리
	- Task 제목: [구현] ST3-WIN-093 event namespace/version 필드 표준 적용
	- Task 제목: [검증] ST3-WIN-093 이벤트 소비자 호환성/회귀 검증
	- Task 제목: [문서] ST3-WIN-093 이벤트 카탈로그 및 이행 가이드 반영
- ST3-WIN-094
	- US 제목: [ST3-WIN-094] 실행 히스토리 정책(중복 제외/집계 기준) 확정
	- Task 제목: [구현] ST3-WIN-094 command_history/tool_calls 저장 기준 단일화
	- Task 제목: [검증] ST3-WIN-094 history_list 카운트 시나리오 검증
	- Task 제목: [문서] ST3-WIN-094 운영 기준/FAQ 업데이트
- ST3-WIN-100
	- US 제목: [ST3-WIN-100] Desktop SessionStart Context Overlay (AGENTS.md 동적 주입)
	- Task 제목: [구현] ST3-WIN-100 makeCodexCliAdapter 라이프사이클에 applyAgentsOverlay/stripAgentsOverlay 페어 연결
	- Task 제목: [검증] ST3-WIN-100 멱등성/락/3500B 한도/graceful degrade 단위·통합 테스트
	- Task 제목: [문서] ST3-WIN-100 dependency-map-use-codex.md 에 데스크탑 통합 포인트 반영

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
