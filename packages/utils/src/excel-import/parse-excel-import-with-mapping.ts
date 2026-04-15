import type {
  ParsedElevator,
  ImportWarning,
  ElevatorParseResult,
  EmergencyPhoneEntry,
  FullImportResult,
  ColumnMapping,
} from "./types";
import { parseElevatorSheetWithMapping } from "./parse-elevator-sheet";
import { parseEmergencyPhoneSheet } from "./parse-emergency-phone-sheet";
import { parseDemolishedSheet } from "./parse-demolished-sheet";

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
    const candidates = byElevatorNumber.get(
      entry.elevator_number.toLowerCase(),
    );
    if (!candidates || candidates.length === 0) {
      warnings.push({
        row: entry._source_row,
        column: "G",
        message: `Nodtelefon-post med elevator_number "${entry.elevator_number}" hittades inte i Hissar-arket`,
      });
      continue;
    }

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

    if (entry.has_emergency_phone !== undefined)
      target.has_emergency_phone = entry.has_emergency_phone;
    if (entry.emergency_phone_model !== undefined)
      target.emergency_phone_model = entry.emergency_phone_model;
    if (entry.emergency_phone_type !== undefined)
      target.emergency_phone_type = entry.emergency_phone_type;
    if (entry.needs_upgrade !== undefined)
      target.needs_upgrade = entry.needs_upgrade;
    if (entry.emergency_phone_price !== undefined)
      target.emergency_phone_price = entry.emergency_phone_price;
    joined++;
  }

  return joined;
}

/**
 * Like parseExcelImport, but uses user-confirmed column mappings for the Hissar sheet.
 * Nodtelefoner and Rivna hissar still use their existing hardcoded parsers.
 */
export function parseExcelImportWithMapping(
  workbook: import("xlsx").WorkBook,
  mappings: ColumnMapping[],
  headerRowIndex: number,
): FullImportResult {
  const sheetNames = workbook.SheetNames;
  const hasHissar = sheetNames.includes("Hissar");
  const hasNodtelefoner = sheetNames.includes("Nodtelefoner");
  const hasRivna = sheetNames.includes("Rivna hissar");

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

  let nodJoinedCount = 0;
  let nodEntryCount = 0;
  if (hasNodtelefoner) {
    const nodResult = parseEmergencyPhoneSheet(workbook);
    nodEntryCount = nodResult.entries.length;
    allWarnings.push(...nodResult.warnings);
    nodJoinedCount = joinEmergencyPhones(
      hissarResult.elevators,
      nodResult.entries,
      allWarnings,
    );
  }

  let rivnaResult: ElevatorParseResult;
  if (hasRivna) {
    rivnaResult = parseDemolishedSheet(workbook);
    allWarnings.push(...rivnaResult.warnings);
    allInvalidRows.push(
      ...rivnaResult.invalidRows.map((r) => ({ ...r, sheet: "Rivna hissar" })),
    );
  } else {
    rivnaResult = {
      elevators: [],
      warnings: [],
      invalidRows: [],
      sheetName: "Rivna hissar",
    };
  }

  const combined = [...hissarResult.elevators, ...rivnaResult.elevators];

  return {
    elevators: hissarResult.elevators,
    demolished: rivnaResult.elevators,
    combined,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      elevators: {
        found: hasHissar,
        count: hissarResult.elevators.length,
      },
      emergencyPhones: {
        found: hasNodtelefoner,
        count: nodEntryCount,
        joined: nodJoinedCount,
      },
      demolished: {
        found: hasRivna,
        count: rivnaResult.elevators.length,
      },
    },
  };
}
