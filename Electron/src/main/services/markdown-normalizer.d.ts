/**
 * EL-242: 마크다운 AST 파싱 기반 JSON Normalizer 및 컬럼 매칭 파이프라인
 *
 * 이 서비스는 AI 답변(마크다운)을 수신하여 remark와 호환되는 MDAST(Markdown AST) 규격으로
 * 정교하게 파싱하고, 파싱된 표(table) 데이터를 사전 정의된 템플릿 매니페스트 컬럼에 맞게
 * 지능적으로 필딩하고 타입을 매칭/변환하는 정규화 엔진을 구현합니다.
 */
export type ASTNodeType = "root" | "heading" | "paragraph" | "table" | "tableRow" | "tableCell" | "list" | "listItem" | "text" | "inlineCode" | "code" | "blockquote" | "html";
export interface ASTNode {
    type: ASTNodeType;
    value?: string;
    depth?: number;
    ordered?: boolean;
    lang?: string;
    children?: ASTNode[];
}
export interface MarkdownRoot extends ASTNode {
    type: "root";
    children: ASTNode[];
}
/**
 * 마크다운 텍스트를 줄 단위 상태 장치를 활용해 remark-compatible MDAST로 변환한다.
 */
export declare function parseMarkdownToCustomAST(markdown: string): MarkdownRoot;
export interface ManifestColumn {
    idx: number;
    field: string;
    type: "string" | "number" | "boolean";
}
/** 템플릿 매핑 컬럼의 별칭 사전 — 언어 교차 및 부분 비교 지원 */
export declare const COLUMN_ALIAS_MAP: Record<string, string[]>;
/**
 * 특정 마크다운 헤더명에 대하여 가장 적합한 매핑 필드명을 COLUMN_ALIAS_MAP에서 식별한다.
 * 매칭되는 필드가 없으면 null을 리턴한다.
 */
export declare function findMatchingField(headerName: string): string | null;
/**
 * 단일 셀 문자열 값을 지정된 타겟 타입에 맞게 강제 변환한다.
 */
export declare function castValueType(value: string, type: "string" | "number" | "boolean"): string | number | boolean;
/**
 * 파싱된 MDAST table 노드를 입력받아, 특정 템플릿 매니페스트 컬럼 목록을 기반으로
 * 각 행을 키-밸류 정규화 오브젝트 배열로 맵핑 완성한다.
 */
export declare function normalizeTableToJSON(tableNode: ASTNode, requiredColumns: ManifestColumn[]): Record<string, string | number | boolean>[];
//# sourceMappingURL=markdown-normalizer.d.ts.map