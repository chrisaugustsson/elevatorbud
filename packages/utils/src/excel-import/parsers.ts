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
 * Parses modernization_year field.
 * Handles 'Ej ombyggd' -> 'Ej ombyggd'
 * Handles year with suffixes: '2007-vinga' -> '2007-vinga'
 * Handles plain year: '2010' -> '2010'
 */
export function parseModernizationYear(raw: string): { modernization_year?: string } {
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
export function parseEmergencyPhone(raw: string): {
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
