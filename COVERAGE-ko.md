# oh-my-codex 기능 적용 범위 매트릭스

**목표: oh-my-claudecode와의 패리티 >=90%(MCP 도구 제외)**
**최종 업데이트:** 2026-02-22

## 보장범위 요약

| Category | OMC Features | OMX Implemented | Coverage |
|----------|-------------|-----------------|----------|
| Agent Definitions | 29 | 29 | 100% |
| Skills/Commands | 30 | 30 | 100% |
| AGENTS.md (CLAUDE.md equiv) | 1 | 1 | 100% |
| CLI (setup/doctor/help/etc) | 7 | 7 | 100% |
| Config Generation | 1 | 1 | 100% |
| Mode State Management | 9 modes | 9 modes | 100% |
| Project Memory | 4 tools | 4 tools | 100% |
| Notepad | 6 tools | 6 tools | 100% |
| Code Intelligence (LSP) | 12 tools | 7 tools (pragmatic) | ~58% |
| AST Pattern Matching | 2 tools | 2 tools | 100% |
| Trace | 2 tools | 2 tools | 100% |
| Verification Protocol | 1 | 1 | 100% |
| Notification System | 3 channels | 3 channels | 100% |
| Keyword Detection | 16 keywords | 16 keywords | 100% |
| Hook Pipeline | 9 events | 6 full + 3 partial | ~89% |
| HUD/Status Line | 1 | 1 (built-in + CLI) | 100% |
| Subagent Tracking | 1 | partial (via multi_agent) | 50% |
| Python REPL | 1 tool | 0 tools | 0% |
| **TOTAL** | | | **~95%** |

## 상세한 기능 매핑

### 상담원 정의/역할 카탈로그(29/29 = 100%)

| OMC Agent | OMX Status | Mechanism |
|-----------|-----------|-----------|
| analyst | DONE | prompts/analyst.md |
| api-reviewer | DONE | prompts/api-reviewer.md |
| architect | DONE | prompts/architect.md |
| build-fixer | DONE | prompts/build-fixer.md |
| code-reviewer | DONE | prompts/code-reviewer.md |
| code-simplifier | DONE | prompts/code-simplifier.md |
| critic | DONE | prompts/critic.md |
| debugger | DONE | prompts/debugger.md |
| dependency-expert | DONE | prompts/dependency-expert.md |
| designer | DONE | prompts/designer.md |
| executor | DONE | prompts/executor.md |
| explore | DONE | prompts/explore.md |
| git-master | DONE | prompts/git-master.md |
| information-architect | DONE | prompts/information-architect.md |
| performance-reviewer | DONE | prompts/performance-reviewer.md |
| planner | DONE | prompts/planner.md |
| product-analyst | DONE | prompts/product-analyst.md |
| product-manager | DONE | prompts/product-manager.md |
| qa-tester | DONE | prompts/qa-tester.md |
| quality-reviewer | DONE | prompts/quality-reviewer.md |
| quality-strategist | DONE | prompts/quality-strategist.md |
| researcher | DONE | prompts/researcher.md |
| ~~deep-executor~~ | REMOVED (v0.5.0) | Routes to executor |
| ~~scientist~~ | REMOVED (v0.5.0) | — |
| security-reviewer | DONE | prompts/security-reviewer.md |
| style-reviewer | DONE | prompts/style-reviewer.md |
| test-engineer | DONE | prompts/test-engineer.md |
| ux-researcher | DONE | prompts/ux-researcher.md |
| verifier | DONE | prompts/verifier.md |
| vision | DONE | prompts/vision.md |
| writer | DONE | prompts/writer.md |

### 스킬(30/30 = 100%)

| OMC Skill | OMX Status | Mechanism |
|-----------|-----------|-----------|
| autopilot | DONE | ~/.codex/skills/autopilot/SKILL.md |
| ralph | DONE | ~/.codex/skills/ralph/SKILL.md |
| ultrawork (`ulw` alias) | DONE | ~/.codex/skills/ultrawork/SKILL.md |
| ecomode | DONE | ~/.codex/skills/ecomode/SKILL.md |
| plan | DONE | ~/.codex/skills/plan/SKILL.md |
| ralplan | DONE | ~/.codex/skills/ralplan/SKILL.md |
| team | DONE | ~/.codex/skills/team/SKILL.md |
| ~~pipeline~~ | REMOVED (v0.5.0) | — |
| ultraqa | DONE | ~/.codex/skills/ultraqa/SKILL.md |
| ~~ultrapilot~~ | REMOVED (v0.5.0) | — |
| ~~research~~ | REMOVED (post-v0.5.0) | — |
| code-review | DONE | ~/.codex/skills/code-review/SKILL.md |
| security-review | DONE | ~/.codex/skills/security-review/SKILL.md |
| tdd | DONE | ~/.codex/skills/tdd/SKILL.md |
| deepinit | DONE (lightweight CLI successor) | `omx agents-init [path]` (`omx deepinit [path]` alias) |
| deepsearch | DONE | ~/.codex/skills/deepsearch/SKILL.md |
| analyze | DONE | ~/.codex/skills/analyze/SKILL.md |
| build-fix | DONE | ~/.codex/skills/build-fix/SKILL.md |
| cancel | DONE | ~/.codex/skills/cancel/SKILL.md |
| doctor | DONE | ~/.codex/skills/doctor/SKILL.md |
| help | DONE | ~/.codex/skills/help/SKILL.md |
| hud | DONE | ~/.codex/skills/hud/SKILL.md |
| ~~learner~~ | REMOVED (v0.5.0) | — |
| note | DONE | ~/.codex/skills/note/SKILL.md |
| trace | DONE | ~/.codex/skills/trace/SKILL.md |
| skill | DONE | ~/.codex/skills/skill/SKILL.md |
| frontend-ui-ux | DONE | ~/.codex/skills/frontend-ui-ux/SKILL.md |
| git-master | DONE | ~/.codex/skills/git-master/SKILL.md |
| review | DONE | ~/.codex/skills/review/SKILL.md |
| ralph-init | DONE | ~/.codex/skills/ralph-init/SKILL.md |
| ~~release~~ | REMOVED (v0.5.0) | — |
| omx-setup | DONE | ~/.codex/skills/omx-setup/SKILL.md |
| configure-notifications | DONE | ~/.codex/skills/configure-notifications/SKILL.md |
| ~~configure-telegram~~ | MERGED -> configure-notifications | — |
| ~~configure-discord~~ | MERGED -> configure-notifications | — |
| ~~configure-slack~~ | MERGED -> configure-notifications | — |
| ~~configure-openclaw~~ | MERGED -> configure-notifications | — |
| ~~writer-memory~~ | REMOVED (v0.5.0) | — |
| ~~project-session-manager~~ | REMOVED (v0.5.0) | — |
| ~~psm~~ | REMOVED (v0.5.0) | — |
| swarm | DONE | ~/.codex/skills/swarm/SKILL.md |
| ~~learn-about-omx~~ | REMOVED (v0.5.0) | — |
| worker | DONE | ~/.codex/skills/worker/SKILL.md |

### 후크 파이프라인(전체 6개 + 9개 중 부분 3개 = ~89%)

| OMC Hook Event | OMX Equivalent | Capability |
|---------------|---------------|------------|
| SessionStart | AGENTS.md native + runtime overlay (preLaunch) | FULL+ |
| PreToolUse | AGENTS.md inline guidance | PARTIAL (no interception) |
| PostToolUse | notify config hook + tmux prompt injection workaround | FULL* |
| UserPromptSubmit | AGENTS.md self-detection | PARTIAL (model-side detection) |
| SubagentStart | Codex CLI multi_agent native | FULL |
| SubagentStop | Codex CLI multi_agent native | FULL |
| PreCompact | AGENTS.md overlay compaction protocol | PARTIAL (instructions only) |
| Stop | notify config + postLaunch cleanup | FULL |
| SessionEnd | omx postLaunch lifecycle phase | PARTIAL (post-exit cleanup) |

`*` FULL(기본적으로 기본 후크 컨텍스트 삽입이 아닌 `v0.2.3` 생성 `.omx/tmux-hook.json`에서 활성화됨)을 통한 터미널 자동화 해결 방법입니다.

### 하부 구조

| Component | OMC | OMX Status |
|-----------|-----|-----------|
| CLI (setup) | DONE | DONE |
| CLI (doctor) | DONE | DONE |
| CLI (help) | DONE | DONE |
| CLI (version) | DONE | DONE |
| CLI (status) | DONE | DONE |
| CLI (cancel) | DONE | DONE |
| Config generator | DONE | DONE |
| AGENTS.md template | DONE | DONE |
| State MCP server | DONE | DONE |
| Memory MCP server | DONE | DONE |
| Notify hook script | DONE | DONE |
| Keyword detector | DONE | DONE |
| Hook emulation layer | N/A | DONE |
| Mode base lifecycle | DONE | DONE |
| Verification protocol | DONE | DONE |
| Notification system | DONE | DONE |

## 알려진 격차

1. **사전 도구 차단** - 실행 전에 도구 호출을 차단할 수 없습니다. 해결 방법: AGENTS.md는 모델에 자체 조정을 지시합니다.
2. **후크에서 기본 컨텍스트 삽입** - Codex 후크 API에서는 사용할 수 없습니다. 해결 방법: tmux 프롬프트 삽입(`omx tmux-hook`)과 상태 파일 + AGENTS.md 지침(기본적으로 `v0.2.3` 생성된 구성에서 활성화됨).
3. **PreCompact 후크** - 이벤트 차단이 없습니다. 해결 방법: AGENTS.md 오버레이에는 모델에 압축 전 체크포인트 상태를 알려주는 압축 생존 지침이 포함되어 있습니다.
4. **세션 종료** - 실시간 이벤트가 없습니다. 해결 방법: `omx` 래퍼는 execSync 차단을 통해 Codex 종료를 감지하고 postLaunch 정리(오버레이 스트립, 세션 아카이브, 모드 취소)를 실행합니다.
5. **전체 LSP 프로토콜** - LSP 도구는 전체 LSP 프로토콜 대신 실용적인 래퍼(tsc, grep, regex)를 사용합니다. 누락: lsp_goto_definition, lsp_prepare_rename, lsp_rename, lsp_code_actions, lsp_code_action_resolve(5개 도구에는 실제 LSP가 필요함).
6. **Python REPL** - 아직 포팅되지 않았습니다. 과학자 에이전트에게만 필요합니다. v0.1.0의 우선순위가 낮습니다.

## 업스트림 기여 경로

100% 후크 패리티를 달성하려면 다음 변경 사항을 Codex CLI에 적용해야 합니다.
1. `BeforeToolUse` 후크 이벤트를 `codex-rs/hooks/`에 추가합니다.
2. `UserPromptSubmit` 후크 이벤트 추가
3. `config.toml`에 외부 후크 구성 추가(현재 `notify`만)
4. 후크 컨텍스트 주입 추가(hook stdout -> 시스템 메시지)

RFC 추적: TBD
