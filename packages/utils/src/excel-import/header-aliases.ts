import type { HeaderAlias } from "./types";

/**
 * Known Swedish header names mapped to target fields.
 * Headers are normalized (lowercase, trimmed) for matching.
 * Multiple aliases can map to the same field to handle variation across files.
 */
export const HEADER_ALIASES: HeaderAlias[] = [
  // --- Organisation ---
  { header: "kund", field: "_organisation_namn" },
  { header: "kund namn", field: "_organisation_namn" },
  { header: "kundnamn", field: "_organisation_namn" },
  { header: "organisation", field: "_organisation_namn" },
  { header: "organisationsnamn", field: "_organisation_namn" },

  // --- Identifiering ---
  { header: "hissnummer", field: "elevator_number", mandatory: true },
  { header: "hiss nummer", field: "elevator_number", mandatory: true },
  { header: "hissadress", field: "address" },
  { header: "hiss adress", field: "address" },
  { header: "adress", field: "address" },
  { header: "hissbeteckning", field: "elevator_designation" },
  { header: "hiss beteckning", field: "elevator_designation" },
  { header: "distrikt", field: "district" },
  { header: "distrikt/ort", field: "district" },
  { header: "distrikt/ ort", field: "district" },
  { header: "ort", field: "district" },
  {
    header: "inventerings datum",
    field: "inventory_date",
    parser: "inventory_date",
  },
  { header: "inventeringsdatum", field: "inventory_date", parser: "inventory_date" },
  { header: "inventerings-datum", field: "inventory_date", parser: "inventory_date" },
  { header: "inventeringsdag", field: "inventory_date", parser: "inventory_date" },

  // --- Teknisk specifikation ---
  { header: "hisstyp", field: "elevator_type" },
  { header: "hiss typ", field: "elevator_type" },
  { header: "typ av hiss", field: "elevator_type" },
  { header: "hiss fabrikat", field: "manufacturer" },
  { header: "fabrikat", field: "manufacturer" },
  { header: "tillverkare", field: "manufacturer" },
  { header: "byggår", field: "build_year", mandatory: true, parser: "build_year" },
  { header: "byggnadsår", field: "build_year", mandatory: true, parser: "build_year" },
  { header: "hastighet i m/s", field: "speed" },
  { header: "hastighet", field: "speed" },
  { header: "lyfthöjd i m", field: "lift_height" },
  { header: "lyfthöjd", field: "lift_height" },
  {
    header: "märklast / antal personer",
    field: "load_capacity",
    parser: "compound_load_capacity",
  },
  { header: "märklast", field: "load_capacity", parser: "compound_load_capacity" },
  { header: "märklast/antal personer", field: "load_capacity", parser: "compound_load_capacity" },
  {
    header: "antal plan/ antal dörrar",
    field: "floors_doors",
    mandatory: true,
    parser: "compound_floors_doors",
  },
  {
    header: "antal plan/antal dörrar",
    field: "floors_doors",
    mandatory: true,
    parser: "compound_floors_doors",
  },
  {
    header: "antal plan / antal dörrar",
    field: "floors_doors",
    mandatory: true,
    parser: "compound_floors_doors",
  },
  { header: "plan/dörrar", field: "floors_doors", mandatory: true, parser: "compound_floors_doors" },
  { header: "antal plan", field: "floors_doors", mandatory: true, parser: "compound_floors_doors" },

  // --- Dörrar och korg ---
  { header: "typ av dörrar", field: "door_type" },
  { header: "dörrtyp", field: "door_type" },
  { header: "genomgång", field: "passthrough", parser: "boolean" },
  { header: "kollektiv", field: "collective" },
  {
    header: "korgstorlek bxdjxh i mm",
    field: "cab_size",
    parser: "compound_cab_size",
  },
  { header: "korgstorlek", field: "cab_size", parser: "compound_cab_size" },
  {
    header: "dagöppning dörrar bxh",
    field: "daylight_opening",
    parser: "compound_daylight_opening",
  },
  { header: "dagöppning", field: "daylight_opening", parser: "compound_daylight_opening" },
  {
    header: "bärbeslag automatdörrar typ och år",
    field: "grab_rail",
  },
  { header: "bärbeslag", field: "grab_rail" },
  {
    header: "dörrmaskin / korgdörr typ och år",
    field: "door_machine",
  },
  { header: "dörrmaskin/korgdörr typ och år", field: "door_machine" },
  { header: "dörrmaskin", field: "door_machine" },

  // --- Maskineri ---
  { header: "drivsystem", field: "drive_system" },
  { header: "upphängning", field: "suspension" },
  { header: "maskinplacering", field: "machine_placement" },
  { header: "typ av maskin och år", field: "machine_type" },
  { header: "maskintyp", field: "machine_type" },
  { header: "typ av styrsystem och år", field: "control_system_type" },
  { header: "styrsystem", field: "control_system_type" },

  // --- Besiktning och underhåll ---
  { header: "besiktningsorgan", field: "inspection_authority" },
  { header: "besiktningsmånad", field: "inspection_month" },
  { header: "skötselföretag", field: "maintenance_company" },
  { header: "underhållsföretag", field: "maintenance_company" },
  { header: "schaktbelysning", field: "shaft_lighting" },

  // --- Modernisering ---
  {
    header: "moderniseringsår",
    field: "modernization_year",
    mandatory: true,
    parser: "modernization_year",
  },
  // The "Garanti" column is a date when present (warranty expiration for
  // the most recent modernization). Sentinels like "Ja"/"Nej"/"?" carry
  // no concrete expiration, so the parser drops them silently.
  { header: "garanti", field: "warranty_expires_at", parser: "warranty_date" },
  {
    header: "rekommenderat moderniseringsår",
    field: "recommended_modernization_year",
    parser: "recommended_modernization_year",
  },
  {
    header: "uppdaterat budgetbelopp 2026",
    field: "budget_amount",
    parser: "budget",
  },
  { header: "uppdaterat budgetbelopp", field: "budget_amount", parser: "budget" },
  { header: "budgetbelopp", field: "budget_amount", parser: "budget" },
  { header: "åtgärder vid modernisering", field: "modernization_measures" },
  { header: "moderniseringsåtgärder", field: "modernization_measures" },

  // --- Kommentarer ---
  { header: "övriga kommentarer", field: "comments" },
  { header: "kommentarer", field: "comments" },
  { header: "kommentar", field: "comments" },

  // --- Kontaktperson ---
  { header: "kontaktperson", field: "contact_person_name" },
  { header: "kontaktperson namn", field: "contact_person_name" },
  { header: "kontakt", field: "contact_person_name" },
  { header: "kontaktperson telefon", field: "contact_person_phone" },
  { header: "kontakt telefon", field: "contact_person_phone" },
  { header: "telefon kontaktperson", field: "contact_person_phone" },
  { header: "kontaktperson e-post", field: "contact_person_email" },
  { header: "kontaktperson epost", field: "contact_person_email" },
  { header: "e-post kontaktperson", field: "contact_person_email" },
];

/** All unique target fields that can be mapped to */
export const TARGET_FIELDS: { field: string; label: string; parser?: HeaderAlias["parser"]; mandatory?: boolean }[] = [
  { field: "_skip", label: "— Hoppa över —" },
  { field: "_organisation_namn", label: "Organisation (namn)" },
  { field: "elevator_number", label: "Hissnummer", mandatory: true },
  { field: "address", label: "Hissadress" },
  { field: "elevator_designation", label: "Hissbeteckning" },
  { field: "district", label: "Distrikt / Ort" },
  { field: "inventory_date", label: "Inventeringsdatum", parser: "inventory_date" },
  { field: "elevator_type", label: "Hisstyp" },
  { field: "manufacturer", label: "Fabrikat" },
  { field: "build_year", label: "Byggår", parser: "build_year", mandatory: true },
  { field: "speed", label: "Hastighet" },
  { field: "lift_height", label: "Lyfthöjd" },
  { field: "load_capacity", label: "Märklast", parser: "compound_load_capacity" },
  { field: "floors_doors", label: "Plan / Dörrar", parser: "compound_floors_doors", mandatory: true },
  { field: "door_type", label: "Typ av dörrar" },
  { field: "passthrough", label: "Genomgång", parser: "boolean" },
  { field: "collective", label: "Kollektiv" },
  { field: "cab_size", label: "Korgstorlek", parser: "compound_cab_size" },
  { field: "daylight_opening", label: "Dagöppning dörrar", parser: "compound_daylight_opening" },
  { field: "grab_rail", label: "Bärbeslag" },
  { field: "door_machine", label: "Dörrmaskin" },
  { field: "drive_system", label: "Drivsystem" },
  { field: "suspension", label: "Upphängning" },
  { field: "machine_placement", label: "Maskinplacering" },
  { field: "machine_type", label: "Maskintyp" },
  { field: "control_system_type", label: "Styrsystem" },
  { field: "inspection_authority", label: "Besiktningsorgan" },
  { field: "inspection_month", label: "Besiktningsmånad" },
  { field: "maintenance_company", label: "Skötselföretag" },
  { field: "shaft_lighting", label: "Schaktbelysning" },
  { field: "modernization_year", label: "Moderniseringsår", parser: "modernization_year", mandatory: true },
  { field: "warranty_expires_at", label: "Garanti (datum)", parser: "warranty_date" },
  {
    field: "recommended_modernization_year",
    label: "Rekommenderat moderniseringsår",
    parser: "recommended_modernization_year",
  },
  { field: "budget_amount", label: "Budgetbelopp", parser: "budget" },
  { field: "modernization_measures", label: "Moderniseringsåtgärder" },
  { field: "comments", label: "Kommentarer" },
  { field: "contact_person_name", label: "Kontaktperson" },
  { field: "contact_person_phone", label: "Kontaktperson telefon" },
  { field: "contact_person_email", label: "Kontaktperson e-post" },
];
