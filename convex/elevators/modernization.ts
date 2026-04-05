import { query } from "../_generated/server";
import { v } from "convex/values";
import { queryElevators, enrichWithOrgName, parseModernizationYear } from "./helpers";

export const timeline = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
    const active = elevators.filter((h) => h.status === "active");

    const byYear: Record<string, number> = {};
    for (const h of active) {
      const year = parseModernizationYear(h.recommended_modernization_year);
      if (year === null) continue;
      const key = String(year);
      byYear[key] = (byYear[key] || 0) + 1;
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

    const byYear: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const h of active) {
      if (!h.budget_amount) continue;
      const year = parseModernizationYear(h.recommended_modernization_year);
      if (year === null) continue;

      const yearKey = String(year);
      byYear[yearKey] = (byYear[yearKey] || 0) + h.budget_amount;

      const districtKey = h.district || "Okänt";
      byDistrict[districtKey] = (byDistrict[districtKey] || 0) + h.budget_amount;

      const typeKey = h.elevator_type || "Okänt";
      byType[typeKey] = (byType[typeKey] || 0) + h.budget_amount;
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
