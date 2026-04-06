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

/** Convert server hiss document to form values (numbers -> strings, undefined -> "") */
export function serverToFormValues(
  hiss: Record<string, unknown>,
): HissFormValues {
  return {
    organization_id: (hiss.organization_id as string) ?? "",
    elevator_number: (hiss.elevator_number as string) ?? "",
    address: (hiss.address as string) ?? "",
    elevator_classification: (hiss.elevator_classification as string) ?? "",
    district: (hiss.district as string) ?? "",
    elevator_type: (hiss.elevator_type as string) ?? "",
    manufacturer: (hiss.manufacturer as string) ?? "",
    build_year: hiss.build_year != null ? String(hiss.build_year) : "",
    speed: (hiss.speed as string) ?? "",
    lift_height: (hiss.lift_height as string) ?? "",
    load_capacity: (hiss.load_capacity as string) ?? "",
    floor_count: hiss.floor_count != null ? String(hiss.floor_count) : "",
    door_count: hiss.door_count != null ? String(hiss.door_count) : "",
    door_type: (hiss.door_type as string) ?? "",
    passthrough: (hiss.passthrough as boolean) ?? false,
    dispatch_mode: (hiss.dispatch_mode as string) ?? "",
    cab_size: (hiss.cab_size as string) ?? "",
    door_opening: (hiss.door_opening as string) ?? "",
    door_carrier: (hiss.door_carrier as string) ?? "",
    door_machine: (hiss.door_machine as string) ?? "",
    drive_system: (hiss.drive_system as string) ?? "",
    suspension: (hiss.suspension as string) ?? "",
    machine_placement: (hiss.machine_placement as string) ?? "",
    machine_type: (hiss.machine_type as string) ?? "",
    control_system_type: (hiss.control_system_type as string) ?? "",
    inspection_authority: (hiss.inspection_authority as string) ?? "",
    inspection_month: (hiss.inspection_month as string) ?? "",
    maintenance_company: (hiss.maintenance_company as string) ?? "",
    shaft_lighting: (hiss.shaft_lighting as string) ?? "",
    modernization_year: (hiss.modernization_year as string) ?? "",
    warranty: (hiss.warranty as boolean) ?? false,
    recommended_modernization_year:
      (hiss.recommended_modernization_year as string) ?? "",
    budget_amount:
      hiss.budget_amount != null ? String(hiss.budget_amount) : "",
    measures:
      (hiss.measures as string) ?? "",
    has_emergency_phone: (hiss.has_emergency_phone as boolean) ?? false,
    emergency_phone_model: (hiss.emergency_phone_model as string) ?? "",
    emergency_phone_type: (hiss.emergency_phone_type as string) ?? "",
    needs_upgrade: (hiss.needs_upgrade as boolean) ?? false,
    emergency_phone_price:
      hiss.emergency_phone_price != null
        ? String(hiss.emergency_phone_price)
        : "",
    comments: (hiss.comments as string) ?? "",
  };
}

/** Convert form values to mutation args for the update API */
export function formValuesToUpdateArgs(value: HissFormValues) {
  return {
    elevator_number: value.elevator_number,
    organization_id: value.organization_id,
    address: toOptionalString(value.address),
    elevator_classification: toOptionalString(value.elevator_classification),
    district: toOptionalString(value.district),
    elevator_type: toOptionalString(value.elevator_type),
    manufacturer: toOptionalString(value.manufacturer),
    build_year: toOptionalNumber(value.build_year),
    speed: toOptionalString(value.speed),
    lift_height: toOptionalString(value.lift_height),
    load_capacity: toOptionalString(value.load_capacity),
    floor_count: toOptionalNumber(value.floor_count),
    door_count: toOptionalNumber(value.door_count),
    door_type: toOptionalString(value.door_type),
    passthrough: value.passthrough || undefined,
    dispatch_mode: toOptionalString(value.dispatch_mode),
    cab_size: toOptionalString(value.cab_size),
    door_opening: toOptionalString(value.door_opening),
    door_carrier: toOptionalString(value.door_carrier),
    door_machine: toOptionalString(value.door_machine),
    drive_system: toOptionalString(value.drive_system),
    suspension: toOptionalString(value.suspension),
    machine_placement: toOptionalString(value.machine_placement),
    machine_type: toOptionalString(value.machine_type),
    control_system_type: toOptionalString(value.control_system_type),
    inspection_authority: toOptionalString(value.inspection_authority),
    inspection_month: toOptionalString(value.inspection_month),
    maintenance_company: toOptionalString(value.maintenance_company),
    shaft_lighting: toOptionalString(value.shaft_lighting),
    modernization_year: toOptionalString(value.modernization_year),
    warranty: value.warranty || undefined,
    recommended_modernization_year: toOptionalString(
      value.recommended_modernization_year,
    ),
    budget_amount: toOptionalNumber(value.budget_amount),
    measures: toOptionalString(value.measures),
    has_emergency_phone: value.has_emergency_phone || undefined,
    emergency_phone_model: toOptionalString(value.emergency_phone_model),
    emergency_phone_type: toOptionalString(value.emergency_phone_type),
    needs_upgrade: value.needs_upgrade || undefined,
    emergency_phone_price: toOptionalNumber(value.emergency_phone_price),
    comments: toOptionalString(value.comments),
  };
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
  return (cur ?? "").toString().trim() !== (orig ?? "").toString().trim();
}
