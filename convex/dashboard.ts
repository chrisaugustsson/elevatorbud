import { query } from "./_generated/server";
import { getCurrentUser } from "./auth";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const allElevators = await ctx.db.query("elevators").collect();
    const active = allElevators.filter((h) => h.status === "active");

    const allOrgs = await ctx.db.query("organizations").collect();

    // Total counts
    const totalElevators = active.length;
    const totalOrganizations = allOrgs.length;

    // Upcoming inspections: current month and next month
    const now = new Date();
    const currentMonthNames = [
      now.toLocaleDateString("sv-SE", { month: "long" }),
      new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(
        "sv-SE",
        { month: "long" },
      ),
    ].map((m) => m.charAt(0).toUpperCase() + m.slice(1));

    const upcomingInspections = active.filter(
      (h) => h.inspection_month && currentMonthNames.includes(h.inspection_month),
    ).length;

    // Top organizations by elevator count
    const orgElevatorCounts = new Map<string, number>();
    for (const h of active) {
      const orgId = h.organization_id as string;
      orgElevatorCounts.set(orgId, (orgElevatorCounts.get(orgId) ?? 0) + 1);
    }

    const topOrganizations = allOrgs
      .map((org) => ({
        _id: org._id,
        name: org.name,
        elevatorCount: orgElevatorCounts.get(org._id as string) ?? 0,
      }))
      .sort((a, b) => b.elevatorCount - a.elevatorCount)
      .slice(0, 5);

    // Recent activity: last 10 updated elevators
    const withUpdates = active
      .filter((h) => h.last_updated_at)
      .sort((a, b) => (b.last_updated_at ?? 0) - (a.last_updated_at ?? 0))
      .slice(0, 10);

    const orgCache = new Map<string, string>();
    const recentActivity = await Promise.all(
      withUpdates.map(async (h) => {
        const orgKey = h.organization_id as string;
        let orgName = orgCache.get(orgKey);
        if (!orgName) {
          const org = await ctx.db.get(h.organization_id);
          orgName = (org as { name: string } | null)?.name ?? "Okänd";
          orgCache.set(orgKey, orgName);
        }
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          organizationName: orgName,
          organization_id: h.organization_id,
          last_updated_at: h.last_updated_at!,
        };
      }),
    );

    // Modernization within 3 years
    const currentYear = new Date().getFullYear();
    const modernizationSoon = active.filter((h) => {
      if (!h.recommended_modernization_year) return false;
      const year = parseInt(h.recommended_modernization_year, 10);
      if (isNaN(year)) return false;
      return year >= currentYear && year <= currentYear + 3;
    }).length;

    return {
      totalElevators,
      totalOrganizations,
      upcomingInspections,
      modernizationSoon,
      topOrganizations,
      recentActivity,
    };
  },
});
