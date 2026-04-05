import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./auth";

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    await requireAuth(ctx);

    if (category) {
      return await ctx.db
        .query("suggested_values")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    }

    return await ctx.db.query("suggested_values").collect();
  },
});

export const create = mutation({
  args: {
    category: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { category, value }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("suggested_values", {
      category,
      value,
      active: true,
      created_at: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("suggested_values"),
    value: v.string(),
  },
  handler: async (ctx, { id, value }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Förslagsvärdet hittades inte");
    }

    await ctx.db.patch(id, { value });
    return id;
  },
});

export const merge = mutation({
  args: {
    sourceId: v.id("suggested_values"),
    targetId: v.id("suggested_values"),
  },
  handler: async (ctx, { sourceId, targetId }) => {
    await requireAdmin(ctx);

    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);
    if (!source || !target) {
      throw new Error("Förslagsvärdet hittades inte");
    }
    if (source.category !== target.category) {
      throw new Error("Kan bara slå ihop värden inom samma kategori");
    }

    await ctx.db.delete(sourceId);

    return targetId;
  },
});

export const deactivate = mutation({
  args: {
    id: v.id("suggested_values"),
  },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Förslagsvärdet hittades inte");
    }
    await ctx.db.patch(id, { active: false });
    return id;
  },
});

export const activate = mutation({
  args: {
    id: v.id("suggested_values"),
  },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Förslagsvärdet hittades inte");
    }
    await ctx.db.patch(id, { active: true });
    return id;
  },
});
