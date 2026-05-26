# 실행 준비 문제 해결

OMX가 설치된 것으로 나타나지만 실제 Codex 실행이 여전히 실패하는 경우 이 페이지를 사용하십시오.

## 설치 성공과 실제 실행 성공 비교

`omx setup` 및 `omx doctor`은 프롬프트, 기술, AGENTS 스캐폴딩, 구성 파일, 후크 및 런타임 전제 조건 등 OMX의 로컬 설치 인터페이스을 검증합니다. 활성 Codex 프로필이 모델 요청을 인증하고 완료할 수 있다고 보장하지 않습니다.

`omx doctor` 이후 OMX에 사용할 동일한 셸, HOME 및 프로젝트 디렉터리에서 실제 연기 테스트를 실행하세요.

```bash
codex login status
omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"
```

경계를 다음과 같이 처리하십시오.

- Codex 플러그인 설치/검색은 `${CODEX_HOME:-~/.codex}/plugins/cache/$MARKETPLACE_NAME/oh-my-codex/$VERSION/` 아래에 `oh-my-codex`을 캐시할 수 있습니다(로컬 설치를 위한 버전 식별자로 `local` 가능). 이는 마켓플레이스/플러그인 아티팩트를 확인합니다. 패키지된 플러그인에는 MCP 서버 및 앱에 대한 플러그인 범위 동반 메타데이터가 포함되어 있지만 기본/런타임 후크는 설정 소유로 유지되므로 여전히 전체 OMX 런타임 설정이 아닙니다.
- 플러그인 설치/검색은 `npm install -g oh-my-codex` 및 `omx setup`을 대체하지 않습니다. 레거시 설정 모드는 기본 에이전트(Agent)와 프롬프트를 설치하는 반면, 플러그인 설정 모드는 번들 스킬(Skill)에 대한 플러그인 검색에 의존하고 레거시 OMX 관리 프롬프트/네이티브 에이전트 TOML을 보관/제거하므로 오래된 역할 파일이 플러그인 동작을 섀도잉할 수 없습니다.
- `omx doctor` 녹색: 설치 및 로컬 런타임 배선이 정상으로 보입니다.
- `codex login status` 녹색: 활성 Codex 프로필이 로그인 상태를 볼 수 있습니다.
- `omx exec ...`은 `OMX-EXEC-OK`을 반환합니다. 실제 실행, 인증, 공급자 라우팅(Routing) 및 현재 작업 디렉터리 가정이 함께 작동합니다.

## Green Doctor이지만 `omx exec`이 인증 오류로 인해 실패합니다.

일반적인 실패 문자열에는 `401 Unauthorized`, `Missing bearer or basic authentication in header` 또는 `Incorrect API key provided`가 포함됩니다.

일반 로그인 셸뿐만 아니라 활성 런타임 프로필도 확인하세요.

1. OMX를 실행하는 셸에서 `HOME` 및 `CODEX_HOME`을 인쇄합니다.
2. 활성 `~/.codex` 또는 `CODEX_HOME`에 예상 인증 및 `config.toml`이 포함되어 있는지 확인하세요.
3. 동일한 쉘에서 `codex login status`을 다시 실행하십시오.

사용자 정의 HOME, 컨테이너, 프로필, CI 및 서비스 사용자 환경은 종종 시스템의 기본 사용자와 다른 `~/.codex`을 갖습니다. 한 집에서 작동하는 Codex 설정으로 인해 다른 집이 자동으로 준비되지는 않습니다.

## 로컬 프록시 또는 `openai_base_url` 불일치

설정이 OpenAI 호환 로컬 프록시 또는 게이트웨이에 의존하는 경우 활성 런타임 구성에 일치하는 기본 URL이 포함되어 있는지 확인하세요.

```toml
openai_base_url = "http://localhost:8317/v1"
```

실제 프록시 URL을 사용하세요. 프로필 로컬 `~/.codex/config.toml`에 `openai_base_url`이 누락된 경우 Codex는 프록시 발급 키를 기본 엔드포인트로 보낼 수 있습니다. 이렇게 하면 401 스타일 인증 오류로 인해 실제 실행이 실패하는 동안 설정 및 의사가 괜찮아 보일 수 있습니다.

## 오래된 `doctor --team` 또는 작동하지 않는 tmux 세션 상태

이전 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태가 더 이상 존재하지 않는 tmux 세션을 참조하는 경우 `omx doctor --team`, `omx team resume` 또는 시작 진단이 실패할 수 있습니다. 상태에서 `resume_blocker`을 언급할 수도 있고, 죽은 세션이 `.omx/state/team/<team-name>/config.json` 또는 `manifest.v2.json`에 기록될 수도 있습니다.

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)이 의도적으로 중단되고 라이브 tmux 세션이 남아 있지 않은 경우 다음을 사용하여 정리하세요.

```bash
omx team shutdown <team-name> --force --confirm-issues
omx cancel
omx doctor --team
```

아직 유용한 활성 창이나 작업자 상태가 있을 수 있는 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)을 강제 종료하지 마세요. 확실하지 않은 경우 `omx team status <team-name>` 및 `tmux ls`을 먼저 선호하세요.

## tmux 지원 OMX 세션에 개행을 삽입하는 대신 Shift+Enter를 누르면 제출됩니다.

이는 일반적으로 완전히 새로운 OMX 기능 격차가 **아닙니다**.

OMX는 이미 `#1271` / PR `#1273` 문제에서 tmux 측 보존 작업을 수행하고 있으며(`4405f582`, "tmux 지원 OMX 실행 내에서 Shift+Enter 유지") 현재 `dev`은 여전히 ​​OMX 소유 Codex 실행 경로 주변에서 tmux `extended-keys=always`를 활성화합니다.

- in-tmux는 `src/cli/index.ts`의 `withTmuxExtendedKeys(...)`을 사용하여 랩 Codex를 출시합니다.
- 분리된 tmux 실행은 `src/cli/index.ts`의 분리된 리더 부트스트랩/정리 경로를 통해 동일한 보호를 획득합니다.
- 회귀 테스트는 여전히 `src/cli/__tests__/index.test.ts`의 활성화/복원/임대 동작을 다루고 있습니다.

따라서 `Shift+Enter`이 여전히 일반 `Enter`처럼 동작하는 경우 가능한 가장 좁은 원인은 다음과 같습니다.

1. **tmux는 실제로 보고자의 터미널 경로에 대한 확장 키를 전달하지 않습니다**
   - tmux는 연결된 터미널이 확장 키를 지원하는 것으로 감지된 경우에만 더 풍부한 키 이벤트를 전달합니다.
   - `tmux show -gv extended-keys`은 `always`이라고 말할 수 있지만 터미널 기능이 없거나 감지되지 않으면 전달이 여전히 실패할 수 있습니다.
2. **보고자는 OMX 소유 tmux 실행 경로에 없습니다**
   - 예를 들어 시작된 OMX와 다른 창/세션에서 재생하거나 다른 클라이언트 경로를 통해 연결한 후 재생하는 경우입니다.
3. **단말기별 기능 불일치**
   - 일부 터미널에는 `extkeys`에 대한 명시적인 tmux `terminal-features` 힌트가 필요합니다.

### 운영자 확인

오류가 발생한 동일한 tmux 클라이언트/세션에서 다음을 실행하세요.

```bash
tmux show -gv extended-keys
tmux info | grep extkeys
tmux show -gv terminal-features
printf '%s\n' "$TERM" "$TERM_PROGRAM"
```

예상되는 첫 번째 확인: `always` OMX가 해당 tmux 관리 경로에서 Codex를 적극적으로 실행하는 동안.

실패한 세션 중에 `extended-keys`이 `always`이 **아님** 경우 이는 OMX 실행 경로 버그/회귀를 가리킵니다.

`extended-keys` **is** `always`이지만 `Shift+Enter`이 계속 제출하는 경우 문제는 OMX 제출 논리가 아닌 단말 기능 검색 또는 업스트림 Codex 단말 입력 해석일 가능성이 높습니다.

### 일반적인 환경 수정

터미널이 확장 키를 지원하지만 tmux가 이를 자동으로 감지하지 못하는 경우 `~/.tmux.conf`에 `extkeys` 기능 힌트를 추가하고 tmux를 다시 시작하세요.

```tmux
set -as terminal-features ',xterm-256color:extkeys'
```

클라이언트가 다른 terminfo 이름을 광고하는 경우 터미널 패턴을 코디네이션(Coordination)하십시오.

### 유지관리자 분류 지침

- 현재 `dev`이 라이브 OMX 소유 tmux 실행 경로에서 `extended-keys=always`을 설정하는 데 실패했음을 표시할 수 있는 경우에만 **코드 수정 사항을 엽니다**.
- **환경 제한으로 닫습니다** 현재 `dev`이 tmux 옵션을 올바르게 설정했지만 보고자의 터미널 경로가 여전히 더 풍부한 키 이벤트를 전달하지 않는 경우.
- 근본 문제가 손상된 OMX 코드 경로보다는 검색 가능성/운영자 안내인 경우 **문서 후속 조치를 선호하세요**.

## `omx explore` 대체 경계

`omx explore`에는 의도적으로 제한된 두 가지 대체 경로가 있습니다.

- **Sparkshell 백엔드 폴백**: 셸 네이티브 프롬프트(예: `git log --oneline`)를 한정하려면 `omx sparkshell`을 먼저 시도하세요. 해당 백엔드를 사용할 수 없거나 호환되지 않는 경우 stderr은 하네스가 실행되기 전에 `sparkshell backend unavailable ... Falling back to the explore harness`을 보고합니다.
- **탐색 하니스 내부의 모델 폴백**: 하니스는 구성된 스파크 모델을 먼저 시도한 다음 스파크가 실패한 경우에만 구성된 폴백/표준 모델을 시도합니다. 이로 인해 비용/행동 경계가 변경되므로 stderr은 `fallback-attempt=model from=... to=... reason=spark_attempt_failed exit=...`과 같은 구조화된 시도 메타데이터를 내보냅니다. stdout 알림 `## OMX Explore fallback`은 대체 출력이 성공한 후에만 표시됩니다.

하네스 제한은 폴백과 다릅니다. 하네스가 안전하게 응답할 수 없는 경우(지원되지 않는 플랫폼, 패키지 설치를 위한 기본 바이너리 누락, 체크아웃 시 Rust 툴체인 누락 또는 셸 전용이 아닌 작업), 제한 사항을 보고하고 중지하거나 호출자에게 더 풍부한 일반 경로를 사용하도록 요청해야 합니다. 도구나 모델 동작을 자동으로 확장해서는 안 됩니다.
