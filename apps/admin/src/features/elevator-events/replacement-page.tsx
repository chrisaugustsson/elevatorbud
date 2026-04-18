import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";

// ---------------------------------------------------------------------------
// Form shape
// ---------------------------------------------------------------------------

type NewDetails = {
  speed: string;
  liftHeight: string;
  loadCapacity: string;
  doorCount: string;
  doorType: string;
  doorOpening: string;
  doorCarrier: string;
  doorMachine: string;
  cabSize: string;
  passthrough: "" | "true" | "false";
  dispatchMode: string;
  driveSystem: string;
  suspension: string;
  machinePlacement: string;
  machineType: string;
  controlSystemType: string;
  shaftLighting: string;
  emergencyPhoneModel: string;
  emergencyPhoneType: string;
  emergencyPhonePrice: string;
};

const EMPTY_DETAILS: NewDetails = {
  speed: "",
  liftHeight: "",
  loadCapacity: "",
  doorCount: "",
  doorType: "",
  doorOpening: "",
  doorCarrier: "",
  doorMachine: "",
  cabSize: "",
  passthrough: "",
  dispatchMode: "",
  driveSystem: "",
  suspension: "",
  machinePlacement: "",
  machineType: "",
  controlSystemType: "",
  shaftLighting: "",
  emergencyPhoneModel: "",
  emergencyPhoneType: "",
  emergencyPhonePrice: "",
};

export type ReplacementPageSubmit = {
  occurredAt: string;
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
  newIdentity: {
    elevatorNumber: string;
    manufacturer: string;
    buildYear: number;
  };
  newDetails: {
    speed?: string | null;
    liftHeight?: string | null;
    loadCapacity?: string | null;
    doorCount?: number | null;
    doorType?: string | null;
    doorOpening?: string | null;
    doorCarrier?: string | null;
    doorMachine?: string | null;
    cabSize?: string | null;
    passthrough?: boolean | null;
    dispatchMode?: string | null;
    driveSystem?: string | null;
    suspension?: string | null;
    machinePlacement?: string | null;
    machineType?: string | null;
    controlSystemType?: string | null;
    shaftLighting?: string | null;
    emergencyPhoneModel?: string | null;
    emergencyPhoneType?: string | null;
    emergencyPhonePrice?: number | null;
  };
};

export type OutgoingSummary = {
  elevatorNumber: string | null;
  manufacturer: string | null;
  buildYear: number | null;
  details: Partial<Record<keyof NewDetails, unknown>>;
};

// ---------------------------------------------------------------------------
// Draft persistence (separate key space from modernization drafts)
// ---------------------------------------------------------------------------

const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const draftKey = (elevatorId: string) =>
  `replacement-draft:v${DRAFT_VERSION}:${elevatorId}`;

type DraftShape = {
  elevatorNumber: string;
  manufacturer: string;
  occurredAt: string;
  performedBy: string;
  cost: string;
  description: string;
  details: NewDetails;
  savedAt: number;
};

function loadDraft(elevatorId: string): DraftShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(elevatorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftShape;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(draftKey(elevatorId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(elevatorId: string, draft: DraftShape) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftKey(elevatorId), JSON.stringify(draft));
  } catch {
    /* non-critical */
  }
}

function clearDraft(elevatorId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(elevatorId));
  } catch {
    /* non-critical */
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearFromIso(iso: string): number {
  const y = Number(iso.slice(0, 4));
  return Number.isFinite(y) ? y : new Date().getUTCFullYear();
}

function parseNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Field metadata for the review diff
// ---------------------------------------------------------------------------

type DetailRow = {
  key: keyof NewDetails;
  label: string;
  input: "text" | "number" | "boolean";
};

const DETAIL_GROUPS: Array<{
  label: string;
  description: string;
  fields: DetailRow[];
}> = [
  {
    label: "Teknisk specifikation",
    description: "Kapacitet och prestanda för den nya enheten.",
    fields: [
      { key: "speed", label: "Hastighet (m/s)", input: "text" },
      { key: "liftHeight", label: "Lyfthöjd (m)", input: "text" },
      { key: "loadCapacity", label: "Märklast (kg)", input: "text" },
      { key: "doorCount", label: "Antal dörrar", input: "number" },
    ],
  },
  {
    label: "Dörrar & korg",
    description: "Dörrsystem, korgstorlek och manövreringssätt.",
    fields: [
      { key: "doorType", label: "Typ dörrar", input: "text" },
      { key: "doorOpening", label: "Dörröppning", input: "text" },
      { key: "doorCarrier", label: "Dörrbärare", input: "text" },
      { key: "doorMachine", label: "Dörrmaskin", input: "text" },
      { key: "cabSize", label: "Korgstorlek", input: "text" },
      { key: "passthrough", label: "Genomgång", input: "boolean" },
      { key: "dispatchMode", label: "Manövrering", input: "text" },
    ],
  },
  {
    label: "Maskineri",
    description: "Drivsystem, styrning och maskinens placering.",
    fields: [
      { key: "driveSystem", label: "Drivsystem", input: "text" },
      { key: "suspension", label: "Upphängning", input: "text" },
      { key: "machinePlacement", label: "Maskinplacering", input: "text" },
      { key: "machineType", label: "Typ maskin", input: "text" },
      { key: "controlSystemType", label: "Typ styrsystem", input: "text" },
    ],
  },
  {
    label: "Säkerhet & nödtelefon",
    description: "Schaktbelysning och nödtelefonens modell.",
    fields: [
      { key: "shaftLighting", label: "Schaktbelysning", input: "text" },
      { key: "emergencyPhoneModel", label: "Nödtelefon — modell", input: "text" },
      { key: "emergencyPhoneType", label: "Nödtelefon — typ", input: "text" },
      { key: "emergencyPhonePrice", label: "Nödtelefon — pris", input: "number" },
    ],
  },
];

function renderDisplay(row: DetailRow, value: unknown): string {
  if (value == null || value === "") return "—";
  if (row.input === "boolean") {
    return value === true || value === "true" ? "Ja" : "Nej";
  }
  if (row.input === "number") {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString("sv-SE");
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Phase = "form" | "review";

export type ReplacementPageProps = {
  elevatorId: string;
  outgoing: OutgoingSummary;
  onSubmit: (values: ReplacementPageSubmit) => Promise<void>;
  onCancel: () => void;
  /**
   * Called whenever the form transitions between clean and dirty. The
   * route uses this to toggle a navigation blocker — dirty = intercept
   * back/close, clean = free navigation.
   */
  onDirtyChange?: (dirty: boolean) => void;
};

export function ReplacementPage({
  elevatorId,
  outgoing,
  onSubmit,
  onCancel,
  onDirtyChange,
}: ReplacementPageProps) {
  const [phase, setPhase] = useState<Phase>("form");
  const [submitting, setSubmitting] = useState(false);

  // Identity + event meta. Elevator number starts blank — a replacement
  // is a new unit and typically gets a new identifier. The outgoing
  // number is visible in the Ersätter hero panel for reference only.
  const [elevatorNumber, setElevatorNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [performedBy, setPerformedBy] = useState("");
  const [cost, setCost] = useState("");
  const [description, setDescription] = useState("");

  // Detail fields
  const [details, setDetails] = useState<NewDetails>(EMPTY_DETAILS);

  // Errors
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const elevatorNumberRef = useRef<HTMLInputElement>(null);
  const manufacturerRef = useRef<HTMLInputElement>(null);

  // Draft opt-in banner — never auto-restore, per UX guidance: replacement
  // mutates identity, so a silent restore could cause an accidental commit.
  const [pendingDraft, setPendingDraft] = useState<DraftShape | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);

  useEffect(() => {
    const draft = loadDraft(elevatorId);
    if (draft) setPendingDraft(draft);
    setDraftChecked(true);
  }, [elevatorId]);

  // Dirty tracking. Form is dirty as soon as anything is typed — all
  // fields start blank.
  const dirty = useMemo(() => {
    if (pendingDraft) return false; // banner is blocking the form; don't trip blocker
    if (elevatorNumber.trim() !== "") return true;
    if (manufacturer.trim() !== "") return true;
    if (performedBy.trim() !== "") return true;
    if (cost.trim() !== "") return true;
    if (description.trim() !== "") return true;
    for (const v of Object.values(details)) {
      if (typeof v === "string" && v !== "") return true;
    }
    return false;
  }, [
    pendingDraft,
    elevatorNumber,
    manufacturer,
    performedBy,
    cost,
    description,
    details,
  ]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Autosave (500ms debounce). Skipped while the opt-in banner is showing
  // so we don't clobber the existing draft with fresh-blank values.
  //
  // When `dirty` transitions from true back to false (user typed something
  // and then cleared every field), we actively clear the stored draft.
  // Otherwise a user who explicitly empties the form would still get a
  // "Tidigare utkast tillgängligt" banner on next visit with stale data.
  const wasDirtyRef = useRef(false);
  useEffect(() => {
    if (!draftChecked || pendingDraft) return;
    if (dirty) {
      wasDirtyRef.current = true;
      const handle = window.setTimeout(() => {
        saveDraft(elevatorId, {
          elevatorNumber,
          manufacturer,
          occurredAt,
          performedBy,
          cost,
          description,
          details,
          savedAt: Date.now(),
        });
      }, 500);
      return () => window.clearTimeout(handle);
    }
    // dirty === false. If we ever autosaved a draft during this session,
    // discard it — the user has returned the form to its clean baseline.
    if (wasDirtyRef.current) {
      clearDraft(elevatorId);
      wasDirtyRef.current = false;
    }
  }, [
    draftChecked,
    pendingDraft,
    dirty,
    elevatorNumber,
    manufacturer,
    occurredAt,
    performedBy,
    cost,
    description,
    details,
    elevatorId,
  ]);

  function handleRestoreDraft() {
    if (!pendingDraft) return;
    setElevatorNumber(pendingDraft.elevatorNumber);
    setManufacturer(pendingDraft.manufacturer);
    setOccurredAt(pendingDraft.occurredAt || todayIso());
    setPerformedBy(pendingDraft.performedBy);
    setCost(pendingDraft.cost);
    setDescription(pendingDraft.description);
    setDetails(pendingDraft.details);
    setPendingDraft(null);
  }

  function handleDiscardDraft() {
    clearDraft(elevatorId);
    setPendingDraft(null);
  }

  function goToReview() {
    const next: Record<string, string> = {};
    if (!elevatorNumber.trim()) next.elevatorNumber = "Hissnummer krävs";
    if (!manufacturer.trim()) next.manufacturer = "Fabrikat krävs";
    if (!occurredAt) next.occurredAt = "Datum krävs";
    if (cost.trim() !== "") {
      const parsed = parseNumber(cost);
      if (parsed == null) next.cost = "Ogiltig kostnad";
      else if (parsed < 0) next.cost = "Kostnad kan inte vara negativ";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.elevatorNumber) elevatorNumberRef.current?.focus();
      else if (next.manufacturer) manufacturerRef.current?.focus();
      return;
    }
    setPhase("review");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleConfirmSubmit() {
    const costNum = cost.trim() === "" ? null : parseNumber(cost);
    setSubmitting(true);
    try {
      await onSubmit({
        occurredAt,
        description: description.trim() || null,
        cost: costNum,
        performedBy: performedBy.trim() || null,
        newIdentity: {
          elevatorNumber: elevatorNumber.trim(),
          manufacturer: manufacturer.trim(),
          buildYear: yearFromIso(occurredAt),
        },
        newDetails: serializeDetails(details),
      });
      clearDraft(elevatorId);
      // Navigation handled by parent (toast + back to detail).
    } catch {
      // Parent toasts; stay on review so user doesn't re-enter everything.
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof NewDetails>(key: K, value: NewDetails[K]) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  // Footer progress. Two parallel signals:
  //  1. `totalFilled / totalFields` — how much of the new unit has been
  //     defined overall. This drives the bar width so the user sees the
  //     whole form's scale, not just the submit threshold.
  //  2. `requiredFilled / requiredTotal` — whether the user is over the
  //     line where submit becomes legal. This is shown as a separate
  //     confirmation ("Klart för granskning") rather than a bar state, so
  //     the bar can keep moving as optional specs are filled in.
  const isDetailFilled = (value: string) => value.trim() !== "";
  const detailFieldCount = DETAIL_GROUPS.reduce(
    (sum, g) => sum + g.fields.length,
    0,
  );
  const detailFieldsFilled = DETAIL_GROUPS.reduce(
    (sum, g) =>
      sum +
      g.fields.filter((f) => isDetailFilled(details[f.key] as string)).length,
    0,
  );
  const requiredFilled =
    (elevatorNumber.trim() !== "" ? 1 : 0) +
    (manufacturer.trim() !== "" ? 1 : 0) +
    (occurredAt !== "" ? 1 : 0);
  const requiredTotal = 3;
  // Event meta = occurredAt (required, counted above), cost, performedBy,
  // description. Only cost + performedBy + description are extra here.
  const eventMetaFilled =
    (cost.trim() !== "" ? 1 : 0) +
    (performedBy.trim() !== "" ? 1 : 0) +
    (description.trim() !== "" ? 1 : 0);
  const eventMetaCount = 3;

  const totalFilled =
    requiredFilled + detailFieldsFilled + eventMetaFilled;
  const totalFields = requiredTotal + detailFieldCount + eventMetaCount;
  const requiredComplete = requiredFilled === requiredTotal;

  return (
    <div className="relative space-y-10 pb-32">
      {/* ── Back link ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onCancel}
          aria-label="Tillbaka"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span>Tillbaka till hiss</span>
      </div>

      {/* ── H1 anchor (for focus-on-route-change a11y) ──────────────── */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Utbyte
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Ersätt hiss</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Registrera ett utbyte mot en ny enhet på samma plats. Den befintliga
          hissens uppgifter arkiveras på händelsen. Byggnadens kontext
          (besiktning, underhåll, plan) behålls.
        </p>
      </div>

      {/* ── Split before→after hero ─────────────────────────────────
          Two side-by-side cards with an arrow between them. Left shows the
          outgoing unit (static, muted). Right previews what the form is
          defining — updates live as the user types. A subtle radial
          gradient behind the whole block suggests "this is the important
          thing", without resorting to decoration for its own sake. ── */}
      <SplitHero
        outgoing={outgoing}
        newElevatorNumber={elevatorNumber}
        newManufacturer={manufacturer}
        newBuildYear={yearFromIso(occurredAt)}
      />

      {/* ── Opt-in draft restore banner ─────────────────────────────── */}
      {pendingDraft && (
        <div className="rounded-md border bg-card p-4">
          <p className="text-sm font-medium">Tidigare utkast tillgängligt</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ett påbörjat utbyte sparades {relativeSavedAgo(pendingDraft.savedAt)}.
            Välj om du vill fortsätta där du slutade eller börja om.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleRestoreDraft}>
              Återställ utkast
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDiscardDraft}>
              Börja om
            </Button>
          </div>
        </div>
      )}

      {!pendingDraft && phase === "form" && (
        <FormPhase
          elevatorNumber={elevatorNumber}
          onElevatorNumberChange={setElevatorNumber}
          elevatorNumberRef={elevatorNumberRef}
          manufacturer={manufacturer}
          onManufacturerChange={setManufacturer}
          manufacturerRef={manufacturerRef}
          occurredAt={occurredAt}
          onOccurredAtChange={setOccurredAt}
          performedBy={performedBy}
          onPerformedByChange={setPerformedBy}
          cost={cost}
          onCostChange={setCost}
          description={description}
          onDescriptionChange={setDescription}
          details={details}
          onDetailChange={update}
          errors={errors}
        />
      )}

      {!pendingDraft && phase === "review" && (
        <ReviewPhase
          outgoing={outgoing}
          elevatorNumber={elevatorNumber}
          manufacturer={manufacturer}
          buildYear={yearFromIso(occurredAt)}
          details={details}
          occurredAt={occurredAt}
          performedBy={performedBy}
          cost={cost}
          description={description}
        />
      )}

      {/* ── Sticky footer with quiet progress signal ──────────────── */}
      {!pendingDraft && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 backdrop-blur">
          {/* Progress track — 2px bar showing total form completion across
              every field on the page, not just required ones. Saturation
              shifts from primary/40 to primary/70 once the required gate
              is cleared, giving a subtle "ready to review" cue without
              disturbing the forward motion as optional fields are added. */}
          <div
            className="h-0.5 bg-primary/10"
            role="progressbar"
            aria-valuenow={totalFilled}
            aria-valuemin={0}
            aria-valuemax={totalFields}
            aria-label="Fält ifyllda totalt"
          >
            <div
              className={`h-full transition-[width] duration-300 ease-out ${
                requiredComplete ? "bg-primary/70" : "bg-primary/40"
              }`}
              style={{
                width: `${(totalFilled / totalFields) * 100}%`,
              }}
            />
          </div>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            {phase === "form" ? (
              <>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onCancel}>
                    Avbryt
                  </Button>
                  <span className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                    <span>
                      {totalFilled} av {totalFields} fält
                    </span>
                    <span aria-hidden>·</span>
                    {requiredComplete ? (
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Check className="size-3" aria-hidden />
                        Klart för granskning
                      </span>
                    ) : (
                      <span>
                        {requiredTotal - requiredFilled} obligatoriska kvar
                      </span>
                    )}
                  </span>
                </div>
                <Button onClick={goToReview}>Granska utbyte</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setPhase("form")}>
                  <Pencil className="mr-1.5 size-4" />
                  Redigera
                </Button>
                <Button onClick={handleConfirmSubmit} disabled={submitting}>
                  {submitting ? "Ersätter…" : "Ersätt hiss"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Split before → after hero
// ---------------------------------------------------------------------------

function SplitHero({
  outgoing,
  newElevatorNumber,
  newManufacturer,
  newBuildYear,
}: {
  outgoing: OutgoingSummary;
  newElevatorNumber: string;
  newManufacturer: string;
  newBuildYear: number;
}) {
  const hasNewManufacturer = newManufacturer.trim() !== "";
  return (
    <div className="relative">
      {/* Subtle radial gradient — "lit from above", not decoration. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 h-48 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.06),_transparent_60%)]"
      />
      <div className="relative grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        {/* Outgoing panel */}
        <article className="rounded-lg border bg-muted/30 p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ersätter
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              outgoing.manufacturer ? "" : "italic text-muted-foreground"
            }`}
          >
            {outgoing.manufacturer ?? "Okänt fabrikat"}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {outgoing.buildYear != null ? outgoing.buildYear : "—"}
            {" · "}
            {outgoing.elevatorNumber ?? "—"}
          </p>
        </article>

        {/* Arrow connector — horizontal on desktop, rotated on mobile. */}
        <div
          className="flex items-center justify-center text-muted-foreground"
          aria-hidden
        >
          <ArrowRight className="size-5 sm:size-6 max-sm:rotate-90" />
        </div>

        {/* Live-preview new unit panel */}
        <article className="rounded-lg border border-primary/30 bg-card p-5">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary/80">
            Ny hiss
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${
              hasNewManufacturer ? "" : "italic text-muted-foreground"
            }`}
          >
            {hasNewManufacturer ? newManufacturer : "Definieras nedan"}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            <span className={hasNewManufacturer ? "" : "opacity-50"}>
              {newBuildYear}
            </span>
            {" · "}
            <span className={newElevatorNumber ? "" : "opacity-50"}>
              {newElevatorNumber || "—"}
            </span>
          </p>
        </article>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Serialization: form strings → typed server input
// ---------------------------------------------------------------------------

function serializeDetails(d: NewDetails): ReplacementPageSubmit["newDetails"] {
  return {
    speed: nullIfEmpty(d.speed),
    liftHeight: nullIfEmpty(d.liftHeight),
    loadCapacity: nullIfEmpty(d.loadCapacity),
    doorCount: parseIntField(d.doorCount),
    doorType: nullIfEmpty(d.doorType),
    doorOpening: nullIfEmpty(d.doorOpening),
    doorCarrier: nullIfEmpty(d.doorCarrier),
    doorMachine: nullIfEmpty(d.doorMachine),
    cabSize: nullIfEmpty(d.cabSize),
    passthrough:
      d.passthrough === "" ? null : d.passthrough === "true" ? true : false,
    dispatchMode: nullIfEmpty(d.dispatchMode),
    driveSystem: nullIfEmpty(d.driveSystem),
    suspension: nullIfEmpty(d.suspension),
    machinePlacement: nullIfEmpty(d.machinePlacement),
    machineType: nullIfEmpty(d.machineType),
    controlSystemType: nullIfEmpty(d.controlSystemType),
    shaftLighting: nullIfEmpty(d.shaftLighting),
    emergencyPhoneModel: nullIfEmpty(d.emergencyPhoneModel),
    emergencyPhoneType: nullIfEmpty(d.emergencyPhoneType),
    emergencyPhonePrice: parseNumber(d.emergencyPhonePrice),
  };
}

function nullIfEmpty(s: string): string | null {
  return s.trim() === "" ? null : s.trim();
}

function parseIntField(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function relativeSavedAgo(savedAt: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - savedAt) / 1000));
  if (seconds < 60) return `för ${seconds} sek sedan`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `för ${minutes} min sedan`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `för ${hours} tim sedan`;
  const days = Math.round(hours / 24);
  return `för ${days} ${days === 1 ? "dag" : "dagar"} sedan`;
}

// ---------------------------------------------------------------------------
// Form phase
// ---------------------------------------------------------------------------

function FormPhase({
  elevatorNumber,
  onElevatorNumberChange,
  elevatorNumberRef,
  manufacturer,
  onManufacturerChange,
  manufacturerRef,
  occurredAt,
  onOccurredAtChange,
  performedBy,
  onPerformedByChange,
  cost,
  onCostChange,
  description,
  onDescriptionChange,
  details,
  onDetailChange,
  errors,
}: {
  elevatorNumber: string;
  onElevatorNumberChange: (v: string) => void;
  elevatorNumberRef: React.RefObject<HTMLInputElement | null>;
  manufacturer: string;
  onManufacturerChange: (v: string) => void;
  manufacturerRef: React.RefObject<HTMLInputElement | null>;
  occurredAt: string;
  onOccurredAtChange: (v: string) => void;
  performedBy: string;
  onPerformedByChange: (v: string) => void;
  cost: string;
  onCostChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  details: NewDetails;
  onDetailChange: <K extends keyof NewDetails>(
    key: K,
    value: NewDetails[K],
  ) => void;
  errors: Record<string, string | undefined>;
}) {
  // Stable numbering: identification + N detail groups + event meta.
  // Computed here so the detail groups can use their natural index.
  const lastNumber = 1 + DETAIL_GROUPS.length + 1;

  return (
    <div>
      <NumberedSection
        number={1}
        total={lastNumber}
        title="Identifiering"
        description="Hissens unika beteckning och fabrikat."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rp-elevatorNumber">
              Hissnummer <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={elevatorNumberRef}
              id="rp-elevatorNumber"
              value={elevatorNumber}
              onChange={(e) => onElevatorNumberChange(e.target.value)}
              aria-invalid={!!errors.elevatorNumber}
            />
            {errors.elevatorNumber && (
              <p className="text-sm text-destructive">{errors.elevatorNumber}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rp-manufacturer">
              Fabrikat <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={manufacturerRef}
              id="rp-manufacturer"
              value={manufacturer}
              onChange={(e) => onManufacturerChange(e.target.value)}
              aria-invalid={!!errors.manufacturer}
              placeholder="t.ex. KONE"
            />
            {errors.manufacturer && (
              <p className="text-sm text-destructive">{errors.manufacturer}</p>
            )}
          </div>
        </div>
      </NumberedSection>

      {DETAIL_GROUPS.map((group, i) => (
        <NumberedSection
          key={group.label}
          number={i + 2}
          total={lastNumber}
          title={group.label}
          description={group.description}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((row) => (
              <DetailInput
                key={row.key}
                row={row}
                value={details[row.key]}
                onChange={(v) => onDetailChange(row.key, v as never)}
              />
            ))}
          </div>
        </NumberedSection>
      ))}

      <NumberedSection
        number={lastNumber}
        total={lastNumber}
        title="Utbytet"
        description="När det skedde, vem som utförde det och eventuell kostnad."
        isLast
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rp-occurredAt">
              Datum <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rp-occurredAt"
              type="date"
              value={occurredAt}
              onChange={(e) => onOccurredAtChange(e.target.value)}
              aria-invalid={!!errors.occurredAt}
            />
            {errors.occurredAt && (
              <p className="text-sm text-destructive">{errors.occurredAt}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-cost">Kostnad (SEK)</Label>
            <Input
              id="rp-cost"
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => onCostChange(e.target.value)}
              placeholder="t.ex. 850000"
              className="tabular-nums"
              aria-invalid={!!errors.cost}
            />
            {errors.cost && (
              <p className="text-sm text-destructive">{errors.cost}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rp-performedBy">Leverantör</Label>
            <Input
              id="rp-performedBy"
              value={performedBy}
              onChange={(e) => onPerformedByChange(e.target.value)}
              placeholder="Företagsnamn"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rp-description">Anteckningar</Label>
            <Textarea
              id="rp-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              placeholder="Valfritt — t.ex. orsak till utbytet, garantier."
            />
          </div>
        </div>
      </NumberedSection>
    </div>
  );
}

/**
 * Editorial section layout: a monogram digit ("01") floats left of a
 * vertical spine, with the heading, description, and fields on the right.
 * All sections share the same spine via a left border on the content
 * column, so the page reads as one document rather than a stack of
 * separate cards. Last section drops its bottom padding.
 */
function NumberedSection({
  number,
  total,
  title,
  description,
  children,
  isLast,
}: {
  number: number;
  total: number;
  title: string;
  description: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <section className="flex gap-4 sm:gap-6">
      <div className="w-8 shrink-0 text-right sm:w-12">
        <span
          className="block font-light tabular-nums text-muted-foreground/70 sm:text-2xl"
          aria-hidden
        >
          {String(number).padStart(2, "0")}
        </span>
        <span className="sr-only">
          Avsnitt {number} av {total}:
        </span>
      </div>
      <div
        className={`flex-1 border-l pl-6 sm:pl-8 ${
          isLast ? "pb-2" : "pb-10"
        }`}
      >
        <div className="-mt-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

function DetailInput({
  row,
  value,
  onChange,
}: {
  row: DetailRow;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = `rp-detail-${row.key}`;
  if (row.input === "boolean") {
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{row.label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={inputId}>
            <SelectValue placeholder="Välj…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Ja</SelectItem>
            <SelectItem value="false">Nej</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{row.label}</Label>
      <Input
        id={inputId}
        type="text"
        inputMode={row.input === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={row.input === "number" ? "tabular-nums" : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review phase
// ---------------------------------------------------------------------------

function ReviewPhase({
  outgoing,
  elevatorNumber,
  manufacturer,
  buildYear,
  details,
  occurredAt,
  performedBy,
  cost,
  description,
}: {
  outgoing: OutgoingSummary;
  elevatorNumber: string;
  manufacturer: string;
  buildYear: number;
  details: NewDetails;
  occurredAt: string;
  performedBy: string;
  cost: string;
  description: string;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold tracking-tight">
          Granska utbytet
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kontrollera att uppgifterna stämmer. När du bekräftar arkiveras den
          befintliga hissens tidigare uppgifter på händelsen och den nya
          hissen tar över samma plats.
        </p>
      </section>

      <section className="rounded-md border">
        <div className="border-b px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Identitet
          </h3>
        </div>
        <dl className="divide-y text-sm">
          <ReviewRow
            label="Hissnummer"
            from={outgoing.elevatorNumber}
            to={elevatorNumber}
          />
          <ReviewRow
            label="Fabrikat"
            from={outgoing.manufacturer}
            to={manufacturer}
          />
          <ReviewRow
            label="Byggår"
            from={outgoing.buildYear}
            to={buildYear}
            numeric
          />
        </dl>
      </section>

      {DETAIL_GROUPS.map((group) => (
        <section key={group.label} className="rounded-md border">
          <div className="border-b px-4 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </h3>
          </div>
          <dl className="divide-y text-sm">
            {group.fields.map((row) => (
              <ReviewRow
                key={row.key}
                label={row.label}
                from={renderDisplay(row, outgoing.details[row.key])}
                to={renderDisplay(row, details[row.key])}
                numeric={row.input === "number"}
              />
            ))}
          </dl>
        </section>
      ))}

      <section className="rounded-md border">
        <div className="border-b px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Händelsens uppgifter
          </h3>
        </div>
        <dl className="divide-y text-sm">
          <ReviewMetaRow label="Datum" value={occurredAt || "—"} />
          <ReviewMetaRow label="Leverantör" value={performedBy || "—"} />
          <ReviewMetaRow
            label="Kostnad (SEK)"
            value={cost === "" ? "—" : cost}
            numeric
          />
          <ReviewMetaRow
            label="Anteckningar"
            value={description || "—"}
            multiline
          />
        </dl>
      </section>
    </div>
  );
}

function ReviewRow({
  label,
  from,
  to,
  numeric,
}: {
  label: string;
  from: unknown;
  to: unknown;
  numeric?: boolean;
}) {
  const fromStr = from == null || from === "" ? "—" : String(from);
  const toStr = to == null || to === "" ? "—" : String(to);
  const numericClass = numeric ? "tabular-nums" : "";
  const unchanged = fromStr === toStr;
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] items-baseline gap-3 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-muted-foreground line-through decoration-muted-foreground/40 ${numericClass}`}>
        {fromStr}
      </dd>
      <dd className={`font-medium ${numericClass}`}>
        {toStr}
        {unchanged && (
          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
            Oförändrat
          </span>
        )}
      </dd>
    </div>
  );
}

function ReviewMetaRow({
  label,
  value,
  numeric,
  multiline,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_2fr] items-baseline gap-3 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`${numeric ? "tabular-nums" : ""} ${
          multiline ? "whitespace-pre-wrap" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
