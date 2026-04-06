import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as analytics from "@elevatorbud/api/analytics";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getStats = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return analytics.stats(context.db, orgScope);
  });

export const statsOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["analytics", "stats", { organizationId }],
    queryFn: () => getStats({ data: { organizationId } }),
  });

export const getChartData = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return analytics.chartData(context.db, orgScope);
  });

export const chartDataOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["analytics", "chartData", { organizationId }],
    queryFn: () => getChartData({ data: { organizationId } }),
  });
