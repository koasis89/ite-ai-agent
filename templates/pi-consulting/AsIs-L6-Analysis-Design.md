# As-Is Level 6 분석/설계 산출물 템플릿

> 📊 **작성 양식(필수): `AsIs-L6-Analysis-Design_표준양식.xlsx`**
> 이 문서는 형식·구조 설명서이다. **실제 산출물은 반드시 같은 폴더의 엑셀 양식 파일 `AsIs-L6-Analysis-Design_표준양식.xlsx`을 열어 작성한다.**
> 단일 업무단위 종단 딥다이브를 엑셀로 작성한다.
> 아래 표는 채울 항목과 예시를 보여주기 위한 참조이며, 데이터 입력은 엑셀 양식에서 수행한다.


## 1. 문서 정보
- 프로젝트명: 전문건설공제조합 차세대 ISP
- 수행사: 아이티아이즈
- 작성자:
- 작성일:
- 기준 버전: v0.1
- 검토자:

---

## 2. 분석 대상
- 업무영역: (예: 계약 > 계약관리 > 장기보험)
- 메뉴/화면 ID: (예: PNGFTGL_0001)
- 배치/인터페이스 명:
- 관련 시스템: 기간계 / 채널계
- 분석 도구: 체인지마이너(ChangeMiner) / 수기
- 수행 주체: 아이티아이즈

---

## 3. 역공학(Reverse Engineering) 분석

> **분석 방식**: 체인지마이너 솔루션 실행 후 수기 보정  
> **To-Be Application Architecture 유의사항**: F/W 도입 시(예: 전자정부 F/W 2.0) Controller → Biz → DTO → DAO 레이어 구조 확인 필요.  
> ※ 기존 시스템이 Cobol to JAVA 단순 전환으로 절차형 소스코드일 가능성이 높음. 프로젝트 수행 기간 고려하여 DAO만 분리하는 방안도 검토 필요.

### 3-1. 프로그램 호출목록 (L6 깊이 분석) — Sheet 01

| Layer | Depth | Component Type | Program/Class | Package | Method | Description | Framework | DB Access | Called By | Calls To |
|---|---|---|---|---|---|---|---|---|---|---|
| Presentation | 1 | Controller | CustomerController | com.bank.customer.web | getCustomerDetail(Long customerId) | 고객 상세 조회 진입점 | Spring MVC | N | - | CustomerFacade.getCustomerDetail |
| Application | 2 | Facade | CustomerFacade | com.bank.customer.app | getCustomerDetail(Long customerId) | 트랜잭션 경계 및 유스케이스 조합 | Spring | N | CustomerController.getCustomerDetail | CustomerService.loadCustomerAggregate |
| Application | 3 | Service | CustomerService | com.bank.customer.service | loadCustomerAggregate(Long customerId) | 고객 기본정보/계좌/거래내역 조합 | Spring | N | CustomerFacade.getCustomerDetail | CustomerDomainService.findCustomerWithAccounts |
| Domain | 4 | Domain Service | CustomerDomainService | com.bank.customer.domain | findCustomerWithAccounts(Long customerId) | 도메인 규칙 적용 및 조회 오케스트레이션 | Spring | N | CustomerService.loadCustomerAggregate | CustomerRepository.findById; AccountRepository.findByCustomerId |
| Infrastructure | 5 | Repository | CustomerRepository | com.bank.customer.infra.repository | findById(Long customerId) | JPA 기반 고객 조회 | Spring Data JPA | Y | CustomerDomainService.findCustomerWithAccounts | CustomerJpaMapper.selectCustomer |
| Persistence | 6 | Mapper/SQL | CustomerJpaMapper | com.bank.customer.infra.persistence | selectCustomer(Long customerId) | TB_CUSTOMER 조회 SQL 실행 | JPA/MyBatis | Y | CustomerRepository.findById | TB_CUSTOMER |
| Infrastructure | 5 | Repository | AccountRepository | com.bank.account.infra.repository | findByCustomerId(Long customerId) | JPA 기반 계좌 목록 조회 | Spring Data JPA | Y | CustomerDomainService.findCustomerWithAccounts | AccountJpaMapper.selectAccountsByCustomer |
| Persistence | 6 | Mapper/SQL | AccountJpaMapper | com.bank.account.infra.persistence | selectAccountsByCustomer(Long customerId) | TB_ACCOUNT 조회 SQL 실행 | JPA/MyBatis | Y | AccountRepository.findByCustomerId | TB_ACCOUNT |

### 3-2. CallTree (Depth 6) — Sheet 02

| Depth 1 | Depth 2 | Depth 3 | Depth 4 | Depth 5 | Depth 6 | Interface/DB | Notes |
|---|---|---|---|---|---|---|---|
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | CustomerRepository.findById | CustomerJpaMapper.selectCustomer | TB_CUSTOMER | 고객 기본정보 조회 |
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | AccountRepository.findByCustomerId | AccountJpaMapper.selectAccountsByCustomer | TB_ACCOUNT | 고객 보유계좌 조회 |
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | TransactionRepository.findRecentByCustomerId | TransactionMapper.selectRecentTransactions | TB_TRANSACTION | 최근 거래내역 조회 |

### 3-3. 의존관계 매핑 — Sheet 03

| Source Component | Target Component | Relation Type | Depth From | Depth To | Spring Annotation/Type | Remark |
|---|---|---|---|---|---|---|
| CustomerController | CustomerFacade | Call | 1 | 2 | @RestController → @Service | HTTP 요청 진입 |
| CustomerFacade | CustomerService | Call | 2 | 3 | @Service → @Service | 유스케이스 조합 |
| CustomerService | CustomerDomainService | Call | 3 | 4 | @Service → Domain Service | 도메인 규칙 적용 |
| CustomerDomainService | CustomerRepository | Call | 4 | 5 | Domain → @Repository | 고객 엔티티 조회 |
| CustomerRepository | CustomerJpaMapper | Call | 5 | 6 | @Repository → Mapper | SQL 실행 위임 |
| CustomerJpaMapper | TB_CUSTOMER | CRUD(Read) | 6 | 6 | SQL | 단건 조회 |
| CustomerDomainService | AccountRepository | Call | 4 | 5 | Domain → @Repository | 계좌 엔티티 조회 |
| AccountRepository | AccountJpaMapper | Call | 5 | 6 | @Repository → Mapper | SQL 실행 위임 |
| AccountJpaMapper | TB_ACCOUNT | CRUD(Read) | 6 | 6 | SQL | 목록 조회 |

### 3-4. CRUD 매트릭스 — Sheet 04

| Component | TB_CUSTOMER | TB_ACCOUNT | TB_TRANSACTION | TB_AUDIT_LOG | 설명 |
|---|---|---|---|---|---|
| CustomerController | - | - | - | - | 프레젠테이션 계층 |
| CustomerFacade | - | - | - | C | 조회 이력 로그 기록 가능 |
| CustomerService | R | R | R | - | 집계 조회 |
| CustomerDomainService | R | R | R | - | 도메인 오케스트레이션 |
| CustomerRepository | R | - | - | - | 고객 조회 |
| AccountRepository | - | R | - | - | 계좌 조회 |
| TransactionRepository | - | - | R | - | 거래내역 조회 |

### 3-5. DataLineage — Sheet 05

| UI Field | Controller Param | Facade DTO | Service DTO | Domain Entity/VO | Repository Query Param | DB Table.Column | Transformation/Rule |
|---|---|---|---|---|---|---|---|
| customerId | customerId | CustomerDetailRequest.customerId | CustomerAggregateQuery.customerId | Customer.customerId | :customerId | TB_CUSTOMER.CUSTOMER_ID | Long 타입 그대로 전달 |
| customerName | - | CustomerDetailResponse.customerName | CustomerAggregate.customerName | Customer.name | SELECT CUSTOMER_NAME | TB_CUSTOMER.CUSTOMER_NAME | DB 컬럼 → API 응답 DTO 매핑 |
| accountNo | - | CustomerDetailResponse.accounts[].accountNo | CustomerAggregate.accounts[].accountNo | Account.accountNo | SELECT ACCOUNT_NO | TB_ACCOUNT.ACCOUNT_NO | 마스킹 규칙 적용 가능 |

### 3-6. 영향도 분석 — Sheet 06

| Change Point | Changed Object | Direct Impact | Indirect Impact | Estimated Test Scope | Risk Level | Comment |
|---|---|---|---|---|---|---|
| 고객조회 응답항목 추가 | CustomerJpaMapper.selectCustomer | CustomerRepository, CustomerDomainService | CustomerService, CustomerFacade, CustomerController, API Contract | 단위/통합/API 회귀 | 중 | Depth 6 변경이 상위 1~5단계로 전파 |
| 계좌번호 마스킹 규칙 변경 | AccountJpaMapper.selectAccountsByCustomer | AccountRepository, CustomerDomainService | CustomerService, CustomerFacade, CustomerController, 화면 응답포맷 | 단위/화면/API 회귀 | 상 | 개인정보 표출 규칙 영향 |

### 3-7. ChangeMiner CallGraph — Sheet 07
> 이미지/다이어그램 산출물 – 별도 PPT 첨부

---

## 4. As-Is 현황분석

### 4-1. 화면/보고서 목록 — Sheet 08

| Level1 | Level2 | Level3 | 화면ID | 화면명 | 화면유형 | 비고 | 개선유형 |
|---|---|---|---|---|---|---|---|
| 계약 | 계약관리 | 장기보험 | PNGFTGL_0001 | 계약상세조회 | Main | 계약상태를 조회하기 위한 최초 진입화면 | 단순변경 |
| 계약 | 계약관리 | 장기보험 | PNGFTGL_0001_001 | 부담보조회 | Popup | 부담보상태를 조회하고 수정하는 팝업 | 신규 |
| 계약 | 계약관리 | 장기보험 | PNGFTGL_0001_002 | 취급자변경이력 | Popup | 취급자 조회/수정/삭제 화면 | 유지 |

### 4-2. 프로그램 목록 — Sheet 09

| Level1 | Level2 | Level3 | 프로그램ID | 프로그램명 | 프로그램유형 | 비고 | 개선유형 |
|---|---|---|---|---|---|---|---|
| 계약 | 계약관리 | 장기보험 | LgtmCthtnBc | 장기계약조회 | 온라인 | 계약상태를 조회하기 위한 서비스 | 단순변경 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnFddgBc | 재가입이력정보조회 | 온라인 | 재가입이력을 조회하기 위한 서비스 | 유지 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnUnddhBc | 등록단체찾기 | 온라인 | 등록된 단체를 조회하는 서비스 | 유지 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnUnddhBB | 등록단체일괄등록 | 배치 | 단체를 일괄등록하기 위한 배치. On Demand 사용 가능 | 신규 |

### 4-3. 테이블 명세 — Sheet 10

| DB명 | 주제영역 | 테이블ID | 테이블명 | 설명 |
|---|---|---|---|---|
| KF_0000 | 보험계약 | TCTTOT | 계약 | 고객(계약자)과 체결한 보험계약을 관리함. 증권번호 단위로 기록. 초보험과 같이, 한번 계약에 의해 여러 증권번호가 발생할 경우, 각 증권번호 단위로 데이터를 기록 |
| KF_0000 | 보험계약 | TCTTOTATT | 계약업무속성 | 계약관련 업무에서 사용하는 다양한 속성에 대한 실제 값을 표현하는 Entry 임 |

### 4-4. 테이블 상세 명세 — Sheet 11

| 주제영역 | 서브주제영역 | DB명 | DB한글명 | 스키마명 | 테이블ID | 테이블명 | 개선유형 | 설명 |
|---|---|---|---|---|---|---|---|---|
| 기간계 | 계약 | CONTRACT | 보험계약 | TCTT | 계약 | TCTTOT | 유지 | 장기계약번호 |
| 기간계 | 계약 | CONTRACT | 보험계약 | TCTT | 계약업무속성 | TCTTOTATT | 변경 | 장기계약번호 |

### 4-5. 인덱스 상세 명세 — Sheet 12

| 주제영역 | 서브주제영역 | DB명 | DB한글명 | 스키마명 | 테이블ID | 테이블명 | 인덱스명 | 인덱스타입 | Unique여부 | 순서 | 컬럼ID | 컬럼한글명 | 자료형 | Not Null | Default | 설명 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 계약 | 계약확장(AR) | CONTRACT | 보험계약 | TCTT | 계약 | TCTTOT | TCTTOT_IDX | PK | Y | 1 | INST_SU_NO | 보험계약번호 | VARCHAR2(30) | Y |  |  |

### 4-6. 인터페이스 목록 — Sheet 13

| 인터페이스명 | 인터페이스 상세설명 | 대내외구분 | 온라인/배치 | 연계기관 | 송신시스템 | 송신업무 | 송신프로토콜 | 수신시스템 | 수신업무 | 수신프로토콜 | 발생조건 | 오류발생시 | 전송주기 | 암호화여부 | 개선유형 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 신분증 진위확인 외국인_외국인등록증 진위확인 | 외국인등록증 진위확인[0001] | 대외(FEP) | 온라인 | NIES | 기간계 | 장기 | HTTP | 쿠콘(CONCO1) | 신분증진위확인 | HTTP |  |  |  |  | 유지 |  |
| 금결원자동이체_E811 | 금결원자동이체_E811_은행접수_출금이체신청내역 | 대외(FEP) | 배치 | 금융결제원[CMS] | 금융결제원[CMS] | N/A | SFTP | 기간계 | 장기 | SFTP | 배치 | 매일 | Y |  | 유지 |  |

### 4-7. 어플리케이션 아키텍처 — Sheet 14
> 이미지/다이어그램 산출물 – 별도 PPT 첨부

---

## 5. As-Is 이슈 및 리스크

| 구분 | 이슈 | 영향도(상/중/하) | 개선 필요성 | 대응 방향 |
|---|---|---|---|---|
| 아키텍처 | Cobol to JAVA 단순 전환으로 절차형 소스코드 구조 — 객체지향 방식 미적용 | 상 | 높음 | To-Be 설계 시 레이어드 아키텍처(Controller-Facade-Service-Domain-Repository) 적용 |
| 아키텍처 | DAO 미분리로 인한 비즈니스 로직과 데이터 접근 혼재 | 중 | 높음 | 수행 기간 고려 시 DAO만 분리하는 단계적 적용 방안 검토 |
| 데이터 | DB 영역 현황 파악을 위해 롯데이노베이트와 추가 협의 필요 | 중 | 중간 | 별도 협의 일정 수립 및 테이블 명세 보완 |
| 인터페이스 | 계좌번호 마스킹 규칙 변경 시 전 레이어(Depth 1~6) 연쇄 영향 | 상 | 높음 | 개인정보 표출 규칙 재정의 후 영향도 기반 회귀 테스트 수행 |
| 프로세스 | 고객조회 응답항목 추가 시 Depth 6 변경이 상위 1~5단계로 전파 | 중 | 중간 | 변경 범위 최소화를 위한 인터페이스 버전 관리 정책 수립 |

---

## 6. TO-BE 매핑 포인트

> 참고: Sheet 16 (Application 영역 개선방안)

| As-Is 항목 | To-Be 반영 대상 | 변경 유형(유지/개선/폐기) | 비고 |
|---|---|---|---|
| 화면 PNGFTGL_0001 계약상세조회 (Main) | 분할급여 관리 > 가입 > 가입심사/확정 화면 | 단순변경 | 가입심사·확정 기능 통합 |
| 화면 PNGFTGL_0001_001 부담보조회 (Popup) | 분할급여 관리 > 가입 > 결재 > 가입결재 | 신규 | 전표 발행/출력·결재 요청 기능 추가 |
| 화면 PNGFTGL_0001_002 취급자변경이력 (Popup) | 분할급여 관리 > 가입 > 결재 > 반환결재 | 유지 | 반환금액 전표 발행 및 결재 요청 |
| 프로그램 LgtmCthtnBc 장기계약조회 (온라인) | Application: 회원공제서비스 > 분할급여관리 | 단순변경 | CRUD: R/U |
| 프로그램 LgtmCthtnUnddhBB 등록단체일괄등록 (배치) | Application: 회원공제서비스 > 분할급여관리 | 신규 | CRUD: C/R/U |
| CustomerJpaMapper (Depth 6, SQL) | Repository 레이어 분리 및 JPA/MyBatis 표준화 | 개선 | Spring Data JPA + MyBatis 이중화 검토 |
| 인터페이스 FEP 대외 채널 | MCI/FEP 도입으로 기간계-채널 간 REST API 표준 인터페이스 어댑터 구현 | 개선 | IT개발 영역 연계 솔루션 23.7억 별도 산정 |

---

## 7. 공수산정 참고

> 참고: Sheet 18~20 (공수산정_화면-서비스호출관계 / 서비스난이도분석 / 개발공수산정F/W)

### 7-1. 화면-서비스 호출관계 — Sheet 18

| 화면ID | 화면명 | APP | 서비스 | 서비스명 | Operation | Op명 | 호출건수(직전1년) | 최종호출일자 |
|---|---|---|---|---|---|---|---|---|
| CO01_0004M | 보험가입증명원 | APP_CO | EmmvdPC | 가입사실증명원발급정보 | prmtNtfdclsuInfo | 가입사실발급정보조회 | 19,002 | 2026-06-19 |

### 7-2. 서비스 난이도 분석 — Sheet 19

| APP | 서비스 | 서비스명 | Operation | Op명 | 유형 | C | R | U | D | OP점수 | 호출건수 | 호출빈도 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| APP_CO | EmmvdPC | 가입사실증명원발급정보 | prmtNtfdclsuInfo | 가입사실발급정보조회 | 유지 |  | O |  |  | 1 | 19,002 | 상 |
| APP_CO | EmmvdPC | 가입사실증명원발급정보 | savePrmtNtfdsInfo | 가입사실발급정보저장 | 변경 | O |  | O |  | 3 | 4,000 | 중 |

### 7-3. 개발공수 산정 기준 — Sheet 20

**본수 보정계수**

| 유형 | 항목 | 기간계 | 채널 |
|---|---|---|---|
| 구분 | 화면 | 1.2 | — |
| 구분 | 서비스 | 1.0 | — |
| 개발유형 | 신규 | 2.0 | — |
| 개발유형 | 개선 | 1.5 | — |
| 개발유형 | 유지 | 1.0 | — |
| 난이도 | 상 | 1.5 | — |
| 난이도 | 중 | 1.0 | — |
| 난이도 | 하 | 0.7 | — |

**개발시간 환산 기준**: 평균개발시간 10h/본  
**M/M 산정 기준 (14개월)**: 인당 월 근로시간 166.4h, 개발 外 소요시간비율 10%  
**마일스톤 배분**: 분석 3 / 설계 1 / 개발 3 / 테스트 5 / 이행 4 / 유지 1

---

## 8. 완료 체크리스트

- [ ] 역공학 프로그램 호출목록(L6)이 대상 화면·서비스 전체 커버리지로 작성되었는가
- [ ] CallTree Depth 6까지 Interface/DB 연결이 확인되었는가
- [ ] 의존관계매핑에서 Spring Annotation/Type이 명시되었는가
- [ ] CRUD 매트릭스가 컴포넌트-테이블 단위로 완성되었는가
- [ ] DataLineage에서 UI Field ↔ DB Column 추적이 가능한가
- [ ] 영향도분석에서 Risk Level 및 Test Scope가 정의되었는가
- [ ] 화면/보고서목록 개선유형(단순변경/신규/유지)이 확정되었는가
- [ ] 프로그램목록 개선유형이 화면목록과 일치하는가
- [ ] 테이블 명세에 DB영역 협의(롯데이노베이트) 결과가 반영되었는가
- [ ] 인터페이스목록에 송수신 프로토콜 및 전송주기가 기재되었는가
- [ ] To-Be 매핑에 Application(L1~L6) 기능 구조와 1:1 추적 식별자가 부여되었는가
- [ ] 공수산정 화면-서비스 호출관계 및 난이도 분석이 본수 산정에 연계되었는가
