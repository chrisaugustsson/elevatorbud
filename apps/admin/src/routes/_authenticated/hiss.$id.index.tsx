import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  elevatorOptions,
  elevatorDetailsOptions,
  elevatorBudgetsOptions,
  customFieldDefsOptions,
  archiveElevator,
  createElevatorBudget,
  updateElevatorBudget,
  deleteElevatorBudget,
} from "~/server/elevator";
import {
  elevatorEventsOptions,
  createElevatorEvent,
  updateElevatorEvent,
  createModernizationEvent,
} from "~/server/elevator-events";
import type { ElevatorEventType } from "@elevatorbud/db/schema";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@elevatorbud/ui/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elevatorbud/ui/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  ArrowLeft,
  Pencil,
  Archive,
  Plus,
  Sparkles,
  ShieldCheck,
  MessageSquarePlus,
  Wrench,
  Replace,
} from "lucide-react";
import { toast } from "sonner";
import {
  EventDialog,
  type EventFormSubmit,
} from "~/features/elevator-events/event-dialog";
import {
  ModernizationWizard,
  type ModernizationWizardSubmit,
} from "~/features/elevator-events/modernization-wizard";
import type { ModernizationFieldKey } from "~/features/elevator-events/modernization-fields";
import {
  IdentityHero,
  type IdentityData,
} from "~/features/elevator/identity-panel";
import {
  EventList,
  PlanList,
  type EditorialEvent,
  type EditorialPlan,
} from "~/features/elevator/editorial-rows";
import {
  BudgetDialog,
  type BudgetFormSubmit,
} from "~/features/elevator/budget-dialog";

export const Route = createFileRoute("/_authenticated/hiss/$id/")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(elevatorOptions(params.id));
    context.queryClient.prefetchQuery(elevatorDetailsOptions(params.id));
    context.queryClient.prefetchQuery(elevatorBudgetsOptions(params.id));
    context.queryClient.prefetchQuery(elevatorEventsOptions(params.id));
    context.queryClient.prefetchQuery(customFieldDefsOptions());
  },
  component: HissDetail,
  pendingComponent: DetailSkeleton,
});

function HissDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: hiss } = useSuspenseQuery(elevatorOptions(id));
  const { data: details } = useSuspenseQuery(elevatorDetailsOptions(id));
  const { data: budgets } = useSuspenseQuery(elevatorBudgetsOptions(id));
  const { data: events } = useSuspenseQuery(elevatorEventsOptions(id));
  const { data: customFieldDefs } = useSuspenseQuery(customFieldDefsOptions());

  const archiveMutation = useMutation({
    mutationFn: (input: { id: string; status: "demolished" | "archived" }) =>
      archiveElevator({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elevator"] });
    },
  });
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<"demolished" | "archived">(
    "demolished",
  );
  const [isArchiving, setIsArchiving] = useState(false);

  const [eventDialog, setEventDialog] = useState<
    | { open: false }
    | { open: true; mode: "create"; type: ElevatorEventType }
    | {
        open: true;
        mode: "edit";
        type: ElevatorEventType;
        eventId: string;
        initial: {
          occurredAt: string;
          title: string;
          description: string;
          cost: string;
          performedBy: string;
        };
      }
  >({ open: false });

  const [modernizationOpen, setModernizationOpen] = useState(false);

  const [budgetDialog, setBudgetDialog] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | {
        open: true;
        mode: "edit";
        budgetId: string;
        initial: {
          recommendedModernizationYear: string;
          measures: string;
          budgetAmount: string;
        };
      }
  >({ open: false });

  const createEventMutation = useMutation({
    mutationFn: (input: {
      elevatorId: string;
      type: ElevatorEventType;
      occurredAt: string;
      title: string;
      description?: string | null;
      cost?: number | null;
      performedBy?: string | null;
    }) => createElevatorEvent({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elevator", "events", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", id] });
      toast.success("Händelse registrerad");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  const createModernizationMutation = useMutation({
    mutationFn: (input: ModernizationWizardSubmit & { elevatorId: string }) =>
      createModernizationEvent({
        data: {
          elevatorId: input.elevatorId,
          occurredAt: input.occurredAt,
          description: input.description,
          cost: input.cost,
          performedBy: input.performedBy,
          changes: input.changes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elevator", "events", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", "details", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", id] });
      toast.success("Modernisering registrerad");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: (input: {
      id: string;
      elevatorId: string;
      type: ElevatorEventType;
      occurredAt: string;
      title: string;
      description?: string | null;
      cost?: number | null;
      performedBy?: string | null;
    }) => updateElevatorEvent({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elevator", "events", id] });
      queryClient.invalidateQueries({ queryKey: ["elevator", id] });
      toast.success("Händelse uppdaterad");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  async function handleEventSubmit(values: EventFormSubmit) {
    if (!eventDialog.open) return;
    if (eventDialog.mode === "edit") {
      await updateEventMutation.mutateAsync({
        id: eventDialog.eventId,
        elevatorId: id,
        type: values.type,
        occurredAt: values.occurredAt,
        title: values.title,
        description: values.description,
        cost: values.cost,
        performedBy: values.performedBy,
      });
    } else {
      await createEventMutation.mutateAsync({
        elevatorId: id,
        type: values.type,
        occurredAt: values.occurredAt,
        title: values.title,
        description: values.description,
        cost: values.cost,
        performedBy: values.performedBy,
      });
    }
    setEventDialog({ open: false });
  }

  function openCreateDialog(type: ElevatorEventType) {
    // Modernization has a bespoke wizard; the generic dialog handles
    // inspections, repairs, and free-text notes. Replacement is a
    // dedicated page (see the "Ersätt hiss" Link in the event menu).
    if (type === "modernization") {
      setModernizationOpen(true);
      return;
    }
    setEventDialog({ open: true, mode: "create", type });
  }

  async function handleModernizationSubmit(values: ModernizationWizardSubmit) {
    await createModernizationMutation.mutateAsync({
      elevatorId: id,
      ...values,
    });
  }

  // ── Budget (planerad modernisering) mutations ───────────────────────

  const invalidateBudgetQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["elevator", "budgets", id] });
    queryClient.invalidateQueries({ queryKey: ["elevator", "budget", id] });
    queryClient.invalidateQueries({ queryKey: ["elevator", id] });
  };

  const createBudgetMutation = useMutation({
    mutationFn: (
      input: BudgetFormSubmit & { elevatorId: string },
    ) =>
      createElevatorBudget({
        data: {
          elevatorId: input.elevatorId,
          recommendedModernizationYear:
            input.recommendedModernizationYear ?? undefined,
          measures: input.measures ?? undefined,
          budgetAmount: input.budgetAmount ?? undefined,
        },
      }),
    onSuccess: () => {
      invalidateBudgetQueries();
      toast.success("Planerad modernisering skapad");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: (input: BudgetFormSubmit & { id: string }) =>
      updateElevatorBudget({
        data: {
          id: input.id,
          recommendedModernizationYear:
            input.recommendedModernizationYear ?? undefined,
          measures: input.measures ?? undefined,
          budgetAmount: input.budgetAmount ?? undefined,
        },
      }),
    onSuccess: () => {
      invalidateBudgetQueries();
      toast.success("Planerad modernisering uppdaterad");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: (budgetId: string) =>
      deleteElevatorBudget({ data: { id: budgetId } }),
    onSuccess: () => {
      invalidateBudgetQueries();
      toast.success("Planerad modernisering borttagen");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte ta bort");
    },
  });

  async function handleBudgetSubmit(values: BudgetFormSubmit) {
    if (!budgetDialog.open) return;
    if (budgetDialog.mode === "edit") {
      await updateBudgetMutation.mutateAsync({
        id: budgetDialog.budgetId,
        ...values,
      });
    } else {
      await createBudgetMutation.mutateAsync({
        elevatorId: id,
        ...values,
      });
    }
    setBudgetDialog({ open: false });
  }

  async function handleBudgetDelete() {
    if (!budgetDialog.open || budgetDialog.mode !== "edit") return;
    await deleteBudgetMutation.mutateAsync(budgetDialog.budgetId);
    setBudgetDialog({ open: false });
  }

  function openEditPlanDialog(plan: EditorialPlan) {
    setBudgetDialog({
      open: true,
      mode: "edit",
      budgetId: plan.id,
      initial: {
        recommendedModernizationYear:
          plan.recommendedYear != null ? String(plan.recommendedYear) : "",
        measures: plan.measures ?? "",
        budgetAmount:
          plan.budgetAmount != null ? String(plan.budgetAmount) : "",
      },
    });
  }

  function openEditEventDialog(event: EditorialEvent) {
    // Synthetic installation row is never editable — the pencil is hidden
    // in EventRow but guard here as well for type narrowing.
    if (event.type === "installation") return;
    const occurredAt =
      typeof event.occurredAt === "string"
        ? event.occurredAt.slice(0, 10)
        : event.occurredAt.toISOString().slice(0, 10);
    setEventDialog({
      open: true,
      mode: "edit",
      type: event.type,
      eventId: event.id,
      initial: {
        occurredAt,
        title: event.title,
        description: event.description ?? "",
        cost: event.cost != null ? String(event.cost) : "",
        performedBy: event.performedBy ?? "",
      },
    });
  }

  if (hiss === null) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-muted-foreground">
        Hissen hittades inte.
      </div>
    );
  }

  async function handleArchive() {
    setIsArchiving(true);
    try {
      await archiveMutation.mutateAsync({ id, status: archiveStatus });
      setArchiveDialogOpen(false);
      navigate({ to: "/register" });
    } catch {
      setIsArchiving(false);
    }
  }

  const identityData: IdentityData = {
    elevatorNumber: hiss.elevatorNumber,
    address: hiss.address,
    district: hiss.district,
    organizationName: hiss.organization?.name ?? null,
    contactPersonName: hiss.contactPersonName,
    maintenanceCompany: hiss.maintenanceCompany,
    inspectionAuthority: hiss.inspectionAuthority,
    inspectionMonth: hiss.inspectionMonth,
    warrantyExpiresAt: hiss.warrantyExpiresAt,
    createdAt: hiss.createdAt,
    lastUpdatedAt: hiss.lastUpdatedAt,
  };

  // Editorial rows — plans newest-urgency-first (soonest on top)
  const editorialPlans: EditorialPlan[] = budgets
    .map((b) => ({
      id: b.id,
      recommendedYear: b.recommendedModernizationYear
        ? Number(b.recommendedModernizationYear)
        : null,
      measure: firstMeasure(b.measures),
      measures: b.measures,
      budgetAmount: b.budgetAmount != null ? Number(b.budgetAmount) : null,
    }))
    .sort((a, b) => {
      // Null years sink to the bottom.
      if (a.recommendedYear == null && b.recommendedYear == null) return 0;
      if (a.recommendedYear == null) return 1;
      if (b.recommendedYear == null) return -1;
      return a.recommendedYear - b.recommendedYear;
    });

  // Events newest first for the Historik section (reverse of lifeline order)
  const editorialEvents: EditorialEvent[] = events
    .slice()
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .map((e) => ({
      id: e.id,
      type: e.type,
      occurredAt: e.occurredAt,
      title: e.title,
      description: e.description,
      cost: e.cost,
      currency: e.currency,
      performedBy: e.performedBy,
      metadata: e.metadata,
    }));

  // Current snapshot of every modernization-eligible detail field, keyed by
  // the column name. Pre-fills step 2 of the wizard and drives the "Nu:"
  // display in step 1.
  const currentDetailValues: Partial<Record<ModernizationFieldKey, unknown>> =
    details
      ? {
          controlSystemType: details.controlSystemType,
          machineType: details.machineType,
          driveSystem: details.driveSystem,
          machinePlacement: details.machinePlacement,
          suspension: details.suspension,
          doorType: details.doorType,
          doorOpening: details.doorOpening,
          doorCount: details.doorCount,
          doorCarrier: details.doorCarrier,
          doorMachine: details.doorMachine,
          cabSize: details.cabSize,
          passthrough: details.passthrough,
          dispatchMode: details.dispatchMode,
          speed: details.speed,
          loadCapacity: details.loadCapacity,
          liftHeight: details.liftHeight,
          floorCount: details.floorCount,
          shaftLighting: details.shaftLighting,
          emergencyPhone: details.emergencyPhone,
        }
      : {};

  // Synthetic installation row from buildYear — UI-only, never persisted.
  // Appended last so it sits at the bottom of the newest-first list (it's
  // always the oldest event by definition).
  if (hiss.buildYear != null) {
    editorialEvents.push({
      id: `synthetic-installation-${hiss.id}`,
      type: "installation",
      occurredAt: new Date(Date.UTC(hiss.buildYear, 0, 1)),
      title: "",
    });
  }

  // Derived KPIs for the strip under the Lifeline

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/register">
            <Button variant="ghost" size="icon" className="size-7">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <Link to="/register" className="hover:underline">
            Register
          </Link>
          {hiss.organization && (
            <>
              <span>›</span>
              <span className="hover:underline">{hiss.organization.name}</span>
            </>
          )}
          <span>›</span>
          <span className="font-medium text-foreground">
            {hiss.elevatorNumber}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hiss.status === "active" && (
            <RegisterEventMenu
              onSelect={openCreateDialog}
              elevatorId={id}
            />
          )}
          {hiss.status === "active" && (
            <Dialog
              open={archiveDialogOpen}
              onOpenChange={setArchiveDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Archive className="mr-2 size-4" />
                  Arkivera
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arkivera hiss {hiss.elevatorNumber}</DialogTitle>
                  <DialogDescription>
                    Hissen tas bort från aktiva vyer, KPI:er och
                    budgetberäkningar. Data bevaras i databasen för historisk
                    referens.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ny status</label>
                  <Select
                    value={archiveStatus}
                    onValueChange={(v) =>
                      setArchiveStatus(v as "demolished" | "archived")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demolished">Rivd</SelectItem>
                      <SelectItem value="archived">Arkiverad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setArchiveDialogOpen(false)}
                  >
                    Avbryt
                  </Button>
                  <Button onClick={handleArchive} disabled={isArchiving}>
                    {isArchiving ? "Arkiverar..." : "Bekräfta"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Link to="/hiss/$id/redigera" params={{ id }}>
            <Button size="sm" variant="outline">
              <Pencil className="mr-2 size-4" />
              Redigera
            </Button>
          </Link>
        </div>
      </header>

      {/* ─── Hero: identity as a banner, not a side panel ───────── */}
      <IdentityHero data={identityData} />

      <Tabs defaultValue="oversikt">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="oversikt">Översikt</TabsTrigger>
          <TabsTrigger value="teknik">Teknik</TabsTrigger>
        </TabsList>

        {/* ─── Översikt: Planerat then Historik. Explicit section labels
             carry the past/future split — no implicit "Nu" divider. ── */}
        <TabsContent value="oversikt" className="mt-8 space-y-16">
          <section>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                Planerat
                {editorialPlans.length > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {editorialPlans.length}
                  </span>
                )}
              </h2>
              {hiss.status === "active" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setBudgetDialog({ open: true, mode: "create" })
                  }
                >
                  <Plus className="mr-1 size-3.5" />
                  Ny planerad
                </Button>
              )}
            </div>
            <div className="mt-6">
              {editorialPlans.length > 0 ? (
                <PlanList
                  plans={editorialPlans}
                  onEdit={
                    hiss.status === "active" ? openEditPlanDialog : undefined
                  }
                />
              ) : (
                <p className="pl-14 py-2 text-sm text-muted-foreground">
                  Inga planerade moderniseringar.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              Historik
              {editorialEvents.length > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                  {editorialEvents.length}
                </span>
              )}
            </h2>
            <div className="mt-6">
              {editorialEvents.length > 0 ? (
                <EventList
                  events={editorialEvents}
                  onEdit={openEditEventDialog}
                />
              ) : (
                <p className="pl-14 py-2 text-sm text-muted-foreground">
                  Inga registrerade händelser ännu.
                </p>
              )}
            </div>
          </section>
        </TabsContent>

        {/* ─── Teknik: all spec blocks use the same Definition row
             pattern so the grid reads as one table split by theme. ── */}
        <TabsContent value="teknik" className="mt-8">
          <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
            <div>
              <h4 className="text-base font-semibold">Dörrar &amp; korg</h4>
              <DefinitionList>
                <Definition label="Typ dörrar" value={details?.doorType} />
                <Definition
                  label="Genomgång"
                  value={formatBool(details?.passthrough)}
                />
                <Definition
                  label="Manövrering"
                  value={details?.dispatchMode}
                />
                <Definition
                  label="Korgstorlek"
                  value={details?.cabSize}
                  mono
                />
                <Definition
                  label="Dörröppning"
                  value={details?.doorOpening}
                  mono
                />
                <Definition label="Dörrmaskin" value={details?.doorMachine} />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Maskineri</h4>
              <DefinitionList>
                <Definition label="Drivsystem" value={details?.driveSystem} />
                <Definition
                  label="Upphängning"
                  value={details?.suspension}
                  mono
                />
                <Definition
                  label="Maskinplacering"
                  value={details?.machinePlacement}
                />
                <Definition label="Typ maskin" value={details?.machineType} />
                <Definition
                  label="Typ styrsystem"
                  value={details?.controlSystemType}
                />
                <Definition
                  label="Schaktbelysning"
                  value={details?.shaftLighting}
                />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Teknisk specifikation</h4>
              <DefinitionList>
                <Definition label="Hisstyp" value={hiss.elevatorType} />
                <Definition label="Fabrikat" value={hiss.manufacturer} />
                <Definition label="Byggår" value={hiss.buildYear} mono />
                <Definition label="Hastighet (m/s)" value={details?.speed} mono />
                <Definition label="Lyfthöjd (m)" value={details?.liftHeight} mono />
                <Definition label="Märklast (kg)" value={details?.loadCapacity} mono />
                <Definition
                  label="Antal plan"
                  value={details?.floorCount}
                  mono
                />
                <Definition
                  label="Antal dörrar"
                  value={details?.doorCount}
                  mono
                />
                <Definition
                  label="Moderniserad"
                  value={hiss.modernizationYear ?? "Ej ombyggd"}
                />
              </DefinitionList>
            </div>

            <div>
              <h4 className="text-base font-semibold">Nödtelefon</h4>
              <DefinitionList>
                <Definition
                  label="Har nödtelefon"
                  value={formatEmergencyPhoneSummary(
                    hiss.hasEmergencyPhone,
                    details?.emergencyPhone,
                  )}
                />
                <Definition
                  label="Behöver uppgradering"
                  value={formatBool(hiss.needsUpgrade)}
                />
                <Definition
                  label="Pris"
                  value={
                    details?.emergencyPhonePrice != null
                      ? formatAmount(Number(details.emergencyPhonePrice))
                      : null
                  }
                  mono
                />
              </DefinitionList>
            </div>

            {hiss.propertyDesignation && (
              <div>
                <h4 className="text-base font-semibold">Fastighet</h4>
                <DefinitionList>
                  <Definition
                    label="Fastighetsbeteckning"
                    value={hiss.propertyDesignation}
                  />
                </DefinitionList>
              </div>
            )}

            {(() => {
              const cf = (hiss.customFields ?? {}) as Record<string, unknown>;
              const entries = customFieldDefs
                .map((def) => {
                  const raw = cf[def.key];
                  if (raw === undefined || raw === null || raw === "") return null;
                  return { def, value: formatCustomFieldValue(raw) };
                })
                .filter((e): e is { def: typeof customFieldDefs[number]; value: string } => e !== null);
              if (entries.length === 0) return null;
              return (
                <div className="md:col-span-2">
                  <h4 className="text-base font-semibold">Extrafält</h4>
                  <DefinitionList>
                    {entries.map(({ def, value }) => (
                      <Definition key={def.id} label={def.label} value={value} />
                    ))}
                  </DefinitionList>
                </div>
              );
            })()}

            {details?.comments && (
              <div className="md:col-span-2">
                <h4 className="text-base font-semibold">Kommentarer</h4>
                <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {details.comments}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>


      {eventDialog.open && (
        <EventDialog
          open={eventDialog.open}
          onOpenChange={(open) => {
            if (!open) setEventDialog({ open: false });
          }}
          type={eventDialog.type}
          mode={eventDialog.mode}
          initialValues={
            eventDialog.mode === "edit" ? eventDialog.initial : undefined
          }
          onSubmit={handleEventSubmit}
        />
      )}

      <ModernizationWizard
        open={modernizationOpen}
        onOpenChange={setModernizationOpen}
        elevatorId={id}
        currentValues={currentDetailValues}
        onSubmit={handleModernizationSubmit}
      />

      {budgetDialog.open && (
        <BudgetDialog
          open={budgetDialog.open}
          onOpenChange={(open) => {
            if (!open) setBudgetDialog({ open: false });
          }}
          mode={budgetDialog.mode}
          initialValues={
            budgetDialog.mode === "edit" ? budgetDialog.initial : undefined
          }
          onSubmit={handleBudgetSubmit}
          onDelete={
            budgetDialog.mode === "edit" ? handleBudgetDelete : undefined
          }
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Small helpers / components
// ────────────────────────────────────────────────────────────────────────

function RegisterEventMenu({
  onSelect,
  elevatorId,
}: {
  onSelect: (t: ElevatorEventType) => void;
  elevatorId: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 size-4" />
          Händelse
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSelect("modernization")}>
          <Sparkles className="mr-2 size-4" />
          Modernisering
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("inspection")}>
          <ShieldCheck className="mr-2 size-4" />
          Besiktning
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("repair")}>
          <Wrench className="mr-2 size-4" />
          Reparation
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("note")}>
          <MessageSquarePlus className="mr-2 size-4" />
          Notering
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/hiss/$id/ersatt"
            params={{ id: elevatorId }}
            className="flex w-full cursor-default items-center"
          >
            <Replace className="mr-2 size-4" />
            Ersätt hiss
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DefinitionList({ children }: { children: React.ReactNode }) {
  return (
    <dl className="mt-3 divide-y divide-border/40 text-sm">{children}</dl>
  );
}

function Definition({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "text-sm tabular-nums" : "text-sm"}>
        {value != null && value !== "" ? value : "—"}
      </dd>
    </div>
  );
}

function formatBool(v: boolean | null | undefined): string | null {
  if (v == null) return null;
  return v ? "Ja" : "Nej";
}

// Combine the boolean flag with the free-text description into a single
// readable value. "Ja · Safeline, GSM 4G, Modell, MX" when both are set;
// "Ja" alone when the flag is true but no description; "Nej" when the
// flag is false; null when we have no info.
function formatEmergencyPhoneSummary(
  has: boolean | null | undefined,
  text: string | null | undefined,
): string | null {
  if (has == null) return null;
  if (!has) return "Nej";
  return text && text.trim() !== "" ? `Ja · ${text}` : "Ja";
}

// Render an opaque JSONB value for the Extrafält list. Booleans become
// Ja/Nej (matches the rest of this page); numbers/strings stringify; any
// other shape (array/object) falls back to JSON so the admin at least
// sees something rather than "[object Object]".
function formatCustomFieldValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Ja" : "Nej";
  if (typeof v === "string" || typeof v === "number") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function formatAmount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("sv-SE")} kr`;
}

function firstMeasure(measures: string | null): string | null {
  if (!measures) return null;
  const first = measures.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

// ────────────────────────────────────────────────────────────────────────
// Skeleton
// ────────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-80" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="space-y-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
