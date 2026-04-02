import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireTenantAccess } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("organisationer").collect();
  },
});

export const get = query({
  args: { id: v.id("organisationer") },
  handler: async (ctx, { id }) => {
    await requireTenantAccess(ctx, id);
    return await ctx.db.get(id);
  },
});
