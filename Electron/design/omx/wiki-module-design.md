# OMX Wiki 모듈 개별 설계서

## 0. 문서 정보
- 모듈: wiki
- 기준 분석 문서: Electron/analysis/wiki-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: 영속 지식 베이스의 저장, 검색, lint, 세션 훅 통합 계약을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: storage atomic write, ingest/query/lint contract, lifecycle integration 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: wiki 모듈은 Markdown + YAML 프론트매터 형식의 영속 지식 페이지를 관리하여 세션 간 지식 축적과 검색을 지원하는 지식 베이스 계층이다.
- 주요기능:
  - 지식 흡수: 생성/머지-업데이트 기반 ingest
  - 키워드 검색: CJK 지원 토크나이저와 점수 기반 query
  - 상태 검사: orphan/stale/broken-ref/oversized 등 lint
  - 세션 훅 통합: session start/end/compact 브릿지

## 2. 책임과 경계
- 책임:
  - 위키 페이지를 원자적으로 쓰고 잠금으로 동시성을 제어
  - 머지-전용 업데이트로 기존 지식을 덮어쓰지 않음
  - 세션 훅에서 context와 auto-capture를 제공
- 비책임:
  - 임베딩/벡터 검색이나 외부 지식 그래프는 담당하지 않는다.
- 경계:
  - wiki는 Markdown 영속 저장 계층이며, 검색/쓰기/검사는 내부 파일 시스템 범위에서만 수행된다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - ingestKnowledge(root, input)
  - queryWiki(root, queryText, options)
  - lintWiki(root, config)
  - onSessionStart(data)
  - onSessionEnd(data)
  - onPreCompact(data)
  - onPostCompact(data)
  - readPage(root, filename)
  - writePage(root, page)
- 내부 인터페이스:
  - types.ts, storage.ts, ingest.ts, query.ts, lint.ts, lifecycle.ts
  - utils/paths.ts 경로 헬퍼
- 호출자:
  - omx wiki CLI, hooks lifecycle, MCP wiki server, manual knowledge capture

## 4. 데이터 구조와 계약
- 주요 타입:
  - WikiCategory
  - WikiPageFrontmatter, WikiPage
  - WikiIngestInput, WikiIngestResult
  - WikiQueryOptions, WikiQueryMatch
  - WikiLintIssue, WikiLintReport
  - WikiConfig, DEFAULT_WIKI_CONFIG
- 계약 원칙:
  - 프론트매터 스키마 버전은 1을 유지한다.
  - YAML 프론트매터 + Markdown 본문 형식을 따른다.
  - 기존 페이지는 덮어쓰지 않고 update 섹션을 추가한다.
  - reserved file은 명시적 allowReserved 없이는 쓰지 않는다.

## 5. 상태 전이와 불변식
- 위키 페이지 상태 전이:
  - create -> indexed -> queried/linted -> updated
  - ingest 시 existing page면 merge-update
- 훅 상태 전이:
  - session-start -> additionalContext
  - session-end -> auto capture -> index update
  - pre/post compact -> context/nudge 반환
- 불변식:
  - 원자적 쓰기와 파일 잠금이 항상 적용되어야 한다.
  - legacy fallback은 읽기 전용으로 다뤄야 한다.
  - query는 score > 0 페이지만 반환한다.

## 6. 핵심 시퀀스
- ingest 시퀀스:
  1. title을 slug로 변환
  2. 기존 페이지 여부 확인
  3. 신규면 생성, 기존이면 머지-업데이트
  4. 인덱스 갱신 및 로그 기록
- query 시퀀스:
  1. 토큰화
  2. 태그/제목/본문 점수 산정
  3. 상위 결과와 snippet 반환
- lifecycle 시퀀스:
  1. start 시 인덱스 context 반환
  2. end 시 session-log 자동 캡처
  3. compact 전후 추가 context/nudge 반환

## 7. 오류 처리 및 복구
- 경로 위반:
  - safeWikiPath가 차단한다.
- 잠금 충돌:
  - .wiki-lock 기반 재시도와 타임아웃으로 완화한다.
- 파싱 실패:
  - 내장 YAML 파서 실패 시 해당 페이지를 건너뛴다.
- 레거시 폴백:
  - omx_wiki가 없을 때만 .omx/wiki를 읽는다.

## 8. 보안/성능 고려
- 보안:
  - 경로 traversal 방지와 예약 파일 보호가 필수다.
  - 링크/출처 메타데이터로 지식의 근거를 유지한다.
- 성능:
  - 원자적 append/rename으로 쓰기 안정성을 확보한다.
  - query는 스코어링과 limit로 비용을 제어한다.

## 9. 테스트 케이스 맵
- 단위:
  - title slug 생성 및 safe path
  - ingest merge policy
  - query tokenization and scoring
  - lint issue detection
- 통합:
  - session lifecycle hooks와 wiki sync
  - legacy fallback read-only behavior
- 회귀:
  - reserved file overwrite 차단
  - CJK 검색 및 snippet 추출 유지

## 10. 오픈 이슈
- 인덱스/로그 파일의 장기 보존 정책을 별도로 문서화할 필요가 있음
- category와 confidence 기준을 운영자 가이드와 더 강하게 연결할 필요가 있음
- hook auto-capture의 타임아웃과 실패 복구 기준을 명시할 필요가 있음
