import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireAdmin } from "./auth";

const CATEGORIES = [
  "elevator_type",
  "manufacturer",
  "district",
  "maintenance_company",
  "inspection_authority",
  "elevator_designation",
  "door_type",
  "collective",
  "drive_system",
  "machine_placement",
  "modernization_measures",
] as const;

type Category = (typeof CATEGORIES)[number];

// Category names map directly to elevators field names
const CATEGORY_TO_FIELD: Record<Category, string> = {
  elevator_type: "elevator_type",
  manufacturer: "manufacturer",
  district: "district",
  maintenance_company: "maintenance_company",
  inspection_authority: "inspection_authority",
  elevator_designation: "elevator_designation",
  door_type: "door_type",
  collective: "collective",
  drive_system: "drive_system",
  machine_placement: "machine_placement",
  modernization_measures: "modernization_measures",
};

async function updateElevatorsField(
  ctx: { db: any },
  category: string,
  oldValue: string,
  newValue: string,
) {
  const fieldName = CATEGORY_TO_FIELD[category as Category];
  if (!fieldName) return;

  const allElevators = await ctx.db.query("elevators").collect();
  for (const elevator of allElevators) {
    if ((elevator as any)[fieldName] === oldValue) {
      await ctx.db.patch(elevator._id, { [fieldName]: newValue });
    }
  }
}

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Ej autentiserad");
    }

    if (category) {
      return await ctx.db
        .query("suggested_values")
        .withIndex("by_category", (q: any) => q.eq("category", category))
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

    const oldValue = existing.value;

    // Update the suggested_values record
    await ctx.db.patch(id, { value });

    // Update all elevators that use the old value
    await updateElevatorsField(ctx, existing.category, oldValue, value);

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

    // Update all elevators from source value to target value
    await updateElevatorsField(ctx, source.category, source.value, target.value);

    // Delete the source value
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
