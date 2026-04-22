import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Switch } from "@elevatorbud/ui/components/ui/switch";
import { Phone } from "lucide-react";

interface EmergencyPhoneSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function EmergencyPhoneSection({
  form,
  formValues,
  originalValues,
}: EmergencyPhoneSectionProps) {
  const hasPhone = formValues.has_emergency_phone;

  return (
    <EditSection title="7. Nödtelefon">
      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("has_emergency_phone", formValues, originalValues)
        }
      >
        <form.Field name="has_emergency_phone">
          {(field) => (
            <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="has_emergency_phone" className="cursor-pointer">
                <Phone className="mr-1.5 inline size-4" />
                Har nödtelefon
              </Label>
              <Switch
                id="has_emergency_phone"
                checked={field.state.value}
                onCheckedChange={(val) => field.handleChange(val)}
              />
            </div>
          )}
        </form.Field>
      </FieldWrapper>

      {/* Single free-text description. Disabled when "har nödtelefon" is
          off — on save the converter forces it to null so the column
          doesn't carry stale text alongside a `false` flag. */}
      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("emergency_phone", formValues, originalValues)
        }
      >
        <form.Field name="emergency_phone">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="emergency_phone">Beskrivning</Label>
              <Input
                id="emergency_phone"
                className="h-11"
                placeholder="T.ex. Safeline, GSM 4G, Modell, MX + GL6 4G"
                value={field.state.value}
                disabled={!hasPhone}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {hasPhone
                  ? "Fritext från Nödtelefon-kolumnen (fabrikat, typ, modell)."
                  : "Hissen saknar nödtelefon. Slå på växeln ovan för att ange uppgifter."}
              </p>
            </div>
          )}
        </form.Field>
      </FieldWrapper>

      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("needs_upgrade", formValues, originalValues)
        }
      >
        <form.Field name="needs_upgrade">
          {(field) => (
            <div className="flex min-h-[44px] items-center justify-between rounded-md border px-3 py-2">
              <Label
                htmlFor="needs_upgrade"
                className="cursor-pointer"
              >
                Behöver uppgradering
              </Label>
              <Switch
                id="needs_upgrade"
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
          isChanged("emergency_phone_price", formValues, originalValues)
        }
      >
        <form.Field name="emergency_phone_price">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="emergency_phone_price">Pris</Label>
              <Input
                id="emergency_phone_price"
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
    </EditSection>
  );
}
