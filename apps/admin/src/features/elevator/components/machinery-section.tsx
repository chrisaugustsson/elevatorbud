import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";

interface MachinerySectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function MachinerySection({
  form,
  formValues,
  originalValues,
}: MachinerySectionProps) {
  return (
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
  );
}
