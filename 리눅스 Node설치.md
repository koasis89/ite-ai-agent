리눅스에서 Node.js 설치

Ubuntu / Debian (LTS 권장)
1. curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
2. sudo apt-get install -y nodejs
3. node -v
4. npm -v

Fedora / RHEL / CentOS
1. curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
2. sudo dnf install -y nodejs
3. node -v
4. npm -v

버전 관리까지 하려면 nvm 방식(추천)
1. curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
2. source ~/.bashrc
3. nvm install --lts
4. nvm use --lts
5. node -v

가능합니다. 먼저 재설치 없이 비밀번호만 리셋하는 방법부터 해보세요.  
WSL은 Windows에서 root로 바로 진입할 수 있어서, root 비밀번호를 몰라도 복구 가능한 경우가 많습니다.

1. 관리자 권한 PowerShell 실행
2. 배포판 이름 확인  
wsl -l -v
3. root로 진입  
wsl -d 배포판이름 -u root
4. 사용자 비밀번호 재설정  
passwd 사용자이름
5. 필요하면 root 비밀번호도 재설정  
passwd root
6. 종료 후 일반 사용자로 재접속 확인  
exit  
wsl -d 배포판이름

default user가 꼬였으면 같이 복구
1. root로 들어간 상태에서 기본 사용자 지정 파일 수정
2. /etc/wsl.conf에 아래 내용 설정

[user]
default=사용자이름

3. Windows에서  
wsl --shutdown  
다시 실행

재설치가 꼭 필요한 경우 (주의: 데이터 삭제 가능)
1. 먼저 백업 권장  
wsl --export 배포판이름 D:\backup\wsl-backup.tar
2. 등록 해제  
wsl --unregister 배포판이름
3. 재설치  
wsl --install -d 배포판이름

원하면 지금 사용 중인 배포판 이름 기준으로, 네 환경에 맞는 명령만 한 줄씩 정리해줄게요.