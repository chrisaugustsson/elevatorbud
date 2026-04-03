import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Label } from "@elevatorbud/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
} from "../../../shared/lib/form-persistence";
import type { HissForm, HissFormValues } from "../types";
import { TechnicalSpecsSection } from "./technical-specs-section";
import { DoorsAndCabSection } from "./doors-and-cab-section";
import { MachinerySection } from "./machinery-section";
import { InspectionSection } from "./inspection-section";
import { ModernizationSection } from "./modernization-section";
import { EmergencyPhoneSection } from "./emergency-phone-section";
import { CommentsSection } from "./comments-section";
import { StepIdentification } from "./wizard-steps/step-identification";
import { StepReview } from "./wizard-steps/step-review";

const STEPS = [
  { number: 1, title: "Identifiering", shortTitle: "ID" },
  { number: 2, title: "Teknisk specifikation", shortTitle: "Teknik" },
  { number: 3, title: "D\u00f6rrar och korg", shortTitle: "D\u00f6rrar" },
  { number: 4, title: "Maskineri", shortTitle: "Maskin" },
  { number: 5, title: "Besiktning och underh\u00e5ll", shortTitle: "Besiktn." },
  { number: 6, title: "Modernisering", shortTitle: "Modern." },
  { number: 7, title: "N\u00f6dtelefon", shortTitle: "N\u00f6dtel." },
  { number: 8, title: "Kommentarer", shortTitle: "Komm." },
  { number: 9, title: "Granska och spara", shortTitle: "Granska" },
] as const;

export interface ElevatorWizardProps {
  form: HissForm;
  formValues: HissFormValues;
  orgs: Array<{ _id: string; name: string }> | undefined;
  draftKey: string;
  submitSuccess: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function ElevatorWizard({
  form,
  formValues,
  orgs,
  draftKey,
  submitSuccess,
  onSubmit,
  isSubmitting,
  submitError,
}: ElevatorWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Check for existing draft on mount
  useEffect(() => {
    if (hasDraft(draftKey)) {
      setDraftPromptVisible(true);
    }
  }, [draftKey]);

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
        if (draftSavedTimerRef.current)
          clearTimeout(draftSavedTimerRef.current);
        draftSavedTimerRef.current = setTimeout(
          () => setDraftSavedVisible(false),
          2000,
        );
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepIdentification form={form} formValues={formValues} />
        );
      case 2:
        return (
          <TechnicalSpecsSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 3:
        return (
          <DoorsAndCabSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 4:
        return (
          <MachinerySection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 5:
        return (
          <InspectionSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 6:
        return (
          <ModernizationSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 7:
        return (
          <EmergencyPhoneSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 8:
        return (
          <CommentsSection
            form={form}
            formValues={formValues}
            originalValues={null}
          />
        );
      case 9:
        return <StepReview form={form} goToStep={goToStep} orgs={orgs} />;
      default:
        return null;
    }
  };

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
              B\u00f6rja om
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
                    <SelectValue placeholder="V\u00e4lj organisation..." />
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
        {renderStepContent()}
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
            F\u00f6reg\u00e5ende
          </Button>
          {currentStep < STEPS.length ? (
            <Button
              type="button"
              className="h-12 min-w-[44px] flex-1 text-base"
              onClick={goNext}
            >
              N\u00e4sta
              <ChevronRight className="ml-1 size-5" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 min-w-[44px] flex-1 text-base"
              onClick={onSubmit}
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
