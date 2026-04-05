import type { HissForm, HissFormValues } from "../types";
import { useSuggestions } from "../hooks/use-suggestions";
import { FieldWrapper } from "./field-wrapper";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Combobox } from "@elevatorbud/ui/components/ui/combobox";

export function ComboboxField({
  form,
  name,
  label,
  category,
  placeholder,
  changed,
}: {
  form: HissForm;
  name: keyof HissFormValues;
  label: string;
  category: string;
  placeholder: string;
  changed: boolean;
}) {
  const suggestions = useSuggestions(category);
  return (
    <FieldWrapper changed={changed}>
      <form.Field name={name}>
        {(field) => (
          <div className="space-y-1.5">
            <Label>{label}</Label>
            <Combobox
              value={field.state.value as string}
              onChange={(val) => field.handleChange(val as never)}
              suggestions={suggestions}
              placeholder={placeholder}
            />
          </div>
        )}
      </form.Field>
    </FieldWrapper>
  );
}
