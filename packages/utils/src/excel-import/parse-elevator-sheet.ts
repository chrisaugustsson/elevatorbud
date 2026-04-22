import * as XLSX from "xlsx";
import type { ParsedElevator, ImportWarning, ElevatorParseResult, ColumnMapping } from "./types";
import {
  getCellString,
  parseBuildYear,
  parseLoadCapacity,
  parseFloorsDoors,
  parseCabSize,
  parseDaylightOpening,
  parseModernizationYear,
  parseRecommendedModernizationYear,
  parseInspectionMonth,
  parseInventoryDate,
  parseWarrantyDate,
  parseBoolean,
  parseBudgetAmount,
  parseEmergencyPhone,
} from "./parsers";
import { slugifyHeader } from "./slugify";

// --- Mapping-Based Parser ---

/**
 * Parses a single row using a user-confirmed column mapping.
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
            elevator_number,
          });
        }
        break;
      }
      case "compound_cab_size": {
        const parsed = parseCabSize(raw);
        if (parsed.cab_size !== undefined) result.cab_size = parsed.cab_size;
        break;
      }
      case "compound_daylight_opening": {
        const parsed = parseDaylightOpening(raw);
        if (parsed.daylight_opening !== undefined) result.daylight_opening = parsed.daylight_opening;
        break;
      }
      case "modernization_year": {
        const parsed = parseModernizationYear(raw);
        if (parsed.modernization_year !== undefined) {
          result.modernization_year = parsed.modernization_year;
        }
        if (parsed.warning) {
          warnings.push({
            row: rowIndex,
            column: mapping.sourceHeader,
            message: parsed.warning,
            elevator_number,
          });
        }
        break;
      }
      case "recommended_modernization_year": {
        const parsed = parseRecommendedModernizationYear(raw);
        if (parsed.recommended_modernization_year !== undefined) {
          result.recommended_modernization_year =
            parsed.recommended_modernization_year;
        }
        if (parsed.warning) {
          warnings.push({
            row: rowIndex,
            column: mapping.sourceHeader,
            message: parsed.warning,
            elevator_number,
          });
        }
        break;
      }
      case "inspection_month": {
        const parsed = parseInspectionMonth(raw);
        if (parsed.inspection_month !== undefined) {
          result.inspection_month = parsed.inspection_month;
        }
        if (parsed.warning) {
          warnings.push({
            row: rowIndex,
            column: mapping.sourceHeader,
            message: parsed.warning,
            elevator_number,
          });
        }
        break;
      }
      case "inventory_date": {
        const parsed = parseInventoryDate(raw);
        if (parsed.inventory_date !== undefined) {
          result.inventory_date = parsed.inventory_date;
        } else {
          warnings.push({
            row: rowIndex,
            column: mapping.sourceHeader,
            message: `Kunde inte tolka inventeringsdatum: "${raw}"`,
            elevator_number,
          });
        }
        break;
      }
      case "warranty_date": {
        // Garanti column. Only parseable dates are kept; sentinel
        // strings ("Ja"/"Nej"/"?"/"okänt") are dropped silently — they
        // carry no actionable info for our UI.
        const parsed = parseWarrantyDate(raw);
        if (parsed.warranty_expires_at !== undefined) {
          result.warranty_expires_at = parsed.warranty_expires_at;
        }
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
      case "emergency_phone": {
        const parsed = parseEmergencyPhone(raw);
        if (parsed.has_emergency_phone !== undefined) {
          result.has_emergency_phone = parsed.has_emergency_phone;
        }
        if (parsed.emergency_phone !== undefined) {
          result.emergency_phone = parsed.emergency_phone;
        }
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
        // Custom field: stash the raw string under a def key. Two forms:
        //   "_custom_field"           → slug the source header (new def)
        //   "_custom_field:{key}"     → pin to an existing def's key
        //                               (admin picked it from the catalog)
        // The label travels alongside so the server can upsert / update
        // aliases for new defs. For pinned fields the server ignores the
        // label (def already exists).
        if (
          mapping.field === "_custom_field" ||
          mapping.field.startsWith("_custom_field:")
        ) {
          if (raw) {
            const pinned = mapping.field.startsWith("_custom_field:")
              ? mapping.field.slice("_custom_field:".length)
              : null;
            const key = pinned ?? slugifyHeader(mapping.sourceHeader);
            if (key) {
              if (!result.custom_fields) result.custom_fields = {};
              if (!result.custom_field_labels) result.custom_field_labels = {};
              result.custom_fields[key] = raw;
              // Only send label for new defs — pinned ones skip the
              // alias-append roundtrip.
              if (!pinned) {
                result.custom_field_labels[key] = mapping.sourceHeader;
              }
            }
          }
          break;
        }
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
 * Parses a sheet using a user-confirmed column mapping
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
