/**
 * EL-242: 마크다운 AST 파싱 기반 JSON Normalizer 및 컬럼 매칭 파이프라인
 *
 * 이 서비스는 AI 답변(마크다운)을 수신하여 remark와 호환되는 MDAST(Markdown AST) 규격으로
 * 정교하게 파싱하고, 파싱된 표(table) 데이터를 사전 정의된 템플릿 매니페스트 컬럼에 맞게
 * 지능적으로 필딩하고 타입을 매칭/변환하는 정규화 엔진을 구현합니다.
 */
// ─── 2. 마크다운 MDAST 파서 (Zero-Dependency) ──────────────────────────────────
/**
 * 마크다운 텍스트를 줄 단위 상태 장치를 활용해 remark-compatible MDAST로 변환한다.
 */
export function parseMarkdownToCustomAST(markdown) {
    const root = { type: "root", children: [] };
    const lines = markdown.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const rawLine = lines[i];
        const line = rawLine.trim();
        // 1. 공백 이탈 처리
        if (line === "") {
            i++;
            continue;
        }
        // 2. Code Block 처리
        if (line.startsWith("```")) {
            const lang = line.slice(3).trim();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // 닫기 ```` 홉
            root.children.push({
                type: "code",
                lang: lang || undefined,
                value: codeLines.join("\n"),
            });
            continue;
        }
        // 3. Blockquote 처리
        if (line.startsWith(">")) {
            const bQuoteLines = [];
            while (i < lines.length && lines[i].trim().startsWith(">")) {
                bQuoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
                i++;
            }
            // blockquote 내부도 재귀 파싱 가능하나 여기서는 단일 paragraph로 처리해 단순화
            root.children.push({
                type: "blockquote",
                children: [
                    {
                        type: "paragraph",
                        children: [{ type: "text", value: bQuoteLines.join("\n") }],
                    },
                ],
            });
            continue;
        }
        // 4. Heading 처리
        if (line.startsWith("#")) {
            const match = line.match(/^(#{1,6})\s+(.*)$/);
            if (match) {
                const depth = match[1].length;
                const textContent = match[2];
                root.children.push({
                    type: "heading",
                    depth,
                    children: [{ type: "text", value: textContent }],
                });
                i++;
                continue;
            }
        }
        // 5. Table (GFM 표) 처리
        if (line.startsWith("|")) {
            // 다음 줄이 구분선 파이프 구조 (|---|---|) 인지 체크
            const nextLine = lines[i + 1]?.trim() ?? "";
            if (nextLine.startsWith("|") && isSeparatorRow(nextLine)) {
                const tableNode = { type: "table", children: [] };
                // 헤더 로우 파싱
                const headerCells = splitTableRow(line);
                const headerRowNode = {
                    type: "tableRow",
                    children: headerCells.map((cell) => ({
                        type: "tableCell",
                        children: [{ type: "text", value: cell }],
                    })),
                };
                tableNode.children.push(headerRowNode);
                // 구분선 패스
                i += 2;
                // 데이터 로우 연속 수집
                while (i < lines.length && lines[i].trim().startsWith("|")) {
                    const cells = splitTableRow(lines[i]);
                    const rowNode = {
                        type: "tableRow",
                        children: cells.map((cell) => ({
                            type: "tableCell",
                            children: [{ type: "text", value: cell }],
                        })),
                    };
                    tableNode.children.push(rowNode);
                    i++;
                }
                root.children.push(tableNode);
                continue;
            }
        }
        // 6. List 처리
        const listMatch = line.match(/^(\*|-|\+)\s+(.*)$/);
        const orderedListMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (listMatch || orderedListMatch) {
            const isOrdered = !!orderedListMatch;
            const listNode = {
                type: "list",
                ordered: isOrdered,
                children: [],
            };
            while (i < lines.length) {
                const currLine = lines[i].trim();
                const currUnordered = currLine.match(/^(\*|-|\+)\s+(.*)$/);
                const currOrdered = currLine.match(/^(\d+)\.\s+(.*)$/);
                if (isOrdered && currOrdered) {
                    listNode.children.push({
                        type: "listItem",
                        children: [{ type: "text", value: currOrdered[2] }],
                    });
                }
                else if (!isOrdered && currUnordered) {
                    listNode.children.push({
                        type: "listItem",
                        children: [{ type: "text", value: currUnordered[2] }],
                    });
                }
                else {
                    break; // 리스트 끊김
                }
                i++;
            }
            root.children.push(listNode);
            continue;
        }
        // 7. Paragraph (일반 텍스트 문단) 처리
        const paraLines = [];
        while (i < lines.length &&
            lines[i].trim() !== "" &&
            !lines[i].trim().startsWith("#") &&
            !lines[i].trim().startsWith("|") &&
            !lines[i].trim().startsWith("```") &&
            !lines[i].trim().startsWith(">") &&
            !lines[i].trim().match(/^(\*|-|\+)\s+/) &&
            !lines[i].trim().match(/^(\d+)\.\s+/)) {
            paraLines.push(lines[i].trim());
            i++;
        }
        if (paraLines.length > 0) {
            root.children.push({
                type: "paragraph",
                children: [{ type: "text", value: paraLines.join(" ") }],
            });
        }
    }
    return root;
}
// ─── 파서 내부 헬퍼 ────────────────────────────────────────────────────────────
function splitTableRow(line) {
    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
}
function isSeparatorRow(line) {
    const cells = splitTableRow(line);
    return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}
/** 템플릿 매핑 컬럼의 별칭 사전 — 언어 교차 및 부분 비교 지원 */
export const COLUMN_ALIAS_MAP = {
    wbsId: ["wbsid", "wbs", "번호", "id", "no", "순번"],
    depth1: ["depth1", "대분류", "1단계", "대분류명", "category1"],
    depth2: ["depth2", "중분류", "2단계", "중분류명", "category2"],
    task: ["task", "태스크", "업무", "소분류", "WBS상세", "상세", "상세업무", "작업명", "todo"],
    owner: ["owner", "담당자", "담당", "주요담당", "작성자", "assignee", "author"],
    effort: ["effort", "공수", "m/d", "md", "기간", "소요기간", "days", "manday"],
    startDate: ["startdate", "시작일", "시작일자", "시작"],
    endDate: ["enddate", "종료일", "종료일자", "완료일", "종료", "완료"],
    status: ["status", "상태", "진행상태", "진행률", "진행", "progress", "완료여부", "여부"],
};
/** 비교를 위해 한글/영문 텍스트를 기호 배제해 단순화한다. */
function normalizeSymbol(text) {
    return text
        .toLowerCase()
        // 괄호 구조 (예: [M/D], (md) 등)와 그 안의 내용 통째로 삭제
        .replace(/\([^)]*\)/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\s+/g, "")
        .replace(/[-_/[\]()]/g, "")
        .trim();
}
/**
 * 특정 마크다운 헤더명에 대하여 가장 적합한 매핑 필드명을 COLUMN_ALIAS_MAP에서 식별한다.
 * 매칭되는 필드가 없으면 null을 리턴한다.
 */
export function findMatchingField(headerName) {
    const normHeader = normalizeSymbol(headerName);
    for (const [field, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
        // 1. 필드 키 자체와 완전 일치
        if (normalizeSymbol(field) === normHeader) {
            return field;
        }
        // 2. 별칭 배열에서 완전 일치 또는 포함 체크
        if (aliases.some((alias) => normalizeSymbol(alias) === normHeader || normHeader === normalizeSymbol(alias))) {
            return field;
        }
    }
    return null;
}
/**
 * 단일 셀 문자열 값을 지정된 타겟 타입에 맞게 강제 변환한다.
 */
export function castValueType(value, type) {
    const trimmed = value.trim();
    if (type === "number") {
        const parsed = Number(trimmed.replace(/[^\d.]/g, "")); // 숫자와 점을 제외한 문자 제거
        return isNaN(parsed) ? 0 : parsed;
    }
    if (type === "boolean") {
        const lower = trimmed.toLowerCase();
        return ["true", "1", "yes", "y", "완료", "참"].includes(lower);
    }
    return trimmed;
}
/**
 * 파싱된 MDAST table 노드를 입력받아, 특정 템플릿 매니페스트 컬럼 목록을 기반으로
 * 각 행을 키-밸류 정규화 오브젝트 배열로 맵핑 완성한다.
 */
export function normalizeTableToJSON(tableNode, requiredColumns) {
    if (tableNode.type !== "table" || !tableNode.children || tableNode.children.length === 0) {
        return [];
    }
    // 1. 헤더 분석
    const headerRow = tableNode.children[0];
    if (!headerRow.children)
        return [];
    const headers = headerRow.children.map((cell) => {
        const textNode = cell.children?.[0];
        return textNode?.value?.trim() ?? "";
    });
    // 2. 매핑 맵 생성 (마크다운 표 인덱스 idx ➔ target field 명세)
    const codeIndexToManifestField = new Map();
    headers.forEach((header, colIdx) => {
        const matchedField = findMatchingField(header);
        if (matchedField) {
            const config = requiredColumns.find((col) => col.field === matchedField);
            if (config) {
                codeIndexToManifestField.set(colIdx, config);
            }
        }
    });
    // 3. 데이터 로우 가공
    const results = [];
    const dataRows = tableNode.children.slice(1);
    for (const row of dataRows) {
        if (!row.children)
            continue;
        const rowObj = {};
        // 매니페스트 전체를 돌며 디폴트값 보전 (기본 바인딩 시 빈값 결손 방지)
        requiredColumns.forEach((col) => {
            rowObj[col.field] = col.type === "number" ? 0 : col.type === "boolean" ? false : "";
        });
        row.children.forEach((cell, colIdx) => {
            const textNode = cell.children?.[0];
            const rawValue = textNode?.value ?? "";
            const colConfig = codeIndexToManifestField.get(colIdx);
            if (colConfig) {
                rowObj[colConfig.field] = castValueType(rawValue, colConfig.type);
            }
        });
        results.push(rowObj);
    }
    return results;
}
//# sourceMappingURL=markdown-normalizer.js.map