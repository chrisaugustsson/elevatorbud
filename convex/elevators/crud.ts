import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, getCurrentUser } from "../auth";
import { autoAddSuggestedValues } from "./helpers";

export const get = query({
  args: { id: v.id("elevators") },
  handler: async (ctx, { id }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    const elevator = await ctx.db.get(id);
    if (!elevator) throw new Error("Hissen hittades inte");
    return elevator;
  },
});

export const checkElevatorNumber = query({
  args: { elevator_number: v.string(), excludeId: v.optional(v.id("elevators")) },
  handler: async (ctx, { elevator_number, excludeId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");
    if (!elevator_number) return { exists: false };
    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) => q.eq("elevator_number", elevator_number))
      .unique();
    if (!existing) return { exists: false };
    if (excludeId && existing._id === excludeId) return { exists: false };
    return { exists: true };
  },
});

export const search = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Ej autentiserad");

    if (!search.trim()) return [];

    const searchLower = search.toLowerCase().trim();

    const allElevators = await ctx.db
      .query("elevators")
      .collect();

    const matches = allElevators
      .filter(
        (h) =>
          h.status === "active" &&
          (h.elevator_number.toLowerCase().includes(searchLower) ||
            (h.address && h.address.toLowerCase().includes(searchLower))),
      )
      .slice(0, 20);

    const results = await Promise.all(
      matches.map(async (h) => {
        const org = await ctx.db.get(h.organization_id);
        return {
          _id: h._id,
          elevator_number: h.elevator_number,
          address: h.address,
          organizationName: org?.name,
        };
      }),
    );

    return results;
  },
});

export const update = mutation({
  args: {
    id: v.id("elevators"),

    // Identification
    elevator_number: v.optional(v.string()),
    address: v.optional(v.string()),
    elevator_designation: v.optional(v.string()),
    district: v.optional(v.string()),

    // Technical specification
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    speed: v.optional(v.string()),
    lift_height: v.optional(v.string()),
    load_capacity: v.optional(v.string()),
    floor_count: v.optional(v.number()),
    door_count: v.optional(v.number()),

    // Doors and cab
    door_type: v.optional(v.string()),
    passthrough: v.optional(v.boolean()),
    collective: v.optional(v.string()),
    cab_size: v.optional(v.string()),
    daylight_opening: v.optional(v.string()),
    grab_rail: v.optional(v.string()),
    door_machine: v.optional(v.string()),

    // Machinery
    drive_system: v.optional(v.string()),
    suspension: v.optional(v.string()),
    machine_placement: v.optional(v.string()),
    machine_type: v.optional(v.string()),
    control_system_type: v.optional(v.string()),

    // Inspection and maintenance
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    shaft_lighting: v.optional(v.string()),

    // Modernization
    modernization_year: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    modernization_measures: v.optional(v.string()),

    // Emergency phone
    has_emergency_phone: v.optional(v.boolean()),
    emergency_phone_model: v.optional(v.string()),
    emergency_phone_type: v.optional(v.string()),
    needs_upgrade: v.optional(v.boolean()),
    emergency_phone_price: v.optional(v.number()),

    // Comments
    comments: v.optional(v.string()),

    // Organization
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const { id, ...fields } = args;

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Hissen hittades inte");

    if (fields.elevator_number && fields.elevator_number !== existing.elevator_number) {
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

    await ctx.db.patch(id, {
      ...fields,
      last_updated_by: admin._id,
      last_updated_at: Date.now(),
    });

    return id;
  },
});

export const create = mutation({
  args: {
    // Identification
    elevator_number: v.string(),
    address: v.optional(v.string()),
    elevator_designation: v.optional(v.string()),
    district: v.optional(v.string()),

    // Technical specification
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),
    speed: v.optional(v.string()),
    lift_height: v.optional(v.string()),
    load_capacity: v.optional(v.string()),
    floor_count: v.optional(v.number()),
    door_count: v.optional(v.number()),

    // Doors and cab
    door_type: v.optional(v.string()),
    passthrough: v.optional(v.boolean()),
    collective: v.optional(v.string()),
    cab_size: v.optional(v.string()),
    daylight_opening: v.optional(v.string()),
    grab_rail: v.optional(v.string()),
    door_machine: v.optional(v.string()),

    // Machinery
    drive_system: v.optional(v.string()),
    suspension: v.optional(v.string()),
    machine_placement: v.optional(v.string()),
    machine_type: v.optional(v.string()),
    control_system_type: v.optional(v.string()),

    // Inspection and maintenance
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),
    shaft_lighting: v.optional(v.string()),

    // Modernization
    modernization_year: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    modernization_measures: v.optional(v.string()),

    // Emergency phone
    has_emergency_phone: v.optional(v.boolean()),
    emergency_phone_model: v.optional(v.string()),
    emergency_phone_type: v.optional(v.string()),
    needs_upgrade: v.optional(v.boolean()),
    emergency_phone_price: v.optional(v.number()),

    // Comments
    comments: v.optional(v.string()),

    // Organization
    organization_id: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("elevators")
      .withIndex("by_elevator_number", (q) => q.eq("elevator_number", args.elevator_number))
      .unique();

    if (existing) {
      throw new Error(
        `Hissnummer ${args.elevator_number} finns redan i registret`,
      );
    }

    await autoAddSuggestedValues(ctx, args);

    return await ctx.db.insert("elevators", {
      ...args,
      status: "active" as const,
      created_by: admin._id,
      created_at: Date.now(),
    });
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
