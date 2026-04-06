import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { elevatorOptions, elevatorDetailsOptions, elevatorBudgetOptions, archiveElevator } from "~/server/elevator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Phone,
  MessageSquare,
  Archive,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hiss/$id/")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(elevatorOptions(params.id));
    context.queryClient.prefetchQuery(elevatorDetailsOptions(params.id));
    context.queryClient.prefetchQuery(elevatorBudgetOptions(params.id));
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
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: hiss } = useSuspenseQuery(elevatorOptions(id));
  const { data: details } = useSuspenseQuery(elevatorDetailsOptions(id));
  const { data: budget } = useSuspenseQuery(elevatorBudgetOptions(id));
  const org = hiss.organization;
  const archiveMutation = useMutation({
    mutationFn: (input: { id: string; status: "demolished" | "archived" }) => archiveElevator({ data: input }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["elevator"] }); },
  });
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<"demolished" | "archived">("demolished");
  const [isArchiving, setIsArchiving] = useState(false);

  if (hiss === null) {
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

  async function handleArchive() {
    setIsArchiving(true);
    try {
      await archiveMutation.mutateAsync({ id, status: archiveStatus });
      setArchiveDialogOpen(false);
      navigate({ to: "/register" });
    } catch {
      setIsArchiving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link to="/register">
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
          {org && (
            <p className="ml-10 text-sm text-muted-foreground">
              {org.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hiss.status === "active" && (
            <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Archive className="mr-2 size-4" />
                  Arkivera
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arkivera hiss {hiss.elevatorNumber}</DialogTitle>
                  <DialogDescription>
                    Hissen tas bort från aktiva vyer, KPI:er och budgetberäkningar.
                    Data bevaras i databasen för historisk referens.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ny status</label>
                  <Select value={archiveStatus} onValueChange={(v) => setArchiveStatus(v as "demolished" | "archived")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demolished">Rivd</SelectItem>
                      <SelectItem value="archived">Arkiverad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setArchiveDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleArchive} disabled={isArchiving}>
                    {isArchiving ? "Arkiverar..." : "Bekräfta"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Link to="/hiss/$id/redigera" params={{ id }}>
            <Button>
              <Pencil className="mr-2 size-4" />
              Redigera
            </Button>
          </Link>
        </div>
      </div>

      <Separator />

      {/* Identifiering */}
      <DetailSection title="Identifiering">
        <DetailField label="Hissnummer" value={hiss.elevatorNumber} />
        <DetailField label="Adress" value={hiss.address} />
        <DetailField label="Klassificering" value={hiss.elevatorClassification} />
        <DetailField label="Distrikt" value={hiss.district} />
      </DetailSection>

      {/* Teknisk specifikation */}
      <DetailSection title="Teknisk specifikation">
        <DetailField label="Hisstyp" value={hiss.elevatorType} />
        <DetailField label="Fabrikat" value={hiss.manufacturer} />
        <DetailField label="Byggår" value={hiss.buildYear} />
        <DetailField label="Hastighet" value={details?.speed} />
        <DetailField label="Lyfthöjd" value={details?.liftHeight} />
        <DetailField label="Marklast" value={details?.loadCapacity} />
        <DetailField label="Antal plan" value={details?.floorCount} />
        <DetailField label="Antal dörrar" value={details?.doorCount} />
      </DetailSection>

      {/* Dörrar och korg */}
      <DetailSection title="Dörrar och korg">
        <DetailField label="Typ dörrar" value={details?.doorType} />
        <DetailField label="Genomgång" value={details?.passthrough} />
        <DetailField label="Manövrering" value={details?.dispatchMode} />
        <DetailField label="Korgstorlek" value={details?.cabSize} />
        <DetailField label="Dörröppning" value={details?.doorOpening} />
        <DetailField label="Dörrbärare" value={details?.doorCarrier} />
        <DetailField label="Dörrmaskin" value={details?.doorMachine} />
      </DetailSection>

      {/* Maskineri */}
      <DetailSection title="Maskineri">
        <DetailField label="Drivsystem" value={details?.driveSystem} />
        <DetailField label="Upphängning" value={details?.suspension} />
        <DetailField label="Maskinplacering" value={details?.machinePlacement} />
        <DetailField label="Typ maskin" value={details?.machineType} />
        <DetailField label="Typ styrsystem" value={details?.controlSystemType} />
      </DetailSection>

      {/* Besiktning & underhåll */}
      <DetailSection title="Besiktning och underhåll">
        <DetailField label="Besiktningsorgan" value={hiss.inspectionAuthority} />
        <DetailField label="Besiktningsmånad" value={hiss.inspectionMonth} />
        <DetailField label="Skötselföretag" value={hiss.maintenanceCompany} />
        <DetailField label="Schaktbelysning" value={details?.shaftLighting} />
      </DetailSection>

      {/* Modernisering */}
      <DetailSection title="Modernisering">
        <DetailField label="Moderniserad" value={hiss.modernizationYear} />
        <DetailField label="Garanti" value={budget?.warranty} />
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

      {/* Nödtelefon */}
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

      {/* Kommentarer */}
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

      {/* Metadata */}
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="ml-10 h-4 w-64" />
          <Skeleton className="ml-10 h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Separator />
      {/* Card sections */}
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {Array.from({ length: i === 0 ? 4 : i === 1 ? 8 : 5 }).map(
                (_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
