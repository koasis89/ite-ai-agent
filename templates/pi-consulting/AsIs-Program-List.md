# As-Is 현황분석 _ 프로그램 목록

> 📊 **작성 양식(필수): `AsIs-Program-List_표준양식.xlsx`**
> 이 문서는 형식·구조 설명서이다. **실제 산출물은 반드시 같은 폴더의 엑셀 양식 파일 `AsIs-Program-List_표준양식.xlsx`을 열어 작성한다.**
> 업무기준 목록·역공학 구조·배치 상세를 시트로 나눠 엑셀로 작성한다.
> 아래 표는 채울 항목과 예시를 보여주기 위한 참조이며, 데이터 입력은 엑셀 양식에서 수행한다.


> 참조 산출물: ISP 분석 [09] 현황분석_프로그램목록 (+ 역공학 [01] 프로그램 목록)  
> 업무 분류(Level1~3) 기반의 현황 목록과, 역공학 도구 기반의 Layer/Depth 호출 구조를 함께 관리한다.

## 1. 문서 정보
- 프로젝트명:
- 작성자 / 작성일:
- 분석 도구: 체인지마이너 등 역공학 솔루션 실행 후 수기 보정
- 기준 버전:

## 2. 현황분석 프로그램 목록 (업무 기준)
| Level1 | Level2 | Level3 | 프로그램 ID | 프로그램명 | 프로그램유형 | 비고 | 개선유형 |
|---|---|---|---|---|---|---|---|
| 계약 | 계약관리 | 장기보험 | LgtmCthtnBc | 장기계약조회 | 온라인 | 계약상태를 조회하기 위한 서비스 | 단순변경 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnFddgBc | 재가입이력정보조회 | 온라인 | 재가입이력을 조회하기 위한 서비스 | 유지 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnUnddhBc | 등록단체찾기 | 온라인 | 등록된 단체를 조회하는 서비스 | 유지 |
| 계약 | 계약관리 | 장기보험 | LgtmCthtnUnddhBB | 등록단체일괄등록 | 배치 | 단체를 일괄등록하는 배치(On-Demand 사용 가능) | 신규 |

> **프로그램유형:** 온라인 / 배치 / 공통 / 인터페이스(I/F)  
> **개선유형:** 신규 / 단순변경 / 개선 / 유지 / 삭제

## 3. 역공학 프로그램(클래스) 목록 (구조 기준)
| Layer | Depth | Component Type | Program/Class | Package | Method | Description | Framework | DB Access | Called By | Calls To |
|---|---|---|---|---|---|---|---|---|---|---|
| Presentation | 1 | Controller | CustomerController | com.bank.customer.web | getCustomerDetail(Long customerId) | 고객 상세 조회 진입점 | Spring MVC | N | - | CustomerFacade.getCustomerDetail |
| Application | 2 | Facade | CustomerFacade | com.bank.customer.app | getCustomerDetail(Long customerId) | 트랜잭션 경계 및 유스케이스 조합 | Spring | N | CustomerController.getCustomerDetail | CustomerService.loadCustomerAggregate |
| Application | 3 | Service | CustomerService | com.bank.customer.service | loadCustomerAggregate(Long customerId) | 고객 기본정보/계좌/거래내역 조합 | Spring | N | CustomerFacade.getCustomerDetail | CustomerDomainService.findCustomerWithAccounts |
| Domain | 4 | Domain Service | CustomerDomainService | com.bank.customer.domain | findCustomerWithAccounts(Long customerId) | 도메인 규칙 적용 및 조회 오케스트레이션 | Spring | N | CustomerService.loadCustomerAggregate | CustomerRepository.findById; AccountRepository.findByCustomerId |
| Infrastructure | 5 | Repository | CustomerRepository | com.bank.customer.infra.repository | findById(Long customerId) | JPA 기반 고객 조회 | Spring Data JPA | Y | CustomerDomainService.findCustomerWithAccounts | CustomerJpaMapper.selectCustomer |
| Persistence | 6 | Mapper/SQL | CustomerJpaMapper | com.bank.customer.infra.persistence | selectCustomer(Long customerId) | TB_CUSTOMER 조회 SQL 실행 | JPA/MyBatis | Y | CustomerRepository.findById | TB_CUSTOMER |

## 4. 배치 프로그램 상세
| 프로그램 ID | 스케줄 | 실행 주기 | 선행 작업 | 후행 작업 | 처리 건수(평균) | 비고 |
|---|---|---|---|---|---|---|
| LgtmCthtnUnddhBB | On-Demand | 수시 |  |  |  | 단체 일괄등록 |

## 5. 집계
| 구분 | 온라인 | 배치 | 공통 | 인터페이스 | 합계 |
|---|---|---|---|---|---|
| 수량 |  |  |  |  |  |

## 6. 완료 체크리스트
- [ ] 업무 Level1~3 및 개선유형이 부여되었는가
- [ ] 역공학 Layer/Depth(Presentation~Persistence)가 식별되었는가
- [ ] Called By / Calls To 호출관계가 추적 가능한가
- [ ] 프로그램 ID가 화면·테이블·인터페이스와 매핑되는가
