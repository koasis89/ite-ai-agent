# ST3-WIN-097 작업결과

## 1) 작업 개요
- 작업 ID: ST3-WIN-097
- 목표: free-text 경로에 스트리밍/타임아웃/재시도 상태머신을 고정하고 cancel 제어를 추가
- 수행 범위: renderer 실행 루프 상태머신 + 상태 배지/취소 UI + Taiga 등록 자동화

## 2) 변경 파일
- desktop/renderer/app.ts
  - free-text 실행 루프를 timeout/retry/cancel 상태머신으로 변경
  - 재시도 정책 추가: 최대 2회 재시도(총 3 attempt)
  - timeout 정책 추가: attempt당 8000ms 제한
  - cancel 정책 추가: 실행 중 취소 요청 시 즉시 상태 에러(cancelled) 전환
  - stale run 가드 추가: 새 요청 시작 시 이전 run 응답 무시
- desktop/renderer/index.html
  - gateway row에 free-text 취소 버튼 추가 (`chat-free-text-cancel`)
- desktop/renderer/chat.css
  - free-text 취소 버튼 스타일 추가 (`.chat-free-text-cancel`)
- desktop-app만들기/stage3/scripts/register-st3-win-097.ps1
  - ST3-WIN-097 US/Task 생성 및 중복 재사용 등록 스크립트 추가
- desktop-app만들기/stage3/result/ST3-WIN-097-작업결과.md
  - 작업 증적 문서 신규 작성

## 3) 구현 결과 요약
- 상태머신 흐름을 `진행 -> 재시도 n회 -> 완료/에러`로 고정
- timeout/retry/cancel 신호가 배지와 타임라인에 즉시 반영되도록 결선
- 실행 중 취소 버튼으로 사용자 개입 경로를 명시적으로 제공
- attempt 별 messageId를 분리해 진행 이벤트 매칭 안정성을 유지

## 4) 검증 증거
- 빌드
  - 명령: npm run build:desktop
  - 결과: 성공
- IPC 계약 회귀
  - 명령: npm run test:phase1:ipc-contract
  - 결과: 성공 (94 passed, 0 failed)
- SessionStore 회귀
  - 명령: node --test dist-desktop/desktop/__tests__/session-store.test.js
  - 결과: 성공 (14 passed, 0 failed)

## 5) Taiga 등록 결과
- Project: AI-Isaki
- Sprint: ST3-SP-09 (id=19)
- Epic: ST3-EP-01 (id=10)
- User Story
  - id=65, ref=251
  - 제목: [ST3-WIN-097] Streaming timeout retry event contract
- Tasks
  - id=176, ref=252, 제목: [Implementation] ST3-WIN-097 event stream and cancel propagation
  - id=177, ref=253, 제목: [Validation] ST3-WIN-097 timeout retry cancel integration
  - id=178, ref=254, 제목: [Documentation] ST3-WIN-097 streaming state policy update

## 6) 참고
- 등록 기준 문서: desktop-app만들기/stage3/change-winapp-phase9-tickets.md
- 등록 스크립트: desktop-app만들기/stage3/scripts/register-st3-win-097.ps1
- 결과 문서 위치: desktop-app만들기/stage3/result/ST3-WIN-097-작업결과.md

## 7) 수동 시나리오 체크리스트

- 공통 준비
  - [x] desktop 앱 실행 후 chat 패널 진입
  - [x] provider/model 선택값 확인 (필요 시 mock-echo 또는 mock-reverse)
  - [x] free-text 상태 배지가 `free-text: 대기`로 초기화되어 있는지 확인

- 기본 성공 경로
  - [x] free-text 입력 후 전송 시 배지가 `진행`으로 즉시 전환
  - [x] 응답 완료 후 배지가 `완료`로 전환되고, assistant 응답이 1회 출력
  - [x] 완료 후 취소 버튼이 비활성화되는지 확인

- 재시도 경로 (retryable 오류 유도 가능 환경)
  - [ ] 첫 시도 실패 시 배지가 `진행 (재시도 1/2)`로 유지/전환
  - [ ] 두 번째 실패 시 배지가 `진행 (재시도 2/2)`로 유지/전환
  - [ ] 최종 실패 시 배지가 `에러 (<code>)`로 전환되고 오류 메시지가 출력

- 타임아웃 경로
  - [ ] 응답 지연(8초 초과) 시 타임아웃 재시도 로그가 타임라인에 기록
  - [ ] 재시도 소진 후 `에러 (TIMEOUT)` 상태로 종료

- 취소 타이밍별 기대 상태
  - [ ] T1: 전송 직후(아직 progress chunk 없음) 취소
  - 기대: 즉시 `에러 (cancelled)` 배지, 추가 재시도 없음, 취소 버튼 비활성화
  - [ ] T2: 스트리밍 진행 중(progress chunk 수신 중) 취소
  - 기대: 즉시 `에러 (cancelled)` 배지, 이후 chunk 수신이 오더라도 상태가 완료로 역전되지 않음
  - [ ] T3: 실패 직후 재시도 전환 구간에서 취소
  - 기대: 다음 attempt 시작 없이 종료, `llm_gateway.cancelled` 타임라인 로그 기록

- 동시성/경합 경로
  - [ ] 요청 A 실행 중 요청 B를 연속 전송
  - 기대: 활성 run은 최신 요청(B) 기준으로 유지되고, A의 늦은 응답이 현재 배지/메시지를 덮어쓰지 않음

- 종료/복원 관찰 포인트
  - [ ] 요청 완료/실패/취소 이후 배지가 최종 상태를 유지하는지 확인
  - [ ] 새 요청 전송 시 상태가 다시 `진행`으로 정상 진입하는지 확인

Desktop UI → IPC → main → omx/codex exec → ~/.codex/auth.json 의 access_token으로 ChatGPT 백엔드 호출 → 응답

