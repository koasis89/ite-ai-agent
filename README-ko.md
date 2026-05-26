# 오마이코덱스(OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-codex-website/omx-character-nobg.png" alt="oh-my-codex character" width="280">
  <br>
  <em>Codex를 더욱 강력하게 시작한 다음 작업이 커질 때 OMX가 더 나은 프롬프트, 작업 흐름 및 런타임 도움말을 추가하도록 하세요.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-codex)](https://www.npmjs.com/package/oh-my-codex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Discord](https://img.shields.io/discord/1452487457085063218?color=5865F2&logo=discord&logoColor=white&label=Discord)](https://discord.gg/PUwSMR9XNk)

**웹사이트:** https://yeachan-heo.github.io/oh-my-codex-website/

**문서:** [Getting Started](./docs/getting-started.html) · [Agents](./docs/agents.html) · [Skills](./docs/skills.html) · [Integrations](./docs/integrations.html) · [Demo](./DEMO.md) · [OpenClaw guide](./docs/openclaw-integration.md)

**커뮤니티:** [Discord](https://discord.gg/PUwSMR9XNk) — oh-my-codex 및 관련 도구를 위한 공유 OMX/커뮤니티 서버입니다.

OMX는 [OpenAI Codex CLI](https://github.com/openai/codex)의 워크플로 계층입니다.

<table>
<tr>
<td><strong>🚨 주의 — 권장되는 기본 설정만: Codex CLI가 포함된 macOS 또는 Linux.</strong><br><br><strong>OMX는 주로 해당 경로에 맞게 설계되고 적극적으로 조정되었습니다.</strong><br><strong>기본 Windows 및 Codex 앱은 기본 환경이 아니므로 중단되거나 작동할 수 있습니다. 일관성이 없으며 현재 지원을 덜 받고 있습니다.</strong></td>
</tr>
</table>

Codex를 실행 엔진으로 유지하고 다음을 더 쉽게 수행할 수 있습니다.
- 기본적으로 더 강력한 Codex 세션을 시작합니다
- 설명부터 완료까지 일관된 하나의 워크플로를 실행합니다.
- `$deep-interview`, `$ralplan`, `$team` 및 `$ralph`을 사용하여 정식 기술을 호출합니다.
- `.omx/`에 프로젝트 지침, 계획, 로그 및 상태를 보관합니다.

## 핵심 유지관리자

| Role | Name | GitHub |
| --- | --- | --- |
| Creator & Lead | Yeachan Heo | [@Yeachan-Heo](https://github.com/Yeachan-Heo) |
| Maintainer | HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |

## 대사

| Name | GitHub |
| --- | --- |
| Sigrid Jin | [@sigridjineth](https://github.com/sigridjineth) |

## 최고의 공동작업자

| Name | GitHub |
| --- | --- |
| HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |
| Junho Yeo | [@junhoyeo](https://github.com/junhoyeo) |
| JiHongKim98 | [@JiHongKim98](https://github.com/JiHongKim98) |
| Lor | [@gobylor](https://github.com/gobylor) |
| HyunjunJeon | [@HyunjunJeon](https://github.com/HyunjunJeon) |

## 권장되는 기본 흐름

기본 OMX 환경을 원한다면 여기에서 시작하세요.

```bash
npm install -g @openai/codex oh-my-codex
omx --madmax --high
```

실제 `oh-my-codex` 버전 범프에서 전역 npm 설치는 이제 `omx setup`을 자동으로 시작하는 대신 명시적인 알림을 인쇄합니다. 준비가 되면 `omx setup`을 수동으로 실행하거나 `omx update`을 사용하여 npm을 확인한 다음 동일한 설정 새로 고침 경로를 실행하세요.

**Codex 플러그인 설치 참고 사항:** 이 저장소는 `.agents/plugins/marketplace.json`의 마켓플레이스 메타데이터와 함께 `plugins/oh-my-codex`의 공식 Codex 플러그인 레이아웃도 제공합니다. 해당 플러그인은 미러링된 스킬 표면과 MCP 서버 및 앱에 대한 플러그인 범위 동반 메타데이터를 번들로 제공합니다. 기본/런타임 후크는 설치 가능한 플러그인 매니페스트가 아닌 설정/런타임 측에 계속 유지됩니다. 여전히 `npm install -g oh-my-codex` 및 `omx setup`을 대체하는 것은 **아님**: 레거시 설정 모드는 기본 에이전트와 프롬프트를 설치하는 반면, 플러그인 설정 모드는 번들 기술에 대한 플러그인 검색에 의존하고 레거시 OMX 관리 프롬프트/네이티브 에이전트 TOML을 보관/제거하므로 오래된 역할 파일이 플러그인 동작을 섀도잉할 수 없습니다.

그런 다음 Codex 내에서 정상적으로 작업하십시오.

```text
$deep-interview "clarify the authentication change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
$ultragoal "turn this launch into durable Codex goals"
```

그것이 주요 경로입니다.
런타임을 준비된 것으로 처리하기 전에 아래의 빠른 시작 스모크 테스트를 실행하십시오. `omx doctor`은 설치 형태를 확인하고, `omx exec`은 활성 Codex 런타임이 현재 환경에서 모델 호출을 실제로 인증하고 완료할 수 있음을 증명합니다.
OMX를 강력하게 시작하고, 필요할 때 먼저 명확히 하고, 계획을 승인한 다음, 조정된 병렬 실행을 위해 `$team`을 선택하거나 지속적인 완료 루프를 위해 `$ralph`을 선택합니다.

## OMX의 용도

이미 Codex를 좋아하고 그에 따른 더 나은 일상 런타임을 원한다면 OMX를 사용하세요.
- `$deep-interview`, `$ralplan`, `$team` 및 `$ralph`을 중심으로 구축된 표준 작업 흐름
- 출시에 순차적 Codex 목표가 필요할 때 `$ultragoal` 및 `.omx/ultragoal` 아티팩트를 사용한 내구성 있는 다중 목표 핸드오프
- 작업에 필요할 때 전문가 역할 및 지원 기술
- 범위가 지정된 `AGENTS.md`을 통한 프로젝트 지침
- 계획, 로그, 메모리 및 모드 추적을 위한 `.omx/`의 지속 가능한 상태

추가 작업 흐름 레이어가 없는 일반 Codex를 원한다면 아마도 OMX가 필요하지 않을 것입니다.

## 빠른 시작

### 요구사항

- Node.js 20+
- 설치된 Codex CLI: `npm install -g @openai/codex`
- OMX를 실행할 동일한 셸/프로필에서 Codex 인증이 구성되고 표시됩니다.
- 권장되는 내구성 있는 팀 런타임을 원하는 경우 macOS/Linux의 `tmux`
- 의도적으로 덜 지원되는 Windows 팀 경로를 원하는 경우에만 기본 Windows에서 `psmux`

### 좋은 첫 세션

설치 후 두 경계를 모두 확인하십시오.

```bash
omx doctor
codex login status
omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"
```

`omx doctor`은 누락된 OMX 파일, 후크 및 런타임 전제조건을 포착합니다. 실제 스모크 테스트는 Codex가 실제 요청을 수행할 때만 나타나는 인증, 프로필 및 공급자/기본 URL 문제를 포착합니다.

권장되는 방법으로 OMX를 실행하세요.

```bash
omx --madmax --high
```

`tmux`을 사용할 수 있는 macOS/Linux 대화형 터미널에서는
기본적으로 OMX 관리 분리형 tmux의 리더이므로 HUD/런타임 창을
생성 및 복구되었습니다.

OMX tmux/HUD 관리 없이 일회성 실행을 원하는 경우 `--direct`을 사용하세요.

```bash
omx --direct --yolo
```

영구 셸/프로필 기본 설정의 경우 환경 정책을 설정합니다.

```bash
OMX_LAUNCH_POLICY=direct omx --yolo
```

다음을 사용하여 자동/기본 동작으로 돌아갑니다.

```bash
unset OMX_LAUNCH_POLICY
```

CLI 정책 플래그가 환경을 이기고 마지막 CLI 정책 플래그가 환경을 이깁니다.
`--` 승리:

```bash
OMX_LAUNCH_POLICY=direct omx --tmux --yolo
```

`OMX_LAUNCH_POLICY=direct|tmux|detached-tmux|auto`을(를) 사용하세요. 이번 반복만
CLI 및 환경 제어를 추가합니다. 의도적으로 구성 파일을 추가하지 않습니다.
환경. 기존 tmux 창 내부에서 `--direct`을 실행하면 OMX는
HUD 분할을 생성하거나 마우스 모드를 활성화하거나 확장 키 처리를 래핑하지만
프로세스는 이미 열려 있는 터미널 창 내에서 계속 실행됩니다.

그런 다음 표준 워크플로를 시도해 보세요.

```text
$deep-interview "clarify the authentication change"
$ralplan "approve the safest implementation path"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

승인된 계획에 조정된 병렬 작업이 필요한 경우 `$team`을 사용하고, 한 명의 영구 소유자가 계속해서 완료해야 하는 경우 `$ralph`을 사용합니다.

## 간단한 정신 모델

OMX는 Codex를 대체하지 **않습니다**.

주변에 더 나은 작업 레이어를 추가합니다.
- **Codex**는 실제 에이전트가 작동합니다.
- **OMX 역할 키워드**는 유용한 역할을 재사용 가능하게 만듭니다.
- **OMX 기술**을 통해 공통 워크플로를 재사용할 수 있습니다.
- **`.omx/`** 계획, 로그, 메모리 및 런타임 상태를 저장합니다.

대부분의 사용자는 OMX를 하루 종일 수동으로 작동하는 명령 표면이 아니라 **더 나은 작업 라우팅 + 더 나은 작업 흐름 + 더 나은 런타임**으로 생각해야 합니다.

## 처음이라면 여기서 시작하세요

1. `npm install -g @openai/codex oh-my-codex`을(를) 사용하여 OMX 설치 또는 업데이트
2. 설치 또는 실제 OMX 버전 충돌 후 준비가 되면 `omx setup`을 직접 실행하거나 설정을 새로 고치기 전에 npm이 최신 빌드를 확인하고 설치하도록 하려면 `omx update`을 사용하세요.
3. `omx doctor` 실행
4. 실제 실행 스모크 테스트 실행: `codex login status` 및 `omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"`
5. `omx --madmax --high`로 시작
6. 요청이나 경계가 여전히 명확하지 않은 경우 `$deep-interview "..."`을 사용하세요.
7. `$ralplan "..."`을 사용하여 계획을 승인하고 장단점을 검토합니다.
8. 조정된 병렬 실행의 경우 `$team`을 선택하고 지속적인 완료 루프의 경우 `$ralph`을 선택합니다.

## 권장 워크플로우

1. `$deep-interview` — 요청이나 경계가 여전히 모호한 경우 범위를 명확히 합니다.
2. `$ralplan` — 명확한 범위를 승인된 아키텍처 및 구현 계획으로 전환합니다.
3. `$team` 또는 `$ralph` — 조정된 병렬 실행의 경우 `$team`을 사용하고, 소유자가 한 명인 지속적인 완료 루프를 원할 경우 `$ralph`을 사용합니다.

## 일반적인 세션 내 표면

| Surface | Use it for |
| --- | --- |
| `$deep-interview "..."` | clarifying intent, boundaries, and non-goals |
| `$ralplan "..."` | approving the implementation plan and tradeoffs |
| `$ralph "..."` | persistent completion and verification loops |
| `$team "..."` | coordinated parallel execution when the work is big enough |
| `/skills` | browsing installed skills and supporting helpers |

## 고급/작업자 표면

이는 유용하지만 주요 온보딩 경로는 아닙니다.

### 팀 런타임

OMX 사용을 시작하는 기본 방법이 아니라 내구성 있는 tmux/작업 트리 조정이 특히 필요한 경우 팀 런타임을 사용하세요. Codex 앱 또는 일반 외부 tmux 세션에서 `omx team`을 직접 사용 가능한 인앱 워크플로가 아닌 tmux 런타임 셸 표면으로 처리합니다. 실제로 팀 실행을 원할 경우 먼저 셸에서 OMX CLI를 실행하세요.

```bash
omx team 3:executor "fix the failing tests with verification"
omx team status <team-name>
omx team resume <team-name>
omx team shutdown <team-name>
```

### 설정, 의사 및 HUD

조작자/지지 표면은 다음과 같습니다.
- Codex 플러그인 마켓플레이스 설치/검색은 `${CODEX_HOME:-~/.codex}/plugins/cache/$MARKETPLACE_NAME/oh-my-codex/$VERSION/` 아래에 플러그인을 캐시할 수 있습니다(로컬 설치는 버전 식별자로 `local`을 사용할 수 있음). 해당 패키지 플러그인에는 이제 MCP 서버 및 앱에 대한 플러그인 범위 동반 메타데이터가 포함되어 있지만 기본/런타임 후크는 설정 소유로 유지되므로 여전히 전체 OMX 런타임 설정이 아닙니다.
- `omx setup`은 프롬프트, 스킬, AGENTS 스캐폴딩, `.codex/config.toml` 및 OMX 관리 네이티브 Codex 후크를 `.codex/hooks.json`에 설치합니다.
  - 설정 새로 고침은 `.codex/hooks.json`의 비OMX 후크 항목을 유지하고 OMX 관리 래퍼만 다시 작성합니다.
  - `omx setup --merge-agents`은 `<!-- OMX:AGENTS:START -->` / `<!-- OMX:AGENTS:END -->` 사이에 생성된 OMX 섹션을 삽입하거나 새로 고치는 동안 기존 `AGENTS.md` 지침을 유지합니다. `--merge-agents` 또는 `--force`이 없으면 비대화형 설정이 기존 `AGENTS.md` 파일을 계속 건너뜁니다.
  - `omx uninstall`은 `.codex/hooks.json`에서 OMX 관리 래퍼를 제거하지만 사용자 후크가 남아 있을 때 파일을 유지합니다.
- `omx update`은 즉시 npm을 확인하고 최신 전역 OMX 빌드를 설치한 다음 동일한 대화형 설정 새로 고침 경로를 다시 실행합니다.
- 새로운 OMX 관리형 `gpt-5.5` 구성 시드는 이제 `model_context_window = 250000` 및 `model_auto_compact_token_limit = 200000`를 권장하지만 해당 키가 누락된 경우에만 해당됩니다.
- `.omx-config.json` 모델/환경 라우팅은 [the model/env routing reference](./docs/reference/omx-config-schema-routing.md)에 문서화되어 있습니다. 설치된 OMX 버전에서 지원되는 편집 키만
- `omx doctor`은 문제가 있는 것으로 보일 때 설치를 확인합니다. 활성 Codex 프로필이 인증된 모델 호출을 할 수 있음을 증명하지는 않습니다.
- `omx hud --watch`은 기본 사용자 워크플로가 아닌 모니터링/상태 표면입니다.

팀이 아닌 세션의 경우 기본 Codex 후크는 이제 정식 수명 주기 표면입니다.
- `.codex/hooks.json` = 네이티브 Codex 후크 등록
- `.omx/hooks/*.mjs` = OMX 플러그인 후크
- `omx tmux-hook` / 알림 후크 / 파생 감시자 = tmux + 런타임 대체 경로

현재 네이티브/폴백 매트릭스는 [Codex native hook mapping](./docs/codex-native-hooks.md)을 참조하세요.


### 거짓 녹색 준비 문제 해결

녹색 `omx doctor`은 설치 및 로컬 런타임 연결이 정상으로 보인다는 의미입니다. 실제 실행이 여전히 실패하면 Codex가 실제로 사용하는 환경을 확인하십시오.

- OMX를 시작할 동일한 셸/프로필에서 `codex login status` 및 `omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"`을 실행합니다.
- 사용자 정의 HOME, 프로필, 컨테이너 또는 서비스 셸에서 활성 `~/.codex`(또는 `CODEX_HOME`)이 예상된 인증 및 구성이 있는 것인지 확인합니다. 일반 사용자 `~/.codex`이 여기에 표시된다고 가정하지 마세요.
- 로컬 OpenAI 호환 프록시에 의존하는 경우 활성 `~/.codex/config.toml`에 예상되는 `openai_base_url`이 포함되어 있는지 확인하세요. 그렇지 않으면 프록시 발급 키가 기본 엔드포인트로 전송되고 `401 Unauthorized`, `Missing bearer or basic authentication in header` 또는 `Incorrect API key provided`로 실패할 수 있습니다.
- `omx doctor --team` 또는 이력서가 `resume_blocker`과 같은 부실 팀 또는 누락된 tmux 세션을 보고하는 경우 재시도하기 전에 작동 중지된 런타임 상태를 정리하십시오.

```bash
omx team shutdown <team-name> --force --confirm-issues
omx cancel
omx doctor --team
```

강제 팀 종료는 사망했거나 의도적으로 포기한 팀에 대해서만 사용하세요.

OMX 관리 tmux 세션 내에 줄 바꿈을 삽입하는 대신 `Shift+Enter`이 여전히 제출하는 경우 [Troubleshooting execution readiness](./docs/troubleshooting.md#shiftenter-submits-instead-of-inserting-a-newline-in-tmux-backed-omx-sessions)을 참조하세요. 현재 OMX는 이미 자체 Codex 실행 경로를 중심으로 tmux 확장 키 전달을 지원하므로 지속적인 오류는 일반적으로 완전히 새로운 OMX 기능 격차가 아닌 tmux 터미널 기능/검색 가능성 문제입니다.

### 탐색 및 Sparkshell

- `omx explore --prompt "..."`은 읽기 전용 저장소 조회용입니다.
- `omx sparkshell <command>`은 쉘 네이티브 검사 및 제한된 검증용입니다.
- `omx_wiki/`이 존재하면 `omx explore`은 더 넓은 저장소 검색으로 돌아가기 전에 Wiki 우선 컨텍스트를 삽입할 수 있습니다.
- 폴백 경계는 명시적입니다. Sparkshell-backend 폴백은 stderr에 보고되고, 스파크 모델 폴백은 stderr 메타데이터와 함께 stdout에 `## OMX Explore fallback` 알림을 표시하므로 사용자는 비용/동작이 저비용 경로와 다를 수 있는 시기를 확인할 수 있습니다.

예:

```bash
omx explore --prompt "find where team state is written"
omx sparkshell git status
omx sparkshell --tmux-pane %12 --tail-lines 400
```

### 위키

- `omx wiki`은 OMX 위키 MCP 서버의 CLI 패리티 표면입니다.
- Wiki 데이터는 `omx_wiki/` 아래 저장소 프로젝트 지식으로 존재합니다.
- 위키는 벡터 우선이 아닌 마크다운 우선, 검색 우선입니다.

예:

```bash
omx wiki list --json
omx wiki query --input '{"query":"session-start lifecycle"}' --json
omx wiki lint --json
omx wiki refresh --json
```

### 팀 모드에 대한 플랫폼 노트

`omx team`은 `tmux`이 있는 macOS/Linux에서 가장 잘 작동합니다.
기본 Windows는 보조 경로로 남아 있으며, Windows에서 호스팅되는 설정을 원하는 경우 일반적으로 WSL2가 더 나은 선택입니다.
기본 Windows에서 OMX는 이미 사용하고 있는 기존 tmux 지원 경로에 대한 tmux 호환 바이너리로 `psmux`을 허용합니다.

| Platform | Install |
| --- | --- |
| macOS | `brew install tmux` |
| Ubuntu/Debian | `sudo apt install tmux` |
| Fedora | `sudo dnf install tmux` |
| Arch | `sudo pacman -S tmux` |
| Windows | `winget install psmux` |
| Windows (WSL2) | `sudo apt install tmux` |

## 알려진 문제

### Intel Mac: 시작 중 높은 `syspolicyd` / `trustd` CPU

일부 Intel Mac에서는 OMX 시작(특히 `--madmax --high` 사용)으로 인해 macOS Gatekeeper가 많은 동시 프로세스 시작을 검증하는 동안 `syspolicyd` / `trustd` CPU 사용량이 급증할 수 있습니다.

이런 일이 발생하면 다음을 시도해 보세요.
- `xattr -dr com.apple.quarantine $(which omx)`
- macOS 보안 설정의 개발자 도구 허용 목록에 터미널 앱 추가
- 낮은 동시성 사용(예: `--madmax --high` 방지)

## 선적 서류 비치

- [Getting Started](./docs/getting-started.html)
- [Demo guide](./DEMO.md)
- [Wiki feature](./docs/wiki-feature.md)
- [Agent catalog](./docs/agents.html)
- [Skills reference](./docs/skills.html)
- [Codex native hook mapping](./docs/codex-native-hooks.md)
- [GitHub / PR / package identity pipeline](./docs/pipeline/github-pr-package-identity.md)
- [Integrations](./docs/integrations.html)
- [Troubleshooting execution readiness](./docs/troubleshooting.md)
- [OpenClaw / notification gateway guide](./docs/openclaw-integration.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## 언어

- [English](./README.md)
- [한국어](./docs/readme/README.ko.md)
- [日本語](./docs/readme/README.ja.md)
- [简体中文](./docs/readme/README.zh.md)
- [繁體中文](./docs/readme/README.zh-TW.md)
- [Tiếng Việt](./docs/readme/README.vi.md)
- [Español](./docs/readme/README.es.md)
- [Português](./docs/readme/README.pt.md)
- [Русский](./docs/readme/README.ru.md)
- [Türkçe](./docs/readme/README.tr.md)
- [Deutsch](./docs/readme/README.de.md)
- [Français](./docs/readme/README.fr.md)
- [Italiano](./docs/readme/README.it.md)
- [Ελληνικά](./docs/readme/README.el.md)
- [Polski](./docs/readme/README.pl.md)
- [Українська](./docs/readme/README.uk.md)

## 기여자

| Role | Name | GitHub |
| --- | --- | --- |
| Creator & Lead | Yeachan Heo | [@Yeachan-Heo](https://github.com/Yeachan-Heo) |
| Maintainer | HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |

## 스타의 역사

[![Star History Chart](https://api.star-history.com/svg?repos=Yeachan-Heo/oh-my-codex&type=date&legend=top-left)](https://www.star-history.com/#예찬-허/oh-my-codex&type=date&legend=top-left)

## 특허

와 함께
