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
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const insertUser = internalMutation({
  args: {
    clerk_user_id: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("customer")),
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      clerk_user_id: args.clerk_user_id,
      email: args.email,
      name: args.name,
      role: args.role,
      organization_id: args.organization_id,
      active: true,
      created_at: Date.now(),
    });
  },
});

export const updateUser = internalMutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }
    const updates: Record<string, unknown> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.email !== undefined) updates.email = fields.email;
    if (fields.role !== undefined) updates.role = fields.role;
    if (fields.organization_id !== undefined)
      updates.organization_id = fields.organization_id;
    await ctx.db.patch(id, updates);
  },
});

export const deactivateUser = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }
    await ctx.db.patch(id, { active: false });
    return existing.clerk_user_id;
  },
});

export const activateUser = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }
    await ctx.db.patch(id, { active: true });
    return existing.clerk_user_id;
  },
});

export const removeUser = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Användaren hittades inte");
    }

    // Clear references in elevators table
    const elevatorsByCreator = await ctx.db
      .query("elevators")
      .filter((q) => q.eq(q.field("created_by"), id))
      .collect();
    for (const elevator of elevatorsByCreator) {
      await ctx.db.patch(elevator._id, { created_by: undefined });
    }

    const elevatorsByUpdater = await ctx.db
      .query("elevators")
      .filter((q) => q.eq(q.field("last_updated_by"), id))
      .collect();
    for (const elevator of elevatorsByUpdater) {
      await ctx.db.patch(elevator._id, { last_updated_by: undefined });
    }

    await ctx.db.delete(id);
    return existing.clerk_user_id;
  },
});
