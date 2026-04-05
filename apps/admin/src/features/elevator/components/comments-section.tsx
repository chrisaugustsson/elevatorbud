import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";
import { EditSection } from "./edit-section";
import { FieldWrapper } from "./field-wrapper";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Textarea } from "@elevatorbud/ui/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface CommentsSectionProps {
  form: HissForm;
  formValues: HissFormValues;
  originalValues: HissFormValues | null;
}

export function CommentsSection({
  form,
  formValues,
  originalValues,
}: CommentsSectionProps) {
  return (
    <EditSection title="8. Kommentarer">
      <FieldWrapper
        changed={
          !!originalValues &&
          isChanged("comments", formValues, originalValues)
        }
      >
        <form.Field name="comments">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="comments">
                <MessageSquare className="mr-1.5 inline size-4" />
                Kommentarer
              </Label>
              <Textarea
                id="comments"
                className="min-h-[120px]"
                placeholder="Skriv eventuella kommentarer här..."
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
