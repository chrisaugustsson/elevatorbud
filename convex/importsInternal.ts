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

        // Check if elevator_number exists
        const existing = await ctx.db
          .query("elevators")
          .withIndex("by_elevator_number", (q) =>
            q.eq("elevator_number", fields.elevator_number as string),
          )
          .unique();

        if (existing) {
          // Update existing elevator
          const { elevator_number, ...updateFields } = fields;
          await ctx.db.patch(existing._id, {
            ...updateFields,
            organization_id: orgId as Id<"organizations">,
            ...(importStatus
              ? { status: importStatus as "active" | "demolished" | "archived" }
              : {}),
            last_updated_by: args.adminId,
            last_updated_at: Date.now(),
          });
          updated++;
        } else {
          // Auto-add new suggested values
          await autoAddSuggestedValues(ctx, fields);

          // Create new elevator
          await ctx.db.insert("elevators", {
            elevator_number: fields.elevator_number as string,
            ...fields,
            organization_id: orgId as Id<"organizations">,
            status: ((importStatus as string) || "active") as
              | "active"
              | "demolished"
              | "archived",
            created_by: args.adminId,
            created_at: Date.now(),
          });
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
