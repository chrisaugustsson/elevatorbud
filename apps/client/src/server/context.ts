import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";
import type { Database } from "@elevatorbud/db";

/**
 * Resolves the set of org IDs accessible within a given parent context —
 * the parent itself plus its direct children.
 *
 * PRD US-025a explicitly allows `parentOrgId` to be a child org when that is
 * the user's only direct grant: "A user with a direct grant on a child org
 * only (not its parent) treats that child as their context, as if it were a
 * root." In that case the child has no children of its own (one-level-deep
 * invariant), so we return just `[parentOrgId]`. This is by design — do not
 * add a `parentId IS NULL` assertion here.
 */
export async function getContextOrgIds(
  db: Database,
  user: { organizationIds: string[] },
  parentOrgId: string,
): Promise<string[]> {
  if (!user.organizationIds.includes(parentOrgId)) {
    throw new Error("Organisationen är inte tillgänglig");
  }

  const children = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.parentId, parentOrgId));

  return [parentOrgId, ...children.map((c) => c.id)];
}

export const validateParentContext = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(
      context.db,
      context.user,
      data.parentOrgId,
    );

    const parentOrg = await context.db.query.organizations.findFirst({
      where: eq(organizations.id, data.parentOrgId),
    });

    return {
      parentOrg,
      contextOrgIds,
    };
  });

export const parentContextOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["parentContext", parentOrgId],
    queryFn: () => validateParentContext({ data: { parentOrgId } }),
  });

export const getDefaultParentOrg = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (context.user.organizationIds.length === 0) return null;

    const orgs = await context.db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, context.user.organizationIds))
      .orderBy(organizations.name);

    return orgs[0] ?? null;
  });

export const defaultParentOrgOptions = () =>
  queryOptions({
    queryKey: ["defaultParentOrg"],
    queryFn: () => getDefaultParentOrg(),
  });

export const getUserDirectOrgs = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (context.user.organizationIds.length === 0) return [];

    return context.db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, context.user.organizationIds))
      .orderBy(organizations.name);
  });

export const userDirectOrgsOptions = () =>
  queryOptions({
    queryKey: ["userDirectOrgs"],
    queryFn: () => getUserDirectOrgs(),
  });

export const getChildOrgs = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await getContextOrgIds(context.db, context.user, data.parentOrgId);

    return context.db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.parentId, data.parentOrgId))
      .orderBy(organizations.name);
  });

export const childOrgsOptions = (parentOrgId: string) =>
  queryOptions({
    queryKey: ["childOrgs", parentOrgId],
    queryFn: () => getChildOrgs({ data: { parentOrgId } }),
  });
