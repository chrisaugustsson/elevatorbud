import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";

interface TechnicalSpecsSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function TechnicalSpecsSection({
  form,
  formValues,
  originalValues,
}: TechnicalSpecsSectionProps) {
  return (
    <EditSection title="2. Teknisk specifikation">
      <ComboboxField
        form={form}
        name="elevator_type"
        label="Hisstyp"
        category="elevator_type"
        placeholder="V\u00e4lj eller ange hisstyp..."
        changed={
          !!originalValues &&
          isChanged("elevator_type", formValues, originalValues)
        }
      />

      <ComboboxField
        form={form}
        name="manufacturer"
        label="Fabrikat"
        category="manufacturer"
        placeholder="V\u00e4lj eller ange fabrikat..."
        changed={
          !!originalValues &&
          isChanged("manufacturer", formValues, originalValues)
        }
      />

      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("build_year", formValues, originalValues)
        }
      >
        <form.Field name="build_year">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="build_year">Bygg\u00e5r</Label>
              <Input
                id="build_year"
                className="h-11"
                type="number"
                inputMode="numeric"
                placeholder="t.ex. 1985"
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
            isChanged("speed", formValues, originalValues)
          }
        >
          <form.Field name="speed">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="speed">Hastighet</Label>
                <Input
                  id="speed"
                  className="h-11"
                  placeholder="m/s"
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
            isChanged("lift_height", formValues, originalValues)
          }
        >
          <form.Field name="lift_height">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="lift_height">Lyfth\u00f6jd</Label>
                <Input
                  id="lift_height"
                  className="h-11"
                  placeholder="meter"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
        </FieldWrapper>
      </div>

      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("load_capacity", formValues, originalValues)
        }
      >
        <form.Field name="load_capacity">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="load_capacity">Marklast</Label>
              <Input
                id="load_capacity"
                className="h-11"
                placeholder="t.ex. 500*6 (kg*personer)"
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
            isChanged("floor_count", formValues, originalValues)
          }
        >
          <form.Field name="floor_count">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="floor_count">Antal plan</Label>
                <Input
                  id="floor_count"
                  className="h-11"
                  type="number"
                  inputMode="numeric"
                  placeholder="Antal"
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
            isChanged("door_count", formValues, originalValues)
          }
        >
          <form.Field name="door_count">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="door_count">Antal d\u00f6rrar</Label>
                <Input
                  id="door_count"
                  className="h-11"
                  type="number"
                  inputMode="numeric"
                  placeholder="Antal"
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
