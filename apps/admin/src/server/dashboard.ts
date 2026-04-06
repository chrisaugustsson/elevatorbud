import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { adminMiddleware } from "./auth";
import * as dashboard from "@elevatorbud/api/dashboard";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getDashboardOverview = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return dashboard.overview(context.db);
  });

export const dashboardOverviewOptions = () =>
  queryOptions({
    queryKey: ["dashboard", "overview"],
    queryFn: () => getDashboardOverview(),
  });
