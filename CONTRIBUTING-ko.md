# oh-my-codex에 기여

기여해 주셔서 감사합니다.

## 개발 설정

- Node.js >= 20
- npm

```bash
npm install
npm run lint
npm run build
npm test
```

로컬 CLI 테스트의 경우:

```bash
npm link
omx setup
omx doctor
```

### 팀/주 적용 범위 게이트(문제 #454)

CI는 중요한 팀 조정 모듈에 대해 최소 적용 범위를 적용합니다.

```bash
npm run coverage:team-critical
```

이 명령은 `dist/team/**` 및 `dist/state/**`에 대한 적용 범위를 확인하고 `coverage/team/`에 보고서를 작성합니다.

### 출시 준비 로컬 검증

팀/상태 변경 사항을 확인할 때 다음 시퀀스를 로컬에서 실행하세요.

```bash
npm run build
node --test dist/team/__tests__/state.test.js dist/hooks/__tests__/notify-hook-cross-worktree-heartbeat.test.js
npm test
```

최근 팀 작업자 세션에 참여했다면 먼저 팀 환경 변수를 지워서 테스트가 작업자별 상태 루트를 상속하지 않도록 하세요.

```bash
unset OMX_TEAM_WORKER OMX_TEAM_STATE_ROOT OMX_TEAM_LEADER_CWD OMX_TEAM_WORKER_CLI OMX_TEAM_WORKER_CLI_MAP OMX_TEAM_WORKER_LAUNCH_ARGS
```

## 프로젝트 구조

- `src/` -- TypeScript 소스(CLI, 구성, 에이전트, MCP 서버, 후크, 모드, 팀, 확인)
- `prompts/` -- 에이전트 프롬프트 마크다운 파일 30개(`~/.codex/prompts/`에 설치됨)
- `skills/` -- `SKILL.md`이 포함된 39개의 스킬 디렉터리(`~/.codex/skills/`에 설치됨)
- `templates/` -- `AGENTS.md` 오케스트레이션 브레인 템플릿

### 새 상담원 프롬프트 추가

1. 에이전트의 시스템 프롬프트로 `prompts/my-agent.md`을 생성합니다.
2. `omx setup --force`을 실행하여 `~/.codex/prompts/`에 설치합니다.
3. Codex CLI에서 `/prompts:my-agent` 사용

### 신속한 지도계약

`AGENTS.md`, `templates/AGENTS.md`, `prompts/*.md` 또는 `src/config/generator.ts`에서 생성된 `developer_instructions` 텍스트를 변경하기 전에 [__TOK_5__](./docs/prompt-guidance-contract.md)을 읽어보세요.

이 문서는 GPT-5.4 동작 계약 기여자가 프롬프트 표면 전체에서 보존해야 하는 동작을 정의하고 이것이 상태 인식 라우팅 메타데이터와 어떻게 다른지 설명합니다.

### 새로운 스킬 추가

1. 스킬 워크플로를 사용하여 `skills/my-skill/SKILL.md` 생성
2. `omx setup --force`을 실행하여 `~/.codex/skills/`에 설치합니다.
3. Codex CLI에서 `$my-skill` 사용


### 문서 새로고침 경고

OMX에는 사양 기반 변경에 대한 에이전트 전용 문서 새로 ​​고침 경고 MVP가 있습니다. 그것
매핑된 제품 또는 테스트 계약 코드 변경 사항이 나타나면 Codex/OMX 에이전트에 경고합니다.
규칙 범위 계획 사양 또는 제품 문서 새로 ​​고침 없이. 이는 경고 전용입니다.
일반 CI 오류를 추가하지 않으며 사전 커밋 프레임워크를 설치하지 않습니다.
문서 새로 ​​고침을 이유로 `git commit`을(를) 하드 차단해서는 안 됩니다.

현재 매핑된 새로 고침 예:

- 네이티브 후크 동작(`src/scripts/codex-native-hook.ts`,
  `src/scripts/codex-native-pre-post.ts`, `src/config/codex-hooks.ts` 및
  관련 네이티브 후크 테스트)는 `docs/codex-native-hooks.md` 또는
  네이티브 후크 범위 계획/사양 파일입니다.
- 문서 새로 ​​고침 시행자 동작(`src/document-refresh/**`)을 새로 고쳐야 합니다.
  `docs/codex-native-hooks.md` 또는 문서 새로 ​​고침 범위 계획/사양 파일.
- CLI/운영자 동작(`src/cli/**`)은 `README.md`을 새로 고쳐야 합니다.
  `docs/getting-started.html` 또는 관련 계획/사양 파일.
- 신속한 안내 동작(`src/hooks/**` 규칙 소유 안내 표면)은 다음과 같습니다.
  `docs/prompt-guidance-contract.md` 또는 관련 계획/사양 파일을 새로 고칩니다.

커밋 경로 경고는 Bash `git commit` 범위로 지정되며 단계적 diff만 읽습니다.
`.omx/`은 무시되므로 `.omx/plans/**` 및 `.omx/specs/**`은(는)
추적되거나 강제로 단계화되고 규칙을 소유한 경우에만 커밋 경로가 억제됩니다.
최종 핸드오프 경고는 터미널에서 보이는 핸드오프 시도에서만 실행되며 단계적으로 읽혀집니다.
또한 단계적이지 않은 변경 사항을 포함하고 새로운 로컬 규칙 소유의 `.omx` 계획/사양을 계산할 수 있습니다.
파일. mtime 기반 지역 신선도는 경험적 증거이지,
의미 새로 고침.

문서 새로 ​​고침이 필요하지 않은 경우 명시적인 승인을 포함합니다.
커밋 메시지 또는 최종 전달 이유:

```text
Document-refresh: not-needed | <reason>
```

## 작업 흐름

1. 일반 기여를 위해 `dev`에서 분기를 만듭니다.
2. 집중적으로 변경하세요.
3. 로컬에서 린트, 빌드, 테스트를 실행하세요.
4. 제공된 템플릿을 사용하여 `dev`을 대상으로 하는 풀 요청을 엽니다. 관리자가 지시하는 예외에만 `main`을 사용하세요.

## 커밋 스타일

간결하고 인텐트 우선 커밋 메시지를 사용하세요. 기존 기록은 다음과 같은 접두사를 사용합니다.

- `feat:`
- `fix:`
- `docs:`
- `chore:`

예:

```text
docs: clarify setup steps for Codex CLI users
```

## 풀 리퀘스트 체크리스트

- [ ] 범위가 집중되어 있고 명확하게 설명되어 있습니다.
- [ ] `npm run build` 통과
- [ ] `npm test` 통과
- [ ] `npm run lint` 통과
- [ ] 동작이 변경되면 문서가 업데이트되었습니다.
- [ ] 관련 없는 서식 지정/리팩터링 변동 없음

## 문제 보고

재현 단계 및 예상 동작을 포함하여 버그 보고서 및 기능 요청에 GitHub 문제 템플릿을 사용하세요.
