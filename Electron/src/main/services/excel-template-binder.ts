/**
 * EL-243: 엑셀 템플릿 데이터 바인딩 및 오버라이트 저장 엔진
 *
 * 이 서비스는 exceljs 라이브러리를 기반으로 하여, 원본 표준 템플릿 파일(*_표준양식.xlsx)의
 * 모든 디자인 스타일(셀 색상, 테두리 보더, 특수 폰트 설정, 정렬 등)을 그대로 유지한 채
 * 구조화된 JSON 데이터 레코드를 동적으로 바인딩(오버라이트 및 행 추가)하여 완성도 높은
 * 산출문서를 조립/저장하는 코어를 구현합니다.
 */

import ExcelJS from "exceljs";
import { existsSync } from "node:fs";
import path from "node:path";
import { readFile } from "node:fs/promises";

// ─── 1. 의존 타입 정의 ────────────────────────────────────────────────────────

export interface ExcelColumnConfig {
  idx: number;                         // 1-based Excel Column Index (e.g., A=1, B=2, C=3...)
  field: string;                       // 정규화 데이터 키 (예: "wbsId")
  type: "string" | "number" | "boolean"; // 자료형
}

export interface ExcelSheetConfig {
  name: string;                        // 타겟 시트명
  headerRow: number;                   // 헤더 시작 행 index (1-based)
  dataStartRow: number;                // 데이터가 주입되어야 하는 첫 행 index (1-based)
  columns: ExcelColumnConfig[];        // 열 매핑 설정
}

export interface ExcelTemplateManifest {
  template: string;                    // 템플릿 파일명 (예: "WBS-Template_표준양식.xlsx")
  sheets: ExcelSheetConfig[];          // 시트별 매핑 구성
}

// ─── 2. 기본 내장 매니페스트 폴백 (EL-247 선선언 규칙 및 가드레일 대비) ───────

/**
 * templates/pi-consulting/manifest/ 하위 매니페스트 파일이 실재하지 않을 때
 * 구동할 수 있도록 탑재한 기본 표준양식 매핑 바인더 정보.
 */
export const DEFAULT_EXCEL_MANIFESTS: Record<string, ExcelTemplateManifest> = {
  "WBS-Template_표준양식.xlsx": {
    template: "WBS-Template_표준양식.xlsx",
    sheets: [
      {
        name: "WBS상세",
        headerRow: 7,
        dataStartRow: 8,
        columns: [
          { idx: 1, field: "wbsId", type: "string" },
          { idx: 2, field: "depth1", type: "string" },
          { idx: 3, field: "depth2", type: "string" },
          { idx: 4, field: "task", type: "string" },
          { idx: 5, field: "owner", type: "string" },
          { idx: 6, field: "startDate", type: "string" },
          { idx: 7, field: "endDate", type: "string" },
          { idx: 8, field: "effort", type: "number" },
          { idx: 9, field: "status", type: "boolean" },
        ],
      },
    ],
  },
  "Effort-Estimation_표준양식.xlsx": {
    template: "Effort-Estimation_표준양식.xlsx",
    sheets: [
      {
        name: "공수산정",
        headerRow: 5,
        dataStartRow: 6,
        columns: [
          { idx: 1, field: "wbsId", type: "string" },
          { idx: 2, field: "task", type: "string" },
          { idx: 3, field: "owner", type: "string" },
          { idx: 4, field: "effort", type: "number" },
        ],
      },
    ],
  },
  "Gap-Analysis-Report_표준양식.xlsx": {
    template: "Gap-Analysis-Report_표준양식.xlsx",
    sheets: [
      {
        name: "갭분석",
        headerRow: 4,
        dataStartRow: 5,
        columns: [
          { idx: 1, field: "idx", type: "number" },
          { idx: 2, field: "category", type: "string" },
          { idx: 3, field: "asis", type: "string" },
          { idx: 4, field: "tobe", type: "string" },
          { idx: 5, field: "gap", type: "string" },
          { idx: 6, field: "solution", type: "string" },
        ],
      },
    ],
  },
};

// ─── 3. 메인 바인딩 함수 ──────────────────────────────────────────────────────

/**
 * 로컬 매니페스트 디렉토리를 탐색하고 해당 파일명이 매칭되면 주입 스키마 매니페스트 설정을 리턴한다.
 * 없으면 기본 사전을 탐색하여 정합성을 방어한다.
 */
export async function resolveTemplateManifest(
  templateName: string,
  manifestDir?: string,
): Promise<ExcelTemplateManifest | null> {
  const cleanName = path.basename(templateName);

  if (manifestDir) {
    const jsonPath = path.join(manifestDir, cleanName.replace(/\.xlsx$/i, ".json"));
    if (existsSync(jsonPath)) {
      try {
        const content = await readFile(jsonPath, "utf-8");
        return JSON.parse(content) as ExcelTemplateManifest;
      } catch (err) {
        console.error(`매니페스트 읽기 실패 (${jsonPath}):`, err);
      }
    }
  }

  // 매니페스트 폴링 또는 로컬 풀백
  return DEFAULT_EXCEL_MANIFESTS[cleanName] ?? null;
}

/**
 * 엑셀 셀 스타일 및 속성을 깊은 복사 처리하는 유틸리티
 */
function copyCellStyles(sourceCell: ExcelJS.Cell, targetCell: ExcelJS.Cell): void {
  if (!sourceCell) return;

  // 글꼴, 배경 채우기, 테두리선, 정렬, 넘버포맷 그대로 도킹 복사
  if (sourceCell.font) targetCell.font = JSON.parse(JSON.stringify(sourceCell.font));
  if (sourceCell.fill) targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill));
  if (sourceCell.border) targetCell.border = JSON.parse(JSON.stringify(sourceCell.border));
  if (sourceCell.alignment) targetCell.alignment = JSON.parse(JSON.stringify(sourceCell.alignment));
  if (sourceCell.numFormat) targetCell.numFormat = sourceCell.numFormat;
  
  // 보호 속성 복사 (수식 시트 무력화 방조용)
  if (sourceCell.protection) {
    targetCell.protection = JSON.parse(JSON.stringify(sourceCell.protection));
  }
}

/**
 * 마크다운에서 추출 정규화된 JSON 데이터 배열을
 * *_표준양식.xlsx 파일에 조립/바인딩 처리한다.
 *
 * @param templatePath 원본 .xlsx 템플릿 절대 경로
 * @param savePath 최종 저장될 파일 절대 경로
 * @param data 정규화 처리된 레코드 배열
 * @param sheetConfig 엑셀 시트 맵 바인딩 설정
 */
export async function bindDataToExcelTemplate(
  templatePath: string,
  savePath: string,
  data: Record<string, any>[],
  sheetConfig: ExcelSheetConfig,
): Promise<void> {
  if (!existsSync(templatePath)) {
    throw new Error(`엑셀 템플릿 파일을 찾을 수 없습니다: ${templatePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  // 시트 매칭 (시트명 확인 → 없을 시 첫 번째 시트로 대피)
  let worksheet = workbook.getWorksheet(sheetConfig.name);
  if (!worksheet) {
    console.warn(`시트 '${sheetConfig.name}'을 찾을 수 없어, 첫 시트 '${workbook.worksheets[0].name}'을 적용합니다.`);
    worksheet = workbook.worksheets[0];
  }

  const { dataStartRow, columns } = sheetConfig;
  const maxColIndex = Math.max(...columns.map((c) => colIndexToMaxCol(worksheet, Math.floor(c.idx))));

  // 오리지널 스타일 데이터 소스 로우 백업 (복사 레퍼런스용)
  const sourceRow = worksheet.getRow(dataStartRow);
  const sourceCellStyles = new Map<number, ExcelJS.Cell>();
  
  for (let colIdx = 1; colIdx <= maxColIndex; colIdx++) {
    sourceCellStyles.set(colIdx, sourceRow.getCell(colIdx));
  }

  // 1. 필요한 경우 행 삽입
  // 기본적으로 템플릿에 데이터가 한 줄 이상 있을 것이므로, 
  // 입력 레코드 수가 1을 넘어갈 때 한 행 한 행 하단 밀어내기 삽입을 가동한다.
  if (data.length > 1) {
    // exceljs insertRows에 전달할 rows는 이중 배열이어야 하므로 빈 행들의 배열을 구성하여 삽입 기동
    const emptyRows = Array(data.length - 1).fill([]);
    worksheet.insertRows(dataStartRow + 1, emptyRows, "i");
  }

  // 2. 값 주입 및 서식 오버레이 기동
  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const currentRowIdx = dataStartRow + i;
    const targetRow = worksheet.getRow(currentRowIdx);

    // 템플릿 원본에서 백업된 셀 스타일을 타겟 생성 로우의 각 열로 오버레이 처리
    for (let colIdx = 1; colIdx <= maxColIndex; colIdx++) {
      const srcCell = sourceCellStyles.get(colIdx);
      const tgtCell = targetRow.getCell(colIdx);
      if (srcCell && tgtCell) {
        copyCellStyles(srcCell, tgtCell);
      }
    }

    // 데이터 치환 인가
    columns.forEach(({ idx, field, type }) => {
      const cleanIdx = Math.floor(idx);
      const cell = targetRow.getCell(cleanIdx);
      const rawValue = record[field];

      if (rawValue === undefined || rawValue === null) {
        cell.value = "";
      } else if (type === "number") {
        cell.value = typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;
      } else if (type === "boolean") {
        cell.value = typeof rawValue === "boolean" ? rawValue : String(rawValue).toLowerCase() === "true";
      } else {
        cell.value = String(rawValue);
      }
    });

    // 강제 행 높이 정렬 (템플릿의 데이터 시작 행 높이로 통일하여 줄 바꿈 어긋남 방지)
    if (sourceRow.height) {
      targetRow.height = sourceRow.height;
    }
    
    // 행 변경사항 저장 지시
    targetRow.commit();
  }

  // 수식 계산 캐시 재구성 권고 및 물리 파일 동적 쓰기 기동
  await workbook.xlsx.writeFile(savePath);
}

/** Excel.worksheet 가용 열 한계치 또는 매핑 열 중 더 먼 가상 너비를 계측한다. */
function colIndexToMaxCol(worksheet: ExcelJS.Worksheet, index: number): number {
  return Math.max(worksheet.columnCount, index);
}
