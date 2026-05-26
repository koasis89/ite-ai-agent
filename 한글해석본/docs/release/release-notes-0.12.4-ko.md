# 릴리스 노트 — 0.12.4

## 요약

`0.12.4`은 MCP-CLI 패리티, HUD 복구/코디네이션(Coordination) 강화, 네이티브 후크 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 안정성 수정, 새로운 상태 운영 모듈을 제공합니다. 이는 `0.12.x` 트파트에서 가장 큰 패치입니다. 18개의 비병합 커밋에서 56개의 파일이 변경되었으며 상당한 새로운 테스트 적용 범위가 있습니다.

## 하이라이트

- **MCP-CLI 패리티** — `omx state`, `omx notepad`, `omx project-memory`, `omx trace` 및 `omx code-intel`는 CLI를 통해 MCP 서버 도구를 노출하므로 전송 오버헤드 없이 모든 MCP 작업을 스크립트화할 수 있습니다.
- **HUD 자가 치유** — 새로운 코디네이션(Coordination) 모듈(`src/hud/reconcile.ts`) 및 공유 tmux 도우미(`src/hud/tmux.ts`)는 실제 HUD 프로세스를 실제로 복원하는 프롬프트 제출 복구를 포함하여 세션 경계 전반에 걸쳐 HUD 창을 활성 상태로 유지합니다.
- **네이티브 후크 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 런타임 강화** — 오래된 Ralph 상태, 알 수 없는 `$tokens`, 오래된 중지 후크 차단기, MCP 전송 중단 및 더러운 작업 트리 경합이 모두 해결되었습니다.
- **상태 작업 추출** — `src/state/operations.ts`은 MCP 상태 서버와 새로운 CLI 패리티 인터페이스을 모두 지원하는 깔끔한 읽기/쓰기/지우기/목록/상태 API를 제공합니다.

## 수정 사항 및 변경 사항이 포함되었습니다.

### 추가됨
- MCP-CLI 패리티 인터페이스: `omx state`, `omx notepad`, `omx project-memory`, `omx trace`, `omx code-intel`
- HUD 코디네이션(Coordination) 모듈(`src/hud/reconcile.ts`)
- `src/hud/tmux.ts`로 추출된 공유 HUD tmux 도우미
- 상태 작업 모듈(`src/state/operations.ts`)
- 경로 순회 안전 유틸리티(`src/utils/paths.ts`)

### 결정된
- 프롬프트 제출 복구 중 OMX CLI 항목을 통한 HUD 복구(#1413, #1414)
- `omx setup` 새로 고침 중에 사용자 소유 Codex 후크가 유지됩니다.
- HUD 프롬프트 제출 레이아웃 변경이 중지되었습니다.
- 오래된 Ralph 상태 및 알 수 없는 `$tokens`에서 중복된 네이티브 후크 연속
- `startTeam()` 시간에 오래된 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업 트리 정리(#1354, #1382)
- 스킬(Skill) 상태 정규화 후 오래된 스톱훅 심층 인터뷰 억제
- 네이티브 오래된 차단 기술 상태 신뢰 중지
- MCP 수송 사망 지연 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 복구
- 더러운 작업 트리의 안전을 약화시키지 않고 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)을 깔끔하게 종료하세요.
- EXIT로만 범위가 제한된 분리된 세션 트랩(신호로 트리거되는 정리 없음)
- CI 정지 방지 및 분해 데드타임 감소(#1405)

### 변경됨
- `omx state`을 통해 일관되게 라우팅(Routing)되는 상태 CLI
- Tmux 세션 이름 잘림은 이름이 120자를 초과할 때 세션 토큰을 유지합니다.
- `0.12.4`에 동기화된 릴리스 메타데이터

## 검증 증거

- `npm run build` ✅
- `npx biome lint src/` ✅ (435개 파일 정리)
- `npm test` — 3070개 테스트 중 3068개 테스트를 통과했습니다. 2개의 실패(`dispatch request store keeps failed requests failed`, `sendWorkerMessage keeps failed hook receipts failed`)는 `main`에도 있는 커밋 `3a193cfb`에 의해 발생했습니다. 이는 **기존 계약 테스트 실패**이며 이번 릴리스에서 도입된 회귀가 아닙니다.

## 남은 위험

- 확인은 로컬입니다. 전체 GitHub Actions 매트릭스 재실행이 아닙니다.
- HUD 코디네이션(Coordination) 및 MCP-CLI 패리티는 새로운 인터페이스입니다. 출시 후 모니터링은 tmux가 없는 환경 및 도구 이름 앨리어싱의 엣지 케이스를 감시해야 합니다.
- 실패한 디스패치 영수증 지속성과 관련된 2가지 기존 계약 테스트 실패는 해결되지 않은 상태로 남아 있으며 후속 조치로 추적해야 합니다.
