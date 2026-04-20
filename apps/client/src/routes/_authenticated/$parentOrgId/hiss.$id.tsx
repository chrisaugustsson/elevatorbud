import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { elevatorOptions, elevatorDetailsOptions, elevatorBudgetOptions } from "../../../server/elevator";
import { elevatorEventsOptions } from "../../../server/elevator-events";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import { ArrowLeft, Phone, MessageSquare, History } from "lucide-react";
import { EventTimeline } from "../../../features/elevator-events/event-timeline";

export const Route = createFileRoute("/_authenticated/$parentOrgId/hiss/$id")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(elevatorOptions(params.id, params.parentOrgId));
    context.queryClient.prefetchQuery(elevatorDetailsOptions(params.id, params.parentOrgId));
    context.queryClient.prefetchQuery(elevatorBudgetOptions(params.id, params.parentOrgId));
    context.queryClient.prefetchQuery(
      elevatorEventsOptions(params.id, params.parentOrgId),
    );
  },
  component: HissDetail,
  pendingComponent: DetailSkeleton,
});

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  let display: string;
  if (value === undefined || value === null || value === "") {
    display = "—";
  } else if (typeof value === "boolean") {
    display = value ? "Ja" : "Nej";
  } else {
    display = String(value);
  }

  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{display}</dd>
    </div>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {children}
        </dl>
      </CardContent>
    </Card>
  );
}

function HissDetail() {
  const { id, parentOrgId } = Route.useParams();
  const { data: hiss } = useSuspenseQuery(elevatorOptions(id, parentOrgId));
  const { data: details } = useSuspenseQuery(elevatorDetailsOptions(id, parentOrgId));
  const { data: budget } = useSuspenseQuery(elevatorBudgetOptions(id, parentOrgId));
  const { data: events } = useSuspenseQuery(
    elevatorEventsOptions(id, parentOrgId),
  );

  if (!hiss) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-muted-foreground">
        Hissen hittades inte.
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    active: "Aktiv",
    demolished: "Rivd",
    archived: "Arkiverad",
  };

  const statusVariant = hiss.status === "active" ? "default" : "secondary";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link to="/$parentOrgId/register" params={{ parentOrgId }}>
            <Button variant="ghost" size="icon" className="size-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{hiss.elevatorNumber}</h1>
          <Badge variant={statusVariant}>
            {statusLabel[hiss.status] ?? hiss.status}
          </Badge>
        </div>
        {hiss.address && (
          <p className="ml-10 text-sm text-muted-foreground">{hiss.address}</p>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" />
            Historik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventTimeline
            events={events.map((e) => ({
              id: e.id,
              type: e.type,
              occurredAt: e.occurredAt,
              title: e.title,
              description: e.description,
              cost: e.cost,
              currency: e.currency,
              performedBy: e.performedBy,
            }))}
          />
        </CardContent>
      </Card>

      <DetailSection title="Identifiering">
        <DetailField label="Hissnummer" value={hiss.elevatorNumber} />
        <DetailField label="Adress" value={hiss.address} />
        <DetailField label="Klassificering" value={hiss.elevatorClassification} />
        <DetailField label="Distrikt" value={hiss.district} />
      </DetailSection>

      <DetailSection title="Teknisk specifikation">
        <DetailField label="Hisstyp" value={hiss.elevatorType} />
        <DetailField label="Fabrikat" value={hiss.manufacturer} />
        <DetailField label="Byggår" value={hiss.buildYear} />
        <DetailField label="Hastighet (m/s)" value={details?.speed} />
        <DetailField label="Lyfthöjd (m)" value={details?.liftHeight} />
        <DetailField label="Märklast (kg)" value={details?.loadCapacity} />
        <DetailField label="Antal plan" value={details?.floorCount} />
        <DetailField label="Antal dörrar" value={details?.doorCount} />
      </DetailSection>

      <DetailSection title="Dörrar och korg">
        <DetailField label="Typ dörrar" value={details?.doorType} />
        <DetailField label="Genomgång" value={details?.passthrough} />
        <DetailField label="Manövrering" value={details?.dispatchMode} />
        <DetailField label="Korgstorlek" value={details?.cabSize} />
        <DetailField label="Dörröppning" value={details?.doorOpening} />
        <DetailField label="Dörrbärare" value={details?.doorCarrier} />
        <DetailField label="Dörrmaskin" value={details?.doorMachine} />
      </DetailSection>

      <DetailSection title="Maskineri">
        <DetailField label="Drivsystem" value={details?.driveSystem} />
        <DetailField label="Upphängning" value={details?.suspension} />
        <DetailField label="Maskinplacering" value={details?.machinePlacement} />
        <DetailField label="Typ maskin" value={details?.machineType} />
        <DetailField label="Typ styrsystem" value={details?.controlSystemType} />
      </DetailSection>

      <DetailSection title="Besiktning och underhåll">
        <DetailField label="Besiktningsorgan" value={hiss.inspectionAuthority} />
        <DetailField label="Besiktningsmånad" value={hiss.inspectionMonth} />
        <DetailField label="Skötselföretag" value={hiss.maintenanceCompany} />
        <DetailField label="Schaktbelysning" value={details?.shaftLighting} />
      </DetailSection>

      <DetailSection title="Modernisering">
        <DetailField label="Moderniserad" value={hiss.modernizationYear} />
        <DetailField
          label="Garanti gäller t.o.m."
          value={hiss.warrantyExpiresAt}
        />
        <DetailField
          label="Rekommenderat moderniseringsår"
          value={budget?.recommendedModernizationYear}
        />
        <DetailField
          label="Budget"
          value={
            budget?.budgetAmount != null
              ? `${Number(budget.budgetAmount).toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
        <DetailField
          label="Åtgärder vid modernisering"
          value={budget?.measures}
        />
      </DetailSection>

      <DetailSection
        title="Nödtelefon"
        icon={<Phone className="size-4" />}
      >
        <DetailField label="Har nödtelefon" value={hiss.hasEmergencyPhone} />
        <DetailField label="Modell" value={details?.emergencyPhoneModel} />
        <DetailField label="Typ" value={details?.emergencyPhoneType} />
        <DetailField
          label="Behöver uppgradering"
          value={hiss.needsUpgrade}
        />
        <DetailField
          label="Pris"
          value={
            details?.emergencyPhonePrice != null
              ? `${Number(details.emergencyPhonePrice).toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
      </DetailSection>

      {details?.comments && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Kommentarer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{details.comments}</p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground">
        <p>
          Skapad:{" "}
          {new Date(hiss.createdAt).toLocaleDateString("sv-SE")}
        </p>
        {hiss.lastUpdatedAt && (
          <p>
            Senast uppdaterad:{" "}
            {new Date(hiss.lastUpdatedAt).toLocaleDateString("sv-SE")}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
