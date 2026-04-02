import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Switch } from "@elevatorbud/ui/components/ui/switch";
import { Combobox } from "@elevatorbud/ui/components/ui/combobox";
import {
  Building2,
  ArrowLeft,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  CheckCircle2,
  Phone,
  MessageSquare,
  Save,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import {
  getDraftKey,
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
} from "../../lib/form-persistence";

export const Route = createFileRoute("/_authenticated/hiss/$id/redigera")({
  component: RedigeraHiss,
});

type HissFormValues = {
  organisation_id: string;
  hissnummer: string;
  adress: string;
  hissbeteckning: string;
  distrikt: string;
  hisstyp: string;
  fabrikat: string;
  byggar: string;
  hastighet: string;
  lyfthojd: string;
  marklast: string;
  antal_plan: string;
  antal_dorrar: string;
  typ_dorrar: string;
  genomgang: boolean;
  kollektiv: string;
  korgstorlek: string;
  dagoppning: string;
  barbeslag: string;
  dorrmaskin: string;
  drivsystem: string;
  upphangning: string;
  maskinplacering: string;
  typ_maskin: string;
  typ_styrsystem: string;
  besiktningsorgan: string;
  besiktningsmanad: string;
  skotselforetag: string;
  schaktbelysning: string;
  moderniserar: string;
  garanti: boolean;
  rekommenderat_moderniserar: string;
  budget_belopp: string;
  atgarder_vid_modernisering: string;
  har_nodtelefon: boolean;
  nodtelefon_modell: string;
  nodtelefon_typ: string;
  behover_uppgradering: boolean;
  nodtelefon_pris: string;
  kommentarer: string;
};

const emptyValues: HissFormValues = {
  organisation_id: "",
  hissnummer: "",
  adress: "",
  hissbeteckning: "",
  distrikt: "",
  hisstyp: "",
  fabrikat: "",
  byggar: "",
  hastighet: "",
  lyfthojd: "",
  marklast: "",
  antal_plan: "",
  antal_dorrar: "",
  typ_dorrar: "",
  genomgang: false,
  kollektiv: "",
  korgstorlek: "",
  dagoppning: "",
  barbeslag: "",
  dorrmaskin: "",
  drivsystem: "",
  upphangning: "",
  maskinplacering: "",
  typ_maskin: "",
  typ_styrsystem: "",
  besiktningsorgan: "",
  besiktningsmanad: "",
  skotselforetag: "",
  schaktbelysning: "",
  moderniserar: "",
  garanti: false,
  rekommenderat_moderniserar: "",
  budget_belopp: "",
  atgarder_vid_modernisering: "",
  har_nodtelefon: false,
  nodtelefon_modell: "",
  nodtelefon_typ: "",
  behover_uppgradering: false,
  nodtelefon_pris: "",
  kommentarer: "",
};

// Helper to extract the form instance type from useForm
function _hissFormTypeHelper() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useForm({ defaultValues: emptyValues });
}
type HissForm = ReturnType<typeof _hissFormTypeHelper>;

function useSuggestions(kategori: string): string[] {
  const data = useQuery(api.forslagsvarden.list, { kategori });
  if (!data) return [];
  return data
    .filter((d: { aktiv: boolean }) => d.aktiv)
    .map((d: { varde: string }) => d.varde);
}

function toOptionalString(val: string): string | undefined {
  return val.trim() === "" ? undefined : val.trim();
}

function toOptionalNumber(val: string): number | undefined {
  const trimmed = val.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  return Number.isNaN(num) ? undefined : num;
}

/** Convert server hiss document to form values (numbers → strings, undefined → "") */
function serverToFormValues(hiss: Record<string, unknown>): HissFormValues {
  return {
    organisation_id: (hiss.organisation_id as string) ?? "",
    hissnummer: (hiss.hissnummer as string) ?? "",
    adress: (hiss.adress as string) ?? "",
    hissbeteckning: (hiss.hissbeteckning as string) ?? "",
    distrikt: (hiss.distrikt as string) ?? "",
    hisstyp: (hiss.hisstyp as string) ?? "",
    fabrikat: (hiss.fabrikat as string) ?? "",
    byggar: hiss.byggar != null ? String(hiss.byggar) : "",
    hastighet: (hiss.hastighet as string) ?? "",
    lyfthojd: (hiss.lyfthojd as string) ?? "",
    marklast: (hiss.marklast as string) ?? "",
    antal_plan: hiss.antal_plan != null ? String(hiss.antal_plan) : "",
    antal_dorrar: hiss.antal_dorrar != null ? String(hiss.antal_dorrar) : "",
    typ_dorrar: (hiss.typ_dorrar as string) ?? "",
    genomgang: (hiss.genomgang as boolean) ?? false,
    kollektiv: (hiss.kollektiv as string) ?? "",
    korgstorlek: (hiss.korgstorlek as string) ?? "",
    dagoppning: (hiss.dagoppning as string) ?? "",
    barbeslag: (hiss.barbeslag as string) ?? "",
    dorrmaskin: (hiss.dorrmaskin as string) ?? "",
    drivsystem: (hiss.drivsystem as string) ?? "",
    upphangning: (hiss.upphangning as string) ?? "",
    maskinplacering: (hiss.maskinplacering as string) ?? "",
    typ_maskin: (hiss.typ_maskin as string) ?? "",
    typ_styrsystem: (hiss.typ_styrsystem as string) ?? "",
    besiktningsorgan: (hiss.besiktningsorgan as string) ?? "",
    besiktningsmanad: (hiss.besiktningsmanad as string) ?? "",
    skotselforetag: (hiss.skotselforetag as string) ?? "",
    schaktbelysning: (hiss.schaktbelysning as string) ?? "",
    moderniserar: (hiss.moderniserar as string) ?? "",
    garanti: (hiss.garanti as boolean) ?? false,
    rekommenderat_moderniserar:
      (hiss.rekommenderat_moderniserar as string) ?? "",
    budget_belopp:
      hiss.budget_belopp != null ? String(hiss.budget_belopp) : "",
    atgarder_vid_modernisering:
      (hiss.atgarder_vid_modernisering as string) ?? "",
    har_nodtelefon: (hiss.har_nodtelefon as boolean) ?? false,
    nodtelefon_modell: (hiss.nodtelefon_modell as string) ?? "",
    nodtelefon_typ: (hiss.nodtelefon_typ as string) ?? "",
    behover_uppgradering: (hiss.behover_uppgradering as boolean) ?? false,
    nodtelefon_pris:
      hiss.nodtelefon_pris != null ? String(hiss.nodtelefon_pris) : "",
    kommentarer: (hiss.kommentarer as string) ?? "",
  };
}

/** Check if a field value has changed from the original */
function isChanged(
  key: keyof HissFormValues,
  current: HissFormValues,
  original: HissFormValues,
): boolean {
  const cur = current[key];
  const orig = original[key];
  if (typeof cur === "boolean") return cur !== orig;
  return (cur ?? "").toString().trim() !== (orig ?? "").toString().trim();
}

const BESIKTNINGSMANADER = [
  "Januari",
  "Februari",
  "Mars",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "Augusti",
  "September",
  "Oktober",
  "November",
  "December",
] as const;

function RedigeraHiss() {
  const { id } = Route.useParams();
  const hiss = useQuery(api.hissar.get, { id: id as never });
  const orgs = useQuery(api.organisationer.list);
  const updateHiss = useMutation(api.hissar.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const draftKey = getDraftKey(id);

  // Original values from server — set once on load
  const [originalValues, setOriginalValues] =
    useState<HissFormValues | null>(null);

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }
        await updateHiss({
          id: id as never,
          hissnummer: value.hissnummer,
          organisation_id: value.organisation_id as never,
          adress: toOptionalString(value.adress),
          hissbeteckning: toOptionalString(value.hissbeteckning),
          distrikt: toOptionalString(value.distrikt),
          hisstyp: toOptionalString(value.hisstyp),
          fabrikat: toOptionalString(value.fabrikat),
          byggar: toOptionalNumber(value.byggar),
          hastighet: toOptionalString(value.hastighet),
          lyfthojd: toOptionalString(value.lyfthojd),
          marklast: toOptionalString(value.marklast),
          antal_plan: toOptionalNumber(value.antal_plan),
          antal_dorrar: toOptionalNumber(value.antal_dorrar),
          typ_dorrar: toOptionalString(value.typ_dorrar),
          genomgang: value.genomgang || undefined,
          kollektiv: toOptionalString(value.kollektiv),
          korgstorlek: toOptionalString(value.korgstorlek),
          dagoppning: toOptionalString(value.dagoppning),
          barbeslag: toOptionalString(value.barbeslag),
          dorrmaskin: toOptionalString(value.dorrmaskin),
          drivsystem: toOptionalString(value.drivsystem),
          upphangning: toOptionalString(value.upphangning),
          maskinplacering: toOptionalString(value.maskinplacering),
          typ_maskin: toOptionalString(value.typ_maskin),
          typ_styrsystem: toOptionalString(value.typ_styrsystem),
          besiktningsorgan: toOptionalString(value.besiktningsorgan),
          besiktningsmanad: toOptionalString(value.besiktningsmanad),
          skotselforetag: toOptionalString(value.skotselforetag),
          schaktbelysning: toOptionalString(value.schaktbelysning),
          moderniserar: toOptionalString(value.moderniserar),
          garanti: value.garanti || undefined,
          rekommenderat_moderniserar: toOptionalString(
            value.rekommenderat_moderniserar,
          ),
          budget_belopp: toOptionalNumber(value.budget_belopp),
          atgarder_vid_modernisering: toOptionalString(
            value.atgarder_vid_modernisering,
          ),
          har_nodtelefon: value.har_nodtelefon || undefined,
          nodtelefon_modell: toOptionalString(value.nodtelefon_modell),
          nodtelefon_typ: toOptionalString(value.nodtelefon_typ),
          behover_uppgradering: value.behover_uppgradering || undefined,
          nodtelefon_pris: toOptionalNumber(value.nodtelefon_pris),
          kommentarer: toOptionalString(value.kommentarer),
        });
        clearDraft(draftKey);
        setSubmitSuccess(true);
        // Update original values to current after save
        setOriginalValues({ ...value });
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message === "OFFLINE" || err.message.includes("fetch"))
        ) {
          setSubmitError(
            "Ingen uppkoppling \u2014 f\u00f6rs\u00f6k igen n\u00e4r du har n\u00e4t",
          );
        } else {
          setSubmitError(
            err instanceof Error ? err.message : "Ett ov\u00e4ntat fel uppstod",
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Initialize form from server data (or draft)
  useEffect(() => {
    if (!hiss || initialized) return;

    const serverVals = serverToFormValues(hiss as Record<string, unknown>);
    setOriginalValues(serverVals);

    // Check for draft
    if (hasDraft(draftKey)) {
      setDraftPromptVisible(true);
      // Still set form to server values initially
      for (const [key, value] of Object.entries(serverVals)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    } else {
      for (const [key, value] of Object.entries(serverVals)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    }
    setInitialized(true);
  }, [hiss, initialized, draftKey, form]);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft<HissFormValues>(draftKey);
    if (draft) {
      for (const [key, value] of Object.entries(draft.values)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    }
    setDraftPromptVisible(false);
  }, [draftKey, form]);

  const dismissDraft = useCallback(() => {
    clearDraft(draftKey);
    setDraftPromptVisible(false);
  }, [draftKey]);

  // Auto-save form state to localStorage (debounced 500ms)
  const formValues = form.state.values;
  useEffect(() => {
    if (!initialized || submitSuccess || draftPromptVisible) return;
    const timer = setTimeout(() => {
      // Only save if there are changes from original
      if (!originalValues) return;
      const hasChanges = (
        Object.keys(originalValues) as Array<keyof HissFormValues>
      ).some((key) => isChanged(key, formValues, originalValues));
      if (hasChanges) {
        saveDraft(draftKey, formValues);
        setDraftSavedVisible(true);
        if (draftSavedTimerRef.current)
          clearTimeout(draftSavedTimerRef.current);
        draftSavedTimerRef.current = setTimeout(
          () => setDraftSavedVisible(false),
          2000,
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    formValues,
    draftKey,
    initialized,
    submitSuccess,
    draftPromptVisible,
    originalValues,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

  // Count changed fields
  const changedCount = useMemo(() => {
    if (!originalValues) return 0;
    return (
      Object.keys(originalValues) as Array<keyof HissFormValues>
    ).filter((key) => isChanged(key, formValues, originalValues)).length;
  }, [formValues, originalValues]);

  // Loading state
  if (!hiss || !initialized) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Success confirmation
  if (submitSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-semibold">\u00c4ndringar sparade!</h2>
          <p className="text-muted-foreground">
            Hiss {(hiss as { hissnummer: string }).hissnummer} har uppdaterats.
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/sok">
              <Button variant="outline" className="h-12 text-base">
                <ArrowLeft className="mr-1 size-5" />
                Tillbaka till s\u00f6k
              </Button>
            </Link>
            <Button
              className="h-12 text-base"
              onClick={() => setSubmitSuccess(false)}
            >
              Forts\u00e4tt redigera
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Draft restore prompt */}
      {draftPromptVisible && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
          <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            Du har ett sparat utkast. Vill du forts\u00e4tta d\u00e4r du slutade?
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-9" onClick={restoreDraft}>
              \u00c5terst\u00e4ll utkast
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={dismissDraft}
            >
              Anv\u00e4nd serverdata
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/sok">
              <Button variant="ghost" size="sm" className="h-9 px-2">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Redigera hiss</h1>
              <p className="text-sm text-muted-foreground">
                {(hiss as { hissnummer: string }).hissnummer}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draftSavedVisible && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in">
                <Save className="size-3" />
                Utkast sparat
              </span>
            )}
            {changedCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {changedCount} \u00e4ndr{changedCount === 1 ? "ing" : "ingar"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="space-y-6">
          {/* Organisation */}
          <form.Field name="organisation_id">
            {(field) => (
              <div
                className={cn(
                  "space-y-1.5 rounded-md p-3",
                  originalValues &&
                    isChanged("organisation_id", formValues, originalValues) &&
                    "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                )}
              >
                <Label className="text-sm text-muted-foreground">
                  <Building2 className="mr-1 inline size-4" />
                  Organisation
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="V\u00e4lj organisation..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs?.map((org: { _id: string; namn: string }) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.namn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* Section 1: Identifiering */}
          <EditSection title="1. Identifiering">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("hissnummer", formValues, originalValues)
              }
            >
              <form.Field name="hissnummer">
                {(field) => (
                  <HissnummerField field={field} currentHissId={id} />
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("adress", formValues, originalValues)
              }
            >
              <form.Field name="adress">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="adress">Adress</Label>
                    <Input
                      id="adress"
                      className="h-11"
                      placeholder="Gatuadress..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="hissbeteckning"
              label="Hissbeteckning"
              kategori="hissbeteckning"
              placeholder="V\u00e4lj eller ange beteckning..."
              changed={
                !!originalValues &&
                isChanged("hissbeteckning", formValues, originalValues)
              }
            />

            <ComboboxField
              form={form}
              name="distrikt"
              label="Distrikt"
              kategori="distrikt"
              placeholder="V\u00e4lj eller ange distrikt..."
              changed={
                !!originalValues &&
                isChanged("distrikt", formValues, originalValues)
              }
            />
          </EditSection>

          {/* Section 2: Teknisk specifikation */}
          <EditSection title="2. Teknisk specifikation">
            <ComboboxField
              form={form}
              name="hisstyp"
              label="Hisstyp"
              kategori="hisstyp"
              placeholder="V\u00e4lj eller ange hisstyp..."
              changed={
                !!originalValues &&
                isChanged("hisstyp", formValues, originalValues)
              }
            />

            <ComboboxField
              form={form}
              name="fabrikat"
              label="Fabrikat"
              kategori="fabrikat"
              placeholder="V\u00e4lj eller ange fabrikat..."
              changed={
                !!originalValues &&
                isChanged("fabrikat", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("byggar", formValues, originalValues)
              }
            >
              <form.Field name="byggar">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="byggar">Bygg\u00e5r</Label>
                    <Input
                      id="byggar"
                      className="h-11"
                      type="number"
                      inputMode="numeric"
                      placeholder="t.ex. 1985"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("hastighet", formValues, originalValues)
                }
              >
                <form.Field name="hastighet">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="hastighet">Hastighet</Label>
                      <Input
                        id="hastighet"
                        className="h-11"
                        placeholder="m/s"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("lyfthojd", formValues, originalValues)
                }
              >
                <form.Field name="lyfthojd">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="lyfthojd">Lyfth\u00f6jd</Label>
                      <Input
                        id="lyfthojd"
                        className="h-11"
                        placeholder="meter"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>
            </div>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("marklast", formValues, originalValues)
              }
            >
              <form.Field name="marklast">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="marklast">Marklast</Label>
                    <Input
                      id="marklast"
                      className="h-11"
                      placeholder="t.ex. 500*6 (kg*personer)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("antal_plan", formValues, originalValues)
                }
              >
                <form.Field name="antal_plan">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="antal_plan">Antal plan</Label>
                      <Input
                        id="antal_plan"
                        className="h-11"
                        type="number"
                        inputMode="numeric"
                        placeholder="Antal"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("antal_dorrar", formValues, originalValues)
                }
              >
                <form.Field name="antal_dorrar">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="antal_dorrar">Antal d\u00f6rrar</Label>
                      <Input
                        id="antal_dorrar"
                        className="h-11"
                        type="number"
                        inputMode="numeric"
                        placeholder="Antal"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 3: D\u00f6rrar och korg */}
          <EditSection title="3. D\u00f6rrar och korg">
            <ComboboxField
              form={form}
              name="typ_dorrar"
              label="Typ d\u00f6rrar"
              kategori="typ_dorrar"
              placeholder="V\u00e4lj eller ange d\u00f6rrtyp..."
              changed={
                !!originalValues &&
                isChanged("typ_dorrar", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("genomgang", formValues, originalValues)
              }
            >
              <form.Field name="genomgang">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor="genomgang" className="cursor-pointer">
                      Genomg\u00e5ng
                    </Label>
                    <Switch
                      id="genomgang"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="kollektiv"
              label="Kollektiv"
              kategori="kollektiv"
              placeholder="V\u00e4lj eller ange kollektiv..."
              changed={
                !!originalValues &&
                isChanged("kollektiv", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("korgstorlek", formValues, originalValues)
              }
            >
              <form.Field name="korgstorlek">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="korgstorlek">Korgstorlek</Label>
                    <Input
                      id="korgstorlek"
                      className="h-11"
                      placeholder="t.ex. 1000*2050*2300 (B*D*H mm)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("dagoppning", formValues, originalValues)
              }
            >
              <form.Field name="dagoppning">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="dagoppning">Dag\u00f6ppning</Label>
                    <Input
                      id="dagoppning"
                      className="h-11"
                      placeholder="t.ex. 900*2000 (B*H mm)"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("barbeslag", formValues, originalValues)
                }
              >
                <form.Field name="barbeslag">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="barbeslag">B\u00e4rbeslag</Label>
                      <Input
                        id="barbeslag"
                        className="h-11"
                        placeholder="Typ..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("dorrmaskin", formValues, originalValues)
                }
              >
                <form.Field name="dorrmaskin">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="dorrmaskin">D\u00f6rrmaskin</Label>
                      <Input
                        id="dorrmaskin"
                        className="h-11"
                        placeholder="Typ..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 4: Maskineri */}
          <EditSection title="4. Maskineri">
            <ComboboxField
              form={form}
              name="drivsystem"
              label="Drivsystem"
              kategori="drivsystem"
              placeholder="V\u00e4lj eller ange drivsystem..."
              changed={
                !!originalValues &&
                isChanged("drivsystem", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("upphangning", formValues, originalValues)
              }
            >
              <form.Field name="upphangning">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="upphangning">Upph\u00e4ngning</Label>
                    <Input
                      id="upphangning"
                      className="h-11"
                      placeholder="Ange upph\u00e4ngning..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="maskinplacering"
              label="Maskinplacering"
              kategori="maskinplacering"
              placeholder="V\u00e4lj eller ange maskinplacering..."
              changed={
                !!originalValues &&
                isChanged("maskinplacering", formValues, originalValues)
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("typ_maskin", formValues, originalValues)
                }
              >
                <form.Field name="typ_maskin">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="typ_maskin">Typ maskin</Label>
                      <Input
                        id="typ_maskin"
                        className="h-11"
                        placeholder="Typ..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("typ_styrsystem", formValues, originalValues)
                }
              >
                <form.Field name="typ_styrsystem">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="typ_styrsystem">Typ styrsystem</Label>
                      <Input
                        id="typ_styrsystem"
                        className="h-11"
                        placeholder="Typ..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )}
                </form.Field>
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 5: Besiktning och underh\u00e5ll */}
          <EditSection title="5. Besiktning och underh\u00e5ll">
            <ComboboxField
              form={form}
              name="besiktningsorgan"
              label="Besiktningsorgan"
              kategori="besiktningsorgan"
              placeholder="V\u00e4lj eller ange besiktningsorgan..."
              changed={
                !!originalValues &&
                isChanged("besiktningsorgan", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("besiktningsmanad", formValues, originalValues)
              }
            >
              <form.Field name="besiktningsmanad">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label>Besiktningsm\u00e5nad</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="V\u00e4lj m\u00e5nad..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BESIKTNINGSMANADER.map((manad) => (
                          <SelectItem key={manad} value={manad}>
                            {manad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="skotselforetag"
              label="Sk\u00f6tself\u00f6retag"
              kategori="skotselforetag"
              placeholder="V\u00e4lj eller ange sk\u00f6tself\u00f6retag..."
              changed={
                !!originalValues &&
                isChanged("skotselforetag", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("schaktbelysning", formValues, originalValues)
              }
            >
              <form.Field name="schaktbelysning">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="schaktbelysning">Schaktbelysning</Label>
                    <Input
                      id="schaktbelysning"
                      className="h-11"
                      placeholder="Ange schaktbelysning..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>
          </EditSection>

          {/* Section 6: Modernisering */}
          <EditSection title="6. Modernisering">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("moderniserar", formValues, originalValues)
              }
            >
              <form.Field name="moderniserar">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="moderniserar">Moderniserings\u00e5r</Label>
                    <Input
                      id="moderniserar"
                      className="h-11"
                      placeholder="t.ex. 2007 eller Ej ombyggd"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("garanti", formValues, originalValues)
              }
            >
              <form.Field name="garanti">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor="garanti" className="cursor-pointer">
                      Garanti
                    </Label>
                    <Switch
                      id="garanti"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged(
                  "rekommenderat_moderniserar",
                  formValues,
                  originalValues,
                )
              }
            >
              <form.Field name="rekommenderat_moderniserar">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="rekommenderat_moderniserar">
                      Rekommenderat moderniserings\u00e5r
                    </Label>
                    <Input
                      id="rekommenderat_moderniserar"
                      className="h-11"
                      placeholder="t.ex. 2030"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("budget_belopp", formValues, originalValues)
              }
            >
              <form.Field name="budget_belopp">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="budget_belopp">Budget belopp</Label>
                    <Input
                      id="budget_belopp"
                      className="h-11"
                      type="number"
                      inputMode="numeric"
                      placeholder="SEK"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="atgarder_vid_modernisering"
              label="\u00c5tg\u00e4rder vid modernisering"
              kategori="atgarder_vid_modernisering"
              placeholder="V\u00e4lj eller ange \u00e5tg\u00e4rder..."
              changed={
                !!originalValues &&
                isChanged(
                  "atgarder_vid_modernisering",
                  formValues,
                  originalValues,
                )
              }
            />
          </EditSection>

          {/* Section 7: N\u00f6dtelefon */}
          <EditSection title="7. N\u00f6dtelefon">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("har_nodtelefon", formValues, originalValues)
              }
            >
              <form.Field name="har_nodtelefon">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor="har_nodtelefon" className="cursor-pointer">
                      <Phone className="mr-1.5 inline size-4" />
                      Har n\u00f6dtelefon
                    </Label>
                    <Switch
                      id="har_nodtelefon"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("nodtelefon_modell", formValues, originalValues)
              }
            >
              <form.Field name="nodtelefon_modell">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="nodtelefon_modell">Modell</Label>
                    <Input
                      id="nodtelefon_modell"
                      className="h-11"
                      placeholder="Ange modell..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("nodtelefon_typ", formValues, originalValues)
              }
            >
              <form.Field name="nodtelefon_typ">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="nodtelefon_typ">Typ</Label>
                    <Input
                      id="nodtelefon_typ"
                      className="h-11"
                      placeholder="Ange typ..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("behover_uppgradering", formValues, originalValues)
              }
            >
              <form.Field name="behover_uppgradering">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label
                      htmlFor="behover_uppgradering"
                      className="cursor-pointer"
                    >
                      Beh\u00f6ver uppgradering
                    </Label>
                    <Switch
                      id="behover_uppgradering"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("nodtelefon_pris", formValues, originalValues)
              }
            >
              <form.Field name="nodtelefon_pris">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="nodtelefon_pris">Pris</Label>
                    <Input
                      id="nodtelefon_pris"
                      className="h-11"
                      type="number"
                      inputMode="numeric"
                      placeholder="SEK"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>
          </EditSection>

          {/* Section 8: Kommentarer */}
          <EditSection title="8. Kommentarer">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("kommentarer", formValues, originalValues)
              }
            >
              <form.Field name="kommentarer">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="kommentarer">
                      <MessageSquare className="mr-1.5 inline size-4" />
                      Kommentarer
                    </Label>
                    <Textarea
                      id="kommentarer"
                      className="min-h-[120px]"
                      placeholder="Skriv eventuella kommentarer h\u00e4r..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>
          </EditSection>
        </div>
      </div>

      {/* Error message */}
      {submitError && (
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            {submitError.includes("uppkoppling") ? (
              <WifiOff className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {submitError}
          </p>
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-3">
        <div className="flex gap-3">
          <Link to="/sok" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base"
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-1 size-5" />
              Avbryt
            </Button>
          </Link>
          <Button
            type="button"
            className="h-12 flex-1 text-base"
            onClick={() => form.handleSubmit()}
            disabled={isSubmitting || changedCount === 0}
          >
            {isSubmitting ? (
              <Loader2 className="mr-1 size-5 animate-spin" />
            ) : (
              <Check className="mr-1 size-5" />
            )}
            {isSubmitting
              ? "Sparar..."
              : changedCount > 0
                ? `Spara ${changedCount} \u00e4ndring${changedCount === 1 ? "" : "ar"}`
                : "Inga \u00e4ndringar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Reusable Components ---

function EditSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4 px-3 py-3">{children}</div>
    </div>
  );
}

function FieldWrapper({
  changed,
  children,
}: {
  changed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md p-2 transition-colors",
        changed &&
          "border-l-4 border-l-amber-500 bg-amber-50/50 pl-3 dark:bg-amber-950/20",
      )}
    >
      {children}
    </div>
  );
}

function ComboboxField({
  form,
  name,
  label,
  kategori,
  placeholder,
  changed,
}: {
  form: HissForm;
  name: keyof HissFormValues;
  label: string;
  kategori: string;
  placeholder: string;
  changed: boolean;
}) {
  const suggestions = useSuggestions(kategori);
  return (
    <FieldWrapper changed={changed}>
      <form.Field name={name}>
        {(field) => (
          <div className="space-y-1.5">
            <Label>{label}</Label>
            <Combobox
              value={field.state.value as string}
              onChange={(val) => field.handleChange(val as never)}
              suggestions={suggestions}
              placeholder={placeholder}
            />
          </div>
        )}
      </form.Field>
    </FieldWrapper>
  );
}

function HissnummerField({
  field,
  currentHissId,
}: {
  field: {
    state: { value: string };
    handleChange: (value: string) => void;
  };
  currentHissId: string;
}) {
  const hissnummer = field.state.value;
  const checkResult = useQuery(
    api.hissar.checkHissnummer,
    hissnummer
      ? { hissnummer, excludeId: currentHissId as never }
      : "skip",
  );
  const isDuplicate = checkResult?.exists === true;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="hissnummer">
        Hissnummer <span className="text-destructive">*</span>
      </Label>
      <Input
        id="hissnummer"
        className={cn("h-11", isDuplicate && "border-destructive")}
        placeholder="Ange hissnummer..."
        value={hissnummer}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {isDuplicate && (
        <p className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="size-4" />
          Hissnumret finns redan i registret
        </p>
      )}
    </div>
  );
}
