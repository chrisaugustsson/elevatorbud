import { query } from "../_generated/server";
import { mutation } from "../aggregates";
import { v } from "convex/values";
import { requireAdmin, requireAuth } from "../auth";
import {
  autoAddSuggestedValues,
  queryElevators,
  enrichWithOrgName,
} from "./helpers";

export const get = query({
  args: { id: v.id("elevators") },
  handler: async (ctx, { id }) => {
    const user = await requireAuth(ctx);
    const elevator = await ctx.db.get(id);
    if (!elevator) throw new Error("Hissen hittades inte");
    if (
      user.role !== "admin" &&
      user.organization_id !== elevator.organization_id
    ) {
      throw new Error("Ingen åtkomst till denna hiss");
    }
    return elevator;
  },
});

export const getDetails = query({
  args: { elevator_id: v.id("elevators") },
  handler: async (ctx, { elevator_id }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("elevator_details")
      .withIndex("by_elevator_id", (q) => q.eq("elevator_id", elevator_id))
      .unique();
  },
});

export const getLatestBudget = query({
  args: { elevator_id: v.id("elevators") },
  handler: async (ctx, { elevator_id }) => {
    await requireAuth(ctx);
    return await ctx.db
      .query("elevator_budgets")
      .withIndex("by_elevator_id", (q) => q.eq("elevator_id", elevator_id))
      .order("desc")
      .first();
  },
});

export const checkElevatorNumber = query({
  args: {
    elevator_number: v.string(),
    excludeId: v.optional(v.id("elevators")),
  },
  handler: async (ctx, { elevator_number, excludeId }) => {
    await requireAuth(ctx);
    if (!elevator_number) return { exists: false };
    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) =>
        q.eq("elevator_number", elevator_number),
      )
      .unique();
    if (!existing) return { exists: false };
    if (excludeId && existing._id === excludeId) return { exists: false };
    return { exists: true };
  },
});

export const search = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    if (!search.trim()) return [];

    const allElevators = await queryElevators(ctx);
    const searchLower = search.toLowerCase().trim();

    const matches = allElevators
      .filter(
        (h) =>
          h.status === "active" &&
          (h.elevator_number.toLowerCase().includes(searchLower) ||
            (h.address && h.address.toLowerCase().includes(searchLower))),
      )
      .slice(0, 20);

    const enriched = await enrichWithOrgName(ctx, matches);
    return enriched.map((h) => ({
      _id: h._id,
      elevator_number: h.elevator_number,
      address: h.address,
      organizationName: h.organizationName,
    }));
  },
});

// --- Validators for each table's fields ---

const detailFields = {
  speed: v.optional(v.string()),
  lift_height: v.optional(v.string()),
  load_capacity: v.optional(v.string()),
  floor_count: v.optional(v.number()),
  door_count: v.optional(v.number()),
  door_type: v.optional(v.string()),
  passthrough: v.optional(v.boolean()),
  dispatch_mode: v.optional(v.string()),
  cab_size: v.optional(v.string()),
  door_opening: v.optional(v.string()),
  door_carrier: v.optional(v.string()),
  door_machine: v.optional(v.string()),
  drive_system: v.optional(v.string()),
  suspension: v.optional(v.string()),
  machine_placement: v.optional(v.string()),
  machine_type: v.optional(v.string()),
  control_system_type: v.optional(v.string()),
  shaft_lighting: v.optional(v.string()),
  emergency_phone_model: v.optional(v.string()),
  emergency_phone_type: v.optional(v.string()),
  emergency_phone_price: v.optional(v.number()),
  comments: v.optional(v.string()),
};

const budgetFields = {
  revision_year: v.number(),
  recommended_modernization_year: v.optional(v.string()),
  budget_amount: v.optional(v.number()),
  measures: v.optional(v.string()),
  warranty: v.optional(v.boolean()),
};

const DETAIL_KEYS = new Set(Object.keys(detailFields));
const BUDGET_KEYS = new Set(Object.keys(budgetFields));

function splitFields(fields: Record<string, unknown>) {
  const core: Record<string, unknown> = {};
  const details: Record<string, unknown> = {};
  const budget: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (DETAIL_KEYS.has(key)) {
      details[key] = value;
    } else if (BUDGET_KEYS.has(key)) {
      budget[key] = value;
    } else {
      core[key] = value;
    }
  }

  return { core, details, budget };
}

export const create = mutation({
  args: {
    // Core elevator fields
    elevator_number: v.string(),
    address: v.optional(v.string()),
    elevator_classification: v.optional(v.string()),
    district: v.optional(v.string()),
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    modernization_year: v.optional(v.string()),
    has_emergency_phone: v.optional(v.boolean()),
    needs_upgrade: v.optional(v.boolean()),
    organization_id: v.id("organizations"),

    // Detail fields
    ...detailFields,

    // Budget fields
    ...budgetFields,
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) =>
        q.eq("elevator_number", args.elevator_number),
      )
      .unique();

    if (existing) {
      throw new Error(
        `Hissnummer ${args.elevator_number} finns redan i registret`,
      );
    }

    await autoAddSuggestedValues(ctx, args);

    const { core, details, budget } = splitFields(args);

    // Insert core elevator
    const elevatorId = await ctx.db.insert("elevators", {
      ...core,
      elevator_number: args.elevator_number,
      organization_id: args.organization_id,
      status: "active" as const,
      created_by: admin._id,
      created_at: Date.now(),
    });

    // Insert technical details
    await ctx.db.insert("elevator_details", {
      elevator_id: elevatorId,
      ...details,
    });

    // Insert budget entry if any budget fields are provided
    if (budget.recommended_modernization_year || budget.budget_amount) {
      await ctx.db.insert("elevator_budgets", {
        elevator_id: elevatorId,
        revision_year: budget.revision_year as number,
        recommended_modernization_year:
          budget.recommended_modernization_year as string | undefined,
        budget_amount: budget.budget_amount as number | undefined,
        measures: budget.measures as string | undefined,
        warranty: budget.warranty as boolean | undefined,
        created_at: Date.now(),
        created_by: admin._id,
      });
    }

    return elevatorId;
  },
});

export const update = mutation({
  args: {
    id: v.id("elevators"),

    // Core elevator fields
    elevator_number: v.optional(v.string()),
    address: v.optional(v.string()),
    elevator_classification: v.optional(v.string()),
    district: v.optional(v.string()),
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    modernization_year: v.optional(v.string()),
    has_emergency_phone: v.optional(v.boolean()),
    needs_upgrade: v.optional(v.boolean()),
    organization_id: v.optional(v.id("organizations")),

    // Detail fields
    ...detailFields,

    // Budget fields (optional for update — only creates new entry if provided)
    revision_year: v.optional(v.number()),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    measures: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const { id, ...fields } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    if (
      fields.elevator_number &&
      fields.elevator_number !== existing.elevator_number
    ) {
      const duplicate = await ctx.db
        .query("elevators")
        .withIndex("by_elevator_number", (q) =>
          q.eq("elevator_number", fields.elevator_number!),
        )
        .unique();
      if (duplicate) {
        throw new Error(
          `Hissnummer ${fields.elevator_number} finns redan i registret`,
        );
      }
    }

    await autoAddSuggestedValues(ctx, fields);

    const { core, details, budget } = splitFields(fields);

    // Update core elevator
    if (Object.keys(core).length > 0) {
      await ctx.db.patch(id, {
        ...core,
        last_updated_by: admin._id,
        last_updated_at: Date.now(),
      });
    }

    // Update technical details
    if (Object.keys(details).length > 0) {
      const existingDetails = await ctx.db
        .query("elevator_details")
        .withIndex("by_elevator_id", (q) => q.eq("elevator_id", id))
        .unique();

      if (existingDetails) {
        await ctx.db.patch(existingDetails._id, details);
      } else {
        await ctx.db.insert("elevator_details", {
          elevator_id: id,
          ...details,
        });
      }
    }

    // Create new budget entry if budget fields changed
    if (
      budget.recommended_modernization_year !== undefined ||
      budget.budget_amount !== undefined ||
      budget.measures !== undefined
    ) {
      await ctx.db.insert("elevator_budgets", {
        elevator_id: id,
        revision_year:
          (budget.revision_year as number) ?? new Date().getFullYear(),
        recommended_modernization_year:
          budget.recommended_modernization_year as string | undefined,
        budget_amount: budget.budget_amount as number | undefined,
        measures: budget.measures as string | undefined,
        warranty: budget.warranty as boolean | undefined,
        created_at: Date.now(),
        created_by: admin._id,
      });
    }

    return id;
  },
});

export const archive = mutation({
  args: {
    id: v.id("elevators"),
    status: v.union(v.literal("demolished"), v.literal("archived")),
  },
  handler: async (ctx, { id, status }) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    await ctx.db.patch(id, {
      status,
      last_updated_by: admin._id,
      last_updated_at: Date.now(),
    });

    return id;
  },
});
