// --- Types ---

export type ParsedElevator = {
  // Identifiering
  elevator_number: string;
  address?: string;
  elevator_designation?: string;
  district?: string;
  // Fastighetsbeteckning — formal property/cadastral ID. May equal the
  // management-object name in some sheets but conceptually distinct.
  property_designation?: string;
  // ISO date string (YYYY-MM-DD). The Excel column "Inventerings datum"
  // often carries year-month only (e.g. "2021-10") — normalized to the
  // first of the month on parse.
  inventory_date?: string;

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
  inspection_month?: number;
  maintenance_company?: string;
  shaft_lighting?: string;

  // Nödtelefon — Ja/Nej flag + free-text description. See
  // parseEmergencyPhone for the "Ja, ..." / "Nej" grammar we accept.
  // `emergency_phone` carries `null` when the admin answered "Nej"
  // (forces a clear on re-import) vs `undefined` for no-info.
  has_emergency_phone?: boolean;
  emergency_phone?: string | null;

  // Modernisering
  modernization_year?: string;
  // Warranty expiration date for the most recent modernization. ISO
  // YYYY-MM-DD when the source cell was a parseable date; undefined for
  // sentinel strings ("Ja"/"Nej"/"?"/"okänt"/empty).
  warranty_expires_at?: string;
  recommended_modernization_year?: string;
  budget_amount?: number;
  modernization_measures?: string;

  // Kommentarer
  comments?: string;

  // Kontaktperson
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_email?: string;

  // Flexible per-customer columns harvested from unmapped (or
  // explicitly-mapped-to-`_custom_field`) headers. Keyed by a slug
  // derived from the source header; the server resolves the slug
  // against `custom_field_defs` (key + aliases) and auto-creates a
  // def when nothing matches. Values are strings for now — typed
  // parsing can come later via def.type.
  custom_fields?: Record<string, string>;
  // Header labels for each key above, so the server can upsert/update
  // `custom_field_defs.label` + aliases when a header is first seen.
  // Sent alongside `custom_fields` once per row; the server dedupes.
  custom_field_labels?: Record<string, string>;

  // Import metadata (not stored in DB, used during import processing)
  _organisation_namn?: string;
  _source_row: number;
  _source_sheet: string;
};

export type ImportWarning = {
  row: number;
  column: string;
  message: string;
  /**
   * Elevator number for the row that produced this warning, when known.
   * Not every warning can attach one (e.g. warnings emitted before
   * elevator_number is parsed), so consumers must treat it as optional.
   */
  elevator_number?: string;
};

export type ElevatorParseResult = {
  elevators: ParsedElevator[];
  warnings: ImportWarning[];
  invalidRows: { row: number; reason: string }[];
  sheetName: string;
};

export type ColumnDef = {
  col: number; // 0-based column index
  letter: string; // Excel column letter (for error messages)
  field: string; // Target field name or special parser key
  mandatory?: boolean;
  parser?: "compound_load_capacity" | "compound_floors_doors" | "compound_cab_size" | "compound_daylight_opening" | "build_year" | "modernization_year" | "recommended_modernization_year" | "inspection_month" | "inventory_date" | "warranty_date" | "boolean" | "number" | "budget" | "emergency_phone";
};

export type SheetMappingConfig = {
  sheetName: string;
  mappings: ColumnMapping[];
  headerRowIndex: number;
};

export type FullImportResult = {
  elevators: ParsedElevator[];
  warnings: ImportWarning[];
  invalidRows: { row: number; sheet: string; reason: string }[];
  sheets: {
    elevators: { found: boolean; count: number };
  };
};

// --- Sheet Info Types ---

export type SheetInfo = {
  name: string;
  rowCount: number;
  firstRowPreview: string[];
};

// --- Column Mapping Types ---

/** A known header alias mapping a Swedish header name to a target field + parser */
export type HeaderAlias = {
  /** Normalized header text (lowercase, trimmed) */
  header: string;
  /** Target field on ParsedElevator (or _organisation_namn, _skip) */
  field: string;
  /** Optional parser to apply */
  parser?: ColumnDef["parser"];
  /** Whether this field is mandatory */
  mandatory?: boolean;
};

/** A single confirmed column mapping: source column index → target field */
export type ColumnMapping = {
  /** 0-based column index in the source sheet */
  sourceIndex: number;
  /** Original header text from the file */
  sourceHeader: string;
  /** Target field name (or "_skip" to ignore) */
  field: string;
  /** Parser to apply */
  parser?: ColumnDef["parser"];
  /** Whether this was auto-matched or manually set */
  autoMatched: boolean;
};

/** Result of auto-mapping headers against known aliases */
export type AutoMapResult = {
  /** Detected header row index (0-based) */
  headerRowIndex: number;
  /** All headers found in the detected row */
  sourceHeaders: string[];
  /** Columns that were auto-matched */
  mapped: ColumnMapping[];
  /** Source column indices that couldn't be matched */
  unmappedIndices: number[];
  /** Target fields that are mandatory but have no mapping */
  missingMandatory: string[];
  /** Confidence score: ratio of matched columns to total non-empty headers */
  confidence: number;
};
