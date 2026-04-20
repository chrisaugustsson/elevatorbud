import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, ArrowRight, Search, Sparkles } from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Checkbox } from "@elevatorbud/ui/components/ui/checkbox";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  MODERNIZATION_FIELDS,
  MODERNIZATION_GROUPS,
  formatFieldValue,
  getFieldSpec,
  type ModernizationFieldGroup,
  type ModernizationFieldKey,
  type ModernizationFieldSpec,
} from "./modernization-fields";
import { DRAFT_TTL_MS } from "./draft-constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModernizationWizardSubmit = {
  occurredAt: string; // YYYY-MM-DD
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
  changes: Array<{
    field: ModernizationFieldKey;
    label: string;
    from: unknown;
    to: unknown;
  }>;
};

type CurrentValues = Partial<Record<ModernizationFieldKey, unknown>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elevatorId: string;
  /**
   * Current values of every modernization-eligible field on the elevator.
   * Typically `elevatorDetails` row from the route loader. Fields absent from
   * the object (or null) are treated as empty.
   */
  currentValues: CurrentValues;
  onSubmit: (values: ModernizationWizardSubmit) => Promise<void>;
};

type DraftShape = {
  step: 1 | 2;
  selected: ModernizationFieldKey[];
  newValues: Partial<Record<ModernizationFieldKey, string>>;
  occurredAt: string;
  description: string;
  cost: string;
  performedBy: string;
  savedAt: number;
};

// ---------------------------------------------------------------------------
// Draft persistence
// ---------------------------------------------------------------------------

const DRAFT_VERSION = 1;

const draftKey = (elevatorId: string) =>
  `modernization-draft:v${DRAFT_VERSION}:${elevatorId}`;

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
      // Expired — treat as if nothing was there and clean up.
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
    // localStorage can throw (quota / private mode) — draft persistence is
    // nice-to-have, not critical, so swallow.
  }
}

function clearDraft(elevatorId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(elevatorId));
  } catch {
    // See saveDraft.
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function stringifyCurrent(
  key: ModernizationFieldKey,
  value: unknown,
): string {
  if (value == null) return "";
  const spec = getFieldSpec(key);
  if (spec.input === "boolean") {
    return value === true || value === "true" ? "true" : "false";
  }
  return String(value);
}

function coerceTo(
  key: ModernizationFieldKey,
  raw: string,
): unknown {
  if (raw === "") return null;
  const spec = getFieldSpec(key);
  if (spec.input === "boolean") return raw === "true";
  if (spec.input === "number") {
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && (b == null || b === "")) return true;
  if (b == null && (a == null || a === "")) return true;
  return String(a ?? "") === String(b ?? "");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModernizationWizard({
  open,
  onOpenChange,
  elevatorId,
  currentValues,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<ModernizationFieldKey>>(
    () => new Set(),
  );
  const [newValues, setNewValues] = useState<
    Partial<Record<ModernizationFieldKey, string>>
  >({});
  const [filter, setFilter] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [occurredAtError, setOccurredAtError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const occurredAtRef = useRef<HTMLInputElement>(null);

  // Draft resume banner. Only shown once per dialog open.
  const [pendingDraft, setPendingDraft] = useState<DraftShape | null>(null);
  // Themed confirm-before-close dialog, swapped in for the old window.confirm
  // so the UX stays inside the app's design language.
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  // ── Reset on close, check draft on open ───────────────────────────────
  // Reset the moment the dialog closes rather than waiting until the next
  // open — this avoids a frame where step 1 briefly renders stale state
  // from the previous session before the useEffect fires. On subsequent
  // opens we only look for a draft; state is already clean.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      const draft = loadDraft(elevatorId);
      if (draft) setPendingDraft(draft);
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      setStep(1);
      setSelected(new Set());
      setNewValues({});
      setOccurredAt(todayIso());
      setDescription("");
      setCost("");
      setPerformedBy("");
      setFilter("");
      setOccurredAtError(null);
      setCostError(null);
      setPendingDraft(null);
      setConfirmCloseOpen(false);
    }
  }, [open, elevatorId]);

  // ── Draft autosave (debounced 500ms) ──────────────────────────────────
  const draftDirty =
    selected.size > 0 ||
    description.trim() !== "" ||
    cost.trim() !== "" ||
    performedBy.trim() !== "";

  useEffect(() => {
    if (!open || pendingDraft) return;
    if (!draftDirty) return;
    const handle = window.setTimeout(() => {
      saveDraft(elevatorId, {
        step,
        selected: Array.from(selected),
        newValues,
        occurredAt,
        description,
        cost,
        performedBy,
        savedAt: Date.now(),
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [
    open,
    pendingDraft,
    draftDirty,
    step,
    selected,
    newValues,
    occurredAt,
    description,
    cost,
    performedBy,
    elevatorId,
  ]);

  // ── Step 1: grouped, filtered field list ──────────────────────────────
  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const out: Array<{
      group: ModernizationFieldGroup;
      label: string;
      fields: readonly ModernizationFieldSpec[];
    }> = [];
    for (const g of MODERNIZATION_GROUPS) {
      const fields = MODERNIZATION_FIELDS.filter(
        (f) =>
          f.group === g.key &&
          (q === "" ||
            f.label.toLowerCase().includes(q) ||
            stringifyCurrent(f.key, currentValues[f.key])
              .toLowerCase()
              .includes(q)),
      );
      if (fields.length > 0) out.push({ group: g.key, label: g.label, fields });
    }
    return out;
  }, [filter, currentValues]);

  const toggleField = useCallback(
    (key: ModernizationFieldKey) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
          // Pre-fill new value with current (FR-12). User edits only what
          // actually changed; untouched rows get filtered out on submit.
          setNewValues((v) => ({
            ...v,
            [key]: stringifyCurrent(key, currentValues[key]),
          }));
        }
        return next;
      });
    },
    [currentValues],
  );

  const selectedCount = selected.size;

  // Ordered list of selected fields (stable by the declared order in
  // MODERNIZATION_FIELDS) for step 2.
  const selectedOrdered = useMemo(
    () => MODERNIZATION_FIELDS.filter((f) => selected.has(f.key)),
    [selected],
  );

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setOccurredAtError(null);
    setCostError(null);

    if (!occurredAt) {
      setOccurredAtError("Datum krävs");
      occurredAtRef.current?.focus();
      return;
    }

    let costNum: number | null = null;
    if (cost.trim() !== "") {
      const parsed = Number(cost.replace(",", "."));
      if (!Number.isFinite(parsed)) {
        setCostError("Ogiltig kostnad");
        return;
      }
      if (parsed < 0) {
        setCostError("Kostnad kan inte vara negativ");
        return;
      }
      costNum = parsed;
    }

    // Build the diff: only fields where the user actually changed the value
    // from its pre-filled current value. FR-13: no-change rows are silently
    // filtered out.
    const changes: ModernizationWizardSubmit["changes"] = [];
    for (const spec of selectedOrdered) {
      const rawNew = newValues[spec.key] ?? "";
      const coercedNew = coerceTo(spec.key, rawNew);
      if (valuesEqual(coercedNew, currentValues[spec.key])) continue;
      changes.push({
        field: spec.key,
        label: spec.label,
        from: currentValues[spec.key] ?? null,
        to: coercedNew,
      });
    }

    if (changes.length === 0) {
      setOccurredAtError(null);
      setCostError(
        "Minst ett fält måste ha ett nytt värde. Gå tillbaka och välj bort oförändrade fält.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        occurredAt,
        description: description.trim() || null,
        cost: costNum,
        performedBy: performedBy.trim() || null,
        changes,
      });
      clearDraft(elevatorId);
      onOpenChange(false);
    } catch {
      // Parent shows the toast; keep the wizard open with the user's input.
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestoreDraft() {
    if (!pendingDraft) return;
    setStep(pendingDraft.step);
    setSelected(new Set(pendingDraft.selected));
    setNewValues(pendingDraft.newValues);
    setOccurredAt(pendingDraft.occurredAt || todayIso());
    setDescription(pendingDraft.description);
    setCost(pendingDraft.cost);
    setPerformedBy(pendingDraft.performedBy);
    setPendingDraft(null);
  }

  function handleDiscardDraft() {
    clearDraft(elevatorId);
    setPendingDraft(null);
    setStep(1);
    setSelected(new Set());
    setNewValues({});
    setOccurredAt(todayIso());
    setDescription("");
    setCost("");
    setPerformedBy("");
  }

  // Confirm-on-dismiss: only nag when there's unsaved work in play.
  // Rendered inline inside the same DialogContent — no nested dialog.
  function handleDialogOpenChange(next: boolean) {
    if (!next) {
      // If the confirm panel is already showing, treat Esc / X / overlay-
      // click as "Stanna kvar" (go back to editing) rather than stacking
      // another open/close cycle.
      if (confirmCloseOpen) {
        setConfirmCloseOpen(false);
        return;
      }
      if (draftDirty && !pendingDraft) {
        setConfirmCloseOpen(true);
        return;
      }
    }
    onOpenChange(next);
  }

  function confirmCloseSaveDraft() {
    // Draft is already autosaved — nothing to do beyond closing.
    setConfirmCloseOpen(false);
    onOpenChange(false);
  }

  function confirmCloseDiscard() {
    clearDraft(elevatorId);
    setConfirmCloseOpen(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        {/* Confirm-close renders inline INSIDE the same DialogContent
            (not as a nested Dialog) so we don't stack two overlays or
            two close buttons on top of each other. When active, the
            header + steps + footer are replaced by a focused panel. */}
        {confirmCloseOpen ? (
          <ConfirmClosePanel
            onStay={() => setConfirmCloseOpen(false)}
            onDiscard={confirmCloseDiscard}
            onSaveDraft={confirmCloseSaveDraft}
          />
        ) : (
          <>
            <DialogHeader className="space-y-3 px-6 pt-6">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Sparkles className="size-4" aria-hidden />
                </div>
                <DialogTitle>Registrera modernisering</DialogTitle>
              </div>
              <DialogDescription>
                {step === 1
                  ? "Steg 1 av 2 — Välj fält som ändrats"
                  : "Steg 2 av 2 — Ange nya värden"}
              </DialogDescription>
              <ProgressBar step={step} />
            </DialogHeader>

            {pendingDraft && (
              <DraftResumeBanner
                draft={pendingDraft}
                onRestore={handleRestoreDraft}
                onDiscard={handleDiscardDraft}
              />
            )}

            {step === 1 && !pendingDraft && (
              <Step1
                filter={filter}
                onFilterChange={setFilter}
                grouped={grouped}
                selected={selected}
                currentValues={currentValues}
                onToggle={toggleField}
              />
            )}

            {step === 2 && !pendingDraft && (
              <Step2
                selectedFields={selectedOrdered}
                currentValues={currentValues}
                newValues={newValues}
                onNewValueChange={(key, value) =>
                  setNewValues((prev) => ({ ...prev, [key]: value }))
                }
                occurredAt={occurredAt}
                onOccurredAtChange={setOccurredAt}
                occurredAtError={occurredAtError}
                occurredAtRef={occurredAtRef}
                description={description}
                onDescriptionChange={setDescription}
                cost={cost}
                onCostChange={setCost}
                costError={costError}
                performedBy={performedBy}
                onPerformedByChange={setPerformedBy}
              />
            )}

            {!pendingDraft && (
              <WizardFooter
                step={step}
                selectedCount={selectedCount}
                submitting={submitting}
                onCancel={() => handleDialogOpenChange(false)}
                onBack={() => setStep(1)}
                onNext={() => setStep(2)}
                onSubmit={handleSubmit}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline confirm panel shown when the user tries to close a dirty wizard.
 * Lives inside the same DialogContent as the wizard itself — no nested
 * dialog, no stacked overlays, no competing close buttons. The wizard's
 * own title bar / X close still work: clicking them triggers the same
 * path that opened this panel, so dismissing via X behaves as "Stanna
 * kvar" (the blocker stays engaged).
 */
function ConfirmClosePanel({
  onStay,
  onDiscard,
  onSaveDraft,
}: {
  onStay: () => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 px-6 py-8">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Stäng moderniseringen?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Du har osparade ändringar. Spara ett utkast för att fortsätta senare,
          släng ändringarna, eller stanna kvar och fortsätt redigera.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onStay}>
          Stanna kvar
        </Button>
        <Button variant="outline" onClick={onDiscard}>
          Släng ändringar
        </Button>
        <Button onClick={onSaveDraft}>Spara utkast &amp; stäng</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex h-1 gap-1" aria-hidden>
      <div className="flex-1 rounded-full bg-primary" />
      <div
        className={`flex-1 rounded-full transition-colors ${
          step === 2 ? "bg-primary" : "bg-muted"
        }`}
      />
    </div>
  );
}

function DraftResumeBanner({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: DraftShape;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const savedAgo = relativeSavedAgo(draft.savedAt);
  const n = draft.selected.length;
  // "fält" is invariant in Swedish (sg = pl); only the participle changes:
  // 1 fält valt / N fält valda.
  const fieldsLabel = n === 1 ? "1 fält valt" : `${n} fält valda`;
  return (
    <div className="border-b bg-muted/40 px-6 py-4">
      <p className="text-sm font-medium">Fortsätt där du slutade?</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Ett utkast sparades {savedAgo} ({fieldsLabel}).
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onRestore}>
          Återställ utkast
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Börja om
        </Button>
      </div>
    </div>
  );
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

function Step1({
  filter,
  onFilterChange,
  grouped,
  selected,
  currentValues,
  onToggle,
}: {
  filter: string;
  onFilterChange: (v: string) => void;
  grouped: Array<{
    group: ModernizationFieldGroup;
    label: string;
    fields: readonly ModernizationFieldSpec[];
  }>;
  selected: Set<ModernizationFieldKey>;
  currentValues: CurrentValues;
  onToggle: (key: ModernizationFieldKey) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 border-b bg-background px-6 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Sök fält…"
            className="pl-9"
            aria-label="Sök fält"
          />
        </div>
      </div>

      <div className="divide-y">
        {grouped.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            Inga fält matchar sökningen.
          </p>
        )}
        {grouped.map(({ group, label, fields }) => {
          const countInGroup = fields.filter((f) => selected.has(f.key)).length;
          return (
            <section key={group} className="px-6 py-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {label}
                {countInGroup > 0 && (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold tabular-nums text-primary">
                    {countInGroup}
                  </span>
                )}
              </h3>
              <ul className="space-y-1">
                {fields.map((spec) => {
                  const checked = selected.has(spec.key);
                  const current = formatFieldValue(
                    spec.key,
                    currentValues[spec.key],
                  );
                  const inputId = `mod-field-${spec.key}`;
                  return (
                    <li key={spec.key}>
                      <label
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50 ${
                          checked ? "bg-muted/40" : ""
                        }`}
                      >
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={() => onToggle(spec.key)}
                        />
                        <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium">{spec.label}</span>
                          <span
                            className={`truncate text-xs ${
                              spec.input === "number"
                                ? "tabular-nums"
                                : ""
                            } text-muted-foreground`}
                          >
                            {current}
                          </span>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  selectedFields,
  currentValues,
  newValues,
  onNewValueChange,
  occurredAt,
  onOccurredAtChange,
  occurredAtError,
  occurredAtRef,
  description,
  onDescriptionChange,
  cost,
  onCostChange,
  costError,
  performedBy,
  onPerformedByChange,
}: {
  selectedFields: ModernizationFieldSpec[];
  currentValues: CurrentValues;
  newValues: Partial<Record<ModernizationFieldKey, string>>;
  onNewValueChange: (key: ModernizationFieldKey, value: string) => void;
  occurredAt: string;
  onOccurredAtChange: (v: string) => void;
  occurredAtError: string | null;
  occurredAtRef: React.RefObject<HTMLInputElement | null>;
  description: string;
  onDescriptionChange: (v: string) => void;
  cost: string;
  onCostChange: (v: string) => void;
  costError: string | null;
  performedBy: string;
  onPerformedByChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
      <p className="text-xs text-muted-foreground">
        Värdena är förifyllda. Ändra endast de fält som faktiskt förändrats —
        oförändrade rader sparas inte som ändringar.
      </p>

      <div className="space-y-3">
        {selectedFields.map((spec) => (
          <DiffRow
            key={spec.key}
            spec={spec}
            currentValue={currentValues[spec.key]}
            newValue={newValues[spec.key] ?? ""}
            onChange={(v) => onNewValueChange(spec.key, v)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mod-description">Anteckningar</Label>
        <Textarea
          id="mod-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          placeholder="Valfritt — leverantör, garanti, särskilda omständigheter."
        />
      </div>

      <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mod-occurredAt">
            Datum <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={occurredAtRef}
            id="mod-occurredAt"
            type="date"
            value={occurredAt}
            onChange={(e) => onOccurredAtChange(e.target.value)}
            aria-invalid={occurredAtError != null}
          />
          {occurredAtError && (
            <p className="text-sm text-destructive">{occurredAtError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="mod-cost">Kostnad (SEK)</Label>
          <Input
            id="mod-cost"
            type="text"
            inputMode="decimal"
            value={cost}
            onChange={(e) => onCostChange(e.target.value)}
            placeholder="t.ex. 120000"
            className="tabular-nums"
            aria-invalid={costError != null}
          />
          {costError && (
            <p className="text-sm text-destructive">{costError}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="mod-performedBy">Leverantör</Label>
          <Input
            id="mod-performedBy"
            value={performedBy}
            onChange={(e) => onPerformedByChange(e.target.value)}
            placeholder="Företagsnamn"
          />
        </div>
      </div>
    </div>
  );
}

function DiffRow({
  spec,
  currentValue,
  newValue,
  onChange,
}: {
  spec: ModernizationFieldSpec;
  currentValue: unknown;
  newValue: string;
  onChange: (v: string) => void;
}) {
  const unchanged = valuesEqual(coerceTo(spec.key, newValue), currentValue);
  const currentRendered = formatFieldValue(spec.key, currentValue);
  const numericClass = spec.input === "number" ? "tabular-nums" : "";
  const inputId = `mod-new-${spec.key}`;

  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border bg-card p-3 sm:grid-cols-[1fr_auto_1fr]">
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {spec.label}
        </Label>
        <p
          className={`text-xs text-muted-foreground ${numericClass}`}
          title={currentRendered}
        >
          Nu: <span className="font-mono">{currentRendered}</span>
        </p>
      </div>

      <div
        className="hidden items-center justify-center text-sm text-muted-foreground sm:flex"
        aria-hidden
      >
        →
      </div>

      <div className="space-y-1">
        {spec.input === "boolean" ? (
          <Select value={newValue} onValueChange={onChange}>
            <SelectTrigger id={inputId}>
              <SelectValue placeholder="Välj…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Ja</SelectItem>
              <SelectItem value="false">Nej</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={inputId}
            type="text"
            inputMode={spec.input === "number" ? "decimal" : undefined}
            value={newValue}
            onChange={(e) => onChange(e.target.value)}
            className={numericClass}
            placeholder="Nytt värde"
          />
        )}
        {unchanged && (
          <p className="text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium">
              Ingen ändring
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function WizardFooter({
  step,
  selectedCount,
  submitting,
  onCancel,
  onBack,
  onNext,
  onSubmit,
}: {
  step: 1 | 2;
  selectedCount: number;
  submitting: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
      {step === 1 ? (
        <>
          <p className="text-xs text-muted-foreground">
            {selectedCount === 0
              ? "Välj minst ett fält för att fortsätta"
              : `${selectedCount} ${selectedCount === 1 ? "fält valt" : "fält valda"}`}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Avbryt
            </Button>
            <Button onClick={onNext} disabled={selectedCount === 0}>
              Nästa
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1.5 size-4" />
            Tillbaka
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Avbryt
            </Button>
            <Button onClick={onSubmit} disabled={submitting}>
              {submitting ? "Sparar…" : "Spara"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
