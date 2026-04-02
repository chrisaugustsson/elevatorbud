import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
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

function NyHiss() {
  const [currentStep, setCurrentStep] = useState(1);
  const orgs = useQuery(api.organisationer.list);

  const form = useForm({
    defaultValues,
    onSubmit: async () => {
      // Submit handled in US-023
    },
  });

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
        <StepContent step={currentStep} form={form} />
      </div>

      {/* Navigation buttons */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-3">
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 min-w-[44px] flex-1 text-base"
            onClick={goPrev}
            disabled={currentStep === 1}
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
              onClick={() => {
                // Submit handled in US-023
              }}
            >
              <Check className="mr-1 size-5" />
              Spara
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepContent({ step, form }: { step: number; form: HissForm }) {
  switch (step) {
    case 1:
      return <Step1Identifiering form={form} />;
    case 2:
      return <Step2TekniskSpec form={form} />;
    case 3:
      return <Step3DorrarOchKorg form={form} />;
    default: {
      const stepInfo = STEPS[step - 1];
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground">
            {stepInfo.number}
          </div>
          <h2 className="mt-4 text-lg font-semibold">{stepInfo.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Fälten för detta steg läggs till i kommande steg.
          </p>
        </div>
      );
    }
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
