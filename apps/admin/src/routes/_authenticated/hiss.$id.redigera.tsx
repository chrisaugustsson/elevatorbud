import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  ArrowLeft,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";
import { clearDraft } from "../../shared/lib/form-persistence";

import type { HissFormValues } from "../../features/elevator/types";
import { emptyValues } from "../../features/elevator/types";
import {
  serverToFormValues,
  formValuesToUpdateArgs,
  isChanged,
} from "../../features/elevator/utils/form-converters";
import {
  useDraftPersistence,
  getDraftKey,
} from "../../features/elevator/hooks/use-draft-persistence";
import { BasicInfoSection } from "../../features/elevator/components/basic-info-section";
import { TechnicalSpecsSection } from "../../features/elevator/components/technical-specs-section";
import { DoorsAndCabSection } from "../../features/elevator/components/doors-and-cab-section";
import { MachinerySection } from "../../features/elevator/components/machinery-section";
import { InspectionSection } from "../../features/elevator/components/inspection-section";
import { ModernizationSection } from "../../features/elevator/components/modernization-section";
import { EmergencyPhoneSection } from "../../features/elevator/components/emergency-phone-section";
import { CommentsSection } from "../../features/elevator/components/comments-section";

export const Route = createFileRoute("/_authenticated/hiss/$id/redigera")({
  component: RedigeraHiss,
});

function RedigeraHiss() {
  const { id } = Route.useParams();
  const router = useRouter();
  const hiss = useQuery(api.elevators.crud.get, { id: id as never });
  const orgs = useQuery(api.organizations.list);
  const updateHiss = useMutation(api.elevators.crud.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const draftKey = getDraftKey(id);

  // Original values from server -- set once on load
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
          ...formValuesToUpdateArgs(value),
          organization_id: value.organization_id as never,
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

  // Initialize form from server data
  useEffect(() => {
    if (!hiss || initialized) return;

    const serverVals = serverToFormValues(hiss as Record<string, unknown>);
    setOriginalValues(serverVals);

    for (const [key, value] of Object.entries(serverVals)) {
      form.setFieldValue(key as keyof HissFormValues, value as never);
    }
    setInitialized(true);
  }, [hiss, initialized, form]);

  const formValues = form.state.values;

  const { draftPromptVisible, draftSavedVisible, restoreDraft, dismissDraft } =
    useDraftPersistence({
      form,
      draftKey,
      originalValues,
      submitSuccess,
      initialized,
      formValues,
    });

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
          <h2 className="text-xl font-semibold">Ändringar sparade!</h2>
          <p className="text-muted-foreground">
            Hiss {(hiss as { elevator_number: string }).elevator_number} har uppdaterats.
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/hiss/$id" params={{ id }}>
              <Button variant="outline" className="h-12 text-base">
                <ArrowLeft className="mr-1 size-5" />
                Tillbaka till hiss
              </Button>
            </Link>
            <Button
              className="h-12 text-base"
              onClick={() => setSubmitSuccess(false)}
            >
              Fortsätt redigera
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
            Du har ett sparat utkast. Vill du fortsätta där du slutade?
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-9" onClick={restoreDraft}>
              Återställ utkast
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9"
              onClick={dismissDraft}
            >
              Använd serverdata
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2"
              onClick={() => router.history.back()}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Redigera hiss</h1>
              <p className="text-sm text-muted-foreground">
                {(hiss as { elevator_number: string }).elevator_number}
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
                {changedCount} ändr{changedCount === 1 ? "ing" : "ingar"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="space-y-6">
          <BasicInfoSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
            orgs={orgs}
            currentHissId={id}
          />
          <TechnicalSpecsSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <DoorsAndCabSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <MachinerySection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <InspectionSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <ModernizationSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <EmergencyPhoneSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
          <CommentsSection
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
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
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 text-base"
            disabled={isSubmitting}
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="mr-1 size-5" />
            Avbryt
          </Button>
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
                ? `Spara ${changedCount} ändring${changedCount === 1 ? "" : "ar"}`
                : "Inga ändringar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
