import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { sql, eq, and, desc } from "drizzle-orm";
import { elevators, organizations } from "@elevatorbud/db/schema";
import type { DatabaseHttp } from "@elevatorbud/db";
import { adminMiddlewareRead } from "./auth";

// ---------------------------------------------------------------------------
// Inlined query logic (from packages/api/src/routers/dashboard.ts)
// Admin sees everything — no org scoping.
// ---------------------------------------------------------------------------

async function overview(db: DatabaseHttp) {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const nextMonth = ((now.getMonth() + 1) % 12) + 1;
  const modernizationCutoff = currentYear + 3;

  const activeCondition = eq(elevators.status, "active");

  const [totalElevators, totalOrgs, upcomingInspections, modernizationSoon, topOrgs, recentActivity] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(elevators)
      .where(activeCondition),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations),
    db.execute(sql`
      SELECT count(*)::int as count FROM elevators e
      WHERE e.status = 'active'
        AND e.inspection_month = ${nextMonth}
    `),
    db.execute(sql`
      SELECT count(*)::int as count FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets WHERE elevator_id = e.id
        ORDER BY created_at DESC LIMIT 1
      ) lb ON true
      WHERE e.status = 'active'
        AND lb.recommended_modernization_year IS NOT NULL
        AND lb.recommended_modernization_year ~ '^[0-9]+$'
        AND lb.recommended_modernization_year::int <= ${modernizationCutoff}
    `),
    db.execute(sql`
      SELECT o.id, o.name, count(e.id)::int as elevator_count
      FROM organizations o
      LEFT JOIN elevators e ON e.organization_id = o.id AND e.status = 'active'
      GROUP BY o.id, o.name
      ORDER BY elevator_count DESC
      LIMIT 5
    `),
    db
      .select({
        id: elevators.id,
        elevatorNumber: elevators.elevatorNumber,
        address: elevators.address,
        lastUpdatedAt: elevators.lastUpdatedAt,
        organizationName: organizations.name,
      })
      .from(elevators)
      .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
      .where(activeCondition)
      .orderBy(desc(elevators.lastUpdatedAt))
      .limit(10),
  ]);

  type TopOrgRow = { id: string; name: string; elevator_count: number };
  type CountRow = { count: number };

  const orgs = topOrgs.rows as TopOrgRow[];
  const inspCount = (upcomingInspections.rows as CountRow[])[0];
  const modCount = (modernizationSoon.rows as CountRow[])[0];

  return {
    totalElevators: totalElevators[0]?.count ?? 0,
    totalOrganizations: totalOrgs[0]?.count ?? 0,
    upcomingInspections: {
      count: inspCount?.count ?? 0,
      // Month number of the inspections being counted — UI uses this to
      // build a dynamic card label like "Besiktningar i Maj".
      month: nextMonth,
    },
    modernizationSoon: modCount?.count ?? 0,
    topOrganizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      elevatorCount: o.elevator_count,
    })),
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getDashboardOverview = createServerFn()
  .middleware([adminMiddlewareRead])
  .handler(async ({ context }) => {
    return overview(context.db);
  });

export const dashboardOverviewOptions = () =>
  queryOptions({
    queryKey: ["dashboard", "overview"],
    queryFn: () => getDashboardOverview(),
  });
