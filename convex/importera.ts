import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { anyApi } from "convex/server";
import type { FunctionReference } from "convex/server";
import { sendImportReport } from "./email";

const internalRef = anyApi as unknown as {
  importeraInternal: {
    checkAdmin: FunctionReference<"query", "internal">;
    createOrg: FunctionReference<"mutation", "internal">;
    importBatch: FunctionReference<"mutation", "internal">;
  };
};

/**
 * Analyzes parsed import data against existing database state.
 * Client parses the Excel file, then sends hissnummer list + org names
 * for server-side analysis of new vs updated elevators and org matching.
 */
export const analyze = query({
  args: {
    hissnummerList: v.array(v.string()),
    orgNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Check which hissnummer already exist
    const existingHissnummer: Record<string, string> = {};
    for (const nr of args.hissnummerList) {
      const existing = await ctx.db
        .query("hissar")
        .withIndex("by_hissnummer", (q: any) => q.eq("hissnummer", nr))
        .unique();
      if (existing) {
        existingHissnummer[nr] = existing._id as string;
      }
    }

    // Match org names to existing orgs (case-insensitive)
    const allOrgs = await ctx.db.query("organisationer").collect();
    const orgMatches: Record<string, string> = {};
    const newOrgNames: string[] = [];

    for (const name of args.orgNames) {
      if (!name) continue;
      const match = allOrgs.find(
        (o) => o.namn.toLowerCase() === name.toLowerCase(),
      );
      if (match) {
        orgMatches[name] = match._id as string;
      } else {
        newOrgNames.push(name);
      }
    }

    const newCount = args.hissnummerList.filter(
      (nr) => !existingHissnummer[nr],
    ).length;
    const updateCount = args.hissnummerList.filter(
      (nr) => !!existingHissnummer[nr],
    ).length;

    return {
      existingHissnummer,
      orgMatches,
      newOrgNames,
      summary: {
        newElevators: newCount,
        updatedElevators: updateCount,
        matchedOrgs: Object.keys(orgMatches).length,
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
    elevators: v.array(v.any()),
    existingOrgMapping: v.any(),
    newOrgNames: v.array(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Check admin
    const { adminId } = (await ctx.runQuery(
      internalRef.importeraInternal.checkAdmin,
      {},
    )) as { adminId: string };

    // 2. Create new orgs and build complete mapping
    const orgMapping: Record<string, string> = {
      ...(args.existingOrgMapping as Record<string, string>),
    };
    const orgsCreated: string[] = [];

    for (const name of args.newOrgNames) {
      const orgId = await ctx.runMutation(
        internalRef.importeraInternal.createOrg,
        { namn: name },
      );
      orgMapping[name] = orgId as string;
      orgsCreated.push(name);
    }

    // 3. Import elevators in batches of 25
    const BATCH_SIZE = 25;
    let totalCreated = 0;
    let totalUpdated = 0;
    const allErrors: { hissnummer: string; error: string }[] = [];

    for (let i = 0; i < args.elevators.length; i += BATCH_SIZE) {
      const batch = args.elevators.slice(i, i + BATCH_SIZE);
      const result = (await ctx.runMutation(
        internalRef.importeraInternal.importBatch,
        {
          elevators: batch,
          orgMapping,
          adminId,
        },
      )) as {
        created: number;
        updated: number;
        errors: { hissnummer: string; error: string }[];
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
