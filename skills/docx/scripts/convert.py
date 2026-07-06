#!/usr/bin/env python3
"""
Markdown → Word 변환기 (python-docx 기반)

Electron word/docx executor가 spawn하여 사용하는 변환 진입점 스크립트.
AI 답변(마크다운)을 파싱해 제목/문단/표/목록을 실제 Word 요소로 렌더링한다.
표준 양식 템플릿(.docx)이 주어지면 그 문서에 이어붙여(스타일 상속) 저장하고,
없으면 새 문서를 생성한다(스크래치 모드).

사용법:
    python convert.py <payload.json>
    echo '<payload json>' | python convert.py -

payload 스키마:
{
  "templatePath": "<원본 .docx 절대경로>",  # 생략/빈 값이면 템플릿 없이 새 문서 생성(스크래치 모드)
  "outputPath":   "<저장 .docx 절대경로>",
  "title":        "AI 답변 원문",            # 본문 시작 전 삽입할 제목(선택)
  "content":      "<마크다운 문자열>"         # markdown 키도 허용
}

결과(JSON, stdout):
{
  "status": "success" | "error",
  "outputPath": "...",
  "blocksWritten": N,        # 렌더링한 블록(문단/표/제목) 수
  "error": "..."             # 실패 시
}
"""

import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH  # noqa: F401  (향후 확장용)


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_TABLE_ROW_RE = re.compile(r"^\s*\|(.+)\|\s*$")
_TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$")
_LIST_RE = re.compile(r"^(\s*)([-*+]|\d+\.)\s+(.*)$")
_INLINE_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_INLINE_CODE_RE = re.compile(r"`([^`]+)`")


def _split_table_row(line):
    """`| a | b |` 형태의 행을 셀 리스트로 분해한다."""
    inner = line.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    return [cell.strip() for cell in inner.split("|")]


def _clean_inline(text):
    """인라인 마크다운(볼드/코드) 마커를 제거해 순수 텍스트로 만든다."""
    text = _INLINE_BOLD_RE.sub(r"\1", text)
    text = _INLINE_CODE_RE.sub(r"\1", text)
    return text.strip()


def _parse_markdown(md):
    """마크다운을 블록 리스트로 파싱한다.

    반환 블록 형태:
      {"type": "heading", "level": int, "text": str}
      {"type": "paragraph", "text": str}
      {"type": "list", "items": [str, ...]}
      {"type": "table", "header": [str,...], "rows": [[str,...], ...]}
    """
    lines = md.replace("\r\n", "\n").split("\n")
    blocks = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # 빈 줄 스킵
        if not stripped:
            i += 1
            continue

        # 제목
        heading = _HEADING_RE.match(stripped)
        if heading:
            level = len(heading.group(1))
            blocks.append({
                "type": "heading",
                "level": level,
                "text": _clean_inline(heading.group(2)),
            })
            i += 1
            continue

        # 표: 현재 행이 표 행이고 다음 행이 구분선이면 표로 처리
        if _TABLE_ROW_RE.match(line) and i + 1 < n and _TABLE_SEP_RE.match(lines[i + 1]):
            header = [_clean_inline(c) for c in _split_table_row(line)]
            rows = []
            i += 2  # 헤더 + 구분선 소비
            while i < n and _TABLE_ROW_RE.match(lines[i]):
                rows.append([_clean_inline(c) for c in _split_table_row(lines[i])])
                i += 1
            blocks.append({"type": "table", "header": header, "rows": rows})
            continue

        # 목록: 연속된 목록 항목을 하나의 블록으로 수집
        if _LIST_RE.match(line):
            items = []
            while i < n and _LIST_RE.match(lines[i]):
                m = _LIST_RE.match(lines[i])
                items.append(_clean_inline(m.group(3)))
                i += 1
            blocks.append({"type": "list", "items": items})
            continue

        # 문단: 다음 빈 줄/구조 요소 전까지 이어붙임
        para_lines = [stripped]
        i += 1
        while i < n:
            nxt = lines[i]
            nxt_stripped = nxt.strip()
            if (not nxt_stripped
                    or _HEADING_RE.match(nxt_stripped)
                    or _LIST_RE.match(nxt)
                    or _TABLE_ROW_RE.match(nxt)):
                break
            para_lines.append(nxt_stripped)
            i += 1
        blocks.append({"type": "paragraph", "text": _clean_inline(" ".join(para_lines))})

    return blocks


def _render_blocks(document, blocks):
    """파싱된 블록을 python-docx 문서에 렌더링한다."""
    written = 0
    for block in blocks:
        btype = block["type"]

        if btype == "heading":
            level = min(max(block["level"], 1), 6)
            try:
                document.add_heading(block["text"], level=level)
            except Exception:  # noqa: BLE001  (스타일 미존재 템플릿 대비)
                para = document.add_paragraph()
                run = para.add_run(block["text"])
                run.bold = True
            written += 1

        elif btype == "paragraph":
            document.add_paragraph(block["text"])
            written += 1

        elif btype == "list":
            for item in block["items"]:
                try:
                    document.add_paragraph(item, style="List Bullet")
                except Exception:  # noqa: BLE001
                    document.add_paragraph(f"• {item}")
            written += 1

        elif btype == "table":
            header = block["header"]
            rows = block["rows"]
            col_count = max(len(header), *(len(r) for r in rows)) if rows else len(header)
            col_count = max(col_count, 1)

            table = document.add_table(rows=1, cols=col_count)
            try:
                table.style = "Table Grid"
            except Exception:  # noqa: BLE001
                pass

            hdr_cells = table.rows[0].cells
            for c in range(col_count):
                text = header[c] if c < len(header) else ""
                hdr_cells[c].text = text
                for para in hdr_cells[c].paragraphs:
                    for run in para.runs:
                        run.bold = True

            for row in rows:
                row_cells = table.add_row().cells
                for c in range(col_count):
                    row_cells[c].text = row[c] if c < len(row) else ""
            written += 1

    return written


def convert(payload):
    template_path = payload.get("templatePath")
    output_path = payload["outputPath"]
    title = payload.get("title")
    content = payload.get("content") or payload.get("markdown") or ""

    if template_path:
        # 템플릿 모드: 표준 양식 문서를 상속해 그 뒤에 내용을 이어붙인다.
        if not Path(template_path).exists():
            return {"status": "error", "error": f"템플릿 파일을 찾을 수 없습니다: {template_path}"}
        document = Document(template_path)
    else:
        # 스크래치 모드: 새 문서를 생성한다.
        document = Document()

    if title:
        try:
            document.add_heading(str(title), level=1)
        except Exception:  # noqa: BLE001
            para = document.add_paragraph()
            para.add_run(str(title)).bold = True

    blocks = _parse_markdown(content)
    blocks_written = _render_blocks(document, blocks)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    document.save(output_path)

    return {
        "status": "success",
        "outputPath": output_path,
        "blocksWritten": blocks_written,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "payload 인자가 필요합니다."}))
        sys.exit(1)

    arg = sys.argv[1]
    try:
        raw = sys.stdin.read() if arg == "-" else Path(arg).read_text(encoding="utf-8-sig")
        payload = json.loads(raw)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "error", "error": f"payload 파싱 실패: {exc}"}))
        sys.exit(1)

    try:
        result = convert(payload)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "error", "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)

    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result.get("status") == "success" else 1)


if __name__ == "__main__":
    main()
