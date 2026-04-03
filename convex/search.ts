import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./auth";

export const global = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    const trimmed = search.trim();
    if (!trimmed) {
      return { elevators: [], organizations: [] };
    }

    const searchLower = trimmed.toLowerCase();

    // Search organizations by name
    const allOrgs = await ctx.db.query("organizations").collect();
    const matchingOrgs = allOrgs.filter((org) =>
      org.name.toLowerCase().includes(searchLower),
    );

    // Build set of matching org IDs for elevator org-name matching
    const matchingOrgIds = new Set(matchingOrgs.map((org) => org._id));

    // Build org name lookup for enriching elevator results
    const orgNameMap = new Map(
      allOrgs.map((org) => [org._id as string, org.name]),
    );

    // Search elevators by elevator_number, address, district, or organization name
    const allElevators = await ctx.db.query("elevators").collect();
    const matchingElevators = allElevators
      .filter((e) => {
        if (e.status !== "active") return false;
        return (
          e.elevator_number.toLowerCase().includes(searchLower) ||
          (e.address && e.address.toLowerCase().includes(searchLower)) ||
          (e.district && e.district.toLowerCase().includes(searchLower)) ||
          matchingOrgIds.has(e.organization_id)
        );
      })
      .slice(0, 10);

    return {
      elevators: matchingElevators.map((e) => ({
        _id: e._id,
        elevator_number: e.elevator_number,
        address: e.address,
        district: e.district,
        organizationName: orgNameMap.get(e.organization_id as string) ?? null,
      })),
      organizations: matchingOrgs.slice(0, 10).map((org) => ({
        _id: org._id,
        name: org.name,
      })),
    };
  },
});
