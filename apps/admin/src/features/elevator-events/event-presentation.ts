import type { ElevatorEventType } from "@elevatorbud/db/schema";

/**
 * UI presentation data for each event type: Swedish label and an icon name
 * from lucide-react. Kept as a string name so the component can look up the
 * actual icon without importing every icon at the module top level.
 */
export const EVENT_PRESENTATION: Record<
  ElevatorEventType,
  { label: string; iconName: EventIconName; tone: EventTone }
> = {
  inventory: { label: "Inventering", iconName: "ClipboardList", tone: "muted" },
  inspection: { label: "Besiktning", iconName: "ShieldCheck", tone: "info" },
  repair: { label: "Reparation", iconName: "Wrench", tone: "warn" },
  service: { label: "Service", iconName: "Settings", tone: "muted" },
  modernization: {
    label: "Modernisering",
    iconName: "Sparkles",
    tone: "success",
  },
  replacement: { label: "Utbyte", iconName: "Replace", tone: "muted" },
  note: { label: "Notering", iconName: "MessageSquare", tone: "muted" },
};

export type EventIconName =
  | "Hammer"
  | "ClipboardList"
  | "ShieldCheck"
  | "Wrench"
  | "Settings"
  | "Sparkles"
  | "Replace"
  | "MessageSquare";

export type EventTone = "muted" | "info" | "warn" | "success";

const TONE_CLASSES: Record<EventTone, string> = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

export function toneClasses(tone: EventTone): string {
  return TONE_CLASSES[tone];
}

export function formatCost(
  cost: string | number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (cost == null) return null;
  const n = typeof cost === "number" ? cost : Number(cost);
  if (!Number.isFinite(n)) return null;
  const formatted = n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  return `${formatted} ${currency ?? "SEK"}`;
}

export function formatOccurredAt(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
