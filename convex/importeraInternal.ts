import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";
import { autoAddForslagsvarden } from "./hissar";

export const checkAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { adminId: admin._id };
  },
});

export const createOrg = internalMutation({
  args: { namn: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organisationer", { namn: args.namn });
  },
});

export const importBatch = internalMutation({
  args: {
    elevators: v.array(v.any()),
    orgMapping: v.any(),
    adminId: v.any(),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    const errors: { hissnummer: string; error: string }[] = [];

    for (const elevator of args.elevators) {
      try {
        const orgName = elevator._organisation_namn as string | undefined;
        const mapping = args.orgMapping as Record<string, string>;
        const orgId = orgName ? mapping[orgName] : undefined;

        if (!orgId) {
          errors.push({
            hissnummer: elevator.hissnummer as string,
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

        // Check if hissnummer exists
        const existing = await ctx.db
          .query("hissar")
          .withIndex("by_hissnummer", (q: any) =>
            q.eq("hissnummer", fields.hissnummer),
          )
          .unique();

        if (existing) {
          // Update existing elevator
          const { hissnummer, ...updateFields } = fields;
          await ctx.db.patch(existing._id, {
            ...updateFields,
            organisation_id: orgId as Id<"organisationer">,
            ...(importStatus
              ? { status: importStatus as "aktiv" | "rivd" | "arkiverad" }
              : {}),
            senast_uppdaterad_av: args.adminId as Id<"anvandare">,
            senast_uppdaterad: Date.now(),
          });
          updated++;
        } else {
          // Auto-add new forslagsvarden values
          await autoAddForslagsvarden(ctx, fields);

          // Create new elevator
          const insertData = {
            ...fields,
            organisation_id: orgId as Id<"organisationer">,
            status: ((importStatus as string) || "aktiv") as
              | "aktiv"
              | "rivd"
              | "arkiverad",
            skapad_av: args.adminId as Id<"anvandare">,
            skapad_datum: Date.now(),
          } as any;
          await ctx.db.insert("hissar", insertData);
          created++;
        }
      } catch (e) {
        errors.push({
          hissnummer: (elevator.hissnummer as string) || "okänt",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { created, updated, errors };
  },
});
