import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@elevatorbud/ui/components/ui/tabs";
import {
  elevatorOptions,
  elevatorDetailsOptions,
  elevatorBudgetOptions,
  customFieldDefsOptions,
} from "../../../server/elevator";
import { elevatorEventsOptions } from "../../../server/elevator-events";
import {
  IdentityHero,
  type IdentityData,
} from "../../../features/elevator/identity-panel";
import {
  EventList,
  PlanList,
  type EditorialEvent,
  type EditorialPlan,
} from "../../../features/elevator/editorial-rows";

export const Route = createFileRoute("/_authenticated/$parentOrgId/hiss/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(
      elevatorOptions(params.id, params.parentOrgId),
    );
    context.queryClient.prefetchQuery(
      elevatorDetailsOptions(params.id, params.parentOrgId),
    );
    context.queryClient.prefetchQuery(
      elevatorBudgetOptions(params.id, params.parentOrgId),
    );
    context.queryClient.prefetchQuery(
      elevatorEventsOptions(params.id, params.parentOrgId),
    );
    context.queryClient.prefetchQuery(customFieldDefsOptions());
  },
  component: HissDetail,
  pendingComponent: DetailSkeleton,
});

function HissDetail() {
  const { id, parentOrgId } = Route.useParams();
  const { data: hiss } = useSuspenseQuery(elevatorOptions(id, parentOrgId));
  const { data: details } = useSuspenseQuery(
    elevatorDetailsOptions(id, parentOrgId),
  );
  const { data: budget } = useSuspenseQuery(
    elevatorBudgetOptions(id, parentOrgId),
  );
  const { data: events } = useSuspenseQuery(
    elevatorEventsOptions(id, parentOrgId),
  );
  const { data: customFieldDefs } = useSuspenseQuery(customFieldDefsOptions());

  if (!hiss) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-muted-foreground">
        Hissen hittades inte.
      </div>
    );
  }

  const identityData: IdentityData = {
    elevatorNumber: hiss.elevatorNumber,
    address: hiss.address,
    district: hiss.district,
    organizationName: hiss.organization?.name ?? null,
    contactPersonName: hiss.contactPersonName,
    maintenanceCompany: hiss.maintenanceCompany,
    inspectionAuthority: hiss.inspectionAuthority,
    inspectionMonth: hiss.inspectionMonth,
    warrantyExpiresAt: hiss.warrantyExpiresAt,
    createdAt: hiss.createdAt,
    lastUpdatedAt: hiss.lastUpdatedAt,
  };

  // Client has a single-latest-budget query (not an array like admin). Wrap
  // it into a one-element list so we can reuse the shared PlanList shape.
  const editorialPlans: EditorialPlan[] = budget
    ? [
        {
          id: budget.id,
          recommendedYear: budget.recommendedModernizationYear
            ? Number(budget.recommendedModernizationYear)
            : null,
          measure: firstMeasure(budget.measures),
          measures: budget.measures,
          budgetAmount:
            budget.budgetAmount != null ? Number(budget.budgetAmount) : null,
        },
      ]
    : [];

  // Events newest first — same ordering as the admin Historik section.
  const editorialEvents: EditorialEvent[] = events
    .slice()
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .map((e) => ({
      id: e.id,
      type: e.type,
      occurredAt: e.occurredAt,
      title: e.title,
      description: e.description,
      cost: e.cost,
      currency: e.currency,
      performedBy: e.performedBy,
      metadata: e.metadata,
    }));

  // Synthetic "Installation" row from buildYear — UI-only, oldest in list.
  if (hiss.buildYear != null) {
    editorialEvents.push({
      id: `synthetic-installation-${hiss.id}`,
      type: "installation",
      occurredAt: new Date(Date.UTC(hiss.buildYear, 0, 1)),
      title: "",
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header / breadcrumb ──────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/$parentOrgId/register" params={{ parentOrgId }}>
          <Button variant="ghost" size="icon" className="size-7">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <Link
          to="/$parentOrgId/register"
          params={{ parentOrgId }}
          className="hover:underline"
        >
          Register
        </Link>
        <span>›</span>
        <span className="font-medium text-foreground">
          {hiss.elevatorNumber}
        </span>
      </header>

      {/* ── Identity hero ────────────────────────────────────────── */}
      <IdentityHero data={identityData} />

      <Tabs defaultValue="oversikt">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="oversikt">Översikt</TabsTrigger>
          <TabsTrigger value="teknik">Teknik</TabsTrigger>
        </TabsList>

        {/* ── Översikt: Planerat + Historik ────────────────────── */}
        <TabsContent value="oversikt" className="mt-8 space-y-16">
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              Planerat
              {editorialPlans.length > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {editorialPlans.length}
                </span>
              )}
            </h2>
            <div className="mt-6">
              {editorialPlans.length > 0 ? (
                <PlanList plans={editorialPlans} />
              ) : (
                <p className="pl-14 py-2 text-sm text-muted-foreground">
                  Inga planerade moderniseringar.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              Historik
              {editorialEvents.length > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {editorialEvents.length}
                </span>
              )}
            </h2>
            <div className="mt-6">
              {editorialEvents.length > 0 ? (
                <EventList events={editorialEvents} />
              ) : (
                <p className="pl-14 py-2 text-sm text-muted-foreground">
                  Inga registrerade händelser ännu.
                </p>
              )}
            </div>
          </section>
        </TabsContent>

        {/* ── Teknik: spec blocks ─────────────────────────────── */}
        <TabsContent value="teknik" className="mt-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
            <div>
              <h4 className="text-base font-semibold">Dörrar &amp; korg</h4>
              <DefinitionList>
                <Definition label="Typ dörrar" value={details?.doorType} />
                <Definition
                  label="Genomgång"
                  value={formatBool(details?.passthrough)}
                />
                <Definition
                  label="Manövrering"
                  value={details?.dispatchMode}
                />
                <Definition
                  label="Korgstorlek"
                  value={details?.cabSize}
                  mono
                />
                <Definition
                  label="Dörröppning"
                  value={details?.doorOpening}
                  mono
                />
                <Definition label="Dörrmaskin" value={details?.doorMachine} />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Maskineri</h4>
              <DefinitionList>
                <Definition label="Drivsystem" value={details?.driveSystem} />
                <Definition
                  label="Upphängning"
                  value={details?.suspension}
                  mono
                />
                <Definition
                  label="Maskinplacering"
                  value={details?.machinePlacement}
                />
                <Definition label="Typ maskin" value={details?.machineType} />
                <Definition
                  label="Typ styrsystem"
                  value={details?.controlSystemType}
                />
                <Definition
                  label="Schaktbelysning"
                  value={details?.shaftLighting}
                />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Teknisk specifikation</h4>
              <DefinitionList>
                <Definition label="Hisstyp" value={hiss.elevatorType} />
                <Definition label="Fabrikat" value={hiss.manufacturer} />
                <Definition label="Byggår" value={hiss.buildYear} mono />
                <Definition
                  label="Hastighet (m/s)"
                  value={details?.speed}
                  mono
                />
                <Definition
                  label="Lyfthöjd (m)"
                  value={details?.liftHeight}
                  mono
                />
                <Definition
                  label="Märklast (kg)"
                  value={details?.loadCapacity}
                  mono
                />
                <Definition
                  label="Antal plan"
                  value={details?.floorCount}
                  mono
                />
                <Definition
                  label="Antal dörrar"
                  value={details?.doorCount}
                  mono
                />
                <Definition
                  label="Moderniserad"
                  value={hiss.modernizationYear ?? "Ej ombyggd"}
                />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Nödtelefon</h4>
              <DefinitionList>
                <Definition
                  label="Har nödtelefon"
                  value={formatEmergencyPhoneSummary(
                    hiss.hasEmergencyPhone,
                    details?.emergencyPhone,
                  )}
                />
                <Definition
                  label="Behöver uppgradering"
                  value={formatBool(hiss.needsUpgrade)}
                />
                <Definition
                  label="Pris"
                  value={
                    details?.emergencyPhonePrice != null
                      ? formatAmount(Number(details.emergencyPhonePrice))
                      : null
                  }
                  mono
                />
              </DefinitionList>
            </div>

            {hiss.propertyDesignation && (
              <div>
                <h4 className="text-base font-semibold">Fastighet</h4>
                <DefinitionList>
                  <Definition
                    label="Fastighetsbeteckning"
                    value={hiss.propertyDesignation}
                  />
                </DefinitionList>
              </div>
            )}

            {(() => {
              const cf = (hiss.customFields ?? {}) as Record<string, unknown>;
              const entries = customFieldDefs
                .map((def) => {
                  const raw = cf[def.key];
                  if (raw === undefined || raw === null || raw === "") return null;
                  return { def, value: formatCustomFieldValue(raw) };
                })
                .filter((e): e is { def: typeof customFieldDefs[number]; value: string } => e !== null);
              if (entries.length === 0) return null;
              return (
                <div className="md:col-span-2">
                  <h4 className="text-base font-semibold">Extrafält</h4>
                  <DefinitionList>
                    {entries.map(({ def, value }) => (
                      <Definition key={def.id} label={def.label} value={value} />
                    ))}
                  </DefinitionList>
                </div>
              );
            })()}

            {details?.comments && (
              <div className="md:col-span-2">
                <h4 className="text-base font-semibold">Kommentarer</h4>
                <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {details.comments}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function DefinitionList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="mt-3 divide-y divide-border/40 text-sm">{children}</dl>
  );
}

function Definition({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "text-sm tabular-nums" : "text-sm"}>
        {value != null && value !== "" ? value : "—"}
      </dd>
    </div>
  );
}

function formatBool(v: boolean | null | undefined): string | null {
  if (v == null) return null;
  return v ? "Ja" : "Nej";
}

function formatEmergencyPhoneSummary(
  has: boolean | null | undefined,
  text: string | null | undefined,
): string | null {
  if (has == null) return null;
  if (!has) return "Nej";
  return text && text.trim() !== "" ? `Ja · ${text}` : "Ja";
}

function formatCustomFieldValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Ja" : "Nej";
  if (typeof v === "string" || typeof v === "number") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

function firstMeasure(measures: string | null): string | null {
  if (!measures) return null;
  const first = measures.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

// ────────────────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="space-y-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
