# [수행 기록] Phase 1 Milestone 1 — 환경 진단 및 CLI 비차단 래퍼 구축

**설계 원문:** [electron-phase1-milestone1.md](../design/electron-phase1-milestone1.md)  
**Reference Architecture:** [ADR-001-electron-agent-architecture.md](../design/ADR-001-electron-agent-architecture.md)  
**작성일:** 2026-05-26  
**완료일:** 2026-05-26  
**상태:** ✅ 구현 완료

---

## 📁 생성 파일 목록

| 파일 경로 | 관련 티켓 | 상태 | 주요 Export |
|---|---|---|---|
| `src/main/env/env-checker.ts` | EL-201 | ✅ 완료 | `runFullEnvCheck()`, `checkCliVersion()`, `runOmxDoctor()`, `verifyCodexAuth()`, `handshakeCheck()`, `EnvStatus` |
| `src/main/ipc/env-ipc.ts` | EL-201 | ✅ 완료 | `registerEnvIpc()`, `broadcastEnvStatus()` |
| `src/main/cli/cli-wrapper.ts` | EL-202 | ✅ 완료 | `CliWrapper`, `parseEnvelope()`, `CliEnvelopeSchema`, `CliEnvelope` |
| `src/main/ipc/cli-ipc.ts` | EL-202 | ✅ 완료 | `registerCliIpc()` |
| `src/test/env-checker.test.ts` | EL-201 | ✅ 완료 | 5개 시나리오 (A-정상, B-미설치, C-Doctor실패, D-인증누락, E-핸드셰이크실패) |
| `src/test/cli-wrapper.test.ts` | EL-202 | ✅ 완료 | 9개 시나리오 (G/H/I parseEnvelope, A-F CliWrapper 인스턴스) |

---

## 🎫 EL-201. OMX 환경 진단 및 헬스체크 모듈 구현

**우선순위:** P1 | **실행 순서:** 1번째 | **그룹:** Infra (Environment)

### 체크리스트

- [x] `omx --version` 전역 CLI 가용성 체크 로직 구현  
  → `src/main/env/env-checker.ts` — `checkCliVersion()` 함수
- [x] `omx doctor --json` 표준 반환 스키마 유효성 파서 구현  
  → `src/main/env/env-checker.ts` — `runOmxDoctor()` 함수
- [x] `codex login status` 파싱 및 불일치 예외 처리 가이드라인 수립  
  → `src/main/env/env-checker.ts` — `verifyCodexAuth()` 함수
- [x] `omx exec` 핸드셰이크 커맨드를 이용한 런타임 쉘 연기 테스트 구현  
  → `src/main/env/env-checker.ts` — `handshakeCheck()` 함수  
  → 기대 응답: `OMX-EXEC-OK`
- [x] Renderer 레이어로 가용 상태를 전달할 `env_status_get` IPC 채널 개방  
  → `src/main/ipc/env-ipc.ts` — `ipcMain.handle('env_status_get', ...)`
- [x] `env-checker.test.ts` 정상/미설치/인증누락 시나리오 검증 성공

### 구현 메모

```
// env-checker.ts 핵심 플로우
1. checkCliVersion()    → `omx --version` stdout 파싱 → semver 검증
2. runOmxDoctor()       → `omx doctor --json` → Zod 스키마 파싱
3. verifyCodexAuth()    → `codex login status` → "authenticated" 여부 확인
4. handshakeCheck()     → `omx exec -C . "Reply with exactly OMX-EXEC-OK"` 실행
5. 전체 결과 → EnvStatus 인터페이스로 집계 → env-ipc.ts 로 전달
```

### DoD 확인

- [x] CLI 미설치 또는 버전 불일치 시 Renderer UI에 에러 상태 전달 가능
- [x] `omx doctor` 결과를 JSON으로 파싱하여 누락 설정 식별
- [x] `env-checker.test.ts` 3개 시나리오 모두 통과

---

## 🎫 EL-202. 비차단(Non-blocking) CLI 래퍼 클래스 구현

**우선순위:** P0 | **실행 순서:** 2번째 | **전제 티켓:** EL-201 | **그룹:** Infra (CLI Bridge)

### 체크리스트

- [x] `child_process.spawn` 기반 비동기 커맨드 실행기 설계 및 에러 핸들링 구조 확립  
  → `src/main/cli/cli-wrapper.ts` — `CliWrapper` 클래스  
  → `spawnSync` **절대 사용 금지** (ADR-001 4원칙 #2)
- [x] Unary JSON 명령 처리용 완료 시점 버퍼 합산 및 Zod 스키마 파서 구현  
  → `CliWrapper.executeUnary(args: string[]): Promise<CliEnvelope>`
- [x] **[확장성 게이트]** `readline` 기반 Ndjson 파이프라인 대응 스트림 바인딩 인터페이스  
  → `CliWrapper.executeStream(args, onLine, onRaw?): { kill }` — Phase 2 StreamParser(EL-213) 토대
- [x] 표준 JSON 봉투 `ok: false` 시 `error: { message, code }` 분기 처리 모듈  
  → `src/main/cli/cli-wrapper.ts` — `parseEnvelope()` 함수
- [x] `cli-ipc.ts` — `ipcMain.handle('cli_exec', ...)` 채널 등록  
  → `src/main/ipc/cli-ipc.ts` — args 화이트리스트 검증 포함
- [x] `cli-wrapper.test.ts` `omx team api read-task` 모킹 시나리오 단위 테스트 완료

### 구현 메모

```typescript
// CliWrapper 인터페이스 스켈레톤
interface CliEnvelope {
  schema_version: "1.0";
  ok: boolean;
  data?: unknown;
  error?: { message: string; code: string };
}

class CliWrapper {
  executeUnary(args: string[]): Promise<CliEnvelope>
  executeStream(args: string[], onLine: (parsed: unknown) => void): void
}
```

### DoD 확인

- [x] `omx team api <명령어> --json` 호출 시 UI 블로킹 없이 Promise로 반환
- [x] 유효하지 않은 봉투(Envelope) 수신 시 명확한 파싱 에러 반환
- [x] `cli-wrapper.test.ts` mock process 비동기 흐름 검증 통과

---

## ✅ Milestone 완료 기준

- [x] EL-201 DoD 전항목 통과
- [x] EL-202 DoD 전항목 통과
- [x] 두 티켓의 테스트 파일(`env-checker.test.ts`, `cli-wrapper.test.ts`) CI 녹색 확인
- [x] ADR-001 4원칙 체크리스트 이상 없음 (`spawnSync` 미사용 등)

---

## 📝 구현 노트

- `env-ipc.ts`에 세션 캐시(`cachedStatus`) 적용 — 앱 세션당 최초 1회만 전체 진단 수행. `env_status_refresh` 채널로 강제 재검사 가능.
- `cli-ipc.ts`에 args 화이트리스트 검증 추가 — `..`, `/`, `;`, `|` 등 경로/명령 주입 패턴 차단.
- `executeStream`의 `onRaw` fallback 파라미터 추가 — 비JSON stdout이 크래시 없이 처리됨.
- `CliEnvelope`는 `discriminatedUnion('ok', ...)` Zod 스키마로 ok:true/false 타입가드가 자동 분리됨.
