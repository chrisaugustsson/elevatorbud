import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireTenantAccess } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orgs = await ctx.db.query("organisationer").collect();
    const orgsWithCount = await Promise.all(
      orgs.map(async (org) => {
        const elevators = await ctx.db
          .query("hissar")
          .withIndex("by_organisation_id", (q) =>
            q.eq("organisation_id", org._id),
          )
          .collect();
        return { ...org, antalHissar: elevators.length };
      }),
    );
    return orgsWithCount;
  },
});

export const get = query({
  args: { id: v.id("organisationer") },
  handler: async (ctx, { id }) => {
    await requireTenantAccess(ctx, id);
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    namn: v.string(),
    organisationsnummer: v.optional(v.string()),
    kontaktperson: v.optional(v.string()),
    telefonnummer: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("organisationer", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("organisationer"),
    namn: v.optional(v.string()),
    organisationsnummer: v.optional(v.string()),
    kontaktperson: v.optional(v.string()),
    telefonnummer: v.optional(v.string()),
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
