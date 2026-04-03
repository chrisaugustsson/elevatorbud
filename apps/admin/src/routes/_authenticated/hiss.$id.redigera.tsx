import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  ArrowLeft,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  CheckCircle2,
  Phone,
  MessageSquare,
  Save,
} from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";
import {
  getDraftKey,
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
} from "../../lib/form-persistence";

export const Route = createFileRoute("/_authenticated/hiss/$id/redigera")({
  component: RedigeraHiss,
});

type HissFormValues = {
  organization_id: string;
  elevator_number: string;
  address: string;
  elevator_designation: string;
  district: string;
  elevator_type: string;
  manufacturer: string;
  build_year: string;
  speed: string;
  lift_height: string;
  load_capacity: string;
  floor_count: string;
  door_count: string;
  door_type: string;
  passthrough: boolean;
  collective: string;
  cab_size: string;
  daylight_opening: string;
  grab_rail: string;
  door_machine: string;
  drive_system: string;
  suspension: string;
  machine_placement: string;
  machine_type: string;
  control_system_type: string;
  inspection_authority: string;
  inspection_month: string;
  maintenance_company: string;
  shaft_lighting: string;
  modernization_year: string;
  warranty: boolean;
  recommended_modernization_year: string;
  budget_amount: string;
  modernization_measures: string;
  has_emergency_phone: boolean;
  emergency_phone_model: string;
  emergency_phone_type: string;
  needs_upgrade: boolean;
  emergency_phone_price: string;
  comments: string;
};

const emptyValues: HissFormValues = {
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
  return useForm({ defaultValues: emptyValues });
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

/** Convert server hiss document to form values (numbers → strings, undefined → "") */
function serverToFormValues(hiss: Record<string, unknown>): HissFormValues {
  return {
    organization_id: (hiss.organization_id as string) ?? "",
    elevator_number: (hiss.elevator_number as string) ?? "",
    address: (hiss.address as string) ?? "",
    elevator_designation: (hiss.elevator_designation as string) ?? "",
    district: (hiss.district as string) ?? "",
    elevator_type: (hiss.elevator_type as string) ?? "",
    manufacturer: (hiss.manufacturer as string) ?? "",
    build_year: hiss.build_year != null ? String(hiss.build_year) : "",
    speed: (hiss.speed as string) ?? "",
    lift_height: (hiss.lift_height as string) ?? "",
    load_capacity: (hiss.load_capacity as string) ?? "",
    floor_count: hiss.floor_count != null ? String(hiss.floor_count) : "",
    door_count: hiss.door_count != null ? String(hiss.door_count) : "",
    door_type: (hiss.door_type as string) ?? "",
    passthrough: (hiss.passthrough as boolean) ?? false,
    collective: (hiss.collective as string) ?? "",
    cab_size: (hiss.cab_size as string) ?? "",
    daylight_opening: (hiss.daylight_opening as string) ?? "",
    grab_rail: (hiss.grab_rail as string) ?? "",
    door_machine: (hiss.door_machine as string) ?? "",
    drive_system: (hiss.drive_system as string) ?? "",
    suspension: (hiss.suspension as string) ?? "",
    machine_placement: (hiss.machine_placement as string) ?? "",
    machine_type: (hiss.machine_type as string) ?? "",
    control_system_type: (hiss.control_system_type as string) ?? "",
    inspection_authority: (hiss.inspection_authority as string) ?? "",
    inspection_month: (hiss.inspection_month as string) ?? "",
    maintenance_company: (hiss.maintenance_company as string) ?? "",
    shaft_lighting: (hiss.shaft_lighting as string) ?? "",
    modernization_year: (hiss.modernization_year as string) ?? "",
    warranty: (hiss.warranty as boolean) ?? false,
    recommended_modernization_year:
      (hiss.recommended_modernization_year as string) ?? "",
    budget_amount:
      hiss.budget_amount != null ? String(hiss.budget_amount) : "",
    modernization_measures:
      (hiss.modernization_measures as string) ?? "",
    has_emergency_phone: (hiss.has_emergency_phone as boolean) ?? false,
    emergency_phone_model: (hiss.emergency_phone_model as string) ?? "",
    emergency_phone_type: (hiss.emergency_phone_type as string) ?? "",
    needs_upgrade: (hiss.needs_upgrade as boolean) ?? false,
    emergency_phone_price:
      hiss.emergency_phone_price != null ? String(hiss.emergency_phone_price) : "",
    comments: (hiss.comments as string) ?? "",
  };
}

/** Check if a field value has changed from the original */
function isChanged(
  key: keyof HissFormValues,
  current: HissFormValues,
  original: HissFormValues,
): boolean {
  const cur = current[key];
  const orig = original[key];
  if (typeof cur === "boolean") return cur !== orig;
  return (cur ?? "").toString().trim() !== (orig ?? "").toString().trim();
}

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

function RedigeraHiss() {
  const { id } = Route.useParams();
  const hiss = useQuery(api.elevators.crud.get, { id: id as never });
  const orgs = useQuery(api.organizations.list);
  const updateHiss = useMutation(api.elevators.crud.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const draftKey = getDraftKey(id);

  // Original values from server — set once on load
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
        // Update original values to current after save
        setOriginalValues({ ...value });
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          (err.message === "OFFLINE" || err.message.includes("fetch"))
        ) {
          setSubmitError(
            "Ingen uppkoppling \u2014 f\u00f6rs\u00f6k igen n\u00e4r du har n\u00e4t",
          );
        } else {
          setSubmitError(
            err instanceof Error ? err.message : "Ett ov\u00e4ntat fel uppstod",
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Initialize form from server data (or draft)
  useEffect(() => {
    if (!hiss || initialized) return;

    const serverVals = serverToFormValues(hiss as Record<string, unknown>);
    setOriginalValues(serverVals);

    // Check for draft
    if (hasDraft(draftKey)) {
      setDraftPromptVisible(true);
      // Still set form to server values initially
      for (const [key, value] of Object.entries(serverVals)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    } else {
      for (const [key, value] of Object.entries(serverVals)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    }
    setInitialized(true);
  }, [hiss, initialized, draftKey, form]);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft<HissFormValues>(draftKey);
    if (draft) {
      for (const [key, value] of Object.entries(draft.values)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
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
    if (!initialized || submitSuccess || draftPromptVisible) return;
    const timer = setTimeout(() => {
      // Only save if there are changes from original
      if (!originalValues) return;
      const hasChanges = (
        Object.keys(originalValues) as Array<keyof HissFormValues>
      ).some((key) => isChanged(key, formValues, originalValues));
      if (hasChanges) {
        saveDraft(draftKey, formValues);
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
  }, [
    formValues,
    draftKey,
    initialized,
    submitSuccess,
    draftPromptVisible,
    originalValues,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

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
          <h2 className="text-xl font-semibold">\u00c4ndringar sparade!</h2>
          <p className="text-muted-foreground">
            Hiss {(hiss as { elevator_number: string }).elevator_number} har uppdaterats.
          </p>
          <div className="mt-4 flex gap-3">
            <Link to="/sok">
              <Button variant="outline" className="h-12 text-base">
                <ArrowLeft className="mr-1 size-5" />
                Tillbaka till s\u00f6k
              </Button>
            </Link>
            <Button
              className="h-12 text-base"
              onClick={() => setSubmitSuccess(false)}
            >
              Forts\u00e4tt redigera
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
              Anv\u00e4nd serverdata
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/sok">
              <Button variant="ghost" size="sm" className="h-9 px-2">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
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
                {changedCount} \u00e4ndr{changedCount === 1 ? "ing" : "ingar"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="space-y-6">
          {/* Organisation */}
          <form.Field name="organization_id">
            {(field) => (
              <div
                className={cn(
                  "space-y-1.5 rounded-md p-3",
                  originalValues &&
                    isChanged("organization_id", formValues, originalValues) &&
                    "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                )}
              >
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

          {/* Section 1: Identifiering */}
          <EditSection title="1. Identifiering">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("elevator_number", formValues, originalValues)
              }
            >
              <form.Field name="elevator_number">
                {(field) => (
                  <HissnummerField field={field} currentHissId={id} />
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("address", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="elevator_designation"
              label="Hissbeteckning"
              category="elevator_designation"
              placeholder="V\u00e4lj eller ange beteckning..."
              changed={
                !!originalValues &&
                isChanged("elevator_designation", formValues, originalValues)
              }
            />

            <ComboboxField
              form={form}
              name="district"
              label="Distrikt"
              category="district"
              placeholder="V\u00e4lj eller ange distrikt..."
              changed={
                !!originalValues &&
                isChanged("district", formValues, originalValues)
              }
            />
          </EditSection>

          {/* Section 2: Teknisk specifikation */}
          <EditSection title="2. Teknisk specifikation">
            <ComboboxField
              form={form}
              name="elevator_type"
              label="Hisstyp"
              category="elevator_type"
              placeholder="V\u00e4lj eller ange hisstyp..."
              changed={
                !!originalValues &&
                isChanged("elevator_type", formValues, originalValues)
              }
            />

            <ComboboxField
              form={form}
              name="manufacturer"
              label="Fabrikat"
              category="manufacturer"
              placeholder="V\u00e4lj eller ange fabrikat..."
              changed={
                !!originalValues &&
                isChanged("manufacturer", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("build_year", formValues, originalValues)
              }
            >
              <form.Field name="build_year">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="build_year">Bygg\u00e5r</Label>
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
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("speed", formValues, originalValues)
                }
              >
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
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("lift_height", formValues, originalValues)
                }
              >
                <form.Field name="lift_height">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="lift_height">Lyfth\u00f6jd</Label>
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
              </FieldWrapper>
            </div>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("load_capacity", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("floor_count", formValues, originalValues)
                }
              >
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
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("door_count", formValues, originalValues)
                }
              >
                <form.Field name="door_count">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="door_count">Antal d\u00f6rrar</Label>
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
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 3: D\u00f6rrar och korg */}
          <EditSection title="3. D\u00f6rrar och korg">
            <ComboboxField
              form={form}
              name="door_type"
              label="Typ d\u00f6rrar"
              category="door_type"
              placeholder="V\u00e4lj eller ange d\u00f6rrtyp..."
              changed={
                !!originalValues &&
                isChanged("door_type", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("passthrough", formValues, originalValues)
              }
            >
              <form.Field name="passthrough">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor="passthrough" className="cursor-pointer">
                      Genomg\u00e5ng
                    </Label>
                    <Switch
                      id="passthrough"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="collective"
              label="Kollektiv"
              category="collective"
              placeholder="V\u00e4lj eller ange kollektiv..."
              changed={
                !!originalValues &&
                isChanged("collective", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("cab_size", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("daylight_opening", formValues, originalValues)
              }
            >
              <form.Field name="daylight_opening">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="daylight_opening">Dag\u00f6ppning</Label>
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
            </FieldWrapper>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("grab_rail", formValues, originalValues)
                }
              >
                <form.Field name="grab_rail">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="grab_rail">B\u00e4rbeslag</Label>
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
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("door_machine", formValues, originalValues)
                }
              >
                <form.Field name="door_machine">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="door_machine">D\u00f6rrmaskin</Label>
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
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 4: Maskineri */}
          <EditSection title="4. Maskineri">
            <ComboboxField
              form={form}
              name="drive_system"
              label="Drivsystem"
              category="drive_system"
              placeholder="V\u00e4lj eller ange drivsystem..."
              changed={
                !!originalValues &&
                isChanged("drive_system", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("suspension", formValues, originalValues)
              }
            >
              <form.Field name="suspension">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="suspension">Upph\u00e4ngning</Label>
                    <Input
                      id="suspension"
                      className="h-11"
                      placeholder="Ange upph\u00e4ngning..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="machine_placement"
              label="Maskinplacering"
              category="machine_placement"
              placeholder="V\u00e4lj eller ange maskinplacering..."
              changed={
                !!originalValues &&
                isChanged("machine_placement", formValues, originalValues)
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("machine_type", formValues, originalValues)
                }
              >
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
              </FieldWrapper>

              <FieldWrapper
                changed={
                  !!originalValues &&
                  isChanged("control_system_type", formValues, originalValues)
                }
              >
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
              </FieldWrapper>
            </div>
          </EditSection>

          {/* Section 5: Besiktning och underh\u00e5ll */}
          <EditSection title="5. Besiktning och underh\u00e5ll">
            <ComboboxField
              form={form}
              name="inspection_authority"
              label="Besiktningsorgan"
              category="inspection_authority"
              placeholder="V\u00e4lj eller ange besiktningsorgan..."
              changed={
                !!originalValues &&
                isChanged("inspection_authority", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("inspection_month", formValues, originalValues)
              }
            >
              <form.Field name="inspection_month">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label>Besiktningsm\u00e5nad</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                    >
                      <SelectTrigger className="h-11 w-full">
                        <SelectValue placeholder="V\u00e4lj m\u00e5nad..." />
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
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="maintenance_company"
              label="Sk\u00f6tself\u00f6retag"
              category="maintenance_company"
              placeholder="V\u00e4lj eller ange sk\u00f6tself\u00f6retag..."
              changed={
                !!originalValues &&
                isChanged("maintenance_company", formValues, originalValues)
              }
            />

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("shaft_lighting", formValues, originalValues)
              }
            >
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
            </FieldWrapper>
          </EditSection>

          {/* Section 6: Modernisering */}
          <EditSection title="6. Modernisering">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("modernization_year", formValues, originalValues)
              }
            >
              <form.Field name="modernization_year">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="modernization_year">Moderniserings\u00e5r</Label>
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("warranty", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged(
                  "recommended_modernization_year",
                  formValues,
                  originalValues,
                )
              }
            >
              <form.Field name="recommended_modernization_year">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="recommended_modernization_year">
                      Rekommenderat moderniserings\u00e5r
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("budget_amount", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <ComboboxField
              form={form}
              name="modernization_measures"
              label="\u00c5tg\u00e4rder vid modernisering"
              category="modernization_measures"
              placeholder="V\u00e4lj eller ange \u00e5tg\u00e4rder..."
              changed={
                !!originalValues &&
                isChanged(
                  "modernization_measures",
                  formValues,
                  originalValues,
                )
              }
            />
          </EditSection>

          {/* Section 7: N\u00f6dtelefon */}
          <EditSection title="7. N\u00f6dtelefon">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("has_emergency_phone", formValues, originalValues)
              }
            >
              <form.Field name="has_emergency_phone">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label htmlFor="has_emergency_phone" className="cursor-pointer">
                      <Phone className="mr-1.5 inline size-4" />
                      Har n\u00f6dtelefon
                    </Label>
                    <Switch
                      id="has_emergency_phone"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("emergency_phone_model", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("emergency_phone_type", formValues, originalValues)
              }
            >
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
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("needs_upgrade", formValues, originalValues)
              }
            >
              <form.Field name="needs_upgrade">
                {(field) => (
                  <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
                    <Label
                      htmlFor="needs_upgrade"
                      className="cursor-pointer"
                    >
                      Beh\u00f6ver uppgradering
                    </Label>
                    <Switch
                      id="needs_upgrade"
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>

            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("emergency_phone_price", formValues, originalValues)
              }
            >
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
            </FieldWrapper>
          </EditSection>

          {/* Section 8: Kommentarer */}
          <EditSection title="8. Kommentarer">
            <FieldWrapper
              changed={
                !!originalValues &&
                isChanged("comments", formValues, originalValues)
              }
            >
              <form.Field name="comments">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="comments">
                      <MessageSquare className="mr-1.5 inline size-4" />
                      Kommentarer
                    </Label>
                    <Textarea
                      id="comments"
                      className="min-h-[120px]"
                      placeholder="Skriv eventuella kommentarer h\u00e4r..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldWrapper>
          </EditSection>
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
          <Link to="/sok" className="flex-1">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base"
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-1 size-5" />
              Avbryt
            </Button>
          </Link>
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
                ? `Spara ${changedCount} \u00e4ndring${changedCount === 1 ? "" : "ar"}`
                : "Inga \u00e4ndringar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Reusable Components ---

function EditSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4 px-3 py-3">{children}</div>
    </div>
  );
}

function FieldWrapper({
  changed,
  children,
}: {
  changed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md p-2 transition-colors",
        changed &&
          "border-l-4 border-l-amber-500 bg-amber-50/50 pl-3 dark:bg-amber-950/20",
      )}
    >
      {children}
    </div>
  );
}

function ComboboxField({
  form,
  name,
  label,
  category,
  placeholder,
  changed,
}: {
  form: HissForm;
  name: keyof HissFormValues;
  label: string;
  category: string;
  placeholder: string;
  changed: boolean;
}) {
  const suggestions = useSuggestions(category);
  return (
    <FieldWrapper changed={changed}>
      <form.Field name={name}>
        {(field) => (
          <div className="space-y-1.5">
            <Label>{label}</Label>
            <Combobox
              value={field.state.value as string}
              onChange={(val) => field.handleChange(val as never)}
              suggestions={suggestions}
              placeholder={placeholder}
            />
          </div>
        )}
      </form.Field>
    </FieldWrapper>
  );
}

function HissnummerField({
  field,
  currentHissId,
}: {
  field: {
    state: { value: string };
    handleChange: (value: string) => void;
  };
  currentHissId: string;
}) {
  const elevatorNumber = field.state.value;
  const checkResult = useQuery(
    api.elevators.crud.checkElevatorNumber,
    elevatorNumber
      ? { elevator_number: elevatorNumber, excludeId: currentHissId as never }
      : "skip",
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
