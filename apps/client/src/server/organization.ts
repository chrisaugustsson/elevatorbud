import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";

export const getOrganization = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationId!;

    // Client can only fetch their own organization
    if (data.id !== orgId) {
      throw new Error("Saknar behörighet att se denna organisation");
    }

    return context.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });
  });

export const organizationOptions = (id: string) =>
  queryOptions({
    queryKey: ["organization", id],
    queryFn: () => getOrganization({ data: { id } }),
  });
