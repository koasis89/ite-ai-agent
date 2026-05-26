# 자동연구 파일럿 임무

이러한 임무 번들은 이 저장소 스냅샷에 대한 **자동 연구 준비 파일럿**입니다.

각 임무 디렉토리에는 다음이 포함됩니다.
- `mission.md` — 목표, 범위 및 예상 결과물
- `sandbox.md` — 평가자 계약 및 안전/운영 규칙

현재 파일럿/예:
- `cli-discoverability-pilot/`
- `security-path-traversal-pilot/`
- `in-action-cat-shellout-demo/` — 자동 조사 루프의 매니페스트 `cat` 쉘아웃을 제거하고 집중 평가자를 통해 수정 사항을 입증하는 소규모 자체 호스팅 OMX 최적화 데모

오늘 바로 평가자를 실행할 수 있습니다.

```bash
node scripts/eval-cli-discoverability.js
node scripts/eval-security-path-traversal.js
node scripts/eval-in-action-cat-shellout-demo.js
```

실제 엔드투엔드 실행을 보려면 다음을 실행하세요.

```bash
omx autoresearch missions/in-action-cat-shellout-demo
```

그런 다음 `.omx/logs/autoresearch/<run-id>/manifest.json`, `candidate.json` 및 `iteration-ledger.json`을 검사하여 감독자의 유지/폐기/중지 결정을 확인합니다.

이 번들은 일반적인 산문 예제가 아닌 일류 `omx autoresearch` 임무로 설계되었습니다.
