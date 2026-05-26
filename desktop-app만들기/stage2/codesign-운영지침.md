# 코드서명 운영지침 (WIN-073)

> Authenticode 코드서명 인증서의 발급/보관/갱신/회전 절차 SSOT.
> 본 문서는 운영자/릴리스 담당자 전용이며, 일반 기여자는 참조만.
>
> 관련 티켓: WIN-073 / [change-winapp-phase8-tickets.md](./change-winapp-phase8-tickets.md)
> 관련 문서: [winapp-manual-v2.md §9.3](./winapp-manual-v2.md)

---

## 1. 인증서 옵션 (우선순위)

| 옵션 | SmartScreen | 비용 (연) | 적용 시점 |
| --- | --- | --- | --- |
| **EV 코드서명 (HW Token)** | 즉시 신뢰 | ~$300 | 일반 사용자 배포 권장 |
| **OV 코드서명 (PFX 파일)** | 평판 누적 후 신뢰 | ~$80 | 베타/내부 배포 |
| **Self-signed** | 항상 경고 | 무료 | PoC / 사내 한정 |

본 프로젝트는 **OV** 를 1차 채택하고 평판 누적 후 **EV** 로 승격하는 단계를 권장한다.
EV 는 HW Token 의 PIN 입력이 필요하여 CI 자동화가 어렵기 때문에, EV 로 전환 시 별도
self-hosted Windows runner + Token 마운트 절차가 필요하다 (별도 후속 티켓 WIN-073-EV).

## 2. 인증서 보관

### 2.1 절대 원칙

- **저장소에 `.pfx` / `.p12` / `private key` 평문 커밋 금지.**
  - `desktop/scripts/check-codesign-secrets.mjs` 가 `git ls-files` 트리에서 자동 검사.
  - publish 워크플로의 `Lint codesign secrets` 단계가 publish 전 차단.
- **패스프레이즈 평문 저장 금지.**
  - 본 저장소의 모든 환경변수 참조는 `${env.WIN_CSC_KEY_PASSWORD}` 형식만 사용.
- **로컬 개발자 머신의 인증서 사본 최소화.**
  - 릴리스 담당자 1인의 OS keychain 또는 HW Token 에만 보관.

### 2.2 보관 위치

| 환경 | 저장소 |
| --- | --- |
| 운영 (CI) | GitHub Actions Secrets — `WIN_CSC_LINK` (base64-encoded PFX 또는 사내 https URL) + `WIN_CSC_KEY_PASSWORD` |
| 백업 | 운영자 1Password Vault → "oh-my-codex-codesign" 항목 (PFX 파일 + 패스프레이즈 + 발급기관 정보) |
| 만료 알림 | 1Password 의 expiration 필드 사용. 만료 60일 전 / 30일 전 / 7일 전 알람 |

## 3. CI 환경변수 설정

repo Settings → Secrets and variables → Actions 에 다음을 등록한다.

| Secret 이름 | 형식 | 비고 |
| --- | --- | --- |
| `WIN_CSC_LINK` | base64 PFX (또는 https://secrets.internal/cert.pfx) | base64 의 경우 electron-builder 가 자동 디코딩 |
| `WIN_CSC_KEY_PASSWORD` | 패스프레이즈 평문 | Secrets 외부 노출 절대 금지 |
| `WIN_CSC_PUBLISHER_NAME` | "oh-my-codex contributors" | latest.yml 의 publisherName 매칭값 |
| `WIN_CSC_SUBJECT_NAME` | "CN=oh-my-codex" (PFX 의 CN 과 일치) | (선택) signtool 추가 검증용 |
| `GH_TOKEN` | repo write 권한 PAT | publishAutoUpdate 용 (WIN-071) |

`WIN_CSC_LINK` 를 base64 로 변환하는 1회성 절차:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("codesign.pfx")) | Set-Clipboard
```

위 출력을 GitHub Secrets 의 `WIN_CSC_LINK` 값으로 붙여넣는다 (개행 없음).

## 4. 갱신 절차

### 4.1 신규 인증서 발급 (만료 60일 전 시작)

1. 발급 기관 (DigiCert / SSL.com / Sectigo 등) 에 OV 갱신 신청.
2. KYC / 발급 기관 검증 (도메인 소유권 확인 + 사업자 정보 확인).
3. PFX 파일 + 패스프레이즈 수령.
4. `signtool verify /pa` 로 신규 PFX 단독 테스트 (개발 머신, 임시 hello.exe 에 서명).
5. CI Secrets 의 `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` 갱신.
6. 다음 릴리스에서 신규 인증서로 자동 서명 — `signtool verify /pa /v` 통과 확인.

### 4.2 만료 직후 (이미 발급된 산출물)

- Timestamp 서버(`http://timestamp.digicert.com`) 가 발급한 RFC3161 타임스탬프가 함께
  서명되어 있으므로, 인증서 만료 후에도 과거 산출물의 서명은 유효하게 검증된다.
- 신규 산출물은 갱신된 인증서로만 서명한다.

## 5. 회전 (Compromise 대응)

인증서/패스프레이즈가 노출되었거나, 발급 기관이 침해 사실을 통지한 경우:

1. **즉시** 발급 기관에 revoke 요청.
2. CRL/OCSP 가 revoke 를 반영 (수 시간~24h).
3. GitHub Secrets 의 `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` 즉시 삭제.
4. 신규 인증서 발급 — 절차 §4.1.
5. 침해된 인증서로 서명된 산출물은 GitHub Releases 에서 yank (assets 삭제, latest.yml 갱신).
6. 사용자 안내 — 매뉴얼 §9.3 의 절차에 따라 SmartScreen 경고가 발생할 수 있음을 release notes 에 명시.

## 6. self-signed PoC 모드

운영자/사내 빌드에서 인증서 발급 전 self-signed 로 PoC 시:

1. PowerShell 로 self-signed 인증서 생성 — `New-SelfSignedCertificate -Subject "CN=oh-my-codex-poc" -CertStoreLocation Cert:\CurrentUser\My -KeyUsage DigitalSignature -KeyExportPolicy Exportable -Type CodeSigningCert`.
2. `.pfx` 로 export — `Export-PfxCertificate -Cert <thumbprint> -FilePath cert.pfx -Password (ConvertTo-SecureString "..." -AsPlainText -Force)`.
3. CI Secrets 에 `WIN_CSC_ALLOW_SELF_SIGNED=1` 추가 — `parseCodesignConfig` 가 경고 출력.
4. `sign-windows.ps1 -AllowSelfSigned` 로 verify (정식 chain 검증 우회).
5. 사용자 안내 — release notes 에 "Windows Defender SmartScreen 경고 발생 시 추가 정보 → 실행" 절차 링크.
6. **운영 배포 전 반드시 EV/OV 로 재서명할 것.**

## 7. 검증 절차 (수동)

```powershell
# 단일 파일 검증.
.\desktop\scripts\sign-windows.ps1 -Path release\oh-my-codex-0.16.3-x64-setup.exe -Verify

# signtool 직접 호출.
signtool verify /pa /v release\oh-my-codex-0.16.3-x64-setup.exe

# 인증서 chain 상세.
signtool verify /pa /v /d release\oh-my-codex-0.16.3-x64-setup.exe
```

verify 가 통과해야 하는 항목:

- File is signed
- Certificate chain to a Trusted Root CA (CRL/OCSP 정상)
- Timestamp 가 RFC3161 형식
- Hash algorithm = SHA256
- Publisher name = `oh-my-codex contributors` (또는 운영자가 지정한 값)

## 8. 책임자

- 1차 — 릴리스 담당자 (`@Yeachan-Heo`)
- 2차 — 보안 운영자 (백업 자격)
- 회전 의사결정 — 위 2인 합의 필수
