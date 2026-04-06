import * as XLSX from "xlsx";
import type { ParsedElevator, ImportWarning, ElevatorParseResult, ColumnMapping } from "./types";
import { ELEVATOR_COLUMNS } from "./column-mappings";
import {
  getCellString,
  parseBuildYear,
  parseLoadCapacity,
  parseFloorsDoors,
  parseCabSize,
  parseDaylightOpening,
  parseEmergencyPhone,
  parseModernizationYear,
  parseBoolean,
  parseBudgetAmount,
} from "./parsers";

// --- Row Parser ---

function parseElevatorRow(
  row: unknown[],
  rowIndex: number, // 1-based Excel row number
  sheetName: string,
  warnings: ImportWarning[],
): ParsedElevator | null {
  const elevator_number = getCellString(row, 2); // Column C
  if (!elevator_number) {
    return null; // Skip rows without elevator_number
  }

  const result: ParsedElevator = {
    elevator_number,
    _source_row: rowIndex,
    _source_sheet: sheetName,
  };

  for (const colDef of ELEVATOR_COLUMNS) {
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
      case "compound_emergency_phone": {
        const parsed = parseEmergencyPhone(raw);
        if (parsed.has_emergency_phone !== undefined) result.has_emergency_phone = parsed.has_emergency_phone;
        if (parsed.emergency_phone_model !== undefined) result.emergency_phone_model = parsed.emergency_phone_model;
        if (parsed.emergency_phone_type !== undefined) result.emergency_phone_type = parsed.emergency_phone_type;
        if (parsed.needs_upgrade !== undefined) result.needs_upgrade = parsed.needs_upgrade;
        if (parsed.emergency_phone_price !== undefined) result.emergency_phone_price = parsed.emergency_phone_price;
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
        // Plain string field
        if (raw) {
          (result as Record<string, unknown>)[colDef.field] = raw;
        }
        break;
      }
    }
  }

  return result;
}

// --- Validation ---

function validateMandatoryColumns(
  headerRow: unknown[],
): { valid: boolean; missing: string[] } {
  const mandatoryCols = ELEVATOR_COLUMNS.filter((c) => c.mandatory);
  const missing: string[] = [];

  for (const col of mandatoryCols) {
    const header = getCellString(headerRow, col.col);
    if (!header) {
      missing.push(`${col.letter} (${col.field})`);
    }
  }

  return { valid: missing.length === 0, missing };
}

// --- Main Parser ---

/**
 * Parses the 'Hissar' sheet from an Excel workbook.
 * - Reads column headers from row 2 (0-indexed row 1)
 * - Validates mandatory columns C, J, L, AB
 * - Parses compound fields, handles special values
 * - Returns structured elevator objects ready for Convex mutations
 */
export function parseElevatorSheet(workbook: XLSX.WorkBook): ElevatorParseResult {
  const sheetName = "Hissar";
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return {
      elevators: [],
      warnings: [],
      invalidRows: [],
      sheetName,
    };
  }

  // Convert sheet to array of arrays (all rows)
  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false, // Get string representations
  });

  if (data.length < 2) {
    return {
      elevators: [],
      warnings: [{ row: 0, column: "", message: "Arket innehaller for fa rader (forvantade minst rad 2 med rubriker)" }],
      invalidRows: [],
      sheetName,
    };
  }

  // Row 2 = headers (0-indexed: row 1)
  const headerRow = data[1];
  const { valid, missing } = validateMandatoryColumns(headerRow);

  const warnings: ImportWarning[] = [];
  if (!valid) {
    warnings.push({
      row: 2,
      column: "",
      message: `Saknade obligatoriska kolumnrubriker: ${missing.join(", ")}`,
    });
  }

  const elevators: ParsedElevator[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  // Data starts from row 3 (0-indexed: row 2)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1; // Convert to 1-based Excel row number

    // Skip completely empty rows
    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const elevator_number = getCellString(row, 2); // Column C
    if (!elevator_number) {
      invalidRows.push({
        row: excelRow,
        reason: "Saknar elevator_number (kolumn C)",
      });
      continue;
    }

    const parsed = parseElevatorRow(row, excelRow, sheetName, warnings);
    if (parsed) {
      elevators.push(parsed);
    }
  }

  return { elevators, warnings, invalidRows, sheetName };
}

// --- Mapping-Based Parser ---

/**
 * Parses a single row using a user-confirmed column mapping.
 * Same parsing logic as parseElevatorRow, but uses ColumnMapping[] instead of hardcoded positions.
 */
function parseRowWithMapping(
  row: unknown[],
  rowIndex: number,
  sheetName: string,
  mappings: ColumnMapping[],
  warnings: ImportWarning[],
): ParsedElevator | null {
  // Find elevator_number mapping
  const elevatorNumberMapping = mappings.find(
    (m) => m.field === "elevator_number",
  );
  if (!elevatorNumberMapping) return null;

  const elevator_number = getCellString(row, elevatorNumberMapping.sourceIndex);
  if (!elevator_number) return null;

  const result: ParsedElevator = {
    elevator_number,
    _source_row: rowIndex,
    _source_sheet: sheetName,
  };

  for (const mapping of mappings) {
    if (mapping.field === "_skip" || mapping.field === "elevator_number") continue;

    const raw = getCellString(row, mapping.sourceIndex);
    if (!raw) continue;

    switch (mapping.parser) {
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
            column: mapping.sourceHeader,
            message: `Kunde inte tolka plan/dörrar-värde: "${raw}"`,
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
      case "compound_emergency_phone": {
        const parsed = parseEmergencyPhone(raw);
        if (parsed.has_emergency_phone !== undefined) result.has_emergency_phone = parsed.has_emergency_phone;
        if (parsed.emergency_phone_model !== undefined) result.emergency_phone_model = parsed.emergency_phone_model;
        if (parsed.emergency_phone_type !== undefined) result.emergency_phone_type = parsed.emergency_phone_type;
        if (parsed.needs_upgrade !== undefined) result.needs_upgrade = parsed.needs_upgrade;
        if (parsed.emergency_phone_price !== undefined) result.emergency_phone_price = parsed.emergency_phone_price;
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
          (result as Record<string, unknown>)[mapping.field] = val;
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
          (result as Record<string, unknown>)[mapping.field] = num;
        }
        break;
      }
      default: {
        if (raw) {
          (result as Record<string, unknown>)[mapping.field] = raw;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Parses the Hissar sheet using a user-confirmed column mapping
 * instead of hardcoded column positions.
 *
 * @param workbook - The XLSX workbook
 * @param sheetName - Name of the sheet to parse
 * @param mappings - Confirmed column mappings from the mapping UI
 * @param headerRowIndex - 0-based index of the header row (data starts at headerRowIndex + 1)
 */
export function parseElevatorSheetWithMapping(
  workbook: XLSX.WorkBook,
  sheetName: string,
  mappings: ColumnMapping[],
  headerRowIndex: number,
): ElevatorParseResult {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { elevators: [], warnings: [], invalidRows: [], sheetName };
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const warnings: ImportWarning[] = [];
  const elevators: ParsedElevator[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  // Check if elevator_number is mapped
  const hasElevatorNumber = mappings.some(
    (m) => m.field === "elevator_number",
  );
  if (!hasElevatorNumber) {
    warnings.push({
      row: 0,
      column: "",
      message: "Hissnummer (elevator_number) är inte mappad — inga rader kan importeras",
    });
    return { elevators, warnings, invalidRows, sheetName };
  }

  const elevatorNumberMapping = mappings.find(
    (m) => m.field === "elevator_number",
  )!;

  // Data starts from the row after headers
  const dataStartIndex = headerRowIndex + 1;

  for (let i = dataStartIndex; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1; // 1-based Excel row number

    // Skip empty rows
    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const elevator_number = getCellString(row, elevatorNumberMapping.sourceIndex);
    if (!elevator_number) {
      invalidRows.push({
        row: excelRow,
        reason: `Saknar hissnummer (kolumn "${elevatorNumberMapping.sourceHeader}")`,
      });
      continue;
    }

    const parsed = parseRowWithMapping(row, excelRow, sheetName, mappings, warnings);
    if (parsed) {
      elevators.push(parsed);
    }
  }

  return { elevators, warnings, invalidRows, sheetName };
}
