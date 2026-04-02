import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  CheckCircle2,
  Pencil,
  Phone,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/ny")({
  component: NyHiss,
});

const STEPS = [
  { number: 1, title: "Identifiering", shortTitle: "ID" },
  { number: 2, title: "Teknisk specifikation", shortTitle: "Teknik" },
  { number: 3, title: "Dörrar och korg", shortTitle: "Dörrar" },
  { number: 4, title: "Maskineri", shortTitle: "Maskin" },
  { number: 5, title: "Besiktning och underhåll", shortTitle: "Besiktn." },
  { number: 6, title: "Modernisering", shortTitle: "Modern." },
  { number: 7, title: "Nödtelefon", shortTitle: "Nödtel." },
  { number: 8, title: "Kommentarer", shortTitle: "Komm." },
  { number: 9, title: "Granska och spara", shortTitle: "Granska" },
] as const;

type HissFormValues = {
  organisation_id: string;
  // Step 1 - Identifiering
  hissnummer: string;
  adress: string;
  hissbeteckning: string;
  distrikt: string;
  // Step 2 - Teknisk specifikation
  hisstyp: string;
  fabrikat: string;
  byggar: string;
  hastighet: string;
  lyfthojd: string;
  marklast: string;
  antal_plan: string;
  antal_dorrar: string;
  // Step 3 - Dörrar och korg
  typ_dorrar: string;
  genomgang: boolean;
  kollektiv: string;
  korgstorlek: string;
  dagoppning: string;
  barbeslag: string;
  dorrmaskin: string;
  // Step 4 - Maskineri
  drivsystem: string;
  upphangning: string;
  maskinplacering: string;
  typ_maskin: string;
  typ_styrsystem: string;
  // Step 5 - Besiktning och underhåll
  besiktningsorgan: string;
  besiktningsmanad: string;
  skotselforetag: string;
  schaktbelysning: string;
  // Step 6 - Modernisering
  moderniserar: string;
  garanti: boolean;
  rekommenderat_moderniserar: string;
  budget_belopp: string;
  atgarder_vid_modernisering: string;
  // Step 7 - Nödtelefon
  har_nodtelefon: boolean;
  nodtelefon_modell: string;
  nodtelefon_typ: string;
  behover_uppgradering: boolean;
  nodtelefon_pris: string;
  // Step 8 - Kommentarer
  kommentarer: string;
};

const defaultValues: HissFormValues = {
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
  return useForm({ defaultValues });
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

function NyHiss() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const orgs = useQuery(api.organisationer.list);
  const createHiss = useMutation(api.hissar.create);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }
        await createHiss({
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
        setSubmitSuccess(true);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message === "OFFLINE" || err.message.includes("fetch"))
        ) {
          setSubmitError(
            "Ingen uppkoppling — försök igen när du har nät",
          );
        } else {
          setSubmitError(
            err instanceof Error ? err.message : "Ett oväntat fel uppstod",
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleSubmit = () => {
    form.handleSubmit();
  };

  const resetForm = () => {
    form.reset();
    setCurrentStep(1);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const goNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  };

  // Success confirmation view
  if (submitSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-xl font-semibold">Hiss sparad!</h2>
          <p className="text-muted-foreground">
            Hissen har lagts till i registret.
          </p>
          <Button
            className="mt-4 h-12 min-w-[200px] text-base"
            onClick={resetForm}
          >
            Registrera ny hiss
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Header with org selector */}
      <div className="border-b bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">Ny hiss</h1>
        <div className="mt-2">
          <form.Field name="organisation_id">
            {(field) => (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  <Building2 className="mr-1 inline size-4" />
                  Organisation
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Välj organisation..." />
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
        </div>
      </div>

      {/* Step progress indicator */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((step) => (
            <button
              key={step.number}
              type="button"
              onClick={() => goToStep(step.number)}
              className={cn(
                "flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-md px-1 py-1 text-xs transition-colors",
                currentStep === step.number
                  ? "bg-primary text-primary-foreground font-medium"
                  : step.number < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              <span className="text-sm font-semibold">{step.number}</span>
              <span className="hidden truncate sm:block">
                {step.shortTitle}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-medium text-foreground">
          Steg {currentStep} av {STEPS.length}:{" "}
          {STEPS[currentStep - 1].title}
        </p>
      </div>

      {/* Step content area */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <StepContent
          step={currentStep}
          form={form}
          goToStep={goToStep}
          orgs={orgs}
        />
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

      {/* Navigation buttons */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-3">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-[44px] flex-1 text-base"
            onClick={goPrev}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="mr-1 size-5" />
            Föregående
          </Button>
          {currentStep < STEPS.length ? (
            <Button
              type="button"
              className="h-12 min-w-[44px] flex-1 text-base"
              onClick={goNext}
            >
              Nästa
              <ChevronRight className="ml-1 size-5" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 min-w-[44px] flex-1 text-base"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-1 size-5 animate-spin" />
              ) : (
                <Check className="mr-1 size-5" />
              )}
              {isSubmitting ? "Sparar..." : "Spara"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepContent({
  step,
  form,
  goToStep,
  orgs,
}: {
  step: number;
  form: HissForm;
  goToStep: (step: number) => void;
  orgs: Array<{ _id: string; namn: string }> | undefined;
}) {
  switch (step) {
    case 1:
      return <Step1Identifiering form={form} />;
    case 2:
      return <Step2TekniskSpec form={form} />;
    case 3:
      return <Step3DorrarOchKorg form={form} />;
    case 4:
      return <Step4Maskineri form={form} />;
    case 5:
      return <Step5Besiktning form={form} />;
    case 6:
      return <Step6Modernisering form={form} />;
    case 7:
      return <Step7Nodtelefon form={form} />;
    case 8:
      return <Step8Kommentarer form={form} />;
    case 9:
      return <Step9Granska form={form} goToStep={goToStep} orgs={orgs} />;
    default:
      return null;
  }
}

// --- Step 1: Identifiering ---

function Step1Identifiering({ form }: { form: HissForm }) {
  const hissbeteckningSuggestions = useSuggestions("hissbeteckning");
  const distriktSuggestions = useSuggestions("distrikt");

  return (
    <div className="space-y-5">
      {/* Hissnummer with real-time uniqueness check */}
      <form.Field name="hissnummer">
        {(field) => <HissnummerField field={field} />}
      </form.Field>

      {/* Adress */}
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

      {/* Hissbeteckning (combobox) */}
      <form.Field name="hissbeteckning">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Hissbeteckning</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={hissbeteckningSuggestions}
              placeholder="Välj eller ange beteckning..."
            />
          </div>
        )}
      </form.Field>

      {/* Distrikt (combobox) */}
      <form.Field name="distrikt">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Distrikt</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={distriktSuggestions}
              placeholder="Välj eller ange distrikt..."
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}

function HissnummerField({
  field,
}: {
  field: {
    state: { value: string };
    handleChange: (value: string) => void;
  };
}) {
  const hissnummer = field.state.value;
  const checkResult = useQuery(
    api.hissar.checkHissnummer,
    hissnummer ? { hissnummer } : "skip",
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

// --- Step 2: Teknisk specifikation ---

function Step2TekniskSpec({ form }: { form: HissForm }) {
  const hisstypSuggestions = useSuggestions("hisstyp");
  const fabrikatSuggestions = useSuggestions("fabrikat");

  return (
    <div className="space-y-5">
      {/* Hisstyp (combobox) */}
      <form.Field name="hisstyp">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Hisstyp</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={hisstypSuggestions}
              placeholder="Välj eller ange hisstyp..."
            />
          </div>
        )}
      </form.Field>

      {/* Fabrikat (combobox) */}
      <form.Field name="fabrikat">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Fabrikat</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={fabrikatSuggestions}
              placeholder="Välj eller ange fabrikat..."
            />
          </div>
        )}
      </form.Field>

      {/* Byggår */}
      <form.Field name="byggar">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="byggar">Byggår</Label>
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

      {/* Hastighet & Lyfthöjd — side by side */}
      <div className="grid grid-cols-2 gap-3">
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

        <form.Field name="lyfthojd">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="lyfthojd">Lyfthöjd</Label>
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
      </div>

      {/* Marklast */}
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

      {/* Antal plan & Antal dörrar — side by side */}
      <div className="grid grid-cols-2 gap-3">
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

        <form.Field name="antal_dorrar">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="antal_dorrar">Antal dörrar</Label>
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
      </div>
    </div>
  );
}

// --- Step 3: Dörrar och korg ---

function Step3DorrarOchKorg({ form }: { form: HissForm }) {
  const typDorrarSuggestions = useSuggestions("typ_dorrar");
  const kollektivSuggestions = useSuggestions("kollektiv");

  return (
    <div className="space-y-5">
      {/* Typ dörrar (combobox) */}
      <form.Field name="typ_dorrar">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Typ dörrar</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={typDorrarSuggestions}
              placeholder="Välj eller ange dörrtyp..."
            />
          </div>
        )}
      </form.Field>

      {/* Genomgång (toggle) */}
      <form.Field name="genomgang">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="genomgang" className="cursor-pointer">
              Genomgång
            </Label>
            <Switch
              id="genomgang"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Kollektiv (combobox) */}
      <form.Field name="kollektiv">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Kollektiv</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={kollektivSuggestions}
              placeholder="Välj eller ange kollektiv..."
            />
          </div>
        )}
      </form.Field>

      {/* Korgstorlek */}
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

      {/* Dagöppning */}
      <form.Field name="dagoppning">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="dagoppning">Dagöppning</Label>
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

      {/* Bärbeslag & Dörrmaskin — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="barbeslag">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="barbeslag">Bärbeslag</Label>
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

        <form.Field name="dorrmaskin">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="dorrmaskin">Dörrmaskin</Label>
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
      </div>
    </div>
  );
}

// --- Step 4: Maskineri ---

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

function Step4Maskineri({ form }: { form: HissForm }) {
  const drivsystemSuggestions = useSuggestions("drivsystem");
  const maskinplaceringSuggestions = useSuggestions("maskinplacering");

  return (
    <div className="space-y-5">
      {/* Drivsystem (combobox) */}
      <form.Field name="drivsystem">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Drivsystem</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={drivsystemSuggestions}
              placeholder="Välj eller ange drivsystem..."
            />
          </div>
        )}
      </form.Field>

      {/* Upphängning */}
      <form.Field name="upphangning">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="upphangning">Upphängning</Label>
            <Input
              id="upphangning"
              className="h-11"
              placeholder="Ange upphängning..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Maskinplacering (combobox) */}
      <form.Field name="maskinplacering">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Maskinplacering</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={maskinplaceringSuggestions}
              placeholder="Välj eller ange maskinplacering..."
            />
          </div>
        )}
      </form.Field>

      {/* Typ maskin & Typ styrsystem — side by side */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
  );
}

// --- Step 5: Besiktning och underhåll ---

function Step5Besiktning({ form }: { form: HissForm }) {
  const besiktningsorganSuggestions = useSuggestions("besiktningsorgan");
  const skotselforetagSuggestions = useSuggestions("skotselforetag");

  return (
    <div className="space-y-5">
      {/* Besiktningsorgan (combobox) */}
      <form.Field name="besiktningsorgan">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Besiktningsorgan</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={besiktningsorganSuggestions}
              placeholder="Välj eller ange besiktningsorgan..."
            />
          </div>
        )}
      </form.Field>

      {/* Besiktningsmånad (fixed enum) */}
      <form.Field name="besiktningsmanad">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Besiktningsmånad</Label>
            <Select
              value={field.state.value}
              onValueChange={(val) => field.handleChange(val)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Välj månad..." />
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

      {/* Skötselföretag (combobox) */}
      <form.Field name="skotselforetag">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Skötselföretag</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={skotselforetagSuggestions}
              placeholder="Välj eller ange skötselföretag..."
            />
          </div>
        )}
      </form.Field>

      {/* Schaktbelysning */}
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
    </div>
  );
}

// --- Step 6: Modernisering ---

function Step6Modernisering({ form }: { form: HissForm }) {
  const atgarderSuggestions = useSuggestions("atgarder_vid_modernisering");

  return (
    <div className="space-y-5">
      {/* Moderniseringsår */}
      <form.Field name="moderniserar">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="moderniserar">Moderniseringsår</Label>
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

      {/* Garanti (toggle) */}
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

      {/* Rekommenderat moderniseringsår */}
      <form.Field name="rekommenderat_moderniserar">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="rekommenderat_moderniserar">
              Rekommenderat moderniseringsår
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

      {/* Budget belopp */}
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

      {/* Åtgärder vid modernisering (combobox) */}
      <form.Field name="atgarder_vid_modernisering">
        {(field) => (
          <div className="space-y-1.5">
            <Label>Åtgärder vid modernisering</Label>
            <Combobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              suggestions={atgarderSuggestions}
              placeholder="Välj eller ange åtgärder..."
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}

// --- Step 7: Nödtelefon ---

function Step7Nodtelefon({ form }: { form: HissForm }) {
  return (
    <div className="space-y-5">
      {/* Har nödtelefon (toggle) */}
      <form.Field name="har_nodtelefon">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="har_nodtelefon" className="cursor-pointer">
              <Phone className="mr-1.5 inline size-4" />
              Har nödtelefon
            </Label>
            <Switch
              id="har_nodtelefon"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Modell */}
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

      {/* Typ */}
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

      {/* Behöver uppgradering (toggle) */}
      <form.Field name="behover_uppgradering">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="behover_uppgradering" className="cursor-pointer">
              Behöver uppgradering
            </Label>
            <Switch
              id="behover_uppgradering"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Pris */}
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
    </div>
  );
}

// --- Step 8: Kommentarer ---

function Step8Kommentarer({ form }: { form: HissForm }) {
  return (
    <div className="space-y-5">
      <form.Field name="kommentarer">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="kommentarer">
              <MessageSquare className="mr-1.5 inline size-4" />
              Kommentarer
            </Label>
            <Textarea
              id="kommentarer"
              className="min-h-[200px]"
              placeholder="Skriv eventuella kommentarer här..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>
    </div>
  );
}

// --- Step 9: Granska och spara ---

type ReviewSection = {
  title: string;
  step: number;
  fields: Array<{
    label: string;
    value: string | boolean;
    type?: "text" | "boolean";
  }>;
};

function Step9Granska({
  form,
  goToStep,
  orgs,
}: {
  form: HissForm;
  goToStep: (step: number) => void;
  orgs: Array<{ _id: string; namn: string }> | undefined;
}) {
  const values = form.state.values;
  const orgName =
    orgs?.find((o) => o._id === values.organisation_id)?.namn ?? "";

  const sections: ReviewSection[] = [
    {
      title: "Identifiering",
      step: 1,
      fields: [
        { label: "Organisation", value: orgName },
        { label: "Hissnummer", value: values.hissnummer },
        { label: "Adress", value: values.adress },
        { label: "Hissbeteckning", value: values.hissbeteckning },
        { label: "Distrikt", value: values.distrikt },
      ],
    },
    {
      title: "Teknisk specifikation",
      step: 2,
      fields: [
        { label: "Hisstyp", value: values.hisstyp },
        { label: "Fabrikat", value: values.fabrikat },
        { label: "Byggår", value: values.byggar },
        { label: "Hastighet", value: values.hastighet },
        { label: "Lyfthöjd", value: values.lyfthojd },
        { label: "Marklast", value: values.marklast },
        { label: "Antal plan", value: values.antal_plan },
        { label: "Antal dörrar", value: values.antal_dorrar },
      ],
    },
    {
      title: "Dörrar och korg",
      step: 3,
      fields: [
        { label: "Typ dörrar", value: values.typ_dorrar },
        { label: "Genomgång", value: values.genomgang, type: "boolean" },
        { label: "Kollektiv", value: values.kollektiv },
        { label: "Korgstorlek", value: values.korgstorlek },
        { label: "Dagöppning", value: values.dagoppning },
        { label: "Bärbeslag", value: values.barbeslag },
        { label: "Dörrmaskin", value: values.dorrmaskin },
      ],
    },
    {
      title: "Maskineri",
      step: 4,
      fields: [
        { label: "Drivsystem", value: values.drivsystem },
        { label: "Upphängning", value: values.upphangning },
        { label: "Maskinplacering", value: values.maskinplacering },
        { label: "Typ maskin", value: values.typ_maskin },
        { label: "Typ styrsystem", value: values.typ_styrsystem },
      ],
    },
    {
      title: "Besiktning och underhåll",
      step: 5,
      fields: [
        { label: "Besiktningsorgan", value: values.besiktningsorgan },
        { label: "Besiktningsmånad", value: values.besiktningsmanad },
        { label: "Skötselföretag", value: values.skotselforetag },
        { label: "Schaktbelysning", value: values.schaktbelysning },
      ],
    },
    {
      title: "Modernisering",
      step: 6,
      fields: [
        { label: "Moderniseringsår", value: values.moderniserar },
        { label: "Garanti", value: values.garanti, type: "boolean" },
        {
          label: "Rekommenderat moderniseringsår",
          value: values.rekommenderat_moderniserar,
        },
        { label: "Budget belopp", value: values.budget_belopp },
        {
          label: "Åtgärder vid modernisering",
          value: values.atgarder_vid_modernisering,
        },
      ],
    },
    {
      title: "Nödtelefon",
      step: 7,
      fields: [
        {
          label: "Har nödtelefon",
          value: values.har_nodtelefon,
          type: "boolean",
        },
        { label: "Modell", value: values.nodtelefon_modell },
        { label: "Typ", value: values.nodtelefon_typ },
        {
          label: "Behöver uppgradering",
          value: values.behover_uppgradering,
          type: "boolean",
        },
        { label: "Pris", value: values.nodtelefon_pris },
      ],
    },
    {
      title: "Kommentarer",
      step: 8,
      fields: [{ label: "Kommentarer", value: values.kommentarer }],
    },
  ];

  const hasRequiredFields = values.hissnummer.trim() !== "" && values.organisation_id !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Granska uppgifterna</h2>
      </div>

      {!hasRequiredFields && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Hissnummer och organisation måste anges innan du kan spara.
          </span>
        </div>
      )}

      {sections.map((section) => (
        <ReviewSectionCard
          key={section.step}
          section={section}
          goToStep={goToStep}
        />
      ))}
    </div>
  );
}

function ReviewSectionCard({
  section,
  goToStep,
}: {
  section: ReviewSection;
  goToStep: (step: number) => void;
}) {
  const hasAnyValue = section.fields.some((f) => {
    if (f.type === "boolean") return f.value === true;
    return typeof f.value === "string" && f.value.trim() !== "";
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">
          {section.step}. {section.title}
        </h3>
        <button
          type="button"
          onClick={() => goToStep(section.step)}
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      <div className="px-3 py-2">
        {!hasAnyValue ? (
          <p className="py-1 text-sm italic text-muted-foreground">
            Inga uppgifter ifyllda
          </p>
        ) : (
          <div className="space-y-1">
            {section.fields.map((field) => {
              const displayValue =
                field.type === "boolean"
                  ? field.value
                    ? "Ja"
                    : "Nej"
                  : (field.value as string);
              if (
                field.type !== "boolean" &&
                (!displayValue || displayValue.trim() === "")
              )
                return null;
              if (field.type === "boolean" && !field.value) return null;
              return (
                <div
                  key={field.label}
                  className="flex items-baseline justify-between gap-2 py-0.5 text-sm"
                >
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="text-right font-medium">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
