import type { HissForm, HissFormValues } from "../../types";
import { FieldWrapper } from "../field-wrapper";
import { ComboboxField } from "../combobox-field";
import { HissnummerField } from "../hissnummer-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";

interface StepIdentificationProps {
  form: HissForm;
  formValues: HissFormValues;
}

export function StepIdentification({
  form,
  formValues,
}: StepIdentificationProps) {
  return (
    <div className="space-y-5">
      {/* Hissnummer with real-time uniqueness check (scoped to selected org) */}
      <FieldWrapper changed={false}>
        <form.Field name="elevator_number">
          {(field) => (
            <HissnummerField
              field={field}
              currentHissId=""
              organizationId={formValues.organization_id}
            />
          )}
        </form.Field>
      </FieldWrapper>

      {/* Adress */}
      <FieldWrapper changed={false}>
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

      {/* Hissbeteckning (combobox) */}
      <ComboboxField
        form={form}
        name="elevator_designation"
        label="Hissbeteckning"
        category="elevator_designation"
        placeholder="Välj eller ange beteckning..."
        changed={false}
      />

      {/* Distrikt (combobox) */}
      <ComboboxField
        form={form}
        name="district"
        label="Distrikt"
        category="district"
        placeholder="Välj eller ange distrikt..."
        changed={false}
      />
    </div>
  );
}
