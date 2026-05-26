# Ralph 지속성 릴리스 게이트

이 체크리스트는 Ralph 지속성 롤아웃을 위한 하드 게이트입니다.
CI/릴리스 유효성 검사는 아래 필수 시나리오가 누락되거나 실패하는 경우 반드시 실패해야 합니다.

## 롤아웃 정책(이 포트에 대해 수정됨)

- 릴리스 N: 명시적 옵트인 플래그 `OMX_RALPH_PERSISTENCE_PORT=1` 뒤에 있습니다.
- 다음 이후에만 N+1 기본 활성화 결정을 해제합니다.
  - 패리티 드리프트는 깨끗하게 유지됩니다.
  - 취소 지표에는 세션 간 손상이 표시되지 않습니다.
  - 게이트 시나리오 V1~V10은 CI에서 녹색으로 유지됩니다.

## 검증 매트릭스 게이트

| ID | Scenario | Required evidence | Status |
|---|---|---|---|
| V1 | Session-scoped Ralph lifecycle + bounded same-session adoption into empty current scope | `src/cli/__tests__/session-scoped-runtime.test.ts` + `src/mcp/__tests__/trace-server.test.ts` + `src/hooks/__tests__/notify-hook-ralph-resume.test.ts` + `src/hooks/__tests__/notify-hook-session-scope.test.ts` + `src/modes/__tests__/base-session-scope.test.ts` | [x] |
| V2 | Root fallback compatibility (HUD) | `src/hud/__tests__/state.test.ts` | [x] |
| V3 | Canonical PRD/progress precedence + migration | `src/ralph/__tests__/persistence.test.ts` | [x] |
| V4 | Phase vocabulary enforcement | `src/mcp/__tests__/state-server-ralph-phase.test.ts` | [x] |
| V5 | Cancel standalone Ralph terminalization | `src/cli/__tests__/session-scoped-runtime.test.ts` | [x] |
| V6 | Cancel Ralph linked mode behavior | `src/cli/__tests__/session-scoped-runtime.test.ts` | [x] |
| V7 | Team/Ralph lifecycle separation | Standalone-team deprecation covered by team CLI/runtime tests and Ralph persistence gate contract checks | [x] |
| V8 | Cross-session safety + single-owner migration without replacing an existing current-scope Ralph file | `src/cli/__tests__/session-scoped-runtime.test.ts` + `src/mcp/__tests__/trace-server.test.ts` + `src/hooks/__tests__/notify-hook-ralph-resume.test.ts` + `src/hooks/__tests__/notify-hook-session-scope.test.ts` + `src/modes/__tests__/base-session-scope.test.ts` | [x] |
| V9 | Upstream parity evidence | `docs/reference/ralph-upstream-baseline.md` + `docs/reference/ralph-parity-matrix.md` | [x] |
| V10 | CI/release gate enforcement | `.github/workflows/ci.yml` + `src/verification/__tests__/ralph-persistence-gate.test.ts` | [x] |

### 명시적 시나리오 체크리스트

- [x] V1 세션 범위 Ralph 수명 주기 + 빈 현재 범위에 제한된 동일 세션 채택
- [x] V2 루트 대체 호환성(HUD)
- [x] V3 정식 PRD/진행 우선 순위 + 마이그레이션
- [x] V4 단계 어휘 시행
- [x] V5 독립형 Ralph 터미널화 취소
- [x] V6 Ralph 연결 모드 동작 취소
- [x] V7 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 연결 단말 전파
- [x] V8 교차 세션 안전 + 기존 현재 범위 Ralph 파일을 교체하지 않고 단일 소유자 마이그레이션
- [x] V9 업스트림 패리티 증거
- [x] V10 CI/릴리스 게이트 적용

## 필수 서류

- `docs/contracts/ralph-state-contract.md`
- `docs/contracts/ralph-cancel-contract.md`
- `docs/reference/ralph-upstream-baseline.md`
- `docs/reference/ralph-parity-matrix.md`

## 릴리스 노트 요구 사항

Ralph 지속성을 다루는 모든 릴리스에서는 반드시 다음을 언급해야 합니다.

1. 세션 권한 범위 정책,
2. 비어 있는 현재 범위에 대해서만 제한된 동일 Codex 세션 채택 동작,
3. 레거시 호환성 창(`.omx/prd.json` 및 `.omx/progress.txt`),
4. 현재 릴리스의 옵트인 플래그 동작입니다.
