import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import { authMiddlewareRead } from "./auth";
import { getContextOrgIds } from "./context";

export const getOrganization = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ id: z.string().uuid(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    if (!contextOrgIds.includes(data.id)) {
      throw new Error("Saknar behörighet att se denna organisation");
    }

    return context.db.query.organizations.findFirst({
      where: eq(organizations.id, data.id),
    });
  });

export const organizationOptions = (id: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["organization", id, parentOrgId],
    queryFn: () => getOrganization({ data: { id, parentOrgId } }),
  });
