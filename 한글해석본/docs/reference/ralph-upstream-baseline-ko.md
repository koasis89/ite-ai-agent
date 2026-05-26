# Ralph 업스트림 시맨틱 기준선

- 업스트림 저장소: https://github.com/Yeachan-Heo/oh-my-codex
- 검색 시 고정된 분기 참조: `main`
- 고정된 커밋 SHA: `165c3688bfde275560c001a0de4c7563cf82ad69`
- (UTC)에 검색됨: `2026-02-22T06:55:19Z`
- 기준 파일: `skills/ralph/SKILL.md`
- 원시 URL: `https://raw.githubusercontent.com/Yeachan-Heo/oh-my-codex/165c3688bfde275560c001a0de4c7563cf82ad69/skills/ralph/SKILL.md`
- SHA256(기준 파일 콘텐츠): `2a16d9dd55a78ae9edf192fa36ab8370cb5f2dee4958fc458432429a36000917`

## 기준선에서 추출된 의미론

1. **반복 의미**
   - Ralph는 수명 주기 상태(`iteration`, `max_iterations`, `current_phase`)가 지속되는 반복 루프입니다.
   - 반복 진행 상황은 각 패스마다 업데이트되고 실행/검증/수정 단계 사이를 이동합니다.

2. **재시도 의미**
   - 확인이 완료를 거부하면 Ralph는 계속 실행되고 조기 종료 대신 수정/확인을 다시 시작합니다.
   - Ralph는 명시적으로 지속성 우선입니다(부분 완료 시 중지하지 않음).

3. **완성 의미**
   - 완료하려면 새로운 검증 증거와 명시적인 건축가 승인이 필요합니다.
   - 터미널 성공은 `active=false`, `current_phase=complete`을 설정하고 `completed_at`를 씁니다.

4. **취소 의미**
   - 취소는 자동 삭제가 아닌 수명 주기 종료로 처리됩니다.
   - 연결된 정리가 필요합니다(`ralph` + 취소 워크플로를 통한 연결된 실행 모드 정리).

## 감사 메모

- 이 기준선은 커밋 고정되어 있습니다. 모든 패리티 업데이트는 새로운 커밋 SHA 및 해시를 참조해야 합니다.
- 각 규칙의 패리티 매핑은 `docs/reference/ralph-parity-matrix.md`에서 추적됩니다.
