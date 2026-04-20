import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { elevators, organizations } from "@elevatorbud/db/schema";
import type { DatabaseHttp } from "@elevatorbud/db";
import { adminMiddlewareRead } from "./auth";

// ---------------------------------------------------------------------------
// Inlined query logic (from packages/api/src/routers/maintenance.ts)
// Admin: organizationId is an optional FILTER, not a security boundary.
// ---------------------------------------------------------------------------

const inspectionListInput = z.object({
  month: z.number().int().min(1).max(12),
  organizationId: z.string().uuid().optional(),
});

async function inspectionCalendar(
  db: DatabaseHttp,
  organizationId: string | undefined,
) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
    : sql``;

  const result = await db.execute(sql`
    SELECT inspection_month as month, count(*)::int as count
    FROM elevators e
    WHERE e.status = 'active' ${orgFilter}
      AND inspection_month IS NOT NULL
    GROUP BY inspection_month
    ORDER BY inspection_month
  `);

  type InspectionRow = { month: number; count: number };
  return (result.rows as InspectionRow[]).map((r) => ({
    month: r.month,
    count: r.count,
  }));
}

async function companies(
  db: DatabaseHttp,
  organizationId: string | undefined,
) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
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

async function emergencyPhoneStatus(
  db: DatabaseHttp,
  organizationId: string | undefined,
) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      count(*)::int as total,
      count(*) filter (where e.has_emergency_phone = true)::int as with_phone,
      count(*) filter (where e.has_emergency_phone = false or e.has_emergency_phone is null)::int as without_phone,
      count(*) filter (where e.needs_upgrade = true)::int as needs_upgrade,
      coalesce(sum(d.emergency_phone_price) filter (where e.needs_upgrade = true), 0)::double precision as upgrade_cost
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

async function inspectionList(
  db: DatabaseHttp,
  organizationId: string | undefined,
  month: number,
) {
  const conditions = [
    eq(elevators.status, "active"),
    eq(elevators.inspectionMonth, month),
  ];
  if (organizationId) conditions.push(eq(elevators.organizationId, organizationId));

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

async function todaysElevators(db: DatabaseHttp, userId: string) {
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

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getInspectionCalendar = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    return inspectionCalendar(context.db, data?.organizationId);
  });

export const inspectionCalendarOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionCalendar", { organizationId }],
    queryFn: () => getInspectionCalendar({ data: { organizationId } }),
  });

export const getMaintenanceCompanies = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    return companies(context.db, data?.organizationId);
  });

export const maintenanceCompaniesOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "companies", { organizationId }],
    queryFn: () => getMaintenanceCompanies({ data: { organizationId } }),
  });

export const getEmergencyPhoneStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    return emergencyPhoneStatus(context.db, data?.organizationId);
  });

export const emergencyPhoneStatusOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "emergencyPhoneStatus", { organizationId }],
    queryFn: () => getEmergencyPhoneStatus({ data: { organizationId } }),
  });

export const getInspectionList = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(inspectionListInput)
  .handler(async ({ data, context }) => {
    return inspectionList(context.db, data.organizationId, data.month);
  });

export const inspectionListOptions = (month: number, organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionList", { month, organizationId }],
    queryFn: () => getInspectionList({ data: { month, organizationId } }),
  });

export const getTodaysElevators = createServerFn()
  .middleware([adminMiddlewareRead])
  .handler(async ({ context }) => {
    return todaysElevators(context.db, context.user.id);
  });

export const todaysElevatorsOptions = () =>
  queryOptions({
    queryKey: ["maintenance", "todaysElevators"],
    queryFn: () => getTodaysElevators(),
  });
