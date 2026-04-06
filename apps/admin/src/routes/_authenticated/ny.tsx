import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createElevator } from "~/server/elevator";
import { listOrganizationsOptions } from "~/server/organization";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { emptyValues } from "../../features/elevator/types";
import { formValuesToUpdateArgs } from "../../features/elevator/utils/form-converters";
import { ElevatorWizard } from "../../features/elevator/components/elevator-wizard";
import { getDraftKey, clearDraft } from "../../shared/lib/form-persistence";

export const Route = createFileRoute("/_authenticated/ny")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(listOrganizationsOptions());
  },
  component: NyHiss,
  pendingComponent: NyHissSkeleton,
});

function NyHissSkeleton() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-16" />
              {i < 3 && <Skeleton className="h-px w-8" />}
            </div>
          ))}
        </div>
      </div>

      {/* Form content */}
      <div className="flex-1 p-4">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t bg-background px-4 py-3">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

function NyHiss() {
  const queryClient = useQueryClient();
  const { data: orgs } = useSuspenseQuery(listOrganizationsOptions());
  const createHiss = useMutation({
    mutationFn: (input: ReturnType<typeof formValuesToUpdateArgs> & { organizationId: string; revisionYear: number }) =>
      createElevator({ data: { ...input, elevatorNumber: input.elevatorNumber ?? "" } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["elevator"] }); },
  });
  const draftKey = getDraftKey();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setIsSubmitting(true);
      try {
        if (!navigator.onLine) {
          throw new Error("OFFLINE");
        }
        const args = formValuesToUpdateArgs(value);
        await createHiss.mutateAsync({
          ...args,
          organizationId: value.organization_id,
          revisionYear: new Date().getFullYear(),
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

  const formValues = form.state.values;

  const handleSubmit = () => {
    form.handleSubmit();
  };

  const resetForm = () => {
    clearDraft(draftKey);
    form.reset();
    setSubmitSuccess(false);
    setSubmitError(null);
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
    <ElevatorWizard
      form={form}
      formValues={formValues}
      orgs={orgs}
      draftKey={draftKey}
      submitSuccess={submitSuccess}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );
}
