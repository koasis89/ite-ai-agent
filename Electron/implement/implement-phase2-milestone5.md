# Phase 2 Milestone 5 구현 결과

## 개요

| 항목 | 내용 |
|------|------|
| **에픽** | EP-03 Electron 통합 |
| **마일스톤** | Phase 2 Milestone 5 |
| **스프린트** | SP-25 |
| **태스크** | EL-214, EL-215, EL-216 |
| **구현 완료일** | 2025-07-02 |

---

## EL-214 — writeToStdin / writeBurstToStdin

### 구현 파일

- **`Electron/src/main/cli/stdin-writer.ts`**

### 핵심 구현 결정

| 결정 | 이유 |
|------|------|
| `child.killed \|\| !child.stdin` 선제 가드 | 종료된 프로세스에 write 시도 시 스택 오염 방지 |
| `write()` 반환값 false → `waitForDrain()` 대기 | Node.js 백프레셔(Backpressure) 불변 계약 이행 |
| `drain` + `close` 경합 처리 | close 먼저 발생 시 무한 대기 방지 |
| 끝 `\n` 엔드마커 자동 래핑 | CLI readline 파이프라인 프레임 경계 보장 |
| `writeBurstToStdin` 순차 직렬화 | 병렬 write로 인한 프레임 순서 오염 방지 |

### 공개 API

```typescript
export async function writeToStdin(opts: WriteToStdinOptions): Promise<void>
export async function writeBurstToStdin(
  child: ChildProcessWithoutNullStreams,
  chunks: string[]
): Promise<void>
```

---

## EL-215 — InterludeTriager

### 구현 파일

- **`Electron/src/main/cli/interlude-triager.ts`**

### 핵심 구현 결정

| 결정 | 이유 |
|------|------|
| 3단계 kind 분류 (명시 → 패턴 → 기본값) | CLI가 kind 필드를 항상 제공하지 않을 수 있음 |
| `callId` 폴백 생성 (`crypto.randomUUID()`) | envelope.callId 미포함 방어 — 항상 유효한 callId 보장 |
| 싱글턴 `getInterludeTriager()` | 앱 수명 동안 단일 트리아지 인스턴스 보장 |
| `_resetTriagerForTest()` 공개 | 테스트 간 독립성 보장 |
| `broadcastInterludeStart()` — `isDestroyed()` 가드 | 파괴된 윈도우 접근으로 인한 크래시 방지 |

### Zod 스키마

| 스키마 | 설명 |
|--------|------|
| `InterludeKindSchema` | `askUserQuestion \| worker_merge_conflict \| pre-tool-use \| needs-input` |
| `PersonaRoleSchema` | `planner \| executor \| verifier \| reviewer \| unknown` |
| `InterludePayloadSchema` | `callId, kind, question, persona, rawEnvelope` |
| `InterludeAckSchema` | `callId, approved, userInput?` |

### 공개 API

```typescript
export const INTERLUDE_START_CHANNEL = "omx:interlude-start"
export const INTERLUDE_ACK_CHANNEL = "omx:interlude-ack"

export class InterludeTriager {
  triage(envelope: InterludeEnvelope): InterludePayload
}
export function getInterludeTriager(): InterludeTriager
export function _resetTriagerForTest(): void
```

---

## EL-216 — InterludeIpc + ChatContainer

### 구현 파일

- **`Electron/src/main/ipc/interlude-ipc.ts`** (Main Process)
- **`Electron/src/renderer/components/ChatContainer.tsx`** (Renderer)

### Main Process 핵심 구현 결정

| 결정 | 이유 |
|------|------|
| `ipcMain.handle(INTERLUDE_ACK_CHANNEL)` | invoke/handle 쌍 — Renderer 응답 수신 보장 |
| `_pendingCallIds: Set<string>` | 중복 ACK 방지 — 이미 처리된 callId 재입력 차단 |
| 승인: `writeToStdin()` → `resolved` 브로드캐스트 | stdin 주입 원자성 보장 |
| 거절: `SIGTERM` → `cancelled` 브로드캐스트 | 태스크 롤백 의도를 CLI에 명확히 전달 |
| 오류 시 `INTERLUDE_ERROR_CHANNEL` 브로드캐스트 | 렌더러에서 오류 상태 시각화 가능 |

### IPC 채널 맵

| 방향 | 채널 | 설명 |
|------|------|------|
| Main → Renderer | `omx:interlude-start` | 차단 신호 시작 (InterludeTriager 발신) |
| Main → Renderer | `omx:interlude-resolved` | 승인 처리 완료 |
| Main → Renderer | `omx:interlude-cancelled` | 취소/롤백 처리 완료 |
| Main → Renderer | `omx:interlude-error` | 처리 오류 알림 |
| Renderer → Main | `omx:interlude-ack` | 사용자 승인/거절 전송 |

### Renderer (ChatContainer.tsx) 핵심 구현 결정

| 결정 | 이유 |
|------|------|
| `activeInterlude` 상태 — null이면 일반 모드 | 단일 상태로 모드 전환 명확화 |
| 메시지 영역 `opacity: 0.35` Dim 처리 | 포커스를 인터뷰 폼으로 집중 |
| `isProcessingLock` — 제출 후 스피너 + 입력 동결 | 중복 제출 방지 + 원자성 락 구현 |
| IPC resolved/cancelled 수신 시 락 해제 | 서버 상태 갱신 기반 락 해제 (낙관적 UI 지양) |
| 페르소나 뱃지 색상 테마 (6종) | 에이전트 역할 시각화 — Planner/Executor/Verifier/Reviewer 구분 |
| `Ctrl+Enter` 제출 단축키 | 텍스트에어리어에서 `Enter`만으로 줄바꿈 가능 |

---

## 테스트 파일

| 파일 | 검증 대상 | 시나리오 수 |
|------|-----------|------------|
| `Electron/src/test/EL-214.test.ts` | stdin-writer.ts | 9개 |
| `Electron/src/test/EL-215.test.ts` | interlude-triager.ts | 13개 |
| `Electron/src/test/interlude-ui.integrated.test.ts` | Main↔Renderer IPC 통합 | 5개 |

### EL-214 테스트 시나리오

| ID | 설명 |
|----|------|
| A | 단일 문자열 stdin 정상 주입 |
| B | 데이터 끝 `\n` 엔드마커 자동 추가 |
| C | 이미 `\n` 종결 시 중복 추가 없음 |
| D | `write()` false → drain 이벤트 대기 후 resolve |
| E | `child.killed = true` → Error throw |
| F | `child.stdin = null` → Error throw |
| G | drain 대기 중 `close` → reject |
| H | `writeBurstToStdin` 다중 청크 순차 주입 |
| I | 빈 청크 배열 → write 호출 없음 |

### EL-215 테스트 시나리오

| ID | 설명 |
|----|------|
| A–D | kind 명시 분류 4종 |
| E | 텍스트 패턴 매칭 (conflict → worker_merge_conflict) |
| F | 기본값 폴백 (askUserQuestion) |
| G | persona 필드 정확 추출 |
| H | persona 없고 role 필드 폴백 |
| I | persona/role 모두 없음 → unknown |
| J | envelope.callId 없을 때 자동 생성 |
| K | 활성 윈도우 브로드캐스트 확인 |
| L | 파괴된 윈도우 스킵 |

### interlude-ui.integrated 테스트 시나리오

| ID | 설명 |
|----|------|
| A | 질문 인입 → 승인 → stdin 주입 → resolved 브로드캐스트 |
| B | 질문 인입 → 취소 → SIGTERM → cancelled 브로드캐스트 |
| C | 미등록 callId ACK → ok=false |
| D | activeChild null 상태 승인 → error 채널 브로드캐스트 |
| E | 중복 ACK → 두 번째 처리 무시 |

---

## 아키텍처 흐름도

```
[에이전트 stdout]
      │
      ▼ (interlude 봉투 수신)
 InterludeTriager.triage()
      │
      ├─► callId 보장 (uuid 폴백)
      ├─► kind 분류 (3단계)
      ├─► persona 추출
      └─► omx:interlude-start 브로드캐스트
                │
                ▼
          [ChatContainer]
          - 메시지 영역 Dim
          - 페르소나 뱃지 표시
          - 인터뷰 폼 렌더링
                │
       사용자 입력 후 전송
                │
                ▼
   omx:interlude-ack IPC invoke
                │
                ▼
    registerInterludeIpc handler
      │
      ├─► 승인: writeToStdin() → omx:interlude-resolved
      └─► 거절: SIGTERM → omx:interlude-cancelled
                │
                ▼
          [ChatContainer]
          - 락 해제
          - 일반 채팅 모드 복귀
```

---

## ADR-001 준수 확인

| 규칙 | 준수 여부 |
|------|-----------|
| `spawnSync` / `stdio:'inherit'` 절대 금지 | ✅ 모든 write 비동기 |
| 백프레셔 처리 의무 | ✅ `waitForDrain()` 구현 |
| 자식 프로세스 stdin 가드 | ✅ `killed` + `null` 방어 |
| IPC `ipcMain.handle()` 패턴 | ✅ invoke/handle 쌍 사용 |
| 윈도우 파괴 가드 | ✅ `isDestroyed()` 확인 |
