import { query } from "../_generated/server";
import { v } from "convex/values";
import { filterArgs, fetchAndFilter, enrichWithOrgName } from "./helpers";

export const list = query({
  args: {
    ...filterArgs,
    sort: v.optional(v.string()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const filtered = await fetchAndFilter(ctx, args);
    const totalCount = filtered.length;

    const sortField = args.sort || "elevator_number";
    const sortOrder = args.order || "asc";
    filtered.sort((a, b) => {
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
    const results = await enrichWithOrgName(ctx, pageData);

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
    const filtered = await fetchAndFilter(ctx, args);

    filtered.sort((a, b) =>
      a.elevator_number.localeCompare(b.elevator_number, "sv"),
    );

    return enrichWithOrgName(ctx, filtered);
  },
});
