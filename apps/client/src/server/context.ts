import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";
import type { Database } from "@elevatorbud/db";

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
