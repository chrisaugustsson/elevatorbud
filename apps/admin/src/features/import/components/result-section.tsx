import React, { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { StatCard } from "@elevatorbud/ui/components/ui/stat-card";
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { ImportResult, UpdateDiff } from "../hooks/use-import-machine";

// Initial rows visible under "Uppdaterade hissar". Load-more reveals 50
// more per click; "Visa alla" jumps to the full list.
const UPDATES_INITIAL_VISIBLE = 50;
const UPDATES_PAGE_SIZE = 50;

export function ResultSection({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const [showFailures, setShowFailures] = useState(true);

  const failureCount = result.failures.length;
  const hasFailures = failureCount > 0;
  const successCount = result.created + result.updated;
  const allFailed = successCount === 0 && hasFailures;
  const partial = successCount > 0 && hasFailures;

  // Entries carry the org id as key — we sort by display name but fall
  // back to the id suffix when names collide so admins can distinguish
  // like-named orgs (e.g. two "Hissar AB" branches in different regions).
  const perOrgEntries = result.perOrgCounts
    ? Object.entries(result.perOrgCounts)
        .map(([orgId, counts]) => ({ orgId, ...counts }))
        .filter((e) => e.created > 0 || e.updated > 0)
        .sort((a, b) => a.orgName.localeCompare(b.orgName, "sv"))
    : [];
  const nameCounts = perOrgEntries.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.orgName] = (acc[e.orgName] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const headerIcon = allFailed ? (
    <XCircle className="h-5 w-5 text-destructive" />
  ) : partial ? (
    <AlertTriangle className="h-5 w-5 text-amber-500" />
  ) : (
    <CheckCircle2 className="h-5 w-5 text-green-600" />
  );

  const headerTitle = allFailed
    ? "Import misslyckades"
    : partial
      ? "Import slutförd med fel"
      : "Import slutförd";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {headerIcon}
            <CardTitle>{headerTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Skapade"
              value={result.created}
              variant="success"
            />
            <StatCard
              label="Uppdaterade"
              value={result.updated}
              variant={result.updated > 0 ? "success" : "default"}
            />
            <StatCard
              label="Misslyckade"
              value={failureCount}
              variant={hasFailures ? "warning" : "default"}
            />
          </div>

          {perOrgEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Per organisation</p>
              <div className="space-y-1">
                {perOrgEntries.map((entry) => {
                  const ambiguous = (nameCounts[entry.orgName] ?? 0) > 1;
                  return (
                    <div
                      key={entry.orgId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="font-medium">{entry.orgName}</span>
                        {ambiguous && (
                          <span className="font-mono text-xs text-muted-foreground">
                            #{entry.orgId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                      <div className="flex gap-2">
                        {entry.created > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-emerald-700 dark:text-emerald-400 text-xs"
                          >
                            {entry.created} skapade
                          </Badge>
                        )}
                        {entry.updated > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-sky-700 dark:text-sky-400 text-xs"
                          >
                            {entry.updated} uppdaterade
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result.updates.length > 0 && (
        <UpdatesSection updates={result.updates} />
      )}

      {hasFailures && (
        <Card>
          <CardHeader className="p-0">
            <button
              type="button"
              aria-expanded={showFailures}
              aria-controls="import-failures-panel"
              onClick={() => setShowFailures(!showFailures)}
              className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-2">
                <XCircle
                  className="h-4 w-4 text-destructive"
                  aria-hidden="true"
                />
                <CardTitle className="text-base">
                  Misslyckade rader ({failureCount})
                </CardTitle>
              </span>
              <span className="text-xs text-muted-foreground">
                {showFailures ? "Dölj" : "Visa"}
              </span>
            </button>
          </CardHeader>
          {showFailures && (
            <CardContent id="import-failures-panel">
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {result.failures.map((f, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded px-2 py-1 text-xs odd:bg-muted/50"
                  >
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {f.sheet ? `${f.sheet} ` : ""}
                      {f.row ? `rad ${f.row}` : "okänd rad"} · "{f.elevator_number}"
                    </span>
                    <span>{f.reason}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Button onClick={onReset}>
        <Upload className="mr-2 h-4 w-4" />
        Importera ny fil
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Uppdaterade hissar (per-row diff list)
// ────────────────────────────────────────────────────────────────────────

function UpdatesSection({ updates }: { updates: UpdateDiff[] }) {
  const [open, setOpen] = useState(true);
  const [visible, setVisible] = useState(UPDATES_INITIAL_VISIBLE);

  // Sort by most-changed first so big diffs surface — the admin is
  // usually hunting for "did anything weird happen?", and a 10-column
  // change is more interesting than a 1-column typo fix.
  const sorted = useMemo(
    () =>
      [...updates].sort(
        (a, b) =>
          b.changes.length - a.changes.length ||
          a.elevatorNumber.localeCompare(b.elevatorNumber, "sv"),
      ),
    [updates],
  );

  const slice = sorted.slice(0, visible);
  const remaining = sorted.length - slice.length;

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="import-updates-panel"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 rounded-xl px-6 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2
              className="h-4 w-4 text-sky-600 dark:text-sky-400"
              aria-hidden="true"
            />
            <CardTitle className="text-base">
              Uppdaterade hissar ({updates.length})
            </CardTitle>
          </span>
          <span className="text-xs text-muted-foreground">
            {open ? "Dölj" : "Visa"}
          </span>
        </button>
      </CardHeader>
      {open && (
        <CardContent id="import-updates-panel" className="space-y-2">
          {slice.map((u) => (
            <UpdateRow key={u.elevatorId} update={u} />
          ))}
          {remaining > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisible((v) =>
                    Math.min(v + UPDATES_PAGE_SIZE, sorted.length),
                  )
                }
              >
                Visa {Math.min(UPDATES_PAGE_SIZE, remaining)} till
              </Button>
              {remaining > UPDATES_PAGE_SIZE && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisible(sorted.length)}
                >
                  Visa alla ({remaining})
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                visar {slice.length} av {sorted.length}
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function UpdateRow({ update }: { update: UpdateDiff }) {
  const [expanded, setExpanded] = useState(false);
  const changeCount = update.changes.length;

  return (
    <div className="overflow-hidden rounded-md border">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          />
          <span className="truncate font-mono font-medium">
            {update.elevatorNumber}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            · {update.organizationName}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs text-sky-700 dark:text-sky-400"
          >
            {changeCount} ändring{changeCount === 1 ? "" : "ar"}
          </Badge>
          <Link
            to="/hiss/$id"
            params={{ id: update.elevatorId }}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Öppna hiss ${update.elevatorNumber}`}
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </span>
      </button>
      {expanded && (
        <div className="divide-y divide-border/40 border-t bg-muted/20">
          {update.changes.map((c, i) => (
            <div
              key={`${c.field}-${i}`}
              className="grid grid-cols-[160px_1fr] gap-3 px-3 py-2 text-xs"
            >
              <span className="truncate text-muted-foreground">
                {formatFieldLabel(c.field)}
              </span>
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="truncate text-muted-foreground line-through">
                  {formatChangeValue(c.before)}
                </span>
                <ChevronRight
                  className="size-3 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <span className="truncate font-medium">
                  {formatChangeValue(c.after)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatChangeValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Ja" : "Nej";
  if (typeof v === "string" || typeof v === "number") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// Swedish labels for every column the import can actually change.
// Custom field entries arrive as `custom:{slug}` — rendered inline
// below without needing a dedicated entry in this map.
const FIELD_LABELS: Record<string, string> = {
  address: "Adress",
  elevatorClassification: "Hissbeteckning",
  district: "Distrikt",
  propertyDesignation: "Fastighetsbeteckning",
  elevatorType: "Hisstyp",
  manufacturer: "Fabrikat",
  buildYear: "Byggår",
  inspectionAuthority: "Besiktningsorgan",
  inspectionMonth: "Besiktningsmånad",
  maintenanceCompany: "Skötselföretag",
  modernizationYear: "Moderniseringsår",
  warrantyExpiresAt: "Garanti",
  inventoryDate: "Inventeringsdatum",
  hasEmergencyPhone: "Har nödtelefon",
  needsUpgrade: "Behöver uppgradering",
  contactPersonName: "Kontaktperson",
  contactPersonPhone: "Kontaktperson telefon",
  contactPersonEmail: "Kontaktperson e-post",
  // elevator_details
  speed: "Hastighet",
  liftHeight: "Lyfthöjd",
  loadCapacity: "Märklast",
  floorCount: "Antal plan",
  doorCount: "Antal dörrar",
  doorType: "Typ av dörrar",
  passthrough: "Genomgång",
  dispatchMode: "Manövrering",
  cabSize: "Korgstorlek",
  doorOpening: "Dagöppning",
  doorCarrier: "Bärbeslag",
  doorMachine: "Dörrmaskin",
  driveSystem: "Drivsystem",
  suspension: "Upphängning",
  machinePlacement: "Maskinplacering",
  machineType: "Maskintyp",
  controlSystemType: "Styrsystem",
  shaftLighting: "Schaktbelysning",
  emergencyPhone: "Nödtelefon",
  comments: "Kommentarer",
  // elevator_budgets
  recommendedModernizationYear: "Rek. moderniseringsår",
  budgetAmount: "Budget",
  measures: "Åtgärder",
};

function formatFieldLabel(field: string): string {
  if (field.startsWith("custom:")) {
    return `Extrafält: ${field.slice("custom:".length)}`;
  }
  return FIELD_LABELS[field] ?? field;
}

export function ImportErrorSection({
  error,
  onBackToMapping,
  onStartOver,
  headingRef,
}: {
  error: string;
  onBackToMapping: () => void;
  onStartOver: () => void;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <CardTitle ref={headingRef} tabIndex={-1} className="focus:outline-none">
              Importen avbröts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm"
            role="alert"
          >
            <p className="font-medium text-destructive">{error}</p>
            <p className="mt-2 text-muted-foreground">
              Se listan nedan för rader som redan skapats eller misslyckats.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBackToMapping}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till mappning
        </Button>
        <Button variant="outline" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Börja om
        </Button>
      </div>
    </div>
  );
}
