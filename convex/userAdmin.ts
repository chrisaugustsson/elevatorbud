import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { anyApi, type FunctionReference } from "convex/server";
import { createClerkClient } from "@clerk/backend";
import { requireAdmin } from "./auth";

// Use anyApi to reference internal functions — avoids circular type dependency
// with _generated/api.ts which imports this module's types.
const internalRef = anyApi as unknown as {
  userAdminInternal: {
    checkAdmin: FunctionReference<"query", "internal">;
    getInternal: FunctionReference<"query", "internal">;
    insertUser: FunctionReference<"mutation", "internal">;
    updateUser: FunctionReference<"mutation", "internal">;
    deactivateUser: FunctionReference<"mutation", "internal">;
    removeUser: FunctionReference<"mutation", "internal">;
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
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("customer")),
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internalRef.userAdminInternal.checkAdmin);

    const nameParts = args.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || undefined;

    const clerk = getClerkClient();
    const clerkUser = await clerk.users.createUser({
      emailAddress: [args.email],
      firstName,
      lastName,
      skipPasswordRequirement: true,
      publicMetadata: {
        role: args.role,
        organization_id: args.organization_id,
      },
    });

    const userId = await ctx.runMutation(
      internalRef.userAdminInternal.insertUser,
      {
        clerk_user_id: clerkUser.id,
        email: args.email,
        name: args.name,
        role: args.role,
        organization_id: args.organization_id,
      },
    );

    return userId;
  },
});

export const update = action({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    organization_id: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internalRef.userAdminInternal.checkAdmin);

    const currentData = await ctx.runQuery(
      internalRef.userAdminInternal.getInternal,
      { id: args.id },
    );
    if (!currentData) {
      throw new Error("Användaren hittades inte");
    }

    await ctx.runMutation(internalRef.userAdminInternal.updateUser, {
      id: args.id,
      name: args.name,
      email: args.email,
      role: args.role,
      organization_id: args.organization_id,
    });

    const clerk = getClerkClient();
    const clerkUpdate: Record<string, unknown> = {};

    if (args.name !== undefined) {
      const nameParts = args.name.trim().split(/\s+/);
      clerkUpdate.firstName = nameParts[0] || "";
      clerkUpdate.lastName = nameParts.slice(1).join(" ") || undefined;
    }

    clerkUpdate.publicMetadata = {
      role: args.role ?? currentData.role,
      organization_id: args.organization_id ?? currentData.organization_id,
    };

    await clerk.users.updateUser(currentData.clerk_user_id, clerkUpdate);
  },
});

export const deactivate = action({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.runQuery(internalRef.userAdminInternal.checkAdmin);

    const clerkUserId = await ctx.runMutation(
      internalRef.userAdminInternal.deactivateUser,
      { id },
    );

    const clerk = getClerkClient();
    await clerk.users.banUser(clerkUserId);
  },
});

export const remove = action({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await ctx.runQuery(internalRef.userAdminInternal.checkAdmin);

    const clerkUserId = await ctx.runMutation(
      internalRef.userAdminInternal.removeUser,
      { id },
    );

    const clerk = getClerkClient();
    await clerk.users.deleteUser(clerkUserId);
  },
});

// ---- Public queries ----

export const list = query({
  args: {
    role: v.optional(v.union(v.literal("admin"), v.literal("customer"))),
    organization_id: v.optional(v.id("organizations")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let users = await ctx.db.query("users").collect();

    if (args.role !== undefined) {
      users = users.filter((u) => u.role === args.role);
    }
    if (args.organization_id !== undefined) {
      users = users.filter((u) => u.organization_id === args.organization_id);
    }
    if (args.search) {
      const search = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search),
      );
    }

    return users;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    return await ctx.db.get(id);
  },
});

export const listByOrganization = query({
  args: { organization_id: v.id("organizations") },
  handler: async (ctx, { organization_id }) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organization_id"), organization_id))
      .collect();
  },
});
