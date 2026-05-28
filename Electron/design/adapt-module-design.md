제공해주신 `adapt-module-analysis.md` 파일을 기반으로 Oh-My-Codex (OMX) 시스템의 `src/adapt/` 모듈(기억 및 컨텍스트 적응 엔진)에 대한 상세 설계 문서를 작성해 드립니다.

---

# Oh-My-Codex (OMX) `src/adapt/` 서브시스템 상세 설계 문서

**Subsystem: Memory and Context Adaptation Engine**

## 1. 문서 개요 및 목적

본 문서는 Oh-My-Codex (OMX) 시스템 내에서 에이전트가 프로젝트의 컨텍스트를 학습하고 사용자의 피드백을 기억하여 스스로 진화하도록 돕는 `src/adapt/` 모듈의 상세 아키텍처와 설계 내역을 정의합니다.

이 모듈은 단순한 코드 생성을 넘어, 시스템이 개발자의 의도와 프로젝트의 고유한 컨벤션에 "적응(Adaptation)"하도록 만드는 핵심 동력입니다.

---

## 2. 시스템 아키텍처 개요 (Architecture Overview)

`src/adapt/` 서브시스템은 인공지능 시스템의 **'해마(Hippocampus)'** 역할을 수행합니다.
개발자의 상호작용 기록, 프롬프트, 그리고 코드베이스의 변경 사항(diff)으로부터 유의미한 패턴을 추출하고, 이를 장기 기억(Long-term Memory)으로 통합하여 후속 작업 시 에이전트의 프롬프트에 동적으로 주입하는 **기억 및 컨텍스트 적응 엔진**입니다.

### 2.1 핵심 역할 (Core Responsibilities)

* **컨텍스트 학습**: 프로젝트의 기술 스택, 코딩 컨벤션, 암묵적인 아키텍처 규칙을 자동으로 추출하고 학습합니다.
* **피드백 반영 (Self-Evolution)**: 사용자의 교정 지시나 부정적 피드백(Negative feedback)을 제약 조건으로 변환하여 동일한 실수를 반복하지 않도록 합니다.
* **기억 최적화 (Memory Pruning)**: 제한된 토큰 환경을 고려하여 오래되거나 사용되지 않는 기억을 압축하고 소멸(Eviction)시킵니다.

---

## 3. 서브시스템별 상세 설계 (Component Detailed Design)

모듈 내 주요 TypeScript 파일들은 각각 독립적이면서도 유기적인 파이프라인을 형성합니다.

### 3.1 `project-memory.ts` (코어 메모리 매니저)

* **개념 및 목적**: 프로젝트의 장기 기억을 총괄하는 중앙 관리자 모듈입니다.
* **설계 및 역할**: 사용자 프롬프트에서 추출된 기술 스택과 규칙들을 병합하여 물리적인 상태 파일인 `.omx/project-memory.json`에 기록하고 관리하는 I/O 및 병합 로직을 담당합니다.

### 3.2 `rule-extractor.ts` (규칙 추출기)

* **개념 및 목적**: 정형화되지 않은 자연어와 코드로부터 프로젝트의 규칙을 식별합니다.
* **설계 및 역할**: 사용자 프롬프트 텍스트 및 코드 변경 사항(diff)을 분석하여 암묵적인 코딩 컨벤션(Implicit conventions)과 아키텍처 선호도(Architectural preferences)를 도출해 냅니다.

### 3.3 `tech-stack-detector.ts` (기술 스택 감지기)

* **개념 및 목적**: 코드베이스 환경을 스캔하여 사용 중인 기술을 식별합니다.
* **설계 및 역할**: `package.json` 파일의 의존성 목록이나 소스 코드 내부의 `import` 구문을 분석하여 현재 프로젝트가 채택한 프론트엔드/백엔드 기술 스택을 자동으로 감지합니다.

### 3.4 `feedback-loop.ts` (피드백 통합기)

* **개념 및 목적**: 에이전트의 행동을 교정하는 자가 학습(Self-learning) 루프 모듈입니다.
* **설계 및 역할**: 사용자로부터 입력된 교정 지시(예: "don't use var", "always use functional components")를 수집하고, 이를 시스템이 준수해야 할 부정적 제약 조건(Negative constraints)으로 변환하여 메모리에 각인시킵니다.

### 3.5 `context-optimizer.ts` (컨텍스트 최적화기)

* **개념 및 목적**: 에이전트에 전달되는 컨텍스트의 토큰 효율성을 극대화합니다.
* **설계 및 역할**: 누적된 메모리 데이터 중 우선순위가 떨어지거나 기간이 오래된(Outdated) 컨텍스트를 소멸(Eviction)시키고 텍스트를 압축하여 LLM 토큰 사용량을 제어합니다.

---

## 4. 데이터 모델 설계 (Data Model Design)

시스템의 학습 내용은 JSON 형태의 장기 기억 저장소인 **`.omx/project-memory.json`** 파일에 구조화되어 저장됩니다.

### 4.1 스키마 구조 (`project-memory.json`)

해당 파일은 다음과 같은 핵심 객체들로 구성됩니다:

* **`tech_stack`**: `tech-stack-detector.ts`가 식별한 프로젝트 사용 언어, 프레임워크, 라이브러리 목록.
* **`coding_rules`**: `rule-extractor.ts`가 도출해 낸 프로젝트 특화 코딩 스타일 및 아키텍처 규칙.
* **`user_preferences`**: 사용자가 명시적으로 선호도를 보인 개발 패턴 및 요구사항.
* **`negative_constraints`**: `feedback-loop.ts`를 통해 수집된 '절대 수행해서는 안 되는' 금지 항목 및 안티 패턴 목록.

---

## 5. 학습 워크플로우 및 파이프라인 (Workflow & Pipeline)

기억의 추출부터 저장 및 최적화에 이르는 전체 데이터 파이프라인은 5단계로 진행됩니다.

1. **이벤트 트리거 (Event Trigger)**: 에이전트의 한 턴(turn)이 완료(`turn-complete` 이벤트 등)되는 시점에 파이프라인이 기동됩니다.
2. **특징 추출 (Feature Extraction)**: 규칙 추출기와 기술 스택 감지기가 활성화되어 프롬프트 및 코드베이스에서 새로운 규칙과 기술 스택을 스캔합니다.
3. **피드백 통합 (Feedback Integration)**: 사용자가 에이전트에게 내린 교정 및 지시 사항을 제약 조건 형태로 파싱하여 수집합니다.
4. **기억 병합 (Memory Consolidation)**: 새로 추출된 정보들을 기존 `.omx/project-memory.json` 내용과 병합(Merge)하며, 중복 데이터를 제거(Deduplicating)하여 정합성을 유지합니다.
5. **컨텍스트 가지치기 (Context Pruning)**: 컨텍스트 최적화기가 개입하여 오래되거나 사용 빈도가 낮은 데이터를 삭제(Stale data removal)하여 파일 크기를 최적화합니다.

---

## 6. 제약 사항 및 운영 임계값 (Constraints & Thresholds)

토큰의 과다 사용을 막고 시스템 성능을 유지하기 위해, `src/adapt/` 모듈은 다음과 같은 임계값을 강제합니다.

| 설정 항목 | 임계값 / 정책 | 설명 |
| --- | --- | --- |
| **최대 규칙 개수 (Max Rules)** | **50개** | 메모리에 보존할 수 있는 코딩 규칙 및 제약 조건의 최대 허용 개수. |
| **기억 수명 (Context Eviction TTL)** | **30일** | 한 번도 갱신되거나 참조되지 않은 기억이 유지되는 최대 기간(이후 자동 소멸). |
| **옵티마이저 토큰 제한 (Max Token Limit)** | **2,000 Tokens** | `context-optimizer.ts`가 압축 및 생성해 내는 최종 메모리 텍스트의 최대 토큰 허용량. |