import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, getOrgScope } from "../auth";
import {
  elevatorAggregate,
  byDistrict,
  byElevatorType,
  byManufacturer,
  byMaintenanceCompany,
  byBuildYear,
} from "../aggregates";
import { Doc } from "../_generated/dataModel";

const NOT_MODERNIZED = "Ej ombyggd";

type Budget = Doc<"elevator_budgets">;

async function getAllOrgIds(ctx: { db: any }): Promise<string[]> {
  const orgs = await ctx.db.query("organizations").collect();
  return orgs.map((o: { _id: string }) => o._id);
}

async function getSuggestedValues(
  ctx: { db: any },
  category: string,
): Promise<string[]> {
  const values = await ctx.db
    .query("suggested_values")
    .withIndex("by_category", (q: any) => q.eq("category", category))
    .collect();
  return values
    .filter((v: { active: boolean }) => v.active)
    .map((v: { value: string }) => v.value);
}

async function getLatestBudgets(
  ctx: { db: any },
): Promise<Map<string, Budget>> {
  const allBudgets: Budget[] = await ctx.db
    .query("elevator_budgets")
    .collect();
  const map = new Map<string, Budget>();
  for (const b of allBudgets) {
    const existing = map.get(b.elevator_id as string);
    if (!existing || b._creationTime > existing._creationTime) {
      map.set(b.elevator_id as string, b);
    }
  }
  return map;
}

function parseModYear(yearStr?: string): number | null {
  if (!yearStr) return null;
  const year = parseInt(yearStr, 10);
  return isNaN(year) ? null : year;
}

export const stats = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);
    const currentYear = new Date().getFullYear();

    // --- Core stats via aggregates (works for single org or batched across all) ---
    const orgIds = orgId ? [orgId] : await getAllOrgIds(ctx);

    const activePrefixes = orgIds.map((id) => ({
      namespace: id,
      bounds: { prefix: ["active"] as [string] },
    }));

    const totalCounts = await elevatorAggregate.countBatch(ctx, activePrefixes);
    const totalCount = totalCounts.reduce((sum, c) => sum + c, 0);

    // Average age via build_year aggregate (exclude sentinel -1)
    const buildYearOpts = orgIds.map((id) => ({
      namespace: id,
      bounds: {
        lower: { key: ["active", 0] as [string, number], inclusive: false },
      },
    }));
    const [buildYearCounts, buildYearSums] = await Promise.all([
      byBuildYear.countBatch(ctx, buildYearOpts),
      byBuildYear.sumBatch(ctx, buildYearOpts),
    ]);
    const countWithBuildYear = buildYearCounts.reduce((s, c) => s + c, 0);
    const sumBuildYear = buildYearSums.reduce((s, c) => s + c, 0);
    const averageAge =
      countWithBuildYear > 0
        ? (currentYear * countWithBuildYear - sumBuildYear) / countWithBuildYear
        : 0;

    // Without modernization (uses core field modernization_year, not budget)
    const elevators = orgId
      ? await ctx.db
          .query("elevators")
          .withIndex("by_organization_id", (q) =>
            q.eq("organization_id", orgId),
          )
          .collect()
      : await ctx.db.query("elevators").collect();
    const active = elevators.filter((h) => h.status === "active");

    const withoutModernization = active.filter((h) => {
      return !h.modernization_year || h.modernization_year === NOT_MODERNIZED;
    }).length;

    // --- Budget stats (must query elevator_budgets per elevator) ---
    const activeIds = active.map((h) => h._id as string);
    const budgetMap = await getLatestBudgets(ctx);

    const modernizationWithin3Years = active.filter((h) => {
      const budget = budgetMap.get(h._id as string);
      const year = parseModYear(budget?.recommended_modernization_year);
      return year !== null && year >= currentYear && year <= currentYear + 3;
    }).length;

    const totalBudgetCurrentYear = active
      .filter((h) => {
        const budget = budgetMap.get(h._id as string);
        if (!budget?.budget_amount) return false;
        const year = parseModYear(budget.recommended_modernization_year);
        return year === currentYear;
      })
      .reduce((sum, h) => {
        const budget = budgetMap.get(h._id as string);
        return sum + (budget?.budget_amount ?? 0);
      }, 0);

    const lastInventory =
      active.length > 0 ? Math.max(...active.map((h) => h.created_at)) : null;

    return {
      totalCount,
      averageAge: Math.round(averageAge * 10) / 10,
      modernizationWithin3Years,
      totalBudgetCurrentYear,
      withoutModernization,
      lastInventory,
    };
  },
});

export const chartData = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);
    const currentYear = new Date().getFullYear();

    const orgIds = orgId ? [orgId] : await getAllOrgIds(ctx);

    // Load known values from suggested_values for each dimension
    const [districts, types, manufacturers, maintCompanies] = await Promise.all(
      [
        getSuggestedValues(ctx, "district"),
        getSuggestedValues(ctx, "elevator_type"),
        getSuggestedValues(ctx, "manufacturer"),
        getSuggestedValues(ctx, "maintenance_company"),
      ],
    );

    const districtKeys = [...districts, "Okänt"];
    const typeKeys = [...types, "Okänt"];
    const manufacturerKeys = [...manufacturers, "Okänt"];
    const maintKeys = [...maintCompanies, "Okänt"];

    // Batch count all dimensions × all orgs in parallel
    const [districtCounts, typeCounts, manufacturerCounts, maintCounts] =
      await Promise.all([
        byDistrict.countBatch(
          ctx,
          orgIds.flatMap((id) =>
            districtKeys.map((d) => ({
              namespace: id,
              bounds: { prefix: ["active", d] as [string, string] },
            })),
          ),
        ),
        byElevatorType.countBatch(
          ctx,
          orgIds.flatMap((id) =>
            typeKeys.map((t) => ({
              namespace: id,
              bounds: { prefix: ["active", t] as [string, string] },
            })),
          ),
        ),
        byManufacturer.countBatch(
          ctx,
          orgIds.flatMap((id) =>
            manufacturerKeys.map((m) => ({
              namespace: id,
              bounds: { prefix: ["active", m] as [string, string] },
            })),
          ),
        ),
        byMaintenanceCompany.countBatch(
          ctx,
          orgIds.flatMap((id) =>
            maintKeys.map((mc) => ({
              namespace: id,
              bounds: { prefix: ["active", mc] as [string, string] },
            })),
          ),
        ),
      ]);

    // Merge counts across orgs
    function mergeAcrossOrgs(
      keys: string[],
      counts: number[],
    ): { name: string; count: number }[] {
      const merged: Record<string, number> = {};
      for (let orgIdx = 0; orgIdx < orgIds.length; orgIdx++) {
        for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
          const key = keys[keyIdx];
          merged[key] =
            (merged[key] || 0) + counts[orgIdx * keys.length + keyIdx];
        }
      }
      return Object.entries(merged)
        .filter(([, count]) => count > 0)
        .map(([name, count]) => ({ name, count }));
    }

    const byDistrictData = mergeAcrossOrgs(districtKeys, districtCounts);
    const byElevatorTypeData = mergeAcrossOrgs(typeKeys, typeCounts);
    const topManufacturers = mergeAcrossOrgs(
      manufacturerKeys,
      manufacturerCounts,
    )
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const byMaintenanceCompanyData = mergeAcrossOrgs(maintKeys, maintCounts);

    // Age distribution via build_year aggregate
    const ageBuckets = [
      { label: "0-9 år", min: currentYear - 9, max: currentYear },
      { label: "10-19 år", min: currentYear - 19, max: currentYear - 10 },
      { label: "20-29 år", min: currentYear - 29, max: currentYear - 20 },
      { label: "30-39 år", min: currentYear - 39, max: currentYear - 30 },
      { label: "40-49 år", min: currentYear - 49, max: currentYear - 40 },
      { label: "50+ år", min: 0, max: currentYear - 50 },
    ];

    const ageCounts = await byBuildYear.countBatch(
      ctx,
      orgIds.flatMap((id) => [
        ...ageBuckets.map((b) => ({
          namespace: id,
          bounds: {
            lower: {
              key: ["active", b.min] as [string, number],
              inclusive: true,
            },
            upper: {
              key: ["active", b.max] as [string, number],
              inclusive: true,
            },
          },
        })),
        // Unknown build year (sentinel -1)
        {
          namespace: id,
          bounds: { prefix: ["active", -1] as [string, number] },
        },
      ]),
    );

    const bucketCount = ageBuckets.length + 1;
    const mergedAge = new Array(bucketCount).fill(0);
    for (let orgIdx = 0; orgIdx < orgIds.length; orgIdx++) {
      for (let b = 0; b < bucketCount; b++) {
        mergedAge[b] += ageCounts[orgIdx * bucketCount + b];
      }
    }
    const ageDistribution = [
      ...ageBuckets
        .map((b, i) => ({ name: b.label, count: mergedAge[i] }))
        .filter((d) => d.count > 0),
      ...(mergedAge[ageBuckets.length] > 0
        ? [{ name: "Okänt", count: mergedAge[ageBuckets.length] }]
        : []),
    ];

    // Modernization timeline — requires budget data (no aggregate)
    const elevators = orgId
      ? await ctx.db
          .query("elevators")
          .withIndex("by_organization_id", (q) =>
            q.eq("organization_id", orgId),
          )
          .collect()
      : await ctx.db.query("elevators").collect();
    const active = elevators.filter((h) => h.status === "active");
    const budgetMap = await getLatestBudgets(ctx);

    const modernizationTimelineMap: Record<string, number> = {};
    for (const h of active) {
      const budget = budgetMap.get(h._id as string);
      const year = parseModYear(budget?.recommended_modernization_year);
      if (year !== null) {
        const key = year >= 2045 ? "2045+" : String(year);
        modernizationTimelineMap[key] =
          (modernizationTimelineMap[key] || 0) + 1;
      }
    }

    return {
      byDistrict: byDistrictData,
      ageDistribution,
      byElevatorType: byElevatorTypeData,
      topManufacturers,
      modernizationTimeline: Object.entries(modernizationTimelineMap)
        .sort((a, b) => {
          if (a[0] === "2045+") return 1;
          if (b[0] === "2045+") return -1;
          return Number(a[0]) - Number(b[0]);
        })
        .map(([name, count]) => ({ name, count })),
      byMaintenanceCompany: byMaintenanceCompanyData,
    };
  },
});
