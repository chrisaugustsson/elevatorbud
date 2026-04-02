import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { createClerkClient } from "@clerk/backend";
import { requireAdmin } from "./auth";

// Use anyApi to reference internal functions — avoids circular type dependency
// with _generated/api.ts which imports this module's types.
const internalRef = anyApi as unknown as {
  anvandareInternal: {
    checkAdmin: FunctionReference<"query", "internal">;
    getInternal: FunctionReference<"query", "internal">;
    insertAnvandare: FunctionReference<"mutation", "internal">;
    updateAnvandare: FunctionReference<"mutation", "internal">;
    inaktiveraAnvandare: FunctionReference<"mutation", "internal">;
    removeAnvandare: FunctionReference<"mutation", "internal">;
  };
};

function getClerkClient() {
  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });
}

// ---- Public actions (Clerk API + internal mutations) ----

export const create = action({
  args: {
    namn: v.string(),
    email: v.string(),
    roll: v.union(v.literal("admin"), v.literal("kund")),
    organisation_id: v.optional(v.id("organisationer")),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internalRef.anvandareInternal.checkAdmin);

    const nameParts = args.namn.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const clerk = getClerkClient();
    const clerkUser = await clerk.users.createUser({
      emailAddress: [args.email],
      firstName,
      lastName,
      skipPasswordRequirement: true,
      publicMetadata: {
        roll: args.roll,
        organisation_id: args.organisation_id,
      },
    });

    const anvandareId = await ctx.runMutation(
      internalRef.anvandareInternal.insertAnvandare,
      {
        clerk_user_id: clerkUser.id,
        email: args.email,
        namn: args.namn,
        roll: args.roll,
        organisation_id: args.organisation_id,
      },
    );

    return anvandareId;
  },
});

export const update = action({
  args: {
    id: v.id("anvandare"),
    namn: v.optional(v.string()),
    email: v.optional(v.string()),
    roll: v.optional(v.union(v.literal("admin"), v.literal("kund"))),
    organisation_id: v.optional(v.id("organisationer")),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internalRef.anvandareInternal.checkAdmin);

    const currentData = await ctx.runQuery(
      internalRef.anvandareInternal.getInternal,
      { id: args.id },
    );
    if (!currentData) {
      throw new Error("Användaren hittades inte");
    }

    await ctx.runMutation(internalRef.anvandareInternal.updateAnvandare, {
      id: args.id,
      namn: args.namn,
      email: args.email,
      roll: args.roll,
      organisation_id: args.organisation_id,
    });

    const clerk = getClerkClient();
    const clerkUpdate: Record<string, unknown> = {};

    if (args.namn !== undefined) {
      const nameParts = args.namn.trim().split(/\s+/);
      clerkUpdate.firstName = nameParts[0] || "";
      clerkUpdate.lastName = nameParts.slice(1).join(" ") || undefined;
    }

    clerkUpdate.publicMetadata = {
      roll: args.roll ?? currentData.roll,
      organisation_id: args.organisation_id ?? currentData.organisation_id,
    };

    await clerk.users.updateUser(currentData.clerk_user_id, clerkUpdate);
  },
});

export const inaktivera = action({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    await ctx.runQuery(internalRef.anvandareInternal.checkAdmin);

    const clerkUserId = await ctx.runMutation(
      internalRef.anvandareInternal.inaktiveraAnvandare,
      { id },
    );

    const clerk = getClerkClient();
    await clerk.users.banUser(clerkUserId);
  },
});

export const remove = action({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    await ctx.runQuery(internalRef.anvandareInternal.checkAdmin);

    const clerkUserId = await ctx.runMutation(
      internalRef.anvandareInternal.removeAnvandare,
      { id },
    );

    const clerk = getClerkClient();
    await clerk.users.deleteUser(clerkUserId);
  },
});

// ---- Public queries ----

export const list = query({
  args: {
    roll: v.optional(v.union(v.literal("admin"), v.literal("kund"))),
    organisation_id: v.optional(v.id("organisationer")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let users = await ctx.db.query("anvandare").collect();

    if (args.roll !== undefined) {
      users = users.filter((u) => u.roll === args.roll);
    }
    if (args.organisation_id !== undefined) {
      users = users.filter((u) => u.organisation_id === args.organisation_id);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.namn.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    return users;
  },
});

export const get = query({
  args: { id: v.id("anvandare") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(id);
  },
});

export const listByOrganisation = query({
  args: { organisation_id: v.id("organisationer") },
  handler: async (ctx, { organisation_id }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("anvandare")
      .filter((q) => q.eq(q.field("organisation_id"), organisation_id))
      .collect();
  },
});
