# webapp 브랜치 작업 명령어

## 1) 브랜치 생성/전환 (실행됨)
아래 명령으로 `webapp` 브랜치를 생성(또는 기존 브랜치로 전환)했다.

```powershell
Set-Location C:\Workspace\Isaki\oh-my-codex-js
git status -sb
if (git branch --list webapp) { git switch webapp } else { git switch -c webapp }
git branch --show-current
```

## 2) 원격 저장소 반영
`webapp` 브랜치를 원격에 올리고 추적 브랜치를 연결한다.

```powershell
Set-Location C:\Workspace\Isaki\oh-my-codex-js
git push -u origin webapp
```

## 3) 변경 커밋 후 푸시
작업 파일을 커밋하고 `webapp` 브랜치로 푸시한다.

```powershell
Set-Location C:\Workspace\Isaki\oh-my-codex-js
git add .
git commit -m "feat: start webapp migration work"
git push
```

## 4) GitHub Pull Request 생성 (선택)
GitHub CLI(`gh`)가 설치되어 있으면 PR을 생성한다.

```powershell
Set-Location C:\Workspace\Isaki\oh-my-codex-js
gh pr create --base main --head webapp --title "Webapp migration" --body "Start webapp branch work"
```

## 5) 확인 명령
현재 브랜치와 최근 커밋을 확인한다.

```powershell
Set-Location C:\Workspace\Isaki\oh-my-codex-js
git branch --show-current
git log --oneline -n 5
```
