# OMX 핵심 시퀀스 및 흐름 다이어그램 (1차)

## 1) 사용자 질의 스트림 처리 시퀀스
```mermaid
sequenceDiagram
  participant U as User
  participant R as Renderer
  participant I as IPC(stream-bridge)
  participant C as Agent CLI

  U->>R: 메시지 전송
  R->>I: startAgentStream
  I->>C: 프로세스 시작
  C-->>I: token/content
  I-->>R: onStreamToken
  C-->>I: done
  I-->>R: onStreamDone
```

## 2) todo 즉시 동기화 시퀀스
```mermaid
sequenceDiagram
  participant C as Agent CLI
  participant P as Stream Parser
  participant I as IPC(stream-bridge)
  participant S as State IPC
  participant R as Renderer

  C-->>P: manage_todo_list tool call
  P-->>I: tool_call 이벤트
  I->>S: pushTodoState(payload)
  S-->>R: onTodoChange
  R->>R: Todo Panel 갱신
```

## 3) state_write 처리 시퀀스
```mermaid
sequenceDiagram
  participant M as MCP/IPC Caller
  participant O as state.operations
  participant T as transition.reconcile
  participant F as File System

  M->>O: state_write(mode, payload)
  O->>O: scope/path 검증
  O->>O: write lock 획득
  O->>T: 전환 규칙 평가/자동완료
  T-->>O: decision
  O->>F: atomic write(tmp->rename)
  O->>O: canonical skill sync
  O-->>M: 성공/오류 응답
```

## 4) task claim 및 전이 시퀀스
```mermaid
sequenceDiagram
  participant I as IPC(task)
  participant S as task-service
  participant A as OMX Team API

  I->>S: readTask(taskId)
  S->>A: read-task
  A-->>S: task(status, version)
  I->>S: claimTask(taskId, version)
  S->>A: claim-task --version
  A-->>S: ok / Conflict
  I->>S: transitionTaskStatus
  S->>A: transition-task-status
```

## 5) hooks 로그 브리지 시퀀스
```mermaid
sequenceDiagram
  participant H as HookTailer
  participant D as EventDispatcher
  participant B as Broadcaster
  participant R as Renderer

  H-->>D: JSONL line
  D->>D: JSON parse + schema validate
  D->>B: 일반/우선 채널 분기
  B-->>R: runtime-hook-event
```

## 6) 상태 전이도 (요약)
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> active: start
  active --> waiting_interlude: interlude-start
  waiting_interlude --> active: ack
  active --> completed: done(exitCode=0)
  active --> failed: done(exitCode!=0)
  active --> cancelled: stop
  completed --> idle
  failed --> idle
  cancelled --> idle
```

## 7) IPC 이벤트 흐름도
```mermaid
flowchart LR
  A[Renderer Request] --> B[startAgentStream]
  B --> C[stream-bridge-ipc]
  C --> D[stream-parser]
  D --> E1[token]
  D --> E2[tool_call]
  D --> E3[done]
  E1 --> F1[onStreamToken]
  E2 --> F2[onStreamToolCall]
  E2 --> G[state-ipc.pushTodoState]
  G --> F3[onTodoChange]
  E3 --> F4[onStreamDone]
  F1 --> H[Renderer UI]
  F2 --> H
  F3 --> H
  F4 --> H
```
