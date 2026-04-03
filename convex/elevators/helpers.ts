import { v } from "convex/values";

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
  ctx: { db: any },
  fields: Record<string, unknown>,
) {
  for (const category of CATEGORY_FIELDS) {
    const value = fields[category];
    if (typeof value !== "string" || value === "") continue;

    const existing = await ctx.db
      .query("suggested_values")
      .withIndex("by_category", (q: any) => q.eq("category", category))
      .collect();

    const alreadyExists = existing.some(
      (f: any) => f.value.toLowerCase() === value.toLowerCase(),
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
  ctx: any,
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
    organization_id?: any;
  },
) {
  let allElevators;
  if (args.organization_id) {
    allElevators = await ctx.db
      .query("elevators")
      .withIndex("by_organization_id", (q: any) =>
        q.eq("organization_id", args.organization_id!),
      )
      .collect();
  } else {
    allElevators = await ctx.db.query("elevators").collect();
  }

  const statusFilter = args.status ?? "active";
  let filtered = statusFilter === "all"
    ? allElevators
    : allElevators.filter((h: any) => h.status === statusFilter);

  if (args.search) {
    const s = args.search.toLowerCase().trim();
    if (s) {
      filtered = filtered.filter(
        (h: any) =>
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
      (h: any) => h.district && set.has(h.district.toLowerCase()),
    );
  }
  if (args.elevator_type && args.elevator_type.length > 0) {
    const set = new Set(args.elevator_type.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.elevator_type && set.has(h.elevator_type.toLowerCase()),
    );
  }
  if (args.manufacturer && args.manufacturer.length > 0) {
    const set = new Set(args.manufacturer.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.manufacturer && set.has(h.manufacturer.toLowerCase()),
    );
  }
  if (args.maintenance_company && args.maintenance_company.length > 0) {
    const set = new Set(args.maintenance_company.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) => h.maintenance_company && set.has(h.maintenance_company.toLowerCase()),
    );
  }
  if (args.inspection_authority && args.inspection_authority.length > 0) {
    const set = new Set(args.inspection_authority.map((d) => d.toLowerCase()));
    filtered = filtered.filter(
      (h: any) =>
        h.inspection_authority && set.has(h.inspection_authority.toLowerCase()),
    );
  }

  if (args.buildYearMin !== undefined) {
    filtered = filtered.filter(
      (h: any) => h.build_year !== undefined && h.build_year >= args.buildYearMin!,
    );
  }
  if (args.buildYearMax !== undefined) {
    filtered = filtered.filter(
      (h: any) => h.build_year !== undefined && h.build_year <= args.buildYearMax!,
    );
  }

  if (args.modernized !== undefined) {
    if (args.modernized) {
      filtered = filtered.filter(
        (h: any) => h.modernization_year && h.modernization_year !== "Ej ombyggd",
      );
    } else {
      filtered = filtered.filter(
        (h: any) => !h.modernization_year || h.modernization_year === "Ej ombyggd",
      );
    }
  }

  return filtered;
}
