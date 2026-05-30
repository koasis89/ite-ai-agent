# OMX Agents 모듈 개별 설계서

## 0. 문서 정보
- 모듈: agents
- 기준 분석 문서: Electron/analysis/agents-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 에이전트 레지스트리, 모델/포스처 오버레이, native config 설치 정책을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: agent definition, model resolution, installation policy 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: agents 모듈은 OMX에서 사용하는 모든 역할 에이전트를 정적 메타데이터로 정의하고, prompt 파일과 결합해 Codex용 TOML 설정을 생성·설치한다.
- 주요기능:
  - 에이전트 정의 레지스트리: role, posture, modelClass, tools, category 선언
  - TOML 조립: prompt frontmatter 제거 후 developer instructions 생성
  - 모델 해석: frontier/standard/fast 및 researcher 고정 모델 규칙 적용
  - 설치 정책: catalog manifest에 기반한 installable agent 집합 결정

## 2. 책임과 경계
- 책임:
  - AGENT_DEFINITIONS를 단일 진실 공급원으로 유지
  - prompt content와 metadata를 결합해 native agent config를 생성
  - 카탈로그 상태를 기준으로 설치 가능 여부를 필터링
- 비책임:
  - 프롬프트 본문 작성이나 실제 역할 실행은 담당하지 않는다.
- 경계:
  - agents는 설치/구성 계층이며, 실제 tool execution은 Codex runtime과 상위 workflow가 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - getAgent(name)
  - getAgentsByCategory(category)
  - getAgentNames()
  - generateAgentToml(agent, promptContent, options)
  - composeRoleInstructions(promptContent, metadata, resolvedModel)
  - installNativeAgentConfigs(pkgRoot, options)
  - getInstallableNativeAgentNames(manifest)
  - assertNativeAgentCanonicalTargets(manifest)
- 내부 인터페이스:
  - AGENT_DEFINITIONS registry
  - posture/model overlays
  - catalog policy helper
- 호출자:
  - setup/install workflow, agent customization pipeline, catalog-based install scripts

## 4. 데이터 구조와 계약
- 주요 타입:
  - AgentDefinition: name, description, reasoningEffort, posture, modelClass, routingRole, tools, category
  - Catalog manifest entries / status
  - TOML config payload with developer_instructions and metadata
  - Installation options: force, dryRun, verbose, allowUncatalogedDefinitions
- 계약 원칙:
  - researcher는 항상 고정 모델을 사용한다.
  - executor는 frontier 모델로 승격된다.
  - prompt frontmatter는 developer instructions에 포함하지 않는다.
  - alias/merged agent는 canonical target이 installable해야 한다.

## 5. 상태 전이와 불변식
- 설치 상태 전이:
  - catalog acceptable -> toml generated -> installed
  - existing file and force=false -> skip
- 모델 해석 전이:
  - agent metadata -> resolved model -> TOML config
- 불변식:
  - posture와 modelClass overlay는 일관되게 적용되어야 한다.
  - same prompt + same manifest implies deterministic install set.
  - canonical target validation fails closed.

## 6. 핵심 시퀀스
- 설치 시퀀스:
  1. 카탈로그 manifest를 읽어 installable agent 집합을 계산
  2. prompts/<name>.md를 읽음
  3. resolveAgentModel로 model을 결정
  4. composeRoleInstructions로 overlay와 metadata를 합성
  5. TOML을 생성해 ~/.codex/agents/<name>.toml에 설치
- 모델 해석 시퀀스:
  1. researcher면 gpt-5.4-mini로 고정
  2. executor나 frontier class면 frontier root model 사용
  3. fast는 spark default model 사용
  4. standard는 standard default 또는 override 사용

## 7. 오류 처리 및 복구
- prompt 파일 누락:
  - verbose 로그 후 해당 agent를 건너뛴다.
- canonical target 오류:
  - alias/merged agent가 canonical을 가지지 않으면 설치 차단
- 설정 생성 실패:
  - TOML 생성 실패 시 설치 전체를 중단하거나 해당 항목만 실패로 기록
- 설치 경로 충돌:
  - force=false이면 기존 파일을 덮어쓰지 않는다.

## 8. 보안/성능 고려
- 보안:
  - prompt frontmatter와 metadata는 분리되어야 한다.
  - install 대상은 카탈로그 정책과 canonical validation을 통과한 집합만 허용한다.
- 성능:
  - install 대상 집합을 선필터링해 불필요한 파일 I/O를 줄인다.
  - overlay 조립은 단일 패스 문자열 합성으로 유지한다.

## 9. 테스트 케이스 맵
- 단위:
  - model resolution 우선순위
  - posture/model overlay 적용
  - canonical target validation
- 통합:
  - installNativeAgentConfigs의 dryRun/force/verbose 경로
  - catalog-based installability filtering
- 회귀:
  - researcher mini model 고정 유지
  - alias/merged agent 설치 차단 정책 유지

## 10. 오픈 이슈
- AGENT_DEFINITIONS와 prompts 디렉터리의 동기화 검증 자동화가 필요하다.
- catalog status 변경과 설치 정책 갱신의 배포 주기를 정리할 필요가 있다.
- TOML 출력 포맷과 Codex CLI 호환성 버전을 별도 문서로 고정할 필요가 있다.
