import { eq, inArray } from "drizzle-orm";
import { userOrganizations, organizations } from "./schema.js";
import type { Database } from "./index.js";

export async function getEffectiveOrganizationIds(
  db: Database,
  userId: string,
): Promise<string[]> {
  const directGrants = await db
    .select({ organizationId: userOrganizations.organizationId })
    .from(userOrganizations)
    .where(eq(userOrganizations.userId, userId));

  const directIds = directGrants.map((r) => r.organizationId);
  if (directIds.length === 0) return [];

  const children = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.parentId, directIds));

  const childIds = children.map((r) => r.id);
  return [...new Set([...directIds, ...childIds])];
}
