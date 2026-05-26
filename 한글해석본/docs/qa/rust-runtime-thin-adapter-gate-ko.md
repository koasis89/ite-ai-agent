# Rust 런타임 씬 어댑터 릴리스 게이트

이 체크리스트는 Rust-core + Thin-Adapter 컷오버에 대한 하드 게이트입니다.
CI/릴리스 유효성 검사는 아래의 필수 시나리오가 누락된 경우 실패해야 합니다.
실패.

## 검증 매트릭스 게이트

| ID | Scenario | Required evidence | Status |
|---|---|---|---|
| G1 | Team status reads the manifest-authored compatibility view | `src/compat/__tests__/rust-runtime-compat.test.ts` | [x] |
| G2 | Doctor preserves manifest-first tmux/session precedence | `src/compat/__tests__/rust-runtime-compat.test.ts` | [x] |
| G3 | HUD preserves session-scoped state precedence over root fallback | `src/compat/__tests__/rust-runtime-compat.test.ts` | [x] |
| G4 | Thin-adapter contract docs stay aligned with the reader compatibility lane | `docs/contracts/rust-runtime-thin-adapter-contract.md` + `src/verification/__tests__/rust-runtime-thin-adapter-gate.test.ts` | [x] |
| G5 | Watcher send-keys parity stays covered by the Step 3 companion suites | `src/hooks/__tests__/notify-hook-team-dispatch.test.ts`, `src/hooks/__tests__/notify-hook-team-leader-nudge.test.ts`, `src/notifications/__tests__/tmux-detector.test.ts` | [x] |

## 사전 분석 시나리오 매핑

| Pre-mortem scenario | Gate(s) |
|---|---|
| Semantic leakage survives into legacy readers | G1, G2, G3, G4 |
| Reader precedence drifts between config/manifest or session/root scopes | G1, G2, G3 |
| Watcher send-keys parity breaks | G5 |
| Mux contract stays tmux-shaped instead of Rust-canonical | G4 |

## 필수 서류

- `docs/contracts/rust-runtime-thin-adapter-contract.md`
- `docs/interop-team-mutation-contract.md`
- `docs/qa/runtime-team-seam-audit-2026-04-01.md`(비게이팅 후속 솔기 스냅샷)

## 비게이팅 후속 감사

현재의 얇은 어댑터 컷오버에는 여전히 소수의 알려진 이음새 간격이 있습니다.
릴리스 게이트 밖에서 의도적으로 추적하는 것입니다. 보다
나머지는 `docs/qa/runtime-team-seam-audit-2026-04-01.md`
메타데이터 해상도 및 호환성 독자 후속 조치.
