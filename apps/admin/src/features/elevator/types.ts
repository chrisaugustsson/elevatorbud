import { useForm } from "@tanstack/react-form";

export type HissFormValues = {
  organization_id: string;
  elevator_number: string;
  address: string;
  elevator_classification: string;
  district: string;
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
  dispatch_mode: string;
  cab_size: string;
  door_opening: string;
  door_carrier: string;
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
  warranty: boolean;
  recommended_modernization_year: string;
  budget_amount: string;
  measures: string;
  has_emergency_phone: boolean;
  emergency_phone_model: string;
  emergency_phone_type: string;
  needs_upgrade: boolean;
  emergency_phone_price: string;
  comments: string;
};

export const emptyValues: HissFormValues = {
  organization_id: "",
  elevator_number: "",
  address: "",
  elevator_classification: "",
  district: "",
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
  dispatch_mode: "",
  cab_size: "",
  door_opening: "",
  door_carrier: "",
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
  warranty: false,
  recommended_modernization_year: "",
  budget_amount: "",
  measures: "",
  has_emergency_phone: false,
  emergency_phone_model: "",
  emergency_phone_type: "",
  needs_upgrade: false,
  emergency_phone_price: "",
  comments: "",
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
