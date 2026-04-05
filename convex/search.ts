import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAuth, getOrgScope } from "./auth";
import { queryElevators, enrichWithOrgName } from "./elevators/helpers";

export const global = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const user = await requireAuth(ctx);
    const orgId = getOrgScope(user, undefined);

    const trimmed = search.trim();
    if (!trimmed) {
      return { elevators: [], organizations: [] };
    }

    const searchLower = trimmed.toLowerCase();

    // Search organizations — customers only see their own org
    let allOrgs: Doc<"organizations">[];
    if (orgId) {
      const org = await ctx.db.get(orgId);
      allOrgs = org ? [org] : [];
    } else {
      allOrgs = await ctx.db.query("organizations").collect();
    }
    const matchingOrgs = allOrgs.filter((org) =>
      org.name.toLowerCase().includes(searchLower),
    );

    // Build set of matching org IDs for elevator org-name matching
    const matchingOrgIds = new Set(matchingOrgs.map((org) => org._id));

    // Search elevators — customers only see their org's elevators
    const allElevators = await queryElevators(ctx, orgId);
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

    const enrichedElevators = await enrichWithOrgName(ctx, matchingElevators);

    return {
      elevators: enrichedElevators.map((e) => ({
        _id: e._id,
        elevator_number: e.elevator_number,
        address: e.address,
        district: e.district,
        organizationName: e.organizationName,
      })),
      organizations: matchingOrgs.slice(0, 10).map((org) => ({
        _id: org._id,
        name: org.name,
      })),
    };
  },
});
