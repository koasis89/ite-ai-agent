# ADR-NNN: [결정 제목]

> 📝 **작성 양식(필수): `ADR-Template_표준양식.docx`**
> 이 문서는 형식·구조 설명서이다. **실제 산출물은 반드시 같은 폴더의 워드 양식 파일 `ADR-Template_표준양식.docx`을 열어 작성한다.**
> 아키텍처 결정문은 서술 중심이므로 워드로 작성한다.
> 아래 표는 채울 항목과 예시를 보여주기 위한 참조이며, 데이터 입력은 워드 양식에서 수행한다.


> Architecture Decision Record — 아키텍처 결정의 배경·대안·근거·결과를 기록한다.
> As-Is/To-Be 산출물 식별자(PGM-/TBL-/IF- 등)와 추적 가능하도록 작성한다.

| 항목 | 내용 |
|---|---|
| ADR ID | ADR-NNN |
| 제목 | [한 줄 결정 요약] |
| 상태 | 제안(Proposed) / 승인(Accepted) / 폐기(Deprecated) / 대체(Superseded by ADR-XXX) |
| 작성자 | [PL/AA] |
| 작성일 | YYYY-MM-DD |
| 관련 산출물 | [예: AsIs-Application-Architecture.md, IF-001, TBL-TCTTOT] |

---

## 1. 배경 (Context)
[결정이 필요한 비즈니스/기술 상황. As-Is의 병목·제약·요구사항을 근거와 함께 기술.]
- 비즈니스 동인(ROI/KPI):
- As-Is 제약/Pain-point:
- 영향 범위(화면/프로그램/테이블/인터페이스):

## 2. 결정 (Decision)
[채택한 아키텍처 결정을 명확하게 한 문장으로 선언한 뒤 상세 설명.]

## 3. 고려한 대안 (Considered Options)

| 대안 | 설명 | 장점 | 단점 | 채택 여부 |
|---|---|---|---|---|
| Option A | ... | ... | ... | ✅ 채택 |
| Option B | ... | ... | ... | ❌ |
| Option C | ... | ... | ... | ❌ |

## 4. 근거 (Rationale)
[Option A를 채택한 이유. 결정 동인(Decision Drivers)과의 정합성, 트레이드오프 판단 근거.]
- 결정 동인 1:
- 결정 동인 2:
- 트레이드오프:

## 5. 결과 (Consequences)
- **긍정적:** [기대효과 / KPI 개선 / 리스크 감소]
- **부정적:** [감수해야 할 비용 / 신규 리스크 / 기술 부채]
- **후속 조치(Follow-ups):** [추가 ADR, WBS 태스크, 검증 항목]

## 6. To-Be 매핑
| As-Is 식별자 | 처리 구분(유지/개선/폐기) | To-Be 대상 | 비고 |
|---|---|---|---|
| PGM-XXXX | 개선 | ... | ... |
