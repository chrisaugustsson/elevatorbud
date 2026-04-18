import {
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
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {year}
          </div>
          <ul className="space-y-3">
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
    <li className="flex gap-3">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneClasses(
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
