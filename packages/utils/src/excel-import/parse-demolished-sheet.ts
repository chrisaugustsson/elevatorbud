import * as XLSX from "xlsx";
import type { ParsedElevator, ImportWarning, ElevatorParseResult } from "./types";
import { RIVNA_ELEVATOR_COLUMNS } from "./column-mappings";
import {
  getCellString,
  parseBuildYear,
  parseLoadCapacity,
  parseFloorsDoors,
  parseCabSize,
  parseDaylightOpening,
  parseModernizationYear,
  parseBoolean,
  parseBudgetAmount,
} from "./parsers";

/**
 * Parses a single row from the 'Rivna hissar' sheet.
 * Uses RIVNA_ELEVATOR_COLUMNS (same as ELEVATOR_COLUMNS minus AH).
 * Sets status to 'demolished'.
 */
function parseDemolishedRow(
  row: unknown[],
  rowIndex: number,
  sheetName: string,
  warnings: ImportWarning[],
): ParsedElevator | null {
  const elevator_number = getCellString(row, 2);
  if (!elevator_number) return null;

  const result: ParsedElevator = {
    elevator_number,
    status: "demolished",
    _source_row: rowIndex,
    _source_sheet: sheetName,
  };

  for (const colDef of RIVNA_ELEVATOR_COLUMNS) {
    const raw = getCellString(row, colDef.col);
    if (!raw && !colDef.mandatory) continue;

    switch (colDef.parser) {
      case "build_year": {
        const parsed = parseBuildYear(raw);
        if (parsed.build_year !== undefined) result.build_year = parsed.build_year;
        break;
      }
      case "compound_load_capacity": {
        const parsed = parseLoadCapacity(raw);
        if (parsed.load_capacity !== undefined) result.load_capacity = parsed.load_capacity;
        break;
      }
      case "compound_floors_doors": {
        const parsed = parseFloorsDoors(raw);
        if (parsed.floor_count !== undefined) result.floor_count = parsed.floor_count;
        if (parsed.door_count !== undefined) result.door_count = parsed.door_count;
        if (raw && parsed.floor_count === undefined && parsed.door_count === undefined) {
          warnings.push({
            row: rowIndex,
            column: colDef.letter,
            message: `Kunde inte tolka plan/doors-varde: "${raw}"`,
          });
        }
        break;
      }
      case "compound_cab_size": {
        const parsed = parseCabSize(raw);
        if (parsed.cab_size !== undefined) result.cab_size = parsed.cab_size;
        break;
      }
      case "compound_door_opening": {
        const parsed = parseDaylightOpening(raw);
        if (parsed.door_opening !== undefined) result.door_opening = parsed.door_opening;
        break;
      }
      case "modernization_year": {
        const parsed = parseModernizationYear(raw);
        if (parsed.modernization_year !== undefined) result.modernization_year = parsed.modernization_year;
        break;
      }
      case "boolean": {
        const val = parseBoolean(raw);
        if (val !== undefined) {
          (result as Record<string, unknown>)[colDef.field] = val;
        }
        break;
      }
      case "budget": {
        const parsed = parseBudgetAmount(raw);
        if (parsed.budget_amount !== undefined) result.budget_amount = parsed.budget_amount;
        break;
      }
      case "number": {
        const num = parseFloat(raw);
        if (!isNaN(num)) {
          (result as Record<string, unknown>)[colDef.field] = num;
        }
        break;
      }
      default: {
        if (raw) {
          (result as Record<string, unknown>)[colDef.field] = raw;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Parses the 'Rivna hissar' sheet from an Excel workbook.
 * - Same structure as Hissar but minus column AH (nodtelefon)
 * - No column headers — data starts from row 1
 * - All parsed elevators get status = 'demolished'
 */
export function parseDemolishedSheet(workbook: XLSX.WorkBook): ElevatorParseResult {
  const sheetName = "Rivna hissar";
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return { elevators: [], warnings: [], invalidRows: [], sheetName };
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (data.length === 0) {
    return { elevators: [], warnings: [], invalidRows: [], sheetName };
  }

  const elevators: ParsedElevator[] = [];
  const warnings: ImportWarning[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  // No headers — data starts from row 1 (0-indexed row 0)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1;

    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const elevator_number = getCellString(row, 2); // Column C
    if (!elevator_number) {
      invalidRows.push({
        row: excelRow,
        reason: "Saknar elevator_number (kolumn C) i Rivna hissar",
      });
      continue;
    }

    const parsed = parseDemolishedRow(row, excelRow, sheetName, warnings);
    if (parsed) {
      elevators.push(parsed);
    }
  }

  return { elevators, warnings, invalidRows, sheetName };
}
