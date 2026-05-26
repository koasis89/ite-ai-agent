# 오마이코덱스 v0.8.8

출시일: 2026-03-08

`main..dev`의 비병합 커밋 5개.
기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

## 하이라이트

### 경사 방지 작업 흐름 롤아웃

OMX는 이제 안내/카탈로그 인터페이스 전반에 걸쳐 경사 방지 작업 흐름을 제공합니다.

이번 릴리스:
- 루트 및 템플릿 `AGENTS.md`에 경사 방지 작업 흐름 지침을 추가합니다.
- 전용 `skills/ai-slop-cleaner/SKILL.md` 인터페이스 도입
- 새 워크플로에 대한 카탈로그 매니페스트 및 생성된 카탈로그 출력을 업데이트합니다.
- 안티 슬롭 작업 흐름 계약에 대한 회귀 적용 범위를 추가합니다.

홍보: [#634](https://github.com/Yeachan-Heo/oh-my-codex/pull/634)

### team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 추론 노력은 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)원별로 할당될 수 있습니다.

이제 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 실행은 작업자 구성을 하나의 획일적인 기본값으로 처리하는 대신 런타임 및 작업자 시작 경로에 대해 더 깊은 추론 노력 결정을 전달합니다.

이번 릴리스:
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션)원별 추론 노력을 위해 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 모델 계약 논리를 확장합니다.
- 해당 설정을 전파하기 위해 런타임, 크기 코디네이션(Coordination) 및 tmux 세션 동작을 업데이트합니다.
- 런타임, tmux 세션 및 모델 계약 경로에 대한 회귀 적용 범위를 추가합니다.
- 새로운 동작을 반영하기 위해 README 및 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 기술 지침을 새로 고칩니다.

홍보: [#642](https://github.com/Yeachan-Heo/oh-my-codex/pull/642)

## 버그 수정 및 운영 개선

### 심층 인터뷰 자동 승인 잠금 강화

알림 후크 및 키워드 감지 논리가 강화되어 심층 인터뷰 자동 승인 주입이 잠금 상태로 유지되고 테스트에서 더 잘 다루어집니다.

홍보: [#637](https://github.com/Yeachan-Heo/oh-my-codex/pull/637)

### 패키징 및 라우팅(Routing) 계약 수정

이 릴리스에는 다음과 같은 소규모 계약 수정 사항도 포함되어 있습니다.
- 게시된 npm bin 경로를 정규화하고 package-bin 회귀 범위([#638](https://github.com/Yeachan-Heo/oh-my-codex/pull/638))를 업데이트합니다.
- PR [#641](https://github.com/Yeachan-Heo/oh-my-codex/pull/641)을 통한 회귀 적용 범위를 사용하여 프롬프트 안내 라우팅에서 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 모드에 대한 작업자 역할을 명시적으로 예약합니다.

## 통계 비교

- 커밋 창: **5개의 비병합 커밋**(`2026-03-08` ~ `2026-03-08`)
- Diff snapshot (`main...dev`): **29 files changed, +1,061 / -203**

## 전체 커밋 로그(`main..dev`)

```text
d6dae26 feat(team): allocate reasoning effort per teammate (#642)
ac675d0 feat: add anti-slop workflow (#634)
a4e6e35 fix(pkg): normalize npm bin path (#638)
4352f30 fix: lock deep-interview auto-approval injection (#637)
274d5e7 fix: reserve worker role for team mode
```
