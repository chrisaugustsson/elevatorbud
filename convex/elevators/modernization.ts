import { query } from "../_generated/server";
import { v } from "convex/values";
import {
  queryElevators,
  enrichWithOrgName,
  parseModernizationYear,
} from "./helpers";
import { Doc, Id } from "../_generated/dataModel";

type Budget = Doc<"elevator_budgets">;

/**
 * Load all budget entries and return the latest per elevator_id.
 * One query instead of N individual lookups.
 */
async function loadLatestBudgets(
  ctx: { db: any },
  orgId?: Id<"organizations">,
): Promise<Map<string, Budget>> {
  // Collect all budgets (small table relative to elevators — one entry per elevator currently)
  const allBudgets: Budget[] = await ctx.db
    .query("elevator_budgets")
    .collect();

  // Build map: keep only the latest per elevator_id (highest _creationTime)
  const map = new Map<string, Budget>();
  for (const b of allBudgets) {
    const existing = map.get(b.elevator_id as string);
    if (!existing || b._creationTime > existing._creationTime) {
      map.set(b.elevator_id as string, b);
    }
  }
  return map;
}

export const timeline = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
    const active = elevators.filter((h) => h.status === "active");
    const budgetMap = await loadLatestBudgets(ctx, organization_id);

    const byYear: Record<string, number> = {};
    for (const h of active) {
      const budget = budgetMap.get(h._id as string);
      if (!budget) continue;
      const year = parseModernizationYear(
        budget.recommended_modernization_year,
      );
      if (year === null) continue;
      byYear[String(year)] = (byYear[String(year)] || 0) + 1;
    }

    return Object.entries(byYear)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, count]) => ({ year, count }));
  },
});

export const budget = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
    const active = elevators.filter((h) => h.status === "active");
    const budgetMap = await loadLatestBudgets(ctx, organization_id);

    const byYear: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const h of active) {
      const latestBudget = budgetMap.get(h._id as string);
      if (!latestBudget?.budget_amount) continue;
      const year = parseModernizationYear(
        latestBudget.recommended_modernization_year,
      );
      if (year === null) continue;

      const yearKey = String(year);
      byYear[yearKey] = (byYear[yearKey] || 0) + latestBudget.budget_amount;

      const districtKey = h.district || "Okänt";
      byDistrict[districtKey] =
        (byDistrict[districtKey] || 0) + latestBudget.budget_amount;

      const typeKey = h.elevator_type || "Okänt";
      byType[typeKey] = (byType[typeKey] || 0) + latestBudget.budget_amount;
    }

    return {
      byYear: Object.entries(byYear)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, amount]) => ({ year, amount })),
      byDistrict: Object.entries(byDistrict)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount })),
      byType: Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount })),
    };
  },
});

export const priorityList = query({
  args: {
    organization_id: v.optional(v.id("organizations")),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
  },
  handler: async (ctx, { organization_id, yearFrom, yearTo }) => {
    const elevators = await queryElevators(ctx, organization_id);
    const active = elevators.filter((h) => h.status === "active");
    const budgetMap = await loadLatestBudgets(ctx, organization_id);

    const results: Array<{
      elevator: (typeof active)[0];
      budget: Budget;
      year: number;
    }> = [];

    for (const h of active) {
      const budget = budgetMap.get(h._id as string);
      if (!budget) continue;
      const year = parseModernizationYear(
        budget.recommended_modernization_year,
      );
      if (year === null) continue;
      if (yearFrom !== undefined && year < yearFrom) continue;
      if (yearTo !== undefined && year > yearTo) continue;

      results.push({ elevator: h, budget, year });
    }

    results.sort((a, b) => a.year - b.year);

    const enriched = await enrichWithOrgName(
      ctx,
      results.map((r) => r.elevator),
    );

    return enriched.map((h, i) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      district: h.district,
      elevator_type: h.elevator_type,
      recommended_modernization_year:
        results[i].budget.recommended_modernization_year,
      budget_amount: results[i].budget.budget_amount,
      measures: results[i].budget.measures,
      organization_id: h.organization_id,
      organizationName: h.organizationName,
    }));
  },
});
