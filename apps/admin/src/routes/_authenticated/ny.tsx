import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { emptyValues } from "../../features/elevator/types";
import { formValuesToUpdateArgs } from "../../features/elevator/utils/form-converters";
import { ElevatorWizard } from "../../features/elevator/components/elevator-wizard";
import { getDraftKey, clearDraft } from "../../shared/lib/form-persistence";

export const Route = createFileRoute("/_authenticated/ny")({
  component: NyHiss,
});

function NyHiss() {
  const orgs = useQuery(api.organizations.list);
  const createHiss = useMutation(api.elevators.crud.create);
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
        await createHiss({
          ...args,
          organization_id: value.organization_id as never,
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
