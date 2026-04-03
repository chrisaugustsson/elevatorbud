import { query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../auth";

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

export const companies = query({
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
