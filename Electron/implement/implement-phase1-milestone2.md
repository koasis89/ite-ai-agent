# [수행 기록] Phase 1 Milestone 2 — JSON 봉투 파서 및 태스크 생명주기 API 구현

**설계 원문:** [electron-phase1-milestone2.md](../design/electron-phase1-milestone2.md)  
**Reference Architecture:** [ADR-001-electron-agent-architecture.md](../design/ADR-001-electron-agent-architecture.md)  
**작성일:** 2026-05-26  
**완료일:** 2026-05-26  
**상태:** ✅ 구현 완료

---

## 📁 생성 파일 목록

| 파일 경로 | 관련 티켓 | 상태 | 주요 Export |
|---|---|---|---|
| `src/main/cli/schemas/envelope.schema.ts` | EL-203 | ✅ 완료 | `SuccessEnvelopeSchema`, `FailureEnvelopeSchema`, `EnvelopeSchema`, `EnvelopeErrorCode`, `SuccessEnvelope`, `FailureEnvelope`, `Envelope` |
| `src/main/cli/envelope-parser.ts` | EL-203 | ✅ 완료 | `OMXError`, `parseObject()`, `parseLine()` |
| `src/main/services/task-service.ts` | EL-204, EL-205 | ✅ 완료 | `readTask()`, `claimTask()`, `releaseTaskClaim()`, `transitionTaskStatus()`, `InvalidTransitionError`, `TaskData`, `TaskStatus` |
| `src/main/ipc/task-ipc.ts` | EL-204, EL-205 | ✅ 완료 | `registerTaskIpc()`, `broadcastTaskConflict()`, `broadcastTaskStatusChanged()`, `broadcastInvalidTransition()` |
| `src/test/envelope-parser.test.ts` | EL-203 DoD | ✅ 완료 | 8개 시나리오 (A-H) |
| `src/test/task-service.test.ts` | EL-204 DoD | ✅ 완료 | 7개 시나리오 (A-G) |
| `src/test/task-service.lifecycle.test.ts` | EL-205 DoD | ✅ 완료 | 9개 시나리오 (A-I) |

---

## 🎫 EL-203. 표준 JSON 봉투(Envelope) 스키마 검증 및 파서 구현

**우선순위:** P0 | **실행 순서:** 1번째 | **그룹:** Core (Parser)

### 체크리스트

- [x] `envelope.schema.ts` — 성공/실패 Zod 판별 유니온 스키마 정의  
  → `src/main/cli/schemas/envelope.schema.ts`  
  → `SuccessEnvelopeSchema` (schema_version, timestamp?, command?, ok:true, operation?, data)  
  → `FailureEnvelopeSchema` (schema_version, timestamp?, command?, ok:false, error.code/message/metadata?)  
  → `EnvelopeErrorCode` 상수 객체 (Conflict, Forbidden, NotFound, InvalidTransition, Unauthorized)
- [x] `envelope-parser.ts` — `parseObject(raw)` 무상태 순수 파서 구현  
  → JSON 파싱 실패 → `SyntaxError` throw  
  → 스키마 불일치 → `Error` throw  
  → ok:false → `OMXError` throw (code + metadata 보존)
- [x] `envelope-parser.ts` — `parseLine(line)` Ndjson 라인 단위 파서 구현  
  → 빈 줄 → `null` 반환 (skip 신호)  
  → 유효 봉투 → `Envelope` 반환
- [x] `OMXError` 커스텀 예외 클래스 구현  
  → `code: string`, `metadata?: Record<string, unknown>` 보존  
  → `name: "OMXError"` 식별자 탑재
- [x] `envelope-parser.test.ts` 8개 시나리오 (A-H) 완료  
  → 성공봉투/실패봉투/JSON파싱실패/스키마불일치/빈줄/유효라인/실패라인/metadata보존

### 구현 메모

```
// envelope-parser.ts 핵심 플로우
parseObject(raw):
  1. JSON.parse(raw) → SyntaxError on fail
  2. EnvelopeSchema.safeParse → Error on schema mismatch
  3. ok:false → throw new OMXError(error) — code + metadata 보존

parseLine(line):
  1. trim() → null if empty
  2. 첫 줄만 추출 (안전 분기)
  3. parseObject(firstLine) 위임
```

### DoD 확인

- [x] 성공 봉투에서 `data` 필드 정상 추출
- [x] 실패 봉투에서 `OMXError(code)` throw, metadata 유실 없음
- [x] `envelope-parser.test.ts` 8개 시나리오 통과

---

## 🎫 EL-204. 태스크 조회, 선점 및 롤백 API 연동

**우선순위:** P0 | **실행 순서:** 2번째 | **그룹:** API (Task Lifecycle)

### 체크리스트

- [x] `readTask(taskId)` — `omx team api read-task --task-id <id> --json` 연동  
  → 응답 data를 `TaskDataSchema`로 Zod 검증 후 `TaskData` 반환
- [x] `claimTask(taskId, version)` — 낙관적 락 기반 선점 구현  
  → `omx team api claim-task --task-id <id> --version <n> --json`  
  → 충돌 시 `OMXError(code="Conflict")` throw → IPC에서 `task:claim-conflict` 브로드캐스트
- [x] `releaseTaskClaim(taskId)` — 선점 해제 복구 흐름 구현  
  → `omx team api release-task-claim --task-id <id> --json`  
  → `NotFound` 에러는 조용히 삼킴 (이미 해제된 경우 안전 무시)  
  → 기타 에러는 그대로 re-throw
- [x] `task-ipc.ts` — `registerTaskIpc()` IPC 채널 3개 등록  
  → `task:read`, `task:claim`, `task:release`  
  → taskId 슬러그 검증 (`/^[a-zA-Z0-9_-]{1,128}$/`) — 경로 주입 차단  
  → 충돌 발생 시 `broadcastTaskConflict()` 호출 후 `conflict:true` 반환
- [x] `task-service.test.ts` 7개 시나리오 (A-G) 완료  
  → readTask Happy Path/NotFound, claimTask Happy/Conflict, releaseTaskClaim Happy/NotFound삼킴/ForbiddenReThrow

### 구현 메모

```
// task-service.ts 낙관적 락 흐름
claimTask("task-001", 3):
  → omx team api claim-task --task-id task-001 --version 3 --json
  → ok:true → resolve()
  → ok:false (Conflict) → OMXError(code="Conflict") throw
  → IPC: broadcastTaskConflict("task-001") + return {ok:false, conflict:true}

releaseTaskClaim 복구 흐름:
  → NotFound → warn 로그 후 return (삼킴)
  → 기타 에러 → re-throw
```

### DoD 확인

- [x] `read-task` 응답을 `TaskData`로 스키마 파싱 및 반환
- [x] `claim-task` 충돌 시 `task:claim-conflict` 이벤트 브로드캐스트
- [x] `release-task-claim` 이미 해제된 태스크에 대해 오류 없이 복구 흐름 완료
- [x] `task-service.test.ts` 7개 시나리오 통과

---

## 🎫 EL-205. 태스크 상태 전이 및 결과 추적 API 연동

**우선순위:** P1 | **실행 순서:** 3번째 | **그룹:** API (Task Lifecycle)

### 체크리스트

- [x] `transitionTaskStatus(taskId, current, target, resultData?)` API 매핑 구현  
  → `omx team api transition-task-status --task-id <id> --status <target> --json`  
  → `resultData` 있으면 `--result <JSON>` 인수 추가  
  → 전이 완료 후 서버 응답 `data` 블록 반환 (결과물 아카이브용)
- [x] **[결과물 패킷 추출]** 전이 완료 시 서버 응답 data 블록 IPC로 전달  
  → `broadcastTaskStatusChanged(taskId, status, data)` → `task:status-changed` 채널  
  → IPC 반환: `{ok:true, data}` (Renderer 타임라인·결과 아카이브 시각화 활성화)
- [x] **[불변성 게이트]** 금지된 워크플로우 역전 방지 가드 구현  
  → `FORBIDDEN_TRANSITIONS`: `in_progress → {not_started, planning}` 차단  
  → `completed → {not_started, planning, in_progress, blocked}` 차단  
  → `failed → {not_started, planning, in_progress, blocked}` 차단  
  → 위반 시 `InvalidTransitionError` throw → IPC에서 `task:invalid-transition` 브로드캐스트
- [x] `task:transition` IPC 채널 등록  
  → 불변성 가드 위반 → `broadcastInvalidTransition()` + `{ok:false, invalidTransition:true}` 반환  
  → 전이 성공 → `broadcastTaskStatusChanged()` + `{ok:true, data}` 반환
- [x] `task-service.lifecycle.test.ts` 9개 시나리오 (A-I) 완료  
  → completed/failed Happy Path, resultData 인수 전달, 불변성 가드 3종, 허용 전이 2종, 서버 에러 전파

### 구현 메모

```
// 불변성 가드 상수 테이블
FORBIDDEN_TRANSITIONS = {
  in_progress: ["not_started", "planning"],   // 기획 단계 역전 차단
  completed:   ["not_started", "planning", "in_progress", "blocked"],  // 완료 후 역전 전면 차단
  failed:      ["not_started", "planning", "in_progress", "blocked"],  // 실패 후 역전 전면 차단
}

// 전이 흐름
transitionTaskStatus("task-001", "in_progress", "completed", {output:"ok"}):
  1. assertTransitionAllowed("in_progress", "completed") → pass
  2. omx team api transition-task-status ... --result '{"output":"ok"}' --json
  3. 성공 → return envelope.data
  4. IPC: broadcastTaskStatusChanged("task-001", "completed", data)
```

### DoD 확인

- [x] UI에서 작업 완료 버튼 클릭 시 CLI를 통해 상태가 전이되고 원본 서버 상태와 동기화됨
- [x] 전이 실패 시 원인(권한 부족, 상태 미달 등)이 UI에 표시됨 (`{ok:false, error}` 반환)
- [x] `task-service.lifecycle.test.ts` 전이 흐름 Happy Path, 차단형 상태 처리, 금지된 역전 검증 통과

---

## 📋 Milestone 2 완료 기준 확인

| 기준 항목 | 상태 |
|---|---|
| Zod 기반 봉투 스키마 단일 소스 (`envelope.schema.ts`) 수립 | ✅ |
| `parseObject` / `parseLine` 무상태 순수 파서 구현 | ✅ |
| `OMXError` 커스텀 예외 클래스 — code + metadata 보존 | ✅ |
| `read-task` / `claim-task` / `release-task-claim` CLI 연동 | ✅ |
| 낙관적 락 충돌 시 `task:claim-conflict` IPC 브로드캐스트 | ✅ |
| `releaseTaskClaim` Not Found 복구 흐름 (조용히 삼킴) | ✅ |
| `transition-task-status` CLI 연동 + 결과물 데이터 패킷 수집 | ✅ |
| `task:status-changed` IPC 브로드캐스트 채널 개방 | ✅ |
| 불변성 게이트 — 금지된 워크플로우 역전 차단 (`InvalidTransitionError`) | ✅ |
| `task:invalid-transition` IPC 브로드캐스트 채널 개방 | ✅ |
| taskId 슬러그 형식 검증 — 경로 주입 차단 | ✅ |
| 테스트 파일 3개 작성 (8 + 7 + 9 = 24개 시나리오) | ✅ |

---

## 🔗 연관 티켓

| 티켓 ID | 제목 | 우선순위 | 스프린트 |
|---|---|---|---|
| EL-203 | 표준 JSON 봉투 스키마 검증 및 파서 구현 | P0 | SP-21 |
| EL-204 | read-task / claim-task / release-task-claim API 연동 | P0 | SP-21 |
| EL-205 | transition-task-status API 연동 및 결과 추적 | P1 | SP-21 |
