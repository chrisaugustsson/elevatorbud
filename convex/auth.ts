import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

async function userByClerkId(ctx: Ctx, clerkUserId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerk_user_id", clerkUserId))
    .unique();
}

export async function getCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByClerkId(ctx, identity.subject);
}

export async function requireAdmin(ctx: Ctx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Ej autentiserad");
  }
  if (user.role !== "admin") {
    throw new Error("Kräver admin-behörighet");
  }
  return user;
}

export async function requireTenantAccess(
  ctx: Ctx,
  organizationId: Id<"organizations">,
) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Ej autentiserad");
  }
  if (user.role === "admin") {
    return user;
  }
  if (user.organization_id !== organizationId) {
    throw new Error("Ingen åtkomst till denna organisation");
  }
  return user;
}
