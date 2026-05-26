# oh-my-codex CLI -> Windows Desktop App 전환 코드 분석

이 문서는 현재 `oh-my-codex-js`의 CLI 중심 구조를
Claude Desktop 유사한 윈도우 데스크톱 앱(설치형)으로 전환할 때,
"어떤 코드를 왜 바꿔야 하는지"를 파일 단위로 정리한 작업 분석서다.

개발/검증 보완 기준:
- [개발-보완-검증-체크리스트.md](개발-보완-검증-체크리스트.md)

## 1) 현재 구조 요약

현재 아키텍처는 아래 흐름으로 동작한다.

1. `src/cli/omx.ts`
- Node 실행 진입점
- `dist/cli/index.js`를 import 후 `main(process.argv.slice(2))` 호출
- CLI 실행 후 `process.exit(...)` 처리

2. `src/cli/index.ts`
- 전체 명령 라우터
- `launch/setup/team/hud/sidecar/question/...` 명령 분기
- `console.*`, `process.exit`, `process.exitCode`, `process.argv` 직접 사용

3. 기능 모듈 (도메인 + CLI 결합)
- `src/team/*`: 팀 오케스트레이션 핵심
- `src/hud/*`: HUD 렌더/watch/tmux pane
- `src/sidecar/*`: 사이드카 렌더/watch/tmux pane
- `src/question/*`: 블로킹 질문 UI (TTY/tmux 기반)

핵심 문제는 "도메인 로직"과 "터미널/프로세스 제어" 결합이 강해
데스크톱 GUI 프로세스 구조(Main/Renderer/IPC)로 바로 옮기기 어렵다는 점이다.

## 2) Windows 앱 전환 시 변경해야 할 코드 (우선순위)

## P0. 실행 코어 분리 (필수)

### 대상 파일
- `src/cli/omx.ts`
- `src/cli/index.ts`

### 왜 바꿔야 하나
- 현재는 CLI 진입과 실행 로직이 사실상 결합되어 있다.
- 데스크톱 앱은 `Main Process`가 명령 실행을 중재하고, UI(Renderer)는 IPC로 요청한다.

### 변경 방향
- `executeCommand({ command, args, context })` 형태의 코어 실행 API 분리
- CLI는 `CLI adapter`, 데스크톱은 `IPC adapter`로 동일 코어 호출
- `process.exit*`는 CLI adapter에서만 처리

---

## P0. 출력/이벤트/에러 표준화 (필수)

### 대상 파일(대표)
- `src/cli/index.ts`
- `src/cli/team.ts`
- `src/cli/question.ts`
- `src/cli/state.ts`
- `src/cli/explore.ts`
- `src/cli/sparkshell.ts`
- `src/cli/ask.ts`

### 왜 바꿔야 하나
- 현재는 `console.log/error` 중심 출력이다.
- 데스크톱 앱은 진행 상태를 실시간 이벤트 스트림으로 UI에 전달해야 한다.

### 변경 방향
- 결과 반환 표준화
- 예: `{ ok, code, message, data, logs, diagnostics }`
- 진행 이벤트 채널 도입
- 예: `command.started`, `command.progress`, `command.completed`, `command.failed`
- IPC에서는 구조화 데이터만 교환

---

## P0. tmux 의존 경로를 Windows 친화 경로로 추상화 (필수)

### 대상 파일
- `src/team/tmux-session.ts`
- `src/team/runtime.ts`
- `src/hud/index.ts`
- `src/hud/tmux.ts`
- `src/sidecar/index.ts`
- `src/sidecar/tmux.ts`
- `src/question/renderer.ts`
- `src/question/ui.ts`

### 왜 바꿔야 하나
- Claude Desktop 스타일 앱은 tmux pane이 아닌 앱 창/패널이 UI 컨테이너다.
- 특히 Windows 환경에서 tmux 기반은 의존성 부담이 크고 UX도 분리된다.

### 변경 방향
- Transport 계층 도입
- 예: `WorkerTransport` 인터페이스
  - `TmuxTransport` (기존 유지, 호환)
  - `LocalProcessTransport` (Windows 기본)
- Question 렌더링 전략을 `webview/native-modal` 경로로 추가
- HUD/Sidecar는 문자열 렌더 대신 상태 모델 제공

---

## P1. Desktop Shell 신규 추가 (Electron 또는 Tauri)

### 신규 추가 권장 경로
- `desktop/main/` (앱 Main 프로세스)
- `desktop/preload/` (보안 브리지)
- `desktop/renderer/` (UI)
- `desktop/ipc/` (채널 계약)

### 기술 선택 가이드
- Electron
  - 장점: Node 생태계와 결합 쉬움, 기존 TS 코드 재사용 용이
  - 단점: 번들 크기/메모리 사용량 큼
- Tauri (Rust + WebView2)
  - 장점: 경량, 배포 크기 작음
  - 단점: Rust 브릿지 설계 비용 증가

현재 코드베이스(순수 TS/Node CLI) 기준으로는 1차는 Electron이 이행 난이도가 낮다.

---

## P1. IPC Command Gateway 도입

### 대상(신규)
- `desktop/ipc/commands.ts`
- `desktop/ipc/events.ts`
- `desktop/preload/index.ts`

### 왜 바꿔야 하나
- Renderer에서 Node API를 직접 열어두면 보안 리스크가 크다.
- Claude Desktop 스타일 앱은 제한된 브리지 API만 노출하는 방식이 안전하다.

### 변경 방향
- `contextIsolation: true`, `nodeIntegration: false` 전제
- preload에서 화이트리스트 API만 노출
- 예: `window.omx.runCommand(...)`, `window.omx.subscribeEvents(...)`

## 3) 실제 변경 포인트 상세

## A. Command Contract + 런타임 컨텍스트

### 바꿀 것
- command 함수 호출 시 실행 컨텍스트를 명시
- 예: `runtime: 'cli' | 'desktop-main'`

### 영향 파일
- `src/cli/index.ts` (가장 큼)
- `src/cli/*` 명령 파일 대부분

### 기대 효과
- CLI/Desktop 동시 지원 가능
- 실행 정책(권한, 파일 접근, 알림)을 런타임별로 분기 가능

---

## B. Question 시스템 데스크톱 모달화

### 현재
- `src/cli/question.ts`: JSON 입력 + 블로킹 대기
- `src/question/renderer.ts`: tmux/TTY 전략
- `src/question/ui.ts`: readline keypress

### 데스크톱 전환
- Main에서 질문 레코드 생성
- Renderer 모달/패널에 질문 표시
- 답변은 IPC로 제출
- 상태 저장은 기존 `question/state.ts` 재사용

### 핵심 변경
- `runQuestionUi()`의 터미널 루프 제거(또는 CLI 전용 격리)
- `renderer` 전략에 `desktop-ipc` 추가

---

## C. Team 실행 경로를 로컬 프로세스 기반으로 확장

### 현재
- 팀 워커 실행/제어가 tmux 기반 흐름에 많이 의존

### 데스크톱 전환
- 워커를 백그라운드 child process로 관리
- 이벤트를 Main에서 수집 후 Renderer로 스트리밍

### 핵심 변경
- `tmux-session.ts` 역할을 transport 구현으로 국한
- `runtime.ts`는 transport 인터페이스만 의존하도록 정리

---

## D. HUD/Sidecar를 데스크톱 패널로 전환

### 현재
- watch 모드: ANSI clear + 문자열 재렌더
- tmux split pane 지원

### 데스크톱 전환
- `readAllState`, `collectSidecarSnapshot`를 ViewModel API로 노출
- Renderer 패널에서 실시간 렌더
- ANSI 시퀀스 제거

## 4) Claude Desktop 스타일 아키텍처 제안

## 1단계
- 실행 코어 분리
- CLI adapter 유지
- Desktop Main에서 코어 호출 가능한 IPC 게이트웨이 구축

## 2단계
- Question 모달 UI 구현
- HUD/Sidecar 패널 UI 구현
- 상태 이벤트 스트리밍 구현

## 3단계
- Team transport 추상화 완료
- Windows 기본 모드에서 tmux 없이 동작

## 4단계
- 설정/로그/업데이트/진단 UX 정리
- 설치 패키징 + 코드서명 + 자동업데이트 반영

## 5) 윈도우 앱 패키징/운영 고려사항

## 설치/배포
- `electron-builder` 기준 권장 산출물
  - 개발/사내: NSIS (`.exe`)
  - 기업 배포: MSIX

## 자동 업데이트
- private feed 또는 GitHub Releases 기반
- 업데이트 채널(stable/beta) 분리

## 설정 저장 위치
- `%APPDATA%/oh-my-codex/` 또는 `%LOCALAPPDATA%/oh-my-codex/`
- 기존 `.omx/state/*` 구조는 내부적으로 호환 유지

## 로그/진단
- `main.log`, `renderer.log`, `worker/*.log` 분리
- 앱 내 "진단 번들 내보내기" 기능 제공 권장

## 6) 보안 체크리스트 (Desktop 필수)

1. Renderer 보안
- `nodeIntegration: false`
- `contextIsolation: true`
- preload 최소 API 원칙

2. IPC 보안
- 채널별 입력 스키마 검증(zod 권장)
- 파일/명령 실행은 allowlist 기반

3. 외부 프로세스 실행
- 명령 인자 escaping/검증
- 작업 디렉터리 제한
- 민감 환경변수 마스킹

4. 로컬 파일 접근
- 앱 내 파일 선택 경로를 명시적으로 허용
- 임의 경로 쓰기 제한 정책 필요

## 7) 테스트 변경 범위

### 반드시 추가할 테스트
- IPC contract 테스트
- Main process command gateway 테스트
- Question 모달 흐름 테스트
- Team 이벤트 스트림 테스트
- 패키징 smoke 테스트(설치/기동/업데이트)

### 기존 테스트 영향
- `src/cli/__tests__/*` 중 콘솔/exitCode 전제 테스트 수정 필요
- tmux 전제 테스트는 `TmuxTransport` 전용으로 격리 권장

## 8) 전환 시 주의사항

1. CLI 제거 금지
- 초기에는 CLI를 유지해야 회귀 및 자동화 파이프라인 영향이 적다.

2. tmux 코드 즉시 제거 금지
- `TmuxTransport`로 격리 후 점진 축소해야 안전하다.

3. 상태 포맷 유지
- `.omx/state/*` 호환을 깨면 기존 워크플로우 복구 비용이 커진다.

4. 보안 설정 선적용
- 데스크톱 앱은 기능보다 preload/IPC 보안 정책을 먼저 고정해야 한다.

## 9) 결론: "먼저 바꿔야 할 코드"

가장 먼저 착수할 파일 순서:

1. `src/cli/index.ts`
2. `src/cli/omx.ts`
3. `src/cli/question.ts`
4. `src/question/renderer.ts`
5. `src/question/ui.ts`
6. `src/team/runtime.ts`
7. `src/team/tmux-session.ts`
8. `src/hud/index.ts`
9. `src/sidecar/index.ts`
10. `desktop/main/*` + `desktop/preload/*` + `desktop/renderer/*` (신규)

이 순서로 진행하면,
기존 CLI를 유지하면서 Claude Desktop 스타일의 Windows 앱을 병행 개발할 수 있다.
