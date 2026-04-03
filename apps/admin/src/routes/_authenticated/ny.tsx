import { useState, useEffect, useRef, useCallback } from "react";
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
  Save,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import {
  getDraftKey,
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
} from "../../shared/lib/form-persistence";

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
  organization_id: string;
  // Step 1 - Identifiering
  elevator_number: string;
  address: string;
  elevator_designation: string;
  district: string;
  // Step 2 - Teknisk specifikation
  elevator_type: string;
  manufacturer: string;
  build_year: string;
  speed: string;
  lift_height: string;
  load_capacity: string;
  floor_count: string;
  door_count: string;
  // Step 3 - Dörrar och korg
  door_type: string;
  passthrough: boolean;
  collective: string;
  cab_size: string;
  daylight_opening: string;
  grab_rail: string;
  door_machine: string;
  // Step 4 - Maskineri
  drive_system: string;
  suspension: string;
  machine_placement: string;
  machine_type: string;
  control_system_type: string;
  // Step 5 - Besiktning och underhåll
  inspection_authority: string;
  inspection_month: string;
  maintenance_company: string;
  shaft_lighting: string;
  // Step 6 - Modernisering
  modernization_year: string;
  warranty: boolean;
  recommended_modernization_year: string;
  budget_amount: string;
  modernization_measures: string;
  // Step 7 - Nödtelefon
  has_emergency_phone: boolean;
  emergency_phone_model: string;
  emergency_phone_type: string;
  needs_upgrade: boolean;
  emergency_phone_price: string;
  // Step 8 - Kommentarer
  comments: string;
};

const defaultValues: HissFormValues = {
  organization_id: "",
  elevator_number: "",
  address: "",
  elevator_designation: "",
  district: "",
  elevator_type: "",
  manufacturer: "",
  build_year: "",
  speed: "",
  lift_height: "",
  load_capacity: "",
  floor_count: "",
  door_count: "",
  door_type: "",
  passthrough: false,
  collective: "",
  cab_size: "",
  daylight_opening: "",
  grab_rail: "",
  door_machine: "",
  drive_system: "",
  suspension: "",
  machine_placement: "",
  machine_type: "",
  control_system_type: "",
  inspection_authority: "",
  inspection_month: "",
  maintenance_company: "",
  shaft_lighting: "",
  modernization_year: "",
  warranty: false,
  recommended_modernization_year: "",
  budget_amount: "",
  modernization_measures: "",
  has_emergency_phone: false,
  emergency_phone_model: "",
  emergency_phone_type: "",
  needs_upgrade: false,
  emergency_phone_price: "",
  comments: "",
};

// Helper to extract the form instance type from useForm
function _hissFormTypeHelper() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useForm({ defaultValues });
}
type HissForm = ReturnType<typeof _hissFormTypeHelper>;

function useSuggestions(category: string): string[] {
  const data = useQuery(api.suggestedValues.list, { category });
  if (!data) return [];
  return data
    .filter((d: { active: boolean }) => d.active)
    .map((d: { value: string }) => d.value);
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
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const draftKey = getDraftKey();
  const orgs = useQuery(api.organizations.list);
  const createHiss = useMutation(api.elevators.crud.create);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasDraft(draftKey)) {
      setDraftPromptVisible(true);
    }
  }, [draftKey]);

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
          elevator_number: value.elevator_number,
          organization_id: value.organization_id as never,
          address: toOptionalString(value.address),
          elevator_designation: toOptionalString(value.elevator_designation),
          district: toOptionalString(value.district),
          elevator_type: toOptionalString(value.elevator_type),
          manufacturer: toOptionalString(value.manufacturer),
          build_year: toOptionalNumber(value.build_year),
          speed: toOptionalString(value.speed),
          lift_height: toOptionalString(value.lift_height),
          load_capacity: toOptionalString(value.load_capacity),
          floor_count: toOptionalNumber(value.floor_count),
          door_count: toOptionalNumber(value.door_count),
          door_type: toOptionalString(value.door_type),
          passthrough: value.passthrough || undefined,
          collective: toOptionalString(value.collective),
          cab_size: toOptionalString(value.cab_size),
          daylight_opening: toOptionalString(value.daylight_opening),
          grab_rail: toOptionalString(value.grab_rail),
          door_machine: toOptionalString(value.door_machine),
          drive_system: toOptionalString(value.drive_system),
          suspension: toOptionalString(value.suspension),
          machine_placement: toOptionalString(value.machine_placement),
          machine_type: toOptionalString(value.machine_type),
          control_system_type: toOptionalString(value.control_system_type),
          inspection_authority: toOptionalString(value.inspection_authority),
          inspection_month: toOptionalString(value.inspection_month),
          maintenance_company: toOptionalString(value.maintenance_company),
          shaft_lighting: toOptionalString(value.shaft_lighting),
          modernization_year: toOptionalString(value.modernization_year),
          warranty: value.warranty || undefined,
          recommended_modernization_year: toOptionalString(
            value.recommended_modernization_year,
          ),
          budget_amount: toOptionalNumber(value.budget_amount),
          modernization_measures: toOptionalString(
            value.modernization_measures,
          ),
          has_emergency_phone: value.has_emergency_phone || undefined,
          emergency_phone_model: toOptionalString(value.emergency_phone_model),
          emergency_phone_type: toOptionalString(value.emergency_phone_type),
          needs_upgrade: value.needs_upgrade || undefined,
          emergency_phone_price: toOptionalNumber(value.emergency_phone_price),
          comments: toOptionalString(value.comments),
        });
        clearDraft(draftKey);
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
    clearDraft(draftKey);
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

  // Restore draft
  const restoreDraft = useCallback(() => {
    const draft = loadDraft<HissFormValues>(draftKey);
    if (draft) {
      for (const [key, value] of Object.entries(draft.values)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
      if (draft.currentStep) {
        setCurrentStep(draft.currentStep);
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
    if (submitSuccess || draftPromptVisible) return;
    const timer = setTimeout(() => {
      // Only save if there's something worth saving
      const hasContent = Object.entries(formValues).some(([key, val]) => {
        if (key === "organization_id") return false;
        if (typeof val === "boolean") return val;
        return typeof val === "string" && val.trim() !== "";
      });
      if (hasContent) {
        saveDraft(draftKey, formValues, currentStep);
        setDraftSavedVisible(true);
        if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
        draftSavedTimerRef.current = setTimeout(() => setDraftSavedVisible(false), 2000);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formValues, currentStep, draftKey, submitSuccess, draftPromptVisible]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

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
      {/* Draft restore prompt */}
      {draftPromptVisible && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
          <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
            Du har ett sparat utkast. Vill du fortsätta där du slutade?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-9"
              onClick={restoreDraft}
            >
              Återställ utkast
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={dismissDraft}
            >
              Börja om
            </Button>
          </div>
        </div>
      )}

      {/* Header with org selector */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Ny hiss</h1>
          {draftSavedVisible && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in">
              <Save className="size-3" />
              Utkast sparat
            </span>
          )}
        </div>
        <div className="mt-2">
          <form.Field name="organization_id">
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
                    {orgs?.map((org: { _id: string; name: string }) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
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
  orgs: Array<{ _id: string; name: string }> | undefined;
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
  const hissbeteckningSuggestions = useSuggestions("elevator_designation");
  const distriktSuggestions = useSuggestions("district");

  return (
    <div className="space-y-5">
      {/* Hissnummer with real-time uniqueness check */}
      <form.Field name="elevator_number">
        {(field) => <HissnummerField field={field} />}
      </form.Field>

      {/* Adress */}
      <form.Field name="address">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="address">Adress</Label>
            <Input
              id="address"
              className="h-11"
              placeholder="Gatuadress..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Hissbeteckning (combobox) */}
      <form.Field name="elevator_designation">
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
      <form.Field name="district">
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
  const elevatorNumber = field.state.value;
  const checkResult = useQuery(
    api.elevators.crud.checkElevatorNumber,
    elevatorNumber ? { elevator_number: elevatorNumber } : "skip",
  );
  const isDuplicate = checkResult?.exists === true;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="elevator_number">
        Hissnummer <span className="text-destructive">*</span>
      </Label>
      <Input
        id="elevator_number"
        className={cn("h-11", isDuplicate && "border-destructive")}
        placeholder="Ange hissnummer..."
        value={elevatorNumber}
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
  const hisstypSuggestions = useSuggestions("elevator_type");
  const fabrikatSuggestions = useSuggestions("manufacturer");

  return (
    <div className="space-y-5">
      {/* Hisstyp (combobox) */}
      <form.Field name="elevator_type">
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
      <form.Field name="manufacturer">
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
      <form.Field name="build_year">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="build_year">Byggår</Label>
            <Input
              id="build_year"
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
        <form.Field name="speed">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="speed">Hastighet</Label>
              <Input
                id="speed"
                className="h-11"
                placeholder="m/s"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="lift_height">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="lift_height">Lyfthöjd</Label>
              <Input
                id="lift_height"
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
      <form.Field name="load_capacity">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="load_capacity">Marklast</Label>
            <Input
              id="load_capacity"
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
        <form.Field name="floor_count">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="floor_count">Antal plan</Label>
              <Input
                id="floor_count"
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

        <form.Field name="door_count">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="door_count">Antal dörrar</Label>
              <Input
                id="door_count"
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
  const typDorrarSuggestions = useSuggestions("door_type");
  const kollektivSuggestions = useSuggestions("collective");

  return (
    <div className="space-y-5">
      {/* Typ dörrar (combobox) */}
      <form.Field name="door_type">
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
      <form.Field name="passthrough">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="passthrough" className="cursor-pointer">
              Genomgång
            </Label>
            <Switch
              id="passthrough"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Kollektiv (combobox) */}
      <form.Field name="collective">
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
      <form.Field name="cab_size">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="cab_size">Korgstorlek</Label>
            <Input
              id="cab_size"
              className="h-11"
              placeholder="t.ex. 1000*2050*2300 (B*D*H mm)"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Dagöppning */}
      <form.Field name="daylight_opening">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="daylight_opening">Dagöppning</Label>
            <Input
              id="daylight_opening"
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
        <form.Field name="grab_rail">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="grab_rail">Bärbeslag</Label>
              <Input
                id="grab_rail"
                className="h-11"
                placeholder="Typ..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="door_machine">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="door_machine">Dörrmaskin</Label>
              <Input
                id="door_machine"
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
  const drivsystemSuggestions = useSuggestions("drive_system");
  const maskinplaceringSuggestions = useSuggestions("machine_placement");

  return (
    <div className="space-y-5">
      {/* Drivsystem (combobox) */}
      <form.Field name="drive_system">
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
      <form.Field name="suspension">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="suspension">Upphängning</Label>
            <Input
              id="suspension"
              className="h-11"
              placeholder="Ange upphängning..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Maskinplacering (combobox) */}
      <form.Field name="machine_placement">
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
        <form.Field name="machine_type">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="machine_type">Typ maskin</Label>
              <Input
                id="machine_type"
                className="h-11"
                placeholder="Typ..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>

        <form.Field name="control_system_type">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="control_system_type">Typ styrsystem</Label>
              <Input
                id="control_system_type"
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
  const besiktningsorganSuggestions = useSuggestions("inspection_authority");
  const skotselforetagSuggestions = useSuggestions("maintenance_company");

  return (
    <div className="space-y-5">
      {/* Besiktningsorgan (combobox) */}
      <form.Field name="inspection_authority">
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
      <form.Field name="inspection_month">
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
      <form.Field name="maintenance_company">
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
      <form.Field name="shaft_lighting">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="shaft_lighting">Schaktbelysning</Label>
            <Input
              id="shaft_lighting"
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
  const atgarderSuggestions = useSuggestions("modernization_measures");

  return (
    <div className="space-y-5">
      {/* Moderniseringsår */}
      <form.Field name="modernization_year">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="modernization_year">Moderniseringsår</Label>
            <Input
              id="modernization_year"
              className="h-11"
              placeholder="t.ex. 2007 eller Ej ombyggd"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Garanti (toggle) */}
      <form.Field name="warranty">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="warranty" className="cursor-pointer">
              Garanti
            </Label>
            <Switch
              id="warranty"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Rekommenderat moderniseringsår */}
      <form.Field name="recommended_modernization_year">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="recommended_modernization_year">
              Rekommenderat moderniseringsår
            </Label>
            <Input
              id="recommended_modernization_year"
              className="h-11"
              placeholder="t.ex. 2030"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Budget belopp */}
      <form.Field name="budget_amount">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="budget_amount">Budget belopp</Label>
            <Input
              id="budget_amount"
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
      <form.Field name="modernization_measures">
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
      <form.Field name="has_emergency_phone">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="has_emergency_phone" className="cursor-pointer">
              <Phone className="mr-1.5 inline size-4" />
              Har nödtelefon
            </Label>
            <Switch
              id="has_emergency_phone"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Modell */}
      <form.Field name="emergency_phone_model">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="emergency_phone_model">Modell</Label>
            <Input
              id="emergency_phone_model"
              className="h-11"
              placeholder="Ange modell..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Typ */}
      <form.Field name="emergency_phone_type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="emergency_phone_type">Typ</Label>
            <Input
              id="emergency_phone_type"
              className="h-11"
              placeholder="Ange typ..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      {/* Behöver uppgradering (toggle) */}
      <form.Field name="needs_upgrade">
        {(field) => (
          <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="needs_upgrade" className="cursor-pointer">
              Behöver uppgradering
            </Label>
            <Switch
              id="needs_upgrade"
              checked={field.state.value}
              onCheckedChange={(val) => field.handleChange(val)}
            />
          </div>
        )}
      </form.Field>

      {/* Pris */}
      <form.Field name="emergency_phone_price">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="emergency_phone_price">Pris</Label>
            <Input
              id="emergency_phone_price"
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
      <form.Field name="comments">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="comments">
              <MessageSquare className="mr-1.5 inline size-4" />
              Kommentarer
            </Label>
            <Textarea
              id="comments"
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
  orgs: Array<{ _id: string; name: string }> | undefined;
}) {
  const values = form.state.values;
  const orgName =
    orgs?.find((o) => o._id === values.organization_id)?.name ?? "";

  const sections: ReviewSection[] = [
    {
      title: "Identifiering",
      step: 1,
      fields: [
        { label: "Organisation", value: orgName },
        { label: "Hissnummer", value: values.elevator_number },
        { label: "Adress", value: values.address },
        { label: "Hissbeteckning", value: values.elevator_designation },
        { label: "Distrikt", value: values.district },
      ],
    },
    {
      title: "Teknisk specifikation",
      step: 2,
      fields: [
        { label: "Hisstyp", value: values.elevator_type },
        { label: "Fabrikat", value: values.manufacturer },
        { label: "Byggår", value: values.build_year },
        { label: "Hastighet", value: values.speed },
        { label: "Lyfthöjd", value: values.lift_height },
        { label: "Marklast", value: values.load_capacity },
        { label: "Antal plan", value: values.floor_count },
        { label: "Antal dörrar", value: values.door_count },
      ],
    },
    {
      title: "Dörrar och korg",
      step: 3,
      fields: [
        { label: "Typ dörrar", value: values.door_type },
        { label: "Genomgång", value: values.passthrough, type: "boolean" },
        { label: "Kollektiv", value: values.collective },
        { label: "Korgstorlek", value: values.cab_size },
        { label: "Dagöppning", value: values.daylight_opening },
        { label: "Bärbeslag", value: values.grab_rail },
        { label: "Dörrmaskin", value: values.door_machine },
      ],
    },
    {
      title: "Maskineri",
      step: 4,
      fields: [
        { label: "Drivsystem", value: values.drive_system },
        { label: "Upphängning", value: values.suspension },
        { label: "Maskinplacering", value: values.machine_placement },
        { label: "Typ maskin", value: values.machine_type },
        { label: "Typ styrsystem", value: values.control_system_type },
      ],
    },
    {
      title: "Besiktning och underhåll",
      step: 5,
      fields: [
        { label: "Besiktningsorgan", value: values.inspection_authority },
        { label: "Besiktningsmånad", value: values.inspection_month },
        { label: "Skötselföretag", value: values.maintenance_company },
        { label: "Schaktbelysning", value: values.shaft_lighting },
      ],
    },
    {
      title: "Modernisering",
      step: 6,
      fields: [
        { label: "Moderniseringsår", value: values.modernization_year },
        { label: "Garanti", value: values.warranty, type: "boolean" },
        {
          label: "Rekommenderat moderniseringsår",
          value: values.recommended_modernization_year,
        },
        { label: "Budget belopp", value: values.budget_amount },
        {
          label: "Åtgärder vid modernisering",
          value: values.modernization_measures,
        },
      ],
    },
    {
      title: "Nödtelefon",
      step: 7,
      fields: [
        {
          label: "Har nödtelefon",
          value: values.has_emergency_phone,
          type: "boolean",
        },
        { label: "Modell", value: values.emergency_phone_model },
        { label: "Typ", value: values.emergency_phone_type },
        {
          label: "Behöver uppgradering",
          value: values.needs_upgrade,
          type: "boolean",
        },
        { label: "Pris", value: values.emergency_phone_price },
      ],
    },
    {
      title: "Kommentarer",
      step: 8,
      fields: [{ label: "Kommentarer", value: values.comments }],
    },
  ];

  const hasRequiredFields = values.elevator_number.trim() !== "" && values.organization_id !== "";

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
