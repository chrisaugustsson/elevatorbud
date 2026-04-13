import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { authMiddleware } from "./auth";

export const getTimeline = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgId = context.user.organizationId!;

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
        AND e.organization_id = ${orgId}
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

export const timelineOptions = () =>
  queryOptions({
    queryKey: ["modernization", "timeline"],
    queryFn: () => getTimeline(),
  });

export const getBudget = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgId = context.user.organizationId!;

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
        AND e.organization_id = ${orgId}
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

export const budgetOptions = () =>
  queryOptions({
    queryKey: ["modernization", "budget"],
    queryFn: () => getBudget(),
  });

export const getPriorityList = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      yearFrom: z.number().optional(),
      yearTo: z.number().optional(),
      district: z.string().optional(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationId!;
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
          AND e.organization_id = ${orgId}
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
          AND e.organization_id = ${orgId}
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

export const priorityListOptions = (filters?: {
  yearFrom?: number;
  yearTo?: number;
  district?: string;
  page?: number;
  pageSize?: number;
}) =>
  queryOptions({
    queryKey: ["modernization", "priorityList", filters],
    queryFn: () => getPriorityList({ data: filters ?? {} }),
  });
