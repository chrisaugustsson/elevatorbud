import {
  Hammer,
  ClipboardList,
  ShieldCheck,
  Wrench,
  Settings,
  Sparkles,
  Replace,
  MessageSquare,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import type { ElevatorEventType } from "@elevatorbud/db/schema";
import {
  EVENT_PRESENTATION,
  formatCost,
  formatOccurredAt,
  toneClasses,
  type EventIconName,
} from "./event-presentation";

const ICONS: Record<EventIconName, LucideIcon> = {
  Hammer,
  ClipboardList,
  ShieldCheck,
  Wrench,
  Settings,
  Sparkles,
  Replace,
  MessageSquare,
};

export type TimelineEvent = {
  id: string;
  type: ElevatorEventType;
  occurredAt: Date | string;
  title: string;
  description?: string | null;
  cost?: string | number | null;
  currency?: string | null;
  performedBy?: string | null;
  createdByUser?: { name: string } | null;
};

type Props = {
  events: TimelineEvent[];
  onEdit?: (event: TimelineEvent) => void;
  emptyMessage?: string;
};

/**
 * Vertical timeline of elevator events, grouped by year. Read-only by default;
 * pass `onEdit` to show an edit button on each row (admin app only).
 */
export function EventTimeline({
  events,
  onEdit,
  emptyMessage = "Inga händelser registrerade ännu.",
}: Props) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const grouped = groupByYear(events);

  return (
    <div className="space-y-6">
      {grouped.map(({ year, items }) => (
        <div key={year} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {year}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {/* Vertical rail behind the dots — the icon column is 36px wide
              (size-9) with items-start, so the rail sits at its horizontal
              center (17px). `before` draws it between the first and last
              dot of the year group. */}
          <ul className="relative space-y-4 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-border">
            {items.map((event) => (
              <EventRow key={event.id} event={event} onEdit={onEdit} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EventRow({
  event,
  onEdit,
}: {
  event: TimelineEvent;
  onEdit?: (event: TimelineEvent) => void;
}) {
  const presentation = EVENT_PRESENTATION[event.type];
  const Icon = ICONS[presentation.iconName];
  const cost = formatCost(event.cost, event.currency);

  return (
    <li className="relative flex gap-3">
      <div
        className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${toneClasses(
          presentation.tone,
        )}`}
        aria-hidden
      >
        <Icon className="size-4" />
      </div>

      <div className="flex-1 space-y-1 pt-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {presentation.label}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">
            {formatOccurredAt(event.occurredAt)}
          </time>
          {cost && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium">{cost}</span>
            </>
          )}
          {onEdit && (
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onEdit(event)}
                aria-label="Redigera händelse"
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm font-medium">{event.title}</div>

        {event.description && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {event.description}
          </p>
        )}

        {event.performedBy && (
          <p className="text-xs text-muted-foreground">
            Utfört av {event.performedBy}
          </p>
        )}
      </div>
    </li>
  );
}

function groupByYear(events: TimelineEvent[]) {
  const buckets = new Map<number, TimelineEvent[]>();
  for (const ev of events) {
    const d = typeof ev.occurredAt === "string"
      ? new Date(ev.occurredAt)
      : ev.occurredAt;
    const year = d.getUTCFullYear();
    const arr = buckets.get(year) ?? [];
    arr.push(ev);
    buckets.set(year, arr);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, items }));
}
