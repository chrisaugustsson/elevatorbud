import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";

export function useSuggestions(category: string): string[] {
  const opts = convexQuery(api.suggestedValues.list, { category });
  const { data } = useSuspenseQuery({
    queryKey: opts.queryKey,
    staleTime: opts.staleTime,
  }) as { data: { active: boolean; value: string }[] };
  return data
    .filter((d) => d.active)
    .map((d) => d.value);
}
