# Troubleshoot-03 — winapp-manual-v2 §4.1/§4.7/§4.8 기본 명령 검증 & 인자 파싱 누락 수정

> 작성일: 2026-05-24
> 대상: [desktop-app만들기/stage2/winapp-manual-v2.md](../winapp-manual-v2.md) **§4.1 기본 명령 실행**, **§4.7 진단 명령군 A (WIN-021)**, **§4.8 진단 명령군 B (WIN-022)**
> 관련 코드: [desktop/renderer/app.ts](../../../desktop/renderer/app.ts), [desktop/renderer/index.html](../../../desktop/renderer/index.html), [desktop/ipc/commands.ts](../../../desktop/ipc/commands.ts)

---

## 1. 검증 범위 & 방법

매뉴얼 §4.1 표(allow-list)와 §4.7/§4.8 의 "입력 예시" 컬럼에 적힌 문자열들을 **명령 실행 패널의 단일 Command 입력란**에 그대로 입력했을 때 매뉴얼이 기술한 응답이 나오는지를 코드 정적 검사 + 흐름 추적으로 검증했다.

검증 대상 입력(매뉴얼 발췌):

- §4.1: `state_get_status`, `question_demo`
- §4.7 (Group A): `hud_get_snapshot`, `sidecar_get_snapshot`, `sidecar_get_snapshot my-team`, `versions_get`, `platform_get`, `history_list`, `history_list 5`, `event_bus_stats`, `sidecar_get_snapshot ../../etc`
- §4.8 (Group B): `state_get_field platform`, `state_get_field bogus_field`, `question_ask "계속 진행할까요?" 예 아니오 나중에`, `noop_echo a b c`, `noop_sleep 120`, `noop_sleep 200`, `noop_sleep 99999`

## 2. 발견된 핵심 결함 — 렌더러가 args 를 분리하지 않음

### 2.1 증상

다음 입력은 **매뉴얼 기대와 달리 모두 `UNKNOWN_COMMAND` 로 실패**한다:

- `sidecar_get_snapshot my-team`
- `history_list 5`
- `state_get_field platform`
- `state_get_field bogus_field`
- `question_ask "계속 진행할까요?" 예 아니오 나중에`
- `noop_echo a b c`
- `noop_sleep 120` / `noop_sleep 200` / `noop_sleep 99999`

반면 인자 없는 입력(`hud_get_snapshot`, `versions_get`, `platform_get`, `history_list`, `event_bus_stats`, `sidecar_get_snapshot`, `state_get_status`, `question_demo`)은 정상 동작한다.

### 2.2 근본 원인

[desktop/renderer/app.ts](../../../desktop/renderer/app.ts) 의 `runCommand` 및 실행 버튼 클릭 핸들러(WIN-007 부터 미수정):

```ts
// 수정 전
if (runButton) {
  runButton.addEventListener("click", async () => {
    const command = (commandInput?.value || "state_get_status").trim() || "state_get_status";
    await runCommand(command);   // ← 입력란 전체를 command 문자열로 통째 전달
  });
}

const runCommand = async (command: string): Promise<void> => {
  // ...
  const response = await window.omx?.runCommand({ command });   // ← args 필드 없음
  // ...
};
```

즉, 사용자가 `history_list 5` 라고 입력하면 main IPC 에는 `{ command: "history_list 5", args: [] }` 로 전달되고, main 측 allow-list 검사(`allowedCommands.includes("history_list 5")`)에서 **즉시 `UNKNOWN_COMMAND`** 로 거부된다.

main 측([desktop/ipc/commands.ts](../../../desktop/ipc/commands.ts))의 zod 스키마(`RunCommandRequestSchema`), 명령별 인자 스키마(`StateGetFieldArgsSchema`, `QuestionAskArgsSchema`, `NoopEchoArgsSchema`, `NoopSleepArgsSchema`), `switch (command)` 분기 모두 **정상 구현**되어 있다 — 문제는 오직 렌더러 측 입력 파싱 부재.

### 2.3 부수 영향

- `index.html` 의 안내 문구(§4.1 강조 텍스트 "기본 허용 명령(WIN-021/022/023): ...") 은 명령 *이름* 만 나열하고 인자 입력법은 설명하지 않음 — 사용자가 매뉴얼 §4.7/§4.8 을 보고 인자를 적어도 동작하지 않는 UX 부정합.
- 히스토리 Replay 버튼은 `entry.command` 만 재전송하고 `entry.args` 는 사용하지 않음 → 인자 명령은 replay 도 실패.

## 3. 수정 내용 — 단일 입력란 → `{command, args[]}` 분해

### 3.1 [desktop/renderer/app.ts](../../../desktop/renderer/app.ts)

**(a)** `parseCommandLine(raw)` 헬퍼 신설 — 공백 분리 + 단/이중 인용 보존 + `\` 이스케이프(인용 내부) + args 최대 10개로 클램프(main zod 정합).

```ts
const parseCommandLine = (raw: string): { command: string; args: string[] } => {
  const tokens: string[] = [];
  let buf = "";
  let quote: '"' | "'" | null = null;
  let escape = false;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (escape) { buf += ch; escape = false; continue; }
    if (ch === "\\" && quote !== null) { escape = true; continue; }
    if (quote) {
      if (ch === quote) { quote = null; continue; }
      buf += ch; continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (/\s/.test(ch)) {
      if (buf.length > 0) { tokens.push(buf); buf = ""; }
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0) tokens.push(buf);
  const [command = "", ...rest] = tokens;
  return { command, args: rest.slice(0, 10) };
};
```

**(b)** `runCommand(command, args=[])` 시그니처 확장 — IPC 페이로드에 `args` 동봉, 히스토리에도 args 저장, 타임라인 표시 문자열은 `command + args.join(" ")`.

```ts
const runCommand = async (command: string, args: string[] = []): Promise<void> => {
  const display = args.length > 0 ? `${command} ${args.join(" ")}` : command;
  addTimeline(`command.started - ${display}`);
  // ...
  const historyId = history.start(command, args.length > 0 ? args : undefined);
  // ...
  const response = await window.omx?.runCommand({ command, args });
  // ...
};
```

**(c)** 실행 버튼 핸들러 — `parseCommandLine` 호출 후 전달.

```ts
runButton.addEventListener("click", async () => {
  const raw = (commandInput?.value ?? "").trim() || "state_get_status";
  const { command, args } = parseCommandLine(raw);
  await runCommand(command || "state_get_status", args);
});
```

**(d)** 히스토리 Replay — `entry.args` 도 함께 재전송.

```ts
if (target.dataset.action === "replay") {
  event.stopPropagation();
  const entry = history.get(id);
  if (entry) void runCommand(entry.command, entry.args ?? []);
  return;
}
```

### 3.2 변경 없음 — 의도적 보존 항목

- main 측 zod 검증/`switch` 분기는 **수정 무관 영역**. 이미 매뉴얼 §4.7/§4.8 의 동작을 정확히 구현하고 있어 그대로 둠.
- `sidecar_get_snapshot ../../etc` 류 패턴 위배는 main 의 `TEAM_NAME_RE` 검사로 `Error("sidecar_get_snapshot: invalid teamName ...")` 가 발생하여 응답이 `COMMAND_FAILED` 로 마감됨 — 매뉴얼이 기술한 `INVALID_REQUEST` 와 코드는 "거부됨" 의미는 동일하지만 **정확한 에러 코드 표기 불일치**가 남아 있음(§5 후속 메모 참조).
- 인용/이스케이프 문법은 매뉴얼이 명시하지 않았으나 `question_ask "계속 진행할까요?" ...` 예시가 인용을 전제하므로 표준 셸 호환으로 구현.

## 4. 검증 절차 (재실행 후 수동 체크리스트)

```powershell
npm run build:desktop   # ✅ 통과 확인됨 (tsc 에러 0)
npm run desktop:dev
```

| # | 입력 | 기대 응답 | 확인 |
|---|---|---|---|
| 1 | `state_get_status` | `ok=true`, `data.runtime/platform/versions` | ☐ |
| 2 | `hud_get_snapshot` | `ok=true`, `data.snapshot` 또는 `data.warning` | ☐ |
| 3 | `sidecar_get_snapshot` | `ok=true`, `data.teamName="default"` | ☐ |
| 4 | `sidecar_get_snapshot my-team` | `ok=true`, `data.teamName="my-team"` | ☐ |
| 5 | `sidecar_get_snapshot ../../etc` | `ok=false`, 메시지에 `invalid teamName` 포함 | ☐ |
| 6 | `versions_get` | `ok=true`, `data.node/electron/chrome/v8` | ☐ |
| 7 | `platform_get` | `ok=true`, `data.platform/arch/cwd/hostname` | ☐ |
| 8 | `history_list` | `ok=true`, `data.entries.length ≤ 20` | ☐ |
| 9 | `history_list 5` | `ok=true`, `data.limit=5`, `entries.length ≤ 5` | ☐ |
| 10 | `event_bus_stats` | `ok=true`, `data.subscriberCount ≥ 1`, `counts.command.started ≥ 1` | ☐ |
| 11 | `state_get_field platform` | `ok=true`, `data.field="platform"`, `value` 일치 | ☐ |
| 12 | `state_get_field bogus_field` | `ok=false`, `INVALID_REQUEST` (zod enum 위배) | ☐ |
| 13 | `noop_echo a b c` | `ok=true`, `data.args=["a","b","c"]`, `count=3` | ☐ |
| 14 | `noop_sleep 200` | `ok=true`, `data.actualMs ≥ 200`, 타임라인 started/completed Δt ≈ 200ms | ☐ |
| 15 | `noop_sleep 99999` | `ok=false`, `INVALID_REQUEST` (0..5000 범위 초과) | ☐ |
| 16 | `question_ask "테스트?" yes no` | 모달 표시 → 응답 후 `data.answer.kind/value` | ☐ |
| 17 | `question_demo` | 모달 표시 → 응답 후 `data.answer` | ☐ |
| 18 | (입력란 비움 + 실행) | 기본값 `state_get_status` 실행 | ☐ |
| 19 | 실패 시나리오 버튼 | `ok=false`, `UNKNOWN_COMMAND` | ☐ |
| 20 | (#13 실행 후) 히스토리에서 Replay | 동일 args 로 재실행, 결과 패널 갱신 | ☐ |

## 5. 후속 개선 메모

- **에러 코드 일관화**: 매뉴얼은 `INVALID_REQUEST` 라 표기하지만 main 측은 일부 분기에서 `Error(...)` 를 던져 `COMMAND_FAILED` 로 마감된다(`sidecar_get_snapshot` teamName 검사, `history_list` limit 검사 등). 매뉴얼 표기와 일치시키려면 zod 스키마 분기로 흡수하거나 매뉴얼을 `INVALID_REQUEST | COMMAND_FAILED` 로 완화해야 한다.
- **인용 문법 안내**: `index.html` 명령 패널 안내에 `question_ask "질문" 옵션1 옵션2` 같은 인용 예시를 추가하면 발견성 ↑.
- **자동 회귀**: §4.7/§4.8 검증 표를 [desktop/__tests__](../../../desktop/__tests__) 의 `vitest` 케이스로 옮기면 다음 회귀에 즉시 catch 됨(현재는 수동 매뉴얼 테스트만 존재).

## 6. 변경 파일 요약

- [desktop/renderer/app.ts](../../../desktop/renderer/app.ts) — `parseCommandLine` 신설, `runCommand` 시그니처 확장(`args[]` 수용), 실행 버튼/Replay 핸들러 결선

**Status**: ✅ 코드 수정 + 빌드 통과 / 수동 검증 체크리스트 §4 대기
