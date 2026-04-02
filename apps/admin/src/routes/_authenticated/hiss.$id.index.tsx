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
  hissnummer: string;
  adress?: string;
  hissbeteckning?: string;
  distrikt?: string;
  hisstyp?: string;
  fabrikat?: string;
  byggar?: number;
  hastighet?: string;
  lyfthojd?: string;
  marklast?: string;
  antal_plan?: number;
  antal_dorrar?: number;
  typ_dorrar?: string;
  genomgang?: boolean;
  kollektiv?: string;
  korgstorlek?: string;
  dagoppning?: string;
  barbeslag?: string;
  dorrmaskin?: string;
  drivsystem?: string;
  upphangning?: string;
  maskinplacering?: string;
  typ_maskin?: string;
  typ_styrsystem?: string;
  besiktningsorgan?: string;
  besiktningsmanad?: string;
  skotselforetag?: string;
  schaktbelysning?: string;
  moderniserar?: string;
  garanti?: boolean;
  rekommenderat_moderniserar?: string;
  budget_belopp?: number;
  atgarder_vid_modernisering?: string;
  har_nodtelefon?: boolean;
  nodtelefon_modell?: string;
  nodtelefon_typ?: string;
  behover_uppgradering?: boolean;
  nodtelefon_pris?: number;
  kommentarer?: string;
  organisation_id: string;
  status: "aktiv" | "rivd" | "arkiverad";
  skapad_datum: number;
  senast_uppdaterad?: number;
};

type OrgDoc = {
  _id: string;
  namn: string;
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
  const hiss = useQuery(api.hissar.get, { id } as never) as
    | HissDoc
    | undefined;
  const org = useQuery(
    api.organisationer.get,
    hiss ? ({ id: hiss.organisation_id } as never) : "skip",
  ) as OrgDoc | undefined;
  const archiveMutation = useMutation(api.hissar.archive);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<"rivd" | "arkiverad">("rivd");
  const [isArchiving, setIsArchiving] = useState(false);

  if (hiss === undefined) {
    return <DetailSkeleton />;
  }

  const statusLabel: Record<string, string> = {
    aktiv: "Aktiv",
    rivd: "Rivd",
    arkiverad: "Arkiverad",
  };

  const statusVariant = hiss.status === "aktiv" ? "default" : "secondary";

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
            <h1 className="text-2xl font-bold">{hiss.hissnummer}</h1>
            <Badge variant={statusVariant}>
              {statusLabel[hiss.status] ?? hiss.status}
            </Badge>
          </div>
          {hiss.adress && (
            <p className="ml-10 text-sm text-muted-foreground">{hiss.adress}</p>
          )}
          {org && (
            <p className="ml-10 text-sm text-muted-foreground">
              {org.namn}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hiss.status === "aktiv" && (
            <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Archive className="mr-2 size-4" />
                  Arkivera
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arkivera hiss {hiss.hissnummer}</DialogTitle>
                  <DialogDescription>
                    Hissen tas bort från aktiva vyer, KPI:er och budgetberäkningar.
                    Data bevaras i databasen för historisk referens.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ny status</label>
                  <Select value={archiveStatus} onValueChange={(v) => setArchiveStatus(v as "rivd" | "arkiverad")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rivd">Rivd</SelectItem>
                      <SelectItem value="arkiverad">Arkiverad</SelectItem>
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
        <DetailField label="Hissnummer" value={hiss.hissnummer} />
        <DetailField label="Adress" value={hiss.adress} />
        <DetailField label="Hissbeteckning" value={hiss.hissbeteckning} />
        <DetailField label="Distrikt" value={hiss.distrikt} />
      </DetailSection>

      {/* Teknisk specifikation */}
      <DetailSection title="Teknisk specifikation">
        <DetailField label="Hisstyp" value={hiss.hisstyp} />
        <DetailField label="Fabrikat" value={hiss.fabrikat} />
        <DetailField label="Byggår" value={hiss.byggar} />
        <DetailField label="Hastighet" value={hiss.hastighet} />
        <DetailField label="Lyfthöjd" value={hiss.lyfthojd} />
        <DetailField label="Marklast" value={hiss.marklast} />
        <DetailField label="Antal plan" value={hiss.antal_plan} />
        <DetailField label="Antal dörrar" value={hiss.antal_dorrar} />
      </DetailSection>

      {/* Dörrar och korg */}
      <DetailSection title="Dörrar och korg">
        <DetailField label="Typ dörrar" value={hiss.typ_dorrar} />
        <DetailField label="Genomgång" value={hiss.genomgang} />
        <DetailField label="Kollektiv" value={hiss.kollektiv} />
        <DetailField label="Korgstorlek" value={hiss.korgstorlek} />
        <DetailField label="Dagöppning" value={hiss.dagoppning} />
        <DetailField label="Bärbeslag" value={hiss.barbeslag} />
        <DetailField label="Dörrmaskin" value={hiss.dorrmaskin} />
      </DetailSection>

      {/* Maskineri */}
      <DetailSection title="Maskineri">
        <DetailField label="Drivsystem" value={hiss.drivsystem} />
        <DetailField label="Upphängning" value={hiss.upphangning} />
        <DetailField label="Maskinplacering" value={hiss.maskinplacering} />
        <DetailField label="Typ maskin" value={hiss.typ_maskin} />
        <DetailField label="Typ styrsystem" value={hiss.typ_styrsystem} />
      </DetailSection>

      {/* Besiktning & underhåll */}
      <DetailSection title="Besiktning och underhåll">
        <DetailField label="Besiktningsorgan" value={hiss.besiktningsorgan} />
        <DetailField label="Besiktningsmånad" value={hiss.besiktningsmanad} />
        <DetailField label="Skötselföretag" value={hiss.skotselforetag} />
        <DetailField label="Schaktbelysning" value={hiss.schaktbelysning} />
      </DetailSection>

      {/* Modernisering */}
      <DetailSection title="Modernisering">
        <DetailField label="Moderniserad" value={hiss.moderniserar} />
        <DetailField label="Garanti" value={hiss.garanti} />
        <DetailField
          label="Rekommenderat moderniseringsår"
          value={hiss.rekommenderat_moderniserar}
        />
        <DetailField
          label="Budget"
          value={
            hiss.budget_belopp !== undefined
              ? `${hiss.budget_belopp.toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
        <DetailField
          label="Åtgärder vid modernisering"
          value={hiss.atgarder_vid_modernisering}
        />
      </DetailSection>

      {/* Nödtelefon */}
      <DetailSection
        title="Nödtelefon"
        icon={<Phone className="size-4" />}
      >
        <DetailField label="Har nödtelefon" value={hiss.har_nodtelefon} />
        <DetailField label="Modell" value={hiss.nodtelefon_modell} />
        <DetailField label="Typ" value={hiss.nodtelefon_typ} />
        <DetailField
          label="Behöver uppgradering"
          value={hiss.behover_uppgradering}
        />
        <DetailField
          label="Pris"
          value={
            hiss.nodtelefon_pris !== undefined
              ? `${hiss.nodtelefon_pris.toLocaleString("sv-SE")} kr`
              : undefined
          }
        />
      </DetailSection>

      {/* Kommentarer */}
      {hiss.kommentarer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Kommentarer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{hiss.kommentarer}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground">
        <p>
          Skapad:{" "}
          {new Date(hiss.skapad_datum).toLocaleDateString("sv-SE")}
        </p>
        {hiss.senast_uppdaterad && (
          <p>
            Senast uppdaterad:{" "}
            {new Date(hiss.senast_uppdaterad).toLocaleDateString("sv-SE")}
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
