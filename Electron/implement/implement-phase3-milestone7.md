# Phase 3 Milestone 7 구현 내역

**Milestone**: Phase 3 Milestone 7 — 마크다운 프로젝트 위키(Wiki) 및 외부 어댑터 검색 고도화  
**티켓**: EL-221, EL-222, EL-223  
**구현 완료일**: 2025-01-01  
**원칙**: No-Vector (외부 임베딩 API 없이 OMX CLI 정적 마크다운 결과만 반환)  
**ADR**: ADR-001 (spawnSync 금지, 모든 CLI → 비동기 spawn)

---

## 생성 파일 목록

| 경로 | 티켓 | 역할 |
|---|---|---|
| `src/main/cli/wiki-wrapper.ts` | EL-221 | OMX CLI wiki 명령 래퍼 (No-Vector) |
| `src/renderer/components/WikiOverlay.tsx` | EL-221 | 위키 도구 호출 감지 인라인 배지 + 마크다운 뷰어 |
| `src/main/cli/adapter-probe.ts` | EL-222 | OpenClaw/Hermes 어댑터 상태 탐지 |
| `src/main/ipc/adapter-ipc.ts` | EL-222 | 어댑터 IPC 등록기 + 30초 폴링 브로드캐스터 |
| `src/renderer/components/KnowledgePanel.tsx` | EL-223 | 지식 탐색기 사이드패널 |
| `src/renderer/components/AdapterStatusBar.tsx` | EL-223 | 하단 어댑터 상태 표시줄 |
| `src/test/wiki-wrapper.test.ts` | EL-221 | WikiWrapper 단위 테스트 |
| `src/test/adapter-probe.test.ts` | EL-222 | adapter-probe 단위 테스트 |
| `src/test/EL-223.test.ts` | EL-223 | Knowledge Explorer UI 컴포넌트 테스트 |

---

## EL-221: `.omx_wiki` 기반 지식 계층 검색 래퍼 및 오버레이 연동

### `wiki-wrapper.ts`

**Zod 스키마:**
- `WikiItemSchema`: `{ title, path, summary? }`
- `WikiListDataSchema`: `{ items: WikiItemSchema[] }`
- `WikiDocumentSchema`: `{ title, content, path? }`
- `WikiSearchResultSchema`: `{ query, hits: WikiItemSchema[] }`

**클래스 `WikiWrapper`:**
```typescript
class WikiWrapper {
  constructor(private cli: CliWrapper) {}
  listWiki(): Promise<z.infer<typeof WikiListDataSchema>>
  readWiki(title: string): Promise<z.infer<typeof WikiDocumentSchema>>
  searchWiki(query: string): Promise<z.infer<typeof WikiSearchResultSchema>>
}
```

**CLI 명령 매핑:**
```
listWiki()    → omx wiki list --json
readWiki()    → omx wiki read <title> --json
searchWiki()  → omx wiki search <query> --json
```

**No-Vector 준수**: `executeUnary` 단일 호출만 사용. 외부 임베딩 API 호출 없음.

**싱글턴 API:**
```typescript
export function getWikiWrapper(): WikiWrapper
export function _resetWikiWrapperForTest(): void  // 테스트 전용
```

---

### `WikiOverlay.tsx`

**상태 타입:**
```typescript
type WikiBadgeState = {
  id: string;
  query: string;
  phase: "searching" | "done" | "error";
};
```

**구독 채널:**
- `omx:stream-tool-call` — 위키 도구 호출 시작 감지
- `omx:stream-tool-result` — 위키 도구 결과 수신

**컴포넌트:**
- `WikiBadge`: pulsing 파란 원 → `✅` 트랜지션 애니메이션
- `MarkdownViewer`: 슬라이드-인 우측 패널 (ESC 닫기, `prose` 클래스 마크다운 렌더링)
- `WikiOverlay`: 채널 구독 관리 + 배지 목록 렌더링

**판별 함수:**
```typescript
function isWikiTool(name: string): boolean {
  return name.startsWith("wiki");
}
```

---

## EL-222: 외부 에이전트 어댑터 상태 브릿지 및 프로브 구현

### `adapter-probe.ts`

**Zod 스키마:**
```typescript
AdapterStatusSchema     = z.enum(["unavailable","installed","degraded","running"])
AdapterTargetSchema     = z.enum(["openclaw","hermes"])
AdapterEnvelopeSchema   = z.object({ version?, capabilities?, endpoint? })
AdapterProbeSchema      = z.object({ latency_ms?, alive, error? })
AdapterInfoSchema       = z.object({ target, status, envelope?, probe?, probed_at })
```

**함수:**
```typescript
probeAdapter(target: AdapterTarget, cli?: CliWrapper): Promise<AdapterInfo>
probeAllAdapters(cli?: CliWrapper): Promise<AdapterInfo[]>
```

**상태 전이 로직:**
1. `omx adapt <target> status --json` 호출
2. `ok=false` → `unavailable` 반환 (throw 없음)
3. `status !== "running"` → envelope/probe 연쇄 없음
4. `status === "running"` → envelope + probe 연쇄 호출
5. `probe.alive === false` → status를 `degraded`로 다운그레이드

**안전 격리**: `.omx/state/` 디렉터리 침범 없음. Read-only 탐지만 수행.

---

### `adapter-ipc.ts`

**IPC 채널 계약:**
```typescript
export const ADAPTER_PROBE_CHANNEL  = "omx:adapter-probe"   // request-response
export const ADAPTER_STATUS_CHANNEL = "omx:adapter-status"  // broadcast (push)
```

**등록 및 폴링:**
```typescript
export function registerAdapterIpc(): void    // ipcMain.handle + 초기 탐지 + 30s 폴링
export function unregisterAdapterIpc(): void  // 핸들러 + 인터벌 해제
export function _resetAdapterIpcForTest(): void
```

**폴링 간격:** `POLL_INTERVAL_MS = 30_000` (30초)

**브로드캐스트:**
```typescript
function broadcastAdapterStatus(info: AdapterInfo): void
// BrowserWindow.getAllWindows() + !win.isDestroyed() 가드 + win.webContents.send()
```

---

## EL-223: 위키 검색 컨텍스트 및 어댑터 상태 UI 통합 시각화

### `KnowledgePanel.tsx`

**Props:**
```typescript
interface KnowledgePanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**내부 상태 타입:**
```typescript
type SearchEntry = {
  query: string;
  hits: WikiSearchHit[];
  timestamp: number;
};
```

**핵심 기능:**
- 검색 입력 + 버튼 (`data-testid="knowledge-search-input"`, `"knowledge-search-button"`)
- 검색 히스토리 최대 20개 유지 (`data-testid="history-query"`)
- 결과 목록 (`data-testid="wiki-result-item"`) — 클릭 시 마크다운 뷰어 슬라이드-인
- `AdapterMicroBadge`: 어댑터 상태 배지 (running/degraded/installed/unavailable)
- 레이아웃: 좌측 320px 사이드패널 + 우측 520px 마크다운 뷰어 (선택적)

**`electronAPI` 사용:**
```typescript
window.electronAPI.wikiSearch(query)
window.electronAPI.wikiRead(title)
window.electronAPI.onAdapterStatus(callback)
```

---

### `AdapterStatusBar.tsx`

**Props:**
```typescript
interface AdapterStatusBarProps {
  onAdapterClick?: (info: AdapterInfo) => void;
}

export type AdapterInfo = {
  target: "openclaw" | "hermes";
  status: "unavailable" | "installed" | "degraded" | "running";
  envelope?: { version?: string; capabilities?: string[]; endpoint?: string };
  probe?: { latency_ms?: number; alive: boolean; error?: string };
  probed_at: string;
};
```

**상태 메타데이터 매핑:**
```typescript
const STATUS_META: Record<AdapterStatus, { icon, label, color, bgColor }> = {
  running:     { icon: "●", label: "연결됨",  color: "text-green-400",  bgColor: "bg-green-900/30" },
  degraded:    { icon: "⚠", label: "불안정",  color: "text-yellow-400", bgColor: "bg-yellow-900/30" },
  installed:   { icon: "○", label: "미실행",  color: "text-blue-400",   bgColor: "bg-blue-900/30" },
  unavailable: { icon: "✗", label: "없음",    color: "text-gray-500",   bgColor: "bg-transparent" },
};
```

**data-testid:**
- `adapter-status-bar`: 루트 컨테이너
- `adapter-chip-{target}`: 각 어댑터 칩
- `adapter-tooltip-{target}`: 호버 툴팁

---

## 채널 계약 요약

| 채널 | 방향 | 타입 | 설명 |
|---|---|---|---|
| `omx:adapter-probe` | renderer → main → renderer | request-response (ipcMain.handle) | 수동 어댑터 탐지 요청 |
| `omx:adapter-status` | main → renderer | push broadcast | 30초 폴링 자동 상태 갱신 |
| `omx:stream-tool-call` | main → renderer | push broadcast | 스트림 도구 호출 이벤트 |
| `omx:stream-tool-result` | main → renderer | push broadcast | 스트림 도구 결과 이벤트 |

---

## 테스트 커버리지

### `wiki-wrapper.test.ts`
- `listWiki()`: 배열 파싱, CLI 인수 검증, ok=false Error, 스키마 불일치 Error
- `readWiki()`: 문서 파싱, 인수 검증, content 필수 확인
- `searchWiki()`: 결과 파싱, 빈 hits 처리, No-Vector 확인 (executeUnary 1회만 호출)

### `adapter-probe.test.ts`
- `AdapterStatusSchema`: 4개 상태 파싱, 알 수 없는 값 거부
- `probeAdapter("openclaw")` running: 3회 CLI 호출 (status+envelope+probe), 메타데이터 파싱
- `probeAdapter("hermes")` degraded: 1회 CLI 호출만, envelope/probe undefined
- `probe.alive=false` → degraded 다운그레이드
- ok=false → unavailable 반환 (throw 없음)
- `probeAllAdapters()`: openclaw+hermes 병렬, 오류 시 나머지 계속

### `EL-223.test.ts`
- `KnowledgePanel`: isOpen 토글, 검색 입력/버튼, 결과 렌더링, wikiRead 호출, 닫기, 히스토리 최대 20개
- `AdapterStatusBar`: running/degraded 칩 렌더링, 두 칩 동시, onAdapterClick 콜백

---

## No-Vector 원칙 준수 확인

- `wiki-wrapper.ts`: `executeUnary` 단일 호출만 사용 ✅
- 외부 임베딩 API (OpenAI Embeddings, etc.) 호출 없음 ✅
- 벡터 DB (Pinecone, Weaviate, etc.) 연결 없음 ✅
- OMX CLI가 반환하는 정적 마크다운 결과만 반환 ✅
