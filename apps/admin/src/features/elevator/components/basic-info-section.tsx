import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { ComboboxField } from "./combobox-field";
import { HissnummerField } from "./hissnummer-field";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Building2 } from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";

interface BasicInfoSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
  orgs: Array<{ _id: string; name: string }> | undefined;
  currentHissId: string;
}

export function BasicInfoSection({
  form,
  formValues,
  originalValues,
  orgs,
  currentHissId,
}: BasicInfoSectionProps) {
  return (
    <>
      {/* Organisation */}
      <form.Field name="organization_id">
        {(field) => (
          <div
            className={cn(
              "space-y-1.5 rounded-md p-3",
              originalValues &&
                isChanged("organization_id", formValues, originalValues) &&
                "border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
            )}
          >
            <Label className="text-sm text-muted-foreground">
              <Building2 className="mr-1 inline size-4" />
              Organisation
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(val) => field.handleChange(val)}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Välj organisation..." />
              </SelectTrigger>
              <SelectContent>
                {orgs?.map((org: { _id: string; name: string }) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {/* Section 1: Identifiering */}
      <EditSection title="1. Identifiering">
        <FieldWrapper
          changed={
            !!originalValues &&
            isChanged("elevator_number", formValues, originalValues)
          }
        >
          <form.Field name="elevator_number">
            {(field) => (
              <HissnummerField field={field} currentHissId={currentHissId} />
            )}
          </form.Field>
        </FieldWrapper>

        <FieldWrapper
          changed={
            !!originalValues &&
            isChanged("address", formValues, originalValues)
          }
        >
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

        <ComboboxField
          form={form}
          name="elevator_designation"
          label="Hissbeteckning"
          category="elevator_designation"
          placeholder="Välj eller ange beteckning..."
          changed={
            !!originalValues &&
            isChanged("elevator_designation", formValues, originalValues)
          }
        />

        <ComboboxField
          form={form}
          name="district"
          label="Distrikt"
          category="district"
          placeholder="Välj eller ange distrikt..."
          changed={
            !!originalValues &&
            isChanged("district", formValues, originalValues)
          }
        />
      </EditSection>
    </>
  );
}
