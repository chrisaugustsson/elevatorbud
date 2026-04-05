import * as XLSX from "xlsx";
import type { ParsedElevator, ImportWarning, EmergencyPhoneEntry, FullImportResult, ElevatorParseResult } from "./types";
import { parseElevatorSheet } from "./parse-elevator-sheet";
import { parseEmergencyPhoneSheet } from "./parse-emergency-phone-sheet";
import { parseDemolishedSheet } from "./parse-demolished-sheet";

// Re-export everything consumers need
export { parseElevatorSheet, parseElevatorSheetWithMapping } from "./parse-elevator-sheet";
export { parseEmergencyPhoneSheet } from "./parse-emergency-phone-sheet";
export { parseDemolishedSheet } from "./parse-demolished-sheet";
export { ELEVATOR_COLUMNS } from "./column-mappings";
export { HEADER_ALIASES, TARGET_FIELDS } from "./header-aliases";
export { autoMapSheet, autoMapColumns, detectHeaderRow, getSheetData } from "./auto-mapper";
export type {
  ParsedElevator,
  ImportWarning,
  ElevatorParseResult,
  EmergencyPhoneParseResult,
  FullImportResult,
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
 * Validates that a workbook contains the required sheets.
 * 'Hissar' is required; 'Nodtelefoner' and 'Rivna hissar' are optional.
 */
export function validateWorkbookSheets(workbook: XLSX.WorkBook): {
  hasHissar: boolean;
  hasNodtelefoner: boolean;
  hasRivna: boolean;
  sheetNames: string[];
} {
  const sheetNames = workbook.SheetNames;
  return {
    hasHissar: sheetNames.includes("Hissar"),
    hasNodtelefoner: sheetNames.includes("Nodtelefoner"),
    hasRivna: sheetNames.includes("Rivna hissar"),
    sheetNames,
  };
}

/**
 * Joins Nodtelefoner data into Hissar elevators by elevator_number.
 * Uses case-insensitive district matching when multiple elevators share the same elevator_number.
 */
function joinEmergencyPhones(
  elevators: ParsedElevator[],
  nodEntries: EmergencyPhoneEntry[],
  warnings: ImportWarning[],
): number {
  if (nodEntries.length === 0) return 0;

  // Build a lookup: elevator_number -> elevator(s)
  const byElevatorNumber = new Map<string, ParsedElevator[]>();
  for (const el of elevators) {
    const key = el.elevator_number.toLowerCase();
    const existing = byElevatorNumber.get(key);
    if (existing) {
      existing.push(el);
    } else {
      byElevatorNumber.set(key, [el]);
    }
  }

  let joined = 0;

  for (const entry of nodEntries) {
    const candidates = byElevatorNumber.get(entry.elevator_number.toLowerCase());
    if (!candidates || candidates.length === 0) {
      warnings.push({
        row: entry._source_row,
        column: "G",
        message: `Nodtelefon-post med elevator_number "${entry.elevator_number}" hittades inte i Hissar-arket`,
      });
      continue;
    }

    // If multiple candidates, use case-insensitive district matching
    let target: ParsedElevator;
    if (candidates.length === 1) {
      target = candidates[0];
    } else if (entry.district) {
      const districtLower = entry.district.toLowerCase();
      const match = candidates.find(
        (h) => h.district?.toLowerCase() === districtLower,
      );
      if (match) {
        target = match;
      } else {
        // No district match — default to first candidate and warn
        target = candidates[0];
        warnings.push({
          row: entry._source_row,
          column: "B",
          message: `Flera hissar med nummer "${entry.elevator_number}", kunde inte matcha distrikt "${entry.district}" — anvander forsta traffen`,
        });
      }
    } else {
      target = candidates[0];
    }

    // Merge nodtelefon fields into the elevator
    if (entry.has_emergency_phone !== undefined) target.has_emergency_phone = entry.has_emergency_phone;
    if (entry.emergency_phone_model !== undefined) target.emergency_phone_model = entry.emergency_phone_model;
    if (entry.emergency_phone_type !== undefined) target.emergency_phone_type = entry.emergency_phone_type;
    if (entry.needs_upgrade !== undefined) target.needs_upgrade = entry.needs_upgrade;
    if (entry.emergency_phone_price !== undefined) target.emergency_phone_price = entry.emergency_phone_price;
    joined++;
  }

  return joined;
}

/**
 * Parses an entire Excel import file with all three sheets:
 * - 'Hissar' (required): main elevator data
 * - 'Nodtelefoner' (optional): emergency phone data, joined via elevator_number
 * - 'Rivna hissar' (optional): demolished elevators, same structure minus column AH, status='rivd'
 *
 * Returns combined results with sheet source metadata.
 */
export function parseExcelImport(workbook: XLSX.WorkBook): FullImportResult {
  const validation = validateWorkbookSheets(workbook);

  const allWarnings: ImportWarning[] = [];
  const allInvalidRows: { row: number; sheet: string; reason: string }[] = [];

  // 1. Parse Hissar sheet (required)
  let hissarResult: ElevatorParseResult;
  if (validation.hasHissar) {
    hissarResult = parseElevatorSheet(workbook);
    allWarnings.push(...hissarResult.warnings);
    allInvalidRows.push(
      ...hissarResult.invalidRows.map((r) => ({ ...r, sheet: "Hissar" })),
    );
  } else {
    hissarResult = { elevators: [], warnings: [], invalidRows: [], sheetName: "Hissar" };
    allWarnings.push({
      row: 0,
      column: "",
      message: "Obligatoriskt ark 'Hissar' saknas i filen",
    });
  }

  // 2. Parse Nodtelefoner sheet (optional) and join with Hissar
  let nodJoinedCount = 0;
  let nodEntryCount = 0;
  if (validation.hasNodtelefoner) {
    const nodResult = parseEmergencyPhoneSheet(workbook);
    nodEntryCount = nodResult.entries.length;
    allWarnings.push(...nodResult.warnings);
    nodJoinedCount = joinEmergencyPhones(hissarResult.elevators, nodResult.entries, allWarnings);
  }

  // 3. Parse Rivna hissar sheet (optional)
  let rivnaResult: ElevatorParseResult;
  if (validation.hasRivna) {
    rivnaResult = parseDemolishedSheet(workbook);
    allWarnings.push(...rivnaResult.warnings);
    allInvalidRows.push(
      ...rivnaResult.invalidRows.map((r) => ({ ...r, sheet: "Rivna hissar" })),
    );
  } else {
    rivnaResult = { elevators: [], warnings: [], invalidRows: [], sheetName: "Rivna hissar" };
  }

  // Combine all elevators
  const combined = [...hissarResult.elevators, ...rivnaResult.elevators];

  return {
    elevators: hissarResult.elevators,
    demolished: rivnaResult.elevators,
    combined,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      elevators: { found: validation.hasHissar, count: hissarResult.elevators.length },
      emergencyPhones: { found: validation.hasNodtelefoner, count: nodEntryCount, joined: nodJoinedCount },
      demolished: { found: validation.hasRivna, count: rivnaResult.elevators.length },
    },
  };
}
