import * as XLSX from "xlsx";
import type { ImportWarning, EmergencyPhoneEntry, EmergencyPhoneParseResult } from "./types";
import { EMERGENCY_PHONE_COLUMNS } from "./column-mappings";
import { getCellString, parseBoolean } from "./parsers";

/**
 * Parses the 'Nodtelefoner' sheet from an Excel workbook.
 * - Reads column headers from row 2 (0-indexed row 1), data from row 3
 * - Column G (index 6) is elevator_number — used as join key
 * - Returns nodtelefon entries keyed by elevator_number for joining with Hissar data
 */
export function parseEmergencyPhoneSheet(workbook: XLSX.WorkBook): EmergencyPhoneParseResult {
  const sheetName = "Nodtelefoner";
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    return { entries: [], warnings: [], sheetName };
  }

  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (data.length < 2) {
    return {
      entries: [],
      warnings: [{ row: 0, column: "", message: "Nodtelefoner-arket innehaller for fa rader" }],
      sheetName,
    };
  }

  const entries: EmergencyPhoneEntry[] = [];
  const warnings: ImportWarning[] = [];

  // Data starts from row 3 (0-indexed row 2), headers in row 2 (0-indexed row 1)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1;

    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const elevator_number = getCellString(row, 6); // Column G
    if (!elevator_number) {
      warnings.push({
        row: excelRow,
        column: "G",
        message: "Saknar elevator_number i Nodtelefoner-arket, rad hoppas over",
      });
      continue;
    }

    const entry: EmergencyPhoneEntry = {
      elevator_number,
      _source_row: excelRow,
    };

    // Parse distrikt for case-insensitive matching
    const distrikt = getCellString(row, 1); // Column B
    if (distrikt) entry.district = distrikt;

    // Parse nodtelefon fields
    for (const colDef of EMERGENCY_PHONE_COLUMNS) {
      if (colDef.field === "elevator_number" || colDef.field.startsWith("_")) continue;
      const raw = getCellString(row, colDef.col);
      if (!raw) continue;

      switch (colDef.parser) {
        case "boolean": {
          const val = parseBoolean(raw);
          if (val !== undefined) {
            (entry as Record<string, unknown>)[colDef.field] = val;
          }
          break;
        }
        case "number": {
          const cleaned = raw.replace(/\s/g, "").replace(/kr$/i, "").replace(/sek$/i, "");
          const num = parseFloat(cleaned);
          if (!isNaN(num)) {
            (entry as Record<string, unknown>)[colDef.field] = num;
          }
          break;
        }
        default: {
          (entry as Record<string, unknown>)[colDef.field] = raw;
          break;
        }
      }
    }

    entries.push(entry);
  }

  return { entries, warnings, sheetName };
}
