# GitHub/PR/패키지 ID 파이프라인

이 가이드에는 GitHub 또는 커뮤니티 보고서를 추적 가능한 OMX 작업 패키지, 작업 트리, 끌어오기 요청, 검토 및 병합 결정으로 전환하기 위한 공개 계약이 문서화되어 있습니다. 의도적으로 인프라 중립적입니다. 리포지토리는 GitHub Actions, 봇, 예약된 스크립트 또는 수동 유지 관리 명령을 사용하여 접착제를 구현할 수 있지만 아래 아티팩트와 게이트는 진실의 소스입니다.

## 공개 범위 및 진실의 출처

- **리포지토리 사용 가능 계약:** [__TOK_0__](./templates/)의 Markdown 템플릿과 이 워크플로 계약은 저장소에서 복사, 검토 및 버전 관리에 안전합니다.
- **외부 오케스트레이션 글루:** 웹훅 리스너, Discord 봇, 대기열 작업자, 자격 증명 저장소, 배포 대상 및 스케줄러 내부는 이 계약 외부에 있습니다. 여기에 비밀, 호스트 이름, 대기열 이름, 토큰, 개인 채널 또는 운영 토폴로지를 문서화하지 마십시오.
- **진실 모델:** 채팅 메시지는 진실이 아닌 코디네이션(Coordination) 힌트입니다. 진실은 GitHub 이슈, 끌어오기 요청, 브랜치에 커밋되거나 이슈/PR에 첨부된 패키지 아티팩트에 있습니다.
- **변이 안전:** 모든 상태 변경 작업은 명시적인 게이트를 통과해야 합니다. 한 번에 하나의 활성 변경 런타임만 작업 트리를 소유할 수 있습니다. 관찰자와 검토자는 동시에 읽을 수 있습니다.

## 파이프라인 개요

1. **GitHub/Discord 접수**
   - GitHub 문제 및 선택적 Discord/커뮤니티 스레드의 보고서를 수락하세요.
   - 향후 유지관리자가 필요할 때 GitHub 문제에 외부 컨텍스트를 미러링합니다.
   - [__TOK_0__](./templates/issue-package-identity.md)을 사용하여 정식 ID를 기록합니다.
2. **분류, 중복 제거, 재현 및 위험 차단**
   - 버그, 기능/계약 제안, 중복, 지원 질문, 유효하지 않은/스팸으로 분류합니다.
   - 패키지를 만들기 전에 기존 이슈와 PR을 검색하세요.
   - 버그 보고서를 실행할 수 없는 경우 최소한의 재현을 요청하세요.
   - 돌연변이 런타임이 시작되기 전에 위험 게이트를 적용합니다. 즉, 분기 대상, 영향을 받는 인터페이스, 예상 테스트 및 자격 증명이나 파괴적인 명령이 관련되어 있는지 여부를 확인합니다.
3. **패키지 ID**
   - 실행 가능한 작업을 위해 안정적인 `package_id`(일반적으로 `issue-<number>-<short-slug>`)을 만듭니다.
   - 패키지를 하나의 저장소, 하나의 이슈, 하나의 브랜치, 하나의 작업 트리 및 선택적 외부 스레드 참조에 바인딩합니다.
   - 채팅뿐만 아니라 이슈/PR/패키지 아티팩트에 패키지 상태 전환을 저장합니다.
4. **작업 트리/세션/분기 매핑**
   - 분기: `<kind>/issue-<number>-<short-slug>`(예: `fix/issue-1234-repro-timeout` 또는 `docs/issue-2087-pipeline-templates`).
   - 작업 트리: `package_id`(예: `../oh-my-codex-worktrees/<package_id>`)을 포함하는 결정적 경로입니다.
   - OMX 세션: `package_id`을 포함하거나 이에 연결되는 런타임 레이블입니다. 구현별로 다를 수 있지만 패키지 아티팩트는 어떤 런타임이 변이를 소유했는지 알려야 합니다.
5. **실행 아티팩트**
   - `package.md`은 ID, 범위, 게이트 및 상태를 기록합니다.
   - `plan.md`은 계획된 변경 및 검증을 기록합니다.
   - `execution-result.md`은 변경된 내용과 증거를 기록합니다.
   - `review.md`은 검토 결과 및 승인/거부를 기록합니다.
   - `merge-decision.md`은 최종 게이트 결과를 기록합니다.
6. **PR, 검토 및 병합 게이트**
   - PR은 합의된 기본 분기(일반적으로 `dev`)를 대상으로 합니다.
   - PR은 이슈와 패키지 아티팩트를 연결합니다.
   - 검토에서는 추적성, 검증, 위험 및 단일 소유자 작업 트리 변형을 확인합니다.
   - 검증 증거와 검토 승인이 기록된 후에만 병합합니다.

## 상태

권장 패키지 상태:

- `intake`: 보고서가 수신되었습니다. 아직 생성된 패키지가 없습니다.
- `needs_repro`: 버그와 유사한 신고에는 정확한 재현 세부정보가 필요합니다.
- `duplicate`: 정식 문제로 종료되거나 리디렉션되었습니다.
- `proposal`: 기능/계약 아이디어에는 관리자 범위 게이트가 필요합니다.
- `ready`: 패키지 ID가 존재하며 변형이 시작되지 않았습니다.
- `executing`: 하나의 돌연변이 런타임이 작업 트리를 소유합니다.
- `review`: 구현이 제출되었습니다. 요청된 수정 사항을 제외하고 변형이 일시 중지되었습니다.
- `merge_ready`: 검토 및 검증 게이트를 통과했습니다.
- `merged`: PR 병합 및 발행 종료가 기록되었습니다.
- `closed`: 추가 작업 계획이 없습니다.

## 이슈/패키지 ID

이슈 본문, 패키지 아티팩트 또는 둘 다에 [__TOK_0__](./templates/issue-package-identity.md)을 사용하세요. 필수 입력란은 다음과 같습니다:

- `source`
- `repo`
- `issue`
- `package_id`
- `branch`
- `worktree`
- `discord_thread`
- `state`

## 심사 정책 템플릿

일반적인 문제 결과를 보려면 [__TOK_0__](./templates/triage/)의 템플릿을 사용하세요.

- [__TOK_0__](./templates/triage/needs-repro-question.md)
- [__TOK_0__](./templates/triage/timeout-close.md)
- [__TOK_0__](./templates/triage/duplicate-close.md)
- [__TOK_0__](./templates/triage/reproducible-bug-package.md)
- [__TOK_0__](./templates/triage/feature-contract-proposal-gate.md)

## 실행 아티팩트 템플릿

패키지 수명 주기 기록을 위해 [__TOK_0__](./templates/execution/)의 템플릿을 사용하세요.

- [__TOK_0__](./templates/execution/package.md)
- [__TOK_0__](./templates/execution/plan.md)
- [__TOK_0__](./templates/execution/execution-result.md)
- [__TOK_0__](./templates/execution/review.md)
- [__TOK_0__](./templates/execution/merge-decision.md)

## 코디네이터 뼈대

코디네이터는 오케스트레이션 접착제입니다. 구현별 엔드포인트, 자격 증명, 프로세스 관리자, 대기열 이름 및 비공개 채널 식별자를 공개 문서 외부에 유지하세요.

```ts
type IntakeEvent = {
  source: "github" | "discord";
  repo: string;
  issue?: number;
  externalThread?: string;
  title: string;
  body: string;
  author: string;
  receivedAt: string;
};

type Classification = {
  kind: "bug" | "feature" | "contract" | "duplicate" | "support" | "invalid";
  confidence: number;
  canonicalIssue?: number;
  needsRepro: boolean;
  risk: "low" | "medium" | "high";
  rationale: string;
  suggestedPackageId?: string;
};

async function intakeLoop() {
  for await (const event of pollOrReceiveWebhookEvents()) {
    const issue = await ensureCanonicalGitHubIssue(event);
    const classification = await classify(issue);

    if (classification.kind === "duplicate") {
      await commentFromTemplate(issue, "triage/duplicate-close.md", classification);
      await closeIssue(issue, "not planned");
      continue;
    }

    if (classification.needsRepro) {
      await commentFromTemplate(issue, "triage/needs-repro-question.md", classification);
      await label(issue, ["needs-repro"]);
      continue;
    }

    if (classification.kind === "feature" || classification.kind === "contract") {
      await commentFromTemplate(issue, "triage/feature-contract-proposal-gate.md", classification);
      await label(issue, ["proposal", "needs-maintainer-gate"]);
      continue;
    }

    if (classification.kind === "bug") {
      await createPackageIdempotently(issue, classification);
    }
  }
}

async function createPackageIdempotently(issue: Issue, classification: Classification) {
  const packageId = classification.suggestedPackageId ?? `issue-${issue.number}-${slug(issue.title)}`;
  const existing = await findPackageByIssue(issue.repo, issue.number);
  if (existing) return existing;

  const branch = `fix/${packageId}`;
  const worktree = `../oh-my-codex-worktrees/${packageId}`;
  const session = `tmux-or-omx-${packageId}`;

  await requireGate("risk", {
    issue: issue.number,
    packageId,
    risk: classification.risk,
    mutationOwner: session,
  });

  await run(`git fetch origin dev`);
  await run(`git worktree add ${shellQuote(worktree)} -b ${shellQuote(branch)} origin/dev`);
  await writeTemplate(`${worktree}/package.md`, "execution/package.md", {
    source: "github",
    repo: issue.repo,
    issue: issue.number,
    package_id: packageId,
    branch,
    worktree,
    discord_thread: "n/a",
    state: "ready",
  });

  await commentFromTemplate(issue, "triage/reproducible-bug-package.md", {
    packageId,
    branch,
    worktree,
    session,
  });

  // Dispatch is explicit: the coordinator records the command it asked a runtime to run.
  const prompt = `Implement ${packageId}; keep package.md and execution-result.md current.`;
  const command = `OMX_PACKAGE_ID=${packageId} omx team 1:executor ${shellQuote(prompt)}`;
  await runInWorktree(worktree, command);
  await recordDispatch(issue, {
    command,
    worktree,
    branch,
    packageId,
  });
}
```

## 명시적 디스패치 명령 예

이러한 예는 자리 표시자입니다. 이를 환경에서 사용할 수 있는 공개 CLI 명령에 적용하고 `package.md` 또는 `execution-result.md`에 실제 명령을 기록합니다.

```sh
# Create a deterministic worktree for the package.
git fetch origin dev
git worktree add ../oh-my-codex-worktrees/issue-2087-pipeline-templates \
  -b docs/issue-2087-pipeline-templates origin/dev

# Start exactly one mutating runtime for that worktree and record the command.
cd ../oh-my-codex-worktrees/issue-2087-pipeline-templates
OMX_PACKAGE_ID=issue-2087-pipeline-templates \
  omx team 1:executor "Implement issue-2087; keep package artifacts current."

# Open a pull request after validation evidence exists.
gh pr create --base dev --head docs/issue-2087-pipeline-templates \
  --title "docs: add issue package pipeline templates" \
  --body-file .github/pr-body.md
```

## 공공 안전 체크리스트

파견 전:

- [ ] 정식 GitHub 문제가 존재합니다.
- [ ] 중복 검색이 완료되었습니다.
- [ ] 복제 또는 제안 범위가 충분합니다.
- [ ] 위험 게이트가 기록되었습니다.
- [ ] `package_id`, 분기, 작업 트리 및 선택적 외부 스레드가 기록됩니다.
- [ ] 공용 아티팩트에는 비밀, 자격 증명, 개인 URL, 대기열 이름 또는 호스트별 토폴로지가 없습니다.
- [ ] 정확히 하나의 돌연변이 런타임이 작업 트리를 소유합니다.

병합 전:

- [ ] PR은 이슈와 패키지 아티팩트를 연결합니다.
- [ ] 검증 증거가 최신입니다.
- [ ] 검토 결정이 기록됩니다.
- [ ] 병합 결정은 PR이 문제를 종결하는지 여부를 나타냅니다.
