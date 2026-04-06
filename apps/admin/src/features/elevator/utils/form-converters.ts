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
    inspection_month: (hiss.inspectionMonth as string) ?? "",
    maintenance_company: (hiss.maintenanceCompany as string) ?? "",
    shaft_lighting: (hiss.shaftLighting as string) ?? "",
    modernization_year: (hiss.modernizationYear as string) ?? "",
    warranty: (hiss.warranty as boolean) ?? false,
    recommended_modernization_year:
      (hiss.recommendedModernizationYear as string) ?? "",
    budget_amount:
      hiss.budgetAmount != null ? String(hiss.budgetAmount) : "",
    modernization_measures:
      (hiss.measures as string) ?? "",
    has_emergency_phone: (hiss.hasEmergencyPhone as boolean) ?? false,
    emergency_phone_model: (hiss.emergencyPhoneModel as string) ?? "",
    emergency_phone_type: (hiss.emergencyPhoneType as string) ?? "",
    needs_upgrade: (hiss.needsUpgrade as boolean) ?? false,
    emergency_phone_price:
      hiss.emergencyPhonePrice != null
        ? String(hiss.emergencyPhonePrice)
        : "",
    comments: (hiss.comments as string) ?? "",
  };
}

/** Convert form values (snake_case) to mutation args (camelCase) for the tRPC API */
export function formValuesToUpdateArgs(value: HissFormValues) {
  return {
    elevatorNumber: value.elevator_number,
    address: toOptionalString(value.address),
    elevatorClassification: toOptionalString(value.elevator_designation),
    district: toOptionalString(value.district),
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
    inspectionMonth: toOptionalString(value.inspection_month),
    maintenanceCompany: toOptionalString(value.maintenance_company),
    shaftLighting: toOptionalString(value.shaft_lighting),
    modernizationYear: toOptionalString(value.modernization_year),
    warranty: value.warranty || undefined,
    recommendedModernizationYear: toOptionalString(
      value.recommended_modernization_year,
    ),
    budgetAmount: toOptionalNumber(value.budget_amount),
    measures: toOptionalString(value.modernization_measures),
    hasEmergencyPhone: value.has_emergency_phone || undefined,
    emergencyPhoneModel: toOptionalString(value.emergency_phone_model),
    emergencyPhoneType: toOptionalString(value.emergency_phone_type),
    needsUpgrade: value.needs_upgrade || undefined,
    emergencyPhonePrice: toOptionalNumber(value.emergency_phone_price),
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
