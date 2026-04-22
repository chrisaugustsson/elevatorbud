import { useForm } from "@tanstack/react-form";

export type HissFormValues = {
  organization_id: string;
  elevator_number: string;
  address: string;
  elevator_designation: string;
  district: string;
  property_designation: string;
  elevator_type: string;
  manufacturer: string;
  build_year: string;
  speed: string;
  lift_height: string;
  load_capacity: string;
  floor_count: string;
  door_count: string;
  door_type: string;
  passthrough: boolean;
  collective: string;
  cab_size: string;
  daylight_opening: string;
  grab_rail: string;
  door_machine: string;
  drive_system: string;
  suspension: string;
  machine_placement: string;
  machine_type: string;
  control_system_type: string;
  inspection_authority: string;
  inspection_month: string;
  maintenance_company: string;
  shaft_lighting: string;
  modernization_year: string;
  // Warranty expiration date for the most recent modernization. ISO
  // YYYY-MM-DD or empty string. Replaces the legacy boolean `warranty`
  // field that misinterpreted the Excel column.
  warranty_expires_at: string;
  recommended_modernization_year: string;
  budget_amount: string;
  modernization_measures: string;
  has_emergency_phone: boolean;
  emergency_phone: string;
  needs_upgrade: boolean;
  emergency_phone_price: string;
  comments: string;
  // Flexible per-customer columns. Values are stringly-typed at the
  // form layer — the server narrows them based on the def's `type`
  // before writing to JSONB. `null` in a slot means "clear this key"
  // (sent as-is to the server so the JSONB `||` merge drops it).
  custom_fields: Record<string, string | null>;
};

export const emptyValues: HissFormValues = {
  organization_id: "",
  elevator_number: "",
  address: "",
  elevator_designation: "",
  district: "",
  property_designation: "",
  elevator_type: "",
  manufacturer: "",
  build_year: "",
  speed: "",
  lift_height: "",
  load_capacity: "",
  floor_count: "",
  door_count: "",
  door_type: "",
  passthrough: false,
  collective: "",
  cab_size: "",
  daylight_opening: "",
  grab_rail: "",
  door_machine: "",
  drive_system: "",
  suspension: "",
  machine_placement: "",
  machine_type: "",
  control_system_type: "",
  inspection_authority: "",
  inspection_month: "",
  maintenance_company: "",
  shaft_lighting: "",
  modernization_year: "",
  warranty_expires_at: "",
  recommended_modernization_year: "",
  budget_amount: "",
  modernization_measures: "",
  has_emergency_phone: false,
  emergency_phone: "",
  needs_upgrade: false,
  emergency_phone_price: "",
  comments: "",
  custom_fields: {},
};

// Helper to extract the form instance type from useForm
function _hissFormTypeHelper() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useForm({ defaultValues: emptyValues });
}
export type HissForm = ReturnType<typeof _hissFormTypeHelper>;

export const BESIKTNINGSMANADER = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
] as const;
