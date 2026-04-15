import type {
  ParsedElevator,
  ImportWarning,
  ElevatorParseResult,
  FullImportResult,
  ColumnMapping,
} from "./types";
import { parseElevatorSheetWithMapping } from "./parse-elevator-sheet";

/**
 * Parses an Excel import using user-confirmed column mappings for the Hissar sheet.
 */
export function parseExcelImportWithMapping(
  workbook: import("xlsx").WorkBook,
  mappings: ColumnMapping[],
  headerRowIndex: number,
): FullImportResult {
  const sheetNames = workbook.SheetNames;
  const hasHissar = sheetNames.includes("Hissar");

  const allWarnings: ImportWarning[] = [];
  const allInvalidRows: { row: number; sheet: string; reason: string }[] = [];

  let hissarResult: ElevatorParseResult;
  if (hasHissar) {
    hissarResult = parseElevatorSheetWithMapping(
      workbook,
      "Hissar",
      mappings,
      headerRowIndex,
    );
    allWarnings.push(...hissarResult.warnings);
    allInvalidRows.push(
      ...hissarResult.invalidRows.map((r) => ({ ...r, sheet: "Hissar" })),
    );
  } else {
    hissarResult = {
      elevators: [],
      warnings: [],
      invalidRows: [],
      sheetName: "Hissar",
    };
  }

  return {
    elevators: hissarResult.elevators,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      elevators: {
        found: hasHissar,
        count: hissarResult.elevators.length,
      },
    },
  };
}
