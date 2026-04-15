import * as XLSX from "xlsx";
import type { ParsedElevator, ImportWarning, FullImportResult, ElevatorParseResult, SheetInfo } from "./types";
import { parseElevatorSheet } from "./parse-elevator-sheet";

// Re-export everything consumers need
export { parseElevatorSheet, parseElevatorSheetWithMapping } from "./parse-elevator-sheet";
export { ELEVATOR_COLUMNS } from "./column-mappings";
export { HEADER_ALIASES, TARGET_FIELDS } from "./header-aliases";
export { autoMapSheet, autoMapColumns, detectHeaderRow, getSheetData } from "./auto-mapper";
export type {
  ParsedElevator,
  ImportWarning,
  ElevatorParseResult,
  FullImportResult,
  SheetInfo,
  ColumnDef,
  ColumnMapping,
  AutoMapResult,
  HeaderAlias,
} from "./types";

export { parseExcelImportWithMapping } from "./parse-excel-import-with-mapping";

/**
 * Reads an Excel file buffer and returns a XLSX workbook.
 */
export function readWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "array" });
}

/**
 * Returns metadata about every sheet in the workbook.
 * No sheet names are required — any workbook structure is accepted.
 */
export function getWorkbookSheetInfo(workbook: XLSX.WorkBook): SheetInfo[] {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const data: unknown[][] = sheet
      ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false })
      : [];
    const firstRow = (data[0] || []).map((cell) => String(cell ?? ""));
    return {
      name,
      rowCount: Math.max(0, data.length - 1),
      firstRowPreview: firstRow,
    };
  });
}

/**
 * Parses an entire Excel import file.
 * Looks for a 'Hissar' sheet by default; returns elevator data.
 */
export function parseExcelImport(workbook: XLSX.WorkBook): FullImportResult {
  const sheetNames = workbook.SheetNames;
  const hasHissar = sheetNames.includes("Hissar");

  const allWarnings: ImportWarning[] = [];
  const allInvalidRows: { row: number; sheet: string; reason: string }[] = [];

  let hissarResult: ElevatorParseResult;
  if (hasHissar) {
    hissarResult = parseElevatorSheet(workbook);
    allWarnings.push(...hissarResult.warnings);
    allInvalidRows.push(
      ...hissarResult.invalidRows.map((r) => ({ ...r, sheet: "Hissar" })),
    );
  } else {
    hissarResult = { elevators: [], warnings: [], invalidRows: [], sheetName: "Hissar" };
  }

  return {
    elevators: hissarResult.elevators,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      elevators: { found: hasHissar, count: hissarResult.elevators.length },
    },
  };
}
