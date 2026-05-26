# 릴리스 준비 후속 조치(team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 루트 가드)

## 로컬 확인 명령

저장소 루트에서 실행:

```bash
npm run build   # TypeScript build
node --test dist/team/__tests__/state.test.js
node --test dist/mcp/__tests__/state-server-team-tools.test.js
npm test
```

## OMX_TEAM_* 환경 주의사항 및 정리

team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/경로 확인은 이제 작업자 작업 트리 전체에서 명시적인 `OMX_TEAM_STATE_ROOT`을 지원합니다.
로컬 테스트를 수동으로 실행할 때 교차 테스트 오염을 방지하기 위해 각 실행 후 작업자별 환경을 지웁니다.

```bash
unset OMX_TEAM_STATE_ROOT OMX_TEAM_WORKER OMX_TEAM_LEADER_CWD
```

테스트에 이러한 변수가 필요한 경우 테스트 내에 이를 저장/복원합니다(`const prev = process.env...` + `finally` 정리).
