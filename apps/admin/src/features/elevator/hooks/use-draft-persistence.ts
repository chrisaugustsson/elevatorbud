import { useState, useEffect, useRef, useCallback } from "react";
import {
  getDraftKey,
  saveDraft,
  loadDraft,
  clearDraft,
  hasDraft,
} from "../../../shared/lib/form-persistence";
import type { HissForm, HissFormValues } from "../types";
import { isChanged } from "../utils/form-converters";

export { getDraftKey };

export function useDraftPersistence({
  form,
  draftKey,
  originalValues,
  submitSuccess,
  initialized,
  formValues,
}: {
  form: HissForm;
  draftKey: string;
  originalValues: HissFormValues | null;
  submitSuccess: boolean;
  initialized: boolean;
  formValues: HissFormValues;
}) {
  const [draftPromptVisible, setDraftPromptVisible] = useState(false);
  const [draftSavedVisible, setDraftSavedVisible] = useState(false);
  const draftSavedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Check for existing draft when form becomes initialized
  useEffect(() => {
    if (!initialized) return;
    if (hasDraft(draftKey)) {
      setDraftPromptVisible(true);
    }
  }, [initialized, draftKey]);

  const restoreDraft = useCallback(() => {
    const draft = loadDraft<HissFormValues>(draftKey);
    if (draft) {
      for (const [key, value] of Object.entries(draft.values)) {
        form.setFieldValue(key as keyof HissFormValues, value as never);
      }
    }
    setDraftPromptVisible(false);
  }, [draftKey, form]);

  const dismissDraft = useCallback(() => {
    clearDraft(draftKey);
    setDraftPromptVisible(false);
  }, [draftKey]);

  // Auto-save form state to localStorage (debounced 500ms)
  useEffect(() => {
    if (!initialized || submitSuccess || draftPromptVisible) return;
    const timer = setTimeout(() => {
      // Only save if there are changes from original
      if (!originalValues) return;
      const hasChanges = (
        Object.keys(originalValues) as Array<keyof HissFormValues>
      ).some((key) => isChanged(key, formValues, originalValues));
      if (hasChanges) {
        saveDraft(draftKey, formValues);
        setDraftSavedVisible(true);
        if (draftSavedTimerRef.current)
          clearTimeout(draftSavedTimerRef.current);
        draftSavedTimerRef.current = setTimeout(
          () => setDraftSavedVisible(false),
          2000,
        );
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    formValues,
    draftKey,
    initialized,
    submitSuccess,
    draftPromptVisible,
    originalValues,
  ]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (draftSavedTimerRef.current) clearTimeout(draftSavedTimerRef.current);
    };
  }, []);

  return { draftPromptVisible, draftSavedVisible, restoreDraft, dismissDraft };
}
