/**
 * EL-221: .omx_wiki 기반 영속적 지식 계층 검색 래퍼
 *
 * ADR-001 불변 규칙 #2: spawnSync 절대 금지. 모든 실행은 비동기 spawn.
 *
 * No-Vector 원칙:
 *   외부 임베딩 API, 벡터 DB 호출 없음.
 *   오직 OMX CLI(`omx wiki list/read --json`)가 반환하는 정적 마크다운만 무상태 투영.
 *
 * 제공 메서드:
 *   - listWiki()        : 위키 문서 목록 조회
 *   - readWiki(title)   : 특정 위키 문서 내용 조회
 *   - searchWiki(query) : 키워드 기반 위키 검색
 */

import { z } from "zod";
import { CliWrapper } from "./cli-wrapper";

// ─── 위키 아이템 스키마 ────────────────────────────────────────────────────────

export const WikiItemSchema = z.object({
  title: z.string(),
  path: z.string().optional(),
  summary: z.string().optional(),
  updated_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const WikiListDataSchema = z.object({
  items: z.array(WikiItemSchema),
  total: z.number().optional(),
});

export const WikiDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),       // 마크다운 원본
  path: z.string().optional(),
  updated_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const WikiSearchResultSchema = z.object({
  query: z.string(),
  hits: z.array(
    z.object({
      title: z.string(),
      excerpt: z.string().optional(),
      path: z.string().optional(),
      score: z.number().optional(),
    })
  ),
});

export type WikiItem = z.infer<typeof WikiItemSchema>;
export type WikiDocument = z.infer<typeof WikiDocumentSchema>;
export type WikiSearchResult = z.infer<typeof WikiSearchResultSchema>;

// ─── 파싱 헬퍼 ───────────────────────────────────────────────────────────────

function extractData<T>(raw: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`[WikiWrapper] 데이터 스키마 불일치: ${result.error.message}`);
  }
  return result.data;
}

// ─── WikiWrapper 클래스 ───────────────────────────────────────────────────────

/**
 * OMX CLI 위키 명령 래퍼.
 * No-Vector 원칙: 외부 임베딩 없이 CLI 반환 정적 데이터만 사용.
 */
export class WikiWrapper {
  private readonly cli: CliWrapper;

  constructor(cli?: CliWrapper) {
    this.cli = cli ?? new CliWrapper();
  }

  /**
   * 위키 문서 목록을 조회한다.
   * `omx wiki list --json`
   */
  async listWiki(): Promise<WikiItem[]> {
    const envelope = await this.cli.executeUnary(["wiki", "list", "--json"]);

    if (!envelope.ok) {
      throw new Error(`[WikiWrapper] listWiki 실패: ${envelope.error.message}`);
    }

    const parsed = extractData(envelope.data, WikiListDataSchema);
    return parsed.items;
  }

  /**
   * 특정 위키 문서 내용을 조회한다. (마크다운 원본 반환)
   * `omx wiki read <title> --json`
   */
  async readWiki(title: string): Promise<WikiDocument> {
    const envelope = await this.cli.executeUnary(["wiki", "read", title, "--json"]);

    if (!envelope.ok) {
      throw new Error(`[WikiWrapper] readWiki('${title}') 실패: ${envelope.error.message}`);
    }

    return extractData(envelope.data, WikiDocumentSchema);
  }

  /**
   * 키워드 기반 위키 검색.
   * `omx wiki search <query> --json`
   * No-Vector: CLI가 파일 내용 grep 방식으로 처리하며, 벡터 연산 없음.
   */
  async searchWiki(query: string): Promise<WikiSearchResult> {
    const envelope = await this.cli.executeUnary(["wiki", "search", query, "--json"]);

    if (!envelope.ok) {
      throw new Error(`[WikiWrapper] searchWiki('${query}') 실패: ${envelope.error.message}`);
    }

    return extractData(envelope.data, WikiSearchResultSchema);
  }
}

// ─── 싱글턴 ──────────────────────────────────────────────────────────────────

let _instance: WikiWrapper | null = null;

/** 앱 전역 WikiWrapper 싱글턴. 최초 호출 시 생성. */
export function getWikiWrapper(): WikiWrapper {
  if (!_instance) {
    _instance = new WikiWrapper();
  }
  return _instance;
}

/** 테스트 격리용 싱글턴 리셋. */
export function _resetWikiWrapperForTest(): void {
  _instance = null;
}
