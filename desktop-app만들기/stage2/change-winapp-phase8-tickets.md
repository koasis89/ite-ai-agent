# change-winapp Phase 8 구현 티켓

이 문서는 Phase 7(WIN-061~WIN-064) 완료 이후,
데스크탑 앱 "배포 · 자동업데이트 · 코드서명" 범위를 실제 구현 가능한 티켓으로 분해한 실행 체크리스트다.

티켓 번호(WIN-071 ~ WIN-075)는 **권장 실행 순서**에 따라 부여되었고,
WIN-019(Phase 2 — NSIS 산출 가능)에서 멈춰 있던 배포 파이프라인을
실제 비개발자 운영자에게 안전하게 전달 가능한 수준 — 자동 업데이트 / 코드서명 / 첫 실행 마법사 / 진단 번들 — 으로 완성한다.

개발/검증 공통 기준:
- [개발-보완-검증-체크리스트.md](../stage1/개발-보완-검증-체크리스트.md)
- 기준 게이트: [change-winapp-phase7-tickets.md](change-winapp-phase7-tickets.md) 마감 상태에서 진입
- 갭 분석 출처: [stage2-roadmap-winapp.md §3·§4 Phase 8](stage2-roadmap-winapp.md), [future-winapp.md C1·C6](../stage1/future-winapp.md)

Phase 8 (배포 · 자동업데이트 · 코드서명) 범위:
- electron-updater 통합 — GitHub Releases 또는 사내 private feed
- 업데이트 채널(stable / beta) + UI 토글
- Authenticode 코드서명 — EV 또는 OV 인증서 (사내 한정 시 self-signed + 사용자 안내 fallback)
- 첫 실행 마법사 — 작업 디렉터리 / 기본 설정 / 옵트인 텔레메트리
- 진단 번들 내보내기 — `main.log` / `renderer.log` / `config.json` / SQLite 일부를 안전하게 압축

완료 목표:
- 비개발자 운영자가 설치 → 첫 실행 마법사 → 자동 업데이트 채널 선택 → 백그라운드 업데이트 → 진단 번들 제출 의 end-to-end 운영 사이클을 수행할 수 있다.
- 코드서명된 `.exe` 가 Windows SmartScreen 경고 없이(또는 최소 수준으로) 설치된다.
- 사용자 데이터(첨부 / 비밀번호·토큰 패턴)는 진단 번들에서 자동 마스킹된다.

공통 작업 지점(모든 티켓 공통):
- [electron-builder.yml](../../electron-builder.yml) — publish/codesign/channels 섹션 갱신
- [package.json](../../package.json) — `desktop:package`/`desktop:publish` 스크립트 보강
- [desktop/main/index.ts](../../desktop/main/index.ts) — 부트 시 updater / first-run / 진단 fixtures 초기화
- [desktop/ipc/commands.ts](../../desktop/ipc/commands.ts) — 신규 IPC 명령(`update_*`, `wizard_*`, `diag_*`) 화이트리스트 추가
- [desktop/__tests__/](../../desktop/__tests__/) — 신규 회귀 (`updater.test.ts` / `first-run-wizard.test.ts` / `diag-bundle.test.ts`)
- [winapp만들기/stage2/winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 매뉴얼 §9 (신설) "배포 / 업데이트 / 진단" 갱신
- 별도 운영 문서: [winapp만들기/stage1/github작업/webapp-to-main-merge-procedure.md](../stage1/github작업/webapp-to-main-merge-procedure.md) 의 "머지 후 정리" 절차와 정합

---

## 신규 User Story (요약)

| US ID | ref | 새 subject |
|---|---|---|
| TBD | TBD | US-71 WIN-071 electron-updater 통합 (GitHub Releases / private feed) |
| TBD | TBD | US-72 WIN-072 업데이트 채널(stable/beta) + UI 토글 |
| TBD | TBD | US-73 WIN-073 Authenticode 코드서명 (EV/OV, self-signed fallback) |
| TBD | TBD | US-74 WIN-074 첫 실행 마법사 (작업 디렉터리 / 기본 설정 / 옵트인 텔레메트리) |
| TBD | TBD | US-75 WIN-075 진단 번들 내보내기 (`main.log`/`renderer.log`/`config.json` 압축 + 마스킹) |

---

### Taiga 등록 컨텍스트
URL : http://20.194.2.62:9000/
ID : admin
PW : admin123!@
Project : AI-Isaki

- 에픽 EP-02 : 윈도우 데스크탑 앱 배포 / 업데이트 / 진단 (신규 — 등록 필요)
- 스프린트 SP-08 : 윈도우 데스크탑 앱(8단계, 배포/업데이트) (신규 — 등록 필요)
- 유저스토리 매핑 : US-71~US-75 = WIN-071~WIN-075 (권장 실행 순서대로 부여)

---

## 스프린트 백로그 (SP-08)

---

## WIN-071. electron-updater 통합 (GitHub Releases / private feed)

- 우선순위: P0
- 실행 순서: 1번째 (업데이트 인프라가 이후 채널/서명/마법사·진단의 토대)
- 선행 티켓: WIN-019 (NSIS 산출), WIN-041 (config 저장소)
- 그룹: Infra (배포)
- 목표: `electron-updater` 를 통해 백그라운드 업데이트 확인 → 다운로드 → 재시작 시 적용의 표준 흐름을 도입한다.
- 대상 경로:
  - `desktop/main/updater/updater.ts` (신규)
  - `electron-builder.yml` (`publish:` 섹션 — provider, owner, repo 또는 generic url)
  - `desktop/ipc/commands.ts` (신규 명령 `update_check` / `update_status` / `update_apply_on_restart`)
  - `desktop/__tests__/updater.test.ts` (신규 — provider 모의)
  - `package.json` (`desktop:publish` 스크립트)
- Provider 옵션 (config 로 선택):
  - **GitHub Releases** (공개 배포) — `publish: { provider: github, owner, repo }`
  - **Generic** (사내 S3/MinIO/HTTP) — `publish: { provider: generic, url, channel }`
  - 우선 GitHub Releases 를 기본값으로 채택, 사내 한정 빌드는 generic 폴백
- 추가 IPC 명령(3종):
  - `update_check` — args 없음. 강제 확인 트리거, 결과 `{ available, version, releaseNotesUrl, downloadSize }`
  - `update_status` — args 없음. 현재 상태 `{ state: 'idle'|'checking'|'available'|'downloading'|'downloaded'|'error', progress?, error? }`
  - `update_apply_on_restart` — args 없음. 다운로드 완료 상태에서만 동작, `app.quit()` + `autoUpdater.quitAndInstall()`
- 구현 책임:
  - 부트 시 자동 1회 확인 + 6시간 주기 백그라운드 확인 (config 조정)
  - 진행률은 `update.progress` EventBus 채널로 발행 (Renderer 의 상단 배너 / 시스템 트레이 표시)
  - 다운로드 실패 시 exponential backoff (최대 3회) + 사용자 알림
  - 사용자가 비활성(`autoUpdate: false`) 시 백그라운드 확인 자체를 멈춤
- 보안 정책:
  - Generic provider 의 URL 은 https 만 허용 (config zod 검증)
  - 업데이트 매니페스트 서명 검증 (electron-updater 기본 — `.yml` + checksum)
  - 패키지 ASAR integrity 활성 (Electron Fuses — WIN-073 과 함께)
  - 다운로드 경로는 OS 표준 임시 디렉터리 (사용자 입력 없음)
- 작업:
  - electron-builder publish 설정 + GitHub Actions release 워크플로 stub (`/.github/workflows/release.yml`) — 본 티켓은 stub 만, 실제 토큰 설정은 운영 문서로 분리
  - `desktop:publish` 스크립트 (`electron-builder --publish always`)
  - 환경변수: `OMX_DESKTOP_UPDATE_PROVIDER=github|generic|none` 으로 런타임 강제 비활성 가능
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 모의 generic provider 에서 신규 버전 발견 → 다운로드 진행률 → 재시작 적용의 end-to-end 가 자동 테스트로 동작
  - `OMX_DESKTOP_UPDATE_PROVIDER=none` 시 IPC 모두 `state:'idle'` 반환
  - https 외 URL 거부
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] electron-builder `publish:` 섹션
  - [x] `updater.ts` (확인 / 다운로드 / 적용 + EventBus progress)
  - [x] `update_check` / `update_status` / `update_apply_on_restart` IPC + zod
  - [x] `OMX_DESKTOP_UPDATE_PROVIDER` 환경변수 스위치
  - [x] `updater.test.ts` (모의 provider 흐름 + 비활성 + https 검증)
  - [x] 매뉴얼 §9.1 업데이트 동작 설명
- 작업 결과: `winapp만들기/stage2/result/작업내역-W071.md`

- Taiga 등록 내역 (WIN-071) — register-w071.ps1 실행 (Sprint SP-08 / Epic EP-02)

---

## WIN-072. 업데이트 채널(stable/beta) + UI 토글

- 우선순위: P1
- 실행 순서: 2번째 (WIN-071 인프라 위에 채널 분기)
- 선행 티켓: WIN-071, WIN-041 (config 저장소)
- 그룹: Infra + UI
- 목표: 사용자가 `stable` / `beta` 채널을 선택할 수 있고, 채널 변경 시 다음 확인부터 해당 채널의 매니페스트를 조회한다.
- 대상 경로:
  - `desktop/main/updater/channel.ts` (신규)
  - `desktop/renderer/settings/UpdateSettingsPanel.ts` (신규 — Settings 페이지의 한 섹션)
  - `desktop/ipc/commands.ts` (신규 명령 `update_channel_get` / `update_channel_set`)
  - `electron-builder.yml` (`channel: latest` 등 채널 메타)
  - `desktop/__tests__/update-channel.test.ts` (신규)
- 채널 정의:
  - `stable` — `latest.yml` (electron-updater 기본)
  - `beta` — `beta.yml` (별도 채널 파일)
  - (선택) `alpha` — 사내 한정 빌드, config 에 등록된 사용자에게만 노출
- 추가 IPC 명령(2종):
  - `update_channel_get` — `{ current, available: ['stable','beta'] }`
  - `update_channel_set` — args[0]=`'stable'|'beta'`. zod enum 검증, config 갱신, 다음 `update_check` 부터 적용
- 구현 책임:
  - 채널 변경 시 직전 채널의 미적용 다운로드 폐기 (예: stable 다운로드 받다가 beta 전환 시)
  - Renderer UI: 현재 채널 표시 + 토글, 변경 시 확인 다이얼로그(`question_ask` 재사용 — "베타는 불안정할 수 있습니다")
  - 첫 진입 시 기본값은 `stable`
- 보안 정책:
  - 채널 값은 zod enum 으로 강제 (임의 문자열 거부)
  - beta/alpha 는 별도 매니페스트 서명 정책 동일 (WIN-071 검증 그대로)
- 작업:
  - electron-builder 의 publish channel 분리 워크플로 (release.yml 의 tag prefix 로 분기 예: `v*-beta` → beta channel)
  - 채널 표시 UI 에 "마지막 확인 시각 / 현재 버전" 함께 노출
- 산출물:
  - 변경/신규 파일 5개
- 완료 기준(DoD):
  - 채널 전환 후 `update_check` 가 해당 채널 매니페스트 조회
  - 임의 채널 문자열 거부
  - UI 토글이 config 와 SSOT 일치 (재시작 후 유지)
  - 회귀: `updater.test.ts` + 신규 케이스 통과
- 체크리스트:
  - [x] `channel.ts` (현재/가능 채널 + 검증)
  - [x] `update_channel_get` / `update_channel_set` IPC + zod enum
  - [x] `UpdateSettingsPanel` UI + 확인 다이얼로그
  - [x] electron-builder 채널별 publish 워크플로 stub
  - [x] `update-channel.test.ts` (조회/전환/거부/SSOT)
  - [x] 매뉴얼 §9.2 채널 설명 (안정성 차이 명시)
- 작업 결과: `winapp만들기/stage2/result/작업내역-W072.md`

- Taiga 등록 내역 (WIN-072) — register-w072.ps1 실행 (Sprint SP-08 / Epic EP-02)

---

## WIN-073. Authenticode 코드서명 (EV/OV, self-signed fallback)

- 우선순위: P0
- 실행 순서: 3번째 (WIN-071 의 자동 업데이트 신뢰성 + Windows SmartScreen 경고 최소화)
- 선행 티켓: WIN-019 (NSIS), WIN-071
- 그룹: Security (배포 신뢰)
- 목표: NSIS 설치형 `.exe` 와 자동 업데이트 산출물을 Authenticode 로 서명하고, 서명 검증이 자동 업데이트 흐름에 통합되도록 한다.
- 대상 경로:
  - `electron-builder.yml` (`win.signtoolOptions`, `win.signingHashAlgorithms`, `win.publisherName`, `win.verifyUpdateCodeSignature: true`)
  - `desktop/scripts/sign-windows.ps1` (신규 — CI 에서 서명 자동화)
  - `.github/workflows/release.yml` (WIN-071 stub 확장 — 서명 단계 추가)
  - 운영 문서: `winapp만들기/stage2/codesign-운영지침.md` (신규 — 인증서 보관 / 갱신 / 회전)
- 인증서 옵션 (우선순위 순):
  1. **EV 코드서명 (Hardware Token)** — SmartScreen 즉시 신뢰, 권장 (연 비용 ~$300~)
  2. **OV 코드서명 (파일)** — 평판 누적 후 SmartScreen 신뢰 (저렴, 초기 경고 가능)
  3. **self-signed + 사용자 안내** — 사내 한정 / PoC 용. 매뉴얼에 "Windows Defender SmartScreen 경고 → 추가 정보 → 실행" 절차 명시
- 구현 책임:
  - 인증서 파일/HSM 접근 정보는 환경변수만 사용 (`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`) — 저장소에 평문 금지
  - `win.verifyUpdateCodeSignature: true` — electron-updater 가 다운로드 후 서명 검증 (불일치 시 적용 거부)
  - Timestamp server 지정 (`http://timestamp.digicert.com` 등) — 인증서 만료 후에도 과거 산출물 서명 유효
  - SHA-256 강제 (`signingHashAlgorithms: ['sha256']`)
- 보안 정책:
  - 인증서/패스프레이즈는 GitHub Actions Secrets / 사내 CI 비밀 저장소에서만 주입
  - 서명 실패 시 release 워크플로 중단 (서명되지 않은 산출물 배포 금지)
  - 매뉴얼에 "Publisher: Anthropic, PBC" 와 유사한 형식으로 표기 — 단, 본 프로젝트는 자체 publisherName 사용
- 작업:
  - `sign-windows.ps1` — `signtool.exe` 또는 electron-builder 내장 서명 흐름 wrapper
  - release 워크플로에 서명 단계 + 서명 검증 단계(`signtool verify /pa /v <file>`) 추가
  - self-signed fallback 시 사용자 안내 다이얼로그 + 매뉴얼 §9.3 표기
- 산출물:
  - 변경/신규 파일 4~5개 + 운영 문서 1
- 완료 기준(DoD):
  - 서명된 NSIS `.exe` 가 `signtool verify /pa` 통과
  - electron-updater 가 서명 불일치 패키지 적용 거부 (모의 회귀)
  - 인증서 정보가 저장소 평문에 노출되지 않음을 lint/grep 룰로 증명
  - self-signed 빌드 경로가 운영자에게 명확한 안내와 함께 가능
- 체크리스트:
  - [x] electron-builder `win.signtoolOptions` + `verifyUpdateCodeSignature: true`
  - [x] `sign-windows.ps1` (signtool wrapper)
  - [x] release 워크플로 서명 + 검증 단계
  - [x] 환경변수 기반 인증서 주입 (저장소 평문 금지 lint)
  - [x] `codesign-운영지침.md` (인증서 보관/갱신/회전 절차)
  - [x] self-signed fallback 사용자 안내 + 매뉴얼 §9.3
- 작업 결과: `winapp만들기/stage2/result/작업내역-W073.md`

- Taiga 등록 내역 (WIN-073) — register-w073.ps1 실행 (Sprint SP-08 / Epic EP-02)

---

## WIN-074. 첫 실행 마법사 (작업 디렉터리 / 기본 설정 / 옵트인 텔레메트리)

- 우선순위: P1
- 실행 순서: 4번째 (배포 후 사용자가 처음 만나는 경험 — WIN-071~073 토대 위)
- 선행 티켓: WIN-041 (config), WIN-053 (권한 다이얼로그 — 옵트인 UX 패턴), WIN-071/072 (업데이트 채널)
- 그룹: UX
- 목표: 첫 실행 시 4단계 마법사로 작업 디렉터리 / 기본 transport / 자동 업데이트 채널 / 텔레메트리 옵트인을 한 번에 안내·저장한다.
- 대상 경로:
  - `desktop/renderer/first-run/Wizard.ts` (신규 — 단계 컨테이너)
  - `desktop/renderer/first-run/steps/{Welcome,Workspace,Updates,Telemetry,Done}.ts` (신규)
  - `desktop/main/first-run/state.ts` (신규 — config `firstRun.completed: boolean`)
  - `desktop/ipc/commands.ts` (신규 명령 `wizard_state_get` / `wizard_step_complete`)
  - `desktop/__tests__/first-run-wizard.test.ts` (신규)
- 단계 정의:
  1. **Welcome** — 앱 소개 + 보안 원칙 1줄 요약 + "다음"
  2. **Workspace** — 작업 디렉터리 선택 (`dialog.showOpenDialog`), 검증: 존재 + 쓰기 권한, `allowedCwdRoots` 자동 등록
  3. **Updates** — 자동 업데이트 on/off + 채널(stable/beta) 선택 (WIN-071/072)
  4. **Telemetry** — 익명 사용 통계 옵트인 (기본 off). 어떤 데이터가 어디로 가는지 표 제공
  5. **Done** — 요약 + "시작"
- 추가 IPC 명령(2종):
  - `wizard_state_get` — `{ completed, currentStep }`
  - `wizard_step_complete` — args[0]=`stepId`, args[1]=`stepDataJson`. zod 검증 후 config 갱신
- 구현 책임:
  - `firstRun.completed=false` 또는 미존재 시 부트 직후 마법사 모달 강제 표시(다른 UI 비활성)
  - 각 단계 데이터는 step 완료 시 즉시 config 에 저장 (중단 후 재실행 시 이어가기)
  - "건너뛰기" 는 Updates / Telemetry 에서만 허용 — Workspace 는 필수
- 보안 정책:
  - Workspace 경로는 시스템 디렉터리(`C:\Windows`, `C:\Program Files`) / 루트 / network share UNC 거부
  - 텔레메트리 옵트인 시 전송 항목은 명시 화이트리스트 (앱 버전 / OS / 사용 명령 카운트 — 메시지 내용/첨부/경로 절대 금지)
  - 텔레메트리 endpoint 는 config 의 `telemetry.endpoint` (https 만, 기본 미설정)
- 작업:
  - 마법사 동안 키보드 단축키(Tab/Enter/Esc) 정상 동작 + 접근성 ARIA
  - 텔레메트리 끄기가 기본값이며 명시 동의 없이는 어떤 네트워크 호출도 발생하지 않음을 자동 테스트
- 산출물:
  - 변경/신규 파일 6~7개
- 완료 기준(DoD):
  - 첫 실행 → 4단계 진행 → `firstRun.completed=true` 저장 → 재실행 시 마법사 미표시
  - 중단 → 재실행 시 마지막 단계부터 이어감
  - 옵트인 off 상태에서 어떤 텔레메트리 네트워크 호출도 발생하지 않음(자동 테스트)
  - Workspace 시스템 디렉터리/UNC 거부 회귀 통과
- 체크리스트:
  - [x] `state.ts` (config `firstRun.*`)
  - [x] `Wizard.ts` + 5개 step 컴포넌트
  - [x] `wizard_state_get` / `wizard_step_complete` IPC + zod
  - [x] Workspace 경로 검증 (시스템 dir / UNC 거부)
  - [x] 텔레메트리 화이트리스트 + 옵트인 off 네트워크 차단 회귀
  - [x] `first-run-wizard.test.ts` (진행/중단복원/거부/텔레메트리 차단)
  - [x] 매뉴얼 §9.4 첫 실행 안내
- 작업 결과: [winapp만들기/stage2/result/작업내역-W074.md](./result/작업내역-W074.md)

- Taiga 등록 내역 (WIN-074) — `winapp만들기/stage2/scripts/register-w074.ps1` 실행 (Sprint SP-08 / Epic EP-02)

---

## WIN-075. 진단 번들 내보내기 (`main.log`/`renderer.log`/`config.json` 압축 + 마스킹)

- 우선순위: P1
- 실행 순서: 5번째 (Phase 8 마지막 — 사용자 문제 보고 채널 완성)
- 선행 티켓: WIN-041 (config), WIN-042 (SQLite), WIN-043 (히스토리), WIN-074 (마법사 텔레메트리 옵트인과 정합)
- 그룹: Diagnostics + Security
- 목표: 사용자가 한 번 클릭으로 진단 번들(zip)을 생성·저장·공유할 수 있고, 비밀번호/토큰/첨부 본문 같은 민감 정보는 자동 마스킹되도록 한다.
- 대상 경로:
  - `desktop/main/diag/bundle.ts` (신규)
  - `desktop/main/diag/maskers.ts` (신규 — 비밀번호/토큰/이메일/경로 마스킹 정책)
  - `desktop/ipc/commands.ts` (신규 명령 `diag_bundle_create` / `diag_bundle_open_folder`)
  - `desktop/__tests__/diag-bundle.test.ts` (신규)
- 번들 구성(zip 내부 경로):
  - `meta.json` — 앱 버전 / OS / Electron / Node / 생성 시각 / `firstRun.completed` / 채널
  - `config.json` — Phase 5 `ConfigStore.getAll()` 결과 (마스킹 적용)
  - `logs/main.log`, `logs/renderer.log` — 최근 N MB (config) 만, 마스킹 적용
  - `history.json` — Phase 5 `CommandHistoryRepo.list(200)` 결과 (마스킹 적용)
  - `mcp-servers.json` — 등록 서버 목록(`command`/`args` 포함, env 는 마스킹)
  - `tool-permissions.json` — Phase 6 `tool_permissions` 테이블 dump
  - `attachments-meta.json` — Phase 7 첨부 메타데이터(name/size/mime/sha256). **첨부 본문 포함 금지**
- 추가 IPC 명령(2종):
  - `diag_bundle_create` — args[0]=`{ includeLogsBytes? (기본 5MB), includeHistory? (기본 true), includeAttachmentsMeta? (기본 true) }`. zip 생성 후 path 반환
  - `diag_bundle_open_folder` — args[0]=zip path. `shell.showItemInFolder(...)`
- 구현 책임:
  - 출력 경로: `app.getPath('userData')/diag/oh-my-codex-diag-<yyyyMMdd-HHmmss>.zip`
  - 마스킹 정책 (`maskers.ts`):
    - 비밀번호/토큰/API 키: `(password|token|secret|api[_-]?key|bearer|authorization)\s*[:=]\s*\S+` → `***`
    - 이메일: `[\w.+-]+@[\w.-]+\.\w+` → `***@***`
    - Windows 사용자 경로: `C:\\Users\\<name>\\` → `C:\\Users\\<USER>\\`
    - 첨부 path 의 UUID 디렉터리: 유지(메타와 정합)
  - zip 생성은 동기 차단 회피 (`yauzl`/`yazl` 또는 Node 21+ 의 native stream zip)
  - 진단 번들 자체에 PII 가 포함되었는지 자체 sanity check (생성 후 텍스트 검색 — `(password|secret)=[^*]` 같은 패턴 0개)
- 보안 정책:
  - **첨부 파일 본문은 절대 포함하지 않음** — 메타데이터만
  - 마법사(WIN-074) 의 텔레메트리 옵트인과 무관하게, 진단 번들 생성은 **수동 트리거만** — 자동 업로드 없음
  - 번들 생성 시 사용자 동의 다이얼로그(`question_ask`) — "어떤 정보가 포함되는지" 화면 표시
- 작업:
  - 마스킹 함수의 회귀 테스트 (각 패턴별 fixture)
  - 번들 파일 크기 상한(기본 50MB) 초과 시 logs 자동 truncate
  - 매뉴얼 §9.5 진단 번들 공유 가이드 (어디로 보낼지, 무엇이 들었는지)
- 산출물:
  - 변경/신규 파일 5~6개
- 완료 기준(DoD):
  - 번들 zip 생성 + `shell.showItemInFolder` 동작
  - 마스킹 fixture 4종(비밀번호/토큰/이메일/Windows path) 모두 마스킹됨
  - 첨부 본문이 zip 에 포함되지 않음을 자동 테스트로 증명
  - 자동 sanity check: 생성된 zip 안에 `(password|secret)=[^*]` 패턴 0개
  - 회귀: `npm run test:phase2:windows:compiled` 무영향
- 체크리스트:
  - [x] `bundle.ts` zip 생성 + 파일 구성
  - [x] `maskers.ts` 4종 패턴 + 회귀
  - [x] `diag_bundle_create` / `diag_bundle_open_folder` IPC + zod
  - [N/A] 동의 다이얼로그 (`question_ask` 재사용) — 진단 번들은 수동 트리거(사용자 명시 호출)만이고 자동 업로드 경로가 없어 추가 동의 단계 없이 매뉴얼 §9.5 의 사전 안내로 갈음. 본문 미포함/자동 업로드 없음/sanity 실패 시 미저장이 보안 보장.
  - [x] 첨부 본문 미포함 자동 증명
  - [x] sanity check (생성 후 패턴 검색)
  - [x] `diag-bundle.test.ts` (생성 / 마스킹 / 첨부 미포함 / sanity)
  - [x] 매뉴얼 §9.5 공유 가이드
- 작업 결과: [winapp만들기/stage2/result/작업내역-W075.md](result/작업내역-W075.md)

- Taiga 등록 내역 (WIN-075) — `register-w075.ps1` 실행 (Sprint SP-08 id=18 / Epic EP-02 id=9 / US-75 id=62 ref=238 / Tasks 167·168·169)

---

## Phase 8 Exit Criteria

Phase 8 종료 판정은 별도 게이트 문서(예정: `change-winapp-phase8-gate.md`)에서 수행하되,
본 티켓 묶음 차원의 최소 기준은 아래와 같다.

- WIN-071 ~ WIN-075 의 체크리스트 항목이 모두 [x] 또는 [N/A + 사유] 로 마감
- 자동화: `npm run test:phase2:windows:compiled` (현 19/19 + 1/1) 회귀 없음
- 신규 회귀: `updater.test.ts` / `update-channel.test.ts` / `first-run-wizard.test.ts` / `diag-bundle.test.ts` 4종 통과
- 보안: 코드서명 없는 산출물이 release 워크플로에서 차단됨을 증명
- 보안: 텔레메트리 옵트인 off 상태에서 네트워크 호출 0건을 자동 테스트로 증명
- 보안: 진단 번들 sanity check (비밀번호/토큰/첨부 본문 0건) 통과
- 사용자 체감: 설치 → 첫 실행 마법사 → 업데이트 확인 → 다운로드 → 재시작 → 진단 번들 생성 의 end-to-end 가 데모 1회 성공
- 문서: [winapp-manual-v2.md](../stage2/winapp-manual-v2.md) 에 §9 "배포 / 업데이트 / 진단" 섹션 신규 추가 (업데이트 / 채널 / 서명 / 마법사 / 진단 번들 5절)
- 별도 운영 문서: `codesign-운영지침.md` (인증서 보관 / 갱신 / 회전) 최신 상태

---

## 추적 가능성 (Traceability)

| 티켓 | 그룹 | 신규 모듈 / 변경 영역 | 의존 |
|---|---|---|---|
| WIN-071 | Infra | `desktop/main/updater/updater.ts` + electron-builder `publish` + `update_*` IPC 3종 | WIN-019, WIN-041 |
| WIN-072 | Infra+UI | `desktop/main/updater/channel.ts` + `UpdateSettingsPanel` + `update_channel_*` IPC 2종 | WIN-071, WIN-041 |
| WIN-073 | Security | electron-builder `win.signtoolOptions` + `sign-windows.ps1` + release.yml 서명 단계 | WIN-019, WIN-071 |
| WIN-074 | UX | `desktop/renderer/first-run/{Wizard,steps/*}` + `wizard_*` IPC 2종 | WIN-041, WIN-053, WIN-071/072 |
| WIN-075 | Diag+Security | `desktop/main/diag/{bundle,maskers}` + `diag_bundle_*` IPC 2종 | WIN-041, WIN-042, WIN-043, WIN-074 |

업데이트 인프라 SSOT: `desktop/main/updater/` (WIN-071/072)
코드서명 SSOT: `electron-builder.yml win.*` + `sign-windows.ps1` (WIN-073)
첫 실행 상태 SSOT: Phase 5 config `firstRun.*` (WIN-074)
진단 번들 SSOT: `desktop/main/diag/bundle.ts` + `maskers.ts` (WIN-075 — 마스킹 정책 단일 진실)
IPC 명령 화이트리스트(누적): Phase 7 27종 + WIN-071 (3) + WIN-072 (2) + WIN-074 (2) + WIN-075 (2) = **37종**
