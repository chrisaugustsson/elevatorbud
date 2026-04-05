import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, getOrgScope } from "../auth";
import { byInspectionMonth } from "../aggregates";
import { queryElevators, enrichWithOrgName } from "./helpers";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

export const inspectionCalendar = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, organization_id);

    if (orgId) {
      const counts = await byInspectionMonth.countBatch(
        ctx,
        MONTHS.map((m) => ({
          namespace: orgId,
          bounds: { prefix: ["active", m] as [string, string] },
        })),
      );
      return MONTHS.map((month, i) => ({ month, count: counts[i] }));
    }

    // Admin without org scope: fall back to .collect()
    const allElevators = await ctx.db.query("elevators").collect();
    const active = allElevators.filter((h) => h.status === "active");

    const byMonth: Record<string, number> = {};
    for (const m of MONTHS) {
      byMonth[m] = 0;
    }
    for (const h of active) {
      if (!h.inspection_month) continue;
      if (h.inspection_month in byMonth) {
        byMonth[h.inspection_month] += 1;
      }
    }
    return MONTHS.map((month) => ({ month, count: byMonth[month] }));
  },
});

export const companies = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
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

    const companiesList = Object.entries(byCompany)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        byDistrict: districts.map((d) => ({
          district: d,
          count: matrix[name]?.[d] || 0,
        })),
      }));

    return { companies: companiesList, districts };
  },
});

export const emergencyPhoneStatus = query({
  args: { organization_id: v.optional(v.id("organizations")) },
  handler: async (ctx, { organization_id }) => {
    const elevators = await queryElevators(ctx, organization_id);
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
    const elevators = await queryElevators(ctx, organization_id);

    const active = elevators.filter(
      (h) => h.status === "active" && h.inspection_month === month,
    );

    const enriched = await enrichWithOrgName(ctx, active);
    const results = enriched.map((h) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      district: h.district,
      inspection_authority: h.inspection_authority,
      organization_id: h.organization_id,
      organizationName: h.organizationName,
    }));

    return results.sort((a, b) =>
      a.elevator_number.localeCompare(b.elevator_number, "sv"),
    );
  },
});

export const todaysElevators = query({
  args: { todayStart: v.number() },
  handler: async (ctx, { todayStart }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, undefined);
    const todayEnd = todayStart + 86_400_000; // 24 hours in ms

    const allElevators = orgId
      ? await ctx.db
          .query("elevators")
          .withIndex("by_organization_id", (q) => q.eq("organization_id", orgId))
          .collect()
      : await ctx.db.query("elevators").collect();

    const today = allElevators.filter((h) => {
      const createdToday =
        h.created_by === user._id && h.created_at >= todayStart && h.created_at < todayEnd;
      const updatedToday =
        h.last_updated_by === user._id &&
        h.last_updated_at !== undefined &&
        h.last_updated_at >= todayStart &&
        h.last_updated_at < todayEnd;
      return createdToday || updatedToday;
    });

    const enriched = await enrichWithOrgName(ctx, today);
    return enriched.map((h) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      organizationName: h.organizationName,
      created_at: h.created_at,
      last_updated_at: h.last_updated_at,
    }));
  },
});
