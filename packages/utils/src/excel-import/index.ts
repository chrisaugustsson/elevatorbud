import * as XLSX from "xlsx";
import type { SheetInfo } from "./types";

// Re-export everything consumers need
export { parseElevatorSheetWithMapping } from "./parse-elevator-sheet";
export { ELEVATOR_COLUMNS } from "./column-mappings";
export { HEADER_ALIASES, TARGET_FIELDS } from "./header-aliases";
export { autoMapSheet, autoMapColumns, detectHeaderRow, getSheetData } from "./auto-mapper";
export type {
  ParsedElevator,
  ImportWarning,
  ElevatorParseResult,
  FullImportResult,
  SheetInfo,
  SheetMappingConfig,
  ColumnDef,
  ColumnMapping,
  AutoMapResult,
  HeaderAlias,
} from "./types";

export { parseExcelImportWithMapping } from "./parse-excel-import-with-mapping";
export { slugifyHeader } from "./slugify";

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
