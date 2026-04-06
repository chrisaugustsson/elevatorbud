import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as analytics from "@elevatorbud/api/analytics";

export const getStats = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return analytics.stats(context.db, orgScope);
  });

export const statsOptions = () =>
  queryOptions({
    queryKey: ["analytics", "stats"],
    queryFn: () => getStats(),
  });

export const getChartData = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return analytics.chartData(context.db, orgScope);
  });

export const chartDataOptions = () =>
  queryOptions({
    queryKey: ["analytics", "chartData"],
    queryFn: () => getChartData(),
  });
