// --- Compound Field Parsers ---

/**
 * Parses load_capacity compound format: '500*6' (last_kg * antal_personer)
 * Stored as-is since schema field is string.
 */
export function parseLoadCapacity(raw: string): { load_capacity?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { load_capacity: trimmed };
}

/**
 * Parses plan/doors compound format: '10*10' -> floor_count and door_count
 */
export function parseFloorsDoors(raw: string): { floor_count?: number; door_count?: number } {
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
export function parseCabSize(raw: string): { cab_size?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { cab_size: trimmed };
}

/**
 * Parses daylight_opening compound format: '900*2000' (bredd*hojd)
 * Stored as-is since schema field is string.
 */
export function parseDaylightOpening(raw: string): { daylight_opening?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  return { daylight_opening: trimmed };
}

/**
 * Parses build_year (construction year).
 * Handles 'Okant' / 'Okänt' -> undefined
 */
export function parseBuildYear(raw: string): { build_year?: number } {
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
 * Parses the "Inventerings datum" column.
 *
 * Accepts a handful of formats the Bostadsbolaget file (and likely variants
 * from other customers) is known to use:
 *   - "YYYY-MM-DD"    → returned as-is
 *   - "YYYY-MM"       → normalized to "YYYY-MM-01"
 *   - "YYYY/MM/DD"    → normalized to "YYYY-MM-DD"
 *   - "YYYY/MM"       → normalized to "YYYY-MM-01"
 *   - Locale strings parseable by Date — last resort
 *
 * Returns `{}` (field unset) for empty input or anything that can't be
 * parsed, so a mis-formatted row is skipped rather than failing import.
 */
export function parseInventoryDate(raw: string): { inventory_date?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { inventory_date: trimmed };
  }
  // YYYY-MM
  const ymMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (ymMatch) {
    const [, y, m] = ymMatch;
    return { inventory_date: `${y}-${m!.padStart(2, "0")}-01` };
  }
  // YYYY/MM/DD
  const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdSlash) {
    const [, y, m, d] = ymdSlash;
    return {
      inventory_date: `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`,
    };
  }
  // YYYY/MM
  const ymSlash = trimmed.match(/^(\d{4})\/(\d{1,2})$/);
  if (ymSlash) {
    const [, y, m] = ymSlash;
    return { inventory_date: `${y}-${m!.padStart(2, "0")}-01` };
  }
  // Last resort: let Date try
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return { inventory_date: `${y}-${m}-${d}` };
  }
  return {};
}

/**
 * Parses `modernization_year` (column "Moderniseringsår").
 *
 * Strict rule: only accept a 4-digit year in the plausible range
 * 1800–2100, or the sentinel "Ej ombyggd" (meaning "not modernized" — kept
 * because downstream filters treat it as synonymous with NULL).
 *
 * Anything else (e.g. "2007-vinga", "2010 v2", "?") is treated as unset
 * and flagged via the returned `warning` field so the sheet parser can
 * surface it to the admin in the import report.
 */
export function parseModernizationYear(raw: string): {
  modernization_year?: string;
  warning?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  if (trimmed.toLowerCase() === "ej ombyggd") return {};

  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed);
    if (year >= 1800 && year <= 2100) {
      return { modernization_year: trimmed };
    }
    return {
      warning: `Moderniseringsår "${trimmed}" ligger utanför giltigt intervall (1800–2100) — ignorerat.`,
    };
  }

  return {
    warning: `Moderniseringsår "${trimmed}" är inte ett giltigt årtal — ignorerat. (Acceptera endast 4-siffriga år eller "Ej ombyggd".)`,
  };
}

/**
 * Parses `recommended_modernization_year` (column "Rekommenderat
 * moderniseringsår"). Strict 4-digit year in 1800–2100. Anything else —
 * including annotated values like "2025 Maskin" or "2032?" — is stripped
 * with a warning so the chart groups by clean years only.
 */
export function parseRecommendedModernizationYear(raw: string): {
  recommended_modernization_year?: string;
  warning?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  if (/^\d{4}$/.test(trimmed)) {
    const year = Number(trimmed);
    if (year >= 1800 && year <= 2100) {
      return { recommended_modernization_year: trimmed };
    }
    return {
      warning: `Rekommenderat moderniseringsår "${trimmed}" ligger utanför giltigt intervall (1800–2100) — ignorerat.`,
    };
  }

  return {
    warning: `Rekommenderat moderniseringsår "${trimmed}" är inte ett giltigt årtal — ignorerat. (Acceptera endast 4-siffriga år.)`,
  };
}

/**
 * Parses the "Garanti" column for an elevator's most recent modernization
 * warranty. The Bostadsbolaget file mixes:
 *   - Excel date cells, which `xlsx` (raw: false) renders per the cell's
 *     number format. Real customer files use:
 *       - "M/D/YY"      (Excel default US locale, e.g. "10/21/30")
 *       - "M/D/YYYY"    ("10/21/2030")
 *       - "YYYY-MM-DD"  (ISO; appears in CSV exports)
 *       - "YYYY-MM-DD 00:00:00"
 *   - Sentinel strings ("Ja", "Nej", "?", "okänt") → returned undefined
 *
 * We only persist parseable dates; everything else is dropped silently.
 * Sentinels carry no actionable info (no concrete expiration), and the
 * absence of a date is the same fact as `Nej` for our UI.
 *
 * 2-digit years follow the standard rule used by Excel and most locales:
 * 00–49 → 2000–2049, 50–99 → 1950–1999. Warranties don't realistically
 * extend before 1950, so this covers the relevant range.
 */
export function parseWarrantyDate(raw: string): {
  warranty_expires_at?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // ISO date with optional time suffix ("2025-08-30" or "2025-08-30 00:00:00")
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (iso) {
    const [, y, m, d] = iso;
    if (isValidDateParts(Number(y), Number(m), Number(d))) {
      return { warranty_expires_at: `${y}-${m}-${d}` };
    }
    return {};
  }

  // YYYY/MM/DD
  const isoSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (isoSlash) {
    const [, y, m, d] = isoSlash;
    if (isValidDateParts(Number(y), Number(m), Number(d))) {
      return { warranty_expires_at: `${y}-${pad2(m!)}-${pad2(d!)}` };
    }
    return {};
  }

  // M/D/YY or M/D/YYYY — Excel default US locale, what xlsx produces
  // when reading date cells from this customer's file with raw: false.
  const usSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usSlash) {
    const [, m, d, y] = usSlash;
    const yearNum = Number(y);
    const fullYear =
      yearNum < 100 ? (yearNum < 50 ? 2000 + yearNum : 1900 + yearNum) : yearNum;
    const monthNum = Number(m);
    const dayNum = Number(d);
    if (isValidDateParts(fullYear, monthNum, dayNum)) {
      return {
        warranty_expires_at: `${fullYear}-${pad2(m!)}-${pad2(d!)}`,
      };
    }
    return {};
  }

  // Anything else (Ja/Nej/?/okänt/free text) → drop silently.
  return {};
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

function pad2(n: string | number): string {
  return String(n).padStart(2, "0");
}

export function parseBoolean(raw: string): boolean | undefined {
  const lower = raw.trim().toLowerCase();
  if (lower === "ja" || lower === "j" || lower === "yes" || lower === "1" || lower === "true") {
    return true;
  }
  if (lower === "nej" || lower === "n" || lower === "no" || lower === "0" || lower === "false") {
    return false;
  }
  return undefined;
}

/**
 * Parses the "Besiktningsmånad" column to a month number 1–12.
 *
 * Accepts:
 *   - Full Swedish name: "Januari", "januari", "JANUARI"
 *   - Short Swedish form: "Jan", "jan.", "Sept"
 *   - Numeric: "5", "05"
 *   - Whitespace and trailing dot tolerated
 *
 * Anything else ("?", "vårig", "maj/juni", "May", typos) is returned as
 * unset and flagged via the `warning` field. Import callers surface
 * the warning to the admin so the source cell can be corrected.
 */
const SWEDISH_MONTH_MAP: Record<string, number> = {
  januari: 1,  jan: 1,
  februari: 2, feb: 2,
  mars: 3,     mar: 3,
  april: 4,    apr: 4,
  maj: 5,
  juni: 6,     jun: 6,
  juli: 7,     jul: 7,
  augusti: 8,  aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

export function parseInspectionMonth(raw: string): {
  inspection_month?: number;
  warning?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const normalized = trimmed.toLowerCase().replace(/\.$/, "");

  // Numeric input, padded or unpadded.
  if (/^\d{1,2}$/.test(normalized)) {
    const n = parseInt(normalized, 10);
    if (n >= 1 && n <= 12) return { inspection_month: n };
    return {
      warning: `Besiktningsmånad "${trimmed}" är inte ett giltigt månadsnummer (1–12) — ignorerat.`,
    };
  }

  const mapped = SWEDISH_MONTH_MAP[normalized];
  if (mapped !== undefined) return { inspection_month: mapped };

  return {
    warning: `Kunde inte tolka besiktningsmånad: "${trimmed}" — ignorerat. (Acceptera svenska månadsnamn, t.ex. "Maj" eller "maj", eller siffra 1–12.)`,
  };
}

/**
 * Parse the Excel "Nödtelefon" column. The cell is a single free-text
 * string following a loose convention: "Ja, {rest}" or "Nej" (empty
 * is also valid). "{rest}" varies — brand + type + model in any order,
 * sometimes with "Modell, " breadcrumbs, sometimes not. We capture:
 *   - `has_emergency_phone`: true for "Ja"/"Yes", false for "Nej"/"No",
 *     undefined when the cell is empty or unrecognizable (so merge
 *     imports don't flip an existing value without evidence).
 *   - `emergency_phone`: everything after the leading "Ja," trimmed.
 *     Null when the answer is "Nej" (carries an explicit null so the
 *     import layer can clear any stale description).
 *
 * Returning `null` vs leaving a field undefined matters: `undefined` is
 * treated as "no info, don't touch" by the merge helpers; `null` is
 * treated as "clear this column" by the Nej-override logic.
 */
export function parseEmergencyPhone(raw: string): {
  has_emergency_phone?: boolean;
  emergency_phone?: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Split on the first comma so we can interrogate the prefix. Anything
  // after the comma is preserved verbatim (spacing, casing, punctuation)
  // — admins paste these strings in from vendor quotes and we don't want
  // to normalize away their meaning.
  const firstComma = trimmed.indexOf(",");
  const head =
    firstComma === -1 ? trimmed : trimmed.slice(0, firstComma).trim();
  const tail =
    firstComma === -1 ? "" : trimmed.slice(firstComma + 1).trim();
  const headLower = head.toLowerCase();

  if (headLower === "nej" || headLower === "no") {
    // Explicit negative answer. The description column must be
    // cleared on re-import — hence the null (not undefined).
    return { has_emergency_phone: false, emergency_phone: null };
  }

  if (headLower === "ja" || headLower === "yes") {
    return {
      has_emergency_phone: true,
      emergency_phone: tail.length > 0 ? tail : null,
    };
  }

  // Unrecognized prefix — treat the whole cell as a description and
  // assume presence, but don't force the `has_emergency_phone` bool
  // (the merge layer will only update fields the parser explicitly set).
  return { emergency_phone: trimmed };
}

export function parseBudgetAmount(raw: string): { budget_amount?: number } {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  // Remove common currency markers and spaces: "150 000 kr" -> "150000"
  const cleaned = trimmed.replace(/\s/g, "").replace(/kr$/i, "").replace(/sek$/i, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return {};
  return { budget_amount: num };
}

// --- Cell Value Extraction ---

export function getCellString(row: unknown[], colIndex: number): string {
  const val = row[colIndex];
  if (val === undefined || val === null) return "";
  return String(val).trim();
}
