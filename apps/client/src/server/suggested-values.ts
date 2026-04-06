import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { suggestedValues } from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";

export const listSuggestedValues = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({ category: z.string(), activeOnly: z.boolean().optional() }),
  )
  .handler(async ({ data, context }) => {
    const activeOnly = data.activeOnly ?? true;
    const conditions = [eq(suggestedValues.category, data.category)];
    if (activeOnly) {
      conditions.push(eq(suggestedValues.active, true));
    }
    return context.db.query.suggestedValues.findMany({
      where: and(...conditions),
      orderBy: (sv, { asc }) => [asc(sv.value)],
    });
  });

export const suggestedValuesOptions = (
  category: string,
  activeOnly?: boolean,
) =>
  queryOptions({
    queryKey: ["suggestedValues", category, activeOnly],
    queryFn: () => listSuggestedValues({ data: { category, activeOnly } }),
  });
