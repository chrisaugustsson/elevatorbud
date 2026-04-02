import * as XLSX from "xlsx";

// --- Types ---

export type ParsedHiss = {
  // Identifiering
  hissnummer: string;
  adress?: string;
  hissbeteckning?: string;
  distrikt?: string;

  // Teknisk specifikation
  hisstyp?: string;
  fabrikat?: string;
  byggar?: number;
  hastighet?: string;
  lyfthojd?: string;
  marklast?: string;
  antal_plan?: number;
  antal_dorrar?: number;

  // Dorrar och korg
  typ_dorrar?: string;
  genomgang?: boolean;
  kollektiv?: string;
  korgstorlek?: string;
  dagoppning?: string;
  barbeslag?: string;
  dorrmaskin?: string;

  // Maskineri
  drivsystem?: string;
  upphangning?: string;
  maskinplacering?: string;
  typ_maskin?: string;
  typ_styrsystem?: string;

  // Besiktning och underhall
  besiktningsorgan?: string;
  besiktningsmanad?: string;
  skotselforetag?: string;
  schaktbelysning?: string;

  // Modernisering
  moderniserar?: string;
  garanti?: boolean;
  rekommenderat_moderniserar?: string;
  budget_belopp?: number;
  atgarder_vid_modernisering?: string;

  // Nodtelefon
  har_nodtelefon?: boolean;
  nodtelefon_modell?: string;
  nodtelefon_typ?: string;
  behover_uppgradering?: boolean;
  nodtelefon_pris?: number;

  // Kommentarer
  kommentarer?: string;

  // Status (set during import: 'aktiv' for Hissar, 'rivd' for Rivna hissar)
  status?: "aktiv" | "rivd" | "arkiverad";

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

export type HissarParseResult = {
  elevators: ParsedHiss[];
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
  parser?: "compound_marklast" | "compound_plan_dorrar" | "compound_korgstorlek" | "compound_dagoppning" | "compound_nodtelefon" | "byggar" | "moderniserar" | "boolean" | "number" | "budget";
};

// Standard Hisskompetens Excel column mapping for the "Hissar" sheet.
// Headers are in row 2; data starts at row 3.
const HISSAR_COLUMNS: ColumnDef[] = [
  { col: 0, letter: "A", field: "_organisation_namn" },
  { col: 1, letter: "B", field: "distrikt" },
  { col: 2, letter: "C", field: "hissnummer", mandatory: true },
  { col: 3, letter: "D", field: "adress" },
  { col: 4, letter: "E", field: "hissbeteckning" },
  { col: 5, letter: "F", field: "hisstyp" },
  { col: 6, letter: "G", field: "fabrikat" },
  { col: 7, letter: "H", field: "hastighet" },
  { col: 8, letter: "I", field: "lyfthojd" },
  { col: 9, letter: "J", field: "byggar", mandatory: true, parser: "byggar" },
  { col: 10, letter: "K", field: "marklast", parser: "compound_marklast" },
  { col: 11, letter: "L", field: "plan_dorrar", mandatory: true, parser: "compound_plan_dorrar" },
  { col: 12, letter: "M", field: "typ_dorrar" },
  { col: 13, letter: "N", field: "genomgang", parser: "boolean" },
  { col: 14, letter: "O", field: "kollektiv" },
  { col: 15, letter: "P", field: "korgstorlek", parser: "compound_korgstorlek" },
  { col: 16, letter: "Q", field: "dagoppning", parser: "compound_dagoppning" },
  { col: 17, letter: "R", field: "barbeslag" },
  { col: 18, letter: "S", field: "dorrmaskin" },
  { col: 19, letter: "T", field: "drivsystem" },
  { col: 20, letter: "U", field: "upphangning" },
  { col: 21, letter: "V", field: "maskinplacering" },
  { col: 22, letter: "W", field: "typ_maskin" },
  { col: 23, letter: "X", field: "typ_styrsystem" },
  { col: 24, letter: "Y", field: "besiktningsorgan" },
  { col: 25, letter: "Z", field: "besiktningsmanad" },
  { col: 26, letter: "AA", field: "skotselforetag" },
  { col: 27, letter: "AB", field: "moderniserar", mandatory: true, parser: "moderniserar" },
  { col: 28, letter: "AC", field: "garanti", parser: "boolean" },
  { col: 29, letter: "AD", field: "rekommenderat_moderniserar" },
  { col: 30, letter: "AE", field: "budget_belopp", parser: "budget" },
  { col: 31, letter: "AF", field: "atgarder_vid_modernisering" },
  { col: 32, letter: "AG", field: "schaktbelysning" },
  { col: 33, letter: "AH", field: "nodtelefon", parser: "compound_nodtelefon" },
];

// --- Compound Field Parsers ---

/**
 * Parses marklast compound format: '500*6' (last_kg * antal_personer)
 * Stored as-is since schema field is string.
 */
function parseMarklast(raw: string): { marklast?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { marklast: trimmed };
}

/**
 * Parses plan/dorrar compound format: '10*10' → antal_plan and antal_dorrar
 */
function parsePlanDorrar(raw: string): { antal_plan?: number; antal_dorrar?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const parts = trimmed.split("*");
  const result: { antal_plan?: number; antal_dorrar?: number } = {};

  if (parts[0]) {
    const plan = parseInt(parts[0].trim(), 10);
    if (!isNaN(plan)) result.antal_plan = plan;
  }
  if (parts[1]) {
    const dorrar = parseInt(parts[1].trim(), 10);
    if (!isNaN(dorrar)) result.antal_dorrar = dorrar;
  }

  return result;
}

/**
 * Parses korgstorlek compound format: '1000*2050*2300' (bredd*djup*hojd)
 * Stored as-is since schema field is string.
 */
function parseKorgstorlek(raw: string): { korgstorlek?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { korgstorlek: trimmed };
}

/**
 * Parses dagoppning compound format: '900*2000' (bredd*hojd)
 * Stored as-is since schema field is string.
 */
function parseDagoppning(raw: string): { dagoppning?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { dagoppning: trimmed };
}

/**
 * Parses byggar (construction year).
 * Handles 'Okant' / 'Okänt' → undefined
 */
function parseByggar(raw: string): { byggar?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const lower = trimmed.toLowerCase();
  if (lower === "okänt" || lower === "okant" || lower === "okänd" || lower === "okand") {
    return {};
  }
  const year = parseInt(trimmed, 10);
  if (isNaN(year)) return {};
  return { byggar: year };
}

/**
 * Parses moderniserar field.
 * Handles 'Ej ombyggd' → 'Ej ombyggd'
 * Handles year with suffixes: '2007-vinga' → '2007-vinga'
 * Handles plain year: '2010' → '2010'
 */
function parseModerniserar(raw: string): { moderniserar?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Keep as-is — "Ej ombyggd", "2007-vinga", "2010" are all valid string values
  return { moderniserar: trimmed };
}

/**
 * Parses nodtelefon compound cell.
 * Tries to extract: har_nodtelefon, modell, typ, behover_uppgradering, pris
 * Common formats:
 *   "Ja" / "Nej"
 *   "Ja, Modell X, Typ Y"
 *   Compound with semicolons or commas
 */
function parseNodtelefon(raw: string): {
  har_nodtelefon?: boolean;
  nodtelefon_modell?: string;
  nodtelefon_typ?: string;
  behover_uppgradering?: boolean;
  nodtelefon_pris?: number;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const lower = trimmed.toLowerCase();

  // Simple yes/no
  if (lower === "nej" || lower === "n") {
    return { har_nodtelefon: false };
  }
  if (lower === "ja" || lower === "j") {
    return { har_nodtelefon: true };
  }

  // Try to parse compound format separated by comma or semicolon
  const parts = trimmed.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
  const result: ReturnType<typeof parseNodtelefon> = {};

  if (parts.length > 0) {
    const first = parts[0].toLowerCase();
    if (first === "ja" || first === "j") {
      result.har_nodtelefon = true;
    } else if (first === "nej" || first === "n") {
      result.har_nodtelefon = false;
    } else {
      // First part is likely the model if not a yes/no
      result.har_nodtelefon = true;
      result.nodtelefon_modell = parts[0];
    }
  }
  if (parts.length > 1 && !result.nodtelefon_modell) {
    result.nodtelefon_modell = parts[1];
  }
  if (parts.length > 2) {
    result.nodtelefon_typ = parts[2];
  }
  if (parts.length > 3) {
    const uppgr = parts[3].toLowerCase();
    if (uppgr === "ja" || uppgr === "j" || uppgr.includes("uppgr")) {
      result.behover_uppgradering = true;
    } else if (uppgr === "nej" || uppgr === "n") {
      result.behover_uppgradering = false;
    }
  }
  if (parts.length > 4) {
    const pris = parseFloat(parts[4].replace(/[^\d.]/g, ""));
    if (!isNaN(pris)) result.nodtelefon_pris = pris;
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

function parseBudget(raw: string): { budget_belopp?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Remove common currency markers and spaces: "150 000 kr" → "150000"
  const cleaned = trimmed.replace(/\s/g, "").replace(/kr$/i, "").replace(/sek$/i, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return {};
  return { budget_belopp: num };
}

// --- Cell Value Extraction ---

function getCellString(row: unknown[], colIndex: number): string {
  const val = row[colIndex];
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

// --- Row Parser ---

function parseHissarRow(
  row: unknown[],
  rowIndex: number, // 1-based Excel row number
  sheetName: string,
  warnings: ImportWarning[],
): ParsedHiss | null {
  const hissnummer = getCellString(row, 2); // Column C
  if (!hissnummer) {
    return null; // Skip rows without hissnummer
  }

  const result: ParsedHiss = {
    hissnummer,
    _source_row: rowIndex,
    _source_sheet: sheetName,
  };

  for (const colDef of HISSAR_COLUMNS) {
    const raw = getCellString(row, colDef.col);
    if (!raw && !colDef.mandatory) continue;

    switch (colDef.parser) {
      case "byggar": {
        const parsed = parseByggar(raw);
        if (parsed.byggar !== undefined) result.byggar = parsed.byggar;
        break;
      }
      case "compound_marklast": {
        const parsed = parseMarklast(raw);
        if (parsed.marklast !== undefined) result.marklast = parsed.marklast;
        break;
      }
      case "compound_plan_dorrar": {
        const parsed = parsePlanDorrar(raw);
        if (parsed.antal_plan !== undefined) result.antal_plan = parsed.antal_plan;
        if (parsed.antal_dorrar !== undefined) result.antal_dorrar = parsed.antal_dorrar;
        if (raw && parsed.antal_plan === undefined && parsed.antal_dorrar === undefined) {
          warnings.push({
            row: rowIndex,
            column: colDef.letter,
            message: `Kunde inte tolka plan/dorrar-varde: "${raw}"`,
          });
        }
        break;
      }
      case "compound_korgstorlek": {
        const parsed = parseKorgstorlek(raw);
        if (parsed.korgstorlek !== undefined) result.korgstorlek = parsed.korgstorlek;
        break;
      }
      case "compound_dagoppning": {
        const parsed = parseDagoppning(raw);
        if (parsed.dagoppning !== undefined) result.dagoppning = parsed.dagoppning;
        break;
      }
      case "compound_nodtelefon": {
        const parsed = parseNodtelefon(raw);
        if (parsed.har_nodtelefon !== undefined) result.har_nodtelefon = parsed.har_nodtelefon;
        if (parsed.nodtelefon_modell !== undefined) result.nodtelefon_modell = parsed.nodtelefon_modell;
        if (parsed.nodtelefon_typ !== undefined) result.nodtelefon_typ = parsed.nodtelefon_typ;
        if (parsed.behover_uppgradering !== undefined) result.behover_uppgradering = parsed.behover_uppgradering;
        if (parsed.nodtelefon_pris !== undefined) result.nodtelefon_pris = parsed.nodtelefon_pris;
        break;
      }
      case "moderniserar": {
        const parsed = parseModerniserar(raw);
        if (parsed.moderniserar !== undefined) result.moderniserar = parsed.moderniserar;
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
        const parsed = parseBudget(raw);
        if (parsed.budget_belopp !== undefined) result.budget_belopp = parsed.budget_belopp;
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
  const mandatoryCols = HISSAR_COLUMNS.filter((c) => c.mandatory);
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
export function parseHissarSheet(workbook: XLSX.WorkBook): HissarParseResult {
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

  const elevators: ParsedHiss[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  // Data starts from row 3 (0-indexed: row 2)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1; // Convert to 1-based Excel row number

    // Skip completely empty rows
    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const hissnummer = getCellString(row, 2); // Column C
    if (!hissnummer) {
      invalidRows.push({
        row: excelRow,
        reason: "Saknar hissnummer (kolumn C)",
      });
      continue;
    }

    const parsed = parseHissarRow(row, excelRow, sheetName, warnings);
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
 * Column G (index 6) is hissnummer — the join key to Hissar.
 * Other columns contain expanded emergency phone data.
 */
const NODTELEFONER_COLUMNS = [
  { col: 0, letter: "A", field: "_organisation_namn" },
  { col: 1, letter: "B", field: "_distrikt" }, // used for case-insensitive matching during join
  { col: 2, letter: "C", field: "_adress" },
  { col: 3, letter: "D", field: "_hissbeteckning" },
  { col: 4, letter: "E", field: "_hisstyp" },
  { col: 5, letter: "F", field: "_fabrikat" },
  { col: 6, letter: "G", field: "hissnummer" }, // JOIN KEY
  { col: 7, letter: "H", field: "har_nodtelefon", parser: "boolean" as const },
  { col: 8, letter: "I", field: "nodtelefon_modell" },
  { col: 9, letter: "J", field: "nodtelefon_typ" },
  { col: 10, letter: "K", field: "behover_uppgradering", parser: "boolean" as const },
  { col: 11, letter: "L", field: "nodtelefon_pris", parser: "number" as const },
];

type NodtelefonerEntry = {
  hissnummer: string;
  distrikt?: string;
  har_nodtelefon?: boolean;
  nodtelefon_modell?: string;
  nodtelefon_typ?: string;
  behover_uppgradering?: boolean;
  nodtelefon_pris?: number;
  _source_row: number;
};

export type NodtelefonerParseResult = {
  entries: NodtelefonerEntry[];
  warnings: ImportWarning[];
  sheetName: string;
};

/**
 * Parses the 'Nodtelefoner' sheet from an Excel workbook.
 * - Reads column headers from row 2 (0-indexed row 1), data from row 3
 * - Column G (index 6) is hissnummer — used as join key
 * - Returns nodtelefon entries keyed by hissnummer for joining with Hissar data
 */
export function parseNodtelefonerSheet(workbook: XLSX.WorkBook): NodtelefonerParseResult {
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

  const entries: NodtelefonerEntry[] = [];
  const warnings: ImportWarning[] = [];

  // Data starts from row 3 (0-indexed row 2), headers in row 2 (0-indexed row 1)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1;

    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const hissnummer = getCellString(row, 6); // Column G
    if (!hissnummer) {
      warnings.push({
        row: excelRow,
        column: "G",
        message: "Saknar hissnummer i Nodtelefoner-arket, rad hoppas over",
      });
      continue;
    }

    const entry: NodtelefonerEntry = {
      hissnummer,
      _source_row: excelRow,
    };

    // Parse distrikt for case-insensitive matching
    const distrikt = getCellString(row, 1); // Column B
    if (distrikt) entry.distrikt = distrikt;

    // Parse nodtelefon fields
    for (const colDef of NODTELEFONER_COLUMNS) {
      if (colDef.field === "hissnummer" || colDef.field.startsWith("_")) continue;
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
const RIVNA_HISSAR_COLUMNS: ColumnDef[] = HISSAR_COLUMNS.filter(
  (col) => col.letter !== "AH",
);

/**
 * Parses the 'Rivna hissar' sheet from an Excel workbook.
 * - Same structure as Hissar but minus column AH (nodtelefon)
 * - No column headers — data starts from row 1
 * - All parsed elevators get status = 'rivd'
 */
export function parseRivnaHissarSheet(workbook: XLSX.WorkBook): HissarParseResult {
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

  const elevators: ParsedHiss[] = [];
  const warnings: ImportWarning[] = [];
  const invalidRows: { row: number; reason: string }[] = [];

  // No headers — data starts from row 1 (0-indexed row 0)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const excelRow = i + 1;

    if (!row || row.every((cell) => !cell || String(cell).trim() === "")) {
      continue;
    }

    const hissnummer = getCellString(row, 2); // Column C
    if (!hissnummer) {
      invalidRows.push({
        row: excelRow,
        reason: "Saknar hissnummer (kolumn C) i Rivna hissar",
      });
      continue;
    }

    const parsed = parseRivnaRow(row, excelRow, sheetName, warnings);
    if (parsed) {
      elevators.push(parsed);
    }
  }

  return { elevators, warnings, invalidRows, sheetName };
}

/**
 * Parses a single row from the 'Rivna hissar' sheet.
 * Uses RIVNA_HISSAR_COLUMNS (same as HISSAR_COLUMNS minus AH).
 * Sets status to 'rivd'.
 */
function parseRivnaRow(
  row: unknown[],
  rowIndex: number,
  sheetName: string,
  warnings: ImportWarning[],
): ParsedHiss | null {
  const hissnummer = getCellString(row, 2);
  if (!hissnummer) return null;

  const result: ParsedHiss = {
    hissnummer,
    status: "rivd",
    _source_row: rowIndex,
    _source_sheet: sheetName,
  };

  for (const colDef of RIVNA_HISSAR_COLUMNS) {
    const raw = getCellString(row, colDef.col);
    if (!raw && !colDef.mandatory) continue;

    switch (colDef.parser) {
      case "byggar": {
        const parsed = parseByggar(raw);
        if (parsed.byggar !== undefined) result.byggar = parsed.byggar;
        break;
      }
      case "compound_marklast": {
        const parsed = parseMarklast(raw);
        if (parsed.marklast !== undefined) result.marklast = parsed.marklast;
        break;
      }
      case "compound_plan_dorrar": {
        const parsed = parsePlanDorrar(raw);
        if (parsed.antal_plan !== undefined) result.antal_plan = parsed.antal_plan;
        if (parsed.antal_dorrar !== undefined) result.antal_dorrar = parsed.antal_dorrar;
        if (raw && parsed.antal_plan === undefined && parsed.antal_dorrar === undefined) {
          warnings.push({
            row: rowIndex,
            column: colDef.letter,
            message: `Kunde inte tolka plan/dorrar-varde: "${raw}"`,
          });
        }
        break;
      }
      case "compound_korgstorlek": {
        const parsed = parseKorgstorlek(raw);
        if (parsed.korgstorlek !== undefined) result.korgstorlek = parsed.korgstorlek;
        break;
      }
      case "compound_dagoppning": {
        const parsed = parseDagoppning(raw);
        if (parsed.dagoppning !== undefined) result.dagoppning = parsed.dagoppning;
        break;
      }
      case "moderniserar": {
        const parsed = parseModerniserar(raw);
        if (parsed.moderniserar !== undefined) result.moderniserar = parsed.moderniserar;
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
        const parsed = parseBudget(raw);
        if (parsed.budget_belopp !== undefined) result.budget_belopp = parsed.budget_belopp;
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
  hissar: ParsedHiss[];
  rivna: ParsedHiss[];
  combined: ParsedHiss[];
  warnings: ImportWarning[];
  invalidRows: { row: number; sheet: string; reason: string }[];
  sheets: {
    hissar: { found: boolean; count: number };
    nodtelefoner: { found: boolean; count: number; joined: number };
    rivna: { found: boolean; count: number };
  };
};

/**
 * Joins Nodtelefoner data into Hissar elevators by hissnummer.
 * Uses case-insensitive district matching when multiple elevators share the same hissnummer.
 */
function joinNodtelefoner(
  elevators: ParsedHiss[],
  nodEntries: NodtelefonerEntry[],
  warnings: ImportWarning[],
): number {
  if (nodEntries.length === 0) return 0;

  // Build a lookup: hissnummer → elevator(s)
  const byHissnummer = new Map<string, ParsedHiss[]>();
  for (const hiss of elevators) {
    const key = hiss.hissnummer.toLowerCase();
    const existing = byHissnummer.get(key);
    if (existing) {
      existing.push(hiss);
    } else {
      byHissnummer.set(key, [hiss]);
    }
  }

  let joined = 0;

  for (const entry of nodEntries) {
    const candidates = byHissnummer.get(entry.hissnummer.toLowerCase());
    if (!candidates || candidates.length === 0) {
      warnings.push({
        row: entry._source_row,
        column: "G",
        message: `Nodtelefon-post med hissnummer "${entry.hissnummer}" hittades inte i Hissar-arket`,
      });
      continue;
    }

    // If multiple candidates, use case-insensitive district matching
    let target: ParsedHiss;
    if (candidates.length === 1) {
      target = candidates[0];
    } else if (entry.distrikt) {
      const districtLower = entry.distrikt.toLowerCase();
      const match = candidates.find(
        (h) => h.distrikt?.toLowerCase() === districtLower,
      );
      if (match) {
        target = match;
      } else {
        // No district match — default to first candidate and warn
        target = candidates[0];
        warnings.push({
          row: entry._source_row,
          column: "B",
          message: `Flera hissar med nummer "${entry.hissnummer}", kunde inte matcha distrikt "${entry.distrikt}" — anvander forsta traffen`,
        });
      }
    } else {
      target = candidates[0];
    }

    // Merge nodtelefon fields into the elevator
    if (entry.har_nodtelefon !== undefined) target.har_nodtelefon = entry.har_nodtelefon;
    if (entry.nodtelefon_modell !== undefined) target.nodtelefon_modell = entry.nodtelefon_modell;
    if (entry.nodtelefon_typ !== undefined) target.nodtelefon_typ = entry.nodtelefon_typ;
    if (entry.behover_uppgradering !== undefined) target.behover_uppgradering = entry.behover_uppgradering;
    if (entry.nodtelefon_pris !== undefined) target.nodtelefon_pris = entry.nodtelefon_pris;
    joined++;
  }

  return joined;
}

/**
 * Parses an entire Excel import file with all three sheets:
 * - 'Hissar' (required): main elevator data
 * - 'Nodtelefoner' (optional): emergency phone data, joined via hissnummer
 * - 'Rivna hissar' (optional): demolished elevators, same structure minus column AH, status='rivd'
 *
 * Returns combined results with sheet source metadata.
 */
export function parseExcelImport(workbook: XLSX.WorkBook): FullImportResult {
  const validation = validateWorkbookSheets(workbook);

  const allWarnings: ImportWarning[] = [];
  const allInvalidRows: { row: number; sheet: string; reason: string }[] = [];

  // 1. Parse Hissar sheet (required)
  let hissarResult: HissarParseResult;
  if (validation.hasHissar) {
    hissarResult = parseHissarSheet(workbook);
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
    const nodResult = parseNodtelefonerSheet(workbook);
    nodEntryCount = nodResult.entries.length;
    allWarnings.push(...nodResult.warnings);
    nodJoinedCount = joinNodtelefoner(hissarResult.elevators, nodResult.entries, allWarnings);
  }

  // 3. Parse Rivna hissar sheet (optional)
  let rivnaResult: HissarParseResult;
  if (validation.hasRivna) {
    rivnaResult = parseRivnaHissarSheet(workbook);
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
    hissar: hissarResult.elevators,
    rivna: rivnaResult.elevators,
    combined,
    warnings: allWarnings,
    invalidRows: allInvalidRows,
    sheets: {
      hissar: { found: validation.hasHissar, count: hissarResult.elevators.length },
      nodtelefoner: { found: validation.hasNodtelefoner, count: nodEntryCount, joined: nodJoinedCount },
      rivna: { found: validation.hasRivna, count: rivnaResult.elevators.length },
    },
  };
}

// Re-export column definition for use in other parsers
export { HISSAR_COLUMNS };
export type { ColumnDef };
