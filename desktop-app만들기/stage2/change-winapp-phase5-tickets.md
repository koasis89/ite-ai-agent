# change-winapp Phase 5 구현 티켓

이 문서는 Phase 4(WIN-030~WIN-034) 완료 이후,
데스크탑 앱 "영속성 + 설정 저장소" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-041 ~ WIN-044)는 **권장 실행 순서**에 따라 부여되었고,
Phase 4 의 좌측 세션 목록(WIN-032) / 채팅 메시지(WIN-031) / 명령 히스토리(Phase 3 ring buffer 50건) 가
앱 재시작에도 살아남도록 `%APPDATA%/oh-my-codex/` 표준 저장 경로 위에 정착시키는 것이 목표다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](../stage1/개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase4-tickets.md](change-winapp-phase4-tickets.md) 마감 상태에서 진입
- 갭 분석 출처: [stage2-roadmap-winapp.md §3·§4 Phase 5](stage2-roadmap-winapp.md), [future-winapp.md C5](../stage1/future-winapp.md)

Phase 5 (영속성 + 설정 저장소) 범위:
- `%APPDATA%/oh-my-codex/` 표준 경로 정의 + Electron `app.getPath('userData')` 정합
- 설정 파일(`config.json`) + 마이그레이션 훅
- 세션·대화 SQLite 저장소(`better-sqlite3`) — Phase 4 in-memory `session-store` 의 교체 백엔드
- 명령 히스토리 ring buffer → SQLite 백엔드 (Phase 3 의 in-memory 50건 대체)
- 기존 CLI `.omx/state/*` 와의 호환 어댑터 — CLI 와 데스크탑 앱이 같은 상태 파일을 안전하게 공유

완료 목표:
- 앱을 종료/재시작해도 좌측 세션 목록·채팅·명령 히스토리가 동일하게 복원된다.
- 데스크탑 앱의 `config.json` 변경이 다음 실행에도 유지되고, 스키마 변경 시 마이그레이션이 자동 수행된다.
- 기존 CLI 사용자가 사용 중인 `.omx/state/*` 가 데스크탑 앱에서 read-only 로 안전하게 보이며, 의도된 쓰기 경로는 표준 저장 경로 1곳으로 수렴한다.

공통 작업 지점(모든 티켓 공통):
- [desktop/main/index.ts](../../desktop/main/index.ts) — `app.getPath('userData')` 정합 + 부트 시 저장소 초기화
- [desktop/ipc/commands.ts](../../desktop/ipc/commands.ts) — 영속 저장소 의존 명령은 기존 화이트리스트 패턴 그대로 (신규 IPC 명령 최소화)
- [desktop/__tests__/](../../desktop/__tests__/) — 신규 저장소별 회귀 테스트 (`config-store.test.ts` / `sqlite-store.test.ts` / `history-store.test.ts` / `legacy-state-adapter.test.ts`)
- [src/core/local-process-transport.ts](../../src/core/local-process-transport.ts) — `allowedCwdRoots` 에 `%APPDATA%/oh-my-codex/` 자동 등록
- [winapp만들기/stage2/winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 매뉴얼 §6 (신설) "데이터 저장 경로" 갱신

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| TBD | TBD | US-41 WIN-041 설정 저장소(`config.json`) + 마이그레이션 훅 |
| TBD | TBD | US-42 WIN-042 세션·대화 SQLite 저장소 (better-sqlite3) |
| TBD | TBD | US-43 WIN-043 명령 히스토리 SQLite 백엔드 (in-memory 50건 대체) |
| TBD | TBD | US-44 WIN-044 기존 `.omx/state/*` 호환 어댑터 (read-only 공유) |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-02 : 윈도우 데스크탑 앱 영속성 + 설정 저장소 (신규 — 등록 필요)
- 스프린트 SP-05 : 윈도우 데스크탑 앱(5단계, 영속성/저장소) (신규 — 등록 필요)
- 유저스토리 매핑 : US-41~US-44 = WIN-041~WIN-044 (권장 실행 순서대로 부여)
- Task Description: 파일 첫 글자에 BOM(\uFEFF) 을 추가한 patch 스크립트를 작성해야 할 수도 있음 (Taiga가 UTF-8 인식 문제로 일부 파일을 깨는 경우 대비)

---

## 스프린트 백로그 (SP-05)

---

## WIN-041. 설정 저장소(`config.json`) + 마이그레이션 훅

- 우선순위: P0
- 실행 순서: 1번째 (이후 모든 저장소가 의존하는 경로/스키마 버전 SSOT)
- 선행 티켓: WIN-019 (NSIS 패키징 — `%APPDATA%` 정합 확인), WIN-032 (Phase 4 세션 in-memory)
- 그룹: Infra (저장 경로 + 스키마 버전)
- 목표: `%APPDATA%/oh-my-codex/config.json` 을 단일 진실 공급원으로 정의하고, 스키마 변경 시 자동 마이그레이션이 동작하도록 한다.
- 대상 경로:
  - `desktop/main/config/store.ts` (신규 — `ConfigStore` 클래스)
  - `desktop/main/config/schema.ts` (신규 — zod 스키마 + 버전 상수 `CONFIG_SCHEMA_VERSION`)
  - `desktop/main/config/migrations/` (신규 디렉터리 — `v1.ts`, `v2.ts` 형식)
  - `desktop/main/index.ts` (부트 시 `ConfigStore.load()` 호출)
  - `desktop/__tests__/config-store.test.ts` (신규)
- 구현 책임:
  - 경로: `app.getPath('userData')/config.json` (Windows: `%APPDATA%/oh-my-codex/config.json`)
  - 초기 스키마(v1): `{ schemaVersion: 1, ui: { theme, fontSize }, transport: { preferred: 'pty'|'local-process' }, exec: { omxAllowed: boolean }, telemetry: { optIn: boolean } }`
  - 마이그레이션 체인: `vN → vN+1` 순차 적용, 실패 시 백업(`config.json.bak.<timestamp>`) 후 v1 초기화
  - atomic write: `tmp + rename` 패턴 (write-truncate 중 크래시 시 손상 방지)
- 보안 정책:
  - zod 검증 실패 시 거부 + 백업 + 기본값 복원
  - 외부 입력(IPC) 으로 `config.json` 직접 쓰기 금지 — 변경은 `ConfigStore.set(key, value)` 화이트리스트 API 만 허용
  - 파일 권한: 가능한 경우 사용자 전용 (Windows ACL 기본값 활용)
- 작업:
  - `ConfigStore.load()`/`get(key)`/`set(key, value)`/`getAll()` API
  - 마이그레이션 dry-run 모드 (테스트용)
  - 부트 시 마이그레이션 실행 결과 로그(`main.log`)
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 첫 실행 시 `config.json` v1 자동 생성
  - 임의 스키마 손상 시 백업 + 기본값 복원, 앱이 계속 부팅
  - `npm run test:phase2:windows:compiled` 회귀 무영향
  - 신규 회귀: v1→v2 마이그레이션 dry-run 케이스 1종 통과
- 체크리스트:
  - [x] `ConfigStore` + zod 스키마 v1 작성
  - [x] atomic write (`tmp + rename`)
  - [x] 마이그레이션 chain runner + 백업 로직
  - [x] `config-store.test.ts` (load / set / 손상 복구 / dry-run 마이그레이션)
  - [ ] 매뉴얼 §6 "데이터 저장 경로" 신규 섹션
- 작업 결과: [winapp만들기/stage2/result/작업내역-W041.md](result/작업내역-W041.md)

- Taiga 등록 내역 (WIN-041) — 완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-41 (id=44, ref=#169) / Tasks 116(#170)/117(#171)/118(#172) description PATCH 완료

---

## WIN-042. 세션·대화 SQLite 저장소 (better-sqlite3)

- 우선순위: P0
- 실행 순서: 2번째 (Phase 4 in-memory `session-store` 의 교체 백엔드)
- 선행 티켓: WIN-041, WIN-031, WIN-032
- 그룹: Infra (영속 저장소)
- 목표: 세션/메시지/도구 호출 로그를 SQLite 단일 파일에 영속 저장하고, Phase 4 의 `session-store` 인터페이스를 100% 호환 유지하며 백엔드만 교체한다.
- 대상 경로:
  - `desktop/main/storage/sqlite.ts` (신규 — connection + migrations)
  - `desktop/main/storage/session-repo.ts` (신규 — `SessionRepo` / `MessageRepo`)
  - `desktop/main/storage/migrations/001_init.sql` (신규)
  - `desktop/renderer/chat/session-store.ts` (Phase 4 산출물 — IPC 어댑터로 교체)
  - `desktop/__tests__/sqlite-store.test.ts` (신규)
- 스키마 (v1):
  - `sessions(id TEXT PK, name TEXT, created_at INTEGER, updated_at INTEGER)`
  - `messages(id TEXT PK, session_id TEXT FK, role TEXT, content TEXT, created_at INTEGER, streaming INTEGER DEFAULT 0)`
  - `tool_calls(id TEXT PK, message_id TEXT FK, command TEXT, args TEXT, exit_code INTEGER, duration_ms INTEGER, stdout TEXT, stderr TEXT, created_at INTEGER)`
  - 인덱스: `messages.session_id`, `messages.created_at`, `tool_calls.message_id`
- 구현 책임:
  - 경로: `app.getPath('userData')/data.sqlite`
  - `better-sqlite3` (synchronous, Electron ABI 매칭 — `@electron/rebuild` 적용, Phase 4 WIN-030 과 동일 패턴)
  - WAL 모드 활성 (`PRAGMA journal_mode=WAL`) + `PRAGMA synchronous=NORMAL`
  - 마이그레이션: `migrations/NNN_*.sql` 정렬 후 미적용분만 순차 실행, `schema_migrations` 테이블 기록
  - `SessionRepo` API: `create(name)`/`rename(id, name)`/`delete(id)`/`list(limit, offset)`/`get(id)`
  - `MessageRepo` API: `append(sessionId, message)`/`list(sessionId, limit, before)`/`updateStreaming(id, content, streaming)`
- 보안 정책:
  - 파일 권한: 가능한 경우 사용자 전용
  - SQL 인젝션 차단: 모든 쿼리는 prepared statement (`db.prepare(...)`)
  - 메시지 content 크기 상한 1MB (초과 시 거부 + 로그)
  - 동시 쓰기 보호: better-sqlite3 가 단일 프로세스 단일 thread 라 자체 안전, 다만 백업 시 short-lock 사용
- 작업:
  - Phase 4 의 `session-store.ts` 인터페이스를 그대로 유지한 IPC 어댑터로 교체 → UI 코드 변경 0
  - 세션 삭제 시 cascade (messages + tool_calls 동시 삭제) — FK `ON DELETE CASCADE` 또는 트랜잭션 안에서 명시 삭제
  - 백업 명령(향후 WIN-075 진단 번들에 흡수 가능) — 현 단계는 파일 복사 헬퍼만
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - Phase 4 의 `SessionList`/`ChatPanel` 이 코드 수정 없이 SQLite 백엔드 위에서 동작
  - 앱 재시작 후 세션 목록·메시지 100% 복원
  - 1000 세션 / 세션당 500 메시지 fixture 에서 목록 로드 < 200ms (Windows 로컬 측정)
  - 회귀: `npm run test:phase2:windows:compiled` + `sqlite-store.test.ts` 통과
- 체크리스트:
  - [x] `better-sqlite3` + `@electron/rebuild` 의존성 추가 (WIN-030 패턴 재사용)
  - [x] `migrations/001_init.sql` + runner
  - [x] `SessionRepo` / `MessageRepo` 구현 (prepared statement 강제)
  - [ ] Phase 4 `session-store.ts` 를 IPC 어댑터로 교체  ← 후속 미니티켓 (WIN-042b) 로 분리 — main 측 영속 백엔드는 본 티켓에서 완성, 렌더러 동기 인터페이스 교체는 IPC 어댑터 신설을 동반하므로 별도 분리
  - [x] `sqlite-store.test.ts` (CRUD / cascade / 1MB 상한 / WAL 회복)
  - [ ] 매뉴얼 §6 SQLite 경로/백업 설명 추가
- 작업 결과: [winapp만들기/stage2/result/작업내역-W042.md](result/작업내역-W042.md)

- Taiga 등록 내역 (WIN-042) — 완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-42 (id=45, ref=#173) / Tasks 119(#174)/120(#175)/121(#176) description PATCH 완료
- Task Description: 파일 첫 글자에 BOM(\uFEFF) 을 추가한 patch 스크립트를 작성해야 할 수도 있음 (Taiga가 UTF-8 인식 문제로 일부 파일을 깨는 경우 대비)

---

## WIN-043. 명령 히스토리 SQLite 백엔드 (in-memory 50건 대체)

- 우선순위: P1
- 실행 순서: 3번째 (WIN-042 의 SQLite 인프라 위에 명령 히스토리 분리 테이블 추가)
- 선행 티켓: WIN-042, WIN-014 (Phase 2 운영형 UI / ring buffer)
- 그룹: Infra + UI (히스토리 저장소 교체)
- 목표: Phase 3 의 in-memory 50건 ring buffer 를 SQLite 백엔드로 교체해 명령 히스토리가 재시작에도 보존되도록 한다.
- 대상 경로:
  - `desktop/main/storage/migrations/002_command_history.sql` (신규)
  - `desktop/main/storage/command-history-repo.ts` (신규)
  - `desktop/ipc/history-store.ts` (Phase 2 산출물 — SQLite 백엔드 사용으로 변경)
  - `desktop/ipc/commands.ts` (`history_list` 명령은 인터페이스 유지, 내부만 교체)
  - `desktop/__tests__/history-store.test.ts` (회귀 갱신)
- 스키마 (v2):
  - `command_history(id INTEGER PK AUTOINCREMENT, command TEXT, args_json TEXT, exit_code INTEGER, duration_ms INTEGER, started_at INTEGER, completed_at INTEGER, status TEXT, error_reason TEXT)`
  - 인덱스: `command_history.started_at DESC`, `command_history.command`
- 구현 책임:
  - `record(entry)`/`list(limit, offset)`/`search({ command, from, to })`/`purgeOlderThan(timestamp)`
  - 기본 보존: 최근 10,000건 (config 로 조정), 초과분 LRU 삭제 트리거
  - Phase 3 의 `history_list` 명령 응답 스키마(`{ items: [...] }`) 100% 호환 유지
- 보안 정책:
  - args_json 직렬화 시 비밀번호·토큰 패턴 마스킹 (간이 정규식: `(password|token|secret|api[_-]?key)=\S+` → `***`)
  - 검색 쿼리도 prepared statement
- 작업:
  - WIN-014 의 ring buffer 50건 → SQLite 어댑터로 교체, 인터페이스 무변
  - `history_list args[0]=limit` (1..200) 검증 유지
  - 추가 옵션(Phase 4 슬래시 라우터): `/history search <text>` 매핑은 WIN-033 의 SSOT 에 후속 추가 (선택)
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - 명령 실행 → 재시작 → `history_list` 응답에 직전 명령이 포함
  - 10,000건 초과 fixture 에서 LRU 삭제 동작
  - args_json 의 비밀번호 패턴 마스킹 회귀 통과
  - 회귀: `ipc-contract.test.ts` 의 `history_list` 케이스 무영향
- 체크리스트:
  - [x] `migrations/002_command_history.sql`
  - [x] `CommandHistoryRepo` 구현 + LRU 트리거
  - [x] 비밀번호·토큰 마스킹 + 회귀 테스트
  - [x] `history-store.ts` 어댑터 교체 (인터페이스 무변)
  - [x] `history-store.test.ts` (record/list/search/마스킹/LRU)
  - [ ] 매뉴얼 §6 히스토리 보존 정책 추가
- 작업 결과: `winapp만들기/stage2/result/작업내역-W043.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-043) — 완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-43 (id=46, ref=#177) / Tasks 122(#178)/123(#179)/124(#180) description PATCH 완료

- Task Description: 파일 첫 글자에 BOM(\uFEFF) 을 추가한 patch 스크립트를 작성해야 할 수도 있음 (Taiga가 UTF-8 인식 문제로 일부 파일을 깨는 경우 대비)
---

## WIN-044. 기존 `.omx/state/*` 호환 어댑터 (read-only 공유)

- 우선순위: P1
- 실행 순서: 4번째 (CLI ↔ 데스크탑 데이터 공유 경계 정리, Phase 5 마지막)
- 선행 티켓: WIN-041, WIN-042
- 그룹: Compat (CLI 호환성)
- 목표: 기존 CLI 사용자가 보유한 `.omx/state/*` 를 데스크탑 앱에서 read-only 로 안전하게 인식하고, 데스크탑 앱의 쓰기 경로는 `%APPDATA%/oh-my-codex/` 1곳으로 명확히 분리한다.
- 대상 경로:
  - `desktop/main/storage/legacy-state-adapter.ts` (신규)
  - `desktop/main/storage/legacy-state-resolver.ts` (신규 — `.omx/state` 위치 탐색)
  - `desktop/ipc/commands.ts` (`omx_state_status` 명령이 legacy 경로 fallback 사용)
  - `desktop/__tests__/legacy-state-adapter.test.ts` (신규)
- 탐색 우선순위:
  1. `process.env.OMX_STATE_DIR` (명시 지정)
  2. `process.cwd()/.omx/state` (현재 작업 디렉터리)
  3. `app.getPath('userData')/legacy-state-link` (사용자가 명시적으로 링크한 경로)
  - 어느 곳도 없으면 legacy 없음 처리
- 구현 책임:
  - `readState(name)` / `listActiveStates()` (read-only)
  - **쓰기 금지**: legacy 경로에 대한 write 호출은 throw, 데스크탑 앱의 모든 신규 상태는 `%APPDATA%/oh-my-codex/state/` 에 저장
  - legacy state 가 발견되면 UI 에 "CLI 와 공유 중인 상태 N개 (read-only)" 배너 표시 (Phase 4 채팅 system 메시지로도 알림)
- 보안 정책:
  - `allowedCwdRoots` 에 legacy 경로를 read-only intent 로 추가 — `LocalProcessTransport` 가 legacy 경로를 cwd 로 받지 않음 (탈출 차단)
  - JSON 파싱 실패 시 거부 + 로그, 앱은 계속 동작
  - symlink 탈출 차단: `fs.realpath` 결과가 허용 prefix 밖이면 거부
- 작업:
  - `omx_state_status` 명령이 legacy 경로의 state 도 합쳐서 반환 (source 필드로 구분: `'desktop'|'legacy'`)
  - 매뉴얼 §6 에 CLI 공유 운영 가이드 추가 (어떤 파일이 어디에 쓰이는지 표)
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - legacy `.omx/state/*` 가 존재할 때 데스크탑이 read-only 로 인식, 쓰기 시도는 거부
  - `omx_state_status` 응답에 `source: 'desktop'|'legacy'` 구분 포함
  - symlink 탈출 시도 거부 회귀 통과
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `legacy-state-resolver.ts` (탐색 우선순위 3단계)
  - [x] `legacy-state-adapter.ts` (read-only API)
  - [x] `omx_state_status` 응답에 source 구분 추가
  - [x] `allowedCwdRoots` 정책 갱신 (legacy 경로 read-only intent)
  - [x] `legacy-state-adapter.test.ts` (탐색 / read-only / symlink 탈출 차단)
  - [ ] 매뉴얼 §6 "CLI 와의 상태 공유" 절 추가
- 작업 결과: `winapp만들기/stage2/result/작업내역-W044.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-044) — 완료 (2026-05-23) — Sprint SP-05 (id=14) / Epic EP-02 (id=9) / US-44 (id=47, ref=#181) / Tasks 125(#182)/126(#183)/127(#184) description PATCH 완료
- Task Description: 파일 첫 글자에 BOM(\uFEFF) 을 추가한 patch 스크립트를 작성해야 할 수도 있음 (Taiga가 UTF-8 인식 문제로 일부 파일을 깨는 경우 대비)

---

## Phase 5 Exit Criteria

Phase 5 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase5-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-041 ~ WIN-044 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 회귀 없음
- 신규 회귀: `config-store.test.ts` / `sqlite-store.test.ts` / `history-store.test.ts` / `legacy-state-adapter.test.ts` 4종 통과
- 영속성: 앱 종료 → 재실행 후 좌측 세션 목록·채팅·명령 히스토리가 100% 복원
- 마이그레이션: 임의 스키마 손상 fixture 에서 백업 + 기본값 복원, 앱 부팅 계속
- 보안: 모든 SQLite 쿼리가 prepared statement 임을 자동 테스트 또는 lint 룰로 증명
- 보안: legacy `.omx/state/*` 에 대한 쓰기 시도가 차단됨을 자동 테스트로 증명
- 문서: [winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 에 §6 "데이터 저장 경로" 섹션 신규 추가 (config / SQLite / legacy 공유 표)

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 신규 모듈 / 변경 영역 | 의존 |
|---|---|---|---|
| WIN-041 | Infra | `desktop/main/config/{store,schema,migrations}` | WIN-019, WIN-032 |
| WIN-042 | Infra | `desktop/main/storage/{sqlite,session-repo,migrations/001}` + Phase 4 `session-store` IPC 어댑터 교체 | WIN-041, WIN-031, WIN-032 |
| WIN-043 | Infra+UI | `desktop/main/storage/{command-history-repo,migrations/002}` + Phase 2 `history-store` 백엔드 교체 | WIN-042, WIN-014 |
| WIN-044 | Compat | `desktop/main/storage/{legacy-state-adapter,legacy-state-resolver}` + `omx_state_status` 확장 | WIN-041, WIN-042 |

설정 SSOT: `desktop/main/config/store.ts` (WIN-041)
데이터 SSOT: `app.getPath('userData')/data.sqlite` (WIN-042)
저장 경로 SSOT 문서: [winapp-manual-v2.md §6](../stage2/winapp-manual-v2.md) (Phase 5 에서 신설)
