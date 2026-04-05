import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { anyApi } from "convex/server";
import type { FunctionReference } from "convex/server";
import { sendImportReport } from "./email";

const internalRef = anyApi as unknown as {
  importsInternal: {
    checkAdmin: FunctionReference<"query", "internal">;
    createOrg: FunctionReference<"mutation", "internal">;
    importBatch: FunctionReference<"mutation", "internal">;
  };
};

/**
 * Analyzes parsed import data against existing database state.
 * Client parses the Excel file, then sends elevator_number list + org names
 * for server-side analysis of new vs updated elevators and org matching.
 */
export const analyze = query({
  args: {
    elevatorNumberList: v.array(v.string()),
    orgNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check which elevator_number already exist
    const existingElevatorNumbers: Record<string, string> = {};
    for (const nr of args.elevatorNumberList) {
      const existing = await ctx.db
        .query("elevators")
        .withIndex("by_elevator_number", (q) => q.eq("elevator_number", nr))
        .unique();
      if (existing) {
        existingElevatorNumbers[nr] = existing._id as string;
      }
    }

    // Match org names to existing orgs (case-insensitive)
    // Use parallel arrays instead of Record to avoid Convex field name
    // restrictions on non-ASCII characters in Swedish org names.
    const allOrgs = await ctx.db.query("organizations").collect();
    const orgMatchNames: string[] = [];
    const orgMatchIds: string[] = [];
    const newOrgNames: string[] = [];

    for (const name of args.orgNames) {
      if (!name) continue;
      const match = allOrgs.find(
        (o) => o.name.toLowerCase() === name.toLowerCase(),
      );
      if (match) {
        orgMatchNames.push(name);
        orgMatchIds.push(match._id as string);
      } else {
        newOrgNames.push(name);
      }
    }

    const newCount = args.elevatorNumberList.filter(
      (nr) => !existingElevatorNumbers[nr],
    ).length;
    const updateCount = args.elevatorNumberList.filter(
      (nr) => !!existingElevatorNumbers[nr],
    ).length;

    return {
      existingElevatorNumbers,
      orgMatchNames,
      orgMatchIds,
      newOrgNames,
      summary: {
        newElevators: newCount,
        updatedElevators: updateCount,
        matchedOrgs: orgMatchNames.length,
        newOrgs: newOrgNames.length,
      },
    };
  },
});

/**
 * Executes the import: creates new orgs, then imports elevators in batches.
 * Called after user reviews the preview and confirms.
 */
export const confirm = action({
  args: {
    elevators: v.array(v.record(v.string(), v.any())),
    existingOrgMatchNames: v.array(v.string()),
    existingOrgMatchIds: v.array(v.string()),
    newOrgNames: v.array(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Check admin
    const { adminId } = (await ctx.runQuery(
      internalRef.importsInternal.checkAdmin,
      {},
    )) as { adminId: Id<"users"> };

    // 2. Create new orgs and build complete mapping as parallel arrays
    // (Convex doesn't allow non-ASCII chars in object keys, so we can't
    // pass a Record<orgName, orgId> through runMutation)
    const orgMappingNames = [...args.existingOrgMatchNames];
    const orgMappingIds = [...args.existingOrgMatchIds];
    const orgsCreated: string[] = [];

    for (const name of args.newOrgNames) {
      const orgId = await ctx.runMutation(
        internalRef.importsInternal.createOrg,
        { name },
      );
      orgMappingNames.push(name);
      orgMappingIds.push(orgId as string);
      orgsCreated.push(name);
    }

    // 3. Import elevators in batches of 25
    const BATCH_SIZE = 25;
    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: { elevator_number: string; error: string }[] = [];

    for (let i = 0; i < args.elevators.length; i += BATCH_SIZE) {
      const batch = args.elevators.slice(i, i + BATCH_SIZE);
      const result = (await ctx.runMutation(
        internalRef.importsInternal.importBatch,
        {
          elevators: batch,
          orgMappingNames,
          orgMappingIds,
          adminId,
        },
      )) as {
        created: number;
        updated: number;
        errors: { elevator_number: string; error: string }[];
      };
      totalCreated += result.created;
      totalUpdated += result.updated;
      allErrors.push(...result.errors);
    }

    // Send import report email if admin email provided
    let emailSent = false;
    if (args.adminEmail) {
      const emailResult = await sendImportReport(args.adminEmail, {
        created: totalCreated,
        updated: totalUpdated,
        errors: allErrors,
        orgsCreated,
      });
      emailSent = emailResult.success;
    }

    return {
      created: totalCreated,
      updated: totalUpdated,
      errors: allErrors,
      orgsCreated,
      emailSent,
    };
  },
});
