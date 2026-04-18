import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ElevatorEventType } from "@elevatorbud/db/schema";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  EVENT_PRESENTATION,
  formatCost,
} from "~/features/elevator-events/event-presentation";
import {
  ChangesList,
  readChanges,
} from "~/features/elevator-events/event-changes-list";
import {
  ReplacementSummary,
  readSnapshot,
} from "~/features/elevator-events/event-replacement-summary";

// ────────────────────────────────────────────────────────────────────────
// Event rows (past)
// ────────────────────────────────────────────────────────────────────────

// `installation` is a UI-only synthetic type — the elevator's buildYear
// rendered as the oldest row in the timeline. Not persisted; never editable.
export type EditorialEvent = {
  id: string;
  type: ElevatorEventType | "installation";
  occurredAt: Date | string;
  title: string;
  description?: string | null;
  cost?: string | number | null;
  currency?: string | null;
  performedBy?: string | null;
  // For modernization/replacement events, the diff / snapshot sits here.
  // Shape is enforced on write (see createModernizationEventFn /
  // createReplacementEventFn), but the client reads it as unknown and
  // narrows inside the renderer.
  metadata?: unknown;
};

// Hardcoded label for the synthetic installation row — kept here (not in
// EVENT_PRESENTATION) so the type system still flags any DB write that
// tries to use "installation".
const INSTALLATION_LABEL = "Installation";

type EventListProps = {
  events: EditorialEvent[];
  onEdit?: (e: EditorialEvent) => void;
  emptyMessage?: string;
};

export function EventList({
  events,
  onEdit,
  emptyMessage = "Inga händelser registrerade ännu.",
}: EventListProps) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div>
      {events.map((e) => (
        <EventRow key={e.id} event={e} onEdit={onEdit} />
      ))}
    </div>
  );
}

function EventRow({
  event,
  onEdit,
}: {
  event: EditorialEvent;
  onEdit?: (e: EditorialEvent) => void;
}) {
  const label =
    event.type === "installation"
      ? INSTALLATION_LABEL
      : EVENT_PRESENTATION[event.type].label;
  const year = yearOf(event.occurredAt);
  const cost = formatCost(event.cost, event.currency);
  // Synthetic installation has no real date — only a year. Suffix the
  // eyebrow with the date for real events only.
  const dateNoYear =
    event.type === "installation" ? null : formatDateNoYear(event.occurredAt);
  // "Inventering" as the title of an Inventering event duplicates the
  // type label. Hide the title row when the two are effectively the
  // same word (case-insensitive, trimmed). Synthetic installation has no
  // title body either — the year column + label tell the whole story.
  const titleIsRedundant =
    event.type === "installation" ||
    event.title.trim().toLowerCase() === label.trim().toLowerCase();

  const changes =
    event.type === "modernization" ? readChanges(event.metadata) : null;
  const replacement =
    event.type === "replacement" ? readSnapshot(event.metadata) : null;

  // When a modernization row carries a diff, the auto-generated title
  // ("Modernisering (3 fält)") becomes redundant once the diff is visible
  // — the list underneath says everything. Suppress the title heading.
  const titleSuppressedByDiff = changes != null;

  return (
    <article className="grid grid-cols-[3.5rem_1fr_auto] items-start gap-4 border-t border-border/50 py-4 first:border-t-0">
      <div className="text-base font-medium leading-none tabular-nums text-muted-foreground">
        {year}
      </div>

      <div>
        <div className="text-[0.65rem] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground">
          {label}
          {dateNoYear && ` · ${dateNoYear}`}
          {changes && changes.length > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums normal-case tracking-normal text-muted-foreground">
              {changes.length} {changes.length === 1 ? "ändring" : "ändringar"}
            </span>
          )}
        </div>
        {!titleIsRedundant && !titleSuppressedByDiff && (
          <h3 className="mt-1 text-base font-medium leading-snug">
            {event.title}
          </h3>
        )}
        {changes && <ChangesList changes={changes} />}
        {replacement && <ReplacementSummary meta={replacement} />}
        {event.description && (
          <ExpandableText className="mt-2" text={event.description} />
        )}
      </div>

      <div className="flex items-center gap-2 text-right">
        <div className="text-xs text-muted-foreground">
          {event.performedBy ?? null}
          {cost && (
            <div className="mt-0.5 text-sm font-medium text-foreground">
              {cost}
            </div>
          )}
        </div>
        {onEdit && event.type !== "installation" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onEdit(event)}
            aria-label="Redigera händelse"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Plan rows (future)
// ────────────────────────────────────────────────────────────────────────

export type EditorialPlan = {
  id: string;
  recommendedYear: number | null;
  measure: string | null;
  measures: string | null;
  budgetAmount: number | null;
};

type PlanListProps = {
  plans: EditorialPlan[];
  onEdit?: (p: EditorialPlan) => void;
  emptyMessage?: string;
};

export function PlanList({
  plans,
  onEdit,
  emptyMessage = "Inga planerade moderniseringar.",
}: PlanListProps) {
  if (plans.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const thisYear = new Date().getFullYear();
  const total = plans.reduce((sum, p) => sum + (p.budgetAmount ?? 0), 0);

  // Only show the "totalt" footer when it aggregates more than one row —
  // with a single plan it just repeats the amount already shown in the row.
  const showTotal = total > 0 && plans.length > 1;

  return (
    <div>
      {plans.map((p) => (
        <PlanRow key={p.id} plan={p} thisYear={thisYear} onEdit={onEdit} />
      ))}

      {showTotal && (
        <div className="mt-4 flex items-baseline justify-between border-t border-border/50 pt-4">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Totalt planerat
          </span>
          <span className="text-lg font-medium">{formatAmount(total)}</span>
        </div>
      )}
    </div>
  );
}

function PlanRow({
  plan,
  thisYear,
  onEdit,
}: {
  plan: EditorialPlan;
  thisYear: number;
  onEdit?: (p: EditorialPlan) => void;
}) {
  const yearsAway =
    plan.recommendedYear != null ? plan.recommendedYear - thisYear : null;
  const tone = urgencyTone(yearsAway);
  const title = plan.measure ?? firstOf(plan.measures) ?? "Modernisering";

  // Drop the first measure from the description when it's the same word
  // as the title — otherwise the row prints the lead measure twice.
  const descriptionMeasures = dropFirstIfMatches(plan.measures, title);

  // Relative time is useful for near-term plans. For 10+ years out,
  // "om 18 år" reads as philosophical filler — skip it. Overdue plans
  // keep the label since it's actionable information.
  const showRelative = yearsAway != null && (yearsAway < 10);

  return (
    <article className="grid grid-cols-[3.5rem_1fr_auto] items-start gap-4 border-t border-border/50 py-4 first:border-t-0">
      <div
        className={`text-base font-medium leading-none tabular-nums ${tone.yearClass}`}
      >
        {plan.recommendedYear ?? "—"}
      </div>

      <div>
        <div className="text-[0.65rem] font-semibold uppercase leading-none tracking-[0.14em] text-muted-foreground">
          Modernisering
          {showRelative && ` · ${relativeTimeLabel(yearsAway!)}`}
        </div>
        <h3 className="mt-1 text-base font-medium leading-snug">{title}</h3>
        {descriptionMeasures && (
          <ExpandableText className="mt-2" text={descriptionMeasures} />
        )}
      </div>

      <div className="flex items-start gap-2">
        <div className="text-right">
          <div className="text-base font-medium leading-none tabular-nums">
            {plan.budgetAmount != null ? formatCompact(plan.budgetAmount) : "—"}
          </div>
          <div className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Budget
          </div>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => onEdit(plan)}
            aria-label="Redigera planerad modernisering"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
    </article>
  );
}


// ────────────────────────────────────────────────────────────────────────
// Expandable description — clamps to 2 lines and reveals on tap.
// Keeps the page scannable when rows stack up.
// ────────────────────────────────────────────────────────────────────────

function ExpandableText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // Only surface the toggle when the content is actually long enough to
  // get clipped. ~120 chars is roughly two lines at max-w-prose; a shorter
  // description fits fine and doesn't need an affordance.
  const needsToggle = text.length > 120;

  return (
    <div className={className}>
      <p
        className={`max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground ${
          !expanded && needsToggle ? "line-clamp-2" : ""
        }`}
      >
        {text}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Visa mindre" : "Visa mer"}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function yearOf(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.getUTCFullYear();
}

function formatDateNoYear(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  // Swedish month-day, no year (year lives in the column to the left).
  return date.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
  });
}

function urgencyTone(yearsAway: number | null): { yearClass: string } {
  if (yearsAway == null) return { yearClass: "text-muted-foreground" };
  if (yearsAway < 3) return { yearClass: "text-red-300" };
  if (yearsAway < 10) return { yearClass: "text-amber-300" };
  return { yearClass: "text-muted-foreground" };
}

function firstOf(measures: string | null): string | null {
  if (!measures) return null;
  const first = measures.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function dropFirstIfMatches(
  measures: string | null,
  title: string,
): string | null {
  if (!measures) return null;
  const items = measures
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  if (items[0]?.toLowerCase() === title.toLowerCase()) {
    items.shift();
  }
  return items.length > 0 ? items.join(", ") : null;
}

function relativeTimeLabel(yearsAway: number): string {
  if (yearsAway < 0) return `${Math.abs(yearsAway)} år försenad`;
  if (yearsAway === 0) return "i år";
  if (yearsAway === 1) return "nästa år";
  return `om ${yearsAway} år`;
}

function formatAmount(n: number): string {
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Mkr`;
  if (n >= 1_000) return `${Math.round(n / 1000)} kkr`;
  return `${n}`;
}
