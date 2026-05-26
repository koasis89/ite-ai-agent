# 프롬프트 마이그레이션 변경 로그

## 범위

- 마이그레이션 기간: `e21cb5e` -> `ff7ee14`
- 인터페이스: `prompts/*.md`(30개 파일)
- 목표: 프롬프트 파일이 OMX에 대한 표준 XML 태그 하위 에이전트(Agent) 역할 인터페이스으로 남아 있음을 재확인하면서 이전 XML에서 마크다운으로의 마이그레이션을 문서화합니다.

## 전역 변경 사항(모든 프롬프트 파일에 적용)

- 보존된 머리말 메타데이터(`description`, `argument-hint`).
- `<Agent_Prompt>`, `<Role>`, `<Constraints>`, `<Output_Format>`, `<Final_Checklist>` 등의 래퍼 태그를 Markdown 섹션 제목으로 대체했습니다.
- 중첩된 XML과 유사한 섹션을 읽을 수 있는 마크다운 글머리 기호/번호가 매겨진 단계로 병합했습니다.
- 역할 의미, 도구 사용 의도, 가드레일, 체크리스트 기대치를 기능적으로 동일하게 유지합니다.
- 중요한 현재 상태 설명: 이제 프롬프트 텍스트가 Markdown 우선이지만 `prompts/*.md`의 각 파일은 여전히 ​​OMX 설치/생성 흐름에서 사용되는 표준 XML 태그가 지정된 하위 에이전트 역할 인터페이스입니다.

## 행동 참고 사항

- 이 마이그레이션 커밋에서는 의도적으로 도입된 기능적 동작 변경이 이루어지지 않았습니다.
- 동작 관련 콘텐츠(제약 조건, 검증 기대치, 출력 템플릿)는 구문/형식 지정이 정규화되는 동안 보존되었습니다.
- 마이그레이션 후 동작 차이는 정책 변경이 아닌 가독성 및 파서 호환성 개선으로 인해 발생할 것으로 예상됩니다.

## 파일별 매트릭스

| Prompt File | Added | Removed | Structural Highlights | Behavior Delta |
|---|---:|---:|---|---|
| `prompts/analyst.md` | 102 | 105 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/api-reviewer.md` | 90 | 93 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/architect.md` | 102 | 104 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/build-fixer.md` | 81 | 84 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/code-reviewer.md` | 98 | 100 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/critic.md` | 79 | 82 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/debugger.md` | 85 | 88 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/deep-executor.md` | 105 | 107 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/dependency-expert.md` | 91 | 94 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/designer.md` | 96 | 98 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/executor.md` | 92 | 94 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/explore.md` | 104 | 107 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/git-master.md` | 84 | 87 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/information-architect.md` | 28 | 29 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/performance-reviewer.md` | 86 | 89 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/planner.md` | 108 | 111 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/product-analyst.md` | 28 | 29 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/product-manager.md` | 33 | 34 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/qa-tester.md` | 90 | 93 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/quality-reviewer.md` | 98 | 100 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/quality-strategist.md` | 33 | 34 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/researcher.md` | 88 | 91 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/scientist.md` | 84 | 87 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/security-reviewer.md` | 119 | 121 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/style-reviewer.md` | 79 | 82 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/test-engineer.md` | 96 | 98 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/ux-researcher.md` | 28 | 29 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/verifier.md` | 87 | 90 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/vision.md` | 67 | 70 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |
| `prompts/writer.md` | 78 | 81 | XML-like wrapper blocks converted to Markdown section hierarchy; output/checklist sections normalized. | No intentional functional delta in migration commit. |

## 확인

- 커밋 차이점 요약: `30 files changed, 2439 insertions(+), 2511 deletions(-)`
- 역할이 많은 프롬프트(`planner`, `executor`, `explore`)에 대해 수행된 무작위 검사를 통해 형식 정규화와 의미론적 패리티가 확인되었습니다.

---

## 오케스트레이션 브파트 마이그레이션(`AGENTS.md`, `templates/AGENTS.md`)

### 요약

이러한 파일은 OMX가 Codex가 작업 공간 전체에서 따를 것으로 예상하는 명령 루트입니다.
여기에서의 변경 사항은 주로 지침을 Codex CLI 도구 계약과 일치시키는 것에 관한 것입니다.

### 주요 델타

- Codex `spawn_agent` API를 반영하도록 하위 에이전트 위임 지침을 업데이트했습니다.
  - `spawn_agent(message: "<role prompt>\n\nTask: ...")` 규칙을 사용하세요.
  - 레거시 "지침" 문구를 제거했습니다.
- 오케스트레이터가 전체 MCP 인터페이스을 올바르게 사용할 수 있도록 확장된 MCP 도구 카탈로그 및 모드 수명 주기 기대치입니다.
- `templates/AGENTS.md` 헤더가 `AGENTS.md`과 일치하도록 정규화되었으며 비준수 템플릿 오프너가 제거되었습니다.

### 차이점 통계

| File | Added | Removed | Notes |
|---|---:|---:|---|
| `AGENTS.md` | 42 | 10 | Tooling + delegation guidance expanded; semantics preserved. |
| `templates/AGENTS.md` | 7 | 7 | Header/tone normalized; still intended as a template copy. |

### 통합 지침 스키마 후속 조치(에이전트 + 런타임/작업자 정렬)

- 정식 스키마 문서를 추가했습니다: `docs/guidance-schema.md`.
- 다음에 명시적인 스키마 계약 섹션을 추가했습니다.
  - `AGENTS.md`
  - `templates/AGENTS.md`
- `AGENTS.md` 런타임 작업자 오버레이의 정규화된 작업자 작업 지침:
  - 이제 파일 경로는 `tasks/task-<id>.json`을 사용합니다.
  - 이제 API ID 규칙에는 기본 ID `task_id: "<id>"`(`"task-<id>"`이 아님)이 명시적으로 필요합니다.
- 마커 계약은 변경되지 않습니다.
  - `<!-- OMX:RUNTIME:START --> ... <!-- OMX:RUNTIME:END -->`
  - `<!-- OMX:TEAM:WORKER:START --> ... <!-- OMX:TEAM:WORKER:END -->`

행동 참고사항: 이 후속 조치는 추가적이며 표현에 초점을 맞췄습니다. 작업 상태 모델이나 MCP API 계약 변경 사항은 도입되지 않았습니다.

---

## 기술 프롬프트 마이그레이션(`skills/*/SKILL.md`)

### 요약

기술 문서는 운영 실행서입니다. 마이그레이션의 초점은 다음과 같습니다.
- Claude 시대의 경로/용어 제거
- 구성 지침을 Codex 우선 경로(`~/.codex/…`, `CODEX_HOME`)에 맞춰 코디네이션(Coordination)
- Codex CLI 사용자의 정확성을 향상시키면서 각 스킬(Skill)의 계약/의도를 유지합니다.

### 행동 참고 사항

- 이는 문서/지침 변경 사항입니다. 런타임 로직을 직접 변경하지 않습니다.
- 한 가지 의미 있는 수정이 이루어졌습니다. `skills/omx-setup/SKILL.md`의 "에이전트 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)" 활성화 지침이 레거시 `settings.json` 환경 변수가 아닌 `~/.codex/config.toml`을 통해 Codex 기능을 활성화하도록 업데이트되었습니다.

### 파일별 매트릭스

| Skill File | Added | Removed | Structural Highlights | Behavior Delta |
|---|---:|---:|---|---|
| `skills/analyze/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/autopilot/SKILL.md` | 11 | 16 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/code-review/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/configure-notifications/SKILL.md` | 0 | 0 | Canonical notification setup skill replacing standalone configure-* variants. | Catalog/install surface now converges on one entry point. |
| `skills/doctor/SKILL.md` | 47 | 45 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/ecomode/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/frontend-ui-ux/SKILL.md` | 2 | 2 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/help/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/learner/SKILL.md` | 5 | 5 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/omx-setup/SKILL.md` | 144 | 156 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/plan/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/project-session-manager/SKILL.md` | 5 | 5 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/release/SKILL.md` | 3 | 3 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/research/SKILL.md` | 10 | 15 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/security-review/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/skill/SKILL.md` | 20 | 20 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/tdd/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/ultrapilot/SKILL.md` | 11 | 16 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |
| `skills/writer-memory/SKILL.md` | 1 | 1 | Codex path/terminology normalization; examples updated to Codex-first conventions. | No direct runtime behavior change; instruction correctness improved. |

### 검토할 가치가 있는 핫스팟

- `skills/omx-setup/SKILL.md`: 가장 큰 편집 인터페이스; team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 활성화 지침(`~/.codex/config.toml` `[features]` 플래그) 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)원 표시 기본 설정 저장(`~/.codex/.omx-config.json`)이 포함되어 있습니다.
- `skills/doctor/SKILL.md`: 업데이트된 후크/구성 검사 언어; 선택적인 레거시 수정 지침이 여전히 포함되어 있습니다.
- `skills/autopilot/SKILL.md`, `skills/research/SKILL.md`, `skills/ultrapilot/SKILL.md`: 구성 예시가 TOML로 업데이트되었습니다.

## 후속 분류 참고사항

- `prompts/*.md`은 설치/런타임 계층이 이를 TOML 또는 기타 실행 프로그램별 봉투에 래핑하는 경우에도 XML 태그가 지정된 하위 에이전트 역할 프롬프트에 대한 정식 소스 세트로 처리되어야 합니다.
- `prompts/sisyphus-lite.md`은(는) 의도적으로 특수 작업자 행동 프롬프트로 분류됩니다. `executor`, `planner` 또는 `architect`과 같은 프롬프트와 함께 기본 공용 역할 카탈로그의 일부가 아닙니다.
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업자/런타임 오버레이는 Sisyphus-lite 동작 패턴을 빌릴 수 있지만 이것이 이를 일류 라우팅(Routing) 역할로 승격시키지는 않습니다.
