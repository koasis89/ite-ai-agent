# src/main/ 모듈 분석

> 작성일: 2026-05-29
> 대상 경로: Electron/src/main/

---

## 1. 개요

`main` 모듈은 Electron Main Process의 백엔드 엔진이다.
주요 책임은 IPC 라우팅, CLI 실행 브리지, 상태 감시, 로그 수집, 외부 어댑터 연동이다.

## 2. 하위 폴더 구조

- `cli/`: OMX CLI 호출 및 스트림 파싱
- `core/`: 프로세스 실행 기반 유틸
- `env/`: 실행 환경 검증
- `ipc/`: Renderer와 Main 간 채널 핸들러
- `logs/`: 세션/이벤트/훅 로그 수집
- `mcp/`: MCP 브리지 및 매니저
- `ops/`: 운영 점검/드리프트 감지
- `services/`: 도메인 서비스(키 저장, 태스크 상태 전이)
- `state/`: `.omx/state` 감시 및 수명주기 파싱

## 3. 핵심 설계 포인트

- Renderer는 `preload`로 제한된 API만 접근하고, 실질 동작은 `main/ipc`에서 제어
- CLI 스트리밍 출력은 이벤트 채널 단위로 분해되어 UI로 전달
- 상태 관리 기준선은 파일 기반(`.omx/state`), 보조 경로로 스트림 도구 호출 즉시 반영

## 4. 리스크 및 확인 항목

- 워크스페이스 `.omx/state`와 홈 `.omx/state` 경로 불일치
- 스트림 이벤트 타입 변화 시 파서 호환성 저하
- IPC 핸들러 증설 시 채널 명 충돌 가능성
