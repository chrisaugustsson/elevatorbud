import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { adminMiddleware } from "./auth";
import * as suggestedValues from "@elevatorbud/api/suggested-values";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listSuggestedValues = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(suggestedValues.listSuggestedValuesSchema)
  .handler(async ({ data, context }) => {
    return suggestedValues.list(context.db, data);
  });

export const suggestedValuesOptions = (category: string) =>
  queryOptions({
    queryKey: ["suggestedValues", category],
    queryFn: () => listSuggestedValues({ data: { category } }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const createSuggestedValue = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(suggestedValues.createSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return suggestedValues.create(context.db, data);
  });

export const updateSuggestedValue = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(suggestedValues.updateSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return suggestedValues.update(context.db, data);
  });

export const mergeSuggestedValues = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(suggestedValues.mergeSuggestedValuesSchema)
  .handler(async ({ data, context }) => {
    return suggestedValues.merge(context.db, data);
  });

export const toggleSuggestedValueActive = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(suggestedValues.toggleActiveSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return suggestedValues.toggleActive(context.db, data);
  });
