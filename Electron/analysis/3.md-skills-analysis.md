# Skills 카탈로그

> `skills/` 폴더의 skill 목록표  
> 각 항목은 용도와 핵심 역할을 한 줄로 요약함  
> Deprecated shim은 별도 표시

---

## 분석·질의·오케스트레이션

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `analyze/SKILL.md` | Run read-only deep repository analysis and return a ranked synthesis | 리포지토리를 읽기 전용으로 깊게 분석해, 근거와 신뢰도를 구분한 랭크형 진단을 제공 |
| `ask/SKILL.md` | Ask a local external advisor CLI (Claude or Gemini) and capture a reusable artifact | 로컬 Claude/Gemini CLI에 질문해 보조 의견이나 초안을 얻는 진입점 |
| `autopilot/SKILL.md` | Strict autonomous loop: $ralplan -> $ralph -> $code-review | 계획-구현-리뷰를 자동 반복하는 완전 자율 실행 루프 |
| `autoresearch/SKILL.md` | Stateful validator-gated research loop with native-hook persistence | 검증 증거가 나올 때까지 지속되는 상태형 리서치 루프 |
| `autoresearch-goal/SKILL.md` | Durable professor-critic research workflow over Codex goal mode | Codex goal 모드에 묶인 지속형 리서치 워크플로우 |
| `deep-interview/SKILL.md` | Socratic deep interview with mathematical ambiguity gating before execution | 모호한 요구를 인터뷰로 정리해 실행 가능한 명세로 바꿈 |
| `plan/SKILL.md` | Strategic planning with optional interview workflow | 요청을 계획으로 바꾸고, 필요하면 인터뷰를 통해 요구를 수집 |
| `ralph/SKILL.md` | Self-referential loop until task completion with architect verification | 완료와 아키텍트 검증이 나올 때까지 반복하는 persistence loop |
| `ralplan/SKILL.md` | Alias for $plan --consensus | Planner-Architect-Critic 합의 기반 계획의 별칭 |
| `ultragoal/SKILL.md` | Create and execute durable repo-native multi-goal plans over Codex goal mode artifacts | 여러 목표를 repo-native 아티팩트와 goal 모드로 순차 실행 |
| `ultrawork/SKILL.md` | Parallel execution engine for high-throughput task completion | 병렬 작업에 최적화된 고처리량 실행 엔진 |
| `team/SKILL.md` | N coordinated agents on shared task list using tmux-based orchestration | tmux 기반 워커를 실제로 띄워 공유 상태로 조정하는 팀 런타임 |
| `worker/SKILL.md` | Team worker protocol (ACK, mailbox, task lifecycle) for tmux-based OMX teams | 팀 워커의 ACK/메일박스/라이프사이클 프로토콜 |
| `swarm/SKILL.md` | Swarm deprecated shim | `team`으로 대체된 구형 shim |

---

## 구현·유지보수·수정

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `ai-slop-cleaner/SKILL.md` | Run an anti-slop cleanup/refactor/deslop workflow | AI-generated 슬롭을 테스트 우선으로 정리하는 클린업 워크플로우 |
| `build-fix/SKILL.md` | Build Fix deprecated shim | 더 이상 쓰지 않는 빌드 수정 shim |
| `cancel/SKILL.md` | Cancel any active OMX mode | 활성 OMX 모드를 안전하게 종료하고 정리 |
| `code-review/SKILL.md` | Run a comprehensive code review | 품질·보안·유지보수성 중심의 종합 코드 리뷰 |
| `configure-notifications/SKILL.md` | Configure OMX notifications - unified entry point for all platforms | Discord/Slack/Telegram/OpenClaw 알림 설정 진입점 |
| `doctor/SKILL.md` | Diagnose and fix oh-my-codex installation issues | 설치 경로와 스킬 루트를 진단해 OMX 설치 문제를 고침 |
| `ecomode/SKILL.md` | Ecomode deprecated shim | 구형 ecomode shim, 현재는 `ultrawork`로 대체 |
| `git-master/SKILL.md` | Git expert for atomic commits, rebasing, and history management | 원자 커밋, 리베이스, 히스토리 정리에 특화 |
| `hud/SKILL.md` | Show or configure the OMX HUD (two-layer statusline) | 상태라인과 OMX orchestration 상태를 보여주는 HUD |
| `note/SKILL.md` | Note deprecated shim | 노트 shim, 현재는 persistent memory/notepad surface 사용 |
| `omx-setup/SKILL.md` | Setup and configure oh-my-codex using current CLI behavior | 현재 프로젝트와 사용자 수준 OMX 디렉터리를 설치/갱신 |
| `performance-goal/SKILL.md` | Run an evaluator-gated performance optimization workflow over Codex goal mode | evaluator 계약을 먼저 세우는 성능 최적화 목표 워크플로우 |
| `pipeline/SKILL.md` | Configurable pipeline orchestrator for sequencing stages | 단계형 파이프라인을 state persistence와 resume로 순서 제어 |
| `review/SKILL.md` | Deprecated standalone review skill | 구형 review 진입점, 현재는 `code-review` 또는 `plan --review` 사용 |
| `security-review/SKILL.md` | Deprecated standalone security review skill | 구형 security review shim, 현재는 `code-review`로 통합 |
| `tdd/SKILL.md` | TDD deprecated shim | 구형 TDD shim, 테스트 우선 원칙은 활성 워크플로우에서 유지 |
| `trace/SKILL.md` | Trace deprecated shim | 구형 trace shim, 현재는 런타임/trace 표면을 직접 사용 |
| `visual-verdict/SKILL.md` | Visual Verdict deprecated skill | 시각 검증은 `visual-ralph`에 통합됨 |
| `web-clone/SKILL.md` | Web Clone deprecated shim | 라이브 URL 클론은 `visual-ralph`로 이동 |
| `help/SKILL.md` | Help deprecated skill | 도움말 shim, 현재는 `omx-setup`/`omx doctor` 사용 |
| `ralph-init/SKILL.md` | Ralph Init deprecated skill | `ralph` 직접 사용으로 대체된 초기화 shim |
| `deepsearch/SKILL.md` | Deepsearch deprecated shim | 심화 검색 shim, 현재는 `analyze` 또는 `omx explore` 사용 |

---

## 탐색·문서·지식

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `help/SKILL.md` | Help deprecated skill | 설치/문제 해결 안내는 `omx-setup`과 `omx doctor`로 이동 |
| `hud/SKILL.md` | Show or configure the OMX HUD (two-layer statusline) | 상태와 턴, 모드, 작업 흐름을 시각화 |
| `note/SKILL.md` | Note deprecated shim | 메모 기능은 OMX persistent memory 사용 |
| `wiki/SKILL.md` | Persistent markdown project wiki stored under repository omx_wiki | repo 내부의 지속형 마크다운 위키 저장소 |
| `skill/SKILL.md` | Manage local skills - list, add, remove, search, edit, setup wizard | 로컬 skill을 목록/추가/삭제/검색/편집/설정하는 메타 도구 |
| `frontend-ui-ux/SKILL.md` | Designer-developer for UI/UX work | 프런트엔드 디자인 작업을 designer 에이전트나 Gemini MCP로 라우팅 |

---

## 분석·품질·검증

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `analyze/SKILL.md` | Run read-only deep repository analysis and return a ranked synthesis | 근거 중심의 읽기 전용 분석 |
| `deep-interview/SKILL.md` | Socratic deep interview with mathematical ambiguity gating before execution | 요구사항 인터뷰 전용 |
| `performance-goal/SKILL.md` | Run an evaluator-gated performance optimization workflow over Codex goal mode | 성능 목표의 실행 전 evaluator 계약 필수 |
| `review/SKILL.md` | Deprecated standalone review skill | 기존 review 플로우 대체 |
| `security-review/SKILL.md` | Deprecated standalone security review skill | 보안 리뷰는 `code-review`로 통합 |
| `ultraqa/SKILL.md` | QA cycling workflow - test, verify, fix, repeat until goal met | 테스트-검증-수정 반복 QA 사이클 |
| `visual-ralph/SKILL.md` | Visual Ralph orchestration for frontend UI ... | 시각 기준을 바탕으로 UI를 구현하고 픽셀 diff로 맞춤 |
| `visual-verdict/SKILL.md` | Visual Verdict deprecated skill | 시각 판정은 `visual-ralph`로 이동 |
| `doctor/SKILL.md` | Diagnose and fix oh-my-codex installation issues | 설치 오류와 경로 문제 진단 |

---

## 제품·UX·인터랙션

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `frontend-ui-ux/SKILL.md` | Designer-developer for UI/UX work | UI/UX 작업의 진입점 |
| `hud/SKILL.md` | Show or configure the OMX HUD (two-layer statusline) | HUD 상태 시각화 |
| `visual-ralph/SKILL.md` | Visual Ralph orchestration for frontend UI ... | 라이브 URL/정적 참조 기반의 UI 구현 루프 |
| `ux-researcher/SKILL.md` | Usability research, heuristic audits, and user evidence synthesis | 사용성 증거 수집과 문제 프레이밍 |

---

## 테스트·QA·검증 도구

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `qa-tester/SKILL.md` | Interactive CLI testing specialist using tmux for session management | tmux로 서비스 실행, 출력 캡처, 상태 검증 수행 |
| `test-engineer/SKILL.md` | Test strategy, integration/e2e coverage, flaky test hardening, TDD workflows | 테스트 전략 수립과 테스트 작성/강화 |
| `ultraqa/SKILL.md` | QA cycling workflow - test, verify, fix, repeat until goal met | 실패를 고치고 다시 검증하는 반복 QA |
| `verifier/SKILL.md` | Completion evidence and verification specialist (STANDARD) | 완료 주장을 직접 증거로 판정 |

---

## 시각·미디어

| 파일명 | 설명 | 요약 |
|--------|------|------|
| `vision/SKILL.md` | Visual/media file analyzer for images, PDFs, and diagrams | 이미지/PDF/다이어그램에서 필요한 정보만 추출 |
| `visual-ralph/SKILL.md` | Visual Ralph orchestration for frontend UI ... | 시각 레퍼런스 기반 프런트엔드 구현 |

---

## 빠른 선택 가이드

| 상황 | 추천 skill |
|------|-------------|
| 리포지토리를 읽기 전용으로 깊게 분석한다 | `analyze` |
| 요구를 먼저 정리해야 한다 | `deep-interview` |
| 계획을 만든다 | `plan` / `ralplan` |
| 계획-구현-리뷰를 자동 반복한다 | `autopilot` |
| 자율 구현을 반복 완료한다 | `ralph` |
| 병렬로 여러 작업을 처리한다 | `ultrawork` |
| tmux 기반 팀 실행을 한다 | `team` / `worker` |
| 빌드 문제를 진단한다 | `doctor` / `build-fix` |
| 코드 리뷰를 한다 | `code-review` |
| 성능 최적화 목표를 다룬다 | `performance-goal` |
| 시각 UI를 구현한다 | `visual-ralph` |
| 테스트/QA를 반복한다 | `test-engineer` / `qa-tester` / `ultraqa` |
| 문서나 위키를 관리한다 | `writer` / `wiki` |
| 옛 shim을 만나면 대체 skill을 사용한다 | deprecated 항목 참조 |

---

## Deprecated / Shim 한눈에 보기

| 파일명 | 대체 |
|--------|------|
| `ask-claude/SKILL.md` | `ask` |
| `ask-gemini/SKILL.md` | `ask` |
| `build-fix/SKILL.md` | 활성 실행/디버깅 워크플로우 |
| `deepsearch/SKILL.md` | `analyze` / `omx explore` |
| `ecomode/SKILL.md` | `ultrawork` |
| `help/SKILL.md` | `omx-setup` / `omx doctor` |
| `note/SKILL.md` | OMX persistent memory/notepad surfaces |
| `ralph-init/SKILL.md` | `ralph` |
| `review/SKILL.md` | `code-review` / `plan --review` |
| `security-review/SKILL.md` | `code-review` |
| `swarm/SKILL.md` | `team` |
| `tdd/SKILL.md` | 활성 테스트/구현 워크플로우 |
| `trace/SKILL.md` | trace/runtime inspection surfaces |
| `visual-verdict/SKILL.md` | `visual-ralph` |
| `web-clone/SKILL.md` | `visual-ralph` |
