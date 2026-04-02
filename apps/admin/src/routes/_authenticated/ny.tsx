import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
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
        <StepContent step={currentStep} />
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

function StepContent({ step }: { step: number }) {
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
