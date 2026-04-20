import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { authMiddlewareRead } from "./auth";
import { getContextOrgIds } from "./context";

export const getTimeline = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ parentOrgId: z.string().uuid(), subOrgId: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    if (data.subOrgId && !contextOrgIds.includes(data.subOrgId)) {
      throw new Error("Underorganisation hittades inte");
    }
    const subOrgFilter = data.subOrgId
      ? sql`AND e.organization_id = ${data.subOrgId}`
      : sql``;

    const result = await context.db.execute(sql`
      SELECT
        lb.recommended_modernization_year as year,
        count(*)::int as count
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      WHERE e.status = 'active'
        AND e.organization_id IN ${contextOrgIds}
        ${subOrgFilter}
        AND lb.recommended_modernization_year IS NOT NULL
      GROUP BY lb.recommended_modernization_year
      ORDER BY lb.recommended_modernization_year
    `);

    type TimelineRow = { year: string; count: number };
    return (result.rows as TimelineRow[]).map((r) => ({
      year: r.year,
      count: r.count,
    }));
  });

export const timelineOptions = (parentOrgId: string, subOrgId?: string) =>
  queryOptions({
    queryKey: ["modernization", "timeline", parentOrgId, subOrgId],
    queryFn: () => getTimeline({ data: { parentOrgId, subOrgId } }),
  });

export const getBudget = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ parentOrgId: z.string().uuid(), subOrgId: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    if (data.subOrgId && !contextOrgIds.includes(data.subOrgId)) {
      throw new Error("Underorganisation hittades inte");
    }
    const subOrgFilter = data.subOrgId
      ? sql`AND e.organization_id = ${data.subOrgId}`
      : sql``;

    const result = await context.db.execute(sql`
      SELECT
        lb.recommended_modernization_year as year,
        e.district,
        e.elevator_type,
        count(*)::int as count,
        coalesce(sum(lb.budget_amount), 0)::real as total_budget
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year, budget_amount
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      WHERE e.status = 'active'
        AND e.organization_id IN ${contextOrgIds}
        ${subOrgFilter}
        AND lb.recommended_modernization_year IS NOT NULL
      GROUP BY lb.recommended_modernization_year, e.district, e.elevator_type
      ORDER BY lb.recommended_modernization_year
    `);

    type BudgetRow = {
      year: string;
      district: string | null;
      elevator_type: string | null;
      count: number;
      total_budget: number;
    };
    return (result.rows as BudgetRow[]).map((r) => ({
      year: r.year,
      district: r.district,
      elevatorType: r.elevator_type,
      count: r.count,
      totalBudget: r.total_budget,
    }));
  });

export const budgetOptions = (parentOrgId: string, subOrgId?: string) =>
  queryOptions({
    queryKey: ["modernization", "budget", parentOrgId, subOrgId],
    queryFn: () => getBudget({ data: { parentOrgId, subOrgId } }),
  });

export const getPriorityList = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(
    z.object({
      parentOrgId: z.string().uuid(),
      subOrgId: z.string().uuid().optional(),
      yearFrom: z.number().optional(),
      yearTo: z.number().optional(),
      district: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    if (data.subOrgId && !contextOrgIds.includes(data.subOrgId)) {
      throw new Error("Underorganisation hittades inte");
    }
    const subOrgFilter = data.subOrgId
      ? sql`AND e.organization_id = ${data.subOrgId}`
      : sql``;
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const yearFilter =
      data.yearFrom && data.yearTo
        ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int BETWEEN ${data.yearFrom} AND ${data.yearTo}`
        : data.yearFrom
          ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int >= ${data.yearFrom}`
          : data.yearTo
            ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int <= ${data.yearTo}`
            : sql``;

    const districtFilter = data.district
      ? sql`AND e.district = ${data.district}`
      : sql``;

    const [items, countResult] = await Promise.all([
      context.db.execute(sql`
        SELECT
          e.id, e.elevator_number, e.address, e.district,
          e.elevator_type, e.manufacturer, e.build_year,
          o.name as organization_name,
          lb.recommended_modernization_year, lb.budget_amount, lb.measures
        FROM elevators e
        JOIN LATERAL (
          SELECT recommended_modernization_year, budget_amount, measures
          FROM elevator_budgets
          WHERE elevator_id = e.id
          ORDER BY created_at DESC
          LIMIT 1
        ) lb ON true
        LEFT JOIN organizations o ON o.id = e.organization_id
        WHERE e.status = 'active'
          AND e.organization_id IN ${contextOrgIds}
          ${subOrgFilter}
          AND lb.recommended_modernization_year IS NOT NULL
          ${yearFilter}
          ${districtFilter}
        ORDER BY lb.recommended_modernization_year, e.elevator_number
        LIMIT ${pageSize} OFFSET ${offset}
      `),
      context.db.execute(sql`
        SELECT count(*)::int as count
        FROM elevators e
        JOIN LATERAL (
          SELECT recommended_modernization_year
          FROM elevator_budgets
          WHERE elevator_id = e.id
          ORDER BY created_at DESC
          LIMIT 1
        ) lb ON true
        WHERE e.status = 'active'
          AND e.organization_id IN ${contextOrgIds}
          ${subOrgFilter}
          AND lb.recommended_modernization_year IS NOT NULL
          ${yearFilter}
          ${districtFilter}
      `),
    ]);

    type PriorityRow = {
      id: string;
      elevator_number: string;
      address: string | null;
      district: string | null;
      elevator_type: string | null;
      manufacturer: string | null;
      build_year: number | null;
      organization_name: string | null;
      recommended_modernization_year: string | null;
      budget_amount: number | null;
      measures: string | null;
    };
    type CountRow = { count: number };
    const rows = items.rows as PriorityRow[];
    const total = (countResult.rows as CountRow[])[0]?.count ?? 0;

    return {
      items: rows.map((r) => ({
        id: r.id,
        elevatorNumber: r.elevator_number,
        address: r.address,
        district: r.district,
        elevatorType: r.elevator_type,
        manufacturer: r.manufacturer,
        buildYear: r.build_year,
        organizationName: r.organization_name,
        recommendedModernizationYear: r.recommended_modernization_year,
        budgetAmount: r.budget_amount,
        measures: r.measures,
      })),
      total,
      page,
      pageSize,
    };
  });

export const getSubOrgBreakdown = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const result = await context.db.execute(sql`
      SELECT
        o.id as org_id,
        o.name as org_name,
        count(*)::int as count
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      JOIN organizations o ON o.id = e.organization_id
      WHERE e.status = 'active'
        AND e.organization_id IN ${contextOrgIds}
        AND lb.recommended_modernization_year IS NOT NULL
      GROUP BY o.id, o.name
      ORDER BY o.name
    `);

    type BreakdownRow = { org_id: string; org_name: string; count: number };
    return (result.rows as BreakdownRow[]).map((r) => ({
      orgId: r.org_id,
      orgName: r.org_name,
      count: r.count,
    }));
  });

export const subOrgBreakdownOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["modernization", "subOrgBreakdown", parentOrgId],
    queryFn: () => getSubOrgBreakdown({ data: { parentOrgId } }),
  });

export const priorityListOptions = (filters: {
  parentOrgId: string;
  subOrgId?: string;
  yearFrom?: number;
  yearTo?: number;
  district?: string;
  page?: number;
  pageSize?: number;
}) =>
  queryOptions({
    queryKey: ["modernization", "priorityList", filters],
    queryFn: () => getPriorityList({ data: filters }),
  });
