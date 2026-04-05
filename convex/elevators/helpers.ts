import { v } from "convex/values";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { requireAuth, getOrgScope } from "../auth";

type Elevator = Doc<"elevators">;

const NOT_MODERNIZED = "Ej ombyggd";

const CATEGORY_FIELDS = [
  "elevator_type",
  "manufacturer",
  "district",
  "maintenance_company",
  "inspection_authority",
  "elevator_designation",
  "door_type",
  "collective",
  "drive_system",
  "machine_placement",
  "modernization_measures",
] as const;

export async function autoAddSuggestedValues(
  ctx: MutationCtx,
  fields: Record<string, unknown>,
) {
  for (const category of CATEGORY_FIELDS) {
    const value = fields[category];
    if (typeof value !== "string" || value === "") continue;

    const existing = await ctx.db
      .query("suggested_values")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();

    const alreadyExists = existing.some(
      (f) => f.value.toLowerCase() === value.toLowerCase(),
    );

    if (!alreadyExists) {
      await ctx.db.insert("suggested_values", {
        category,
        value,
        active: true,
        created_at: Date.now(),
      });
    }
  }
}

/**
 * Authenticates the user, resolves org scope, and fetches elevators.
 * Customers always get their own org's elevators; admins get all or filtered by argsOrgId.
 */
export async function queryElevators(
  ctx: QueryCtx,
  argsOrgId?: Id<"organizations">,
) {
  const user = await requireAuth(ctx);
  const orgId = getOrgScope(user, argsOrgId);

  if (orgId) {
    return ctx.db
      .query("elevators")
      .withIndex("by_organization_id", (q) =>
        q.eq("organization_id", orgId),
      )
      .collect();
  }
  return ctx.db.query("elevators").collect();
}

/**
 * Looks up organization names for a list of elevators using a local cache.
 * Safe: cache is per-call (no cross-request or cross-user leakage).
 */
export async function enrichWithOrgName<T extends { organization_id: Id<"organizations"> }>(
  ctx: QueryCtx,
  items: T[],
): Promise<Array<T & { organizationName: string }>> {
  const cache = new Map<string, Promise<string>>();
  return Promise.all(
    items.map(async (item) => {
      const key = item.organization_id as string;
      let promise = cache.get(key);
      if (!promise) {
        promise = ctx.db.get(item.organization_id).then((org) => org?.name ?? "Okänd");
        cache.set(key, promise);
      }
      const name = await promise;
      return { ...item, organizationName: name };
    }),
  );
}

/**
 * Parses a modernization year string to a number, or returns null.
 */
export function parseModernizationYear(yearStr?: string): number | null {
  if (!yearStr) return null;
  const year = parseInt(yearStr, 10);
  return isNaN(year) ? null : year;
}

// Shared filter args schema for list and export queries
export const filterArgs = {
  search: v.optional(v.string()),
  district: v.optional(v.array(v.string())),
  elevator_type: v.optional(v.array(v.string())),
  manufacturer: v.optional(v.array(v.string())),
  maintenance_company: v.optional(v.array(v.string())),
  inspection_authority: v.optional(v.array(v.string())),
  buildYearMin: v.optional(v.number()),
  buildYearMax: v.optional(v.number()),
  modernized: v.optional(v.boolean()),
  status: v.optional(
    v.union(
      v.literal("active"),
      v.literal("demolished"),
      v.literal("archived"),
      v.literal("all"),
    ),
  ),
  organization_id: v.optional(v.id("organizations")),
};

// Shared filter logic used by both list and exportData queries
export async function fetchAndFilter(
  ctx: QueryCtx,
  args: {
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
    organization_id?: Id<"organizations">;
  },
) {
  const allElevators = await queryElevators(ctx, args.organization_id);

  const statusFilter = args.status ?? "active";
  let filtered: Elevator[] = statusFilter === "all"
    ? allElevators
    : allElevators.filter((h) => h.status === statusFilter);

  if (args.search) {
    const s = args.search.toLowerCase().trim();
    if (s) {
      filtered = filtered.filter(
        (h) =>
          h.elevator_number.toLowerCase().includes(s) ||
          (h.address && h.address.toLowerCase().includes(s)) ||
          (h.district && h.district.toLowerCase().includes(s)) ||
          (h.manufacturer && h.manufacturer.toLowerCase().includes(s)) ||
          (h.elevator_type && h.elevator_type.toLowerCase().includes(s)),
      );
    }
  }

  if (args.district && args.district.length > 0) {
    const set = new Set(args.district.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h) => h.district && set.has(h.district.toLowerCase()),
    );
  }
  if (args.elevator_type && args.elevator_type.length > 0) {
    const set = new Set(args.elevator_type.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h) => h.elevator_type && set.has(h.elevator_type.toLowerCase()),
    );
  }
  if (args.manufacturer && args.manufacturer.length > 0) {
    const set = new Set(args.manufacturer.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h) => h.manufacturer && set.has(h.manufacturer.toLowerCase()),
    );
  }
  if (args.maintenance_company && args.maintenance_company.length > 0) {
    const set = new Set(args.maintenance_company.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h) => h.maintenance_company && set.has(h.maintenance_company.toLowerCase()),
    );
  }
  if (args.inspection_authority && args.inspection_authority.length > 0) {
    const set = new Set(args.inspection_authority.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h) =>
        h.inspection_authority && set.has(h.inspection_authority.toLowerCase()),
    );
  }

  if (args.buildYearMin !== undefined) {
    filtered = filtered.filter(
      (h) => h.build_year !== undefined && h.build_year >= args.buildYearMin!,
    );
  }
  if (args.buildYearMax !== undefined) {
    filtered = filtered.filter(
      (h) => h.build_year !== undefined && h.build_year <= args.buildYearMax!,
    );
  }

  if (args.modernized !== undefined) {
    if (args.modernized) {
      filtered = filtered.filter(
        (h) => h.modernization_year && h.modernization_year !== NOT_MODERNIZED,
      );
    } else {
      filtered = filtered.filter(
        (h) => !h.modernization_year || h.modernization_year === NOT_MODERNIZED,
      );
    }
  }

  return filtered;
}
