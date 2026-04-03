import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export function useSuggestions(category: string): string[] {
  const data = useQuery(api.suggestedValues.list, { category });
  if (!data) return [];
  return data
    .filter((d: { active: boolean }) => d.active)
    .map((d: { value: string }) => d.value);
}
