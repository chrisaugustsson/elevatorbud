import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { elevators, organizations } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

export const inspectionCalendarInput = z
  .object({ organizationId: z.string().uuid().optional() })
  .optional();

export const inspectionListInput = z.object({
  month: z.string(),
  organizationId: z.string().uuid().optional(),
});

export async function inspectionCalendar(
  db: Database,
  orgScope: string | undefined,
) {
  const orgFilter = orgScope
    ? sql`AND e.organization_id = ${orgScope}`
    : sql``;

  const result = await db.execute(sql`
    SELECT inspection_month as month, count(*)::int as count
    FROM elevators e
    WHERE e.status = 'active' ${orgFilter}
      AND inspection_month IS NOT NULL
    GROUP BY inspection_month
    ORDER BY inspection_month
  `);

  type InspectionRow = { month: string; count: number };
  return (result.rows as InspectionRow[]).map((r) => ({
    month: r.month,
    count: r.count,
  }));
}

export async function companies(
  db: Database,
  orgScope: string | undefined,
) {
  const orgFilter = orgScope
    ? sql`AND e.organization_id = ${orgScope}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      maintenance_company as company,
      district,
      count(*)::int as count
    FROM elevators e
    WHERE e.status = 'active' ${orgFilter}
      AND maintenance_company IS NOT NULL
    GROUP BY maintenance_company, district
    ORDER BY maintenance_company, district
  `);

  // Pivot into company -> { district: count } matrix
  const rows = (result.rows ?? result) as {
    company: string;
    district: string | null;
    count: number;
  }[];
  const companiesMap = new Map<
    string,
    { company: string; total: number; districts: Record<string, number> }
  >();

  for (const row of rows) {
    const entry = companiesMap.get(row.company) ?? {
      company: row.company,
      total: 0,
      districts: {},
    };
    const districtKey = row.district ?? "Okant";
    entry.districts[districtKey] = row.count;
    entry.total += row.count;
    companiesMap.set(row.company, entry);
  }

  return [...companiesMap.values()].sort((a, b) => b.total - a.total);
}

export async function emergencyPhoneStatus(
  db: Database,
  orgScope: string | undefined,
) {
  const orgFilter = orgScope
    ? sql`AND e.organization_id = ${orgScope}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      count(*)::int as total,
      count(*) filter (where e.has_emergency_phone = true)::int as with_phone,
      count(*) filter (where e.has_emergency_phone = false or e.has_emergency_phone is null)::int as without_phone,
      count(*) filter (where e.needs_upgrade = true)::int as needs_upgrade,
      coalesce(sum(d.emergency_phone_price) filter (where e.needs_upgrade = true), 0)::real as upgrade_cost
    FROM elevators e
    LEFT JOIN elevator_details d ON d.elevator_id = e.id
    WHERE e.status = 'active' ${orgFilter}
  `);

  type EmergencyPhoneRow = {
    total: number;
    with_phone: number;
    without_phone: number;
    needs_upgrade: number;
    upgrade_cost: number;
  };
  const r = (result.rows as EmergencyPhoneRow[])[0]!;
  return {
    total: r.total,
    withPhone: r.with_phone,
    withoutPhone: r.without_phone,
    needsUpgrade: r.needs_upgrade,
    upgradeCost: r.upgrade_cost,
  };
}

export async function inspectionList(
  db: Database,
  orgScope: string | undefined,
  month: string,
) {
  const conditions = [
    eq(elevators.status, "active"),
    eq(elevators.inspectionMonth, month),
  ];
  if (orgScope) conditions.push(eq(elevators.organizationId, orgScope));

  return db
    .select({
      id: elevators.id,
      elevatorNumber: elevators.elevatorNumber,
      address: elevators.address,
      district: elevators.district,
      inspectionAuthority: elevators.inspectionAuthority,
      maintenanceCompany: elevators.maintenanceCompany,
      organizationName: organizations.name,
    })
    .from(elevators)
    .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
    .where(and(...conditions))
    .orderBy(elevators.elevatorNumber);
}

export async function todaysElevators(
  db: Database,
  userId: string,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = await db
    .select({
      id: elevators.id,
      elevatorNumber: elevators.elevatorNumber,
      address: elevators.address,
      organizationName: organizations.name,
      createdAt: elevators.createdAt,
      lastUpdatedAt: elevators.lastUpdatedAt,
    })
    .from(elevators)
    .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
    .where(
      and(
        sql`(${elevators.createdBy} = ${userId} OR ${elevators.lastUpdatedBy} = ${userId})`,
        sql`(${elevators.createdAt} >= ${today} OR ${elevators.lastUpdatedAt} >= ${today})`,
      ),
    )
    .orderBy(desc(elevators.lastUpdatedAt));

  return results;
}
