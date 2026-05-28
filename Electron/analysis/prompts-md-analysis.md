# Prompts 카탈로그

> `prompts/` 폴더의 에이전트 프롬프트 목록표  
> 총 33개 역할 

---

## 목차

- [Prompts 카탈로그](#prompts-카탈로그)
  - [목차](#목차)
  - [계획·분석](#계획분석)
  - [구현·실행](#구현실행)
  - [코드 리뷰](#코드-리뷰)
  - [탐색·정보](#탐색정보)
  - [제품·전략](#제품전략)
  - [팀·오케스트레이션](#팀오케스트레이션)
  - [전문·지원](#전문지원)
  - [파일 목록 전체 (알파벳순)](#파일-목록-전체-알파벳순)
  - [빠른 선택 가이드](#빠른-선택-가이드)

---

## 계획·분석

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `analyst.md` | **Analyst (Metis)** | Pre-planning consultant for requirements analysis (THOROUGH) | 구현 전 요구사항 갭·검증 기준 누락·스코프 리스크 탐지. 읽기 전용. 상위 라우팅(planner→architect→critic) |
| `planner.md` | **Planner (Prometheus)** | Strategic planning consultant with interview workflow (THOROUGH) | 요청을 실행 가능한 작업 계획으로 변환. `.omx/plans/` 에만 출력. 코드 작성 금지 |
| `architect.md` | **Architect (Oracle)** | Strategic Architecture & Debugging Advisor (THOROUGH, READ-ONLY) | 파일 증거 기반 진단·분석·권장. 추측 금지. 읽기 전용. 가설→검증→권장 루프 |
| `critic.md` | **Critic** | Work plan review expert and critic (THOROUGH) | 작업 계획 실행 가능성 검토. OKAY / REJECT 판정. YAML 계획 형식 거부 |
| `researcher.md` | **Researcher (Librarian)** | External Documentation & Reference Researcher | 이미 선택된 기술의 외부 문서·레퍼런스 조사. URL 인용 필수. 의존성 비교는 `dependency-expert`로 라우팅 |

---

## 구현·실행

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `executor.md` | **Executor** | Autonomous deep executor for goal-oriented implementation (STANDARD) | 목표 지향 자율 실행. 완료까지 계속 진행. 최소 diff, 기존 패턴 준수, 완료 전 반드시 검증 |
| `build-fixer.md` | **Build Fixer** | Build and compilation error resolution specialist (minimal diffs) | 빌드 실패를 최소 변경으로 수정. 리팩토링·기능 추가 금지. 진행률 X/Y 추적 |
| `designer.md` | **Designer** | UI/UX Designer-Developer for stunning interfaces (STANDARD) | 시각적으로 뛰어난 프로덕션 UI 구현. 프레임워크 자동 감지. 기존 코드 패턴 준수 |
| `git-master.md` | **Git Master** | Git expert for atomic commits, rebasing, and history management | 원자 커밋·리베이스·히스토리 관리. 커밋 스타일 자동 감지(최근 30개 분석). 단독 실행(서브에이전트 금지) |

---

## 코드 리뷰

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `code-reviewer.md` | **Code Reviewer** | Expert code review specialist with severity-rated feedback | 스펙 준수·보안·품질·성능 심각도 등급 리뷰. CRITICAL/HIGH 이슈 있으면 승인 불가. 읽기 전용 |
| `quality-reviewer.md` | **Quality Reviewer** | Logic defects, maintainability, anti-patterns, SOLID principles | 로직 결함·안티패턴·SOLID 원칙 검토. 스타일·보안·성능 제외. CRITICAL/HIGH 집중 |
| `api-reviewer.md` | **API Reviewer** | API contracts, backward compatibility, versioning, error semantics | 공개 API 계약·하위 호환성·의미론적 버전 관리 검토. 내부 구현 세부사항 제외 |
| `performance-reviewer.md` | **Performance Reviewer** | Hotspots, algorithmic complexity, memory/latency tradeoffs | 알고리즘 복잡도·핫스팟·메모리·I/O 지연 분석. 수치화된 복잡도 필수("Slow"는 발견 사항 아님) |
| `security-reviewer.md` | **Security Reviewer** | Security vulnerability detection (OWASP Top 10, secrets, unsafe patterns) | OWASP Top 10·시크릿 탐지·입력 검증·인증 검토. 읽기 전용. 취약점 수정은 `executor`로 라우팅 |
| `style-reviewer.md` | **Style Reviewer** | Formatting, naming conventions, idioms, lint/style conventions | 포맷·명명 규칙·관용구·린트 준수. 설정 파일(.eslintrc 등) 먼저 읽기. 개인 선호가 아닌 프로젝트 규약 기준 |
| `code-simplifier.md` | **Code Simplifier** | Simplifies code for clarity, consistency, and maintainability | 기능 보존 전제로 코드 명확성·일관성 개선. ES 모듈, 명시적 반환 타입, TypeScript strict 패턴 준수 |

---

## 탐색·정보

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `explore.md` | **Explorer** | Codebase search specialist for finding files and code patterns | 리포지토리 파일·심볼·패턴·관계 탐색. 읽기 전용. 외부 문서는 `researcher`로, 의존성 추천은 `dependency-expert`로 라우팅 |
| `explore-harness.md` | **OMX Explore** | Shell-only repository exploration contract for `omx explore` | 저비용 셸 전용 리포지토리 탐색 하네스. `omx explore` / `omx sparkshell` 백엔드 사용. 비셸 도구 없음 |
| `information-architect.md` | **Ariadne** | Information hierarchy, taxonomy, navigation models, naming consistency (STANDARD) | 정보 계층·분류·탐색 모델·명명 일관성 소유. 시각 디자인·구현·우선순위는 각 전담 에이전트로 위임 |

---

## 제품·전략

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `product-manager.md` | **Athena** | Problem framing, value hypothesis, prioritization, and PRD generation (STANDARD) | 문제 프레이밍·JTBD 분석·가치 가설·PRD 스켈레톤·KPI 트리. WHY와 WHAT 소유. HOW는 아님 |
| `product-analyst.md` | **Hermes** | Product metrics, event schemas, funnel analysis, experiment measurement design (STANDARD) | 제품 지표 정의·이벤트 스키마·A/B 테스트 사이징·계측 체크리스트. 데이터 파이프라인 구현은 아님 |
| `quality-strategist.md` | **Aegis** | Quality strategy, release readiness, risk assessment, and quality gates (STANDARD) | 릴리스 품질 게이트·회귀 위험 모델·품질 KPI(플레이키율·이스케이프율·커버리지). 테스트 코드 작성은 `test-engineer`로 |
| `ux-researcher.md` | **Daedalus** | Usability research, heuristic audits, and user evidence synthesis (STANDARD) | 사용성 조사·휴리스틱 평가·접근성 이슈 프레이밍·인터뷰 가이드·증거 종합. 솔루션이 아닌 문제 소유 |

---

## 팀·오케스트레이션

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `team-orchestrator.md` | **Team Orchestrator** | Team orchestration mode (supervised, conservative staffing) | 리더-워커 구조의 감독 오케스트레이션. 보수적 스태핑·최소 팬아웃. 명시적 사용자 선택 역할 보존 |
| `team-executor.md` | **Team Executor** | Team execution specialist for supervised, conservative team delivery | 팀 실행 환경 내 워커. 리더 계획·태스크 경계 준수. 최소 변경 우선. 신선한 검증 없이 완료 선언 금지 |
| `sisyphus-lite.md` | **Sisyphus-lite** | Lightweight specialized worker behavior prompt for fast bounded work | 경량 워커 행동 프롬프트. 낮은 추론 오버헤드. 작거나 중간 크기의 범위 확정 작업에 최적. 과도한 계획·서술 금지 |

---

## 전문·지원

| 파일명 | 페르소나 | 설명 | 핵심 역할 |
|--------|----------|------|-----------|
| `debugger.md` | **Debugger** | Root-cause analysis, regression isolation, stack trace analysis | 근본 원인 분석·스택 트레이스 해석·재현 우선. 3회 실패 후 상위 에스컬레이션. 추측 금지 |
| `dependency-expert.md` | **Dependency Expert** | External SDK/API/Package Evaluator | 외부 패키지 도입 평가·버전 호환성·SDK 비교·마이그레이션 경로. URL 인용 필수. 내부 코드 분석 제외 |
| `test-engineer.md` | **Test Engineer** | Test strategy, integration/e2e coverage, flaky test hardening, TDD | 테스트 전략·단위/통합/e2e 작성·플레이키 테스트 강화·TDD. 각 테스트는 단일 동작만 검증 |
| `qa-tester.md` | **QA Tester** | Interactive CLI testing specialist using tmux for session management | tmux 세션 기반 서비스 실행·인터랙티브 CLI 테스트. 세션 이름 `qa-{service}-{test}-{ts}`. 테스트 후 항상 정리 |
| `verifier.md` | **Verifier** | Completion evidence and verification specialist (STANDARD) | 완료 주장을 PASS/FAIL/PARTIAL로 판정. 코드·diff·커맨드 출력·테스트 직접 검증. 증거 없음 = 갭 |
| `vision.md` | **Vision** | Visual/media file analyzer for images, PDFs, and diagrams | 이미지·PDF·다이어그램 등 시각 콘텐츠 분석 및 정보 추출. 읽기 전용. 출력은 리더에게 직접 전달 |
| `writer.md` | **Writer** | Technical documentation writer for README, API docs, and comments | README·API 문서·아키텍처 문서·코드 주석 작성. 코드 예시 반드시 검증. 능동형·직접적 언어 사용 |

---

## 파일 목록 전체 (알파벳순)

| # | 파일명 | 한국어 버전 | 카테고리 |
|---|--------|-------------|----------|
| 1 | `analyst.md` | `analyst-ko.md` | 계획·분석 |
| 2 | `api-reviewer.md` | `api-reviewer-ko.md` | 코드 리뷰 |
| 3 | `architect.md` | `architect-ko.md` | 계획·분석 |
| 4 | `build-fixer.md` | `build-fixer-ko.md` | 구현·실행 |
| 5 | `code-reviewer.md` | `code-reviewer-ko.md` | 코드 리뷰 |
| 6 | `code-simplifier.md` | `code-simplifier-ko.md` | 코드 리뷰 |
| 7 | `critic.md` | `critic-ko.md` | 계획·분석 |
| 8 | `debugger.md` | `debugger-ko.md` | 전문·지원 |
| 9 | `dependency-expert.md` | `dependency-expert-ko.md` | 전문·지원 |
| 10 | `designer.md` | `designer-ko.md` | 구현·실행 |
| 11 | `executor.md` | `executor-ko.md` | 구현·실행 |
| 12 | `explore-harness.md` | `explore-harness-ko.md` | 탐색·정보 |
| 13 | `explore.md` | `explore-ko.md` | 탐색·정보 |
| 14 | `git-master.md` | `git-master-ko.md` | 구현·실행 |
| 15 | `information-architect.md` | `information-architect-ko.md` | 탐색·정보 |
| 16 | `performance-reviewer.md` | `performance-reviewer-ko.md` | 코드 리뷰 |
| 17 | `planner.md` | `planner-ko.md` | 계획·분석 |
| 18 | `product-analyst.md` | `product-analyst-ko.md` | 제품·전략 |
| 19 | `product-manager.md` | `product-manager-ko.md` | 제품·전략 |
| 20 | `qa-tester.md` | `qa-tester-ko.md` | 전문·지원 |
| 21 | `quality-reviewer.md` | `quality-reviewer-ko.md` | 코드 리뷰 |
| 22 | `quality-strategist.md` | `quality-strategist-ko.md` | 제품·전략 |
| 23 | `researcher.md` | `researcher-ko.md` | 계획·분석 |
| 24 | `security-reviewer.md` | `security-reviewer-ko.md` | 코드 리뷰 |
| 25 | `sisyphus-lite.md` | `sisyphus-lite-ko.md` | 팀·오케스트레이션 |
| 26 | `style-reviewer.md` | `style-reviewer-ko.md` | 코드 리뷰 |
| 27 | `team-executor.md` | `team-executor-ko.md` | 팀·오케스트레이션 |
| 28 | `team-orchestrator.md` | `team-orchestrator-ko.md` | 팀·오케스트레이션 |
| 29 | `test-engineer.md` | `test-engineer-ko.md` | 전문·지원 |
| 30 | `ux-researcher.md` | `ux-researcher-ko.md` | 제품·전략 |
| 31 | `verifier.md` | `verifier-ko.md` | 전문·지원 |
| 32 | `vision.md` | `vision-ko.md` | 전문·지원 |
| 33 | `writer.md` | `writer-ko.md` | 전문·지원 |

---

## 빠른 선택 가이드

| 상황 | 추천 에이전트 |
|------|--------------|
| 요구사항이 불명확하다 | `analyst` |
| 작업 계획을 세워야 한다 | `planner` |
| 코드/아키텍처를 분석해야 한다 | `architect` |
| 계획이 실행 가능한지 검토한다 | `critic` |
| 외부 라이브러리 공식 문서를 조사한다 | `researcher` |
| 어떤 패키지를 써야 할지 결정한다 | `dependency-expert` |
| 실제 코드를 구현한다 | `executor` |
| 빌드 에러를 빨리 고친다 | `build-fixer` |
| UI를 만든다 | `designer` |
| 커밋/히스토리를 정리한다 | `git-master` |
| 코드 품질·보안·스타일을 리뷰한다 | `code-reviewer` / `quality-reviewer` / `security-reviewer` / `style-reviewer` |
| API 계약을 검토한다 | `api-reviewer` |
| 성능 병목을 찾는다 | `performance-reviewer` |
| 파일·심볼을 검색한다 | `explore` |
| 버그 원인을 추적한다 | `debugger` |
| 테스트를 설계·작성한다 | `test-engineer` |
| 실제 앱을 실행해서 테스트한다 | `qa-tester` |
| 완료 여부를 증거로 검증한다 | `verifier` |
| 이미지·다이어그램을 분석한다 | `vision` |
| 문서를 작성한다 | `writer` |
| 제품 방향·PRD를 정한다 | `product-manager` |
| 지표·이벤트 스키마를 설계한다 | `product-analyst` |
| 릴리스 품질 전략을 수립한다 | `quality-strategist` |
| 사용성 조사·UX 증거를 수집한다 | `ux-researcher` |
| 여러 워커를 동시에 실행한다 | `team-orchestrator` + `team-executor` |
| 빠르고 단순한 단일 태스크 | `sisyphus-lite` |
