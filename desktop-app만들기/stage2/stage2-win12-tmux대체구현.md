# Phase 2 / WIN-012 — Windows 환경에서의 tmux 대체 구현 조사·설계 노트

> 작성일: 2026-05-23
> 대상 티켓: [WIN-012 LocalProcessTransport 구현 (Windows 기본 transport)](change-winapp-phase2-tickets.md)
> 선행 티켓: WIN-011 (Transport 추상화 / [작업내역-W011.md](result/작업내역-W011.md))
> 목적: tmux 없이 Windows에서 워커를 안정적으로 실행/제어하기 위한 대체 구현 옵션을 공식 문서·업계 사례 기반으로 정리하고, 본 프로젝트가 채택할 단계적 경로를 확정한다.

---

## 0. 배경 (왜 이 문서가 필요한가)

본 프로젝트의 워커 실행은 `src/team/tmux-session.ts`(2,188 lines, 82 KB)가 외부 `tmux` 바이너리에 강하게 의존한다. tmux는 **Node 라이브러리가 아니라 OS에 별도로 설치되는 독립 실행파일(C로 작성된 터미널 멀티플렉서)** 이며, 다음과 같은 식으로 호출된다:

```ts
// src/team/tmux-session.ts (발췌)
spawnPlatformCommandSync('tmux', ['kill-session', '-t', sessionName]);
spawnPlatformCommandSync('tmux', ['send-keys', '-t', target, text, 'Enter']);
spawnPlatformCommandSync('tmux', ['capture-pane', '-p', '-t', target]);
```

문제는 다음 두 가지다:

1. **Windows 네이티브에는 tmux 공식 빌드가 존재하지 않는다.** WSL/MSYS2/Cygwin 같은 POSIX 에뮬레이션 환경 안에서만 동작한다. 일반 Windows 사용자에게 "WSL을 깔고 그 안에서 tmux를 깔라"고 강요할 수 없다.
2. **tmux 의존이 코드 전반에 퍼져 있다.** WIN-011에서 `WorkerTransport` 인터페이스와 `TmuxTransport` 어댑터를 도입해 의존을 국한했지만, **Windows에서 동작하는 두 번째 transport**가 없으면 Windows 데스크탑 앱은 워커를 띄울 수 없다.

따라서 WIN-012는 **"Windows에서 tmux 자리를 무엇으로 어떻게 대체할 것인가"** 를 결정하는 티켓이다. 이 문서는 그 결정을 내리기 위한 조사·근거·설계안을 담는다.

---

## 1. tmux의 정확한 정체 (개념 확정)

| 항목 | 내용 |
|---|---|
| 이름 | tmux (terminal multiplexer) |
| 형태 | C로 작성된 **독립 실행 바이너리** (`tmux`, `tmux.exe`) — Node 라이브러리 아님, 본 프로젝트 소스 아님 |
| 공식 저장소 | https://github.com/tmux/tmux |
| 라이선스 | ISC (BSD 계열) |
| 역할 | 한 터미널 안에서 다수의 세션/창/패널을 생성·분할·관리. detach/attach로 세션 분리·재접속 가능. |
| 설치 (Linux) | `apt install tmux`, `dnf install tmux`, `apk add tmux` 등 OS 패키지 매니저 |
| 설치 (macOS) | `brew install tmux` |
| 설치 (Windows) | **공식 네이티브 빌드 없음**. WSL/MSYS2/Cygwin/Git Bash 안에서만 동작. |
| 사용 방식 | CLI 인자로 명령(send-keys, capture-pane, new-session, kill-session 등)을 전달, 출력을 텍스트로 받아 파싱 |

본 프로젝트도 정확히 이 패턴을 따른다. `isTmuxAvailable()`이 `tmux -V`(버전 출력)의 실행 가능 여부로 설치 여부를 판단한다:

```ts
export function isTmuxAvailable(): boolean {
  const { result } = spawnPlatformCommandSync('tmux', ['-V'], { encoding: 'utf-8' });
  if (result.error) return false;
  return result.status === 0;
}
```

→ "tmux가 설치된 환경"이라는 표현은 **OS의 PATH 어딘가에 `tmux`/`tmux.exe` 바이너리가 있어 호출 가능한 환경**을 뜻한다. 본 프로젝트의 소스코드/라이브러리가 아니다.

---

## 2. 공식 Anthropic Claude Code의 Windows 대응 방식

출처:
- https://code.claude.com/docs/en/setup
- https://code.claude.com/docs/en/terminal-guide

### 2.1 결론 한 줄
**공식 Claude Code(네이티브 Windows)는 tmux를 처음부터 안 쓴다.** 멀티플렉서 개념 자체가 없고, 명령마다 자식 프로세스를 spawn → 출력 캡처 방식이다. 멀티 패널/멀티 세션 UI는 외부 터미널(Windows Terminal, VS Code 통합 터미널 등)이 담당한다.

### 2.2 시스템 요구사항
- 운영체제: **Windows 10 build 1809+ / Windows Server 2019+** (1809는 ConPTY 정식 도입 빌드)
- macOS 13.0+, Ubuntu 20.04+, Debian 10+, Alpine 3.19+
- 하드웨어: 4GB+ RAM, x64 또는 ARM64
- 지원 셸: **Bash, Zsh, PowerShell, CMD** — tmux는 어디에도 등장하지 않음

### 2.3 "Shell Tool" 선택 규칙
Claude Code가 실제 명령을 실행할 때 쓰는 도구는 OS·설치 상태에 따라 자동 선택된다:

| 환경 | 사용 도구 |
|---|---|
| macOS / Linux / WSL | Bash tool (시스템 `bash`) |
| Windows + Git for Windows 설치됨 | **Git Bash**를 Bash tool로 사용 (`CLAUDE_CODE_GIT_BASH_PATH`로 경로 override 가능) |
| Windows + Git for Windows 미설치 | **PowerShell tool** |
| Windows + 양쪽 모두 + opt-in | `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` → PowerShell tool 추가 활성 |

공식 문서 인용:

> "Without Git for Windows, Claude Code runs shell commands via the PowerShell tool. With Git for Windows, Claude Code uses Git Bash for the Bash tool."
> — `code.claude.com/docs/en/setup`

### 2.4 설치/배포 형태
- 단일 네이티브 바이너리 `claude.exe` (Node 동봉 아님). 코드서명자: **"Anthropic, PBC"**.
- 권장 설치:
  - PowerShell: `irm https://claude.ai/install.ps1 | iex`
  - winget: `winget install Anthropic.ClaudeCode`
- 자동 업데이트: native installer 채널(`latest` / `stable`), `autoUpdatesChannel` 설정으로 제어
- 검증: 매니페스트 GPG 서명(키 핑거프린트 `31DD DE24 DDFA B679 F42D 7BD2 BAA9 29FF 1A7E CACE`) + Windows Authenticode

### 2.5 데스크탑 GUI 앱
- Claude Code Desktop은 별도 GUI 클라이언트(https://claude.com/download). 터미널 없이 동일 기능 제공.
- 내부적으로도 OS의 PowerShell/Git Bash를 호출하지 tmux는 호출하지 않음.

### 2.6 우리 프로젝트에 주는 시사점
- **"단일 명령 spawn → 출력 캡처"** 모델은 우리의 `LocalProcessTransport`와 본질적으로 같다.
- 다만 우리는 **멀티 워커 동시 실행** + **상태 추적** + **send-keys 형식의 동적 입력 주입**이 필요하므로, 공식 Claude Code보다 한 단계 위의 추상화(=tmux가 해주던 부분)가 필요하다.

---

## 3. 커뮤니티: tmux 스타일 멀티플렉서의 Windows 재구현 사례

공식 도구는 멀티플렉싱을 안 하지만, **여러 AI 에이전트를 한 화면에서 병렬 실행**하려는 수요는 강하다. 그 결과 2025–2026년 사이에 ConPTY 기반 Windows 멀티플렉서들이 등장했다.

### 3.1 공통 기반 기술: **ConPTY (Windows Pseudo Console)**

| 항목 | 내용 |
|---|---|
| 정식 명칭 | Console Pseudo-terminal (Pseudo Console) |
| 도입 시점 | Windows 10 build 1809 (2018년) |
| API | `CreatePseudoConsole`, `ResizePseudoConsole`, `ClosePseudoConsole` (kernel32) |
| 역할 | Linux의 `openpty`/`forkpty` 등가물. 가상 콘솔 페어(input/output 파이프)를 생성, 자식 프로세스 stdio를 연결. ANSI escape 시퀀스 처리·리사이즈·신호 전달을 OS가 직접 처리. |
| Node 바인딩 | [`node-pty`](https://github.com/microsoft/node-pty) — Microsoft 공식 (VS Code 터미널이 사용) |
| Rust 바인딩 | `conpty` crate 등 |
| .NET | Pseudo Console API를 P/Invoke로 직접 호출 (예: `ClaudeSessionManager`의 `ConPTY/Terminal.cs`) |

ConPTY는 **Microsoft가 "Linux PTY 같은 걸 Windows에 정식으로 만들겠다"고 답한 결과물**이다. tmux의 다중 패널 자체를 OS가 제공하는 건 아니지만, **각 패널을 진짜 가상 터미널로 만드는 기반**을 제공한다.

### 3.2 대표 프로젝트 비교

| 프로젝트 | 스택 | tmux 대체 구조 | 특징 |
|---|---|---|---|
| **wmux** (https://www.wmux.app/en) | Electron + Rust core + Node MCP host | 패널마다 독립 ConPTY 인스턴스, tmux 스타일 `Ctrl+B` prefix, 데몬이 PTY 소유 → 세션 영속성 | Claude/Codex/Gemini 병렬, MCP 자동 등록(`~/.claude.json`), CDP 브라우저 자동화 내장, 콜드 스타트 280ms |
| **Flock for Windows** (https://github.com/baahaus/flock-windows) | Tauri v2 + Rust + TypeScript + xterm.js | Rust 백엔드가 `CreatePseudoConsole` 직접 호출 → Tauri IPC로 프런트 xterm.js 스트림 | 비-Electron, 가벼움, CSS Grid 자동 타일링, Claude state 자동 감지 |
| **ClaudeSessionManager** (GitHub: YomenStyle) | WPF .NET 9 + WebView2 + xterm.js | C#에서 ConPTY API 직접 P/Invoke | 한글 IME 지원, Claude resume 사이드바, Windows 토착 스택 |
| **win-claude-code** | npm 래퍼 | Claude Code를 PowerShell/CMD에서 직접 spawn (멀티플렉서 아님) | WSL 없이 단순 호환만 제공 |

### 3.3 공통 아키텍처 (tmux를 어떻게 대체하는가)

모든 프로젝트가 사실상 같은 레이어드 아키텍처를 채택한다:

```
[Renderer / Frontend]
  - xterm.js (또는 동등 터미널 위젯)
  - 패널 레이아웃, 키 바인딩, 스크롤백 UI
        ↑↓  IPC
        ↑↓  (Electron ipcMain / Tauri invoke / WebView2 chrome.webview)
[Backend Host (Node / Rust / C#)]
  - PTY 라이프사이클 관리
  - 패널 ↔ PTY 매핑
  - 세션 영속성 (별도 데몬 권장)
        ↓
[PTY 바인딩 라이브러리]
  - node-pty / pywinpty / conpty crate / P/Invoke
        ↓
[ConPTY (Win32 API)]
        ↓
[자식 프로세스]
  - pwsh.exe, claude.exe, codex, bash.exe, node, …
```

핵심 패턴 3가지:

1. **각 패널 = 독립 ConPTY 인스턴스.** tmux pane을 1:1로 대체.
2. **데몬 분리.** UI 프로세스(Electron renderer)가 죽어도 PTY는 살아 있도록 별도 백엔드/데몬이 PTY를 소유. tmux detach/attach 효과를 재현.
3. **스냅샷 영속성.** cwd, env, scrollback, 활성 에이전트 정보를 디스크에 atomic write → 재부팅 후 복원.

### 3.4 공통 보안 가드

업계 사례가 일관되게 적용하는 항목 (우리 보안 게이트에도 반영 필요):

- **Token-bound IPC**: 세션마다 서명된 토큰을 IPC 메시지에 포함 (위조 차단)
- **SSRF 차단**: 브라우저 자동화 도구가 `127.0.0.1`, `file://`, `javascript:`, 메타데이터 IP, private subnet 거부
- **PTY 입력 sanitization**: ANSI escape 주입·키 이스케이프 검사
- **Electron Fuses** (Electron 채택 시): `runAsNode` off, `nodeOptions` off, `nodeCliInspect` off, ASAR integrity on, cookie encryption on
- **메모리 와치독**: per-agent RSS 상한 → soft signal → hard kill (예: wmux 750MB)
- **명령 인자 escaping**: `child_process.spawn`의 array 형식 강제, shell 모드 금지

---

## 4. Windows에서 쓸 수 있는 대체 옵션 비교

| 옵션 | 의사터미널? | 동시 실행? | TUI/색상/리사이즈? | 의존성 비용 | 우리에게 적합한가 |
|---|---|---|---|---|---|
| **A. `child_process.spawn` (non-TTY)** | ❌ | ✅ | ❌ (prompt 깨질 수 있음) | Node 내장 | ✅ 1차 구현에 적합 |
| **B. `node-pty` (ConPTY 바인딩)** | ✅ | ✅ | ✅ | 네이티브 빌드 의존, electron-rebuild 필요 | ✅ 2차 확장에 적합 |
| **C. Windows Terminal `wt.exe` 호출** | 일부 | ✅ | ✅ | 사용자 환경 의존, 출력 캡처 어려움 | ❌ (제어 채널 부족) |
| **D. PowerShell 1개에 다 몰아넣기** | ❌ | 직렬화됨 | 제한적 | 낮음 | ❌ (멀티 워커 불가) |
| **E. WSL + tmux** | ✅ | ✅ | ✅ | WSL 설치 강제 | ❌ (Phase 2 목표에 반함) |
| **F. 외부 멀티플렉서(wmux 등)에 위임** | ✅ | ✅ | ✅ | 추가 앱 설치 필요 | ❌ (배포 단순성 훼손) |

### 4.1 옵션 A: `child_process.spawn` (1차 채택)

```ts
import { spawn } from 'node:child_process';

const child = spawn(command, args, {
  cwd: restrictedCwd,
  env: sanitizedEnv,
  stdio: ['pipe', 'pipe', 'pipe'],
  windowsHide: true,
  shell: false, // 절대 true 금지 (인자 escaping 무력화)
});

child.stdout.on('data', (chunk) => handler(chunk.toString('utf-8')));
child.stderr.on('data', (chunk) => handler(chunk.toString('utf-8')));
child.on('exit', (code, signal) => onExit({ code, signal }));
child.stdin.write(input);
```

**장점**
- Node 내장, 추가 네이티브 의존 0
- electron-builder 패키징에 영향 없음
- 보안 가드(인자 escaping, cwd 제한, env whitelist) 적용 단순

**한계**
- TTY 의존 CLI는 동작 보장 안 됨 (`process.stdout.isTTY === false`)
- 색상 출력이 자동 꺼지는 CLI 多 (ANSI 미수신 시)
- `inquirer`/`enquirer` 같은 raw-mode prompt 라이브러리 불가
- `tmux send-keys`처럼 키 이벤트 단위 주입 불가 (stdin write로만 가능)

WIN-012의 1차 DoD("tmux 미설치 Windows에서 워커 기동 성공 + 출력 스트림 Renderer 전달")는 **이 옵션만으로 달성 가능**하다.

### 4.2 옵션 B: `node-pty` (2차 확장 후보)

```ts
import * as pty from 'node-pty';

const ptyProcess = pty.spawn(command, args, {
  name: 'xterm-color',
  cols: 120,
  rows: 30,
  cwd: restrictedCwd,
  env: sanitizedEnv,
});

ptyProcess.onData((data) => handler(data));     // ANSI 포함 그대로
ptyProcess.onExit(({ exitCode, signal }) => ...);
ptyProcess.write(input);                          // raw 입력
ptyProcess.resize(newCols, newRows);
ptyProcess.kill();
```

**장점**
- TUI/색상/리사이즈/raw input 완전 지원
- xterm.js와 1:1 결합 → Renderer에 진짜 터미널 표시 가능
- Microsoft 공식, VS Code 검증

**비용**
- 네이티브 모듈 → Electron에서 ABI 일치 필요 (`@electron/rebuild`)
- prebuilt 바이너리가 x64/arm64 양쪽 다 필요 (electron-builder에서 처리)
- 빌드 환경에 Visual Studio Build Tools / Python 필요할 수 있음 (prebuilt 실패 시)

**도입 시점 권장**
- WIN-012 1차 DoD는 옵션 A로 달성
- TUI prompt가 필요한 워커(예: claude-code 자체) 호환 요구가 생기면 별도 티켓(예: WIN-012a "PtyLocalTransport")로 분리

### 4.3 옵션 C–F: 비채택 사유 요약
- **C (Windows Terminal 호출)**: UI 자동화는 되지만 stdout 캡처/제어 채널이 빈약. 데스크탑 앱에서 외부 윈도우를 띄우는 UX 자체가 부적합.
- **D (단일 PowerShell)**: 워커 N개 직렬화 → 동시성·격리 모두 상실. 본 프로젝트 핵심 가치(팀 병렬 실행)와 정면 충돌.
- **E (WSL+tmux)**: Phase 2의 명시 목표 "tmux 없이 Windows에서 기본 실행"에 정면 반함.
- **F (외부 wmux 등 위임)**: 사용자에게 third-party 앱 설치를 강제. 배포 단순성·신뢰성 모두 훼손.

---

## 5. 본 프로젝트 채택안 — 2단계 점진 전환

### 5.1 1단계 (WIN-012, 현재 티켓): `LocalProcessTransport` (옵션 A)

**파일**
- 신규: `src/core/local-process-transport.ts`
- 신규(테스트): `src/core/__tests__/local-process-transport.test.ts`
- 수정: `desktop/main/index.ts` (Windows 기본 transport 등록)

**구현 책임**
1. `WorkerTransport` 인터페이스([src/core/transport.ts](../../src/core/transport.ts)) 구현
2. `child_process.spawn`으로 워커 프로세스 기동
   - `shell: false` 강제
   - `stdio: ['pipe', 'pipe', 'pipe']`
   - `windowsHide: true`
3. 출력 스트림 → 등록된 핸들러로 chunk 단위 전달 (`onOutput` 구독자에 fan-out)
4. 입력 주입은 `child.stdin.write` 단순 위임
5. 종료 처리: `exit` / `error` 이벤트를 정규화해 `onExit` 핸들러로 통지, idempotent `stop()` 보장
6. **보안 가드**
   - 명령 화이트리스트 (configurable, 기본은 `node`, `claude`, `codex` 등)
   - 인자 검증: 메타 문자(`&`, `|`, `;`, backtick, `$()`)는 array 형식이라 자연 차단되지만, 경로 traversal/`..` 차단 검사 추가
   - cwd 제한: 데스크탑 앱 작업 폴더 하위로만 허용
   - env 화이트리스트: 필요한 키만 통과
7. Windows 환경 감지 → 자동으로 본 transport를 기본값으로 선택

**DoD (티켓 5 항목 그대로)**
- [ ] `LocalProcessTransport` 구현
- [ ] 명령 인자 escaping 적용
- [ ] 작업 디렉터리 제한 로직 추가
- [ ] Desktop Main에서 기본 transport로 등록
- [ ] Windows 환경 실행 smoke 테스트 추가

### 5.2 2단계 (별도 후속 티켓, 필요 시): `PtyLocalTransport` (옵션 B)

조건: 1단계로 못 띄우는 TUI 워커(예: claude-code 자체) 호환 요구가 생긴 시점.

**파일**
- 신규: `src/core/pty-local-transport.ts`
- 의존성 추가: `node-pty` (Electron ABI 매칭 처리 포함)
- 수정: `desktop/main/index.ts` (capability에 따라 PTY/Process 선택)

**구현 책임**
- `node-pty.spawn` 기반
- `onData` 콜백을 `onOutput` 핸들러로 라우팅
- `resize(cols, rows)` API를 transport 확장 인터페이스로 노출
- Renderer 측은 `xterm.js`와 직접 결합 가능 (WIN-014 운영형 UI 확장과 자연 정합)

**비채택 시 대안**
- claude-code 같은 TUI를 데스크탑 워커로 직접 띄우는 대신, **API 모드(`--print` / `-p`, non-TTY)** 로 실행 → 옵션 A 유지

---

## 6. 인터페이스 적합도 검증 (WIN-011 산출물과의 정합)

WIN-011에서 도입한 인터페이스(`src/core/transport.ts`)는 다음 메서드를 가진다:

```ts
export interface WorkerTransport {
  readonly kind: TransportKind;
  isAvailable(): boolean | Promise<boolean>;
  start(command: string, args: string[]): Promise<void> | void;
  send(data: string): Promise<void> | void;
  onOutput(handler: (chunk: string) => void): () => void; // unsubscribe
  onExit(handler: (info: { code: number | null; signal: NodeJS.Signals | null }) => void): () => void;
  stop(): Promise<void> | void;
  isAlive(): boolean | Promise<boolean>;
}
```

**옵션 A 매핑** (LocalProcessTransport)
| 인터페이스 | child_process 매핑 |
|---|---|
| `kind` | `'local-process'` |
| `isAvailable` | `process.platform === 'win32'` 시 무조건 true (Node 내장이므로) |
| `start` | `spawn(command, args, opts)` 호출 |
| `send` | `child.stdin.write(data)` |
| `onOutput` | `stdout`/`stderr` `data` 이벤트 구독자에 fan-out |
| `onExit` | `exit`/`error` 이벤트 정규화 |
| `stop` | `child.kill('SIGTERM')` → grace timeout → `SIGKILL`, idempotent |
| `isAlive` | `child.exitCode === null && !child.killed` |

**옵션 B 매핑** (PtyLocalTransport — 미래)
| 인터페이스 | node-pty 매핑 |
|---|---|
| `kind` | `'local-pty'` |
| `isAvailable` | `node-pty` require 성공 + Windows 1809+ |
| `start` | `pty.spawn(command, args, opts)` |
| `send` | `ptyProcess.write(data)` |
| `onOutput` | `ptyProcess.onData(handler)` |
| `onExit` | `ptyProcess.onExit({ exitCode, signal })` |
| `stop` | `ptyProcess.kill('SIGTERM')`, idempotent |
| `isAlive` | 내부 `exited` 플래그 |
| 확장 | `resize(cols, rows)` — 인터페이스 확장 필요 시 별도 mixin |

→ WIN-011 인터페이스는 **옵션 A·B 모두 무리 없이 수용**한다. 인터페이스 자체를 깨지 않고 transport를 추가/교체할 수 있음이 본 설계의 핵심 이득이다.

---

## 7. 보안 게이트 (WIN-012 + Phase 2 공통)

위 §3.4 업계 사례 + OWASP Top 10을 본 transport에 적용:

| 위협 | 대책 |
|---|---|
| 명령어 인젝션 (OWASP A03) | `shell: false`, args array 강제, 메타문자 검사 |
| 경로 traversal (A01) | cwd 제한, args 내 `..` 거부, symlink 해석 차단 |
| 권한 상승 | 자식 프로세스에 admin token 미전달, env에서 `RUNAS`/`__COMPAT_LAYER` 등 위험 키 제거 |
| 정보 노출 | 출력 스트림에 시크릿 필터(GitHub 토큰, AWS 키 패턴) 적용 후 Renderer 전달 |
| DoS | 메모리 와치독(RSS 상한), 출력 버퍼 ring(예: 직전 64KB만 유지) |
| IPC 위조 | preload bridge에서 channel 화이트리스트, postMessage origin 검증, MessageChannel 사용 검토 |
| 자동 업데이트 검증 | electron-builder 코드서명 + `manifest.json.sig` 검증 흐름을 WIN-019 게이트에 명시 |

---

## 8. 테스트 전략 (WIN-018과 연동)

**1단계(`LocalProcessTransport`) 테스트 분류**

| 분류 | 항목 | 비고 |
|---|---|---|
| 단위 | start→exit lifecycle | exit code 정규화 |
| 단위 | onOutput 다중 구독 fan-out | unsubscribe 정상 동작 |
| 단위 | 입력 인자 escaping | `..`, 메타문자 거부 |
| 단위 | cwd 제한 위반 | 거부 + 에러 코드 표준화 |
| Windows smoke | `node -e "console.log('hi')"` 정상 캡처 | `tmux` 호출 없이 통과해야 함 |
| Windows smoke | stdin 주입 echo | `node -e "process.stdin.pipe(process.stdout)"` |
| 회귀 | TmuxTransport 기존 테스트 미파괴 | Linux/macOS 프로파일에서만 실행 |
| 부정 | 화이트리스트 외 명령 거부 | exit 없이 즉시 reject |

**WIN-018 프로파일 분리**
- `test:phase2:windows` → `LocalProcessTransport` smoke + 공통 단위 테스트
- `test:phase2:linux` → 기존 `TmuxTransport`/`tmux-session` 통합 테스트 유지
- CI matrix(또는 로컬 가이드)에 OS 조건 명시

---

## 9. 리스크와 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| TUI 워커(claude-code 등) 호환 실패 | 사용자 가치 저하 | 1차는 API/`--print` 모드 권장, 2차에서 `node-pty` 도입 |
| Electron 패키징 후 stdio 깨짐 | 런타임 장애 | electron-builder NSIS 빌드(WIN-019) 후 패키징 smoke를 게이트로 운영 |
| 한글/UTF-8 깨짐 | 출력 가독성 | `chcp 65001` 자동 적용 + Buffer→string `'utf-8'` 강제 |
| 워커 좀비 | 리소스 누수 | grace SIGTERM → 타임아웃 후 SIGKILL, 종료 핸들러 idempotent |
| 보안 가드 우회 | 명령 주입 | `shell: false` + array args + 화이트리스트 + lint rule 추가 |
| Renderer ↔ Main 이벤트 백프레셔 | UI 멈춤 | 출력 chunk 큐 + 드롭 정책(WIN-013에서 함께 처리) |

---

## 10. WIN-013 이후와의 연결

`LocalProcessTransport` 출력은 WIN-013의 **IPC 이벤트 스트리밍 채널(`omx:event`)** 로 그대로 흘러간다. 따라서 본 transport는 다음 이벤트를 정확히 발생시켜야 한다:

- `command.started { workerId, command, args, startedAt }`
- `command.progress { workerId, chunk, kind: 'stdout'|'stderr' }`
- `command.completed { workerId, exitCode, durationMs }`
- `command.failed { workerId, error, exitCode? }`

WIN-013은 이 이벤트를 push 채널로 Renderer에 전달하고, WIN-014의 운영형 UI(히스토리/검색/필터)와 WIN-015 Question 모달, WIN-016/017 HUD/Sidecar 패널이 모두 이 스트림을 소스로 사용한다.

→ **본 transport의 `onOutput` 콜백 시그니처가 WIN-013 이벤트 페이로드 설계의 입력이 된다.** 두 티켓의 계약은 다음 PR에서 동시에 고정되어야 한다.

---

## 11. 참고 자료 (모두 2026-05-23 확인)

### 공식
- Claude Code 설치/설정: https://code.claude.com/docs/en/setup
- Claude Code 터미널 가이드: https://code.claude.com/docs/en/terminal-guide
- Claude Code Tools Reference (PowerShell/Bash tool): https://code.claude.com/docs/en/tools-reference
- Microsoft `node-pty`: https://github.com/microsoft/node-pty
- Microsoft ConPTY API 문서: https://learn.microsoft.com/windows/console/creating-a-pseudoconsole-session

### 커뮤니티 사례
- wmux (Windows tmux 대체 멀티플렉서): https://www.wmux.app/en
- wmux 저자의 dev.to 글: https://dev.to/wong2kim/native-windows-terminal-for-ai-coding-agents-no-wsl-15fh
- Flock for Windows: https://github.com/baahaus/flock-windows
- ClaudeSessionManager (WPF + ConPTY): GitHub `YomenStyle/ClaudeSessionManager`

### 본 프로젝트
- WIN-011 작업 결과: [result/작업내역-W011.md](result/작업내역-W011.md)
- Phase 2 티켓 목록: [change-winapp-phase2-tickets.md](change-winapp-phase2-tickets.md)
- 기존 tmux 래퍼: `src/team/tmux-session.ts`
- WorkerTransport 인터페이스: `src/core/transport.ts`
- TmuxTransport 어댑터: `src/core/tmux-transport.ts`

---

## 12. 결론

1. **tmux는 외부 어플리케이션이며 Windows에서는 사실상 못 쓴다.** 이 사실은 WIN-012가 존재하는 이유 그 자체이다.
2. **공식 Claude Code(Windows 네이티브)는 tmux를 안 쓴다.** PowerShell tool 또는 Git Bash(Bash tool)로 단일 명령을 실행할 뿐, 멀티플렉서 개념이 없다.
3. **여러 워커 동시 실행이 필요한 도구들은 ConPTY + xterm.js + 별도 PTY 데몬으로 tmux를 재구현**한다 (wmux, Flock-windows, ClaudeSessionManager).
4. 본 프로젝트의 WIN-012는 그 스펙트럼의 가장 가벼운 1단계 — **`child_process.spawn` 기반 `LocalProcessTransport`** 를 채택한다. 인터페이스(WIN-011)는 그대로 두고, TUI 호환 요구가 명확해진 시점에 **`node-pty` 기반 `PtyLocalTransport`** 를 2단계로 추가한다.
5. 보안 가드와 OS 프로파일 분리는 WIN-018/WIN-019/WIN-020 게이트에서 통합 검증한다.

이 결론에 따라 WIN-012는 본 문서의 §5.1 1단계 범위로 진행한다.
