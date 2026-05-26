# 오마이코덱스 v0.8.6

출시일: 2026-03-07

`main..dev`의 비병합 커밋 4개.
기여자: [@Yeachan-Heo](https://github.com/Yeachan-Heo).

## 하이라이트

### 이벤트 인식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 대기 및 런타임 코디네이션(Coordination)

이제 OMX team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 오케스트레이션은 터미널 완료 외에도 정식 team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 이벤트를 기다릴 수 있습니다.

이 릴리스에는 다음이 추가됩니다.
- `omx_run_team_wait`에 대한 추가 `wake_on=event` / `after_event_id` 지원
- team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 상태 레이어의 공유 이벤트 읽기, 정규화 및 커서 도우미
- 계약, 런타임 상태 및 API 상호 운용성을 통한 정식 이벤트 유형 지정
- `omx team await <team-name>` CLI 지원
- 레거시 `worker_idle` 호환성을 유지하면서 `worker_state_changed`의 런타임 방출
- 알림 대체 감시자 디스패치/드파트 진행 및 지연된 리더 상태에 대한 더 강력한 가시성

홍보: [#609](https://github.com/Yeachan-Heo/oh-my-codex/pull/609)

### GPT-5.4 즉각적인 지침 출시 및 확장

OMX의 프롬프트 및 워크플로 화면은 OpenAI의 GPT-5.4 프롬프트 안내 패턴을 더 잘 반영하기 위해 두 단계로 업데이트되었습니다.

코어 인터페이스 패스([#611](https://github.com/Yeachan-Heo/oh-my-codex/pull/611), 주소 [#608](https://github.com/Yeachan-Heo/oh-my-codex/issues/608)):
- 루트 `AGENTS.md`
- `templates/AGENTS.md`
- `prompts/executor.md`
- `prompts/planner.md`
- `prompts/verifier.md`
- `src/config/generator.ts`에 `developer_instructions` 텍스트를 생성했습니다.
- 신속한 계약 기대에 대한 집중 회귀 범위

확장 패스([#612](https://github.com/Yeachan-Heo/oh-my-codex/pull/612), [#611](https://github.com/Yeachan-Heo/oh-my-codex/pull/611) 후속 조치):
- 더 광범위한 에이전트(Agent) 프롬프트 카탈로그(`analyst`, `architect`, `debugger`, `researcher`, `security-reviewer`, `writer` 등)
- `analyze`, `autopilot`, `build-fix`, `code-review`, `plan`, `ralph`, `ralplan`, `security-review`, `team` 및 `ultraqa`을 포함한 실행 중심 기술
- 프롬프트 카탈로그, 시나리오 예제, 웨이브 2 지침 및 기술 지침 계약에 대한 추가 회귀 적용 범위

이제 행동 강조는 다음을 더욱 명확하게 다룹니다.
- 기본적으로 컴팩트하고 정보 밀도가 높은 출력
- 명확하고 위험도가 낮으며 되돌릴 수 있는 다음 단계에 대한 자동 후속 조치
- 작업 중간 사용자 재정의에 대한 현지화된 처리
- 정확성이 검색, 진단 또는 검증에 달려 있는 경우 계속 도구 사용
- 프롬프트와 기술 전반에 걸쳐 의도된 실행 계약을 강화하는 시나리오 스타일 예

## 버그 수정

### team(멀티 worker(실제작업을 수행하는 실행단위) 인터페이스 실행 오케스트레이션) 작전 게이트웨이 계약 복원

이벤트 인식 대기 변경 사항이 적용된 후 병합 후 후속 조치를 통해 `team-ops` 게이트웨이에 대한 의도된 공개 내보내기 인터페이스이 복원되었습니다.

수정: 실수로 `teamEventLogPath` 다시 내보내기를 제거하여 엄격한 `team-ops` 모듈 계약 테스트가 안정적으로 유지되도록 합니다.

홍보: [#610](https://github.com/Yeachan-Heo/oh-my-codex/pull/610)

## 통계 비교

- 커밋 창: **4개의 비병합 커밋**(`2026-03-07`)
- 차이점 스냅샷(`main...dev`): **69개 파일 변경됨, +1,745 / -71**

## 전체 커밋 로그(v0.8.5..v0.8.6)

```
9d3e2a2 fix(team): harden leader follow-up and event-aware waiting (#609)
c13290a fix(team): keep team-ops gateway contract stable (#610)
9d4b1ea feat: apply GPT-5.4 prompt-guidance patterns
76e3918 feat: expand GPT-5.4 prompt guidance across prompts and skills
```
