import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { X } from "lucide-react";

type FilterChipProps = {
  /** Visible label (e.g. the value being filtered on). */
  label: string;
  /** Called when the user clicks the remove (×) button. */
  onRemove: () => void;
  /** Optional extra classes applied to the Badge wrapper. */
  className?: string;
};

/**
 * Shared "active filter" chip primitive. Renders a secondary Badge with a
 * ≥24×24px remove button whose aria-label reads "Ta bort filter: {label}"
 * so screen readers can distinguish chips when multiple are on the page.
 *
 * Use this instead of hand-rolling a Badge+button combo so every filter
 * chip across the client app shares the same hit area, focus ring, and
 * screen-reader label shape.
 */
export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className={
        "flex items-center gap-1 py-1 pl-2 pr-1 text-sm" +
        (className ? ` ${className}` : "")
      }
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Ta bort filter: ${label}`}
        className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </Badge>
  );
}
