import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  elevators: defineTable({
    // Identification
    elevator_number: v.string(),
    address: v.optional(v.string()),
    elevator_classification: v.optional(v.string()),
    district: v.optional(v.string()),
    inventory_date: v.optional(v.string()),

    // Core technical (used in charts/filtering)
    elevator_type: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    build_year: v.optional(v.number()),

    // Inspection and maintenance
    inspection_authority: v.optional(v.string()),
    inspection_month: v.optional(v.string()),
    maintenance_company: v.optional(v.string()),

    // Modernization (historical — when it WAS modernized)
    modernization_year: v.optional(v.string()),

    // Emergency phone (summary flags for charts)
    has_emergency_phone: v.optional(v.boolean()),
    needs_upgrade: v.optional(v.boolean()),

    // Metadata
    organization_id: v.id("organizations"),
    status: v.union(
      v.literal("active"),
      v.literal("demolished"),
      v.literal("archived"),
    ),
    created_by: v.optional(v.id("users")),
    created_at: v.number(),
    last_updated_by: v.optional(v.id("users")),
    last_updated_at: v.optional(v.number()),
  })
    .index("by_organization_id", ["organization_id"])
    .index("by_elevator_number", ["elevator_number"])
    .index("by_organization_id_and_elevator_number", [
      "organization_id",
      "elevator_number",
    ]),

  elevator_details: defineTable({
    elevator_id: v.id("elevators"),

    // Technical specification
    speed: v.optional(v.string()),
    lift_height: v.optional(v.string()),
    load_capacity: v.optional(v.string()),
    floor_count: v.optional(v.number()),
    door_count: v.optional(v.number()),

    // Doors and cab
    door_type: v.optional(v.string()),
    passthrough: v.optional(v.boolean()),
    dispatch_mode: v.optional(v.string()),
    cab_size: v.optional(v.string()),
    door_opening: v.optional(v.string()),
    door_carrier: v.optional(v.string()),
    door_machine: v.optional(v.string()),

    // Machinery
    drive_system: v.optional(v.string()),
    suspension: v.optional(v.string()),
    machine_placement: v.optional(v.string()),
    machine_type: v.optional(v.string()),
    control_system_type: v.optional(v.string()),

    // Inspection detail
    shaft_lighting: v.optional(v.string()),

    // Emergency phone details
    emergency_phone_model: v.optional(v.string()),
    emergency_phone_type: v.optional(v.string()),
    emergency_phone_price: v.optional(v.number()),

    // Comments
    comments: v.optional(v.string()),
  }).index("by_elevator_id", ["elevator_id"]),

  elevator_budgets: defineTable({
    elevator_id: v.id("elevators"),
    revision_year: v.number(),
    recommended_modernization_year: v.optional(v.string()),
    budget_amount: v.optional(v.number()),
    measures: v.optional(v.string()),
    warranty: v.optional(v.boolean()),
    created_at: v.number(),
    created_by: v.optional(v.id("users")),
  })
    .index("by_elevator_id", ["elevator_id"])
    .index("by_elevator_id_and_revision_year", [
      "elevator_id",
      "revision_year",
    ]),

  organizations: defineTable({
    name: v.string(),
    organization_number: v.optional(v.string()),
    contact_person: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    email: v.optional(v.string()),
  }),

  users: defineTable({
    clerk_user_id: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("customer")),
    organization_id: v.optional(v.id("organizations")),
    active: v.boolean(),
    created_at: v.number(),
    last_login: v.optional(v.number()),
  })
    .index("by_clerk_user_id", ["clerk_user_id"])
    .index("by_organization_id", ["organization_id"])
    .index("by_role", ["role"]),

  suggested_values: defineTable({
    category: v.string(),
    value: v.string(),
    active: v.boolean(),
    created_at: v.number(),
  }).index("by_category", ["category"]),

  contactSubmissions: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    status: v.union(v.literal("new"), v.literal("read"), v.literal("archived")),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  pages: defineTable({
    slug: v.string(),
    title: v.string(),
    sections: v.array(
      v.object({
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
      }),
    ),
    published: v.boolean(),
    updatedAt: v.optional(v.number()),
  }).index("by_slug", ["slug"]),
});
