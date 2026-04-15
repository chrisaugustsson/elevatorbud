import { eq, or } from "drizzle-orm";
import { userOrganizations, organizations } from "./schema.js";
import type { Database } from "./index.js";

/**
 * Returns the union of a user's direct org grants and the direct children of
 * those grants. Because hierarchy is exactly one level deep (PRD FR-2), a
 * single JOIN covers both sides — no recursion required.
 *
 * Equivalent SQL:
 *
 *   SELECT DISTINCT o.id
 *   FROM organizations o
 *   JOIN user_organizations uo
 *     ON o.id = uo.organization_id
 *     OR o.parent_id = uo.organization_id
 *   WHERE uo.user_id = $1
 */
export async function getEffectiveOrganizationIds(
  db: Database,
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: organizations.id })
    .from(organizations)
    .innerJoin(
      userOrganizations,
      or(
        eq(organizations.id, userOrganizations.organizationId),
        eq(organizations.parentId, userOrganizations.organizationId),
      )!,
    )
    .where(eq(userOrganizations.userId, userId));

  // An org can match both join legs in pathological cases (an org that is both
  // directly granted and whose parent is directly granted). Dedupe defensively.
  return [...new Set(rows.map((r) => r.id))];
}
