import { query } from "../_generated/server";
import { v } from "convex/values";
import { queryElevators, parseModernizationYear } from "./helpers";

const NOT_MODERNIZED = "Ej ombyggd";

export const stats = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
    const active = elevators.filter((h) => h.status === "active");

    const currentYear = new Date().getFullYear();

    const withBuildYear = active.filter((h) => h.build_year !== undefined);
    const averageAge =
      withBuildYear.length > 0
        ? withBuildYear.reduce((sum, h) => sum + (currentYear - h.build_year!), 0) /
          withBuildYear.length
        : 0;

    const modernizationWithin3Years = active.filter((h) => {
      const year = parseModernizationYear(h.recommended_modernization_year);
      return year !== null && year >= currentYear && year <= currentYear + 3;
    }).length;

    const totalBudgetCurrentYear = active
      .filter((h) => {
        if (!h.budget_amount) return false;
        const year = parseModernizationYear(h.recommended_modernization_year);
        return year === currentYear;
      })
      .reduce((sum, h) => sum + (h.budget_amount ?? 0), 0);

    const withoutModernization = active.filter((h) => {
      return !h.modernization_year || h.modernization_year === NOT_MODERNIZED;
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
    const elevators = await queryElevators(ctx, organization_id);
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
      const year = parseModernizationYear(h.recommended_modernization_year);
      if (year === null) continue;
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
