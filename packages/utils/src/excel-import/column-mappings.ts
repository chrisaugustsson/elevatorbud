import type { ColumnDef } from "./types";

// --- Column Mapping ---
// Hissar sheet has headers in row 2, data from row 3.
// Column letters reference the standard Hisskompetens Excel format.

// Standard Hisskompetens Excel column mapping for the "Hissar" sheet.
// Headers are in row 2; data starts at row 3.
export const ELEVATOR_COLUMNS: ColumnDef[] = [
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
  { col: 29, letter: "AD", field: "recommended_modernization_year" },
  { col: 30, letter: "AE", field: "budget_amount", parser: "budget" },
  { col: 31, letter: "AF", field: "modernization_measures" },
  { col: 32, letter: "AG", field: "shaft_lighting" },
  { col: 33, letter: "AH", field: "emergency_phone", parser: "compound_emergency_phone" },
];

/**
 * Column mapping for the 'Nodtelefoner' sheet.
 * Column G (index 6) is elevator_number — the join key to Hissar.
 * Other columns contain expanded emergency phone data.
 */
export const EMERGENCY_PHONE_COLUMNS = [
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

/**
 * Rivna hissar uses the same column structure as Hissar but WITHOUT column AH (nodtelefon).
 */
export const RIVNA_ELEVATOR_COLUMNS: ColumnDef[] = ELEVATOR_COLUMNS.filter(
  (col) => col.letter !== "AH",
);
