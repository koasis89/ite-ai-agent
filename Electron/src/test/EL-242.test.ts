/**
 * EL-242.test.ts — 마크다운 AST 파싱 기반 JSON normalizer 및 컬럼 매칭 파이프라인 검증
 *
 * 시나리오:
 *   A. parseMarkdownToCustomAST: 마크다운 여러 구조(제목, 코드블록, 블록인용, 표, 리스트)가 정상적으로 custom AST 형태로 파싱되는지 검증
 *   B. findMatchingField: 기호 공백을 무력화한 지능형 한영 컬럼 별칭 매칭 검증
 *   C. castValueType: 각각의 칼럼 가공 유형인 string, number, boolean 값 캐스팅 검증
 *   D. normalizeTableToJSON: AST 상의 표 데이터가 매니페스트 설정 열 정의와 바인딩되어 정규화 구조화 객체 데이터로 환원되는지 검증
 */

import { describe, it, expect } from "vitest";
import {
  parseMarkdownToCustomAST,
  findMatchingField,
  castValueType,
  normalizeTableToJSON,
  type ManifestColumn,
} from "../main/services/markdown-normalizer";

describe("EL-242: Markdown Normalizer & Column Matching Pipeline", () => {
  
  // ── A. 마크다운 AST 파서 검증 ─────────────────────────────────────────────
  describe("A. parseMarkdownToCustomAST (마크다운 파싱)", () => {
    it("제목, 패러그래프, 코드블록, 표 구조가 포함된 문서를 정상적으로 MDAST 노드로 파싱한다", () => {
      const md = `
# WBS 프로젝트 설계 결과서

본 문서의 표 정보를 엑셀로 기계 변출 예정입니다.

\`\`\`json
{ "status": "processing" }
\`\`\`

> 분석 참조 사항

| WBS ID | 대분류 | WBS상세 | 담당자 | 공수 [M/D] | 완료여부 |
|---|---|---|---|---|---|
| 1.1 | 설계 | 데이터베이스 아키텍처 설계 | 홍길동 | 2.5 | 완료 |
| 1.2 | 구현 | REST API 엔드포인트 코딩 | 김개발 | 4 | 미완료 |

- 추가 참고사항 1
- 추가 참조사항 2
`;

      const ast = parseMarkdownToCustomAST(md);

      expect(ast.type).toBe("root");
      expect(ast.children).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);

      // headings 검증
      const headings = ast.children.filter((n) => n.type === "heading");
      expect(headings.length).toBe(1);
      expect(headings[0].depth).toBe(1);
      expect(headings[0].children?.[0].value).toBe("WBS 프로젝트 설계 결과서");

      // code node 검증
      const codes = ast.children.filter((n) => n.type === "code");
      expect(codes.length).toBe(1);
      expect(codes[0].lang).toBe("json");
      expect(codes[0].value).toContain("processing");

      // blockquote 검증
      const quote = ast.children.find((n) => n.type === "blockquote");
      expect(quote).toBeDefined();
      expect(quote?.children?.[0].children?.[0].value).toBe("분석 참조 사항");

      // table node 검증
      const tables = ast.children.filter((n) => n.type === "table");
      expect(tables.length).toBe(1);
      const tbl = tables[0];
      expect(tbl.children?.length).toBe(3); // header + 2 rows

      // header row 검증
      const headerRow = tbl.children?.[0];
      expect(headerRow?.type).toBe("tableRow");
      expect(headerRow?.children?.length).toBe(6);
      expect(headerRow?.children?.[0].children?.[0].value).toBe("WBS ID");

      // list node 검증
      const lists = ast.children.filter((n) => n.type === "list");
      expect(lists.length).toBe(1);
      expect(lists[0].children?.length).toBe(2);
      expect(lists[0].children?.[0].children?.[0].value).toBe("추가 참고사항 1");
    });
  });

  // ── B. 컬럼 일치 감지기 검증 ──────────────────────────────────────────────
  describe("B. findMatchingField (지능형 한영 칼럼 매칭)", () => {
    it("공백, 대소문자, 대괄호 특수문자를 무시하고 매니페스트 필드명으로 정상 매칭한다", () => {
      // wbsId 영문/한글 케이스
      expect(findMatchingField("WBS ID")).toBe("wbsId");
      expect(findMatchingField("wbs_id")).toBe("wbsId");
      expect(findMatchingField("번호")).toBe("wbsId");
      expect(findMatchingField("순번")).toBe("wbsId");

      // task 케이스
      expect(findMatchingField("태스크")).toBe("task");
      expect(findMatchingField("WBS상세")).toBe("task");
      expect(findMatchingField("작업명")).toBe("task");

      // effort 케이스
      expect(findMatchingField(" 공수 ")).toBe("effort");
      expect(findMatchingField("m/d")).toBe("effort");
      expect(findMatchingField("공수[M/D]")).toBe("effort");

      // 일치하지 않는 경우 null
      expect(findMatchingField("비고")).toBeNull();
    });
  });

  // ── C. 자료형 변환 검증 ──────────────────────────────────────────────────
  describe("C. castValueType (타입 변환)", () => {
    it("문자열, 숫자, 불리언에 맞게 값을 정밀 타입 강제한다", () => {
      // string
      expect(castValueType("  개발완료  ", "string")).toBe("개발완료");
      
      // number
      expect(castValueType("4.5", "number")).toBe(4.5);
      expect(castValueType("2,500", "number")).toBe(2500); // 콤마 포함 필터링
      expect(castValueType("3일", "number")).toBe(3);
      expect(castValueType("미정", "number")).toBe(0); // 파싱 실패 시 0

      // boolean
      expect(castValueType("완료", "boolean")).toBe(true);
      expect(castValueType("y", "boolean")).toBe(true);
      expect(castValueType("TRUE", "boolean")).toBe(true);
      expect(castValueType("미완료", "boolean")).toBe(false);
      expect(castValueType("n", "boolean")).toBe(false);
    });
  });

  // ── D. 표 데이터 ➔ 매니페스트 JSON 바인딩 검증 ─────────────────────────────
  describe("D. normalizeTableToJSON (테이블 정규화 파이프라인)", () => {
    it("마크다운 AST 표와 표준 매니페스트 명세 목록을 도킹하여 완결적인 JSON 레코드 배열로 반환한다", () => {
      const requiredColumns: ManifestColumn[] = [
        { idx: 1, field: "wbsId", type: "string" },
        { idx: 2, field: "depth1", type: "string" },
        { idx: 3, field: "task", type: "string" },
        { idx: 4, field: "owner", type: "string" },
        { idx: 5, field: "effort", type: "number" },
        { idx: 6, field: "status", type: "boolean" }, // 완료여부 매칭 (boolean)
      ];

      const mdTable = `
| WBS [ID] | 대분류 | WBS상세 | 담당자 | 공수 (md) | 완료여부 |
|---|---|---|---|---|---|
| 1.1 | 인프라 | AWS 클러스터 프로비저닝 | 임인프라 | 1.5 | 완료 |
| 1.2 | 코드작성 | Spring Boot 컨트롤러 개발 | 박코딩 | 3일 | 미완료 |
`;

      const doc = parseMarkdownToCustomAST(mdTable);
      const tableNode = doc.children[0];

      const result = normalizeTableToJSON(tableNode, requiredColumns);

      expect(result.length).toBe(2);

      // 첫번째 Row 정밀 검증
      expect(result[0]).toEqual({
        wbsId: "1.1",
        depth1: "인프라",
        task: "AWS 클러스터 프로비저닝",
        owner: "임인프라",
        effort: 1.5,
        status: true,
      });

      // 두번째 Row 정밀 검증
      expect(result[1]).toEqual({
        wbsId: "1.2",
        depth1: "코드작성",
        task: "Spring Boot 컨트롤러 개발",
        owner: "박코딩",
        effort: 3,
        status: false,
      });
    });
  });
});
