import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@elevatorbud/ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  Plus,
  Pencil,
  Merge,
  Ban,
  Database,
  CheckCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/referensdata")({
  component: Referensdata,
});

const CATEGORIES = [
  "elevator_type",
  "manufacturer",
  "district",
  "maintenance_company",
  "inspection_authority",
  "elevator_designation",
  "door_type",
  "collective",
  "drive_system",
  "machine_placement",
  "modernization_measures",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  elevator_type: "Hisstyp",
  manufacturer: "Fabrikat",
  district: "Distrikt",
  maintenance_company: "Skötselföretag",
  inspection_authority: "Besiktningsorgan",
  elevator_designation: "Hissbeteckning",
  door_type: "Typ dörrar",
  collective: "Kollektiv",
  drive_system: "Drivsystem",
  machine_placement: "Maskinplacering",
  modernization_measures: "Åtgärder vid modernisering",
};

type SuggestedValue = {
  _id: string;
  category: string;
  value: string;
  active: boolean;
  created_at: number;
};

function Referensdata() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("elevator_type");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<SuggestedValue | null>(null);
  const [mergeItem, setMergeItem] = useState<SuggestedValue | null>(null);

  const values = useQuery(api.suggestedValues.list, {
    category: selectedCategory,
  });
  const createValue = useMutation(api.suggestedValues.create);
  const updateValue = useMutation(api.suggestedValues.update);
  const mergeValue = useMutation(api.suggestedValues.merge);
  const deactivateValue = useMutation(api.suggestedValues.deactivate);

  const filteredValues = (values as SuggestedValue[] | undefined)?.filter(
    (item) => item.value.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = filteredValues?.filter((v) => v.active).length ?? 0;
  const inactiveCount = filteredValues?.filter((v) => !v.active).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Referensdata</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hantera förslagsvärden som används i formulärfält.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-64">
          <Label>Category</Label>
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              setSelectedCategory(val as Category);
              setSearch("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((kat) => (
                <SelectItem key={kat} value={kat}>
                  {CATEGORY_LABELS[kat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Input
            placeholder="Sök värden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Nytt värde
        </Button>
      </div>

      {values === undefined ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laddar värden...</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{activeCount} aktiva</span>
            {inactiveCount > 0 && <span>{inactiveCount} inaktiva</span>}
          </div>

          {filteredValues && filteredValues.length > 0 ? (
            <div className="grid gap-2">
              {filteredValues.map((item) => (
                <Card
                  key={item._id}
                  className={
                    !item.active ? "border-dashed opacity-60" : undefined
                  }
                >
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.value}</span>
                      {!item.active && (
                        <Badge variant="secondary">Inaktiv</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRenameItem(item)}
                        title="Byt namn"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {item.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMergeItem(item)}
                          title="Slå ihop med annat värde"
                        >
                          <Merge className="size-4" />
                        </Button>
                      )}
                      {item.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await deactivateValue({
                              id: item._id as never,
                            });
                          }}
                          title="Inaktivera"
                        >
                          <Ban className="size-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Database className="size-8" />
                <p>Inga värden hittades.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <CreateValueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        category={selectedCategory}
        onSubmit={async (val) => {
          await createValue({ category: selectedCategory, value: val });
          setCreateOpen(false);
        }}
      />

      <RenameDialog
        item={renameItem}
        onOpenChange={(open) => {
          if (!open) setRenameItem(null);
        }}
        onSubmit={async (newVarde) => {
          if (!renameItem) return;
          await updateValue({ id: renameItem._id as never, value: newVarde });
          setRenameItem(null);
        }}
      />

      <MergeDialog
        item={mergeItem}
        allValues={
          (values as SuggestedValue[] | undefined)?.filter((v) => v.active) ?? []
        }
        onOpenChange={(open) => {
          if (!open) setMergeItem(null);
        }}
        onSubmit={async (targetId) => {
          if (!mergeItem) return;
          await mergeValue({
            sourceId: mergeItem._id as never,
            targetId: targetId as never,
          });
          setMergeItem(null);
        }}
      />
    </div>
  );
}

function CreateValueDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSubmit: (value: string) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: { value: "" },
    onSubmit: async ({ value }) => {
      await onSubmit(value.value.trim());
      form.reset();
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nytt värde</DialogTitle>
          <DialogDescription>
            Lägg till ett nytt förslagsvärde i kategorin{" "}
            <strong>{CATEGORY_LABELS[category]}</strong>.
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
            name="value"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Värde krävs" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Värde <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Ange värde"
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

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
                  {isSubmitting ? "Sparar..." : "Lägg till"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({
  item,
  onOpenChange,
  onSubmit,
}: {
  item: SuggestedValue | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newVarde: string) => Promise<void>;
}) {
  if (!item) return null;

  return (
    <RenameDialogInner
      key={item._id}
      item={item}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function RenameDialogInner({
  item,
  onOpenChange,
  onSubmit,
}: {
  item: SuggestedValue;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newVarde: string) => Promise<void>;
}) {
  const form = useForm({
    defaultValues: { value: item.value },
    onSubmit: async ({ value }) => {
      await onSubmit(value.value.trim());
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Byt namn</DialogTitle>
          <DialogDescription>
            Byt namn på <strong>{item.value}</strong>. Alla hissar med detta
            värde uppdateras automatiskt.
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
            name="value"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return "Värde krävs";
                if (value.trim() === item.value)
                  return "Ange ett nytt värde";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Nytt namn <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

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

function MergeDialog({
  item,
  allValues,
  onOpenChange,
  onSubmit,
}: {
  item: SuggestedValue | null;
  allValues: SuggestedValue[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (targetId: string) => Promise<void>;
}) {
  if (!item) return null;

  return (
    <MergeDialogInner
      key={item._id}
      item={item}
      allValues={allValues}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function MergeDialogInner({
  item,
  allValues,
  onOpenChange,
  onSubmit,
}: {
  item: SuggestedValue;
  allValues: SuggestedValue[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (targetId: string) => Promise<void>;
}) {
  const [targetId, setTargetId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targets = allValues.filter((v) => v._id !== item._id);
  const targetItem = targets.find((v) => v._id === targetId);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Slå ihop värden</DialogTitle>
          <DialogDescription>
            Slå ihop <strong>{item.value}</strong> med ett annat värde. Alla
            hissar med detta värde uppdateras till målvärdet och{" "}
            <strong>{item.value}</strong> tas bort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Slå ihop med</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj målvärde..." />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetItem && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="py-3 text-sm">
                <p>
                  <strong>{item.value}</strong> → <strong>{targetItem.value}</strong>
                </p>
                <p className="mt-1 text-muted-foreground">
                  Alla hissar med värdet &quot;{item.value}&quot; ändras till
                  &quot;{targetItem.value}&quot;.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Avbryt
          </Button>
          <Button
            disabled={!targetId || isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onSubmit(targetId);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? "Slår ihop..." : "Slå ihop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
