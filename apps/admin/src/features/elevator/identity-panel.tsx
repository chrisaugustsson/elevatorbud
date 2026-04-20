import { formatInspectionMonth } from "@elevatorbud/utils/format";

// Narrow on purpose — the hero shows only "who / what / where" facts the
// admin needs at-a-glance. All technical/spec data lives in the Teknik
// tab.
//
// Status (active/demolished/archived) and elevator type intentionally
// aren't rendered as top-of-page chips — status is reflected in page
// affordances (e.g. Registrera/Redigera only appear when active) and
// type belongs in the tech spec block.
export type IdentityData = {
  elevatorNumber: string;
  address: string | null;
  district: string | null;
  organizationName: string | null;
  contactPersonName: string | null;
  maintenanceCompany: string | null;
  inspectionAuthority: string | null;
  inspectionMonth: number | null;
  // ISO YYYY-MM-DD warranty expiration date for the most recent
  // modernization. Null when no parseable date — sentinel strings from
  // the Excel ("Ja"/"Nej"/"?"/"okänt") are intentionally dropped to null
  // since they carry no actionable info.
  warrantyExpiresAt: string | null;
  // Audit byline — rendered as quiet text under the address. Tertiary
  // info (rarely needed) but useful when admins debug imports or stale
  // data, so we keep it visible regardless of which tab is active.
  createdAt: Date | string;
  lastUpdatedAt: Date | string | null;
};

type Props = {
  data: IdentityData;
};

export function IdentityHero({ data }: Props) {
  const monthName = formatInspectionMonth(data.inspectionMonth);
  const inspection =
    data.inspectionAuthority || monthName
      ? [data.inspectionAuthority, monthName].filter(Boolean).join(", ")
      : null;

  const warranty = warrantyState(data.warrantyExpiresAt);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight tabular-nums">
          {data.elevatorNumber}
        </h1>
        {warranty && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs ${warranty.className}`}
            title={`Garantidatum ${warranty.dateLabel}`}
          >
            {warranty.label}
          </span>
        )}
      </div>
      {/* Address + audit byline combined into one low-contrast subtitle
          row so the byline doesn't dangle as an orphan line when there's
          no `uppdaterad` timestamp. Address uses `text-sm` (not
          `text-base`) to keep it subordinate to the hero number above. */}
      {(data.address || data.district || data.createdAt) && (
        <p className="mt-1 text-sm text-muted-foreground">
          {[data.address, data.district].filter(Boolean).join(", ")}
          {(data.address || data.district) && (
            <span className="text-muted-foreground/60"> · </span>
          )}
          <span className="text-muted-foreground/60">
            skapad{" "}
            <span className="tabular-nums">
              {formatDate(data.createdAt)}
            </span>
            {data.lastUpdatedAt && (
              <>
                , uppdaterad{" "}
                <span className="tabular-nums">
                  {formatDate(data.lastUpdatedAt)}
                </span>
              </>
            )}
          </span>
        </p>
      )}

      {/* Ägare / Skötsel / Besiktning — inline meta row. Wraps on narrow
          viewports. Quiet uppercase labels next to each value keep the
          row scannable without turning it back into a block of cards. */}
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {data.organizationName && (
          <MetaItem
            label="Ägare"
            value={data.organizationName}
            sub={data.contactPersonName ?? undefined}
          />
        )}
        {data.maintenanceCompany && (
          <MetaItem label="Skötsel" value={data.maintenanceCompany} />
        )}
        {inspection && <MetaItem label="Besiktning" value={inspection} />}
      </dl>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────

/**
 * Small uppercase label. Exported so the main route can match the hero's
 * label style without duplicating the Tailwind class string.
 */
export function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground ${className}`}
    >
      {children}
    </div>
  );
}

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("sv-SE");
}

/**
 * Render-state for the warranty chip. Returns null when there's no date
 * (most elevators in the imported data) so the chip just doesn't render
 * — implicit absence is intentional.
 */
function warrantyState(iso: string | null): {
  label: string;
  className: string;
  dateLabel: string;
} | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const dateLabel = date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
  });
  const today = new Date();
  // Compare on date-only by zeroing the time. The chip flips from
  // "Garanti t.o.m." to "Garanti utgången" the day after expiration.
  const isExpired = date.getTime() < today.getTime();
  if (isExpired) {
    return {
      label: `Garanti utgången ${dateLabel}`,
      className:
        "border-border bg-muted text-muted-foreground",
      dateLabel,
    };
  }
  return {
    label: `Garanti t.o.m. ${dateLabel}`,
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    dateLabel,
  };
}

function MetaItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <dd className="mt-1 font-medium">{value}</dd>
      {sub && (
        <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>
      )}
    </div>
  );
}
