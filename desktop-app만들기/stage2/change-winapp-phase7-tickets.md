# change-winapp Phase 7 구현 티켓

이 문서는 Phase 6(WIN-051~WIN-054) 완료 이후,
데스크탑 앱 "첨부 / 드래그-앤-드롭 / 멀티모달" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-061 ~ WIN-064)는 **권장 실행 순서**에 따라 부여되었고,
Claude Desktop 의 핵심 입력 마찰 감소 요소 — 파일·이미지·코드 조각을
드롭으로 채팅 컨텍스트에 주입하고, 도구 호출 인자로 안전하게 전달 — 를 도입한다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](../stage1/개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase6-tickets.md](change-winapp-phase6-tickets.md) 마감 상태에서 진입
- 갭 분석 출처: [stage2-roadmap-winapp.md §3·§4 Phase 7](stage2-roadmap-winapp.md), [future-winapp.md C4](../stage1/future-winapp.md)

Phase 7 (첨부/드래그-앤-드롭 + 멀티모달) 범위:
- Renderer 의 드롭 영역 + 파일 메타데이터(name/size/mime) 추출
- IPC 안전 전송 — binary blob 전송 대신 **임시 디렉터리 복사 후 path-only 전달**
- 이미지/PDF/텍스트 인라인 프리뷰
- 채팅 메시지 첨부 슬롯 — Phase 6 도구 호출 시 첨부 path 를 인자로 전달

완료 목표:
- 사용자가 파일·이미지를 채팅 입력 영역에 끌어놓아 메시지 첨부로 주입할 수 있다.
- 첨부된 파일이 Phase 6 의 도구 호출 인자(`tool_call`) 에 안전한 경로 형태로 전달되어 MCP 도구·`omx_*` 가 처리할 수 있다.
- binary 가 IPC 채널을 흐르지 않고(메모리/직렬화 폭발 방지), 임시 디렉터리 + path-only 전송으로 보안·성능을 동시에 확보한다.

공통 작업 지점(모든 티켓 공통):
- [desktop/main/index.ts](../../desktop/main/index.ts) — 부트 시 첨부 임시 디렉터리 보장(`%APPDATA%/oh-my-codex/attachments/`)
- [desktop/ipc/commands.ts](../../desktop/ipc/commands.ts) — 신규 IPC 명령(`attachment_*`) 화이트리스트 추가
- [src/core/local-process-transport.ts](../../src/core/local-process-transport.ts) — `allowedCwdRoots` 에 첨부 임시 디렉터리 read-only intent 추가
- [desktop/__tests__/](../../desktop/__tests__/) — 신규 회귀 (`attachment-store.test.ts` / `dropzone.test.ts` / `preview.test.ts` / `tool-call-attachment.test.ts`)
- [winapp만들기/stage2/winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 매뉴얼 §8 (신설) "첨부 / 멀티모달" 갱신

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| TBD | TBD | US-61 WIN-061 Renderer 드롭 영역 + 파일 메타데이터 추출 |
| TBD | TBD | US-62 WIN-062 IPC 안전 전송 (임시 디렉터리 복사 + path-only) |
| TBD | TBD | US-63 WIN-063 이미지/PDF/텍스트 프리뷰 |
| TBD | TBD | US-64 WIN-064 채팅 메시지 첨부 슬롯 + 도구 호출 인자 전달 |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-02 : 윈도우 데스크탑 앱 첨부 / 멀티모달 (신규 — 등록 필요)
- 스프린트 SP-07 : 윈도우 데스크탑 앱(7단계, 첨부/멀티모달) (신규 — 등록 필요)
- 유저스토리 매핑 : US-61~US-64 = WIN-061~WIN-064 (권장 실행 순서대로 부여)

---

## 스프린트 백로그 (SP-07)

---

## WIN-061. Renderer 드롭 영역 + 파일 메타데이터 추출

- 우선순위: P0
- 실행 순서: 1번째 (모든 첨부 흐름의 진입점)
- 선행 티켓: WIN-031 (Phase 4 채팅 ViewModel — InputBox)
- 그룹: UI (Renderer 입력 확장)
- 목표: 채팅 InputBox 와 메시지 영역 전체에 드롭 영역을 활성화하고, 드롭된 파일의 안전한 메타데이터(name/size/mime/path)를 추출해 미확정 첨부 목록에 등록한다.
- 대상 경로:
  - `desktop/renderer/attachments/DropZone.ts` (신규)
  - `desktop/renderer/attachments/attachment-store.ts` (신규 — 미확정/확정 첨부 in-memory)
  - `desktop/renderer/chat/InputBox.ts` (Phase 4 산출물 확장 — 첨부 칩 표시)
  - `desktop/renderer/styles/attachments.css` (신규)
  - `desktop/__tests__/dropzone.test.ts` (신규)
- 구현 책임:
  - `dragenter`/`dragover`/`drop`/`dragleave` 이벤트 — 영역 전체 + InputBox 우선 hit
  - 드롭된 `File` 객체에서 `name`/`size`/`type`/(Electron `file.path`) 추출
  - 동시 드롭 다중 파일 지원 (상한 10개, 초과 시 reject + 사유 표시)
  - 메타데이터를 미확정 첨부(`pendingAttachments`)로 등록 → InputBox 위에 칩(파일명 + 크기 + 제거 X) 표시
  - 클립보드 paste(`ctrl+v`) 로 이미지 데이터(`image/*`) 도입 시 동일 흐름으로 흡수 — 메모리 Blob → WIN-062 에서 임시 파일로 승격
- 보안 정책:
  - 파일 확장자/MIME 화이트리스트 (config 로 조정): `txt md json csv log png jpg jpeg gif webp svg pdf yaml yml ts js mjs cjs html xml` — 그 외는 거부 + 사유 표시
  - 단일 파일 크기 상한 50MB (config), 누적 합계 상한 200MB
  - 경로 노출 금지: 메타데이터 표시 시 절대 경로는 숨기고 basename 만 표시
  - 임의 URL/HTML 드롭(`text/uri-list`, `text/html`) 거부 — 파일만 허용
- 작업:
  - 드롭 시 영역 시각 피드백 (border highlight)
  - 첨부 칩 키보드 접근성 (Tab 이동, Backspace 로 제거)
  - 거부 사유 시스템 메시지로 표시 (Phase 4 채팅 `system` role 재사용)
- 산출물:
  - 변경/신규 파일 4~5개
- 완료 기준(DoD):
  - 화이트리스트 파일 1~10개 드롭 시 칩으로 등록
  - 화이트리스트 외 / 50MB 초과 / 누적 200MB 초과 시 거부 + 사유 표시
  - paste 이미지가 동일 흐름으로 흡수
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `DropZone` 이벤트 핸들러 + 영역 활성
  - [x] `attachment-store.ts` 미확정 첨부 in-memory
  - [x] InputBox 칩 UI + 키보드 접근성
  - [x] 화이트리스트 / 크기 상한 / 거부 사유
  - [x] `dropzone.test.ts` (수용 / 거부 / paste 이미지)
  - [x] 매뉴얼 §8.1 드롭 사용법 + 화이트리스트 표 추가
- 작업 결과: `winapp만들기/stage2/result/작업내역-W061.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-061) — 등록 완료 — Sprint SP-07 id=16 / Epic EP-02 id=9 (Phase 4~8 포함) / US-61 id=53 ref=#205 / Tasks 143(구현)·144(검증)·145(문서) — PATCH 200×3, version 1→2, descLen 4425/2763/1992

---

## WIN-062. IPC 안전 전송 (임시 디렉터리 복사 + path-only)

- 우선순위: P0
- 실행 순서: 2번째 (WIN-061 의 미확정 첨부를 main 측에서 안전하게 보관)
- 선행 티켓: WIN-061, WIN-041 (config 저장소), WIN-042 (SQLite — Phase 5)
- 그룹: Infra + Security
- 목표: Renderer 가 보유한 첨부를 main 으로 옮길 때 binary blob 을 IPC 로 흘리지 않고, 원본을 `%APPDATA%/oh-my-codex/attachments/<uuid>/<safe-basename>` 로 복사 후 **path 만** 전달한다.
- 대상 경로:
  - `desktop/main/attachments/attachment-repo.ts` (신규 — SQLite `attachments` 테이블 + FS 복사)
  - `desktop/main/attachments/sanitizer.ts` (신규 — basename 정규화 / 경로 탈출 차단)
  - `desktop/main/storage/migrations/005_attachments.sql` (신규, 004 슬롯 충돌 회피)
  - `desktop/ipc/commands.ts` (신규 명령 `attachment_register` / `attachment_get` / `attachment_delete` / `attachment_list`)
  - `desktop/__tests__/attachment-store.test.ts` (신규)
- 스키마 (Phase 5 SQLite 확장):
  - `attachments(id TEXT PK, message_id TEXT FK NULL, name TEXT, mime TEXT, size INTEGER, path TEXT, sha256 TEXT, created_at INTEGER, expires_at INTEGER)`
  - 인덱스: `attachments.message_id`, `attachments.created_at`, `attachments.expires_at`
- 추가 IPC 명령(4종):
  - `attachment_register` — args[0]=`{ name, mime, size, sourcePath?, base64?, sha256? }`. main 이 임시 디렉터리로 복사 → 새 path 반환 (`{ id, path, sha256 }`)
    - Electron 환경: `sourcePath` 우선 (원본 파일 → 복사)
    - 클립보드 이미지: `base64` 폴백 (작은 데이터 한정 — 본 명령 페이로드 상한 5MB)
  - `attachment_get` — args[0]=id. 메타데이터 + path 반환 (binary 미반환)
  - `attachment_delete` — args[0]=id. FS 파일 + DB row 삭제
  - `attachment_list` — args[0]=messageId 또는 (`limit`/`offset`). 메타데이터 목록 반환
- 구현 책임:
  - 임시 디렉터리: `app.getPath('userData')/attachments/<uuid>/` (UUID v4, 8글자 prefix 디렉터리 분기 가능)
  - basename sanitize: 정규식 `[^\w.\-]` → `_`, 최대 100자, 빈 이름은 `file`
  - 동일 sha256 dedup (선택): 있으면 새 path 만들지 않고 기존 path 재참조 (`refCount` 컬럼 추가는 차후 최적화)
  - 미사용 첨부 자동 만료(기본 7일, config 조정) — 부트 시 만료 청소 작업
  - 메시지 삭제(Phase 5 cascade) 와 함께 연결된 첨부도 삭제
- 보안 정책:
  - **binary 는 IPC 페이로드로 전달하지 않음** (Electron `webContents` 의 IPC 메시지 크기/성능 한계 회피 + 메모리 폭발 방지)
  - basename 정규화로 디렉터리 탈출(`..`, 절대 경로, NUL) 차단
  - 결과 path 는 항상 `app.getPath('userData')/attachments/` prefix 내부임을 `path.relative` 로 재검증
  - SHA-256 무결성 — 등록 시 main 측에서 재계산해 caller 값과 비교, 불일치 시 거부
  - `attachment_register` 페이로드 상한 5MB (base64 폴백 한정). `sourcePath` 경로는 절대 경로만 허용 + symlink 거부(`fs.realpath` 비교)
  - `LocalProcessTransport.allowedCwdRoots` 에 첨부 디렉터리를 **read-only intent** 로 추가 — 도구의 cwd 로 사용 금지(탈출 차단), 인자로만 전달
- 작업:
  - 마이그레이션 `005_attachments.sql` 등록 (Phase 5 SQLite migration runner 재사용, 004 슬롯은 WIN-054가 사용)
  - 부트 시 만료 청소 + 고아 파일(DB 미등록) 청소
  - WIN-061 의 미확정 첨부 → `attachment_register` 호출 후 확정 첨부로 승격
- 산출물:
  - 변경/신규 파일 6~7개
- 완료 기준(DoD):
  - Renderer 가 binary 를 IPC 로 보내지 않음(자동 테스트로 페이로드 검사)
  - 등록된 첨부의 path 가 항상 `app.getPath('userData')/attachments/` 하위
  - basename `../../../evil.txt` 같은 입력이 sanitize 되어 거부 또는 안전 경로로 변환
  - sha256 불일치 시 거부
  - 7일 경과 미사용 첨부 자동 삭제
  - 회귀: `ipc-contract.test.ts` 에 `attachment_*` 4종 accept/reject 케이스 추가
- 체크리스트:
  - [x] `migrations/005_attachments.sql` (기획 슬롯 004 은 WIN-054 `004_tool_calls_v2.sql` 가 점유 → 005 로 조정)
  - [x] `attachment-repo.ts` (등록/조회/삭제/만료 청소)
  - [x] `sanitizer.ts` (basename / 경로 탈출 / symlink)
  - [x] `attachment_register/get/delete/list` IPC + zod 스키마
  - [x] 만료 청소 boot 작업 + 고아 파일 청소
  - [x] `LocalProcessTransport.allowedCwdRoots` read-only intent 갱신 (첨부 디렉터리 미추가 정책 주석화)
  - [x] `attachment-store.test.ts` (등록/sha256/탈출 차단/만료) + `ipc-contract.test.ts` 4 명령 accept/reject
  - [x] 매뉴얼 §8.2 저장 경로 / 보존 정책 표 추가
- 작업 결과: `winapp만들기/stage2/result/작업내역-W062.md` (착수 시 생성)

- Taiga 등록 내역 (WIN-062) — Sprint SP-07 id=16 / Epic EP-02 id=9 / US-62 id=54 ref=#209 / Tasks 146(구현)·147(검증)·148(문서) — PATCH 200×3, version 1→2, descLen 5513/3470/2797

---

## WIN-063. 이미지/PDF/텍스트 프리뷰

- 우선순위: P1
- 실행 순서: 3번째 (WIN-062 의 path 위에 인라인 시각화)
- 선행 티켓: WIN-062
- 그룹: UI (Renderer 컴포넌트)
- 목표: 첨부 칩 호버/클릭 시 인라인 프리뷰를 제공해 사용자가 도구 호출 전에 내용을 확인할 수 있게 한다.
- 대상 경로:
  - `desktop/renderer/attachments/PreviewPanel.ts` (신규)
  - `desktop/renderer/attachments/previewers/{image,pdf,text}.ts` (신규 — MIME 별 렌더러)
  - `desktop/ipc/commands.ts` (신규 명령 `attachment_read_text` — 텍스트 프리뷰 한정)
  - `desktop/__tests__/preview.test.ts` (신규)
- 프리뷰 정책 (MIME 별):
  - `image/*` (png/jpg/gif/webp/svg) — `<img src="file://..." />` 직접 표시. svg 는 sanitized iframe 또는 raster 변환
  - `application/pdf` — 1페이지 미리보기. PDF.js 또는 Electron `<webview>` 격리 컨텍스트
  - `text/*`, `application/json`, `application/yaml`, `application/xml`, 코드 확장자 — 첫 200줄 또는 64KB syntax-highlight 미적용 plain `<pre>`
  - 그 외 — 메타데이터(name/size/mime/sha256)만 표시
- 추가 IPC 명령(1종):
  - `attachment_read_text` — args[0]=id, args[1]=`{ maxBytes? (1..65536, 기본 65536) }`. main 이 파일 읽어 텍스트 반환(상한 64KB), `truncated` 플래그 포함
- 구현 책임:
  - 프리뷰는 항상 첨부 디렉터리 prefix 안의 path 만 로드 (WIN-062 경계 재검증)
  - SVG: 임의 스크립트/외부 리소스 차단 — 안전 sanitizer 통과 or 비활성
  - 텍스트 인코딩 자동 감지 (UTF-8 우선, UTF-16LE/BOM fallback)
- 보안 정책:
  - `file://` URL 은 Renderer 의 CSP 에서 첨부 디렉터리만 허용 (다른 로컬 파일 노출 차단)
  - 이미지 EXIF GPS 등 민감 메타데이터는 표시하지 않음
  - PDF.js 사용 시 worker 는 별도 chunk로 packaging, 외부 네트워크 호출 차단
  - 텍스트 프리뷰 64KB 초과는 `truncated:true` + 안내 (전체는 도구 호출로만 처리)
- 작업:
  - 프리뷰 패널은 첨부 칩 우측 팝오버 또는 우측 패널 슬라이드인 (Phase 4 3분할 레이아웃의 우측 컨텍스트 영역 활용)
  - 프리뷰 캐시는 메모리 LRU (최근 10개 첨부)
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 이미지/PDF/텍스트 3종이 정상 프리뷰
  - 첨부 디렉터리 밖 path 로딩 시도 차단
  - SVG 스크립트 주입 거부 회귀 통과
  - 64KB 초과 텍스트 `truncated:true` 표시
- 체크리스트:
  - [x] `PreviewPanel` + 3종 previewer
  - [x] `attachment_read_text` IPC + 상한 64KB
  - [x] CSP `file://` 화이트리스트 (첨부 디렉터리만)
  - [x] SVG sanitizer + EXIF GPS 제거
  - [x] `preview.test.ts` (이미지 / PDF / 텍스트 / 보안 회귀)
  - [x] 매뉴얼 §8.3 프리뷰 UX 추가
- 작업 결과: [winapp만들기/stage2/result/작업내역-W063.md](result/작업내역-W063.md)

- Taiga 등록 내역 (WIN-063) — Sprint SP-07 (id=16) / Epic EP-02 (id=9) / US-63 #213 (id=55) / Tasks #214 #215 #216 (ids=149,150,151)

---

## WIN-064. 채팅 메시지 첨부 슬롯 + 도구 호출 인자 전달

- 우선순위: P0
- 실행 순서: 4번째 (Phase 6 도구 호출과 첨부의 결합 — 사용자 가치 마무리)
- 선행 티켓: WIN-061, WIN-062, WIN-063, WIN-054 (Phase 6 `tool_call`), WIN-031 (Phase 4 채팅 메시지)
- 그룹: IPC + UI (도구 인자 전달)
- 목표: 메시지 전송 시 InputBox 의 미확정 첨부를 메시지 첨부로 확정하고, Phase 6 도구 호출(`tool_call`)의 인자에 첨부 path 를 안전하게 전달한다.
- 대상 경로:
  - `desktop/renderer/chat/MessageBubble.ts` (Phase 4 산출물 — 첨부 슬롯 렌더 확장)
  - `desktop/renderer/chat/message-attachment-link.ts` (신규 — 메시지 ↔ 첨부 연결)
  - `desktop/main/storage/migrations/005_message_attachments.sql` (신규 — 또는 `attachments.message_id` 활용)
  - `desktop/renderer/chat/slash-router.ts` (Phase 4 산출물 — `/tool <id> ...` 인자에 `@<attachmentId>` 토큰 지원)
  - `desktop/main/tools/tool-router.ts` (Phase 6 산출물 — `@<attachmentId>` 토큰을 path 로 해석)
  - `desktop/__tests__/tool-call-attachment.test.ts` (신규)
- 인자 전달 규칙:
  - 메시지에 첨부가 있을 때 자동 슬래시 명령 변환은 하지 않음 — 사용자가 명시적으로 `/tool fs:read_file @attach1` 처럼 토큰 지정
  - `@<attachmentId>` 토큰은 `tool-router` 에서 첨부 메타데이터 조회 → path 치환 (`{ path, name, mime, size }`)
  - 토큰 미해석 시 거부 (404 첨부)
  - 도구 스키마가 `string` 인 인자 자리에는 path 만 전달, `object` 인자 자리에는 메타데이터 객체 전달 (도구 매니페스트 hint 기반)
- 구현 책임:
  - 메시지 전송 시점에 미확정 → 확정 승격(`attachment_register` 호출 + `message_id` 갱신)
  - 메시지 버블 하단에 첨부 칩 N개 렌더 (클릭 → WIN-063 프리뷰)
  - 메시지 삭제 시 Phase 5 cascade 로 첨부도 삭제 (WIN-062 정책)
  - Phase 6 권한 다이얼로그(WIN-053) 에 "첨부 N개 포함" 명시 — 사용자가 동의 전 확인 가능
- 보안 정책:
  - `@<attachmentId>` 해석 시 첨부 소유 세션 일치 검증 (다른 세션 첨부 접근 차단)
  - 도구 호출 후 첨부 경로는 도구 stdout/stderr 에 그대로 노출되지 않도록 권장 (도구가 결과에 절대 경로를 흘리면 사용자가 인지)
  - 메시지 삭제 → 첨부 삭제는 트랜잭션 안에서 수행
- 작업:
  - WIN-033 슬래시 라우터에 `@token` 파서 추가
  - WIN-053 권한 다이얼로그에 첨부 목록 노출
  - WIN-054 이력 패널에 첨부 컬럼 표시(있을 때)
- 산출물:
  - 변경/신규 파일 6~7개
- 완료 기준(DoD):
  - InputBox 첨부 N개 + 메시지 전송 → 메시지 버블에 첨부 칩 표시
  - `/tool fs:read_file @attach1` 같은 호출이 path 로 치환되어 정상 실행
  - 잘못된 attachmentId / 다른 세션 첨부 토큰 거부
  - 메시지 삭제 시 첨부 cascade 삭제
  - 회귀: `npm run test:phase2:windows:compiled` + `tool-call-attachment.test.ts` 통과
- 체크리스트:
  - [x] 미확정 → 확정 승격 (`message_id` 갱신 또는 join 테이블)
  - [x] MessageBubble 첨부 칩 렌더
  - [x] `@<attachmentId>` 슬래시 파서 + `tool-router` 해석
  - [x] 세션 소유권 검증 + 잘못된 토큰 거부
  - [x] 권한 다이얼로그(WIN-053) 에 첨부 노출
  - [x] 이력 패널(WIN-054) 에 첨부 컬럼
  - [x] `tool-call-attachment.test.ts` (전체 흐름 + 보안 회귀)
  - [x] 매뉴얼 §8.4 첨부 → 도구 호출 전달 사용법 추가
- 작업 결과: `winapp만들기/stage2/result/작업내역-W064.md`

- Taiga 등록 내역 (WIN-064) — Sprint SP-07(id=16) / Epic EP-02(id=9)
  - US-64 id=56 ref=#217 "WIN-064 채팅 메시지 첨부 슬롯 + 도구 호출 인자 전달 (Phase 7 마무리)"
  - Task id=152 ref=#218 "[WIN-064] 구현 작업" (descLen=4902)
  - Task id=153 ref=#219 "[WIN-064] 검증 작업" (descLen=2850)
  - Task id=154 ref=#220 "[WIN-064] 문서/정합성 반영" (descLen=2284)
  - 등록 스크립트: `winapp만들기/stage2/scripts/register-w064.ps1`

---

## Phase 7 Exit Criteria

Phase 7 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase7-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-061 ~ WIN-064 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 회귀 없음
- 신규 회귀: `dropzone.test.ts` / `attachment-store.test.ts` / `preview.test.ts` / `tool-call-attachment.test.ts` 4종 통과
- 보안: binary 가 IPC 페이로드로 전달되지 않음을 자동 테스트로 증명(메시지 페이로드 길이 검사)
- 보안: 첨부 경로가 항상 `app.getPath('userData')/attachments/` prefix 내부임을 자동 테스트로 증명
- 보안: 디렉터리 탈출(`..`)/symlink/SVG 스크립트/세션-간 첨부 접근이 모두 거부됨
- 사용자 체감: 화이트리스트 파일 드롭 → 칩 등록 → 메시지 전송 → 도구 호출 인자 전달의 end-to-end 가 1회 데모로 성공
- 문서: [winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 에 §8 "첨부 / 멀티모달" 섹션 신규 추가 (드롭 / 저장 / 프리뷰 / 도구 전달 4절)

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 신규 모듈 / 변경 영역 | 의존 |
|---|---|---|---|
| WIN-061 | UI | `desktop/renderer/attachments/{DropZone,attachment-store}` + InputBox 확장 | WIN-031 |
| WIN-062 | Infra+Security | `desktop/main/attachments/{attachment-repo,sanitizer}` + `migrations/005_attachments.sql` + `attachment_*` IPC 4종 | WIN-061, WIN-041, WIN-042 |
| WIN-063 | UI | `desktop/renderer/attachments/{PreviewPanel,previewers/*}` + `attachment_read_text` IPC | WIN-062 |
| WIN-064 | IPC+UI | `desktop/renderer/chat/message-attachment-link.ts` + `slash-router` `@token` + `tool-router` 해석 + `migrations/005_message_attachments.sql` | WIN-061~063, WIN-054, WIN-031 |

첨부 저장 SSOT: `app.getPath('userData')/attachments/<uuid>/<safe-basename>` (WIN-062)
첨부 메타 SSOT: Phase 5 SQLite `attachments` 테이블 (WIN-062 신설)
첨부 ↔ 도구 인자 SSOT: `@<attachmentId>` 토큰 (WIN-064 — slash-router 파서 + tool-router 해석)
IPC 명령 화이트리스트(누적): Phase 6 22종 + WIN-062 (4) + WIN-063 (1) = **27종**
