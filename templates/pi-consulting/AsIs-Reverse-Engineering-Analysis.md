# As-Is 역공학 분석 산출물 (ChangeMiner 등)

> 📊 **작성 양식(필수): `AsIs-Reverse-Engineering-Analysis_표준양식.xlsx`**
> 이 문서는 형식·구조 설명서이다. **실제 산출물은 반드시 같은 폴더의 엑셀 양식 파일 `AsIs-Reverse-Engineering-Analysis_표준양식.xlsx`을 열어 작성한다.**
> 호출트리·의존·CRUD·DataLineage·영향도를 6개 시트로 엑셀에 작성한다.
> 아래 표는 채울 항목과 예시를 보여주기 위한 참조이며, 데이터 입력은 엑셀 양식에서 수행한다.


> 참조 산출물: ISP 분석 [01]~[07] 역공학툴 사용 결과물  
> 솔루션(체인지마이너 등) 실행 후 수기 보정으로 작성한다. 프로그램 호출관계/의존관계/CRUD/데이터 계보/영향도를 일관된 식별자로 추적한다.

## 1. 문서 정보
- 프로젝트명:
- 작성자 / 작성일:
- 분석 도구: 체인지마이너(ChangeMiner) 등
- 수행 방식: 솔루션 실행 후 수기 보정
- 기준 버전:

---

## [01] 프로그램 목록 (Layer/Depth 호출 구조)
| Layer | Depth | Component Type | Program/Class | Package | Method | Description | Framework | DB Access | Called By | Calls To |
|---|---|---|---|---|---|---|---|---|---|---|
| Presentation | 1 | Controller | CustomerController | com.bank.customer.web | getCustomerDetail(Long customerId) | 고객 상세 조회 진입점 | Spring MVC | N | - | CustomerFacade.getCustomerDetail |
| Application | 2 | Facade | CustomerFacade | com.bank.customer.app | getCustomerDetail(Long customerId) | 트랜잭션 경계/유스케이스 조합 | Spring | N | CustomerController.getCustomerDetail | CustomerService.loadCustomerAggregate |
| Application | 3 | Service | CustomerService | com.bank.customer.service | loadCustomerAggregate(Long customerId) | 고객 기본정보/계좌/거래내역 조합 | Spring | N | CustomerFacade.getCustomerDetail | CustomerDomainService.findCustomerWithAccounts |
| Domain | 4 | Domain Service | CustomerDomainService | com.bank.customer.domain | findCustomerWithAccounts(Long customerId) | 도메인 규칙 적용/조회 오케스트레이션 | Spring | N | CustomerService.loadCustomerAggregate | CustomerRepository.findById; AccountRepository.findByCustomerId |
| Infrastructure | 5 | Repository | CustomerRepository | com.bank.customer.infra.repository | findById(Long customerId) | JPA 기반 고객 조회 | Spring Data JPA | Y | CustomerDomainService.findCustomerWithAccounts | CustomerJpaMapper.selectCustomer |
| Persistence | 6 | Mapper/SQL | CustomerJpaMapper | com.bank.customer.infra.persistence | selectCustomer(Long customerId) | TB_CUSTOMER 조회 SQL 실행 | JPA/MyBatis | Y | CustomerRepository.findById | TB_CUSTOMER |

---

## [02] CallTree_Depth6 (호출 트리)
| Depth 1 | Depth 2 | Depth 3 | Depth 4 | Depth 5 | Depth 6 | Interface/DB | Notes |
|---|---|---|---|---|---|---|---|
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | CustomerRepository.findById | CustomerJpaMapper.selectCustomer | TB_CUSTOMER | 고객 기본정보 조회 |
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | AccountRepository.findByCustomerId | AccountJpaMapper.selectAccountsByCustomer | TB_ACCOUNT | 고객 보유계좌 조회 |
| CustomerController.getCustomerDetail | CustomerFacade.getCustomerDetail | CustomerService.loadCustomerAggregate | CustomerDomainService.findCustomerWithAccounts | TransactionRepository.findRecentByCustomerId | TransactionMapper.selectRecentTransactions | TB_TRANSACTION | 최근 거래내역 조회 |

---

## [03] 의존관계 매핑
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

---

## [04] CRUD Matrix
| Component | TB_CUSTOMER | TB_ACCOUNT | TB_TRANSACTION | TB_AUDIT_LOG | 설명 |
|---|---|---|---|---|---|
| CustomerController | - | - | - | - | 프레젠테이션 계층 |
| CustomerFacade | - | - | - | C | 조회 이력 로그 기록 가능 |
| CustomerService | R | R | R | - | 집계 조회 |
| CustomerDomainService | R | R | R | - | 도메인 오케스트레이션 |
| CustomerRepository | R | - | - | - | 고객 조회 |
| AccountRepository | - | R | - | - | 계좌 조회 |
| TransactionRepository | - | - | R | - | 거래내역 조회 |

---

## [05] Data Lineage (데이터 계보)
| UI Field | Controller Param | Facade DTO | Service DTO | Domain Entity/VO | Repository Query Param | DB Table.Column | Transformation/Rule |
|---|---|---|---|---|---|---|---|
| customerId | customerId | CustomerDetailRequest.customerId | CustomerAggregateQuery.customerId | Customer.customerId | :customerId | TB_CUSTOMER.CUSTOMER_ID | Long 타입 그대로 전달 |
| customerName | - | CustomerDetailResponse.customerName | CustomerAggregate.customerName | Customer.name | SELECT CUSTOMER_NAME | TB_CUSTOMER.CUSTOMER_NAME | DB 컬럼 → API 응답 DTO 매핑 |
| accountNo | - | CustomerDetailResponse.accounts[].accountNo | CustomerAggregate.accounts[].accountNo | Account.accountNo | SELECT ACCOUNT_NO | TB_ACCOUNT.ACCOUNT_NO | 마스킹 규칙 적용 가능 |

---

## [06] 영향도 분석
| Change Point | Changed Object | Direct Impact | Indirect Impact | Estimated Test Scope | Risk Level | Comment |
|---|---|---|---|---|---|---|
| 고객조회 응답항목 추가 | CustomerJpaMapper.selectCustomer | CustomerRepository, CustomerDomainService | CustomerService, CustomerFacade, CustomerController, API Contract | 단위/통합/API 회귀 | 중 | Depth 6 변경이 상위 1~5 단계로 전파 |
| 계좌번호 마스킹 규칙 변경 | AccountJpaMapper.selectAccountsByCustomer | AccountRepository, CustomerDomainService | CustomerService, CustomerFacade, CustomerController, 화면 응답포맷 | 단위/화면/API 회귀 | 상 | 개인정보 표출 규칙 영향 |

---

## [07] ChangeMiner CallGraph
- 호출관계 시각화 다이어그램(이미지/PPT) 산출물 — 별도 첨부.
- 구/신 소스 비교 기준으로 호출 구조 변화를 표현한다.

## 완료 체크리스트
- [ ] Depth 1~6 호출 트리가 인터페이스/DB 종단까지 추적되는가
- [ ] 의존관계가 Spring Annotation/Type과 함께 매핑되는가
- [ ] CRUD Matrix가 컴포넌트×테이블 단위로 정의되었는가
- [ ] Data Lineage가 UI Field→DB Column까지 연결되는가
- [ ] 영향도 분석의 Risk Level과 테스트 범위가 산정되었는가
