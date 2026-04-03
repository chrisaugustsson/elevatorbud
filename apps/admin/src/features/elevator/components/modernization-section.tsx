import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Switch } from "@elevatorbud/ui/components/ui/switch";

interface ModernizationSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function ModernizationSection({
  form,
  formValues,
  originalValues,
}: ModernizationSectionProps) {
  return (
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
              <Label htmlFor="modernization_year">Moderniseringsår</Label>
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
                Rekommenderat moderniseringsår
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
        label="Åtgärder vid modernisering"
        category="modernization_measures"
        placeholder="Välj eller ange åtgärder..."
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
  );
}
