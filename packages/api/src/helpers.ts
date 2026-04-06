/**
 * Returns the effective organization scope.
 * - Admin: uses the provided orgId (undefined = all orgs)
 * - Customer: always scoped to their own org
 */
export function getOrgScope(
  user: { role: "admin" | "customer"; organizationId: string | null },
  requestedOrgId?: string,
): string | undefined {
  if (user.role === "admin") return requestedOrgId;
  if (!user.organizationId) {
    throw new Error("Användaren saknar organisation");
  }
  return user.organizationId;
}
