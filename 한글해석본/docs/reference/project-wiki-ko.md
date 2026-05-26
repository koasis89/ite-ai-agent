# 프로젝트 위키(OMX 네이티브 백포트)

이 노트는 프로젝트 위키 백포트에 대해 승인된 OMX 기본 형태를 캡처합니다.
의도적으로 문자 그대로의 OMC 포트가 **아닙니다**.

## 코어 형상

- 재사용 가능한 위키 도메인을 `src/wiki/*` 아래에 유지하세요.
- `src/mcp/wiki-server.ts`의 전용 MCP 서버에서 위키 작업을 노출합니다.
- 서버를 `omx_wiki`로 등록합니다.
- 프로젝트 지식을 커밋하고 공유할 수 있도록 저장소 루트 `omx_wiki/` 아래에 Wiki 저장소를 유지하세요.
- 벡터 임베딩을 추가하지 **마세요**. 쿼리는 키워드/태그 기반으로 유지됩니다.

## 구성 + 생성기 계약

`omx setup` / 구성 생성기는 전용 위키 MCP 블록을 소유해야 합니다:

```toml
[mcp_servers.omx_wiki]
command = "<absolute Node executable used by omx setup>"
args = ["<repo>/dist/mcp/wiki-server.js"]
enabled = true
```

bootstrap/config 경로는 `omx_wiki`을 자사 OMX 서버로 처리해야 합니다.
기존 내장 기능과 함께 diff를 작고 멱등성을 유지합니다.
설정 관리 자사 MCP 블록은 안정적인 절대 노드를 사용해야 합니다.
PATH 종속 베어 `node`이 아닌 `omx setup`을 실행한 실행 파일입니다.

## 보관 계약

Wiki 상태는 프로젝트 로컬이며 다음 위치에 있어야 합니다.

- `omx_wiki/*.md` — 콘텐츠 페이지
- `omx_wiki/index.md` — 생성된 카탈로그
- `omx_wiki/log.md` — 추가 전용 작업 로그

충실해야 하는 가드레일:

- `index.md` 및 `log.md`에 대한 예약 파일 가드
- 유니코드 안전 슬러깅
- CRLF-안전한 앞부분 구문 분석
- 이스케이프된 개행 문자에 대한 단일 패스 이스케이프 해제
- 토큰화 중 구두점 필터링
- CJK + 악센트 라틴어 토큰화 지원

문서와 코드는 `.omc/wiki/`으로 되돌아가서는 안 됩니다.

## 라이프사이클 + 후크 계약

- `SessionStart`은 **기본** 및 **제한** 상태를 유지합니다.
  - 위키가 이미 존재하는 경우 `omx_wiki/`을 읽고 간략한 맥락을 인터페이스화할 수 있습니다.
  - 대부분 읽기 상태를 유지해야 하며 대량 쓰기 시 시작을 차단해서는 안 됩니다.
- `SessionEnd`은 **런타임 대체** 및 **비차단** 상태를 유지합니다.
  - 최선을 다해 캡처하는 것은 괜찮습니다.
  - 누락된 Wiki 상태는 작동하지 않는 상태로 저하되어야 합니다.
- `PreCompact` 및 `PostCompact`은 기본 수명 주기 이음새입니다. `PreCompact`는 경계가 지정된 위키 컨텍스트를 인터페이스화하고 `PostCompact`은 압축 아티팩트에 대한 내구성 있는 위키 캡처를 넛지합니다.

## 라우팅(Routing) 계약

Wiki 액세스는 명시적이어야 합니다.

- `$wiki` 선호
- `wiki query`, `wiki add`, `wiki read`, `wiki delete`, `wiki ingest` 및 `wiki lint`와 같은 명확한 작업 동사를 허용합니다.
- 프롬프트 라우팅에서 암시적 `wiki` 명사 활성화를 피하세요.

이는 일반적인 문장의 잘못된 긍정을 방지할 수 있을 만큼 라우팅 인터페이스을 구체적으로 유지합니다.

## MCP 도구 인터페이스

전용 `omx_wiki` 서버는 8개의 안정화된 위키 도구를 노출해야 합니다.

- `wiki_ingest`
- `wiki_query`
- `wiki_lint`
- `wiki_add`
- `wiki_list`
- `wiki_read`
- `wiki_delete`
- `wiki_refresh`

이러한 도구는 `omx_wiki/`에 써야 하고, `omx_wiki/`가 없을 때 보수적인 호환성 대체 목적으로만 레거시 `.omx/wiki/`을 읽을 수 있으며 수명 주기 동작을 제한적으로 유지합니다.
