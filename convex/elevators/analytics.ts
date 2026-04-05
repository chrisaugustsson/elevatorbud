import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, getOrgScope } from "../auth";
import {
  elevatorAggregate,
  byDistrict,
  byElevatorType,
  byManufacturer,
  byMaintenanceCompany,
  byModernizationYear,
  byBuildYear,
} from "../aggregates";

const NOT_MODERNIZED = "Ej ombyggd";

/**
 * Helper: get the list of known values for a suggested_values category.
 */
async function getSuggestedValues(
  ctx: { db: { query: (table: "suggested_values") => any } },
  category: string,
): Promise<string[]> {
  const values = await ctx.db
    .query("suggested_values")
    .withIndex("by_category", (q: any) => q.eq("category", category))
    .collect();
  return values
    .filter((v: { active: boolean }) => v.active)
    .map((v: { value: string }) => v.value);
}

export const stats = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);

    const currentYear = new Date().getFullYear();

    if (orgId) {
      const activePrefix = {
        namespace: orgId,
        bounds: { prefix: ["active"] as [string] },
      };

      // Total active count
      const totalCount = await elevatorAggregate.count(ctx, activePrefix);

      // Average age: use build_year aggregate
      // Exclude sentinel -1 (undefined build_year) by using bounds > 0
      const buildYearOpts = {
        namespace: orgId,
        bounds: {
          lower: { key: ["active", 0] as [string, number], inclusive: false },
        },
      };
      const countWithBuildYear = await byBuildYear.count(ctx, buildYearOpts);
      const sumBuildYear = await byBuildYear.sum(ctx, buildYearOpts);
      const averageAge =
        countWithBuildYear > 0
          ? (currentYear * countWithBuildYear - sumBuildYear) /
            countWithBuildYear
          : 0;

      // Modernization within 3 years
      const modYearCounts = await byModernizationYear.countBatch(
        ctx,
        Array.from({ length: 4 }, (_, i) => ({
          namespace: orgId,
          bounds: {
            prefix: ["active", String(currentYear + i)] as [string, string],
          },
        })),
      );
      const modernizationWithin3Years = modYearCounts.reduce(
        (sum, c) => sum + c,
        0,
      );

      // Total budget for current year
      const totalBudgetCurrentYear = await byModernizationYear.sum(ctx, {
        namespace: orgId,
        bounds: {
          prefix: ["active", String(currentYear)] as [string, string],
        },
      });

      // Without modernization: count "" (undefined) + "Ej ombyggd"
      const [countNoMod, countNotModernized] =
        await byModernizationYear.countBatch(ctx, [
          {
            namespace: orgId,
            bounds: { prefix: ["active", ""] as [string, string] },
          },
          {
            namespace: orgId,
            bounds: {
              prefix: ["active", NOT_MODERNIZED] as [string, string],
            },
          },
        ]);

      // Note: "" prefix matches all modernization years starting with "",
      // which is only the empty string itself. This correctly counts undefined.
      const withoutModernization = countNoMod + countNotModernized;

      // lastInventory still needs a targeted query (max created_at)
      const recentElevator = await ctx.db
        .query("elevators")
        .withIndex("by_organization_id", (q) =>
          q.eq("organization_id", orgId),
        )
        .order("desc")
        .first();
      const lastInventory = recentElevator?.created_at ?? null;

      return {
        totalCount,
        averageAge: Math.round(averageAge * 10) / 10,
        modernizationWithin3Years,
        totalBudgetCurrentYear,
        withoutModernization,
        lastInventory,
      };
    }

    // Admin without org scope: fall back to .collect()
    const allElevators = await ctx.db.query("elevators").collect();
    const active = allElevators.filter((h) => h.status === "active");

    const withBuildYear = active.filter((h) => h.build_year !== undefined);
    const averageAge =
      withBuildYear.length > 0
        ? withBuildYear.reduce(
            (sum, h) => sum + (currentYear - h.build_year!),
            0,
          ) / withBuildYear.length
        : 0;

    const modernizationWithin3Years = active.filter((h) => {
      const year = parseModYear(h.recommended_modernization_year);
      return year !== null && year >= currentYear && year <= currentYear + 3;
    }).length;

    const totalBudgetCurrentYear = active
      .filter((h) => {
        if (!h.budget_amount) return false;
        const year = parseModYear(h.recommended_modernization_year);
        return year === currentYear;
      })
      .reduce((sum, h) => sum + (h.budget_amount ?? 0), 0);

    const withoutModernization = active.filter((h) => {
      return !h.modernization_year || h.modernization_year === NOT_MODERNIZED;
    }).length;

    const lastInventory =
      active.length > 0 ? Math.max(...active.map((h) => h.created_at)) : null;

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
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);
    const currentYear = new Date().getFullYear();

    if (orgId) {
      // Load known values from suggested_values for each dimension
      const [districts, types, manufacturers, maintCompanies] =
        await Promise.all([
          getSuggestedValues(ctx, "district"),
          getSuggestedValues(ctx, "elevator_type"),
          getSuggestedValues(ctx, "manufacturer"),
          getSuggestedValues(ctx, "maintenance_company"),
        ]);

      // Add "Okänt" to each list to catch elevators with undefined values
      const districtKeys = [...districts, "Okänt"];
      const typeKeys = [...types, "Okänt"];
      const manufacturerKeys = [...manufacturers, "Okänt"];
      const maintKeys = [...maintCompanies, "Okänt"];

      // Batch count all dimensions in parallel
      const [districtCounts, typeCounts, manufacturerCounts, maintCounts] =
        await Promise.all([
          byDistrict.countBatch(
            ctx,
            districtKeys.map((d) => ({
              namespace: orgId,
              bounds: { prefix: ["active", d] as [string, string] },
            })),
          ),
          byElevatorType.countBatch(
            ctx,
            typeKeys.map((t) => ({
              namespace: orgId,
              bounds: { prefix: ["active", t] as [string, string] },
            })),
          ),
          byManufacturer.countBatch(
            ctx,
            manufacturerKeys.map((m) => ({
              namespace: orgId,
              bounds: { prefix: ["active", m] as [string, string] },
            })),
          ),
          byMaintenanceCompany.countBatch(
            ctx,
            maintKeys.map((mc) => ({
              namespace: orgId,
              bounds: { prefix: ["active", mc] as [string, string] },
            })),
          ),
        ]);

      // Build chart data arrays (filter out zero counts)
      const byDistrictData = districtKeys
        .map((name, i) => ({ name, count: districtCounts[i] }))
        .filter((d) => d.count > 0);

      const byElevatorTypeData = typeKeys
        .map((name, i) => ({ name, count: typeCounts[i] }))
        .filter((d) => d.count > 0);

      const topManufacturers = manufacturerKeys
        .map((name, i) => ({ name, count: manufacturerCounts[i] }))
        .filter((d) => d.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const byMaintenanceCompanyData = maintKeys
        .map((name, i) => ({ name, count: maintCounts[i] }))
        .filter((d) => d.count > 0);

      // Age distribution: count by decade using build_year bounds
      const ageBuckets = [
        { label: "0-9 år", min: currentYear - 9, max: currentYear },
        { label: "10-19 år", min: currentYear - 19, max: currentYear - 10 },
        { label: "20-29 år", min: currentYear - 29, max: currentYear - 20 },
        { label: "30-39 år", min: currentYear - 39, max: currentYear - 30 },
        { label: "40-49 år", min: currentYear - 49, max: currentYear - 40 },
        { label: "50+ år", min: 0, max: currentYear - 50 },
      ];

      const ageCounts = await byBuildYear.countBatch(ctx, [
        // Count for each decade bucket
        ...ageBuckets.map((b) => ({
          namespace: orgId,
          bounds: {
            lower: {
              key: ["active", b.min] as [string, number],
              inclusive: true,
            },
            upper: {
              key: ["active", b.max] as [string, number],
              inclusive: true,
            },
          },
        })),
        // Count unknown build year (sentinel -1)
        {
          namespace: orgId,
          bounds: {
            prefix: ["active", -1] as [string, number],
          },
        },
      ]);

      const ageDistribution = [
        ...ageBuckets
          .map((b, i) => ({ name: b.label, count: ageCounts[i] }))
          .filter((d) => d.count > 0),
        ...(ageCounts[ageBuckets.length] > 0
          ? [{ name: "Okänt", count: ageCounts[ageBuckets.length] }]
          : []),
      ];

      // Modernization timeline: years from suggested values or known range
      const modYears: string[] = [];
      for (let y = currentYear; y <= 2045; y++) {
        modYears.push(String(y));
      }
      const modCounts = await byModernizationYear.countBatch(
        ctx,
        modYears.map((y) => ({
          namespace: orgId,
          bounds: { prefix: ["active", y] as [string, string] },
        })),
      );

      const modernizationTimeline = modYears
        .map((name, i) => ({ name, count: modCounts[i] }))
        .filter((d) => d.count > 0);

      return {
        byDistrict: byDistrictData,
        ageDistribution,
        byElevatorType: byElevatorTypeData,
        topManufacturers,
        modernizationTimeline,
        byMaintenanceCompany: byMaintenanceCompanyData,
      };
    }

    // Admin without org scope: fall back to .collect()
    const allElevators = await ctx.db.query("elevators").collect();
    const active = allElevators.filter((h) => h.status === "active");

    const byDistrictMap: Record<string, number> = {};
    const ageDistributionMap: Record<string, number> = {};
    const byElevatorTypeMap: Record<string, number> = {};
    const byManufacturerMap: Record<string, number> = {};
    const modernizationTimelineMap: Record<string, number> = {};
    const byMaintenanceCompanyMap: Record<string, number> = {};

    for (const h of active) {
      const dist = h.district || "Okänt";
      byDistrictMap[dist] = (byDistrictMap[dist] || 0) + 1;

      if (h.build_year === undefined) {
        ageDistributionMap["Okänt"] = (ageDistributionMap["Okänt"] || 0) + 1;
      } else {
        const age = currentYear - h.build_year;
        let bucket: string;
        if (age < 10) bucket = "0-9 år";
        else if (age < 20) bucket = "10-19 år";
        else if (age < 30) bucket = "20-29 år";
        else if (age < 40) bucket = "30-39 år";
        else if (age < 50) bucket = "40-49 år";
        else bucket = "50+ år";
        ageDistributionMap[bucket] = (ageDistributionMap[bucket] || 0) + 1;
      }

      const type = h.elevator_type || "Okänt";
      byElevatorTypeMap[type] = (byElevatorTypeMap[type] || 0) + 1;

      const mfr = h.manufacturer || "Okänt";
      byManufacturerMap[mfr] = (byManufacturerMap[mfr] || 0) + 1;

      const year = parseModYear(h.recommended_modernization_year);
      if (year !== null) {
        const key = year >= 2045 ? "2045+" : String(year);
        modernizationTimelineMap[key] =
          (modernizationTimelineMap[key] || 0) + 1;
      }

      const mc = h.maintenance_company || "Okänt";
      byMaintenanceCompanyMap[mc] = (byMaintenanceCompanyMap[mc] || 0) + 1;
    }

    return {
      byDistrict: Object.entries(byDistrictMap).map(([name, count]) => ({
        name,
        count,
      })),
      ageDistribution: Object.entries(ageDistributionMap).map(
        ([name, count]) => ({ name, count }),
      ),
      byElevatorType: Object.entries(byElevatorTypeMap).map(
        ([name, count]) => ({ name, count }),
      ),
      topManufacturers: Object.entries(byManufacturerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      modernizationTimeline: Object.entries(modernizationTimelineMap)
        .sort((a, b) => {
          if (a[0] === "2045+") return 1;
          if (b[0] === "2045+") return -1;
          return Number(a[0]) - Number(b[0]);
        })
        .map(([name, count]) => ({ name, count })),
      byMaintenanceCompany: Object.entries(byMaintenanceCompanyMap).map(
        ([name, count]) => ({ name, count }),
      ),
    };
  },
});

function parseModYear(yearStr?: string): number | null {
  if (!yearStr) return null;
  const year = parseInt(yearStr, 10);
  return isNaN(year) ? null : year;
}
