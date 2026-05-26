# oh-my-codex-js docs/ 구조 분석 지도

이 문서는 `oh-my-codex-js`의 `docs/` 폴더 전체 구조와 각 문서의 개요를 정리한다.

소스 위치: `c:\Workspace\Isaki\oh-my-codex-js\docs\`

---

## 전체목차

- [oh-my-codex-js docs/ 구조 분석 지도](#oh-my-codex-js-docs-구조-분석-지도)
  - [전체목차](#전체목차)
  - [1. 전체개요](#1-전체개요)
    - [1.1 폴더 구조 트리](#11-폴더-구조-트리)
    - [1.2 하위 폴더 요약](#12-하위-폴더-요약)
  - [2. 루트 문서 개요](#2-루트-문서-개요)
    - [2.1 기능/명령 문서](#21-기능명령-문서)
    - [2.2 계약/스키마 문서](#22-계약스키마-문서)
    - [2.3 통합/연동 문서](#23-통합연동-문서)
    - [2.4 마이그레이션/변경 이력 문서](#24-마이그레이션변경-이력-문서)
    - [2.5 상태/런타임 문서](#25-상태런타임-문서)
    - [2.6 QA 문서](#26-qa-문서)
    - [2.7 릴리즈 문서](#27-릴리즈-문서)
  - [3. contracts/ 하위 문서 개요](#3-contracts-하위-문서-개요)
  - [4. issues/ 하위 문서 개요](#4-issues-하위-문서-개요)
  - [5. pipeline/ 하위 문서 개요](#5-pipeline-하위-문서-개요)
  - [6. prompt-guidance-fragments/ 하위 문서 개요](#6-prompt-guidance-fragments-하위-문서-개요)
  - [7. prs/ 하위 문서 개요](#7-prs-하위-문서-개요)
  - [8. qa/ 하위 문서 개요](#8-qa-하위-문서-개요)
  - [9. readme/ 하위 문서 개요](#9-readme-하위-문서-개요)
  - [10. reference/ 하위 문서 개요](#10-reference-하위-문서-개요)
  - [11. reports/ 하위 문서 개요](#11-reports-하위-문서-개요)
  - [12. shared/ 하위 문서 개요](#12-shared-하위-문서-개요)
  - [13. 기타 파일](#13-기타-파일)

---

## 1. 전체개요

### 1.1 폴더 구조 트리

```
docs/
├── benchmarks/                          # 벤치마크 이미지
├── contracts/                           # 런타임·팀·상태 계약 명세 (16종)
├── issues/                              # 개발 이슈 분석 문서 (6종)
├── pipeline/                            # 파이프라인 관련 문서 + templates/
│   └── templates/
│       ├── execution/
│       └── triage/
├── prompt-guidance-fragments/           # 역할별 프롬프트 가이던스 조각 (14종)
├── prs/                                 # PR 리뷰/준비도 문서 (2종)
├── qa/                                  # QA 보고서 및 릴리즈 준비도 (40종+)
├── readme/                              # 다국어 README (14개 언어 + 한국어 번역본)
├── reference/                           # 레퍼런스 문서 (5종)
├── reports/                             # 감사/분석 보고서 (2종)
├── shared/                              # 공유 에이전트 티어 + 캐릭터 이미지
├── *.md (영문 + ko 한국어 쌍)           # 루트 기능/계약/릴리즈 문서
├── *.html                               # 웹 문서 (agents, getting-started, skills 등)
└── *.svg / *.css / _config.yml          # 다이어그램, 스타일, Jekyll 설정
```

### 1.2 하위 폴더 요약

| 폴더 | 파일 수 (영문 기준) | 역할 |
|---|---|---|
| `benchmarks/` | 1개 (PNG) | 벤치마크 비교 이미지 |
| `contracts/` | 16종 (영문+한국어) | 런타임·팀·Ralph·상태 전이 계약 명세 |
| `issues/` | 6종 (영문+한국어) | 개발 이슈 분석·해결 문서 |
| `pipeline/` | 2종 + templates/ | GitHub PR 패키지 아이덴티티, 파이프라인 템플릿 |
| `prompt-guidance-fragments/` | 14종 (영문+한국어) | executor/planner/verifier 역할별 프롬프트 조각 |
| `prs/` | 2종 (영문+한국어) | PR 리뷰 및 개발 준비도 문서 |
| `qa/` | 40종+ (영문+한국어) | 릴리즈 준비도 체크, QA 보고서, 버그 회귀 |
| `readme/` | 14개 언어 (영문+한국어 번역본) | 다국어 README 아카이브 |
| `reference/` | 5종 (영문+한국어) | omx 설정 스키마, ralph 패리티, 팀 정책 등 레퍼런스 |
| `reports/` | 2종 (영문+한국어) | macOS M1 CPU 분석, PR 준비도 보고서 |
| `shared/` | 2종 (영문+한국어) + 이미지 | 에이전트 티어 문서, 캐릭터 이미지 |

---

## 2. 루트 문서 개요

> 모든 문서는 영문(`.md`)과 한국어(`.ko.md` 또는 `-ko.md`) 쌍으로 제공된다. 아래 표는 영문 기준 파일명으로 정리한다.

### 2.1 기능/명령 문서

| 파일명 | 개요 |
|---|---|
| `adapt.md` | `omx adapt` 명령 설명. 외부 대상(레포, 서비스, 계약)에 적응하는 워크플로우 진입점 |
| `autoresearch-goal.md` | `omx autoresearch-goal` 명령 설명. 연구 미션 계약·명령·아티팩트 구조 정의 |
| `performance-goal.md` | `omx performance-goal` 명령 설명. 성능 목표 설정·검증 흐름과 evaluator 연동 계약 |
| `ultragoal.md` | `omx ultragoal` 명령 설명. 다단계 목표 핸드오프, 요약 아티팩트, durable planning 흐름 |
| `wiki-feature.md` | `omx wiki` 기능 설명. repo wiki 영속성·검색·린트 기능 소개 |
| `troubleshooting.md` | 자주 발생하는 설치·실행 문제 해결 가이드 |

### 2.2 계약/스키마 문서

| 파일명 | 개요 |
|---|---|
| `clawhip-event-contract.md` | Clawhip 이벤트 계약. 라우팅 규칙, 봉투 구조, 정규화 이벤트, 소음/중복 제어 정의 |
| `codex-native-hooks.md` | Codex 네이티브 훅 매핑. 설치 인터페이스, 소유권 분할, 훅 종류별 매핑 매트릭스 |
| `guidance-schema.md` | AGENTS + team worker 인터페이스의 통합 지침 스키마. 필수/선택 섹션, 글로벌 호환성 계약 |
| `hooks-extension.md` | 훅 확장 계약. 커스텀 훅 등록 방법과 이벤트 바인딩 규칙 |
| `interop-team-mutation-contract.md` | 팀 뮤테이션 인터롭 계약. 팀 상태 변경 시 외부 모듈과의 인터페이스 규약 |
| `plugin-bundle-ssot.md` | 플러그인 번들 SSOT 계약. `src/catalog/`와 `plugins/oh-my-codex/` 미러 동기화 규칙 |
| `prompt-guidance-contract.md` | 프롬프트 가이던스 계약. `prompt-guidance-fragments/`와 런타임 주입 방식 명세 |

### 2.3 통합/연동 문서

| 파일명 | 개요 |
|---|---|
| `discord-integration.md` | Discord 통합 설정. 웹훅 URL vs 봇 토큰 선택 기준, 권한 설정, 설정 예시 |
| `openclaw-integration.md` | OpenClaw 통합 설명. OpenClaw 프레임워크와 oh-my-codex-js 연동 방법 |

### 2.4 마이그레이션/변경 이력 문서

| 파일명 | 개요 |
|---|---|
| `migration-mainline-post-v0.4.4.md` | v0.4.4 이후 메인라인 마이그레이션 가이드. 주요 API/계약 변경 사항 정리 |
| `prompt-migration-changelog.md` | 프롬프트 마이그레이션 변경 이력. 버전별 프롬프트 구조·네이밍 변경 추적 |
| `runtime-model-metadata-cleanup.md` | 런타임 모델 메타데이터 정리 작업 기록. 구버전 필드 제거 및 스키마 정합성 복구 |

### 2.5 상태/런타임 문서

| 파일명 | 개요 |
|---|---|
| `STATE_MODEL.md` | 전체 상태 모델 명세. skill-active / workflow transition / mode context 상태 머신 정의 |

### 2.6 QA 문서

| 파일명 | 개요 |
|---|---|
| `qa-plan-0.4.2.md` | v0.4.2 QA 계획. 테스트 범위, 담당 역할, 검증 항목 정의 |
| `qa-report-0.4.2.md` | v0.4.2 QA 보고서. 실행 결과, 발견된 이슈, 통과 기준 달성 여부 기록 |

### 2.7 릴리즈 문서

> `release-notes-{버전}.md` 및 `release-body-{버전}.md` 형식으로 버전별 릴리즈 정보를 제공한다.

| 파일명 패턴 | 버전 범위 | 개요 |
|---|---|---|
| `release-body-{버전}.md` | 0.9.0, 0.9.1 | GitHub Release 본문 형식의 릴리즈 설명 |
| `release-notes-{버전}.md` | 0.7.6 ~ 0.16.2 (30개 버전) | 버전별 변경 사항, 신규 기능, 버그 수정, 주요 계약 변경 요약 |

---

## 3. contracts/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `autoresearch-command-contract.md` | autoresearch 명령 계약. 입력 스펙, 상태 전이, 아티팩트 출력 규약 |
| `autoresearch-command-review.md` | autoresearch 명령 리뷰. 계약 구현 적합성 및 gap 분석 |
| `autoresearch-ux-deep-interview-review.md` | autoresearch UX deep-interview 리뷰. 사용자 경험 흐름 검토 |
| `explicit-terminal-stop-model.md` | 명시적 터미널 중지 모델. worker 프로세스의 종료 신호·타임아웃 계약 |
| `multi-state-transition-contract.md` | 다중 상태 전이 계약. 복합 상태 머신에서의 전이 규칙 및 충돌 해소 정책 |
| `multi-state-transition-review.md` | 다중 상태 전이 리뷰. 계약 구현 검증 및 edge case 분석 |
| `mux-operation-space.md` | mux 동작 공간 정의. tmux 세션 기반 멀티플렉서의 허용 연산 범위 |
| `ralph-cancel-contract.md` | ralph 취소 계약. ralph 실행 중 취소 신호 처리 및 상태 복구 규약 |
| `ralph-state-contract.md` | ralph 상태 계약. ralph 실행 생명주기의 상태 정의 및 전이 조건 |
| `repo-aware-team-dag-decomposition.md` | 레포 인식 팀 DAG 분해 계약. 레포 컨텍스트를 반영한 DAG 태스크 분배 규칙 |
| `runtime-authority-backlog-replay-readiness.md` | 런타임 권한·백로그 재생 준비도 계약. 장애 복구 시 재생 가능 상태 조건 |
| `runtime-command-event-snapshot-schema.md` | 런타임 명령 이벤트 스냅샷 스키마. 이벤트 직렬화 구조 및 버전 호환성 |
| `rust-runtime-thin-adapter-contract.md` | Rust 런타임 thin adapter 계약. TS↔Rust 경계 인터페이스 최소화 규약 |
| `team-delivery-state-contract.md` | 팀 딜리버리 상태 계약. 팀 태스크 완료·실패·재시도 상태 및 전이 조건 |
| `team-runtime-state-contract.md` | 팀 런타임 상태 계약. 팀 세션 생명주기 전체의 상태 머신 정의 |
| `team-startup-dispatch-latency.md` | 팀 시작·디스패치 지연 계약. 팀 부트스트랩 단계별 허용 지연 기준 |

---

## 4. issues/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `dev-ci-slowness-cleanup.md` | CI 속도 저하 원인 분석 및 정리 방안 |
| `dev-deprecate-team-ralph.md` | `team-ralph` 명령 deprecation 계획 및 대안 명령으로의 전환 가이드 |
| `dev-fix-ralph-live-pane-invariant.md` | ralph live pane invariant 버그 수정. 패인 상태 일관성 깨지는 조건 분석 |
| `dev-issue-715-team-brain-role-split.md` | 이슈 #715: team brain 역할 분리. brain/worker 역할 경계 재정의 논의 |
| `dev-team-ralph-workflow-positioning.md` | team-ralph 워크플로우 위치 재정의. 팀 실행 흐름 내 ralph의 역할 명확화 |
| `experimental-dev-omx-sparkshell.md` | sparkshell 실험적 개발 문서. Rust 네이티브 shell 하네스 실험 기록 |

---

## 5. pipeline/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `github-pr-package-identity.md` | GitHub PR 패키지 아이덴티티. PR 생성 시 패키지 버전·범위 일관성 보장 계약 |
| `templates/README.md` | 파이프라인 템플릿 디렉터리 구조 설명 |
| `templates/issue-package-identity.md` | 이슈 패키지 아이덴티티 템플릿. 이슈 생성 시 사용하는 표준 폼 |

---

## 6. prompt-guidance-fragments/ 하위 문서 개요

> 각 조각은 팀 런타임에서 역할별 AGENTS.md에 동적으로 주입된다. executor/planner/verifier 3축으로 분리된다.

| 파일명 | 역할 | 개요 |
|---|---|---|
| `core-operating-principles.md` | 공통 | 에이전트 공통 운영 원칙 (우선순위·절차·안전 기준) |
| `core-verification-and-sequencing.md` | 공통 | 검증 순서 및 단계 정합성 원칙 |
| `executor-constraints.md` | Executor | executor 역할의 실행 제약 조건 |
| `executor-output.md` | Executor | executor 출력 형식 및 보고 기준 |
| `executor-shared.md` | Executor | executor 공유 컨텍스트 (다른 조각과 병합) |
| `leader-specialist-routing.md` | Leader | leader↔specialist 역할 라우팅 규칙 |
| `planner-constraints.md` | Planner | planner 역할의 계획 제약 조건 |
| `planner-investigation.md` | Planner | planner 조사 단계 지침 |
| `planner-output.md` | Planner | planner 출력 형식 (계획서·태스크 분해 기준) |
| `planner-shared.md` | Planner | planner 공유 컨텍스트 |
| `verifier-constraints.md` | Verifier | verifier 역할의 검증 제약 조건 |
| `verifier-investigation.md` | Verifier | verifier 조사 단계 지침 |
| `verifier-shared.md` | Verifier | verifier 공유 컨텍스트 |

---

## 7. prs/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `open-prs-dev-readiness-2026-04-09.md` | 2026-04-09 기준 열린 PR 개발 준비도 평가. 각 PR의 병합 가능 여부 및 블로커 정리 |
| `macos-m1-high-cpu-usage-2026-04-16.md` | 2026-04-16 macOS M1 높은 CPU 사용 PR 분석. 원인 추적 및 수정 방향 |

---

## 8. qa/ 하위 문서 개요

> 버전별 릴리즈 준비도(`release-readiness-{버전}.md`)와 특수 QA 보고서로 구성된다.

| 파일명 패턴 | 버전/날짜 범위 | 개요 |
|---|---|---|
| `release-readiness-{버전}.md` | 0.8.1 ~ 0.16.2 (30개 버전) | 버전별 릴리즈 게이트 체크. 빌드·테스트·계약·회귀 통과 여부 기록 |
| `release-readiness-follow-up.md` | - | 릴리즈 준비도 후속 조치 목록 |
| `release-no-publish-0.15.0.md` | 0.15.0 | 비정상 릴리즈 방지 기록. 배포 중단 이유 및 조치 |
| `ci-speedups-after-prompt-worker-fix.md` | - | 프롬프트 워커 수정 후 CI 속도 개선 검증 |
| `deep-interview-phase-1-validation.md` | - | deep-interview 1단계 검증 보고서 |
| `explore-sparkshell-heavy-manual-stress.md` | - | sparkshell 수동 스트레스 테스트 기록 |
| `ralph-persistence-gate.md` | - | ralph 영속성 게이트 QA. 상태 파일 유지 조건 검증 |
| `recent-bug-regression-hardening-2026-04-11.md` | 2026-04-11 | 최근 버그 회귀 방지 하드닝 보고서 |
| `remaining-suite-drift-2026-03-19.md` | 2026-03-19 | 테스트 스위트 드리프트 잔여 항목 분석 |
| `research-specialist-eval-surface-2026-04-18.md` | 2026-04-18 | 연구 전문가 평가 인터페이스 QA |
| `runtime-team-seam-audit-2026-04-01.md` | 2026-04-01 | 런타임↔팀 경계 감사 보고서 |
| `rust-runtime-thin-adapter-gate.md` | - | Rust 런타임 thin adapter 게이트 QA |

---

## 9. readme/ 하위 문서 개요

> 루트 README.md의 다국어 번역본 아카이브. 모든 파일은 영문 원본과 `-ko.md` 한국어 번역본 쌍으로 제공된다.

| 파일명 | 언어 |
|---|---|
| `README.md` | 영어 (원본) |
| `README.de.md` | 독일어 |
| `README.el.md` | 그리스어 |
| `README.es.md` | 스페인어 |
| `README.fr.md` | 프랑스어 |
| `README.it.md` | 이탈리아어 |
| `README.ja.md` | 일본어 |
| `README.ko.md` | 한국어 |
| `README.pl.md` | 폴란드어 |
| `README.pt.md` | 포르투갈어 |
| `README.ru.md` | 러시아어 |
| `README.tr.md` | 터키어 |
| `README.uk.md` | 우크라이나어 |
| `README.vi.md` | 베트남어 |
| `README.zh.md` | 중국어 (간체) |
| `README.zh-TW.md` | 중국어 (번체) |

---

## 10. reference/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `omx-config-schema-routing.md` | omx 설정 스키마 라우팅. 설정 파일 필드별 우선순위·병합 규칙 |
| `project-wiki.md` | 프로젝트 위키 레퍼런스. wiki 기능의 저장·검색·lint 계약 |
| `ralph-parity-matrix.md` | ralph 패리티 매트릭스. ralph 명령과 상위 CLI 명령 간 기능 대응 표 |
| `ralph-upstream-baseline.md` | ralph upstream 기준선. upstream codex-cli 대비 ralph 기능 차이 기록 |
| `team-allocation-rebalance-policy.md` | 팀 할당 재균형 정책. worker 과부하 시 태스크 재분배 규칙 |

---

## 11. reports/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `macos-m1-high-cpu-usage-2026-04-16.md` | macOS M1 높은 CPU 사용 분석 보고서 (2026-04-16). 원인 프로파일링 및 수정 방향 |
| `open-prs-dev-readiness-2026-04-09.md` | 열린 PR 개발 준비도 보고서 (2026-04-09). 전체 PR 병합 가능성 평가 |

---

## 12. shared/ 하위 문서 개요

| 파일명 | 개요 |
|---|---|
| `agent-tiers.md` | 에이전트 티어 정의. leader/planner/executor/verifier/specialist 역할 계층 설명 |
| `omx-character-spark-initiative.jpg` | omx 캐릭터 'Spark' 이미지 (이니셔티브 아트) |

---

## 13. 기타 파일

| 파일명 | 형식 | 개요 |
|---|---|---|
| `ai-isaki-tool-execution.svg` | SVG | MCP 도구 선택 및 실행 알고리즘 다이어그램 |
| `ai-isaki-logical-deployment.svg` | SVG | MCP 논리 배치 아키텍처 다이어그램 |
| `ai-logical-code-deployment.svg` | SVG | MCP 코드 배치 아키텍처 다이어그램 |
| `agents.html` / `agents-ko.html` | HTML | 에이전트 목록 웹 문서 |
| `getting-started.html` / `getting-started-ko.html` | HTML | 시작 가이드 웹 문서 |
| `index.html` / `index-ko.html` | HTML | docs 웹 인덱스 |
| `integrations.html` / `integrations-ko.html` | HTML | 통합 연동 웹 문서 |
| `skills.html` / `skills-ko.html` | HTML | 스킬 목록 웹 문서 |
| `style.css` | CSS | docs 웹 스타일시트 |
| `_config.yml` | YAML | Jekyll 정적 사이트 설정 |
| `benchmarks/tetris-benchmark-comparison-20260306.png` | PNG | Tetris 벤치마크 비교 이미지 (2026-03-06) |
