import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../auth";

export const timeline = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let elevators;
    if (organization_id) {
      elevators = await ctx.db
        .query("elevators")
        .withIndex("by_organization_id", (q) =>
          q.eq("organization_id", organization_id),
        )
        .collect();
    } else {
      elevators = await ctx.db.query("elevators").collect();
    }

    const active = elevators.filter((h) => h.status === "active");

    const byYear: Record<string, number> = {};
    for (const h of active) {
      if (!h.recommended_modernization_year) continue;
      const year = parseInt(h.recommended_modernization_year, 10);
      if (isNaN(year)) continue;
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
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let elevators;
    if (organization_id) {
      elevators = await ctx.db
        .query("elevators")
        .withIndex("by_organization_id", (q) =>
          q.eq("organization_id", organization_id),
        )
        .collect();
    } else {
      elevators = await ctx.db.query("elevators").collect();
    }

    const active = elevators.filter((h) => h.status === "active");

    const byYear: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const h of active) {
      if (!h.recommended_modernization_year || !h.budget_amount) continue;
      const year = parseInt(h.recommended_modernization_year, 10);
      if (isNaN(year)) continue;

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
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let elevators;
    if (organization_id) {
      elevators = await ctx.db
        .query("elevators")
        .withIndex("by_organization_id", (q) =>
          q.eq("organization_id", organization_id),
        )
        .collect();
    } else {
      elevators = await ctx.db.query("elevators").collect();
    }

    const active = elevators.filter((h) => h.status === "active");

    const withYear = active
      .filter((h) => {
        if (!h.recommended_modernization_year) return false;
        const year = parseInt(h.recommended_modernization_year, 10);
        if (isNaN(year)) return false;
        if (yearFrom !== undefined && year < yearFrom) return false;
        if (yearTo !== undefined && year > yearTo) return false;
        return true;
      })
      .sort((a, b) => {
        const ya = parseInt(a.recommended_modernization_year!, 10);
        const yb = parseInt(b.recommended_modernization_year!, 10);
        return ya - yb;
      });

    const orgCache = new Map<string, string>();
    return await Promise.all(
      withYear.map(async (h) => {
        let orgName = orgCache.get(String(h.organization_id));
        if (orgName === undefined) {
          const org = await ctx.db.get(h.organization_id);
          orgName = (org as { name: string } | null)?.name ?? "Okänd";
          orgCache.set(String(h.organization_id), orgName);
        }
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          district: h.district,
          elevator_type: h.elevator_type,
          recommended_modernization_year: h.recommended_modernization_year,
          budget_amount: h.budget_amount,
          modernization_measures: h.modernization_measures,
          organization_id: h.organization_id,
          organizationName: orgName,
        };
      }),
    );
  },
});

export const measures = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    let elevators;
    if (organization_id) {
      elevators = await ctx.db
        .query("elevators")
        .withIndex("by_organization_id", (q) =>
          q.eq("organization_id", organization_id),
        )
        .collect();
    } else {
      elevators = await ctx.db.query("elevators").collect();
    }

    const active = elevators.filter((h) => h.status === "active");

    const counts: Record<string, number> = {};
    for (const h of active) {
      if (!h.modernization_measures) continue;
      const measure = h.modernization_measures;
      counts[measure] = (counts[measure] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([measure, count]) => ({ measure, count }));
  },
});
