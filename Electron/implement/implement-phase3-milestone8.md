# Phase 3 Milestone 8 구현 내역

> 생성 일시: 2025-07-10  
> 담당 이슈: EL-224, EL-225, EL-226  
> 마일스톤: Phase 3 / Milestone 8 — 복합 상태 안전 장치 · Drift 감지 · 에러 가이드 UI

---

## 1. 개요

Phase 3 Milestone 8은 **복합 상태 전이 안전 장치**, **플러그인 드리프트 실시간 감지**, **에러 복구 가이드 UI**의 세 축으로 구성된다.  
기존 단방향 상태 전이 규칙을 보강하여 비정상 역전이를 차단하고, Drift Rate 기반 위기 감지를 통해 사용자에게 즉각적인 복구 경로를 제공한다.

---

## 2. 구현 파일 목록

| 파일 경로 | 이슈 | 역할 |
|---|---|---|
| `src/main/state/multi-state-validator.ts` | EL-224 | 복합 상태 전이 규칙 파서 + Deferred 스킬 분리기 |
| `src/renderer/components/DeferredSkillsNotice.tsx` | EL-224 | 플로팅 토스트 + 롤백 경고 배너 |
| `src/main/ops/drift-detector.ts` | EL-225 | 로그–매니페스트 교차 검증 Drift 감지기 |
| `src/main/ipc/ops-ipc.ts` | EL-225 | Drift 감지 IPC 등록 + 브로드캐스트 |
| `src/renderer/components/ErrorGuideOverlay.tsx` | EL-226 | 에러 코드별 복구 가이드 팝업 + Drift 위기 배너 |
| `src/test/EL-224.test.ts` | EL-224 | MultiStateValidator + DeferredSkillsNotice 테스트 |
| `src/test/drift-detector.test.ts` | EL-225 | DriftDetector 단위 테스트 |
| `src/test/EL-226.test.ts` | EL-226 | ErrorGuideController 통합 테스트 |

---

## 3. EL-224: 복합 상태 전이 규칙 파서

### 3.1 상태 스키마 (Zod)

```typescript
WorkflowPhaseSchema: z.enum(["idle", "planning", "in_progress", "done"])
SkillStateSchema: { skill, phase, deferred, deferredReason?, activatedAt? }
MultiStateSchema: { primary, deferred[], timestamp }
TransitionRejectionSchema: { from, to, skill, reason, timestamp }
```

### 3.2 금지 전이 규칙 (ADR-Rollback-Guard)

| 출발 상태 | 목표 상태 | 결과 | 사유 |
|---|---|---|---|
| `in_progress` | `planning` | ❌ 거부 | 역전이 금지 — 진행 중 롤백 불가 |
| `done` | `in_progress` | ❌ 거부 | 직접 재진입 금지 — planning 경유 필요 |
| `done` | `planning` | ✅ 허용 | 새 사이클 시작 |
| `planning` | `in_progress` | ✅ 허용 | 정상 전진 |
| `in_progress` | `done` | ✅ 허용 | 완료 |

거부 시 `transition_rejected` 이벤트에 `TransitionRejection` 페이로드를 방출한다.  
`reason` 필드에는 반드시 `omx state clear` 복구 힌트가 포함된다.

### 3.3 Deferred 스킬 흐름

```
registerDeferred(skill, deferredBy)
  → SkillState.deferred = true
  → emit("skill_deferred", { skill, deferredBy, reason })

applyTransition(primary, "done")
  → _activateDeferredSkills()
    → SkillState.deferred = false
    → SkillState.activatedAt = ISO timestamp
    → emit("skill_activated", { skill })
```

### 3.4 IPC 채널 계약 (DeferredSkillsNotice)

| 방향 | 채널 | 페이로드 |
|---|---|---|
| Main → Renderer | `omx:skill-deferred` | `{ skill, deferredBy, reason }` |
| Main → Renderer | `omx:rollback-blocked` | `TransitionRejection` |
| Main → Renderer | `omx:skill-activated` | `{ skill }` |
| Main → Renderer | `omx:state-clear` | `void` |

### 3.5 React 상태 관리 (useReducer)

| Action | 설명 |
|---|---|
| `ADD_TOAST` | Deferred 토스트 추가 |
| `REMOVE_TOAST` | 스킬 ID로 토스트 제거 |
| `SHOW_BANNER` | 롤백 경고 배너 표시 |
| `DISMISS_BANNER` | 배너 해제 |

---

## 4. EL-225: 플러그인 Drift 감지기

### 4.1 알고리즘

```
detect():
  1. logs/ 디렉터리에서 *.jsonl 파일 목록 로드
  2. manifest.json에서 등록된 플러그인 이름 Set 추출
  3. 각 JSONL 파일을 줄 단위 파싱 → HookLogLine 스키마 검증
     - 파싱 실패 라인 → skip (크래시 없음)
  4. source가 registeredSet에 없으면 DriftItem으로 추가
  5. driftRate = (driftCount / totalCalls) * 100
  6. isCritical = driftRate >= DRIFT_RATE_THRESHOLD (10%)
  7. emit("drift_checked", report)
  8. isCritical이면 emit("drift_critical", report)
```

### 4.2 Drift Rate 임계치

```typescript
export const DRIFT_RATE_THRESHOLD = 10; // (%)
```

### 4.3 IPC 채널 계약 (ops-ipc)

| 방향 | 채널 | 설명 |
|---|---|---|
| Renderer → Main (handle) | `omx:ops-drift-check` | 즉시 Drift 검사 실행 |
| Renderer → Main (handle) | `omx:ops-state-clear` | `omx team api clear-state` 실행 |
| Renderer → Main (handle) | `omx:ops-setup-resync` | `omx setup` 재실행 |
| Main → Renderer (broadcast) | `omx:drift-report` | 주기적 Drift 보고서 |
| Main → Renderer (broadcast) | `omx:drift-critical` | Drift 위기 알림 |

### 4.4 폴링

```typescript
DRIFT_POLL_INTERVAL_MS = 60_000 // 60초

registerOpsIpc(omxRoot?)
  → 초기 detect() 즉시 실행
  → startPolling(60_000)
```

### 4.5 Headless 인터페이스

`DriftDetector`는 Electron 모듈에 의존하지 않으며 Node.js 환경에서도 독립 실행 가능하다.  
CI 환경에서 `drift-detector.test.ts`를 직접 실행 가능.

---

## 5. EL-226: 에러 복구 가이드 UI

### 5.1 에러 코드 → 가이드 매핑

| 에러 코드 | 가이드 제목 | 주 액션 |
|---|---|---|
| `DRIFT_CRITICAL` | 플러그인 정합성 위기 (Drift) | 환경 재동기화 (`omx:ops-setup-resync`) |
| `STATE_ROLLBACK` | 상태 역전이(Rollback) 감지 | 상태 초기화 (`omx:ops-state-clear`) |
| `CLI_UNREACHABLE` | OMX CLI 연결 불가 | 환경 진단 (`omx:ops-drift-check`) |
| `ADAPTER_DEGRADED` | 어댑터 서비스 불안정 | 어댑터 재탐지 (`omx:adapter-probe`) |
| `UNKNOWN` | 알 수 없는 오류 | 상태 초기화 (`omx:ops-state-clear`) |

### 5.2 컴포넌트 구조

```
ErrorGuideController          ← App.tsx 루트 레벨 마운트
  ├── DriftCriticalBanner     ← driftReport != null 일 때 렌더링
  │     ├── [환경 재동기화] → opsSetupResync()
  │     ├── [상세 보기]    → setOverlayErrorCode("DRIFT_CRITICAL")
  │     └── [닫기]         → setDriftReport(null)
  └── ErrorGuideOverlay       ← overlayErrorCode != null 일 때 렌더링
        ├── 가이드 패널 (title + description + steps)
        ├── [primaryAction]  → 에러 코드별 주 액션
        └── [닫기]           → setOverlayErrorCode(null)
```

### 5.3 IPC 구독 채널

| 채널 | 콜백 |
|---|---|
| `omx:drift-critical` | `onDriftCritical(report)` → Drift 배너 표시 |
| `omx:error-guide-open` | `onErrorGuideOpen(code)` → 가이드 오버레이 열기 |

### 5.4 data-testid 인벤토리

| testid | 컴포넌트 | 용도 |
|---|---|---|
| `drift-critical-banner` | DriftCriticalBanner | 위기 배너 루트 |
| `drift-resync-button` | DriftCriticalBanner | 환경 재동기화 버튼 |
| `drift-detail-button` | DriftCriticalBanner | 상세 보기 버튼 |
| `error-guide-overlay` | ErrorGuideOverlay | 오버레이 루트 (배경 포함) |
| `error-guide-panel` | ErrorGuideOverlay | 가이드 패널 |
| `error-guide-title` | ErrorGuideOverlay | 에러 코드 제목 |
| `error-guide-steps` | ErrorGuideOverlay | 복구 단계 컨테이너 |
| `error-guide-primary-action` | ErrorGuideOverlay | 주 액션 버튼 |
| `error-guide-secondary-action` | ErrorGuideOverlay | 보조 액션 버튼 |
| `error-guide-close` | ErrorGuideOverlay | 닫기 버튼 |

---

## 6. 싱글턴 패턴

### MultiStateValidator
```typescript
export function getMultiStateValidator(): MultiStateValidator
export function _resetMultiStateValidatorForTest(): void
```

### DriftDetector
```typescript
export function getDriftDetector(omxRoot?: string): DriftDetector
export function _resetDriftDetectorForTest(): void
```

### OpsIpc
```typescript
export function registerOpsIpc(omxRoot?: string): void
export function unregisterOpsIpc(): void
export function _resetOpsIpcForTest(): void
```

---

## 7. 테스트 커버리지 요약

| 파일 | 테스트 케이스 수 | 주요 시나리오 |
|---|---|---|
| `EL-224.test.ts` | 13 | Deferred 분리, 금지 전이 거부, 토스트/배너 렌더링, electronAPI 모킹 |
| `drift-detector.test.ts` | 9 | 빈 로그, 미등록 source, drift_critical 이벤트, 파싱 오류 무시, Headless |
| `EL-226.test.ts` | 14 | DriftCriticalBanner, ErrorGuideOverlay, ErrorGuideController 통합 |

---

## 8. ADR 준수 사항

- **ADR-001**: 모든 CLI 호출 비동기 (`spawn` 기반) — `ops-ipc.ts`의 `handleStateClear`, `handleSetupResync`
- **ADR-Rollback-Guard**: `in_progress→planning`, `done→in_progress` 금지 전이 규칙 강제
- **Headless CI**: `DriftDetector`는 Electron 의존성 없이 Node.js에서 독립 실행
- **브로드캐스트 가드**: `win.isDestroyed()` 검사 후 `webContents.send()` 호출
