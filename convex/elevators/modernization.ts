import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, getOrgScope } from "../auth";
import { byModernizationYear } from "../aggregates";
import { queryElevators, enrichWithOrgName, parseModernizationYear } from "./helpers";

export const timeline = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);

    if (orgId) {
      const currentYear = new Date().getFullYear();
      const years: string[] = [];
      for (let y = currentYear; y <= 2045; y++) {
        years.push(String(y));
      }
      const counts = await byModernizationYear.countBatch(
        ctx,
        years.map((y) => ({
          namespace: orgId,
          bounds: { prefix: ["active", y] as [string, string] },
        })),
      );
      return years
        .map((year, i) => ({ year, count: counts[i] }))
        .filter((d) => d.count > 0);
    }

    // Admin without org scope: fall back to .collect()
    const allElevators = await ctx.db.query("elevators").collect();
    const active = allElevators.filter((h) => h.status === "active");

    const byYear: Record<string, number> = {};
    for (const h of active) {
      const year = parseModernizationYear(h.recommended_modernization_year);
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
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);

    // Budget by district and type need per-elevator data, so we always collect
    // for those dimensions. But byYear sums can use the aggregate when org-scoped.
    const elevators = orgId
      ? await ctx.db
          .query("elevators")
          .withIndex("by_organization_id", (q) =>
            q.eq("organization_id", orgId),
          )
          .collect()
      : await ctx.db.query("elevators").collect();
    const active = elevators.filter((h) => h.status === "active");

    const byDistrict: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const h of active) {
      if (!h.budget_amount) continue;
      const year = parseModernizationYear(h.recommended_modernization_year);
      if (year === null) continue;

      const districtKey = h.district || "Okänt";
      byDistrict[districtKey] = (byDistrict[districtKey] || 0) + h.budget_amount;

      const typeKey = h.elevator_type || "Okänt";
      byType[typeKey] = (byType[typeKey] || 0) + h.budget_amount;
    }

    // Budget by year: use aggregate when org-scoped
    let byYearData: { year: string; amount: number }[];
    if (orgId) {
      const currentYear = new Date().getFullYear();
      const years: string[] = [];
      for (let y = currentYear; y <= 2045; y++) {
        years.push(String(y));
      }
      const sums = await byModernizationYear.sumBatch(
        ctx,
        years.map((y) => ({
          namespace: orgId,
          bounds: { prefix: ["active", y] as [string, string] },
        })),
      );
      byYearData = years
        .map((year, i) => ({ year, amount: sums[i] }))
        .filter((d) => d.amount > 0);
    } else {
      const byYear: Record<string, number> = {};
      for (const h of active) {
        if (!h.budget_amount) continue;
        const year = parseModernizationYear(h.recommended_modernization_year);
        if (year === null) continue;
        byYear[String(year)] = (byYear[String(year)] || 0) + h.budget_amount;
      }
      byYearData = Object.entries(byYear)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, amount]) => ({ year, amount }));
    }

    return {
      byYear: byYearData,
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

    const withYear = active
      .filter((h) => {
        const year = parseModernizationYear(h.recommended_modernization_year);
        if (year === null) return false;
        if (yearFrom !== undefined && year < yearFrom) return false;
        if (yearTo !== undefined && year > yearTo) return false;
        return true;
      })
      .sort((a, b) => {
        const ya = parseModernizationYear(a.recommended_modernization_year)!;
        const yb = parseModernizationYear(b.recommended_modernization_year)!;
        return ya - yb;
      });

    const enriched = await enrichWithOrgName(ctx, withYear);
    return enriched.map((h) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      district: h.district,
      elevator_type: h.elevator_type,
      recommended_modernization_year: h.recommended_modernization_year,
      budget_amount: h.budget_amount,
      modernization_measures: h.modernization_measures,
      organization_id: h.organization_id,
      organizationName: h.organizationName,
    }));
  },
});
