import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and, sql, inArray } from "drizzle-orm";
import { elevators, organizations } from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";
import { getContextOrgIds } from "./context";

export const getInspectionCalendar = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const result = await context.db.execute(sql`
      SELECT inspection_month as month, count(*)::int as count
      FROM elevators e
      WHERE e.status = 'active'
        AND e.organization_id = ANY(${contextOrgIds})
        AND inspection_month IS NOT NULL
      GROUP BY inspection_month
      ORDER BY inspection_month
    `);

    type InspectionRow = { month: string; count: number };
    return (result.rows as InspectionRow[]).map((r) => ({
      month: r.month,
      count: r.count,
    }));
  });

export const inspectionCalendarOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionCalendar", parentOrgId],
    queryFn: () => getInspectionCalendar({ data: { parentOrgId } }),
  });

export const getMaintenanceCompanies = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const result = await context.db.execute(sql`
      SELECT
        maintenance_company as company,
        district,
        count(*)::int as count
      FROM elevators e
      WHERE e.status = 'active'
        AND e.organization_id = ANY(${contextOrgIds})
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
  });

export const maintenanceCompaniesOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["maintenance", "companies", parentOrgId],
    queryFn: () => getMaintenanceCompanies({ data: { parentOrgId } }),
  });

export const getEmergencyPhoneStatus = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const result = await context.db.execute(sql`
      SELECT
        count(*)::int as total,
        count(*) filter (where e.has_emergency_phone = true)::int as with_phone,
        count(*) filter (where e.has_emergency_phone = false or e.has_emergency_phone is null)::int as without_phone,
        count(*) filter (where e.needs_upgrade = true)::int as needs_upgrade,
        coalesce(sum(d.emergency_phone_price) filter (where e.needs_upgrade = true), 0)::real as upgrade_cost
      FROM elevators e
      LEFT JOIN elevator_details d ON d.elevator_id = e.id
      WHERE e.status = 'active'
        AND e.organization_id = ANY(${contextOrgIds})
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
  });

export const emergencyPhoneStatusOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["maintenance", "emergencyPhoneStatus", parentOrgId],
    queryFn: () => getEmergencyPhoneStatus({ data: { parentOrgId } }),
  });

export const getInspectionList = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ month: z.string(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    return context.db
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
      .where(
        and(
          eq(elevators.status, "active"),
          eq(elevators.inspectionMonth, data.month),
          inArray(elevators.organizationId, contextOrgIds),
        ),
      )
      .orderBy(elevators.elevatorNumber);
  });

export const inspectionListOptions = (month: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionList", month, parentOrgId],
    queryFn: () => getInspectionList({ data: { month, parentOrgId } }),
  });
