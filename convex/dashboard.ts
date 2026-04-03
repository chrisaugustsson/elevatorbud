import { query } from "./_generated/server";
import { requireAdmin } from "./auth";
import { enrichWithOrgName, parseModernizationYear } from "./elevators/helpers";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

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

    const enriched = await enrichWithOrgName(ctx, withUpdates);
    const recentActivity = enriched.map((h) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      organizationName: h.organizationName,
      organization_id: h.organization_id,
      last_updated_at: h.last_updated_at!,
    }));

    // Modernization within 3 years
    const currentYear = new Date().getFullYear();
    const modernizationSoon = active.filter((h) => {
      const year = parseModernizationYear(h.recommended_modernization_year);
      return year !== null && year >= currentYear && year <= currentYear + 3;
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
