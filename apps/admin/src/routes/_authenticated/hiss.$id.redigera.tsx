import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@elevatorbud/ui/components/ui/tabs";
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
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";

const tabSlugs = ["grundinfo", "teknik", "underhall", "ovrigt"] as const;
type TabSlug = (typeof tabSlugs)[number];

function getInitialTab(): TabSlug {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return tabSlugs.includes(tab as TabSlug) ? (tab as TabSlug) : "grundinfo";
}

export const Route = createFileRoute("/_authenticated/hiss/$id/redigera")({
  component: RedigeraHiss,
  pendingComponent: RedigeraSkeleton,
});

function RedigeraSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 border-b bg-background px-4">
        <div className="flex gap-4 py-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="mb-4 h-5 w-40" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="mb-1.5 h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 border-t bg-background px-4 py-3">
        <div className="flex gap-3">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    </div>
  );
}

function RedigeraHiss() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<TabSlug>(getInitialTab);
  const router = useRouter();
  const hissOpts = convexQuery(api.elevators.crud.get, { id: id as never });
  const { data: hiss } = useSuspenseQuery({
    queryKey: hissOpts.queryKey,
    staleTime: hissOpts.staleTime,
  });
  const detailsOpts = convexQuery(api.elevators.crud.getDetails, {
    elevator_id: id,
  } as never);
  const { data: details } = useSuspenseQuery({
    queryKey: detailsOpts.queryKey,
    staleTime: detailsOpts.staleTime,
  });
  const budgetOpts = convexQuery(api.elevators.crud.getLatestBudget, {
    elevator_id: id,
  } as never);
  const { data: latestBudget } = useSuspenseQuery({
    queryKey: budgetOpts.queryKey,
    staleTime: budgetOpts.staleTime,
  });
  const orgsOpts = convexQuery(api.organizations.list, {});
  const { data: orgs } = useSuspenseQuery({
    queryKey: orgsOpts.queryKey,
    staleTime: orgsOpts.staleTime,
  });
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

  // Initialize form from server data (merged from core + details + budget)
  useEffect(() => {
    if (!hiss || initialized) return;

    const merged = {
      ...(hiss as Record<string, unknown>),
      ...(details as Record<string, unknown> | null),
      // Map budget fields to form field names
      recommended_modernization_year:
        (latestBudget as Record<string, unknown> | null)
          ?.recommended_modernization_year,
      budget_amount:
        (latestBudget as Record<string, unknown> | null)?.budget_amount,
      measures:
        (latestBudget as Record<string, unknown> | null)?.measures,
      warranty:
        (latestBudget as Record<string, unknown> | null)?.warranty,
    };
    const serverVals = serverToFormValues(merged);
    setOriginalValues(serverVals);

    for (const [key, value] of Object.entries(serverVals)) {
      form.setFieldValue(key as keyof HissFormValues, value as never);
    }
    setInitialized(true);
  }, [hiss, details, latestBudget, initialized, form]);

  // Not found
  if (hiss === null) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">Hissen kunde inte hittas.</p>
        <Link to="/" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-1 size-4" />
            Tillbaka
          </Button>
        </Link>
      </div>
    );
  }

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

      {/* Tabbed form content */}
      <div className="flex-1 overflow-auto">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as TabSlug);
            const url = new URL(window.location.href);
            url.searchParams.set("tab", value);
            window.history.replaceState({}, "", url.toString());
          }}
        >
          <div className="sticky top-0 z-10 border-b bg-background px-4">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="grundinfo">Grundinfo</TabsTrigger>
              <TabsTrigger value="teknik">Teknik</TabsTrigger>
              <TabsTrigger value="underhall">Underhåll & Modernisering</TabsTrigger>
              <TabsTrigger value="ovrigt">Övrigt</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 py-4">
            <TabsContent value="grundinfo">
              <div className="space-y-6">
                <BasicInfoSection
                  form={form}
                  formValues={formValues}
                  originalValues={originalValues}
                  orgs={orgs}
                  currentHissId={id}
                />
              </div>
            </TabsContent>

            <TabsContent value="teknik">
              <div className="space-y-6">
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
              </div>
            </TabsContent>

            <TabsContent value="underhall">
              <div className="space-y-6">
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
              </div>
            </TabsContent>

            <TabsContent value="ovrigt">
              <div className="space-y-6">
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
            </TabsContent>
          </div>
        </Tabs>
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
