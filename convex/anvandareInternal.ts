import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const checkAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await requireAdmin(ctx);
  },
});

export const getInternal = internalQuery({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const insertAnvandare = internalMutation({
  args: {
    clerk_user_id: v.string(),
    email: v.string(),
    namn: v.string(),
    roll: v.union(v.literal("admin"), v.literal("kund")),
    organisation_id: v.optional(v.id("organisationer")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("anvandare", {
      clerk_user_id: args.clerk_user_id,
      email: args.email,
      namn: args.namn,
      roll: args.roll,
      organisation_id: args.organisation_id,
      aktiv: true,
      skapad_datum: Date.now(),
    });
  },
});

export const updateAnvandare = internalMutation({
  args: {
    id: v.id("anvandare"),
    namn: v.optional(v.string()),
    email: v.optional(v.string()),
    roll: v.optional(v.union(v.literal("admin"), v.literal("kund"))),
    organisation_id: v.optional(v.id("organisationer")),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }
    const updates: Record<string, unknown> = {};
    if (fields.namn !== undefined) updates.namn = fields.namn;
    if (fields.email !== undefined) updates.email = fields.email;
    if (fields.roll !== undefined) updates.roll = fields.roll;
    if (fields.organisation_id !== undefined)
      updates.organisation_id = fields.organisation_id;
    await ctx.db.patch(id, updates);
  },
});

export const inaktiveraAnvandare = internalMutation({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }
    await ctx.db.patch(id, { aktiv: false });
    return existing.clerk_user_id;
  },
});

export const removeAnvandare = internalMutation({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }

    // Clear references in hissar table
    const hissarBySkapare = await ctx.db
      .query("hissar")
      .filter((q) => q.eq(q.field("skapad_av"), id))
      .collect();
    for (const hiss of hissarBySkapare) {
      await ctx.db.patch(hiss._id, { skapad_av: undefined });
    }

    const hissarByUppdaterare = await ctx.db
      .query("hissar")
      .filter((q) => q.eq(q.field("senast_uppdaterad_av"), id))
      .collect();
    for (const hiss of hissarByUppdaterare) {
      await ctx.db.patch(hiss._id, { senast_uppdaterad_av: undefined });
    }

    await ctx.db.delete(id);
    return existing.clerk_user_id;
  },
});
