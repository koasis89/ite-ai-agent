# WIN-016 목표 상세 — "tmux 기반 HUD 렌더 → 데스크탑 패널 ViewModel 전환"

## 1. 현재 구조 (As-Is): tmux 기반 HUD 렌더

oh-my-codex의 HUD(Heads-Up Display)는 원래 **터미널 환경**에서 작업 상태를 항상 보여주기 위해 다음과 같이 동작합니다.

```
┌─────────────────────────────┐
│ omx 메인 CLI (사용자 입력)   │  ← tmux pane #0
├─────────────────────────────┤
│ HUD 렌더러 (실시간 상태)     │  ← tmux pane #1 (별도 split pane)
│  ▸ 현재 phase: planning      │
│  ▸ tokens: 12,304 / 100k     │
│  ▸ 작업 큐: 3                 │
└─────────────────────────────┘
```

**핵심 메커니즘**:
- `omx` CLI가 시작될 때 `tmux split-window`로 **별도 pane**을 생성
- HUD 렌더 프로세스가 그 pane을 **점유**하고, 상태 파일/이벤트를 읽어 매 N초마다 **터미널 escape sequence**(ANSI/VT100)로 화면을 다시 그림
- 상태 소스: `.omx/state/sessions/<id>/state.json`, 이벤트 파일, 워커 로그 등
- 렌더 방식: 문자열 기반 — 박스 그리기 문자(`│ ─ ┌ ┘`), 색상 ANSI 코드, 커서 위치 제어

**Windows에서의 문제점**:
- tmux 의존 → Windows native에서는 `psmux`(번들 fork)나 WSL 없이는 동작 불가
- 별도 pane 자체가 **단말 환경 전제** — Electron 앱 내부에 띄울 수 없음
- ANSI escape를 그대로 DOM에 박으면 깨짐(파서 필요)
- 폰트/너비/색상이 OS 터미널 설정에 종속되어 일관성 부족

## 2. 전환 목표 (To-Be): 데스크탑 패널 ViewModel

WIN-016은 위 HUD를 **Electron Renderer의 DOM 패널**로 옮기되, "그리기 로직과 데이터 로직을 분리"하는 것을 핵심으로 합니다. 즉 **MVVM 패턴**을 도입합니다.

### 계층 구조

```
┌────────────────────────────────────────────────────┐
│  Model (데이터 소스)                                │
│  - 상태 파일 / 이벤트 스트림 / 워커 메트릭          │
│  - omx state 명령 결과 / WIN-013의 IPC push event   │
└────────────────────────────────────────────────────┘
                   ↓ 순수 데이터(이벤트)
┌────────────────────────────────────────────────────┐
│  ViewModel (HudViewModel)  ← WIN-016 신규           │
│  - DOM/Electron 의존 0                              │
│  - 상태 → 표시용 필드 변환 (phase, tokens, queue)   │
│  - 구독자(View)에게 변경 알림(subscribe/notify)     │
│  - 단위 테스트 가능(Node --test)                    │
└────────────────────────────────────────────────────┘
                   ↓ Plain object 스냅샷
┌────────────────────────────────────────────────────┐
│  View (HudPanel — DOM 렌더러)                       │
│  - ViewModel을 구독, DOM만 갱신                     │
│  - 색상/폰트는 CSS, 박스는 div                      │
└────────────────────────────────────────────────────┘
```

### ViewModel이란 (이 맥락에서)

> **ViewModel = "Renderer 측 상태 머신 + 변환기"**

- 입력: IPC로 받는 raw 이벤트, `omx state` 응답
- 보유 상태: `{ phase, tokensUsed, tokensBudget, queueSize, workerCount, lastEventAt, ... }`
- 출력: 구독자에게 `onChange(snapshot)` 콜백으로 plain object 전달
- DOM/Electron 의존 없음 → **단위 테스트로 모든 로직 검증 가능** (WIN-014의 `HistoryStore`, WIN-015의 `QuestionBroker`와 동일한 패턴)

### View가 하는 일

- ViewModel을 구독(`viewModel.subscribe(handler)`)
- 변경 알림이 오면 DOM 노드의 textContent/class만 업데이트
- 입력 처리(예: HUD 클릭으로 phase 디테일 펼치기)는 ViewModel 메서드 호출로 위임

## 3. 왜 ViewModel 분리가 필요한가

| 구분 | tmux HUD (As-Is) | ViewModel 패턴 (To-Be) |
|---|---|---|
| 데이터/표현 결합 | ANSI escape + 데이터가 한 함수에 혼재 | 분리됨 |
| 테스트성 | 화면 출력 캡처/스냅샷 필요 | ViewModel만 단위 테스트 가능 |
| 플랫폼 의존 | tmux 필수 | 0 (순수 TS) |
| 다중 표현 | 단일 터미널 출력만 | 같은 ViewModel을 패널/툴팁/미니맵 등 여러 View에서 재사용 |
| 이벤트 처리 | 파일 폴링 기반 | WIN-013 IPC push 이벤트 직접 구독 |

## 4. 구체적인 도입 항목 (WIN-016 작업 범위)

이전 티켓들과의 정합성:

1. **`desktop/renderer/hud-view-model.ts` (신규)** — `HudViewModel` 클래스
   - 메서드: `applyEvent(event)`, `applyStateSnapshot(snapshot)`, `subscribe(fn): unsubscribe`, `getSnapshot()`
   - 내부 필드: phase, tokensUsed/Budget, queue, workers, lastUpdatedAt
   - Electron 의존 0 — `now`/`idFactory` 등 주입 가능 (WIN-014/015 패턴 동일)

2. **`desktop/renderer/hud-panel.ts` (신규)** — DOM 어댑터
   - 생성자에서 `HudViewModel`을 받아 `subscribe`로 DOM 갱신
   - HTML 마크업은 index.html의 `<section id="panel-hud">` 안에서 정적으로 정의

3. **WIN-013 이벤트 → ViewModel 연결**
   - app.ts에서 `window.omx.subscribeEvents(event => hudViewModel.applyEvent(event))`
   - HUD 전용 push 이벤트 타입(`hud.update` 등) 정의 — 기존 `OmxEventType` union 확장

4. **CLI(tmux HUD)와의 격리**
   - 기존 `src/hud/*` 코드는 그대로 두고, 데스크탑 모드는 **ViewModel 경로만 사용**
   - WIN-015의 `desktop-ipc` 전략처럼 **env 옵트인** 또는 **Electron 실행 시점 자동 선택**으로 격리

5. **테스트**
   - `desktop/__tests__/hud-view-model.test.ts`: 다양한 event 입력 → snapshot 변화 검증
   - DOM이 필요 없으므로 Node `--test`만으로 충분

## 5. DoD 후보

- [ ] tmux 없이 Electron 데스크탑에서 HUD 정보가 실시간 표시
- [ ] HUD ViewModel 단위 테스트 통과 (이벤트 → snapshot 변환)
- [ ] tmux HUD CLI 경로 회귀 없음 (`src/hud/*` 코드 무변동 또는 격리)
- [ ] WIN-013 IPC 이벤트 채널로 push 갱신 확인

## 6. 비유로 한 줄 요약

> **"터미널에 그림을 그리던 코드"를 → "데이터만 알려주는 코드(ViewModel)"와 "그걸 받아 DOM을 그리는 코드(Panel)"로 쪼개는 작업.** tmux 의존을 없애고, Renderer 환경에서 깔끔한 단위 테스트와 다양한 표현(패널/사이드바/툴팁)을 가능하게 합니다.

이 패턴은 WIN-014(`HistoryStore`), WIN-015(`QuestionBroker`)에서 이미 검증된 "순수 로직 + DOM 어댑터" 구조를 HUD 영역으로 확장하는 것입니다. WIN-017(Sidecar 패널)도 동일한 패턴을 따릅니다.

할 일 목록 업데이트됨