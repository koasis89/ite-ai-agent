# 릴리스 프로토콜

이 프로토콜은 모든 `oh-my-codex` 릴리스에 필수입니다. 이는 릴리스 노트, 변경 로그 및 GitHub 릴리스 본문이 실제 배송된 비교 범위를 과소평가하는 것을 방지하기 위해 존재합니다.

## 1. 노트를 쓰기 전에 릴리즈 범위를 동결하세요

1. 이전에 출시된 태그와 후보 참조를 식별합니다.
   - 예: `PREV=v0.16.1`, `NEXT=v0.16.2`, `CANDIDATE=dev`.
2. 이전 태그가 후보의 조상인지 확인하세요.
   - `git merge-base --is-ancestor "$PREV" "$CANDIDATE"`
3. 정확한 비교 범위에서 커밋 및 PR 인벤토리를 생성합니다.
   - `git log --oneline --decorate "$PREV..$CANDIDATE"`
   - `git log --format='%h %s' "$PREV..$CANDIDATE" | grep -Eo '#[0-9]+' | sort -u`
   - `gh pr list --state merged --limit 100 --json number,title,mergedAt,author,url,mergeCommit`
4. 비교 범위의 모든 병합 커밋/PR이 릴리스 노트에 표시되거나 의도적으로 내부 전용으로 제외되었는지 교차 확인하세요.

## 2. 기억이 아닌 증거로부터 릴리스 노트를 작성하세요

릴리스 자료는 릴리스 검토 중에 수정된 마지막 차단 요소가 아닌 비교 범위 인벤토리를 기반으로 해야 합니다.

필수 파일:

- `CHANGELOG.md`
- `docs/release-notes-<version>.md`
- `docs/qa/release-readiness-<version>.md`
- `RELEASE_BODY.md`

필수 릴리스 노트 섹션:

- 하이라이트/사용자가 볼 수 있는 주요 변경 사항
- 수정 사항/호환성 참고 사항
- PR 번호 및 링크가 포함된 PR 인벤토리 통합
- 검증 증거
- 전체 변경 내역 비교 링크

릴리스에 주요 워크플로 변경 사항(예: `$ultragoal`, `$ralph`, `$team`, wiki, 설정, 기본 후크, MCP 상태 또는 Codex 목표 모드 동작)이 포함된 경우 최종 배송 전 차단기가 관련이 없더라도 해당 변경 사항이 하이라이트 섹션에 표시되어야 합니다.

## 3. 태그를 지정하기 전에 GitHub 릴리스 본문을 확인하세요.

`RELEASE_BODY.md`은 `dist/scripts/generate-release-body.js`에서 사용되는 템플릿입니다.

릴리스 태그를 푸시하기 전에 다음을 실행하십시오.

```sh
node dist/scripts/generate-release-body.js \
  --template RELEASE_BODY.md \
  --out /tmp/RELEASE_BODY.generated.md \
  --current-tag "$NEXT" \
  --previous-tag "$PREV" \
  --repo Yeachan-Heo/oh-my-codex
```

엄격한 요구사항:

- 템플릿에는 `## Contributors`이 포함되어 있습니다.
- 생성된 본문에는 여전히 모든 주요 비교 범위 변경 사항이 포함됩니다.
- 생성된 본문에는 올바른 `**Full Changelog**` 줄이 포함되어 있습니다.
- 기여자 섹션은 병합된 PR 작성자와 비교하여 검토되며 이전 릴리스-훈련 문장 형식과 일치합니다. release-prep 커밋이 작성자 목록을 왜곡할 때 shortlog 전용으로 생성된 이름을 맹목적으로 받아들이지 마십시오.

## 4. 출시 준비 게이트

`main`에 병합하거나 태그를 지정하기 전에:

1. 접촉된 표면에 적합한 로컬 게이트가 통과합니다.
2. `dev` CI는 후보 커밋에 대해 녹색입니다.
3. `docs/qa/release-readiness-<version>.md` 레코드:
   - 범위 비교
   - 홍보 인벤토리
   - 지역 게이트
   - CI 실행 ID
   - 알려진 격차
4. 릴리스 노트는 최신 수정 사항뿐만 아니라 `git log "$PREV..$CANDIDATE"`에 대해서도 검토됩니다.

## 5. 게시 순서

1. 검증된 후보를 `main`에 병합합니다.
2. `main` CI 녹색을 기다립니다.
3. 릴리스 자료가 완료된 후에만 주석이 달린 태그를 생성/푸시하세요.
4. 태그에 의해 실행되는 출시 워크플로가 통과될 때까지 기다립니다.
5. 확인하다:
   - GitHub 릴리스가 존재하며 초안/사전 릴리스가 아닙니다.
   - 기본 자산과 매니페스트가 첨부됩니다.
   - `npm view oh-my-codex version`은 릴리스 버전을 반환합니다.
6. `dev`을 배송된 `main` 커밋으로 빨리 감고 최종 `dev` CI 녹색을 기다립니다.

## 6. 출판 후 수정

npm 게시 후 릴리스 노트가 불완전한 것으로 확인되면 다음을 수행하세요.

1. 릴리스 아티팩트 자체가 유효하지 않고 유지 관리 담당자가 긴급 재태그를 명시적으로 선택하지 않는 한 게시된 npm 출처 태그를 이동 **하지 마세요**.
2. 수정된 릴리스 자료를 `dev`에 커밋한 다음 일반 CI 경로를 통해 `main`로 승격합니다.
3. 수정된 `RELEASE_BODY.md`에서 GitHub 릴리스 본문을 다시 생성합니다.
4. `gh release edit "$NEXT" --notes-file /tmp/RELEASE_BODY.generated.md`으로 기존 GitHub 릴리스 본문을 업데이트합니다.
5. `docs/qa/release-readiness-<version>.md`에 수정 사항을 기록합니다.

## 7. 정지 조건

릴리스는 모두 true인 경우에만 완료됩니다.

- `main`, `dev` 및 릴리스 태그는 의도된 배송 커밋을 가리키거나 의도적인 게시 후 문서 전용 차이가 문서화되어 있습니다.
- GitHub 릴리스 워크플로는 녹색입니다.
- npm은 예상 버전을 보여줍니다.
- GitHub 릴리스 본문은 전체 비교 범위를 정확하게 요약합니다.
- 릴리스 준비 증거에는 CI 및 출판 증명이 포함됩니다.
