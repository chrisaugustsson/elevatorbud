import type { HissForm, HissFormValues } from "../types";
import { BESIKTNINGSMANADER } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";

interface InspectionSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function InspectionSection({
  form,
  formValues,
  originalValues,
}: InspectionSectionProps) {
  return (
    <EditSection title="5. Besiktning och underhåll">
      <ComboboxField
        form={form}
        name="inspection_authority"
        label="Besiktningsorgan"
        category="inspection_authority"
        placeholder="Välj eller ange besiktningsorgan..."
        changed={
          !!originalValues &&
          isChanged("inspection_authority", formValues, originalValues)
        }
      />

      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("inspection_month", formValues, originalValues)
        }
      >
        <form.Field name="inspection_month">
          {(field) => (
            <div className="space-y-1.5">
              <Label>Besiktningsmånad</Label>
              <Select
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Välj månad..." />
                </SelectTrigger>
                <SelectContent>
                  {BESIKTNINGSMANADER.map((manad, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {manad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </FieldWrapper>

      <ComboboxField
        form={form}
        name="maintenance_company"
        label="Skötselföretag"
        category="maintenance_company"
        placeholder="Välj eller ange skötselföretag..."
        changed={
          !!originalValues &&
          isChanged("maintenance_company", formValues, originalValues)
        }
      />

      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("shaft_lighting", formValues, originalValues)
        }
      >
        <form.Field name="shaft_lighting">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="shaft_lighting">Schaktbelysning</Label>
              <Input
                id="shaft_lighting"
                className="h-11"
                placeholder="Ange schaktbelysning..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </div>
          )}
        </form.Field>
      </FieldWrapper>
    </EditSection>
  );
}
