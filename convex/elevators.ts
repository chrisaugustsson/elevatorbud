import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, getCurrentUser } from "./auth";

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
const filterArgs = {
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
async function fetchAndFilter(
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

export const stats = query({
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

    const currentYear = new Date().getFullYear();

    const withBuildYear = active.filter((h) => h.build_year !== undefined);
    const averageAge =
      withBuildYear.length > 0
        ? withBuildYear.reduce((sum, h) => sum + (currentYear - h.build_year!), 0) /
          withBuildYear.length
        : 0;

    const modernizationWithin3Years = active.filter((h) => {
      if (!h.recommended_modernization_year) return false;
      const year = parseInt(h.recommended_modernization_year, 10);
      if (isNaN(year)) return false;
      return year >= currentYear && year <= currentYear + 3;
    }).length;

    const totalBudgetCurrentYear = active
      .filter((h) => {
        if (!h.recommended_modernization_year || !h.budget_amount) return false;
        const year = parseInt(h.recommended_modernization_year, 10);
        return year === currentYear;
      })
      .reduce((sum, h) => sum + (h.budget_amount ?? 0), 0);

    const withoutModernization = active.filter((h) => {
      return !h.modernization_year || h.modernization_year === "Ej ombyggd";
    }).length;

    const lastInventory =
      active.length > 0
        ? Math.max(...active.map((h) => h.created_at))
        : null;

    return {
      totalCount: active.length,
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
    const currentYear = new Date().getFullYear();

    // Elevators per district
    const byDistrict: Record<string, number> = {};
    for (const h of active) {
      const key = h.district || "Okänt";
      byDistrict[key] = (byDistrict[key] || 0) + 1;
    }

    // Age distribution (decade buckets)
    const ageDistribution: Record<string, number> = {};
    for (const h of active) {
      if (h.build_year === undefined) {
        ageDistribution["Okänt"] = (ageDistribution["Okänt"] || 0) + 1;
      } else {
        const age = currentYear - h.build_year;
        let bucket: string;
        if (age < 10) bucket = "0-9 år";
        else if (age < 20) bucket = "10-19 år";
        else if (age < 30) bucket = "20-29 år";
        else if (age < 40) bucket = "30-39 år";
        else if (age < 50) bucket = "40-49 år";
        else bucket = "50+ år";
        ageDistribution[bucket] = (ageDistribution[bucket] || 0) + 1;
      }
    }

    // Elevator types
    const byElevatorType: Record<string, number> = {};
    for (const h of active) {
      const key = h.elevator_type || "Okänt";
      byElevatorType[key] = (byElevatorType[key] || 0) + 1;
    }

    // Top-10 manufacturers
    const byManufacturer: Record<string, number> = {};
    for (const h of active) {
      const key = h.manufacturer || "Okänt";
      byManufacturer[key] = (byManufacturer[key] || 0) + 1;
    }
    const topManufacturers = Object.entries(byManufacturer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Modernization timeline (2026-2045+)
    const modernizationTimeline: Record<string, number> = {};
    for (const h of active) {
      if (!h.recommended_modernization_year) continue;
      const year = parseInt(h.recommended_modernization_year, 10);
      if (isNaN(year)) continue;
      const key = year >= 2045 ? "2045+" : String(year);
      modernizationTimeline[key] = (modernizationTimeline[key] || 0) + 1;
    }

    // Maintenance companies
    const byMaintenanceCompany: Record<string, number> = {};
    for (const h of active) {
      const key = h.maintenance_company || "Okänt";
      byMaintenanceCompany[key] = (byMaintenanceCompany[key] || 0) + 1;
    }

    return {
      byDistrict: Object.entries(byDistrict).map(([name, count]) => ({
        name,
        count,
      })),
      ageDistribution: Object.entries(ageDistribution).map(
        ([name, count]) => ({ name, count }),
      ),
      byElevatorType: Object.entries(byElevatorType).map(([name, count]) => ({
        name,
        count,
      })),
      topManufacturers: topManufacturers.map(([name, count]) => ({ name, count })),
      modernizationTimeline: Object.entries(modernizationTimeline)
        .sort((a, b) => {
          if (a[0] === "2045+") return 1;
          if (b[0] === "2045+") return -1;
          return Number(a[0]) - Number(b[0]);
        })
        .map(([name, count]) => ({ name, count })),
      byMaintenanceCompany: Object.entries(byMaintenanceCompany).map(
        ([name, count]) => ({ name, count }),
      ),
    };
  },
});

export const modernizationTimeline = query({
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

export const modernizationBudget = query({
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

export const modernizationPriorityList = query({
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
          organizationName: orgName,
        };
      }),
    );
  },
});

export const modernizationMeasures = query({
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

export const inspectionCalendar = query({
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

    const MONTHS = [
      "Januari", "Februari", "Mars", "April", "Maj", "Juni",
      "Juli", "Augusti", "September", "Oktober", "November", "December",
    ];

    const byMonth: Record<string, number> = {};
    for (const m of MONTHS) {
      byMonth[m] = 0;
    }

    for (const h of active) {
      if (!h.inspection_month) continue;
      const key = h.inspection_month;
      if (key in byMonth) {
        byMonth[key] = byMonth[key] + 1;
      }
    }

    return MONTHS.map((month) => ({ month, count: byMonth[month] }));
  },
});

export const maintenanceCompanies = query({
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

    const byCompany: Record<string, number> = {};
    const matrix: Record<string, Record<string, number>> = {};
    const allDistricts = new Set<string>();

    for (const h of active) {
      const company = h.maintenance_company || "Okänt";
      const dist = h.district || "Okänt";
      allDistricts.add(dist);

      byCompany[company] = (byCompany[company] || 0) + 1;

      if (!matrix[company]) matrix[company] = {};
      matrix[company][dist] = (matrix[company][dist] || 0) + 1;
    }

    const districts = Array.from(allDistricts).sort((a, b) =>
      a.localeCompare(b, "sv"),
    );

    const companies = Object.entries(byCompany)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        byDistrict: districts.map((d) => ({
          district: d,
          count: matrix[name]?.[d] || 0,
        })),
      }));

    return { companies, districts };
  },
});

export const emergencyPhoneStatus = query({
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

    let withEmergencyPhone = 0;
    let withoutEmergencyPhone = 0;
    let needsUpgrade = 0;
    let totalUpgradeCost = 0;
    const byDistrict: Record<string, { with: number; without: number; upgrade: number; cost: number }> = {};

    for (const h of active) {
      const dist = h.district || "Okänt";
      if (!byDistrict[dist]) {
        byDistrict[dist] = { with: 0, without: 0, upgrade: 0, cost: 0 };
      }

      if (h.has_emergency_phone) {
        withEmergencyPhone++;
        byDistrict[dist].with++;

        if (h.needs_upgrade) {
          needsUpgrade++;
          byDistrict[dist].upgrade++;
          if (h.emergency_phone_price) {
            totalUpgradeCost += h.emergency_phone_price;
            byDistrict[dist].cost += h.emergency_phone_price;
          }
        }
      } else {
        withoutEmergencyPhone++;
        byDistrict[dist].without++;
      }
    }

    const districtList = Object.entries(byDistrict)
      .sort((a, b) => a[0].localeCompare(b[0], "sv"))
      .map(([district, data]) => ({
        district,
        ...data,
      }));

    return {
      withEmergencyPhone,
      withoutEmergencyPhone,
      needsUpgrade,
      totalUpgradeCost,
      byDistrict: districtList,
    };
  },
});

export const inspectionList = query({
  args: {
    organization_id: v.optional(v.id("organizations")),
    month: v.string(),
  },
  handler: async (ctx, { organization_id, month }) => {
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

    const active = elevators.filter(
      (h) => h.status === "active" && h.inspection_month === month,
    );

    const orgCache = new Map<string, string>();
    const results = await Promise.all(
      active.map(async (h) => {
        const orgKey = h.organization_id.toString();
        let orgName = orgCache.get(orgKey);
        if (!orgName) {
          const org = await ctx.db.get(h.organization_id);
          orgName = (org as { name: string } | null)?.name || "Okänd";
          orgCache.set(orgKey, orgName);
        }
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          district: h.district,
          inspection_authority: h.inspection_authority,
          organizationName: orgName,
        };
      }),
    );

    return results.sort((a, b) =>
      a.elevator_number.localeCompare(b.elevator_number, "sv"),
    );
  },
});

export const todaysElevators = query({
  args: { todayStart: v.number() },
  handler: async (ctx, { todayStart }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const allElevators = await ctx.db.query("elevators").collect();

    const today = allElevators.filter((h) => {
      const createdToday =
        h.created_by === user._id && h.created_at >= todayStart;
      const updatedToday =
        h.last_updated_by === user._id &&
        h.last_updated_at !== undefined &&
        h.last_updated_at >= todayStart;
      return createdToday || updatedToday;
    });

    const results = await Promise.all(
      today.map(async (h) => {
        const org = await ctx.db.get(h.organization_id);
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          organizationName: org?.name,
          created_at: h.created_at,
          last_updated_at: h.last_updated_at,
        };
      }),
    );

    return results;
  },
});

export const get = query({
  args: { id: v.id("elevators") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    const elevator = await ctx.db.get(id);
    if (!elevator) throw new Error("Hissen hittades inte");
    return elevator;
  },
});

export const checkElevatorNumber = query({
  args: { elevator_number: v.string(), excludeId: v.optional(v.id("elevators")) },
  handler: async (ctx, { elevator_number, excludeId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    if (!elevator_number) return { exists: false };
    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) => q.eq("elevator_number", elevator_number))
      .unique();
    if (!existing) return { exists: false };
    if (excludeId && existing._id === excludeId) return { exists: false };
    return { exists: true };
  },
});

export const search = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    if (!search.trim()) return [];

    const searchLower = search.toLowerCase().trim();

    const allElevators = await ctx.db
      .query("elevators")
      .collect();

    const matches = allElevators
      .filter(
        (h) =>
          h.status === "active" &&
          (h.elevator_number.toLowerCase().includes(searchLower) ||
            (h.address && h.address.toLowerCase().includes(searchLower))),
      )
      .slice(0, 20);

    const results = await Promise.all(
      matches.map(async (h) => {
        const org = await ctx.db.get(h.organization_id);
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          organizationName: org?.name,
        };
      }),
    );

    return results;
  },
});

export const update = mutation({
  args: {
    id: v.id("elevators"),

    // Identification
    elevator_number: v.optional(v.string()),
    address: v.optional(v.string()),
    elevator_designation: v.optional(v.string()),
    district: v.optional(v.string()),

    // Technical specification
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    speed: v.optional(v.string()),
    lift_height: v.optional(v.string()),
    load_capacity: v.optional(v.string()),
    floor_count: v.optional(v.number()),
    door_count: v.optional(v.number()),

    // Doors and cab
    door_type: v.optional(v.string()),
    passthrough: v.optional(v.boolean()),
    collective: v.optional(v.string()),
    cab_size: v.optional(v.string()),
    daylight_opening: v.optional(v.string()),
    grab_rail: v.optional(v.string()),
    door_machine: v.optional(v.string()),

    // Machinery
    drive_system: v.optional(v.string()),
    suspension: v.optional(v.string()),
    machine_placement: v.optional(v.string()),
    machine_type: v.optional(v.string()),
    control_system_type: v.optional(v.string()),

    // Inspection and maintenance
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    shaft_lighting: v.optional(v.string()),

    // Modernization
    modernization_year: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    modernization_measures: v.optional(v.string()),

    // Emergency phone
    has_emergency_phone: v.optional(v.boolean()),
    emergency_phone_model: v.optional(v.string()),
    emergency_phone_type: v.optional(v.string()),
    needs_upgrade: v.optional(v.boolean()),
    emergency_phone_price: v.optional(v.number()),

    // Comments
    comments: v.optional(v.string()),

    // Organization
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const { id, ...fields } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    if (fields.elevator_number && fields.elevator_number !== existing.elevator_number) {
      const duplicate = await ctx.db
        .query("elevators")
        .withIndex("by_elevator_number", (q) =>
          q.eq("elevator_number", fields.elevator_number!),
        )
        .unique();
      if (duplicate) {
        throw new Error(
          `Hissnummer ${fields.elevator_number} finns redan i registret`,
        );
      }
    }

    await autoAddSuggestedValues(ctx, fields);

    await ctx.db.patch(id, {
      ...fields,
      last_updated_by: admin._id,
      last_updated_at: Date.now(),
    });

    return id;
  },
});

export const create = mutation({
  args: {
    // Identification
    elevator_number: v.string(),
    address: v.optional(v.string()),
    elevator_designation: v.optional(v.string()),
    district: v.optional(v.string()),

    // Technical specification
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    speed: v.optional(v.string()),
    lift_height: v.optional(v.string()),
    load_capacity: v.optional(v.string()),
    floor_count: v.optional(v.number()),
    door_count: v.optional(v.number()),

    // Doors and cab
    door_type: v.optional(v.string()),
    passthrough: v.optional(v.boolean()),
    collective: v.optional(v.string()),
    cab_size: v.optional(v.string()),
    daylight_opening: v.optional(v.string()),
    grab_rail: v.optional(v.string()),
    door_machine: v.optional(v.string()),

    // Machinery
    drive_system: v.optional(v.string()),
    suspension: v.optional(v.string()),
    machine_placement: v.optional(v.string()),
    machine_type: v.optional(v.string()),
    control_system_type: v.optional(v.string()),

    // Inspection and maintenance
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    shaft_lighting: v.optional(v.string()),

    // Modernization
    modernization_year: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    modernization_measures: v.optional(v.string()),

    // Emergency phone
    has_emergency_phone: v.optional(v.boolean()),
    emergency_phone_model: v.optional(v.string()),
    emergency_phone_type: v.optional(v.string()),
    needs_upgrade: v.optional(v.boolean()),
    emergency_phone_price: v.optional(v.number()),

    // Comments
    comments: v.optional(v.string()),

    // Organization
    organization_id: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) => q.eq("elevator_number", args.elevator_number))
      .unique();

    if (existing) {
      throw new Error(
        `Hissnummer ${args.elevator_number} finns redan i registret`,
      );
    }

    await autoAddSuggestedValues(ctx, args);

    return await ctx.db.insert("elevators", {
      ...args,
      status: "active" as const,
      created_by: admin._id,
      created_at: Date.now(),
    });
  },
});

export const archive = mutation({
  args: {
    id: v.id("elevators"),
    status: v.union(v.literal("demolished"), v.literal("archived")),
  },
  handler: async (ctx, { id, status }) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    await ctx.db.patch(id, {
      status,
      last_updated_by: admin._id,
      last_updated_at: Date.now(),
    });

    return id;
  },
});
