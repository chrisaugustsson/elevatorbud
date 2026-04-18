import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@elevatorbud/ui/components/ui/dialog";
import type { ElevatorEventType } from "@elevatorbud/db/schema";
import { EVENT_PRESENTATION } from "./event-presentation";

export type EventFormValues = {
  type: ElevatorEventType;
  occurredAt: string; // YYYY-MM-DD from date input
  title: string;
  description: string;
  cost: string; // string in form; parsed before submit
  performedBy: string;
};

export type EventFormSubmit = {
  type: ElevatorEventType;
  occurredAt: string;
  title: string;
  description?: string | null;
  cost?: number | null;
  performedBy?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ElevatorEventType;
  mode: "create" | "edit";
  initialValues?: Partial<EventFormValues>;
  onSubmit: (values: EventFormSubmit) => Promise<void>;
};

const DIALOG_COPY: Record<
  ElevatorEventType,
  { create: string; edit: string; description: string }
> = {
  modernization: {
    create: "Registrera modernisering",
    edit: "Redigera modernisering",
    description:
      "Registrera en utförd modernisering. Ange datum, vad som gjordes och kostnad.",
  },
  inspection: {
    create: "Registrera besiktning",
    edit: "Redigera besiktning",
    description:
      "Registrera utfall från en besiktning. Ange datum, organ och eventuella anmärkningar.",
  },
  note: {
    create: "Lägg till notering",
    edit: "Redigera notering",
    description: "Fri text för anteckningar om hissen.",
  },
  repair: {
    create: "Registrera reparation",
    edit: "Redigera reparation",
    description: "Registrera en utförd reparation, vad som åtgärdades och kostnad.",
  },
  service: {
    create: "Registrera service",
    edit: "Redigera service",
    description: "Registrera en genomförd service.",
  },
  replacement: {
    create: "Registrera utbyte",
    edit: "Redigera utbyte",
    description: "Registrera att hissen bytts ut på platsen.",
  },
  inventory: {
    create: "Registrera inventering",
    edit: "Redigera inventering",
    description: "Registrera en inventering / besökt hiss.",
  },
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EventDialog({
  open,
  onOpenChange,
  type,
  mode,
  initialValues,
  onSubmit,
}: Props) {
  const copy = DIALOG_COPY[type];
  const showCost = type !== "note" && type !== "inspection";
  const showPerformedBy = type !== "note";

  const form = useForm({
    defaultValues: {
      type,
      occurredAt: initialValues?.occurredAt ?? todayIso(),
      title:
        initialValues?.title ?? defaultTitleFor(type),
      description: initialValues?.description ?? "",
      cost: initialValues?.cost ?? "",
      performedBy: initialValues?.performedBy ?? "",
    } satisfies EventFormValues,
    onSubmit: async ({ value }) => {
      const costNum =
        value.cost.trim() === ""
          ? null
          : Number(value.cost.replace(",", "."));
      await onSubmit({
        type: value.type,
        occurredAt: value.occurredAt,
        title: value.title.trim(),
        description: value.description.trim() || null,
        cost: costNum != null && Number.isFinite(costNum) ? costNum : null,
        performedBy: value.performedBy.trim() || null,
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? copy.edit : copy.create}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="occurredAt"
            validators={{
              onChange: ({ value }) =>
                !value ? "Datum krävs" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Datum <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="date"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {err}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Titel krävs" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Titel <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={placeholderTitleFor(type)}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((err, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {err}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Beskrivning</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={4}
                  placeholder={placeholderDescriptionFor(type)}
                />
              </div>
            )}
          </form.Field>

          {showCost && (
            <form.Field
              name="cost"
              validators={{
                onChange: ({ value }) => {
                  if (value.trim() === "") return undefined;
                  const n = Number(value.replace(",", "."));
                  if (!Number.isFinite(n)) return "Ogiltig kostnad";
                  if (n < 0) return "Kostnad kan inte vara negativ";
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Kostnad (SEK)</Label>
                  <Input
                    id={field.name}
                    type="text"
                    inputMode="decimal"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="t.ex. 12000"
                  />
                  {field.state.meta.isTouched &&
                    field.state.meta.errors.map((err, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {err}
                      </p>
                    ))}
                </div>
              )}
            </form.Field>
          )}

          {showPerformedBy && (
            <form.Field name="performedBy">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    {performedByLabelFor(type)}
                  </Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder={performedByPlaceholderFor(type)}
                  />
                </div>
              )}
            </form.Field>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Sparar..." : "Spara"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultTitleFor(type: ElevatorEventType): string {
  return EVENT_PRESENTATION[type].label;
}

function placeholderTitleFor(type: ElevatorEventType): string {
  switch (type) {
    case "modernization":
      return "t.ex. Byte av styrsystem och dörrmaskin";
    case "inspection":
      return "t.ex. Ordinarie besiktning godkänd";
    case "repair":
      return "t.ex. Bytt dörrmaskin";
    case "note":
      return "Kort rubrik";
    default:
      return EVENT_PRESENTATION[type].label;
  }
}

function placeholderDescriptionFor(type: ElevatorEventType): string {
  switch (type) {
    case "modernization":
      return "Beskriv vad som moderniserades och eventuella garantier.";
    case "inspection":
      return "Utfall, anmärkningar, nästa besiktningsdatum.";
    case "repair":
      return "Vad gick sönder, vad gjordes, stilleståndstid m.m.";
    case "note":
      return "Fri text.";
    default:
      return "Valfri beskrivning.";
  }
}

function performedByLabelFor(type: ElevatorEventType): string {
  switch (type) {
    case "inspection":
      return "Besiktningsorgan";
    case "modernization":
    case "repair":
    case "service":
      return "Leverantör";
    default:
      return "Utfört av";
  }
}

function performedByPlaceholderFor(type: ElevatorEventType): string {
  switch (type) {
    case "inspection":
      return "t.ex. Kiwa";
    case "modernization":
    case "repair":
    case "service":
      return "Företagsnamn";
    default:
      return "";
  }
}
