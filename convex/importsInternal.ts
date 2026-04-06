import { internalQuery } from "./_generated/server";
import { internalMutation } from "./aggregates";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { autoAddSuggestedValues } from "./elevators/helpers";

export const checkAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { adminId: admin._id };
  },
});

export const createOrg = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organizations", { name: args.name });
  },
});

// Fields that belong to elevator_details
const DETAIL_FIELDS = new Set([
  "speed",
  "lift_height",
  "load_capacity",
  "floor_count",
  "door_count",
  "door_type",
  "passthrough",
  "dispatch_mode",
  "cab_size",
  "door_opening",
  "door_carrier",
  "door_machine",
  "drive_system",
  "suspension",
  "machine_placement",
  "machine_type",
  "control_system_type",
  "shaft_lighting",
  "emergency_phone_model",
  "emergency_phone_type",
  "emergency_phone_price",
  "comments",
]);

// Fields that belong to elevator_budgets
const BUDGET_FIELDS = new Set([
  "recommended_modernization_year",
  "budget_amount",
  "measures",
  "warranty",
]);

function splitImportFields(fields: Record<string, unknown>) {
  const core: Record<string, unknown> = {};
  const details: Record<string, unknown> = {};
  const budget: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (DETAIL_FIELDS.has(key)) {
      details[key] = value;
    } else if (BUDGET_FIELDS.has(key)) {
      budget[key] = value;
    } else {
      core[key] = value;
    }
  }

  return { core, details, budget };
}

export const importBatch = internalMutation({
  args: {
    elevators: v.array(v.record(v.string(), v.any())),
    orgMappingNames: v.array(v.string()),
    orgMappingIds: v.array(v.string()),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Reconstruct org mapping from parallel arrays
    const orgMapping: Record<string, string> = {};
    for (let i = 0; i < args.orgMappingNames.length; i++) {
      orgMapping[args.orgMappingNames[i]] = args.orgMappingIds[i];
    }

    let created = 0;
    let updated = 0;
    const errors: { elevator_number: string; error: string }[] = [];

    for (const elevator of args.elevators) {
      try {
        const orgName = elevator._organisation_namn as string | undefined;
        const orgId = orgName ? orgMapping[orgName] : undefined;

        if (!orgId) {
          errors.push({
            elevator_number: elevator.elevator_number as string,
            error: `Organisation "${orgName || "saknas"}" kunde inte matchas`,
          });
          continue;
        }

        // Strip import metadata
        const {
          _organisation_namn,
          _source_row,
          _source_sheet,
          status: importStatus,
          ...rawFields
        } = elevator;

        // Remove undefined values
        const fields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawFields)) {
          if (value !== undefined && value !== null) {
            fields[key] = value;
          }
        }

        const { core, details, budget } = splitImportFields(fields);

        // Check if elevator_number exists
        const existing = await ctx.db
          .query("elevators")
          .withIndex("by_elevator_number", (q) =>
            q.eq("elevator_number", fields.elevator_number as string),
          )
          .unique();

        if (existing) {
          // Update existing elevator (core fields only)
          const { elevator_number, ...coreUpdate } = core;
          await ctx.db.patch(existing._id, {
            ...coreUpdate,
            organization_id: orgId as Id<"organizations">,
            ...(importStatus
              ? {
                  status: importStatus as
                    | "active"
                    | "demolished"
                    | "archived",
                }
              : {}),
            last_updated_by: args.adminId,
            last_updated_at: Date.now(),
          });

          // Upsert details
          if (Object.keys(details).length > 0) {
            const existingDetails = await ctx.db
              .query("elevator_details")
              .withIndex("by_elevator_id", (q) =>
                q.eq("elevator_id", existing._id),
              )
              .unique();

            if (existingDetails) {
              await ctx.db.patch(existingDetails._id, details);
            } else {
              await ctx.db.insert("elevator_details", {
                elevator_id: existing._id,
                ...details,
              });
            }
          }

          // Insert new budget entry if budget data present
          if (budget.recommended_modernization_year || budget.budget_amount) {
            await ctx.db.insert("elevator_budgets", {
              elevator_id: existing._id,
              revision_year: new Date().getFullYear(),
              ...budget,
              created_at: Date.now(),
              created_by: args.adminId,
            });
          }

          updated++;
        } else {
          // Auto-add new suggested values
          await autoAddSuggestedValues(ctx, { ...core, ...details, ...budget });

          // Create new elevator
          const elevatorId = await ctx.db.insert("elevators", {
            elevator_number: core.elevator_number as string,
            ...core,
            organization_id: orgId as Id<"organizations">,
            status: ((importStatus as string) || "active") as
              | "active"
              | "demolished"
              | "archived",
            created_by: args.adminId,
            created_at: Date.now(),
          });

          // Create details
          await ctx.db.insert("elevator_details", {
            elevator_id: elevatorId,
            ...details,
          });

          // Create budget entry if data present
          if (budget.recommended_modernization_year || budget.budget_amount) {
            await ctx.db.insert("elevator_budgets", {
              elevator_id: elevatorId,
              revision_year: new Date().getFullYear(),
              ...budget,
              created_at: Date.now(),
              created_by: args.adminId,
            });
          }

          created++;
        }
      } catch (e) {
        errors.push({
          elevator_number: (elevator.elevator_number as string) || "unknown",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { created, updated, errors };
  },
});
