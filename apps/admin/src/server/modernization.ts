import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as modernization from "@elevatorbud/api/modernization";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getTimeline = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return modernization.timeline(context.db, orgScope);
  });

export const timelineOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["modernization", "timeline", { organizationId }],
    queryFn: () => getTimeline({ data: { organizationId } }),
  });

export const getBudget = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return modernization.budget(context.db, orgScope);
  });

export const budgetOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["modernization", "budget", { organizationId }],
    queryFn: () => getBudget({ data: { organizationId } }),
  });

export const getPriorityList = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(modernization.priorityListInput)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data.organizationId);
    return modernization.priorityList(context.db, orgScope, {
      yearFrom: data.yearFrom,
      yearTo: data.yearTo,
      page: data.page,
      pageSize: data.pageSize,
    });
  });

export const priorityListOptions = (
  input: z.infer<typeof modernization.priorityListInput>,
) =>
  queryOptions({
    queryKey: ["modernization", "priorityList", input],
    queryFn: () => getPriorityList({ data: input }),
  });
