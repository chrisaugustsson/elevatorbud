import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
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
  component: HissDetail,
});

type HissDoc = {
  _id: string;
  elevator_number: string;
  address?: string;
  elevator_designation?: string;
  district?: string;
  elevator_type?: string;
  manufacturer?: string;
  build_year?: number;
  speed?: string;
  lift_height?: string;
  load_capacity?: string;
  floor_count?: number;
  door_count?: number;
  door_type?: string;
  passthrough?: boolean;
  collective?: string;
  cab_size?: string;
  daylight_opening?: string;
  grab_rail?: string;
  door_machine?: string;
  drive_system?: string;
  suspension?: string;
  machine_placement?: string;
  machine_type?: string;
  control_system_type?: string;
  inspection_authority?: string;
  inspection_month?: string;
  maintenance_company?: string;
  shaft_lighting?: string;
  modernization_year?: string;
  warranty?: boolean;
  recommended_modernization_year?: string;
  budget_amount?: number;
  modernization_measures?: string;
  has_emergency_phone?: boolean;
  emergency_phone_model?: string;
  emergency_phone_type?: string;
  needs_upgrade?: boolean;
  emergency_phone_price?: number;
  comments?: string;
  organization_id: string;
  status: "active" | "demolished" | "archived";
  created_at: number;
  last_updated_at?: number;
};

type OrgDoc = {
  _id: string;
  name: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | undefined;
}) {
  let display: string;
  if (value === undefined || value === null || value === "") {
    display = "\u2014";
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
  const hiss = useQuery(api.elevators.get, { id } as never) as
    | HissDoc
    | undefined;
  const org = useQuery(
    api.organizations.get,
    hiss ? ({ id: hiss.organization_id } as never) : "skip",
  ) as OrgDoc | undefined;
  const archiveMutation = useMutation(api.elevators.archive);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<"demolished" | "archived">("demolished");
  const [isArchiving, setIsArchiving] = useState(false);

  if (hiss === undefined) {
    return <DetailSkeleton />;
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
      await archiveMutation({ id: id as never, status: archiveStatus });
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
            <h1 className="text-2xl font-bold">{hiss.elevator_number}</h1>
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
                  <DialogTitle>Arkivera hiss {hiss.elevator_number}</DialogTitle>
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
        <DetailField label="Hissnummer" value={hiss.elevator_number} />
        <DetailField label="Adress" value={hiss.address} />
        <DetailField label="Hissbeteckning" value={hiss.elevator_designation} />
        <DetailField label="Distrikt" value={hiss.district} />
      </DetailSection>

      {/* Teknisk specifikation */}
      <DetailSection title="Teknisk specifikation">
        <DetailField label="Hisstyp" value={hiss.elevator_type} />
        <DetailField label="Fabrikat" value={hiss.manufacturer} />
        <DetailField label="Byggår" value={hiss.build_year} />
        <DetailField label="Hastighet" value={hiss.speed} />
        <DetailField label="Lyfthöjd" value={hiss.lift_height} />
        <DetailField label="Marklast" value={hiss.load_capacity} />
        <DetailField label="Antal plan" value={hiss.floor_count} />
        <DetailField label="Antal dörrar" value={hiss.door_count} />
      </DetailSection>

      {/* Dörrar och korg */}
      <DetailSection title="Dörrar och korg">
        <DetailField label="Typ dörrar" value={hiss.door_type} />
        <DetailField label="Genomgång" value={hiss.passthrough} />
        <DetailField label="Kollektiv" value={hiss.collective} />
        <DetailField label="Korgstorlek" value={hiss.cab_size} />
        <DetailField label="Dagöppning" value={hiss.daylight_opening} />
        <DetailField label="Bärbeslag" value={hiss.grab_rail} />
        <DetailField label="Dörrmaskin" value={hiss.door_machine} />
      </DetailSection>

      {/* Maskineri */}
      <DetailSection title="Maskineri">
        <DetailField label="Drivsystem" value={hiss.drive_system} />
        <DetailField label="Upphängning" value={hiss.suspension} />
        <DetailField label="Maskinplacering" value={hiss.machine_placement} />
        <DetailField label="Typ maskin" value={hiss.machine_type} />
        <DetailField label="Typ styrsystem" value={hiss.control_system_type} />
      </DetailSection>

      {/* Besiktning & underhåll */}
      <DetailSection title="Besiktning och underhåll">
        <DetailField label="Besiktningsorgan" value={hiss.inspection_authority} />
        <DetailField label="Besiktningsmånad" value={hiss.inspection_month} />
        <DetailField label="Skötselföretag" value={hiss.maintenance_company} />
        <DetailField label="Schaktbelysning" value={hiss.shaft_lighting} />
      </DetailSection>

      {/* Modernisering */}
      <DetailSection title="Modernisering">
        <DetailField label="Moderniserad" value={hiss.modernization_year} />
        <DetailField label="Garanti" value={hiss.warranty} />
        <DetailField
          label="Rekommenderat moderniseringsår"
          value={hiss.recommended_modernization_year}
        />
        <DetailField
          label="Budget"
          value={
            hiss.budget_amount !== undefined
              ? `${hiss.budget_amount.toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
        <DetailField
          label="Åtgärder vid modernisering"
          value={hiss.modernization_measures}
        />
      </DetailSection>

      {/* Nödtelefon */}
      <DetailSection
        title="Nödtelefon"
        icon={<Phone className="size-4" />}
      >
        <DetailField label="Har nödtelefon" value={hiss.has_emergency_phone} />
        <DetailField label="Modell" value={hiss.emergency_phone_model} />
        <DetailField label="Typ" value={hiss.emergency_phone_type} />
        <DetailField
          label="Behöver uppgradering"
          value={hiss.needs_upgrade}
        />
        <DetailField
          label="Pris"
          value={
            hiss.emergency_phone_price !== undefined
              ? `${hiss.emergency_phone_price.toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
      </DetailSection>

      {/* Kommentarer */}
      {hiss.comments && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Kommentarer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{hiss.comments}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        <p>
          Skapad:{" "}
          {new Date(hiss.created_at).toLocaleDateString("sv-SE")}
        </p>
        {hiss.last_updated_at && (
          <p>
            Senast uppdaterad:{" "}
            {new Date(hiss.last_updated_at).toLocaleDateString("sv-SE")}
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
