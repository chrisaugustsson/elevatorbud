import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../auth";
import { filterArgs, fetchAndFilter } from "./helpers";

export const list = query({
  args: {
    ...filterArgs,
    sort: v.optional(v.string()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const filtered = await fetchAndFilter(ctx, args);
    const totalCount = filtered.length;

    const sortField = args.sort || "elevator_number";
    const sortOrder = args.order || "asc";
    filtered.sort((a: any, b: any) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      let cmp: number;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "sv");
      }

      return sortOrder === "desc" ? -cmp : cmp;
    });

    const limit = args.limit ?? 25;
    const page = args.page ?? 0;
    const offset = page * limit;
    const pageData = filtered.slice(offset, offset + limit);

    const orgCache = new Map<string, string>();
    const results = await Promise.all(
      pageData.map(async (h: any) => {
        let orgName = orgCache.get(h.organization_id);
        if (orgName === undefined) {
          const org = await ctx.db.get(h.organization_id) as { name: string } | null;
          orgName = org?.name ?? "Okänd";
          orgCache.set(h.organization_id, orgName!);
        }
        return {
          ...h,
          organizationName: orgName,
        };
      }),
    );

    return {
      data: results,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },
});

export const exportData = query({
  args: filterArgs,
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const filtered = await fetchAndFilter(ctx, args);

    filtered.sort((a: any, b: any) =>
      String(a.elevator_number).localeCompare(String(b.elevator_number), "sv"),
    );

    const orgCache = new Map<string, string>();
    const results = await Promise.all(
      filtered.map(async (h: any) => {
        let orgName = orgCache.get(h.organization_id);
        if (orgName === undefined) {
          const org = await ctx.db.get(h.organization_id) as { name: string } | null;
          orgName = org?.name ?? "Okänd";
          orgCache.set(h.organization_id, orgName!);
        }
        return {
          ...h,
          organizationName: orgName,
        };
      }),
    );

    return results;
  },
});
