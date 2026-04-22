import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, useBlocker } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@elevatorbud/ui/components/ui/dialog";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  elevatorOptions,
  elevatorDetailsOptions,
} from "~/server/elevator";
import { createReplacementEvent } from "~/server/elevator-events";
import {
  ReplacementPage,
  type OutgoingSummary,
  type ReplacementPageSubmit,
} from "~/features/elevator-events/replacement-page";

export const Route = createFileRoute("/_authenticated/hiss/$id/ersatt")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(elevatorOptions(params.id));
    context.queryClient.prefetchQuery(elevatorDetailsOptions(params.id));
  },
  component: HissErsatt,
  pendingComponent: Loading,
});

function HissErsatt() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: hiss } = useSuspenseQuery(elevatorOptions(id));
  const { data: details } = useSuspenseQuery(elevatorDetailsOptions(id));

  const [dirty, setDirty] = useState(false);

  // Mirror `dirty` into a ref so the blocker sees the latest value
  // synchronously. A plain `shouldBlockFn: () => dirty` closes over the
  // committed render's `dirty`, which breaks the submit-then-navigate
  // path: setDirty(false) queues a re-render, navigate() runs the blocker
  // on the current render, and the blocker still sees dirty=true. The
  // ref is mutated before navigate() and reflects state immediately.
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Intercept browser back / gesture nav / tab-close when the form has
  // unsaved changes. `withResolver: true` lets us render a styled dialog
  // instead of the native prompt (matches the pattern in admin.import.tsx).
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    enableBeforeUnload: () => dirtyRef.current,
    disabled: !dirty,
    withResolver: true,
  });

  const replacementMutation = useMutation({
    mutationFn: (input: ReplacementPageSubmit) =>
      createReplacementEvent({
        data: {
          elevatorId: id,
          occurredAt: input.occurredAt,
          description: input.description,
          cost: input.cost,
          performedBy: input.performedBy,
          newIdentity: input.newIdentity,
          newDetails: input.newDetails,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elevator", "events", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", "details", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", id] });
      toast.success("Hissen har ersatts");
      // Mark clean BEFORE navigating so the blocker doesn't fire. The
      // ref mutates synchronously; the state setter queues a re-render
      // which will never commit because the component unmounts.
      dirtyRef.current = false;
      setDirty(false);
      navigate({ to: "/hiss/$id", params: { id } });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  if (hiss === null) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-muted-foreground">
        Hissen hittades inte.
      </div>
    );
  }

  const outgoing: OutgoingSummary = {
    elevatorNumber: hiss.elevatorNumber,
    manufacturer: hiss.manufacturer,
    buildYear: hiss.buildYear,
    details: {
      speed: details?.speed ?? null,
      liftHeight: details?.liftHeight ?? null,
      loadCapacity: details?.loadCapacity ?? null,
      doorCount: details?.doorCount ?? null,
      doorType: details?.doorType ?? null,
      doorOpening: details?.doorOpening ?? null,
      doorCarrier: details?.doorCarrier ?? null,
      doorMachine: details?.doorMachine ?? null,
      cabSize: details?.cabSize ?? null,
      passthrough: details?.passthrough ?? null,
      dispatchMode: details?.dispatchMode ?? null,
      driveSystem: details?.driveSystem ?? null,
      suspension: details?.suspension ?? null,
      machinePlacement: details?.machinePlacement ?? null,
      machineType: details?.machineType ?? null,
      controlSystemType: details?.controlSystemType ?? null,
      shaftLighting: details?.shaftLighting ?? null,
      emergencyPhone: details?.emergencyPhone ?? null,
      emergencyPhonePrice: details?.emergencyPhonePrice ?? null,
    },
  };

  async function handleSubmit(values: ReplacementPageSubmit) {
    await replacementMutation.mutateAsync(values);
  }

  function handleCancel() {
    // Navigate away — the blocker will intercept if dirty and prompt.
    navigate({ to: "/hiss/$id", params: { id } });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ReplacementPage
        elevatorId={id}
        outgoing={outgoing}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDirtyChange={setDirty}
      />

      {/* Navigation blocker dialog — styled, matches the app's design
          language. Browser back / gesture / cancel / tab-close all route
          through here when `dirty` is true. */}
      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lämna utbytet?</DialogTitle>
            <DialogDescription>
              Du har osparade ändringar. Ett utkast sparas lokalt så du kan
              fortsätta senare, men lämna sidan nu om du vill avbryta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Stanna kvar
            </Button>
            <Button onClick={() => blocker.proceed?.()}>Lämna sidan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-12 w-80" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
