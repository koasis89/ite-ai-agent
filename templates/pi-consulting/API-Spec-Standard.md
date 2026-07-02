# API 명세 표준 (Enterprise Integration API Spec)

> 📝 **작성 양식(필수): `API-Spec-Standard_표준양식.docx`**
> 이 문서는 형식·구조 설명서이다. **실제 산출물은 반드시 같은 폴더의 워드 양식 파일 `API-Spec-Standard_표준양식.docx`을 열어 작성한다.**
> API 명세는 서술 중심이므로 워드로 작성한다.
> 아래 표는 채울 항목과 예시를 보여주기 위한 참조이며, 데이터 입력은 워드 양식에서 수행한다.


> To-Be 시스템의 통합 API 명세 표준 서식. As-Is 인터페이스 목록(`AsIs-Interface-List.md`, IF-)과
> 1:1 매핑 가능하도록 작성하여 마이그레이션 추적성을 보장한다.

| 항목 | 내용 |
|---|---|
| API ID | API-NNN |
| API 명 | [예: 계약 상세 조회] |
| 대응 As-Is 인터페이스 | IF-XXX (대내/대외) |
| 도메인/서비스 | [예: contract-service] |
| 버전 | v1 |
| 작성자 / 작성일 | [AA] / YYYY-MM-DD |

---

## 1. 개요
- **목적:** [API가 제공하는 비즈니스 기능]
- **소비자(Consumer):** [호출 주체 — 화면/배치/외부기관]
- **인증/인가:** [예: OAuth2 Client Credentials / mTLS]
- **트랜잭션 특성:** [동기/비동기, 멱등성 여부]

## 2. 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/v1/contracts/{contractNo}` | 계약 상세 조회 |
| POST | `/api/v1/contracts` | 계약 등록 |

## 3. 요청 (Request)

### 3.1 Path / Query Parameter
| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|---|---|---|---|---|
| contractNo | path | string | Y | 계약번호 |

### 3.2 Request Body
```json
{
  "contractNo": "C2026000001",
  "customerId": "CUST0001"
}
```

| 필드 | 타입 | 필수 | 제약 | 대응 컬럼(TBL) |
|---|---|---|---|---|
| contractNo | string(30) | Y | - | TCTTOT.CT_NO |

## 4. 응답 (Response)

### 4.1 성공 (200)
```json
{
  "contractNo": "C2026000001",
  "status": "ACTIVE"
}
```

### 4.2 에러 코드
| HTTP | 코드 | 설명 | 대응 방안 |
|---|---|---|---|
| 400 | E-INVALID | 잘못된 요청 | 입력 검증 |
| 404 | E-NOTFOUND | 계약 없음 | - |
| 500 | E-INTERNAL | 서버 오류 | 재시도/알림 |

## 5. 비기능 요구
- **SLA:** [응답 p95 < 300ms]
- **Rate Limit:** [예: 100 TPS]
- **로깅/관측성:** [Trace ID 전파, 감사 로그]

## 6. As-Is 추적
| As-Is IF ID | 송수신 구분 | 변경 구분(유지/개선/신규/폐기) | 비고 |
|---|---|---|---|
| IF-001 | 송신 | 개선(파일→REST) | CMS 연계 |
