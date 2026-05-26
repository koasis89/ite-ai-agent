# `webapp` → `main` 병합 절차 (GitHub)

작성일: 2026-05-23
브랜치: `webapp` (현재 HEAD `b69b23e`, `origin/webapp` 와 동일)
원격: `https://github.com/ai-isaki/ite-ai-codex-js.git`
목적: Phase 1 ~ Phase 3 (WIN-001 ~ WIN-023) 산출물을 `main` 브랜치에 통합.

> ⚠️ 본 절차는 **공유 브랜치 `main` 을 변경** 한다. force-push / `--no-verify` 같은 우회는 사용하지 않는다.
> 충돌이 발생하면 5장의 롤백 절차로 되돌릴 수 있다.

---

## 1. 사전 점검 (필수)

PowerShell 에서 모두 PASS 인지 확인한다.

```powershell
# 1.1 작업 트리 깨끗한지
git status                      # → "nothing to commit, working tree clean"

# 1.2 현재 브랜치
git rev-parse --abbrev-ref HEAD # → webapp

# 1.3 origin/webapp 와 동기화 (앞서 있다면 push)
git fetch origin
git log --oneline origin/webapp..HEAD   # → 비어 있어야 함 (없으면 git push 필요)

# 1.4 Phase 3 회귀 테스트 통과
npm run build:desktop
npm run test:phase2:windows:compiled   # 19/19 + 1/1 통과 확인

# 1.5 lint / type-check (있다면)
npm run lint
npx tsc -p tsconfig.desktop.json --noEmit
```

체크리스트:

- [x] working tree clean
- [ ] `webapp` push 완료 (`origin/webapp..HEAD` 가 비어 있음)
- [ ] `test:phase2:windows:compiled` 통과
- [ ] Phase 2 게이트 / Phase 3 티켓 체크리스트가 [x] 또는 [N/A + 사유] 로 마감
- [ ] WIN-021/022/023 Taiga US/Task 가 모두 status=4 closed

## 2. 권장 경로 — GitHub Pull Request (안전)

### 2.1 PR 생성

브라우저로 다음 URL 을 열어 신규 PR 을 생성한다.

```
https://github.com/ai-isaki/ite-ai-codex-js/compare/main...webapp
```

또는 GitHub CLI 가 있다면:

```powershell
gh pr create `
  --base main `
  --head webapp `
  --title "feat: Phase 1~3 통합 — WIN-001~WIN-023 Windows 데스크탑 앱 전환" `
  --body-file winapp만들기/stage1/github작업/PR-body-webapp-to-main.md
```

### 2.2 PR 본문 권장 구성

PR 설명에 아래 7개 섹션을 포함한다. (별도 본문 파일을 만들지 않는 경우 GitHub 웹 에디터에 직접 붙여넣는다.)

1. **요약** — Phase 1 (W001~W010) / Phase 2 (WIN-011~WIN-020) / Phase 3 (WIN-021~WIN-023) 한 줄씩.
2. **주요 변경 디렉터리** — `desktop/`, `src/core/local-process-transport.ts`, `winapp만들기/stage1/*`.
3. **신규/확장 IPC 명령 (15종)** — `state_get_status` ~ `omx_state_status`. 보안 정책(zod, allowlist, `OMX_DESKTOP_ALLOW_EXEC` 스위치) 명시.
4. **회귀 결과** — `npm run test:phase2:windows:compiled` 19/19 + 1/1, `npm run build:desktop` 성공.
5. **문서** — [winapp-manual.md](../winapp-manual.md), [change-winapp-phase2-gate.md](../change-winapp-phase2-gate.md), [change-winapp-phase3-tickets.md](../change-winapp-phase3-tickets.md), [future-winapp.md](../future-winapp.md).
6. **Taiga 동기화** — US/Task ID 목록 + Sprint(SP-03 id=12) / Epic(EP-01 id=8).
7. **후속(Phase 4+)** — [future-winapp.md](../future-winapp.md) 참조 — 대화 UI / 영속성 / MCP / 첨부 / 자동 업데이트.

### 2.3 리뷰 체크 항목 (Reviewer)

- [ ] preload 가 `nodeIntegration:false` + `contextIsolation:true` 유지하는지
- [ ] `desktop/ipc/commands.ts` 의 `allowedCommands` 가 화이트리스트 그대로인지 (배열 외 명령 거부)
- [ ] `omxCliMatrix` 가 사용자 args 를 무시하고 고정 상수만 사용하는지
- [ ] `OMX_DESKTOP_ALLOW_EXEC=0` 거부 동작 회귀 테스트 존재
- [ ] `LocalProcessTransport` 의 `shell:false`, `windowsHide:true`, `allowedCwdRoots` 정책 유지
- [ ] `.codex/state/*` 와 같은 사용자 상태 파일이 커밋에 섞이지 않았는지
- [ ] 비밀번호·토큰·`taiga-*.ps1` 의 인증 정보가 평문으로 커밋되었는지 확인

### 2.4 머지 방식 선택

| 방식 | 이력 | 권장 상황 |
|---|---|---|
| **Create a merge commit** (권장) | `webapp` 의 모든 커밋 + 머지 커밋 1개가 main 에 남음 | 다단계(Phase 1/2/3) 작업 히스토리를 보존하고 싶은 경우 |
| Squash and merge | main 에는 1개 커밋만 추가, 본문에 전체 변경 요약 | main 히스토리를 단순화하고 싶을 때 (단점: phase별 bisect 불가) |
| Rebase and merge | main 에 webapp 커밋이 fast-forward 로 얹힘 | main 이 webapp 의 base 와 동일할 때만 안전 |

본 PR 은 **Create a merge commit** 을 권장한다 — Phase 단계별 커밋(`feat:WIN-011~014`, `feat:WIN-15~23` 등)을 보존해야 회귀 추적이 쉽다.

### 2.5 머지 후 정리

```powershell
# 로컬 main 동기화
git checkout main
git pull origin main

# (선택) webapp 브랜치 보존 정책 — Phase 4 작업을 동일 브랜치에서 이어가지 않는다면 삭제 가능
# 단, 본 작업 결과 추적용으로 유지 권장.
# git push origin --delete webapp
# git branch -d webapp

# 태그 부여 (권장) — Phase 3 종료를 식별
git tag -a phase3-WIN-023-complete -m "Phase 3 complete (WIN-021~023) — 2026-05-23"
git push origin phase3-WIN-023-complete
```

## 3. 대안 경로 — 로컬 직접 머지 (PR 우회, 단독 작업자 전용)

> ⚠️ 리뷰어가 없을 때만 사용. 협업 중이면 2장의 PR 경로를 따른다.

```powershell
# 3.1 main 으로 전환 + 최신화
git checkout main
git pull origin main

# 3.2 webapp 병합 (merge commit 생성)
git merge --no-ff webapp -m "Merge branch 'webapp' into main — Phase 1~3 통합 (WIN-001~WIN-023)"

# 3.3 회귀 재실행 (병합 후 충돌/회귀가 없는지)
npm run build:desktop
npm run test:phase2:windows:compiled

# 3.4 push
git push origin main

# 3.5 태그
git tag -a phase3-WIN-023-complete -m "Phase 3 complete (WIN-021~023) — 2026-05-23"
git push origin phase3-WIN-023-complete
```

## 4. 충돌 발생 시 대응

### 4.1 PR 경로 (2장)
GitHub UI 가 "This branch has conflicts" 로 차단하면:

```powershell
git checkout webapp
git fetch origin
git merge origin/main             # main 변경을 webapp 으로 가져옴 (역방향 머지)
# 충돌 파일 수동 해결
git add <resolved-files>
git commit                        # 머지 커밋 작성
git push origin webapp            # PR 이 자동 갱신됨
```

### 4.2 로컬 머지 경로 (3장)
`git merge --no-ff webapp` 가 충돌을 보고하면:

```powershell
# 충돌 파일 확인
git status

# 파일을 수동 편집 후
git add <resolved-files>
git commit                        # 머지 마무리

# 또는 중단 후 처음부터
git merge --abort
```

## 5. 롤백 절차 (push 이후 문제 발견 시)

main 푸시 후 회귀 문제가 발견되면:

```powershell
# 5.1 머지 커밋 SHA 확인
git log --oneline --merges -5

# 5.2 revert (이력은 보존, 효과만 되돌림) — 권장
git checkout main
git revert -m 1 <merge-commit-sha>
git push origin main

# 5.3 (비권장) hard reset — 다른 사람이 main 을 fetch 한 경우 강제 푸시는 금지
# git reset --hard <pre-merge-sha>
# git push --force-with-lease origin main   # 협업 중이면 금지
```

revert 후 동일 작업을 다시 머지하려면 `git revert <revert-commit>` 으로 revert 를 한 번 더 뒤집어 적용한다.

## 6. 머지 후 후속 작업 (Phase 4 준비)

- [ ] `main` 의 [winapp-manual.md](../winapp-manual.md) 가 GitHub Pages 등에 정적 호스팅된다면 빌드/배포 트리거 확인.
- [ ] `phase3-WIN-023-complete` 태그를 기반으로 릴리스 노트 작성 (선택).
- [ ] [future-winapp.md](../future-winapp.md) 의 Phase 4 (WIN-031~034) 티켓을 Taiga 에 신규 Sprint(SP-04) 로 등록.
- [ ] 새 작업 브랜치를 `main` 에서 분기 — 권장 이름 `phase4-chat-ui`.

```powershell
git checkout main
git pull origin main
git checkout -b phase4-chat-ui
git push -u origin phase4-chat-ui
```

## 7. 빠른 참조 (체크리스트 한 장)

- [ ] 1) `git status` clean / `webapp` push 완료
- [ ] 2) `npm run build:desktop` + `npm run test:phase2:windows:compiled` 모두 통과
- [ ] 3) GitHub `compare/main...webapp` 로 PR 생성
- [ ] 4) PR 본문 7개 섹션(요약/디렉터리/명령/회귀/문서/Taiga/후속) 채움
- [ ] 5) 리뷰어 8개 체크 항목 검토
- [ ] 6) **Create a merge commit** 으로 머지
- [ ] 7) 로컬 `main` 동기화 + `phase3-WIN-023-complete` 태그 push
- [ ] 8) Taiga US/Task 마감 상태 재확인
- [ ] 9) Phase 4 작업 브랜치 `phase4-chat-ui` 신규 분기
