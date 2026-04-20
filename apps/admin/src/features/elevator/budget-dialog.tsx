import { useState } from "react";
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
import { Trash2 } from "lucide-react";

export type BudgetFormValues = {
  recommendedModernizationYear: string;
  measures: string;
  budgetAmount: string;
};

export type BudgetFormSubmit = {
  recommendedModernizationYear: string | null;
  measures: string | null;
  budgetAmount: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues?: Partial<BudgetFormValues>;
  onSubmit: (values: BudgetFormSubmit) => Promise<void>;
  // Only provided in edit mode — wiring delete into the same dialog keeps
  // the row action surface small and colocates destructive intent with
  // the form that created the record.
  onDelete?: () => Promise<void>;
};

export function BudgetDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  onDelete,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    defaultValues: {
      recommendedModernizationYear:
        initialValues?.recommendedModernizationYear ?? "",
      measures: initialValues?.measures ?? "",
      budgetAmount: initialValues?.budgetAmount ?? "",
    } satisfies BudgetFormValues,
    onSubmit: async ({ value }) => {
      const budgetNum =
        value.budgetAmount.trim() === ""
          ? null
          : Number(value.budgetAmount.replace(/\s/g, "").replace(",", "."));
      await onSubmit({
        recommendedModernizationYear:
          value.recommendedModernizationYear.trim() || null,
        measures: value.measures.trim() || null,
        budgetAmount:
          budgetNum != null && Number.isFinite(budgetNum) ? budgetNum : null,
      });
    },
  });

  async function handleDelete() {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          setConfirmDelete(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "Redigera planerad modernisering"
              : "Ny planerad modernisering"}
          </DialogTitle>
          <DialogDescription>
            Registrera en framtida modernisering med rekommenderat år,
            åtgärder och budget.
          </DialogDescription>
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
            name="recommendedModernizationYear"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return "Rekommenderat år krävs";
                if (!/^\d{4}$/.test(value.trim()))
                  return "Ange 4-siffrigt år";
                const n = Number(value);
                if (n < 1800 || n > 2100) return "År 1800–2100";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Rekommenderat år <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="text"
                  inputMode="numeric"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="t.ex. 2030"
                  maxLength={4}
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

          <form.Field name="measures">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Åtgärder</Label>
                <Textarea
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={4}
                  placeholder="t.ex. Styrsystem byts, Knappar & tablåer byts..."
                />
                <p className="text-xs text-muted-foreground">
                  Första åtgärden används som titel. Separera med komma.
                </p>
              </div>
            )}
          </form.Field>

          <form.Field
            name="budgetAmount"
            validators={{
              onChange: ({ value }) => {
                if (value.trim() === "") return undefined;
                const n = Number(value.replace(/\s/g, "").replace(",", "."));
                if (!Number.isFinite(n)) return "Ogiltig summa";
                if (n < 0) return "Summa kan inte vara negativ";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Budget (SEK)</Label>
                <Input
                  id={field.name}
                  type="text"
                  inputMode="decimal"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="t.ex. 450000"
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

          <DialogFooter className="flex items-center sm:justify-between">
            {mode === "edit" && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Säker?
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Tar bort..." : "Ta bort"}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Ta bort
                </Button>
              )
            ) : (
              <span />
            )}

            <div className="flex gap-2">
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
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
