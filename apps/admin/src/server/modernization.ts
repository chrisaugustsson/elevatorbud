import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { sql } from "drizzle-orm";
import type { DatabaseHttp } from "@elevatorbud/db";
import { adminMiddlewareRead } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/modernization.ts)
// ---------------------------------------------------------------------------

const priorityListInput = z.object({
  organizationId: z.string().uuid().optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  district: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Inlined query logic
// Admin: organizationId is an optional FILTER, not a security boundary.
// ---------------------------------------------------------------------------

async function timeline(db: DatabaseHttp, organizationId: string | undefined) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
    : sql``;

  const result = await db.execute(sql`
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
    WHERE e.status = 'active' ${orgFilter}
      AND lb.recommended_modernization_year IS NOT NULL
    GROUP BY lb.recommended_modernization_year
    ORDER BY lb.recommended_modernization_year
  `);

  type TimelineRow = { year: string; count: number };
  return (result.rows as TimelineRow[]).map((r) => ({
    year: r.year,
    count: r.count,
  }));
}

async function budget(db: DatabaseHttp, organizationId: string | undefined) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
    : sql``;

  const result = await db.execute(sql`
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
    WHERE e.status = 'active' ${orgFilter}
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
}

async function priorityList(
  db: DatabaseHttp,
  organizationId: string | undefined,
  input: {
    yearFrom?: number;
    yearTo?: number;
    district?: string;
    page: number;
    pageSize: number;
  },
) {
  const orgFilter = organizationId
    ? sql`AND e.organization_id = ${organizationId}`
    : sql``;

  const yearFilter =
    input.yearFrom && input.yearTo
      ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int BETWEEN ${input.yearFrom} AND ${input.yearTo}`
      : input.yearFrom
        ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int >= ${input.yearFrom}`
        : input.yearTo
          ? sql`AND lb.recommended_modernization_year ~ '^[0-9]+$' AND lb.recommended_modernization_year::int <= ${input.yearTo}`
          : sql``;

  const districtFilter = input.district
    ? sql`AND e.district = ${input.district}`
    : sql``;

  const offset = (input.page - 1) * input.pageSize;

  const [items, countResult] = await Promise.all([
    db.execute(sql`
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
      WHERE e.status = 'active' ${orgFilter}
        AND lb.recommended_modernization_year IS NOT NULL
        ${yearFilter}
        ${districtFilter}
      ORDER BY lb.recommended_modernization_year, e.elevator_number
      LIMIT ${input.pageSize} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT count(*)::int as count
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      WHERE e.status = 'active' ${orgFilter}
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
    page: input.page,
    pageSize: input.pageSize,
  };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getTimeline = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    return timeline(context.db, data?.organizationId);
  });

export const timelineOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["modernization", "timeline", { organizationId }],
    queryFn: () => getTimeline({ data: { organizationId } }),
  });

export const getBudget = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    return budget(context.db, data?.organizationId);
  });

export const budgetOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["modernization", "budget", { organizationId }],
    queryFn: () => getBudget({ data: { organizationId } }),
  });

export const getPriorityList = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(priorityListInput)
  .handler(async ({ data, context }) => {
    return priorityList(context.db, data.organizationId, {
      yearFrom: data.yearFrom,
      yearTo: data.yearTo,
      district: data.district,
      page: data.page,
      pageSize: data.pageSize,
    });
  });

export const priorityListOptions = (
  input: z.infer<typeof priorityListInput>,
) =>
  queryOptions({
    queryKey: ["modernization", "priorityList", input],
    queryFn: () => getPriorityList({ data: input }),
  });
