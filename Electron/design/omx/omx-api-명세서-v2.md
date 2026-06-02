# OMX API 명세서 v2

## 0. 문서 정보
- 문서명: OMX 공개 API 명세서
- 버전: v2.0
- 작성일: 2026-05-30
- 작성자: 고종훈
- 상태: 초안
- 범위: Electron/design/omx 하위 모듈의 외부 인터페이스(공개 API) 집계

## 1. 문서 개요

### 1.1 목적
OMX 시스템의 모든 공개 API 명세를 제공하고, 모듈 간 호출을 표준화하여 예측 가능한 상호작용을 보장한다. 이 문서는 Electron의 Main/Renderer 프로세스, IPC 채널, UI 컴포넌트 등에서 외부 시스템이나 런타임이 호출할 수 있는 API를 포괄적으로 정의한다.

이 문서는 **"OMX 백엔드 시스템을 이용하여 개발할 때 OMX의 파일이나 모듈의 기능을 가져다 쓰려면 어떤 함수(또는 채널, 컴포넌트, 명령어)를 써야 하는가"**를 집대성한 종합 개발 명세서로서, 실제 API 명세뿐만 아니라 사용 가이드와 코드 예시도 포함한다.

### 1.2 범위
총 35개 모듈의 공개 API (src/ 하위의 모든 TypeScript 모듈). 내부 인터페이스나 테스트 전용 모듈은 제외한다.

해당 문서에서 정의하는 "공개 API(Public API)"는 **Electron 앱(src/ 하위)을 구성하는 각 TypeScript 모듈들이 서로를 호출할 때 사용하는 '코드 레벨의 함수와 인터페이스'**를 포괄적으로 의미합니다.

해당문서에서 API의 실제 의미를 4가지로 분류된다.

#### 1. TypeScript 모듈 함수 (가장 주된 의미)
  대부분의 API는 코드 상에서 import하여 직접 실행할 수 있는 비동기/동기 TypeScript 함수를 의미합니다.
  예시 (Team 모듈): CLI에서 omx team start를 치는 것이 아니라, 코드 내부에서 아래처럼 함수를 직접 호출하는 방식입니다.
  typescript
  import { startTeam, monitorTeam, shutdownTeam } from '@/team';
  const team = await startTeam({ name: 'feature-team', ... });
#### 2. IPC 채널 및 브리지 (Main ↔ Renderer 통신)
  Electron 아키텍처 특성상, UI(Renderer)와 백단(Main)이 통신하기 위한 채널과 이벤트 리스너도 API로 취급합니다. Renderer가 Main에 메시지를 보내거나(Main → Renderer) Main이 Renderer로 데이터를 푸시하는(Renderer → Main) 모든 IPC 채널과 이벤트 리스너는 API 명세에 포함됩니다.
  예시: window.electronAPI.startAgentStream(...)
#### 3. React UI 컴포넌트
  UI 화면을 구성하기 위한 렌더링 블록들도 다른 모듈에서 가져다 쓸 수 있는 공개 표면(API)으로 정의하고 있습니다.
  예시: <ChatContainer />, <LifecycleDashboard /> 등
#### 4. CLI 엔트리포인트
  CLI 명령어 자체를 API로 취급합니다. 문서의 cli 모듈이나 team 모듈 일부를 보면, 외부 시스템이나 셸 스크립트에서 호출할 수 있는 진입점(Entry point)으로서 CLI 명령어를 API로 명세하고 있습니다.
  예시: omx launch, omx team api claim-task 등

### 1.3 비범위
- 내부 구현 상세 및 로직
- 렌더러 내부 React 훅
- 테스트 전용 mock 및 픽스처

### 1.4 용어정의
- **IPC (Inter-Process Communication):** Main 프로세스와 Renderer 프로세스 간의 통신 채널.
- **HUD:** 실시간 시스템 상태와 메트릭을 보여주는 Heads-Up Display.
- **MCP (Model Context Protocol):** 모델이 외부 상태/컨텍스트에 접근하기 위한 프로토콜.
- **슬롯 (Slot):** Auth 키 및 토큰을 격리하여 관리하는 인증 단위.
- **훅 (Hook):** 사용자 입력에서 특정 동작을 트리거하는 키워드.
- **파이프라인 (Pipeline):** 여러 검증/실행 단계를 선언적으로 묶어 순차 처리하는 체인.

## 2. 설계 원칙

### 2.1 공개 API 안정성
공개 API는 외부 의존성 없이 단독 임포트 및 호출이 가능해야 한다.

### 2.2 동일 입력 동일 출력
같은 입력에 대해 같은 출력을 반환하는 순수 함수 지향 설계를 권장한다. 사이드 이펙트 발생 시 명시한다.

### 2.3 비동기 완료 명확성
비동기 함수는 Promise나 Stream의 형태로 완료 시점을 명확히 반환해야 한다.

### 2.4 문자열 식별자
모든 열거형 상태나 식별자는 String Literal Union을 사용한다 (숫자 enum 사용 금지).

### 2.5 3단계 패턴
모든 주요 액션은 `Validate(검증) -> Execute(실행) -> Return(결과 반환)`의 3단계를 거친다.

### 2.6 렌더/상태 경계
렌더러(UI)는 전역 상태를 직접 수정하지 않으며, 반드시 IPC를 통해 Main 프로세스에 상태 변경을 요청해야 전역 상태가 변경된다.

## 3. 공통 규약

### 3.1 입력 규약
명시적인 필수 파라미터가 누락된 경우 즉시 예외(Throw)를 발생시킨다. 선택적 속성만 명시적으로 `undefined`를 허용한다.

### 3.2 출력 규약
모든 공개 API의 반환값은 JSON 직렬화가 가능한 타입이어야 한다 (함수나 클래스 인스턴스 반환 지양).

### 3.3 부작용 규약
부작용(파일 쓰기, 프로세스 실행 등)이 있는 함수는 그 의도를 함수명(동사 prefix: `init`, `flush`, `reset`, `clear`)에 드러내야 한다.

### 3.4 안정성 규약
Public API는 Semver 기준으로 Minor 버전까지 하위 호환성을 보장한다.

### 3.5 변경 규약
Deprecated API는 JSDoc의 `@deprecated` 태그로 마킹하며, 최소 2번의 Minor 릴리스가 지난 후 코어에서 완전히 제거한다.

## 4. 데이터 모델

### 4.1 핵심 엔티티
- `AgentConfig`, `SlotConfig`, `PipelineConfig`, `QuestionRecord`, `TeamConfig`, `HookEvent`, `LogEntry`

### 4.2 공통 스키마
```typescript
type OperationResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 4.3 열거형
- `SlotStatus`: 'active' | 'idle' | 'error'
- `PipelineStage`: 'init' | 'running' | 'done' | 'failed'
- `TeamStatus`: 'provisioning' | 'ready' | 'working' | 'shutdown'

### 4.4 상태 전이 규칙
- **Slot:** `idle` -> `active` -> `idle` | `error`
- **Pipeline:** `init` -> `running` -> `done` | `failed`

### 4.5 IPC 채널 페이로드
Main-Renderer 간에 오가는 모든 IPC 메시지는 JSON 직렬화 가능한 단순 객체로 구성한다.

## 5. API 목록 요약

### 5.1 도메인별 분류표
| 분류 | 모듈 목록 | 주요 역할 |
|---|---|---|
| **실행/런타임** | core, runtime, cli, main, ipc, scripts | 프로세스 실행 경계, CLI 명령, 스트림 처리, IPC 브리지 |
| **워크플로** | pipeline, planning, question, goal-workflows, performance-goal, ralph, ralplan, autoresearch, team | 작업 단계 오케스트레이션, 실행 합의, 목표/완료 상태 관리 |
| **관측/지원** | logs, hud, sidecar, ops, notifications, openclaw | 실행 로깅, 실시간 메트릭(HUD), 오류 진단 및 알림 전송 |
| **상태/설정/유틸** | state, services, env, utils, mcp, auth, catalog, adapt, agents, wiki, renderer, components, test | 통합 상태 저장/공유, 인증/슬롯, 설정 관리 및 UI 컴포넌트 제공 |

### 5.2 엔드포인트 매트릭스
*(전체 모듈 및 공개 API 목록은 12.5 절 "API 완전판 명세" 참조)*

## 6. API 상세 (사용 가이드 및 코드 예시)

각 도메인별 대표 모듈의 실제 사용 예시 코드 패턴을 제공한다.

### 6.1 실행/런타임 (core, runtime, cli, main, ipc, scripts)

```typescript
// [예시] 프로세스 실행 스트리밍 패턴 (scripts 모듈)
import { executeCommand } from '@/scripts';

const result = await executeCommand('omx explore --prompt "list entry points"', {
  onEnvelope: (env) => console.log('[envelope]', env),
  onRawLine: (line) => process.stdout.write(line),
  onDone: (code) => console.log('프로세스 완전 종료:', code),
  onError: (err) => console.error('실행 중 에러 발생:', err),
});
```

```typescript
// [예시] Renderer 프로세스의 IPC 스트림 구독 패턴 (ipc, main 모듈 연동)
window.electronAPI.startAgentStream({ sessionId: 'abc123', prompt: '사용자 입력' });

window.electronAPI.onStreamToken((token: string) => {
  appendToChat(token);
});

window.electronAPI.onStreamEnd(() => {
  finalizeChat();
});
```

### 6.2 워크플로 (pipeline, planning, question, team 등)

```typescript
// [예시] 파이프라인(Pipeline) 생명주기 관리
import { runPipeline } from '@/pipeline';

const result = await runPipeline({
  id: 'pipe-001',
  stages: [
    { name: 'explore', fn: () => exploreRepo() },
    { name: 'analyze', fn: (ctx) => analyzeResult(ctx) },
    { name: 'report', fn: (ctx) => generateReport(ctx) },
  ],
  onStageComplete: (stage, ctx) => console.log(`✓ ${stage.name} 완료`),
  onError: (stage, err) => console.error(`✗ ${stage.name} 에러:`, err),
});
```

```typescript
// [예시] Q&A (Question) 상호작용 생명주기
import { createQuestionRecord, waitForQuestionAnswer } from '@/question';

const record = await createQuestionRecord({
  question: '어떤 배포 방식을 원하십니까?',
  options: ['azd up', 'manual az cli', 'GitHub Actions'],
  sessionId: 'sess-abc',
});

// 사용자의 답변이 올 때까지 블로킹 대기 (타임아웃 30초)
const answer = await waitForQuestionAnswer(record.id, { timeoutMs: 30000 });
console.log('선택된 답변:', answer.value);
```

```typescript
// [예시] 멀티 에이전트 팀(Team) 관리
import { startTeam, monitorTeam, shutdownTeam } from '@/team';

const team = await startTeam({
  name: 'feature-team',
  workers: ['executor', 'verifier'],
  maxWorkers: 4,
  task: '결제 모듈 코드 구현 및 검증',
});

const status = await monitorTeam(team.id);
console.log('팀 현재 진행 상황:', status.phase, status.progress);

// 작업 종료 후 자원 회수
await shutdownTeam(team.id);
```

### 6.3 관측/지원 (logs, notifications 등)

```typescript
// [예시] LLM 로깅 및 토큰 추적 (logs)
import { init as initLogs, logLlmRequest, flushLlmResponse } from '@/logs';

initLogs({ level: 'debug', outputFile: 'omx.log' });

const reqId = logLlmRequest({
  model: 'gpt-4o',
  prompt: '주어진 코드를 리팩토링 해줘',
  sessionId: 'sess-abc',
});

// ... LLM 스트리밍 완료 후 통계 정보 기록
flushLlmResponse(reqId, {
  response: '리팩토링 된 코드 결과...',
  tokensUsed: 420,
  latencyMs: 1400,
});
```

```typescript
// [예시] 시스템 알림 전송 (notifications)
import { notify } from '@/notifications';

notify({
  type: 'success',
  title: '인프라 배포 완료',
  body: 'Azure Container Apps 배포가 성공적으로 완료되었습니다.',
  duration: 5000,
});
```

### 6.4 상태/설정/유틸 (state, auth, wiki 등)

```typescript
// [예시] 공통 State 읽기/쓰기 (state)
import { executeStateOperation } from '@/state';

// 상태 조회
const data = await executeStateOperation('state_read', {
  key: 'currentSession',
  namespace: 'runtime',
});

// 상태 저장
await executeStateOperation('state_write', {
  key: 'currentSession',
  namespace: 'runtime',
  value: { id: 'sess-001', startedAt: Date.now() },
});
```

```typescript
// [예시] Auth 슬롯 로테이션 및 핫스왑 (auth)
import { listSlots, useSlot, runAuthHotswap } from '@/auth';

const slots = await listSlots();
const activeSlot = slots.find(s => s.status === 'active');
if (!activeSlot) {
  await useSlot({ slotId: slots[0].id });
}

// 할당량 소진 시 키 교체 수행
await runAuthHotswap({
  slotId: activeSlot.id,
  newApiKey: process.env.NEW_API_KEY!,
});
```

```typescript
// [예시] 위키 지식 베이스 검색/주입 (wiki)
import { ingestKnowledge, queryWiki } from '@/wiki';

// 새로운 아키텍처 문서 주입
await ingestKnowledge({
  source: 'docs/architecture.md',
  tags: ['architecture', 'design'],
  namespace: 'project',
});

// 관련 지식 검색
const results = await queryWiki({
  query: 'API 설계 원칙 문서 어디있어?',
  namespace: 'project',
  topK: 5,
});

results.forEach(r => console.log(r.title, '유사도:', r.score));
```

### 6.5 파이프라인 (Pipeline) 생명주기 관리
여러 실행 단계를 선언적으로 구성하고 순차적으로 처리하는 예시입니다.

```typescript
import { runPipeline } from '@/pipeline';

const result = await runPipeline({
  id: 'pipe-001',
  stages: [
    { name: 'explore', fn: () => exploreRepo() },
    { name: 'analyze', fn: (ctx) => analyzeResult(ctx) },
    { name: 'report', fn: (ctx) => generateReport(ctx) },
  ],
  onStageComplete: (stage, ctx) => console.log(`✓ ${stage.name} 완료`),
  onError: (stage, err) => console.error(`✗ ${stage.name} 에러:`, err),
});
```

### 6.6 Q&A (Question) 상호작용
사용자에게 질문을 던지고, 선택된 답변이 올 때까지 대기(블로킹)하는 패턴입니다.

```typescript
import { createQuestionRecord, waitForQuestionAnswer } from '@/question';

// 1. 질문 레코드 생성
const record = await createQuestionRecord({
  question: '어떤 배포 방식을 원하십니까?',
  options: ['azd up', 'manual az cli', 'GitHub Actions'],
  sessionId: 'sess-abc',
});

// 2. 사용자의 답변이 올 때까지 블로킹 대기 (타임아웃 30초)
const answer = await waitForQuestionAnswer(record.id, { timeoutMs: 30000 });
console.log('선택된 답변:', answer.value);
```

### 6.7  공통 State (상태) 읽기/쓰기
state 모듈을 사용하여 글로벌 세션 상태를 저장하거나 읽어오는 예시입니다. 모든 상태 변경은 이 통합 API를 거칩니다.

```typescript
import { executeStateOperation } from '@/state';

// 상태 조회
const data = await executeStateOperation('state_read', {
  key: 'currentSession',
  namespace: 'runtime',
});

// 상태 저장
await executeStateOperation('state_write', {
  key: 'currentSession',
  namespace: 'runtime',
  value: { id: 'sess-001', startedAt: Date.now() },
});

```

### 6.8 Auth (인증) 슬롯 로테이션 및 핫스왑
API 키의 할당량이 소진되었을 때, 다른 인증 슬롯으로 전환(핫스왑)하는 로직입니다.

```typescript
import { listSlots, useSlot, runAuthHotswap } from '@/auth';

const slots = await listSlots();
const activeSlot = slots.find(s => s.status === 'active');

if (!activeSlot) {
  await useSlot({ slotId: slots[0].id });
}

// 할당량 소진 시 키 교체 수행
await runAuthHotswap({
  slotId: activeSlot.id,
  newApiKey: process.env.NEW_API_KEY!, // 새로운 키 주입
});

```

### 6.9 Wiki (지식 베이스) 검색 및 주입
Markdown 문서를 위키에 주입하고, 유사도를 기반으로 지식을 검색하는 예시입니다.

```typescript
import { ingestKnowledge, queryWiki } from '@/wiki';

// 새로운 아키텍처 문서 주입
await ingestKnowledge({
  source: 'docs/architecture.md',
  tags: ['architecture', 'design'],
  namespace: 'project',
});

// 관련 지식 검색 (유사도 기반 top 5)
const results = await queryWiki({
  query: 'API 설계 원칙 문서 어디있어?',
  namespace: 'project',
  topK: 5,
});

results.forEach(r => console.log(r.title, '유사도:', r.score));

```

### 6.10 시스템 통합 시나리오 (Hooks + Pipeline + State)
사용자의 프롬프트에서 특정 훅(키워드)을 감지하고, 그에 맞는 파이프라인을 동적으로 실행한 뒤, 결과를 글로벌 상태에 기록하는 종합 예시입니다.

```typescript
import { detectKeywords } from '@/hooks';
import { runPipeline } from '@/pipeline';
import { executeStateOperation } from '@/state';

async function handleUserInput(userInput: string) {
  // 1. 트리거 훅 감지
  const hookResult = detectKeywords(userInput, { activeHooks: ['$ralph', '$team'] });

  if (hookResult.matched) {
    console.log('매칭된 훅:', hookResult[0].keyword);

    // 2. 동적 파이프라인 구성 및 실행
    const pipelineResult = await runPipeline({
      id: `pipe-${Date.now()}`,
      stages: [
        { name: 'plan', fn: () => generatePlan(userInput) },
        { name: 'execute', fn: (ctx) => executeTask(ctx.plan) },
        { name: 'verify', fn: (ctx) => verifyResult(ctx) },
      ],
    });
    
    // 3. 파이프라인 결과를 글로벌 상태에 영구 보존
    await executeStateOperation('state_write', {
      key: 'lastPipelineResult',
      namespace: 'session',
      value: pipelineResult,
    });
    
    return pipelineResult;
  }
}

```
OMX API는 모듈별로 명확한 함수(runPipeline, executeStateOperation, queryWiki 등)를 외부에 노출(export)하여, 다른 시스템이나 런타임에서 이를 조합해 사용할 수 있도록 설계되어 있습니다.

## 7. 이벤트/스트림

### 7.1 주요 IPC 채널 및 역할
Main 프로세스와 Renderer 간의 비동기 통신을 담당하는 핵심 채널입니다. 각 채널은 명확한 데이터 책임을 가집니다.

| 채널명 | 방향 | 설명 |
|---|---|---|
| `onStreamToken` | Main → Renderer | LLM이 생성한 실시간 텍스트 조각(Token) 전달 |
| `onStreamToolCall` | Main → Renderer | 에이전트의 외부 도구 호출 시도 알림 |
| `onLifecycleChange` | Main → Renderer | 시스템 수명주기(시작, 대기, 완료, 실패) 상태 변경 |
| `onTodoChange` | Main → Renderer | 할일 목록의 동적 변경 사항 브로드캐스트 |
| `onInterludeStart` | Main → Renderer | 사용자 답변이 필요한 질문 세션(Interlude) 진입 |

### 7.2 이벤트 페이로드 스키마
이벤트 채널을 통해 전달되는 데이터의 표준 인터페이스입니다.

```typescript
// [Token] 실시간 텍스트 전달
interface StreamTokenPayload {
  streamId: string;
  textChunk: string;
}

// [ToolCall] 도구 호출 정보
interface StreamToolCallPayload {
  streamId: string;
  toolName: string;
  args?: Record<string, any>;
}

// [Lifecycle] 시스템 상태 전이
interface LifecyclePayload {
  status: 'idle' | 'active' | 'waiting-interlude' | 'completed' | 'failed';
  activeMode?: string;
  updatedAt: string;
  reason?: string;
}
```

### 7.3 스트림 데이터 처리 규칙
1. **순서 보장:** 스트림 데이터는 발생 순서가 중요하므로, Renderer는 수신된 순서대로 버퍼링하거나 UI에 렌더링해야 한다.
2. **멀티 세션 격리:** 모든 스트림 이벤트에는 `streamId`가 포함되어야 하며, UI는 현재 활성 세션과 일치하는 ID의 이벤트만 처리한다.
3. **완료 상태 전이:** 에이전트 실행이 종료되면 `onStreamDone` 이벤트를 통해 최종 종료 코드(exit code)와 결과를 전달하여 UI를 확정 상태로 변경한다.

### 7.4 [예시] Renderer에서 스트림 수신 및 렌더링 (React)
Renderer 프로세스에서 스트림 토큰을 받아 실시간으로 대화 내용을 업데이트하는 구현 예시입니다.

```typescript
import React, { useEffect, useState } from 'react';

export function ChatStreamView({ activeStreamId }: { activeStreamId: string }) {
  const [streamText, setStreamText] = useState('');

  useEffect(() => {
    // 토큰 수신 리스너 등록
    const removeListener = window.electronAPI.onStreamToken((payload: StreamTokenPayload) => {
      // 현재 활성화된 스트림 ID와 일치하는 경우만 텍스트 누적
      if (payload.streamId === activeStreamId) {
        setStreamText((prev) => prev + payload.textChunk);
      }
    });

    // 클린업: 컴포넌트 언마운트 시 리스너 해제
    return () => removeListener();
  }, [activeStreamId]);

  return (
    <div className="streaming-content">
      {streamText}
      <span className="cursor">|</span>
    </div>
  );
}
```

### 7.5 [예시] Main에서 이벤트 브로드캐스트 (Main)
백엔드 서비스에서 발생한 상태 변화나 스트림 데이터를 모든 렌더러 창으로 전송하는 예시입니다.

```typescript
import { webContents } from 'electron';

/**
 * 특정 스트림 토큰을 UI로 전파
 */
function broadcastToken(streamId: string, token: string) {
  const payload: StreamTokenPayload = { streamId, textChunk: token };
  
  // 열려있는 모든 윈도우에 전송
  webContents.getAllWebContents().forEach(wc => {
    wc.send('onStreamToken', payload);
  });
}

/**
 * 에이전트 실행 완료 통보
 */
function broadcastStreamDone(streamId: string, exitCode: number) {
  webContents.getAllWebContents().forEach(wc => {
    wc.send('onStreamDone', { streamId, exitCode });
  });
}
```

## 8. 보안
- **8.1 인증키 관리:** 모든 키는 메모리 및 `auth` 슬롯 형태로만 관리되며, 코드나 로그에 직접 노출하지 않는다.
- **8.2 입력 검증:** IPC로 수신되는 모든 인자는 `zod` 등의 스키마 검증 도구로 무결성을 확인한다.
- **8.3 로깅 및 마스킹:** API 키나 토큰 값은 로그 적재 시 자동으로 `***` 마스킹 처리된다 (`redactAuthSecrets`).
- **8.4 감사 로그:** 중요 인증 정보의 변경(hotswap 등)은 반드시 audit 이벤트로 남긴다.

### 8.5 [예시] 민감 정보 마스킹 (redactAuthSecrets)
로그 출력 시 API 키나 토큰이 평문으로 유출되는 것을 방지하기 위한 정규식 기반 마스킹 처리 예시입니다.

```typescript
/**
 * 로그 문자열 내의 민감한 인증 정보를 찾아 마스킹 처리
 */
export function redactAuthSecrets(text: string): string {
  // OpenAI(sk-...), Google(AIza...) 등 일반적인 키 패턴 및 Bearer 토큰 마스킹
  const patterns = [
    /sk-[a-zA-Z0-9]{32,}/g,
    /AIza[a-zA-Z0-9_-]{35}/g,
    /bearer\s+[a-zA-Z0-9._\-\/]+/gi
  ];

  let redacted = text;
  patterns.forEach(pattern => {
    redacted = redacted.replace(pattern, '***REDACTED***');
  });

  return redacted;
}
```

### 8.6 [예시] Zod를 이용한 IPC 입력 검증
Main 프로세스에서 Renderer로부터 전달받은 IPC 페이로드의 무결성을 검증하는 패턴입니다.

```typescript
import { z } from 'zod';

// 1. 스키마 정의
const StartStreamSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().max(10000),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7)
  }).optional()
});

// 2. 핸들러에서의 검증 적용
ipcMain.handle('start-stream', async (event, payload) => {
  const result = StartStreamSchema.safeParse(payload);
  
  if (!result.success) {
    // 구조화된 에러 응답 반환
    throw new Error(`ERR_VALIDATION: ${JSON.stringify(result.error.format())}`);
  }

  const validatedData = result.data;
  // ... 검증된 데이터를 사용하여 비즈니스 로직 수행
});
```

## 9. 성능/운영
- **9.1 응답 기준 (SLA):** 동기 처리는 응답속도 100ms 이내, IPC 통신 오버헤드 200ms 이내, LLM 스트림 첫 토큰은 2초 내 반환을 목표로 한다.
- **9.2 인메모리 캐싱:** 자주 불리는 Catalog나 Wiki 메타데이터는 5분의 인메모리 TTL 캐시를 적용한다.
- **9.3 HUD 메트릭:** HUD 모듈을 통해 Token/sec, 파이프라인 단계 진행, 활성 워커 등의 속도를 실시간 모니터링한다.
- **9.4 오류 복구 (Fallback):** 예상치 못한 LLM 연결 에러가 발생한 경우 최대 3회 자동 재시도 후 알림을 발송한다.

## 10. 테스트/검증
- **10.1 단위 테스트:** 각 모듈을 독립적으로 검증 (`*.test.ts` 파일 기반 - vitest 사용).
- **10.2 통합/계약 테스트:** Main과 Renderer의 IPC end-to-end 환경 검증 및 API 입출력 타입 스키마(zod 베이스) 테스트를 수행한다 (`*.integrated.test.ts`).
- **10.3 회귀 방지 메커니즘:** PR 배포 전 전체 API Contract 및 통합 테스트가 반드시 통과되어야 한다(CI Gate).

## 11. 마이그레이션 가이드 (v1 -> v2)
- **11.1 v1 -> v2 변경점:** 함수 호출이 모듈 기반 Named Import 체계로 통폐합되었다. 중복 유틸리티 함수들은 `utils` 및 `state` 쪽으로 단일화되었다.
- **11.2 Deprecated 정책:** 구버전 API는 JSDoc `@deprecated`로 2개의 Minor 버전까지 유지되며, IDE 내에서 즉시 취소선으로 표시된다. 
- **11.3 마이그레이션 권장 3단계:** 
  1. 저장소 내의 deprecated API 검색/탐지.
  2. V2의 대체 신규 API(명칭 및 파라미터 구조 변경 적용) 교체.
  3. Zod 기반 타입체크 및 테스트 통과 확인.

## 12. 부록

### 12.1 에러 코드 통합 가이드
| 에러 타입 | 설명 | 해결 조치 |
|---|---|---|
| `ERR_AUTH_QUOTA` | 할당량 소진 또는 키 무효 | 슬롯 핫스왑 필요 |
| `ERR_IPC_TIMEOUT` | Main-Renderer 통신 응답 지연 | 스트림 정리 후 재시도 |
| `ERR_VALIDATION` | Zod 스키마 검증 실패 | 전달 파라미터 타입 재확인 |
| `ERR_STATE_LOCKED` | Pipeline 중복 점유 시도 | 기존 렌더 종료/Cancel 후 재호출 |

### 12.2 샘플 시나리오 통합 적용 (TypeScript)
훅 트리거를 기반으로 여러 모듈(hooks, pipeline, state)이 연동되는 통합 파이프라인의 예시 코드다.

```typescript
import { detectKeywords } from '@/hooks';
import { runPipeline } from '@/pipeline';
import { executeStateOperation } from '@/state';

async function handleUserInput(userInput: string) {
  // 1. 트리거 훅 감지
  const hookResult = detectKeywords(userInput, { activeHooks: ['$ralph', '$team'] });

  if (hookResult.matched) {
    console.log('매칭된 훅:', hookResult[0].keyword);

    // 2. 동적 파이프라인 구성 및 실행
    const pipelineResult = await runPipeline({
      id: `pipe-${Date.now()}`,
      stages: [
        { name: 'plan', fn: () => generatePlan(userInput) },
        { name: 'execute', fn: (ctx) => executeTask(ctx.plan) },
        { name: 'verify', fn: (ctx) => verifyResult(ctx) },
      ],
    });
    
    // 3. 파이프라인 결과를 글로벌 상태에 영구 보존
    await executeStateOperation('state_write', {
      key: 'lastPipelineResult',
      namespace: 'session',
      value: pipelineResult,
    });
    
    return pipelineResult;
  }
}
```

### 12.3 FAQ & 12.4 참조 문서 링크
- **Q:** "Main 쪽 부작용 API는 어디에 있나요?" **A:** `scripts` 및 `core`의 커맨드 실행 컨텍스트에 모여 있습니다.
- **문서 참조 링크:** `Electron/design/*-module-design.md` 상세 문서를 참고하세요.

---

### 12.5 API 완전판 명세

#### 11.2 adapt
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `resolveAdaptPaths(cwd, target)` | 타겟별 어댑터 경로 집합 계산 | `cwd:string, target:string` | `AdaptPathSet` | 파일 쓰기 전 경로 먼저 계산 | `resolveAdaptPaths(process.cwd(), "hermes")` |
| `listAdaptTargets()` | 지원 타겟 목록 반환 | `void` | `string[]` | adapt 타겟 선택 UI/CLI에 사용 | `const t = listAdaptTargets()` |
| `getAdaptTargetDescriptor(target)` | 타겟 descriptor 조회 | `target:string` | `AdaptTargetDescriptor \| null` | 미지원 타겟 방어 | `if (!getAdaptTargetDescriptor(t))` |
| `buildAdaptPlanningLink(cwd)` | planning artifact 연결 정보 생성 | `cwd:string` | `string` | 보고서 상단 참조 링크 생성 | `const link = buildAdaptPlanningLink(cwd)` |
| `buildAdaptEnvelope(cwd, target)` | 타겟용 envelope 생성 | `cwd:string, target:string` | `AdaptEnvelope` | handoff용 메타 생성 | `const env = buildAdaptEnvelope(cwd, t)` |
| `buildAdaptEnvelopeForTarget(cwd, target)` | 특정 타겟 envelope 생성(명시 API) | `cwd:string, target:string` | `AdaptEnvelope` | target별 분기 코드에서 사용 | `buildAdaptEnvelopeForTarget(cwd, "openclaw")` |
| `buildAdaptProbeReportForTarget(cwd, target)` | probe 보고서 생성 | `cwd:string, target:string` | `AdaptProbeReport` | 외부 런타임 상태 진단 | `const r = buildAdaptProbeReportForTarget(cwd, t)` |
| `buildAdaptStatusReportForTarget(cwd, target)` | status 보고서 생성 | `cwd:string, target:string` | `AdaptStatusReport` | 운영 대시보드 입력 | `buildAdaptStatusReportForTarget(cwd, t)` |
| `buildAdaptDoctorReportForTarget(cwd, target)` | doctor 보고서 생성 | `cwd:string, target:string` | `AdaptDoctorReport` | 장애 진단 문서화 | `buildAdaptDoctorReportForTarget(cwd, t)` |
| `initAdaptFoundation(cwd, target, write?, now?)` | 어댑터 기초 파일 초기화 | `cwd:string, target:string, write?:boolean, now?:Date` | `AdaptInitResult` | preview 후 write=true 권장 | `initAdaptFoundation(cwd, t, true)` |

#### 11.3 agents
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getAgent(name)` | 에이전트 정의 조회 | `name:string` | `AgentDefinition \| undefined` | 설치 전 존재 확인 | `const a = getAgent("executor")` |
| `getAgentsByCategory(category)` | 카테고리별 에이전트 목록 | `category:string` | `AgentDefinition[]` | UI 필터링에 사용 | `getAgentsByCategory("workflow")` |
| `getAgentNames()` | 전체 에이전트 이름 목록 | `void` | `string[]` | 자동완성 목록 생성 | `const names = getAgentNames()` |
| `generateAgentToml(agent, promptContent, options)` | TOML 구성 생성 | `agent:AgentDefinition, promptContent:string, options:object` | `string` | 설치 파일 본문 생성 | `const toml = generateAgentToml(a,p,o)` |
| `composeRoleInstructions(promptContent, metadata, resolvedModel)` | 역할 지시문 합성 | `string, object, string` | `string` | 설치 전 최종 프롬프트 구성 | `composeRoleInstructions(p,m,model)` |
| `installNativeAgentConfigs(pkgRoot, options)` | 네이티브 에이전트 설치 | `pkgRoot:string, options:object` | `InstallResult` | force/dryRun 옵션 사용 | `installNativeAgentConfigs(root,{dryRun:true})` |
| `getInstallableNativeAgentNames(manifest)` | 설치 대상 이름 계산 | `manifest:CatalogManifest` | `string[]` | setup 단계에서 설치 집합 결정 | `getInstallableNativeAgentNames(m)` |
| `assertNativeAgentCanonicalTargets(manifest)` | canonical target 유효성 검증 | `manifest:CatalogManifest` | `void (throws)` | 설치 전 필수 검증 | `assertNativeAgentCanonicalTargets(m)` |

#### 11.4 auth
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readAuthConfig(cwd?, home?)` | 인증 설정 읽기 | `cwd?:string, home?:string` | `AuthConfig` | 시작 시 1회 로드 | `const cfg = readAuthConfig()` |
| `resolveOmxAuthDir(home?)` | auth 디렉터리 경로 계산 | `home?:string` | `string` | 파일 접근 전 경로 계산 | `resolveOmxAuthDir()` |
| `resolveSlotPath(slot, home?)` | 슬롯 파일 경로 계산 | `slot:string, home?:string` | `string` | 슬롯별 파일 접근 | `resolveSlotPath("slot-a")` |
| `listSlots(home?)` | 슬롯 목록 조회 | `home?:string` | `AuthSlotRecord[]` | 회전 후보 목록 생성 | `listSlots()` |
| `addSlotFromAuthFile(slot, liveAuthPath, home?, now?)` | 현재 auth를 슬롯으로 추가 | `slot:string, liveAuthPath:string, home?:string, now?:Date` | `AuthSlotRecord` | 신규 슬롯 등록 | `addSlotFromAuthFile("slot-b", path)` |
| `useSlot(slot, liveAuthPath, home?, now?)` | 슬롯 활성화 | `slot:string, liveAuthPath:string, home?:string, now?:Date` | `UseSlotResult` | 실행 직전 슬롯 전환 | `useSlot("slot-a", live)` |
| `buildRotationPlan(slots, config, currentSlot?)` | 회전 순서 계산 | `slots:AuthSlotRecord[], config:AuthConfig, currentSlot?:string` | `RotationPlan` | quota 시 다음 슬롯 탐색 | `buildRotationPlan(slots,cfg)` |
| `isQuotaError(signal, config?)` | quota 에러 판정 | `signal:unknown, config?:AuthConfig` | `boolean` | stderr/응답 검사 | `if (isQuotaError(err,cfg))` |
| `redactAuthSecrets(value)` | 민감정보 마스킹 | `value:string` | `string` | 로그 출력 전 호출 | `log(redactAuthSecrets(text))` |
| `findLatestRolloutSession(codexHome, fallbackHome?)` | 최근 롤아웃 세션 조회 | `codexHome:string, fallbackHome?:string` | `string \| null` | resume 기준 세션 탐색 | `findLatestRolloutSession(home)` |
| `runAuthHotswap(...)` | 인증 핫스왑 실행 | `options:object` | `HotswapResult` | quota 시 자동 전환 실행 | `runAuthHotswap({mode:"auto"})` |

#### 11.5 autoresearch
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `loadAutoresearchMissionContract(missionDir)` | 미션/샌드박스 계약 로드 | `missionDir:string` | `AutoresearchMissionContract` | 루프 시작 전에 필수 | `loadAutoresearchMissionContract(dir)` |
| `parseSandboxContract(content)` | sandbox 문서 파싱 | `content:string` | `AutoresearchSandboxContract` | YAML frontmatter 검증 | `parseSandboxContract(md)` |
| `parseEvaluatorResult(raw)` | evaluator 결과 파싱 | `raw:string` | `AutoresearchEvaluatorResult` | evaluator stdout 처리 | `parseEvaluatorResult(stdout)` |
| `prepareAutoresearchRuntime(contract, projectRoot, opts)` | 런타임/워크트리 준비 | `contract:object, projectRoot:string, opts:object` | `AutoresearchRunManifest` | iteration 0 준비 | `prepareAutoresearchRuntime(c,root,o)` |
| `runAutoresearchEvaluator(contract, worktreePath, ...)` | evaluator 실행 | `contract:object, worktreePath:string, ...` | `AutoresearchEvaluationRecord` | 후보 생성 후 판정 | `runAutoresearchEvaluator(c,p)` |
| `decideAutoresearchOutcome(manifest, candidate, eval)` | keep/discard 결정 | `manifest:object, candidate:object, eval:object` | `AutoresearchDecision` | evaluator 결과 해석 | `decideAutoresearchOutcome(m,c,e)` |
| `advanceAutoresearchRun(contract, manifest, projectRoot)` | 다음 iteration 준비 | `contract:object, manifest:object, projectRoot:string` | `AutoresearchAdvanceResult` | keep/discard 후 진행 | `advanceAutoresearchRun(c,m,root)` |
| `createAutoresearchGoal(cwd, options)` | autoresearch 목표 생성 | `cwd:string, options:object` | `AutoresearchGoalState` | goal 파일 초기화 | `createAutoresearchGoal(cwd,opt)` |
| `recordAutoresearchGoalVerdict(cwd, options)` | 목표 판정 기록 | `cwd:string, options:object` | `AutoresearchGoalState` | pass/fail 기록 | `recordAutoresearchGoalVerdict(cwd,o)` |
| `completeAutoresearchGoal(cwd, slug, options)` | 목표 완료 전이 | `cwd:string, slug:string, options:object` | `AutoresearchGoalState` | passed + reconciliation 필요 | `completeAutoresearchGoal(cwd,s,o)` |
| `assessAutoresearchCompletionState(...)` | 완료 가능성 평가 | `state:object, options?:object` | `CompletionAssessment` | 완료 전 pre-check | `assessAutoresearchCompletionState(s)` |

#### 11.6 catalog
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readCatalogManifest(packageRoot?)` | manifest 읽기+검증 | `packageRoot?:string` | `CatalogManifest` | 실패 시 예외 | `readCatalogManifest(root)` |
| `tryReadCatalogManifest(packageRoot?)` | manifest 읽기 시도 | `packageRoot?:string` | `CatalogManifest \| null` | optional 흐름에 사용 | `tryReadCatalogManifest()` |
| `getCatalogCounts(packageRoot?)` | 카운트 통계 반환 | `packageRoot?:string` | `CatalogCounts` | 대시보드 요약 | `getCatalogCounts()` |
| `toPublicCatalogContract(manifest)` | 공개 계약 변환 | `manifest:CatalogManifest` | `PublicCatalogContract` | internal 숨김 처리 | `toPublicCatalogContract(m)` |
| `getSetupInstallableSkillNames(manifest)` | setup 설치 스킬 목록 | `manifest:CatalogManifest` | `string[]` | 설치 후보 집합 생성 | `getSetupInstallableSkillNames(m)` |
| `compareSkillMirror(expectedDir, actualDir, expectedSkillNames, options)` | 미러 일치 검사 | `expectedDir:string, actualDir:string, expectedSkillNames:string[], options?:object` | `SkillMirrorMismatch[] \| null` | CI 검증 | `compareSkillMirror(a,b,names,{})` |
| `validateCatalogManifest(manifest)` | manifest 스키마 검증 | `manifest:unknown` | `CatalogManifest` | 읽기 직후 검증 | `validateCatalogManifest(raw)` |

#### 11.7 cli
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `omx <command> [subcommand] [args...]` | CLI 엔트리 | `argv:string[]` | `number (exitCode)` | command/subcommand 조합 사용 | `omx state state_get_status` |
| `launch` | 실행 환경 시작 | `flags:object` | `LaunchResult` | tmux/direct 정책 따름 | `omx launch --spark` |
| `exec` | 단발 실행 | `task:string` | `ExecResult` | 명령성 작업 수행 | `omx exec "analyze"` |
| `team` | 팀 런타임 명령군 | `subcommand + input` | `TeamApiResult` | team api/send/monitor | `omx team api list-tasks` |
| `ralph` | ralph 모드 명령군 | `subcommand + flags` | `RalphResult` | loop/verify/complete | `omx ralph run` |
| `ultragoal` | 목표 실행 명령군 | `subcommand + flags` | `UltragoalResult` | goal lifecycle 관리 | `omx ultragoal start` |
| `setup` | 설치/초기화 | `flags:object` | `SetupResult` | 초기 개발환경 구성 | `omx setup` |
| `update` | 업데이트 | `flags:object` | `UpdateResult` | 버전/자산 업데이트 | `omx update` |
| `doctor` | 진단 | `flags:object` | `DoctorReport` | 환경 점검 | `omx doctor --json` |
| `explore` | 탐색 명령군 | `prompt/options` | `ExploreResult` | read-only 검색 | `omx explore --prompt "state path"` |
| `sparkshell` | read-only shell 래퍼 | `shell cmd` | `ShellResult` | noisy lookup 분리 | `omx sparkshell -- rg hooks` |
| `api` | API 하위 명령군 | `subcommand` | `ApiResult` | 내부 API 도구 호출 | `omx api ...` |
| `mcp-serve` | MCP 서버 실행 | `server options` | `LongRunning` | stdio 서버 실행 | `omx mcp-serve state` |
| `state` | state 명령군 | `state_*` | `StateResult` | state 작업 수행 | `omx state state_read --mode team` |
| `hooks` | hooks 명령군 | `subcommand` | `HooksResult` | 훅 관리/검증 | `omx hooks validate` |
| `cleanup` | 정리 | `flags` | `CleanupResult` | 임시 상태 정리 | `omx cleanup` |
| `auth` | 인증 명령군 | `subcommand` | `AuthResult` | 슬롯/핫스왑 관리 | `omx auth list-slots` |
| `session` | 세션 명령군 | `subcommand` | `SessionResult` | 세션 조회/제어 | `omx session current` |

#### 11.8 components
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ChatContainer` | 채팅 주 컴포넌트 | `props:ChatContainerProps` | `ReactElement` | 메시지 입력/스트림 렌더 | `<ChatContainer ... />` |
| `LifecycleDashboard` | 실행 상태 패널 | `props:LifecycleDashboardProps` | `ReactElement` | lifecycle 요약 표시 | `<LifecycleDashboard ... />` |
| `TodoPanel` | 할일 패널 | `props:TodoPanelProps` | `ReactElement` | todo 리스트 표시 | `<TodoPanel items={...} />` |
| `TaskTimeline` | 작업 타임라인 | `props:TaskTimelineProps` | `ReactElement` | 단계 히스토리 표시 | `<TaskTimeline entries={...} />` |
| `ModelSelector` | 모델 선택기 | `props:ModelSelectorProps` | `ReactElement` | model 변경 콜백 연결 | `<ModelSelector onChange={...} />` |
| `ApiKeySettings` | API 키 설정 UI | `props:ApiKeySettingsProps` | `ReactElement` | 키 저장/삭제 | `<ApiKeySettings ... />` |
| `AdapterStatusBar` | 어댑터 상태 바 | `props:AdapterStatusBarProps` | `ReactElement` | adapt 상태 표시 | `<AdapterStatusBar ... />` |
| `KnowledgePanel` | 지식 탐색 패널 | `props:KnowledgePanelProps` | `ReactElement` | wiki/query 결과 표시 | `<KnowledgePanel ... />` |
| `ErrorGuideOverlay` | 오류 가이드 오버레이 | `props:ErrorGuideOverlayProps` | `ReactElement` | 에러 복구 안내 | `<ErrorGuideOverlay ... />` |
| `DeferredSkillsNotice` | 지연 스킬 안내 | `props:DeferredSkillsNoticeProps` | `ReactElement` | 지연 상태 알림 | `<DeferredSkillsNotice ... />` |
| `WikiOverlay` | 위키 오버레이 | `props:WikiOverlayProps` | `ReactElement` | 위키 내용 표시 | `<WikiOverlay ... />` |

#### 11.9 core
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `execute-command` | 프로세스 실행 유틸 | `ExecuteCommandInput + callbacks` | `ChildProcessHandle` | onEnvelope/onRawLine/onDone/onError 연결 | `executeCommand({command:"omx",args:["doctor"]}, cb)` |
| `onEnvelope` | 파싱 성공 라인 콜백 | `envelope:object` | `void` | JSON 라인 처리 | `onEnvelope(e)` |
| `onRawLine` | 파싱 실패 라인 콜백 | `line:string` | `void` | 원문 로그 처리 | `onRawLine(line)` |
| `onDone` | 종료 콜백 | `exitCode:number, signal?:string` | `void` | 실행 완료 처리 | `onDone(0)` |
| `onError` | 오류 콜백 | `error:Error` | `void` | 실행 오류 처리 | `onError(err)` |

#### 11.10 env
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `env-checker` 점검 함수 | 실행 전 환경 검사 | `cwd:string, options?:object` | `EnvCheckResult` | 실행 직전에 호출 | `const r = envCheck(cwd)` |
| `점검 결과 객체` | 점검 응답 모델 | `N/A` | `{ok:boolean, checks:CheckResult[], summary:string}` | fail 항목 있으면 차단 | `if (!r.ok) block()` |

#### 11.11 goal-workflows
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createGoalWorkflowRun(cwd, options)` | 목표 런 생성 | `cwd:string, options:GoalWorkflowCreateOptions` | `GoalWorkflowRun` | force 여부 확인 | `createGoalWorkflowRun(cwd,opt)` |
| `readGoalWorkflowRun(cwd, workflow, slug)` | 목표 런 조회 | `cwd:string, workflow:string, slug:string` | `GoalWorkflowRun` | 상태 조회 | `readGoalWorkflowRun(c,w,s)` |
| `transitionGoalWorkflowRun(cwd, workflow, slug, options)` | 상태 전이 | `cwd:string, workflow:string, slug:string, options:TransitionOptions` | `GoalWorkflowRun` | validation 후 전이 | `transitionGoalWorkflowRun(...)` |
| `appendGoalWorkflowLedger(cwd, run, entry)` | ledger append | `cwd:string, run:GoalWorkflowRun, entry:LedgerEntry` | `void` | 감사 이벤트 기록 | `appendGoalWorkflowLedger(c,r,e)` |
| `normalizeGoalWorkflowValidation(input)` | 검증 정규화 | `input:unknown` | `GoalWorkflowValidationSummary` | 완료 조건 전처리 | `normalizeGoalWorkflowValidation(x)` |
| `assertGoalWorkflowCanComplete(validation)` | 완료 가능성 강제 | `validation:GoalWorkflowValidationSummary` | `void (throws)` | complete 전 필수 | `assertGoalWorkflowCanComplete(v)` |
| `buildGoalWorkflowHandoff(options)` | handoff 문구 생성 | `options:GoalWorkflowHandoffOptions` | `string` | 다음 실행 주체 전달 | `buildGoalWorkflowHandoff(o)` |

#### 11.12 hooks
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `detectKeywords(prompt)` | 키워드 목록 탐지 | `prompt:string` | `KeywordMatch[]` | 명시 라우팅 판단 | `detectKeywords(input)` |
| `detectPrimaryKeyword(prompt)` | 대표 키워드 탐지 | `prompt:string` | `KeywordMatch \| null` | 우선 라우팅 1개 선택 | `detectPrimaryKeyword(input)` |
| `parseExplicitSkillInvocations(prompt)` | `$skill` 호출 파싱 | `prompt:string` | `string[]` | 명시 skill 실행 | `parseExplicitSkillInvocations(p)` |
| `recordSkillActivation(input)` | 활성 기록 저장 | `input:SkillActivationInput` | `void` | 훅 이벤트 기록 | `recordSkillActivation(i)` |
| `triagePrompt(prompt)` | fallback triage 판단 | `prompt:string` | `TriageDecision` | 키워드 없을 때 사용 | `triagePrompt(p)` |
| `readTriageConfig()` | triage 설정 읽기 | `void` | `TriageConfig` | 라우팅 정책 로드 | `readTriageConfig()` |
| `readTriageState(opts)` | triage 상태 조회 | `opts?:object` | `TriageState` | 최근 분류 확인 | `readTriageState()` |
| `writeTriageState(decision, opts)` | triage 상태 저장 | `decision:TriageDecision, opts?:object` | `void` | 분류 결과 기록 | `writeTriageState(d)` |
| `applyAgentsMdOverlay(...)` | AGENTS overlay 적용 | `args:object` | `ApplyResult` | 세션 오버레이 주입 | `applyAgentsMdOverlay({...})` |
| `dispatchHookEvent(...)` | 확장 이벤트 디스패치 | `event:HookEvent` | `DispatchResult` | 플러그인 런타임 전달 | `dispatchHookEvent(e)` |

#### 11.13 hud
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readAllState(cwd, config?)` | HUD 상태 수집 | `cwd:string, config?:HudConfig` | `HudRenderContext` | 렌더 전 상태 집계 | `readAllState(cwd)` |
| `renderHud(ctx, preset, options)` | HUD 렌더 | `ctx:HudRenderContext, preset:HudPreset, options?:object` | `string` | 출력 문자열 생성 | `renderHud(ctx,"focused")` |
| `reconcileHudForPromptSubmit(cwd, deps)` | prompt-submit 시 HUD 재조정 | `cwd:string, deps:object` | `ReconcileResult` | pane 중복/리사이즈 처리 | `reconcileHudForPromptSubmit(cwd,deps)` |
| `createHudWatchPane(...)` | HUD watch pane 생성 | `args:object` | `string \| null` | tmux pane 생성 | `createHudWatchPane(...)` |
| `killTmuxPane(...)` | tmux pane 종료 | `paneId:string` | `void` | stale pane 정리 | `killTmuxPane("%3")` |
| `runHudAuthorityTick(options, deps?)` | authority tick 수행 | `options:object, deps?:object` | `Promise<void>` | watch 루프에서 주기 호출 | `await runHudAuthorityTick(o)` |
| `hudCommand(args)` | CLI HUD 엔트리 | `args:string[]` | `Promise<number>` | `omx hud` 구현 | `hudCommand(process.argv.slice(2))` |

#### 11.14 ipc
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `adapter-ipc` | 어댑터 상태 채널 | `invoke payload` | `{ok:boolean,data?:unknown,error?:object}` | adapter probe/status 호출 | `electronAPI.probeAdapter()` |
| `cli-ipc` | CLI 연동 채널 | `invoke payload` | `CliResult` | CLI 정보/실행 요청 | `electronAPI.getCliInfo()` |
| `env-ipc` | 환경 점검 채널 | `invoke payload` | `EnvResult` | preflight 호출 | `electronAPI.checkEnv()` |
| `interlude-ipc` | interlude 채널 | `event/invoke` | `InterludeResult` | 질문/응답 흐름 | `electronAPI.sendInterludeAck(...)` |
| `ops-ipc` | 운영 진단 채널 | `invoke payload` | `OpsReport` | drift/정리 | `electronAPI.runOps(...)` |
| `state-ipc` | 상태 채널 | `invoke/event` | `Lifecycle/Todo payload` | 초기 로드+구독 | `electronAPI.onTodoChange(cb)` |
| `stream-bridge-ipc` | 스트림 채널 | `invoke/event` | `Token/Tool/Done/Error payload` | 실시간 응답 | `electronAPI.onStreamToken(cb)` |
| `task-ipc` | 태스크 채널 | `invoke payload` | `TaskResult` | read/claim/transition | `electronAPI.claimTask(...)` |

#### 11.15 logs
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `init(logDir)` | logger 초기화 | `logDir:string` | `void` | 앱 시작 시 1회 호출 | `init(".omx/logs")` |
| `getLogPath()` | 현재 로그 파일 경로 | `void` | `string \| null` | 경로 표시/디버깅 | `getLogPath()` |
| `logLlmRequest(text, model?)` | 요청 로그 기록 | `text:string, model?:string` | `void` | 요청 시작 시 기록 | `logLlmRequest(prompt,model)` |
| `logLlmResponseToken(token)` | 응답 토큰 누적 | `token:string` | `void` | 스트리밍 중 반복 호출 | `logLlmResponseToken(chunk)` |
| `flushLlmResponse()` | 응답 버퍼 flush | `void` | `void` | done 시 호출 | `flushLlmResponse()` |
| `logToolCall(toolName, args)` | 도구 호출 로그 | `toolName:string, args:unknown` | `void` | tool call 이벤트 기록 | `logToolCall(name,args)` |
| `logSystemMessage(message)` | 시스템 로그 | `message:string` | `void` | 상태 알림 기록 | `logSystemMessage(msg)` |
| `logError(message)` | 오류 로그 | `message:string` | `void` | 오류 시 기록 | `logError(err.message)` |
| `start(logsDir)` | hook tailer 시작 | `logsDir:string` | `void` | hook 로그 구독 시작 | `start(".omx/logs")` |
| `onLine(cb)` | 라인 구독 등록 | `cb:(line:string)=>void` | `void` | dispatch 파이프 연결 | `onLine(dispatcher)` |
| `offLine(cb)` | 라인 구독 해제 | `cb:(line:string)=>void` | `void` | 종료 시 cleanup | `offLine(dispatcher)` |
| `stop()` | tailer 종료 | `void` | `void` | 앱 종료 시 호출 | `stop()` |
| `dispatch(rawLine, broadcast)` | hook 라인 디스패치 | `rawLine:string, broadcast:(ch:string,p:unknown)=>void` | `void` | schema 검증 후 채널 전송 | `dispatch(line,broadcast)` |
| `HOOK_IPC_CHANNEL` | 일반 훅 채널 상수 | `N/A` | `string` | 일반 이벤트 브로드캐스트 채널명 | `mainWindow.webContents.send(HOOK_IPC_CHANNEL,p)` |
| `HOOK_IPC_PRIORITY_CHANNEL` | 우선 훅 채널 상수 | `N/A` | `string` | 우선 이벤트 전용 채널명 | `send(HOOK_IPC_PRIORITY_CHANNEL,p)` |
| `PRIORITY_EVENTS` | 우선 이벤트 집합 | `N/A` | `string[]` | dispatch 분기 기준 | `if (PRIORITY_EVENTS.includes(ev))` |

#### 11.16 main
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `window.electronAPI invoke/on 채널 집합` | Renderer에 노출된 공식 브리지 | `channel payload` | `invoke result / event payload` | preload 통해서만 호출 | `window.electronAPI.startAgentStream(...)` |
| `시작/중단/상태조회/도구호출/인터류드/태스크 엔드포인트` | Main 통합 엔드포인트 그룹 | `endpoint-specific` | `endpoint-specific` | 기능별 채널 분리 사용 | `getLifecycleState -> onLifecycleChange` |

#### 11.17 mcp
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `autoStartStdioMcpServer(name, server)` | stdio MCP 서버 자동 시작 | `name:string, server:McpServer` | `void` | 서버 진입점에서 호출 | `autoStartStdioMcpServer("state",server)` |
| `shouldAutoStartMcpServer(name)` | 자동 시작 여부 판단 | `name:string` | `boolean` | env 플래그 반영 | `if (shouldAutoStartMcpServer("wiki"))` |
| `getBaseStateDir(wd?)` | 기본 상태 루트 경로 | `wd?:string` | `string` | state 경로 계산 시작점 | `getBaseStateDir(cwd)` |
| `getStateDir(wd?, sessionId?)` | scope 상태 디렉터리 | `wd?:string, sessionId?:string` | `string` | 세션별 경로 계산 | `getStateDir(cwd,sid)` |
| `getStatePath(mode, wd?, sessionId?)` | mode 상태 파일 경로 | `mode:string, wd?:string, sessionId?:string` | `string` | read/write 전 경로 계산 | `getStatePath("team",cwd,sid)` |
| `writeMcpLifecycleTelemetry(event, env?)` | 생명주기 telemetry 기록 | `event:object, env?:NodeJS.ProcessEnv` | `Promise<void>` | start/stop 기록 | `await writeMcpLifecycleTelemetry(ev)` |
| `parseNotepadPruneDaysOld(value, defaultDays)` | prune 일수 파싱 | `value:unknown, defaultDays:number` | `number` | 설정값 안전 파싱 | `parseNotepadPruneDaysOld(raw,30)` |

#### 11.18 notifications
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getNotificationConfig(cwd?, opts?)` | 알림 설정 로드 | `cwd?:string, opts?:object` | `FullNotificationConfig` | 발송 전 설정 병합 | `getNotificationConfig(cwd)` |
| `dispatchNotifications(config, payload)` | 알림 발송 | `config:FullNotificationConfig, payload:FullNotificationPayload` | `DispatchResult` | dedupe/cooldown 후 발송 | `dispatchNotifications(cfg,p)` |
| `formatNotification(event, payload)` | 메시지 포맷 생성 | `event:string, payload:object` | `string` | 발송 전 텍스트 생성 | `formatNotification(ev,p)` |
| `renderTemplate(template, vars)` | 템플릿 변수 치환 | `template:string, vars:Record<string,string>` | `string` | 커스텀 메시지 구성 | `renderTemplate(t,v)` |
| `getCurrentTmuxSession()` | tmux 세션 확인 | `void` | `string \| null` | tmux 주입 대상 판단 | `getCurrentTmuxSession()` |
| `captureTmuxPane(paneId?, lines?)` | pane 텍스트 캡처 | `paneId?:string, lines?:number` | `string` | reply context 수집 | `captureTmuxPane("%1",50)` |
| `lookupByMessageId(platform, messageId)` | 메시지 매핑 조회 | `platform:string, messageId:string` | `SessionMapping \| null` | reply 라우팅 | `lookupByMessageId("discord",id)` |
| `notify(payload, config?)` | 단일 알림 엔트리 | `payload:FullNotificationPayload, config?:FullNotificationConfig` | `NotificationResult` | 상위 훅에서 직접 호출 | `notify(payload)` |

#### 11.19 openclaw
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `getOpenClawConfig()` | openclaw 설정 로드 | `void` | `OpenClawConfig` | wake 전에 로드 | `getOpenClawConfig()` |
| `inspectOpenClawConfig()` | 설정 진단 | `void` | `OpenClawInspectResult` | doctor/디버깅에 사용 | `inspectOpenClawConfig()` |
| `resolveGateway(config, event)` | 이벤트별 게이트웨이 결정 | `config:OpenClawConfig, event:string` | `OpenClawGatewayConfig \| null` | 미설정 이벤트 스킵 | `resolveGateway(cfg,"stop")` |
| `interpolateInstruction(template, variables)` | instruction 변수 치환 | `template:string, variables:Record<string,string>` | `string` | payload text 생성 | `interpolateInstruction(t,v)` |
| `validateGatewayUrl(url)` | URL 보안 검증 | `url:string` | `boolean` | SSRF 방지 필수 | `if (!validateGatewayUrl(url))` |
| `wakeGateway(name, config, payload)` | 일반 게이트웨이 호출 | `name:string, config:OpenClawGatewayConfig, payload:OpenClawPayload` | `WakeResult` | http/command 분기 호출 | `wakeGateway("discord",cfg,p)` |
| `wakeCommandGateway(name, config, variables)` | command 게이트웨이 호출 | `name:string, config:OpenClawGatewayConfig, variables:Record<string,string>` | `WakeResult` | opt-in 환경에서만 실행 | `wakeCommandGateway("local",cfg,v)` |
| `wakeOpenClaw(event, context)` | openclaw 통합 엔트리 | `event:string, context:OpenClawContext` | `WakeResult \| null` | 훅에서 단일 진입점 사용 | `wakeOpenClaw("stop",ctx)` |

#### 11.20 ops
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `drift-detector 함수 집합` | 로그/매니페스트 드리프트 분석 API 묶음 | `logsPath:string, manifestPath:string, options?:object` | `DriftReport` | 읽기 전용 진단으로 사용 | `runDriftDetector(paths)` |

#### 11.21 performance-goal
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createPerformanceGoal(cwd, options)` | 목표 생성 | `cwd:string, options:PerformanceGoalCreateOptions` | `PerformanceGoalState` | force 여부 확인 | `createPerformanceGoal(cwd,opt)` |
| `readPerformanceGoal(cwd, slug)` | 목표 조회 | `cwd:string, slug:string` | `PerformanceGoalState` | 상태 확인 | `readPerformanceGoal(cwd,slug)` |
| `startPerformanceGoal(cwd, slug)` | 목표 시작 | `cwd:string, slug:string` | `{state:PerformanceGoalState,instruction:string}` | created -> in_progress | `startPerformanceGoal(cwd,slug)` |
| `checkpointPerformanceGoal(cwd, options)` | 체크포인트 기록 | `cwd:string, options:CheckpointOptions` | `PerformanceGoalState` | pass/fail/blocked 기록 | `checkpointPerformanceGoal(cwd,o)` |
| `completePerformanceGoal(cwd, options)` | 목표 완료 | `cwd:string, options:CompleteOptions` | `PerformanceGoalState` | pass+snapshot 일치 필요 | `completePerformanceGoal(cwd,o)` |
| `buildPerformanceGoalInstruction(state)` | handoff instruction 생성 | `state:PerformanceGoalState` | `string` | 모델 전달 문구 생성 | `buildPerformanceGoalInstruction(state)` |

#### 11.22 pipeline
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `runPipeline(config)` | 파이프라인 실행 | `config:PipelineConfig` | `PipelineResult` | stage 순차 실행 | `runPipeline(cfg)` |
| `canResumePipeline(cwd?)` | 재개 가능 여부 | `cwd?:string` | `boolean` | resume 버튼 활성화 | `canResumePipeline(cwd)` |
| `readPipelineState(cwd?)` | 현재 파이프라인 상태 | `cwd?:string` | `PipelineModeStateExtension \| null` | 중단점 조회 | `readPipelineState(cwd)` |
| `cancelPipeline(cwd?)` | 파이프라인 취소 | `cwd?:string` | `CancelResult` | 안전 종료 처리 | `cancelPipeline(cwd)` |
| `createAutopilotPipelineConfig(task, options)` | 기본 autopilot 구성 생성 | `task:string, options:object` | `PipelineConfig` | 표준 단계 생성 | `createAutopilotPipelineConfig(task,o)` |
| `createStrictAutopilotStages()` | strict 단계 집합 생성 | `void` | `PipelineStage[]` | 품질 강화 모드 | `createStrictAutopilotStages()` |

#### 11.23 planning
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `parsePlanningArtifactFileName(path)` | 파일명 파싱 | `path:string` | `PlanningArtifactNameInfo \| null` | artifact 유형 판별 | `parsePlanningArtifactFileName(p)` |
| `comparePlanningArtifactPaths(left, right)` | 경로 우선순위 비교 | `left:string, right:string` | `number` | 최신 항목 정렬 | `paths.sort(comparePlanningArtifactPaths)` |
| `selectMatchingTestSpecsForPrd(prdPath, testSpecPaths)` | PRD 대응 테스트 스펙 선택 | `prdPath:string, testSpecPaths:string[]` | `string[]` | timestamp 기반 매칭 | `selectMatchingTestSpecsForPrd(prd,specs)` |
| `readPlanningArtifacts(cwd)` | artifact 스캔 | `cwd:string` | `PlanningArtifacts` | 계획 문서 로드 | `readPlanningArtifacts(cwd)` |
| `isPlanningComplete(artifacts)` | 계획 완료 판단 | `artifacts:PlanningArtifacts` | `boolean` | 실행 전 게이트 | `isPlanningComplete(a)` |
| `readLatestPlanningArtifacts(cwd)` | 최신 artifact 조회 | `cwd:string` | `LatestPlanningArtifacts` | 최신 PRD/테스트 선택 | `readLatestPlanningArtifacts(cwd)` |
| `readApprovedExecutionLaunchHintOutcome(cwd, mode, options?)` | 실행 힌트 결과 조회 | `cwd:string, mode:string, options?:object` | `ApprovedExecutionLaunchHintOutcome` | resolved/absent/ambiguous | `readApprovedExecutionLaunchHintOutcome(cwd,"team")` |
| `readApprovedExecutionLaunchHint(cwd, mode, options?)` | 실행 힌트 조회 | `cwd:string, mode:string, options?:object` | `ApprovedExecutionLaunchHint \| null` | 단일 힌트 사용 | `readApprovedExecutionLaunchHint(cwd,"ralph")` |
| `readTeamDagArtifactResolution(cwd)` | team DAG 해석 | `cwd:string` | `TeamDagArtifactResolution` | sidecar/team 실행에 사용 | `readTeamDagArtifactResolution(cwd)` |

#### 11.24 question
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `createQuestionRecord(cwd, input, sessionId?, now?, options?)` | 질문 레코드 생성 | `cwd:string, input:QuestionInput, sessionId?:string, now?:Date, options?:object` | `QuestionRecord` | 질문 시작 시 호출 | `createQuestionRecord(cwd,input)` |
| `readQuestionRecord(recordPath)` | 질문 레코드 조회 | `recordPath:string` | `QuestionRecord` | 상태 확인 | `readQuestionRecord(path)` |
| `updateQuestionRecord(recordPath, updater)` | 질문 레코드 갱신 | `recordPath:string, updater:(r:QuestionRecord)=>QuestionRecord` | `QuestionRecord` | 상태 전이 적용 | `updateQuestionRecord(path,fn)` |
| `markQuestionPrompting(recordPath, renderer)` | prompting 전이 | `recordPath:string, renderer:QuestionRendererState` | `QuestionRecord` | 렌더러 시작 시 | `markQuestionPrompting(path,r)` |
| `markQuestionAnswered(recordPath, answer)` | answered 전이 | `recordPath:string, answer:QuestionAnswer` | `QuestionRecord` | 응답 저장 | `markQuestionAnswered(path,a)` |
| `markQuestionAborted(recordPath, code, message)` | aborted 전이 | `recordPath:string, code:string, message:string` | `QuestionRecord` | 중단 시 기록 | `markQuestionAborted(path,"timeout",msg)` |
| `submitQuestionAnswer(recordPath, entries)` | 응답 제출 | `recordPath:string, entries:QuestionAnswerEntry[]` | `QuestionRecord` | UI/CLI 답변 제출 | `submitQuestionAnswer(path,entries)` |
| `waitForQuestionAnswer(recordPath, timeoutMs?)` | 답변 대기 | `recordPath:string, timeoutMs?:number` | `Promise<QuestionAnswer>` | 블로킹 대기 | `await waitForQuestionAnswer(path,30000)` |
| `appendQuestionEvent(cwd, type, record)` | 질문 이벤트 기록 | `cwd:string, type:QuestionEventType, record:QuestionRecord` | `void` | audit 로그 기록 | `appendQuestionEvent(cwd,"question-created",r)` |
| `appendQuestionAnsweredEventOnce(cwd, record)` | answered 이벤트 중복 방지 기록 | `cwd:string, record:QuestionRecord` | `void` | answered 1회 기록 보장 | `appendQuestionAnsweredEventOnce(cwd,r)` |

#### 11.25 ralph
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `normalizeRalphPhase(rawPhase)` | phase 정규화 | `rawPhase:string` | `RalphPhase` | legacy alias 흡수 | `normalizeRalphPhase("verification")` |
| `validateAndNormalizeRalphState(candidate, options?)` | 상태 검증/정규화 | `candidate:unknown, options?:object` | `RalphState` | 저장 전 필수 | `validateAndNormalizeRalphState(s)` |
| `evaluateRalphCompletionAuditEvidence(state, cwd)` | 완료 증거 평가 | `state:RalphState, cwd:string` | `RalphCompletionAuditResult` | complete 게이트 | `evaluateRalphCompletionAuditEvidence(s,cwd)` |
| `isRalphCompletePhase(value)` | complete phase 판정 | `value:string` | `boolean` | 전이 분기 | `isRalphCompletePhase(state.current_phase)` |
| `ensureCanonicalRalphArtifacts(cwd, sessionId?)` | canonical 아티팩트 보장 | `cwd:string, sessionId?:string` | `RalphCanonicalArtifacts` | 마이그레이션/초기화 | `ensureCanonicalRalphArtifacts(cwd)` |
| `recordRalphVisualFeedback(cwd, feedback, sessionId?, baseStateDir?)` | 시각 피드백 기록 | `cwd:string, feedback:RalphVisualFeedback, sessionId?:string, baseStateDir?:string` | `void` | visual-verdict 기록 | `recordRalphVisualFeedback(cwd,f)` |

#### 11.26 ralplan
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `runRalplanConsensus(executor, options)` | 합의 루프 실행 | `executor:RalplanConsensusExecutor, options:RalplanOptions` | `RalplanRuntimeResult` | draft/review 루프 실행 | `runRalplanConsensus(exec,opt)` |
| `cancelRalplanConsensus(cwd?)` | 합의 루프 취소 | `cwd?:string` | `CancelResult` | 사용자 중단 처리 | `cancelRalplanConsensus(cwd)` |
| `buildRalplanConsensusGateFromSources(sources)` | 다중 소스 합의 게이트 생성 | `sources:ConsensusEvidenceSource[]` | `RalplanConsensusGate` | 증거 기반 합의 계산 | `buildRalplanConsensusGateFromSources(srcs)` |
| `buildRalplanConsensusGateForCwd(cwd, options)` | cwd 기반 합의 게이트 | `cwd:string, options?:object` | `RalplanConsensusGate` | 로컬 상태 포함 평가 | `buildRalplanConsensusGateForCwd(cwd,{})` |
| `hasDurableRalplanConsensusEvidenceForCwd(cwd, options)` | durable 합의 증거 판정 | `cwd:string, options?:object` | `RalplanConsensusGateEvidence` | 실행 전 게이트 | `hasDurableRalplanConsensusEvidenceForCwd(cwd,{})` |
| `readLocalRalplanConsensusStateCandidates(cwd, sessionId?)` | 로컬 후보 상태 읽기 | `cwd:string, sessionId?:string` | `ConsensusStateCandidate[]` | 증거 탐색 | `readLocalRalplanConsensusStateCandidates(cwd,sid)` |

#### 11.27 renderer
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ChatContainer.onSendMessage(text)` | 메시지 전송 콜백 | `text:string` | `void` | 상위에서 start stream 호출 | `onSendMessage(input)` |
| `ChatContainer.selectedModel` | 선택 모델 props | `modelId:string` | `string` | 모델 상태 바인딩 | `<ChatContainer selectedModel={model}/>` |
| `ChatContainer.onModelChange(modelId)` | 모델 변경 콜백 | `modelId:string` | `void` | 모델 선택기 연결 | `onModelChange(nextModel)` |
| `LifecycleDashboard.defaultOpen` | 초기 열림 여부 | `boolean` | `boolean` | 최초 렌더 정책 | `<LifecycleDashboard defaultOpen />` |
| `LifecycleDashboard.stateDir` | 상태 디렉터리 참조 | `string` | `string` | 상태 경로 지정 | `<LifecycleDashboard stateDir={dir} />` |

#### 11.28 runtime
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `run-outcome normalize/classify/infer/apply` | outcome 계약 함수군 | `unknown / mode-state` | `RunOutcome` | 상태 정규화 파이프라인 | `classifyRunOutcome(raw)` |
| `runUntilTerminal` | 루프 실행 | `step:(n:number)=>RunOutcomeLike, options:object` | `TerminalLoopResult` | terminal까지 반복 | `runUntilTerminal(step,{maxIterations:20})` |
| `shouldContinueRun` | 루프 지속 여부 판단 | `outcome:RunOutcome` | `boolean` | step 반복 조건 | `if (shouldContinueRun(o))` |
| `readRunState` | run-state 읽기 | `cwd:string, mode:string` | `RunState \| null` | 현재 상태 조회 | `readRunState(cwd,"team")` |
| `syncRunStateFromModeState` | mode->run-state 동기화 | `modeState:object, options?:object` | `RunState` | 상태 일관성 유지 | `syncRunStateFromModeState(ms)` |
| `execCommand` | runtime bridge 명령 실행 | `command:RuntimeCommand, payload?:object` | `RuntimeCommandResult` | Rust bridge 호출 | `execCommand("MarkDelivered",req)` |
| `readSnapshot` | bridge snapshot 읽기 | `void` | `RuntimeSnapshot` | 런타임 스냅샷 조회 | `readSnapshot()` |
| `getDefaultBridge` | 기본 bridge 인스턴스 | `void` | `RuntimeBridge` | bridge 공유 사용 | `const b = getDefaultBridge()` |
| `runProcessTreeWithTimeout` | 프로세스 트리 timeout 실행 | `command:string, args:string[], options:object` | `ProcessTreeResult` | 긴 작업 제한 실행 | `runProcessTreeWithTimeout(cmd,args,opt)` |

#### 11.29 scripts
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `execute-command` | 공통 실행기 | `ExecuteCommandInput` | `ChildProcessHandle` | 스크립트 실행 공통화 | `executeCommand({...})` |
| `onEnvelope` | envelope 콜백 | `object` | `void` | JSON 이벤트 처리 | `onEnvelope(e)` |
| `onRawLine` | raw line 콜백 | `string` | `void` | 비JSON 로그 처리 | `onRawLine(l)` |
| `onDone` | 완료 콜백 | `number` | `void` | 종료 처리 | `onDone(code)` |
| `onError` | 오류 콜백 | `Error` | `void` | 예외 처리 | `onError(err)` |
| `build-api.ts` | API 바이너리 빌드 스크립트 | `CLI args` | `exitCode:number` | release 빌드 | `node build-api.ts` |
| `build-explore-harness.ts` | explore 하네스 빌드 | `CLI args` | `exitCode:number` | 테스트 하네스 준비 | `node build-explore-harness.ts` |
| `build-sparkshell.ts` | sparkshell 빌드 | `CLI args` | `exitCode:number` | sparkshell 산출물 빌드 | `node build-sparkshell.ts` |
| `check-version-sync.ts` | 버전 동기 검사 | `CLI args` | `exitCode:number` | CI 버전 게이트 | `node check-version-sync.ts` |
| `check-runtime-syntax.ts` | 문법 검사 스크립트 | `CLI args` | `exitCode:number` | runtime 파일 검증 | `node check-runtime-syntax.ts` |
| `run-test-files.ts` | 테스트 파일 실행기 | `CLI args` | `exitCode:number` | 선택 테스트 실행 | `node run-test-files.ts` |
| `generate-catalog-docs.ts` | 카탈로그 문서 생성 | `CLI args` | `exitCode:number` | public catalog 생성 | `node generate-catalog-docs.ts` |
| `generate-release-body.ts` | 릴리스 바디 생성 | `CLI args` | `exitCode:number` | 릴리스 노트 생성 | `node generate-release-body.ts` |
| `sync-plugin-mirror.ts` | 플러그인 미러 동기화 | `CLI args` | `exitCode:number` | 스킬 미러 업데이트 | `node sync-plugin-mirror.ts` |
| `notify-hook.ts` | notify 훅 엔트리 | `hook payload` | `hook response` | turn 완료 후 호출 | `node notify-hook.ts <payload>` |
| `notify-dispatcher.ts` | notify 직렬 디스패치 | `payload/config` | `DispatchResult` | 기존 notify+omx notify 연속 호출 | `node notify-dispatcher.ts` |
| `tmux-hook-engine.ts` | tmux 주입 엔진 | `TmuxHookConfig + payload` | `InjectionDecision` | pane 주입 가드 | `node tmux-hook-engine.ts` |

#### 11.30 services
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `readTask(taskId)` | 태스크 읽기 | `taskId:string` | `Promise<TaskData>` | 작업 시작 전 상태 확인 | `await readTask(id)` |
| `claimTask(taskId, version)` | 태스크 선점 | `taskId:string, version:number` | `Promise<void>` | 실행 전 claim 필수 | `await claimTask(id,v)` |
| `releaseTaskClaim(taskId)` | 선점 해제 | `taskId:string` | `Promise<void>` | 롤백/재큐 시 사용 | `await releaseTaskClaim(id)` |
| `transitionTaskStatus(taskId, current, target, resultData?)` | 상태 전이 | `taskId:string, current:TaskStatus, target:TransitionTarget, resultData?:unknown` | `Promise<unknown>` | 규칙 위반 시 예외 | `await transitionTaskStatus(id,"in_progress","completed")` |
| `InvalidTransitionError` | 금지 전이 오류 타입 | `N/A` | `Error class` | catch 분기 처리 | `if (e instanceof InvalidTransitionError)` |
| `saveGeminiApiKey(plaintext)` | 키 저장 | `plaintext:string` | `void` | 설정 저장 시 호출 | `saveGeminiApiKey(key)` |
| `loadGeminiApiKey()` | 키 로드 | `void` | `string \| null` | 앱 시작 시 조회 | `const key = loadGeminiApiKey()` |
| `clearGeminiApiKey()` | 키 초기화 | `void` | `void` | 로그아웃/리셋 처리 | `clearGeminiApiKey()` |
| `isValidGeminiKeyFormat(key)` | 키 형식 검사 | `key:string` | `boolean` | 저장 전 유효성 검사 | `if (isValidGeminiKeyFormat(key))` |

#### 11.31 sidecar
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `collectSidecarSnapshot(teamName, options)` | 상태 스냅샷 수집 | `teamName:string, options:object` | `SidecarSnapshot \| null` | 렌더 전 데이터 수집 | `collectSidecarSnapshot("alpha",opt)` |
| `renderSidecar(snapshot, options)` | 텍스트 패널 렌더 | `snapshot:SidecarSnapshot, options:object` | `string` | watch 출력 생성 | `renderSidecar(snapshot,opt)` |
| `buildSidecarTmuxSplitArgs(options)` | tmux split args 생성 | `options:object` | `string[]` | tmux 실행 전 argv 구성 | `buildSidecarTmuxSplitArgs(o)` |
| `launchSidecarTmuxPane(options, execTmuxSync?)` | tmux pane 실행 | `options:object, execTmuxSync?:Function` | `string \| null` | sidecar 별도 pane 실행 | `launchSidecarTmuxPane(o)` |
| `parseSidecarArgs(args)` | CLI args 파싱 | `args:string[]` | `SidecarFlags` | CLI 진입점에서 사용 | `parseSidecarArgs(process.argv.slice(2))` |
| `runSidecarWatch(...)` | watch 루프 실행 | `args:object` | `Promise<void>` | 지속 모니터링 | `await runSidecarWatch(...)` |
| `sidecarCommand()` | sidecar CLI 엔트리 | `argv:string[]` | `Promise<number>` | omx sidecar 구현 | `sidecarCommand()` |

#### 11.32 state
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `executeStateOperation(name, rawArgs)` | state 명령 실행 통합 엔트리 | `name:string, rawArgs:unknown` | `unknown` | state_* 명령 라우팅 | `executeStateOperation("state_read",args)` |
| `listActiveStateModes(workingDirectory?, explicitSessionId?)` | 활성 모드 조회 | `workingDirectory?:string, explicitSessionId?:string` | `string[]` | HUD/대시보드 입력 | `listActiveStateModes(cwd,sid)` |
| `listStateStatuses(cwd, explicitSessionId?, mode?, options?)` | 상세 상태 목록 조회 | `cwd:string, explicitSessionId?:string, mode?:string, options?:object` | `StateStatus[]` | 디버깅/운영 상태 확인 | `listStateStatuses(cwd,sid,"team")` |
| `state_read` | 상태 읽기 명령 | `mode/session args` | `ModeState` | 조회 전용 | `omx state state_read --mode ralph` |
| `state_write` | 상태 쓰기 명령 | `mode + payload` | `ModeState` | 검증 후 원자적 쓰기 | `omx state state_write --mode team --input ...` |
| `state_clear` | 상태 초기화 명령 | `mode/session args` | `ClearResult` | 세션/루트 clear | `omx state state_clear --mode team` |
| `state_list_active` | 활성 목록 명령 | `session args` | `string[]` | 현재 활성 모드 나열 | `omx state state_list_active` |
| `state_get_status` | 상태 요약 명령 | `mode/session args` | `StateStatus` | phase/outcome 요약 | `omx state state_get_status --mode ralph` |

#### 11.33 team
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `startTeam(config)` | 팀 실행 시작 | `config:TeamConfig` | `TeamState` | 팀 초기화 및 워커 부트스트랩 | `startTeam(cfg)` |
| `monitorTeam(...)` | 팀 상태 감시 | `options:TeamMonitorOptions` | `TeamMonitorResult` | 워커 heartbeat/phase 감시 | `monitorTeam({teamName:"alpha"})` |
| `shutdownTeam(...)` | 팀 종료 | `options:TeamShutdownOptions` | `ShutdownSummary` | 워커 정리 후 종료 | `shutdownTeam({teamName:"alpha"})` |
| `runtime-cli 진입점(JSON 입출력)` | team runtime CLI | `stdin JSON / argv` | `stdout JSON` | 자동화 스크립트 연동 | `omx team runtime --json` |
| `team-ops gateway(teamInit, teamCreateTask, teamClaimTask 등)` | 팀 API 게이트웨이 | `action + input JSON` | `TeamApiResult` | task/mailbox/dispatch 조작 | `omx team api claim-task --input ... --json` |
| `approved execution binding` | 승인 실행 바인딩 | `planning hint + team config` | `BindingResult` | 승인 힌트 기반 팀 실행 | `bindApprovedExecution(...)` |
| `ultragoal team context API` | ultragoal 컨텍스트 연동 | `goal context + team state` | `ContextResult` | 목표 기반 팀 실행 연결 | `buildUltragoalTeamContext(...)` |

#### 11.34 test
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `*.test.ts` | 단위 테스트 표면 | `test runner args` | `pass/fail` | 함수/모듈 단위 검증 | `npm test -- state.test.ts` |
| `*.integrated.test.ts` | 통합 테스트 표면 | `test runner args` | `pass/fail` | 모듈 간 경로 검증 | `npm test -- stream.integrated.test.ts` |

#### 11.35 utils
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `codexHome()` | codex 홈 경로 | `void` | `string` | 설정 경로 계산 | `codexHome()` |
| `omxRoot()` | OMX 루트 경로 | `void` | `string` | .omx 루트 계산 | `omxRoot()` |
| `omxStateDir()` | 상태 디렉터리 경로 | `void` | `string` | 상태 파일 저장 위치 | `omxStateDir()` |
| `omxPlansDir()` | 계획 디렉터리 경로 | `void` | `string` | PRD/스펙 경로 | `omxPlansDir()` |
| `omxLogsDir()` | 로그 디렉터리 경로 | `void` | `string` | 로그 저장 위치 | `omxLogsDir()` |
| `omxProjectMemoryPath()` | 프로젝트 메모리 경로 | `void` | `string` | 메모리 파일 위치 | `omxProjectMemoryPath()` |
| `resolveProjectMemoryPath()` | 우선순위 메모리 경로 결정 | `void` | `string \| null` | canonical/legacy 해석 | `resolveProjectMemoryPath()` |
| `omxWikiDir()` | 위키 디렉터리 경로 | `void` | `string` | 위키 저장 위치 | `omxWikiDir()` |
| `addGeneratedAgentsMarker()` | AGENTS generated marker 주입 | `content:string` | `string` | AGENTS.md 갱신 | `addGeneratedAgentsMarker(text)` |
| `upsertManagedAgentsBlock()` | managed block 삽입/교체 | `existing:string, managed:string` | `string` | 블록 멱등 갱신 | `upsertManagedAgentsBlock(a,b)` |
| `renderAgentsModelTableBlock()` | 모델 테이블 블록 렌더 | `context:object, defs:object[]` | `string` | AGENTS 모델 표 생성 | `renderAgentsModelTableBlock(ctx,defs)` |
| `resolveCommandPathForPlatform()` | 실행 파일 경로 해석 | `cmd:string, platform?:string, env?:object` | `string \| null` | cross-platform 경로 탐색 | `resolveCommandPathForPlatform("git")` |
| `buildPlatformCommandSpec()` | 플랫폼 명령 스펙 빌드 | `cmd:string, args:string[], platform?:string` | `PlatformCommandSpec` | spawn 전 스펙 생성 | `buildPlatformCommandSpec("node",["a.js"])` |
| `spawnPlatformCommandSync()` | 동기 실행 래퍼 | `cmd:string, args:string[], opts?:object` | `SpawnSyncReturns<string>` | 표준 실행 래퍼 | `spawnPlatformCommandSync("git",["status"])` |
| `safeJsonParse()` | 안전 JSON 파싱 | `raw:string, fallback:T` | `T` | 파싱 실패 fallback | `safeJsonParse(raw,{})` |
| `safeReadJsonFile()` | 안전 JSON 파일 읽기 | `filePath:string, fallback:T` | `Promise<T>` | 파일 손상 보호 | `await safeReadJsonFile(path,{})` |
| `sleep()` | 비동기 sleep | `ms:number, signal?:AbortSignal` | `Promise<void>` | 재시도 backoff | `await sleep(500)` |
| `sleepSync()` | 동기 sleep | `ms:number` | `void` | 테스트/특수 루프 | `sleepSync(50)` |

#### 11.36 wiki
| API | 정의 | 입력 타입 | 출력 타입 | 사용법 | 예시 |
|---|---|---|---|---|---|
| `ingestKnowledge(root, input)` | 지식 페이지 입력/업데이트 | `root:string, input:WikiIngestInput` | `WikiIngestResult` | 세션 결과 저장 | `ingestKnowledge(root,input)` |
| `queryWiki(root, queryText, options)` | 지식 검색 | `root:string, queryText:string, options?:WikiQueryOptions` | `WikiQueryMatch[]` | 질의 기반 검색 | `queryWiki(root,"team idle",{})` |
| `lintWiki(root, config)` | 위키 품질 검사 | `root:string, config?:WikiConfig` | `WikiLintReport` | 문서 검증 CI | `lintWiki(root,cfg)` |
| `onSessionStart(data)` | 세션 시작 훅 | `data:WikiSessionHookInput` | `WikiHookResult` | 세션 컨텍스트 주입 | `onSessionStart(data)` |
| `onSessionEnd(data)` | 세션 종료 훅 | `data:WikiSessionHookInput` | `WikiHookResult` | 자동 캡처/요약 | `onSessionEnd(data)` |
| `onPreCompact(data)` | pre-compact 훅 | `data:WikiCompactHookInput` | `WikiHookResult` | compact 전 안내 | `onPreCompact(data)` |
| `onPostCompact(data)` | post-compact 훅 | `data:WikiCompactHookInput` | `WikiHookResult` | compact 후 재주입 | `onPostCompact(data)` |
| `readPage(root, filename)` | 페이지 읽기 | `root:string, filename:string` | `WikiPage` | 단일 문서 조회 | `readPage(root,"team.md")` |
| `writePage(root, page)` | 페이지 쓰기 | `root:string, page:WikiPage` | `void` | 문서 저장/갱신 | `writePage(root,page)` |
