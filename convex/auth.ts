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

export async function requireAuth(ctx: Ctx) {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("Ej autentiserad");
  }
  return user;
}

/**
 * Returns the effective organization_id for data scoping.
 * - Admins: returns argsOrgId (can be undefined = "all orgs")
 * - Customers: always returns their own organization_id (ignores argsOrgId)
 * - Throws if a customer has no organization assigned
 */
export function getOrgScope(
  user: { role: "admin" | "customer"; organization_id?: Id<"organizations"> },
  argsOrgId?: Id<"organizations">,
): Id<"organizations"> | undefined {
  if (user.role === "admin") return argsOrgId;
  if (!user.organization_id) {
    throw new Error("Användaren saknar organisation");
  }
  return user.organization_id;
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
