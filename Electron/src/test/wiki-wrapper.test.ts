/**
 * EL-221: WikiWrapper 단위 테스트
 *
 * 검증 항목:
 *   - listWiki(): CLI mock 응답 → WikiItem[] 파싱
 *   - readWiki(title): CLI mock 응답 → WikiDocument 파싱
 *   - searchWiki(query): CLI mock 응답 → WikiSearchResult 파싱
 *   - ok=false 응답 시 Error throw
 *   - 스키마 불일치 시 Error throw
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { WikiWrapper, type WikiItem, type WikiDocument, type WikiSearchResult } from "../../main/cli/wiki-wrapper";
import type { CliWrapper } from "../../main/cli/cli-wrapper";

// ─── CliWrapper 모킹 ──────────────────────────────────────────────────────────

function makeMockCli(
  responses: Record<string, unknown>
): CliWrapper {
  return {
    executeUnary: vi.fn((args: string[]) => {
      const key = args.join(" ");
      const match = Object.entries(responses).find(([k]) => key.includes(k));
      if (match) return Promise.resolve(match[1]);
      return Promise.resolve({ ok: false, error: { message: "미설정 mock", code: "MOCK_UNSET" } });
    }),
    executeStream: vi.fn(),
  } as unknown as CliWrapper;
}

// ─── 공통 mock 데이터 ────────────────────────────────────────────────────────

const MOCK_LIST_RESPONSE = {
  ok: true,
  schema_version: "1.0",
  data: {
    items: [
      {
        title: "아키텍처 개요",
        path: "docs/arch.md",
        summary: "프로젝트 전체 아키텍처 설명",
        tags: ["architecture", "design"],
      },
      {
        title: "API 가이드",
        path: "docs/api.md",
        summary: "REST API 엔드포인트 목록",
        tags: ["api"],
      },
    ],
    total: 2,
  },
};

const MOCK_READ_RESPONSE = {
  ok: true,
  schema_version: "1.0",
  data: {
    title: "아키텍처 개요",
    content: "# 아키텍처 개요\n\n## 개요\n프로젝트의 전체 구조를 설명합니다.",
    path: "docs/arch.md",
    updated_at: "2025-01-01T00:00:00Z",
    tags: ["architecture"],
  },
};

const MOCK_SEARCH_RESPONSE = {
  ok: true,
  schema_version: "1.0",
  data: {
    query: "아키텍처",
    hits: [
      {
        title: "아키텍처 개요",
        excerpt: "프로젝트 전체 구조를 설명...",
        path: "docs/arch.md",
        score: 0.95,
      },
    ],
  },
};

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe("WikiWrapper", () => {
  let cli: CliWrapper;
  let wrapper: WikiWrapper;

  beforeEach(() => {
    cli = makeMockCli({
      "wiki list": MOCK_LIST_RESPONSE,
      "wiki read 아키텍처 개요": MOCK_READ_RESPONSE,
      "wiki search 아키텍처": MOCK_SEARCH_RESPONSE,
    });
    wrapper = new WikiWrapper(cli);
  });

  // ── listWiki ────────────────────────────────────────────────────────────────

  describe("listWiki()", () => {
    it("CLI 응답에서 WikiItem 배열을 파싱해야 한다", async () => {
      const items: WikiItem[] = await wrapper.listWiki();
      expect(items).toHaveLength(2);
      expect(items[0].title).toBe("아키텍처 개요");
      expect(items[0].tags).toContain("architecture");
      expect(items[1].title).toBe("API 가이드");
    });

    it("올바른 CLI 인수를 사용해야 한다", async () => {
      await wrapper.listWiki();
      expect(cli.executeUnary).toHaveBeenCalledWith(["wiki", "list", "--json"]);
    });

    it("ok=false 응답 시 Error를 throw해야 한다", async () => {
      const errorCli = makeMockCli({
        "wiki list": {
          ok: false,
          schema_version: "1.0",
          error: { message: "위키 없음", code: "NOT_FOUND" },
        },
      });
      const errorWrapper = new WikiWrapper(errorCli);
      await expect(errorWrapper.listWiki()).rejects.toThrow("listWiki 실패");
    });

    it("스키마 불일치 데이터 시 Error를 throw해야 한다", async () => {
      const badCli = makeMockCli({
        "wiki list": {
          ok: true,
          schema_version: "1.0",
          data: { items: "문자열은 허용 안됨" },  // items는 배열이어야 함
        },
      });
      const badWrapper = new WikiWrapper(badCli);
      await expect(badWrapper.listWiki()).rejects.toThrow("스키마 불일치");
    });
  });

  // ── readWiki ────────────────────────────────────────────────────────────────

  describe("readWiki(title)", () => {
    it("CLI 응답에서 WikiDocument를 파싱해야 한다", async () => {
      const doc: WikiDocument = await wrapper.readWiki("아키텍처 개요");
      expect(doc.title).toBe("아키텍처 개요");
      expect(doc.content).toContain("# 아키텍처 개요");
      expect(doc.path).toBe("docs/arch.md");
    });

    it("올바른 CLI 인수를 사용해야 한다", async () => {
      await wrapper.readWiki("아키텍처 개요");
      expect(cli.executeUnary).toHaveBeenCalledWith([
        "wiki",
        "read",
        "아키텍처 개요",
        "--json",
      ]);
    });

    it("content 필드가 반드시 포함되어야 한다", async () => {
      const doc = await wrapper.readWiki("아키텍처 개요");
      expect(typeof doc.content).toBe("string");
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it("ok=false 응답 시 제목 정보를 포함한 Error를 throw해야 한다", async () => {
      const errorCli = makeMockCli({
        "wiki read": {
          ok: false,
          schema_version: "1.0",
          error: { message: "문서 없음", code: "NOT_FOUND" },
        },
      });
      const errorWrapper = new WikiWrapper(errorCli);
      await expect(errorWrapper.readWiki("없는 문서")).rejects.toThrow(
        "readWiki('없는 문서') 실패"
      );
    });
  });

  // ── searchWiki ──────────────────────────────────────────────────────────────

  describe("searchWiki(query)", () => {
    it("CLI 응답에서 WikiSearchResult를 파싱해야 한다", async () => {
      const result: WikiSearchResult = await wrapper.searchWiki("아키텍처");
      expect(result.query).toBe("아키텍처");
      expect(result.hits).toHaveLength(1);
      expect(result.hits[0].title).toBe("아키텍처 개요");
      expect(result.hits[0].score).toBeCloseTo(0.95);
    });

    it("올바른 CLI 인수를 사용해야 한다", async () => {
      await wrapper.searchWiki("아키텍처");
      expect(cli.executeUnary).toHaveBeenCalledWith([
        "wiki",
        "search",
        "아키텍처",
        "--json",
      ]);
    });

    it("hits 배열이 빈 경우도 정상 처리해야 한다", async () => {
      const emptyCli = makeMockCli({
        "wiki search": {
          ok: true,
          schema_version: "1.0",
          data: { query: "없는검색어", hits: [] },
        },
      });
      const emptyWrapper = new WikiWrapper(emptyCli);
      const result = await emptyWrapper.searchWiki("없는검색어");
      expect(result.hits).toHaveLength(0);
    });

    it("No-Vector: 외부 임베딩 없이 정적 CLI 데이터만 반환해야 한다", async () => {
      // WikiWrapper는 외부 HTTP 호출이 없어야 함
      // executeUnary만 호출하고 다른 네트워크 I/O가 없음을 확인
      const result = await wrapper.searchWiki("아키텍처");
      expect(cli.executeUnary).toHaveBeenCalledTimes(1);
      // 두 번 이상 호출되지 않아야 함 (벡터 API 보조 호출 없음)
      expect(result.hits.length).toBe(1);
    });
  });
});
