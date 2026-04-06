import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { elevators } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

const NOT_MODERNIZED = "Ej ombyggd";

export const statsInput = z
  .object({ organizationId: z.string().uuid().optional() })
  .optional();

export const chartDataInput = z
  .object({ organizationId: z.string().uuid().optional() })
  .optional();

export async function stats(
  db: Database,
  orgScope: string | undefined,
) {
  const orgCondition = orgScope
    ? eq(elevators.organizationId, orgScope)
    : undefined;
  const activeCondition = eq(elevators.status, "active");
  const where = orgCondition
    ? and(activeCondition, orgCondition)
    : activeCondition;

  const currentYear = new Date().getFullYear();

  const [statsResult, budgetStats] = await Promise.all([
    db
      .select({
        totalCount: sql<number>`count(*)::int`,
        averageAge: sql<number>`round(avg(${currentYear} - ${elevators.buildYear}), 1)`,
        withoutModernization: sql<number>`count(*) filter (where ${elevators.modernizationYear} is null or ${elevators.modernizationYear} = ${NOT_MODERNIZED})::int`,
        lastInventory: sql<string>`max(${elevators.inventoryDate})`,
      })
      .from(elevators)
      .where(where),
    db.execute(sql`
      SELECT
        count(*) filter (where lb.recommended_modernization_year is not null
          and lb.recommended_modernization_year ~ '^\d+$' and lb.recommended_modernization_year::int <= ${currentYear + 3})::int as modernization_within_3_years,
        coalesce(sum(lb.budget_amount) filter (where lb.recommended_modernization_year is not null
          and lb.recommended_modernization_year ~ '^\d+$' and lb.recommended_modernization_year::int = ${currentYear}), 0)::real as budget_current_year
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year, budget_amount
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      WHERE e.status = 'active'
      ${orgScope ? sql`AND e.organization_id = ${orgScope}` : sql``}
    `),
  ]);

  const s = statsResult[0];
  type BudgetStatsRow = {
    modernization_within_3_years: number;
    budget_current_year: number;
  };
  const budgetRows = (budgetStats.rows ?? budgetStats) as BudgetStatsRow[];
  const b = budgetRows[0] ?? { modernization_within_3_years: 0, budget_current_year: 0 };

  return {
    totalCount: s?.totalCount ?? 0,
    averageAge: s?.averageAge ?? 0,
    modernizationWithin3Years: b.modernization_within_3_years ?? 0,
    budgetCurrentYear: b.budget_current_year ?? 0,
    withoutModernization: s?.withoutModernization ?? 0,
    lastInventory: s?.lastInventory ?? null,
  };
}

export async function chartData(
  db: Database,
  orgScope: string | undefined,
) {
  const orgFilter = orgScope
    ? sql`AND e.organization_id = ${orgScope}`
    : sql``;
  const activeFilter = sql`e.status = 'active'`;

  const [
    byDistrict,
    byElevatorType,
    topManufacturers,
    byMaintenanceCompany,
    ageDistribution,
    modernizationTimeline,
  ] = await Promise.all([
    db.execute(sql`
      SELECT district as label, count(*)::int as value
      FROM elevators e
      WHERE ${activeFilter} ${orgFilter}
        AND district IS NOT NULL
      GROUP BY district ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT elevator_type as label, count(*)::int as value
      FROM elevators e
      WHERE ${activeFilter} ${orgFilter}
        AND elevator_type IS NOT NULL
      GROUP BY elevator_type ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT manufacturer as label, count(*)::int as value
      FROM elevators e
      WHERE ${activeFilter} ${orgFilter}
        AND manufacturer IS NOT NULL
      GROUP BY manufacturer ORDER BY value DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT maintenance_company as label, count(*)::int as value
      FROM elevators e
      WHERE ${activeFilter} ${orgFilter}
        AND maintenance_company IS NOT NULL
      GROUP BY maintenance_company ORDER BY value DESC
    `),
    db.execute(sql`
      SELECT
        CASE
          WHEN build_year IS NULL THEN 'Okant'
          WHEN ${new Date().getFullYear()} - build_year < 10 THEN '0-9 ar'
          WHEN ${new Date().getFullYear()} - build_year < 20 THEN '10-19 ar'
          WHEN ${new Date().getFullYear()} - build_year < 30 THEN '20-29 ar'
          WHEN ${new Date().getFullYear()} - build_year < 40 THEN '30-39 ar'
          WHEN ${new Date().getFullYear()} - build_year < 50 THEN '40-49 ar'
          ELSE '50+ ar'
        END as label,
        count(*)::int as value
      FROM elevators e
      WHERE ${activeFilter} ${orgFilter}
      GROUP BY label ORDER BY label
    `),
    db.execute(sql`
      SELECT lb.recommended_modernization_year as label, count(*)::int as value
      FROM elevators e
      JOIN LATERAL (
        SELECT recommended_modernization_year
        FROM elevator_budgets
        WHERE elevator_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lb ON true
      WHERE ${activeFilter} ${orgFilter}
        AND lb.recommended_modernization_year IS NOT NULL
      GROUP BY lb.recommended_modernization_year
      ORDER BY lb.recommended_modernization_year
    `),
  ]);

  type ChartRow = { label: string; value: number };
  const toArray = (r: { rows: Record<string, unknown>[] }) =>
    (r.rows as ChartRow[]).map((row) => ({
      label: row.label,
      value: row.value,
    }));

  return {
    byDistrict: toArray(byDistrict),
    byElevatorType: toArray(byElevatorType),
    topManufacturers: toArray(topManufacturers),
    byMaintenanceCompany: toArray(byMaintenanceCompany),
    ageDistribution: toArray(ageDistribution),
    modernizationTimeline: toArray(modernizationTimeline),
  };
}
