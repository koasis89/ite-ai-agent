# 런타임 모델 메타데이터 정리

## 왜

벤치마크 실행에서는 생성된 하위 에이전트(Agent)가 GPT-5.x 추론 설정을 사용하여 Codex에서 OMX가 시작된 경우에도 `sonnet`과 같은 레거시 모델 별칭으로 레이블이 지정되는 것으로 나타났습니다.

프롬프트/스킬(Skill) 레이어는 이미 삭제되었지만 런타임 메타데이터는 여전히 `src/agents/definitions.ts`에서 기록 별칭을 사용했습니다. 이러한 별칭은 기본 에이전트 구성을 생성할 때도 사용되었으며, 이로 인해 레거시 레이블이 생성된 에이전트 UX 및 벤치마크 출력으로 유출되었습니다.

## 무엇이 바뀌었나

### 1. 에이전트 런타임 메타데이터
- `src/agents/definitions.ts`에서 `model: haiku|sonnet|opus`을 `reasoningEffort: low|medium|high`로 대체했습니다.
- 자세와 모델급 컨셉을 그대로 유지했습니다.

### 2. 기본 에이전트 구성 생성
- `agent.reasoningEffort`에서 직접 `model_reasoning_effort`을 파생하도록 `src/agents/native-config.ts`을 업데이트했습니다.
- 레거시 별칭 변환 테이블을 제거했습니다.

### 3. 테스트
- 새로운 런타임 메타데이터 형태와 일치하도록 `src/agents/__tests__/definitions.test.ts` 및 `src/agents/__tests__/native-config.test.ts`을 업데이트했습니다.
- 기존 프롬프트/스킬 삭제 테스트는 프롬프트 콘텐츠에 다시 나타나는 오래된 별칭에 대한 보호 수단으로 남아 있습니다.

### 4. 청소 지원
- `src/verification/verifier.ts` 주석 문구를 레거시 별칭 이름에서 낮음/중간/높음 추론 문구로 업데이트했습니다.

## 기대효과

`omx setup --force`을 다시 빌드하고 다시 실행한 후 생성된 에이전트 메타데이터는 마치 Codex 기반 OMX 실행을 위한 활성 런타임 모델인 것처럼 `haiku` / `sonnet` / `opus` 표시를 중지해야 합니다.

## 재테스트 단계

```bash
npm run build   # TypeScript build
node bin/omx.js setup --scope project --force
```

그런 다음 포크 벤치마크를 다시 실행하고 나머지 `Model: sonnet` 라인을 살펴보세요. 이 정리 후에도 여전히 나타나는 경우 나머지 소스는 프롬프트/스킬/런타임 메타데이터 생성 외부에 있을 가능성이 높으며 Codex 디스플레이 통합 또는 캐시/생성된 구성 아티팩트에서 조사해야 합니다.
