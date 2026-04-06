import { sql, eq, desc } from "drizzle-orm";
import { elevators, organizations } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

export async function overview(db: Database) {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
  const modernizationCutoff = currentYear + 3;

  // Run the scalar subqueries separately to avoid Neon HTTP param issues
  const [totalElevators, totalOrgs, upcomingInspections, modernizationSoon, topOrgs, recentActivity] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(elevators)
      .where(eq(elevators.status, "active")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizations),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(elevators)
      .where(sql`status = 'active' AND inspection_month IN (${String(currentMonth)}, ${String(nextMonth)})`),
    db.execute(sql`
      SELECT count(*)::int as count FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets WHERE elevator_id = e.id
        ORDER BY created_at DESC LIMIT 1
      ) lb ON true
      WHERE e.status = 'active'
        AND lb.recommended_modernization_year IS NOT NULL
        AND lb.recommended_modernization_year ~ '^\d+$'
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
      .where(eq(elevators.status, "active"))
      .orderBy(desc(elevators.lastUpdatedAt))
      .limit(10),
  ]);

  type TopOrgRow = { id: string; name: string; elevator_count: number };
  type CountRow = { count: number };

  const orgs = topOrgs.rows as TopOrgRow[];
  const modSoon = (modernizationSoon.rows as CountRow[])[0];

  return {
    totalElevators: totalElevators[0]?.count ?? 0,
    totalOrganizations: totalOrgs[0]?.count ?? 0,
    upcomingInspections: upcomingInspections[0]?.count ?? 0,
    modernizationSoon: modSoon?.count ?? 0,
    topOrganizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      elevatorCount: o.elevator_count,
    })),
    recentActivity,
  };
}
