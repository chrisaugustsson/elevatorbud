import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import * as organization from "@elevatorbud/api/organization";

export const getOrganization = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    return organization.get(context.db, data.id);
  });

export const organizationOptions = (id: string) =>
  queryOptions({
    queryKey: ["organization", id],
    queryFn: () => getOrganization({ data: { id } }),
  });
