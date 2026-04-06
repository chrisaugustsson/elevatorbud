import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Switch } from "@elevatorbud/ui/components/ui/switch";

interface DoorsAndCabSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function DoorsAndCabSection({
  form,
  formValues,
  originalValues,
}: DoorsAndCabSectionProps) {
  return (
    <EditSection title="3. Dörrar och korg">
      <ComboboxField
        form={form}
        name="door_type"
        label="Typ dörrar"
        category="door_type"
        placeholder="Välj eller ange dörrtyp..."
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
                Genomgång
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
        name="dispatch_mode"
        label="Kollektiv"
        category="dispatch_mode"
        placeholder="Välj eller ange kollektiv..."
        changed={
          !!originalValues &&
          isChanged("dispatch_mode", formValues, originalValues)
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
          isChanged("door_opening", formValues, originalValues)
        }
      >
        <form.Field name="door_opening">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="door_opening">Dagöppning</Label>
              <Input
                id="door_opening"
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
            isChanged("door_carrier", formValues, originalValues)
          }
        >
          <form.Field name="door_carrier">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="door_carrier">Bärbeslag</Label>
                <Input
                  id="door_carrier"
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
                <Label htmlFor="door_machine">Dörrmaskin</Label>
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
  );
}
