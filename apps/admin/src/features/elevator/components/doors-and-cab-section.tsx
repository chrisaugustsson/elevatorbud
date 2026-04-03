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
    <EditSection title="3. D\u00f6rrar och korg">
      <ComboboxField
        form={form}
        name="door_type"
        label="Typ d\u00f6rrar"
        category="door_type"
        placeholder="V\u00e4lj eller ange d\u00f6rrtyp..."
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
                Genomg\u00e5ng
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
        name="collective"
        label="Kollektiv"
        category="collective"
        placeholder="V\u00e4lj eller ange kollektiv..."
        changed={
          !!originalValues &&
          isChanged("collective", formValues, originalValues)
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
          isChanged("daylight_opening", formValues, originalValues)
        }
      >
        <form.Field name="daylight_opening">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="daylight_opening">Dag\u00f6ppning</Label>
              <Input
                id="daylight_opening"
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
            isChanged("grab_rail", formValues, originalValues)
          }
        >
          <form.Field name="grab_rail">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="grab_rail">B\u00e4rbeslag</Label>
                <Input
                  id="grab_rail"
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
                <Label htmlFor="door_machine">D\u00f6rrmaskin</Label>
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
