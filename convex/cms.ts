import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./auth";

const sectionValidator = v.object({
  id: v.string(),
  type: v.string(),
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  content: v.optional(v.string()),
  items: v.optional(
    v.array(
      v.object({
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        icon: v.optional(v.string()),
      }),
    ),
  ),
  cta: v.optional(
    v.object({
      text: v.string(),
      href: v.string(),
    }),
  ),
  imageUrl: v.optional(v.string()),
  order: v.number(),
});

export const getPage = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const listPages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pages").collect();
  },
});

export const createPage = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    sections: v.array(sectionValidator),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error(`Sidan med slug '${args.slug}' finns redan`);
    }

    return await ctx.db.insert("pages", {
      slug: args.slug,
      title: args.title,
      sections: args.sections,
      published: args.published ?? false,
      updatedAt: Date.now(),
    });
  },
});

export const updatePage = mutation({
  args: {
    id: v.id("pages"),
    title: v.optional(v.string()),
    sections: v.optional(v.array(sectionValidator)),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...fields } = args;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.sections !== undefined) updates.sections = fields.sections;
    if (fields.published !== undefined) updates.published = fields.published;

    await ctx.db.patch(id, updates);
  },
});
