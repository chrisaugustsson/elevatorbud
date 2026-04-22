import { useMemo, useState } from "react";
import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { HissnummerField } from "./hissnummer-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Button } from "@elevatorbud/ui/components/ui/button";
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
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";

interface BasicInfoSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
  orgs: Array<{ id: string; name: string }> | undefined;
  currentHissId: string;
}

export function BasicInfoSection({
  form,
  formValues,
  originalValues,
  orgs,
  currentHissId,
}: BasicInfoSectionProps) {
  return (
    <>
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
            <Label htmlFor="organization_id-trigger" className="text-sm text-muted-foreground">
              <Building2 className="mr-1 inline size-4" />
              Organisation
            </Label>
            <OrgCombobox
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
              orgs={orgs ?? []}
              triggerId="organization_id-trigger"
            />
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
              <HissnummerField
                field={field}
                currentHissId={currentHissId}
                organizationId={formValues.organization_id}
              />
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
          placeholder="Välj eller ange beteckning..."
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
          placeholder="Välj eller ange distrikt..."
          changed={
            !!originalValues &&
            isChanged("district", formValues, originalValues)
          }
        />

        <FieldWrapper
          changed={
            !!originalValues &&
            isChanged("property_designation", formValues, originalValues)
          }
        >
          <form.Field name="property_designation">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="property_designation">Fastighetsbeteckning</Label>
                <Input
                  id="property_designation"
                  className="h-11"
                  placeholder="T.ex. Hagahuset 1:2..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
        </FieldWrapper>
      </EditSection>
    </>
  );
}

// Type-to-filter combobox for organization selection. FR-21: every org-
// selection dropdown is type-to-filter searchable. Replaces the plain
// <Select> which became unusable once orgs include sub-orgs (Bostadsbolaget
// scale).
function OrgCombobox({
  value,
  onChange,
  orgs,
  triggerId,
}: {
  value: string;
  onChange: (value: string) => void;
  orgs: Array<{ id: string; name: string }>;
  triggerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const sortedOrgs = useMemo(
    () => [...orgs].sort((a, b) => a.name.localeCompare(b.name, "sv")),
    [orgs],
  );
  const selected = sortedOrgs.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={
            selected
              ? `Organisation: ${selected.name}. Klicka för att byta.`
              : "Välj organisation"
          }
          className="h-11 w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected?.name ?? "Välj organisation..."}
          </span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0 ml-2" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Sök organisation..." />
          <CommandList>
            <CommandEmpty>Inga organisationer hittades.</CommandEmpty>
            <CommandGroup>
              {sortedOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => {
                    onChange(org.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={org.id === value ? "opacity-100" : "opacity-0"}
                  />
                  {org.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
