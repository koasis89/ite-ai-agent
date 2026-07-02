/**
 * EL-243.test.ts — ExcelJS기반 엑셀 템플릿 바인더 유닛 테스트
 *
 * 시나리오:
 *   A. resolveTemplateManifest: 존재하는 로컬 매니페스트 JSON 파일 탐색 또는 기본 탑재 폴백 데이터 매체 검증
 *   B. copyCellStyles: 원본 셀 디자인 스타일(글꼴, 테두리, 배경색 등)이 누락 없이 신규 대상 셀에 전달되는지 검증
 *   C. bindDataToExcelTemplate: 템플릿 파일을 읽고, 데이터 레코드를 행 확장 삽입 처리하며 스타일이 전가되는지 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ExcelJS from "exceljs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import {
  resolveTemplateManifest,
  bindDataToExcelTemplate,
  type ExcelSheetConfig,
} from "../main/services/excel-template-binder";

describe("EL-243: ExcelJS Template Binder Engine", () => {
  const testTmpDir = join(tmpdir(), "omx-excel-test");
  const dummyTemplatePath = join(testTmpDir, "WBS-Template_표준양식.xlsx");
  const dummyManifestPath = join(testTmpDir, "WBS-Template_표준양식.json");
  const dummySavePath = join(testTmpDir, "WBS-Output.xlsx");

  beforeEach(async () => {
    // 임시 디렉토리 세팅
    if (!existsSync(testTmpDir)) {
      mkdirSync(testTmpDir, { recursive: true });
    }

    // 1. 임시 테스트용 표준 Excel 템플릿 생성
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("WBS상세");

    // 헤더 행 정보 인가
    sheet.getCell("A7").value = "WBS ID";
    sheet.getCell("B7").value = "대분류";
    sheet.getCell("C7").value = "WBS상세";
    sheet.getCell("D7").value = "담당자";
    sheet.getCell("H7").value = "공수";
    sheet.getCell("I7").value = "진행상태";

    // 데이터 복제 레퍼런스 스타일 소스 셀 (8행)
    const refCellA8 = sheet.getCell("A8");
    refCellA8.value = "[WBS 코드명]";
    refCellA8.font = { name: "나눔고딕", size: 11, bold: true, color: { argb: "FF333333" } };
    refCellA8.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0E0" } };
    refCellA8.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    };
    refCellA8.alignment = { horizontal: "center" };

    const refCellD8 = sheet.getCell("D8");
    refCellD8.alignment = { horizontal: "left" };

    // 행 높수 설정
    sheet.getRow(8).height = 24;

    await workbook.xlsx.writeFile(dummyTemplatePath);
  });

  afterEach(() => {
    // 임시 디렉토리 클린업
    try {
      if (existsSync(testTmpDir)) {
        rmSync(testTmpDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn("임시 폴더 삭제 실패:", e);
    }
  });

  // ── A. 매니페스트 파스 검증 ────────────────────────────────────────────────
  describe("A. resolveTemplateManifest (매니페스트 디렉토리 탐색)", () => {
    it("경로에 JSON 매니페스트 파일이 존재하면 읽어서 파싱하여 빌드 스키마로 사용한다", async () => {
      const mockManifest = {
        template: "WBS-Template_표준양식.xlsx",
        sheets: [
          {
            name: "WBS임시시트",
            headerRow: 1,
            dataStartRow: 2,
            columns: [{ idx: 1, field: "testId", type: "string" }],
          },
        ],
      };

      await writeFile(dummyManifestPath, JSON.stringify(mockManifest), "utf-8");

      const currentSec = await resolveTemplateManifest("WBS-Template_표준양식.xlsx", testTmpDir);
      expect(currentSec).not.toBeNull();
      expect(currentSec?.sheets[0].name).toBe("WBS임시시트");
    });

    it("로컬 매니페스트가 실재하지 않으면 기본 내장 static 사전 정보로 대피하여 복원한다", async () => {
      const currentSec = await resolveTemplateManifest("WBS-Template_표준양식.xlsx", join(testTmpDir, "non-exist"));
      expect(currentSec).not.toBeNull();
      expect(currentSec?.template).toBe("WBS-Template_표준양식.xlsx");
      expect(currentSec?.sheets[0].name).toBe("WBS상세");
    });
  });

  // ── B. 스타일 전가 및 데이터 충진 가동 검증 ─────────────────────────────────
  describe("B. bindDataToExcelTemplate (데이터 도킹 및 포맷 보존)", () => {
    it("양방향 정규화 데이터를 받아 물리 엑셀 출력물을 정상 생성하고 포맷/높이/스타일을 유전시킨다", async () => {
      const recordsToInject = [
        { wbsId: "2.1", depth1: "인프라", task: "서버 설치 및 Docker 구성", owner: "임인프라", effort: 5, status: true },
        { wbsId: "2.2", depth1: "개발", task: "Next.js 프로젝트 스타터 세팅", owner: "홍길동", effort: 2, status: false },
      ];

      const sheetConfig: ExcelSheetConfig = {
        name: "WBS상세",
        headerRow: 7,
        dataStartRow: 8,
        columns: [
          { idx: 1, field: "wbsId", type: "string" },
          { idx: 2, field: "depth1", type: "string" },
          { idx: 3.2, field: "depth2", type: "string" }, // 소수점 인덱스 가공 허용
          { idx: 3, field: "task", type: "string" },
          { idx: 4, field: "owner", type: "string" },
          { idx: 8, field: "effort", type: "number" },
          { idx: 9, field: "status", type: "boolean" },
        ],
      };

      await bindDataToExcelTemplate(dummyTemplatePath, dummySavePath, recordsToInject, sheetConfig);

      // 출력물 생성 확인
      expect(existsSync(dummySavePath)).toBe(true);

      // 출력 파일 재파싱 검증
      const readerWorkbook = new ExcelJS.Workbook();
      await readerWorkbook.xlsx.readFile(dummySavePath);
      const sheet = readerWorkbook.getWorksheet("WBS상세");

      expect(sheet).toBeDefined();

      // 레코드 2개 주입 -> 8행, 9행 채워져 있어야 함
      const row8 = sheet?.getRow(8);
      const row9 = sheet?.getRow(9);

      // 주입 값 검증
      expect(row8?.getCell(1).value).toBe("2.1");
      expect(row8?.getCell(2).value).toBe("인프라");
      expect(row8?.getCell(3).value).toBe("서버 설치 및 Docker 구성");
      expect(row8?.getCell(4).value).toBe("임인프라");
      expect(row8?.getCell(8).value).toBe(5);
      expect(row8?.getCell(9).value).toBe(true);

      expect(row9?.getCell(1).value).toBe("2.2");
      expect(row9?.getCell(2).value).toBe("개발");
      expect(row9?.getCell(3).value).toBe("Next.js 프로젝트 스타터 세팅");
      expect(row9?.getCell(4).value).toBe("홍길동");
      expect(row9?.getCell(8).value).toBe(2);
      expect(row9?.getCell(9).value).toBe(false);

      // 디자인 속성 전이 검사 (8행의 테두리/정렬/배경색이 9행에도 상속되었는지)
      const cellA8 = row8?.getCell(1);
      const cellA9 = row9?.getCell(1);

      expect(cellA9?.font?.name).toBe(cellA8?.font?.name);
      expect(cellA9?.font?.color).toEqual(cellA8?.font?.color);
      expect(cellA9?.fill).toEqual(cellA8?.fill);
      expect(cellA9?.border?.top).toEqual(cellA8?.border?.top);
      expect(cellA9?.alignment?.horizontal).toBe("center");

      // 행 높수 24 전수 복제 확인
      expect(row8?.height).toBe(24);
      expect(row9?.height).toBe(24);
    });
  });
});
