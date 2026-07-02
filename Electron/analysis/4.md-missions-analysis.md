# missions 모듈 분석 — 기능 정의 및 상세 역할

> 대상 경로: `한글해석본/missions/`  
> 분석 기준일: 2026-05-28  
> 각 미션 디렉토리는 `mission-ko.md`(목표·범위)와 `sandbox-ko.md`(평가자 계약·운영 규칙) 두 파일로 구성된다.

---

## 개요: missions 폴더의 역할

`missions/`는 OMX(oh-my-codex) 프레임워크의 **자동 연구(autoresearch) 파일럿** 번들이다.  
각 미션은 `omx autoresearch <mission-dir>` 명령으로 실행되며, AI 에이전트가 자율적으로:

1. 코드를 수정(후보 생성)
2. 평가자 스크립트로 점수 측정
3. 유지(keep) / 폐기(discard) / 중단(stop) 결정

하는 **감독자-에이전트 자동 루프**를 구동한다.

---

## 미션 분류 체계

| 카테고리 | 미션 수 | 설명 |
|---|---|---|
| **알고리즘 최적화** | 4개 | playground 내 수치 최적화·ML 성능 향상 |
| **OMX 런타임 인프라** | 6개 | autoresearch 루프 자체의 계약·안정성·패리티 확보 |
| **CLI / 사용성** | 2개 | CLI 도움말 품질 및 검색 가능성 개선 |
| **보안** | 1개 | 경로 순회 취약점 방어 강화 |

---

## 카테고리 1: 알고리즘 최적화 (Algorithm Optimization)

이 그룹은 `playground/` 하위의 벤치마크 코드에 대해 에이전트가 성능 지표를  
**자율적으로 향상**시키는 미션이다. 평가자 정책은 `keep_policy: 점수_개선`.

---

### 1.1 adaptive-sort-optimization — 적응형 정렬 전략 최적화

| 항목 | 내용 |
|---|---|
| **목적** | 여러 결정론적 입력 분포에서 가중 비용 점수를 최소화하는 정렬 전략 탐색 |
| **대상 파일** | `playground/adaptive_sort_demo/config.json`, `sort_benchmark.py` |
| **평가자** | `python3 scripts/eval-adaptive-sort-optimization.py` |
| **성공 기준** | 가중 비용 점수 개선 + 전 벤치마크 정확성 유지 + 결정론적 경량 전략 |

**상세 역할:**
- 하이브리드 정렬 디스패치 로직과 임계값 코디네이션을 수정하여 혼합 데이터 분포 전반에서 비용을 낮춘다.
- 새 종속성 추가 금지, 벤치마크 케이스 변조 금지 등 **알고리즘 엔지니어링 범위 제한** 규칙을 샌드박스가 강제한다.
- 에이전트는 임계값 튜닝·경량 휴리스틱 교체 등의 변경만 허용된다.

---

### 1.2 ml-kaggle-model-optimization — ML 모델 최적화

| 항목 | 내용 |
|---|---|
| **목적** | 고정 결정론적 검증 분할에서 Kaggle 스타일 분류기의 ROC AUC 향상 |
| **대상 파일** | `playground/ml_kaggle_demo/config.json`, `model_factory.py`, `train.py` |
| **평가자** | `python3 scripts/eval-ml-kaggle-model-optimization.py` |
| **성공 기준** | ROC AUC 개선 + 결정론적·재현 가능 솔루션 |

**상세 역할:**
- 모델 선택, 하이퍼파라미터, 경량 전처리 변경만 허용한다.
- Kaggle 스타일 **아키텍처 탐색 루프**처럼 동작: 현재 기준선 검사 → 구체적 개선 시도 → 평가자 검증 → 후보/noop 기록.
- 새 Python 종속성 추가 및 평가자 수정 금지.

---

### 1.3 noisy-bayesopt-highdim — 고차원 잡음 베이즈 최적화

| 항목 | 내용 |
|---|---|
| **목적** | 소수의 유익한 차원과 많은 무관 차원이 혼재하는 잡음 블랙박스에서 고정 평가 예산 내 최적값 탐색 |
| **대상 파일** | `playground/bayesopt_highdim_demo/config.json`, `optimizer.py`, `run_search.py`, `problem.py` |
| **평가자** | `python3 scripts/eval-noisy-bayesopt-highdim.py` |
| **성공 기준** | 유지 기준 점수 초과 + 결정론적·예산 준수 + 차원의 저주 대응 |

**상세 역할:**
- 검색 전략, 획득(acquisition) 로직, 활성 차원 선별 로직을 개선한다.
- 탐색·활용·차원 처리 간의 **실제 연구 균형** 문제를 다룬다.
- 평가 예산을 단순히 늘리는 방식으로 점수를 올리는 것을 명시적으로 금지한다.

---

### 1.4 noisy-latent-subspace-discovery — 잠재 부분공간 발견

| 항목 | 내용 |
|---|---|
| **목적** | 유용한 구조가 명시적 좌표가 아닌 잠재 혼합 방향으로 숨겨진 블랙박스 최적화 |
| **대상 파일** | `playground/bayesopt_latent_discovery_demo/config.json`, `optimizer.py`, `run_search.py`, `problem.py` |
| **평가자** | `python3 scripts/eval-noisy-latent-subspace-discovery.py` |
| **성공 기준** | 유지 기준 점수 초과 + 결정론적 + 잠재 구조 활용 |

**상세 역할:**
- 1.3(고차원)보다 **더 어려운 변종**: 유익한 차원이 명확히 드러나지 않고 잠재 부분공간에 숨어 있다.
- 스크리닝·구조 발견 로직을 통해 잠재 좌표 또는 부분공간을 유한 예산 내에서 발견해야 한다.
- 새 Python 종속성 추가 및 예산 증가를 통한 우회 금지.

---

## 카테고리 2: OMX 런타임 인프라 (Runtime Infrastructure)

이 그룹은 `omx autoresearch` 런타임 자체의 **계약·안정성·패리티**를 확보하는 미션이다.  
에이전트가 OMX 시스템 코드를 수정하여 자기 개선(self-improvement)을 수행하는 구조다.

---

### 2.1 candidate-handoff — 후보 핸드오프 계약 구현

| 항목 | 내용 |
|---|---|
| **목적** | 자동 연구 사이클에서 `candidate.json` 아티팩트의 핸드오프 계약 구현·검증 |
| **대상 파일** | repo-root `candidate.json`, 감독자 결정 진입점 |
| **평가자** | `node scripts/eval-candidate-handoff.js` |
| **성공 기준** | 후보 아티팩트 명시적·테스트 가능 + keep/noop/stop/abort 상태 구분 + 패리티 테스트 통과 |

**상세 역할:**
- 런타임이 각 자동 연구 실행(run)에서 생성하는 `candidate.json` 파일의 구조와 수명주기를 확정한다.
- 감독자(supervisor)가 유지·폐기·재설정·중단을 결정하는 **진입점 계약**을 명시적으로 테스트한다.
- 관련 없는 문서 정리로의 범위 확장 금지.

---

### 2.2 fresh-run-tagging — 새 실행 태그 생성 보장

| 항목 | 내용 |
|---|---|
| **목적** | 새로운 autoresearch 실행이 항상 고유한 실행 ID와 별도의 브랜치·작업트리 경로를 생성하도록 보장 |
| **대상 파일** | 자동 연구 작업트리 계획 및 관련 테스트 |
| **평가자** | `node scripts/eval-fresh-run-tagged.js` |
| **성공 기준** | 새 실행마다 고유 실행 ID 생성 + 이전 clean worktree 자동 재사용 불가 확인 |

**상세 역할:**
- 이전 실행의 clean worktree가 새 실행에서 의도치 않게 재사용되는 버그를 방지한다.
- 재개(resume) 의미론에 영향을 주지 않는 범위 내에서 파트 명명 계약만 수정한다.
- 관련 도움말/계약의 일관성 유지 포함.

---

### 2.3 in-action-cat-shellout-demo — cat 쉘아웃 제거

| 항목 | 내용 |
|---|---|
| **목적** | `runAutoresearchLoop()` 내부에서 매니페스트/실행 ID 읽기에 사용되던 불필요한 `cat` 쉘아웃 제거 |
| **대상 파일** | `src/cli/autoresearch.ts`, 관련 테스트 |
| **평가자** | `node scripts/eval-in-action-cat-shellout-demo.js` |
| **성공 기준** | `cat` 쉘아웃 제거 + 자동 연구 CLI/런타임 테스트 통과 + 작고 행동 보존적인 변경 |

**상세 역할:**
- OMX 자동 연구 자체를 자동 연구로 최적화하는 **자기 참조적(self-referential) 데모** 미션이다.
- README에서 `omx autoresearch missions/in-action-cat-shellout-demo`를 엔드투엔드 실행 예제로 사용.
- 관련 없는 리팩터링 금지, 미션/런타임 계약 변경 금지.

---

### 2.4 parity-smoke — 패리티 연기 테스트

| 항목 | 내용 |
|---|---|
| **목적** | 전체 패리티 스윕 없이도 핵심 autoresearch 계약이 여전히 유지되는지 빠르게 확인 |
| **대상 파일** | 자동 연구 런타임·계약 관련 연기 테스트 |
| **평가자** | `node scripts/eval-parity-smoke.js` |
| **성공 기준** | 프로젝트 빌드 성공 + 연기 테스트 통과 + CLI 도움말 라우팅 정상 |

**상세 역할:**
- 전체 패리티 스윕(2.5)보다 **경량·빠른** 검증 단계로, 빠른 회귀 감지용.
- 연기 경로 복원에 필요한 최소한의 변경만 허용.
- CI 파이프라인에서 빠른 사전 검사(precheck) 역할을 한다.

---

### 2.5 parity-sweep — 전체 패리티 스윕

| 항목 | 내용 |
|---|---|
| **목적** | 한 번의 제한된 스윕으로 `omx autoresearch`를 승인된 전체 패리티 계획과 동기화 |
| **대상 파일** | `src/cli/autoresearch.ts`, `src/autoresearch/*`, `src/team/worktree.ts`, `src/modes/base.ts`, 관련 테스트/문서 |
| **평가자** | `node scripts/eval-parity-sweep.js` |
| **성공 기준** | 빌드 통과 + 패리티 테스트 통과 + docs/help/contracts 동기화 + 미구현 패리티 차단 항목 없음 |

**상세 역할:**
- 다음 8개 영역 전체를 한 번에 정렬: 새 실행 태그, `--resume` 동작, 활성 실행 포인터·잠금, 매니페스트 상태, `candidate.json` 핸드오프, 유지/폐기/오류 처리, 작업트리 로컬 런타임 파일 초기화, 문서/도움말/계약/테스트 정렬.
- 개별 미션(2.1~2.4)이 조각별로 다루는 것을 **종합 통합 검증**하는 미션.

---

### 2.6 resume-dirty-guard — 더티 워크트리 재개 보호

| 항목 | 내용 |
|---|---|
| **목적** | `omx autoresearch --resume <run-id>` 호출 시 참조 워크트리가 더럽혀진 경우 완전 실패 보장 |
| **대상 파일** | autoresearch CLI/런타임의 재개 유효성 검사 로직 |
| **평가자** | `node scripts/eval-resume-dirty-guard.js` |
| **성공 기준** | 더티 워크트리에서 재개 시 조치 가능 오류 발생 + 자동 초기화·비안전 계속 없음 + 재개 보호 테스트 통과 |

**상세 역할:**
- 더티 상태의 워크트리에서 재개 시 데이터 손실·상태 오염을 방지하는 **안전 가드레일** 역할.
- 전체 루프 동작으로 범위 확장 금지; 재개 유효성 검사와 관련 런타임 헬퍼·테스트만 수정.

---

## 카테고리 3: CLI / 사용성 (CLI Usability)

이 그룹은 CLI의 도움말 텍스트 품질과 명령 검색 가능성을 개선하는 미션이다.

---

### 3.1 cli-discoverability-pilot — CLI 검색 가능성 강화

| 항목 | 내용 |
|---|---|
| **목적** | OMX CLI 전반의 명령 검색 가능성 향상 (최상위 도움말·중첩 도움말 라우팅·sparkshell·세션 검색) |
| **대상 파일** | `README.md`, `src/cli/index.ts`, 관련 CLI 검색 가능성 테스트 4개 |
| **평가자** | `node scripts/eval-cli-discoverability.js` |
| **성공 기준** | 기존 명령 라우팅 의미론 유지 + 도움말 명확성 향상 + 타겟 CLI 검색 가능성 테스트 통과 |

**상세 역할:**
- 도움말 텍스트만으로 올바른 CLI 표면을 찾으려는 운영자의 성공률을 최소 변경으로 향상한다.
- 소규모 도움말 텍스트·라우팅 명확성 개선만 허용; 명령 동작 재설계 금지.
- `score`는 통과한 타겟 검사 비율(0.0~1.0).

---

### 3.2 help-consistency — 도움말 일관성 수정

| 항목 | 내용 |
|---|---|
| **목적** | CLI 도움말 텍스트·호환성 고정장치(fixtures)·테스트가 모두 `omx autoresearch` 단어를 일관되게 기술하도록 수정 |
| **대상 파일** | `src/cli/__tests__/session-search-help.test.ts`, `src/cli/index.ts`, `src/compat/fixtures/help.stdout.txt` |
| **평가자** | `node scripts/eval-help-consistency.js` |
| **성공 기준** | 세션 검색 도움말 테스트 통과 + `omx autoresearch` 문구 소스·내장 출력·고정장치 간 일관성 + 관련 없는 CLI 행동 회귀 없음 |

**상세 역할:**
- 특정 도움말 일관성 회귀(regression)를 수정하는 **좁은 범위** 미션.
- 런타임 동작·작업트리·자동 연구 루프 변경 금지.
- 도움말 텍스트·고정장치·도움말 출력을 검증하는 테스트만 수정 허용.

---

## 카테고리 4: 보안 (Security)

### 4.1 security-path-traversal-pilot — 경로 순회 보안 강화

| 항목 | 내용 |
|---|---|
| **목적** | MCP/상태 지향 표면 주변의 경로 검증 및 순회 방어 강화 |
| **대상 파일** | `src/mcp/__tests__/path-traversal.test.ts`, `src/mcp/__tests__/state-paths.test.ts`, 인접 MCP/상태 유효성 검사 코드 |
| **평가자** | `node scripts/eval-security-path-traversal.js` |
| **성공 기준** | 기존 허용 경로 동작 유지 + 순회 거부 강화 + MCP 경로 안전성 테스트 통과 |

**상세 역할:**
- 안전하지 않은 경로·순회 시도가 **조치 가능한 오류**와 함께 결정론적으로 거부되도록 경계 검사를 강화한다.
- 광범위한 리팩터링보다 경계 확인·검증 강화를 선호한다.
- 기존 가드레일을 약화시켜서 테스트를 통과하는 방식 명시적 금지.
- 의도적으로 지원되지 않는 경로 패턴을 문서화해야 한다.

---

## 파일 구조 요약

```
missions/
├── README-ko.md                        ← 파일럿 전체 설명 및 실행 방법
│
├── [알고리즘 최적화]
│   ├── adaptive-sort-optimization/     ← 정렬 전략 최적화 (Python, 점수 개선)
│   ├── ml-kaggle-model-optimization/   ← ML 분류기 ROC AUC 향상 (Python, 점수 개선)
│   ├── noisy-bayesopt-highdim/         ← 고차원 베이즈 최적화 (Python, 점수 개선)
│   └── noisy-latent-subspace-discovery/← 잠재 부분공간 발견 (Python, 점수 개선)
│
├── [OMX 런타임 인프라]
│   ├── candidate-handoff/              ← candidate.json 계약 (Node.js, pass_only)
│   ├── fresh-run-tagging/              ← 새 실행 ID 생성 보장 (Node.js, pass_only)
│   ├── in-action-cat-shellout-demo/    ← cat 쉘아웃 제거 자체 최적화 (Node.js, pass_only)
│   ├── parity-smoke/                   ← 경량 패리티 연기 테스트 (Node.js, pass_only)
│   ├── parity-sweep/                   ← 전체 패리티 스윕 통합 (Node.js)
│   └── resume-dirty-guard/             ← 더티 워크트리 재개 보호 (Node.js, pass_only)
│
├── [CLI / 사용성]
│   ├── cli-discoverability-pilot/      ← CLI 검색 가능성 향상 (Node.js, 점수 개선)
│   └── help-consistency/               ← 도움말 일관성 수정 (Node.js, pass_only)
│
└── [보안]
    └── security-path-traversal-pilot/  ← 경로 순회 방어 강화 (Node.js, 점수 개선)
```

---

## sandbox-ko.md 공통 구조 패턴

모든 미션의 `sandbox-ko.md`는 YAML 프론트매터 + 산문 규칙으로 구성된다.

```yaml
---
평가자:
  명령: <평가자 실행 명령>
  형식: JSON
  keep_policy: <pass_only | 점수_개선>
---
```

| `keep_policy` 값 | 의미 | 사용 미션 |
|---|---|---|
| `pass_only` | 테스트 통과 여부만 평가 | candidate-handoff, fresh-run-tagging, in-action-cat-shellout-demo, parity-smoke, resume-dirty-guard, help-consistency |
| `점수_개선` | 이전 기준 대비 점수 향상 필요 | adaptive-sort-optimization, ml-kaggle-model-optimization, noisy-bayesopt-highdim, noisy-latent-subspace-discovery, cli-discoverability-pilot, security-path-traversal-pilot |

---

## autoresearch 루프 실행 흐름

```
omx autoresearch <mission-dir>
        │
        ▼
  mission.md 로드 (목표·범위 파악)
        │
        ▼
  sandbox.md 로드 (평가자 명령·keep_policy·허용/금지 규칙 파악)
        │
        ▼
  에이전트: 코드 수정 (후보 생성)
        │
        ▼
  평가자 실행 → JSON 결과 수신
        │
    keep_policy 검사
       / \
   통과  실패
    │      │
 candidate.json  폐기(discard)
 핸드오프         다음 후보 시도
    │
 감독자 결정:
 유지(keep) / 폐기 / 중단(stop) / 중단됨(aborted)
```

결과 아티팩트는 `.omx/logs/autoresearch/<run-id>/` 하위에 저장된다:
- `manifest.json` — 실행 메타데이터
- `candidate.json` — 후보 코드 변경 요약
- `iteration-ledger.json` — 반복별 감독자 결정 기록
