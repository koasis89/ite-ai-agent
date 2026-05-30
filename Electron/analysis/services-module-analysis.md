# src/main/services/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/services/

## 1. 구성 파일

- `gemini-key-store.ts`
- `task-service.ts`

## 2. 역할

`services`는 도메인 규칙 계층이다.
IPC가 요청을 전달하면 실제 정책/상태 전이/저장소 동작을 수행한다.

## 3. 핵심 설계 포인트

- `gemini-key-store`: 키 저장/조회/삭제 추상화
- `task-service`: claim/release/transition 등 태스크 생명주기 규칙 캡슐화
- IPC와 분리된 서비스 계층으로 테스트 단순화

## 4. 검증 포인트

- 태스크 전이 불변식 위반 방지
- 키 저장소 권한/암호화 정책 점검
- 예외 코드 표준화(Conflict/NotFound 등)
