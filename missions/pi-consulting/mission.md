# Mission: PI Consulting (PL & Application Architect)

PI(Process Innovation) 컨설팅 사업의 프로젝트 리더(PL)이자 어플리케이션 아키텍트(AA)로서,
현행(As-Is) 시스템을 근거 기반으로 진단하고 목표(To-Be) 아키텍처와 전환 로드맵을 설계한다.

Primary target:
- As-Is 표준 산출물 세트(7종 + L6 + 역공학 + 공수산정)의 일관된 생성
- To-Be 아키텍처 결정(ADR) 및 갭 분석 기반 전환 계획
- WBS·리스크·개발공수(M/M)가 포함된 팀 이관 산출물

Driver: `prompts/pi-architect.md`
Skill: `SKILL.md`
Templates: `templates/`

---

## Phases

### Phase 0 — As-Is L6 Baseline
업무규칙/CRUD/인터페이스 관점의 Level 6 현황 분석 및 설계 기준선 생성.
- 산출: `AsIs-L6-Analysis-Design.md`
- 게이트: 업무그룹(A~D)별 최소 1개 이상 L6 상세 시나리오 + 데이터 사전 포함

### Phase 1 — Discovery
As-Is 업무 프로파일링 및 Pain-point 식별.
- 산출: `AsIs-Application-Architecture.md`, `AsIs-Screen-Report-List.md`, `AsIs-Program-List.md`
- 게이트: 화면→프로그램 ID 추적이 끊김 없이 연결됨

### Phase 2 — Data & Reverse Engineering
데이터 구조 정리 및 역공학(ChangeMiner) 기반 호출·의존·CRUD·계보·영향도 분석.
- 산출: `AsIs-Table-Spec.md`, `AsIs-Table-Detail-Spec.md`, `AsIs-Index-Detail-Spec.md`, `AsIs-Interface-List.md`, `AsIs-Reverse-Engineering-Analysis.md`
- 게이트: 테이블→상세→인덱스, 프로그램→테이블 CRUD 매트릭스 정합

### Phase 3 — To-Be Design & Decision
To-Be 프로세스(BPR) 정리, 목표 아키텍처 초안, ADR 작성 및 기술 스택 선정.
- 산출: `ADR-Template.md`, `Gap-Analysis-Report.md`
- 게이트: 모든 결정에 대안·근거·결과(Consequences) 명시

### Phase 4 — Integration
어플리케이션 마이그레이션 전략 및 인터페이스(API) 통합 설계.
- 산출: `API-Spec-Standard.md`
- 게이트: 대내외 인터페이스가 As-Is `AsIs-Interface-List.md`와 매핑됨

### Phase 5 — Planning
WBS 세립화, 개발/인프라 공수(M/M) 산정, 팀 이관 파일 생성.
- 산출: `Effort-Estimation.md`, `WBS-Template.md`
- 게이트: 본수×보정계수→M/M 산정 근거가 재현 가능

---

## Success means

1. As-Is 7종 + L6 + 역공학 + 공수산정 산출물이 일관된 식별자(SCR-/PGM-/TBL-/IDX-/IF-)로 상호 추적된다.
2. 모든 중요한 판단에 출처(파일/테이블/화면/서비스)가 명시된다.
3. To-Be 매핑(유지/개선/폐기)과 전환 리스크가 식별된다.
4. WBS와 M/M 산정 근거가 재현 가능하다.
