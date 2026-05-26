# PR 초안: `feat/omx-sparkshell`을 `experimental/dev`로 리베이스

## 대상 지점
`experimental/dev`

## 요약
이 PR은 `omx sparkshell` 기능 라인을 `experimental/dev`로 리베이스하고 그 위에 구축된 후속 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 검사 작업을 유지합니다.

기본 Rust 지원 `omx sparkshell <command> [args...]` 흐름과 함께 창 인식 검사 메타데이터와 리더 분류를 위해 즉시 실행 가능한 Sparkshell 명령을 표시하는 `omx team status` 개선 사항의 긴 시퀀스를 추가합니다.

## 포함된 내용
### `omx sparkshell`
- `omx sparkshell`에 대한 CLI 디스패치/도움말을 추가합니다.
- 기본 바이너리 검색 및 실행을 위해 `src/cli/sparkshell.ts`을 추가합니다.
- `native/omx-sparkshell/` 아래에 Rust 상자를 추가합니다.
- 패키징/빌드 도우미를 추가합니다.
  - `scripts/build-sparkshell.mjs`
  - `scripts/test-sparkshell.mjs`
- `bin/native/linux-x64/omx-sparkshell` 아래에 패키지된 네이티브 바이너리를 준비합니다.
- 집중적인 CLI + 패키징 테스트 추가

### `omx team status` 검사 개선
- 텍스트 및 JSON 출력의 리더/HUD/작업자 창 ID
- 창당 직접 Sparkshell 검사 명령
- 우선순위 검사 대기열 및 `inspect_next`
- 사망/미신고 근로자 타겟팅
- 다음을 포함하여 더욱 풍부한 권장 검사 메타데이터:
  - 작업자 CLI, 역할, 활성, 색인, 차례/활동 컨텍스트
  - 작업 ID, 제목, 설명, 상태, 수명 주기, 승인, 클레임, 종속성
  - 작업 트리/런타임 경로 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)/작업자 상태 아티팩트 경로
  - 구조화된 `recommended_inspect_items` JSON 페이로드

## 리베이스/통합 수정 사항 포함
- `experimental/dev` CLI/explore 인터페이스을 Sparkshell 명령 라우팅(Routing)과 병합했습니다.
- 루트 Cargo 작업 공간에서 `native/omx-sparkshell`을 제외하여 매니페스트 경로 화물 명령이 다시 작동합니다.
- 리베이스 후 누락된 compat doctor 픽스처를 새로 고치거나 추가했습니다.
- 현재 홈 디렉토리에서 작업 디렉토리를 동적으로 해결하기 위해 강화된 MCP team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작업 정리
- 새로 표시된 클레임 잠금 검사 메타데이터에 대한 업데이트된 테스트

## 현지 검증
- `npm run lint`
- `npm run check:no-unused`
- `npm run build:full`
- `cargo test --manifest-path native/omx-sparkshell/Cargo.toml`
- `node scripts/build-sparkshell.mjs`
- `node scripts/test-sparkshell.mjs`
- `node bin/omx.js sparkshell cargo --version`
- `node bin/omx.js sparkshell npm --version`
- `node bin/omx.js sparkshell git log --oneline -3`
- `npm test`

## 메모
- `npm test`은 패키징 정리의 일부로 단계적으로 패키징된 Sparkshell 바이너리를 제거합니다. 나중에 추적된 바이너리를 복원했습니다.
- `native/omx-sparkshell/target/` 아래의 기본 Rust 빌드 아티팩트는 확인 후 제거되었습니다.
