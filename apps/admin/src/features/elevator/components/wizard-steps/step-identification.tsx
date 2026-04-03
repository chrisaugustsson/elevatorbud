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

export function StepIdentification({ form }: StepIdentificationProps) {
  return (
    <div className="space-y-5">
      {/* Hissnummer with real-time uniqueness check */}
      <FieldWrapper changed={false}>
        <form.Field name="elevator_number">
          {(field) => <HissnummerField field={field} currentHissId="" />}
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
        placeholder="V\u00e4lj eller ange beteckning..."
        changed={false}
      />

      {/* Distrikt (combobox) */}
      <ComboboxField
        form={form}
        name="district"
        label="Distrikt"
        category="district"
        placeholder="V\u00e4lj eller ange distrikt..."
        changed={false}
      />
    </div>
  );
}
