import * as XLSX from "xlsx";

// --- Types ---

export type ParsedElevator = {
  // Identifiering
  elevator_number: string;
  address?: string;
  elevator_designation?: string;
  district?: string;

  // Teknisk specifikation
  elevator_type?: string;
  manufacturer?: string;
  build_year?: number;
  speed?: string;
  lift_height?: string;
  load_capacity?: string;
  floor_count?: number;
  door_count?: number;

  // Dorrar och korg
  door_type?: string;
  passthrough?: boolean;
  collective?: string;
  cab_size?: string;
  daylight_opening?: string;
  grab_rail?: string;
  door_machine?: string;

  // Maskineri
  drive_system?: string;
  suspension?: string;
  machine_placement?: string;
  machine_type?: string;
  control_system_type?: string;

  // Besiktning och underhall
  inspection_authority?: string;
  inspection_month?: string;
  maintenance_company?: string;
  shaft_lighting?: string;

  // Modernisering
  modernization_year?: string;
  warranty?: boolean;
  rekommenderat_modernization_year?: string;
  budget_amount?: number;
  modernization_measures?: string;

  // Nodtelefon
  has_emergency_phone?: boolean;
  emergency_phone_model?: string;
  emergency_phone_type?: string;
  needs_upgrade?: boolean;
  emergency_phone_price?: number;

  // Kommentarer
  comments?: string;

  // Status (set during import: 'aktiv' for Hissar, 'rivd' for Rivna hissar)
  status?: "active" | "demolished" | "arkiverad";

  // Import metadata (not stored in DB, used during import processing)
  _organisation_namn?: string;
  _source_row: number;
  _source_sheet: string;
};

export type ImportWarning = {
  row: number;
  column: string;
  message: string;
};

export type ElevatorParseResult = {
  elevators: ParsedElevator[];
  warnings: ImportWarning[];
  invalidRows: { row: number; reason: string }[];
  sheetName: string;
};

// --- Column Mapping ---
// Hissar sheet has headers in row 2, data from row 3.
// Column letters reference the standard Hisskompetens Excel format.

type ColumnDef = {
  col: number; // 0-based column index
  letter: string; // Excel column letter (for error messages)
  field: string; // Target field name or special parser key
  mandatory?: boolean;
  parser?: "compound_load_capacity" | "compound_floors_doors" | "compound_cab_size" | "compound_daylight_opening" | "compound_emergency_phone" | "build_year" | "modernization_year" | "boolean" | "number" | "budget";
};

// Standard Hisskompetens Excel column mapping for the "Hissar" sheet.
// Headers are in row 2; data starts at row 3.
const ELEVATOR_COLUMNS: ColumnDef[] = [
  { col: 0, letter: "A", field: "_organisation_namn" },
  { col: 1, letter: "B", field: "district" },
  { col: 2, letter: "C", field: "elevator_number", mandatory: true },
  { col: 3, letter: "D", field: "address" },
  { col: 4, letter: "E", field: "elevator_designation" },
  { col: 5, letter: "F", field: "elevator_type" },
  { col: 6, letter: "G", field: "manufacturer" },
  { col: 7, letter: "H", field: "speed" },
  { col: 8, letter: "I", field: "lift_height" },
  { col: 9, letter: "J", field: "build_year", mandatory: true, parser: "build_year" },
  { col: 10, letter: "K", field: "load_capacity", parser: "compound_load_capacity" },
  { col: 11, letter: "L", field: "floors_doors", mandatory: true, parser: "compound_floors_doors" },
  { col: 12, letter: "M", field: "door_type" },
  { col: 13, letter: "N", field: "passthrough", parser: "boolean" },
  { col: 14, letter: "O", field: "collective" },
  { col: 15, letter: "P", field: "cab_size", parser: "compound_cab_size" },
  { col: 16, letter: "Q", field: "daylight_opening", parser: "compound_daylight_opening" },
  { col: 17, letter: "R", field: "grab_rail" },
  { col: 18, letter: "S", field: "door_machine" },
  { col: 19, letter: "T", field: "drive_system" },
  { col: 20, letter: "U", field: "suspension" },
  { col: 21, letter: "V", field: "machine_placement" },
  { col: 22, letter: "W", field: "machine_type" },
  { col: 23, letter: "X", field: "control_system_type" },
  { col: 24, letter: "Y", field: "inspection_authority" },
  { col: 25, letter: "Z", field: "inspection_month" },
  { col: 26, letter: "AA", field: "maintenance_company" },
  { col: 27, letter: "AB", field: "modernization_year", mandatory: true, parser: "modernization_year" },
  { col: 28, letter: "AC", field: "warranty", parser: "boolean" },
  { col: 29, letter: "AD", field: "rekommenderat_modernization_year" },
  { col: 30, letter: "AE", field: "budget_amount", parser: "budget" },
  { col: 31, letter: "AF", field: "modernization_measures" },
  { col: 32, letter: "AG", field: "shaft_lighting" },
  { col: 33, letter: "AH", field: "emergency_phone", parser: "compound_emergency_phone" },
];

// --- Compound Field Parsers ---

/**
 * Parses load_capacity compound format: '500*6' (last_kg * antal_personer)
 * Stored as-is since schema field is string.
 */
function parseLoadCapacity(raw: string): { load_capacity?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { load_capacity: trimmed };
}

/**
 * Parses plan/doors compound format: '10*10' → floor_count and door_count
 */
function parseFloorsDoors(raw: string): { floor_count?: number; door_count?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const parts = trimmed.split("*");
  const result: { floor_count?: number; door_count?: number } = {};

  if (parts[0]) {
    const plan = parseInt(parts[0].trim(), 10);
    if (!isNaN(plan)) result.floor_count = plan;
  }
  if (parts[1]) {
    const doors = parseInt(parts[1].trim(), 10);
    if (!isNaN(doors)) result.door_count = doors;
  }

  return result;
}

/**
 * Parses cab_size compound format: '1000*2050*2300' (bredd*djup*hojd)
 * Stored as-is since schema field is string.
 */
function parseCabSize(raw: string): { cab_size?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { cab_size: trimmed };
}

/**
 * Parses daylight_opening compound format: '900*2000' (bredd*hojd)
 * Stored as-is since schema field is string.
 */
function parseDaylightOpening(raw: string): { daylight_opening?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { daylight_opening: trimmed };
}

/**
 * Parses build_year (construction year).
 * Handles 'Okant' / 'Okänt' → undefined
 */
function parseBuildYear(raw: string): { build_year?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const lower = trimmed.toLowerCase();
  if (lower === "okänt" || lower === "okant" || lower === "okänd" || lower === "okand") {
    return {};
  }
  const year = parseInt(trimmed, 10);
  if (isNaN(year)) return {};
  return { build_year: year };
}

/**
 * Parses modernization_year field.
 * Handles 'Ej ombyggd' → 'Ej ombyggd'
 * Handles year with suffixes: '2007-vinga' → '2007-vinga'
 * Handles plain year: '2010' → '2010'
 */
function parseModernizationYear(raw: string): { modernization_year?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Keep as-is — "Ej ombyggd", "2007-vinga", "2010" are all valid string values
  return { modernization_year: trimmed };
}

/**
 * Parses nodtelefon compound cell.
 * Tries to extract: has_emergency_phone, modell, typ, needs_upgrade, pris
 * Common formats:
 *   "Ja" / "Nej"
 *   "Ja, Modell X, Typ Y"
 *   Compound with semicolons or commas
 */
function parseEmergencyPhone(raw: string): {
  has_emergency_phone?: boolean;
  emergency_phone_model?: string;
  emergency_phone_type?: string;
  needs_upgrade?: boolean;
  emergency_phone_price?: number;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const lower = trimmed.toLowerCase();

  // Simple yes/no
  if (lower === "nej" || lower === "n") {
    return { has_emergency_phone: false };
  }
  if (lower === "ja" || lower === "j") {
    return { has_emergency_phone: true };
  }

  // Try to parse compound format separated by comma or semicolon
  const parts = trimmed.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  const result: ReturnType<typeof parseEmergencyPhone> = {};

  if (parts.length > 0) {
    const first = parts[0].toLowerCase();
    if (first === "ja" || first === "j") {
      result.has_emergency_phone = true;
    } else if (first === "nej" || first === "n") {
      result.has_emergency_phone = false;
    } else {
      // First part is likely the model if not a yes/no
      result.has_emergency_phone = true;
      result.emergency_phone_model = parts[0];
    }
  }
  if (parts.length > 1 && !result.emergency_phone_model) {
    result.emergency_phone_model = parts[1];
  }
  if (parts.length > 2) {
    result.emergency_phone_type = parts[2];
  }
  if (parts.length > 3) {
    const uppgr = parts[3].toLowerCase();
    if (uppgr === "ja" || uppgr === "j" || uppgr.includes("uppgr")) {
      result.needs_upgrade = true;
    } else if (uppgr === "nej" || uppgr === "n") {
      result.needs_upgrade = false;
    }
  }
  if (parts.length > 4) {
    const pris = parseFloat(parts[4].replace(/[^\d.]/g, ""));
    if (!isNaN(pris)) result.emergency_phone_price = pris;
  }

  return result;
}

function parseBoolean(raw: string): boolean | undefined {
  const lower = raw.trim().toLowerCase();
  if (lower === "ja" || lower === "j" || lower === "yes" || lower === "1" || lower === "true") {
    return true;
  }
  if (lower === "nej" || lower === "n" || lower === "no" || lower === "0" || lower === "false") {
    return false;
  }
  return undefined;
}

function parseBudgetAmount(raw: string): { budget_amount?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Remove common currency markers and spaces: "150 000 kr" → "150000"
  const cleaned = trimmed.replace(/\s/g, "").replace(/kr$/i, "").replace(/sek$/i, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return {};
  return { budget_amount: num };
}

// --- Cell Value Extraction ---

function getCellString(row: unknown[], colIndex: number): string {
  const val = row[colIndex];
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

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
      case "compound_daylight_opening": {
        const parsed = parseDaylightOpening(raw);
        if (parsed.daylight_opening !== undefined) result.daylight_opening = parsed.daylight_opening;
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

// --- Nodtelefoner Sheet ---

/**
 * Column mapping for the 'Nodtelefoner' sheet.
 * Column G (index 6) is elevator_number — the join key to Hissar.
 * Other columns contain expanded emergency phone data.
 */
const EMERGENCY_PHONE_COLUMNS = [
  { col: 0, letter: "A", field: "_organisation_namn" },
  { col: 1, letter: "B", field: "_distrikt" }, // used for case-insensitive matching during join
  { col: 2, letter: "C", field: "_adress" },
  { col: 3, letter: "D", field: "_elevator_designation" },
  { col: 4, letter: "E", field: "_elevator_type" },
  { col: 5, letter: "F", field: "_manufacturer" },
  { col: 6, letter: "G", field: "elevator_number" }, // JOIN KEY
  { col: 7, letter: "H", field: "has_emergency_phone", parser: "boolean" as const },
  { col: 8, letter: "I", field: "emergency_phone_model" },
  { col: 9, letter: "J", field: "emergency_phone_type" },
  { col: 10, letter: "K", field: "needs_upgrade", parser: "boolean" as const },
  { col: 11, letter: "L", field: "emergency_phone_price", parser: "number" as const },
];

type EmergencyPhoneEntry = {
  elevator_number: string;
  district?: string;
  has_emergency_phone?: boolean;
  emergency_phone_model?: string;
  emergency_phone_type?: string;
  needs_upgrade?: boolean;
  emergency_phone_price?: number;
  _source_row: number;
};

export type EmergencyPhoneParseResult = {
  entries: EmergencyPhoneEntry[];
  warnings: ImportWarning[];
  sheetName: string;
};

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

// --- Rivna Hissar Sheet ---

/**
 * Rivna hissar uses the same column structure as Hissar but WITHOUT column AH (nodtelefon).
 * No column headers — data starts from row 1.
 */
const RIVNA_ELEVATOR_COLUMNS: ColumnDef[] = ELEVATOR_COLUMNS.filter(
  (col) => col.letter !== "AH",
);

/**
 * Parses the 'Rivna hissar' sheet from an Excel workbook.
 * - Same structure as Hissar but minus column AH (nodtelefon)
 * - No column headers — data starts from row 1
 * - All parsed elevators get status = 'rivd'
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

/**
 * Parses a single row from the 'Rivna hissar' sheet.
 * Uses RIVNA_ELEVATOR_COLUMNS (same as ELEVATOR_COLUMNS minus AH).
 * Sets status to 'rivd'.
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
      case "compound_daylight_opening": {
        const parsed = parseDaylightOpening(raw);
        if (parsed.daylight_opening !== undefined) result.daylight_opening = parsed.daylight_opening;
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

// --- Combined Import ---

export type FullImportResult = {
  elevators: ParsedElevator[];
  demolished: ParsedElevator[];
  combined: ParsedElevator[];
  warnings: ImportWarning[];
  invalidRows: { row: number; sheet: string; reason: string }[];
  sheets: {
    elevators: { found: boolean; count: number };
    emergencyPhones: { found: boolean; count: number; joined: number };
    demolished: { found: boolean; count: number };
  };
};

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

  // Build a lookup: elevator_number → elevator(s)
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

// Re-export column definition for use in other parsers
export { ELEVATOR_COLUMNS };
export type { ColumnDef };
