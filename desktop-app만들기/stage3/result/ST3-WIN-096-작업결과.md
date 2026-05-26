# ST3-WIN-096 작업결과

## 1) 작업 개요
- 작업 ID: ST3-WIN-096
- 목표: Backend Gateway 단일 호출 계약(요청/응답/에러) v1 고정
- 수행 범위: IPC 계약 확장 + main 주입 + adapter registry 연결 + 계약 테스트 보강

## 2) 변경 파일
- desktop/ipc/commands.ts
  - 신규 IPC 명령 추가: llm_gateway_invoke
  - v1 계약 타입 추가: 요청/응답/에러 코드 표준화
  - 백엔드 주입 훅 추가: setLlmGatewayBackend/getLlmGatewayBackend
  - 인자 검증 추가: payload JSON v1 스키마 검증
- desktop/main/index.ts
  - gateway bootstrap 추가: bootstrapLlmGateway
  - provider adapter registry 추가: mock-echo, mock-reverse
  - 기본 provider 환경변수 지원: OMX_DESKTOP_LLM_PROVIDER
  - IPC backend 결선: setLlmGatewayBackend
- desktop/__tests__/ipc-contract.test.ts
  - ST3-WIN-096 계약 테스트 추가(4건)
    - backend 미초기화 오류 envelope
    - 정상 v1 응답
    - provider-level 오류 envelope
    - malformed payload INVALID_REQUEST

## 3) 구현 결과 요약
- 호출부는 llm_gateway_invoke 공통 인터페이스만 사용
- provider별 동작 차이는 main의 adapter registry 내부로 캡슐화
- backend 미주입/미지원 provider/실행 오류를 v1 error envelope로 통일

## 4) 검증 증거
- 타입체크/빌드
  - 명령: npm run build:desktop
  - 결과: 성공
- IPC 계약 테스트
  - 명령: npm run test:phase1:ipc-contract
  - 결과: 성공 (94 passed, 0 failed)
- 다중 백엔드 스모크
  - mock-echo, mock-reverse 2개 provider registry 구성 완료

## 5) Taiga 등록 결과
- Project: AI-Isaki
- Sprint: ST3-SP-09 (id=19)
- Epic: ST3-EP-01 (id=10)
- User Story
  - id=64, ref=247
  - 제목: [ST3-WIN-096] Backend Gateway 단일 호출 계약 고정
- Tasks
  - id=173, ref=248, 제목: [구현] ST3-WIN-096 adapter registry + set*Backend 결선
  - id=174, ref=249, 제목: [검증] ST3-WIN-096 다중 백엔드 공통 스키마 회귀
  - id=175, ref=250, 제목: [문서] ST3-WIN-096 요청/응답/에러 계약 문서화

## 6) 참고
- 등록 기준 문서: desktop-app만들기/stage3/change-winapp-phase9-tickets.md
- 결과 문서 위치: desktop-app만들기/stage3/result/ST3-WIN-096-작업결과.md
