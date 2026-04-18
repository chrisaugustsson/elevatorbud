import { useState } from "react";
import {
  formatFieldValue,
  isModernizationFieldKey,
  type ModernizationFieldKey,
} from "./modernization-fields";

export type ChangeEntry = {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
};

function renderDiffValue(field: string, value: unknown): string {
  if (isModernizationFieldKey(field)) {
    return formatFieldValue(field as ModernizationFieldKey, value);
  }
  if (value == null || value === "") return "—";
  return String(value);
}

/**
 * Narrows an event's free-form `metadata` jsonb into the typed
 * modernization diff shape. Returns null if the payload isn't a diff —
 * the caller should fall back to rendering nothing (or the free-text
 * description) in that case.
 */
export function readChanges(metadata: unknown): ChangeEntry[] | null {
  if (!metadata || typeof metadata !== "object") return null;
  const changes = (metadata as { changes?: unknown }).changes;
  if (!Array.isArray(changes)) return null;
  const out: ChangeEntry[] = [];
  for (const c of changes) {
    if (!c || typeof c !== "object") continue;
    const entry = c as Partial<ChangeEntry>;
    if (typeof entry.field === "string" && typeof entry.label === "string") {
      out.push({
        field: entry.field,
        label: entry.label,
        from: entry.from ?? null,
        to: entry.to ?? null,
      });
    }
  }
  return out.length > 0 ? out : null;
}

type Props = {
  changes: ChangeEntry[];
  /**
   * How many rows to show before collapsing the rest behind a "+N fler"
   * affordance. Defaults to 4 — enough for the common case, few enough
   * to keep the timeline scannable when several modernizations stack up.
   */
  visibleLimit?: number;
};

export function ChangesList({ changes, visibleLimit = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = changes.length > visibleLimit;
  const visible =
    expanded || !hasOverflow ? changes : changes.slice(0, visibleLimit);

  return (
    <ul className="mt-2 space-y-1 text-sm">
      {visible.map((c) => (
        <li key={c.field} className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-medium">{c.label}:</span>
          <span className="tabular-nums text-muted-foreground line-through decoration-muted-foreground/40">
            {renderDiffValue(c.field, c.from)}
          </span>
          <span className="text-muted-foreground" aria-hidden>
            →
          </span>
          <span className="tabular-nums font-medium">
            {renderDiffValue(c.field, c.to)}
          </span>
        </li>
      ))}
      {hasOverflow && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded
              ? "Visa färre"
              : `+${changes.length - visibleLimit} fler ändringar`}
          </button>
        </li>
      )}
    </ul>
  );
}
