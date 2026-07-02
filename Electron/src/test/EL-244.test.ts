/**
 * EL-244.test.ts & EL-245.test.ts — WordJS(Docxtemplater & PizZip) 엔진 및 변수 인가 설계 유닛 테스트
 *
 * 시나리오:
 *   A. extractADRTemplateData (EL-245): 비정형 ADR 마크다운 답변서를 파싱하여 정밀 워드 템플릿 변수 맵(JSON)으로 추출하는가?
 *   B. extractAPISpecTemplateData (EL-245): 비정형 API 마크다운 답변서를 파싱하여 구조적 API 사양 변수 맵으로 변환하는가?
 *   C. bindDataToWordTemplate (EL-244): 실제 템플릿 문맥 변수를 Word 템플릿 파일로 바인딩하여 치환 출력을 정상 유도하는가?
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import {
  extractADRTemplateData,
  extractAPISpecTemplateData,
  bindDataToWordTemplate,
} from "../main/services/word-template-binder";

describe("EL-244 & EL-245: Word Template Binder & Placeholder Schema Adapter", () => {
  const testTmpDir = join(tmpdir(), "omx-word-test");
  const dummyTemplateDocx = join(testTmpDir, "ADR-Template_표준양식.docx");
  const dummySaveDocx = join(testTmpDir, "ADR-Output.docx");

  beforeEach(() => {
    if (!existsSync(testTmpDir)) {
      mkdirSync(testTmpDir, { recursive: true });
    }

    // 1. 테스트 목적용 PizZip 기반 최소 유효 .docx 바이트 구조 동적 생성
    // docxtemplater는 유효한 zip 파일 구조와 [Content_Types].xml, document.xml이 실재해야 동작함
    const zip = new PizZip();
    zip.file("word/document.xml", `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>ADR ID: {adrId}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>제목: {title}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>{#options}대안인덱스: {optionId}, 대안명: {name}{/options}</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:document>
    `);
    
    // [Content_Types].xml이 없으면 정식 ZIP 압축 해석 및 docxtemplater 엔진 로딩 시 에러 회귀
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>
    `);

    const nodeBuffer = zip.generate({ type: "nodebuffer" });
    writeFileSync(dummyTemplateDocx, nodeBuffer);
  });

  afterEach(() => {
    try {
      if (existsSync(testTmpDir)) {
        rmSync(testTmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn("임시 워드 테스트 디렉토리 삭제 실패:", e);
    }
  });

  // ── A. ADR 마크다운 사양 JSON 추출 검증 ────────────────────────────────────
  describe("A. extractADRTemplateData (ADR 마크다운 어댑핑)", () => {
    it("마크다운 배경, 메타 표, 고려한 대안 표 구조를 ADR JSON 바인딩 정보로 전환한다", () => {
      const adrMarkdown = `
# ADR-101: 공통 예외 처리기 설계

| 항목 | 내용 |
|---|---|
| ADR ID | ADR-101 |
| 상태 | 승인(Accepted) |
| 작성자 | 송아키 |
| 작성일 | 2026-07-02 |
| 관련 산출물 | PGM-001, TBL-ERR |

---

## 1. 배경 (Context)
기존 비결정적 로그 방출로 인해 마이그레이션 모니터링 시 트러블슈팅 복잡성이 유발됨.

## 2. 결정 (Decision)
Spring Boot @ControllerAdvice를 적용하여 글로벌 통합 인체 구조 확립.

## 3. 고려한 대안 (Considered Options)

| 대안 | 설명 | 장점 | 단점 | 채택 여부 |
|---|---|---|---|---|
| Option A: Spring Advice | 클래스 기반 공제 | 단일 관점 집중 | 런타임 프록시 개입 | ✅ 채택 |
| Option B: Filter 도입 | 엔드포인트 전방 차단 | 서블릿 단 차단 | 스프링 IoC 빈 접근 난해 | ❌ |

## 6. To-Be 매핑
| As-Is 식별자 | 처리 구분(유지/개선/폐기) | To-Be 대상 | 비고 |
|---|---|---|---|
| PGM-009 | 개선 | CustomAdviceHandler | 로깅 강화 |
`;

      const result = extractADRTemplateData(adrMarkdown);

      expect(result.adrId).toBe("ADR-101");
      expect(result.title).toBe("공통 예외 처리기 설계");
      expect(result.status).toBe("승인(Accepted)");
      expect(result.author).toBe("송아키");
      expect(result.createdDate).toBe("2026-07-02");
      expect(result.relatedArtifacts).toBe("PGM-001, TBL-ERR");
      
      expect(result.context).toContain("기존 비결정적 로그 방출");
      expect(result.decision).toContain("ControllerAdvice");

      // 대안 배열 검증
      expect(result.options.length).toBe(2);
      expect(result.options[0]).toEqual({
        optionId: "Option A",
        name: "Option A: Spring Advice",
        description: "클래스 기반 공제",
        pros: "단일 관점 집중",
        cons: "런타임 프록시 개입",
        accepted: "✅ 채택",
      });

      // 매핑 검증
      expect(result.mappings.length).toBe(1);
      expect(result.mappings[0]).toEqual({
        asisId: "PGM-009",
        action: "개선",
        tobe: "CustomAdviceHandler",
        note: "로깅 강화",
      });
    });
  });

  // ── B. API 명세 마크다운 사양 JSON 추출 검증 ────────────────────────────────
  describe("B. extractAPISpecTemplateData (API 명세 어댑핑)", () => {
    it("마크다운 개요, 엔드포인트 테이블, 신규 요청 바디, 에러코드 정보를 API JSON 사양으로 완결 파싱한다", () => {
      const apiMarkdown = `
# 계약 정보 단건 조회 API

| 항목 | 내용 |
|---|---|
| API ID | API-102 |
| API 명 | 계약 정보 단건 조회 API |
| 대응 As-Is 인터페이스 | IF-091 |
| 도메인/서비스 | contract-service |
| 버전 | v2 |
| 작성자 / 작성일 | 박개발 / 2026-07-02 |

---

## 1. 개요
- 목적: 계약 상세 정보 반환
- 소비자(Consumer): 고객 센터 프론트엔드
- 인증/인가: OAuth2
- 트랜잭션 특성: 동기식 조회

## 2. 엔드포인트
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | /api/v2/contracts/{key} | 계약 단건 정보 반환 |

## 3. 요청 (Request)
### Request Body
\`\`\`json
{
  "key": "K1002"
}
\`\`\`

| 필드 | 타입 | 필수 | 제약 | 대응 컬럼(TBL) |
|---|---|---|---|---|
| key | string | Y | 10자리 고정 | TBL_CONT.K_ID |

## 4. 응답 (Response)
### 에러 코드
| HTTP | 코드 | 설명 | 대응 방안 |
|---|---|---|---|
| 404 | E_CON_NOT_FOUND | 계약 없음 | 관리자 확인 |
`;

      const result = extractAPISpecTemplateData(apiMarkdown);

      expect(result.apiId).toBe("API-102");
      expect(result.apiName).toBe("계약 정보 단건 조회 API");
      expect(result.asisInterface).toBe("IF-091");
      expect(result.domain).toBe("contract-service");
      expect(result.version).toBe("v2");
      expect(result.author).toBe("박개발");
      expect(result.createdDate).toBe("2026-07-02");

      expect(result.consumer).toBe("고객 센터 프론트엔드");
      expect(result.auth).toBe("OAuth2");
      
      expect(result.endpoints.length).toBe(1);
      expect(result.endpoints[0].method).toBe("GET");
      
      expect(result.reqFields.length).toBe(1);
      expect(result.reqFields[0].field).toBe("key");
      expect(result.reqFields[0].tableColumn).toBe("TBL_CONT.K_ID");

      expect(result.requestBody).toContain('"key": "K1002"');
    });
  });

  // ── C. docxtemplater 물리 파일 치환 검증 ────────────────────────────────────
  describe("C. bindDataToWordTemplate (워드 치환 엔진)", () => {
    it("사전에 마련한 XML 내의 플레이스홀더를 JSON 값으로 안정 변조 치환하여 Word 파일로 출력 완성한다", async () => {
      const bindingPayload = {
        adrId: "ADR-V3",
        title: "쿠키 기반 세션 스토리지 아웃소싱",
        options: [
          { optionId: "Opt-1", name: "OAuth IDP 연동" },
          { optionId: "Opt-2", name: "자체 구축 DB 세션" },
        ],
      };

      await bindDataToWordTemplate(dummyTemplateDocx, dummySaveDocx, bindingPayload);

      expect(existsSync(dummySaveDocx)).toBe(true);

      // 출력 바이너리를 다시 PizZip으로 로드하여 치환 결과 유효 확인
      const fs = require("node:fs");
      const resultBytes = new PizZip(fs.readFileSync(dummySaveDocx, "binary"));
      const doc = new Docxtemplater(resultBytes);
      const text = doc.getFullText();

      expect(text).toContain("ADR ID: ADR-V3");
      expect(text).toContain("제목: 쿠키 기반 세션 스토리지 아웃소싱");
      expect(text).toContain("대안인덱스: Opt-1");
      expect(text).toContain("대안명: OAuth IDP 연동");
      expect(text).toContain("대안명: 자체 구축 DB 세션");
    });
  });
});
