import { query } from "../_generated/server";
import { v } from "convex/values";
import { elevatorAggregate } from "../aggregates";
import { filterArgs, fetchAndFilter, enrichWithOrgName } from "./helpers";
import { requireAuth, getOrgScope } from "../auth";

/**
 * Returns true when the only active filter is organization_id and status is
 * "active" (the default), meaning we can use the aggregate for count + pagination.
 */
function canUseAggregate(args: {
  search?: string;
  district?: string[];
  elevator_type?: string[];
  manufacturer?: string[];
  maintenance_company?: string[];
  inspection_authority?: string[];
  buildYearMin?: number;
  buildYearMax?: number;
  modernized?: boolean;
  status?: "active" | "demolished" | "archived" | "all";
  sort?: string;
}): boolean {
  if (args.search) return false;
  if (args.district && args.district.length > 0) return false;
  if (args.elevator_type && args.elevator_type.length > 0) return false;
  if (args.manufacturer && args.manufacturer.length > 0) return false;
  if (args.maintenance_company && args.maintenance_company.length > 0)
    return false;
  if (args.inspection_authority && args.inspection_authority.length > 0)
    return false;
  if (args.buildYearMin !== undefined) return false;
  if (args.buildYearMax !== undefined) return false;
  if (args.modernized !== undefined) return false;
  // Aggregate is sorted by elevator_number; other sort fields need fallback
  if (args.sort && args.sort !== "elevator_number") return false;
  // Only "active" status is tracked in the aggregate namespace
  const status = args.status ?? "active";
  if (status !== "active") return false;
  return true;
}

export const list = query({
  args: {
    ...filterArgs,
    sort: v.optional(v.string()),
    order: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, args.organization_id);
    const limit = args.limit ?? 25;
    const page = args.page ?? 0;
    const sortOrder = args.order || "asc";

    // Fast path: use aggregate when no extra filters are active and org is scoped
    if (orgId && canUseAggregate(args)) {
      const aggregateOpts = {
        namespace: orgId,
        bounds: { prefix: ["active"] as [string] },
      };
      const totalCount = await elevatorAggregate.count(ctx, aggregateOpts);

      if (totalCount === 0) {
        return { data: [], totalCount: 0, page, limit, totalPages: 0 };
      }

      const offset = page * limit;
      if (offset >= totalCount) {
        return {
          data: [],
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        };
      }

      // Use atBatch to get the exact document IDs for this page
      const pageSize = Math.min(limit, totalCount - offset);
      const indices = Array.from({ length: pageSize }, (_, i) =>
        sortOrder === "desc"
          ? { offset: -(offset + i + 1), ...aggregateOpts }
          : { offset: offset + i, ...aggregateOpts },
      );
      const items = await elevatorAggregate.atBatch(ctx, indices);
      const pageData = (
        await Promise.all(items.map((item) => ctx.db.get(item.id)))
      ).filter((doc) => doc !== null);

      const results = await enrichWithOrgName(ctx, pageData);
      return {
        data: results,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      };
    }

    // Slow path: full .collect() + JS filter (for filtered/sorted views)
    const filtered = await fetchAndFilter(ctx, args);
    const totalCount = filtered.length;

    const sortField = args.sort || "elevator_number";
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
