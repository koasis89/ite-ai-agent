# OMX Planning 모듈 개별 설계서

## 0. 문서 정보
- 모듈: planning
- 기준 분석 문서: Electron/analysis/planning-module-analysis.md
- 상태: Draft v0.1
- 작성일: 2026-05-29
- 문서 목적: ralplan 산출물 탐색, 실행 힌트 해석, 계획 파일 매칭 규칙을 정의
- 용어 기준: 한글 우선 표기, 최초 1회 영문 병기
- 업데이트 기준: 파일명 규칙, 승인 실행 힌트, Markdown 가시성 파서 변경 시 3, 4, 5, 7장을 우선 갱신

## 1. 개요와 주요기능
- 개요: planning 모듈은 ralplan이 생성한 PRD와 테스트 스펙 파일을 읽고, 승인된 실행 힌트를 추출해 팀 실행 또는 ralph 실행으로 연결하는 파일 시스템 브리지다.
- 주요기능:
  - 계획 아티팩트 스캔: .omx/plans와 .omx/specs에서 PRD/테스트 스펙 탐색
  - 파일명 파싱/매칭: timestamp와 slug를 이용해 PRD와 대응 테스트 스펙 연결
  - 승인 실행 힌트 파싱: PRD 본문에서 team/ralph 실행 명령 추출
  - 팀 DAG 해석: JSON sidecar 또는 마크다운 handoff에서 DAG 아티팩트 해석

## 2. 책임과 경계
- 책임:
  - planning artifacts의 존재 여부와 최신 파일 선택 규칙 제공
  - 코드 블록과 주석을 제외한 visible markdown 영역에서만 실행 힌트를 읽음
  - 승인된 실행 힌트를 구조화해 team/pipeline 모듈에 전달
- 비책임:
  - 계획 문서 생성 자체, team 실행, 질문 UI 렌더링은 담당하지 않는다.
- 경계:
  - planning은 파일 I/O 및 문서 해석 계층이며, stage 흐름은 pipeline, 실제 실행은 team 또는 ralph 계열 모듈이 담당한다.

## 3. 외부/내부 인터페이스
- 외부 인터페이스:
  - parsePlanningArtifactFileName(path)
  - comparePlanningArtifactPaths(left, right)
  - selectMatchingTestSpecsForPrd(prdPath, testSpecPaths)
  - readPlanningArtifacts(cwd)
  - isPlanningComplete(artifacts)
  - readLatestPlanningArtifacts(cwd)
  - readApprovedExecutionLaunchHintOutcome(cwd, mode, options?)
  - readApprovedExecutionLaunchHint(cwd, mode, options?)
  - readTeamDagArtifactResolution(cwd)
- 내부 인터페이스:
  - markdown-structure state machine
  - artifact-names slug/timestamp 유틸리티
  - ApprovedExecutionLaunchHintOutcome 판별 유니온
- 호출자:
  - pipeline/stages/ralplan.ts
  - pipeline/stages/team-exec.ts
  - team/approved-execution.ts

## 4. 데이터 구조와 계약
- 주요 타입:
  - PlanningArtifactKind: prd, test-spec, deep-interview, deep-interview-autoresearch
  - PlanningArtifactNameInfo: kind, slug, timestamp?
  - PlanningArtifacts: plansDir, specsDir, prdPaths, testSpecPaths, deepInterviewSpecPaths
  - ApprovedExecutionLaunchHint: mode, command, task, workerCount?, agentType?, linkedRalph?, sourcePath, testSpecPaths
  - ApprovedExecutionLaunchHintOutcome: absent | ambiguous | resolved
  - TeamDagArtifactResolution: source, prdPath, planSlug, artifactPath?, content?, warnings[]
- 계약 원칙:
  - timestamp가 있는 PRD는 동일 timestamp의 테스트 스펙과만 매칭한다.
  - visible markdown 영역 밖의 명령 예시는 실행 힌트로 취급하지 않는다.
  - 승인 실행 힌트가 여러 개면 ambiguous로 반환하고 즉시 실행하지 않는다.
  - command 필드는 사용자가 PRD에 기록한 형식을 유지하되, task는 따옴표 해제 후 구조화한다.

## 5. 상태 전이와 불변식
- planning 해석 상태 전이:
  - scan -> parse -> select -> resolved | absent | ambiguous
- Markdown visibility 상태 전이:
  - normal -> fenced | comment | indented-code -> normal
- 불변식:
  - parsePlanningArtifactFileName가 null을 반환한 파일은 planning artifact 집합에 포함하지 않는다.
  - latest selection은 timestamp 우선, 동일 조건이면 사전순으로 결정한다.
  - ambiguous outcome에서는 hint 객체를 노출하지 않는다.
  - decodeApprovedExecutionQuotedValue는 단일/이중 인용 문자열만 정상 디코딩 대상으로 본다.

## 6. 핵심 시퀀스
- 최신 계획 선택 시퀀스:
  1. readPlanningArtifacts가 plans/specs 디렉터리를 스캔
  2. artifact-names가 파일명을 kind, slug, timestamp로 파싱
  3. compare/select 유틸로 최신 PRD 선택
  4. selectMatchingTestSpecsForPrd가 대응 테스트 스펙을 연결
- 승인 실행 힌트 시퀀스:
  1. PRD 본문을 읽음
  2. collectMarkdownVisibleMatches가 visible text만 추출
  3. team 또는 ralph 정규식으로 명령 힌트 탐색
  4. 단일 결과면 resolved, 다수면 ambiguous, 없으면 absent 반환
- 팀 DAG 해석 시퀀스:
  1. team-dag-{slug}.json sidecar 존재 여부 확인
  2. 없으면 PRD handoff 섹션의 JSON/텍스트 탐색
  3. source와 warnings를 포함한 해석 결과 반환

## 7. 오류 처리 및 복구
- plans/specs 디렉터리 부재:
  - 빈 artifacts로 처리해 상위에서 planning incomplete로 판단
- 파일명 규칙 불일치:
  - null 반환으로 제외하고, 최신 선택 후보에 포함하지 않음
- PRD 실행 힌트 중복:
  - ambiguous 상태를 반환해 자동 실행 차단
- Markdown 오탐 방지 실패 위험:
  - code fence와 comment 상태 머신으로 예시 명령 오탐을 최소화

## 8. 보안/성능 고려
- 보안:
  - 승인되지 않은 문서 영역이나 예시 블록의 명령을 실행 힌트로 사용하지 않는다.
  - team/ralph 명령은 parsing 결과만 전달하고 실제 실행은 별도 승인 경로가 담당한다.
- 성능:
  - 파일명 수준 필터링으로 전체 파일 읽기를 최소화
  - visible markdown 스캔은 단일 패스 상태 머신으로 수행한다.

## 9. 테스트 케이스 맵
- 단위:
  - artifact 파일명 파싱과 timestamp 비교
  - markdown visibility 상태 전이와 visible match 수집
  - quoted value 디코딩
- 통합:
  - readLatestPlanningArtifacts의 최신 PRD/테스트 스펙 매칭
  - 승인 실행 힌트 resolved/absent/ambiguous 판정
  - team DAG sidecar와 markdown fallback 해석
- 회귀:
  - code fence 내부 team 명령 오탐 방지
  - legacy testspec 파일명과 timestamp 방식 공존 검증

## 10. 오픈 이슈
- approved execution hint의 문서 내 허용 위치를 섹션 단위로 더 제한할지 검토 필요
- repo-context/team-dag sidecar의 버전 스키마 표준화가 필요
- 계획 아티팩트 정리 정책과 보존 기간 기준이 추가로 필요
