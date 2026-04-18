import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  formatFieldValue,
  getModernizationFieldLabel,
  isModernizationFieldKey,
  type ModernizationFieldKey,
} from "./modernization-fields";

export type ReplacementMeta = {
  snapshot?: {
    elevator?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
  };
  replacedWith?: {
    elevatorNumber?: string | null;
    manufacturer?: string | null;
    buildYear?: number | null;
  };
};

/**
 * Narrows an event's free-form `metadata` jsonb into the typed replacement
 * snapshot shape. Returns null if the payload isn't a replacement record.
 */
export function readSnapshot(metadata: unknown): ReplacementMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as ReplacementMeta;
  if (!m.snapshot && !m.replacedWith) return null;
  return m;
}

export function ReplacementSummary({ meta }: { meta: ReplacementMeta }) {
  const [expanded, setExpanded] = useState(false);
  const replacedWith = meta.replacedWith;
  const previous = meta.snapshot?.elevator;

  return (
    <div className="mt-2 space-y-1 text-sm">
      {replacedWith && (
        <p>
          <span className="font-medium">Ersatt med:</span>{" "}
          <span>
            {replacedWith.manufacturer ?? "—"}
            {replacedWith.buildYear != null && (
              <span className="tabular-nums"> · {replacedWith.buildYear}</span>
            )}
            {replacedWith.elevatorNumber && (
              <span className="text-muted-foreground">
                {" "}
                · {replacedWith.elevatorNumber}
              </span>
            )}
          </span>
        </p>
      )}
      {previous && (
        <p className="text-muted-foreground">
          <span className="font-medium">Tidigare:</span>{" "}
          {typeof previous.manufacturer === "string"
            ? previous.manufacturer
            : "—"}
          {previous.buildYear != null && (
            <span className="tabular-nums">
              {" "}
              · {String(previous.buildYear)}
            </span>
          )}
          {typeof previous.elevatorNumber === "string" &&
            previous.elevatorNumber && (
              <span> · {previous.elevatorNumber}</span>
            )}
        </p>
      )}
      {meta.snapshot?.details && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="size-3" aria-hidden />
            ) : (
              <ChevronRight className="size-3" aria-hidden />
            )}
            {expanded
              ? "Dölj fullständig tidigare specifikation"
              : "Visa fullständig tidigare specifikation"}
          </button>
          {expanded && (
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
              {Object.entries(meta.snapshot.details)
                .filter(
                  ([k, v]) =>
                    k !== "id" &&
                    k !== "elevatorId" &&
                    v != null &&
                    v !== "",
                )
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {isModernizationFieldKey(k)
                        ? getModernizationFieldLabel(k)
                        : k}
                    </dt>
                    <dd className="tabular-nums text-right">
                      {isModernizationFieldKey(k)
                        ? formatFieldValue(k as ModernizationFieldKey, v)
                        : String(v)}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
