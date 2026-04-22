import type { elevatorDetails } from "@elevatorbud/db/schema";

type DetailsRow = typeof elevatorDetails.$inferSelect;

/**
 * Keys on `elevator_details` that participate in either modernization or
 * replacement flows. Narrower than `keyof DetailsRow` on purpose — audit
 * columns (`id`, `elevatorId`) and the free-text `comments` column aren't
 * part of either flow.
 */
export type DetailFieldKey = keyof Pick<
  DetailsRow,
  | "controlSystemType"
  | "machineType"
  | "driveSystem"
  | "machinePlacement"
  | "suspension"
  | "doorType"
  | "doorOpening"
  | "doorCount"
  | "doorCarrier"
  | "doorMachine"
  | "cabSize"
  | "passthrough"
  | "dispatchMode"
  | "speed"
  | "loadCapacity"
  | "liftHeight"
  | "floorCount"
  | "shaftLighting"
  | "emergencyPhone"
  | "emergencyPhonePrice"
>;

// Modernization field key is a narrower subtype — every modernization-eligible
// key is also a detail field key, so downstream code that only deals with the
// modernization side can use this tighter type.
export type ModernizationFieldKey = Exclude<DetailFieldKey, "emergencyPhonePrice">;

export type ModernizationFieldGroup =
  | "control-machinery"
  | "doors"
  | "cab"
  | "performance"
  | "safety";

export type ModernizationFieldInput = "text" | "number" | "boolean";

/**
 * Single source of truth for every elevator_details column that either flow
 * touches. `modernizable` flags whether the column can appear as a diff
 * entry (and therefore needs a group + input type). `clearOnReplace` flags
 * whether the column is nulled out when the elevator is physically replaced
 * (see PRD FR-6b). The two sets overlap heavily but aren't identical:
 *
 *   - `floorCount` is modernizable but preserved on replace (contextual —
 *     the building's floor count doesn't change when the unit is swapped).
 *   - `emergencyPhonePrice` is cleared on replace but not modernizable
 *     (price is budget data, not a spec).
 *
 * Centralizing both facts here makes drift impossible — any future column
 * added or retired has to update this one list.
 */
type DetailFieldSpec =
  | {
      key: ModernizationFieldKey;
      label: string;
      group: ModernizationFieldGroup;
      input: ModernizationFieldInput;
      modernizable: true;
      clearOnReplace: boolean;
    }
  | {
      key: DetailFieldKey;
      label: string;
      group: null;
      input: ModernizationFieldInput;
      modernizable: false;
      clearOnReplace: true;
    };

export type ModernizationFieldSpec = Extract<
  DetailFieldSpec,
  { modernizable: true }
>;

export const MODERNIZATION_GROUPS: Array<{
  key: ModernizationFieldGroup;
  label: string;
}> = [
  { key: "control-machinery", label: "Styr & maskin" },
  { key: "doors", label: "Dörrar" },
  { key: "cab", label: "Hisskorg" },
  { key: "performance", label: "Prestanda" },
  { key: "safety", label: "Säkerhet & övrigt" },
];

const DETAIL_FIELDS: readonly DetailFieldSpec[] = [
  // Styr & maskin
  { key: "controlSystemType", label: "Typ styrsystem", group: "control-machinery", input: "text", modernizable: true, clearOnReplace: true },
  { key: "machineType", label: "Typ maskin", group: "control-machinery", input: "text", modernizable: true, clearOnReplace: true },
  { key: "driveSystem", label: "Drivsystem", group: "control-machinery", input: "text", modernizable: true, clearOnReplace: true },
  { key: "machinePlacement", label: "Maskinplacering", group: "control-machinery", input: "text", modernizable: true, clearOnReplace: true },
  { key: "suspension", label: "Upphängning", group: "control-machinery", input: "text", modernizable: true, clearOnReplace: true },

  // Dörrar
  { key: "doorType", label: "Typ dörrar", group: "doors", input: "text", modernizable: true, clearOnReplace: true },
  { key: "doorOpening", label: "Dörröppning", group: "doors", input: "text", modernizable: true, clearOnReplace: true },
  { key: "doorCount", label: "Antal dörrar", group: "doors", input: "number", modernizable: true, clearOnReplace: true },
  { key: "doorCarrier", label: "Dörrbärare", group: "doors", input: "text", modernizable: true, clearOnReplace: true },
  { key: "doorMachine", label: "Dörrmaskin", group: "doors", input: "text", modernizable: true, clearOnReplace: true },

  // Hisskorg
  { key: "cabSize", label: "Korgstorlek", group: "cab", input: "text", modernizable: true, clearOnReplace: true },
  { key: "passthrough", label: "Genomgång", group: "cab", input: "boolean", modernizable: true, clearOnReplace: true },
  { key: "dispatchMode", label: "Manövrering", group: "cab", input: "text", modernizable: true, clearOnReplace: true },

  // Prestanda
  { key: "speed", label: "Hastighet (m/s)", group: "performance", input: "text", modernizable: true, clearOnReplace: true },
  { key: "loadCapacity", label: "Märklast (kg)", group: "performance", input: "text", modernizable: true, clearOnReplace: true },
  { key: "liftHeight", label: "Lyfthöjd (m)", group: "performance", input: "text", modernizable: true, clearOnReplace: true },
  // floorCount is the one exception: the building's floor count doesn't
  // change when the unit is swapped, so it's preserved on replace.
  { key: "floorCount", label: "Antal plan", group: "performance", input: "number", modernizable: true, clearOnReplace: false },

  // Säkerhet & övrigt
  { key: "shaftLighting", label: "Schaktbelysning", group: "safety", input: "text", modernizable: true, clearOnReplace: true },
  { key: "emergencyPhone", label: "Nödtelefon", group: "safety", input: "text", modernizable: true, clearOnReplace: true },

  // Non-modernizable but cleared on replace: the price of the emergency
  // phone install is budget data, not a modernization spec, so it can't
  // appear in a diff — but it also shouldn't linger after a unit swap.
  { key: "emergencyPhonePrice", label: "Nödtelefon — pris", group: null, input: "number", modernizable: false, clearOnReplace: true },
];

export const MODERNIZATION_FIELDS: readonly ModernizationFieldSpec[] =
  DETAIL_FIELDS.filter(
    (f): f is ModernizationFieldSpec => f.modernizable,
  );

export const MODERNIZATION_FIELD_KEYS: readonly ModernizationFieldKey[] =
  MODERNIZATION_FIELDS.map((f) => f.key);

/**
 * Keys on `elevator_details` that are cleared to null when an elevator is
 * replaced. See PRD FR-6b and the comment on `DetailFieldSpec`.
 */
export const REPLACEMENT_CLEAR_DETAIL_KEYS: readonly DetailFieldKey[] =
  DETAIL_FIELDS.filter((f) => f.clearOnReplace).map((f) => f.key);

export function getFieldSpec(
  key: ModernizationFieldKey,
): ModernizationFieldSpec {
  const spec = MODERNIZATION_FIELDS.find((f) => f.key === key);
  if (!spec) throw new Error(`Unknown modernization field: ${key}`);
  return spec;
}

export function isModernizationFieldKey(
  key: string,
): key is ModernizationFieldKey {
  return (MODERNIZATION_FIELD_KEYS as readonly string[]).includes(key);
}

export function getModernizationFieldLabel(
  key: ModernizationFieldKey,
): string {
  return getFieldSpec(key).label;
}

/**
 * Render a current or historical value for display in the timeline or the
 * wizard's "current value" column. Empty strings and null both render as "—"
 * so the UI can't present empty-string and null as distinct states.
 */
export function formatFieldValue(
  key: ModernizationFieldKey,
  value: unknown,
): string {
  if (value == null || value === "") return "—";
  const spec = getFieldSpec(key);
  if (spec.input === "boolean") {
    return value === true || value === "true" ? "Ja" : "Nej";
  }
  if (spec.input === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString("sv-SE");
  }
  return String(value);
}
