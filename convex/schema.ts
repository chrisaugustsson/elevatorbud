import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  elevators: defineTable({
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
    .index("by_elevator_number", ["elevator_number"]),

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
