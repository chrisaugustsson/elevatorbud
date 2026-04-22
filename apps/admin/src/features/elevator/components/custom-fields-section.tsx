import { useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import type { HissForm, HissFormValues } from "../types";
import { isCustomFieldChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Switch } from "@elevatorbud/ui/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@elevatorbud/ui/components/ui/command";

export type CustomFieldDef = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "date";
  aliases?: string[];
};

interface CustomFieldsSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
  defs: CustomFieldDef[];
}

export function CustomFieldsSection({
  form,
  formValues,
  originalValues,
  defs,
}: CustomFieldsSectionProps) {
  const defsByKey = useMemo(() => {
    const m = new Map<string, CustomFieldDef>();
    for (const d of defs) m.set(d.key, d);
    return m;
  }, [defs]);

  // Active = slots currently held in form state with a non-null value,
  // OR slots that exist on the original (so clearing a value still
  // renders the row). `null` in form state means "cleared" — we keep
  // the row visible so the admin sees what they just removed.
  const activeSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const [key, val] of Object.entries(formValues.custom_fields)) {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        slugs.add(key);
      }
    }
    if (originalValues) {
      for (const key of Object.keys(originalValues.custom_fields)) {
        slugs.add(key);
      }
    }
    return [...slugs];
  }, [formValues.custom_fields, originalValues]);

  // Sorted rows: known defs (by label) first, then unknown keys (defs
  // that were deleted server-side but still have a stale value on this
  // elevator) alphabetically — the admin should see the value so they
  // can clear it, not have it silently disappear.
  const rows = useMemo(() => {
    const known: { slug: string; def: CustomFieldDef }[] = [];
    const orphan: { slug: string; label: string }[] = [];
    for (const slug of activeSlugs) {
      const def = defsByKey.get(slug);
      if (def) known.push({ slug, def });
      else orphan.push({ slug, label: slug });
    }
    known.sort((a, b) => a.def.label.localeCompare(b.def.label, "sv"));
    orphan.sort((a, b) => a.slug.localeCompare(b.slug, "sv"));
    return { known, orphan };
  }, [activeSlugs, defsByKey]);

  const availableDefs = useMemo(
    () =>
      defs
        .filter((d) => !activeSlugs.includes(d.key))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [defs, activeSlugs],
  );

  const hasContent = rows.known.length > 0 || rows.orphan.length > 0;

  if (defs.length === 0 && !hasContent) {
    return (
      <EditSection title="Extrafält">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
          <span>
            Inga extrafält finns ännu. Värden skapas vid import — mappa en
            kolumn till{" "}
            <span className="rounded bg-muted px-1 py-0.5 text-xs">
              Extrafält
            </span>
            .
          </span>
        </p>
      </EditSection>
    );
  }

  return (
    <EditSection title="Extrafält">
      <div className="space-y-3">
        {rows.known.map(({ slug, def }) => (
          <CustomFieldRow
            key={slug}
            slug={slug}
            def={def}
            form={form}
            formValues={formValues}
            originalValues={originalValues}
          />
        ))}

        {rows.orphan.length > 0 && (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              Fält som inte längre finns i katalogen. Rensa värdet eller lämna
              orört.
            </p>
            {rows.orphan.map(({ slug, label }) => (
              <CustomFieldRow
                key={slug}
                slug={slug}
                def={{
                  id: slug,
                  key: slug,
                  label,
                  type: "text",
                }}
                orphan
                form={form}
                formValues={formValues}
                originalValues={originalValues}
              />
            ))}
          </div>
        )}

        <AddFieldButton
          availableDefs={availableDefs}
          onAdd={(def) => {
            // Seed an empty string so the row renders and the Input is
            // controlled from the start. The converter normalizes
            // empty-string to null on save.
            form.setFieldValue("custom_fields", {
              ...formValues.custom_fields,
              [def.key]: "",
            });
          }}
        />
      </div>
    </EditSection>
  );
}

function CustomFieldRow({
  slug,
  def,
  orphan,
  form,
  formValues,
  originalValues,
}: {
  slug: string;
  def: CustomFieldDef;
  orphan?: boolean;
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}) {
  const value = formValues.custom_fields[slug] ?? "";
  const cleared = formValues.custom_fields[slug] === null;
  const changed =
    !!originalValues && isCustomFieldChanged(slug, formValues, originalValues);

  const setValue = (next: string | null) => {
    form.setFieldValue("custom_fields", {
      ...formValues.custom_fields,
      [slug]: next,
    });
  };

  return (
    <FieldWrapper changed={changed}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor={`cf-${slug}`}
            className={cleared ? "text-muted-foreground line-through" : ""}
          >
            {def.label}
            {orphan && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (borttagen från katalog)
              </span>
            )}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            aria-label={`Ta bort värde för ${def.label}`}
            onClick={() => setValue(null)}
            disabled={cleared}
          >
            <X className="size-4" />
          </Button>
        </div>
        <CustomFieldInput
          def={def}
          value={cleared ? "" : value ?? ""}
          onChange={setValue}
          disabled={cleared}
          inputId={`cf-${slug}`}
        />
        {cleared && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Värdet tas bort när du sparar.
          </p>
        )}
      </div>
    </FieldWrapper>
  );
}

function CustomFieldInput({
  def,
  value,
  onChange,
  disabled,
  inputId,
}: {
  def: CustomFieldDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  inputId: string;
}) {
  if (def.type === "boolean") {
    // Tri-state via Switch + explicit label: empty = no value, Ja = "true",
    // Nej = "false". Toggling cycles Ja↔Nej; the X button in the row
    // handles clearing. Keeps the UI consistent with has_emergency_phone
    // elsewhere in the form.
    const isTrue = value === "true";
    return (
      <div className="flex items-center gap-3">
        <Switch
          id={inputId}
          checked={isTrue}
          onCheckedChange={(v: boolean) => onChange(v ? "true" : "false")}
          disabled={disabled}
        />
        <span className="text-sm text-muted-foreground">
          {value === "" ? "Inget värde" : isTrue ? "Ja" : "Nej"}
        </span>
      </div>
    );
  }
  if (def.type === "number") {
    return (
      <Input
        id={inputId}
        className="h-11"
        type="number"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === "date") {
    return (
      <Input
        id={inputId}
        className="h-11"
        type="date"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <Input
      id={inputId}
      className="h-11"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function AddFieldButton({
  availableDefs,
  onAdd,
}: {
  availableDefs: CustomFieldDef[];
  onAdd: (def: CustomFieldDef) => void;
}) {
  const [open, setOpen] = useState(false);

  if (availableDefs.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full justify-start font-normal text-muted-foreground"
        >
          <Plus className="mr-2 size-4" />
          Lägg till extrafält
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Sök extrafält..." />
          <CommandList>
            <CommandEmpty>Inga fler fält i katalogen.</CommandEmpty>
            <CommandGroup>
              {availableDefs.map((def) => (
                <CommandItem
                  key={def.id}
                  value={def.label}
                  onSelect={() => {
                    onAdd(def);
                    setOpen(false);
                  }}
                >
                  <span className="flex-1">{def.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {typeLabel(def.type)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function typeLabel(t: CustomFieldDef["type"]): string {
  switch (t) {
    case "number":
      return "Tal";
    case "boolean":
      return "Ja/Nej";
    case "date":
      return "Datum";
    default:
      return "Text";
  }
}
