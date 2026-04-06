import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import * as suggestedValues from "@elevatorbud/api/suggested-values";

export const listSuggestedValues = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { category: string; activeOnly?: boolean }) => input)
  .handler(async ({ data, context }) => {
    return suggestedValues.list(context.db, {
      category: data.category,
      activeOnly: data.activeOnly ?? true,
    });
  });

export const suggestedValuesOptions = (category: string, activeOnly?: boolean) =>
  queryOptions({
    queryKey: ["suggestedValues", category, activeOnly],
    queryFn: () => listSuggestedValues({ data: { category, activeOnly } }),
  });
