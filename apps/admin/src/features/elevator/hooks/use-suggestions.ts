import { useSuspenseQuery } from "@tanstack/react-query";
import { suggestedValuesOptions } from "~/server/suggested-values";

export function useSuggestions(category: string): string[] {
  const { data } = useSuspenseQuery(suggestedValuesOptions(category)) as { data: { active: boolean; value: string }[] };
  return data
    .filter((d) => d.active)
    .map((d) => d.value);
}
