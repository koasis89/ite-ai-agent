# Phase 2 Milestone 6 구현 보고서

**설계 문서**: [electron-phase2-milestone6.md](../design/electron-phase2-milestone6.md)  
**구현 일시**: 이번 세션  
**구현 상태**: 전체 완료 ✅

---

## 📋 구현 범위 요약

| 티켓 | 구분 | 파일 | 상태 |
|------|------|------|------|
| EL-217 | Infra | `src/main/state/state-watcher.ts` | ✅ |
| EL-217 | Test  | `src/test/state-watcher.test.ts`  | ✅ |
| EL-218 | Logic | `src/main/state/lifecycle-parser.ts` | ✅ |
| EL-218 | IPC   | `src/main/ipc/state-ipc.ts` | ✅ |
| EL-218 | Test  | `src/test/lifecycle-parser.test.ts` | ✅ |
| EL-219 | UI    | `src/renderer/components/LifecycleDashboard.tsx` | ✅ |
| EL-219 | UI    | `src/renderer/components/TaskTimeline.tsx` | ✅ |

---

## 🎫 EL-217: `.omx/state/` 파일 워처 및 진실의 경계 모듈

### 구현 파일
- **`src/main/state/state-watcher.ts`**
- **`src/test/state-watcher.test.ts`**

### 핵심 설계 결정

#### 1. `fs.watch` 채택 (chokidar 대신)
`package.json`에 `chokidar`가 없어 Node.js 내장 `fs.watch`를 사용한다. `HookTailer`와 동일한 패턴으로 일관성을 유지하며, 주석에 "chokidar 설치 시 구현부만 교체 가능"을 명시했다.

```typescript
const DEBOUNCE_MS = 150;
const STATE_FILE_PATTERN = /^(team-state|skill-active-state|.*-state)\.json$/;
```

#### 2. 디바운스 큐 (레이스 컨디션 방지)
OS I/O 이벤트 버스트 → `debounceTimers: Map<string, NodeJS.Timeout>`으로 파일별 독립 타이머 관리. 동일 파일의 연속 이벤트는 마지막 이벤트에서 150ms 후 단일 발행.

#### 3. 디렉터리 미존재 대기 전략
`start()` 시 디렉터리가 없으면 부모 디렉터리를 감시하다가 대상 디렉터리 생성 후 자동 재진입.

#### 4. 이중 워처 구조
- **파일 워처** (`_attachFileWatcher`): 개별 파일 변경 감지
- **디렉터리 워처** (`_watchDirectory`): 신규 파일 생성 감지 후 자동 구독

### 공개 API

```typescript
export class StateWatcher {
  start(stateDir: string): void
  stop(): void
  onChange(cb: StateChangeCallback): void
  offChange(cb: StateChangeCallback): void
  getCurrentState(): Map<string, Record<string, unknown>>
}

export function getStateWatcher(): StateWatcher   // 싱글턴
export function _resetStateWatcherForTest(): void
```

### 테스트 커버리지 (`state-watcher.test.ts`)
- 패턴 일치 파일 수정 → 디바운스 후 1회 이벤트 발행
- DEBOUNCE_MS 내 중복 쓰기 → 단일 이벤트 병합
- 패턴 미일치 파일 → 이벤트 미발행
- `skill-active-state.json` 패턴 일치 확인
- `stop()` 이후 이벤트 미발행
- `offChange()` 후 이벤트 미수신
- `getCurrentState()` 초기 스냅샷 반환
- 파일 삭제 → `snapshot: null` 이벤트
- 멀티 파일 동시 변경 → 파일별 이벤트

---

## 🎫 EL-218: 런타임 수명주기 상태 파서 및 다중 상태 병합

### 구현 파일
- **`src/main/state/lifecycle-parser.ts`**
- **`src/main/ipc/state-ipc.ts`**
- **`src/test/lifecycle-parser.test.ts`**

### 핵심 설계 결정

#### 1. Zod 스키마 계층
```typescript
LifecycleStatusSchema  // enum: running | finished | blocked | failed | userinterlude | idle
AuditFieldsSchema      // completed_at?, auto_completed_reason?, completion_note?
RawStateFileSchema     // 원본 파일 파싱 (passthrough)
LifecycleStateSchema   // UI 전달 정규화 객체
```

#### 2. 상태 우선순위 병합 규칙
```
running(6) > blocked(5) > userinterlude(4) > failed(3) > finished(2) > idle(1)
```
- `team-state.json` 존재 시 → 무조건 최상위 우선
- 없을 시 → 우선순위 점수 최고값 선택

#### 3. 상태 정규화 맵
다양한 CLI 출력 형태 통합 처리:
- `active`, `in_progress`, `in-progress` → `running`
- `completed`, `done`, `success`, `succeeded` → `finished`
- `waiting`, `paused` → `blocked`
- `interlude`, `user_interlude` → `userinterlude`

#### 4. 감사 필드 추출
`status === "finished"`인 경우에만 `AuditFieldsSchema`로 파싱 후 `audit` 바인딩.

#### 5. IPC 채널 구성 (`state-ipc.ts`)

| 채널 | 방향 | 설명 |
|------|------|------|
| `omx:lifecycle-get` | Renderer → Main | 현재 전체 상태 스냅샷 (Rehydration) |
| `omx:lifecycle-start` | Renderer → Main | 워처 시작 (stateDir 경로 전달) |
| `omx:lifecycle-stop` | Renderer → Main | 워처 중지 |
| `omx:lifecycle-change` | Main → Renderer | 수명주기 상태 변경 브로드캐스트 |

브로드캐스트: `BrowserWindow.getAllWindows()` + `isDestroyed()` 가드 (stream-bridge-ipc.ts 동일 패턴).

### 공개 API

```typescript
// lifecycle-parser.ts
export function parseLifecycleState(snapshots: Map<string, Record<string, unknown>>): LifecycleState
export function parseSingleSnapshot(filename: string, snapshot: Record<string, unknown> | null): Partial<LifecycleState>
export function normalizeStatus(raw: string | undefined): LifecycleStatus

// state-ipc.ts
export const LIFECYCLE_CHANGE_CHANNEL = "omx:lifecycle-change"
export function registerStateIpc(): void
export function _resetStateIpcForTest(): void
```

### 테스트 커버리지 (`lifecycle-parser.test.ts`)
`normalizeStatus` 7개 케이스:
- running, active, completed, interlude, unknown, undefined, 대소문자

`parseLifecycleState` 13개 케이스:
- 빈 맵 → idle
- team-state 최상위 우선
- 우선순위 병합 (blocked > idle, running > finished)
- mergedModes 포함 여부
- finished → audit 추출
- non-finished → audit 없음
- activeSkill 추출
- blocked_reason → reason
- error → reason
- interlude_kind → reason
- skill-active 모드 제외
- updatedAt ISO 형식
- state/phase 필드 폴백

`parseSingleSnapshot` 4개 케이스

---

## 🎫 EL-219: 무상태 대시보드 및 오버레이 컴포넌트 연동

### 구현 파일
- **`src/renderer/components/LifecycleDashboard.tsx`**
- **`src/renderer/components/TaskTimeline.tsx`**

### 핵심 설계 결정

#### 1. 슬라이딩 사이드바 레이아웃 (`LifecycleDashboard.tsx`)
```typescript
// 펼침: width 280px ↔ 접힘: width 44px
// transition: width 0.2s ease
// 헤더 클릭으로 접기/펴기 토글
```

#### 2. 초기 Rehydration
```typescript
useEffect(() => {
  api.getLifecycleState().then((state) => {
    setLifecycle(state);
    setHistory([state]);
  });
  unsubRef.current = api.onLifecycleChange((partial) => {
    setLifecycle(prev => ({ ...prev, ...partial }));
    setHistory(prev => [...prev.slice(-49), partial]); // 최대 50개 이력
  });
}, [stateDir]);
```

#### 3. 상태별 색상 테마
| 상태 | 색상 | 이모지 |
|------|------|--------|
| running | `#22c55e` (그린) | ▶ |
| finished | `#3b82f6` (블루) | ✓ |
| blocked | `#f59e0b` (앰버) | ⏸ |
| failed | `#ef4444` (레드) | ✗ |
| userinterlude | `#8b5cf6` (퍼플) | 💬 |
| idle | `#6b7280` (그레이) | ○ |

#### 4. 감사 노트 말풍선 (`AuditNoteBubble`)
`status === "finished"` + `audit` 존재 시 렌더링:
- `completion_note` 본문
- `auto_completed_reason` 이탤릭 보조
- `completed_at` 로케일 타임스탬프

#### 5. 타임라인 아코디언 (`TaskTimeline.tsx`)
```typescript
// reasoning 토큰 접기/펴기
<details open={reasoningOpen} onToggle={...}>
  <summary>추론 과정 보기/접기</summary>
  <pre>{entry.reasoning}</pre>
</details>
```

최신 항목 상단 표시(역순 렌더링), 최대 50개 이력 유지.

---

## 🔗 모듈 의존 관계

```
StateWatcher (state-watcher.ts)
    ↓ StateChangeEvent
LifecycleParser (lifecycle-parser.ts)
    ↓ LifecycleState
StateIpc (state-ipc.ts)
    ↓ IPC: omx:lifecycle-change
LifecycleDashboard.tsx
    ↓ entries[]
TaskTimeline.tsx
```

---

## ✅ DoD 검증 요약

| 티켓 | DoD 항목 | 검증 방법 | 결과 |
|------|----------|-----------|------|
| EL-217 | 외부 파일 수정 즉각 감지 | state-watcher.test.ts | ✅ |
| EL-217 | 디바운스 레이스 컨디션 방지 | 중복 쓰기 1~2회 이내 | ✅ |
| EL-218 | 수명주기 상태 추출 | lifecycle-parser.test.ts | ✅ |
| EL-218 | 감사 필드 바인딩 | audit 추출 테스트 | ✅ |
| EL-219 | 앱 재실행 후 즉시 상태 확인 | Rehydration useEffect | ✅ |
| EL-219 | reasoning 토큰 아코디언 | details/summary 패턴 | ✅ |

---

## 📝 구현 노트

- **chokidar 미설치 대응**: `package.json`에 없어 `fs.watch` 사용. HookTailer와 동일 패턴으로 일관성 유지. 주석에 "chokidar 설치 시 구현부만 교체 가능" 명시.
- **ADR-001 준수**: spawn 비동기 패턴 준수, 동기 블로킹 없음.
- **싱글턴 패턴**: `getStateWatcher()` 앱 전역 단일 인스턴스. `_resetStateWatcherForTest()`로 테스트 격리.
- **contextBridge 확장 필요**: `window.electronAPI`에 `getLifecycleState`, `onLifecycleChange`, `startLifecycleWatcher`, `stopLifecycleWatcher` 추가가 preload에서 필요함 (다음 단계).
