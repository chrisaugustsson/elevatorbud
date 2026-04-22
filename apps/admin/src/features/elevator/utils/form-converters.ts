import type { HissFormValues } from "../types";

export function toOptionalString(val: string): string | undefined {
  return val.trim() === "" ? undefined : val.trim();
}

export function toOptionalNumber(val: string): number | undefined {
  const trimmed = val.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  return Number.isNaN(num) ? undefined : num;
}

/** Convert server hiss document to form values (numbers -> strings, undefined -> "").
 *  Server data uses camelCase (from Drizzle), form uses snake_case. */
export function serverToFormValues(
  hiss: Record<string, unknown>,
): HissFormValues {
  return {
    organization_id: (hiss.organizationId as string) ?? "",
    elevator_number: (hiss.elevatorNumber as string) ?? "",
    address: (hiss.address as string) ?? "",
    elevator_designation: (hiss.elevatorClassification as string) ?? "",
    district: (hiss.district as string) ?? "",
    property_designation: (hiss.propertyDesignation as string) ?? "",
    elevator_type: (hiss.elevatorType as string) ?? "",
    manufacturer: (hiss.manufacturer as string) ?? "",
    build_year: hiss.buildYear != null ? String(hiss.buildYear) : "",
    speed: (hiss.speed as string) ?? "",
    lift_height: (hiss.liftHeight as string) ?? "",
    load_capacity: (hiss.loadCapacity as string) ?? "",
    floor_count: hiss.floorCount != null ? String(hiss.floorCount) : "",
    door_count: hiss.doorCount != null ? String(hiss.doorCount) : "",
    door_type: (hiss.doorType as string) ?? "",
    passthrough: (hiss.passthrough as boolean) ?? false,
    collective: (hiss.dispatchMode as string) ?? "",
    cab_size: (hiss.cabSize as string) ?? "",
    daylight_opening: (hiss.doorOpening as string) ?? "",
    grab_rail: (hiss.doorCarrier as string) ?? "",
    door_machine: (hiss.doorMachine as string) ?? "",
    drive_system: (hiss.driveSystem as string) ?? "",
    suspension: (hiss.suspension as string) ?? "",
    machine_placement: (hiss.machinePlacement as string) ?? "",
    machine_type: (hiss.machineType as string) ?? "",
    control_system_type: (hiss.controlSystemType as string) ?? "",
    inspection_authority: (hiss.inspectionAuthority as string) ?? "",
    // Form uses number-as-string ("1"…"12" or ""); DB stores integer.
    inspection_month:
      hiss.inspectionMonth != null ? String(hiss.inspectionMonth) : "",
    maintenance_company: (hiss.maintenanceCompany as string) ?? "",
    shaft_lighting: (hiss.shaftLighting as string) ?? "",
    modernization_year: (hiss.modernizationYear as string) ?? "",
    warranty_expires_at: (hiss.warrantyExpiresAt as string) ?? "",
    recommended_modernization_year:
      (hiss.recommendedModernizationYear as string) ?? "",
    budget_amount:
      hiss.budgetAmount != null ? String(hiss.budgetAmount) : "",
    modernization_measures:
      (hiss.measures as string) ?? "",
    has_emergency_phone: (hiss.hasEmergencyPhone as boolean) ?? false,
    emergency_phone: (hiss.emergencyPhone as string) ?? "",
    needs_upgrade: (hiss.needsUpgrade as boolean) ?? false,
    emergency_phone_price:
      hiss.emergencyPhonePrice != null
        ? String(hiss.emergencyPhonePrice)
        : "",
    comments: (hiss.comments as string) ?? "",
    custom_fields: customFieldsFromServer(hiss.customFields),
  };
}

/** Normalize the server JSONB into form-string values. Anything non-stringy
 *  gets stringified — the form only exposes a single text input for v1,
 *  typed inputs render per-def at the section level. */
function customFieldsFromServer(raw: unknown): Record<string, string | null> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) continue;
    if (typeof value === "boolean") out[key] = value ? "true" : "false";
    else if (typeof value === "string" || typeof value === "number")
      out[key] = String(value);
    else out[key] = JSON.stringify(value);
  }
  return out;
}

/** Convert form values (snake_case) to mutation args (camelCase) for the tRPC API */
export function formValuesToUpdateArgs(value: HissFormValues) {
  return {
    elevatorNumber: value.elevator_number,
    address: toOptionalString(value.address),
    elevatorClassification: toOptionalString(value.elevator_designation),
    district: toOptionalString(value.district),
    propertyDesignation: toOptionalString(value.property_designation),
    elevatorType: toOptionalString(value.elevator_type),
    manufacturer: toOptionalString(value.manufacturer),
    buildYear: toOptionalNumber(value.build_year),
    speed: toOptionalString(value.speed),
    liftHeight: toOptionalString(value.lift_height),
    loadCapacity: toOptionalString(value.load_capacity),
    floorCount: toOptionalNumber(value.floor_count),
    doorCount: toOptionalNumber(value.door_count),
    doorType: toOptionalString(value.door_type),
    passthrough: value.passthrough || undefined,
    dispatchMode: toOptionalString(value.collective),
    cabSize: toOptionalString(value.cab_size),
    doorOpening: toOptionalString(value.daylight_opening),
    doorCarrier: toOptionalString(value.grab_rail),
    doorMachine: toOptionalString(value.door_machine),
    driveSystem: toOptionalString(value.drive_system),
    suspension: toOptionalString(value.suspension),
    machinePlacement: toOptionalString(value.machine_placement),
    machineType: toOptionalString(value.machine_type),
    controlSystemType: toOptionalString(value.control_system_type),
    inspectionAuthority: toOptionalString(value.inspection_authority),
    inspectionMonth: toOptionalNumber(value.inspection_month),
    maintenanceCompany: toOptionalString(value.maintenance_company),
    shaftLighting: toOptionalString(value.shaft_lighting),
    modernizationYear: toOptionalString(value.modernization_year),
    warrantyExpiresAt: toOptionalString(value.warranty_expires_at),
    recommendedModernizationYear: toOptionalString(
      value.recommended_modernization_year,
    ),
    budgetAmount: toOptionalNumber(value.budget_amount),
    measures: toOptionalString(value.modernization_measures),
    hasEmergencyPhone: value.has_emergency_phone,
    // When the admin toggles "har nödtelefon" off, explicitly clear the
    // description column — otherwise the DB keeps a stale "Safeline,
    // GSM 4G, Modell, MX + GL6 4G" next to `hasEmergencyPhone: false`,
    // which misleads every downstream view. When on, empty string maps
    // to undefined so the DB value is left alone.
    emergencyPhone: value.has_emergency_phone
      ? toOptionalString(value.emergency_phone)
      : null,
    needsUpgrade: value.needs_upgrade || undefined,
    emergencyPhonePrice: toOptionalNumber(value.emergency_phone_price),
    comments: toOptionalString(value.comments),
    customFields: customFieldsForUpdate(value.custom_fields),
  };
}

/** Coerce form values to what the server expects on customFields:
 *  - empty-string or all-whitespace → null (clears the key on merge)
 *  - non-empty string → string (server stores as-is)
 *  - null → null (explicit clear)
 *  Omit the whole object if there are no entries so the mutation doesn't
 *  carry noise. */
function customFieldsForUpdate(
  raw: Record<string, string | null>,
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null) {
      out[key] = null;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed === "" ? null : trimmed;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Check if a field value has changed from the original */
export function isChanged(
  key: keyof HissFormValues,
  current: HissFormValues,
  original: HissFormValues,
): boolean {
  const cur = current[key];
  const orig = original[key];
  if (typeof cur === "boolean") return cur !== orig;
  if (key === "custom_fields") {
    return isCustomFieldsChanged(
      cur as Record<string, string | null>,
      orig as Record<string, string | null>,
    );
  }
  return (cur ?? "").toString().trim() !== (orig ?? "").toString().trim();
}

/** Check if a single custom-field slot has changed. Used by the
 *  Extrafält section to highlight individual rows. */
export function isCustomFieldChanged(
  slug: string,
  current: HissFormValues,
  original: HissFormValues,
): boolean {
  const cur = current.custom_fields[slug] ?? "";
  const orig = original.custom_fields[slug] ?? "";
  return String(cur).trim() !== String(orig).trim();
}

function isCustomFieldsChanged(
  cur: Record<string, string | null>,
  orig: Record<string, string | null>,
): boolean {
  const keys = new Set([...Object.keys(cur), ...Object.keys(orig)]);
  for (const k of keys) {
    const c = cur[k] ?? "";
    const o = orig[k] ?? "";
    if (String(c).trim() !== String(o).trim()) return true;
  }
  return false;
}
