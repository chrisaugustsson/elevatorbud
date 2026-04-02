import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireTenantAccess } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orgs = await ctx.db.query("organizations").collect();
    const orgsWithCount = await Promise.all(
      orgs.map(async (org) => {
        const elevators = await ctx.db
          .query("elevators")
          .withIndex("by_organization_id", (q) =>
            q.eq("organization_id", org._id),
          )
          .collect();
        return { ...org, elevatorCount: elevators.length };
      }),
    );
    return orgsWithCount;
  },
});

export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, { id }) => {
    await requireTenantAccess(ctx, id);
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    organization_number: v.optional(v.string()),
    contact_person: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("organizations", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    organization_number: v.optional(v.string()),
    contact_person: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Organisationen hittades inte");
    }
    await ctx.db.patch(id, fields);
    return id;
  },
});
